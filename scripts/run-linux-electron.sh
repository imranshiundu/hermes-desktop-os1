#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/linux-electron"
SANDBOX="$APP_DIR/node_modules/electron/dist/chrome-sandbox"

if [ ! -f "$ROOT_DIR/.git/config" ] || [ ! -f "$ROOT_DIR/apps/linux-electron/package.json" ]; then
  echo "This launcher must run from a real hermes-desktop-os1 checkout." >&2
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

if [ ! -d "$APP_DIR/node_modules" ]; then
  echo "Dependencies are missing. Run ./scripts/install-linux-electron.sh first." >&2
  exit 1
fi

if [ ! -f "$APP_DIR/dist/main/index.js" ]; then
  echo "Built app is missing. Run ./scripts/install-linux-electron.sh first." >&2
  exit 1
fi

if [ -f "$SANDBOX" ]; then
  OWNER="$(stat -c '%U' "$SANDBOX")"
  MODE="$(stat -c '%a' "$SANDBOX")"
  if [ "$OWNER" != "root" ] || [ "$MODE" != "4755" ]; then
    cat >&2 <<MSG
Electron sandbox is not configured correctly.

Fix it with:

  sudo chown root:root "$SANDBOX"
  sudo chmod 4755 "$SANDBOX"

Then run:

  ./scripts/run-linux-electron.sh

MSG
    exit 1
  fi
fi

cd "$APP_DIR"
npm start
