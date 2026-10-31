# Scribbly

Scribbly is a responsive multiplayer drawing-and-guessing game built with React, Vite, Tailwind CSS, Express, Socket.IO, and SQLite. The frontend and backend are independent applications in separate root folders.

## Features

- Create private or public rooms with configurable player count, rounds, draw time, word choices, hints, and category.
- Join by room code or invite link; browse open public rooms.
- Ready-up lobby, host-controlled start, rotating drawers, word selection, timed hints, chat, scoring, and leaderboard.
- Synchronized canvas drawing with color, brush size, eraser, undo, and clear controls.
- REST API for health, public-room discovery, and persistent recent match history.
- SQLite stores completed game results; active rooms and games are held in memory.

## Project structure

```text
.
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/       # REST and Socket.IO clients
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
└── backend/
    ├── src/
    │   ├── config/         # Environment and SQLite setup
    │   ├── controllers/
    │   ├── data/
    │   ├── middleware/
    │   ├── models/
    │   ├── routes/
    │   ├── services/
    │   ├── socket/
    │   ├── state/
    │   └── utils/
    ├── .env.example
    └── package.json
```

## Requirements

- Node.js 20 or newer
- npm

## Install and run

Install each application independently from the repository root:

```powershell
npm --prefix backend install
npm --prefix frontend install
```

Optionally copy the environment templates to `.env` files and edit the values:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Run both applications together from the root (the root package uses `concurrently`):

```powershell
npm install
npm run dev
```

Or run either application by itself:

```powershell
npm --prefix backend run dev
npm --prefix frontend run dev
```

The frontend is served at `http://localhost:5173`; the API and Socket.IO server use `http://localhost:3001`. Open the frontend in two browser windows to test a match. At least two players are needed to start.

Run backend validation and persistence tests with `npm --prefix backend test`.

## Environment

`frontend/.env.example`:

- `VITE_API_URL`: REST API base URL, normally `http://localhost:3001/api`.
- `VITE_SERVER_URL`: Socket.IO backend origin, normally `http://localhost:3001`.

`backend/.env.example`:

- `PORT`: HTTP and Socket.IO port.
- `CLIENT_ORIGIN`: comma-separated allowed frontend origins for CORS.
- `DATABASE_PATH`: SQLite file path; defaults to `backend/data/scribbly.sqlite`.

Vite reads frontend environment values at build time. Keep real `.env` files out of source control.

## REST API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Backend health check |
| `GET` | `/api/rooms` | List public, open lobbies |
| `GET` | `/api/games?limit=5` | List recent completed games (`limit` 1–50) |

Live lobby updates, drawing, guessing, and chat use Socket.IO because they need bidirectional real-time events. REST calls are centralized in `frontend/src/services/api.js`; Socket.IO is configured in `frontend/src/services/socket.js`.

## Build and production

```powershell
npm --prefix frontend run build
npm --prefix backend start
```

Deploy `frontend/` and `backend/` as separate services. Build the frontend with its `VITE_API_URL` and `VITE_SERVER_URL` set to the deployed backend. Configure the backend `CLIENT_ORIGIN` to the deployed frontend origin. For persistent match history on a host with ephemeral filesystems, mount a persistent disk and set `DATABASE_PATH` to a file on that disk. Multi-instance multiplayer deployments also need shared room state and a Socket.IO adapter; current active game rooms are intentionally in memory.

## Socket.IO events

Clients create/join rooms, toggle readiness, start games, choose words, send guesses/chat, and draw using room-scoped Socket.IO events. The server validates room settings and drawing permissions and remains authoritative for word selection, guesses, timers, and scores.
