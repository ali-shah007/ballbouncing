import { it, expect } from "vitest";
import { World } from "./physics";
import { hammerPose } from "./reference";
it("the hammer strikes one ball into four without repeat births during cooldown", () => {
  const w = new World("hammer", 4, 30, 64),
    p = hammerPose(0.004);
  Object.assign(w.balls[0], { x: p.x + 50, y: p.y, vx: -50, vy: 0 });
  w.step(0.004);
  expect(w.balls.length).toBe(4);
  expect(w.sparks.length).toBeGreaterThan(0);
});
it("slime deforms under the press while retaining a finite membrane", () => {
  const w = new World("slime");
  w.loop = true;
  for (let i = 0; i < 420; i++) w.step(1 / 60);
  const b = w.material!.blobs[0];
  const xs = b.nodes.map((p) => p.x),
    ys = b.nodes.map((p) => p.y);
  expect(xs.every(Number.isFinite) && ys.every(Number.isFinite)).toBe(true);
  expect(Math.max(...xs) - Math.min(...xs)).not.toBeCloseTo(340, 0);
  expect(b.nodes).toHaveLength(24);
});
it("presses fracture blocks into bounded fragments and seeded randomization is reproducible", () => {
  const w = new World("press");
  for (let i = 0; i < 330; i++) w.step(1 / 60);
  expect(w.material!.crushed).toBeGreaterThan(0);
  expect(w.material!.chunks.length).toBeGreaterThan(12);
  expect(w.material!.chunks.length).toBeLessThan(421);
  const a = new World("jelly", 4, 30, 180, 51),
    b = new World("jelly", 4, 30, 180, 51),
    c = new World("jelly", 4, 30, 180, 52);
  expect(a.material).toEqual(b.material);
  expect(c.material).not.toEqual(a.material);
});
