"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { COLS, ROWS, isWall, items, start, type MazeItem } from "@/lib/maze";
import SectionHeading from "@/components/ui/SectionHeading";

const FOV = (66 * Math.PI) / 180;
const MOVE_SPEED = 2.4;
const TURN_SPEED = 2.6;
const PLAYER_RADIUS = 0.34;
const PICKUP_DIST = 0.6;

const TEX = 64;
const TEX_MASK = TEX - 1;
const LOGICAL = 16; // minecraft textures are 16x16 logical pixels
const PX = TEX / LOGICAL; // each logical pixel maps to PX texels
const FOG_DIST = 13;
const HAZE: [number, number, number] = [199, 226, 240];
const SKY_TOP = "#7AB7E8";
const SKY_HORIZON = "#C6E1F0";

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

function paintBlock(out: Uint32Array, lx: number, ly: number, color: number) {
  const x0 = lx * PX;
  const y0 = ly * PX;
  for (let dy = 0; dy < PX; dy++) {
    const yo = (y0 + dy) * TEX;
    for (let dx = 0; dx < PX; dx++) {
      out[yo + x0 + dx] = color;
    }
  }
}

// cobblestone — irregular grey stones separated by dark mortar (16x16 logical)
function makeCobblestoneTexture(): Uint32Array {
  const out = new Uint32Array(TEX * TEX);
  const mortar = pack(38, 38, 38);
  for (let i = 0; i < out.length; i++) out[i] = mortar;

  const shades = [
    { base: pack(132, 132, 132), hi: pack(172, 172, 172), lo: pack(82, 82, 82) },
    { base: pack(145, 145, 145), hi: pack(185, 185, 185), lo: pack(92, 92, 92) },
    { base: pack(115, 115, 115), hi: pack(152, 152, 152), lo: pack(68, 68, 68) },
  ];
  type Stone = { x0: number; y0: number; x1: number; y1: number; shade: number };
  const stones: Stone[] = [
    { x0: 1, y0: 1, x1: 6, y1: 5, shade: 0 },
    { x0: 8, y0: 1, x1: 14, y1: 6, shade: 1 },
    { x0: 1, y0: 7, x1: 4, y1: 13, shade: 2 },
    { x0: 6, y0: 8, x1: 11, y1: 11, shade: 1 },
    { x0: 13, y0: 8, x1: 14, y1: 11, shade: 0 },
    { x0: 6, y0: 13, x1: 14, y1: 14, shade: 2 },
    { x0: 1, y0: 14, x1: 4, y1: 14, shade: 0 },
  ];
  for (const s of stones) {
    const sh = shades[s.shade];
    for (let y = s.y0; y <= s.y1; y++) {
      for (let x = s.x0; x <= s.x1; x++) {
        let c = sh.base;
        const r = Math.random();
        if (r < 0.15) c = sh.lo;
        else if (r < 0.30) c = sh.hi;
        paintBlock(out, x, y, c);
      }
    }
    for (let x = s.x0; x <= s.x1; x++) {
      paintBlock(out, x, s.y0, sh.hi);
      paintBlock(out, x, s.y1, sh.lo);
    }
    for (let y = s.y0; y <= s.y1; y++) {
      paintBlock(out, s.x0, y, sh.hi);
      paintBlock(out, s.x1, y, sh.lo);
    }
    paintBlock(out, s.x0, s.y0, sh.hi);
    paintBlock(out, s.x1, s.y1, sh.lo);
  }
  return out;
}

