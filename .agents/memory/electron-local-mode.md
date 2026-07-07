---
name: Electron local mode architecture
description: How the Hajde Ha POS Electron app works — local server, SQLite, Pusher listener, cloud sync
---

## Architecture
- `server/index-local.ts` — standalone Express server for Electron. No PostgreSQL dependency.
- `server/storage-local.ts` — implements `IStorage` using `better-sqlite3` via `drizzle-orm/better-sqlite3` (sync API wrapped in async)
- `server/db-local.ts` — initializes SQLite DB at `LOCAL_DB_PATH` env var; creates tables via raw DDL on first run (no migration tool)
- `shared/schema-local.ts` — SQLite mirror of `shared/schema.ts` (sqliteTable, integer mode boolean, real for float, integer mode timestamp)
- `electron/main.ts` → compiled to `electron/main.cjs` — spawns local server, shows setup window if no config, opens BrowserWindow to `/pos/{slug}`

## Security decisions
- Local server binds to `127.0.0.1` when `IS_ELECTRON=true` (not 0.0.0.0), preventing same-WiFi access
- Config file stored at `app.getPath("userData")/hajdeha-config.json`
- DB file at `app.getPath("userData")/hajdeha-local.db`

**Why:** Original code bound to 0.0.0.0 which exposed unauthenticated endpoints on restaurant WiFi.

## Data flow
1. Customer orders at hajdeha.com → fires Pusher `incoming-order` on `pos-{slug}` channel
2. Local server subscribes to Pusher on startup → saves to SQLite with 5-min dedup fingerprint
3. POS frontend connects to same Pusher channel (via `/api/config/pusher`) → shows real-time
4. All POS state (tables, orders, assignments) lives in local SQLite only

## Sync
- On startup: fetches `https://hajdeha.com/api/restaurants?slug={slug}` → upserts restaurant + deletes/re-inserts menu items
- Repeats every hour
- Waiters are synced via the same endpoint (if returned in restaurant payload)
