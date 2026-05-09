import { contextBridge, ipcRenderer } from 'electron';
import type { DiagnosticReport } from '../shared/diagnostics.js';

export interface OS1Api {
  diagnostics: {
    run: () => Promise<DiagnosticReport>;
  };
}

const api: OS1Api = {
  diagnostics: {
    run: () => ipcRenderer.invoke('diagnostics:run') as Promise<DiagnosticReport>,
  },
};

contextBridge.exposeInMainWorld('os1', api);

declare global {
  interface Window {
    os1: OS1Api;
  }
}
