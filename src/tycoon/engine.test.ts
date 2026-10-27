import { describe, it, expect } from "vitest";
import {
  advance,
  assign,
  capacity,
  claim,
  construct,
  expand,
  fresh,
  manager,
  offline,
  stats,
  status,
  upgrade,
} from "./engine";
import { route, isRoad } from "./logistics";
import { migrate, validate } from "./persistence";
describe("Tycoon economy", () => {
  it("validates placement, road-connected slots, money, queues, and unlocks", () => {
    const s = fresh();
    expect(construct(s, "food", 6)).toContain("occupied");
    expect(construct(s, "mine", 2)).toContain("Copper");
    expect(construct(s, "farm", 20)).toContain("district");
    expect(construct(s, "food", 0)).toBe(null);
    expect(s.money).toBe(2180);
    expect(construct(s, "grocery", 1)).toBe(null);
    expect(construct(s, "farm", 2)).toContain("crews");
  });
  it("never produces food without wheat and consumes real inputs", () => {
    const s = fresh();
    s.buildings[3].manager = 0;
    s.buildings[3].running = false;
    construct(s, "food", 0);
    const b = s.buildings.at(-1)!;
    b.build = 0;
    b.workers = 3;
    b.manager = 1;
    advance(s, 25);
    expect(b.inventory.food || 0).toBe(0);
    b.inventory.wheat = 6;
    advance(s, 25);
    expect(b.inventory.food).toBe(8);
    expect(b.inventory.wheat).toBe(0);
    expect(s.produced.food).toBe(8);
  });
  it("requires workers and electricity; assigning is bounded by the population", () => {
    const s = fresh();
    construct(s, "food", 0);
    const b = s.buildings.at(-1)!;
    b.build = 0;
    b.workers = 0;
    b.manager = 1;
    b.inventory.wheat = 6;
    advance(s, 20);
    expect(b.cycles).toBe(0);
    assign(s, b, 3);
    s.buildings.find((b) => b.kind === "power")!.level = 0;
    advance(s, 20);
    expect(b.cycles).toBe(0);
    expect(status(s, b)).toContain("Electricity");
    expect(assign(s, b, 1000)).toContain("available");
  });
  it("grocery revenue comes from sold food, manual production stops after a cycle", () => {
    const s = fresh();
    construct(s, "grocery", 0);
    const b = s.buildings.at(-1)!;
    b.build = 0;
    b.workers = 2;
    b.running = true;
    b.inventory.food = 2;
    advance(s, 20);
    expect(s.sales).toBe(32);
    expect(b.inventory.food).toBe(0);
    expect(b.running).toBe(false);
    advance(s, 20);
    expect(s.sales).toBe(32);
  });
  it("delivers actual cargo over cached roads without duplicating it", () => {
    const s = fresh();
    s.buildings[3].running = false;
    s.buildings[3].manager = 0;
    s.buildings[3].inventory.wheat = 4;
    construct(s, "food", 0);
    const b = s.buildings.at(-1)!;
    b.build = 0;
    b.workers = 0;
    advance(s, 2);
    expect(s.deliveries).toHaveLength(1);
    expect(s.buildings[3].inventory.wheat).toBe(0);
    expect(s.deliveries[0].amount).toBe(4);
    advance(s, 30);
    expect(b.inventory.wheat).toBe(4);
    expect(s.deliveryCount).toBe(1);
    expect(route(6, 0).every((t) => isRoad(t.x, t.y))).toBe(true);
    expect(route(6, 0)).toBe(route(6, 0));
  });
  it("automates cycles with a paid manager and respects storage capacity", () => {
    const s = fresh(),
      b = s.buildings[3];
    expect(manager(s, b)).toBe(null);
    advance(s, 300);
    expect(b.cycles).toBeGreaterThan(1);
    expect(b.inventory.wheat!).toBeLessThanOrEqual(capacity(s, b));
    expect(upgrade(s, b)).toBe(null);
    expect(b.level).toBe(2);
  });
  it("requires contracts and permits for district expansion; rewards cannot repeat", () => {
    const s = fresh();
    expect(expand(s)).toContain("Requires");
    expect(claim(s, "food")).toContain("not complete");
    s.produced.food = 20;
    expect(claim(s, "food")).toBe(null);
    expect(claim(s, "food")).toContain("already");
    s.money = 2000;
    expect(expand(s)).toBe(null);
    expect(s.district).toBe(1);
  });
  it("offline simulation caps at eight hours and is idempotent", () => {
    const s = fresh(),
      now = Date.now();
    s.lastSaved = now - 86400000;
    const r = offline(s, now);
    expect(r.seconds).toBe(28800);
    expect(s.buildings[3].inventory.wheat!).toBeLessThanOrEqual(
      capacity(s, s.buildings[3]),
    );
    expect(offline(s, now).seconds).toBe(0);
    expect(s.sales).toBe(0);
  });
  it("completes the full farm-to-factory-to-shop chain with one truck", () => {
    const s = fresh();
    construct(s, "food", 13);
    construct(s, "grocery", 8);
    advance(s, 20);
    for (const b of s.buildings.filter(
      (b) => b.kind === "food" || b.kind === "grocery",
    ))
      manager(s, b);
    advance(s, 150);
    expect(s.produced.food).toBeGreaterThan(0);
    expect(s.sales).toBeGreaterThan(0);
    expect(s.deliveryCount).toBeGreaterThan(2);
  });
  it("retail sales pause when consumer demand is exhausted", () => {
    const s = fresh();
    construct(s, "grocery", 13);
    const b = s.buildings.at(-1)!;
    b.build = 0;
    b.workers = 2;
    b.manager = 1;
    b.inventory.food = 20;
    s.consumerDemand = 0;
    advance(s, 5);
    expect(b.cycles).toBe(0);
    expect(status(s, b)).toContain("Low consumer demand");
  });
  it("fixed ticks are deterministic across chunks", () => {
    const a = fresh(),
      b = structuredClone(a);
    advance(a, 60);
    for (let i = 0; i < 12; i++) advance(b, 5);
    expect(a).toEqual(b);
  });
  it("save validation, version migration, and serialization preserve valid state", () => {
    const s = fresh();
    expect(validate(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(migrate({ ...s, version: 1 })?.version).toBe(2);
    expect(validate({ ...s, money: Infinity })).toBe(false);
    expect(migrate({ ...s, buildings: [null] })).toBe(null);
    expect(stats(s).available).toBeGreaterThan(0);
  });
});
