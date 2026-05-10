#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/linux-electron"
SANDBOX="$APP_DIR/node_modules/electron/dist/chrome-sandbox"

if [ ! -f "$ROOT_DIR/.git/config" ] || [ ! -f "$ROOT_DIR/apps/linux-electron/package.json" ]; then
  echo "This script must run from a real hermes-desktop-os1 checkout." >&2
  echo "Recommended clean install:" >&2
  echo "  cd ~" >&2
  echo "  rm -rf ~/hermes-desktop-os1" >&2
  echo "  git clone https://github.com/imranshiundu/hermes-desktop-os1.git" >&2
  echo "  cd ~/hermes-desktop-os1" >&2
  echo "  ./scripts/install-linux-electron.sh" >&2
  exit 1
fi

case "$ROOT_DIR" in
  */apps/linux-electron/hermes-desktop-os1)
    echo "Nested checkout detected: $ROOT_DIR" >&2
    echo "You cloned hermes-desktop-os1 inside apps/linux-electron." >&2
    echo "Fix:" >&2
    echo "  cd ~" >&2
    echo "  rm -rf ~/hermes-desktop-os1" >&2
    echo "  git clone https://github.com/imranshiundu/hermes-desktop-os1.git" >&2
    echo "  cd ~/hermes-desktop-os1" >&2
    echo "  ./scripts/install-linux-electron.sh" >&2
    exit 1
    ;;
esac

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

if [ -f "$SANDBOX" ]; then
  OWNER="$(stat -c '%U' "$SANDBOX")"
  MODE="$(stat -c '%a' "$SANDBOX")"
  if [ "$OWNER" != "root" ] || [ "$MODE" != "4755" ]; then
    cat <<MSG

Electron sandbox needs one Linux permission fix before first launch:

  sudo chown root:root "$SANDBOX"
  sudo chmod 4755 "$SANDBOX"

This keeps Electron sandboxing enabled instead of launching with --no-sandbox.
MSG
  fi
fi

cat <<'MSG'

OS1 Linux Electron shell is installed and built.

Run the desktop app from the repository root with:

  ./scripts/run-linux-electron.sh

Do not open http://127.0.0.1:5173 unless you are intentionally debugging the renderer.
That Vite URL is only the renderer dev server, not the OS1 desktop app.

For development mode:

  cd apps/linux-electron
  npm run dev

Then in another terminal from the repository root:

  OS1_ELECTRON_DEV=1 ./scripts/run-linux-electron.sh

MSG
