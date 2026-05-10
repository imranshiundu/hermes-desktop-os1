import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { CredentialInput, CredentialName, CredentialStatus } from '../shared/credentials.js';

interface StoredCredentials {
  orgo?: string;
  openai?: string;
}

const CREDENTIAL_LABELS: Record<CredentialName, string> = {
  orgo: 'Orgo API key',
  openai: 'OpenAI API key',
};

const ENV_NAMES: Record<CredentialName, string> = {
  orgo: 'ORGO_API_KEY',
  openai: 'OPENAI_API_KEY',
};

function credentialsPath(): string {
  return path.join(app.getPath('userData'), 'credentials.local.json');
}

async function readStoredCredentials(): Promise<StoredCredentials> {
  try {
    const raw = await readFile(credentialsPath(), 'utf8');
    const parsed = JSON.parse(raw) as StoredCredentials;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStoredCredentials(credentials: StoredCredentials): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true });
  await writeFile(credentialsPath(), `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
}

function normalizeSecret(value: string): string {
  return value.trim();
}

function envPresent(name: CredentialName): boolean {
  return Boolean(process.env[ENV_NAMES[name]]?.trim());
}

export async function getCredentialValue(name: CredentialName): Promise<string | null> {
  const stored = await readStoredCredentials();
  const localValue = stored[name]?.trim();
  if (localValue) return localValue;

  const envValue = process.env[ENV_NAMES[name]]?.trim();
  return envValue || null;
}

export async function listCredentialStatuses(): Promise<CredentialStatus[]> {
  const stored = await readStoredCredentials();

  return (Object.keys(CREDENTIAL_LABELS) as CredentialName[]).map((name) => {
    const storedPresent = Boolean(stored[name]?.trim());
    const fallbackPresent = envPresent(name);
    const present = storedPresent || fallbackPresent;

    return {
      name,
      label: CREDENTIAL_LABELS[name],
      present,
      source: storedPresent ? 'secure-store' : fallbackPresent ? 'environment' : 'missing',
      writable: true,
      message: present
        ? storedPresent
          ? `${CREDENTIAL_LABELS[name]} is saved locally.`
          : `${CREDENTIAL_LABELS[name]} is available from environment fallback.`
        : `${CREDENTIAL_LABELS[name]} is not configured.`,
    };
  });
}

export async function saveCredential(input: CredentialInput): Promise<CredentialStatus[]> {
  const value = normalizeSecret(input.value);
  if (!value) {
    throw new Error('Credential value cannot be empty.');
  }

  const stored = await readStoredCredentials();
  stored[input.name] = value;
  await writeStoredCredentials(stored);
  return listCredentialStatuses();
}

export async function deleteCredential(name: CredentialName): Promise<CredentialStatus[]> {
  const stored = await readStoredCredentials();
  delete stored[name];
  await writeStoredCredentials(stored);
  return listCredentialStatuses();
}

/** Synchronous read used by the agent service layer. */
export function loadCredential(name: CredentialName): string | null {
  const envKey = ENV_NAMES[name];
  const envVal = process.env[envKey]?.trim();
  if (envVal) return envVal;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = (require('node:fs') as typeof import('node:fs')).readFileSync(credentialsPath(), 'utf8');
    const parsed = JSON.parse(raw) as StoredCredentials;
    return parsed[name]?.trim() || null;
  } catch {
    return null;
  }
}

