export type ConnectionKind = 'ssh' | 'orgo';

export type ConnectionHealth = 'untested' | 'ok' | 'warn' | 'fail';

export interface ConnectionProfile {
  id: string;
  label: string;
  kind: ConnectionKind;
  sshAlias?: string;
  host?: string;
  user?: string;
  port?: number;
  hermesProfile?: string;
  remoteHermesHome?: string;
  orgoWorkspaceId?: string;
  orgoComputerId?: string;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  lastStatus: ConnectionHealth;
  lastMessage: string;
}

export interface ConnectionInput {
  id?: string;
  label: string;
  kind: ConnectionKind;
  sshAlias?: string;
  host?: string;
  user?: string;
  port?: number;
  hermesProfile?: string;
  remoteHermesHome?: string;
  orgoWorkspaceId?: string;
  orgoComputerId?: string;
}

export interface ConnectionStoreSnapshot {
  connections: ConnectionProfile[];
  activeConnectionId?: string;
  activeConnection?: ConnectionProfile;
}

export interface ConnectionTestResult {
  id: string;
  status: ConnectionHealth;
  checkedAt: string;
  message: string;
  detail?: string;
}
