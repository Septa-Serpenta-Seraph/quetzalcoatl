const { app, BrowserWindow, Tray, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let tray = null;
let backendProcess = null;
const BACKEND_PORT = 8000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

function startBackend() {
  const backendDir = path.join(__dirname, '..', 'backend');
  const venvPython = path.join(backendDir, '.venv', 'bin', 'python');
  const uvicorn = path.join(backendDir, '.venv', 'bin', 'uvicorn');

  // Use uvicorn from venv if available, otherwise fall back to system python
  const cmd = require('fs').existsSync(uvicorn) ? uvicorn : 'python3';
  const args = require('fs').existsSync(uvicorn)
    ? ['main:app', '--host', '0.0.0.0', '--port', String(BACKEND_PORT)]
    : ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', String(BACKEND_PORT)];

  const env = { ...process.env };
  if (!env.SECRET_KEY) {
    // Generate a random secret key if not set
    const crypto = require('crypto');
    env.SECRET_KEY = crypto.randomBytes(32).toString('hex');
  }

  backendProcess = spawn(cmd, args, {
    cwd: backendDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backendProcess.stdout.on('data', (data) => console.log(`[backend] ${data}`));
  backendProcess.stderr.on('data', (data) => console.error(`[backend] ${data}`));
  backendProcess.on('exit', (code) => console.log(`Backend exited with code ${code}`));
}

function waitForBackend(callback, retries = 30) {
  const req = http.get(`${BACKEND_URL}/health`, (res) => {
    if (res.statusCode === 200) callback();
    else retry(callback, retries);
  });
  req.on('error', () => retry(callback, retries));
  req.setTimeout(1000, () => { req.destroy(); retry(callback, retries); });
}

function retry(callback, retries) {
  if (retries <= 0) {
    console.error('Backend failed to start');
    return;
  }
  setTimeout(() => waitForBackend(callback, retries - 1), 1000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Quetzalcoatl',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the frontend from the backend server
  mainWindow.loadURL(BACKEND_URL);

  mainWindow.on('close', (e) => {
    if (process.platform !== 'darwin') {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Try to create tray icon, skip if icon file doesn't exist
  const iconPath = path.join(__dirname, 'icon.png');
  if (!require('fs').existsSync(iconPath)) {
    console.log('No tray icon found, skipping tray');
    return;
  }
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Quetzalcoatl', click: () => { if (mainWindow) mainWindow.show(); } },
    { label: 'Open in Browser', click: () => shell.openExternal(BACKEND_URL) },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit(); } },
  ]);
  tray.setToolTip('Quetzalcoatl');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { if (mainWindow) mainWindow.show(); });
}

app.whenReady().then(() => {
  startBackend();
  waitForBackend(() => {
    createWindow();
    createTray();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit, keep running in tray
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});

// Handle protocol for deep linking (quetzalcoatl://)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('quetzalcoatl', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('quetzalcoatl');
}