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
import { Meteors } from "./components/ui/Meteors";
import { FloatingNav } from "./components/ui/FloatingNav";
import { CardSpotlight } from "./components/ui/CardSpotlight";
import { ShimmerButton } from "./components/ui/ShimmerButton";
import { Server, Activity, Disc3, Grid3X3, PlugZap, Zap, Brain, Sparkles, Gamepad2 } from "lucide-react";

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
              href="https://github.com"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pong Card */}
            <CardSpotlight className="h-[400px] flex flex-col justify-between" color="rgba(99, 102, 241, 0.15)">
              <div className="relative z-10">
                <div className="inline-flex px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-6">
                  Phase 3
                </div>
                <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400 mb-4">Pong</h3>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Classic paddle game with heuristic AI. Adjustable difficulty from learning mode to absolute expert.
                </p>
              </div>
              <div className="text-6xl self-end text-slate-500 group-hover/spotlight:text-indigo-400 group-hover/spotlight:scale-110 group-hover/spotlight:-rotate-12 transition-all duration-500">
                <Disc3 className="w-16 h-16" strokeWidth={1.5} />
              </div>
            </CardSpotlight>

            {/* Snake Card (Meteor) */}
            <div className="relative h-[400px] w-full rounded-3xl overflow-hidden border border-white/10 bg-slate-900/50 shadow-2xl flex flex-col justify-between p-8 group">
              <Meteors number={15} />
              <div className="relative z-10">
                <div className="inline-flex px-3 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                  Coming Soon
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">Snake</h3>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Navigate, grow, and outmaneuver the AI on a shared grid. Tactical spatial reasoning required.
                </p>
              </div>
              <div className="text-6xl self-end text-slate-600 group-hover:text-emerald-400 group-hover:scale-110 group-hover:translate-x-2 transition-all duration-500">
                <Grid3X3 className="w-16 h-16" strokeWidth={1.5} />
              </div>
            </div>

            {/* Plugin Card */}
            <CardSpotlight className="h-[400px] flex flex-col justify-between" color="rgba(236, 72, 153, 0.1)">
              <div className="relative z-10">
                <div className="inline-flex px-3 py-1 rounded-full border border-pink-500/20 bg-pink-500/10 text-pink-300 text-xs font-bold uppercase tracking-widest mb-6">
                  Extensible
                </div>
                <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400 mb-4">Add a Plugin</h3>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Implement the <code className="text-pink-300 bg-pink-950/50 px-1.5 py-0.5 rounded text-sm">GameEngine</code> interface and register your own custom game logic instantly.
                </p>
              </div>
              <div className="text-6xl self-end text-slate-500 group-hover/spotlight:text-pink-400 group-hover/spotlight:scale-110 group-hover/spotlight:rotate-12 transition-all duration-500">
                <PlugZap className="w-16 h-16" strokeWidth={1.5} />
              </div>
            </CardSpotlight>
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
              MIT License &nbsp;·&nbsp; Open Source &nbsp;·&nbsp; <a href="https://github.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">GitHub</a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
