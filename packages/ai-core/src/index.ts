/**
 * @gameagent/ai-core
 *
 * Layered AI architecture:
 *
 *  Brain      – pure decision logic (heuristic / RL / hybrid)
 *  Personality – behaviour modifier that makes AI feel human
 *  Agent      – composes Brain + Personality into a game-ready actor
 *
 * Every concrete AI must extend Brain and optionally tune Personality.
 * The system is designed so new Brain types can be swapped in without
 * touching the Agent or Personality layers.
 */

import type { Action, GameState, PlayerId } from '@gameagent/game-core';

// ---------------------------------------------------------------------------
// Personality
// ---------------------------------------------------------------------------

/**
 * Human-likeness parameters that post-process the Brain's raw decision.
 *
 * All values are 0–1 unless noted otherwise.
 */
export interface Personality {
  /**
   * Extra delay the agent adds before executing its decision.
   * 0 = instant (bot-like), 1 = up to MAX_REACTION_DELAY ms.
   */
  reactionTime: number;

  /**
   * Probability (0–1) that the agent replaces its optimal action
   * with a random one, simulating human mistakes.
   */
  mistakeRate: number;

  /**
   * Influences how aggressively the agent pursues scoring vs defending.
   * 0 = fully defensive, 1 = fully offensive.
   */
  aggression: number;

  /**
   * How quickly the agent adapts its strategy based on opponent patterns.
   * 0 = static strategy, 1 = rapid adaptation.
   */
  adaptability: number;
}

/** Maximum added reaction delay in milliseconds */
export const MAX_REACTION_DELAY_MS = 400;

// ---------------------------------------------------------------------------
// Difficulty presets
// ---------------------------------------------------------------------------

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

/**
 * Pre-built Personality configurations keyed by difficulty.
 * Consumers can spread these and override individual fields.
 */
export const DIFFICULTY_PRESETS: Record<DifficultyLevel, Personality> = {
  easy: {
    reactionTime: 0.85, // very slow
    mistakeRate: 0.35, // frequent mistakes
    aggression: 0.3,
    adaptability: 0.1,
  },
  medium: {
    reactionTime: 0.5,
    mistakeRate: 0.15,
    aggression: 0.5,
    adaptability: 0.4,
  },
  hard: {
    reactionTime: 0.2,
    mistakeRate: 0.06,
    aggression: 0.7,
    adaptability: 0.7,
  },
  expert: {
    reactionTime: 0.0, // near-instant
    mistakeRate: 0.01, // almost never mistakes
    aggression: 0.9,
    adaptability: 0.95,
  },
};

// ---------------------------------------------------------------------------
// Brain (abstract)
// ---------------------------------------------------------------------------

/**
 * Base class for all decision-making logic.
 *
 * Subclasses override `decide()` with the actual algorithm.
 * They may also override `onOpponentAction()` for adaptation.
 *
 * Brain knows NOTHING about Personality – that wrapping happens in Agent.
 */
export abstract class Brain {
  /** Unique identifier for this brain type, e.g. "pong-heuristic" */
  abstract readonly brainId: string;

  /**
   * Core decision method.
   *
   * @param state   Deep-copied game state (read-only from agent's POV)
   * @param playerId Which player this brain is playing as
   * @returns The chosen action
   */
  abstract decide(state: Readonly<GameState>, playerId: PlayerId): Action;

  /**
   * Optional hook: called when the opponent acts.
   * Used by adaptive brains to model the opponent.
   */
  onOpponentAction(_action: Action, _state: Readonly<GameState>): void {
    // default: no-op
  }

  /**
   * Optional hook: called at the start of a new episode/game.
   * Used by learning brains to reset episode-specific memory.
   */
  onEpisodeStart(): void {
    // default: no-op
  }
}

// ---------------------------------------------------------------------------
// BrainContext (helper passed to Brain.decide in future extensions)
// ---------------------------------------------------------------------------

