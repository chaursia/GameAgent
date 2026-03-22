<div align="center">

<h1>🎮 GameAgent</h1>

<p><strong>A self-hosted platform to play classic 2D games against AI agents — open, hackable, production-ready.</strong></p>

<p>
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Phaser-3-8A2BE2?logo=phaser&logoColor=white" />
  <img src="https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

</div>

---

## What is GameAgent?

GameAgent is an open-source platform where you can play 2D browser games against real AI agents — not just scripted behaviour.  
The architecture is designed from the ground up for extensibility: drop in a new game, swap the AI brain, change the difficulty, or tune individual personality traits — all without touching the core engine.

**Live games & features:**
- 🏓 **Pong** — trajectory-predicting Heuristic AI, client-side prediction for silky-smooth input
- ❌ **Tic-Tac-Toe** — Minimax AI with alpha-beta pruning (perfect at Expert, intentional errors at Easy)
- ♟ **Quarto** — 16 unique pieces, 4 binary attributes, heuristic AI that avoids giving dangerous pieces
- ⚪ **Pentago** — 6×6 marble board with rotating quadrants, five-in-a-row wins
- 🎚️ 4 difficulty levels (Easy / Medium / Hard / Expert)
- 🧠 AI Personality System — tune reaction time, mistake rate, aggression, adaptability
- ⚡ Server-authoritative 60fps game loop (WebSocket)
- 📼 Automatic replay recording per session
- 🔌 Plugin-based architecture — add any game or AI in minutes
- 🌐 Premium React + Phaser frontend with Aceternity UI

---

## Architecture

GameAgent is a **TypeScript monorepo** managed with npm workspaces and Turborepo.

```
/gameagent
├── apps/
│   ├── web/          ← React 18 + Vite + Phaser 3 frontend
│   └── server/       ← Fastify 5 + WebSocket backend
├── packages/
│   ├── game-core/    ← GameEngine interface, GameState, Action types
│   ├── ai-core/      ← Brain, Personality, Agent, DifficultyPresets
│   └── plugins/      ← PluginRegistry + all game engines & AI brains
```

### Layer diagram

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend                      │
│  Phaser Scene  ←→  WebSocket  ←→  React Components  │
└────────────────────────┬────────────────────────────┘
                         │  ws://  +  http://
┌────────────────────────▼────────────────────────────┐
│                  Fastify Server                      │
│  GameLoopManager (60fps ticker)                      │
│  SessionManager  (in-memory store + replay)          │
│  PluginRegistry  (dynamic game + AI loading)         │
└──────┬──────────────────────────────┬───────────────┘
       │                              │
┌──────▼──────┐              ┌────────▼────────┐
│  GameEngine │              │     Agent        │
│  (PongGame, │              │  Brain + Persona │
│   TicTacToe,│              │  act(state)      │
│   Quarto,   │              │  setPersonality()│
│   Pentago)  │              └─────────────────┘
└─────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install

```bash
git clone https://github.com/chaursia/GameAgent.git
cd GameAgent
npm install
```

### Start the backend

```bash
cd apps/server
npx tsx --conditions=source src/index.ts
# Server: http://localhost:3001
```

### Start the frontend

