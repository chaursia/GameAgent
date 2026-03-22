/**
 * GameCanvas – generic multi-game canvas
 *
 * Supports: pong, tictactoe, quarto, pentago
 * Picks the correct Phaser scene and game parameters based on gameId.
 */

import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { PongScene } from '../scenes/PongScene';
import type { PongSceneData } from '../scenes/PongScene';
import { TicTacToeScene } from '../scenes/TicTacToeScene';
import type { TicTacToeSceneData } from '../scenes/TicTacToeScene';
import { QuartoScene } from '../scenes/QuartoScene';
import type { QuartoSceneData } from '../scenes/QuartoScene';
import { PentagoScene } from '../scenes/PentagoScene';
import type { PentagoSceneData } from '../scenes/PentagoScene';
import { PONG_WIDTH, PONG_HEIGHT } from '@gameagent/plugins';
import { DIFFICULTY_PRESETS } from '@gameagent/ai-core';
import type { Personality, DifficultyLevel } from '@gameagent/ai-core';
import { PersonalitySliders } from './PersonalitySliders';

const API_BASE = '';

// ── Game config map ───────────────────────────────────────────────────────────

interface GameCfg {
  gameId: string;
  aiId: string;
  sceneKey: string;
  width: number;
  height: number;
  label: string;
  instructions: string;
}

const GAME_CFGS: Record<string, GameCfg> = {
  pong: {
    gameId: 'pong', aiId: 'pong-heuristic', sceneKey: 'PongScene',
    width: PONG_WIDTH, height: PONG_HEIGHT,
    label: '▶  Play Pong',
    instructions: 'Use ↑ ↓ arrow keys or W / S to move your paddle',
  },
  tictactoe: {
    gameId: 'tictactoe', aiId: 'tictactoe-minimax', sceneKey: 'TicTacToeScene',
    width: 560, height: 560,
    label: '▶  Play Tic-Tac-Toe',
    instructions: 'Click a cell to place your mark (you are X)',
  },
  quarto: {
    gameId: 'quarto', aiId: 'quarto-heuristic', sceneKey: 'QuartoScene',
    width: 640, height: 700,
    label: '▶  Play Quarto',
    instructions: 'Click pieces from the tray to give them · Click the board to place',
  },
  pentago: {
    gameId: 'pentago', aiId: 'pentago-heuristic', sceneKey: 'PentagoScene',
    width: 620, height: 680,
    label: '▶  Play Pentago',
    instructions: 'Click a cell to place your marble · Then click a rotation button',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface GameCanvasProps {
  gameId?: string;
  difficulty?: DifficultyLevel;
  playerId?: 'p1' | 'p2';
  className?: string;
}

type UIState = 'idle' | 'loading' | 'playing' | 'error';

export function GameCanvas({
  gameId = 'pong',
  difficulty = 'medium',
  playerId = 'p1',
  className = '',
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef      = useRef<Phaser.Game | null>(null);
  const [uiState, setUiState] = useState<UIState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [personality, setPersonality] = useState<Personality>({ ...DIFFICULTY_PRESETS[difficulty] });
  const cfg = GAME_CFGS[gameId] ?? GAME_CFGS.pong;

  useEffect(() => { setPersonality({ ...DIFFICULTY_PRESETS[difficulty] }); }, [difficulty]);
  useEffect(() => { return () => { gameRef.current?.destroy(true); gameRef.current = null; }; }, []);

  async function startGame() {
    if (!containerRef.current) return;
    setUiState('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: cfg.gameId, aiId: cfg.aiId, difficulty, personality }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error: string }).error ?? 'Server error');

      const { sessionId } = (await res.json()) as { sessionId: string };
      gameRef.current?.destroy(true);
      gameRef.current = null;

      // Pick the right scene
      let scene: Phaser.Scene;
      let sceneData: PongSceneData | TicTacToeSceneData | QuartoSceneData | PentagoSceneData;

      if (gameId === 'pong') {
        scene = new PongScene();
        sceneData = { sessionId, playerId };
      } else if (gameId === 'tictactoe') {
        scene = new TicTacToeScene();
        sceneData = { sessionId, playerId };
      } else if (gameId === 'quarto') {
        scene = new QuartoScene();
        sceneData = { sessionId, playerId };
      } else {
        scene = new PentagoScene();
        sceneData = { sessionId, playerId };
      }

      const phaserCfg: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: cfg.width,
        height: cfg.height,
        parent: containerRef.current,
        backgroundColor: '#0a0a0f',
        scene: [scene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      };

      const game = new Phaser.Game(phaserCfg);
      gameRef.current = game;

      game.events.once('ready', () => {
        game.scene.start(cfg.sceneKey, sceneData);
      });

      setUiState('playing');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setUiState('error');
    }
  }

  function stopGame() {
    gameRef.current?.destroy(true);
    gameRef.current = null;
    setUiState('idle');
  }

  return (
    <div className={`relative flex flex-col gap-4 ${className}`}>
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0f]"
        style={{ aspectRatio: `${cfg.width}/${cfg.height}` }}
      />

      {uiState !== 'playing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-sm rounded-2xl">
          {uiState === 'error' && (
            <p className="text-red-400 text-sm font-mono px-6 text-center max-w-md">{errorMsg}</p>
          )}
          <button
            onClick={() => void startGame()}
            disabled={uiState === 'loading'}
            className="group relative px-10 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-lg tracking-wide transition-all hover:scale-105 shadow-[0_0_40px_rgba(99,102,241,0.4)]"
          >
            {uiState === 'loading' ? (
              <span className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Starting…
              </span>
            ) : cfg.label}
          </button>
          <p className="text-slate-500 text-xs font-mono text-center px-4">{cfg.instructions}</p>
        </div>
      )}

      {uiState === 'playing' && (
        <button
          onClick={stopGame}
          className="self-center px-6 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/30 text-sm font-semibold transition-all"
        >
          ✕ End Game
        </button>
      )}

      {/* Personality sliders — only for Pong */}
      {gameId === 'pong' && uiState !== 'playing' && (
        <PersonalitySliders value={personality} onChange={setPersonality} />
      )}
    </div>
  );
}
