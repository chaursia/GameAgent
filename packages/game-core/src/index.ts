/**
 * @gameagent/game-core
 *
 * Foundation types and abstract classes for every game in GameAgent.
 * Games are fully decoupled from AI – they only expose a pure state
 * machine interface so the AI (or a human) can drive them identically.
 */

// ---------------------------------------------------------------------------
// Player types
// ---------------------------------------------------------------------------

/** Who is controlling a given slot in the game */
export type PlayerType = 'human' | 'ai' | 'spectator';

/** Identifies a player side (P1 = left/bottom, P2 = right/top) */
export type PlayerId = 'p1' | 'p2';

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * A discrete intention sent by a player or agent on each tick.
 * Concrete games extend this with their own payload shape.
 *
 * @example
 * // Pong action
 * interface PongAction extends Action {
 *   direction: 'up' | 'down' | 'none';
 * }
 */
export interface Action {
  /** Which player is acting */
  playerId: PlayerId;
  /** Timestamp the action was created (ms since epoch) */
  timestamp: number;
  /** Arbitrary game-specific payload */
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Game State
// ---------------------------------------------------------------------------

/**
 * The complete, serialisable snapshot of a game at a single point in time.
 * Concrete games extend this interface with their own fields.
 */
export interface GameState {
  /** Monotonically increasing tick counter */
  tick: number;
  /** Whether the game has ended */
  isOver: boolean;
  /** Winner, if determined. null = draw / not yet decided */
  winner: PlayerId | null;
  /** Scores per player */
  scores: Record<PlayerId, number>;
  /** Arbitrary game-specific state fields */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Game Config
// ---------------------------------------------------------------------------

/** Static configuration passed to a game when it is created */
export interface GameConfig {
  /** Unique identifier for this session */
  sessionId: string;
  /** Who controls each slot */
  players: Record<PlayerId, PlayerType>;
  /** Target frames-per-second for the game loop */
  tickRate: number;
  /** Any game-specific settings */
  settings?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Game Engine (abstract)
// ---------------------------------------------------------------------------

/**
 * Every game in GameAgent MUST extend this abstract class.
 *
 * The four core methods form a pure state machine:
 *   getState()        → observe the world
 *   applyAction()     → mutate the world
 *   isGameOver()      → check termination
 *   getReward()       → score the last transition (for RL)
 *
 * Games must NOT contain any AI logic – they are dumb physics / rule engines.
 */
export abstract class GameEngine {
  protected config: GameConfig;
  protected state!: GameState;

  constructor(config: GameConfig) {
    this.config = config;
    this.state = this.createInitialState();
  }

  // ------------------------------------------------------------------
  // MUST implement
  // ------------------------------------------------------------------

  /**
   * Build and return the starting state for a fresh game.
   * Called once in the constructor.
   */
  protected abstract createInitialState(): GameState;

  /**
   * Return a deep copy of the current game state.
   * Deep-copy is important so AI agents cannot accidentally mutate state.
   */
  abstract getState(): GameState;

  /**
   * Apply a player action and advance the game by one tick.
   * Must be deterministic given the same state + action.
   */
  abstract applyAction(action: Action): void;

  /**
   * Advance the game clock by one tick without any player action.
   * Used for physics updates / NPC movement etc.
   */
  abstract tick(): void;

  /** Returns true when the game has reached a terminal state */
  abstract isGameOver(): boolean;

  /**
   * Returns the reward signal for the LAST transition.
   * +1 = good for playerId, -1 = bad, 0 = neutral.
   * Used by learning-based brains; heuristic brains can ignore this.
   */
  abstract getReward(playerId: PlayerId): number;

  // ------------------------------------------------------------------
  // Helpers (concrete, shared by all games)
  // ------------------------------------------------------------------

  /** Convenience: return the game's unique session ID */
  getSessionId(): string {
    return this.config.sessionId;
  }

  /** Return the tick rate configured for this session */
  getTickRate(): number {
    return this.config.tickRate;
  }

  /**
   * Reset the game to its initial state.
   * Useful for training loops that run many episodes.
   */
  reset(): void {
    this.state = this.createInitialState();
  }
}

// ---------------------------------------------------------------------------
// Game Events (for WebSocket broadcasting)
// ---------------------------------------------------------------------------

export type GameEventType =
  | 'game:start'
  | 'game:tick'
  | 'game:action'
  | 'game:over'
  | 'game:reset';

export interface GameEvent<T extends GameState = GameState> {
  type: GameEventType;
  sessionId: string;
  tick: number;
  state: T;
  timestamp: number;
}
