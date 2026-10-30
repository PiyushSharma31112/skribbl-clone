# Scribbly — real-time drawing & guessing game

A full-stack skribbl.io-inspired multiplayer drawing and guessing game built with React, Vite, Node.js, Express, Socket.IO, and the HTML5 Canvas API. It is an original implementation for the supplied intern assignment, not a copy of skribbl.io branding or assets.

## Features

### Must-have requirements
- Create a room with host-configurable max players (2–20), rounds (2–10), draw time (15–240 seconds), word choices (1–5), category, and hint count (0–5).
- Join with a room code or invite URL; private and public room modes are supported. Public-room discovery is available through the Socket.IO `get_public_rooms` event.
- Lobby with player list, host designation, ready toggle, and host-only start action.
- Turn-based drawing: each player gets a turn for each configured round.
- Live HTML canvas strokes synchronized over Socket.IO; color, brush size, eraser, undo, and clear canvas.
- Drawer word choice, hidden word hints, word guessing, score calculation, leaderboard, round transitions, and winner display.
- Chat and correct-guess notifications; draw countdown.

### Additional features
- Word categories: Animals, Objects, Food, Actions, or All.
- Responsive desktop/mobile layout.
- Room state and game logic organized into `Room`, `Game`, and `Player` classes.

### Known scope limits
- The optional `Combination` word mode, persistent database, moderation/votekick/report, custom host word lists, avatars upload, spectator mode, replay UI, and multilingual word lists are not implemented.
- Room state is in memory. Restarting the server clears rooms. For production scale, use a shared adapter/store (e.g. Redis) and add authentication/rate limits.
- No public deployment URL has been created from this workspace; see **Deployment** below.

## Requirements
- Node.js 20 or newer (Node.js 18.18+ may work with Vite 6).
- npm.

## Run locally

```bash
# From the project root
npm install
npm --prefix server install
npm --prefix client install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). The Socket.IO backend runs on `http://localhost:3001`. Open the frontend in two browser windows, create a room in one, then join using the displayed room code in the other. At least two players are required to start.

Health check: `http://localhost:3001/api/health`.

## Production build and start

```bash
npm install
npm --prefix server install
npm --prefix client install
npm run build
npm start
```

Set `PORT` for the backend. For a separately hosted frontend, set `VITE_SERVER_URL` at frontend build time to the public Socket.IO backend origin. Set `CLIENT_ORIGIN` on the backend to the allowed frontend origin(s), comma-separated. If frontend and backend are served from the same origin, the production client defaults to `window.location.origin`.

## Deployment (manual action required)

This project has not been published to a public host from this environment, so there is no truthful live URL to include yet. Deploy the full-stack app to Render or Railway (recommended because they support persistent WebSocket connections):

1. Push this folder to a Git repository.
2. Create a backend web service using the `server` directory (build/install: `npm install`; start: `npm start`). Configure `PORT` if the platform requires it.
3. Create a frontend static site using the `client` directory (build: `npm install && npm run build`; output directory: `dist`). Set `VITE_SERVER_URL` to the backend's public URL, then rebuild.
4. Set backend `CLIENT_ORIGIN` to the frontend public URL.
5. Test two separate browser sessions end-to-end: create room → join room → start → draw → guess → score → winner.
6. Replace this note with the actual live URL once the deployment has been verified.

Vercel/Netlify frontend hosting requires a separate persistent WebSocket backend; do not deploy this Socket.IO server as a short-lived serverless function.

## Architecture overview

```text
React UI (Vite)
  ├─ Lobby / settings / leaderboard / chat
  ├─ HTML5 Canvas (normalized x/y coordinates from 0 to 1)
  └─ socket.io-client
          ⇅ Socket.IO events
Node.js + Express + Socket.IO server
  ├─ Room: members, host, settings, broadcasts
  ├─ Game: phase, round/turn order, timer, word, strokes, scoring
  └─ Player: name, score, ready/connected state
```

- The drawer's pointer events are converted to normalized canvas coordinates and sent as `draw_start`, `draw_move`, and `draw_end` events. The server validates that the sender is the current drawer, stores stroke data, and broadcasts `draw_data`; each client renders the received stroke on its canvas.
- `Game` in `server/src/models/game.js` owns round phase, drawer rotation, word options, countdown, hints, scoring, and game completion. `Room` and `Player` are in their own model modules. The server is authoritative for word selection, correct guesses, and scores.
- Socket.IO provides event-based, bidirectional real-time messaging for lobby updates, game state, drawing, guesses, and chat.
- Guess matching trims surrounding whitespace and compares case-insensitively. A partial match is marked “close” rather than correct; only an exact normalized match earns points.
- Deployment should use a host with WebSocket support (Render/Railway are recommended in the assignment). A multi-instance deployment needs shared room state and a Socket.IO adapter.

### Server structure

