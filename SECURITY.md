# Refocus Security Policy

## Supported scope

This repository covers the Refocus desktop application and its release workflow.

## Security baseline

Refocus aims to keep a small local attack surface:

- Local-first storage via Tauri Store
- No built-in cloud sync or analytics in this build
- Explicit Tauri capability allowlist
- Explicit Content Security Policy for production and development
- Hardening headers on Tauri-served responses
- No unused opener/shell capability in the shipping app

## Reporting a vulnerability

If you discover a security issue, please report it privately to the project maintainer before public disclosure.

Include:

- A short description of the issue
- Affected version or commit
- Reproduction steps
- Impact assessment if known

## Secrets handling

Do not commit:

- `.env` files
- signing certificates or private keys
- notarization credentials
- updater private keys

The repository `.gitignore` excludes common secret-bearing file types, but contributors should still review staged changes carefully before pushing.
