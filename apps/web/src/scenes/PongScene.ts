/**
 * PongScene – Phaser 3 Scene
 *
 * Renders the Pong game canvas and drives the real-time WebSocket loop
 * with the GameAgent server.
 *
 * State ownership: the server owns the game state.
 * This scene is a "dumb renderer" + input capture only.
 */

import Phaser from 'phaser';
import type { PongState } from '@gameagent/plugins';

// ── Constants ────────────────────────────────────────────────────────────────

// Use relative paths — Vite dev proxy forwards these to localhost:3001
// In production, these are served from the same origin
const WS_BASE = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
const API_BASE = '';  // empty = same origin (relative fetch)

// ── Scene Data ────────────────────────────────────────────────────────────────

export interface PongSceneData {
  sessionId: string;
  playerId: 'p1' | 'p2';
}

// ── PongScene ─────────────────────────────────────────────────────────────────

export class PongScene extends Phaser.Scene {
  // Game objects
  private paddleLeft!: Phaser.GameObjects.Rectangle;
  private paddleRight!: Phaser.GameObjects.Rectangle;
  private ball!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private netDashes: Phaser.GameObjects.Rectangle[] = [];

  // State
  private ws: WebSocket | null = null;
  private sessionId = '';
  private playerId: 'p1' | 'p2' = 'p1';
  private isGameOver = false;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
  };
  private currentDirection: 'up' | 'down' | 'none' = 'none';
  private inputInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({ key: 'PongScene' });
  }

  init(data: PongSceneData) {
    this.sessionId = data.sessionId;
    this.playerId = data.playerId;
  }

  preload() {
    // No external assets – everything is drawn with Phaser primitives
  }

  create() {
    const { width, height } = this.scale;

    // ── Background ───────────────────────────────────────────────────
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f);

    // ── Net (dashes) ─────────────────────────────────────────────────
    const dashH = 20;
    const dashGap = 12;
    for (let y = 0; y < height; y += dashH + dashGap) {
      const dash = this.add.rectangle(width / 2, y + dashH / 2, 3, dashH, 0x334155);
      this.netDashes.push(dash);
    }

    // ── Paddles ──────────────────────────────────────────────────────
    this.paddleLeft = this.add.rectangle(0, height / 2, 12, 90, 0x6366f1)
      .setOrigin(0, 0.5);
    this.paddleRight = this.add.rectangle(width, height / 2, 12, 90, 0x6366f1)
      .setOrigin(1, 0.5);

    // Glow effect via duplicate slightly-transparent rect
    this.add.rectangle(0, height / 2, 12, 90, 0x6366f1, 0.25).setOrigin(0, 0.5)
      .setScale(2, 1.2);
    this.add.rectangle(width, height / 2, 12, 90, 0x6366f1, 0.25).setOrigin(1, 0.5)
      .setScale(2, 1.2);

    // ── Ball ─────────────────────────────────────────────────────────
    this.ball = this.add.rectangle(width / 2, height / 2, 12, 12, 0xffffff)
      .setOrigin(0, 0);

    // ── Score ────────────────────────────────────────────────────────
    this.scoreText = this.add.text(width / 2, 30, '0  :  0', {
      fontFamily: 'Inter, monospace',
      fontSize: '36px',
      color: '#e2e8f0',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    // ── Status text ──────────────────────────────────────────────────
    this.statusText = this.add.text(width / 2, height / 2, 'Connecting…', {
      fontFamily: 'Inter, monospace',
      fontSize: '22px',
      color: '#94a3b8',
    }).setOrigin(0.5, 0.5);

    // ── Input ────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    };

    // ── WebSocket ────────────────────────────────────────────────────
    this.connectWS();

    // Send input at ~60hz
    this.inputInterval = setInterval(() => this.sendInput(), 1000 / 60);
  }

  update() {
    // Resolve current key state
    const up = this.cursors.up.isDown || this.wasdKeys.W.isDown;
    const down = this.cursors.down.isDown || this.wasdKeys.S.isDown;

    if (up && !down) this.currentDirection = 'up';
    else if (down && !up) this.currentDirection = 'down';
    else this.currentDirection = 'none';
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────

  private connectWS() {
    const url = `${WS_BASE}/game/ws/${this.sessionId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.statusText.setText('');
    };

    this.ws.onmessage = (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string) as {
        type: string;
        state?: PongState;
        message?: string;
      };

      if (msg.type === 'game:state' || msg.type === 'game:tick') {
        if (msg.state) this.applyState(msg.state);
      } else if (msg.type === 'game:over') {
        if (msg.state) this.applyState(msg.state);
        this.handleGameOver(msg.state ?? null);
      } else if (msg.type === 'error') {
        this.statusText.setText(msg.message ?? 'Server error');
      }
    };

    this.ws.onclose = () => {
      if (!this.isGameOver) {
        this.statusText.setText('Disconnected — refresh to reconnect');
      }
      if (this.inputInterval) clearInterval(this.inputInterval);
    };

    this.ws.onerror = () => {
      this.statusText.setText('Cannot connect to server on port 3001');
    };
  }

  private sendInput() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.isGameOver) return;

    this.ws.send(
      JSON.stringify({
        type: 'game:action',
        playerId: this.playerId,
        payload: { direction: this.currentDirection },
      }),
    );
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private applyState(state: PongState) {
    const { width, height } = this.scale;

    // Scale factor (server canvas may differ from Phaser canvas)
    const scaleX = width / (state.width ?? width);
    const scaleY = height / (state.height ?? height);

    const p1 = state.paddles['p1'];
    const p2 = state.paddles['p2'];

    this.paddleLeft.setPosition(p1.x * scaleX, (p1.y + p1.height / 2) * scaleY);
    this.paddleLeft.setSize(p1.width * scaleX, p1.height * scaleY);

    this.paddleRight.setPosition((p2.x + p2.width) * scaleX, (p2.y + p2.height / 2) * scaleY);
    this.paddleRight.setSize(p2.width * scaleX, p2.height * scaleY);

    this.ball.setPosition(state.ball.x * scaleX, state.ball.y * scaleY);
    this.ball.setSize(state.ball.size * scaleX, state.ball.size * scaleY);

    this.scoreText.setText(`${state.scores['p1']}  :  ${state.scores['p2']}`);
  }

  private handleGameOver(state: PongState | null) {
    this.isGameOver = true;
    const winner = state?.winner;
    const msg =
      winner === null
        ? 'Draw!'
        : winner === this.playerId
        ? '🏆 You Win!'
        : '💀 AI Wins!';
    this.statusText.setText(`${msg}\n\nPress R to Restart`);

    this.input.keyboard!.on('keydown-R', () => {
      void this.restartSession();
    });
  }

  private async restartSession() {
    const res = await fetch(`${API_BASE}/game/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: 'pong', aiId: 'pong-heuristic', difficulty: 'medium' }),
    });
    if (!res.ok) return;
    const { sessionId } = (await res.json()) as { sessionId: string };

    this.ws?.close();
    this.isGameOver = false;
    this.statusText.setText('');
    this.scene.restart({ sessionId, playerId: this.playerId } as PongSceneData);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  /** Phaser lifecycle hook called when the scene is shut down */
  shutdown() {
    this.ws?.close();
    if (this.inputInterval) clearInterval(this.inputInterval);
  }
}