```text
server/src/
├── app.js                         # Express, HTTP, Socket.IO setup
├── server.js                      # Startup and listening port
├── config/env.js                  # Port and allowed client origins
├── data/words.js                  # Word categories and choices
├── models/                        # Player, Room, and Game state
├── socket/
│   ├── handlers/                  # Room, game, drawing, and chat events
│   ├── helpers.js                 # Shared socket and room helpers
│   └── registerSocketHandlers.js  # Connection event registration
└── state/rooms.js                 # In-memory room registry
```

Server environment variables are listed in `server/.env.example`. The server does not load `.env` files itself; configure these variables in the shell or deployment environment.

### Client structure

```text
client/src/
├── app/                 # App composition and shared game settings
├── components/layout/   # Shared application chrome
├── features/
│   ├── game/            # Game screen and canvas drawing hook
│   ├── home/            # Room creation and join screen
│   └── lobby/           # Room lobby screen
├── services/socket.js   # Socket.IO client configuration
├── styles/global.css    # Shared app styling
└── main.jsx             # React entry point
```

The app uses screen state rather than a router, and communicates with the backend over Socket.IO. Canvas interaction and stroke rendering live in the game feature hook; there is no separate REST API client or global state library.

## Socket.IO event map

| Event | Direction | Purpose |
|---|---|---|
| `create_room` | Client → server | Create room with host name/settings/privacy |
| `join_room` | Client → server | Join with code and player name |
| `player_joined`, `player_left`, `lobby_update` | Server → clients | Keep lobby list and host status synchronized |
| `ready_toggle`, `start_game` | Client → server | Ready status and host-start action |
| `game_state`, `round_start`, `word_chosen`, `round_end`, `game_over` | Both directions by event | Game phase and round lifecycle |
| `draw_start`, `draw_move`, `draw_end` | Client → server | Send drawer pointer/stroke activity |
| `draw_data`, `canvas_clear`, `canvas_undo` | Server → clients | Broadcast canvas changes |
| `guess`, `guess_result` | Client/server | Submit guesses and return correctness/points |
| `chat`, `chat_message` | Client/server | Chat and system messages |
| `get_public_rooms`, `public_rooms` | Client/server | Discover open public lobbies |

## Code walkthrough talking points

1. **Stroke capture:** `pointerDown`, `pointerMove`, and `pointerUp` in `client/src/main.jsx` capture pointer events. The browser draws locally for responsiveness and emits normalized coordinates to the server.
2. **State management:** `Game` in `server/src/models/game.js` manages phases (`lobby`, `choosing`, `drawing`, `roundEnd`, `gameOver`), turns, timers, and score.
3. **WebSocket synchronization:** Socket.IO broadcasts the server-accepted stroke to room members; room-scoped events keep unrelated rooms isolated.
4. **Word matching:** the server trims the guess and uses lower-case exact matching; partial matches receive a “close” response and no points.
5. **Deployment:** the frontend and backend can be deployed separately. The frontend must be built with `VITE_SERVER_URL` set to the backend URL, and the backend must allow the frontend origin in `CLIENT_ORIGIN`.

## Requirement checklist

| PDF requirement | Status in this project | Notes |
|---|---|---|
| End-to-end multiplayer drawing/guessing game | Implemented; local run/build must be tested in your environment | Frontend + backend included |
| Create rooms with configurable settings | Implemented | Server validates ranges |
| Join via link or code | Implemented | Invite link carries room code |
| Lobby/player list/host starts | Implemented | Ready toggle included |
| Private rooms | Implemented | Room-code invite; no authentication |
| Public rooms (optional) | Partially implemented | Discovery event exists; home UI does not list public rooms |
| One drawer per round / rotate turns | Implemented | Each player draws for each configured round |
| Real-time canvas sync | Implemented | Socket.IO stroke events |
| Word selection (1–5 choices) | Implemented | Category selection included |
| Hints | Partially implemented | Timed reveal is implemented; configured hint count is stored but does not control reveal count |
| Guessing/scoring/leaderboard/winner | Implemented | Exact case-insensitive matching; first correct guess gets score |
| Brush/colors/size/undo/clear | Implemented | Drawer-only server validation |
| Eraser | Implemented | Canvas-white eraser |
| Chat and correct guess notice | Implemented | Guess chat and drawer/general chat behavior |
| Countdown | Implemented | Server-authoritative time remaining |
| README + architecture + walkthrough | Completed | This file |
| Public live URL | Blocked/manual action | Hosting credentials/account access unavailable in this workspace; add verified URL after deployment |
| OOP server classes | Implemented | `Room`, `Game`, `Player` |
| Word modes: Normal/Hidden/Combination | Partially implemented | Hidden hints behavior; Normal/Combination mode switch not implemented |
| Kick/ban/votekick/report | Not implemented | Bonus feature |
| Custom word list | Not implemented | Bonus feature |
| Avatars | Partially implemented | Initial-letter avatars only; no upload/customization |
| Spectator mode/replay | Not implemented | Bonus feature |
| Multiple languages | Not implemented | Bonus feature |

## Final verification status

The source files and documentation have been created. Run the install/build commands above to verify against your Node/npm environment, and complete the manual two-browser acceptance test before submission. Public deployment is not claimed complete until a real live URL is available and tested.
