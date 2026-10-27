import { PLOTS } from "./data";
export type Tile = { x: number; y: number };
export const isRoad = (x: number, y: number) =>
  x >= 0 && y >= 0 && x <= 14 && y <= 14 && (x % 3 === 0 || y % 3 === 0);
const cache = new Map<string, Tile[]>();
export function route(a: number, b: number): Tile[] {
  const key = `${a}:${b}`;
  if (cache.has(key)) return cache.get(key)!;
  const start = { x: PLOTS[a].x - 1, y: PLOTS[a].y },
    end = { x: PLOTS[b].x - 1, y: PLOTS[b].y },
    queue = [start],
    visited = new Map<string, Tile | null>([[`${start.x},${start.y}`, null]]);
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    if (t.x === end.x && t.y === end.y) break;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: t.x + dx, y: t.y + dy },
        k = `${n.x},${n.y}`;
      if (isRoad(n.x, n.y) && !visited.has(k)) {
        visited.set(k, t);
        queue.push(n);
      }
    }
  }
  const path: Tile[] = [];
  let t: Tile | null = end;
  while (t) {
    path.unshift(t);
    t = visited.get(`${t.x},${t.y}`) ?? null;
  }
  cache.set(key, path);
  return path;
}
