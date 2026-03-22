/**
 * @gameagent/plugins
 *
 * Plugin system that decouples game implementations and AI agents
 * from the core engine.
 *
 * A "plugin" is simply a factory function registered under a string key.
 * The server dynamically loads game + AI plugins without importing them
 * directly, which keeps the core packages lean.
 *
 * Usage:
 *   registry.registerGame(pongPlugin);
 *   registry.registerAI(pongHeuristicPlugin);
 *
 *   const game = registry.createGame('pong', config);
 *   const agent = registry.createAI('pong-heuristic', 'p2');
 */

import type { GameEngine, GameConfig, PlayerId } from '@gameagent/game-core';
import type { Agent } from '@gameagent/ai-core';

// ---------------------------------------------------------------------------
// Game plugin
// ---------------------------------------------------------------------------

/** Metadata + factory for a game implementation */
export interface GamePlugin {
  /** Unique slug, e.g. "pong" */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Short description shown in the UI */
  description: string;
  /** URL-safe icon path (served from web/public) */
  iconUrl?: string;
  /** Maximum simultaneous players for this game */
  maxPlayers: 1 | 2 | 4;
  /** Create a fully initialised GameEngine for a session */
  factory: (config: GameConfig) => GameEngine;
}

// ---------------------------------------------------------------------------
// AI plugin
// ---------------------------------------------------------------------------

/** Metadata + factory for an AI implementation */
export interface AIPlugin {
  /** Unique slug, e.g. "pong-heuristic" */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Which games this AI supports (matches GamePlugin.id) */
  supportedGames: string[];
  /** Create a fully initialised Agent for a player slot */
  factory: (playerId: PlayerId) => Agent;
}

// ---------------------------------------------------------------------------
// Plugin Registry
// ---------------------------------------------------------------------------

/**
 * Central registry that holds all registered game and AI plugins.
 *
 * Single instance per server process – export the singleton `registry`.
 */
export class PluginRegistry {
  private games = new Map<string, GamePlugin>();
  private ais = new Map<string, AIPlugin>();

  // ── Game plugins ──────────────────────────────────────────────────

  /** Register a game plugin. Throws if the id is already taken. */
  registerGame(plugin: GamePlugin): void {
    if (this.games.has(plugin.id)) {
      throw new Error(`Game plugin "${plugin.id}" is already registered.`);
    }
    this.games.set(plugin.id, plugin);
    console.info(`[PluginRegistry] Registered game: ${plugin.id}`);
  }

  /** Return metadata for all registered games (for the API / UI) */
  listGames(): GamePlugin[] {
    return Array.from(this.games.values());
  }

  /** Create a new GameEngine instance for the given game id */
  createGame(gameId: string, config: GameConfig): GameEngine {
    const plugin = this.games.get(gameId);
    if (!plugin) {
      throw new Error(`Unknown game: "${gameId}". Did you register the plugin?`);
    }
    return plugin.factory(config);
  }

  // ── AI plugins ────────────────────────────────────────────────────

  /** Register an AI plugin. Throws if the id is already taken. */
  registerAI(plugin: AIPlugin): void {
    if (this.ais.has(plugin.id)) {
      throw new Error(`AI plugin "${plugin.id}" is already registered.`);
    }
    this.ais.set(plugin.id, plugin);
    console.info(`[PluginRegistry] Registered AI: ${plugin.id}`);
  }

  /** Return metadata for all registered AI agents */
  listAIs(): AIPlugin[] {
    return Array.from(this.ais.values());
  }

  /** Return AIs that support a specific game */
  listAIsForGame(gameId: string): AIPlugin[] {
    return this.listAIs().filter((ai) => ai.supportedGames.includes(gameId));
  }

  /** Create a new Agent instance for the given AI id */
  createAI(aiId: string, playerId: PlayerId): Agent {
    const plugin = this.ais.get(aiId);
    if (!plugin) {
      throw new Error(`Unknown AI: "${aiId}". Did you register the plugin?`);
    }
    return plugin.factory(playerId);
  }
}

/** Singleton registry – import this everywhere */
export const registry = new PluginRegistry();