```bash
cd apps/web
npx vite --port 5173
# Frontend: http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173), scroll to **Play vs AI**, choose a game and difficulty, and click **▶ Play**.

---

## AI System

### The Brain + Personality model

Every AI agent is composed of two independent layers:

| Layer | Responsibility |
|-------|---------------|
| **Brain** | Pure decision logic — evaluates `GameState`, returns an `Action`. Deterministic. |
| **Personality** | Human-likeness modifiers — adds reaction delay, random mistakes, aggression bias. |

The `Agent` class wraps both layers. You can swap either without touching the other.

```typescript
const brain = new PongHeuristicBrain(0.9);
const personality: Personality = {
  reactionTime:  0.2,
  mistakeRate:   0.06,
  aggression:    0.7,
  adaptability:  0.7,
};
const agent = new Agent(brain, personality, 'p2');
```

### Difficulty presets

| Level  | Brain Accuracy | Mistake Rate | Reaction | Aggression |
|--------|--------------|-------------|---------|-----------|
| Easy   | 45%          | 35%         | Slow    | 30%       |
| Medium | 72%          | 15%         | Average | 50%       |
| Hard   | 90%          | 6%          | Fast    | 70%       |
| Expert | 100%         | 1%          | Instant | 90%       |

---

## Plugin System

### Adding a new game

1. Implement `GameEngine` from `@gameagent/game-core`:

```typescript
export class MyGame extends GameEngine {
  getState(): GameState { ... }
  applyAction(a: Action): void { ... }
  tick(dt?: number): void { ... }
  isGameOver(): boolean { ... }
  getTickRate(): number { return 60; }
}
```

2. Register it:

```typescript
registry.registerGame({
  id: 'my-game',
  name: 'My Game',
  description: '...',
  maxPlayers: 2,
  factory: (config) => new MyGame(config),
});
```

### Adding a new AI brain

1. Extend `Brain` from `@gameagent/ai-core`:

```typescript
export class MyBrain extends Brain {
  readonly brainId = 'my-brain';
  decide(state: GameState, playerId: PlayerId): Action { ... }
}
```

2. Register it:

```typescript
registry.registerAI({
  id: 'my-brain',
  name: 'My Brain',
  supportedGames: ['my-game'],
  factory: (playerId, difficulty = 'medium') =>
    new Agent(new MyBrain(), DIFFICULTY_PRESETS[difficulty], playerId),
});
```

---

## Server API Reference

<details>
<summary><strong>REST Endpoints</strong></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check + version |
| `POST` | `/game/start` | Create a new game session |
| `POST` | `/game/action` | Submit a human action (rate-limited) |
| `GET` | `/game/state?sessionId=` | Get current game state |
| `GET` | `/game/replay?sessionId=` | Get full replay for a session |
| `GET` | `/game/list` | List available games + AIs |
| `GET` | `/game/sessions` | Admin: list all active sessions |
| `DELETE` | `/game/session?sessionId=` | Admin: force-end a session |

</details>

<details>
<summary><strong>POST /game/start — Request &amp; Response</strong></summary>

**Request:**
```json
{
  "gameId": "tictactoe",
  "aiId": "tictactoe-minimax",
  "difficulty": "medium",
  "personality": {
    "reactionTime": 0.3,
    "mistakeRate":  0.10,
    "aggression":   0.6,
    "adaptability": 0.5
  }
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "wsUrl": "/game/ws/uuid",
  "initialState": { ... }
}
```

Supported `gameId` values: `pong` · `tictactoe` · `quarto` · `pentago`

</details>

<details>
<summary><strong>WebSocket /game/ws/:sessionId</strong></summary>

**Client → Server:**
```json
{ "type": "game:action", "playerId": "p1", "payload": { "cell": 4 } }
```

**Server → Client:**
```json
{ "type": "game:tick",  "tick": 42, "state": { ... } }
{ "type": "game:over",  "winner": "p1", "scores": { "p1": 1, "p2": 0 } }
```

The server drives the game loop independently at 60fps. Client input is applied immediately; the AI + physics tick autonomously.

</details>

---

## Documentation

<details>
<summary><strong>🧩 Package Overview</strong></summary>

| Package | Purpose |
|---------|---------|
| `@gameagent/game-core` | `GameEngine`, `GameState`, `Action`, `PlayerId`, `GameEvent` |
| `@gameagent/ai-core` | `Brain`, `Personality`, `Agent`, `DifficultyPresets`, `DIFFICULTY_PRESETS` |
| `@gameagent/plugins` | `PluginRegistry`, all game engines & AI brains |
| `@gameagent/web` | React + Phaser frontend, Aceternity UI components |
| `@gameagent/server` | Fastify server, session management, game loop, WebSocket |

</details>

<details>
<summary><strong>🎮 Game Reference</strong></summary>

### Pong
- **AI:** `PongHeuristicBrain` — ray-traces ball trajectory to paddle plane, blends with noise
- **Input:** Arrow keys or `W`/`S` — client-side prediction for zero-lag feel
- **Config:** `PONG_WIDTH = 800`, `PONG_HEIGHT = 600`, 60fps tick

### Tic-Tac-Toe
- **AI:** `TicTacToeBrain` — Minimax with alpha-beta pruning
  - Easy → depth 1, 50% random noise | Medium → depth 3, 10% | Hard → depth 5 | Expert → depth 9 (perfect)
- **Board:** 3×3, row-major indices 0–8
- **State:** `TicTacToeState { board, currentPlayer, winLine }`
- **Action:** `{ cell: number }`

### Quarto
- **AI:** `QuartoBrain` — Heuristic: win-immediately → avoid giving dangerous pieces → prefer centre cells
- **Board:** 4×4, 16 unique pieces (4 binary attributes encoded as bitmasks 0–15)
- **Turns:** Two-phase — `place` (put `pieceToPlace`) → `give` (hand next piece to opponent)
- **State:** `QuartoState { board, phase, pieceToPlace, remaining, currentPlayer }`
- **Win:** 4-in-a-row sharing ≥1 attribute (checked via bitwise AND on all 10 lines)

### Pentago
- **AI:** `PentagoBrain` — Heuristic + sampling: win → block → maximise max-run-length heuristic
- **Board:** 6×6, 4 rotatable 3×3 quadrants
- **Turns:** Place marble → rotate any quadrant CW or CCW
- **State:** `PentagoState { board, currentPlayer, scores, winLine }`
- **Action:** `{ cell: number, quadrant: 0|1|2|3, direction: 'cw'|'ccw' }`
- **Win:** 5-in-a-row after rotation; simultaneous wins → draw

</details>

<details>
<summary><strong>🔧 Development</strong></summary>

### Build all packages

```bash
npm run build        # Turborepo builds all packages in dependency order
```

### Type check

```bash
npx tsc -b packages/game-core packages/ai-core packages/plugins
npx tsc --noEmit     # in apps/web or apps/server
```

### Add a new game (checklist)

```
□  packages/plugins/src/{game}/game.ts   — GameEngine subclass
□  packages/plugins/src/{game}/brain.ts  — Brain subclass (extend Brain, add brainId, super())
□  packages/plugins/src/{game}/index.ts  — registry.registerGame() + registerAI() + type exports
□  packages/plugins/package.json         — add subpath export "./game-name"
□  apps/server/src/index.ts              — import '@gameagent/plugins/game-name'
□  apps/web/src/scenes/{Game}Scene.ts    — Phaser 3 scene (extends Phaser.Scene)
□  apps/web/src/components/GameCanvas.tsx — add entry to GAME_CFGS map
□  apps/web/src/App.tsx                  — add tab + card in Games section
```

</details>

<details>
<summary><strong>🌐 Frontend Architecture</strong></summary>

### Tech stack
- **Framework:** React 18 + Vite + TypeScript
- **Game rendering:** Phaser 3 (WebGL/Canvas)
- **UI:** Aceternity UI components (Aurora, CardSpotlight, TypewriterEffect, FloatingNav)
- **Styling:** Tailwind CSS v3

### Key components

| Component | File | Purpose |
|-----------|------|---------|
| `GameCanvas` | `components/GameCanvas.tsx` | Generic multi-game Phaser host, game selector |
| `PersonalitySliders` | `components/PersonalitySliders.tsx` | Fine-tune AI personality traits |
| `PongScene` | `scenes/PongScene.ts` | Phaser scene — client-side prediction |
| `TicTacToeScene` | `scenes/TicTacToeScene.ts` | Click-to-play 3×3 grid |
| `QuartoScene` | `scenes/QuartoScene.ts` | 4×4 board + piece tray |
| `PentagoScene` | `scenes/PentagoScene.ts` | 6×6 marbles + rotation buttons |

</details>

---

## Changelog

<details>
<summary><strong>Phase 8 — Board Games: Tic-Tac-Toe, Quarto, Pentago</strong> </summary>

### Added
- `TicTacToeGame` engine — 3×3 board, win detection, `clone()` + `getValidMoves()` for AI lookahead
- `QuartoGame` engine — 16 unique bitmask pieces, two-phase turns (place/give), bitwise win detection
- `PentagoGame` engine — 6×6 board, 4 rotatable quadrants, 5-in-a-row detection post-rotation
- `TicTacToeBrain` — Minimax + alpha-beta pruning, depth 1→9 by difficulty
- `QuartoBrain` — Heuristic: wins immediately, avoids giving dangerous pieces
- `PentagoBrain` — Heuristic + move sampling: win/block/maximise connectivity
- Plugin registrations for all three games (`packages/plugins/src/{game}/index.ts`)
- Subpath exports in `packages/plugins/package.json`
- Server auto-registers all three games on startup
- `TicTacToeScene.ts` — Click cells, indigo/rose X/O, golden win-line animation
- `QuartoScene.ts` — Interactive 4×4 board + piece tray, colour-coded by attribute
- `PentagoScene.ts` — 6×6 board with shaded quadrants, optimistic marble placement, rotation button grid
- `GameCanvas.tsx` refactored — now fully generic via `gameId` prop + `GAME_CFGS` config map
- `App.tsx` — 4-column game cards (all "Live ✓"), game selector tabs (🏓/❌/♟/⚪), difficulty only for Pong

</details>

<details>
<summary><strong>Phase 7 — End-to-End Verification &amp; Input Smoothness Fix</strong> </summary>

### Added
- Live end-to-end demo verified (server + frontend + WebSocket game loop)
- Pong paddle client-side prediction — instant response with no reconciliation fighting
- Input sending throttled and direction-change-driven (not interval-based)

### Fixed
- Paddle no longer returns to position on hold — server state now only authoritative for opponent + ball
- GitHub links updated to `github.com/chaursia/GameAgent` across README, App.tsx, walkthrough

</details>

<details>
<summary><strong>Phase 6 — Frontend Polish &amp; Premium UI</strong> </summary>

### Added
- Aceternity UI component suite: `AuroraBackground`, `CardSpotlight`, `TypewriterEffect`, `FloatingNav`, `Meteors`, `ShimmerButton`
- `PersonalitySliders` component for fine-tuning AI traits in the UI
- Full-page premium dark design with glassmorphism, smooth animations, spotlight hover
- Hero section with animated typewriter and aurora background
- AI System section with difficulty cards and stat bars
- Architecture section with live code diagram
- WebSocket proxy configuration in `vite.config.ts`
- Footer with GitHub + neurodev.in links

</details>

<details>
<summary><strong>Phase 5 — Backend Hardening</strong> </summary>

### Added
- `GameLoopManager` — server-side 60fps tick loop, independent of client connection
- `SessionManager` — in-memory session store with per-session replay recording
- Rate limiting on `/game/action` (prevents client flooding)
- Admin endpoints: `GET /game/sessions`, `DELETE /game/session`
- CORS + request validation middleware
- Health check endpoint `GET /health` with version + uptime

</details>

<details>
<summary><strong>Phase 4 — AI System &amp; Difficulty Wiring</strong> </summary>

### Added
- `Agent` class — wraps `Brain` + `Personality`, applies reaction delay and mistake injection
- `DIFFICULTY_PRESETS` — four named presets (easy / medium / hard / expert)
- `PongHeuristicBrain` — trajectory ray-tracing with wall reflections, accuracy parameter
- Difficulty passed through `POST /game/start` → `Agent` constructor
- `personality` override object in start request

</details>

<details>
<summary><strong>Phase 3 — Pong Game Plugin</strong> </summary>

### Added
- `PongGame` engine — ball physics, paddle collision, scoring, 60fps tick
- `PongScene` — Phaser 3 WebGL renderer with WebSocket sync
- Plugin registration via `registry.registerGame()` + `registry.registerAI()`
- REST endpoint `POST /game/start` creates sessions and returns WebSocket URL
- WebSocket `/game/ws/:sessionId` — bidirectional game tick + action streaming

</details>

<details>
<summary><strong>Phase 2 — Core Packages</strong> </summary>

### Added
- `@gameagent/game-core` — `GameEngine` abstract class, `GameState`, `Action`, `PlayerId`, `GameEvent` interfaces
- `@gameagent/ai-core` — `Brain` abstract class, `Personality` interface, `Agent`, `DifficultyPresets`
- `@gameagent/plugins` — `PluginRegistry` with `registerGame()` + `registerAI()`
- Base TypeScript configs (`tsconfig.base.json`)

</details>

<details>
<summary><strong>Phase 1 — Monorepo Setup</strong> </summary>

### Added
- npm workspaces monorepo (`apps/`, `packages/`)
- Turborepo pipeline (`turbo.json`)
- Root `package.json` with workspace scripts
- `apps/web` — React 18 + Vite + TypeScript scaffolding
- `apps/server` — Fastify 5 + TypeScript scaffolding
- `.prettierrc`, `.gitignore`, `LICENSE` (MIT)

</details>

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Monorepo setup, workspace config |
| Phase 2 | ✅ Complete | Core packages (game-core, ai-core, plugins) |
| Phase 3 | ✅ Complete | Pong game plugin (engine + Phaser renderer) |
| Phase 4 | ✅ Complete | AI system + difficulty wiring |
| Phase 5 | ✅ Complete | Backend hardening (server-side loop, rate limiting, admin API) |
| Phase 6 | ✅ Complete | Frontend polish (Aceternity UI, personality sliders, WebSocket proxy) |
| Phase 7 | ✅ Complete | End-to-end verification + Pong input smoothness |
| Phase 8 | ✅ Complete | Tic-Tac-Toe, Quarto, Pentago — engines, AI brains, Phaser scenes |
| Phase 9 | 🔜 Planned | RL agent (PPO), training pipeline |
| Phase 10 | 🔜 Planned | Replay viewer, spectator mode |
| Phase 11 | 🔜 Planned | LLM integration for AI commentary |

---

## License

MIT — built for the open-source community.

---

<div align="center">
  <sub>Built with ❤️ — <a href="https://github.com/chaursia">github.com/chaursia</a> · <a href="https://neurodev.in">neurodev.in</a></sub>
</div>