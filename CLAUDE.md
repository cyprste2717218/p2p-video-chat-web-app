# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Voneo is a peer-to-peer video chat app: an Astro/React frontend (`web-server/`) talks to an Express.js signalling API (`web-socket-api/`), which spins up a dedicated in-memory WebSocket server per call for session coordination (participants, chat, SDP offer relay). WebRTC handles actual media peer-to-peer once signalling completes (`web-server/src/lib/rtcUtils.ts`).

Everything runs via Docker Compose in dev, tunnelled through ngrok so the app is reachable from devices other than the host (needed for testing real WebRTC peers). A `LOCAL=true` env mode exists to bypass ngrok and run against `localhost` only — see @README.md for the tradeoffs (single-device testing only, and `NGROK_HOST` must be unset when `LOCAL=true`).

## Commands

All commands below are run from the repo root unless noted.

- `npm run setup:win` / `npm run setup:unix` — install npm deps across the repo and build dev Docker images. Not strictly required (containers self-provision) but avoids editor type/import errors.
- `npm run dev` — start both dev containers (frontend + signalling API + MySQL) via `docker compose watch`.
- `npm run halt-dev` — stop all dev containers.
- `npm run tunnel` — start the ngrok tunnel (requires `ngrok.yml` with an authtoken, copied from `ngrok.example.yml`).
- `npm run nuke:win` / `npm run nuke:unix` — full teardown: removes containers/images/volumes/deps, then rebuilds/reinstalls. Destructive — only run when setup is broken.
- `npm test` (root) — runs `xo` (lint) across the repo; this is the only root-level test/lint command.
- `npx playwright test` — run e2e tests in `e2e/` (Playwright config at `playwright.config.ts`).
- `npm run lint` —  Runs XO linting with prettier config passed in
- `npm run lint:fix` — Applies XO linting and prettier formatting fixes where possible, identifies any errors/warnings that couldn't be implemented
Per-workspace:
- `web-socket-api/src`: `npm run dev` runs the API directly with `node --env-file=.env app.js` (outside Docker). No test runner is currently wired up (`npm test` is a placeholder); `tests/it` and `tests/unit` exist but are empty scaffolding.
- `web-server`: `npm run dev` runs Astro directly (`astro dev`); `npm run build` / `npm run preview` for production builds. `tests/components` exists but is empty scaffolding. Vitest is a devDependency but no tests are written yet.

