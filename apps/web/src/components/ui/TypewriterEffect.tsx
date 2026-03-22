"use client";
/**
 * Typewriter Effect – Aceternity UI
 * Animated text that types itself character by character.
 * Source: https://ui.aceternity.com/components/typewriter-effect
 */
import React from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "../../lib/utils";

interface TypewriterEffectProps {
  words: { text: string; className?: string }[];
  className?: string;
  cursorClassName?: string;
}

export function TypewriterEffect({
  words,
  className,
  cursorClassName,
}: TypewriterEffectProps): React.JSX.Element {
  // Build the full character array
  const wordsArray = words.map((word) => ({
    ...word,
    text: word.text.split(""),
  }));

  const ref = React.useRef(null);
  const isInView = useInView(ref);

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      x: -20,
      y: 10,
      filter: "blur(10px)",
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <div className={cn("flex items-center space-x-1 my-6", className)}>
      <motion.div
        ref={ref}
        className="overflow-hidden pb-2"
        variants={container}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {wordsArray.map((word, idx) => (
          <div key={`word-${idx}`} className="inline-block mr-2">
            {word.text.map((char, index) => (
              <motion.span
                key={`char-${index}`}
                variants={child}
                className={cn("dark:text-white text-black", word.className)}
              >
                {char}
              </motion.span>
            ))}
            &nbsp;
          </div>
        ))}
      </motion.div>

      {/* Blinking cursor */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn(
          "inline-block rounded-sm w-[4px] h-8 md:h-10 bg-violet-500",
          cursorClassName
        )}
      />
    </div>
  );
}


