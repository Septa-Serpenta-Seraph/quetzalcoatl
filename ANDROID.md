# Quetzalcoatl Android App (Capacitor)

## Overview
The Android app wraps the Quetzalcoatl web frontend in a native Android shell using Capacitor. It connects to a Quetzalcoatl server (desktop app, self-hosted instance, or cloud).

## Prerequisites
- Node.js 18+
- (For building locally) Android Studio + Android SDK
- (For CI) GitHub Actions with Android build workflow

## Development
```bash
cd frontend
npm run build
npx cap sync android
npx cap open android  # Opens in Android Studio
```

## Building APK (via GitHub Actions)
Since Android SDK may not be available locally, use the android-app-build skill or GitHub Actions:

1. Push code to GitHub
2. GitHub Actions workflow builds the APK
3. Download APK from artifacts
4. Sideload on Android device

## Server Connection
The Android app needs to connect to a Quetzalcoatl server. On first launch, the user enters the server URL (e.g., `http://192.168.1.100:8000` or a Tailscale IP).

The server URL is stored in localStorage and used for all API calls and WebSocket connections.

## Sync
The Android app uses the same sync-after-gap mechanism as the web client:
- On reconnect, fetches missed messages via `/api/channels/{id}/messages/since/{last_id}`
- Real-time updates via WebSocket

## Notes
- The app is a client only — it doesn't run the backend. The backend must be running on a server (desktop app, VPS, etc.).
- For local network access, ensure the server's CORS_ORIGINS includes the Android app's origin.
- Tailscale is recommended for secure remote access.