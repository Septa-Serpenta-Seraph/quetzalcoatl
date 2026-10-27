"""Direct Messages API routes for Quetzalcoatl."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from models import get_db, User, Conversation, DirectMessage, DMAttachment, conversation_participants
from auth import get_current_user

router = APIRouter(prefix="/api/dms", tags=["direct-messages"])


class CreateConversationRequest(BaseModel):
    user_ids: List[int] = Field(..., min_length=1)
    is_group: bool = False
    name: Optional[str] = None


class ConversationResponse(BaseModel):
    id: int
    is_group: bool
    name: Optional[str]
    participants: List[dict]
    last_message: Optional[dict]
    created_at: str
    updated_at: str


class DMSendRequest(BaseModel):
    content: Optional[str] = Field(None, max_length=4000)


class DMMessageResponse(BaseModel):
    id: int
    conversation_id: int
    author_id: int
    author_username: str
    author_display_name: Optional[str]
    content: Optional[str]
    created_at: str
    updated_at: str


def _conv_to_response(conv: Conversation, db: Session, current_user: User) -> dict:
    participants = [{"id": p.id, "username": p.username, "display_name": p.display_name, "is_bot": p.is_bot} for p in conv.participants]
    last_msg = None
    if conv.messages:
        m = conv.messages[-1]
        last_msg = {"id": m.id, "author_username": m.author.username, "content": m.content, "created_at": m.created_at.isoformat()}
    return {
        "id": conv.id,
        "is_group": conv.is_group,
        "name": conv.name,
        "participants": participants,
        "last_message": last_msg,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
    }


@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all conversations the current user is part of."""
    convs = (
        db.query(Conversation)
        .filter(Conversation.participants.any(User.id == current_user.id))
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return [_conv_to_response(c, db, current_user) for c in convs]


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(req: CreateConversationRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new DM conversation with one or more users."""
    # Include current user in participants
    all_user_ids = set(req.user_ids) | {current_user.id}

    # For 1:1 DMs, check if conversation already exists
    if not req.is_group and len(all_user_ids) == 2:
        other_id = (all_user_ids - {current_user.id}).pop()
        existing = (
            db.query(Conversation)
            .filter(Conversation.is_group == False)
            .filter(Conversation.participants.any(User.id == current_user.id))
            .filter(Conversation.participants.any(User.id == other_id))
            .first()
        )
        if existing:
            return _conv_to_response(existing, db, current_user)

    # Validate all users exist
    users = db.query(User).filter(User.id.in_(all_user_ids)).all()
    if len(users) != len(all_user_ids):
        raise HTTPException(status_code=404, detail="One or more users not found")

    conv = Conversation(
        is_group=req.is_group,
        name=req.name if req.is_group else None,
    )
    db.add(conv)
    db.flush()
    conv.participants = users
    db.commit()
    db.refresh(conv)
    return _conv_to_response(conv, db, current_user)


@router.get("/conversations/{conversation_id}/messages", response_model=List[DMMessageResponse])
def get_dm_messages(
    conversation_id: int,
    before: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get messages in a DM conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # Check if user is a participant
    participant = db.query(conversation_participants).filter(
        conversation_participants.c.user_id == current_user.id,
        conversation_participants.c.conversation_id == conversation_id,
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")

    query = db.query(DirectMessage).filter(DirectMessage.conversation_id == conversation_id)
    if before:
        query = query.filter(DirectMessage.id < before)
    messages = query.order_by(DirectMessage.created_at.desc()).limit(limit).all()
    messages.reverse()

    return [
        DMMessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            author_id=m.author_id,
            author_username=m.author.username,
            author_display_name=m.author.display_name,
            content=m.content,
            created_at=m.created_at.isoformat(),
            updated_at=m.updated_at.isoformat(),
        )
        for m in messages
    ]


@router.post("/conversations/{conversation_id}/messages", response_model=DMMessageResponse, status_code=status.HTTP_201_CREATED)
def send_dm(
    conversation_id: int,
    req: DMSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a direct message."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # Check if user is a participant
    participant = db.query(conversation_participants).filter(
        conversation_participants.c.user_id == current_user.id,
        conversation_participants.c.conversation_id == conversation_id,
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")

    msg = DirectMessage(
        conversation_id=conversation_id,
        author_id=current_user.id,
        content=req.content,
    )
    db.add(msg)
    conv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    # Get all participant IDs for DM broadcast
    participant_ids = [p.user_id for p in db.query(conversation_participants).filter(
        conversation_participants.c.conversation_id == conversation_id
    ).all()]

    # Broadcast to WebSocket subscribers so DM messages appear in real-time
    try:
        from gateway.websocket import manager
        import asyncio
        dm_data = {
            "type": "dm",
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "author_id": msg.author_id,
            "author_username": msg.author.username,
            "author_display_name": msg.author.display_name,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
            "updated_at": msg.updated_at.isoformat(),
        }
        for pid in participant_ids:
            asyncio.ensure_future(manager.send_to_user(pid, dm_data))
    except Exception:
        pass  # WebSocket broadcast is best-effort

    return DMMessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        author_id=msg.author_id,
        author_username=msg.author.username,
        author_display_name=msg.author.display_name,
        content=msg.content,
        created_at=msg.created_at.isoformat(),
        updated_at=msg.updated_at.isoformat(),
    )


@router.delete("/conversations/{conversation_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dm(
    conversation_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a DM message (only your own)."""
    msg = db.query(DirectMessage).filter(DirectMessage.id == message_id, DirectMessage.conversation_id == conversation_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")
    db.delete(msg)
    db.commit()


@router.get("/users/search")
def search_users(q: str = Query(..., min_length=1), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Search users by username prefix (for starting new DMs)."""
    users = (
        db.query(User)
        .filter(User.username.ilike(f"%{q}%"))
        .filter(User.id != current_user.id)
        .limit(20)
        .all()
    )
    return [{"id": u.id, "username": u.username, "display_name": u.display_name, "is_bot": u.is_bot} for u in users]