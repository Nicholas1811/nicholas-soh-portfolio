"use client";

import { motion } from "motion/react";

export default function SectionHeading({
  index,
  label,
  title,
}: {
  index: string;
  label: string;
  title: string;
}) {
  return (
    <div className="mb-12 md:mb-16">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="font-mono text-xs uppercase tracking-[0.25em] text-accent"
      >
        {index} — {label}
      </motion.p>
      <motion.h2
        data-fall
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.08 }}
        className="font-display mt-3 text-4xl font-medium leading-[1.05] md:text-6xl"
        style={{ fontVariationSettings: '"opsz" 144' }}
      >
        {title}
      </motion.h2>
    </div>
  );
}
