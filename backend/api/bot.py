"""Bot API routes for Quetzalcoatl - allows Hermes/AI to participate as a native user."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from models import get_db, User, Server, Channel, Message
from auth import get_current_user, create_access_token, decode_token

router = APIRouter(prefix="/api/bot", tags=["bot"])

# Bot user config
BOT_USERNAME = "narusya"
BOT_DISPLAY_NAME = "Narusya 🐍"
BOT_MENTION_TRIGGERS = ["@hermes", "@narusya", "@bot"]


class BotMessageRequest(BaseModel):
    channel_id: int
    content: str = Field(..., min_length=1, max_length=4000)
    reply_to_id: Optional[int] = None


class BotMessageResponse(BaseModel):
    id: int
    channel_id: int
    author_username: str
    content: str
    created_at: str


class PendingMention(BaseModel):
    message_id: int
    channel_id: int
    channel_name: str
    server_id: int
    server_name: str
    author_username: str
    content: str
    created_at: str


class BotTokenResponse(BaseModel):
    access_token: str
    bot_user_id: int
    bot_username: str


def get_bot_user(db: Session) -> User:
    """Get or create the bot user."""
    bot = db.query(User).filter(User.username == BOT_USERNAME).first()
    if not bot:
        from auth import hash_password
        bot = User(
            username=BOT_USERNAME,
            email="bot@quetzalcoatl.local",
            password_hash=hash_password("bot-internal-only"),
            display_name=BOT_DISPLAY_NAME,
            is_bot=True,
            status="online",
        )
        db.add(bot)
        db.commit()
        db.refresh(bot)
    return bot


def check_mention(content: str) -> bool:
    """Check if a message mentions the bot."""
    lower = content.lower()
    return any(trigger in lower for trigger in BOT_MENTION_TRIGGERS)


@router.post("/token", response_model=BotTokenResponse)
def get_bot_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate a JWT token for the bot user. Requires an authenticated human user."""
    if current_user.is_bot:
        raise HTTPException(status_code=403, detail="Bots cannot generate bot tokens")
    bot = get_bot_user(db)
    token = create_access_token({"sub": str(bot.id)})
    return BotTokenResponse(
        access_token=token,
        bot_user_id=bot.id,
        bot_username=bot.username,
    )


@router.post("/message", response_model=BotMessageResponse, status_code=status.HTTP_201_CREATED)
def post_bot_message(req: BotMessageRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Post a message as the bot. Requires bot token (is_bot=True user)."""
    if not current_user.is_bot:
        raise HTTPException(status_code=403, detail="Only bot users can post via this endpoint")

    channel = db.query(Channel).filter(Channel.id == req.channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    server = db.query(Server).filter(Server.id == channel.server_id).first()
    if current_user not in server.members and server.owner_id != current_user.id:
        # Bot might not be a member yet - add it
        bot = get_bot_user(db)
        if bot not in server.members and server.owner_id != bot.id:
            server.members.append(bot)
            db.commit()

    msg = Message(
        channel_id=req.channel_id,
        author_id=current_user.id,
        content=req.content,
        reply_to_id=req.reply_to_id,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return BotMessageResponse(
        id=msg.id,
        channel_id=msg.channel_id,
        author_username=current_user.username,
        content=msg.content,
        created_at=msg.created_at.isoformat(),
    )


@router.get("/history/{channel_id}")
def get_channel_history(
    channel_id: int,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get recent messages from a channel. For bot context."""
    if not current_user.is_bot:
        raise HTTPException(status_code=403, detail="Only bot users can access this endpoint")

    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    messages = (
        db.query(Message)
        .filter(Message.channel_id == channel_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )
    messages.reverse()

    return [
        {
            "id": m.id,
            "author_username": m.author.username,
            "author_display_name": m.author.display_name,
            "is_bot": m.author.is_bot,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.get("/pending", response_model=List[PendingMention])
def get_pending_mentions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get messages that mention the bot and haven't been responded to yet."""
    if not current_user.is_bot:
        raise HTTPException(status_code=403, detail="Only bot users can access this endpoint")

    # Find messages containing mention triggers that were NOT authored by the bot
    # and don't have a bot reply after them
    all_messages = (
        db.query(Message)
        .join(Channel)
        .join(Server)
        .filter(Message.author_id != current_user.id)
        .order_by(Message.created_at.desc())
        .limit(100)
        .all()
    )

    pending = []
    for m in all_messages:
        if not check_mention(m.content or ""):
            continue

        # Check if bot already replied in this channel after this message
        bot_reply = (
            db.query(Message)
            .filter(
                Message.channel_id == m.channel_id,
                Message.author_id == current_user.id,
                Message.id > m.id,
            )
            .first()
        )
        if bot_reply:
            continue

        channel = db.query(Channel).filter(Channel.id == m.channel_id).first()
        server = db.query(Server).filter(Server.id == channel.server_id).first()

        pending.append(PendingMention(
            message_id=m.id,
            channel_id=m.channel_id,
            channel_name=channel.name,
            server_id=server.id,
            server_name=server.name,
            author_username=m.author.username,
            content=m.content,
            created_at=m.created_at.isoformat(),
        ))

    return pending


@router.get("/channels")
def list_bot_channels(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List channels the bot has access to."""
    if not current_user.is_bot:
        raise HTTPException(status_code=403, detail="Only bot users can access this endpoint")

    bot = get_bot_user(db)
    # Get all servers the bot is a member of
    servers = bot.servers + bot.owned_servers
    seen = set()
    result = []
    for s in servers:
        if s.id in seen:
            continue
        seen.add(s.id)
        channels = db.query(Channel).filter(Channel.server_id == s.id).all()
        result.append({
            "server_id": s.id,
            "server_name": s.name,
            "channels": [{"id": c.id, "name": c.name, "type": c.type} for c in channels],
        })
    return result


@router.post("/join/{server_id}")
def bot_join_server(server_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Add the bot to a server."""
    if not current_user.is_bot:
        raise HTTPException(status_code=403, detail="Only bot users can access this endpoint")

    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    bot = get_bot_user(db)
    if bot not in server.members and server.owner_id != bot.id:
        server.members.append(bot)
        db.commit()

    return {"status": "ok", "server": server.name}