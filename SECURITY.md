# Security Policy

Hermes Desktop - OS1 Edition is operator software. It can connect to cloud computers, SSH hosts, LLM providers, local voice bridges, and remote terminal sessions. Treat it as privileged software with real access to machines and accounts.

The full security model is documented in [`docs/security.md`](docs/security.md).

## Supported versions

This project is in early development. Security fixes should target `main` unless a maintained release branch exists.

## Reporting vulnerabilities

Do not open a public issue if the report contains secrets, exploit-sensitive details, or live machine access details.

For public issues, include only safe, redacted information:

- affected version or commit SHA
- operating system
- affected feature
- safe reproduction steps
- expected behavior
- actual behavior
- redacted logs or screenshots

Do not include:

- API keys
- bearer tokens
- terminal websocket tokens
- SSH private keys
- SSH passphrases
- VNC passwords
- cookies
- private machine URLs with live tokens
- unredacted logs

Use redaction like:

```txt
Authorization: Bearer ***REDACTED***
ORGO_API_KEY=***REDACTED***
OPENAI_API_KEY=***REDACTED***
wss://host/terminal?token=***REDACTED***
```

If private disclosure is needed, use the private reporting route listed by the project maintainers. If no private route is available, open a minimal public issue asking for a secure contact method without posting the vulnerability details.

## Secret handling

- API keys should be stored in secure OS-backed storage where supported.
- macOS provider keys should use Keychain-backed storage.
- Future Electron/Linux credentials should use Secret Service / libsecret or an encrypted fallback.
- `.env`, key, certificate, and release artifacts must stay out of Git.
- Realtime voice keeps `OPENAI_API_KEY` server-side in the local Swift endpoint.
- The browser surface sends SDP to the local endpoint; it must not receive raw provider keys.
- Orgo MCP credentials stay in the trusted app process and must not be sent to the renderer or model.

## Voice and MCP tool safety

The public default Realtime voice MCP surface is intentionally bounded:

```txt
OS1_REALTIME_ORGO_TOOLSETS=core,screen,files
OS1_REALTIME_ORGO_DISABLED_TOOLS=orgo_upload_file
OS1_REALTIME_ORGO_READ_ONLY=true
```

Rules:

- `shell` must remain opt-in.
- `admin` must remain opt-in.
- file upload must stay disabled by default.
- read-only mode should be preferred by default.
- enabled toolsets should be visible in diagnostics.
- users should see a warning when `shell` or `admin` is enabled.

Only enable shell/admin tools for agents and computers you are comfortable letting a voice model operate.

## In scope

- credential exposure
- unsafe remote command execution
- unsafe voice/MCP tool permissions
- terminal token leakage
- diagnostics leaking secrets
- Electron privilege boundary issues in planned Linux work
- CI accidentally requiring or printing secrets

## Out of scope

- reports without reproduction details
- issues requiring an already-compromised local machine
- social engineering
- denial-of-service against third-party services outside this repo

## CI and live tests

Default CI must not require secrets.

Allowed in default CI:

- documentation checks
- shell script parsing
- local doctor checks
- Swift tests that do not hit live services

Not allowed in default CI:

- live Orgo tests
- live OpenAI voice tests
- real VM provisioning
- secret-dependent integration tests

Live tests must require explicit opt-in flags such as:

```txt
ORGO_LIVE_TESTS=1
```

## Current status

Implemented:

- root security policy
- security model documentation
- diagnostics specification
- preflight doctor script
- CI checks that do not require secrets

Planned:

- in-app diagnostics screen
- copy-safe diagnostic report generator
- visible voice/MCP permission panel
- credential-store abstraction for future Electron/Linux work
