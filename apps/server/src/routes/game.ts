/**
 * /game routes – Phase 5 Hardened Version
 *
 * REST endpoints:
 *   POST  /game/start      – create a new session
 *   POST  /game/action     – submit a human action (rate-limited)
 *   GET   /game/state      – get current session state
 *   GET   /game/replay     – get full replay for a session
 *   GET   /game/list       – list available games + AIs
 *   GET   /game/sessions   – admin: list all active sessions
 *   DELETE /game/session   – admin: force-end a session
 *
 * WebSocket:
 *   WS    /game/ws/:sessionId – real-time, server-authoritative game loop
 *
 * Phase 5 additions:
 *   - Server-side autonomous game loop (GameLoopManager)
 *   - Human input applied immediately, AI + physics driven server-side
 *   - WebSocket ping/pong keepalive (30s interval)
 *   - Token-bucket rate limiting on /game/action
 *   - Admin endpoints for session inspection
 *   - Structured error codes for machine-readable client handling
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { registry } from '@gameagent/plugins';
import { sessionManager } from '../session/SessionManager';
import { gameLoopManager } from '../session/GameLoopManager';
import { checkActionRate } from '../middleware/rateLimit';
import type { GameSession } from '../session/SessionManager';
import type { Action } from '@gameagent/game-core';

// ---------------------------------------------------------------------------
// Zod schemas (input validation)
// ---------------------------------------------------------------------------

const StartGameSchema = z.object({
  gameId: z.string().min(1),
  aiId: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional().default('medium'),
});

const ActionSchema = z.object({
  sessionId: z.string().uuid(),
  playerId: z.enum(['p1', 'p2']),
  payload: z.record(z.unknown()),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a serialisable summary of a session for admin endpoints */
