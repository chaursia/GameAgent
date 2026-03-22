/**
 * Tic-Tac-Toe plugin registration + type exports
 */
export type { TicTacToeState, TicTacToeAction, Cell } from './game';

import { registry } from '../index';
import { DIFFICULTY_PRESETS, Agent } from '@gameagent/ai-core';
import { TicTacToeGame } from './game';
import { TicTacToeBrain } from './brain';

registry.registerGame({
  id: 'tictactoe',
  name: 'Tic-Tac-Toe',
  description: 'Classic 3×3 grid. Three in a row wins.',
  maxPlayers: 2,
  factory: (config) => new TicTacToeGame(config),
});

registry.registerAI({
  id: 'tictactoe-minimax',
  name: 'Minimax AI',
  supportedGames: ['tictactoe'],
  factory: (playerId, difficulty = 'medium') =>
    new Agent(
      new TicTacToeBrain(difficulty),
      DIFFICULTY_PRESETS[difficulty],
      playerId,
    ),
});
