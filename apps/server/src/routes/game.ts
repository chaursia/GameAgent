/**
 * /game routes
 *
 * REST endpoints:
 *   POST  /game/start   – create a new session
 *   POST  /game/action  – submit a human action
 *   GET   /game/state   – get current session state
 *   GET   /game/replay  – get full replay for a session
 *   GET   /game/list    – list available games + AIs
 *
 * WebSocket:
 *   WS    /game/ws/:sessionId – real-time bidirectional game loop
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { registry } from '@gameagent/plugins';
import { sessionManager } from '../session/SessionManager';
import type { GameSession } from '../session/SessionManager';
import type { Action } from '@gameagent/game-core';

// ---------------------------------------------------------------------------
// Zod schemas (input validation)
// ---------------------------------------------------------------------------

const StartGameSchema = z.object({
  gameId: z.string().min(1),
  /** AI plugin id for P2, or null for a second human */
  aiId: z.string().min(1),
  /** Difficulty level if the AI supports presets */
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional().default('medium'),
});

const ActionSchema = z.object({
  sessionId: z.string().uuid(),
  playerId: z.enum(['p1', 'p2']),
  payload: z.record(z.unknown()),
});

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function gameRoutes(fastify: FastifyInstance): Promise<void> {
  // ── POST /game/start ──────────────────────────────────────────────────────

  fastify.post('/game/start', async (request, reply) => {
    const body = StartGameSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }

    const { gameId, aiId } = body.data;
    const sessionId = uuidv4();

    // Create the game engine via the plugin registry
    const engine = registry.createGame(gameId, {
      sessionId,
      players: { p1: 'human', p2: 'ai' },
      tickRate: 60,
    });

    // Create the AI agent for P2
    const agentP2 = registry.createAI(aiId, 'p2');

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
      initialState: engine.getState(),
    });
  });

  // ── POST /game/action ─────────────────────────────────────────────────────

  fastify.post('/game/action', async (request, reply) => {
    const body = ActionSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }

    const { sessionId, playerId, payload } = body.data;

    let session: GameSession;
    try {
      session = sessionManager.get(sessionId);
    } catch {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return reply.status(409).send({ error: `Session is ${session.status}` });
    }

    // Apply human action
    const humanAction: Action = {
      playerId,
      timestamp: Date.now(),
      payload,
    };
    session.engine.applyAction(humanAction);

    // Let AI respond
    let aiAction: Action | null = null;
    const agent = playerId === 'p1' ? session.agentP2 : session.agentP1;
    if (agent) {
      const state = session.engine.getState();
      aiAction = agent.act(state);
      session.engine.applyAction(aiAction);
      agent.observeOpponentAction(humanAction, state);
    }

    // Advance one physics tick
    session.engine.tick();
    const newState = session.engine.getState();

    // Record in replay
    sessionManager.appendReplay(sessionId, {
      tick: newState.tick,
      state: newState,
      action: humanAction,
      timestamp: Date.now(),
    });

    // Check terminal state
    if (session.engine.isGameOver()) {
      session.status = 'finished';
    }

    return reply.send({
      state: newState,
      aiAction,
      isOver: session.engine.isGameOver(),
      reward: session.engine.getReward(playerId),
    });
  });

  // ── GET /game/state ───────────────────────────────────────────────────────

  fastify.get<{ Querystring: { sessionId: string } }>(
    '/game/state',
    async (request, reply) => {
      const { sessionId } = request.query;
      if (!sessionId) {
        return reply.status(400).send({ error: 'sessionId query param required' });
      }

      const session = sessionManager.tryGet(sessionId);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
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
        return reply.status(400).send({ error: 'sessionId query param required' });
      }

      const session = sessionManager.tryGet(sessionId);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      return reply.send({ sessionId, replay: sessionManager.getReplay(sessionId) });
    },
  );

  // ── GET /game/list ────────────────────────────────────────────────────────

  fastify.get('/game/list', async (_request, reply) => {
    return reply.send({
      games: registry.listGames(),
      ais: registry.listAIs(),
    });
  });

  // ── WS /game/ws/:sessionId ────────────────────────────────────────────────

  fastify.get(
    '/game/ws/:sessionId',
    { websocket: true },
    (socket, request) => {
      // `request.params` is typed via FastifyRequest
      const { sessionId } = request.params as { sessionId: string };
      const session = sessionManager.tryGet(sessionId);

      if (!session) {
        socket.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
        socket.close();
        return;
      }

      console.info(`[WS] Client connected to session ${sessionId}`);

      // Send current state immediately on connect
      socket.send(
        JSON.stringify({
          type: 'game:state',
          sessionId,
          state: session.engine.getState(),
        }),
      );

      // Handle incoming messages from the client
      socket.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as {
            type: string;
            playerId: 'p1' | 'p2';
            payload: Record<string, unknown>;
          };

          if (msg.type === 'game:action') {
            const humanAction: Action = {
              playerId: msg.playerId,
              timestamp: Date.now(),
              payload: msg.payload,
            };

            session.engine.applyAction(humanAction);

            // AI responds
            const agent = msg.playerId === 'p1' ? session.agentP2 : session.agentP1;
            if (agent) {
              const state = session.engine.getState();
              const aiAction = agent.act(state);
              session.engine.applyAction(aiAction);
            }

            session.engine.tick();
            const newState = session.engine.getState();

            sessionManager.appendReplay(sessionId, {
              tick: newState.tick,
              state: newState,
              action: humanAction,
              timestamp: Date.now(),
            });

            if (session.engine.isGameOver()) {
              session.status = 'finished';
            }

            socket.send(
              JSON.stringify({
                type: session.engine.isGameOver() ? 'game:over' : 'game:tick',
                sessionId,
                tick: newState.tick,
                state: newState,
                timestamp: Date.now(),
              }),
            );
          }
        } catch (err) {
          console.error('[WS] Message parse error:', err);
          socket.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
        }
      });

      socket.on('close', () => {
        console.info(`[WS] Client disconnected from session ${sessionId}`);
      });
    },
  );
}
