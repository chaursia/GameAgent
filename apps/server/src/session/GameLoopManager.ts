/**
 * GameLoopManager
 *
 * Runs server-side autonomous game ticks for every active session.
 *
 * Why a server-side loop?
 *   – The ball must move even if the human stops sending input
 *   – AI decisions must be made at a consistent rate
 *   – Authoritative physics prevent client-side cheating
 *
 * Each session gets its own setInterval at `config.tickRate` fps.
 * The loop sends game:tick / game:over messages to all registered
 * WebSocket sockets for that session.
 */

import type { WebSocket } from '@fastify/websocket';
import type { GameSession } from './SessionManager';
import { sessionManager } from './SessionManager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoopEntry {
  interval: ReturnType<typeof setInterval>;
  sockets: Set<WebSocket>;
}

// ---------------------------------------------------------------------------
// GameLoopManager
// ---------------------------------------------------------------------------

export class GameLoopManager {
  private loops = new Map<string, LoopEntry>();

  // ── Socket registration ──────────────────────────────────────────────────

  /**
   * Register a WebSocket for a session.
   * Starts the game loop for this session if not already running.
   */
  register(sessionId: string, socket: WebSocket): void {
    let entry = this.loops.get(sessionId);

    if (!entry) {
      const session = sessionManager.tryGet(sessionId);
      if (!session) {
        console.warn(`[GameLoop] No session found for ${sessionId}`);
        return;
      }
      entry = {
        interval: this.startLoop(session),
        sockets: new Set(),
      };
      this.loops.set(sessionId, entry);
      console.info(`[GameLoop] Started loop for session ${sessionId} @ ${session.engine.getTickRate()}fps`);
    }

    entry.sockets.add(socket);
  }

  /**
   * Remove a WebSocket from a session.
   * If no sockets remain, the loop is stopped.
   */
  unregister(sessionId: string, socket: WebSocket): void {
    const entry = this.loops.get(sessionId);
    if (!entry) return;

    entry.sockets.delete(socket);

    if (entry.sockets.size === 0) {
      clearInterval(entry.interval);
      this.loops.delete(sessionId);
      console.info(`[GameLoop] Stopped loop for session ${sessionId} (no clients)`);
    }
  }

  /**
   * Broadcast a message to all sockets watching a session.
   */
  broadcast(sessionId: string, msg: unknown): void {
    const entry = this.loops.get(sessionId);
    if (!entry) return;

    const json = JSON.stringify(msg);
    for (const socket of entry.sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(json);
      }
    }
  }

  /**
   * Stop and clean up all loops (e.g. on server shutdown).
   */
  stopAll(): void {
    for (const [id, { interval }] of this.loops) {
      clearInterval(interval);
      console.info(`[GameLoop] Stopped loop for session ${id}`);
    }
    this.loops.clear();
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private startLoop(session: GameSession): ReturnType<typeof setInterval> {
    const tickMs = 1000 / session.engine.getTickRate();

    return setInterval(() => {
      if (session.status !== 'active') {
        this.stopSession(session.id);
        return;
      }

      // AI agent acts based on current state
      const stateBefore = session.engine.getState();
      const agent = session.agentP2 ?? session.agentP1;
      if (agent) {
        const aiAction = agent.act(stateBefore);
        session.engine.applyAction(aiAction);
      }

      // Advance physics
      session.engine.tick();
      const newState = session.engine.getState();

      // Append to replay (only every 3rd tick to reduce memory)
      if (newState.tick % 3 === 0) {
        sessionManager.appendReplay(session.id, {
          tick: newState.tick,
          state: newState,
          timestamp: Date.now(),
        });
      }

      // Check terminal state
      if (session.engine.isGameOver()) {
        session.status = 'finished';
        this.broadcast(session.id, {
          type: 'game:over',
          sessionId: session.id,
          tick: newState.tick,
          state: newState,
          winner: newState.winner,
          scores: newState.scores,
          timestamp: Date.now(),
        });
        this.stopSession(session.id);
        return;
      }

      // Broadcast normal tick
      this.broadcast(session.id, {
        type: 'game:tick',
        sessionId: session.id,
        tick: newState.tick,
        state: newState,
        timestamp: Date.now(),
      });
    }, tickMs);
  }

  private stopSession(sessionId: string): void {
    const entry = this.loops.get(sessionId);
    if (!entry) return;
    clearInterval(entry.interval);
    this.loops.delete(sessionId);
    console.info(`[GameLoop] Loop ended for session ${sessionId}`);
  }
}

/** Singleton game loop manager */
export const gameLoopManager = new GameLoopManager();
