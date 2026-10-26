# Quetzalcoatl

Self-hosted, open-source messaging platform. Discord-like features, mesh-networked, AI-native. Hermes as backbone.

## Features

- User accounts with JWT authentication
- Servers (guilds) with channels and roles
- Text channels with real-time messaging (WebSocket)
- Direct messages
- Reactions, replies, message editing/deletion
- Voice channels (WebRTC — coming soon)
- Custom emoji and themes
- Bot API and webhooks
- AI participant integration (Hermes)
- Web client + desktop app (Electron — coming soon)

## Quick Start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run build
# The backend serves the built frontend from frontend/dist/
```

### Development

```bash
# Backend (with auto-reload)
cd backend && .venv/bin/uvicorn main:app --reload --port 8000

# Frontend (with HMR)
cd frontend && npm run dev
```

## Architecture

- **Backend:** Python (FastAPI) + SQLAlchemy + SQLite
- **Real-time:** WebSocket gateway with connection management
- **Frontend:** React + Vite
- **Auth:** JWT tokens with bcrypt password hashing
- **Voice:** WebRTC (planned)
- **AI:** Hermes integration as native participant

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login (OAuth2 form) |
| `/api/auth/me` | GET | Get current user |
| `/api/servers` | GET/POST | List/create servers |
| `/api/servers/{id}` | GET | Get server |
| `/api/servers/{id}/channels` | GET/POST | List/create channels |
| `/api/servers/join/{code}` | POST | Join via invite |
| `/api/channels/{id}/messages` | GET/POST | List/send messages |
| `/api/messages/{id}` | PATCH/DELETE | Edit/delete message |
| `/api/messages/{id}/reactions` | POST/DELETE | Add/remove reaction |
| `/ws?token=...` | WebSocket | Real-time gateway |

## License

MIT

## Credits

Built by Adora and Narusya. Named after the feathered serpent. 🐍
