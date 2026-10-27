import { describe, it, expect } from "vitest";
import { DEFAULT, Simulation } from "./simulation";
import { validateEpisodes } from "./storage";
function tick(s: Simulation, seconds: number) {
  for (let i = 0; i < seconds * 120; i++) s.step(1 / 120);
}
describe("simulation", () => {
  it("reproduces the same scene for a seed", () => {
    const a = new Simulation(DEFAULT),
      b = new Simulation(DEFAULT);
    tick(a, 4);
    tick(b, 4);
    expect(a.snapshot()).toEqual(b.snapshot());
  });
  it("reflects an outward-moving ball off the solid ring", () => {
    const s = new Simulation({ ...DEFAULT, gravity: 0, rotation: 0 });
    s.balls = [
      {
        id: 0,
        x: -181,
        y: 0,
        vx: -100,
        vy: 0,
        radius: 8,
        color: "#d8f36a",
        escaped: false,
        trail: [],
      },
    ];
    tick(s, 0.025);
    expect(s.balls[0].vx).toBeGreaterThan(0);
    expect(Math.hypot(s.balls[0].x, s.balls[0].y)).toBeLessThan(183);
    expect(s.escapes).toBe(0);
  });
  it("resolves an approaching pair of balls", () => {
    const s = new Simulation({ ...DEFAULT, gravity: 0, rotation: 0 });
    s.balls = [
      {
        id: 0,
        x: -7,
        y: 0,
        vx: 20,
        vy: 0,
        radius: 8,
        color: "#d8f36a",
        escaped: false,
        trail: [],
      },
      {
        id: 1,
        x: 7,
        y: 0,
        vx: -20,
        vy: 0,
        radius: 8,
        color: "#d8f36a",
        escaped: false,
        trail: [],
      },
    ];
    s.step(1 / 120);
    expect(s.balls[0].vx).toBeLessThan(0);
    expect(s.balls[1].vx).toBeGreaterThan(0);
  });
  it("counts one escape and spawns the requested number", () => {
    const s = new Simulation({ ...DEFAULT, gravity: 0, rotation: 0, spawn: 3 });
    s.angle = 0;
    s.balls = [
      {
        id: 0,
        x: 197,
        y: 0,
        vx: 200,
        vy: 0,
        radius: 8,
        color: "#d8f36a",
        escaped: false,
        trail: [],
      },
    ];
    tick(s, 0.05);
    expect(s.escapes).toBe(1);
    expect(s.stats().balls).toBe(3);
  });
  it("keeps episode duration independent of physics speed", () => {
    const s = new Simulation({ ...DEFAULT, speed: 2 });
    tick(s, 1);
    expect(s.time).toBeCloseTo(1, 6);
  });
  it("limits population and stops at the selected duration", () => {
    const s = new Simulation({ ...DEFAULT, maxBalls: 10, duration: 1 });
    for (let i = 0; i < 100; i++) s.spawn();
    expect(s.stats().balls).toBe(10);
    tick(s, 2);
    const snapshot = s.snapshot();
    tick(s, 2);
    expect(s.snapshot()).toEqual(snapshot);
  });
  it("continues deterministically from a saved checkpoint", () => {
    const a = new Simulation(DEFAULT);
    tick(a, 2);
    const b = new Simulation(DEFAULT);
    b.restore(a.snapshot());
    tick(a, 4);
    tick(b, 4);
    expect(a.snapshot()).toEqual(b.snapshot());
  });
  it("keeps coordinates finite during a complete episode", () => {
    const s = new Simulation({
      ...DEFAULT,
      spawn: 5,
      pulse: true,
      gravityMode: "rotate",
    });
    tick(s, 30);
    expect(s.balls.length).toBeLessThanOrEqual(DEFAULT.maxBalls + 50);
    expect(
      s.balls.every((b) => [b.x, b.y, b.vx, b.vy].every(Number.isFinite)),
    ).toBe(true);
    expect(s.stats().time).toBeGreaterThanOrEqual(30);
  });
});
describe("story import", () => {
  const episode = {
    id: "test",
    number: 1,
    title: "test",
    hook: "hello",
    teaser: "next",
    config: DEFAULT,
    snapshot: new Simulation(DEFAULT).snapshot(),
    savedAt: new Date().toISOString(),
  };
  it("accepts exported checkpoints and rejects malformed files", () => {
    expect(validateEpisodes([episode])).toBe(true);
    expect(
      validateEpisodes([{ ...episode, config: { ...DEFAULT, maxBalls: 1e8 } }]),
    ).toBe(false);
    expect(
      validateEpisodes([
        { ...episode, snapshot: { ...episode.snapshot, balls: [{}] } },
      ]),
    ).toBe(false);
  });
});
