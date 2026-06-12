"use client";

import { useCallback, useRef, useState } from "react";
import Matter from "matter-js";
import { useKonami } from "@/lib/useKonami";

type FallenItem = {
  el: HTMLElement;
  clone: HTMLElement;
  body: Matter.Body;
  w: number;
  h: number;
};

export default function KonamiGravity() {
  const [active, setActive] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const trigger = useCallback(() => {
    if (cleanupRef.current) return;

    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>("[data-sticker], [data-fall]")
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.width > 0 && r.width < innerWidth * 0.9;
    });
    if (candidates.length === 0) return;

    setActive(true);

    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:80;overflow:hidden;touch-action:none;";
    document.body.appendChild(overlay);

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.4 } });
    const wallOpts = { isStatic: true };
    const walls = [
      Matter.Bodies.rectangle(innerWidth / 2, innerHeight + 40, innerWidth + 400, 80, wallOpts),
      Matter.Bodies.rectangle(-40, innerHeight / 2, 80, innerHeight * 3, wallOpts),
      Matter.Bodies.rectangle(innerWidth + 40, innerHeight / 2, 80, innerHeight * 3, wallOpts),
    ];

    const items: FallenItem[] = candidates.map((el) => {
      const r = el.getBoundingClientRect();
      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.cssText = `position:absolute;left:0;top:0;margin:0;width:${r.width}px;height:${r.height}px;will-change:transform;`;
      overlay.appendChild(clone);
      el.style.visibility = "hidden";
      const body = Matter.Bodies.rectangle(
        r.left + r.width / 2,
        r.top + r.height / 2,
        r.width,
        r.height,
        { restitution: 0.4, friction: 0.4, chamfer: { radius: 6 } }
      );
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
      return { el, clone, body, w: r.width, h: r.height };
    });

    const mouse = Matter.Mouse.create(overlay);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });

    Matter.Composite.add(engine.world, [
      ...walls,
      ...items.map((i) => i.body),
      mouseConstraint,
    ]);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    let raf = 0;
    const sync = () => {
      for (const item of items) {
        item.clone.style.transform = `translate(${item.body.position.x - item.w / 2}px, ${
          item.body.position.y - item.h / 2
        }px) rotate(${item.body.angle}rad)`;
      }
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      items.forEach((item) => (item.el.style.visibility = ""));
      overlay.remove();
      cleanupRef.current = null;
      setActive(false);
    };
  }, []);

  useKonami(trigger);

  if (!active) return null;

  return (
    <div className="fixed left-1/2 top-6 z-[85] -translate-x-1/2">
      <div
        className="border-2 border-accent bg-paper px-5 py-3 shadow-[4px_6px_0_rgba(24,22,17,0.2)]"
        style={{ borderRadius: "3px 14px 4px 12px" }}
      >
        <p className="font-mono text-xs uppercase tracking-[0.2em]">
          ↑↑↓↓←→←→BA — gravity happened.{" "}
          <button
            data-interactive
            onClick={() => cleanupRef.current?.()}
            className="text-accent underline underline-offset-4"
          >
            restore order
          </button>
        </p>
      </div>
    </div>
  );
}
