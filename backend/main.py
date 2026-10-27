"""Main FastAPI application for Quetzalcoatl."""

import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from gateway.websocket import websocket_endpoint
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models import init_db
from api.auth_routes import router as auth_router
from api.servers import router as servers_router
from api.messages import router as messages_router
from api.bot import router as bot_router
from api.dms import router as dms_router

# Create app
app = FastAPI(
    title="Quetzalcoatl",
    description="Self-hosted messaging platform",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(servers_router)
app.include_router(messages_router)
app.include_router(bot_router)
app.include_router(dms_router)

@app.websocket("/ws")
async def websocket_route(websocket: WebSocket, token: str = Query(...)):
    await websocket_endpoint(websocket, token)

# Health check
@app.get("/health")
def health():
    return {"status": "ok", "service": "quetzalcoatl"}

# Init DB on startup
@app.on_event("startup")
def startup():
    init_db()
    # Seed bot user
    from models import get_db, User
    from api.bot import get_bot_user
    db = next(get_db())
    bot = get_bot_user(db)
    db.close()

# Serve frontend (if built)
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")