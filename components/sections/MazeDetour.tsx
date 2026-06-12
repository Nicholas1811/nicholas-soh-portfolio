"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { COLS, ROWS, isWall, items, start, type MazeItem } from "@/lib/maze";
import SectionHeading from "@/components/ui/SectionHeading";

const LAYOUT_CELLS: { col: number; row: number }[] = (() => {
  const cells = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (isWall(c, r)) cells.push({ col: c, row: r });
  return cells;
})();

function Crown({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 14"
      width={size}
      height={size * 0.58}
      className="absolute left-1/2 -translate-x-1/2"
      style={{ top: -size * 0.62 }}
      fill="var(--accent)"
    >
      <path d="M2 12 L1 3 L7 7 L12 1 L17 7 L23 3 L22 12 Z" />
    </svg>
  );
}

export default function MazeDetour() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [found, setFound] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<MazeItem | null>(null);
  const dragging = useRef(false);
  const posRef = useRef(pos);
  posRef.current = pos;

  const allFound = found.size === items.length;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const c = wrap.clientWidth / COLS;
      setCell(c);
      setPos({ x: (start.col + 0.5) * c, y: (start.row + 0.5) * c });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const canStand = useCallback(
    (x: number, y: number) => {
      const r = cell * 0.3;
      const c0 = Math.floor((x - r) / cell);
      const c1 = Math.floor((x + r) / cell);
      const r0 = Math.floor((y - r) / cell);
      const r1 = Math.floor((y + r) / cell);
      for (let row = r0; row <= r1; row++)
        for (let col = c0; col <= c1; col++) if (isWall(col, row)) return false;
      return true;
    },
    [cell]
  );

  const checkPickup = useCallback(
    (x: number, y: number) => {
      for (const item of items) {
        if (found.has(item.id)) continue;
        const ix = (item.col + 0.5) * cell;
        const iy = (item.row + 0.5) * cell;
        if (Math.hypot(x - ix, y - iy) < cell * 0.55) {
          setFound((prev) => new Set(prev).add(item.id));
          setPopup(item);
        }
      }
    },
    [cell, found]
  );

  const moveToward = useCallback(
    (tx: number, ty: number) => {
      let { x, y } = posRef.current;
      const step = Math.max(2, cell / 4);
      for (let i = 0; i < 60; i++) {
        const dx = tx - x;
        const dy = ty - y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) break;
        const s = Math.min(step, dist);
        const sx = (dx / dist) * s;
        const sy = (dy / dist) * s;
        let moved = false;
        if (sx !== 0 && canStand(x + sx, y)) {
          x += sx;
          moved = true;
        }
        if (sy !== 0 && canStand(x, y + sy)) {
          y += sy;
          moved = true;
        }
        if (!moved) break;
      }
      setPos({ x, y });
      checkPickup(x, y);
    },
    [cell, canStand, checkPickup]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    moveToward(e.clientX - rect.left, e.clientY - rect.top);
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dirs: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
    };
    const dir = dirs[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!dir) return;
    e.preventDefault();
    const { x, y } = posRef.current;
    const nx = x + dir[0] * cell;
    const ny = y + dir[1] * cell;
    if (canStand(nx, ny)) {
      setPos({ x: nx, y: ny });
      checkPickup(nx, ny);
    }
  };

  const reset = () => {
    setFound(new Set());
    setPopup(null);
    setPos({ x: (start.col + 0.5) * cell, y: (start.row + 0.5) * cell });
  };

  const charSize = cell * 0.64;

  return (
    <section id="detour" className="relative mx-auto max-w-6xl px-6 py-28 md:px-14 md:py-40">
      <SectionHeading index="05" label="detour" title="Take the scenic route." />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">
          (drag mini-me through the maze — or use arrow keys. find everything i&apos;ve shipped.)
        </p>
        <div className="flex items-center gap-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em]">
            found{" "}
            <span className="text-accent">
              {found.size} / {items.length}
            </span>
          </p>
          <button
            data-interactive
            onClick={reset}
            className="font-mono border hairline bg-paper px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition-colors hover:bg-accent hover:text-paper"
            style={{ borderRadius: "2px 10px 3px 8px" }}
          >
            ↻ restart
          </button>
        </div>
      </div>

      <div ref={wrapRef} className="relative">
        <motion.div
          ref={boardRef}
          tabIndex={0}
          role="application"
          aria-label="Maze: drag the character or use arrow keys to find projects and experiences"
          onKeyDown={onKeyDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          animate={allFound ? { rotate: [0, -0.8, 0.8, -0.4, 0] } : {}}
          transition={{ duration: 0.6 }}
          className="relative touch-none overflow-hidden bg-card outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ height: cell * ROWS, borderRadius: "4px 20px 6px 16px" }}
        >
          {cell > 0 &&
            LAYOUT_CELLS.map(({ col, row }) => (
              <div
                key={`${col}-${row}`}
                className="absolute bg-ink"
                style={{
                  left: col * cell - 0.5,
                  top: row * cell - 0.5,
                  width: cell + 1,
                  height: cell + 1,
                  borderRadius: 2,
                }}
              />
            ))}

          {cell > 0 &&
            items.map((item) => {
              const isFound = found.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  animate={
                    isFound ? { scale: 1 } : { scale: [1, 1.18, 1] }
                  }
                  transition={
                    isFound ? {} : { repeat: Infinity, duration: 1.6, ease: "easeInOut" }
                  }
                  className={`font-mono absolute flex items-center justify-center rounded-full text-paper ${
                    isFound ? "bg-sage" : "bg-accent"
                  }`}
                  style={{
                    left: (item.col + 0.5) * cell - cell * 0.26,
                    top: (item.row + 0.5) * cell - cell * 0.26,
                    width: cell * 0.52,
                    height: cell * 0.52,
                    fontSize: cell * 0.26,
                  }}
                >
                  {isFound ? "✓" : item.initial}
                </motion.div>
              );
            })}

          {cell > 0 && (
            <div
              data-interactive
              onPointerDown={onPointerDown}
              className="absolute z-10 cursor-grab active:cursor-grabbing"
              style={{
                left: pos.x - charSize / 2,
                top: pos.y - charSize / 2,
                width: charSize,
                height: charSize,
              }}
            >
              {allFound && <Crown size={charSize * 0.7} />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/portrait.jpg"
                alt=""
                draggable={false}
                className="pointer-events-none h-full w-full rounded-full border-2 border-ink object-cover shadow-[2px_3px_0_rgba(24,22,17,0.3)]"
              />
            </div>
          )}

          <AnimatePresence>
            {allFound && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: -3 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
                className="absolute right-4 top-4 border-2 border-accent bg-paper px-4 py-2"
                style={{ borderRadius: "3px 12px 4px 10px" }}
              >
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                  certified explorer ✦
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {popup && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="absolute inset-x-4 bottom-4 z-20 mx-auto max-w-md border hairline bg-paper p-5 shadow-[5px_8px_0_rgba(24,22,17,0.2)] md:inset-x-auto md:right-6 md:bottom-6"
              style={{ borderRadius: "3px 16px 4px 14px" }}
            >
              <button
                data-interactive
                onClick={() => setPopup(null)}
                aria-label="Close"
                className="font-mono absolute right-4 top-3 text-xs uppercase tracking-[0.2em] opacity-60 hover:opacity-100"
              >
                ✕
              </button>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
                found: {popup.kind}
              </p>
              <h3 className="font-display mt-1 text-xl font-medium">{popup.title}</h3>
              <p className="font-mono mt-1 text-[11px] uppercase tracking-[0.12em] opacity-50">
                {popup.subtitle}
              </p>
              <p className="mt-3 text-sm leading-relaxed opacity-85">{popup.body}</p>
              {popup.link && (
                <a
                  data-interactive
                  href={popup.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="scribble-underline font-mono mt-4 inline-block text-xs uppercase tracking-[0.2em]"
                >
                  view the code ↗
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
