# Quetzalcoatl Desktop App (Electron)

## Overview
The desktop app wraps the Quetzalcoatl backend (Python/FastAPI) and frontend (React) in a native desktop shell. It runs the backend locally and displays the web UI in a native window.

## Prerequisites
- Node.js 18+
- Python 3.11+ with backend dependencies installed
- (For building) electron-builder

## Development
```bash
cd electron
npm install
npm start
```

This will:
1. Start the Python backend (uvicorn on port 8000)
2. Wait for the backend to be ready
3. Open a native window loading http://localhost:8000

## Building
```bash
cd electron
npm install
npm run build
```

Outputs:
- **Windows**: `dist/Quetzalcoatl Setup.exe` (NSIS installer)
- **Linux**: `dist/Quetzalcoatl.AppImage`
- **macOS**: `dist/Quetzalcoatl.dmg`

## Architecture
- `main.js` — Electron main process: starts backend, creates window, tray icon
- `preload.js` — Context bridge for native APIs
- Backend runs as a child process (uvicorn)
- Frontend is served by the backend (no separate dev server needed)

## Tray Icon
The app minimizes to the system tray instead of quitting. Right-click the tray icon for:
- Show Quetzalcoatl
- Open in Browser
- Quit

## Notes
- The backend requires a `SECRET_KEY` env var. If not set, a random one is generated on first launch.
- The app data (database, uploads) is stored in the backend directory.
- For production, consider moving the data directory to a user-writable location (e.g., `app.getPath('userData')`).