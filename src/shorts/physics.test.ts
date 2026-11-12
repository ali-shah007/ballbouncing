import { describe, it, expect } from "vitest";
import { World, MODES } from "./physics";
describe("Shorts physics", () => {
  it("keeps every experiment finite and population bounded over three simulated minutes", () => {
    for (const m of MODES) {
      const w = new World(m.id, 4, 5, 80);
      for (let n = 0; n < 180 * 120; n++) w.step(1 / 120);
      expect(w.balls.length).toBeLessThanOrEqual(80);
      for (const b of w.balls) {
        expect([b.x, b.y, b.vx, b.vy, b.r].every(Number.isFinite)).toBe(true);
        expect(b.r).toBeLessThanOrEqual(190);
      }
    }
  });
  it("resolves a real ball collision with exchanged velocity and one result", () => {
    const w = new World("collision");
    Object.assign(w.balls[0], { x: -17, y: 0, vx: 100, vy: 0 });
    Object.assign(w.balls[1], { x: 17, y: 0, vx: -100, vy: 0 });
    expect(w.step(0.01).filter((e) => e.kind === "win")).toHaveLength(1);
    expect(w.balls[0].vx).toBeLessThan(0);
    expect(w.outcome).toBe("THEY COLLIDED!");
  });
  it("counts a gap crossing once, not one escape per physics substep", () => {
    const w = new World("escape");
    Object.assign(w.balls[0], { x: 460, y: 0, vx: 100, vy: 0 });
    w.step(0.04);
    expect(w.escaped).toBe(1);
    expect(w.outcome).toBe("ESCAPED!");
  });
  it("advances a timed-out attempt and starts a new countdown", () => {
    const w = new World("escape", 0.05);
    w.step(0.05);
    expect(w.failed).toBe(1);
    for (let i = 0; i < 40; i++) w.step(0.04);
    expect(w.round).toBeGreaterThan(1);
  });
  it("grows on impacts and actually multiplies on splitter contact", () => {
    const w = new World("growth");
    Object.assign(w.balls[0], { x: 430, y: 0, vx: 100, vy: 0 });
    w.step(0.01);
    expect(w.balls[0].r).toBeGreaterThan(13);
    const s = new World("overflow");
    Object.assign(s.balls[0], { x: 100, y: 0, vx: 0, vy: 100 });
    expect(s.step(0.01).some((e) => e.kind === "split")).toBe(true);
    expect(s.balls.length).toBe(2);
  });
});
