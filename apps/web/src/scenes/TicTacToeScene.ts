/**
 * TicTacToeScene – Phaser 3 Scene
 * Renders the 3×3 Tic-Tac-Toe board and drives WebSocket communication.
 */

import Phaser from 'phaser';
import type { TicTacToeState } from '@gameagent/plugins/tictactoe';

const WS_BASE = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

export interface TicTacToeSceneData {
  sessionId: string;
  playerId: 'p1' | 'p2';
}

const BOARD_SIZE = 480;
const CELL = BOARD_SIZE / 3;
const PAD = 24;

export class TicTacToeScene extends Phaser.Scene {
  private ws: WebSocket | null = null;
  private sessionId = '';
  private playerId: 'p1' | 'p2' = 'p1';
  private isGameOver = false;
  private mySymbol: 'X' | 'O' = 'X';

  private cells: Phaser.GameObjects.Rectangle[] = [];
  private marks: (Phaser.GameObjects.Text | null)[] = Array(9).fill(null);
  private winLines: Phaser.GameObjects.Line[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private currentPlayer: 'p1' | 'p2' = 'p1';
  private board: (string | null)[] = Array(9).fill(null);

  constructor() { super({ key: 'TicTacToeScene' }); }

  init(data: TicTacToeSceneData) {
    this.sessionId = data.sessionId;
    this.playerId = data.playerId;
    this.mySymbol = data.playerId === 'p1' ? 'X' : 'O';
  }

  create() {
    const { width, height } = this.scale;
    const ox = (width - BOARD_SIZE) / 2;
    const oy = (height - BOARD_SIZE) / 2;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f);

    // Grid lines
    const lineColor = 0x334155;
    for (let i = 1; i < 3; i++) {
      this.add.line(0, 0, ox + i*CELL, oy + PAD, ox + i*CELL, oy + BOARD_SIZE - PAD, lineColor, 0.8)
        .setLineWidth(3).setOrigin(0, 0);
      this.add.line(0, 0, ox + PAD, oy + i*CELL, ox + BOARD_SIZE - PAD, oy + i*CELL, lineColor, 0.8)
        .setLineWidth(3).setOrigin(0, 0);
    }

    // Invisible hit areas for each cell
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = ox + col * CELL + CELL / 2;
      const cy = oy + row * CELL + CELL / 2;

      const cell = this.add.rectangle(cx, cy, CELL - 8, CELL - 8, 0x1e293b, 0)
        .setInteractive();
      cell.on('pointerdown', () => this.onCellClick(i));
      cell.on('pointerover', () => { if (!this.board[i]) cell.setFillStyle(0x334155, 0.3); });
      cell.on('pointerout',  () => cell.setFillStyle(0x1e293b, 0));
      this.cells.push(cell);
    }

    // Status
    this.statusText = this.add.text(width / 2, oy - 40, 'Connecting…', {
      fontFamily: 'Inter, monospace', fontSize: '20px', color: '#94a3b8',
    }).setOrigin(0.5, 1);

    this.connectWS();
  }

  private onCellClick(index: number) {
    if (this.isGameOver) return;
    if (this.currentPlayer !== this.playerId) return;
    if (this.board[index] !== null) return;

    this.ws?.send(JSON.stringify({
      type: 'game:action',
      playerId: this.playerId,
      payload: { cell: index },
    }));
  }

  private connectWS() {
    this.ws = new WebSocket(`${WS_BASE}/game/ws/${this.sessionId}`);
    this.ws.onopen = () => { this.statusText.setText(''); this.updateStatus(); };
    this.ws.onmessage = (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string) as { type: string; state?: TicTacToeState };
      if ((msg.type === 'game:tick' || msg.type === 'game:state') && msg.state) this.applyState(msg.state);
      if (msg.type === 'game:over' && msg.state) { this.applyState(msg.state); this.onGameOver(msg.state); }
    };
    this.ws.onclose = () => { if (!this.isGameOver) this.statusText.setText('Disconnected'); };
  }

  private applyState(s: TicTacToeState) {
    this.board = [...s.board];
    this.currentPlayer = s.currentPlayer;

    for (let i = 0; i < 9; i++) {
      const mark = s.board[i];
      if (!this.marks[i] && mark) {
        const col = i % 3, row = Math.floor(i / 3);
        const { width, height } = this.scale;
        const ox = (width - BOARD_SIZE) / 2, oy = (height - BOARD_SIZE) / 2;
        const cx = ox + col * CELL + CELL / 2;
        const cy = oy + row * CELL + CELL / 2;
        this.marks[i] = this.add.text(cx, cy, mark, {
          fontFamily: 'Inter, monospace',
          fontSize: '80px',
          fontStyle: 'bold',
          color: mark === 'X' ? '#6366f1' : '#f43f5e',
        }).setOrigin(0.5);
      }
    }

    if (!this.isGameOver) this.updateStatus();

    if (s.winLine) this.drawWinLine(s.winLine);
  }

  private drawWinLine(line: number[]) {
    if (this.winLines.length > 0) return;
    const { width, height } = this.scale;
    const ox = (width - BOARD_SIZE) / 2, oy = (height - BOARD_SIZE) / 2;
    const [a,, c] = line;
    const ax = ox + (a % 3) * CELL + CELL / 2;
    const ay = oy + Math.floor(a / 3) * CELL + CELL / 2;
    const bx = ox + (c % 3) * CELL + CELL / 2;
    const by = oy + Math.floor(c / 3) * CELL + CELL / 2;
    const wl = this.add.line(0, 0, ax, ay, bx, by, 0xfbbf24, 0.9).setLineWidth(6).setOrigin(0, 0);
    this.winLines.push(wl);
  }

  private updateStatus() {
    if (this.currentPlayer === this.playerId) {
      this.statusText.setText(`Your turn (${this.mySymbol})`).setColor('#6366f1');
    } else {
      this.statusText.setText('AI thinking…').setColor('#94a3b8');
    }
  }

  private onGameOver(s: TicTacToeState) {
    this.isGameOver = true;
    if (s.winner === this.playerId) this.statusText.setText('🏆 You Win!').setColor('#22c55e');
    else if (!s.winner) this.statusText.setText("It's a Draw!").setColor('#f59e0b');
    else this.statusText.setText('💀 AI Wins!').setColor('#f43f5e');
  }

  shutdown() { this.ws?.close(); }
}
