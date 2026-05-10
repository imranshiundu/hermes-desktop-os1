// ─── Connection profiles ───────────────────────────────────────────────────

export type TransportKind = 'ssh' | 'orgo';

export interface SSHConfig {
  alias: string;
  host: string;
  user: string;
  port: number | null;
}

export interface OrgoConfig {
  workspaceId: string;
  computerId: string;
  computerName?: string;
}

export interface ConnectionProfile {
  id: string;
  label: string;
  transport: TransportKind;
  ssh?: SSHConfig;
  orgo?: OrgoConfig;
  hermesProfile?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Sessions ─────────────────────────────────────────────────────────────

export interface SessionSummary {
  id: string;
  title?: string;
  preview?: string;
  messageCount?: number;
  startedAt?: string;
  lastActive?: string;
  pinned?: boolean;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
}

export interface SessionDetail {
  id: string;
  title?: string;
  messages: SessionMessage[];
}

// ─── Overview ─────────────────────────────────────────────────────────────

export interface OverviewStatus {
  agentInstalled: boolean;
  agentVersion?: string;
  agentLatestVersion?: string;
  hermesHomePath?: string;
  pythonPath?: string;
  gatewayUrl?: string;
  gatewayReachable: boolean;
  installRunning: boolean;
  updateRunning: boolean;
  updateAvailable: boolean;
  updateVersionLabel?: string;
}

// ─── Files ────────────────────────────────────────────────────────────────

export interface RemoteFile {
  path: string;
  name: string;
  isDir: boolean;
  size?: number;
  modifiedAt?: string;
}

// ─── Cron Jobs ────────────────────────────────────────────────────────────

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

// ─── Kanban ───────────────────────────────────────────────────────────────

export interface KanbanCard {
  id: string;
  title: string;
  body?: string;
  status: string;
  priority?: string;
  createdAt?: string;
}

// ─── Skills ───────────────────────────────────────────────────────────────

export interface Skill {
  name: string;
  description?: string;
  path: string;
  tags?: string[];
}

// ─── Knowledge Base ───────────────────────────────────────────────────────

export interface KnowledgeEntry {
  name: string;
  path: string;
  preview?: string;
  size?: number;
}

// ─── Usage ────────────────────────────────────────────────────────────────

export interface UsageEntry {
  provider: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  totalCost?: number;
  date: string;
}

// ─── Doctor ───────────────────────────────────────────────────────────────

export interface HealthCheck {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

// ─── Exec results ─────────────────────────────────────────────────────────

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
