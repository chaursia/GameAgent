"use client";
/**
 * Shimmer Button – Aceternity UI
 * A button with a shimmer animation running across it.
 * Source: https://ui.aceternity.com/components/shimmer-button
 */
import React from "react";
import { cn } from "../../lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  children: React.ReactNode;
  className?: string;
}

export function ShimmerButton({
  shimmerColor = "#ffffff",
  shimmerSize = "0.05em",
  shimmerDuration = "3s",
  borderRadius = "100px",
  background = "rgba(0, 0, 0, 1)",
  className,
  children,
  ...props
}: ShimmerButtonProps): React.JSX.Element {
  return (
    <button
      style={
        {
          "--spread": "90deg",
          "--shimmer-color": shimmerColor,
          "--radius": borderRadius,
          "--speed": shimmerDuration,
          "--cut": shimmerSize,
          "--bg": background,
        } as React.CSSProperties
      }
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap",
        "border border-white/10 px-8 py-3 text-white",
        "[background:var(--bg)] [border-radius:var(--radius)]",
        "transition-shadow duration-300 ease-in-out hover:shadow-[0_0_40px_8px_rgba(139,92,246,0.3)]",
        className
      )}
      {...props}
    >
      {/* Shimmer layer */}
      <div
        className={cn(
          "absolute inset-0 overflow-visible [container-type:size]",
          "[--shimmer:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]"
        )}
      >
        <div className="absolute inset-[-100%] animate-shimmer [aspect-ratio:1] [background:var(--shimmer)] [translate:0_0]" />
      </div>

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2 text-sm font-semibold tracking-wide">
        {children}
      </span>

      {/* Glow border */}
      <div
        className={cn(
          "absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]"
        )}
      />
    </button>
  );
}
