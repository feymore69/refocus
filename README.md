# Refocus

A polished Tauri desktop app that helps reduce eye strain with timed visual breaks, playful reminder vibes, and deeply customizable overlays.

## Stack

- Tauri 2
- React + TypeScript
- Tailwind CSS (v4)
- Motion for React
- Zustand
- Lucide React
- Tauri plugins: `store`, `autostart`, `global-shortcut`, `notification`, `window-state`
- Native tray integration (Rust side)

## Privacy

- Refocus is a local-first desktop app.
- It stores settings, schedules, reminder state, and break history on the device using Tauri Store.
- It does not send analytics, break history, keystroke content, clipboard data, screen contents, or work files to a server in this build.
- The full publish-ready privacy policy is in [PRIVACY.md](PRIVACY.md).
- Before public release, host that policy at a stable `https://` URL and add your real publisher/support contact details.

## Security baseline

- Tauri capabilities are limited to the features Refocus uses: window control, events, local store, autostart, notifications, and global shortcuts.
- The unused opener plugin has been removed to reduce attack surface.
- Tauri now ships with an explicit CSP plus response hardening headers instead of `csp: null`.
- Sensitive local signing files and `.env` files are ignored by Git via `.gitignore`.
- The security contact/process for the project is in [SECURITY.md](SECURITY.md).

## What is implemented

- Onboarding flow:
  - Pick mode (`Chill`, `Focus`, `Goblin`, `Custom`)
  - Pick first schedule preset (includes `20-20-20`)
  - Pick theme
  - Toggle startup and tray behavior
- Main dashboard:
  - Live countdown to next break
  - Start break now
  - Pause/resume reminders
  - Daily stats + streak + eye-care score + badges
- Settings:
  - Schedule, behavior, appearance, sound/copy, shortcuts/system
  - Reminder style and overlay type switching
  - Theme and custom accent support
  - Funny/profanity toggles
  - Custom message list editing
- Reminder overlay:
  - Prompt + active countdown phase
  - Snooze / skip / strict mode behavior
  - Breathing-orb mode + animated transitions
- History view:
  - Local break history with weekly summary card
- System behavior:
  - Tray menu actions (start, pause options, resume, settings, quit)
  - Tray tooltip countdown updates
  - Global hotkey to trigger manual break
  - Autostart sync
  - Close-to-tray behavior (configurable)
  - Local persistence via Tauri Store

## Project structure

```text
src/
  components/
  data/
  features/
    onboarding/
    dashboard/
    settings/
    reminder-overlay/
    stats/
  lib/
  services/
  store/
  types/
src-tauri/
```

## Prerequisites

1. Node.js 20+ (22 recommended)
2. Rust + Cargo on your development OS
3. Tauri OS prerequisites:
   - Linux: `webkit2gtk`, `rsvg2`, and build essentials (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))
   - macOS/Windows: standard Tauri prerequisites from docs

## Setup

```bash
npm install
```

## Run in development

```bash
npm run tauri dev
```

### Windows native run (tray/background support)

If your project is currently inside WSL (`\\wsl.localhost\...`), run the app from a **Windows path** so Tauri can launch as a native Windows desktop app:

1. Copy project to something like `C:\code\timeout`
2. Open PowerShell in that folder
3. Run:

```powershell
npm install
npm run tauri dev
```

This gives you native tray icon, close-to-tray behavior, background reminders, and Windows notifications.

## Frontend-only dev mode

```bash
npm run dev
```

## Production build

```bash
npm run tauri build
```

## Packaging output

Tauri places platform installers/bundles under:

`src-tauri/target/release/bundle/`

## Publish for download (GitHub Releases)

This repo includes an automated release workflow at:

`.github/workflows/release.yml`

How to publish:

1. Bump versions in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
2. Commit and push to `main`
3. Create and push a version tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow builds desktop bundles on Windows/macOS/Linux and uploads them to a GitHub Release.

### Website / Microsoft Store notes

- For a website download page, host installers and the privacy policy over `https://`.
- For Microsoft Store EXE/MSI submission, Microsoft currently requires a secure package URL for the installer and may require a privacy policy URL depending on the app and applicable law.
- The installer URL should be versioned and should not change after submission.

## Signed builds

Unsigned builds work for testing but show OS warnings. To enable signing in CI, add repository secrets:

- `APPLE_CERTIFICATE` (base64 .p12)
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD` (app-specific password)
- `APPLE_TEAM_ID`

Optional updater signing secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### Windows signing (recommended free path for open source)

For public open-source projects, apply to the SignPath Foundation free certificate program:

- https://about.signpath.io/product/open-source

This repository is already wired to sign Windows artifacts automatically via SignPath when the following secrets are set:

- `SIGNPATH_API_TOKEN`
- `SIGNPATH_ORGANIZATION_ID`
- `SIGNPATH_PROJECT_SLUG`
- `SIGNPATH_SIGNING_POLICY_SLUG`

The release workflow will:
1. Build Windows installers
2. Submit them to SignPath
3. Upload signed files back to the GitHub Release

If SignPath is not configured, the workflow still publishes unsigned artifacts.

### Windows paid alternative

If you need immediate production-grade signing without SignPath onboarding, use Azure Artifact Signing:

- https://azure.microsoft.com/en-us/products/trusted-signing

## Notes

- All stats and settings are local-only.
- The app was designed to keep business logic in `store`/`services`, with UI split by feature modules for future expansion (cloud sync/team mode/focus integrations).
