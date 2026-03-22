/**
 * Tic-Tac-Toe AI Brain — Minimax with alpha-beta pruning
 */

import { Brain } from '@gameagent/ai-core';
import type { GameState, Action, PlayerId, GameConfig } from '@gameagent/game-core';
import type { TicTacToeState } from './game';
import { TicTacToeGame } from './game';

const DEPTH_MAP: Record<string, number> = {
  easy: 1, medium: 3, hard: 5, expert: 9,
};

const DUMMY_CONFIG: GameConfig = {
  sessionId: 'ai-search',
  players: { p1: 'human', p2: 'ai' },
  tickRate: 1,
};

export class TicTacToeBrain extends Brain {
  readonly brainId = 'tictactoe-minimax';
  private maxDepth: number;
  private noise: number;

  constructor(difficulty: string) {
    super();
    this.maxDepth = DEPTH_MAP[difficulty] ?? 9;
    this.noise = difficulty === 'easy' ? 0.5 : difficulty === 'medium' ? 0.1 : 0;
  }

  decide(state: Readonly<GameState>, playerId: PlayerId): Action {
    const s = state as TicTacToeState;
    const validMoves = s.board
      .map((c: null | string, i: number) => (c === null ? i : -1))
      .filter((i: number) => i !== -1);

    if (validMoves.length === 0) {
      return { playerId, timestamp: Date.now(), payload: { cell: 0 } };
    }

    if (Math.random() < this.noise) {
      const randomCell = validMoves[Math.floor(Math.random() * validMoves.length)];
      return { playerId, timestamp: Date.now(), payload: { cell: randomCell } };
    }

    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const cell of validMoves) {
      const game = new TicTacToeGame(DUMMY_CONFIG);
      this.seedGame(game, s);
      game.applyAction({ playerId, timestamp: 0, payload: { cell } });
      const score = this.minimax(game, 0, false, playerId, -Infinity, Infinity);
      if (score > bestScore) { bestScore = score; bestMove = cell; }
    }

    return { playerId, timestamp: Date.now(), payload: { cell: bestMove } };
  }

  private seedGame(game: TicTacToeGame, s: TicTacToeState): void {
    const gs = game.getState() as TicTacToeState;
    (game as unknown as { state: TicTacToeState }).state = {
      ...gs, board: [...s.board], currentPlayer: s.currentPlayer,
      isOver: s.isOver, winner: s.winner, tick: s.tick, winLine: null,
    };
  }

  private minimax(
    game: TicTacToeGame, depth: number, isMax: boolean,
    aiPlayer: PlayerId, alpha: number, beta: number,
  ): number {
    if (game.isGameOver() || depth >= this.maxDepth) return game.getReward(aiPlayer);

    const s = game.getState() as TicTacToeState;
    const moves = s.board
      .map((c: null | string, i: number) => (c === null ? i : -1))
      .filter((i: number) => i !== -1);
    const mover: PlayerId = isMax ? aiPlayer : (aiPlayer === 'p1' ? 'p2' : 'p1');
    let best = isMax ? -Infinity : Infinity;

    for (const cell of moves) {
      const clone = game.clone();
      clone.applyAction({ playerId: mover, timestamp: 0, payload: { cell } });
      const score = this.minimax(clone, depth + 1, !isMax, aiPlayer, alpha, beta);
      if (isMax) { best = Math.max(best, score); alpha = Math.max(alpha, score); }
      else { best = Math.min(best, score); beta = Math.min(beta, score); }
      if (beta <= alpha) break;
    }
    return best;
  }
}
