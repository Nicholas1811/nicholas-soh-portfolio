"use client";

import { motion } from "motion/react";
import { RefObject } from "react";

const hues = {
  accent: "bg-accent text-paper",
  ink: "bg-ink text-paper",
  sage: "bg-sage text-paper",
} as const;

type Props = {
  label: string;
  hue: keyof typeof hues;
  constraintsRef: RefObject<HTMLElement | null>;
  className?: string;
  initialRotate?: number;
  delay?: number;
};

export default function StickerChip({
  label,
  hue,
  constraintsRef,
  className = "",
  initialRotate = 0,
  delay = 0,
}: Props) {
  return (
    <motion.div
      data-interactive
      data-sticker
      drag
      dragConstraints={constraintsRef}
      dragElastic={0.2}
      dragTransition={{ power: 0.4, timeConstant: 180 }}
      whileDrag={{ scale: 1.12, rotate: 0, zIndex: 50 }}
      whileHover={{ scale: 1.06 }}
      initial={{ y: -120, opacity: 0, rotate: initialRotate * 3 }}
      animate={{ y: 0, opacity: 1, rotate: initialRotate }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 16,
        delay,
      }}
      className={`absolute select-none touch-none px-4 py-2 font-mono text-sm tracking-tight shadow-[3px_4px_0_rgba(24,22,17,0.25)] ${hues[hue]} ${className}`}
      style={{ borderRadius: "2px 14px 4px 12px" }}
    >
      {label}
    </motion.div>
  );
}
