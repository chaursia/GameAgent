/**
 * PentagoScene – Phaser 3 Scene
 * 6×6 board with 4 rotatable 3×3 quadrants.
 * Turn: click empty cell to place marble, then click rotation arrow.
 */

import Phaser from 'phaser';
import type { PentagoState } from '@gameagent/plugins/pentago';

const WS_BASE = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

export interface PentagoSceneData { sessionId: string; playerId: 'p1' | 'p2'; }

const BOARD_SIZE = 480;
const CELL = BOARD_SIZE / 6;
const QUAD_SIZE = BOARD_SIZE / 2;
const P1_COLOR = 0x6366f1;
const P2_COLOR = 0xf43f5e;

export class PentagoScene extends Phaser.Scene {
  private ws: WebSocket | null = null;
  private sessionId = ''; private playerId: 'p1' | 'p2' = 'p1';
  private isGameOver = false;
  private currentPlayer: 'p1' | 'p2' = 'p1';
  private board: (1 | 2 | null)[] = Array(36).fill(null);
  private pendingCell: number | null = null; // cell placed this turn, awaiting rotation choice

  private statusText!: Phaser.GameObjects.Text;
  private marbles: (Phaser.GameObjects.Arc | null)[] = Array(36).fill(null);
  private rotContainer!: Phaser.GameObjects.Container;

  constructor() { super({ key: 'PentagoScene' }); }
  init(data: PentagoSceneData) { this.sessionId = data.sessionId; this.playerId = data.playerId; }

  create() {
    const { width, height } = this.scale;
    const ox = (width  - BOARD_SIZE) / 2;
    const oy = (height - BOARD_SIZE) / 2;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f);

    // Quadrant backgrounds
    const quadColors = [0x0f172a, 0x0d1526, 0x0d1526, 0x0f172a];
    for (let q = 0; q < 4; q++) {
      const qx = ox + (q % 2) * QUAD_SIZE;
      const qy = oy + Math.floor(q / 2) * QUAD_SIZE;
      this.add.rectangle(qx + QUAD_SIZE / 2, qy + QUAD_SIZE / 2, QUAD_SIZE - 4, QUAD_SIZE - 4, quadColors[q])
        .setStrokeStyle(2, 0x334155);
    }

    // Cell hit areas
    for (let i = 0; i < 36; i++) {
      const col = i % 6, row = Math.floor(i / 6);
      const cx = ox + col * CELL + CELL / 2;
      const cy = oy + row * CELL + CELL / 2;
      const hit = this.add.circle(cx, cy, CELL * 0.4, 0x1e293b, 0).setInteractive();
      hit.on('pointerdown', () => this.onCellClick(i));
      hit.on('pointerover', () => { if (!this.board[i]) hit.setFillStyle(0x334155, 0.3); });
      hit.on('pointerout',  () => hit.setFillStyle(0x1e293b, 0));
    }

    this.statusText = this.add.text(width / 2, oy - 44, 'Connecting…', {
      fontFamily: 'Inter, monospace', fontSize: '18px', color: '#94a3b8',
    }).setOrigin(0.5, 1);

    // Rotation UI (shown after placing)
    this.rotContainer = this.add.container(0, 0).setVisible(false);
    const labels = ['↺ TL', '↻ TL', '↺ TR', '↻ TR', '↺ BL', '↻ BL', '↺ BR', '↻ BR'];
    const quads = [0,0,1,1,2,2,3,3];
    const dirs  = ['ccw','cw','ccw','cw','ccw','cw','ccw','cw'];
    labels.forEach((lbl, idx) => {
      const bx = ox + (idx % 4) * 110 + 55;
      const by = oy + BOARD_SIZE + 30 + (Math.floor(idx / 4)) * 40;
      const bg = this.add.rectangle(bx, by, 100, 34, 0x1e293b).setStrokeStyle(1, 0x334155);
      const txt = this.add.text(bx, by, lbl, {
        fontFamily: 'Inter, monospace', fontSize: '13px', color: '#94a3b8',
      }).setOrigin(0.5);
      bg.setInteractive();
      bg.on('pointerdown', () => this.onRotate(quads[idx] as 0|1|2|3, dirs[idx] as 'cw'|'ccw'));
      bg.on('pointerover', () => { bg.setFillStyle(0x334155); txt.setColor('#e2e8f0'); });
      bg.on('pointerout',  () => { bg.setFillStyle(0x1e293b); txt.setColor('#94a3b8'); });
      this.rotContainer.add([bg, txt]);
    });

