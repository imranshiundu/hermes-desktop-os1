import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { DiagnosticCheck, DiagnosticReport } from '../shared/diagnostics.js';

const execFileAsync = promisify(execFile);

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync('sh', ['-lc', `command -v ${JSON.stringify(command)} >/dev/null 2>&1`]);
    return true;
  } catch {
    return false;
  }
}

async function fileExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function check(status: DiagnosticCheck['status'], id: string, group: string, label: string, message: string, fix?: string): DiagnosticCheck {
  return { id, group, status, label, message, fix };
}

export async function buildDiagnosticReport(): Promise<DiagnosticReport> {
  const checks: DiagnosticCheck[] = [];

  checks.push(check('ok', 'platform.detected', 'Platform', 'Platform detected', `${process.platform} / ${process.arch}`));

  if (process.platform === 'linux') {
    checks.push(check('ok', 'platform.linux', 'Platform', 'Linux host', 'Linux desktop shell target detected.'));
  } else {
    checks.push(check('warn', 'platform.not-linux', 'Platform', 'Non-Linux host', 'This Electron shell is intended for Linux first.'));
  }

  for (const command of ['git', 'ssh', 'node', 'npm', 'npx']) {
    const exists = await commandExists(command);
    checks.push(
      exists
        ? check('ok', `command.${command}`, 'Commands', command, `${command} is available.`)
        : check('warn', `command.${command}`, 'Commands', command, `${command} is missing.`, `Install ${command} or ensure it is on PATH.`),
    );
  }

  const doctorPath = '../../scripts/doctor.sh';
  const doctorExecutable = await fileExecutable(doctorPath);
  checks.push(
    doctorExecutable
      ? check('ok', 'script.doctor', 'Scripts', 'doctor.sh', 'Preflight script is executable.')
      : check('warn', 'script.doctor', 'Scripts', 'doctor.sh', 'Preflight script is missing or not executable.', 'Run chmod +x scripts/doctor.sh from the repository root.'),
  );

  checks.push(
    process.env.ORGO_API_KEY
      ? check('ok', 'env.orgo', 'Credentials', 'ORGO_API_KEY', 'Environment fallback is present.')
      : check('warn', 'env.orgo', 'Credentials', 'ORGO_API_KEY', 'Environment fallback is not set.', 'This is fine until Orgo login is implemented.'),
  );

  checks.push(
    process.env.OPENAI_API_KEY
      ? check('ok', 'env.openai', 'Credentials', 'OPENAI_API_KEY', 'Environment fallback is present.')
      : check('warn', 'env.openai', 'Credentials', 'OPENAI_API_KEY', 'Environment fallback is not set.', 'Only needed when voice mode is implemented.'),
  );

  return {
    app: 'OS1',
    platform: process.platform,
    arch: process.arch,
    generatedAt: new Date().toISOString(),
    checks,
  };
}
