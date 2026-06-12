"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { COLS, ROWS, isWall, items, start, type MazeItem } from "@/lib/maze";
import SectionHeading from "@/components/ui/SectionHeading";

const FOV = (66 * Math.PI) / 180;
const MOVE_SPEED = 2.4; // cells / s
const TURN_SPEED = 2.6; // rad / s
const PLAYER_RADIUS = 0.22;
const PICKUP_DIST = 0.6;

function canStand(x: number, y: number) {
  const r = PLAYER_RADIUS;
  return (
    !isWall(Math.floor(x - r), Math.floor(y - r)) &&
    !isWall(Math.floor(x + r), Math.floor(y - r)) &&
    !isWall(Math.floor(x - r), Math.floor(y + r)) &&
    !isWall(Math.floor(x + r), Math.floor(y + r))
  );
}

type Palette = { paper: string; ink: string; accent: string; sage: string; card: string };

export default function MazeDetour() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<MazeItem | null>(null);

  const player = useRef({ x: start.col + 0.5, y: start.row + 0.5, angle: 0 });
  const keys = useRef<Set<string>>(new Set());
  const drag = useRef<{ id: number; lastX: number; lastY: number } | null>(null);
  const foundRef = useRef<Set<string>>(new Set());
  const bob = useRef(0);

  const allFound = found.size === items.length;
  const allFoundRef = useRef(false);
  allFoundRef.current = allFound;

  const reset = useCallback(() => {
    player.current = { x: start.col + 0.5, y: start.row + 0.5, angle: 0 };
    foundRef.current = new Set();
    setFound(new Set());
    setPopup(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;

    const resize = () => {
      W = wrap.clientWidth;
      H = Math.min(520, Math.max(280, Math.round(W * 0.52)));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let palette: Palette = { paper: "#f2efe6", ink: "#181611", accent: "#ff4d00", sage: "#7d8a5c", card: "#faf8f2" };
    let paletteTick = 0;
    const readPalette = () => {
      const s = getComputedStyle(wrap);
      palette = {
        paper: s.getPropertyValue("--paper").trim() || palette.paper,
        ink: s.getPropertyValue("--ink").trim() || palette.ink,
        accent: s.getPropertyValue("--accent").trim() || palette.accent,
        sage: s.getPropertyValue("--sage").trim() || palette.sage,
        card: s.getPropertyValue("--card").trim() || palette.card,
      };
    };
    readPalette();

    const tryMove = (dx: number, dy: number) => {
      const p = player.current;
      if (canStand(p.x + dx, p.y)) p.x += dx;
      if (canStand(p.x, p.y + dy)) p.y += dy;
    };

    const checkPickup = () => {
      const p = player.current;
      for (const item of items) {
        if (foundRef.current.has(item.id)) continue;
        if (Math.hypot(p.x - (item.col + 0.5), p.y - (item.row + 0.5)) < PICKUP_DIST) {
          foundRef.current = new Set(foundRef.current).add(item.id);
          setFound(foundRef.current);
          setPopup(item);
        }
      }
    };

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (++paletteTick % 30 === 0) readPalette();

      // --- update ---
      const p = player.current;
      const k = keys.current;
      let walk = 0;
      if (k.has("ArrowUp") || k.has("w")) walk += 1;
      if (k.has("ArrowDown") || k.has("s")) walk -= 1;
      if (k.has("ArrowLeft") || k.has("a")) p.angle -= TURN_SPEED * dt;
      if (k.has("ArrowRight") || k.has("d")) p.angle += TURN_SPEED * dt;
      if (walk !== 0) {
        const step = walk * MOVE_SPEED * dt;
        tryMove(Math.cos(p.angle) * step, Math.sin(p.angle) * step);
        bob.current += dt * 9;
      }
      checkPickup();

      // --- render ---
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const horizon = H / 2;
      ctx.fillStyle = palette.paper;
      ctx.fillRect(0, 0, W, horizon);
      ctx.fillStyle = palette.card;
      ctx.fillRect(0, horizon, W, H - horizon);
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = palette.ink;
      ctx.fillRect(0, horizon, W, H - horizon);
      ctx.globalAlpha = 1;

      const dirX = Math.cos(p.angle);
      const dirY = Math.sin(p.angle);
      const planeScale = Math.tan(FOV / 2);
      const planeX = -dirY * planeScale;
      const planeY = dirX * planeScale;

      const colStep = 2;
      const zBuffer = new Float32Array(Math.ceil(W / colStep) + 1);

      ctx.fillStyle = palette.ink;
      for (let col = 0, i = 0; col < W; col += colStep, i++) {
        const cameraX = (2 * col) / W - 1;
        const rayX = dirX + planeX * cameraX;
        const rayY = dirY + planeY * cameraX;

        let mapX = Math.floor(p.x);
        let mapY = Math.floor(p.y);
        const deltaX = Math.abs(1 / (rayX || 1e-9));
        const deltaY = Math.abs(1 / (rayY || 1e-9));
        const stepX = rayX < 0 ? -1 : 1;
        const stepY = rayY < 0 ? -1 : 1;
        let sideX = rayX < 0 ? (p.x - mapX) * deltaX : (mapX + 1 - p.x) * deltaX;
        let sideY = rayY < 0 ? (p.y - mapY) * deltaY : (mapY + 1 - p.y) * deltaY;
        let side = 0;
        for (let guard = 0; guard < 64; guard++) {
          if (sideX < sideY) {
            sideX += deltaX;
            mapX += stepX;
            side = 0;
          } else {
            sideY += deltaY;
            mapY += stepY;
            side = 1;
          }
          if (isWall(mapX, mapY)) break;
        }
        const perpDist = Math.max(
          0.05,
          side === 0 ? sideX - deltaX : sideY - deltaY
        );
        zBuffer[i] = perpDist;

        const lineH = H / perpDist;
        const y0 = horizon - lineH / 2;
        let alpha = Math.max(0.14, 1.05 - perpDist / 9);
        if (side === 1) alpha *= 0.78;
        ctx.globalAlpha = alpha;
        ctx.fillRect(col, y0, colStep + 0.5, lineH);
      }
      ctx.globalAlpha = 1;

      // --- item sprites ---
      const sprites = items
        .map((item) => {
          const relX = item.col + 0.5 - p.x;
          const relY = item.row + 0.5 - p.y;
          const invDet = 1 / (planeX * dirY - dirX * planeY);
          const transX = invDet * (dirY * relX - dirX * relY);
          const depth = invDet * (-planeY * relX + planeX * relY);
          return { item, transX, depth };
        })
        .filter((s) => s.depth > 0.25)
        .sort((a, b) => b.depth - a.depth);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const { item, transX, depth } of sprites) {
        const screenX = (W / 2) * (1 + transX / depth);
        const zi = Math.round(screenX / colStep);
        if (zi < 0 || zi >= zBuffer.length || zBuffer[zi] < depth) continue;

        const isFound = foundRef.current.has(item.id);
        const pulse = isFound ? 1 : 1 + 0.1 * Math.sin(now / 260);
        const r = Math.min(H * 0.45, ((H / depth) * 0.22) * pulse);
        const cy = horizon + (H / depth) * 0.18;

        ctx.globalAlpha = 0.18;
        ctx.fillStyle = palette.ink;
        ctx.beginPath();
        ctx.ellipse(screenX, cy + r * 0.95, r * 0.8, r * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = isFound ? palette.sage : palette.accent;
        ctx.beginPath();
        ctx.arc(screenX, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = palette.paper;
        ctx.font = `${Math.max(8, r)}px ui-monospace, monospace`;
        ctx.fillText(isFound ? "✓" : item.initial, screenX, cy + r * 0.05);
      }

      // --- mini-me, seen from behind ---
      const bobY = (keys.current.size || drag.current ? Math.sin(bob.current) : 0) * 3;
      const cx = W / 2;
      const baseY = H + 6 + bobY;
      const headR = Math.max(20, H * 0.085);
      ctx.fillStyle = palette.ink;
      ctx.beginPath(); // shoulders
      ctx.moveTo(cx - headR * 2.1, baseY);
      ctx.quadraticCurveTo(cx - headR * 1.9, baseY - headR * 1.7, cx, baseY - headR * 1.85);
      ctx.quadraticCurveTo(cx + headR * 1.9, baseY - headR * 1.7, cx + headR * 2.1, baseY);
      ctx.closePath();
      ctx.fill();
      const headY = baseY - headR * 2.2;
      ctx.beginPath(); // head
      ctx.arc(cx, headY, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.paper;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (allFoundRef.current) {
        const s = headR * 0.95;
        const top = headY - headR - s * 0.5;
        ctx.fillStyle = palette.accent;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.5, top + s * 0.55);
        ctx.lineTo(cx - s * 0.55, top + s * 0.1);
        ctx.lineTo(cx - s * 0.22, top + s * 0.32);
        ctx.lineTo(cx, top);
        ctx.lineTo(cx + s * 0.22, top + s * 0.32);
        ctx.lineTo(cx + s * 0.55, top + s * 0.1);
        ctx.lineTo(cx + s * 0.5, top + s * 0.55);
        ctx.closePath();
        ctx.fill();
      }

      // --- minimap ---
      const mapW = Math.min(170, W * 0.24);
      const cellPx = mapW / COLS;
      const mapH = cellPx * ROWS;
      const mx = W - mapW - 12;
      const my = 12;
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = palette.card;
      ctx.fillRect(mx, my, mapW, mapH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, my, mapW, mapH);
      ctx.fillStyle = palette.ink;
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (isWall(c, r)) ctx.fillRect(mx + c * cellPx, my + r * cellPx, cellPx + 0.5, cellPx + 0.5);
      for (const item of items) {
        ctx.fillStyle = foundRef.current.has(item.id) ? palette.sage : palette.accent;
        ctx.beginPath();
        ctx.arc(mx + (item.col + 0.5) * cellPx, my + (item.row + 0.5) * cellPx, cellPx * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      const px = mx + p.x * cellPx;
      const py = my + p.y * cellPx;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + dirX * cellPx * 1.4, py + dirY * cellPx * 1.4);
      ctx.stroke();
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.arc(px, py, cellPx * 0.4, 0, Math.PI * 2);
      ctx.fill();
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(key)) {
      e.preventDefault();
      keys.current.add(key);
    }
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys.current.delete(key);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.focus();
    drag.current = { id: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    const p = player.current;
    p.angle += dx * 0.006;
    const step = -dy * 0.02;
    const nx = p.x + Math.cos(p.angle) * step;
    const ny = p.y + Math.sin(p.angle) * step;
    if (canStand(nx, p.y)) p.x = nx;
    if (canStand(p.x, ny)) p.y = ny;
    bob.current += Math.abs(dy) * 0.02;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  return (
    <section id="detour" className="relative mx-auto max-w-6xl px-6 py-28 md:px-14 md:py-40">
      <SectionHeading index="05" label="detour" title="Take the scenic route." />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">
          (walk the maze in first person — ↑↓ to move, ←→ to turn, or drag. find everything i&apos;ve
          shipped.)
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
          tabIndex={0}
          role="application"
          aria-label="First-person maze: use arrow keys or WASD to walk, or drag to move and look around. Find projects and experiences."
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={() => keys.current.clear()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          animate={allFound ? { rotate: [0, -0.8, 0.8, -0.4, 0] } : {}}
          transition={{ duration: 0.6 }}
          data-interactive
          className="relative cursor-grab touch-none overflow-hidden bg-card outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-accent"
          style={{ borderRadius: "4px 20px 6px 16px" }}
        >
          <canvas ref={canvasRef} className="block w-full" />

          <AnimatePresence>
            {allFound && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: -3 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
                className="absolute left-4 top-4 border-2 border-accent bg-paper px-4 py-2"
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
