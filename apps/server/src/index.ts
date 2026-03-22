/**
 * GameAgent – Fastify Server Entry Point
 *
 * Starts the HTTP + WebSocket server on port 3001.
 * Plugins are loaded from the @gameagent/plugins registry before routes
 * are registered, so routes always have access to all game/AI factories.
 *
 * PORT can be overridden with the PORT env variable.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { gameRoutes } from './routes/game';

// ---------------------------------------------------------------------------
// Bootstrap plugins into the registry
// ---------------------------------------------------------------------------
// Import side-effects that register built-in game + AI plugins.
// Each import calls registry.registerGame() / registry.registerAI().
// When you add a new game, simply add its import here.

// (Pong plugin will be imported here in Phase 3)
// import '@gameagent/plugins/pong';

// ---------------------------------------------------------------------------
// Main async startup (wrap top-level awaits for CommonJS compatibility)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // ── Create Fastify instance ──────────────────────────────────────────────

  const server = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // ── Register core Fastify plugins ────────────────────────────────────────

  // CORS – allow the Vite dev server (port 5173) and prod origin
  await server.register(cors, {
    origin: [
      'http://localhost:5173', // Vite dev
      'http://localhost:3000', // Alternative dev
      (process.env['FRONTEND_ORIGIN'] as string) ?? '',
    ].filter(Boolean),
    credentials: true,
  });

  // WebSocket support (used by /game/ws/:sessionId)
  await server.register(websocket);

  // ── Register application routes ──────────────────────────────────────────

  await server.register(gameRoutes, { prefix: '' });

  // Health check (useful for docker / load balancer probes)
  server.get('/health', async () => ({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  }));

  // ── Start listening ──────────────────────────────────────────────────────

  const PORT = Number(process.env['PORT'] ?? 3001);
  const HOST = process.env['HOST'] ?? '0.0.0.0';

  try {
    await server.listen({ port: PORT, host: HOST });
    console.info(`\n🎮 GameAgent server running at http://localhost:${PORT}\n`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Run and handle unhandled errors
main().catch((err: unknown) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
