import { contextBridge, ipcRenderer } from 'electron';
import type { ConnectionInput, ConnectionStoreSnapshot, ConnectionTestResult } from '../shared/connections.js';
import type { DiagnosticReport } from '../shared/diagnostics.js';
import type { CredentialInput, CredentialName, CredentialStatus } from '../shared/credentials.js';
import type {
  OrgoComputerListInput,
  OrgoComputerListResult,
  OrgoVerificationResult,
  OrgoWorkspaceListResult,
} from '../shared/orgo.js';
import type {
  PrepareTerminalSessionInput,
  TerminalResizeInput,
  TerminalSessionState,
  TerminalWriteInput,
} from '../shared/terminal.js';

export interface OS1Api {
  diagnostics: { run: () => Promise<DiagnosticReport> };
  credentials: {
    list: () => Promise<CredentialStatus[]>;
    save: (input: CredentialInput) => Promise<CredentialStatus[]>;
    delete: (name: CredentialName) => Promise<CredentialStatus[]>;
  };
  connections: {
    list: () => Promise<ConnectionStoreSnapshot>;
    save: (input: ConnectionInput) => Promise<ConnectionStoreSnapshot>;
    delete: (id: string) => Promise<ConnectionStoreSnapshot>;
    setActive: (id: string) => Promise<ConnectionStoreSnapshot>;
    test: (id: string) => Promise<ConnectionTestResult>;
  };
  orgo: {
    verify: () => Promise<OrgoVerificationResult>;
    listWorkspaces: () => Promise<OrgoWorkspaceListResult>;
    listComputers: (input: OrgoComputerListInput) => Promise<OrgoComputerListResult>;
  };
  terminal: {
    get: () => Promise<TerminalSessionState>;
    prepare: (input: PrepareTerminalSessionInput) => Promise<TerminalSessionState>;
    connect: () => Promise<TerminalSessionState>;
    write: (input: TerminalWriteInput) => Promise<TerminalSessionState>;
    resize: (input: TerminalResizeInput) => Promise<TerminalSessionState>;
    disconnect: () => Promise<TerminalSessionState>;
  };
}

const api: OS1Api = {
  diagnostics: { run: () => ipcRenderer.invoke('diagnostics:run') as Promise<DiagnosticReport> },
  credentials: {
    list: () => ipcRenderer.invoke('credentials:list') as Promise<CredentialStatus[]>,
    save: (input) => ipcRenderer.invoke('credentials:save', input) as Promise<CredentialStatus[]>,
    delete: (name) => ipcRenderer.invoke('credentials:delete', name) as Promise<CredentialStatus[]>,
  },
  connections: {
    list: () => ipcRenderer.invoke('connections:list') as Promise<ConnectionStoreSnapshot>,
    save: (input) => ipcRenderer.invoke('connections:save', input) as Promise<ConnectionStoreSnapshot>,
    delete: (id) => ipcRenderer.invoke('connections:delete', id) as Promise<ConnectionStoreSnapshot>,
    setActive: (id) => ipcRenderer.invoke('connections:set-active', id) as Promise<ConnectionStoreSnapshot>,
    test: (id) => ipcRenderer.invoke('connections:test', id) as Promise<ConnectionTestResult>,
  },
  orgo: {
    verify: () => ipcRenderer.invoke('orgo:verify') as Promise<OrgoVerificationResult>,
    listWorkspaces: () => ipcRenderer.invoke('orgo:list-workspaces') as Promise<OrgoWorkspaceListResult>,
    listComputers: (input) => ipcRenderer.invoke('orgo:list-computers', input) as Promise<OrgoComputerListResult>,
  },
  terminal: {
    get: () => ipcRenderer.invoke('terminal:get') as Promise<TerminalSessionState>,
    prepare: (input) => ipcRenderer.invoke('terminal:prepare', input) as Promise<TerminalSessionState>,
    connect: () => ipcRenderer.invoke('terminal:connect') as Promise<TerminalSessionState>,
    write: (input) => ipcRenderer.invoke('terminal:write', input) as Promise<TerminalSessionState>,
    resize: (input) => ipcRenderer.invoke('terminal:resize', input) as Promise<TerminalSessionState>,
    disconnect: () => ipcRenderer.invoke('terminal:disconnect') as Promise<TerminalSessionState>,
  },
};

contextBridge.exposeInMainWorld('os1', api);

declare global {
  interface Window { os1: OS1Api }
}
