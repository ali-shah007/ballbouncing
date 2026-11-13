import { it, expect } from "vitest";
import { World } from "./physics";
import { insideMushroom } from "./reference";
it("births are triggered by actual ball contacts, with two descendants in bloom and one in gravity", () => {
  for (const [mode, count] of [
    ["bloom", 4],
    ["gravity", 3],
  ] as const) {
    const w = new World(mode, 4, 30, 256);
    for (const [i, b] of w.balls.entries())
      Object.assign(b, {
        x: i ? 10 : -10,
        y: 0,
        r: 12,
        vx: i ? -80 : 80,
        vy: 0,
      });
    w.step(0.004);
    expect(w.balls.length).toBe(count);
  }
  const w = new World("gravity");
  w.step(0.004);
  expect(w.balls.length).toBe(2);
});
it("keeps newborns within the concave mushroom and respects a real population limit", () => {
  const w = new World("mushroom", 4, 30, 256);
  for (let i = 0; i < 2400; i++) w.step(1 / 60);
  expect(w.balls.length).toBeGreaterThan(2);
  expect(w.balls.length).toBeLessThanOrEqual(256);
  for (const b of w.balls) expect(insideMushroom(b.x, b.y)).toBe(true);
});
it("mandala cohorts expand on schedule and keep bounded trajectory histories", () => {
  const w = new World("mandala");
  expect(w.balls.length).toBe(24);
  for (let i = 0; i < 510; i++) w.step(1 / 60);
  expect(w.balls.length).toBe(28);
  for (const b of w.balls) expect(b.trail.length).toBeLessThanOrEqual(420);
});
it("retains the capacity result and does not invent counts after the population limit", () => {
  const w = new World("bloom", 4, 30, 32);
  for (let i = 0; i < 2400; i++) w.step(1 / 60);
  expect(w.balls.length).toBe(32);
  expect(w.outcome).toBe("ARENA FILLED");
  expect(w.step(0.05)).toEqual([]);
});

it("crusher contacts split one ball into two, with cooldowns and bounded sparks", () => {
  const w = new World("crusher", 4, 30, 64);
  Object.assign(w.balls[0], { x: 30, y: 0, vx: -120, vy: 0 });
  expect(w.step(0.004).some((e) => e.kind === "split")).toBe(true);
  expect(w.balls.length).toBe(2);
  expect(w.sparks.length).toBeGreaterThan(0);
});
it("the hexagon spike triggers a pop and keeps both descendants within all six planes", () => {
  const w = new World("pop", 4, 30, 32);
  Object.assign(w.balls[0], { x: 335, y: 0, vx: 160, vy: 0 });
  expect(w.step(0.004).some((e) => e.kind === "split")).toBe(true);
  expect(w.balls.length).toBe(2);
  for (let i = 0; i < 600; i++) w.step(1 / 60);
  for (const b of w.balls)
    for (let i = 0; i < 6; i++) {
      const a = w.angle + (i * Math.PI) / 3;
      expect(b.x * Math.cos(a) + b.y * Math.sin(a) + b.r).toBeLessThanOrEqual(
        440 * Math.cos(Math.PI / 6) + 0.3,
      );
    }
});
it("opt-in looping shows an ending before a new physical cycle", () => {
  const w = new World("bloom", 4, 30, 4);
  w.loop = true;
  for (let i = 0; i < 120 && !w.outcome; i++) w.step(1 / 60);
  expect(w.outcome).toContain("NEXT CYCLE");
  expect(w.balls.length).toBe(4);
  for (let i = 0; i < 41; i++) w.step(0.05);
  expect(w.round).toBe(2);
  expect(w.outcome).toBe("");
  expect(w.balls.length).toBe(2);
});
