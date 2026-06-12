"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { identity, heroStickers } from "@/lib/data";
import StickerChip from "@/components/ui/StickerChip";

const stickerLayout = [
  "right-[8%] top-[18%]",
  "right-[22%] top-[34%] hidden md:block",
  "right-[6%] top-[48%]",
  "right-[28%] top-[60%] hidden md:block",
  "right-[12%] top-[72%]",
  "right-[34%] top-[14%] hidden lg:block",
];

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [descriptorIdx, setDescriptorIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setDescriptorIdx((i) => (i + 1) % identity.descriptors.length),
      2400
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section
      ref={ref}
      id="top"
      className="relative flex min-h-svh flex-col justify-center overflow-hidden px-6 md:px-14"
    >
      <p className="font-mono absolute left-6 top-6 text-xs uppercase tracking-[0.25em] opacity-60 md:left-14 md:top-10">
        {identity.fullName} · {identity.location}
      </p>
      <p className="font-mono absolute right-6 top-6 hidden text-xs uppercase tracking-[0.25em] opacity-60 md:right-14 md:top-10 md:block">
        portfolio, {new Date().getFullYear()}
      </p>

      <div className="relative z-10 max-w-5xl">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="font-display text-[16vw] font-semibold leading-[0.92] tracking-tight md:text-[9.5rem]"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          Nicholas
          <br />
          <span className="relative inline-block">
            Soh
            <svg
              aria-hidden
              viewBox="0 0 220 110"
              className="pointer-events-none absolute -left-[10%] -top-[8%] h-[116%] w-[120%]"
              fill="none"
            >
              <motion.path
                d="M110 8 C 180 4, 216 28, 213 55 C 210 86, 158 104, 104 102 C 50 100, 8 84, 7 54 C 6 26, 48 7, 96 8"
                stroke="var(--accent)"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, delay: 0.7, ease: "easeInOut" }}
              />
            </svg>
          </span>
        </motion.h1>

        <div className="mt-8 flex items-baseline gap-3 text-xl md:text-2xl">
          <span className="opacity-70">software engineer who</span>
          <span className="relative inline-block h-[1.6em] min-w-[12ch] overflow-hidden align-bottom">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={descriptorIdx}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="font-display absolute left-0 italic text-accent"
              >
                {identity.descriptors[descriptorIdx]}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="font-mono mt-10 text-xs uppercase tracking-[0.2em] opacity-50"
        >
          (the stickers are draggable. everything here is.)
        </motion.p>
      </div>

      {heroStickers.map((s, i) => (
        <StickerChip
          key={s.label}
          label={s.label}
          hue={s.hue}
          constraintsRef={ref}
          className={stickerLayout[i]}
          initialRotate={[-6, 4, -3, 7, -5, 3][i]}
          delay={0.9 + i * 0.12}
        />
      ))}

      <motion.a
        href="#about"
        data-interactive
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="font-mono absolute bottom-8 left-6 flex items-center gap-3 text-xs uppercase tracking-[0.25em] md:left-14"
      >
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          className="text-accent text-base"
        >
          ↓
        </motion.span>
        scroll
      </motion.a>
    </section>
  );
}
