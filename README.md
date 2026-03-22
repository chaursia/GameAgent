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

**Live features:**
- 🏓 Pong with a trajectory-predicting Heuristic AI
- 🎚️ 4 difficulty levels (Easy / Medium / Hard / Expert)
- 🧠 AI Personality System — tune reaction time, mistake rate, aggression, adaptability
- ⚡ Server-authoritative 60fps game loop (WebSocket)
- 📼 Automatic replay recording per session
- 🔌 Plugin-based architecture for games and AI brains
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
│   └── plugins/      ← PluginRegistry + built-in games & AI
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
│  (PongGame) │              │  Brain + Persona │
│  tick()     │              │  act(state)      │
│  applyAction│              │  setPersonality()│
└─────────────┘              └─────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install

```bash
git clone https://github.com/yourusername/GameAgent.git
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

Open [http://localhost:5173](http://localhost:5173), scroll to **Play**, choose your difficulty, and click **▶ Play Pong**.

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
// Create a custom agent
const brain = new PongHeuristicBrain(0.9);      // 90% accuracy
const personality: Personality = {
  reactionTime:  0.2,   // fast
  mistakeRate:   0.06,  // rare mistakes
  aggression:    0.7,   // slightly aggressive
  adaptability:  0.7,   // learns opponent patterns
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

You can also fine-tune individual traits using the **Advanced Personality Settings** panel in the UI.

### PongHeuristicBrain

The built-in Pong AI predicts ball trajectory by ray-tracing the ball's path from its current position to the paddle's x-plane, accounting for wall reflections. It blends the optimal target with a random noise component to produce humanlike imperfection.

---

## Server API Reference

### REST Endpoints

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

### POST /game/start

```json
{
  "gameId": "pong",
  "aiId": "pong-heuristic",
  "difficulty": "medium",
  "personality": {           // optional — overrides preset fields
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

### WebSocket /game/ws/:sessionId

**Client → Server:**
```json
{ "type": "game:action", "playerId": "p1", "payload": { "direction": "up" } }
```

**Server → Client:**
```json
{ "type": "game:tick",  "tick": 42, "state": { ... } }
{ "type": "game:over",  "winner": "p1", "scores": { "p1": 11, "p2": 7 } }
```

The server drives the game loop independently at 60fps. Client input is applied immediately; the AI + physics tick autonomously.

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

## Development

### Build all packages

```bash
npm run build        # Turborepo builds all packages in dependency order
```

### Type check

```bash
npx tsc -b packages/game-core packages/ai-core packages/plugins
npx tsc --noEmit     # in apps/web or apps/server
```

### Project structure

| Package | Purpose |
|---------|---------|
| `@gameagent/game-core` | `GameEngine`, `GameState`, `Action`, `PlayerId`, `GameEvent` |
| `@gameagent/ai-core` | `Brain`, `Personality`, `Agent`, `DifficultyPresets`, `DIFFICULTY_PRESETS` |
| `@gameagent/plugins` | `PluginRegistry`, `PongGame`, `PongHeuristicBrain` |
| `@gameagent/web` | React + Phaser frontend, Aceternity UI components |
| `@gameagent/server` | Fastify server, session management, game loop, WebSocket |

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Monorepo setup, workspace config |
| Phase 2 | ✅ Complete | Core packages (game-core, ai-core, plugins) |
| Phase 3 | ✅ Complete | Pong game plugin (engine + Phaser renderer) |
| Phase 4 | ✅ Complete | AI system + difficulty wiring |
| Phase 5 | ✅ Complete | Backend hardening (server-side loop, rate limiting, admin API) |
| Phase 6 | ✅ Complete | Frontend polish (personality sliders, WebSocket proxy) |
| Phase 7 | ✅ Complete | End-to-end verification |
| Phase 8 | 🔜 Planned | RL agent (PPO), training pipeline |
| Phase 9 | 🔜 Planned | Replay viewer, spectator mode |
| Phase 10 | 🔜 Planned | LLM integration for AI commentary |

---

## License

MIT — built for the open-source community.

---

<div align="center">
  <sub>Built with ❤️ — <a href="https://neurodev.in">neurodev.in</a></sub>
</div>