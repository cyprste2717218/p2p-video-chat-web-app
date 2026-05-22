# Note: WORK IN PROGRESS

# P2P Video Chat Web App

[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?logo=websocket&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![WebRTC](https://img.shields.io/badge/WebRTC-333333?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?logo=sequelize&logoColor=white)](https://sequelize.org/)
[![JWT](https://img.shields.io/badge/JWT-black?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)

A peer-to-peer video chat application with a browser-based UI and a Node.js signalling stack. Users create or join calls through an Express.js API, which provisions per-call WebSocket servers for session coordination. WebRTC handles media between peers once signalling completes.

## Overview

This project demonstrates a classic WebRTC architecture: an HTTP API and WebSocket layer for **signalling** (call creation, join/leave, SDP offers, chat), and the browser for **media** (camera/microphone via `getUserMedia`, peer connections via `RTCPeerConnection`).

Typical flow:

1. A user opens the static web app and creates a call (or joins with a call ID).
2. The Express API spins up a dedicated WebSocket server for that call and returns its URL.
3. The client connects to that WebSocket server and exchanges signalling messages (participants, offers, chat).
4. WebRTC negotiation runs in the browser (`rtcUtils.js`) to establish P2P video/audio where implemented.

Authentication (signup, JWT-protected user routes) is partially implemented; call endpoints currently rely on a `username` in the request body rather than JWT (I intend to switch this over).

## Project Structure

```
video-chat-application/
├── web-socket-api/          # Express.js signalling API + per-call WebSocket servers
│   ├── app.js               # API entry point (port 3000 by default)
│   ├── authorization/       # Signup, login, logout routes
│   ├── users/               # Authenticated user lookup routes
│   ├── call/                # Create / join / leave call routes + WS utilities
│   ├── common/              # DB (SQLite), models, JWT middleware
│   └── openapi.yaml         # API schema reference (may drift from implementation)
├── web-server/              # HTTP static file server for the web UI
│   ├── server.js            # Serves files from ./static (port 8000)
│   └── static/
│       ├── index.html       # Video chat UI
│       └── lib/
│           ├── client.js    # UI logic, REST + WebSocket client
│           └── rtcUtils.js  # WebRTC helpers (media, offers, peer connection)
└── package.json             # Root scripts to run both servers
```


| Component                             | Role                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Express.js API** (`web-socket-api`) | REST signalling: auth, users, call lifecycle; creates in-memory WebSocket servers per call |
| **HTTP web server** (`web-server`)    | Serves vanilla HTML/CSS/JS for the video chat interface                                    |


## Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- Git
- A machine with camera/microphone access for testing WebRTC

### 1. Clone and install API dependencies

```bash
git clone <repository-url>
cd video-chat-application
cd web-socket-api
npm install
```

### 2. Run the Express signalling API

From the `web-socket-api` directory:

```bash
node app.js
```

Default: `http://<HOST>:3000` (see [Gotchas](#gotchas--experimentation) for the configured `HOST`).

Alternatively, from the repo root:

```bash
npm run run-signalling-api
```

### 3. Run the static HTTP server

The static server resolves files relative to **current working directory** `./static`, so run it from `web-server`:

```bash
cd ../web-server
node server.js
```

App URL: **[http://localhost:8000/](http://localhost:8000/)**

From the repo root:

```bash
npm run run-video-chat-frontend
```

---

## Signalling Server (Express.js API)

**Base URL:** `http://localhost:3000` (or the host/port configured in `web-socket-api/app.js`)

**Database:** SQLite at `web-socket-api/storage/data.db` (created on first run via Sequelize `sync()`)

### Authentication

Protected routes expect a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are issued on successful **signup** (`POST /signup`). Payload includes `username` and `userId`; secret and expiry are defined in `authorization/controller.js` (`72h` expiry for now for dev purposes).


| Route                                                                    | Auth required                                                                      |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `POST /signup`                                                           | No                                                                                 |
| `POST /login`                                                            | No (handler not implemented)                                                       |
| `POST /logout`                                                           | No (handler not implemented)                                                       |
| `GET /user`, `GET /user/all`                                             | **Yes** — Bearer JWT                                                               |
| `POST /call/create`, `PUT /call/join/:callId`, `PUT /call/leave/:callId` | **No** in current code — `username` (and optionally token in OpenAPI) in body only |


### API Routes

#### Auth (`/`)


| Method | Path      | Request body                                                                          | Success response                                                                       |
| ------ | --------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `POST` | `/signup` | `{ "username": string (min 3), "email": string (email), "password": string (min 6) }` | `201` — `{ "success": true, "user": { "id", "username", "email" }, "token": "<jwt>" }` |
| `POST` | `/login`  | (planned) username or email + password                                                | Not implemented                                                                        |
| `POST` | `/logout` | —                                                                                     | Not implemented                                                                        |


**Signup validation errors:** `400` — `{ "error": "Invalid input", "details": [...] }`

#### Users (`/user`)


| Method | Path        | Auth       | Success response                    |
| ------ | ----------- | ---------- | ----------------------------------- |
| `GET`  | `/user`     | Bearer JWT | `200` — `{ "data": <User> }`        |
| `GET`  | `/user/all` | Bearer JWT | `200` — `{ "data": [<User>, ...] }` |


**User object fields:** `id`, `username`, `email`, `password` (hashed), `createdAt`, `updatedAt`

#### Calls (`/call`)


| Method | Path                  | Request                                                 | Success response                                                                     |
| ------ | --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `POST` | `/call/create`        | Body: `{ "username": string }`                          | `201` — `{ "success": true, "data": { "callId": "<uuid>", "callURL": "ws://..." } }` |
| `PUT`  | `/call/join/:callId`  | Params: `callId` (UUID). Body: `{ "username": string }` | `201` — `{ "success": true, "data": { "callURL": "ws://..." } }`                     |
| `PUT`  | `/call/leave/:callId` | (planned)                                               | Not implemented                                                                      |


**Call errors (examples):**

- `400` — invalid body/params: `{ "success": false, "error": "Invalid input", "details": [...] }`
- `404` — unknown call: `{ "success": false, "error": "Call ID not present" }`
- `500` — server error: `{ "success": false, "error": "<message>" }`

Creating a call also starts a **WebSocket server** on a random port and stores session state in an in-memory `Map` (`callId` → `{ wsURL, participants, pendingParticipants }`).

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

**Register a user**

```bash
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret12"}'
```

**Get current user (authenticated)**

```bash
curl http://localhost:3000/user \
  -H "Authorization: Bearer <token-from-signup>" \
  -d '{"userId":"36"}'
```

**Create a call**

```bash
curl -X POST http://localhost:3000/call/create \
  -H "Content-Type: application/json" \
  -d '{"username":"alice"}'
```

Example response:

```json
{
  "success": true,
  "data": {
    "callId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "callURL": "ws://localhost:4521"
  }
}
```

**Join an existing call**

```bash
curl -X PUT http://localhost:3000/call/join/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Content-Type: application/json" \
  -d '{"username":"bob"}'
```

For a machine-readable spec, see `web-socket-api/openapi.yaml` (some paths/responses may not match runtime behavior yet).

---

## Static Site & Client (HTTP server)

**Server:** `web-server/server.js` — Node `http` module, port **8000**, serves `web-server/static/`.

**Entry:** `index.html` loads `lib/client.js` as an ES module.

### `client.js`

Orchestrates the UI and signalling client:

- **Create call** — `POST` to `/call/create` with username; displays `callId`; calls `getLocalMedia()`; opens WebSocket to `callURL`; on `open`, sends `newParticipantOnCall`.
- **Join call** — `PUT` to `/call/join/:callId`; same media + WebSocket flow.
- **WebSocket `message` handler** — switches on `type`:
  - Chat / join notifications → append to `#chat-messages`
  - `responseCurrentCallParticipants` → for each peer, `sendOffer()` and send resulting message over WebSocket; update participant list in the DOM
  - `offer` — logged (answer/ICE handling not fully wired)
- **Hang up** — stub (`hangUpCall` empty)

API URLs in `client.js` are hardcoded to `http://192.168.0.60:3000` — align with your API host when testing locally.

### `rtcUtils.js`

WebRTC and media utilities:

- `getLocalMedia()` — `navigator.mediaDevices.getUserMedia({ audio: true, video: true })`, attaches stream to `#local_video`. Throws if called when media is already being captured.
- `sendOffer(caller, recipient)` — creates `RTCPeerConnection` with STUN `stun:stun.stunprotocol.org`, adds local tracks, calls `createOffer()` / `setLocalDescription()`, returns a signalling message `{ type: 'offer', data: { offer, recipient, caller } }` for the WebSocket layer.
- `createPeerConnection()` — sets up `RTCPeerConnection` with placeholder handlers for ICE, tracks, and signalling state (many handlers are stubs).

Negotiation is **in progress**: offers are created and sent via the signalling server; answer handling, ICE candidate exchange, and remote video on `#received_video` are not fully implemented.

---

## Gotchas & Experimentation

1. **API working directory** — SQLite path is `./storage/data.db` relative to where `app.js` is started; prefer running from `web-socket-api/`.
2. **Incomplete endpoints** — `POST /login`, `POST /logout`, and `PUT /call/leave/:callId` are stubs. Do not expect login/logout or leave-call to work at current
3. **Middleware import casing** — User routes import `../common/middlewares/isAuthenticated` while the file is `IsAuthenticated.js`. This works on case-insensitive filesystems (Windows) but can fail on Linux — will need to rename or fix the import in this case
4. **Call auth vs OpenAPI** — OpenAPI describes `token` on call routes; the implementation only validates `username` today.
5. **In-memory calls** — Restarting the API clears all active calls and WebSocket servers. No persistence of live sessions to the `Call` Sequelize model yet.
6. **Second `getLocalMedia()` call** — Re-clicking create/join without refresh throws `"Already capturing local media"`.

