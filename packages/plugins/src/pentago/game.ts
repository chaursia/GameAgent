/**
 * Pentago Game Engine
 *
 * 6×6 board divided into 4 3×3 sub-grids (quadrants).
 * On each turn a player:
 *   1. Places a marble in any empty cell
 *   2. Rotates one of the 4 sub-grids 90° CW or CCW
 *
 * Win = 5 marbles in a row (horizontal, vertical, or diagonal).
 * If both players get 5-in-a-row after a rotation → draw.
 */

import type { GameState, Action, PlayerId } from '@gameagent/game-core';
import { GameEngine } from '@gameagent/game-core';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Marble = 1 | 2 | null; // 1 = p1, 2 = p2

export interface PentagoState extends GameState {
  board: Marble[];           // 36 cells row-major [0..35]
  currentPlayer: PlayerId;
  winLine: number[] | null;
}

export interface PentagoAction extends Action {
  payload: {
    cell: number;        // 0-35
    quadrant: 0 | 1 | 2 | 3;  // TL=0,TR=1,BL=2,BR=3
    direction: 'cw' | 'ccw';
  };
}

// ── Win detection ─────────────────────────────────────────────────────────────

function buildWinLines(): number[][] {
  const lines: number[][] = [];
  // Rows — look for 5 consecutive in each row
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c <= 1; c++) {
      lines.push([r*6+c, r*6+c+1, r*6+c+2, r*6+c+3, r*6+c+4]);
    }
  }
  // Cols
  for (let c = 0; c < 6; c++) {
    for (let r = 0; r <= 1; r++) {
      lines.push([r*6+c, (r+1)*6+c, (r+2)*6+c, (r+3)*6+c, (r+4)*6+c]);
    }
  }
  // Diagonals (down-right)
  for (let r = 0; r <= 1; r++) {
    for (let c = 0; c <= 1; c++) {
      lines.push([r*6+c,(r+1)*6+c+1,(r+2)*6+c+2,(r+3)*6+c+3,(r+4)*6+c+4]);
    }
  }
  // Diagonals (down-left)
  for (let r = 0; r <= 1; r++) {
    for (let c = 4; c <= 5; c++) {
      lines.push([r*6+c,(r+1)*6+c-1,(r+2)*6+c-2,(r+3)*6+c-3,(r+4)*6+c-4]);
    }
  }
  return lines;
}

const WIN_LINES = buildWinLines();

function checkPentagoWin(board: Marble[]): { winner: Marble; line: number[] } | null {
  for (const line of WIN_LINES) {
    const vals = line.map(i => board[i]);
    if (!vals[0]) continue;
    if (vals.every(v => v === vals[0])) return { winner: vals[0]!, line };
  }
  return null;
}

// ── Quadrant rotation ─────────────────────────────────────────────────────────

// Quadrant top-left corners (row, col)
const QUAD_ORIGINS: [number, number][] = [[0,0],[0,3],[3,0],[3,3]];

function rotateQuadrant(board: Marble[], quadrant: 0|1|2|3, cw: boolean): Marble[] {
  const next = [...board] as Marble[];
  const [r0, c0] = QUAD_ORIGINS[quadrant];
  // Read 3×3 block
  const blk: Marble[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      blk.push(board[(r0+r)*6 + c0+c]);

  // Write rotated back
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const src = cw ? blk[(2-c)*3+r] : blk[c*3+(2-r)];
      next[(r0+r)*6 + c0+c] = src;
    }
  }
  return next;
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class PentagoGame extends GameEngine {
  protected createInitialState(): PentagoState {
    return {
      tick: 0,
      isOver: false,
      winner: null,
      scores: { p1: 0, p2: 0 },
      board: Array(36).fill(null) as Marble[],
      currentPlayer: 'p1',
      winLine: null,
    };
  }

  getState(): PentagoState {
    const s = this.state as PentagoState;
    return {
      ...s,
      board: [...s.board],
      winLine: s.winLine ? [...s.winLine] : null,
    };
  }

  applyAction(action: Action): void {
    const s = this.state as PentagoState;
    if (s.isOver) return;
    if (action.playerId !== s.currentPlayer) return;

    const { cell, quadrant, direction } = (action as PentagoAction).payload;

    // Validate
    if (typeof cell !== 'number' || cell < 0 || cell > 35) return;
    if (s.board[cell] !== null) return;
    if (quadrant === undefined || direction === undefined) return;

    s.tick++;
    const marble: Marble = action.playerId === 'p1' ? 1 : 2;
    s.board[cell] = marble;

    // Rotate quadrant
    s.board = rotateQuadrant(s.board, quadrant as 0|1|2|3, direction === 'cw');

    // Check win for both players
    const p1win = checkPentagoWin(s.board);
    if (p1win) {
      s.isOver = true;
      s.winner = p1win.winner === 1 ? 'p1' : p1win.winner === 2 ? 'p2' : null;
      s.winLine = p1win.line;
      if (s.winner) s.scores[s.winner]++;
      return;
    }

    if (s.board.every(c => c !== null)) {
      s.isOver = true; // draw
      return;
    }

    s.currentPlayer = action.playerId === 'p1' ? 'p2' : 'p1';
  }

  tick(): void {
    (this.state as PentagoState).tick++;
  }

  isGameOver(): boolean {
    return (this.state as PentagoState).isOver;
  }

  getReward(playerId: PlayerId): number {
    const s = this.state as PentagoState;
    if (!s.isOver || s.winner === null) return 0;
    return s.winner === playerId ? 1 : -1;
  }

  clone(): PentagoGame {
    const g = new PentagoGame(this.config);
    const s = this.state as PentagoState;
    (g as unknown as { state: PentagoState }).state = {
      ...s,
      board: [...s.board],
      scores: { ...s.scores },
      winLine: s.winLine ? [...s.winLine] : null,
    };
    return g;
  }
}
