/**
 * PongGame – GameEngine implementation for classic Pong
 *
 * Physics run at a fixed tickRate (default 60 fps).
 * The engine is completely AI-agnostic; it only knows about
 * game state, paddle movement, and ball physics.
 */

import {
  GameEngine,
  type GameState,
  type Action,
  type PlayerId,
} from '@gameagent/game-core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PONG_WIDTH = 800;
export const PONG_HEIGHT = 600;

const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 90;
const BALL_SIZE = 12;
const PADDLE_SPEED = 6;        // px per tick
const BALL_SPEED_INITIAL = 5;
const BALL_SPEED_MAX = 14;
const BALL_SPEED_INCREMENT = 0.3; // speed boost per paddle hit
const WINNING_SCORE = 5;

// ---------------------------------------------------------------------------
// Pong-specific types
// ---------------------------------------------------------------------------

export interface PaddleState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export interface PongState extends GameState {
  width: number;
  height: number;
  paddles: Record<PlayerId, PaddleState>;
  ball: BallState;
}

export type PongDirection = 'up' | 'down' | 'none';

export interface PongAction extends Action {
  payload: { direction: PongDirection };
}

// ---------------------------------------------------------------------------
// PongGame
// ---------------------------------------------------------------------------

export class PongGame extends GameEngine {
  protected override createInitialState(): PongState {
    return {
      tick: 0,
      isOver: false,
      winner: null,
      scores: { p1: 0, p2: 0 },
      width: PONG_WIDTH,
      height: PONG_HEIGHT,
      paddles: {
        p1: { x: 20, y: PONG_HEIGHT / 2 - PADDLE_HEIGHT / 2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
        p2: { x: PONG_WIDTH - 20 - PADDLE_WIDTH, y: PONG_HEIGHT / 2 - PADDLE_HEIGHT / 2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
      },
      ball: this.resetBall(),
    };
  }

  override getState(): PongState {
    // Deep copy so AI cannot accidentally mutate live state
    return JSON.parse(JSON.stringify(this.state)) as PongState;
  }

  override applyAction(action: Action): void {
    const pong = this.state as PongState;
    const { playerId, payload } = action as PongAction;
    const direction = payload.direction as PongDirection;

    if (direction === 'none' || (payload as Record<string, unknown>)['noOp']) return;

    const paddle = pong.paddles[playerId];
    const dy = direction === 'up' ? -PADDLE_SPEED : PADDLE_SPEED;
    paddle.y = Math.max(0, Math.min(PONG_HEIGHT - paddle.height, paddle.y + dy));
  }

  override tick(): void {
    const s = this.state as PongState;
    if (s.isOver) return;

    s.tick++;
    this.moveBall(s);
  }

  override isGameOver(): boolean {
    return this.state.isOver;
  }

  override getReward(playerId: PlayerId): number {
    const s = this.state as PongState;
    if (!s.isOver) return 0;
    if (s.winner === playerId) return 1;
    if (s.winner === null) return 0;
    return -1;
  }

  // ------------------------------------------------------------------
  // Physics helpers
  // ------------------------------------------------------------------

  private moveBall(s: PongState): void {
    s.ball.x += s.ball.vx;
    s.ball.y += s.ball.vy;

    // Wall bounce (top/bottom)
    if (s.ball.y <= 0) {
      s.ball.y = 0;
      s.ball.vy = Math.abs(s.ball.vy);
    } else if (s.ball.y + s.ball.size >= s.height) {
      s.ball.y = s.height - s.ball.size;
      s.ball.vy = -Math.abs(s.ball.vy);
    }

    // Paddle collisions
    for (const id of ['p1', 'p2'] as PlayerId[]) {
      if (this.ballHitsPaddle(s.ball, s.paddles[id])) {
        this.resolvePaddleCollision(s, id);
      }
    }

    // Score: ball exits left or right
    if (s.ball.x < 0) {
      // P2 scores
      s.scores.p2++;
      this.checkWin(s, 'p2');
      if (!s.isOver) s.ball = this.resetBall(-1);
    } else if (s.ball.x + s.ball.size > s.width) {
      // P1 scores
      s.scores.p1++;
      this.checkWin(s, 'p1');
      if (!s.isOver) s.ball = this.resetBall(1);
    }
  }

  private ballHitsPaddle(ball: BallState, paddle: PaddleState): boolean {
    return (
      ball.x < paddle.x + paddle.width &&
      ball.x + ball.size > paddle.x &&
      ball.y < paddle.y + paddle.height &&
      ball.y + ball.size > paddle.y
    );
  }

  private resolvePaddleCollision(s: PongState, paddleId: PlayerId): void {
    const paddle = s.paddles[paddleId];
    // Reverse horizontal direction
    s.ball.vx = paddleId === 'p1' ? Math.abs(s.ball.vx) : -Math.abs(s.ball.vx);

    // Add slight vertical angle based on hit position
    const hitRelative = (s.ball.y + s.ball.size / 2) - (paddle.y + paddle.height / 2);
    const maxBounce = 5;
    s.ball.vy = (hitRelative / (paddle.height / 2)) * maxBounce;

    // Incremental speed boost (capped)
    const currentSpeed = Math.sqrt(s.ball.vx ** 2 + s.ball.vy ** 2);
    const newSpeed = Math.min(currentSpeed + BALL_SPEED_INCREMENT, BALL_SPEED_MAX);
    const ratio = newSpeed / currentSpeed;
    s.ball.vx *= ratio;
    s.ball.vy *= ratio;
  }

  private checkWin(s: PongState, scorer: PlayerId): void {
    if (s.scores[scorer] >= WINNING_SCORE) {
      s.isOver = true;
      s.winner = scorer;
    }
  }

  private resetBall(xDir?: number): BallState {
    const dir = xDir ?? (Math.random() > 0.5 ? 1 : -1);
    const angle = (Math.random() * 60 - 30) * (Math.PI / 180);
    return {
      x: PONG_WIDTH / 2 - BALL_SIZE / 2,
      y: PONG_HEIGHT / 2 - BALL_SIZE / 2,
      vx: dir * Math.cos(angle) * BALL_SPEED_INITIAL,
      vy: Math.sin(angle) * BALL_SPEED_INITIAL,
      size: BALL_SIZE,
    };
  }
}