function sessionSummary(session: GameSession) {
  const state = session.engine.getState();
  return {
    id: session.id,
    gameId: session.gameId,
    aiId: session.aiId,
    status: session.status,
    tick: state.tick,
    scores: state.scores,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
    replayLength: session.replay.length,
  };
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function gameRoutes(fastify: FastifyInstance): Promise<void> {
  // ── POST /game/start ──────────────────────────────────────────────────────

  fastify.post('/game/start', async (request, reply) => {
    const body = StartGameSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: body.error.flatten(),
      });
    }

    const { gameId, aiId, difficulty } = body.data;

    // Validate plugins exist before creating the session
    const availableGames = registry.listGames().map((g) => g.id);
    const availableAIs = registry.listAIs().map((a) => a.id);
    if (!availableGames.includes(gameId)) {
      return reply.status(404).send({ error: 'GAME_NOT_FOUND', gameId });
    }
    if (!availableAIs.includes(aiId)) {
      return reply.status(404).send({ error: 'AI_NOT_FOUND', aiId });
    }

    const sessionId = uuidv4();

    const engine = registry.createGame(gameId, {
      sessionId,
      players: { p1: 'human', p2: 'ai' },
      tickRate: 60,
    });

    const agentP2 = registry.createAI(aiId, 'p2', difficulty);

    const session: GameSession = {
      id: sessionId,
      gameId,
      aiId,
      engine,
      agentP1: null,
      agentP2,
      status: 'active',
      replay: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    sessionManager.create(session);

    // Record initial state in replay
    sessionManager.appendReplay(sessionId, {
      tick: 0,
      state: engine.getState(),
      timestamp: Date.now(),
    });

    return reply.status(201).send({
      sessionId,
      gameId,
      aiId,
      difficulty,
      wsUrl: `/game/ws/${sessionId}`,
      initialState: engine.getState(),
    });
  });

  // ── POST /game/action ─────────────────────────────────────────────────────

  fastify.post('/game/action', async (request, reply) => {
    const body = ActionSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: body.error.flatten(),
      });
    }

    const { sessionId, playerId, payload } = body.data;

    // Rate limit check
    if (!checkActionRate(sessionId, playerId)) {
      return reply.status(429).send({
        error: 'RATE_LIMITED',
        message: 'Action rate limit exceeded. Max 8 actions/second.',
      });
    }

    let session: GameSession;
    try {
      session = sessionManager.get(sessionId);
    } catch {
      return reply.status(404).send({ error: 'SESSION_NOT_FOUND', sessionId });
    }

    if (session.status !== 'active') {
      return reply.status(409).send({
        error: 'SESSION_INACTIVE',
        status: session.status,
      });
    }

    // Apply human action immediately (server-side loop handles physics tick)
    const humanAction: Action = {
      playerId,
      timestamp: Date.now(),
      payload,
    };
    session.engine.applyAction(humanAction);

    const newState = session.engine.getState();

    return reply.send({
      accepted: true,
      tick: newState.tick,
    });
  });

  // ── GET /game/state ───────────────────────────────────────────────────────

  fastify.get<{ Querystring: { sessionId: string } }>(
    '/game/state',
    async (request, reply) => {
      const { sessionId } = request.query;
      if (!sessionId) {
        return reply.status(400).send({ error: 'MISSING_PARAM', param: 'sessionId' });
      }

      const session = sessionManager.tryGet(sessionId);
      if (!session) {
        return reply.status(404).send({ error: 'SESSION_NOT_FOUND', sessionId });
      }

      return reply.send({
        sessionId,
        status: session.status,
        state: session.engine.getState(),
      });
    },
  );

  // ── GET /game/replay ──────────────────────────────────────────────────────

  fastify.get<{ Querystring: { sessionId: string } }>(
    '/game/replay',
    async (request, reply) => {
      const { sessionId } = request.query;
      if (!sessionId) {
        return reply.status(400).send({ error: 'MISSING_PARAM', param: 'sessionId' });
      }

      const session = sessionManager.tryGet(sessionId);
      if (!session) {
        return reply.status(404).send({ error: 'SESSION_NOT_FOUND', sessionId });
      }

      return reply.send({
        sessionId,
        gameId: session.gameId,
        status: session.status,
        replay: sessionManager.getReplay(sessionId),
      });
    },
  );

  // ── GET /game/list ────────────────────────────────────────────────────────

  fastify.get('/game/list', async (_request, reply) => {
    return reply.send({
      games: registry.listGames().map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        maxPlayers: g.maxPlayers,
        iconUrl: g.iconUrl,
      })),
      ais: registry.listAIs().map((a) => ({
        id: a.id,
        name: a.name,
        supportedGames: a.supportedGames,
      })),
    });
  });

  // ── GET /game/sessions ────────────────────────────────────────────────────

  fastify.get('/game/sessions', async (_request, reply) => {
    const sessions = sessionManager.list().map(sessionSummary);
    return reply.send({
      count: sessions.length,
      sessions,
    });
  });

  // ── DELETE /game/session ──────────────────────────────────────────────────

  fastify.delete<{ Querystring: { sessionId: string } }>(
    '/game/session',
    async (request, reply) => {
      const { sessionId } = request.query;
      if (!sessionId) {
        return reply.status(400).send({ error: 'MISSING_PARAM', param: 'sessionId' });
      }

      const session = sessionManager.tryGet(sessionId);
      if (!session) {
        return reply.status(404).send({ error: 'SESSION_NOT_FOUND', sessionId });
      }

      session.status = 'finished';
      sessionManager.delete(sessionId);

      return reply.send({ deleted: true, sessionId });
    },
  );

  // ── WS /game/ws/:sessionId ────────────────────────────────────────────────

  fastify.get(
    '/game/ws/:sessionId',
    { websocket: true },
    (socket, request) => {
      const { sessionId } = request.params as { sessionId: string };
      const session = sessionManager.tryGet(sessionId);

      if (!session) {
        socket.send(JSON.stringify({ type: 'error', code: 'SESSION_NOT_FOUND' }));
        socket.close();
        return;
      }

      if (session.status !== 'active') {
        socket.send(JSON.stringify({ type: 'error', code: 'SESSION_INACTIVE', status: session.status }));
        socket.close();
        return;
      }

      console.info(`[WS] Client connected to session ${sessionId}`);

      // Register with the game loop — this starts the server-side tick loop
      gameLoopManager.register(sessionId, socket);

      // Send current state immediately on connect
      socket.send(
        JSON.stringify({
          type: 'game:state',
          sessionId,
          state: session.engine.getState(),
          timestamp: Date.now(),
        }),
      );

      // ── WebSocket keepalive (ping every 30s) ────────────────────────────
      const pingInterval = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          socket.ping();
        }
      }, 30_000);

      // ── Message handler ─────────────────────────────────────────────────
      socket.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as {
            type: string;
            playerId: 'p1' | 'p2';
            payload: Record<string, unknown>;
          };

          if (msg.type === 'game:action') {
            if (!msg.playerId || !msg.payload) {
              socket.send(JSON.stringify({ type: 'error', code: 'INVALID_MESSAGE' }));
              return;
            }

            // Rate limit check on WebSocket input
            if (!checkActionRate(sessionId, msg.playerId)) {
              // Silently drop (don't penalise latency with error msgs)
              return;
            }

            const humanAction: Action = {
              playerId: msg.playerId,
              timestamp: Date.now(),
              payload: msg.payload,
            };

            // Apply human paddle movement immediately
            // (server loop independently drives physics + AI)
            session.engine.applyAction(humanAction);
          }
        } catch (err) {
          console.error('[WS] Message parse error:', err);
          socket.send(JSON.stringify({ type: 'error', code: 'PARSE_ERROR' }));
        }
      });

      // ── Cleanup on disconnect ────────────────────────────────────────────
      socket.on('close', () => {
        clearInterval(pingInterval);
        gameLoopManager.unregister(sessionId, socket);
        console.info(`[WS] Client disconnected from session ${sessionId}`);
      });

      socket.on('error', (err: Error) => {
        clearInterval(pingInterval);
        gameLoopManager.unregister(sessionId, socket);
        console.error(`[WS] Socket error for session ${sessionId}:`, err.message);
      });
    },
  );
}
