/**
 * Pentago plugin registration + type exports
 */
export type { PentagoState, PentagoAction, Marble } from './game';

import { registry } from '../index';
import { DIFFICULTY_PRESETS, Agent } from '@gameagent/ai-core';
import { PentagoGame } from './game';
import { PentagoBrain } from './brain';

registry.registerGame({
  id: 'pentago',
  name: 'Pentago',
  description: '6×6 marble board with rotating quadrants. Five in a row wins.',
  maxPlayers: 2,
  factory: (config) => new PentagoGame(config),
});

registry.registerAI({
  id: 'pentago-heuristic',
  name: 'Pentago AI',
  supportedGames: ['pentago'],
  factory: (playerId, difficulty = 'medium') =>
    new Agent(
      new PentagoBrain(difficulty),
      DIFFICULTY_PRESETS[difficulty],
      playerId,
    ),
});
