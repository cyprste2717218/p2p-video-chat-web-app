# Note: WORK IN PROGRESS

# Voneo - P2P Video Chat Web App

![Voneo](web-server/public/image.png)

[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?logo=websocket&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![WebRTC](https://img.shields.io/badge/WebRTC-333333?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?logo=sequelize&logoColor=white)](https://sequelize.org/)
[![JWT](https://img.shields.io/badge/JWT-black?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![Astro](https://img.shields.io/badge/Astro-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000?logo=shadcnui&logoColor=white)](https://ui.shadcn.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/)
[![XO](https://img.shields.io/badge/XO-5ED9C7?logo=xo&logoColor=black)](https://github.com/xojs/xo)
[![Prettier](https://img.shields.io/badge/Prettier-F7B93E?logo=prettier&logoColor=black)](https://prettier.io/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Supertest](https://img.shields.io/badge/Supertest-07B203?logo=&logoColor=white)](https://github.com/visionmedia/supertest)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Pulumi](https://img.shields.io/badge/Pulumi-8A3391?logo=pulumi&logoColor=white)](https://www.pulumi.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

A peer-to-peer video chat application built with an Astro/React frontend and a Node.js signalling stack. Users authenticate then create or join calls through an Express.js API, which provisions per-call WebSocket servers for session coordination. WebRTC handles media between peers once signalling completes.

## Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Signalling Server (Express.js API)](#signalling-server-expressjs-api)
  - [API Routes](#api-routes)
  - [Authentication](#authentication)
  - [WebSocket Signalling](#websocket-signalling-per-call)
  - [API Examples](#api-examples)
  - [Environment Variables](#environment-variables)
- [Frontend (Astro + React)](#frontend-astro--react)
- [Gotchas & Experimentation](#gotchas--experimentation)

## Overview

This project demonstrates a classic WebRTC architecture: an HTTP API and WebSocket layer for **signalling** (call creation, join/leave, SDP offers, chat), and the browser for **media** (camera/microphone via `getUserMedia`, peer connections via `RTCPeerConnection`).

Typical flow:

1. A user opens the app, authenticates (login or register), then creates a call or joins one with a call ID.
2. The Express API spins up a dedicated WebSocket server for that call and returns its URL.
3. The client connects to that WebSocket server and exchanges signalling messages (participants, offers, chat).
4. WebRTC negotiation runs in the browser (`rtcUtils.ts`) to establish P2P video/audio where implemented.

## Project Structure

```
video-chat-application/
├── web-socket-api/              # Express.js signalling API + per-call WebSocket servers
│   ├── src/
│   │   ├── app.js               # API entry point (port 3000 by default)
│   │   ├── openapi.yaml         # API schema reference (may drift from implementation)
│   │   ├── Dockerfile           # Production Docker image for the signalling API
│   │   ├── Dockerfile.dev       # Signalling server Dev image — mounts source and watches for changes
│   │   ├── compose.yaml         # Docker Compose services (dev)
│   │   ├── authorization/       # Signup, login, logout, reset token provision routes
│   │   ├── call/                # Create / join / leave call routes + WS utilities
│   │   │   ├── controller.js
│   │   │   ├── routes.js
│   │   │   └── utils/           # Session store, WebSocket server, misc helpers
│   │   └── common/              # DB config (MySQL), models, JWT middleware
│   │       ├── database.js
│   │       ├── middlewares/     # Auth, permission checks, token handling
│   │       └── models/          # User, Call, CallParticipants, RefreshToken
│   └── tests/
│       ├── it/                  # Integration tests
│       └── unit/                # Unit tests (backend utilities, i.e. token generators, helper utils)
├── web-server/                  # Astro.js frontend (SSR, React + Tailwind + shadcn/ui)
│   ├── Dockerfile               # Production Docker image — serving the built Astro SSR app
│   ├── Dockerfile.dev           # Astro SSR Dev image — mounts source and watches for changes
│   ├── compose.yaml             # Docker Compose services (prod + dev)
│   ├── public/
│   │   └── token-worker.js      # Web Worker: token storage + all API fetch calls
│   ├── tests/
│   │   └── components/          # Component tests, i.e. validating interactive components respond to user
│   └── src/
│       ├── pages/
│       │   └── index.astro      # Shell page — imports global CSS, renders <App client:load />
│       ├── components/
│       │   ├── App.tsx          # Root — switches between AuthScreen / CallScreen
│       │   ├── AuthScreen.tsx   # Login + register tabs (shown when logged out)
│       │   ├── CallScreen.tsx   # Create/join call controls, video grid, chat sidebar
│       │   ├── VideoGrid.tsx    # Local + remote video tiles
│       │   ├── ChatPanel.tsx    # Chat message list + send input
│       │   └── ui/              # shadcn/ui primitives
│       ├── lib/
│       │   ├── rtcUtils.ts      # WebRTC helpers (media, peer connections, WS messaging)
│       │   ├── useTokenWorker.ts # Hook — module-level singleton Worker
│       │   └── utils.ts         # shadcn cn() class utility
│       ├── styles/
│       │   └── global.css       # Tailwind v4 + shadcn CSS variable theme
│       └── middleware.ts        # CSP header (nonce-based, skipped in dev mode)
├── infra/                       # Pulumi (TypeScript) IaC — provisions GCP resources (Cloud Run service, Cloud SQL instance, Secret Manager secrets) for production deployments
├── e2e/                         # End-to-end tests (Playwright)
├── .github/workflows/           # CI/CD workflows
├── .husky/                      # Git hooks
├── .env.example                 # Example environment variables for local setup
├── .prettierrc                  # Prettier configuration
├── package.json                 # Root scripts to run both servers
├── playwright.config.ts         # Playwright configuration
├── setup.ps1                    # Windows setup script (installs deps, builds dev images)
├── setup.sh                     # Unix/macOS setup script (installs deps, builds dev images)
├── nuke.ps1                     # Windows teardown script (removes containers, images, volumes, deps and rebuilds dev images and reinstalls deps)
└── nuke.sh                      # Unix/macOS teardown script (removes containers, images, volumes, deps and rebuild dev images and reinstalls deps)
```


| Component                             | Role                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Express.js API** (`web-socket-api`) | REST signalling: auth, users, call lifecycle; creates in-memory WebSocket servers per call |
| **Astro frontend** (`web-server`)     | SSR Astro app with React components, Tailwind CSS, and shadcn/ui; port **4321** in dev     |


## Local Setup

### Prerequisites

- [Docker](https://docs.docker.com/desktop/setup/install/windows-install/) (v28+)
- [Node.js](https://nodejs.org/) (LTS recommended)
- Git
- A machine with camera/microphone access for testing WebRTC

### 1. Clone repo, install npm deps & build dev docker images


On Unix/macOS:
```bash
# Clones the repo
git clone https://github.com/cyprste2717218/p2p-video-chat-web-app

# Auto installs the npm dependencies and builds the development docker images
npm run setup:unix
```

On Windows:
```bash
# Clones the repo
git clone https://github.com/cyprste2717218/p2p-video-chat-web-app

# Auto installs the npm dependencies and builds the development docker images
npm run setup:win
```

Note: the `npm run setup:[OS]` commands above aren't technically necessary for developing using the docker containers as they will setup their own dependencies from scratch. However, they will help you avoid a lot of in-editor errors related to typing and package imports that could be inconvenient!

### 2. Run the docker dev containers

Spins up the built images for the Astro.js/React SSR frontend (`web-server-dev:1.0.0`), the Express.js/WebSockets backend (`signalling-server-dev:1.0.0`) and pulls/builds the MySQL 8.4 image (`mysql:8.4`)

#### From the root (same terminal output)

```bash
npm run dev
```

### 3. Navigate to the UI

If the docker container setup went well then the frontend should be accessible at the following URL and ready for use!:

App URL: **[http://localhost:4321/](http://localhost:4321/)**


To spin down the dev containers smoothly use the following command:

```bash
npm run halt-dev
```

#### Handling setup errors:

If something goes wrong during setup, you can try out the `nuke` commands for unix and non-unix systems to delete and re-setup all npm dependencies, cache, docker dev images/volumes and containers:

On Unix/macOS:

```bash
npm run nuke:unix
```

On Windows:
```bash
npm run nuke:win
```
---

## Signalling Server (Express.js API)

**Base URL:** `http://localhost:3000` (or the host/port configured in `web-socket-api/app.js`)

**Database:** MySQL at `http://localhost:3306` (created on first run via Sequelize `sync()`, with sequelize seeder function adding data for test users described below)
<br><br>
<i>Note:</i> 'Sequelize' seeder function only runs when `NODE_ENV`=`dev`, for development convenience
### API Routes

#### Auth (`/auth`)


| Method | Path      | Auth | Request body                                                                          | Success response                                                                       |
| ------ | --------- | ---- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `POST` | `/auth/signup` | No   | `{ "username": string (min 3), "email": string (email), "password": string (min 6) }` | `201` — `{ "success": true, "data": {"message": "Succesful sign up"}}` |
| `POST` | `/auth/login`  | No   | `{ "email": string (email), "password": string (min 6) }`                             | `200` — `{ "success": true, "data": { "accessToken": "<jwt>"}}`                        |
| `POST` | `/auth/logout` | Yes  | —                                                                                     | `200` — `{ "success": true, "data": {"message": "Logged out succesfully"}}`           |
| `POST` | `/auth/refresh` | Yes | —                                                                                     | `200` — `{ "success": true}`                                                           |


**Signup errors:** 

- `400` — invalid body: `{ "success": "false", "data": { "message": "Invalid credentials"}}`
- `500` — server error: `{ "success": false, "data": { "message": "Server error" } }`

**Login errors:**

- `400` — invalid body: `{ "success": "false", "data": { "message": "Invalid credentials" }}`
- `500` — server error: `{ "success": false, "data": { "message": "Server error" } }`

**Logout errors:**
- `500` — server error: `{ "success": "false", "data": { "message": "Server error" } }`

**Refresh errors:**
- `401` — invalid/expired refresh token: `{ "success": "false", "data": { "message": "Invalid or expired refresh token" }}`
- `500` — server error: `{ "success": "false", "data": { "message": "Server error" } }`

#### Calls (`/call`)


| Method | Path                  | Auth | Request                                                 | Success response                                                                     |
| ------ | --------------------- | ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `POST` | `/call/create`        | Yes  | —                         | `201` — `{ "success": true, "data": { "callID": "<uuid>", "callURL": "ws://..." } }` |
| `PUT`  | `/call/:callID/join`  | Yes  | Params: `callID` (UUID) | `200` — `{ "success": true, "data": { "callURL": "ws://..." }}`                     |
| `DELETE`  | `/call/:callID/leave` | Yes  | Params: `callID` (UUID)                                               | `200` — `{ "success": true, "data": { "message": "Succesfully left call" }}`                                                                     |
| `POST`  | `/call/:callID/messages` | Yes  | Params: `callID` (UUID)                                               | `201` — `{ "success": true, "data": { "message": "Message sent to all call participants succesfully" }}`   


**Call errors (examples):**

- `400` — invalid body/params: `{ "success": false, "error": "Invalid input", "details": [...] }`
- `404` — unknown call: `{ "success": false, "error": "Call ID not present" }`
- `500` — server error: `{ "success": false, "error": "<message>" }`

Creating a call also starts a **WebSocket server** on a random port and stores session state in an in-memory `Map` (`callId` → `{ wsURL, participants, pendingParticipants }`).

### Authentication

Protected routes expect a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are issued on successful **login** (`POST /auth/login`). Secrets for creating access and refresh token JWTs is provided via `.env`, expirys for both are defined in `common/middlewares/tokens.js`.

### WebSocket signalling (per call)

After `create` or `join`, clients connect to `callURL` and send JSON messages, for example:


| Client → server `type` | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `newParticipantOnCall` | Announce join; server replies with participants / notifications |
| `chatMessage`          | Broadcast chat                                                  |
| `offer`                | Relay WebRTC offer to a named recipient                         |



| Server → client `type`                   | Purpose                     |
| ---------------------------------------- | --------------------------- |
| `receivedNewParticipantNotif`            | Someone joined              |
| `responseCurrentCallParticipants`        | List of peers to connect to |
| `offer`                                  | Forwarded SDP offer         |
| `chatMessage` / `receivedNewChatMessage` | Chat payloads               |


### API examples

For development (when `NODE_ENV` is `dev`in `.env`) the following test users are seeded via sequelize for testing when the `signalling_server_prod` service container starts:

```json                                    
{
  username: john2739
  email: john.smith@gmail.com 
  password: ExamplePassword123
}
```
```json
{
  username: sam8282
  email: sam.clarence@gmail.com 
  password: ExamplePassword456
}
```

**Register a user**

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret12"}'
```

**Login**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret12"}'
```

**Create a call**

```bash
curl -X POST http://localhost:3000/call/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
```

**Join an existing call**

```bash
curl -X POST http://localhost:3000/call/a1b2c3d4-e5f6-7890-abcd-ef1234567890/join \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
```

**Leave a call**

```bash
curl -X POST http://localhost:3000/call/a1b2c3d4-e5f6-7890-abcd-ef1234567890/leave \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
```

For a machine-readable spec, see `web-socket-api/src/openapi.yaml` (some paths/responses may not match runtime behavior yet).


### Environment Variables

In order to sign JWT access and reset tokens, the API requires a `.env` to define the following environment variables:

```ini
JWT_SECRET=thesecret
REFRESH_TOKEN_SECRET=anothersecret
NODE_ENV=dev
DB_NAME=dev-db
DB_PASSWORD=testpassword123
DB_HOST=mysql-db
DB_PORT=3306
```

This should be defined in the root directory in order for both the Astro frontend and Express.js/WebSockets backend to access these variables.
`NODE_ENV` can be set to either `dev` or `production`, setting `production` ensures refresh token cookie can only be sent over secure `HTTPS` connections (sets `Secure` property to `true`).

A `.env.example` file has been defined using these defaults for local testing. For production usage, ensure to set your own.

---

## Frontend (Astro + React)

**Framework:** Astro (SSR via `@astrojs/node`), port **4321** in dev (`npm run dev` from `web-server/`).

**Entry:** `src/pages/index.astro` imports global CSS and renders `<App client:load />`.

### `useTokenWorker.ts`

Hook that wraps the `token-worker.js` Web Worker. The Worker instance is a **module-level singleton** so all components share the same instance and the token stored after login is available to subsequent calls. Exposes: `login`, `register`, `logout`, `createCall`, `joinCall`.

### `token-worker.js`

Plain JS Web Worker served from `public/`. Owns the `TokenService` class which holds the JWT access token in a private field. Handles all `fetch` calls to the Express API so the token never touches the main thread.

### CSP middleware (`src/middleware.ts`)

Sets a nonce-based `Content-Security-Policy` header on every response in production. Skipped in dev mode to avoid blocking Vite's HMR and dev toolbar scripts. Directives cover `script-src`, `worker-src`, `connect-src` (API + WebSocket), `media-src`, `style-src`, `img-src`, `object-src`, and `base-uri`.

### Dockerfiles

There are two dockerfiles for the frontend in `web-server/`:

- `Dockerfile.dev`:

Created for local development and syncs local file changes into the container automatically.

- `Dockerfile`:

Produces a production-optimised image (`europe-west2-docker.pkg.dev/signalling-api/voneo/voneo-frontend:1.0.0`).

This image is used in GCP deployments - it is pushed to Artifact Registry and referenced by the Cloud Run service provisioned via the Pulumi stack in `infra/`.

---

## Gotchas & Experimentation

1. **Incomplete endpoints** — `DELETE /call/:callID/leave` is a stub. Do not expect leave-call to work at current
2. **In-memory calls** — Restarting the API clears all active calls and WebSocket servers. No persistence of web socket calls to persistent storage at current.

