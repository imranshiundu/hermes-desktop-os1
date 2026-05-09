#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILED=0
WARNED=0

bold() {
  printf '\033[1m%s\033[0m\n' "$1"
}

pass() {
  printf '  [ok] %s\n' "$1"
}

warn() {
  WARNED=1
  printf '  [warn] %s\n' "$1"
}

fail() {
  FAILED=1
  printf '  [fail] %s\n' "$1"
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

check_command() {
  local name="$1"
  local label="${2:-$1}"

  if has_command "$name"; then
    pass "$label: $(command -v "$name")"
  else
    fail "$label is missing"
  fi
}

check_optional_command() {
  local name="$1"
  local label="${2:-$1}"

  if has_command "$name"; then
    pass "$label: $(command -v "$name")"
  else
    warn "$label is missing"
  fi
}

check_env_optional() {
  local name="$1"
  local note="$2"

  if [[ -n "${!name:-}" ]]; then
    pass "$name is set"
  else
    warn "$name is not set ($note)"
  fi
}

check_file_executable() {
  local path="$1"

  if [[ -x "$ROOT_DIR/$path" ]]; then
    pass "$path is executable"
  elif [[ -f "$ROOT_DIR/$path" ]]; then
    warn "$path exists but is not executable; run: chmod +x $path"
  else
    fail "$path is missing"
  fi
}

bold "OS1 doctor"
printf 'Repository: %s\n\n' "$ROOT_DIR"

bold "Platform"
OS_NAME="$(uname -s 2>/dev/null || printf 'unknown')"
ARCH_NAME="$(uname -m 2>/dev/null || printf 'unknown')"
pass "detected $OS_NAME / $ARCH_NAME"

case "$OS_NAME" in
  Darwin)
    pass "macOS host detected; native OS1 build path is available"
    ;;
  Linux)
    warn "Linux host detected; this repo does not yet ship a Linux desktop app"
    warn "Linux work should target the planned Electron shell, docs, or diagnostics"
    ;;
  *)
    warn "unrecognized host OS; only macOS native app builds are currently supported"
    ;;
esac

printf '\n'
bold "Required project tools"
check_command git git
check_command ssh ssh

printf '\n'
bold "macOS build tools"
if [[ "$OS_NAME" == "Darwin" ]]; then
  check_command swift swift
  check_command xcrun xcrun
  check_command xcode-select xcode-select
  check_command sips sips
  check_command iconutil iconutil
  check_command lipo lipo
  check_command codesign codesign
  if [[ -x /usr/libexec/PlistBuddy ]]; then
    pass "PlistBuddy: /usr/libexec/PlistBuddy"
  else
    fail "PlistBuddy is missing"
  fi
else
  warn "skipped macOS build tool checks on non-macOS host"
fi

printf '\n'
bold "Electron/Linux planning tools"
check_optional_command node node
check_optional_command npm npm
check_optional_command npx npx

printf '\n'
bold "Repository scripts"
check_file_executable scripts/build-macos-app.sh
check_file_executable scripts/run-tests.sh
check_file_executable scripts/package-github-release.sh

printf '\n'
bold "Optional credentials"
check_env_optional ORGO_API_KEY "used for Orgo API development and live checks"
check_env_optional OPENAI_API_KEY "used for Realtime voice development"
check_env_optional ORGO_DEFAULT_COMPUTER_ID "used by live Orgo tests and voice tool context"

printf '\n'
bold "Docs"
if [[ -f "$ROOT_DIR/docs/linux-support.md" ]]; then
  pass "docs/linux-support.md exists"
else
  warn "docs/linux-support.md is missing"
fi

if [[ -f "$ROOT_DIR/docs/contributing.md" ]]; then
  pass "docs/contributing.md exists"
else
  warn "docs/contributing.md is missing"
fi

printf '\n'
if [[ "$FAILED" -eq 1 ]]; then
  bold "Result: failed"
  printf 'Fix failed checks before building or opening a release PR.\n'
  exit 1
fi

if [[ "$WARNED" -eq 1 ]]; then
  bold "Result: passed with warnings"
  printf 'Warnings may be acceptable depending on whether you are building macOS, writing docs, or preparing Electron/Linux work.\n'
  exit 0
fi

bold "Result: passed"
exit 0
