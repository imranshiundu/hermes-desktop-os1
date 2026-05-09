import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDiagnosticReport } from './diagnostics.js';
import { deleteCredential, listCredentialStatuses, saveCredential } from './credentials.js';
import { verifyOrgoKey } from './orgo.js';
import type { CredentialInput, CredentialName } from '../shared/credentials.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isDev(): boolean {
  return process.env.OS1_ELECTRON_DEV === '1';
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 940,
    minHeight: 620,
    title: 'OS1',
    backgroundColor: '#f7f1e8',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  if (isDev()) {
    void window.loadURL('http://127.0.0.1:5173');
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    void window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

ipcMain.handle('diagnostics:run', async () => buildDiagnosticReport());
ipcMain.handle('credentials:list', async () => listCredentialStatuses());
ipcMain.handle('credentials:save', async (_event, input: CredentialInput) => saveCredential(input));
ipcMain.handle('credentials:delete', async (_event, name: CredentialName) => deleteCredential(name));
ipcMain.handle('orgo:verify', async () => verifyOrgoKey());

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
