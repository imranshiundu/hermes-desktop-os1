import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const sandboxPath = path.join(appDir, 'node_modules', 'electron', 'dist', 'chrome-sandbox');
const mainPath = path.join(appDir, 'dist', 'main', 'index.js');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!existsSync(mainPath)) {
  fail('Built app is missing. Run npm run build first.');
}

if (process.platform === 'linux' && existsSync(sandboxPath)) {
  const stat = statSync(sandboxPath);
  const mode = stat.mode & 0o7777;

  if (stat.uid !== 0 || mode !== 0o4755) {
    fail(`Electron sandbox is not configured correctly.

Fix it with:

  sudo chown root:root "${sandboxPath}"
  sudo chmod 4755 "${sandboxPath}"

Then run:

  npm start

This project does not default to --no-sandbox.`);
  }
}

const result = spawnSync('electron', [mainPath], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
