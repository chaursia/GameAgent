/**
 * PersonalitySliders
 *
 * A collapsible panel that lets the user fine-tune individual
 * AI personality traits beyond the four preset difficulty levels.
 *
 * Each slider maps 0–100 to the 0.0–1.0 range used by the Personality interface.
 * Default values are filled in from the selected difficulty preset.
 */

import { useState } from 'react';
import type { Personality } from '@gameagent/ai-core';

// ── Trait metadata ──────────────────────────────────────────────────────────

interface TraitMeta {
  key: keyof Personality;
  label: string;
  description: string;
  lowLabel: string;
  highLabel: string;
  accentColor: string;
}

const TRAITS: TraitMeta[] = [
  {
    key: 'reactionTime',
    label: 'Reaction Time',
    description: 'How long the AI waits before acting on a decision.',
    lowLabel: 'Instant',
    highLabel: 'Delayed',
    accentColor: '#6366f1',
  },
  {
    key: 'mistakeRate',
    label: 'Mistake Rate',
    description: 'Probability of replacing the optimal action with a random one.',
    lowLabel: 'Perfect',
    highLabel: 'Clumsy',
    accentColor: '#ec4899',
  },
  {
    key: 'aggression',
    label: 'Aggression',
    description: 'Balance between scoring and defensive play.',
    lowLabel: 'Defensive',
    highLabel: 'Aggressive',
    accentColor: '#f97316',
  },
  {
    key: 'adaptability',
    label: 'Adaptability',
    description: 'How quickly the AI learns from opponent patterns.',
    lowLabel: 'Static',
    highLabel: 'Adaptive',
    accentColor: '#10b981',
  },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface PersonalitySlidersProps {
  value: Personality;
  onChange: (updated: Personality) => void;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function PersonalitySliders({ value, onChange, className = '' }: PersonalitySlidersProps) {
  const [open, setOpen] = useState(false);

  function handleChange(key: keyof Personality, sliderVal: number) {
    onChange({ ...value, [key]: sliderVal / 100 });
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition-all"
      >
        <span className="flex items-center gap-2">
          <span className="text-indigo-400">⚙</span>
          Advanced Personality Settings
        </span>
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Slider panel */}
      {open && (
        <div className="mt-3 p-5 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm space-y-5">
          <p className="text-slate-500 text-xs">
            Customise each personality trait independently. These override the selected difficulty preset.
          </p>
          {TRAITS.map(({ key, label, description, lowLabel, highLabel, accentColor }) => {
            const pct = Math.round(value[key] * 100);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-slate-200 text-sm font-semibold">{label}</span>
                    <p className="text-slate-500 text-xs mt-0.5">{description}</p>
                  </div>
                  <span
                    className="text-sm font-mono font-bold ml-4 min-w-[3rem] text-right"
                    style={{ color: accentColor }}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Custom range slider */}
                <div className="relative mt-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={pct}
                    onChange={(e) => handleChange(key, Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10"
                    style={{
                      background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                    <span>{lowLabel}</span>
                    <span>{highLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Reset to defaults hint */}
          <p className="text-slate-600 text-xs text-center pt-1">
            Select a difficulty above to reset these values to their preset.
          </p>
        </div>
      )}
    </div>
  );
}
