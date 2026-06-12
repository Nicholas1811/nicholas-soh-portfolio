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

const TEX = 64;
const TEX_MASK = TEX - 1;
const FOG_DIST = 11;
const HAZE: [number, number, number] = [199, 226, 212];
const SKY_TOP = "#4f9fdd";
const SKY_HORIZON = "#d6ecf8";

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

function pack(r: number, g: number, b: number): number {
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}

// tileable value noise (cell must divide size)
function makeNoise(size: number, cell: number): Float32Array {
  const g = size / cell;
  const grid = new Float32Array(g * g);
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random();
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const gy = y / cell;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    const sy = fy * fy * (3 - 2 * fy);
    const r0 = (y0 % g) * g;
    const r1 = ((y0 + 1) % g) * g;
    for (let x = 0; x < size; x++) {
      const gx = x / cell;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const sx = fx * fx * (3 - 2 * fx);
      const c0 = x0 % g;
      const c1 = (x0 + 1) % g;
      const top = grid[r0 + c0] + (grid[r0 + c1] - grid[r0 + c0]) * sx;
      const bot = grid[r1 + c0] + (grid[r1 + c1] - grid[r1 + c0]) * sx;
      out[y * size + x] = top + (bot - top) * sy;
    }
  }
  return out;
}

function lerpC(a: number, b: number, t: number): number {
  return (a + (b - a) * t) | 0;
}

function makeHedgeTexture(): Uint32Array {
  const n1 = makeNoise(TEX, 16);
  const n2 = makeNoise(TEX, 8);
  const n3 = makeNoise(TEX, 2);
  const out = new Uint32Array(TEX * TEX);
  for (let i = 0; i < out.length; i++) {
    let v = n1[i] * 0.4 + n2[i] * 0.35 + n3[i] * 0.25;
    v = Math.min(1, Math.max(0, v * 1.25 - 0.12));
    let r = lerpC(18, 92, v);
    let g = lerpC(48, 146, v);
    let b = lerpC(22, 66, v);
    if (Math.random() < 0.05 && v > 0.55) {
      r += 28;
      g += 32;
      b += 14;
    }
    out[i] = pack(Math.min(255, r), Math.min(255, g), Math.min(255, b));
  }
  return out;
}

function darken(tex: Uint32Array, f: number): Uint32Array {
  const out = new Uint32Array(tex.length);
  for (let i = 0; i < tex.length; i++) {
    const c = tex[i];
    out[i] = pack(((c & 255) * f) | 0, (((c >> 8) & 255) * f) | 0, (((c >> 16) & 255) * f) | 0);
  }
  return out;
}

function makeGrassTexture(): Uint32Array {
  const n1 = makeNoise(TEX, 16);
  const n2 = makeNoise(TEX, 4);
  const out = new Uint32Array(TEX * TEX);
  for (let i = 0; i < out.length; i++) {
    let v = n1[i] * 0.45 + n2[i] * 0.55;
    v = Math.min(1, Math.max(0, v * 1.2 - 0.08));
    out[i] = pack(lerpC(34, 98, v), lerpC(74, 152, v), lerpC(30, 58, v));
  }
  // grass blades
  for (let i = 0; i < 320; i++) {
    const x = (Math.random() * TEX) | 0;
    const y = (Math.random() * TEX) | 0;
    const len = 2 + ((Math.random() * 3) | 0);
    const bright = Math.random() < 0.12;
    for (let k = 0; k < len; k++) {
      const idx = (((y + k) & TEX_MASK) * TEX + x) | 0;
      const c = out[idx];
      const r = c & 255;
      const g = (c >> 8) & 255;
      const b = (c >> 16) & 255;
      out[idx] = bright
        ? pack(Math.min(255, r + 60), Math.min(255, g + 55), Math.min(255, b + 10))
        : pack(Math.min(255, r + 18), Math.min(255, g + 26), Math.min(255, b + 6));
    }
  }
  return out;
}

