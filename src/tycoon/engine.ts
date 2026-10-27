import {
  CONTRACTS,
  DEFS,
  DISTRICTS,
  Kind,
  PLOTS,
  RESOURCES,
  Resource,
  TECHS,
  Tech,
} from "./data";
import { route } from "./logistics";
export type Inventory = Partial<Record<Resource, number>>;
export type Business = {
  id: number;
  kind: Kind;
  plot: number;
  level: number;
  build: number;
  progress: number;
  running: boolean;
  workers: number;
  manager: number;
  inventory: Inventory;
  earned: number;
  cycles: number;
};
export type Delivery = {
  id: number;
  from: number;
  to: number;
  resource: Resource;
  amount: number;
  elapsed: number;
  duration: number;
};
export type Save = {
  version: 2;
  consumerDemand?: number;
  money: number;
  population: number;
  research: number;
  permits: number;
  district: number;
  time: number;
  nextId: number;
  buildings: Business[];
  deliveries: Delivery[];
  produced: Inventory;
  sales: number;
  deliveryCount: number;
  claimed: string[];
  tech: Record<Tech, number>;
  policies: {
    education: boolean;
    health: boolean;
    industry: boolean;
    green: boolean;
    trade: boolean;
  };
  message: string;
  lastSaved: number;
};
export const fresh = (): Save => ({
  version: 2,
  consumerDemand: 10,
  money: 2600,
  population: 32,
  research: 0,
  permits: 0,
  district: 0,
  time: 0,
  nextId: 10,
  buildings: [
    {
      id: 1,
      kind: "hall",
      plot: 12,
      level: 1,
      build: 0,
      progress: 0,
      running: false,
      workers: 0,
      manager: 0,
      inventory: {},
      earned: 0,
      cycles: 0,
    },
    {
      id: 2,
      kind: "house",
      plot: 7,
      level: 1,
      build: 0,
      progress: 0,
      running: false,
      workers: 0,
      manager: 0,
      inventory: {},
      earned: 0,
      cycles: 0,
    },
    {
      id: 3,
      kind: "house",
      plot: 11,
      level: 1,
      build: 0,
      progress: 0,
      running: false,
      workers: 0,
      manager: 0,
      inventory: {},
      earned: 0,
      cycles: 0,
    },
    {
      id: 4,
      kind: "farm",
      plot: 6,
      level: 1,
      build: 0,
      progress: 0,
      running: true,
      workers: 2,
      manager: 1,
      inventory: {},
      earned: 0,
      cycles: 0,
    },
    {
      id: 5,
      kind: "power",
      plot: 17,
      level: 1,
      build: 0,
      progress: 0,
      running: false,
      workers: 0,
      manager: 0,
      inventory: {},
      earned: 0,
      cycles: 0,
    },
  ],
  deliveries: [],
  produced: {},
  sales: 0,
  deliveryCount: 0,
  claimed: [],
  tech: { Agriculture: 0, Industry: 0, Logistics: 0, Energy: 0, Commerce: 0 },
  policies: {
    education: false,
    health: false,
    industry: false,
    green: false,
    trade: false,
  },
  message:
    "Welcome, Mayor! Your farm is growing wheat. Build a food factory, then a grocery market.",
  lastSaved: Date.now(),
});
export const sum = (i: Inventory) =>
  RESOURCES.reduce((n, r) => n + (i[r] || 0), 0);
export const levels = (s: Save, k: Kind) =>
  s.buildings
    .filter((b) => !b.build && b.kind === k)
    .reduce((n, b) => n + b.level, 0);
export const slots = (s: Save) =>
  s.district === 0 ? 15 : s.district === 1 ? 20 : 25;
export const capacity = (s: Save, b: Business) =>
  (b.kind === "warehouse" ? 80 : 30) * b.level * (1 + s.tech.Logistics * 0.25);
