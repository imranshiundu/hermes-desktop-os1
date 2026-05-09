import { getCredentialValue } from './credentials.js';
import type { OrgoVerificationResult } from '../shared/orgo.js';

const ORGO_BASE_URL = process.env.OS1_ORGO_BASE_URL?.trim() || 'https://www.orgo.ai';

const VERIFY_ENDPOINTS = [
  '/api/workspaces',
  '/api/computers',
  '/api/me',
];

function safeMessage(status: number): string {
  if (status === 401 || status === 403) return 'Orgo key was rejected.';
  if (status === 404) return 'Orgo verification endpoint was not found.';
  if (status >= 500) return 'Orgo service returned a server error.';
  return `Orgo verification failed with HTTP ${status}.`;
}

async function tryEndpoint(apiKey: string, endpoint: string): Promise<OrgoVerificationResult | null> {
  const url = `${ORGO_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

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
