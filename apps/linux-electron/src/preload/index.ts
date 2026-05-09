import { contextBridge, ipcRenderer } from 'electron';
import type { DiagnosticReport } from '../shared/diagnostics.js';
import type { CredentialInput, CredentialName, CredentialStatus } from '../shared/credentials.js';
import type {
  OrgoComputerListInput,
  OrgoComputerListResult,
  OrgoVerificationResult,
  OrgoWorkspaceListResult,
} from '../shared/orgo.js';

export interface OS1Api {
  diagnostics: {
    run: () => Promise<DiagnosticReport>;
  };
  credentials: {
    list: () => Promise<CredentialStatus[]>;
    save: (input: CredentialInput) => Promise<CredentialStatus[]>;
    delete: (name: CredentialName) => Promise<CredentialStatus[]>;
  };
  orgo: {
    verify: () => Promise<OrgoVerificationResult>;
    listWorkspaces: () => Promise<OrgoWorkspaceListResult>;
    listComputers: (input: OrgoComputerListInput) => Promise<OrgoComputerListResult>;
  };
}

const api: OS1Api = {
  diagnostics: {
    run: () => ipcRenderer.invoke('diagnostics:run') as Promise<DiagnosticReport>,
  },
  credentials: {
    list: () => ipcRenderer.invoke('credentials:list') as Promise<CredentialStatus[]>,
    save: (input) => ipcRenderer.invoke('credentials:save', input) as Promise<CredentialStatus[]>,
    delete: (name) => ipcRenderer.invoke('credentials:delete', name) as Promise<CredentialStatus[]>,
  },
  orgo: {
    verify: () => ipcRenderer.invoke('orgo:verify') as Promise<OrgoVerificationResult>,
    listWorkspaces: () => ipcRenderer.invoke('orgo:list-workspaces') as Promise<OrgoWorkspaceListResult>,
    listComputers: (input) => ipcRenderer.invoke('orgo:list-computers', input) as Promise<OrgoComputerListResult>,
  },
};

contextBridge.exposeInMainWorld('os1', api);

declare global {
  interface Window {
    os1: OS1Api;
  }
}
