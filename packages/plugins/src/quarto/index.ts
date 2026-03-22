/**
 * Quarto plugin registration + type exports
 */
export type { QuartoState, QuartoAction, Piece } from './game';

import { registry } from '../index';
import { DIFFICULTY_PRESETS, Agent } from '@gameagent/ai-core';
import { QuartoGame } from './game';
import { QuartoBrain } from './brain';

registry.registerGame({
  id: 'quarto',
  name: 'Quarto',
  description: '4×4 board, 16 unique pieces. Get 4 in a row sharing any attribute.',
  maxPlayers: 2,
  factory: (config) => new QuartoGame(config),
});

registry.registerAI({
  id: 'quarto-heuristic',
  name: 'Quarto AI',
  supportedGames: ['quarto'],
  factory: (playerId, difficulty = 'medium') =>
    new Agent(
      new QuartoBrain(difficulty),
      DIFFICULTY_PRESETS[difficulty],
      playerId,
    ),
});