    this.connectWS();
  }

  private onCellClick(index: number) {
    if (this.isGameOver || this.currentPlayer !== this.playerId) return;
    if (this.pendingCell !== null) return; // already placed, waiting for rotation
    if (this.board[index] !== null) return;

    // Optimistic: draw marble locally
    this.drawMarble(index, this.playerId === 'p1' ? 1 : 2);
    this.board[index] = this.playerId === 'p1' ? 1 : 2;
    this.pendingCell = index;
    this.statusText.setText('Now choose a quadrant rotation').setColor('#f59e0b');
    this.rotContainer.setVisible(true);
  }

  private onRotate(quadrant: 0|1|2|3, direction: 'cw'|'ccw') {
    if (this.pendingCell === null) return;
    const cell = this.pendingCell;
    // Undo optimistic marble (server will re-apply after rotation)
    if (this.marbles[cell]) { this.marbles[cell]!.destroy(); this.marbles[cell] = null; }
    this.board[cell] = null;
    this.pendingCell = null;
    this.rotContainer.setVisible(false);

    this.ws?.send(JSON.stringify({
      type: 'game:action', playerId: this.playerId,
      payload: { cell, quadrant, direction },
    }));
  }

  private drawMarble(index: number, player: 1 | 2) {
    if (this.marbles[index]) return;
    const { width, height } = this.scale;
    const ox = (width - BOARD_SIZE) / 2, oy = (height - BOARD_SIZE) / 2;
    const col = index % 6, row = Math.floor(index / 6);
    const cx = ox + col * CELL + CELL / 2;
    const cy = oy + row * CELL + CELL / 2;
    const m = this.add.circle(cx, cy, CELL * 0.36, player === 1 ? P1_COLOR : P2_COLOR);
    this.marbles[index] = m;
  }

  private connectWS() {
    this.ws = new WebSocket(`${WS_BASE}/game/ws/${this.sessionId}`);
    this.ws.onopen = () => this.statusText.setText('');
    this.ws.onmessage = (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string) as { type: string; state?: PentagoState };
      if ((msg.type === 'game:tick' || msg.type === 'game:state') && msg.state) this.applyState(msg.state);
      if (msg.type === 'game:over' && msg.state) { this.applyState(msg.state); this.onGameOver(msg.state); }
    };
    this.ws.onclose = () => { if (!this.isGameOver) this.statusText.setText('Disconnected'); };
  }

  private applyState(s: PentagoState) {
    if (this.pendingCell !== null) return; // ignore ticks while local optimistic pending
    this.currentPlayer = s.currentPlayer;
    this.board = [...s.board] as (1 | 2 | null)[];
    // Redraw all marbles
    for (let i = 0; i < 36; i++) {
      const val = s.board[i] as 1 | 2 | null;
      if (val) {
        if (this.marbles[i]) this.marbles[i]!.destroy();
        this.marbles[i] = null;
        this.drawMarble(i, val);
      } else if (this.marbles[i]) {
        this.marbles[i]!.destroy();
        this.marbles[i] = null;
      }
    }
    if (!this.isGameOver) {
      if (s.currentPlayer === this.playerId)
        this.statusText.setText('Your turn — click an empty cell').setColor('#6366f1');
      else
        this.statusText.setText('AI is thinking…').setColor('#94a3b8');
    }
  }

  private onGameOver(s: PentagoState) {
    this.isGameOver = true;
    this.rotContainer.setVisible(false);
    if (s.winner === this.playerId) this.statusText.setText('🏆 You Win!').setColor('#22c55e');
    else if (!s.winner) this.statusText.setText("Draw!").setColor('#f59e0b');
    else this.statusText.setText('💀 AI Wins!').setColor('#f43f5e');
  }

  shutdown() { this.ws?.close(); }
}
