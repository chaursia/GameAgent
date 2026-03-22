/**
 * SessionManager
 *
 * Manages all active game sessions in memory.
 * Each session holds:
 *  - A running GameEngine instance
 *  - An Agent (or null for human players on that side)
 *  - Action + state history for replay
 *
 * In a production deployment this would be backed by Redis so sessions
 * survive server restarts. The interface is designed for that future swap.
 */

import type { GameEngine, GameState, Action } from '@gameagent/game-core';
import type { Agent } from '@gameagent/ai-core';

// ---------------------------------------------------------------------------
// Session data model
// ---------------------------------------------------------------------------

export type SessionStatus = 'waiting' | 'active' | 'paused' | 'finished';

export interface SessionReplayEntry {
  tick: number;
  state: GameState;
  action?: Action;
  timestamp: number;
}

export interface GameSession {
  /** Unique session identifier (UUID) */
  id: string;
  /** Which game plugin is being played */
  gameId: string;
  /** Which AI plugin is being used */
  aiId: string;
  /** The live game engine */
  engine: GameEngine;
  /** AI agent for P2 (null if P2 is human) */
  agentP2: Agent | null;
  /** AI agent for P1 (null if P1 is human) */
  agentP1: Agent | null;
  /** Current lifecycle status */
  status: SessionStatus;
  /** Full history for replay – every state + action */
  replay: SessionReplayEntry[];
  /** When this session was created (ms since epoch) */
  createdAt: number;
  /** When this session last received activity */
  lastActiveAt: number;
}

// ---------------------------------------------------------------------------
// Session Manager
// ---------------------------------------------------------------------------

export class SessionManager {
  private sessions = new Map<string, GameSession>();

  /** Session TTL: 30 minutes of inactivity → auto-evict */
  private static readonly SESSION_TTL_MS = 30 * 60 * 1000;

  constructor() {
    // Periodic cleanup of expired sessions every 5 minutes
    setInterval(() => this.evictExpired(), 5 * 60 * 1000);
  }

  // ------------------------------------------------------------------
  // CRUD
  // ------------------------------------------------------------------

  /** Store a newly created session */
  create(session: GameSession): void {
    this.sessions.set(session.id, session);
    console.info(`[SessionManager] Created session ${session.id} (${session.gameId})`);
  }

  /** Retrieve a session by id; throws if not found */
  get(sessionId: string): GameSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.lastActiveAt = Date.now();
    return session;
  }

  /** Try to get a session without throwing (returns undefined) */
  tryGet(sessionId: string): GameSession | undefined {
    return this.sessions.get(sessionId);
  }

  /** Remove a session immediately */
  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.info(`[SessionManager] Deleted session ${sessionId}`);
  }

  /** List all sessions (for admin / debugging) */
  list(): GameSession[] {
    return Array.from(this.sessions.values());
  }

  // ------------------------------------------------------------------
  // Replay helpers
  // ------------------------------------------------------------------

  /** Append a replay entry to the session history */
  appendReplay(sessionId: string, entry: SessionReplayEntry): void {
    const session = this.get(sessionId);
    session.replay.push(entry);
  }

  /** Return the full replay for a session */
  getReplay(sessionId: string): SessionReplayEntry[] {
    return this.get(sessionId).replay;
  }

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  private evictExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActiveAt > SessionManager.SESSION_TTL_MS) {
        this.sessions.delete(id);
        console.info(`[SessionManager] Evicted expired session ${id}`);
      }
    }
  }

  /** How many sessions are currently active */
  get size(): number {
    return this.sessions.size;
  }
}

/** Singleton session manager used across the server */
export const sessionManager = new SessionManager();
