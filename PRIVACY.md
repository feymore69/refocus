# Refocus Privacy Policy

Last updated: 2026-04-25

## Summary

Refocus is designed to work locally on your device. This build does not require an account, does not include analytics, and does not send your reminder history or work content to a Refocus server.

For public distribution, publish this privacy policy at a stable HTTPS URL that you control and use that same URL in your website download page and any store listing that requests a privacy policy.

## What Refocus stores

Refocus stores the following data locally so the app can function:

- App settings such as break timing, schedule, tray behavior, sound, theme, and accessibility preferences
- Reminder/session state such as the next break time and pause state
- Break history used for adherence, weekly trend, and history screens
- Limited local timing signals used by reminder logic, such as timestamps for recent interaction with the app window

This data is stored in the operating system's app data area using Tauri Store.

The current build stores this local app data without a separate encryption layer because it is designed for non-sensitive reminder settings and usage history, not credentials or work content.

## What Refocus does not store or upload

Refocus does not store or upload:

- Keystroke content
- Clipboard contents
- Screen contents
- Documents, browser history, or work files
- Account credentials, passwords, or tokens
- Cloud profiles or analytics identifiers

Please avoid entering sensitive personal, client, or account information into custom break lines because that text is stored locally with the rest of your settings.

## Smart Pause and activity handling

Smart Pause in the current build uses local reminder state and app interaction timestamps to reduce poorly timed interruptions. It does not inspect the text you type, capture screenshots, or transmit system activity to an external service.

Some Smart Pause options are best-effort behaviors and may vary by platform.

## Local retention and deletion

- Break history is kept locally and capped to the latest 200 entries in the current build.
- You can clear local history from the `Data & Privacy` section in Refocus settings.
- Clearing history removes the stored break log from the local app store used by Refocus.

## External services

This build does not send product analytics or usage telemetry to Refocus-controlled servers.

If you distribute Refocus through a store, code-signing, notarization, crash reporting, or the distribution platform itself may involve third-party processing outside the app. Those services are controlled by the distribution channel, not by Refocus runtime behavior.

If you distribute Refocus from your own website, your hosting provider or CDN may process standard web server logs, download logs, IP addresses, or TLS/session metadata for the site itself. Those website-level logs are separate from Refocus app runtime behavior and should be covered by your website privacy notice if you operate one.

## Publisher details for release

Before public release, make sure your hosted privacy policy includes:

- Your publisher or business name
- A working support or privacy contact email
- The website URL where users can reach you
- The effective date of the policy

## Changes

If this privacy policy changes materially, update this file and the in-app privacy summary before shipping the new build.
