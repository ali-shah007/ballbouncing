import { describe, it, expect } from "vitest";
import {
  createNation,
  build,
  tickNation,
  nationStats,
  applyOffline,
  research,
  validNation,
} from "./nation";
describe("Nation Rise economy", () => {
  it("charges construction once, finishes it, and rewards an industry milestone once", () => {
    const s = createNation("Pakistan"),
      cash = s.cash;
    expect(build(s, "factory", 0)).toBe(null);
    expect(s.cash).toBe(cash - 1600);
    expect(s.buildings.at(-1)?.level).toBe(0);
    tickNation(s, 20);
    expect(s.buildings.at(-1)?.level).toBe(1);
    expect(s.claimed).toContain("industry");
    const count = s.events.filter((e) =>
      e.text.includes("Open for business"),
    ).length;
    tickNation(s, 20);
    expect(
      s.events.filter((e) => e.text.includes("Open for business")),
    ).toHaveLength(count);
  });
  it("enforces treasury, queue, research locks, and upgrade levels", () => {
    const s = createNation("Japan");
    expect(build(s, "port", 0)).toContain("Research");
    s.cash = 0;
    expect(build(s, "factory", 0)).toContain("funds");
    s.cash = 12000;
    build(s, "farm", 1);
    build(s, "solar", 2);
    expect(build(s, "forest", 0)).toContain("queue");
  });
  it("limits factories when power or food is insufficient", () => {
    const a = createNation("Brazil");
    build(a, "factory", 0);
    tickNation(a, 20);
    const healthy = nationStats(a).efficiency;
    a.population = 2000;
    expect(nationStats(a).efficiency).toBeLessThan(healthy);
  });
  it("upgrades the same site without duplicating a project", () => {
    const s = createNation("France"),
      id = s.buildings[0].id;
    expect(build(s, "housing", 0, id)).toBe(null);
    tickNation(s, 30);
    expect(s.buildings).toHaveLength(3);
    expect(s.buildings[0].level).toBe(3);
  });
  it("spends research resources and increases productivity", () => {
    const s = createNation("India");
    expect(research(s)).toContain("Requires");
    s.knowledge = 20;
    expect(research(s)).toBe(null);
    expect(s.research).toBe(1);
    expect(s.knowledge).toBe(5);
  });
  it("caps offline progress and does not grant it twice", () => {
    const s = createNation("Canada"),
      now = Date.now();
    s.lastSaved = now - 24 * 3600000;
    const report = applyOffline(s, now);
    expect(report.seconds).toBe(14400);
    expect(s.cash).toBeGreaterThan(12000);
    expect(applyOffline(s, now).earned).toBe(0);
  });
  it("validates saves and rejects non-finite and duplicate sites", () => {
    const s = createNation("Pakistan");
    expect(validNation(s)).toBe(true);
    expect(validNation({ ...s, cash: NaN })).toBe(false);
    s.buildings[1].slot = s.buildings[0].slot;
    expect(validNation(s)).toBe(false);
  });
});
