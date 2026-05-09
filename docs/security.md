# Security Model

OS1 controls remote computers. Treat it as privileged software.

This document defines the security expectations for the current macOS app and the planned Electron Linux shell.

## Security principles

1. **Do not expose secrets to the UI**
   - API keys stay in secure storage or privileged process memory.
   - Renderers and browser surfaces receive status, not raw secrets.

2. **Remote control must be explicit**
   - Terminal access, agent install, shell commands, and admin actions must be visible to the user.
   - Dangerous actions should require clear user intent.

3. **Voice tools must be restricted by default**
   - Read-only mode should be the default.
   - `shell` and `admin` MCP toolsets must remain opt-in.

4. **Platform boundaries must stay clear**
   - macOS Keychain behavior belongs to macOS code.
   - Linux credential storage belongs to the Electron/Linux shell.
   - Linux packaging must not reuse macOS signing assumptions.

5. **Diagnostics must be safe to share**
   - Logs and reports must redact keys, tokens, passwords, cookies, and bearer values.

## Trust boundaries

### Local user

The local user can configure credentials, select machines, open terminals, and start agent actions.

### OS1 app

The app is trusted to:

- store credentials securely
- call Orgo APIs
- open terminal transports
- install or check Hermes agent when requested
- manage local UI state

### Remote computer

The remote computer is not automatically trusted. It may contain user data, running processes, credentials, or hostile files.

The app should avoid blindly executing remote commands except for known agent and diagnostics flows.

### Browser / renderer surface

Any web or renderer surface is less trusted than the native app process.

It must not receive raw provider keys or unrestricted shell execution powers.

### Voice model

A voice model is not a trusted operator.

It may request tool calls, but OS1 must decide what tools are exposed and what permissions are allowed.

## Secret handling

Secrets include:

- Orgo API keys
- OpenAI API keys
- VNC passwords / terminal tokens
- SSH private keys
- SSH passphrases
- bearer tokens
- cookies
- provider tokens

Rules:

- never commit secrets
- never print secrets in diagnostics
- never send secrets to renderer logs
- never include secrets in copy-safe reports
- never expose Orgo credentials to the voice model
- redact secrets from errors before displaying them

Recommended redaction examples:

```txt
Authorization: Bearer ***REDACTED***
ORGO_API_KEY=***REDACTED***
OPENAI_API_KEY=***REDACTED***
wss://host/terminal?token=***REDACTED***
```

## macOS credential storage

The macOS app should use Keychain-backed storage for provider credentials.

Expected behavior:

- store API keys in Keychain
- retrieve keys only inside trusted app code
- show only presence/absence in UI
- support environment variables for development fallback only

## Electron/Linux credential storage

The planned Electron shell must not store secrets in plain text.

Preferred order:

1. OS-backed secret storage through Secret Service / libsecret
2. encrypted local fallback with clear warning
3. environment variables for development only

Renderer code must not read credential files directly.

## Remote command safety

Remote commands can change real machines.

Required behavior:

- show which machine is active
- show whether transport is Orgo VM or SSH
- require confirmation for destructive actions
- keep agent install action visible
- do not run repair actions silently
- do not hide command failures

Destructive or sensitive actions include:

- deleting files
- modifying shell profiles
- installing packages
- changing permissions
- restarting services
- exposing ports
- running admin commands
- changing credentials

## Voice and MCP safety

Voice mode can expose Orgo MCP tools to a model. This is powerful and must stay constrained.

Default safe configuration:

```txt
OS1_REALTIME_ORGO_TOOLSETS=core,screen,files
OS1_REALTIME_ORGO_DISABLED_TOOLS=orgo_upload_file
OS1_REALTIME_ORGO_READ_ONLY=true
```

Rules:

- `shell` is opt-in
- `admin` is opt-in
- file upload is disabled by default
- read-only mode is preferred by default
- enabled toolsets must be visible in diagnostics
- disabled tools must be visible in diagnostics
- users should see a warning when `shell` or `admin` is enabled

The model should receive tool outputs only when needed. It should not receive raw credentials.

## Electron process safety

The planned Linux shell should use strict Electron defaults:

```txt
nodeIntegration: false
contextIsolation: true
sandbox: true where practical
webSecurity: true
allowRunningInsecureContent: false
```

Main process responsibilities:

- secrets
- Orgo API calls
- SSH process control
- terminal websocket lifecycle
- filesystem access
- diagnostics execution

Renderer responsibilities:

- UI
- forms
- status display
- terminal rendering
- user confirmation prompts

Preload responsibilities:

- expose a small typed bridge
- validate payloads
- block raw Node access

## Terminal safety

Terminal sessions should always show:

- active machine name
- transport type
- connection state
- reconnect state
- clear error messages

Terminal implementation must avoid hidden command injection. User keystrokes and model/tool actions should be distinguishable when automation is later added.

## Diagnostics safety

Diagnostics must be copy-safe by default.

A safe diagnostics report may include:

- OS name
- app version
- architecture
- missing command names
- selected transport type
- whether credentials exist
- whether API calls succeeded
- redacted endpoint hostnames

A safe diagnostics report must not include:

- API key values
- bearer tokens
- terminal websocket tokens
- SSH private keys
- VNC passwords
- full Authorization headers
- cookies

## CI safety

CI must not require secrets by default.

Allowed in default CI:

- docs validation
- shell script parsing
- local doctor script checks
- Swift tests that do not hit live services

Not allowed in default CI:

- live Orgo tests
- live OpenAI voice tests
- real VM provisioning
- secret-dependent integration tests

Live tests must require explicit environment flags such as:

```txt
ORGO_LIVE_TESTS=1
```

## Disclosure and issue reports

Security reports should avoid posting secrets publicly.

When reporting a security issue, include:

- OS
- app version or commit
- affected feature
- safe reproduction steps
- redacted logs
- expected behavior
- actual behavior

Do not include API keys, private keys, session tokens, or machine passwords in issues.

## Current status

Implemented:

- README platform clarification
- Linux support documentation
- diagnostics specification
- preflight doctor script
- CI docs/script checks

Planned:

- in-app diagnostics screen
- copy-safe report generator
- Electron Linux shell
- credential-store abstraction
- visible voice/MCP permission panel
- confirmation gates for dangerous automated actions
