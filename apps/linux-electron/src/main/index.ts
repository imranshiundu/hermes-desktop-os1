import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDiagnosticReport } from './diagnostics.js';
import { deleteCredential, listCredentialStatuses, saveCredential } from './credentials.js';
import { deleteConnection, listConnections, saveConnection, setActiveConnection, testConnection } from './connections.js';
import { listOrgoComputers, listOrgoWorkspaces, verifyOrgoKey } from './orgo.js';
import {
  connectTerminalSession,
  disconnectTerminalSession,
  getTerminalSession,
  prepareTerminalSession,
  resizeTerminal,
  writeTerminal,
} from './terminal.js';
import type { ConnectionInput } from '../shared/connections.js';
import type { CredentialInput, CredentialName } from '../shared/credentials.js';
import type { OrgoComputerListInput } from '../shared/orgo.js';
import type { PrepareTerminalSessionInput, TerminalResizeInput, TerminalWriteInput } from '../shared/terminal.js';

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
      preload: path.join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  window.webContents.on('console-message', (_event, _level, message, line) => {
    console.log(`[Renderer L${line}] ${message}`);
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
ipcMain.handle('connections:list', async () => listConnections());
ipcMain.handle('connections:save', async (_event, input: ConnectionInput) => saveConnection(input));
ipcMain.handle('connections:delete', async (_event, id: string) => deleteConnection(id));
ipcMain.handle('connections:set-active', async (_event, id: string) => setActiveConnection(id));
ipcMain.handle('connections:test', async (_event, id: string) => testConnection(id));
ipcMain.handle('orgo:verify', async () => verifyOrgoKey());
ipcMain.handle('orgo:list-workspaces', async () => listOrgoWorkspaces());
ipcMain.handle('orgo:list-computers', async (_event, input: OrgoComputerListInput) => listOrgoComputers(input));
ipcMain.handle('terminal:get', async () => getTerminalSession());
ipcMain.handle('terminal:prepare', async (_event, input: PrepareTerminalSessionInput) => prepareTerminalSession(input));
ipcMain.handle('terminal:connect', async () => connectTerminalSession());
ipcMain.handle('terminal:write', async (_event, input: TerminalWriteInput) => writeTerminal(input));
ipcMain.handle('terminal:resize', async (_event, input: TerminalResizeInput) => resizeTerminal(input));
ipcMain.handle('terminal:disconnect', async () => disconnectTerminalSession());

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
