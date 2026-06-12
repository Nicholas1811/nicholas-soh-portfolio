"use client";

import { useState } from "react";
import { motion } from "motion/react";

export default function LightsCord() {
  const [night, setNight] = useState(false);

  const toggle = () => {
    const next = !night;
    setNight(next);
    document.documentElement.dataset.theme = next ? "night" : "";
  };

  return (
    <button
      data-interactive
      onClick={toggle}
      aria-label={night ? "Turn the lights on" : "Turn the lights off"}
      title="pull me"
      className="group relative flex flex-col items-center"
    >
      <motion.div
        className="flex flex-col items-center"
        whileHover={{ y: 6 }}
        whileTap={{ y: 14 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <span className="block h-12 w-[2px] bg-ink/50 group-hover:bg-accent md:h-16" />
        <span className="block h-3 w-3 rounded-full border-2 border-ink/50 bg-paper group-hover:border-accent" />
      </motion.div>
      <span className="font-mono mt-2 text-[9px] uppercase tracking-[0.2em] opacity-0 transition-opacity group-hover:opacity-50">
        {night ? "lights on" : "after hours"}
      </span>
    </button>
  );
}
