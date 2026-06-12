import { projects, experience } from "@/lib/data";

// '#' wall · '.' floor · 'S' start · letters = collectible spots
const LAYOUT = [
  "#################",
  "#S..#...........#",
  "#.#.#.###.#####.#",
  "#.#.#a..#.#...b.#",
  "#.#.#####.#.###.#",
  "#.#.....c.#.#d..#",
  "#.###.#####.#.###",
  "#.#e..#.....#..f#",
  "#.#.###.#####.#.#",
  "#g....#......h#.#",
  "#################",
];

export const COLS = LAYOUT[0].length;
export const ROWS = LAYOUT.length;

export type MazeItem = {
  id: string;
  col: number;
  row: number;
  initial: string;
  kind: "project" | "experience";
  title: string;
  subtitle: string;
  body: string;
  link?: string;
};

const ttsh = experience[0];
const paypal = experience[1];

const CONTENT: Record<string, Omit<MazeItem, "col" | "row" | "id" | "initial">> = {
  a: {
    kind: "project",
    title: projects[0].title,
    subtitle: `${projects[0].role} · ${projects[0].period}`,
    body: projects[0].description,
    link: projects[0].link,
  },
  b: {
    kind: "project",
    title: projects[1].title,
    subtitle: `${projects[1].role} · ${projects[1].period}`,
    body: projects[1].description,
    link: projects[1].link,
  },
  c: {
    kind: "project",
    title: projects[2].title,
    subtitle: `${projects[2].role} · ${projects[2].period}`,
    body: projects[2].description,
    link: projects[2].link,
  },
  d: {
    kind: "project",
    title: projects[3].title,
    subtitle: `${projects[3].role} · ${projects[3].period}`,
    body: projects[3].description,
    link: projects[3].link,
  },
  e: {
    kind: "project",
    title: projects[4].title,
    subtitle: `${projects[4].role} · ${projects[4].period}`,
    body: projects[4].description,
    link: projects[4].link,
  },
  f: {
    kind: "project",
    title: projects[5].title,
    subtitle: `${projects[5].role} · ${projects[5].period}`,
    body: projects[5].description,
    link: projects[5].link,
  },
  g: {
    kind: "experience",
    title: ttsh.org,
    subtitle: `${ttsh.role} · ${ttsh.period}`,
    body: ttsh.points.join(" "),
  },
  h: {
    kind: "experience",
    title: paypal.org,
    subtitle: `${paypal.role} · ${paypal.period}`,
    body: paypal.points[0],
  },
};

const walls: boolean[][] = LAYOUT.map((row) => [...row].map((ch) => ch === "#"));

export function isWall(col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
  return walls[row][col];
}

export const start = (() => {
  for (let r = 0; r < ROWS; r++) {
    const c = LAYOUT[r].indexOf("S");
    if (c !== -1) return { col: c, row: r };
  }
  throw new Error("maze has no start");
})();

export const items: MazeItem[] = (() => {
  const out: MazeItem[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = LAYOUT[r][c];
      const content = CONTENT[ch];
      if (content) {
        out.push({
          id: ch,
          col: c,
          row: r,
          initial: content.title[0].toUpperCase(),
          ...content,
        });
      }
    }
  }
  return out;
})();
