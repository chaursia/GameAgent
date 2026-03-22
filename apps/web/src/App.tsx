/**
 * App.tsx – Premium GameAgent Landing Page
 *
 * Highly polished UI featuring:
 *  - Floating Nav (Smooth scroll tracking)
 *  - Aurora Background (Hero section)
 *  - Meteor Showers (Dynamic cards)
 *  - Card Spotlight (Premium hover effects)
 *  - Glassmorphism & High-contrast Aceternity typography
 */

import React, { useEffect, useState } from "react";
import { AuroraBackground } from "./components/ui/AuroraBackground";
import { TypewriterEffect } from "./components/ui/TypewriterEffect";
import { FloatingNav } from "./components/ui/FloatingNav";
import { CardSpotlight } from "./components/ui/CardSpotlight";
import { ShimmerButton } from "./components/ui/ShimmerButton";
import { GameCanvas } from "./components/GameCanvas";
import { Server, Activity, Disc3, Zap, Brain, Sparkles, Gamepad2 } from "lucide-react";

// ── Server Status ──────────────────────────────────────────────────────
type ServerStatus = "checking" | "online" | "offline";

// ── Hero words ─────────────────────────────────────────────────────────
const heroWords = [
  { text: "Play", className: "text-white" },
  { text: "2D", className: "text-white" },
  { text: "games", className: "text-white" },
  { text: "against", className: "text-white" },
  { text: "intelligent", className: "text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" },
  { text: "A.I.", className: "text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" },
];

