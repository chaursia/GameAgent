/**
 * PongScene – Phaser 3 Scene
 *
 * Phase 6+ — Smooth client-side prediction:
 *
 *   BEFORE: Paddle moved by waiting for server tick → applied via applyState()
 *           Result: ~16 ms+ perceived input latency, jerky movement
 *
 *   AFTER:  Local paddle moves immediately in Phaser's update() loop (~16ms)
 *           Server state still received at 60fps but used ONLY to reconcile
 *           the opponent paddle and ball. Local paddle reconciles lazily.
 *
 * This gives instant, smooth local input while the server remains authoritative.
 */

import Phaser from 'phaser';
import type { PongState } from '@gameagent/plugins';

// ── Constants ────────────────────────────────────────────────────────────────

// Use relative paths — Vite dev proxy forwards these to localhost:3001
const WS_BASE = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
const API_BASE = '';  // empty = same origin (relative fetch)

// Paddle speed in pixels per second (local prediction)
const PADDLE_SPEED_PPS = 400;

// Maximum reconciliation correction per frame (lerp factor)
const RECONCILE_ALPHA = 0.15;

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

  // Session state
  private ws: WebSocket | null = null;
  private sessionId = '';
  private playerId: 'p1' | 'p2' = 'p1';
  private isGameOver = false;

  // Local prediction — the predicted Y of the local paddle (in canvas pixels)
  private localPaddleY = 0;         // centre Y
  private serverPaddleY = 0;        // last authoritative Y from server
  private paddleHeight = 90;        // updated from server state

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key };
  private currentDirection: 'up' | 'down' | 'none' = 'none';

  // Input throttle — only send WS message when direction changes or every N ms
  private lastSentDirection: 'up' | 'down' | 'none' = 'none';
  private lastSendTime = 0;
  private readonly SEND_INTERVAL_MS = 1000 / 60; // 60 hz cap

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
    this.localPaddleY = height / 2;
    this.serverPaddleY = height / 2;

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
  }

  // ── Update loop ───────────────────────────────────────────────────────────

  update(_time: number, delta: number) {
    if (this.isGameOver) return;

    const { height } = this.scale;
    const halfH = this.paddleHeight / 2;

    // 1. Read keyboard state
    const up   = this.cursors.up.isDown   || this.wasdKeys.W.isDown;
    const down = this.cursors.down.isDown || this.wasdKeys.S.isDown;

    if (up && !down)        this.currentDirection = 'up';
    else if (down && !up)   this.currentDirection = 'down';
    else                    this.currentDirection = 'none';

    // 2. Move local paddle immediately (client-side prediction)
    const speedPx = PADDLE_SPEED_PPS * (delta / 1000);
    if (this.currentDirection === 'up')   this.localPaddleY -= speedPx;
    if (this.currentDirection === 'down') this.localPaddleY += speedPx;

    // Clamp to canvas bounds
    this.localPaddleY = Phaser.Math.Clamp(this.localPaddleY, halfH, height - halfH);

    // 3. Gently reconcile toward server position (elastic correction)
    //    This prevents drifting if the server disagrees, without snapping.
    this.localPaddleY = Phaser.Math.Linear(
      this.localPaddleY,
      this.serverPaddleY,
      RECONCILE_ALPHA * (delta / 16.67), // frame-rate independent
    );

    // 4. Apply predicted position to the local paddle visual
    const localPaddle = this.playerId === 'p1' ? this.paddleLeft : this.paddleRight;
    if (this.playerId === 'p1') {
      localPaddle.setPosition(0, this.localPaddleY);
    } else {
      const { width } = this.scale;
      localPaddle.setPosition(width, this.localPaddleY);
    }

    // 5. Send direction to server (throttled to ~60hz, only when changed)
    const now = performance.now();
    if (
      this.ws?.readyState === WebSocket.OPEN &&
      (this.currentDirection !== this.lastSentDirection || now - this.lastSendTime >= this.SEND_INTERVAL_MS)
    ) {
      this.ws.send(
        JSON.stringify({
          type: 'game:action',
          playerId: this.playerId,
          payload: { direction: this.currentDirection },
        }),
      );
      this.lastSentDirection = this.currentDirection;
      this.lastSendTime = now;
    }
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
    };

    this.ws.onerror = () => {
      this.statusText.setText('Cannot connect to server on port 3001');
    };
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private applyState(state: PongState) {
    const { width, height } = this.scale;

    const scaleX = width  / (state.width  ?? width);
    const scaleY = height / (state.height ?? height);

    const p1 = state.paddles['p1'];
    const p2 = state.paddles['p2'];

    // Update paddle height so local clamping stays accurate
    this.paddleHeight = (this.playerId === 'p1' ? p1.height : p2.height) * scaleY;

    // Update LOCAL paddle server-authoritative target for reconciliation
    const localServerPaddle = this.playerId === 'p1' ? p1 : p2;
    this.serverPaddleY = (localServerPaddle.y + localServerPaddle.height / 2) * scaleY;

    // ── Opponent paddle: snap to server state (no prediction needed) ──
    const opponentPaddle = this.playerId === 'p1' ? this.paddleRight : this.paddleLeft;
    const opponentData   = this.playerId === 'p1' ? p2 : p1;
    if (this.playerId === 'p1') {
      opponentPaddle.setPosition(
        (opponentData.x + opponentData.width) * scaleX,
        (opponentData.y + opponentData.height / 2) * scaleY,
      );
    } else {
      opponentPaddle.setPosition(
        opponentData.x * scaleX,
        (opponentData.y + opponentData.height / 2) * scaleY,
      );
    }
    opponentPaddle.setSize(opponentData.width * scaleX, opponentData.height * scaleY);

    // Also update local paddle SIZE from server (not position — handled in update())
    const localPaddle = this.playerId === 'p1' ? this.paddleLeft : this.paddleRight;
    localPaddle.setSize(
      localServerPaddle.width * scaleX,
      localServerPaddle.height * scaleY,
    );

    // ── Ball: snap to server state ────────────────────────────────────
    this.ball.setPosition(state.ball.x * scaleX, state.ball.y * scaleY);
    this.ball.setSize(state.ball.size * scaleX, state.ball.size * scaleY);

    // ── Score ─────────────────────────────────────────────────────────
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

  shutdown() {
    this.ws?.close();
  }
}
