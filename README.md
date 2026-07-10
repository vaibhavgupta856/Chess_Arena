# ChessArena

A full-stack, server-authoritative chess platform with a cinematic **3D board**, real-time multiplayer, bot opponents, accounts, friends, ELO ratings, and an in-game coach.

Play online, hot-seat on one device, or face an engine with adjustable strength — all backed by a custom Go chess engine and a React + Three.js frontend.

---

## Table of contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Architecture](#architecture)
5. [Repository layout](#repository-layout)
6. [Game modes](#game-modes)
7. [Chess engine](#chess-engine)
8. [Bot opponents](#bot-opponents)
9. [Auth, social & ratings](#auth-social--ratings)
10. [Coach](#coach)
11. [Frontend](#frontend)
12. [API reference](#api-reference)
13. [WebSocket](#websocket)
14. [Environment variables](#environment-variables)
15. [Local development](#local-development)
16. [Deployment](#deployment)
17. [Limitations & notes](#limitations--notes)

---

## Overview

ChessArena splits cleanly into two parts:

| Layer | Role |
|-------|------|
| **Go API** (`cmd/server`) | Rules, game sessions, moves, bots, auth, friends, ELO, coach, WebSocket broadcasts |
| **React app** (`web/`) | Lobby, 2D/3D boards, themes, mobile UI, accounts, friends, leaderboard |

The server owns the truth: clients send UCI/SAN moves; the engine validates them; state is pushed to all subscribers over WebSockets.

---

## Features

### Play
- **Hot seat (local)** — both colors on one device
- **Online rooms** — create a room, share a link/code, second player joins as Black
- **Play vs bot** — human as White or Black; four strength levels
- Full rules: check, checkmate, stalemate, castling, en passant, promotion, resign, draw offer, threefold repetition, fifty-move rule

### 3D experience
- React Three Fiber board with **procedural pieces** (optional GLB models)
- **Free-drag camera** (orbit + zoom) and fixed angle presets
- Animated piece moves (including knight jumps)
- **Valhalla** — side platforms where captured pieces land
- Multiple visual **themes** (board, fog, atmosphere, lobby contrast)
- Optional **2D** board via `react-chessboard`
- Move / capture / end-of-game sounds

### Accounts & social
- Register / login (JWT)
- Profiles (display name, avatar URL)
- Friends: search, request, accept/decline
- Friend challenges → online games
- **ELO** ratings on rated online finishes
- Public **leaderboard** (top 50)

### Coach
- Hints, last-move quality labels, threat / position advice
- Available in **bot** and **local** games only

### UX
- Responsive lobby and fullscreen game layout
- Mobile bottom bar + slide-out sidebar
- Invite links (`?game=<id>`)

---

## Tech stack

### Backend
- **Go** (module `github.com/conan/chessarena`)
- Custom chess engine under `internal/chess`
- **Gorilla WebSocket** — live game sync
- **JWT** (`golang-jwt/jwt/v5`) + **bcrypt** — auth
- **SQLite** (`modernc.org/sqlite`) — users, friends, challenges, ELO

### Frontend
- **React 19** + **TypeScript** + **Vite 8**
- **Three.js** + **@react-three/fiber** + **@react-three/drei**
- **react-chessboard** for 2D mode

### Deploy
- Frontend: **Vercel**
- API: **Render** (`render.yaml`)

---

## Architecture

```
┌─────────────────┐         REST + WS          ┌──────────────────────┐
│  React (Vite)   │ ◄────────────────────────► │  Go HTTP server      │
│  Lobby / Board  │   /api → proxy in dev      │  cmd/server          │
└─────────────────┘                            └──────────┬───────────┘
                                                          │
                     ┌────────────────────────────────────┼────────────────┐
                     ▼                                    ▼                ▼
            ┌────────────────┐                 ┌─────────────────┐  ┌────────────┐
            │ In-memory      │                 │ internal/chess  │  │ SQLite     │
            │ game sessions  │                 │ rules / bot /   │  │ users,     │
            │ + WS subs      │                 │ coach           │  │ friends,   │
            └────────────────┘                 └─────────────────┘  │ ELO        │
                                                                    └────────────┘
```

- **Games** live in memory (lost on server restart).
- **Users / friends / ELO** persist in SQLite.
- Bot moves are scheduled asynchronously (~700 ms delay) so the UI can show “thinking”.

---

## Repository layout

```
Chess/
├── cmd/server/           # HTTP + WebSocket server
│   ├── main.go           # Routes, game handlers, state encoding
│   ├── session.go        # Game session model (local / online / bot)
│   ├── bot_scheduler.go  # Delayed bot moves
│   ├── auth_handlers.go  # Register, login, profile, player IDs
│   ├── friends_handlers.go
│   ├── coach_handlers.go
│   └── rating.go         # ELO updates on online results
├── internal/
│   ├── auth/             # JWT + password hashing
│   ├── chess/            # Engine, bot, coach, FEN, tests
│   └── store/            # SQLite access
├── web/                  # React frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/   # Boards, lobby, sidebar, Valhalla, coach…
│   │   ├── hooks/        # useGame, useAuth, useSocial, useTheme
│   │   ├── pages/        # Auth, Profile, Friends, Leaderboard
│   │   ├── lib/          # API, FEN, themes, Valhalla layout, sounds
│   │   └── types.ts
│   └── vite.config.ts    # /api proxy → localhost:8080
├── data/                 # Default SQLite path (local)
├── render.yaml           # Render API service
├── go.mod
└── README.md
```

---

## Game modes

| Mode | How to start | Seats | Coach | Rated ELO |
|------|--------------|-------|-------|-----------|
| **local** | Hot Seat | One client plays both colors | Yes | No |
| **bot** | Play vs Bot / Bot as White | Human + `"bot"` | Yes | No |
| **online** | Online Room or friend challenge | White (creator) + Black (joiner) | No | Yes, if both seats are logged-in users |

### Online flow
1. Player A creates an online game → becomes White.
2. Share invite link or room id.
3. Player B joins → becomes Black.
4. Moves sync over WebSocket; when the game ends, ELO may update.

### Bot seating
- **Play vs Bot** — human White, bot Black.
- **Bot as White** — bot moves first after a short delay; human is Black.
- Bot/local seats use the browser `clientId` so moves match even when logged in.
- Online seats prefer the JWT user id when present.

---

## Chess engine

Located in `internal/chess`. Responsibilities:

- Board representation and legal move generation
- Apply moves by **UCI** or **SAN**
- Outcomes: checkmate, stalemate, resign, draw claims
- FEN export / history for UI scrubbing
- Unit tests for castling, en passant, promotion, checks, draws, etc.

The API never trusts the client for legality — invalid moves return `400`.

---

## Bot opponents

Levels (`internal/chess/bot_level.go`):

| Level | Approx. ELO | Search depth | Behavior |
|-------|-------------|--------------|----------|
| Beginner | 400 | 1 | Occasional blunders |
| Casual | 800 | 2 | Default |
| Club | 1200 | 3 | Piece-square tables on |
| Strong | 1600 | 4 | No intentional blunders |

Implementation: negamax search with material (and PST where enabled) evaluation. After a human move, `bot_scheduler.go` waits **700 ms**, marks `botThinking`, plays, then broadcasts.

---

## Auth, social & ratings

### Auth
- `POST /auth/register`, `POST /auth/login`
- Passwords hashed with bcrypt; sessions are JWTs (~30 days)
- Frontend stores token as `chessarena-auth-token`
- Send `Authorization: Bearer <token>` on protected routes

### Profiles
- `GET` / `PATCH /users/me`
- Public `GET /users/{id}`
- Search: `GET /users/search?q=`

### Friends
- Send / respond to requests
- List friends, pending requests, open challenges
- Challenge a friend → creates an online game; accept seats the opponent as Black

### ELO
- New users start at **1200** (floor **100**)
- Classic rating with **K = 32**
- Applied only when an **online** game ends and both seats are real user ids (not bot / anonymous client ids)
- Leaderboard: top 50 by rating

---

## Coach

Server-side helpers in `internal/chess/coach.go`, exposed only for **bot** and **local** games:

| Endpoint | Purpose |
|----------|---------|
| `POST /games/{id}/coach/hint` | Suggest a strong move / idea |
| `POST /games/{id}/coach/analyze` | `last_move` quality or `threats` summary |

UI: `CoachPanel` in the game sidebar.

---

## Frontend

### Screens (`App.tsx`)
No React Router — view state switches between:

- Lobby (play)
- Auth
- Profile
- Friends
- Leaderboard
- Active game (2D or 3D)

### Important hooks

| Hook | Responsibility |
|------|----------------|
| `useGame` | Create / join / load, submit moves, draws, resign, WebSocket, history view ply |
| `useAuth` | Login state and token |
| `useSocial` | Friends + coach API calls |
| `useTheme` | Theme persistence (`chessarena-theme`) |

### 3D board highlights
- **Free drag** — left-drag rotates, scroll zooms; **click** selects piece then destination (drag vs click so camera and moves coexist)
- **Valhalla** — `ValhallaPlatforms` + `lib/valhalla.ts` place fallen pieces beside the board
- Themes: Sky Classic, Midnight, Forest, Royal Purple (`lib/themes.ts`)

### Client identity
`lib/clientId.ts` manages host/tab ids so the same browser tab keeps its seat across refresh, and invitees get a distinct id when joining.

---

## API reference

Base URL locally: `http://localhost:8080`  
Dev frontend calls `/api/...`, rewritten by Vite to the Go server.

### Health
| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/health` | `{ "status": "ok" }` |

### Auth & users
| Method | Path | Auth |
|--------|------|------|
| `POST` | `/auth/register` | No |
| `POST` | `/auth/login` | No |
| `GET` | `/users/me` | Yes |
| `PATCH` | `/users/me` | Yes |
| `GET` | `/users/search?q=` | Yes |
| `GET` | `/users/{id}` | No |
| `GET` | `/leaderboard` | No |

### Friends
| Method | Path | Auth |
|--------|------|------|
| `POST` | `/friends/request` | Yes |
| `POST` | `/friends/respond` | Yes |
| `GET` | `/friends` | Yes |
| `POST` | `/friends/challenge` | Yes |
| `POST` | `/friends/challenge/{id}/accept` | Yes |

### Games
| Method | Path | Body / query |
|--------|------|----------------|
| `POST` | `/games` | `{ mode, playAs?, clientId, botLevel? }` |
| `GET` | `/games/{id}` | `?clientId=` |
| `POST` | `/games/{id}/join` | `{ clientId }` |
| `POST` | `/games/{id}/moves` | `{ uci }` or `{ san }`, plus `clientId` |
| `GET` | `/games/{id}/moves` | Legal moves |
| `POST` | `/games/{id}/resign` | `{ clientId, color? }` |
| `POST` | `/games/{id}/draw` | Offer or claim type |
| `POST` | `/games/{id}/draw/respond` | Accept / decline |
| `POST` | `/games/{id}/coach/hint` | Bot/local only |
| `POST` | `/games/{id}/coach/analyze` | Bot/local only |

### Typical create body
```json
{
  "mode": "bot",
  "playAs": "white",
  "clientId": "browser-host-id",
  "botLevel": "casual"
}
```

`mode`: `local` | `online` | `bot`  
`botLevel`: `beginner` | `casual` | `club` | `strong`

### Game state (JSON)
Responses include fields such as:

- `id`, `fen`, `turn`, `over`, `outcome`, `history`, `positionFens`, `ply`
- `mode`, `yourColor`, `whitePlayer`, `blackPlayer`, `waitingFor`
- `botThinking`, `botLevel`, `botElo`
- `drawOfferBy`, claimable draws, optional ELO deltas after rated games

CORS allows `*`, methods `GET, POST, PATCH, OPTIONS`, headers `Content-Type, Authorization`.

---

## WebSocket

```
GET /ws/games/{id}?clientId=<id>
```

- Upgrades to WebSocket
- Sends current game state on connect
- Re-broadcasts full state after moves, bot plays, resigns, draws, etc.
- Frontend URL in dev: `ws://localhost:5173/api/ws/games/...` (proxied)

---

## Environment variables

### Go server

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8080` | Listen port |
| `DATABASE_PATH` | `data/chessarena.db` | SQLite file |
| `JWT_SECRET` | Dev fallback string | **Set a strong secret in production** |

### Vite frontend

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE` | (empty → use `/api`) | Absolute API URL in production (e.g. Render URL) |
| `VITE_USE_GLB_PIECES` | unset / false | Set `true` to load GLB piece models instead of procedural meshes |

---

## Local development

**Requirements:** Go 1.22+, Node.js 18+ (or current LTS), npm.

### 1. Start the API
```bash
cd Chess
go run ./cmd/server
```
Server listens on `http://localhost:8080`. SQLite is created under `data/` as needed.

### 2. Start the frontend
```bash
cd Chess/web
npm install
npm run dev
```
Open the Vite URL (usually `http://localhost:5173`).

Vite proxies `/api` → `http://localhost:8080` (including WebSockets).

### 3. Optional checks
```bash
curl http://localhost:8080/health
cd web && npm run build
go test ./internal/chess/...
```

---

## Deployment

### API (Render)
Configured by `render.yaml`:

- Build: `go build -o server ./cmd/server`
- Start: `./server`
- Health check: `/health`
- Persistent disk for `DATABASE_PATH=/var/data/chessarena.db`
- `JWT_SECRET` generated by Render

Align `GO_VERSION` on Render with the Go version you build against locally if deploys fail.

### Frontend (Vercel)
1. Deploy the `web/` app (Vite build).
2. Set **`VITE_API_BASE`** to your Render API origin (no trailing path), e.g. `https://chessarena-api.onrender.com`.
3. Rebuild so the client talks to the live API instead of `/api`.

---

## Limitations & notes

- **Games are not persisted** — restarting the API drops in-progress rooms; only accounts/friends/ELO survive in SQLite.
- **Coach is offline for online PvP** — intentional so opponents cannot request engine help mid-match.
- **Anonymous online seats** use client ids; ELO only applies when both players are registered users.
- Root `web/README.md` may still contain the default Vite template; this file is the project source of truth.

---

## License / credit

Built as **ChessArena** — a 3D-first chess playground with a real rules engine, live multiplayer, and social ratings.

Enjoy the board — and may your fallen pieces rest in Valhalla.
