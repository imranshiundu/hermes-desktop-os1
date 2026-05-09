# Contributing

OS1 is an early desktop app. Keep contributions small, honest, and easy to review.

## Project direction

The current app is macOS-native. Linux desktop support is planned as an Electron-based shell, not as a direct Tauri port and not as a fake SwiftPM platform flag.

Supported today:

- macOS desktop app
- Orgo Linux VM control
- Linux SSH host control

Planned:

- diagnostics
- reusable core boundaries
- Electron Linux desktop shell
- AppImage packaging
- `.deb` packaging

## Contribution rules

1. **Do not claim support that does not exist**
   - If Linux desktop is not implemented, say so clearly.
   - If a feature is planned, mark it as planned.

2. **Keep platform-specific code isolated**
   - macOS signing stays in macOS scripts.
   - Electron packaging stays in Electron/Linux scripts.
   - Credential storage should be abstracted before adding new platforms.

3. **Do not store secrets in the repository**
   - No API keys.
   - No personal tokens.
   - No copied local config.
   - Use environment variables or secure OS credential storage.

4. **Prefer small PRs**
   - One feature or fix per PR.
   - Docs PRs should not include unrelated code changes.
   - Refactors should explain why they are needed.

5. **Be honest about agent control**
   - Voice mode and MCP tools can operate powerful remote actions.
   - `shell` and `admin` toolsets must stay opt-in.
   - Read-only mode should be preferred by default.

## Good first PRs

- Improve `docs/linux-support.md`.
- Improve `scripts/doctor.sh`.
- Add GitHub Actions for tests.
- Add a diagnostics page.
- Improve install/build instructions.
- Add screenshots to documentation.
- Add clearer errors for missing Orgo/OpenAI credentials.

## Larger PRs

Discuss or document these before opening a large patch:

- Electron Linux shell
- AppImage packaging
- `.deb` packaging
- credential storage abstraction
- shared Orgo/SSH core extraction
- large UI redesigns
- voice-mode tool permission changes

## Local checks

Run:

```sh
./scripts/doctor.sh
```

For macOS builds, run:

```sh
./scripts/build-macos-app.sh
```

Run tests with:

```sh
./scripts/run-tests.sh
```

or:

```sh
swift test
```

## Pull request checklist

Before opening a PR:

- [ ] The change is focused.
- [ ] Documentation is updated if behavior changed.
- [ ] No secrets are committed.
- [ ] Platform support is described honestly.
- [ ] macOS-only code is not mixed into Linux paths.
- [ ] Linux roadmap changes remain Electron-first.
- [ ] Voice/MCP safety defaults are not weakened.
- [ ] Tests or manual validation notes are included.

## Commit style

Use simple conventional prefixes:

```txt
docs: clarify Linux support
fix: handle missing provider key
feat: add diagnostics preflight
chore: update release script
refactor: isolate credential storage
```

## Review standard

A good OS1 contribution should make the project easier to run, easier to understand, or safer to operate.

Avoid cosmetic churn unless it directly improves usability.
