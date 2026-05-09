# OS1 Schemas

This directory is reserved for shared schemas used by the current macOS app, future Electron Linux shell, diagnostics tooling, and documentation.

No runtime dependency is introduced by this directory yet.

## Purpose

Schemas should define stable data contracts before platform-specific UI code is added.

Planned schemas:

- `connection.schema.json`
- `diagnostics.schema.json`
- `provider.schema.json`
- `terminal.schema.json`

## Rules

- Keep schemas platform-neutral.
- Do not include secrets in example values.
- Use redacted placeholders for keys and tokens.
- Keep macOS and Linux storage details outside the schema.
- Version breaking schema changes clearly.

## First target contracts

### Connection

Should describe:

- connection id
- display name
- transport type
- Orgo computer metadata or SSH host metadata
- profile information
- timestamps

### Diagnostics

Should describe:

- check id
- group
- status: `ok`, `warn`, or `fail`
- message
- suggested fix
- copy-safe metadata

### Provider

Should describe:

- provider name
- credential presence status
- source type: secure store or environment fallback
- validation state

### Terminal

Should describe:

- session id
- connection id
- transport type
- state
- resize dimensions
- error state with redacted messages
