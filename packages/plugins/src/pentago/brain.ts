/**
 * Pentago AI Brain — Heuristic + move-sampling
 */

import { Brain } from '@gameagent/ai-core';
import type { GameState, Action, PlayerId, GameConfig } from '@gameagent/game-core';
import type { PentagoState, PentagoAction, Marble } from './game';
import { PentagoGame } from './game';

const QUADS = [0, 1, 2, 3] as const;
const DIRS = ['cw', 'ccw'] as const;

const DUMMY_CONFIG: GameConfig = {
  sessionId: 'ai-search', players: { p1: 'human', p2: 'ai' }, tickRate: 1,
};

function buildGame(s: PentagoState): PentagoGame {
  const g = new PentagoGame(DUMMY_CONFIG);
  (g as unknown as { state: PentagoState }).state = {
    ...s, board: [...s.board], scores: { ...s.scores },
    winLine: s.winLine ? [...s.winLine] : null,
  };
  return g;
}

function maxRunLength(board: Marble[], marker: Marble): number {
  const lines: number[][] = [];
  for (let r = 0; r < 6; r++) lines.push([0,1,2,3,4,5].map(c => r*6+c));
  for (let c = 0; c < 6; c++) lines.push([0,1,2,3,4,5].map(r => r*6+c));
  for (let i = 0; i <= 1; i++) for (let j = 0; j <= 1; j++)
    lines.push([0,1,2,3,4].map(k => (i+k)*6+(j+k)));
  for (let i = 0; i <= 1; i++) for (let j = 4; j <= 5; j++)
    lines.push([0,1,2,3,4].map(k => (i+k)*6+(j-k)));

  let best = 0;
  for (const line of lines) {
    let run = 0;
    for (const idx of line) {
      if (board[idx] === marker) { run++; best = Math.max(best, run); } else run = 0;
    }
  }
  return best;
}

export class PentagoBrain extends Brain {
  readonly brainId = 'pentago-heuristic';
  private noise: number;
  private sampleMoves: number;

  constructor(difficulty: string) {
    super();
    this.noise = difficulty === 'easy' ? 0.7 : difficulty === 'medium' ? 0.25 : 0;
    this.sampleMoves = difficulty === 'expert' ? 10 : 6;
  }

  decide(state: Readonly<GameState>, playerId: PlayerId): Action {
    const s = state as PentagoState;
    const empty = s.board
      .map((c: Marble, i: number) => (c === null ? i : -1))
      .filter((i: number) => i !== -1);
    if (empty.length === 0) return this.makeAction(playerId, 0, 0, 'cw') as Action;

    const opponentId: PlayerId = playerId === 'p1' ? 'p2' : 'p1';
    if (Math.random() < this.noise) return this.randomMove(playerId, empty);

    const sample = empty.slice(0, this.sampleMoves);

    // 1. Win immediately
    for (const cell of sample) for (const q of QUADS) for (const dir of DIRS) {
      const g = buildGame(s);
      g.applyAction(this.makeAction(playerId, cell, q, dir) as Action);
      if (g.isGameOver() && g.getState().winner === playerId)
        return this.makeAction(playerId, cell, q, dir) as Action;
    }

    // 2. Block opponent win
    for (const cell of sample) for (const q of QUADS) for (const dir of DIRS) {
      const g = buildGame(s);
      g.applyAction(this.makeAction(opponentId, cell, q, dir) as Action);
      if (g.isGameOver() && g.getState().winner === opponentId) {
        const best = this.bestRotation(s, playerId, cell);
        return this.makeAction(playerId, cell, best.q, best.dir) as Action;
      }
    }

    // 3. Heuristic best
    const myMarker: Marble = playerId === 'p1' ? 1 : 2;
    let bestScore = -1;
    let bestAction = this.makeAction(playerId, empty[0], 0, 'cw');

    for (const cell of sample) for (const q of QUADS) for (const dir of DIRS) {
      const g = buildGame(s);
      g.applyAction(this.makeAction(playerId, cell, q, dir) as Action);
      const score = maxRunLength(g.getState().board as Marble[], myMarker);
      if (score > bestScore) { bestScore = score; bestAction = this.makeAction(playerId, cell, q, dir); }
    }

    return bestAction as Action;
  }

  private bestRotation(s: PentagoState, playerId: PlayerId, cell: number) {
    const myMarker: Marble = playerId === 'p1' ? 1 : 2;
    let bestScore = -1;
    let best = { q: 0 as 0|1|2|3, dir: 'cw' as 'cw'|'ccw' };
    for (const q of QUADS) for (const dir of DIRS) {
      const g = buildGame(s);
      g.applyAction(this.makeAction(playerId, cell, q, dir) as Action);
      const score = maxRunLength(g.getState().board as Marble[], myMarker);
      if (score > bestScore) { bestScore = score; best = { q, dir }; }
    }
    return best;
  }

  private makeAction(playerId: PlayerId, cell: number, quadrant: number, direction: string): PentagoAction {
    return {
      playerId, timestamp: Date.now(),
      payload: { cell, quadrant: quadrant as 0|1|2|3, direction: direction as 'cw'|'ccw' },
    };
  }

  private randomMove(playerId: PlayerId, empty: number[]): Action {
    const cell = empty[Math.floor(Math.random() * empty.length)];
    const q = QUADS[Math.floor(Math.random() * 4)];
    const dir = DIRS[Math.floor(Math.random() * 2)];
    return this.makeAction(playerId, cell, q, dir) as Action;
  }
}
