"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { identity } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";

const marginalia = [
  "// currently: TTSH, ophthalmology tooling",
  "// previously: paypal, synthetic data",
  "// always: teaching someone something",
];

function Polaroid({ constraintsRef }: { constraintsRef: React.RefObject<HTMLElement | null> }) {
  return (
    <motion.div
      data-interactive
      data-sticker
      drag
      dragConstraints={constraintsRef}
      dragElastic={0.2}
      dragTransition={{ power: 0.3, timeConstant: 160 }}
      initial={{ opacity: 0, y: 30, rotate: -3 }}
      whileInView={{ opacity: 1, y: 0, rotate: -3 }}
      viewport={{ once: true, margin: "-60px" }}
      whileHover={{ rotate: 0, scale: 1.02 }}
      whileDrag={{ rotate: 2, scale: 1.06, zIndex: 40 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="relative mx-auto w-56 cursor-grab touch-none bg-white p-3 pb-4 shadow-[5px_8px_0_rgba(24,22,17,0.18)] md:mx-0 md:w-full"
    >
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 z-10 h-7 w-24 -translate-x-1/2 rotate-[-2deg] bg-paper/70 shadow-[0_1px_2px_rgba(24,22,17,0.15)]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/portrait.jpg"
        alt="Nicholas Soh, smiling with two thumbs up"
        className="pointer-events-none block aspect-square w-full object-cover"
        draggable={false}
      />
      <p className="font-mono mt-3 text-center text-[11px] tracking-wide text-ink/60">
        exhibit A: the developer
      </p>
    </motion.div>
  );
}

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative mx-auto max-w-6xl px-6 py-28 md:px-14 md:py-40"
    >
      <SectionHeading index="01" label="about" title="The short version." />

      <div className="grid gap-12 md:grid-cols-[1fr_260px]">
        <div className="order-2 space-y-8 md:order-1">
          {identity.blurb.map((para, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className="max-w-prose text-lg leading-relaxed md:text-xl"
            >
              {para}
            </motion.p>
          ))}
        </div>

        <div className="order-1 flex flex-col gap-8 md:order-2">
          <Polaroid constraintsRef={sectionRef} />
          <div className="hidden flex-col gap-6 border-l hairline pl-6 md:flex">
            {marginalia.map((note, i) => (
              <motion.p
                key={note}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 0.65, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
                className="font-mono text-xs leading-relaxed"
              >
                {note}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
