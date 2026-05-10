import Store from 'electron-store';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { ConnectionProfile } from '../shared/ipc.js';

interface StoreSchema {
  connections: ConnectionProfile[];
  activeConnectionId: string | null;
}

let store: Store<StoreSchema> | null = null;

function getStore(): Store<StoreSchema> {
  if (!store) {
    store = new Store<StoreSchema>({
      defaults: { connections: [], activeConnectionId: null },
    });
  }
  return store;
}

export function listConnections(): ConnectionProfile[] {
  return getStore().get('connections');
}

export function saveConnection(profile: ConnectionProfile): ConnectionProfile[] {
  const s = getStore();
  const existing = s.get('connections');
  const idx = existing.findIndex((c) => c.id === profile.id);
  if (idx >= 0) {
    existing[idx] = profile;
  } else {
    existing.push(profile);
  }
  s.set('connections', existing);
  return existing;
}

export function deleteConnection(id: string): ConnectionProfile[] {
  const s = getStore();
  const updated = s.get('connections').filter((c) => c.id !== id);
  s.set('connections', updated);
  if (s.get('activeConnectionId') === id) {
    s.set('activeConnectionId', updated[0]?.id ?? null);
  }
  return updated;
}

export function getActiveConnectionId(): string | null {
  return getStore().get('activeConnectionId');
}

export function setActiveConnectionId(id: string | null): void {
  getStore().set('activeConnectionId', id);
}
