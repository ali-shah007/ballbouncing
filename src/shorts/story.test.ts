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
  expect(e.result).toBe("GREEN WINS THE ROUND");
});
