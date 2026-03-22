/**
 * QuartoScene – Phaser 3 Scene
 * 4×4 board with piece icons. Two-phase turn: place then give.
 */

import Phaser from 'phaser';
import type { QuartoState } from '@gameagent/plugins/quarto';

const WS_BASE = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

export interface QuartoSceneData { sessionId: string; playerId: 'p1' | 'p2'; }

const BOARD_SIZE = 480;
const CELL = BOARD_SIZE / 4;
// Colour encoding per attribute
function pieceColor(piece: number): number {
  const tall = (piece >> 0) & 1;
  const dark = (piece >> 1) & 1;
  return dark ? (tall ? 0x6366f1 : 0x818cf8) : (tall ? 0xf43f5e : 0xfb7185);
}
function pieceShape(piece: number): string {
  const round  = (piece >> 2) & 1;
  const hollow = (piece >> 3) & 1;
  const tall   = (piece >> 0) & 1;
  return `${tall ? '▣' : '□'}${round ? '●' : '■'}${hollow ? '○' : '◉'}`;
}

export class QuartoScene extends Phaser.Scene {
  private ws: WebSocket | null = null;
  private sessionId = ''; private playerId: 'p1' | 'p2' = 'p1';
  private isGameOver = false;
  private phase: 'place' | 'give' = 'give';
  private currentPlayer: 'p1' | 'p2' = 'p1';
  private pieceToPlace: number | null = null;
  private remaining: number[] = [];
  private board: (number | null)[] = Array(16).fill(null);
  private statusText!: Phaser.GameObjects.Text;
  private boardCells: Phaser.GameObjects.Rectangle[] = [];
  private boardMarks: (Phaser.GameObjects.Text | null)[] = Array(16).fill(null);
  private trayItems: Phaser.GameObjects.Container[] = [];

  constructor() { super({ key: 'QuartoScene' }); }
  init(data: QuartoSceneData) { this.sessionId = data.sessionId; this.playerId = data.playerId; }

  create() {
    const { width, height } = this.scale;
    const ox = (width - BOARD_SIZE) / 2;
    const oy = (height - BOARD_SIZE) / 2 - 60;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f);

    // Board cells
    for (let i = 0; i < 16; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const cx = ox + col * CELL + CELL / 2;
      const cy = oy + row * CELL + CELL / 2;
      const cell = this.add.rectangle(cx, cy, CELL - 6, CELL - 6, 0x1e293b)
        .setStrokeStyle(1, 0x334155).setInteractive();
      cell.on('pointerdown', () => this.onCellClick(i));
      cell.on('pointerover', () => { if (!this.board[i]) cell.setFillStyle(0x334155); });
      cell.on('pointerout',  () => cell.setFillStyle(0x1e293b));
      this.boardCells.push(cell);
    }

    this.statusText = this.add.text(width / 2, oy - 50, 'Connecting…', {
      fontFamily: 'Inter, monospace', fontSize: '18px', color: '#94a3b8',
    }).setOrigin(0.5, 1);

    this.connectWS();
  }

  private onCellClick(index: number) {
    if (this.isGameOver || this.currentPlayer !== this.playerId) return;
    if (this.phase !== 'place' || this.board[index] !== null || this.pieceToPlace === null) return;
    this.ws?.send(JSON.stringify({ type: 'game:action', playerId: this.playerId, payload: { cell: index } }));
  }

  private onTrayClick(piece: number) {
    if (this.isGameOver || this.currentPlayer !== this.playerId) return;
    if (this.phase !== 'give' || !this.remaining.includes(piece)) return;
    this.ws?.send(JSON.stringify({ type: 'game:action', playerId: this.playerId, payload: { piece } }));
  }

  private connectWS() {
    this.ws = new WebSocket(`${WS_BASE}/game/ws/${this.sessionId}`);
    this.ws.onopen = () => this.statusText.setText('');
    this.ws.onmessage = (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string) as { type: string; state?: QuartoState };
      if ((msg.type === 'game:tick' || msg.type === 'game:state') && msg.state) this.applyState(msg.state);
      if (msg.type === 'game:over' && msg.state) { this.applyState(msg.state); this.onGameOver(msg.state); }
    };
    this.ws.onclose = () => { if (!this.isGameOver) this.statusText.setText('Disconnected'); };
  }

  private applyState(s: QuartoState) {
    this.phase = s.phase;
    this.currentPlayer = s.currentPlayer;
    this.pieceToPlace = s.pieceToPlace;
    this.remaining = [...s.remaining];
    this.board = [...s.board];

    // Update board marks
    for (let i = 0; i < 16; i++) {
      const p = s.board[i];
      if (p !== null && p !== undefined && !this.boardMarks[i]) {
        const col = i % 4, row = Math.floor(i / 4);
        const { width, height } = this.scale;
        const ox = (width - BOARD_SIZE) / 2, oy = (height - BOARD_SIZE) / 2 - 60;
        this.boardMarks[i] = this.add.text(
          ox + col * CELL + CELL / 2,
          oy + row * CELL + CELL / 2,
          pieceShape(p),
          { fontFamily: 'monospace', fontSize: '24px', color: '#' + pieceColor(p).toString(16).padStart(6, '0') },
        ).setOrigin(0.5);
      }
    }

    // Rebuild tray
    this.trayItems.forEach(c => c.destroy());
    this.trayItems = [];
    const { width, height } = this.scale;
    const oy = (height - BOARD_SIZE) / 2 - 60;
    const trayY = oy + BOARD_SIZE + 50;
    const startX = (width - (s.remaining.length * 36)) / 2;
    s.remaining.forEach((p: number, idx: number) => {
      const x = startX + idx * 36;
      const isHighlighted = s.pieceToPlace === p;
      const bg = this.add.rectangle(0, 0, 32, 32, isHighlighted ? 0x6366f1 : 0x1e293b)
        .setStrokeStyle(1, 0x334155);
      const txt = this.add.text(0, 0, pieceShape(p), {
        fontFamily: 'monospace', fontSize: '14px',
        color: '#' + pieceColor(p).toString(16).padStart(6, '0'),
      }).setOrigin(0.5);
      const container = this.add.container(x + 16, trayY, [bg, txt]);
      container.setInteractive(new Phaser.Geom.Rectangle(-16, -16, 32, 32), Phaser.Geom.Rectangle.Contains);
      container.on('pointerdown', () => this.onTrayClick(p));
      container.on('pointerover', () => bg.setFillStyle(0x334155));
      container.on('pointerout',  () => bg.setFillStyle(isHighlighted ? 0x6366f1 : 0x1e293b));
      this.trayItems.push(container);
    });

    // Status
    if (!this.isGameOver) {
      const myTurn = this.currentPlayer === this.playerId;
      if (myTurn && s.phase === 'place') this.statusText.setText('Your turn — place the highlighted piece').setColor('#6366f1');
      else if (myTurn && s.phase === 'give') this.statusText.setText('Your turn — give a piece to the AI').setColor('#6366f1');
      else this.statusText.setText('AI is thinking…').setColor('#94a3b8');
    }
  }

  private onGameOver(s: QuartoState) {
    this.isGameOver = true;
    if (s.winner === this.playerId) this.statusText.setText('🏆 You Win!').setColor('#22c55e');
    else if (!s.winner) this.statusText.setText("It's a Draw!").setColor('#f59e0b');
    else this.statusText.setText('💀 AI Wins!').setColor('#f43f5e');
  }

  shutdown() { this.ws?.close(); }
}
