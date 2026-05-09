export type TerminalTransport = 'orgo-websocket' | 'ssh' | 'unknown';

export type TerminalSessionStatus = 'idle' | 'selected' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TerminalTarget {
  provider: 'orgo' | 'ssh';
  computerId?: string;
  workspaceId?: string;
  displayName: string;
  transport: TerminalTransport;
}

export interface TerminalSessionState {
  status: TerminalSessionStatus;
  target?: TerminalTarget;
  message: string;
  updatedAt: string;
}

export interface PrepareTerminalSessionInput {
  target: TerminalTarget;
}

export interface TerminalWriteInput {
  data: string;
}

export interface TerminalResizeInput {
  cols: number;
  rows: number;
}
