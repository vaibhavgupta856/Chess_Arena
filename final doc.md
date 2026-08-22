# ChessArena — Final Documentation

**Project:** ChessArena  
**Repository:** [vaibhavgupta856/Chess_Arena](https://github.com/vaibhavgupta856/Chess_Arena)  
**Live frontend:** [chessarena-vaibhavgupta856.vercel.app](https://chessarena-vaibhavgupta856.vercel.app)  
**Document type:** Complete product, architecture, and operations reference  
**Audience:** Developers, reviewers, and anyone taking over or extending the project

This file is the long-form record of how ChessArena is built, how it behaves, and how to run it. The shorter onboarding README is `README.md`.

---

## Table of contents

1. [What ChessArena is](#1-what-chessarena-is)
2. [Product goals and design principles](#2-product-goals-and-design-principles)
3. [Feature catalog](#3-feature-catalog)
4. [Tech stack](#4-tech-stack)
5. [High-level architecture](#5-high-level-architecture)
6. [Repository layout](#6-repository-layout)
7. [User journeys](#7-user-journeys)
8. [Game modes](#8-game-modes)
9. [Identity, seats, and tabs](#9-identity-seats-and-tabs)
10. [Chess engine](#10-chess-engine)
11. [Bot opponents](#11-bot-opponents)
12. [In-game coach](#12-in-game-coach)
13. [Auth, friends, challenges, and ELO](#13-auth-friends-challenges-and-elo)
14. [HTTP API](#14-http-api)
15. [WebSocket protocol](#15-websocket-protocol)
16. [Persistence](#16-persistence)
17. [Frontend architecture](#17-frontend-architecture)
18. [3D room and 2D board](#18-3d-room-and-2d-board)
19. [Themes, sounds, and Valhalla](#19-themes-sounds-and-valhalla)
20. [Product tour and neural TTS](#20-product-tour-and-neural-tts)
21. [Backend wake / loading screen](#21-backend-wake--loading-screen)
22. [Environment variables](#22-environment-variables)
23. [Local development](#23-local-development)
24. [Testing](#24-testing)
25. [Deployment](#25-deployment)
26. [Security notes](#26-security-notes)
27. [Known limitations](#27-known-limitations)
28. [Operational playbook](#28-operational-playbook)
29. [Glossary](#29-glossary)

---

## 1. What ChessArena is

ChessArena is a **full-stack, server-authoritative chess platform** with a cinematic **3D board**. Players can:

- Face an adjustable-strength engine
- Play hot-seat on one device
- Create online rooms and share an invite link
- Challenge friends after signing in
- Earn ELO on rated online finishes between two accounts

The backend is a custom **Go chess engine** plus HTTP/WebSocket API. The frontend is **React + TypeScript + Three.js**. The server never trusts the client for legality: clients send UCI or SAN; the engine validates; subscribers receive the new full game state.

ChessArena is **3D-first**. Rooms open in a Three.js scene with orbit camera, animated pieces, captured-piece platforms (“Valhalla”), and board themes. A 2D board exists as an optional view of the same game.

---

## 2. Product goals and design principles

| Principle | Meaning in this codebase |
|-----------|--------------------------|
| **Server is truth** | Moves, draws, resigns, bot plays, and ratings happen on the API. Invalid moves return HTTP 400. |
| **3D is the default room** | New games open in 3D. 2D is a toggle, not the primary experience. |
| **Guests can play** | Accounts are optional for local, bot, and anonymous online rooms. Social features require login. |
| **Fair online play** | Coach endpoints are disabled for online PvP so a player cannot query the engine mid-match. |
| **Free-tier honesty** | Render keep-alive was removed so free hours are not burned. The UI waits on a wake screen instead of looking broken during cold start. |
| **One SPA, no router** | `App.tsx` switches lobby vs game vs account pages with local state. Invite links use `?game=<id>`. |

---

## 3. Feature catalog

### 3.1 Play

- **Hot seat (`local`)** — both colors on one client; coach enabled
- **Online room (`online`)** — creator is White; joiner is Black; live WebSocket sync
- **Friend challenge** — logged-in users who are friends; accept seats the opponent as Black
- **Play vs bot (`bot`)** — human White or Black; four strength levels
- Full rules: check, checkmate, stalemate, castling, en passant, promotion, resign, draw offer, threefold / fivefold repetition, fifty-move / seventy-five-move, insufficient material

### 3.2 Presentation

- Procedural 3D pieces (optional GLB models via `VITE_USE_GLB_PIECES`)
- Free-drag camera (orbit + zoom) and fixed angle presets
- Animated piece motion, including knight arcs
- **Valhalla** — captured pieces land on side platforms
- Four visual themes (Sky Classic, Midnight, Forest, Royal Purple)
- Optional 2D board (`react-chessboard`)
- Synthesized move / capture / game-end sounds (Web Audio API)

### 3.3 Accounts and social

- Register / login (JWT, ~30 days)
- Profile: display name, avatar URL, ELO
- Friends: search, request, accept / decline
- Friend challenges that create online games
- Public leaderboard (top 50)
- Per-tab auth isolation so duplicate tabs can be different accounts

### 3.4 Coach (bot and local only)

- Hint (best move + explanation)
- Review last move (excellent / good / inaccuracy / blunder vs engine)
- Position / threat advice

### 3.5 Product UX

- Auto-starting full-arena **product tour** with spotlight cards and neural TTS
- Start-tour button (unlocks audio autoplay), mute, auto-advance after speech
- Mobile bottom bar + slide-out sidebar
- Full-screen **backend wake** screen while Render cold-starts
- Invite links (`?game=<id>`)

---

## 4. Tech stack

### Backend

| Piece | Detail |
|-------|--------|
| Language | Go **1.25.0** (`go.mod`; Render yaml still lists `GO_VERSION=1.22.0` — align if deploys fail) |
| Module | `github.com/conan/chessarena` |
| HTTP | `net/http` ServeMux with Go 1.22+ method+path patterns |
| WebSocket | `github.com/gorilla/websocket` |
| Auth | `golang-jwt/jwt/v5`, `golang.org/x/crypto/bcrypt` |
| Database | SQLite via `modernc.org/sqlite` (pure Go, no CGO) |
| Chess | Custom package `internal/chess` (not Stockfish) |

### Frontend

| Piece | Detail |
|-------|--------|
| UI | React **19**, TypeScript |
| Bundler | Vite **8** |
| 3D | Three.js, `@react-three/fiber`, `@react-three/drei` |
| 2D | `react-chessboard` |
| Lint | `oxlint` |
| Fonts | Outfit, Syne, IBM Plex Mono (Google Fonts) |

### Hosting

| Layer | Host |
|-------|------|
| SPA | **Vercel** (`web/`, Vite build, SPA rewrite to `index.html`) |
| API | **Render** web service (`render.yaml`) |
| Accounts DB | SQLite file on the API host (`DATABASE_PATH`) |

---

## 5. High-level architecture

```
┌──────────────────────────┐         REST + WebSocket        ┌──────────────────────────┐
│  React SPA (Vite)        │ ◄─────────────────────────────► │  Go HTTP server          │
│  web/                    │  Dev: /api proxy → :8080        │  cmd/server              │
│  Lobby, 2D/3D, tour      │  Prod: VITE_API_BASE origin     │  games, auth, friends    │
└──────────────────────────┘                                 └────────────┬─────────────┘
                                                                          │
                         ┌────────────────────────────────────────────────┼────────────────┐
                         ▼                                                ▼                ▼
                ┌─────────────────┐                            ┌─────────────────┐  ┌────────────┐
                │ In-memory map   │                            │ internal/chess  │  │ SQLite     │
                │ sessions[id]    │                            │ rules, FEN,     │  │ users,     │
                │ WS subscribers  │                            │ bot, coach      │  │ friends,   │
                └─────────────────┘                            └─────────────────┘  │ ELO        │
                                                                                    └────────────┘
```

**Split of truth**

- **Games** live only in process memory (`map[string]*gameSession`). Restarting the API drops all rooms.
- **Users, friendships, challenges, ELO** persist in SQLite.
- Bot replies are scheduled asynchronously (**700 ms** delay) so the UI can show “thinking”.

**Dev vs production networking**

- Local Vite proxies `/api` → `http://localhost:8080` and upgrades WebSockets.
- Production frontend talks to an absolute `VITE_API_BASE` (Render origin, no `/api` suffix, no trailing slash).
- CORS on the API allows `*` with methods `GET, POST, PATCH, OPTIONS` and headers `Content-Type, Authorization`.

---

## 6. Repository layout

```
Chess_Arena/
├── final doc.md                 # this document
├── README.md                    # shorter project README
├── go.mod / go.sum
├── render.yaml                  # Render API service blueprint
├── cmd/server/
│   ├── main.go                  # routes, game HTTP, WS, encodeState
│   ├── session.go               # gameSession: seats, canMove, draws
│   ├── bot_scheduler.go         # delayed bot moves
│   ├── auth_handlers.go         # register, login, profile, leaderboard
│   ├── friends_handlers.go      # requests, challenges
│   ├── coach_handlers.go        # hint / analyze (bot+local)
│   └── rating.go                # ELO after rated online finishes
├── internal/
│   ├── auth/auth.go             # JWT + bcrypt
│   ├── chess/                   # engine, bot, coach, FEN, tests
│   └── store/store.go           # SQLite schema and queries
├── web/                         # React client
│   ├── index.html
│   ├── vercel.json
│   ├── vite.config.ts           # /api proxy + GLB assets
│   ├── package.json
│   ├── .env.example
│   ├── scripts/generate-tour-voice.py
│   ├── public/                  # favicon; tour mp3s live at public/tour/voice/
│   └── src/
│       ├── App.tsx              # screens, tour wiring, API wake gate
│       ├── types.ts
│       ├── components/          # boards, lobby, tour, sidebar, wake screen
│       ├── hooks/               # useGame, useAuth, useSocial, useTheme
│       ├── pages/               # Auth, Profile, Friends, Leaderboard
│       └── lib/                 # API, FEN, themes, tour, Valhalla, sounds
└── data/                        # local SQLite (gitignored)
```

### 6.1 Chess engine files (`internal/chess`)

| File | Role |
|------|------|
| `types.go` | Color, piece, square, move, outcome, termination, draw claims |
| `board.go` | Starting array, castle rights |
| `position.go` | Position struct, FEN-related position state |
| `fen.go` | FEN parse / emit |
| `movegen.go` | Legal move generation |
| `moves.go` / `attack.go` | Apply moves, attacks, check |
| `notation.go` | SAN encode/decode, UCI |
| `game.go` | Game object, history, terminal detection, perft |
| `draw.go` | Claimable draws, resign |
| `bot.go` / `bot_level.go` | Negamax search and strength presets |
| `coach.go` | Hints, last-move grades, threat text |
| `*_test.go` | Castling, en passant, promotion, mates, draws, perft, bot, coverage |

### 6.2 Frontend components (`web/src/components`)

| Component | Role |
|-----------|------|
| `BackendWakeScreen` | Full-screen wait while `/health` fails (cold start) |
| `GameLobby` | Mode cards, join code, server status, nav |
| `ChessBoard3D` | R3F canvas: tiles, pieces, camera, Valhalla |
| `ChessBoard2D` | Flat board |
| `BoardCameraControls` | Orbit vs fixed presets |
| `TileBoard` / `RoomBackdrop` | Board mesh and room atmosphere |
| `ProceduralPiece` / `PieceBase` / `AnimatedPiece` | Piece visuals and motion |
| `ValhallaPlatforms` | Captured-piece platforms |
| `GameSidebar` | Status, history, invite, draws, coach, leave |
| `MobileGameBar` | Phone turn bar + menu |
| `ThemePicker` | Theme dots |
| `CoachPanel` | Hint / review / threats |
| `GameStatusOverlays` | Check / mate / over banners |
| `ProductTour` | Spotlight tour + voice |

---

## 7. User journeys

### 7.1 First visit (production)

1. SPA loads on Vercel.
2. If `VITE_API_BASE` is set, `App` polls `GET {base}/health` (and `/games` as fallback) with long timeouts.
3. **BackendWakeScreen** stays up until health succeeds (Render may take ~30–60s after sleep).
4. Lobby (and usually the product tour) mounts.
5. User taps **Start tour** to unlock narration, or skips; Tutorial in the nav replays later.

### 7.2 Play vs bot

1. Choose strength (Beginner / Casual / Club / Strong).
2. **Play vs Bot** (human White) or **Bot as White** (human Black).
3. API `POST /games` with `mode: "bot"`, `playAs`, `botLevel`, `clientId`.
4. If the bot is White, `scheduleBotMove` runs after 700 ms.
5. Human clicks/drags a legal destination; client `POST /games/{id}/moves` with UCI.
6. Coach panel is available.

### 7.3 Online room

1. **Online Room** → creator becomes White; UI shows invite URL (`?game=<id>`).
2. Second player opens the link or pastes the id → `POST /games/{id}/join`.
3. Both clients open `GET /ws/games/{id}?clientId=…`.
4. Moves broadcast as full JSON state. Coach is **off**.
5. If both seats are registered user ids, ELO updates when the game ends.

### 7.4 Hot seat

`POST /games` with `mode: "local"`. `yourColor` is `"both"`. Either side may move from that client. Coach is on.

### 7.5 Friend match

1. Sign in, add a friend, send a challenge.
2. Server creates an in-memory online game and a `friend_challenges` row.
3. Opponent accepts → seated as Black; both can enter the game from Friends.

---

## 8. Game modes

| Mode | Start | Seats | Coach | Rated ELO |
|------|-------|-------|-------|-----------|
| `local` | Hot Seat | One client, both colors | Yes | No |
| `bot` | Play vs Bot / Bot as White | Human + `"bot"` | Yes | No |
| `online` | Online Room or friend challenge | White (creator) + Black (joiner) | No | Yes, if both seats are real user ids |

### 8.1 Who may move (`gameSession.canMove`)

- **local:** always (if the game is not over and the bot is not “thinking”).
- **bot:** only the human’s color, and only when it is that color’s turn.
- **online:** both seats must be filled; only the player whose color matches the turn.

Joining an already-full online room returns color `"spectator"` (state is still broadcast).

### 8.2 Bot seating

- Default / `playAs: "white"` → human White, bot Black.
- `playAs: "black"` → bot White (moves first after delay), human Black.
- Bot and local seats use the browser **clientId**.
- Online seats prefer the **JWT user id** when `Authorization` is present.

---

## 9. Identity, seats, and tabs

ChessArena separates **browser identity** from **account identity**.

### 9.1 Client ids (`web/src/lib/clientId.ts`)

| Helper | Storage | Use |
|--------|---------|-----|
| `getHostClientId()` | `localStorage` `chessarena-player-id` | Creating rooms (you are White) |
| `getTabClientId()` | `sessionStorage` `chessarena-tab-id` | Joining as a second player in another tab |
| `setActiveClientForGame` | `sessionStorage` per game | Keep the same seat across refresh |
| `markGameHostedInTab` | session list | Creator reopening `?game=` stays White |

### 9.2 Auth tokens (`web/src/lib/api.ts`)

- Tokens are **not** shared via a global `localStorage` key (that would log every tab in as the same user).
- Each tab has `sessionStorage` `chessarena-tab-auth-id` and a token key `chessarena-auth-token:<tabId>`.
- An in-memory token plus a BroadcastChannel (`chessarena-tab-auth`) isolate duplicate Chrome tabs.
- Protected requests send `Authorization: Bearer <token>`.

### 9.3 Server player id

`playerIDForGame(r, fallback)`:

1. If JWT is valid → use `userId` from claims.
2. Else use the client’s `clientId` / query fallback.

That is how two logged-in users in different tabs become White and Black instead of colliding on one browser player id.

---

## 10. Chess engine

Package: `internal/chess`. This is a **from-scratch** rules engine, not a UCI wrapper around Stockfish.

### 10.1 Representation

- **Square:** `A1 = 0` … `H8 = 63` (file + rank×8).
- **Position:** 64-square array, side to move, castle rights, en passant square, half-move clock, full-move number.
- **Game:** slice of positions + moves + repetition keys + outcome + termination.
- **Move:** from/to, promotion, castle type, en passant flag, capture flag.

Clients may submit **UCI** (`e2e4`, `e7e8q`) or **SAN**. The API rejects sending both in one request.

### 10.2 Legal generation

`Position.legalMoves()` generates pseudo-legal moves then filters those that leave the king in check. Specials:

- Kingside / queenside castling through unattacked squares
- En passant
- Promotions (queen, rook, bishop, knight)

Illegal client moves fail `Game.ApplyUCIMove` / `ApplySANMove` and return 400.

### 10.3 Endings (`Game.updateTerminal` and `draw.go`)

| Termination | How it triggers |
|-------------|-----------------|
| `checkmate` | No legal moves and side to move is in check |
| `stalemate` | No legal moves and not in check |
| `resignation` | `Resign(color)` |
| `draw_offer` | Opponent accepts a draw offer |
| `threefold_repetition` | Player **claims** when repetition count ≥ 3 |
| `fivefold_repetition` | Automatic when count ≥ 5 |
| `fifty_move_rule` | Player **claims** when half-move clock ≥ 100 |
| `seventy_five_move_rule` | Automatic when half-move ≥ 150 |
| `insufficient_material` | Automatic: K vs K, K+N vs K, K+B vs K, opposite same-color bishops |

Claimable (non-automatic) draws are listed on game state as `claimableDraws`.

### 10.4 History for the UI

Every ply keeps a FEN. The API returns `history` (SAN+UCI), `positionFens`, and `ply`. The client can scrub `viewPly` without changing the live game.

### 10.5 Perft

`Perft(pos, depth)` exists for move-generator correctness tests (`perft_test.go`).

---

## 11. Bot opponents

Levels live in `internal/chess/bot_level.go`. Search is **negamax** with material evaluation and optional piece-square tables (PST).

| Level | Approx. ELO | Depth | Blunder chance | PST | Tie-break |
|-------|-------------|-------|----------------|-----|-----------|
| `beginner` | 400 | 1 | 25% | No | Random among ties |
| `casual` (default) | 800 | 2 | 8% | No | Random among ties |
| `club` | 1200 | 3 | 5% | Yes | Random among ties |
| `strong` | 1600 | 4 | 0% | Yes | Deterministic |

Material values: pawn 100, knight 320, bishop 330, rook 500, queen 900, king 20000.

### 11.1 Scheduling (`cmd/server/bot_scheduler.go`)

1. After create or a human move, if it is the bot’s turn, `scheduleBotMove`.
2. `botThinking = true` is broadcast so the UI can disable input.
3. Goroutine sleeps **700 ms**, then `ChooseBotMove` + `ApplyMove`.
4. `botGen` increments on cancel (human move / resign) so a stale goroutine does not play.

Coach’s `BestMove` uses strong settings (depth 3, no blunders) regardless of the opponent level.

---

## 12. In-game coach

Handlers: `cmd/server/coach_handlers.go`. Logic: `internal/chess/coach.go`.

**Allowed only when `session.mode` is `bot` or `local`.** Online returns 403.

| Action | Endpoint | Behavior |
|--------|----------|----------|
| Hint | `POST /games/{id}/coach/hint` | Depth-3 best move, SAN, sentence (check / capture / promote / improve) |
| Review last | `POST /games/{id}/coach/analyze` `{ type: "last_move" }` | Compare played UCI to engine; labels below |
| Threats | same, `{ type: "threats" }` | Check warning, or eval-based attack/defense/opening advice |

**Last-move labels** (centipawn-ish score difference vs best):

| Label | Condition |
|-------|-----------|
| `excellent` | Played move equals engine best |
| `good` | Diff ≤ 30 |
| `inaccuracy` | Diff ≤ 120 |
| `blunder` | Larger diff |

UI: `CoachPanel` — Hint, Review last move, Position advice.

---

## 13. Auth, friends, challenges, and ELO

### 13.1 Auth (`internal/auth`, `auth_handlers.go`)

- Register: username (unique, case-insensitive, max 32), password (bcrypt), optional display name.
- Login: username + password → JWT.
- JWT HS256, expiry **30 days**, secret `JWT_SECRET` (dev fallback is hardcoded — must be set in production).
- If SQLite fails to open, the API still serves games but account routes return 503.

### 13.2 Profile and search

- `GET` / `PATCH /users/me` — display name, avatar URL.
- `GET /users/{id}` — public profile.
- `GET /users/search?q=` — find users to friend.

### 13.3 Friends

Tables: `friend_requests`, `friendships`.

- `POST /friends/request` `{ toUserId }`
- `POST /friends/respond` `{ requestId, accept }`
- `GET /friends` → `{ friends, requests, challenges }`

Lobby polls friends every **4 seconds** while logged in.

### 13.4 Challenges

- Challenger must already be friends with opponent.
- Server creates an **online** `gameSession` (challenger White) **and** a SQLite challenge row.
- Accept: opponent becomes `blackPlayer`, challenge status `accepted`.
- Decline: challenge status updated; in-memory game may still exist until process restart.

**Important:** the game itself is still in-memory. If the API restarts between challenge and accept, `game not found`.

### 13.5 ELO (`cmd/server/rating.go`)

- New users: **1200**. Floor: **100**.
- Formula: classic expected score \(1 / (1 + 10^{(R_b-R_a)/400})\), **K = 32**.
- Applied once (`ratingDone`) when an **online** game ends and both `whitePlayer` and `blackPlayer` resolve to real users (not `"bot"`, not anonymous client ids).
- Response includes `whiteEloDelta` / `blackEloDelta`.
- `GET /leaderboard` — top 50.

---

## 14. HTTP API

Base URL locally: `http://localhost:8080`.  
Dev frontend: `/api/...` (Vite rewrite strips `/api`).  
Production: `{VITE_API_BASE}/...`.

### 14.1 Service

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/` | `{ service, status, health }` |
| `GET` | `/health` | `{ "status": "ok" }` — Render health check and SPA wake gate |

### 14.2 Auth and users

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/auth/register` | No — body `{ username, password, displayName? }` |
| `POST` | `/auth/login` | No — `{ username, password }` |
| `GET` | `/users/me` | Yes |
| `PATCH` | `/users/me` | Yes — `{ displayName, avatarUrl }` |
| `GET` | `/users/search?q=` | Yes |
| `GET` | `/users/{id}` | No |
| `GET` | `/leaderboard` | No |

Auth success body: `{ token, user }`.

### 14.3 Friends

| Method | Path | Body |
|--------|------|------|
| `POST` | `/friends/request` | `{ toUserId }` |
| `POST` | `/friends/respond` | `{ requestId, accept }` |
| `GET` | `/friends` | — |
| `POST` | `/friends/challenge` | `{ opponentId }` |
| `POST` | `/friends/challenge/{id}/accept` | — |
| `POST` | `/friends/challenge/{id}/decline` | — |

### 14.4 Games

| Method | Path | Body / query |
|--------|------|----------------|
| `POST` | `/games` | `{ mode, playAs?, clientId, botLevel? }` → **201** |
| `GET` | `/games/{id}` | `?clientId=` |
| `POST` | `/games/{id}/join` | `{ clientId }` |
| `POST` | `/games/{id}/moves` | `{ uci }` **or** `{ san }`, plus `clientId` |
| `GET` | `/games/{id}/moves` | Legal moves `{ uci, san }[]` |
| `POST` | `/games/{id}/resign` | `{ clientId, color? }` |
| `POST` | `/games/{id}/draw` | `{ type, clientId, color? }` — `draw_offer`, `threefold_repetition`, `fifty_move_rule` |
| `POST` | `/games/{id}/draw/respond` | `{ clientId, accept, color? }` |
| `POST` | `/games/{id}/coach/hint` | Bot/local |
| `POST` | `/games/{id}/coach/analyze` | `{ type: "last_move" \| "threats" }` |

**Create body example**

```json
{
  "mode": "bot",
  "playAs": "white",
  "clientId": "browser-host-id",
  "botLevel": "casual"
}
```

- `mode`: `local` | `online` | `bot` (empty → `local`)
- `botLevel`: `beginner` | `casual` | `club` | `strong`
- Game ids are random **8-character** `[a-z0-9]` strings.

### 14.5 Game state JSON

Returned by create/get/join/move/resign/draw and pushed on WebSocket:

| Field | Meaning |
|-------|---------|
| `id` | Room id |
| `fen` | Current FEN |
| `turn` | `white` / `black` |
| `over` | Game finished |
| `outcome` | `*` / `1-0` / `0-1` / `1/2-1/2` |
| `termination` | How it ended |
| `inCheck` | Side to move in check |
| `halfMoves` / `fullMoves` | 50-move clock / full-move number |
| `history` | `{ san, uci }[]` |
| `positionFens` | FEN at every ply including start |
| `ply` | Half-move count |
| `mode` | `local` / `bot` / `online` |
| `yourColor` | `white` / `black` / `both` (local) |
| `whitePlayer` / `blackPlayer` | User id, client id, or `"bot"` |
| `waitingFor` | Online: missing seat `white` or `black` |
| `drawOfferBy` | `white` / `black` if an offer is pending |
| `claimableDraws` | e.g. `threefold_repetition`, `fifty_move_rule` |
| `botThinking` / `botLevel` / `botElo` | Bot games |
| `whiteEloDelta` / `blackEloDelta` | After rated finish |

---

## 15. WebSocket protocol

```
GET /ws/games/{id}?clientId=<id>
```

- Origin check is **open** (`CheckOrigin` always true) so Vercel can connect to Render.
- On upgrade: current `encodeState` is sent as one JSON text frame.
- After moves, bot plays, joins, resigns, draws: **full state** is re-broadcast to every subscriber of that game id.
- Client does not send moves over WS; moves stay on REST. The socket is receive-only besides keep-alive reads.
- Dev URL: `ws://localhost:5173/api/ws/games/{id}?clientId=…` (proxied).
- Prod URL: `wss://<render-host>/ws/games/{id}?clientId=…`.

Frontend: `useGame` opens the socket when entering a game and applies incoming JSON to React state (sounds fire on FEN change).

---

## 16. Persistence

SQLite schema (`internal/store/store.go` `migrate()`):

**users**

- `id`, `username` (unique, `COLLATE NOCASE`), `password_hash`, `display_name`, `avatar_url`, `elo_rating` default 1200, `created_at`

**friend_requests**

- `id`, `from_id`, `to_id`, `status` (`pending` / …), unique `(from_id, to_id)`

**friendships**

- `user_a`, `user_b`, primary key pair

**friend_challenges**

- `id`, `challenger_id`, `opponent_id`, `game_id`, `status`, `created_at`

Default path: `data/chessarena.db` (created automatically).  
`render.yaml` mounts a disk at `/var/data` and sets `DATABASE_PATH=/var/data/chessarena.db`. On **free Render without a paid disk**, operators typically set `DATABASE_PATH=./data/chessarena.db` instead; that file **does not survive** instance replacement.

**Not persisted:** live games, move lists, WebSocket subscribers.

---

## 17. Frontend architecture

### 17.1 Boot (`web/src/main.tsx`)

`ThemeProvider` → `AuthProvider` → `App`. No React Router.

### 17.2 App screens (`App.tsx`)

Until `apiReady`, only `BackendWakeScreen` renders (tour does not run).

When ready:

- **Lobby:** brand, theme picker, play cards, join, server status; or Auth / Profile / Friends / Leaderboard subviews
- **Game:** 3D or 2D board, sidebar, mobile bar, overlays, tour overlay

Invite: if the URL has `?game=`, `useGame` joins/loads that room.

### 17.3 Hooks

| Hook | Responsibility |
|------|----------------|
| `useGame` | Create/join/load, moves, resign, draws, WS, history ply, invite URL, health check wrapper |
| `useAuth` | Register/login/logout/profile, current user |
| `useFriends` / `useCoach` (`useSocial.ts`) | Friends graph and coach REST |
| `useTheme` | Theme id, persist `chessarena-theme` (tour can set `persist: false` while cycling) |

### 17.4 Move input

Legal destinations come from `GET /games/{id}/moves`. The 3D board distinguishes **camera drag** vs **click-to-move** so orbiting does not accidentally submit. UCI is built in `lib/fen.ts` (`buildUCI`).

History scrubbing uses `positionFens[viewPly]`. Moves are blocked unless `atLivePosition` and `canPlayerMove`.

---

## 18. 3D room and 2D board

### 18.1 3D (`ChessBoard3D.tsx`)

- R3F `Canvas` with fog, lighting, `RoomBackdrop`, `TileBoard`.
- Pieces are **visual objects** reconciled against FEN: captures animate toward Valhalla slots; knights use a hop.
- Highlights: selected square, legal targets, last move, king in check (pulsing).
- Camera: `BoardCameraControls` — free orbit + zoom, or presets (White, Black, overhead, etc.).
- Product tour can force auto-rotate and open the camera panel on phones (`tourAutoRotate`, `tourShowCamera`).
- Rooms always open in 3D (`useEffect` when `screen === 'game'`).

Layout (`lib/boardLayout.ts`): 8×8 cells of size 1, centered on origin; `a1` at negative X/Z.

Optional GLB meshes: `lib/models.ts`, `castleModel.ts`, `tileModels.ts` when `VITE_USE_GLB_PIECES=true`.

### 18.2 2D (`ChessBoard2D.tsx`)

Same `GameState` / FEN / legal-move pipeline on `react-chessboard`. Theme supplies `squareLight2d` / `squareDark2d`.

---

## 19. Themes, sounds, and Valhalla

### 19.1 Themes (`lib/themes.ts`)

| Id | Name |
|----|------|
| `sky` | Sky Classic |
| `midnight` | Midnight |
| `forest` | Forest |
| `royal` | Royal Purple |

Each theme sets sky/fog/ground, tile colors, piece colors and emissives, 2D squares, and lobby contrast helpers (`getLobbyUiColors`, `getRoomAtmosphere`). Stored in `localStorage` as `chessarena-theme`.

### 19.2 Sounds (`lib/chessSounds.ts`)

No audio files. Oscillators + noise buffers:

- Move: short noise + triangle
- Capture: noisier + lower square/saw
- Game end: two sine tones

### 19.3 Valhalla (`lib/valhalla.ts`, `ValhallaPlatforms.tsx`)

White captures sit on a platform at **x ≈ −10.2**; black at **x ≈ +10.2**. Slots fill in a 4-column grid. Label: `VALHALLA`.

---

## 20. Product tour and neural TTS

The tour is a first-run **guided walkthrough of the 3D room and every lobby control**, not a chess-rules lesson.

### 20.1 Step model (`lib/tutorial.ts`)

Storage flag: `localStorage` `chessarena-tutorial-v3`.

Each step may include:

- `target` — `[data-tour="…"]` spotlight
- `screen` — `lobby` / `game` / `any`
- `enter` — actions: start a **demo bot game**, switch 2D/3D, orbit, play canned moves, open sidebar, cycle themes, return to lobby
- `autoAdvanceMs` — fallback timer (voice usually advances first)
- `mobileOnly` / `desktopOnly`
- `dim` / `hideSpotlight` for the 3D orbit intro

**Game steps (order):** room-3d → camera → board-2d → view-toggle → mobile-bar (narrow) → sidebar-game, history, coach, invite, actions, moves, leave.

**Lobby steps:** brand → theme → nav → play → play-bot → play-bot-black → play-online → play-local → bot-level → join → server → lobby-hero → lobby-features → done.

### 20.2 Voice (`ProductTour.tsx`, `lib/tourVoice.ts`, `lib/tourNarration.json`)

- One MP3 per step id: `/tour/voice/<step-id>.mp3`
- Scripts are spoken English in `tourNarration.json`
- Generator: `web/scripts/generate-tour-voice.py` using **edge-tts** voice `en-US-AndrewMultilingualNeural` at rate `-10%`
- Regenerate: `npm --prefix web run voice:tour`
- Mute persisted as `chessarena-tour-voice-muted`
- Browsers block autoplay: a **Start tour** control must run first so `audio.play()` is allowed
- Auto-advance waits until the clip **actually ended** (elapsed-time gate vs leftover `ended` from the previous clip) plus a short delay — this avoids skipping Invite / Themes

### 20.3 Demo game during the tour

`startDemoGame` creates a beginner bot game if none is active. `playDemoMoves` submits a short scripted line so the orbit scene is alive. Failures surface as tour load errors rather than a silent hang. Tour input is locked (`canMove && !tourActive`).

---

## 21. Backend wake / loading screen

Render **free** web services sleep after idle (~15 minutes) and take on the order of **one minute** to boot.

**Keep-alive was removed** (GitHub Actions ping + in-process self-ping) so free instance hours are not consumed 24/7.

Instead:

1. `App` starts with `apiReady = false`.
2. `checkServerHealth` (`web/src/lib/api.ts`) tries `GET /health` then `GET /games` (405 or OK counts as “up”), default **20s timeout × 6 attempts** from the wake screen.
3. `BackendWakeScreen` shows title, status text, animated bar, elapsed seconds, then **Retry** on failure.
4. If `VITE_API_BASE` is empty in production, the screen explains that the env var is missing.
5. Product tour and lobby **do not mount** until health succeeds.
6. Lobby no longer pings `/health` every 5 minutes (that was another keep-warm).

Health helper also powers lobby “Retry connection” if the API later drops.

---

## 22. Environment variables

### 22.1 Go API

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8080` | Listen port (Render injects this) |
| `DATABASE_PATH` | `data/chessarena.db` | SQLite file |
| `JWT_SECRET` | Dev fallback string | **Required in production** |

### 22.2 Vite frontend

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE` | empty → `/api` in **dev** only | Absolute API origin in production, e.g. `https://YOUR-SERVICE.onrender.com` — **no** `/api`, **no** trailing slash |
| `VITE_USE_GLB_PIECES` | unset / false | `true` loads GLB piece models |

Vercel: **Settings → Environments → Production** (not only General), then **Redeploy** so the baked-in `import.meta.env` updates. Example file: `web/.env.example`.

---

## 23. Local development

**Requirements:** Go 1.22+ (module declares 1.25), Node.js 18+ / current LTS, npm.

### 23.1 API

```bash
go run ./cmd/server
```

Listens on `http://localhost:8080`. SQLite is created under `data/` as needed.

```bash
curl http://localhost:8080/health
```

### 23.2 Frontend

```bash
cd web
npm install
npm run dev
```

Open the Vite URL (typically `http://localhost:5173`). Proxy: `/api` → `:8080` including WS.

Do **not** set `VITE_API_BASE` for local Vite unless you intentionally want to hit a remote API.

### 23.3 Production-like frontend build

```bash
cd web
# optional: copy .env.example → .env.production.local with a real API URL
npm run build
npm run preview
```

### 23.4 Scripts

| Command | What |
|---------|------|
| `npm --prefix web run dev` | Vite dev server |
| `npm --prefix web run build` | `tsc -b && vite build` |
| `npm --prefix web run lint` | oxlint |
| `npm --prefix web run voice:tour` | Regenerate tour MP3s |
| `go test ./internal/chess/...` | Engine tests |

---

## 24. Testing

Primary automated coverage is the **chess engine**:

- Move generation and illegal moves
- Castling, en passant, promotion
- Checks, checkmate, stalemate
- Draws (threefold, fifty-move, material)
- Bot move selection
- Perft
- Extra coverage files for edge cases

There is no large frontend unit-test suite; production confidence is `npm run build` (TypeScript) + `oxlint`.

---

## 25. Deployment

### 25.1 API on Render

`render.yaml` blueprint:

- Type: web, runtime Go, plan **free**
- Build: `go build -o server ./cmd/server`
- Start: `./server`
- Health: `GET /health`
- Env: `GO_VERSION`, `DATABASE_PATH=/var/data/chessarena.db`, generated `JWT_SECRET`
- Optional 1 GB disk at `/var/data`

**Practical notes for a new free account**

- Root directory of the service: **repository root** (not `web/`).
- Paid disk is optional; without it use `DATABASE_PATH=./data/chessarena.db` and accept data loss on recycle.
- After code changes that affect the binary, **Manual Deploy** the service.
- First request after sleep: ~1 minute. The SPA wake screen covers this.

### 25.2 Frontend on Vercel

- Root / app directory: `web/`
- Build: `npm run build` → `dist/`
- `vercel.json` rewrites all paths to `index.html` (SPA)
- Set `VITE_API_BASE` to the **current** Render origin
- Redeploy **Production** after changing env vars (Vite inlines them at build time)

If `VITE_API_BASE` still points at a **suspended** old service, the wake screen will spin then fail — update the URL, then redeploy.

---

## 26. Security notes

- Passwords: bcrypt (`DefaultCost`).
- JWT: HS256; production **must** set `JWT_SECRET`.
- Game moves are authorized by seat id (`canMove`), not by “whoever posts UCI”.
- Coach is blocked in online mode to reduce engine-assisted cheating.
- CORS is fully open (`*`) because the SPA and API are on different origins (Vercel vs Render).
- WebSocket origins are not restricted.
- Game ids are short random strings (8 chars) — treat invite links as **capability URLs**.
- Anonymous online games are not rated; impersonating a clientId can steal an anonymous seat if the id leaks.
- SQLite file on disk must not be world-readable in a shared host.

This is a hobby/production-lite deployment, not a hardened multi-tenant chess server (no rate limits, no move signing, no anti-cheat beyond coach-off).

---

## 27. Known limitations

1. **Games are ephemeral.** API restart wipes rooms, including pending friend-challenge games.
2. **No chess clocks** in the current tree (no timed time-controls on game state).
3. **Coach uses the same small engine** as the bot (depth ~3), not a master-level analyzer.
4. **Bot ELO numbers are approximate labels**, not calibrated ratings.
5. **Insufficient material** detection is simplified (K+N vs K+N is not always a draw in FIDE; this engine treats some KN/KB cases as draw).
6. **Legal-moves GET** currently returns moves for the **live** position even if a `ply` query is parsed (the ply value is unused). History view on the client uses FEN snapshots instead.
7. **Render free sleep** + **750 hour/month cap** — keep-alive is intentionally off.
8. **SQLite on free Render without disk** is wiped when the instance is replaced.
9. **No game PGN download / no server-side replay archive.**
10. **Spectator** join is allowed but the UI is still a seated-player experience.
11. **GLB pieces** are optional and off by default.

---

## 28. Operational playbook

### “Site shows starting the chess server forever”

- Confirm Render service is **Live**, not suspended (free hours exhausted).
- Confirm Vercel `VITE_API_BASE` is the **new** `https://….onrender.com` with no path.
- Redeploy Vercel production after changing the env var.
- Hit `https://….onrender.com/health` in a browser; first call may take a minute.

### “Tour starts then dies / demo game fails”

- API was not up; wake gate should prevent this after the loading-screen change. If it still happens, health succeeded but `POST /games` failed (check Render logs).

### “Two tabs are the same account”

- Auth is tab-isolated; duplicate-tab handling rotates identity. Hard-refresh both tabs and sign in separately.

### “ELO did not change”

- Mode must be `online`, game must be over, **both** seats must be registered user ids (not guest client ids).

### “Accounts unavailable”

- SQLite failed to open (`DATABASE_PATH` unwritable). Games still work; register/login return 503.

### Regenerating tour voice

```bash
cd web
pip install edge-tts   # if needed
npm run voice:tour
```

Commit new files under `web/public/tour/voice/`.

---

## 29. Glossary

| Term | Meaning |
|------|---------|
| **UCI** | Long algebraic move, e.g. `e2e4`, `a7a8q` |
| **SAN** | Standard algebraic, e.g. `Nf3`, `O-O` |
| **FEN** | Forsyth–Edwards Notation for a position |
| **Ply** | One half-move (White or Black) |
| **Client id** | Browser-generated seat id for guests / bot games |
| **Wake / cold start** | Render spinning up a sleeping free instance |
| **Valhalla** | 3D platforms that hold captured pieces |
| **Tour** | In-app product walkthrough with TTS |
| **Rated** | Online game between two accounts; updates ELO |

---

## Document control

| Item | Value |
|------|--------|
| Name | `final doc.md` |
| Complements | `README.md` (shorter), `web/README.md` (frontend pointer) |
| Source of truth for behavior | This file plus the Go/TS sources it names |

ChessArena is a 3D-first chess playground: a real rules engine, live rooms, bots, social ratings, a guided tour, and an honest loading path when the free API is still booting.
