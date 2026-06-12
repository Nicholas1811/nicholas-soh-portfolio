"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { experience } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";

const kindLabel = {
  work: "work",
  education: "school",
  community: "giving back",
} as const;

const kindColor = {
  work: "text-accent",
  education: "text-sage",
  community: "text-ink opacity-60",
} as const;

export default function Experience() {
  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.75", "end 0.6"],
  });
  const drawn = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const lineScale = useTransform(drawn, [0, 1], [0, 1]);

  return (
    <section
      id="experience"
      className="relative mx-auto max-w-6xl px-6 py-28 md:px-14 md:py-40"
    >
      <SectionHeading index="02" label="experience" title="Where I've been." />

      <div ref={listRef} className="relative">
        <motion.div
          aria-hidden
          className="absolute left-[5px] top-2 w-[2px] bg-accent md:left-[7px]"
          style={{ scaleY: lineScale, height: "calc(100% - 16px)", transformOrigin: "top" }}
        />
        <div
          aria-hidden
          className="absolute left-[5px] top-2 w-[2px] md:left-[7px]"
          style={{ height: "calc(100% - 16px)", background: "var(--line)" }}
        />

        <ul className="space-y-14 md:space-y-16">
          {experience.map((item, i) => (
            <motion.li
              key={item.org + item.period}
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: 0.05 * i }}
              className="relative pl-10 md:pl-14"
            >
              <span
                aria-hidden
                className="absolute left-0 top-2 z-10 block h-3 w-3 rounded-full border-2 border-accent bg-paper md:h-4 md:w-4"
              />
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h3 className="font-display text-2xl font-medium md:text-3xl">
                  {item.org}
                </h3>
                <span className={`font-mono text-xs uppercase tracking-[0.2em] ${kindColor[item.kind]}`}>
                  {kindLabel[item.kind]}
                </span>
              </div>
              <p className="mt-1 text-base opacity-80 md:text-lg">{item.role}</p>
              <p className="font-mono mt-1 text-xs uppercase tracking-[0.15em] opacity-50">
                {item.period}
              </p>
              {item.points.length > 0 && (
                <ul className="mt-4 max-w-2xl space-y-2">
                  {item.points.map((pt) => (
                    <li key={pt} className="flex gap-3 text-sm leading-relaxed opacity-85 md:text-base">
                      <span className="text-accent">→</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
