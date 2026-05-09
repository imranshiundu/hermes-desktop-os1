import { getCredentialValue } from './credentials.js';
import type {
  OrgoComputer,
  OrgoComputerListInput,
  OrgoComputerListResult,
  OrgoVerificationResult,
  OrgoWorkspace,
  OrgoWorkspaceListResult,
} from '../shared/orgo.js';

const ORGO_BASE_URL = process.env.OS1_ORGO_BASE_URL?.trim() || 'https://www.orgo.ai';

const VERIFY_ENDPOINTS = [
  '/api/workspaces',
  '/api/computers',
  '/api/me',
];

const WORKSPACE_ENDPOINTS = [
  '/api/workspaces',
  '/api/orgo/workspaces',
];

const COMPUTER_ENDPOINTS = [
  '/api/computers',
  '/api/orgo/computers',
];

type UnknownRecord = Record<string, unknown>;

function safeMessage(status: number): string {
  if (status === 401 || status === 403) return 'Orgo key was rejected.';
  if (status === 404) return 'Orgo verification endpoint was not found.';
  if (status >= 500) return 'Orgo service returned a server error.';
  return `Orgo verification failed with HTTP ${status}.`;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const record = asRecord(value);
  if (!record) return [];

  for (const key of ['workspaces', 'computers', 'data', 'items', 'results']) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested;
  }

  return [];
}

function normalizeWorkspace(value: unknown): OrgoWorkspace | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = stringValue(record.id) ?? stringValue(record.uuid) ?? stringValue(record.workspace_id);
  if (!id) return null;

  const name = stringValue(record.name) ?? stringValue(record.title) ?? stringValue(record.slug) ?? id;
  return { id, name };
}

function normalizeComputer(value: unknown, fallbackWorkspaceId?: string): OrgoComputer | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = stringValue(record.id) ?? stringValue(record.uuid) ?? stringValue(record.computer_id);
  if (!id) return null;

  const name = stringValue(record.name) ?? stringValue(record.hostname) ?? stringValue(record.title) ?? id;
  const status = stringValue(record.status) ?? stringValue(record.state) ?? undefined;
  const workspaceId = stringValue(record.workspace_id) ?? stringValue(record.workspaceId) ?? fallbackWorkspaceId;

  return { id, name, status, workspaceId };
}

async function authedGet(apiKey: string, endpoint: string): Promise<Response> {
  const url = `${ORGO_BASE_URL}${endpoint}`;
  return fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
}

