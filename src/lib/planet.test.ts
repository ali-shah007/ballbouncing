import { describe, it, expect } from "vitest";
import { PlanetModel, WEAPONS } from "./planet";
import { createTerrainData } from "./planet-texture";
const target = { x: 0, y: 0, z: 1 };
function advance(model: PlanetModel, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 100); i++) model.step(0.01);
}
describe("planet attacks", () => {
  it("applies damage on impact rather than on launch", () => {
    const model = new PlanetModel();
    model.fire("meteor", 1, target);
    advance(model, 0.5);
    expect(model.integrity).toBe(100);
    expect(model.stats().pending).toBe(1);
    advance(model, 0.6);
    expect(model.integrity).toBe(100 - WEAPONS.meteor.damage);
    expect(model.impacts).toBe(1);
    advance(model, 2);
    expect(model.impacts).toBe(1);
  });
  it("normalizes targets to the planet surface and clamps attack power", () => {
    const model = new PlanetModel();
    model.fire("laser", 100, { x: 3, y: 4, z: 1 });
    expect(Math.hypot(...Object.values(model.attacks[0].target))).toBeCloseTo(
      1.7,
    );
    expect(model.attacks[0].power).toBe(2);
    expect(model.fire("laser", 1, { x: 0, y: 0, z: 0 })).toBe(false);
  });
  it("destroys once, stops accepting strikes, and never has negative integrity", () => {
    const model = new PlanetModel();
    let destroyed = 0;
    model.onEvent = (e) => {
      if (e.kind === "destroyed") destroyed++;
    };
    for (let i = 0; i < 8; i++) model.fire("antimatter", 2, target);
    advance(model, 3);
    expect(model.destroyed).toBe(true);
    expect(model.integrity).toBe(0);
    expect(destroyed).toBe(1);
    expect(model.fire("laser", 1, target)).toBe(false);
  });
  it("bounds inbound attacks and clears all state on reset", () => {
    const model = new PlanetModel();
    for (let i = 0; i < 20; i++) model.fire("laser", 1, target);
    expect(model.stats().pending).toBe(8);
    advance(model, 1);
    model.reset();
    expect(model.stats()).toEqual({
      integrity: 100,
      impacts: 0,
      launched: 0,
      pending: 0,
      time: 0,
      destroyed: false,
    });
    expect(model.attacks).toHaveLength(0);
  });
  it("generates deterministic seamless terrain channels", () => {
    const a = createTerrainData(32, 16),
      b = createTerrainData(32, 16);
    expect(a).toEqual(b);
    expect(a).toHaveLength(32 * 16 * 4);
    for (let row = 0; row < 16; row++)
      expect(a.slice(row * 32 * 4, row * 32 * 4 + 4)).toEqual(
        a.slice((row * 32 + 31) * 4, (row * 32 + 31) * 4 + 4),
      );
  });
});
