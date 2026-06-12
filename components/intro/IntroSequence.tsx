"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const stamp = {
  hidden: { opacity: 0, scale: 1.7 },
  shown: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 420, damping: 22 },
  },
};

export default function IntroSequence() {
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || sessionStorage.getItem("intro-seen")) {
      setPhase("done");
      return;
    }
    setPhase("playing");
    const t = setTimeout(finish, 2900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = phase === "playing" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  function finish() {
    sessionStorage.setItem("intro-seen", "1");
    setPhase("done");
  }

  return (
    <AnimatePresence>
      {phase === "playing" && (
        <motion.div
          onClick={finish}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[110] flex cursor-pointer flex-col items-center justify-center bg-paper"
        >
          <div className="font-display flex flex-wrap items-baseline justify-center gap-x-5 px-6 text-[13vw] font-semibold leading-none tracking-tight md:text-8xl">
            <motion.span
              variants={stamp}
              initial="hidden"
              animate="shown"
              transition={{ delay: 0.25 }}
              style={{ fontVariationSettings: '"opsz" 144' }}
            >
              Nicholas
            </motion.span>
            <span className="relative inline-block">
              <motion.span
                variants={stamp}
                initial="hidden"
                animate="shown"
                transition={{ delay: 0.65 }}
                className="inline-block"
                style={{ fontVariationSettings: '"opsz" 144' }}
              >
                Soh
              </motion.span>
              <svg
                aria-hidden
                viewBox="0 0 220 110"
                className="pointer-events-none absolute -left-[14%] -top-[10%] h-[124%] w-[128%]"
                fill="none"
              >
                <motion.path
                  d="M110 8 C 180 4, 216 28, 213 55 C 210 86, 158 104, 104 102 C 50 100, 8 84, 7 54 C 6 26, 48 7, 96 8"
                  stroke="var(--accent)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 1.15, ease: "easeInOut" }}
                />
              </svg>
            </span>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 1.7 }}
            className="font-mono mt-10 text-xs uppercase tracking-[0.3em]"
          >
            software engineer · singapore
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 2.2 }}
            className="font-mono absolute bottom-8 text-[10px] uppercase tracking-[0.25em]"
          >
            click anywhere to skip
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
