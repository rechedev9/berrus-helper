# Berrus Helper

A Chrome extension for [Berrus RPG](https://www.berrus.app) that tracks idle job timers, item prices, hiscores, and session statistics.

## Features

- **Idle Job Timers** — Live countdown timers for active jobs with desktop notifications on completion
- **Price Tracker** — Historical price data with min/max/current and sparkline charts for items seen in shops and the mercadillo
- **Hiscore Lookup** — Search the Berrus leaderboard by player name and skill category
- **Session Stats** — Tracks XP gains, items collected, pesetas earned/spent, combat kills/deaths, and jobs completed per session

## Tech Stack

- TypeScript (strict mode, `noUncheckedIndexedAccess`)
- Bun (build, test runner, package manager)
- Chrome Extension Manifest V3
- HappyDOM for DOM testing

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- A Chromium-based browser

### Install Dependencies

```sh
bun install
```

### Development Build

```sh
bun run build
```

The extension is output to `dist/`. Load it in Chrome via `chrome://extensions` → "Load unpacked" → select the `dist/` directory.

### Watch Mode

```sh
bun run build:watch
```

Rebuilds automatically on file changes in `src/`.

### Production Build

```sh
bun run build -- --prod
```

Enables minification and strips `console.log` calls.

## Scripts

| Command                | Description                    |
|------------------------|--------------------------------|
| `bun run build`        | Bundle the extension to `dist/` |
| `bun run build:watch`  | Build with file watching        |
| `bun run typecheck`    | TypeScript type checking        |
| `bun run lint`         | ESLint                          |
| `bun run lint:fix`     | ESLint with auto-fix            |
| `bun run format:check` | Prettier format check           |
| `bun test`             | Run all tests                   |

## Project Structure

```
src/
├── background/     Service worker — message routing, alarms, notifications, session management
├── content/        Content scripts — DOM extraction (jobs, prices), network interception, session tracking
├── popup/          Extension popup — 4-tab UI (timers, prices, hiscores, session)
├── types/          Shared type definitions (Result, messages, storage schema, domain types)
├── utils/          Shared utilities (storage, alarms, DOM helpers, type guards, logger)
└── test-utils/     Test infrastructure (Chrome API mock, fixture builders)

public/
├── manifest.json   Chrome Extension Manifest V3
└── icons/          Extension icons (16, 48, 128)

scripts/
└── build.ts        Custom Bun-based bundler (4 entry points, static asset copying)
```

## Architecture

The extension uses Manifest V3 with four entry points:

1. **Background service worker** (`background.js`) — Handles all message routing, chrome alarm timers, notifications, session state, and hiscore fetching via a central message handler.
2. **Content script** (`content.js`) — Observes the Berrus DOM for jobs, prices, and session events. Sends structured messages to the background worker.
3. **Interceptor** (`interceptor.js`) — Runs in the `MAIN` world at `document_start` to intercept `fetch`/`XHR` responses from the Berrus API before the page processes them.
4. **Popup** (`popup.js`) — Read-only UI that queries the background worker for current state and renders four tabs: Timers, Prices, Hiscores, and Session.

### Error Handling

Uses a `Result<T, E>` pattern for all fallible operations. Functions return `{ ok: true, value }` or `{ ok: false, error }` instead of throwing.

### Dependency Injection

Storage, alarms, and notifications use a port pattern — each module defines an interface (e.g. `ChromeStoragePort`) with a default implementation that wraps the Chrome API, allowing tests to inject in-memory fakes.

## Testing

```sh
bun test
```

133 tests across 14 files covering:

- **Integration tests** — Full message → storage → response pipeline, alarm handling, session lifecycle
- **Unit tests** — Hiscore HTML parsing, notification service, install handler, content script extractors
- **Type/utility tests** — Result type, type guards, time formatting, DOM builder

Tests use an in-memory Chrome API mock (`src/test-utils/chrome-mock.ts`) and HappyDOM for DOM operations.

## Permissions

| Permission      | Purpose                                    |
|-----------------|--------------------------------------------|
| `storage`       | Persist job timers, price history, session  |
| `alarms`        | Schedule notifications for job completion   |
| `notifications` | Desktop alerts when idle jobs finish        |

Host permission: `https://www.berrus.app/*`
