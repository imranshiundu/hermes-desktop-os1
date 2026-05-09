export type ProviderStatus = 'untested' | 'ok' | 'warn' | 'fail';

export interface OrgoVerificationResult {
  provider: 'orgo';
  status: ProviderStatus;
  checkedAt: string;
  message: string;
  accountLabel?: string;
  endpointTried?: string;
}

export interface OrgoWorkspace {
  id: string;
  name: string;
}

export interface OrgoComputer {
  id: string;
  name: string;
  status?: string;
  workspaceId?: string;
}