function withWorkspaceQuery(endpoint: string, workspaceId?: string): string {
  if (!workspaceId) return endpoint;
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}workspaceId=${encodeURIComponent(workspaceId)}`;
}

function workspaceScopedEndpoints(workspaceId?: string): string[] {
  if (!workspaceId) return COMPUTER_ENDPOINTS;

  return [
    `/api/workspaces/${encodeURIComponent(workspaceId)}/computers`,
    `/api/orgo/workspaces/${encodeURIComponent(workspaceId)}/computers`,
    ...COMPUTER_ENDPOINTS.map((endpoint) => withWorkspaceQuery(endpoint, workspaceId)),
  ];
}

async function tryEndpoint(apiKey: string, endpoint: string): Promise<OrgoVerificationResult | null> {
  const response = await authedGet(apiKey, endpoint);

  if (response.ok) {
    return {
      provider: 'orgo',
      status: 'ok',
      checkedAt: new Date().toISOString(),
      message: 'Orgo key verified.',
      endpointTried: endpoint,
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      provider: 'orgo',
      status: 'fail',
      checkedAt: new Date().toISOString(),
      message: safeMessage(response.status),
      endpointTried: endpoint,
    };
  }

  if (response.status !== 404) {
    return {
      provider: 'orgo',
      status: 'warn',
      checkedAt: new Date().toISOString(),
      message: safeMessage(response.status),
      endpointTried: endpoint,
    };
  }

  return null;
}

export async function verifyOrgoKey(): Promise<OrgoVerificationResult> {
  const apiKey = await getCredentialValue('orgo');

  if (!apiKey) {
    return {
      provider: 'orgo',
      status: 'fail',
      checkedAt: new Date().toISOString(),
      message: 'Orgo key is missing.',
    };
  }

  for (const endpoint of VERIFY_ENDPOINTS) {
    try {
      const result = await tryEndpoint(apiKey, endpoint);
      if (result) return result;
    } catch {
      return {
        provider: 'orgo',
        status: 'warn',
        checkedAt: new Date().toISOString(),
        message: 'Unable to reach Orgo verification endpoint.',
        endpointTried: endpoint,
      };
    }
  }

  return {
    provider: 'orgo',
    status: 'warn',
    checkedAt: new Date().toISOString(),
    message: 'No known Orgo verification endpoint responded. API route may have changed.',
  };
}

export async function listOrgoWorkspaces(): Promise<OrgoWorkspaceListResult> {
  const apiKey = await getCredentialValue('orgo');

  if (!apiKey) {
    return {
      provider: 'orgo',
      status: 'fail',
      checkedAt: new Date().toISOString(),
      message: 'Orgo key is missing.',
      workspaces: [],
    };
  }

  for (const endpoint of WORKSPACE_ENDPOINTS) {
    try {
      const response = await authedGet(apiKey, endpoint);

      if (response.status === 401 || response.status === 403) {
        return {
          provider: 'orgo',
          status: 'fail',
          checkedAt: new Date().toISOString(),
          message: 'Orgo key was rejected.',
          endpointTried: endpoint,
          workspaces: [],
        };
      }

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        return {
          provider: 'orgo',
          status: 'warn',
          checkedAt: new Date().toISOString(),
          message: `Unable to list workspaces. HTTP ${response.status}.`,
          endpointTried: endpoint,
          workspaces: [],
        };
      }

      const raw = await response.json() as unknown;
      const workspaces = readArray(raw).map(normalizeWorkspace).filter((workspace): workspace is OrgoWorkspace => Boolean(workspace));

      return {
        provider: 'orgo',
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: workspaces.length ? `Loaded ${workspaces.length} workspace(s).` : 'Workspace endpoint responded, but no workspaces were returned.',
        endpointTried: endpoint,
        workspaces,
      };
    } catch {
      return {
        provider: 'orgo',
        status: 'warn',
        checkedAt: new Date().toISOString(),
        message: 'Unable to reach Orgo workspace endpoint.',
        endpointTried: endpoint,
        workspaces: [],
      };
    }
  }

  return {
    provider: 'orgo',
    status: 'warn',
    checkedAt: new Date().toISOString(),
    message: 'No known Orgo workspace endpoint responded. API route may have changed.',
    workspaces: [],
  };
}

export async function listOrgoComputers(input: OrgoComputerListInput = {}): Promise<OrgoComputerListResult> {
  const apiKey = await getCredentialValue('orgo');

  if (!apiKey) {
    return {
      provider: 'orgo',
      status: 'fail',
      checkedAt: new Date().toISOString(),
      message: 'Orgo key is missing.',
      workspaceId: input.workspaceId,
      computers: [],
    };
  }

  for (const endpoint of workspaceScopedEndpoints(input.workspaceId)) {
    try {
      const response = await authedGet(apiKey, endpoint);

      if (response.status === 401 || response.status === 403) {
        return {
          provider: 'orgo',
          status: 'fail',
          checkedAt: new Date().toISOString(),
          message: 'Orgo key was rejected.',
          endpointTried: endpoint,
          workspaceId: input.workspaceId,
          computers: [],
        };
      }

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        return {
          provider: 'orgo',
          status: 'warn',
          checkedAt: new Date().toISOString(),
          message: `Unable to list computers. HTTP ${response.status}.`,
          endpointTried: endpoint,
          workspaceId: input.workspaceId,
          computers: [],
        };
      }

      const raw = await response.json() as unknown;
      const computers = readArray(raw).map((item) => normalizeComputer(item, input.workspaceId)).filter((computer): computer is OrgoComputer => Boolean(computer));

      return {
        provider: 'orgo',
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: computers.length ? `Loaded ${computers.length} computer(s).` : 'Computer endpoint responded, but no computers were returned.',
        endpointTried: endpoint,
        workspaceId: input.workspaceId,
        computers,
      };
    } catch {
      return {
        provider: 'orgo',
        status: 'warn',
        checkedAt: new Date().toISOString(),
        message: 'Unable to reach Orgo computer endpoint.',
        endpointTried: endpoint,
        workspaceId: input.workspaceId,
        computers: [],
      };
    }
  }

  return {
    provider: 'orgo',
    status: 'warn',
    checkedAt: new Date().toISOString(),
    message: 'No known Orgo computer endpoint responded. API route may have changed.',
    workspaceId: input.workspaceId,
    computers: [],
  };
}
