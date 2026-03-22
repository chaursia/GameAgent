/**
 * Pong plugin entry point
 *
 * This file registers the Pong game and PongHeuristicBrain AI
 * with the global PluginRegistry singleton.
 *
 * Import this file once in the server entry point:
 *   import '@gameagent/plugins/pong';
 */

import { registry } from '../index';
import { PongGame, PONG_WIDTH, PONG_HEIGHT } from './PongGame';
import { PongHeuristicBrain } from './PongHeuristicBrain';
import { Agent, DIFFICULTY_PRESETS } from '@gameagent/ai-core';
import type { DifficultyLevel } from '@gameagent/ai-core';

// ── Game Plugin ────────────────────────────────────────────────────────────

registry.registerGame({
  id: 'pong',
  name: 'Pong',
  description: 'Classic paddle game with heuristic AI.',
  iconUrl: '/icons/pong.svg',
  maxPlayers: 2,
  factory: (config) =>
    new PongGame({
      ...config,
      settings: {
        width: PONG_WIDTH,
        height: PONG_HEIGHT,
        ...config.settings,
      },
    }),
});

// ── AI Plugin ──────────────────────────────────────────────────────────────

/** Map difficulty to an accuracy coefficient for the heuristic brain */
const ACCURACY_MAP: Record<DifficultyLevel, number> = {
  easy: 0.45,
  medium: 0.72,
  hard: 0.90,
  expert: 1.00,
};

registry.registerAI({
  id: 'pong-heuristic',
  name: 'Heuristic AI',
  supportedGames: ['pong'],
  factory: (playerId, difficulty: DifficultyLevel = 'medium') => {
    const brain = new PongHeuristicBrain(ACCURACY_MAP[difficulty]);
    const personality = { ...DIFFICULTY_PRESETS[difficulty] };
    return new Agent(brain, personality, playerId);
  },
});

export { ACCURACY_MAP };