A root `.env` (copied from `.env.example`) is required and is shared by both the frontend and backend containers — see the @README.md Environment Variables section for the full variable list (`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `DB_*`, `NGROK_HOST`, `LOCAL`, `NODE_ENV`).

Pre-commit hook (Husky) runs `lint-staged` (`xo --prettier` on staged `.js`/`.css`) and verifies the Astro frontend builds.

## Git conventions

Each commit message should be at most 30 characters in total and always start with one of the following prefixes depending on the changes made:

- `chore:`

For most changes which help implement code as part of an overarching feature, where it be source code or automated tests. The feature it is contributing to is ideally indicated by the name of the current branch (which should start with the `feat/` prefix).

- `fix:`

For any changes which implement a bug fix, which could have been identified during implementation of a feature or pulled from a GitHub issue.

For either type of commit, the diff should be small and focused as far as this is possible and ideally not change more than 5 files at the same time or exceed a total of 200 changed lines of code.
Each commit should pass the git hooks in the `pre-commit` and `pre-push` checks, however if in order to meet this diff standard these checks fail then the commit pre-fix must be followed by `(WIP):` before the colon, e.g. `chore(WIP):`


## Architecture

### Signalling API (`web-socket-api/src`)

- `app.js` — Express entry point (port 3000 in dev).
- `authorization/` — signup/login/logout/refresh routes and controller. JWT-based; access token via `Authorization: Bearer`, refresh token via cookie.
- `call/` — call lifecycle:
  - `controller.js` / `routes.js` — `POST /call/create`, `PUT /call/:callID/join`, `DELETE /call/:callID/leave`, `POST /call/:callID/messages`.
  - `utils/session-store.js` — in-memory `Map` of `callId → { wsURL, participants, pendingParticipants }`. **No persistence** — restarting the API drops all active calls.
  - `utils/ws-server.js` — creates a WebSocket server per call for signalling.
  - `utils/misc.js` — helpers including `constructURI`/`setRandomPort`, which behave differently in dev vs. production (see below).
- `common/` — `database.js` (MySQL via Sequelize, `sync()` on first run; dev seeder adds test users only when `NODE_ENV=dev`), `middlewares/` (auth/permission/token handling), `models/` (`User`, `Call`, `CallParticipants`, `RefreshToken`).
- `openapi.yaml` — Located at @web-socket-api/src/openapi.yaml - the API schema reference, kept in sync with the controllers/routes as of this writing; re-verify against the controller if it's been a while since it was last updated.

WebSocket message protocol (client ↔ per-call WS server):
- Client → server: `newParticipantOnCall`, `chatMessage`, `offer` (relayed to a named recipient).
- Server → client: `receivedNewParticipantNotif`, `responseCurrentCallParticipants`, `offer`, `chatMessage` / `receivedNewChatMessage`.

### Dev vs. production divergence (signalling API)

Several behaviors branch on `NODE_ENV`/`LOCAL` — check these before assuming behavior is environment-independent:
- WS server port: hardcoded dev port `3000` vs. `setRandomPort()` in production.
- WS URL construction (`constructURI` in `call/utils/misc.js`): dev path is `/wss/:callID` (or `/ws/:callID` when `LOCAL=true`); production builds `wss://<NGROK_HOST>:<port>` from the assigned port.
- WS origin verification (`verifyClient` in `call/utils/ws-server.js`): allowlist is currently a placeholder (`https://app.example.com`) — needs updating for real deployed domains.
- CORS: dev restricts `Origin` based on `LOCAL`/`NGROK_HOST`; production currently allows any origin via a placeholder `ALLOWED_PROD_ORIGINS` list still to be filled in.
- Refresh token cookie: `Secure` only set in production.

### Frontend (`web-server`)

Astro (SSR via `@astrojs/node`) with React islands, Tailwind v4, shadcn/ui.

- `src/pages/index.astro` — shell page, renders `<App client:load />`.
- `src/components/App.tsx` — root, switches between `AuthScreen` (logged out) and `CallScreen` (logged in).
- `src/components/CallScreen.tsx`, `VideoGrid.tsx`, `ChatPanel.tsx` — call UI, video tiles, chat sidebar.
- `src/lib/rtcUtils.ts` — WebRTC helpers (media capture, `RTCPeerConnection` setup, WS messaging).
- `src/lib/useTokenWorker.ts` — hook wrapping `token-worker.js`; the Worker instance is a **module-level singleton** so all components share one instance/token.
- `public/token-worker.js` — plain JS Web Worker owning `TokenService`, which holds the JWT access token in a private field and performs all `fetch` calls to the Express API, so the token never touches the main thread.
- `src/middleware.ts` — nonce-based CSP header, applied in production only (skipped in dev to avoid blocking Vite HMR/dev toolbar).

See `web-server/CLAUDE.md` for Astro-specific dev-server guidance (background mode via `astro dev --background`).

### Infra (`infra/`)

Pulumi (TypeScript) provisions GCP resources for production: Cloud Run service, Cloud SQL instance, Secret Manager secrets. Deploy/destroy via `npm run gcp-deploy-dev` / `npm run gcp-destroy-dev` (runs `pulumi up`/`pulumi destroy` from `infra/`).

## Known incomplete areas

- Calls and their WebSocket servers are in-memory only; nothing survives an API restart.
- Production CORS/WS-origin allowlists contain placeholder values that need to be filled in with real deployed domains before prod use.
