/**
 * Quarto AI Brain — Heuristic search
 */

import { Brain } from '@gameagent/ai-core';
import type { GameState, Action, PlayerId } from '@gameagent/game-core';
import type { QuartoState } from './game';
import { hasQuartoWin } from './game';

export class QuartoBrain extends Brain {
  readonly brainId = 'quarto-heuristic';
  private noise: number;

  constructor(difficulty: string) {
    super();
    this.noise = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.2 : 0;
  }

  decide(state: Readonly<GameState>, playerId: PlayerId): Action {
    const s = state as QuartoState;
    if (Math.random() < this.noise) return this.randomAction(s, playerId);
    return s.phase === 'place'
      ? this.decidePlacement(s, playerId)
      : this.decideGive(s, playerId);
  }

  private decidePlacement(s: QuartoState, playerId: PlayerId): Action {
    const emptyCells = s.board
      .map((c: unknown, i: number) => (c === null ? i : -1))
      .filter((i: number) => i !== -1);
    const piece = s.pieceToPlace!;

    for (const cell of emptyCells) {
      const test = [...s.board]; test[cell] = piece;
      if (hasQuartoWin(test)) return { playerId, timestamp: Date.now(), payload: { cell } };
    }

    for (const cell of [5, 6, 9, 10]) {
      if (s.board[cell] === null) return { playerId, timestamp: Date.now(), payload: { cell } };
    }

    const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    return { playerId, timestamp: Date.now(), payload: { cell } };
  }

  private decideGive(s: QuartoState, playerId: PlayerId): Action {
    const safe = s.remaining.filter(p => !this.isDangerous(p, s.board));
    const candidates = safe.length > 0 ? safe : s.remaining;
    const piece = candidates[Math.floor(Math.random() * candidates.length)];
    return { playerId, timestamp: Date.now(), payload: { piece } };
  }

  private isDangerous(piece: number, board: (number | null)[]): boolean {
    const empty = board
      .map((c: unknown, i: number) => (c === null ? i : -1))
      .filter((i: number) => i !== -1);
    for (const cell of empty) {
      const test = [...board]; test[cell] = piece;
      if (hasQuartoWin(test)) return true;
    }
    return false;
  }

  private randomAction(s: QuartoState, playerId: PlayerId): Action {
    if (s.phase === 'place') {
      const empty = s.board
        .map((c: unknown, i: number) => (c === null ? i : -1))
        .filter((i: number) => i !== -1);
      const cell = empty[Math.floor(Math.random() * empty.length)];
      return { playerId, timestamp: Date.now(), payload: { cell } };
    }
    const piece = s.remaining[Math.floor(Math.random() * s.remaining.length)];
    return { playerId, timestamp: Date.now(), payload: { piece } };
  }
}
