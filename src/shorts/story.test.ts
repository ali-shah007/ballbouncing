import { it, expect } from "vitest";
import { Episode } from "./story";
import { World, MODES } from "./physics";
it("all presets reach a truthful result by second 41 and finish on the wall-clock deadline", () => {
  for (const m of MODES) {
    const e = new Episode(new World(m.id, 4, 10, 64));
    for (let i = 0; i < 164; i++) e.step(0.25);
    const resultScene = JSON.stringify(e.world);
    for (let i = 0; i < 16; i++) e.step(0.25);
    expect(JSON.stringify(e.world)).toBe(resultScene);
    expect(e.elapsed).toBe(45);
    expect(e.finished).toBe(true);
    expect(e.result.length).toBeGreaterThan(0);
    const json = JSON.stringify(e.world);
    e.step(0.5);
    expect(JSON.stringify(e.world)).toBe(json);
  }
}, 30000);
it("a collision from an earlier round remains part of the conclusion", () => {
  const w = new World("collision");
  w.round = 2;
  expect(new Episode(w).result).toBe("THEY COLLIDED!");
});
it("does not fabricate a filled arena at the end of a slow challenge", () => {
  const w = new World("bloom", 4, 30, 4096),
    e = new Episode(w);
  e.elapsed = 41;
  e.step(4);
  expect(w.balls.length).toBe(2);
  expect(e.result).toContain("FINAL COUNT");
});

it("keeps the winning round instead of clearing its score before the result card", () => {
  const w = new World("duel"),
    e = new Episode(w);
  w.balls[0].hits = 30;
  w.outcome = "GREEN WINS";
  w.hold = 4;
  for (let i = 0; i < 180; i++) e.step(0.25);
  expect(w.round).toBe(1);
  expect(w.balls.map((b) => b.hits)).toEqual([30, 0]);
  expect(e.result).toBe("GREEN WINS THE ROUND");
});

it("keeps lively motion even when a population is ahead of the story clock", () => {
  const w = new World("bloom", 4, 30, 256),
    e = new Episode(w);
  w.balls = [];
  for (let i = 0; i < 64; i++)
    w.add(((i % 8) - 3.5) * 75, (Math.floor(i / 8) - 3.5) * 75);
  e.step(1 / 60);
  expect(w.time).toBeCloseTo(1.5 / 60, 6);
});
it("collision chase uses normal motion instead of a 0.035 slow-motion multiplier", () => {
  const w = new World("collision"),
    e = new Episode(w);
  const x = w.balls[0].x;
  for (let i = 0; i < 6; i++) e.step(1 / 60);
  expect(Math.abs(w.balls[0].x - x)).toBeGreaterThan(20);
});
it("speed changes motion but preserves the wall-clock ending", () => {
  const normal = new Episode(new World("mandala"), 45, 1);
  const fast = new Episode(new World("mandala"), 45, 3);
  for (let i = 0; i < 60; i++) {
    normal.step(1 / 60);
    fast.step(1 / 60);
  }
  expect(fast.world.time).toBeCloseTo(normal.world.time * 3, 5);
  expect(fast.elapsed).toBeCloseTo(normal.elapsed, 5);
  fast.step(45);
  expect(fast.finished).toBe(true);
  expect(fast.elapsed).toBe(45);
});
it("a filled arena keeps moving at capacity without inventing or resetting balls", () => {
  const w = new World("bloom", 4, 30, 4),
    e = new Episode(w);
  for (let i = 0; i < 120; i++) e.step(1 / 60);
  expect(w.balls.length).toBe(4);
  const before = w.balls.map((b) => [b.x, b.y]);
  for (let i = 0; i < 60; i++) e.step(1 / 60);
  expect(w.balls.length).toBe(4);
  expect(w.round).toBe(1);
  expect(w.balls.map((b) => [b.x, b.y])).not.toEqual(before);
});

it("retains the faster base pacing of growth and duel modes", () => {
  for (const [mode, pace] of [
    ["growth", 2.5],
    ["duel", 1.8],
  ] as const) {
    const e = new Episode(new World(mode));
    for (let i = 0; i < 6; i++) e.step(1 / 60);
    expect(e.world.time).toBeCloseTo(0.1 * pace * 1.5, 5);
  }
});
