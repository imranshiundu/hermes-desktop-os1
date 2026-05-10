import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { app } from 'electron';
import type {
  ConnectionInput,
  ConnectionProfile,
  ConnectionStoreSnapshot,
  ConnectionTestResult,
} from '../shared/connections.js';

interface StoredConnectionFile {
  activeConnectionId?: string;
  connections?: ConnectionProfile[];
}

function now(): string {
  return new Date().toISOString();
}

function storePath(): string {
  return path.join(app.getPath('userData'), 'connections.local.json');
}

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizePort(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SSH port must be between 1 and 65535.');
  }
  return port;
}

function normalizeInput(input: ConnectionInput, existing?: ConnectionProfile): ConnectionProfile {
  const label = cleanString(input.label);
  if (!label) throw new Error('Connection label is required.');
  if (input.kind !== 'ssh' && input.kind !== 'orgo') throw new Error('Unsupported connection type.');

  const profile: ConnectionProfile = {
    id: existing?.id ?? cleanString(input.id) ?? randomUUID(),
    label,
    kind: input.kind,
    sshAlias: cleanString(input.sshAlias),
    host: cleanString(input.host),
    user: cleanString(input.user),
    port: normalizePort(input.port),
    hermesProfile: cleanString(input.hermesProfile),
    remoteHermesHome: cleanString(input.remoteHermesHome),
    orgoWorkspaceId: cleanString(input.orgoWorkspaceId),
    orgoComputerId: cleanString(input.orgoComputerId),
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    lastStatus: existing?.lastStatus ?? 'untested',
    lastMessage: existing?.lastMessage ?? 'Connection has not been tested.',
    lastTestedAt: existing?.lastTestedAt,
  };

  if (profile.kind === 'ssh' && !profile.sshAlias && !profile.host) {
    throw new Error('SSH connection requires either an SSH config alias or a host.');
  }

  if (profile.kind === 'orgo' && !profile.orgoComputerId) {
    throw new Error('Orgo connection requires an Orgo computer id.');
  }

  return profile;
}

async function readStore(): Promise<StoredConnectionFile> {
  try {
    const raw = await readFile(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as StoredConnectionFile;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: StoredConnectionFile): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true });
  await writeFile(storePath(), `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
}

function snapshot(store: StoredConnectionFile): ConnectionStoreSnapshot {
  const connections = store.connections ?? [];
  const activeConnection = connections.find((connection) => connection.id === store.activeConnectionId);
  return { connections, activeConnectionId: activeConnection?.id, activeConnection };
}

export async function listConnections(): Promise<ConnectionStoreSnapshot> {
  return snapshot(await readStore());
}

export async function saveConnection(input: ConnectionInput): Promise<ConnectionStoreSnapshot> {
  const store = await readStore();
  const connections = store.connections ?? [];
  const existingIndex = input.id ? connections.findIndex((connection) => connection.id === input.id) : -1;
  const next = normalizeInput(input, existingIndex >= 0 ? connections[existingIndex] : undefined);

  if (existingIndex >= 0) connections[existingIndex] = next;
  else connections.unshift(next);

  store.connections = connections;
  store.activeConnectionId = store.activeConnectionId ?? next.id;
  await writeStore(store);
  return snapshot(store);
}

export async function deleteConnection(id: string): Promise<ConnectionStoreSnapshot> {
  const store = await readStore();
  const connections = (store.connections ?? []).filter((connection) => connection.id !== id);
  store.connections = connections;
  if (store.activeConnectionId === id) store.activeConnectionId = connections[0]?.id;
  await writeStore(store);
  return snapshot(store);
}

export async function setActiveConnection(id: string): Promise<ConnectionStoreSnapshot> {
  const store = await readStore();
  const connections = store.connections ?? [];
  if (!connections.some((connection) => connection.id === id)) throw new Error('Connection not found.');
  store.activeConnectionId = id;
  await writeStore(store);
  return snapshot(store);
}

function runSshProbe(connection: ConnectionProfile): Promise<ConnectionTestResult> {
  return new Promise((resolve) => {
    const target = connection.sshAlias ?? `${connection.user ? `${connection.user}@` : ''}${connection.host}`;
    if (!target) {
      resolve({ id: connection.id, status: 'fail', checkedAt: now(), message: 'SSH target is missing.' });
      return;
    }

    const args = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=6', '-o', 'StrictHostKeyChecking=accept-new'];
    if (connection.port) args.push('-p', String(connection.port));
    args.push(target, 'echo', 'hermes-os1-ok');

    const child = spawn('ssh', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), 8_000);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ id: connection.id, status: 'fail', checkedAt: now(), message: 'Unable to start ssh. Install OpenSSH client or fix PATH.', detail: error.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const ok = code === 0 && stdout.includes('hermes-os1-ok');
      resolve({
        id: connection.id,
        status: ok ? 'ok' : 'fail',
        checkedAt: now(),
        message: ok ? 'SSH connection verified.' : `SSH probe failed with exit code ${code ?? 'unknown'}.`,
        detail: ok ? undefined : stderr.trim() || stdout.trim() || 'No SSH output returned.',
      });
    });
  });
}

export async function testConnection(id: string): Promise<ConnectionTestResult> {
  const store = await readStore();
  const connections = store.connections ?? [];
  const index = connections.findIndex((connection) => connection.id === id);
  if (index < 0) throw new Error('Connection not found.');

  const connection = connections[index];
  const result: ConnectionTestResult = connection.kind === 'ssh'
    ? await runSshProbe(connection)
    : { id: connection.id, status: 'warn', checkedAt: now(), message: 'Orgo connection exists locally. Cloud transport test is handled from the Orgo computers panel.' };

  connections[index] = { ...connection, lastStatus: result.status, lastMessage: result.message, lastTestedAt: result.checkedAt, updatedAt: now() };
  store.connections = connections;
  await writeStore(store);
  return result;
}