export function stats(s: Save) {
  const employed = s.buildings.reduce((n, b) => n + b.workers, 0),
    housing = levels(s, "house") * 20,
    power = levels(s, "power") * 18 * (1 + s.tech.Energy * 0.2),
    demand =
      s.buildings.reduce(
        (n, b) => n + (!b.build ? DEFS[b.kind].power * b.level : 0),
        0,
      ) * (s.policies.industry ? 1.2 : 1),
    pollution = Math.max(
      0,
      levels(s, "factory") * 8 +
        levels(s, "mine") * 4 -
        levels(s, "park") * 5 -
        (s.policies.green ? 10 : 0),
    ),
    happy = Math.min(
      100,
      65 +
        levels(s, "park") * 5 +
        levels(s, "hospital") * 5 +
        (s.policies.health ? 7 : 0) -
        pollution * 0.4 -
        (housing < s.population ? 15 : 0),
    ),
    skilled = Math.min(
      Math.floor(s.population * 0.6),
      levels(s, "school") * 8 + (s.policies.education ? 10 : 0),
    ),
    expenses =
      s.buildings.reduce(
        (n, b) =>
          n + b.workers * 0.018 + (!b.build ? DEFS[b.kind].power * 0.008 : 0),
        0,
      ) +
      Object.values(s.policies).filter(Boolean).length * 0.14;
  return {
    employed,
    available: Math.max(0, Math.floor(s.population * 0.65) - employed),
    housing,
    power,
    demand,
    happy,
    pollution,
    skilled,
    expenses,
    net:
      s.sales / Math.max(1, s.time / 60) +
      ((0.07 * s.population) / 32) * 60 -
      expenses * 60,
    storage: s.buildings.reduce((n, b) => n + sum(b.inventory), 0),
    trucks: 1 + levels(s, "depot") * 2,
  };
}
export function status(s: Save, b: Business) {
  const d = DEFS[b.kind],
    st = stats(s);
  if (b.build) return "Under construction";
  if (!d.cycle) return "Operating";
  if (b.workers < d.workers) return "Assign more workers";
  if (b.kind === "factory" && st.skilled < 2)
    return "Needs a school: 2 skilled workers";
  if (st.power < st.demand)
    return "Electricity shortage: build or upgrade power";
  if (
    sum(b.inventory) +
      s.deliveries
        .filter((t) => t.to === b.id)
        .reduce((n, t) => n + t.amount, 0) +
      d.amount +
      Math.floor((b.level - 1) / 5) >
      capacity(s, b) &&
    d.output
  )
    return "Storage full: add buyers or a warehouse";
  if (
    Object.entries(d.inputs).some(
      ([r, n]) => (b.inventory[r as Resource] || 0) < n,
    )
  )
    return "Waiting for supplies: check the production chain";
  if (b.kind === "grocery" && (s.consumerDemand ?? 10) < 2)
    return "Low consumer demand: add homes or research Commerce";
  if (!b.running && !b.manager) return "Ready: start a production cycle";
  return b.manager ? "Automated production" : "Producing";
}
export function construct(s: Save, kind: Kind, plot: number) {
  const d = DEFS[kind];
  if (kind === "hall") return "Your town already has a town hall.";
  if (!d || !Number.isInteger(plot) || plot < 0 || plot >= slots(s))
    return "Unlock this district first.";
  if (s.buildings.some((b) => b.plot === plot)) return "This plot is occupied.";
  if (d.unlock > s.district) return "Unlock Copper Ridge first.";
  if (s.buildings.filter((b) => b.build > 0).length >= 2)
    return "Both construction crews are busy.";
  if (s.money < d.cost) return "Insufficient credits.";
  if (["factory", "export"].includes(kind)) {
    const store = s.buildings.find((b) => (b.inventory.planks || 0) >= 3);
    if (!store) return "Requires 3 construction planks at a building.";
    store.inventory.planks! -= 3;
  }
  s.money -= d.cost;
  s.buildings.push({
    id: s.nextId++,
    kind,
    plot,
    level: 1,
    build: d.seconds,
    progress: 0,
    running: false,
    workers: 0,
    manager: 0,
    inventory: {},
    earned: 0,
    cycles: 0,
  });
  s.message = `${d.name} is under construction. Road access confirmed.`;
  return null;
}
export function upgrade(s: Save, b: Business) {
  if (b.build) return "Construction is already in progress.";
  if (b.level >= 20) return "Maximum level reached.";
  const cost = Math.round(DEFS[b.kind].cost * 0.65 * (1 + b.level * 0.6));
  if (s.money < cost) return "Insufficient credits.";
  if (b.kind === "hall") return "The town hall grows with your district.";
  s.money -= cost;
  b.level++;
  b.build = 5 + b.level * 2;
  s.message = `${DEFS[b.kind].name} upgrading to level ${b.level}. More capacity and faster cycles.`;
  return null;
}
export function assign(s: Save, b: Business, delta: number) {
  if (delta > 0 && stats(s).available < delta)
    return "No available workers. Build housing and improve happiness.";
  b.workers = Math.max(
    0,
    Math.min(DEFS[b.kind].workers * 2, b.workers + delta),
  );
  return null;
}
export function manager(s: Save, b: Business) {
  if (!DEFS[b.kind].cycle) return "This service operates automatically.";
  const cost = 120 * (b.manager + 1);
  if (s.money < cost) return "Insufficient credits.";
  s.money -= cost;
  b.manager++;
  b.running = true;
  s.message = `${DEFS[b.kind].name}: manager level ${b.manager}. Automatic cycles and a speed bonus enabled.`;
  return null;
}
export function startCycle(s: Save, b: Business) {
  b.running = true;
  s.message = `${DEFS[b.kind].name} cycle started. Inputs are consumed only when production completes.`;
}
export function technology(s: Save, t: Tech) {
  const l = s.tech[t],
    cost = 8 * (l + 1);
  if (l >= 5) return "Technology complete.";
  if (s.research < cost || s.money < 200 * (l + 1))
    return "Requires research points and treasury credits.";
  s.research -= cost;
  s.money -= 200 * (l + 1);
  s.tech[t]++;
  s.message = `${t} research level ${l + 1} unlocked.`;
  return null;
}
export function claim(s: Save, id: string) {
  const c = CONTRACTS.find((c) => c.id === id);
  if (!c || s.claimed.includes(id)) return "Reward already claimed.";
  if (metric(s, c.metric) < c.target) return "Contract is not complete.";
  s.claimed.push(id);
  s.money += c.reward;
  s.research += c.points;
  s.permits += c.permit;
  s.message = `Contract complete: ${c.name}! +${c.reward} credits, +${c.points} research.`;
  return null;
}
export function metric(s: Save, key: string) {
  return key === "sales"
    ? s.sales
    : key === "deliveries"
      ? s.deliveryCount
      : key === "population"
        ? s.population
        : s.produced[key as Resource] || 0;
}
export function expand(s: Save) {
  const next = DISTRICTS[s.district + 1];
  if (!next) return "All districts are open.";
  if (s.money < next.cost || s.permits < next.permit)
    return `Requires ${next.cost} credits and ${next.permit} permits.`;
  s.money -= next.cost;
  s.permits -= next.permit;
  s.district++;
  s.message = `${next.name} is open! New land and industries unlocked.`;
  return null;
}
export function step(s: Save) {
  s.time++;
  s.consumerDemand = Math.min(
    Math.max(10, s.population * 0.5),
    (s.consumerDemand ?? 10) +
      (s.population / 240) * (1 + s.tech.Commerce * 0.15),
  );
  const st = stats(s);
  s.money = Math.max(
    0,
    Math.round((s.money - st.expenses + (0.07 * s.population) / 32) * 100) /
      100,
  );
  s.population = Math.min(
    st.housing,
    Math.max(
      16,
      s.population + (st.happy >= 60 && st.power >= st.demand ? 0.025 : 0),
    ),
  );
  s.research += levels(s, "school") * (s.policies.education ? 0.025 : 0.012);
  for (const b of s.buildings) {
    const d = DEFS[b.kind];
    if (b.build > 0) {
      b.build--;
      if (!b.build) {
        b.workers = Math.min(d.workers, stats(s).available);
        s.message = `${d.name} completed! Assign a manager for automatic production.`;
      }
      continue;
    }
    if (
      !d.cycle ||
      (!b.running && !b.manager) ||
      !["Producing", "Automated production"].includes(status(s, b))
    )
      continue;
    const category =
      d.category === "Agriculture"
        ? "Agriculture"
        : d.category === "Commerce" || d.category === "Trade"
          ? "Commerce"
          : "Industry";
    b.progress +=
      (1 + (b.level - 1) * 0.12 + b.manager * 0.08 + s.tech[category] * 0.1) *
      (s.policies.industry && category === "Industry" ? 1.15 : 1);
    if (b.progress < d.cycle) continue;
    b.progress = 0;
    for (const [r, n] of Object.entries(d.inputs))
      b.inventory[r as Resource]! -= n;
    const output = d.amount + Math.floor((b.level - 1) / 5);
    if (d.output) {
      b.inventory[d.output] = (b.inventory[d.output] || 0) + output;
      s.produced[d.output] = (s.produced[d.output] || 0) + output;
    }
    if (d.revenue) {
      if (b.kind === "grocery")
        s.consumerDemand = Math.max(0, (s.consumerDemand ?? 10) - 2);
      const revenue =
        d.revenue * (1 + s.tech.Commerce * 0.15) * (s.policies.trade ? 1.1 : 1);
      s.money += revenue;
      s.sales += revenue;
      b.earned += revenue;
    }
    b.cycles++;
    if (!b.manager) b.running = false;
  }
  for (const trip of s.deliveries) {
    trip.elapsed++;
    if (trip.elapsed >= trip.duration) {
      const target = s.buildings.find((b) => b.id === trip.to);
      if (target) {
        target.inventory[trip.resource] =
          (target.inventory[trip.resource] || 0) + trip.amount;
        s.deliveryCount++;
      }
    }
  }
  s.deliveries = s.deliveries.filter((t) => t.elapsed < t.duration);
  if (s.time % 2 === 0 && s.deliveries.length < st.trucks) {
    // Dispatch finished goods before raw-material restocking so a single truck
    // cannot starve the final selling stage of a healthy production chain.
    const priority = (b: Business) =>
      (b.inventory.goods || 0) * 8 +
      (b.inventory.food || 0) * 6 +
      (b.inventory.planks || 0) * 3;
    for (const source of [...s.buildings].sort(
      (a, b) => priority(b) - priority(a),
    )) {
      if (source.build) continue;
      let sent = false;
      for (const r of [
        "goods",
        "food",
        "planks",
        "ore",
        "timber",
        "wheat",
      ] as Resource[]) {
        if ((source.inventory[r] || 0) < 2) continue;
        const target = s.buildings
          .filter(
            (b) =>
              b.id !== source.id &&
              !b.build &&
              (DEFS[b.kind].inputs[r] ||
                (b.kind === "warehouse" && source.kind !== "warehouse")),
          )
          .sort(
            (a, b) =>
              (DEFS[b.kind].inputs[r] ? 1 : 0) -
              (DEFS[a.kind].inputs[r] ? 1 : 0),
          )
          .find((b) => {
            const inbound = s.deliveries
              .filter((t) => t.to === b.id)
              .reduce((n, t) => n + t.amount, 0);
            return (
              (b.inventory[r] || 0) < (DEFS[b.kind].inputs[r] ? 12 : 40) &&
              sum(b.inventory) + inbound + 4 <= capacity(s, b)
            );
          });
        if (target) {
          const amount = Math.min(
            4 + s.tech.Logistics * 2,
            source.inventory[r] || 0,
            capacity(s, target) -
              sum(target.inventory) -
              s.deliveries
                .filter((t) => t.to === target.id)
                .reduce((n, t) => n + t.amount, 0),
          );
          source.inventory[r]! -= amount;
          const path = route(source.plot, target.plot);
          s.deliveries.push({
            id: s.nextId++,
            from: source.id,
            to: target.id,
            resource: r,
            amount,
            elapsed: 0,
            duration: Math.max(
              3,
              Math.ceil(path.length / (1 + s.tech.Logistics * 0.2)),
            ),
          });
          sent = true;
          break;
        }
      }
      if (sent || s.deliveries.length >= st.trucks) break;
    }
  }
}
export function advance(s: Save, seconds: number) {
  const count = Math.max(0, Math.min(28800, Math.floor(seconds)));
  for (let i = 0; i < count; i++) step(s);
}
export function offline(s: Save, now = Date.now()) {
  const seconds = Math.max(
      0,
      Math.min(28800, Math.floor((now - s.lastSaved) / 1000)),
    ),
    before = {
      money: s.money,
      sales: s.sales,
      delivery: s.deliveryCount,
      produced: { ...s.produced },
    };
  advance(s, seconds);
  s.lastSaved = now;
  return {
    seconds,
    credits: Math.round(s.money - before.money),
    sold: Math.round(s.sales - before.sales),
    deliveries: s.deliveryCount - before.delivery,
    resources: RESOURCES.reduce(
      (n, r) => n + (s.produced[r] || 0) - (before.produced[r] || 0),
      0,
    ),
  };
}
