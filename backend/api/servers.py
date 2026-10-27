"""Server (guild) API routes for Quetzalcoatl."""

import secrets
from sqlalchemy import or_
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List

from models import get_db, User, Server, Channel, Role, server_members
from auth import get_current_user

router = APIRouter(prefix="/api/servers", tags=["servers"])


class CreateServerRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)


class ServerResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon_url: Optional[str]
    owner_id: int
    invite_code: Optional[str]
    is_public: bool
    created_at: str

    class Config:
        from_attributes = True


class ChannelResponse(BaseModel):
    id: int
    server_id: int
    name: str
    type: str
    topic: Optional[str]
    position: int
    parent_id: Optional[int]
    is_nsfw: bool

    class Config:
        from_attributes = True


class CreateChannelRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field("text", pattern=r"^(text|voice|category|announcement|forum)$")
    topic: Optional[str] = Field(None, max_length=1024)
    parent_id: Optional[int] = None


def _server_to_response(server: Server) -> ServerResponse:
    return ServerResponse(
        id=server.id,
        name=server.name,
        description=server.description,
        icon_url=server.icon_url,
        owner_id=server.owner_id,
        invite_code=server.invite_code,
        is_public=server.is_public,
        created_at=server.created_at.isoformat(),
    )


def _check_membership(server: Server, user: User, db: Session) -> None:
    if server.owner_id == user.id:
        return
    member = db.query(server_members).filter(
        server_members.c.user_id == user.id,
        server_members.c.server_id == server.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this server")


@router.post("", response_model=ServerResponse, status_code=status.HTTP_201_CREATED)
def create_server(req: CreateServerRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    server = Server(
        name=req.name,
        description=req.description,
        owner_id=current_user.id,
        invite_code=secrets.token_urlsafe(8),
    )
    db.add(server)
    db.flush()

    # Add owner as member
    server.members.append(current_user)

    # Create default channels
    general = Channel(server_id=server.id, name="general", type="text", position=0)
    voice = Channel(server_id=server.id, name="General", type="voice", position=1)
    db.add_all([general, voice])

    # Create default role with basic permissions (read, send, join voice)
    # Permission bits: 1=read, 2=send, 4=manage_channels, 8=manage_server, 16=manage_roles
    # @everyone gets read + send by default (like Discord)
    default_role = Role(
        server_id=server.id,
        name="@everyone",
        is_default=True,
        permissions=3,  # read (1) + send (2)
    )
    db.add(default_role)

    db.commit()
    db.refresh(server)
    return _server_to_response(server)


@router.get("", response_model=List[ServerResponse])
def list_servers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Use a single query to get all servers the user is a member or owner of
    servers = (
        db.query(Server)
        .outerjoin(server_members, Server.id == server_members.c.server_id)
        .filter(
            or_(
                server_members.c.user_id == current_user.id,
                Server.owner_id == current_user.id,
            )
        )
        .distinct()
        .all()
    )
    return [_server_to_response(s) for s in servers]


@router.get("/{server_id}", response_model=ServerResponse)
def get_server(server_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    _check_membership(server, current_user, db)
    return _server_to_response(server)


@router.get("/{server_id}/channels", response_model=List[ChannelResponse])
def list_channels(server_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    _check_membership(server, current_user, db)
    channels = db.query(Channel).filter(Channel.server_id == server_id).order_by(Channel.position).all()
    return [ChannelResponse(
        id=c.id, server_id=c.server_id, name=c.name, type=c.type,
        topic=c.topic, position=c.position, parent_id=c.parent_id, is_nsfw=c.is_nsfw,
    ) for c in channels]


@router.post("/{server_id}/channels", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
def create_channel(server_id: int, req: CreateChannelRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if server.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the server owner can create channels")

    max_pos = db.query(Channel).filter(Channel.server_id == server_id).count()
    channel = Channel(
        server_id=server_id,
        name=req.name,
        type=req.type,
        topic=req.topic,
        parent_id=req.parent_id,
        position=max_pos,
    )
    db.add(channel)
    db.commit()
    db.refresh(channel)
    return ChannelResponse(
        id=channel.id, server_id=channel.server_id, name=channel.name, type=channel.type,
        topic=channel.topic, position=channel.position, parent_id=channel.parent_id, is_nsfw=channel.is_nsfw,
    )


@router.post("/join/{invite_code}", response_model=ServerResponse)
def join_server(invite_code: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    server = db.query(Server).filter(Server.invite_code == invite_code).first()
    if not server:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    if current_user in server.members or server.owner_id == current_user.id:
        return _server_to_response(server)
    server.members.append(current_user)
    db.commit()
    db.refresh(server)
    return _server_to_response(server)