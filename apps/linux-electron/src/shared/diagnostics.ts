export type DiagnosticStatus = 'ok' | 'warn' | 'fail';

export interface DiagnosticCheck {
  id: string;
  group: string;
  status: DiagnosticStatus;
  label: string;
  message: string;
  fix?: string;
}

export interface DiagnosticReport {
  app: 'OS1';
  platform: NodeJS.Platform;
  arch: string;
  generatedAt: string;
  checks: DiagnosticCheck[];
}
