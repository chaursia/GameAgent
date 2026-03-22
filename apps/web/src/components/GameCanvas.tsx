/**
 * GameCanvas
 *
 * React component that manages the full Pong game flow:
 *  1. Starts a session via POST /game/start
 *  2. Mounts a Phaser game instance running PongScene
 *  3. Tears down Phaser gracefully on unmount
 */

import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { PongScene } from '../scenes/PongScene';
import type { PongSceneData } from '../scenes/PongScene';
import { PONG_WIDTH, PONG_HEIGHT } from '@gameagent/plugins';

const API_BASE = 'http://localhost:3001';

interface GameCanvasProps {
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  playerId?: 'p1' | 'p2';
  className?: string;
}

type UIState = 'idle' | 'loading' | 'playing' | 'error';

export function GameCanvas({
  difficulty = 'medium',
  playerId = 'p1',
  className = '',
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [uiState, setUiState] = useState<UIState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Tear-down on unmount
  useEffect(() => {
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  async function startGame() {
    if (!containerRef.current) return;
    setUiState('loading');
    setErrorMsg('');

    try {
      // 1. Create a server session
      const res = await fetch(`${API_BASE}/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: 'pong', aiId: 'pong-heuristic', difficulty }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? 'Server error');
      }

      const { sessionId } = (await res.json()) as { sessionId: string };

      // 2. Destroy any existing Phaser game
      gameRef.current?.destroy(true);
      gameRef.current = null;

      // 3. Mount Phaser
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: PONG_WIDTH,
        height: PONG_HEIGHT,
        parent: containerRef.current,
        backgroundColor: '#0a0a0f',
        scene: [PongScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      // 4. Pass session data to the scene after it initialises
      game.events.once('ready', () => {
        const sceneData: PongSceneData = { sessionId, playerId };
        game.scene.start('PongScene', sceneData);
      });

      setUiState('playing');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setUiState('error');
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Phaser canvas mount point */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0f]"
        style={{ aspectRatio: `${PONG_WIDTH}/${PONG_HEIGHT}` }}
      />

      {/* Overlay — shown until game starts */}
      {uiState !== 'playing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-sm rounded-2xl">
          {uiState === 'error' && (
            <p className="text-red-400 text-sm font-mono px-6 text-center">{errorMsg}</p>
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
            ) : (
              '▶  Play Pong'
            )}
          </button>

          <p className="text-slate-500 text-xs font-mono">
            Use ↑ ↓ arrow keys or W / S to move your paddle
          </p>
        </div>
      )}
    </div>
  );
}
