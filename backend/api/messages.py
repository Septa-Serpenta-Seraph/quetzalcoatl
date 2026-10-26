"""Messages API routes for Quetzalcoatl."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List

from models import get_db, User, Server, Channel, Message, Attachment, Reaction
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["messages"])


class CreateMessageRequest(BaseModel):
    content: Optional[str] = Field(None, max_length=4000)
    reply_to_id: Optional[int] = None


class AttachmentResponse(BaseModel):
    id: int
    filename: str
    url: str
    size: int
    content_type: Optional[str]

    class Config:
        from_attributes = True


class ReactionResponse(BaseModel):
    emoji: str
    count: int
    users: List[int]


class MessageResponse(BaseModel):
    id: int
    channel_id: int
    author_id: int
    author_username: str
    author_display_name: Optional[str]
    author_avatar: Optional[str]
    content: Optional[str]
    reply_to_id: Optional[int]
    is_pinned: bool
    is_edited: bool
    created_at: str
    updated_at: str
    attachments: List[AttachmentResponse]
    reactions: List[ReactionResponse]


def _message_to_response(msg: Message, db: Session) -> MessageResponse:
    # Group reactions
    reaction_map = {}
    for r in msg.reactions:
        if r.emoji not in reaction_map:
            reaction_map[r.emoji] = {"emoji": r.emoji, "count": 0, "users": []}
        reaction_map[r.emoji]["count"] += 1
        reaction_map[r.emoji]["users"].append(r.user_id)

    return MessageResponse(
        id=msg.id,
        channel_id=msg.channel_id,
        author_id=msg.author_id,
        author_username=msg.author.username,
        author_display_name=msg.author.display_name,
        author_avatar=msg.author.avatar_url,
        content=msg.content,
        reply_to_id=msg.reply_to_id,
        is_pinned=msg.is_pinned,
        is_edited=msg.is_edited,
        created_at=msg.created_at.isoformat(),
        updated_at=msg.updated_at.isoformat(),
        attachments=[AttachmentResponse(
            id=a.id, filename=a.filename, url=a.url, size=a.size, content_type=a.content_type,
        ) for a in msg.attachments],
        reactions=list(reaction_map.values()),
    )


@router.get("/channels/{channel_id}/messages", response_model=List[MessageResponse])
def get_messages(
    channel_id: int,
    before: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Check membership
    server = db.query(Server).filter(Server.id == channel.server_id).first()
    if current_user not in server.members and server.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not a member")

    query = db.query(Message).filter(Message.channel_id == channel_id)
    if before:
        query = query.filter(Message.id < before)
    messages = query.order_by(Message.created_at.desc()).limit(limit).all()
    messages.reverse()  # Return in chronological order

    return [_message_to_response(m, db) for m in messages]


@router.post("/channels/{channel_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    channel_id: int,
    req: CreateMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    server = db.query(Server).filter(Server.id == channel.server_id).first()
    if current_user not in server.members and server.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not a member")

    if not req.content and not req.reply_to_id:
        # Allow empty content for now (attachments handled separately)
        pass

    msg = Message(
        channel_id=channel_id,
        author_id=current_user.id,
        content=req.content,
        reply_to_id=req.reply_to_id,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _message_to_response(msg, db)


@router.patch("/messages/{message_id}", response_model=MessageResponse)
def edit_message(
    message_id: int,
    req: CreateMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own messages")

    msg.content = req.content
    msg.is_edited = True
    db.commit()
    db.refresh(msg)
    return _message_to_response(msg, db)


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.author_id != current_user.id:
        # Check if server owner
        channel = db.query(Channel).filter(Channel.id == msg.channel_id).first()
        server = db.query(Server).filter(Server.id == channel.server_id).first()
        if server.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Can only delete your own messages")

    db.delete(msg)
    db.commit()


@router.post("/messages/{message_id}/reactions", status_code=status.HTTP_201_CREATED)
def add_reaction(
    message_id: int,
    emoji: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    existing = db.query(Reaction).filter(
        Reaction.message_id == message_id,
        Reaction.user_id == current_user.id,
        Reaction.emoji == emoji,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already reacted")

    reaction = Reaction(message_id=message_id, user_id=current_user.id, emoji=emoji)
    db.add(reaction)
    db.commit()
    return {"status": "ok"}


@router.delete("/messages/{message_id}/reactions/{emoji}", status_code=status.HTTP_204_NO_CONTENT)
def remove_reaction(
    message_id: int,
    emoji: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reaction = db.query(Reaction).filter(
        Reaction.message_id == message_id,
        Reaction.user_id == current_user.id,
        Reaction.emoji == emoji,
    ).first()
    if not reaction:
        raise HTTPException(status_code=404, detail="Reaction not found")
    db.delete(reaction)
    db.commit()