// grass top — chunky green pixels
function makeGrassTopTexture(): Uint32Array {
  const out = new Uint32Array(TEX * TEX);
  const greens = [
    pack(76, 124, 47),
    pack(91, 138, 53),
    pack(105, 153, 62),
    pack(120, 165, 70),
    pack(70, 115, 42),
    pack(95, 145, 55),
  ];
  for (let y = 0; y < LOGICAL; y++) {
    for (let x = 0; x < LOGICAL; x++) {
      paintBlock(out, x, y, greens[(Math.random() * greens.length) | 0]);
    }
  }
  for (let i = 0; i < 8; i++) {
    paintBlock(out, (Math.random() * LOGICAL) | 0, (Math.random() * LOGICAL) | 0, pack(140, 185, 80));
  }
  for (let i = 0; i < 4; i++) {
    paintBlock(out, (Math.random() * LOGICAL) | 0, (Math.random() * LOGICAL) | 0, pack(150, 170, 65));
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

const wallTex = makeCobblestoneTexture();
const wallTexDark = darken(wallTex, 0.7);
const grassTex = makeGrassTopTexture();

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

function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// pre-rendered ore-block sprite — drawn pixelated at any size via drawImage + no smoothing
function makeOreBlockSprite(found: boolean): HTMLCanvasElement {
  const S = 16;
  const SCALE = 8;
  const c = document.createElement("canvas");
  c.width = c.height = S * SCALE;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const px = (x: number, y: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
  };
  const base = found ? "#6a7a4a" : "#888888";
  const hi = found ? "#94a36c" : "#aaaaaa";
  const lo = found ? "#4a5630" : "#555555";
  const ore = found ? "#506037" : "#ffce4a";
  const oreHi = found ? "#647645" : "#fff1a8";

  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) px(x, y, base);
  for (let i = 0; i < S; i++) {
    px(i, 0, hi);
    px(0, i, hi);
    px(i, S - 1, lo);
    px(S - 1, i, lo);
  }
  const variations: Array<[number, number, string]> = [
    [3, 3, lo],
    [10, 2, lo],
    [2, 9, lo],
    [12, 11, lo],
    [5, 6, hi],
    [11, 8, hi],
    [3, 13, hi],
  ];
  for (const [x, y, col] of variations) px(x, y, col);
  const orePattern: Array<[number, number]> = [
    [3, 2], [4, 2], [3, 3],
    [9, 3], [10, 3], [11, 3], [10, 4],
    [2, 7], [3, 7], [3, 8],
    [7, 8], [8, 8], [9, 8], [8, 9],
    [11, 11], [12, 11], [11, 12],
    [5, 12], [6, 12],
  ];
  for (const [x, y] of orePattern) px(x, y, ore);
  px(3, 2, oreHi);
  px(10, 3, oreHi);
  px(2, 7, oreHi);
  px(7, 8, oreHi);
  px(11, 11, oreHi);
  px(5, 12, oreHi);
  return c;
}

let oreSpriteActive: HTMLCanvasElement | null = null;
let oreSpriteFound: HTMLCanvasElement | null = null;

const CLOUDS: [number, number, "sm" | "md" | "lg"][] = [
  [0.06, 0.30, "lg"],
  [0.23, 0.16, "sm"],
  [0.39, 0.42, "md"],
  [0.56, 0.22, "sm"],
  [0.72, 0.38, "lg"],
  [0.88, 0.18, "md"],
];

const CLOUD_SHAPES: Record<string, [number, number][]> = {
  sm: [
    [1, 0], [2, 0], [3, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
    [1, 2], [2, 2], [3, 2],
  ],
  md: [
    [2, 0], [3, 0], [4, 0], [5, 0],
    [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
    [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
  ],
  lg: [
    [2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
    [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
    [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3],
    [3, 4], [4, 4], [5, 4], [6, 4],
  ],
};

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
    if (!oreSpriteActive) oreSpriteActive = makeOreBlockSprite(false);
    if (!oreSpriteFound) oreSpriteFound = makeOreBlockSprite(true);

    let W = 0;
    let H = 0;
    let dpr = 1;
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
      g.imageSmoothingEnabled = false;

      const grad = g.createLinearGradient(0, 0, 0, skyH);
      grad.addColorStop(0, SKY_TOP);
      grad.addColorStop(0.78, SKY_HORIZON);
      grad.addColorStop(1, "#dceaf1");
      g.fillStyle = grad;
      g.fillRect(0, 0, skyW, skyH);

      const cloudPx = Math.max(3, (skyH / 26) | 0);
      const sunSize = cloudPx * 8;
      const sunX = Math.round(skyW * 0.55 - sunSize / 2);
      const sunY = Math.round(skyH * 0.30 - sunSize / 2);

      g.fillStyle = "rgba(255,243,180,0.18)";
      g.fillRect(sunX - sunSize * 0.5, sunY - sunSize * 0.5, sunSize * 2, sunSize * 2);
      g.fillStyle = "rgba(255,243,180,0.30)";
      g.fillRect(sunX - sunSize * 0.2, sunY - sunSize * 0.2, sunSize * 1.4, sunSize * 1.4);

      g.fillStyle = "#fff5b5";
      g.fillRect(sunX, sunY, sunSize, sunSize);
      g.fillStyle = "#fffce0";
      g.fillRect(sunX + cloudPx, sunY + cloudPx, sunSize - cloudPx * 2, sunSize - cloudPx * 2);

      g.fillStyle = "rgba(255,255,255,0.92)";
      for (const [u, v, kind] of CLOUDS) {
        const cx = u * skyW;
        const cy = (0.10 + v * 0.40) * skyH;
        const shape = CLOUD_SHAPES[kind];
        for (const [dx, dy] of shape) {
          g.fillRect(Math.round(cx + dx * cloudPx), Math.round(cy + dy * cloudPx), cloudPx + 0.5, cloudPx + 0.5);
        }
      }
      // cloud underside shadow
      g.fillStyle = "rgba(40,80,110,0.10)";
      for (const [u, v, kind] of CLOUDS) {
        const cx = u * skyW;
        const cy = (0.10 + v * 0.40) * skyH;
        const shape = CLOUD_SHAPES[kind];
        for (const [dx, dy] of shape) {
          g.fillRect(Math.round(cx + dx * cloudPx), Math.round(cy + (dy + 1) * cloudPx), cloudPx + 0.5, 2);
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

      // lower internal res for chunky pixelated upscale
      RW = Math.max(210, Math.min(400, Math.round(W * 0.36)));
      RH = Math.max(130, Math.round((RW * H) / W));
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
        const wallTexN = side === 1 ? wallTexDark : wallTex;

        const colAngle = p.angle + Math.atan(cameraX * planeScale);
        let su = (colAngle / TWO_PI) % 1;
        if (su < 0) su += 1;
        const sx = (su * skyW) | 0;
        for (let y = 0; y < ys; y++) {
          const syr = y < skyH ? y : skyH - 1;
          buf[y * RW + x] = sky[syr * skyW + sx];
        }

        const texStep = TEX / lineH;
        let texPos = (ys - y0) * texStep;
        for (let y = ys; y <= ye; y++) {
          const ty = texPos & TEX_MASK;
          texPos += texStep;
          buf[y * RW + x] =
            wallFog > 0.01 ? fogged(wallTexN[ty * TEX + texX], wallFog) : wallTexN[ty * TEX + texX];
        }

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
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buffer, 0, 0, RW, RH, 0, 0, W, H);

      const horizon = H / 2;

      // --- floating ore-block items ---
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
        const baseSize = Math.min(H * 0.5, (H / depth) * 0.32);
        const float = isFound ? 0 : Math.sin(now / 520 + item.col) * baseSize * 0.10;
        const cy = horizon + (H / depth) * 0.20 + float;
        const half = baseSize / 2;
        const x0 = Math.round(screenX - half);
        const y0 = Math.round(cy - half);
        const size = Math.round(baseSize);

        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "#0d1d0d";
        ctx.beginPath();
        ctx.ellipse(screenX, horizon + (H / depth) * 0.22 + half * 0.8, half * 0.95, half * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (!isFound) {
          const glow = ctx.createRadialGradient(screenX, cy, half * 0.5, screenX, cy, half * 2);
          glow.addColorStop(0, "rgba(255,210,70,0.32)");
          glow.addColorStop(1, "rgba(255,210,70,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(x0 - half, y0 - half, size + half * 2, size + half * 2);
        }

        if (isFound) ctx.globalAlpha = 0.55;
        const sprite = isFound ? oreSpriteFound : oreSpriteActive;
        if (sprite) ctx.drawImage(sprite, x0, y0, size, size);
        ctx.globalAlpha = 1;
      }

      // --- Steve (blocky back-view) ---
      const moving = walk !== 0 || drag.current !== null;
      walkAmp += ((moving ? 1 : 0) - walkAmp) * Math.min(1, dt * 8);
      const swing = Math.sin(bob.current) * walkAmp;
      const u = Math.max(18, H * 0.075);
      const bobY = Math.abs(Math.cos(bob.current)) * u * 0.14 * walkAmp;
      const cx = W / 2;
      const feetY = H - u * 0.18 - bobY;
      const SPX = u / 4.5; // size of one Minecraft pixel
      const STEVE_H = 32; // logical pixels tall
      const topY = Math.round(feetY - STEVE_H * SPX);
      const baseLeft = Math.round(cx - 8 * SPX);

      const drawSp = (lx: number, ly: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(baseLeft + lx * SPX, topY + ly * SPX, w * SPX + 0.5, h * SPX + 0.5);
      };

      const HAIR = "#2d1c0a";
      const HAIR_HL = "#4a3018";
      const SKIN_C = "#e2a36b";
      const SKIN_SH = "#b87a48";
      const SHIRT = palette.accent;
      const SHIRT_HL = shade(palette.accent, 0.22);
      const SHIRT_SH = shade(palette.accent, -0.28);
      const PANTS_C = "#3b4668";
      const PANTS_SH = "#2a3350";
      const SHOES_C = "#1a1610";

      // ground shadow oval
      const sh = ctx.createRadialGradient(cx, H - u * 0.05, u * 0.2, cx, H - u * 0.05, u * 1.9);
      sh.addColorStop(0, "rgba(12,28,12,0.45)");
      sh.addColorStop(1, "rgba(12,28,12,0)");
      ctx.fillStyle = sh;
      ctx.save();
      ctx.translate(cx, H - u * 0.05);
      ctx.scale(1, 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, u * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // subtle head sway with stride
      const headSway = Math.round(swing * 0.8); // -1, 0, 1 logical px

      // HEAD (8x8 cube, cols 4-11, rows 0-7) — flat back face, all hair
      drawSp(4 + headSway, 0, 8, 8, HAIR);
      // top edge (sun-lit) and bottom edge (head-to-body shadow) — gives the cube depth
      drawSp(4 + headSway, 0, 8, 1, HAIR_HL);
      drawSp(4 + headSway, 7, 8, 1, "#1a0f06");
      // a few scattered HAIR_HL strands for skin/hair texture
      drawSp(5 + headSway, 2, 1, 1, HAIR_HL);
      drawSp(8 + headSway, 1, 1, 1, HAIR_HL);
      drawSp(10 + headSway, 4, 1, 1, HAIR_HL);
      drawSp(6 + headSway, 5, 1, 1, HAIR_HL);
      drawSp(9 + headSway, 6, 1, 1, HAIR_HL);

      // TORSO (8x12, cols 4-11, rows 8-19)
      drawSp(4, 8, 8, 12, SHIRT);
      drawSp(4, 8, 1, 12, SHIRT_HL);
      drawSp(11, 8, 1, 12, SHIRT_SH);
      drawSp(4, 8, 8, 1, SHIRT_HL);
      drawSp(4, 19, 8, 1, SHIRT_SH);
      drawSp(7, 9, 1, 10, SHIRT_SH);

      // ARMS swing opposite to same-side leg (contralateral) so the walk reads naturally.
      // RIGHT ARM (viewer's left, cols 0-3, rows 8-19)
      const rArmUp = Math.max(0, Math.round(-swing));  // forward when LEFT leg forward
      drawSp(0, 8 - rArmUp, 4, 10, SHIRT);
      drawSp(0, 8 - rArmUp, 4, 1, SHIRT_HL);
      drawSp(0, 8 - rArmUp, 1, 10, SHIRT_HL);
      drawSp(3, 8 - rArmUp, 1, 10, SHIRT_SH);
      drawSp(0, 18 - rArmUp, 4, 2, SKIN_C);
      drawSp(3, 18 - rArmUp, 1, 2, SKIN_SH);

      // LEFT ARM (viewer's right, cols 12-15, rows 8-19)
      const lArmUp = Math.max(0, Math.round(swing));   // forward when RIGHT leg forward
      drawSp(12, 8 - lArmUp, 4, 10, SHIRT);
      drawSp(12, 8 - lArmUp, 4, 1, SHIRT_HL);
      drawSp(12, 8 - lArmUp, 1, 10, SHIRT_HL);
      drawSp(15, 8 - lArmUp, 1, 10, SHIRT_SH);
      drawSp(12, 18 - lArmUp, 4, 2, SKIN_C);
      drawSp(15, 18 - lArmUp, 1, 2, SKIN_SH);

      // LEGS — hip fixed at row 20, foot rises when swinging forward.
      const LEG_LIFT_MAX = 3; // logical px of foot lift
      const liftR = Math.round(Math.max(0, swing) * LEG_LIFT_MAX);
      const liftL = Math.round(Math.max(0, -swing) * LEG_LIFT_MAX);
      const drawLeg = (xCol: number, lift: number) => {
        const shoesTop = 30 - lift;            // 2-row shoe
        const pantsH = shoesTop - 20;          // pants compress as leg lifts (knee bend)
        if (pantsH > 0) {
          drawSp(xCol, 20, 4, pantsH, PANTS_C);
          drawSp(xCol, 20, 4, 1, "rgba(255,255,255,0.10)");
          drawSp(xCol + 3, 20, 1, pantsH, PANTS_SH);
        }
        drawSp(xCol, shoesTop, 4, 2, SHOES_C);
        // sole shows when foot is lifted
        if (lift > 0) drawSp(xCol, shoesTop + 1, 4, 1, "#3a3026");
      };
      drawLeg(4, liftR); // right leg (viewer's left)
      drawLeg(8, liftL); // left  leg (viewer's right)

      // crown when all found
      if (allFoundRef.current) {
        drawSp(4 + headSway, -2, 8, 2, "#f5c542");
        drawSp(4 + headSway, -4, 1, 2, "#f5c542");
        drawSp(7 + headSway, -4, 2, 2, "#f5c542");
        drawSp(11 + headSway, -4, 1, 2, "#f5c542");
        drawSp(5 + headSway, -3, 1, 1, "#ffe57a");
        drawSp(8 + headSway, -3, 1, 1, "#ffe57a");
        drawSp(11 + headSway, -3, 1, 1, "#ffe57a");
        drawSp(4 + headSway, -1, 8, 1, "#c98a1f");
      }

      // --- minimap (top-down, blocky) ---
      const mapW = Math.min(170, W * 0.24);
      const cellPx = mapW / COLS;
      const mapH = cellPx * ROWS;
      const mx = W - mapW - 12;
      const my = 12;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#cfe3b4";
      ctx.fillRect(mx, my, mapW, mapH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(40,55,40,0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, my, mapW, mapH);
      ctx.fillStyle = "#7a7a7a";
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (isWall(c, r)) ctx.fillRect(mx + c * cellPx, my + r * cellPx, cellPx + 0.5, cellPx + 0.5);
      // mortar lines on walls for cobble feel
      ctx.fillStyle = "rgba(40,40,40,0.6)";
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (isWall(c, r)) ctx.fillRect(mx + c * cellPx, my + r * cellPx, cellPx + 0.5, 1);
      for (const item of items) {
        ctx.fillStyle = foundRef.current.has(item.id) ? palette.sage : "#ffce4a";
        ctx.fillRect(
          mx + (item.col + 0.18) * cellPx,
          my + (item.row + 0.18) * cellPx,
          cellPx * 0.64,
          cellPx * 0.64
        );
      }
      const pxm = mx + p.x * cellPx;
      const pym = my + p.y * cellPx;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pxm, pym);
      ctx.lineTo(pxm + dirX * cellPx * 1.4, pym + dirY * cellPx * 1.4);
      ctx.stroke();
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.arc(pxm, pym, cellPx * 0.4, 0, Math.PI * 2);
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
    // Mouse: vertical drag also pushes forward/back. Touch: turn only — buttons handle moving.
    if (e.pointerType !== "touch") {
      const step = -dy * 0.02;
      const nx = p.x + Math.cos(p.angle) * step;
      const ny = p.y + Math.sin(p.angle) * step;
      if (canStand(nx, p.y)) p.x = nx;
      if (canStand(p.x, ny)) p.y = ny;
      bob.current += Math.abs(dy) * 0.02;
    }
  };

  const pressKey = (k: string) => keys.current.add(k);
  const releaseKey = (k: string) => keys.current.delete(k);
  const touchBtnProps = (keyName: string, ariaLabel: string) => ({
    type: "button" as const,
    "data-interactive": true,
    "aria-label": ariaLabel,
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      pressKey(keyName);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      releaseKey(keyName);
    },
    onPointerCancel: () => releaseKey(keyName),
    onPointerLeave: () => releaseKey(keyName),
    onLostPointerCapture: () => releaseKey(keyName),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    className:
      "font-mono touch-none select-none border hairline bg-paper/90 backdrop-blur-sm flex h-14 w-14 items-center justify-center text-xl active:bg-accent active:text-paper transition-colors",
    style: { borderRadius: "3px 12px 4px 10px" } as React.CSSProperties,
  });

  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  return (
    <section id="detour" className="relative mx-auto max-w-6xl px-6 py-28 md:px-14 md:py-40">
      <SectionHeading index="05" label="detour" title="Take the scenic route." />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">
          (walk the maze — keys, drag, or tap the on-screen pad. find everything i&apos;ve shipped.)
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

        {/* Mobile / touch controls — overlay sits outside the drag region so taps don't start a drag */}
        <div className="pointer-events-none absolute inset-0 z-10 md:hidden">
          <div className="pointer-events-auto absolute bottom-3 left-3 flex flex-col gap-2">
            <button {...touchBtnProps("w", "Move forward")}>↑</button>
            <button {...touchBtnProps("s", "Move backward")}>↓</button>
          </div>
          <div className="pointer-events-auto absolute bottom-3 right-3 flex gap-2">
            <button {...touchBtnProps("a", "Turn left")}>←</button>
            <button {...touchBtnProps("d", "Turn right")}>→</button>
          </div>
        </div>

        <AnimatePresence>
          {popup && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="absolute inset-x-4 top-4 z-20 mx-auto max-w-md border hairline bg-paper p-5 shadow-[5px_8px_0_rgba(24,22,17,0.2)] md:inset-x-auto md:right-6 md:bottom-6 md:top-auto"
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
