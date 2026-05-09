export type CredentialName = 'orgo' | 'openai';

export type CredentialSource = 'secure-store' | 'environment' | 'missing';

export interface CredentialStatus {
  name: CredentialName;
  label: string;
  present: boolean;
  source: CredentialSource;
  writable: boolean;
  message: string;
}

export interface CredentialInput {
  name: CredentialName;
  value: string;
}
