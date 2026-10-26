"""WebSocket Gateway for real-time messaging in Quetzalcoatl."""

import json
import asyncio
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from models import get_db, User, Channel, Server, Message
from auth import decode_token


class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""

    def __init__(self):
        # user_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # channel_id -> set of user_ids watching
        self.channel_subscribers: Dict[int, Set[int]] = {}
        # user_id -> set of channel_ids
        self.user_channels: Dict[int, Set[int]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def subscribe(self, user_id: int, channel_id: int):
        if channel_id not in self.channel_subscribers:
            self.channel_subscribers[channel_id] = set()
        self.channel_subscribers[channel_id].add(user_id)
        if user_id not in self.user_channels:
            self.user_channels[user_id] = set()
        self.user_channels[user_id].add(channel_id)

    def unsubscribe(self, user_id: int, channel_id: int):
        if channel_id in self.channel_subscribers:
            self.channel_subscribers[channel_id].discard(user_id)
        if user_id in self.user_channels:
            self.user_channels[user_id].discard(channel_id)

    async def broadcast_to_channel(self, channel_id: int, message: dict, exclude_user: Optional[int] = None):
        """Send a message to all users subscribed to a channel."""
        if channel_id not in self.channel_subscribers:
            return
        for user_id in self.channel_subscribers[channel_id]:
            if user_id == exclude_user:
                continue
            if user_id in self.active_connections:
                for ws in self.active_connections[user_id]:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        pass

    async def send_to_user(self, user_id: int, message: dict):
        """Send a message to a specific user."""
        if user_id in self.active_connections:
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    async def broadcast_presence(self, user_id: int, status: str):
        """Broadcast user presence change to all connected users."""
        msg = {"type": "presence", "user_id": user_id, "status": status}
        for uid in self.active_connections:
            if uid != user_id:
                for ws in self.active_connections[uid]:
                    try:
                        await ws.send_json(msg)
                    except Exception:
                        pass


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, token: str):
    """Handle a WebSocket connection."""
    # Authenticate
    payload = decode_token(token)
    if payload is None:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = int(payload.get("sub"))
    db = next(get_db())
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(code=4001, reason="User not found")
        return

    await manager.connect(websocket, user_id)

    # Update presence
    user.status = "online"
    db.commit()
    await manager.broadcast_presence(user_id, "online")

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "subscribe":
                channel_id = data.get("channel_id")
                if channel_id:
                    await manager.subscribe(user_id, channel_id)
                    await websocket.send_json({"type": "subscribed", "channel_id": channel_id})

            elif msg_type == "unsubscribe":
                channel_id = data.get("channel_id")
                if channel_id:
                    manager.unsubscribe(user_id, channel_id)

            elif msg_type == "message":
                channel_id = data.get("channel_id")
                content = data.get("content")
                reply_to_id = data.get("reply_to_id")

                if not channel_id or not content:
                    await websocket.send_json({"type": "error", "message": "Missing channel_id or content"})
                    continue

                # Verify channel exists and user has access
                channel = db.query(Channel).filter(Channel.id == channel_id).first()
                if not channel:
                    await websocket.send_json({"type": "error", "message": "Channel not found"})
                    continue

                server = db.query(Server).filter(Server.id == channel.server_id).first()
                if user not in server.members and server.owner_id != user.id:
                    await websocket.send_json({"type": "error", "message": "Not a member"})
                    continue

                # Create message
                msg = Message(
                    channel_id=channel_id,
                    author_id=user_id,
                    content=content,
                    reply_to_id=reply_to_id,
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)

                # Build response
                msg_data = {
                    "type": "message",
                    "id": msg.id,
                    "channel_id": msg.channel_id,
                    "author_id": msg.author_id,
                    "author_username": user.username,
                    "author_display_name": user.display_name,
                    "author_avatar": user.avatar_url,
                    "content": msg.content,
                    "reply_to_id": msg.reply_to_id,
                    "is_pinned": msg.is_pinned,
                    "is_edited": msg.is_edited,
                    "created_at": msg.created_at.isoformat(),
                    "updated_at": msg.updated_at.isoformat(),
                    "attachments": [],
                    "reactions": [],
                }

                # Broadcast to channel (including sender for confirmation)
                await manager.broadcast_to_channel(channel_id, msg_data)

            elif msg_type == "typing":
                channel_id = data.get("channel_id")
                if channel_id:
                    await manager.broadcast_to_channel(
                        channel_id,
                        {"type": "typing", "user_id": user_id, "channel_id": channel_id},
                        exclude_user=user_id,
                    )

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Update presence
        user.status = "offline"
        db.commit()
        await manager.broadcast_presence(user_id, "offline")
        manager.disconnect(websocket, user_id)
        db.close()