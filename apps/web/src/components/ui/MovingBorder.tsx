"use client";
/**
 * Moving Border – Aceternity UI
 * A button/container with an animated gradient moving around the border.
 * Source: https://ui.aceternity.com/components/moving-border
 */
import React, { useRef } from "react";
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useTransform } from "framer-motion";
import { cn } from "../../lib/utils";

interface MovingBorderProps {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  className?: string;
  containerClassName?: string;
  borderClassName?: string;
  as?: React.ElementType;
  [key: string]: unknown;
}

export function MovingBorder({
  children,
  duration = 2000,
  rx,
  ry,
  className,
  containerClassName,
  borderClassName,
  as: Component = "button",
  ...otherProps
}: MovingBorderProps): React.JSX.Element {
  const pathRef = useRef<SVGRectElement | null>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      const pxPerMillisecond = length / duration;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  const x = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val)?.x ?? 0);
  const y = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val)?.y ?? 0);

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <Component
      className={cn(
        "relative text-xl p-[1px] overflow-hidden bg-transparent",
        containerClassName
      )}
      {...otherProps}
    >
      <div className="absolute inset-0 rounded-[inherit]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute h-full w-full"
          width="100%"
          height="100%"
        >
          <rect fill="none" width="100%" height="100%" rx={rx} ry={ry} ref={pathRef} />
        </svg>
        <motion.div
          style={{ position: "absolute", top: 0, left: 0, display: "inline-block", transform }}
          className={cn(
            "h-20 w-20 opacity-[0.8] bg-[radial-gradient(var(--sky-500)_40%,transparent_60%)]",
            borderClassName
          )}
        />
      </div>
      <div
        className={cn(
          "relative border border-slate-800 bg-black/80 backdrop-blur-xl",
          className
        )}
      >
        {children}
      </div>
    </Component>
  );
}
