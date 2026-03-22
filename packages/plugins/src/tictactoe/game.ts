/**
 * Tic-Tac-Toe Game Engine
 *
 * Classic 3×3 grid. Players alternate placing X (p1) or O (p2).
 * Win = 3 in a row (horizontal, vertical, diagonal).
 */

import type { GameState, Action, PlayerId } from '@gameagent/game-core';
import { GameEngine } from '@gameagent/game-core';

// ── State ─────────────────────────────────────────────────────────────────────

export type Cell = 'X' | 'O' | null;

export interface TicTacToeState extends GameState {
  board: Cell[];       // 9 cells, row-major [0..8]
  currentPlayer: PlayerId;
  winLine: number[] | null;  // indices of winning cells, or null
}

export interface TicTacToeAction extends Action {
  payload: { cell: number }; // 0-based index into board
}

// ── Win patterns ──────────────────────────────────────────────────────────────

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],         // diagonals
];

function checkWinner(board: Cell[]): { winner: Cell; line: number[] } | null {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a]!, line: [a,b,c] };
    }
  }
  return null;
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class TicTacToeGame extends GameEngine {
  protected createInitialState(): TicTacToeState {
    return {
      tick: 0,
      isOver: false,
      winner: null,
      scores: { p1: 0, p2: 0 },
      board: Array(9).fill(null) as Cell[],
      currentPlayer: 'p1',
      winLine: null,
    };
  }

  getState(): TicTacToeState {
    const s = this.state as TicTacToeState;
    return {
      ...s,
      board: [...s.board],
      winLine: s.winLine ? [...s.winLine] : null,
    };
  }

  applyAction(action: Action): void {
    const s = this.state as TicTacToeState;
    if (s.isOver) return;
    if (action.playerId !== s.currentPlayer) return;

    const cell = (action as TicTacToeAction).payload.cell;
    if (typeof cell !== 'number' || cell < 0 || cell > 8) return;
    if (s.board[cell] !== null) return; // occupied

    s.board[cell] = action.playerId === 'p1' ? 'X' : 'O';
    s.tick++;

    const result = checkWinner(s.board);
    if (result) {
      s.isOver = true;
      s.winner = action.playerId;
      s.winLine = result.line;
      s.scores[action.playerId]++;
    } else if (s.board.every(c => c !== null)) {
      s.isOver = true; // draw
      s.winner = null;
    } else {
      s.currentPlayer = action.playerId === 'p1' ? 'p2' : 'p1';
    }
  }

  tick(): void {
    // Turn-based — no autonomous ticking needed
    (this.state as TicTacToeState).tick++;
  }

  isGameOver(): boolean {
    return (this.state as TicTacToeState).isOver;
  }

  getReward(playerId: PlayerId): number {
    const s = this.state as TicTacToeState;
    if (!s.isOver) return 0;
    if (s.winner === null) return 0;
    return s.winner === playerId ? 1 : -1;
  }

  /** Returns all valid move indices */
  getValidMoves(): number[] {
    return (this.state as TicTacToeState).board
      .map((c, i) => (c === null ? i : -1))
      .filter(i => i !== -1);
  }

  /** Clone current game for AI lookahead */
  clone(): TicTacToeGame {
    const g = new TicTacToeGame(this.config);
    const s = this.state as TicTacToeState;
    (g as unknown as { state: TicTacToeState }).state = {
      ...s,
      board: [...s.board],
      scores: { ...s.scores },
      winLine: s.winLine ? [...s.winLine] : null,
    };
    return g;
  }
}
