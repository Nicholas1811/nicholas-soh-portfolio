"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { projects, type Project } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";

function Card({ project, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <motion.button
      data-interactive
      data-fall
      layoutId={`card-${project.title}`}
      onClick={onOpen}
      initial={{ opacity: 0, y: 40, rotate: project.rotation }}
      whileInView={{ opacity: 1, y: 0, rotate: project.rotation }}
      viewport={{ once: true, margin: "-60px" }}
      whileHover={{ rotate: 0, y: -8, boxShadow: "6px 10px 0 rgba(24,22,17,0.18)" }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="block w-full border hairline bg-card p-6 text-left shadow-[3px_5px_0_rgba(24,22,17,0.12)]"
      style={{ borderRadius: "3px 16px 4px 14px" }}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
        {project.period}
      </p>
      <h3 className="font-display mt-2 text-2xl font-medium leading-tight">
        {project.title}
      </h3>
      <p className="mt-1 text-sm opacity-60">{project.role}</p>
      <p className="mt-4 line-clamp-3 text-sm leading-relaxed opacity-85">
        {project.description}
      </p>
      <p className="font-mono mt-5 text-xs uppercase tracking-[0.2em] opacity-50">
        open card →
      </p>
    </motion.button>
  );
}

function ExpandedCard({ project, onClose }: { project: Project; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px] md:p-10"
    >
      <motion.div
        layoutId={`card-${project.title}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl border hairline bg-card p-8 shadow-[8px_12px_0_rgba(24,22,17,0.25)] md:p-12"
        style={{ borderRadius: "4px 22px 6px 18px" }}
      >
        <button
          data-interactive
          onClick={onClose}
          aria-label="Close project"
          className="font-mono absolute right-6 top-5 text-sm uppercase tracking-[0.2em] opacity-60 hover:opacity-100"
        >
          esc / close ✕
        </button>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          {project.period} · {project.role}
        </p>
        <h3 className="font-display mt-3 text-3xl font-medium md:text-5xl">
          {project.title}
        </h3>
        <p className="mt-6 text-base leading-relaxed opacity-90 md:text-lg">
          {project.description}
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {project.stack.map((tag) => (
            <span
              key={tag}
              className="font-mono border hairline px-3 py-1 text-xs"
              style={{ borderRadius: "2px 10px 3px 8px" }}
            >
              {tag}
            </span>
          ))}
        </div>
        <a
          data-interactive
          href={project.link}
          target="_blank"
          rel="noopener noreferrer"
          className="scribble-underline font-mono mt-10 inline-block text-sm uppercase tracking-[0.2em]"
        >
          view the code ↗
        </a>
      </motion.div>
    </motion.div>
  );
}

export default function Projects() {
  const [open, setOpen] = useState<Project | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section id="projects" className="relative mx-auto max-w-6xl px-6 py-28 md:px-14 md:py-40">
      <SectionHeading index="03" label="projects" title="Things I've shipped." />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
        {projects.map((p) => (
          <Card key={p.title} project={p} onOpen={() => setOpen(p)} />
        ))}
      </div>

      <AnimatePresence>
        {open && <ExpandedCard project={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </section>
  );
}
