# 🎮 GameAgent

> A self-hosted platform for playing 2D browser games against intelligent AI agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-6c63ff.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)

---

## ✨ Features

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Pong game + Heuristic AI | 🔨 In progress |
| 1 | AI Personality system | ✅ Core ready |
| 2 | AI vs AI mode + Replay | 🗓 Planned |
| 3 | RL Training (Python service) | 🗓 Planned |
| 4 | LLM integration | 🗓 Planned |

---

## 🏗 Architecture

```
/gameagent
├── apps/
│   ├── web/          → React + Vite + Phaser (port 5173)
│   └── server/       → Fastify + WebSocket  (port 3001)
└── packages/
    ├── game-core/    → GameEngine interface, GameState
    ├── ai-core/      → Brain, Personality, Agent
    └── plugins/      → PluginRegistry + built-in plugins
```

### AI System (Layered)

```
Agent
 ├── Brain        (decision logic – heuristic / RL / hybrid)
 └── Personality  (reactionTime, mistakeRate, aggression, adaptability)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Install

```bash
git clone https://github.com/your-org/gameagent.git
cd gameagent
npm install
```

### Development

```bash
# Start everything (frontend + backend) via Turborepo
npm run dev

# Or start individually:
cd apps/server && npx tsx src/index.ts   # http://localhost:3001
cd apps/web    && npx vite               # http://localhost:5173
```

### Build

```bash
npm run build
```

---

## 🔌 Plugin System

Every game and AI agent is a plugin loaded at runtime:

```typescript
// Register a game
registry.registerGame({
  id: 'pong',
  name: 'Pong',
  factory: (config) => new PongGame(config),
});

// Register an AI
registry.registerAI({
  id: 'pong-heuristic',
  supportedGames: ['pong'],
  factory: (playerId) => createAgentWithDifficulty(new PongHeuristicBrain(), 'medium', playerId),
});
```

---

## 🤖 AI Difficulty Presets

| Level  | Reaction | Mistakes | Aggression |
|--------|----------|----------|------------|
| Easy   | 85%      | 35%      | 30% |
| Medium | 50%      | 15%      | 50% |
| Hard   | 20%      | 6%       | 70% |
| Expert | 0%       | 1%       | 90% |

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/game/start` | Create a new session |
| POST | `/game/action` | Submit a human action |
| GET  | `/game/state` | Get current state |
| GET  | `/game/replay` | Get full replay |
| GET  | `/game/list` | List available games + AIs |
| WS   | `/game/ws/:sessionId` | Real-time game loop |
| GET  | `/health` | Health check |

---

## 📄 License

MIT © GameAgent Contributors