"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { motion } from "motion/react";
import { skills, certifications } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";

const CHIP_HEIGHT = 38;
const chipWidth = (label: string) => Math.round(label.length * 8.2 + 36);

const chipStyles = [
  "bg-ink text-paper",
  "bg-accent text-paper",
  "bg-sage text-paper",
  "bg-card text-ink border hairline",
];

export default function TechPlayground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const engineRef = useRef<Matter.Engine | null>(null);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const [started, setStarted] = useState(false);

  const spawn = useCallback(() => {
    const engine = engineRef.current;
    const container = containerRef.current;
    if (!engine || !container) return;
    const w = container.clientWidth;
    bodiesRef.current.forEach((body, i) => {
      Matter.Body.setPosition(body, {
        x: 60 + Math.random() * (w - 120),
        y: -60 - i * 46 - Math.random() * 40,
      });
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.15);
      Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.5);
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !started) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.1 } });
    engineRef.current = engine;

    const wallOpts = { isStatic: true, friction: 0.4 };
    const walls = [
      Matter.Bodies.rectangle(w / 2, h + 30, w + 200, 60, wallOpts),
      Matter.Bodies.rectangle(-30, h / 2 - 400, 60, h + 800, wallOpts),
      Matter.Bodies.rectangle(w + 30, h / 2 - 400, 60, h + 800, wallOpts),
    ];

    const bodies = skills.map((label) =>
      Matter.Bodies.rectangle(0, -1000, chipWidth(label), CHIP_HEIGHT, {
        restitution: 0.35,
        friction: 0.35,
        frictionAir: 0.012,
        chamfer: { radius: 8 },
      })
    );
    bodiesRef.current = bodies;

    const mouse = Matter.Mouse.create(container);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.18, damping: 0.12, render: { visible: false } },
    });
    // let the page keep scrolling over the canvas — matter grabs wheel events otherwise
    const m = mouse as unknown as {
      element: HTMLElement;
      mousewheel: EventListener;
    };
    m.element.removeEventListener("wheel", m.mousewheel);

    Matter.Composite.add(engine.world, [...walls, ...bodies, mouseConstraint]);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    let raf = 0;
    const sync = () => {
      bodies.forEach((body, i) => {
        const el = chipRefs.current[i];
        if (!el) return;
        el.style.transform = `translate(${body.position.x - chipWidth(skills[i]) / 2}px, ${
          body.position.y - CHIP_HEIGHT / 2
        }px) rotate(${body.angle}rad)`;
      });
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);

    spawn();

    return () => {
      cancelAnimationFrame(raf);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      engineRef.current = null;
    };
  }, [started, spawn]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="stack" className="relative mx-auto max-w-6xl px-6 py-28 md:px-14 md:py-40">
      <SectionHeading index="04" label="tech stack" title="Tools of the trade." />

      <p className="font-mono -mt-6 mb-8 text-xs uppercase tracking-[0.2em] opacity-50">
        (grab one. throw it. they pile up like real work does.)
      </p>

      <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
        <div
          ref={containerRef}
          data-interactive
          className="relative h-[420px] touch-none overflow-hidden border-2 border-ink/80 bg-card md:h-[480px]"
          style={{ borderRadius: "4px 20px 6px 16px" }}
        >
          {started &&
            skills.map((label, i) => (
              <div
                key={label}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                className={`font-mono absolute left-0 top-0 flex select-none items-center justify-center text-sm will-change-transform ${
                  chipStyles[i % chipStyles.length]
                }`}
                style={{
                  width: chipWidth(label),
                  height: CHIP_HEIGHT,
                  borderRadius: 8,
                }}
              >
                {label}
              </div>
            ))}

          <button
            data-interactive
            onClick={spawn}
            className="font-mono absolute right-4 top-4 z-10 border hairline bg-paper px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors hover:bg-accent hover:text-paper"
            style={{ borderRadius: "2px 12px 3px 10px" }}
          >
            ↻ re-drop
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {certifications.map((cert, i) => (
            <motion.div
              key={cert.title}
              data-fall
              initial={{ opacity: 0, rotate: i === 0 ? -4 : 3, scale: 0.8 }}
              whileInView={{ opacity: 1, rotate: i === 0 ? -2 : 1.5, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.2 + i * 0.15 }}
              className="border-2 border-accent p-5"
              style={{ borderRadius: "4px 14px 4px 12px" }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
                certified ✦
              </p>
              <h3 className="font-display mt-2 text-lg font-medium leading-snug">
                {cert.title}
              </h3>
              <p className="font-mono mt-2 text-[11px] leading-relaxed opacity-60">
                {cert.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
