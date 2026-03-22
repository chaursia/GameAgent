/**
 * PongHeuristicBrain
 *
 * A deterministic heuristic AI for Pong.
 * Predicts where the ball will cross the paddle's x-plane and moves
 * toward that y-position, with an optional "focus zone" for higher
 * difficulty (tighter tracking) and deliberate imprecision for lower.
 */

import { Brain, type Agent } from '@gameagent/ai-core';
import type { Action, GameState, PlayerId } from '@gameagent/game-core';
import type { PongState, PongDirection } from './PongGame';

export class PongHeuristicBrain extends Brain {
  override readonly brainId = 'pong-heuristic';

  /**
   * Accuracy coefficient (0–1).
   * 1.0 = tracks ball exactly, < 1.0 = paddles to a noisier target.
   * Injected via personality.adaptability in the Agent wrapper,
   * but can also be set directly for testing.
   */
  accuracyCoeff: number;

  constructor(accuracyCoeff = 1.0) {
    super();
    this.accuracyCoeff = accuracyCoeff;
  }

  override decide(state: Readonly<GameState>, playerId: PlayerId): Action {
    const s = state as PongState;
    const paddle = s.paddles[playerId];
    const ball = s.ball;

    // Is the ball moving toward this paddle?
    const movingToward =
      (playerId === 'p1' && ball.vx < 0) ||
      (playerId === 'p2' && ball.vx > 0);

    const targetY = movingToward
      ? this.predictBallY(s, playerId)
      : s.height / 2; // Return to center when ball moves away

    const paddleCenter = paddle.y + paddle.height / 2;
    const deadzone = paddle.height * 0.1; // Don't micro-jitter near center

    let direction: PongDirection = 'none';
    if (paddleCenter < targetY - deadzone) {
      direction = 'down';
    } else if (paddleCenter > targetY + deadzone) {
      direction = 'up';
    }

    return {
      playerId,
      timestamp: Date.now(),
      payload: { direction } as Record<string, unknown>,
    };
  }

  /**
   * Simulate ball trajectory until it reaches the paddle's x-plane,
   * bouncing off top/bottom walls. Returns the predicted y coordinate.
   */
  private predictBallY(s: PongState, playerId: PlayerId): number {
    const paddleX =
      playerId === 'p1'
        ? s.paddles.p1.x + s.paddles.p1.width
        : s.paddles.p2.x;

    let { x, y, vx, vy } = s.ball;
    let maxSteps = 300; // Prevent infinite loop

    while (maxSteps-- > 0) {
      x += vx;
      y += vy;

      // Wall bounce
      if (y <= 0) { y = 0; vy = Math.abs(vy); }
      if (y + s.ball.size >= s.height) { y = s.height - s.ball.size; vy = -Math.abs(vy); }

      // Reached the paddle plane?
      if (
        (playerId === 'p1' && x <= paddleX) ||
        (playerId === 'p2' && x + s.ball.size >= paddleX)
      ) {
        break;
      }
    }

    // Apply accuracy — blend predicted y with center
    const center = s.height / 2;
    return y * this.accuracyCoeff + center * (1 - this.accuracyCoeff);
  }
}

/**
 * Factory helper used by the AIPlugin definition.
 * The Agent wrapper applies personality (reaction time, mistakes etc.)
 * on top of this pure brain.
 */
export function createPongHeuristicBrain(accuracyCoeff: number): PongHeuristicBrain {
  return new PongHeuristicBrain(accuracyCoeff);
}

// Satisfy the import but keep the file side-effect free
export type { Agent };
