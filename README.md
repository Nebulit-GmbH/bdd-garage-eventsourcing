# Node.js / TypeScript Event-Sourced Service

An event-sourced backend scaffolded by [`@eventmodelers/cli`](https://www.npmjs.com/package/@eventmodelers/cli).
It uses [Emmett](https://event-driven-io.github.io/emmett/) over SQLite for the event store,
Express for the HTTP layer, and plain SQL files in `migrations/sqlite/` for the schema.

Features are built as **vertical slices** under `src/slices/`, generated from the slices on your
Eventmodelers board by the agent in `.build-kit/`.

## Prerequisites

- Node.js 20 or later (the dev/start scripts use `node --env-file`)
- [Claude Code](https://claude.com/claude-code) if you want to run the build agent

## Getting started

1. Create your `.env`:

   ```bash
   cp .env.example .env
   ```

   Or run `./setup-env.sh`. `SQLITE_DB_PATH` defaults to `./data/app.db`.

2. Install and run. The server applies pending migrations from `migrations/sqlite/` on start
   (`npm run migrate:sqlite` does the same without starting it). Add your own `V6__*.sql` and so on
   as slices introduce projections; never edit an applied file.

3. Run the server:

   ```bash
   npm run build   # slice routes and processors are loaded from dist/
   npm run dev
   ```

The API is on http://localhost:3000, with Swagger UI at http://localhost:3000/api-docs and the raw
OpenAPI document at http://localhost:3000/swagger.json.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the server locally with `.env` loaded |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start in production mode |
| `npm test` | Run `src/**/*.test.ts` via `tsx --test` |
| `npm run migrate:sqlite` | Apply pending migrations from `migrations/sqlite/` |

## Learn more

- [Eventmodelers](https://eventmodelers.ai)
- [Emmett documentation](https://event-driven-io.github.io/emmett/)
