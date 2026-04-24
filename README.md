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

## Notes

- All stats and settings are local-only.
- The app was designed to keep business logic in `store`/`services`, with UI split by feature modules for future expansion (cloud sync/team mode/focus integrations).
