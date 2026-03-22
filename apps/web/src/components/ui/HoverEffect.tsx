"use client";
/**
 * Card Hover Effect – Aceternity UI
 * Cards that animate with a glowing border on hover.
 * Source: https://ui.aceternity.com/components/card-hover-effect
 */
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/utils";

export interface HoverCardItem {
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeVariant?: "accent" | "locked" | "soon";
  locked?: boolean;
}

interface HoverEffectProps {
  items: HoverCardItem[];
  className?: string;
}

export function HoverEffect({ items, className }: HoverEffectProps): React.JSX.Element {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {items.map((item, idx) => (
        <div
          key={item.title}
          className={cn(
            "relative group block p-2 h-full w-full",
            item.locked && "opacity-50"
          )}
          onMouseEnter={() => !item.locked && setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-violet-600/10 block rounded-3xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            )}
          </AnimatePresence>
          <Card locked={!!item.locked}>
            {item.badge && (
              <CardBadge variant={item.badgeVariant ?? "accent"}>{item.badge}</CardBadge>
            )}
            <div className="flex items-center gap-3 mb-3">
              {item.icon && (
                <span className="text-4xl">{item.icon}</span>
              )}
            </div>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </Card>
        </div>
      ))}
    </div>
  );
}

function Card({
  className,
  children,
  locked,
}: {
  className?: string;
  children: React.ReactNode;
  locked?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl h-full w-full p-6 overflow-hidden",
        "bg-black border border-white/[0.08]",
        "group-hover:border-violet-500/50 transition-all duration-300",
        "relative z-20",
        locked && "cursor-not-allowed",
        className
      )}
    >
      <div className="relative z-50">{children}</div>
    </div>
  );
}

function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <h2
      className={cn(
        "font-bold tracking-wide text-zinc-100 text-lg mb-1",
        className
      )}
    >
      {children}
    </h2>
  );
}

function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <p className={cn("text-zinc-400 tracking-wide leading-relaxed text-sm", className)}>
      {children}
    </p>
  );
}

function CardBadge({
  children,
  variant = "accent",
}: {
  children: React.ReactNode;
  variant?: "accent" | "locked" | "soon";
}): React.JSX.Element {
  const styles = {
    accent: "bg-violet-600/20 text-violet-400 border border-violet-500/30",
    locked: "bg-white/5 text-zinc-500 border border-white/10",
    soon: "bg-violet-600/20 text-violet-400 border border-violet-500/30",
  };
  return (
    <span
      className={cn(
        "absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
        styles[variant]
      )}
    >
      {children}
    </span>
  );
}
