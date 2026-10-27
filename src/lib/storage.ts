import { get, set } from "idb-keyval";
import type { Config, Snapshot } from "./simulation";
export type Episode = {
  id: string;
  number: number;
  title: string;
  hook: string;
  teaser: string;
  config: Config;
  snapshot: Snapshot;
  savedAt: string;
};
export async function loadEpisodes(): Promise<Episode[]> {
  return (await get<Episode[]>("orbit-episodes")) ?? [];
}
export async function saveEpisodes(episodes: Episode[]) {
  await set("orbit-episodes", episodes);
}
export function validateEpisodes(value: unknown): value is Episode[] {
  if (!Array.isArray(value) || value.length > 100) return false;
  return value.every(
    (e) =>
      e &&
      typeof e.id === "string" &&
      Number.isInteger(e.number) &&
      e.number > 0 &&
      typeof e.title === "string" &&
      typeof e.hook === "string" &&
      typeof e.teaser === "string" &&
      typeof e.savedAt === "string" &&
      validConfig(e.config) &&
      validSnapshot(e.snapshot),
  );
}
function validConfig(c: Config) {
  return (
    c &&
    ["down", "center", "rotate"].includes(c.gravityMode) &&
    ["citrus", "candy", "ocean"].includes(c.palette) &&
    [
      "seed",
      "spawn",
      "opening",
      "rotation",
      "gravity",
      "speed",
      "size",
      "maxBalls",
      "duration",
    ].every((k) => Number.isFinite(c[k as keyof Config])) &&
    c.maxBalls >= 5 &&
    c.maxBalls <= 300 &&
    c.spawn >= 0 &&
    c.spawn <= 5 &&
    c.opening >= 10 &&
    c.opening <= 120 &&
    c.speed >= 0.25 &&
    c.speed <= 2 &&
    c.gravity >= 0 &&
    c.gravity <= 300 &&
    c.size >= 3 &&
    c.size <= 15 &&
    c.duration >= 10 &&
    c.duration <= 120 &&
    Math.abs(c.rotation) <= 2
  );
}
function validSnapshot(s: Snapshot) {
  return (
    s &&
    ["time", "angle", "escapes", "nextId", "rng"].every((k) =>
      Number.isFinite(s[k as keyof Snapshot]),
    ) &&
    Array.isArray(s.balls) &&
    s.balls.length <= 350 &&
    s.balls.every(
      (b) =>
        b &&
        ["id", "x", "y", "vx", "vy", "radius"].every((k) =>
          Number.isFinite(b[k as keyof typeof b]),
        ) &&
        b.radius >= 3 &&
        b.radius <= 15 &&
        /^#[a-f0-9]{6}$/i.test(b.color) &&
        typeof b.escaped === "boolean" &&
        Array.isArray(b.trail) &&
        b.trail.length <= 14 &&
        b.trail.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    )
  );
}
