/**
 * Quarto Game Engine
 *
 * 4×4 board. 16 unique pieces, each with 4 binary attributes:
 *   tall/short, dark/light, round/square, hollow/solid
 *
 * On your turn you:
 *   1. Place the piece your opponent gave you on an empty cell
 *   2. Give your opponent a piece to place next turn
 *
 * Win = 4 pieces in a row sharing at least ONE common attribute.
 */

import type { GameState, Action, PlayerId } from '@gameagent/game-core';
import { GameEngine } from '@gameagent/game-core';

// ── Piece representation ────────────────────────────────────────────────────
// Piece is a 4-bit number 0–15:
//   bit 0 = tall(1) / short(0)
//   bit 1 = dark(1) / light(0)
//   bit 2 = round(1) / square(0)
//   bit 3 = hollow(1) / solid(0)

export type Piece = number | null; // 0-15 or null (empty)

export interface QuartoState extends GameState {
  board: Piece[];           // 16 cells row-major [0..15]
  remaining: number[];      // pieces not yet on board
  pieceToPlace: number | null; // piece the current player MUST place
  currentPlayer: PlayerId;
  phase: 'place' | 'give'; // place = place pieceToPlace; give = choose next piece
  winLine: number[] | null;
}

export interface QuartoAction extends Action {
  payload: { cell?: number; piece?: number }; // cell for 'place', piece for 'give'
}

// ── Win patterns ────────────────────────────────────────────────────────────

const WIN_LINES_4X4: number[][] = [
  // rows
  [0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],
  // cols
  [0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],
  // diagonals
  [0,5,10,15],[3,6,9,12],
];

export function hasQuartoWin(board: Piece[]): number[] | null {
  for (const line of WIN_LINES_4X4) {
    const pieces = line.map(i => board[i]);
    if (pieces.some(p => p === null)) continue;
    // Check each of the 4 attribute bits
    for (let bit = 0; bit < 4; bit++) {
      const vals = pieces.map(p => (p! >> bit) & 1);
      if (vals.every(v => v === 1) || vals.every(v => v === 0)) {
        return line;
      }
    }
  }
  return null;
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class QuartoGame extends GameEngine {
  protected createInitialState(): QuartoState {
    return {
      tick: 0,
      isOver: false,
      winner: null,
      scores: { p1: 0, p2: 0 },
      board: Array(16).fill(null) as Piece[],
      remaining: Array.from({ length: 16 }, (_, i) => i),
      pieceToPlace: null,
      currentPlayer: 'p1',
      phase: 'give', // p1 starts by choosing a piece for p2 to place
      winLine: null,
    };
  }

  getState(): QuartoState {
    const s = this.state as QuartoState;
    return {
      ...s,
      board: [...s.board],
      remaining: [...s.remaining],
      winLine: s.winLine ? [...s.winLine] : null,
    };
  }

  applyAction(action: Action): void {
    const s = this.state as QuartoState;
    if (s.isOver) return;
    if (action.playerId !== s.currentPlayer) return;

    const { cell, piece } = (action as QuartoAction).payload;
    s.tick++;

    if (s.phase === 'place') {
      // ── Phase: place pieceToPlace on a cell ───────────────────────
      if (typeof cell !== 'number' || cell < 0 || cell > 15) return;
      if (s.board[cell] !== null) return;
      if (s.pieceToPlace === null) return;

      s.board[cell] = s.pieceToPlace;
      s.pieceToPlace = null;

      const winLine = hasQuartoWin(s.board);
      if (winLine) {
        s.isOver = true;
        s.winner = action.playerId;
        s.winLine = winLine;
        s.scores[action.playerId]++;
        return;
      }
      if (s.remaining.length === 0) {
        s.isOver = true; // draw
        return;
      }
      s.phase = 'give';
      // Current player now gives a piece (stays their turn for the give-phase)

    } else {
      // ── Phase: give a piece to opponent ──────────────────────────
      if (typeof piece !== 'number') return;
      if (!s.remaining.includes(piece)) return;

      s.remaining = s.remaining.filter(p => p !== piece);
      s.pieceToPlace = piece;
      s.phase = 'place';
      s.currentPlayer = action.playerId === 'p1' ? 'p2' : 'p1';
    }
  }

  tick(): void {
    (this.state as QuartoState).tick++;
  }

  isGameOver(): boolean {
    return (this.state as QuartoState).isOver;
  }

  getReward(playerId: PlayerId): number {
    const s = this.state as QuartoState;
    if (!s.isOver || s.winner === null) return 0;
    return s.winner === playerId ? 1 : -1;
  }

  clone(): QuartoGame {
    const g = new QuartoGame(this.config);
    const s = this.state as QuartoState;
    (g as unknown as { state: QuartoState }).state = {
      ...s,
      board: [...s.board],
      remaining: [...s.remaining],
      scores: { ...s.scores },
      winLine: s.winLine ? [...s.winLine] : null,
    };
    return g;
  }
}