export default function App(): React.JSX.Element {
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const [serverVersion, setServerVersion] = useState<string>("");
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [selectedGame, setSelectedGame] = useState<'pong' | 'tictactoe' | 'quarto' | 'pentago'>('pong');

  const GAME_LABELS: Record<string, string> = {
    pong: '🏓 Pong', tictactoe: '❌ Tic-Tac-Toe', quarto: '♟ Quarto', pentago: '⚪ Pentago',
  };

  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then((d: { status: string; version: string }) => {
        setServerStatus("online");
        setServerVersion(d.version);
      })
      .catch(() => setServerStatus("offline"));
  }, []);

  const navItems = [
    { name: "Games", link: "#games" },
    { name: "Play", link: "#play" },
    { name: "Architecture", link: "#architecture" },
    { name: "Difficulty", link: "#difficulty" },
    {
      name:
        serverStatus === "online" ? (
          <span className="flex items-center gap-1.5"><Server className="w-4 h-4 text-emerald-500 animate-pulse" /> v{serverVersion}</span>
        ) : serverStatus === "offline" ? (
          <span className="flex items-center gap-1.5"><Server className="w-4 h-4 text-red-500" /> Offline</span>
        ) : (
          <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-amber-500 animate-pulse" /> Checking</span>
        ),
      link: "#",
    },
  ];

  return (
    <div className="dark bg-black min-h-screen text-slate-100 selection:bg-indigo-500/30 font-sans antialiased overflow-x-hidden">
      <FloatingNav navItems={navItems} />

      {/* ── Hero Section with Aurora ── */}
      <AuroraBackground className="fixed inset-0 z-0 h-screen w-screen" showRadialGradient={true}>
        <div className="relative z-10 flex flex-col items-center justify-center pt-20 px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-950/20 text-indigo-200 text-xs font-semibold tracking-[0.2em] mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(79,70,229,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            SELF-HOSTED · EXTENSIBLE
          </div>

          <TypewriterEffect
            words={heroWords}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight drop-shadow-2xl"
            cursorClassName="bg-indigo-500"
          />

          <p className="mt-8 text-slate-400 text-lg md:text-xl max-w-2xl leading-relaxed font-medium">
            GameAgent is a modular platform where you challenge AI opponents with
            handcrafted personalities — running entirely on your machine.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
            <ShimmerButton
              shimmerColor="#818cf8"
              background="rgba(15, 23, 42, 0.8)"
              shimmerDuration="2.5s"
              className="rounded-2xl px-8 py-4 font-bold text-sm shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] border-indigo-500/20 backdrop-blur-md hover:scale-105 transition-transform"
              onClick={() => document.getElementById("games")?.scrollIntoView({ behavior: "smooth" })}
            >
              <span className="tracking-wide">Explore Games →</span>
            </ShimmerButton>
            <a
              href="https://github.com/chaursia/GameAgent"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-sm font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all hover:scale-105"
            >
              View Source
            </a>
          </div>
        </div>
      </AuroraBackground>

      {/* Empty block to push content down below fixed Aurora hero */}
      <div className="h-[100vh] w-full" />

      {/* ── Main Content Container ── */}
      <div className="relative z-20 bg-black/80 backdrop-blur-3xl border-t border-white/5 shadow-[0_-40px_100px_rgba(0,0,0,0.8)] pb-24">
        
        {/* ── Games Section ── */}
        <section id="games" className="py-32 px-6 max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-20 text-center">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Choose your arena</h2>
            <div className="h-1 w-20 bg-gradient-to-r from-indigo-500 to-purple-500 mt-6 rounded-full" />
            <p className="text-slate-400 mt-6 max-w-xl text-lg">
              Every game is an isolated plugin interacting with the core engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pong */}
            <CardSpotlight className="h-[360px] flex flex-col justify-between" color="rgba(99, 102, 241, 0.15)">
              <div className="relative z-10">
                <div className="inline-flex px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-6">Live ✓</div>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400 mb-3">Pong</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Heuristic AI with trajectory prediction. 4 difficulty levels + personality sliders.</p>
              </div>
              <div className="text-6xl self-end text-slate-500 group-hover/spotlight:text-indigo-400 group-hover/spotlight:scale-110 group-hover/spotlight:-rotate-12 transition-all duration-500">
                <Disc3 className="w-14 h-14" strokeWidth={1.5} />
              </div>
            </CardSpotlight>

            {/* Tic-Tac-Toe */}
            <CardSpotlight className="h-[360px] flex flex-col justify-between" color="rgba(99, 241, 170, 0.08)">
              <div className="relative z-10">
                <div className="inline-flex px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-6">Live ✓</div>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400 mb-3">Tic-Tac-Toe</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Minimax AI with alpha-beta pruning. Perfect play at Expert, intentional errors at Easy.</p>
              </div>
              <div className="self-end text-4xl group-hover/spotlight:scale-110 transition-all duration-500">❌</div>
            </CardSpotlight>

            {/* Quarto */}
            <CardSpotlight className="h-[360px] flex flex-col justify-between" color="rgba(241, 99, 200, 0.08)">
              <div className="relative z-10">
                <div className="inline-flex px-3 py-1 rounded-full border border-pink-500/20 bg-pink-500/10 text-pink-300 text-xs font-bold uppercase tracking-widest mb-6">Live ✓</div>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400 mb-3">Quarto</h3>
                <p className="text-slate-400 text-sm leading-relaxed">16 unique pieces, 4 binary attributes. Heuristic AI that avoids giving dangerous pieces.</p>
              </div>
              <div className="self-end text-4xl group-hover/spotlight:scale-110 transition-all duration-500">♟</div>
            </CardSpotlight>

            {/* Pentago */}
            <CardSpotlight className="h-[360px] flex flex-col justify-between" color="rgba(99, 170, 241, 0.08)">
              <div className="relative z-10">
                <div className="inline-flex px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-300 text-xs font-bold uppercase tracking-widest mb-6">Live ✓</div>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400 mb-3">Pentago</h3>
                <p className="text-slate-400 text-sm leading-relaxed">6×6 marble board. Place + rotate a quadrant each turn. Five in a row wins.</p>
              </div>
              <div className="self-end text-4xl group-hover/spotlight:scale-110 transition-all duration-500">⚪</div>
            </CardSpotlight>
          </div>
        </section>

        <section id="play" className="py-32 px-6 max-w-5xl mx-auto">
          <div className="flex flex-col items-center mb-16 text-center">
            <div className="inline-flex px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">
              Live Demo
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Play vs AI</h2>
            <div className="h-1 w-20 bg-gradient-to-r from-indigo-500 to-purple-500 mt-6 rounded-full" />
            <p className="text-slate-400 mt-6 max-w-xl text-lg">
              Real AI opponents running on the server — self-hosted and open-source.
            </p>

            {/* Game Selector Tabs */}
            <div className="flex flex-wrap gap-2 mt-8 justify-center">
              {(['pong', 'tictactoe', 'quarto', 'pentago'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGame(g)}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                    selectedGame === g
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                      : 'bg-transparent border-white/10 text-slate-400 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {GAME_LABELS[g]}
                </button>
              ))}
            </div>

            {/* Difficulty Selector — only meaningful for Pong */}
            {selectedGame === 'pong' && (
              <div className="flex gap-3 mt-6">
                {(['easy', 'medium', 'hard', 'expert'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider border transition-all ${
                      difficulty === d
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                        : 'bg-transparent border-white/10 text-slate-400 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          <GameCanvas
            gameId={selectedGame}
            difficulty={difficulty}
            playerId="p1"
            className="w-full"
          />

          <p className="text-center text-slate-600 text-xs font-mono mt-6">
            Start the backend server on port 3001 to enable the games.
          </p>
        </section>

        {/* ── AI System Section ── */}
        <section id="ai-system" className="py-32 px-6 max-w-7xl mx-auto">
          <div className="border-t border-white/5 pt-32">
            <div className="flex flex-col items-center mb-20 text-center">
              <div className="inline-flex px-3 py-1 rounded-full border border-pink-500/20 bg-pink-500/10 text-pink-300 text-xs font-bold uppercase tracking-widest mb-4">
                AI Architecture
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">The Brain System</h2>
              <div className="h-1 w-20 bg-gradient-to-r from-pink-500 to-indigo-500 mt-6 rounded-full" />
              <p className="text-slate-400 mt-6 max-w-2xl text-lg">
                Every AI agent is composed of a <span className="text-pink-300 font-semibold">Brain</span> (pure decision logic) 
                wrapped by a <span className="text-indigo-300 font-semibold">Personality</span> (human-likeness modifiers). 
                Swap either layer without touching the other.
              </p>
            </div>

            {/* Architecture Diagram */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-20">
              {[
                { label: 'GameState', color: 'border-slate-600 text-slate-300 bg-slate-900/60', arrow: true },
                { label: 'Brain.decide()', color: 'border-indigo-500/40 text-indigo-300 bg-indigo-950/60', arrow: true },
                { label: 'Personality filter', color: 'border-pink-500/40 text-pink-300 bg-pink-950/60', arrow: true },
                { label: 'Action', color: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/60', arrow: false },
              ].map(({ label, color, arrow }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className={`px-6 py-3 rounded-xl border font-mono text-sm font-bold ${color}`}>
                    {label}
                  </div>
                  {arrow && <div className="text-slate-600 text-2xl hidden md:block">→</div>}
                </div>
              ))}
            </div>

            {/* Difficulty Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {([
                {
                  level: 'Easy', color: 'emerald', borderColor: 'border-emerald-500/20', bgColor: 'bg-emerald-500/5',
                  stats: [
                    { name: 'Accuracy', value: 45 },
                    { name: 'Reaction Speed', value: 15 },
                    { name: 'Aggression', value: 30 },
                    { name: 'Adaptability', value: 10 },
                  ],
                  description: 'Slow reactions, frequent mistakes. Great for learning.',
                  mistakeRate: '35%',
                },
                {
                  level: 'Medium', color: 'blue', borderColor: 'border-blue-500/20', bgColor: 'bg-blue-500/5',
                  stats: [
                    { name: 'Accuracy', value: 72 },
                    { name: 'Reaction Speed', value: 50 },
                    { name: 'Aggression', value: 50 },
                    { name: 'Adaptability', value: 40 },
                  ],
                  description: 'Balanced performance. A fair challenge for most players.',
                  mistakeRate: '15%',
                },
                {
                  level: 'Hard', color: 'orange', borderColor: 'border-orange-500/20', bgColor: 'bg-orange-500/5',
                  stats: [
                    { name: 'Accuracy', value: 90 },
                    { name: 'Reaction Speed', value: 80 },
                    { name: 'Aggression', value: 70 },
                    { name: 'Adaptability', value: 70 },
                  ],
                  description: 'Tight tracking, rare mistakes. Demands precise play.',
                  mistakeRate: '6%',
                },
                {
                  level: 'Expert', color: 'red', borderColor: 'border-red-500/20', bgColor: 'bg-red-500/5',
                  stats: [
                    { name: 'Accuracy', value: 100 },
                    { name: 'Reaction Speed', value: 100 },
                    { name: 'Aggression', value: 90 },
                    { name: 'Adaptability', value: 95 },
                  ],
                  description: 'Near-perfect trajectory prediction. Almost unbeatable.',
                  mistakeRate: '1%',
                },
              ] as const).map(({ level, color, borderColor, bgColor, stats, description, mistakeRate }) => (
                <div key={level} className={`rounded-2xl border ${borderColor} ${bgColor} p-6 flex flex-col gap-4 backdrop-blur-md`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-white">{level}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border border-${color}-500/30 bg-${color}-500/10 text-${color}-300`}>
                      {mistakeRate} error
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
                  <div className="space-y-3">
                    {stats.map(({ name, value }) => (
                      <div key={name}>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>{name}</span>
                          <span className="text-slate-400">{value}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${color}-500 rounded-full transition-all duration-700`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Personality trait legend */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'reactionTime', desc: 'Delay before each action (0=instant, 1=slow)' },
                { name: 'mistakeRate', desc: 'Probability the AI replaces optimal action with a random one' },
                { name: 'aggression', desc: 'Scoring vs. defending balance (0=defensive, 1=offensive)' },
                { name: 'adaptability', desc: 'How quickly the AI updates its model of the opponent' },
              ].map(({ name, desc }) => (
                <div key={name} className="bg-black/30 border border-white/5 rounded-xl p-4">
                  <div className="font-mono text-xs text-indigo-300 mb-2">.{name}</div>
                  <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Architecture Section (Premium Redesign) ── */}
        <section id="architecture" className="py-32 px-6">
          <div className="max-w-7xl mx-auto border-t border-white/5 pt-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-6">
                  Architecture
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  Built for scale.<br />
                  <span className="text-slate-500">Designed for AI.</span>
                </h2>
                <div className="mt-8 space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group hover:bg-indigo-500/20 transition-colors">
                      <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-200">Pure State Machines</h4>
                      <p className="text-slate-400 mt-2 leading-relaxed">Games have zero knowledge of AI. They purely process state and state mutations via the engine interface.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/20 group hover:bg-pink-500/20 transition-colors">
                      <Brain className="w-6 h-6 group-hover:scale-110 group-hover:rotate-3 transition-transform" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-200">Pluggable Brains</h4>
                      <p className="text-slate-400 mt-2 leading-relaxed">From simple heuristics to advanced Proximal Policy Optimization (PPO), swap out the brain layer instantaneously.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 group hover:bg-amber-500/20 transition-colors">
                      <Sparkles className="w-6 h-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-200">Humanized AI</h4>
                      <p className="text-slate-400 mt-2 leading-relaxed">The Personality layer injects intentional mistakes and models reaction times to prevent robotic perfection.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Premium Code / Diagram Block */}
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0d1117] p-8 lg:p-12">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/10 rounded-full blur-[80px]" />
                
                <div className="relative z-10 font-mono text-sm leading-relaxed">
                  <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-4 text-slate-500 text-xs">systems_architecture.ts</span>
                  </div>
                  <div className="text-indigo-400">interface <span className="text-pink-300">GameEngine</span> {'{'}</div>
                  <div className="pl-4 text-slate-300">getState(): <span className="text-teal-300">GameState</span>;</div>
                  <div className="pl-4 text-slate-300">applyAction(a: <span className="text-teal-300">Action</span>): <span className="text-indigo-400">void</span>;</div>
                  <div className="pl-4 text-slate-300">tick(dt: <span className="text-indigo-400">number</span>): <span className="text-indigo-400">void</span>;</div>
                  <div className="text-indigo-400">{'}'}</div>
                  
                  <br />
                  <div className="text-indigo-400">class <span className="text-pink-300">Agent</span> {'{'}</div>
                  <div className="pl-4 text-slate-300">private <span className="text-sky-300">brain</span>: <span className="text-teal-300">Brain</span>;</div>
                  <div className="pl-4 text-slate-300">private <span className="text-sky-300">personality</span>: <span className="text-teal-300">Personality</span>;</div>
                  <br />
                  <div className="pl-4 text-slate-500">// Simulates human response curve</div>
                  <div className="pl-4 text-slate-300">async decide(): <span className="text-teal-300">Promise</span>{'<Action> {'}</div>
                  <div className="pl-8 text-slate-300">await <span className="text-sky-200">delay</span>(this.personality.reactionMs);</div>
                  <div className="pl-8 text-slate-300">return this.brain.<span className="text-sky-200">evaluate</span>();</div>
                  <div className="pl-4 text-indigo-400">{'}'}</div>
                  <div className="text-indigo-400">{'}'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="mt-32 border-t border-white/10 bg-black/50 py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 hover:text-indigo-400 transition-colors cursor-pointer group">
              <Gamepad2 className="w-8 h-8 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
              <span className="font-bold text-xl tracking-widest text-white group-hover:text-indigo-400 transition-colors">
                GameAgent
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">
              MIT License &nbsp;·&nbsp; Open Source &nbsp;·&nbsp; <a href="https://github.com/chaursia/GameAgent" className="text-indigo-400 hover:text-indigo-300 transition-colors">GitHub</a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