/** Additional context a Brain may receive alongside the raw GameState */
export interface BrainContext {
  /** How many ticks have elapsed since the episode started */
  elapsedTicks: number;
  /** History of the last N states (for temporal reasoning) */
  stateHistory: ReadonlyArray<GameState>;
  /** History of opponent's last N actions */
  opponentHistory: ReadonlyArray<Action>;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * An Agent wraps a Brain and a Personality.
 *
 * It intercepts the Brain's raw decision and applies Personality modifiers:
 *  – Injects reaction delays
 *  – Randomly replaces decisions with mistakes
 *  – Tracks opponent history for adaptive brains
 *
 * This separation means you can attach ANY Brain to ANY Personality preset
 * without changing any Brain-level code.
 */
export class Agent {
  readonly brain: Brain;
  private _personality: Personality;
  readonly playerId: PlayerId;

  private opponentHistory: Action[] = [];
  private stateHistory: GameState[] = [];
  private elapsedTicks = 0;

  /** Max state history stored for temporal reasoning */
  private static readonly MAX_HISTORY = 30;

  constructor(brain: Brain, personality: Personality, playerId: PlayerId) {
    this.brain = brain;
    this._personality = { ...personality };
    this.playerId = playerId;
  }

  /** Read current personality */
  get personality(): Readonly<Personality> {
    return this._personality;
  }

  /** Replace personality (e.g. from custom slider values) */
  setPersonality(p: Personality): void {
    this._personality = { ...p };
  }
  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Main entry point: given the current game state return the action
   * the agent will take this tick, with all Personality modifiers applied.
   */
  act(state: Readonly<GameState>): Action {
    // 1. Record state for context / history
    this.recordState(state);

    // 2. Optionally skip this tick entirely (simulating slow reaction)
    if (this.shouldSkipTick()) {
      return this.makeNoOpAction(state);
    }

    // 3. Ask the brain for a raw decision
    let action = this.brain.decide(state, this.playerId);

    // 4. Apply mistake rate – randomly corrupt the action
    if (Math.random() < this.personality.mistakeRate) {
      action = this.makeMistakeAction(action, state);
    }

    return action;
  }

  /**
   * Inform the agent of an opponent action (for adaptive brains).
   * Call this every tick after you process the opponent's action.
   */
  observeOpponentAction(action: Action, state: Readonly<GameState>): void {
    this.opponentHistory.push(action);
    if (this.opponentHistory.length > Agent.MAX_HISTORY) {
      this.opponentHistory.shift();
    }
    this.brain.onOpponentAction(action, state);
  }

  /** Reset the agent for a new game episode */
  reset(): void {
    this.opponentHistory = [];
    this.stateHistory = [];
    this.elapsedTicks = 0;
    this.brain.onEpisodeStart();
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private recordState(state: Readonly<GameState>): void {
    this.elapsedTicks++;
    this.stateHistory.push(state as GameState);
    if (this.stateHistory.length > Agent.MAX_HISTORY) {
      this.stateHistory.shift();
    }
  }

  /**
   * Decide whether to "freeze" this tick based on reactionTime.
   * Higher reactionTime → more likely to skip (slower agent).
   */
  private shouldSkipTick(): boolean {
    return Math.random() < this.personality.reactionTime * 0.3;
  }

  /**
   * Build a no-op action (hold position / do nothing).
   * Concrete games recognise a `payload.noOp: true` field.
   */
  private makeNoOpAction(state: Readonly<GameState>): Action {
    return {
      playerId: this.playerId,
      timestamp: Date.now(),
      payload: { noOp: true, tick: state.tick },
    };
  }

  /**
   * Corrupt the optimal action to simulate a human mistake.
   * The corruption strategy is intentionally game-agnostic:
   * it simply sets a `mistake: true` flag; concrete BrainInterpreters
   * can use this to choose a suboptimal move.
   */
  private makeMistakeAction(action: Action, _state: Readonly<GameState>): Action {
    return {
      ...action,
      payload: { ...action.payload, mistake: true },
    };
  }
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Convenience: create an Agent from a difficulty preset */
export function createAgentWithDifficulty(
  brain: Brain,
  difficulty: DifficultyLevel,
  playerId: PlayerId,
): Agent {
  const personality = { ...DIFFICULTY_PRESETS[difficulty] };
  return new Agent(brain, personality, playerId);
}