const hedgeTex = makeHedgeTexture();
const hedgeTexDark = darken(hedgeTex, 0.72);
const grassTex = makeGrassTexture();

function fogged(c: number, t: number): number {
  const r = c & 255;
  const g = (c >> 8) & 255;
  const b = (c >> 16) & 255;
  return pack(
    (r + (HAZE[0] - r) * t) | 0,
    (g + (HAZE[1] - g) * t) | 0,
    (b + (HAZE[2] - b) * t) | 0
  );
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    const b = a + Math.PI / 5;
    ctx.lineTo(x + Math.cos(b) * r * 0.45, y + Math.sin(b) * r * 0.45);
  }
  ctx.closePath();
}

function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

const CLOUDS: [number, number, number][] = [
  [0.06, 0.3, 1.5],
  [0.22, 0.16, 1.0],
  [0.38, 0.42, 1.9],
  [0.55, 0.22, 1.2],
  [0.71, 0.38, 1.6],
  [0.88, 0.2, 1.0],
];

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
  useEffect(() => {
    allFoundRef.current = allFound;
  }, [allFound]);

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
    // low-res buffer the raycaster draws into, scaled up on the main canvas
    let RW = 0;
    let RH = 0;
    let buffer: HTMLCanvasElement | null = null;
    let bctx: CanvasRenderingContext2D | null = null;
    let img: ImageData | null = null;
    let px32: Uint32Array | null = null;
    let zBuffer = new Float32Array(0);
    let skyData: Uint32Array | null = null;
    let skyW = 0;
    let skyH = 0;

    const buildSky = () => {
      skyW = RW * 4;
      skyH = Math.max(2, RH >> 1);
      const c = document.createElement("canvas");
      c.width = skyW;
      c.height = skyH;
      const g = c.getContext("2d")!;
      const grad = g.createLinearGradient(0, 0, 0, skyH);
      grad.addColorStop(0, SKY_TOP);
      grad.addColorStop(1, SKY_HORIZON);
      g.fillStyle = grad;
      g.fillRect(0, 0, skyW, skyH);

      const sunX = skyW * 0.55;
      const sunY = skyH * 0.32;
      const sunR = skyH * 0.16;
      const glow = g.createRadialGradient(sunX, sunY, sunR * 0.3, sunX, sunY, sunR * 4);
      glow.addColorStop(0, "rgba(255,246,200,0.95)");
      glow.addColorStop(1, "rgba(255,246,200,0)");
      g.fillStyle = glow;
      g.fillRect(sunX - sunR * 4, sunY - sunR * 4, sunR * 8, sunR * 8);
      g.fillStyle = "#fff4b8";
      g.beginPath();
      g.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      g.fill();

      for (const [u, v, s] of CLOUDS) {
        const cx = u * skyW;
        const cy = (0.12 + v * 0.4) * skyH;
        const cw = skyH * 0.5 * s;
        g.fillStyle = "rgba(255,255,255,0.55)";
        for (const [ox, oy, or] of [
          [0, 0, 1],
          [-0.7, 0.15, 0.7],
          [0.7, 0.18, 0.75],
          [0.25, -0.3, 0.6],
          [-0.3, -0.25, 0.55],
        ] as const) {
          g.beginPath();
          g.ellipse(cx + ox * cw, cy + oy * cw * 0.8, cw * or, cw * or * 0.55, 0, 0, Math.PI * 2);
          g.fill();
        }
      }
      skyData = new Uint32Array(g.getImageData(0, 0, skyW, skyH).data.buffer);
    };

    const resize = () => {
      W = wrap.clientWidth;
      H = Math.min(560, Math.max(300, Math.round(W * 0.55)));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;

      RW = Math.max(240, Math.min(460, Math.round(W * 0.45)));
      RH = Math.max(140, Math.round((RW * H) / W));
      if (RH % 2 === 1) RH++;
      buffer = document.createElement("canvas");
      buffer.width = RW;
      buffer.height = RH;
      bctx = buffer.getContext("2d");
      img = bctx ? bctx.createImageData(RW, RH) : null;
      px32 = img ? new Uint32Array(img.data.buffer) : null;
      zBuffer = new Float32Array(RW);
      buildSky();
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
    let walkAmp = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (++paletteTick % 30 === 0) readPalette();
      if (!bctx || !img || !px32 || !skyData || !buffer) return;

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

      // --- raycast into low-res buffer ---
      const dirX = Math.cos(p.angle);
      const dirY = Math.sin(p.angle);
      const planeScale = Math.tan(FOV / 2);
      const planeX = -dirY * planeScale;
      const planeY = dirX * planeScale;
      const halfRH = RH / 2;
      const buf = px32;
      const sky = skyData;
      const TWO_PI = Math.PI * 2;

      for (let x = 0; x < RW; x++) {
        const cameraX = (2 * x) / RW - 1;
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
        const perpDist = Math.max(0.05, side === 0 ? sideX - deltaX : sideY - deltaY);
        zBuffer[x] = perpDist;

        // wall hit point in world coords (for texturing + floor casting)
        let hitX: number;
        let hitY: number;
        if (side === 0) {
          hitX = mapX + (stepX < 0 ? 1 : 0);
          hitY = p.y + perpDist * rayY;
        } else {
          hitY = mapY + (stepY < 0 ? 1 : 0);
          hitX = p.x + perpDist * rayX;
        }
        const wallFrac = side === 0 ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX);
        const texX = (wallFrac * TEX) & TEX_MASK;

        const lineH = RH / perpDist;
        const y0 = halfRH - lineH / 2;
        const ys = Math.max(0, Math.ceil(y0));
        const ye = Math.min(RH - 1, Math.floor(halfRH + lineH / 2));
        const wallFog = Math.min(0.82, Math.max(0, (perpDist - 1.2) / FOG_DIST));
        const wallTex = side === 1 ? hedgeTexDark : hedgeTex;

        // sky (panorama sample, parallaxes with view angle)
        const colAngle = p.angle + Math.atan(cameraX * planeScale);
        let su = (colAngle / TWO_PI) % 1;
        if (su < 0) su += 1;
        const sx = (su * skyW) | 0;
        for (let y = 0; y < ys; y++) {
          const syr = y < skyH ? y : skyH - 1;
          buf[y * RW + x] = sky[syr * skyW + sx];
        }

        // textured wall column
        const texStep = TEX / lineH;
        let texPos = (ys - y0) * texStep;
        for (let y = ys; y <= ye; y++) {
          const ty = texPos & TEX_MASK;
          texPos += texStep;
          buf[y * RW + x] = wallFog > 0.01 ? fogged(wallTex[ty * TEX + texX], wallFog) : wallTex[ty * TEX + texX];
        }

        // floor casting (perspective-correct grass)
        for (let y = ye + 1; y < RH; y++) {
          const curDist = RH / (2 * y - RH);
          const w = curDist / perpDist;
          const fx = w * hitX + (1 - w) * p.x;
          const fy = w * hitY + (1 - w) * p.y;
          const tx = Math.floor(fx * TEX) & TEX_MASK;
          const ty2 = Math.floor(fy * TEX) & TEX_MASK;
          const fog = Math.min(0.82, Math.max(0, (curDist - 1.2) / FOG_DIST));
          const c = grassTex[ty2 * TEX + tx];
          buf[y * RW + x] = fog > 0.01 ? fogged(c, fog) : c;
        }
      }

      bctx.putImageData(img, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(buffer, 0, 0, RW, RH, 0, 0, W, H);

      const horizon = H / 2;

      // --- item sprites (XP orbs) ---
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

      for (const { item, transX, depth } of sprites) {
        const screenX = (W / 2) * (1 + transX / depth);
        const zi = Math.round((screenX / W) * RW);
        if (zi < 0 || zi >= RW || zBuffer[zi] < depth) continue;

        const isFound = foundRef.current.has(item.id);
        const pulse = isFound ? 1 : 1 + 0.1 * Math.sin(now / 260);
        const r = Math.min(H * 0.45, (H / depth) * 0.2 * pulse);
        const float = isFound ? 0 : Math.sin(now / 420 + item.col) * r * 0.12;
        const cy = horizon + (H / depth) * 0.18 + float;

        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#1d3a1d";
        ctx.beginPath();
        ctx.ellipse(screenX, horizon + (H / depth) * 0.18 + r * 0.95, r * 0.8, r * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (isFound) ctx.globalAlpha = 0.45;
        else {
          const orbGlow = ctx.createRadialGradient(screenX, cy, r * 0.5, screenX, cy, r * 1.8);
          orbGlow.addColorStop(0, "rgba(255,215,90,0.45)");
          orbGlow.addColorStop(1, "rgba(255,215,90,0)");
          ctx.fillStyle = orbGlow;
          ctx.beginPath();
          ctx.arc(screenX, cy, r * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        const orb = ctx.createRadialGradient(screenX - r * 0.3, cy - r * 0.3, r * 0.15, screenX, cy, r);
        if (isFound) {
          orb.addColorStop(0, "#d9e2cc");
          orb.addColorStop(1, palette.sage);
        } else {
          orb.addColorStop(0, "#fff3b8");
          orb.addColorStop(1, "#f2a72e");
        }
        ctx.fillStyle = orb;
        ctx.beginPath();
        ctx.arc(screenX, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isFound ? "rgba(60,80,45,0.6)" : "#cf831c";
        ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        starPath(ctx, screenX, cy + r * 0.03, r * 0.55);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // --- mini-me, seen from behind ---
      const moving = walk !== 0 || drag.current !== null;
      walkAmp += ((moving ? 1 : 0) - walkAmp) * Math.min(1, dt * 8);
      const swing = Math.sin(bob.current) * walkAmp;
      const u = Math.max(14, H * 0.058);
      const cx = W / 2;
      const bobY = Math.abs(Math.cos(bob.current)) * u * 0.16 * walkAmp;
      const feetY = H - u * 0.3 - bobY;

      const SKIN = "#e3a973";
      const SKIN_DARK = "#c98e5d";
      const HAIR_LIGHT = "#4a3522";
      const HAIR_DARK = "#1c120a";
      const shirtBase = palette.accent;
      const shirtLight = shade(palette.accent, 0.28);
      const shirtDark = shade(palette.accent, -0.32);
      const PANTS = "#3b4668";
      const PANTS_DARK = "#2a3350";
      const SHOES = "#241f1a";
      const SOLE = "#9b8468";
      const OUTLINE = "rgba(22,16,10,0.45)";

      // soft ground shadow
      const shGrad = ctx.createRadialGradient(cx, H - u * 0.15, u * 0.2, cx, H - u * 0.15, u * 2);
      shGrad.addColorStop(0, "rgba(15,30,15,0.4)");
      shGrad.addColorStop(1, "rgba(15,30,15,0)");
      ctx.fillStyle = shGrad;
      ctx.save();
      ctx.translate(cx, H - u * 0.15);
      ctx.scale(1, 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, u * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const hipY = feetY - u * 2.1;
      const liftL = Math.max(0, swing) * u * 0.55;
      const liftR = Math.max(0, -swing) * u * 0.55;

      // legs (jeans with shaded inner edge), knees bend slightly on lift
      ctx.lineCap = "round";
      for (const [sgn, lift] of [
        [-1, liftL],
        [1, liftR],
      ] as const) {
        const lx = cx + sgn * u * 0.45;
        const kneeY = hipY + (feetY - hipY) * 0.5 - lift * 0.4;
        const kneeX = lx + sgn * lift * 0.12;
        const footY = feetY - lift;
        ctx.strokeStyle = PANTS;
        ctx.lineWidth = u * 0.62;
        ctx.beginPath();
        ctx.moveTo(lx, hipY);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(lx, footY - u * 0.28);
        ctx.stroke();
        // inner-edge shading + center seam
        ctx.strokeStyle = PANTS_DARK;
        ctx.lineWidth = u * 0.16;
        ctx.beginPath();
        ctx.moveTo(lx - sgn * u * 0.2, hipY + u * 0.1);
        ctx.lineTo(kneeX - sgn * u * 0.2, kneeY);
        ctx.lineTo(lx - sgn * u * 0.2, footY - u * 0.32);
        ctx.stroke();

        // shoe (sole shows when the foot lifts)
        if (lift > u * 0.08) {
          ctx.fillStyle = SOLE;
          ctx.beginPath();
          ctx.ellipse(lx, footY + u * 0.1, u * 0.4, u * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = SHOES;
        ctx.beginPath();
        ctx.ellipse(lx, footY, u * 0.42, u * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(lx, footY - u * 0.06, u * 0.34, u * 0.14, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
      }

      // torso (shirt with sun-side highlight, folds, hem)
      const shoulderY = hipY - u * 2.3;
      const torso = () => {
        ctx.beginPath();
        ctx.moveTo(cx - u * 0.95, hipY + u * 0.2);
        ctx.lineTo(cx - u * 1.15, shoulderY + u * 0.5);
        ctx.quadraticCurveTo(cx - u * 1.15, shoulderY - u * 0.15, cx - u * 0.55, shoulderY - u * 0.25);
        ctx.lineTo(cx + u * 0.55, shoulderY - u * 0.25);
        ctx.quadraticCurveTo(cx + u * 1.15, shoulderY - u * 0.15, cx + u * 1.15, shoulderY + u * 0.5);
        ctx.lineTo(cx + u * 0.95, hipY + u * 0.2);
        ctx.closePath();
      };
      const shirtGrad = ctx.createLinearGradient(cx - u * 1.15, shoulderY, cx + u * 1.15, hipY);
      shirtGrad.addColorStop(0, shirtLight);
      shirtGrad.addColorStop(0.45, shirtBase);
      shirtGrad.addColorStop(1, shirtDark);
      ctx.fillStyle = shirtGrad;
      torso();
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.save();
      torso();
      ctx.clip();
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = u * 0.08;
      ctx.beginPath(); // fabric folds
      ctx.moveTo(cx - u * 0.7, hipY - u * 0.1);
      ctx.quadraticCurveTo(cx - u * 0.2, hipY - u * 0.5, cx + u * 0.1, hipY - u * 0.05);
      ctx.moveTo(cx + u * 0.3, hipY - u * 0.3);
      ctx.quadraticCurveTo(cx + u * 0.7, hipY - u * 0.6, cx + u * 0.85, hipY - u * 0.15);
      ctx.moveTo(cx - u * 0.9, shoulderY + u * 0.9 + swing * u * 0.2);
      ctx.quadraticCurveTo(cx, shoulderY + u * 1.15, cx + u * 0.9, shoulderY + u * 0.9 - swing * u * 0.2);
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.18)"; // hem shadow
      ctx.fillRect(cx - u * 1.2, hipY - u * 0.02, u * 2.4, u * 0.25);
      ctx.restore();

      // arms: shirt sleeve to elbow, bare forearm + hand below
      for (const [sgn, handPhase] of [
        [-1, swing],
        [1, -swing],
      ] as const) {
        const shoulderX = cx + sgn * u * 0.95;
        const elbowX = cx + sgn * (u * 1.2 + Math.abs(handPhase) * u * 0.06);
        const elbowY = shoulderY + u * 1.15 + handPhase * u * 0.3;
        const handX = cx + sgn * (u * 1.28 + Math.abs(handPhase) * u * 0.1);
        const handY = shoulderY + u * 2.15 + handPhase * u * 0.75;
        ctx.strokeStyle = sgn < 0 ? shirtLight : shirtDark;
        ctx.lineWidth = u * 0.46;
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY + u * 0.15);
        ctx.lineTo(elbowX, elbowY);
        ctx.stroke();
        ctx.strokeStyle = sgn < 0 ? SKIN : SKIN_DARK;
        ctx.lineWidth = u * 0.34;
        ctx.beginPath();
        ctx.moveTo(elbowX, elbowY);
        ctx.lineTo(handX, handY - u * 0.15);
        ctx.stroke();
        ctx.fillStyle = sgn < 0 ? SKIN : SKIN_DARK;
        ctx.beginPath();
        ctx.arc(handX, handY, u * 0.27, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // neck + head
      ctx.fillStyle = SKIN_DARK;
      ctx.fillRect(cx - u * 0.22, shoulderY - u * 0.75, u * 0.44, u * 0.6);
      const headX = cx + swing * u * 0.05;
      const headY = shoulderY - u * 1.55;
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.arc(headX, headY, u, 0, Math.PI * 2);
      ctx.fill();
      // hair (back of head) with sheen + strands
      const hairGrad = ctx.createRadialGradient(
        headX - u * 0.4,
        headY - u * 0.5,
        u * 0.2,
        headX,
        headY,
        u * 1.05
      );
      hairGrad.addColorStop(0, HAIR_LIGHT);
      hairGrad.addColorStop(1, HAIR_DARK);
      ctx.fillStyle = hairGrad;
      ctx.beginPath();
      ctx.arc(headX, headY - u * 0.06, u * 0.99, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = u * 0.05;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(headX + i * u * 0.05, headY - u * 0.06, u * (0.55 + Math.abs(i) * 0.16), -Math.PI * 0.85, -Math.PI * 0.25);
        ctx.stroke();
      }
      // nape edge + ears
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = u * 0.06;
      ctx.beginPath();
      ctx.arc(headX, headY + u * 0.15, u * 0.7, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.arc(headX - u * 0.97, headY + u * 0.12, u * 0.17, 0, Math.PI * 2);
      ctx.arc(headX + u * 0.97, headY + u * 0.12, u * 0.17, 0, Math.PI * 2);
      ctx.fill();

      if (allFoundRef.current) {
        const s = u * 1.05;
        const top = headY - u - s * 0.55;
        ctx.fillStyle = "#f5c542";
        ctx.beginPath();
        ctx.moveTo(headX - s * 0.5, top + s * 0.55);
        ctx.lineTo(headX - s * 0.55, top + s * 0.1);
        ctx.lineTo(headX - s * 0.22, top + s * 0.32);
        ctx.lineTo(headX, top);
        ctx.lineTo(headX + s * 0.22, top + s * 0.32);
        ctx.lineTo(headX + s * 0.55, top + s * 0.1);
        ctx.lineTo(headX + s * 0.5, top + s * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(160,110,20,0.7)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // --- minimap ---
      const mapW = Math.min(170, W * 0.24);
      const cellPx = mapW / COLS;
      const mapH = cellPx * ROWS;
      const mx = W - mapW - 12;
      const my = 12;
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = "#eaf3e2";
      ctx.fillRect(mx, my, mapW, mapH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgb(38,88,44)";
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, my, mapW, mapH);
      ctx.fillStyle = "rgb(52,112,56)";
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (isWall(c, r)) ctx.fillRect(mx + c * cellPx, my + r * cellPx, cellPx + 0.5, cellPx + 0.5);
      for (const item of items) {
        ctx.fillStyle = foundRef.current.has(item.id) ? palette.sage : "#f2a72e";
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
