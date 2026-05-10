#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/linux-electron"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js 22 or newer, then run this script again." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node.js 22 or newer is required. Current version: $(node --version)" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install npm, then run this script again." >&2
  exit 1
fi

cd "$APP_DIR"

echo "Installing OS1 Linux Electron dependencies..."
npm install

echo "Building OS1 Linux Electron shell..."
npm run build:ci

cat <<'MSG'

OS1 Linux Electron shell is installed and built.

Run it with:

  cd apps/linux-electron
  npm start

For development mode:

  cd apps/linux-electron
  npm run dev

Then in another terminal:

  cd apps/linux-electron
  OS1_ELECTRON_DEV=1 npm start

MSG
