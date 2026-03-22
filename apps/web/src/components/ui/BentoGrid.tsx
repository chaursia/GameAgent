"use client";
/**
 * Bento Grid – Aceternity UI
 * An asymmetric grid layout inspired by bento boxes for showcasing features.
 * Source: https://ui.aceternity.com/components/bento-grid
 */
import React from "react";
import { cn } from "../../lib/utils";

interface BentoGridProps {
  className?: string;
  children: React.ReactNode;
}

export function BentoGrid({ className, children }: BentoGridProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoGridItemProps {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: BentoGridItemProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none",
        "p-4 dark:bg-black dark:border-white/[0.08] bg-white border border-transparent",
        "flex flex-col space-y-4",
        "hover:border-violet-500/30",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        {icon}
        <div className="font-semibold text-neutral-200 mb-2 mt-2">{title}</div>
        <div className="font-normal text-neutral-400 text-xs">{description}</div>
      </div>
    </div>
  );
}
