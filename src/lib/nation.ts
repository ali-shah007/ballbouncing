export const BUILDINGS = {
  housing: {
    name: "Neighborhood",
    icon: "▥",
    cost: 600,
    time: 8,
    upkeep: 2,
    color: "#d9b79a",
    description: "Homes for 250 residents per level.",
  },
  farm: {
    name: "Regenerative farm",
    icon: "♧",
    cost: 850,
    time: 10,
    upkeep: 3,
    color: "#b9cc73",
    description: "Food for 400 people. Earns export income.",
  },
  solar: {
    name: "Solar park",
    icon: "☀",
    cost: 1000,
    time: 12,
    upkeep: 3,
    color: "#83bbcf",
    description: "Powers 500 people and local industry.",
  },
  factory: {
    name: "Manufacturing",
    icon: "⚙",
    cost: 1600,
    time: 16,
    upkeep: 12,
    color: "#d7a576",
    description: "Creates jobs and income. Needs power, food, and transport.",
  },
  road: {
    name: "Logistics hub",
    icon: "⇄",
    cost: 900,
    time: 10,
    upkeep: 4,
    color: "#b0b9ae",
    description: "Connects districts and improves industrial productivity.",
  },
  school: {
    name: "Learning campus",
    icon: "⌂",
    cost: 1800,
    time: 18,
    upkeep: 10,
    color: "#bfaad1",
    description: "Trains workers and generates research points.",
  },
  hospital: {
    name: "Health center",
    icon: "✚",
    cost: 2200,
    time: 20,
    upkeep: 14,
    color: "#dfb3b3",
    description: "Improves health and population growth.",
  },
  forest: {
    name: "Forest restoration",
    icon: "♠",
    cost: 650,
    time: 15,
    upkeep: 1,
    color: "#7fb493",
    description: "Absorbs pollution and improves wellbeing over time.",
  },
  port: {
    name: "Trade terminal",
    icon: "⚓",
    cost: 3200,
    time: 24,
    upkeep: 15,
    color: "#89b8c4",
    description: "Unlocks animated trade routes and export revenue.",
  },
  tourism: {
    name: "Culture & tourism",
    icon: "◇",
    cost: 2600,
    time: 22,
    upkeep: 10,
    color: "#e0c381",
    description: "Welcomes visitors. Benefits from a clean, healthy nation.",
  },
} as const;
export type BuildingType = keyof typeof BUILDINGS;
export type Building = {
  id: number;
  type: BuildingType;
  level: number;
  target: number;
  remaining: number;
  total: number;
  slot: number;
  region: number;
};
export type NationEvent = {
  id: number;
  text: string;
  kind: "build" | "economy" | "milestone" | "warning";
  time: number;
};
export type NationSave = {
  version: 1;
  country: string;
  cash: number;
  earned: number;
  population: number;
  knowledge: number;
  research: number;
  tax: number;
  green: boolean;
  manager: boolean;
  buildings: Building[];
  time: number;
  nextId: number;
  events: NationEvent[];
  claimed: string[];
  lastSaved: number;
};
export type NationStats = {
  income: number;
  expenses: number;
  net: number;
  food: number;
  power: number;
  housing: number;
  health: number;
  happiness: number;
  pollution: number;
  employment: number;
  efficiency: number;
  transport: number;
  exports: number;
};
export const DISTRICTS = [
  "Capital district",
  "Northern plains",
  "Eastern corridor",
  "Southern valley",
  "Western heights",
  "Central basin",
];
export function createNation(country: string): NationSave {
  return {
    version: 1,
    country,
    cash: 12000,
    earned: 0,
    population: 350,
    knowledge: 0,
    research: 0,
    tax: 0.15,
    green: false,
    manager: false,
    buildings: [
      {
        id: 1,
        type: "housing",
        level: 2,
        target: 2,
        remaining: 0,
        total: 0,
        slot: 12,
        region: 0,
      },
      {
        id: 2,
        type: "farm",
        level: 1,
        target: 1,
        remaining: 0,
        total: 0,
        slot: 6,
        region: 1,
      },
      {
        id: 3,
        type: "solar",
        level: 1,
        target: 1,
        remaining: 0,
        total: 0,
        slot: 21,
        region: 2,
      },
    ],
    time: 0,
    nextId: 4,
    events: [
      {
        id: 0,
        text: "A new chapter begins. Build a country worth coming home to.",
        kind: "milestone",
        time: 0,
      },
    ],
    claimed: [],
    lastSaved: Date.now(),
  };
}
export function levels(s: NationSave, type: BuildingType) {
  return s.buildings
    .filter((b) => b.type === type)
    .reduce((n, b) => n + b.level, 0);
}
export function nationStats(s: NationSave): NationStats {
  const n = (t: BuildingType) => levels(s, t);
  const housing = n("housing") * 250,
    food = n("farm") * 400,
    power = n("solar") * 500,
    transport = Math.min(1, 0.55 + n("road") * 0.16),
    demand = s.population + n("factory") * 140 + n("port") * 80;
  const pollution = Math.max(
    0,
    Math.min(
      100,
      n("factory") * 9 + n("port") * 3 - n("forest") * 7 - (s.green ? 12 : 0),
    ),
  );
  const health = Math.min(100, 45 + n("hospital") * 16 - pollution * 0.22);
  const happiness = Math.max(
    5,
    Math.min(
      100,
      75 +
        (health - 50) * 0.25 +
        n("forest") * 2 -
        (s.tax - 0.15) * 180 -
        Math.max(0, s.population - housing) * 0.1 -
        (food < s.population ? 20 : 0),
    ),
  );
  const efficiency =
    Math.max(
      0.08,
      Math.min(
        1,
        food / Math.max(1, s.population),
        power / Math.max(1, demand),
      ),
    ) *
    transport *
    (1 + s.research * 0.12) *
    (s.cash <= 0 ? 0.65 : 1);
  const exports = n("port") * (30 + n("factory") * 12) * efficiency;
  const income =
    35 +
    s.population * s.tax * 0.7 +
    n("farm") * 22 +
    n("factory") * 110 * efficiency +
    exports +
    ((n("tourism") * 70 * happiness) / 100) * (1 - pollution / 150);
  const expenses =
    s.buildings.reduce((v, b) => v + BUILDINGS[b.type].upkeep * b.level, 0) +
    (s.green ? 18 : 0);
  const employment = Math.min(
    100,
    ((n("factory") * 80 +
      n("farm") * 30 +
      n("school") * 24 +
      n("port") * 45 +
      n("hospital") * 30 +
      n("tourism") * 50 +
      35) /
      Math.max(1, s.population * 0.55)) *
      100,
  );
  return {
    income,
    expenses,
    net: income - expenses,
    food,
    power,
    housing,
    health,
    happiness,
    pollution,
    employment,
    efficiency,
    transport,
    exports,
  };
}
export function notify(
  s: NationSave,
  text: string,
  kind: NationEvent["kind"] = "economy",
) {
  s.events.unshift({ id: s.nextId++, text, kind, time: s.time });
  s.events = s.events.slice(0, 40);
}
export function costOf(type: BuildingType, level = 1) {
  return Math.round(BUILDINGS[type].cost * Math.pow(1.65, level - 1));
}
export function build(
  s: NationSave,
  type: BuildingType,
  region: number,
  upgradeId?: number,
) {
  if (!BUILDINGS[type]) return "Unknown building.";
  if (s.buildings.filter((b) => b.remaining > 0).length >= 2 + s.research)
    return "Construction queue full. Research adds another construction crew.";
  const existing =
    upgradeId === undefined
      ? undefined
      : s.buildings.find((b) => b.id === upgradeId);
  if (upgradeId !== undefined && (!existing || existing.type !== type))
    return "Building not found.";
  if (existing?.remaining) return "This project is already under construction.";
  if (existing && existing.level >= 5) return "Maximum level reached.";
  const level = existing ? existing.level + 1 : 1,
    cost = costOf(type, level);
  if (s.cash < cost) return "Not enough treasury funds.";
  if (type === "port" && s.research < 1)
    return "Research level 1 unlocks international trade.";
  const free = Array.from({ length: 32 }, (_, i) => i).filter(
    (i) => !s.buildings.some((b) => b.slot === i),
  );
  if (!existing && !free.length)
    return "All development sites are occupied. Upgrade existing projects.";
  s.cash -= cost;
  const duration = (BUILDINGS[type].time * level) / (1 + s.research * 0.15);
  if (existing) {
    existing.target = level;
    existing.remaining = duration;
    existing.total = duration;
  } else {
    s.buildings.push({
      id: s.nextId++,
      type,
      level: 0,
      target: 1,
      remaining: duration,
      total: duration,
      slot: free[(region * 5) % free.length],
      region,
    });
  }
  notify(
    s,
    `${existing ? "Upgrading" : "Building"} ${BUILDINGS[type].name} in ${DISTRICTS[region]} · −${cost.toLocaleString()} credits.`,
    "build",
  );
  return null;
}
export function research(s: NationSave) {
  const cost = 2500 * (s.research + 1),
    points = 15 * (s.research + 1);
  if (s.research >= 5) return "All research tiers completed.";
  if (s.cash < cost || s.knowledge < points)
    return `Requires ${cost} credits and ${points} research points.`;
  s.cash -= cost;
  s.knowledge -= points;
  s.research++;
  notify(
    s,
    `Research tier ${s.research} unlocked: +12% productivity and an extra construction crew.`,
    "milestone",
  );
  return null;
}
export const MILESTONES = [
  {
    id: "industry",
    name: "Open for business",
    description: "Complete your first factory.",
    reward: 1800,
    test: (s: NationSave) => levels(s, "factory") >= 1,
  },
  {
    id: "learn",
    name: "A brighter generation",
    description: "Build a learning campus.",
    reward: 2200,
    test: (s: NationSave) => levels(s, "school") >= 1,
  },
  {
    id: "green",
    name: "Room to breathe",
    description: "Restore three levels of forest.",
    reward: 2400,
    test: (s: NationSave) => levels(s, "forest") >= 3,
  },
  {
    id: "people",
    name: "A place to call home",
    description: "Reach 600 residents.",
    reward: 3000,
    test: (s: NationSave) => s.population >= 600,
  },
  {
    id: "trade",
    name: "Connected to the world",
    description: "Open a trade terminal.",
    reward: 4000,
    test: (s: NationSave) => levels(s, "port") >= 1,
  },
  {
    id: "prosper",
    name: "Prosperity for everyone",
    description: "Reach 80 happiness and 70 employment.",
    reward: 5000,
    test: (s: NationSave) =>
      nationStats(s).happiness >= 80 && nationStats(s).employment >= 70,
  },
];
export function tickNation(s: NationSave, seconds: number) {
  const dt = Math.max(0, Math.min(seconds, 60));
  if (!Number.isFinite(dt)) return;
  const before = Math.floor(s.time / 60);
  s.time += dt;
  for (const b of s.buildings) {
    if (b.remaining > 0) {
      b.remaining = Math.max(0, b.remaining - dt);
      if (!b.remaining) {
        b.level = b.target;
        notify(
          s,
          `${BUILDINGS[b.type].name} completed · Level ${b.level}. Your map and economy have updated.`,
          "build",
        );
      }
    }
  }
  const stats = nationStats(s),
    revenue = (stats.income * dt) / 60;
  s.cash = Math.max(0, s.cash + (stats.net * dt) / 60);
  s.earned += revenue;
  s.knowledge += levels(s, "school") * 0.12 * dt;
  const capacity = Math.min(stats.housing, stats.food);
  if (s.population < capacity && stats.happiness > 40)
    s.population = Math.min(
      capacity,
      s.population +
        (((stats.health / 100) * stats.happiness) / 100) * 0.4 * dt,
    );
  else if (s.population > stats.food)
    s.population = Math.max(50, s.population - 0.05 * dt);
  for (const m of MILESTONES)
    if (!s.claimed.includes(m.id) && m.test(s)) {
      s.claimed.push(m.id);
      s.cash += m.reward;
      notify(
        s,
        `${m.name} achieved! +${m.reward.toLocaleString()} credits.`,
        "milestone",
      );
    }
  if (Math.floor(s.time / 120) > Math.floor((s.time - dt) / 120)) {
    const cycle = Math.floor(s.time / 120);
    if (cycle % 3 === 1) {
      const bonus = 100 + levels(s, "tourism") * 80;
      s.cash += bonus;
      notify(s, `Local enterprise grants a ${bonus}-credit investment bonus.`);
    } else if (cycle % 3 === 2) {
      const fee = Math.min(s.cash, 80 + s.buildings.length * 4);
      s.cash -= fee;
      notify(
        s,
        `Infrastructure maintenance: ${Math.round(fee)} credits. Reserves kept services running.`,
        "warning",
      );
    } else
      notify(
        s,
        `Economic report: ${Math.round(stats.happiness)} happiness · ${Math.round(stats.employment)}% employment.`,
      );
  }
  if (s.manager && Math.floor(s.time / 60) > before) {
    const priority: BuildingType =
      stats.power < s.population + levels(s, "factory") * 140
        ? "solar"
        : stats.food < s.population * 1.3
          ? "farm"
          : stats.housing < s.population * 1.3
            ? "housing"
            : stats.pollution > 25
              ? "forest"
              : "factory";
    if (s.cash > costOf(priority) + 2500)
      build(s, priority, Math.floor(s.time / 60) % 6);
  }
}
export function validNation(value: unknown): value is NationSave {
  if (!value || typeof value !== "object") return false;
  const s = value as NationSave;
  return (
    s.version === 1 &&
    typeof s.country === "string" &&
    s.country.length < 100 &&
    [
      "cash",
      "earned",
      "population",
      "knowledge",
      "research",
      "tax",
      "time",
      "nextId",
      "lastSaved",
    ].every((k) => Number.isFinite(s[k as keyof NationSave])) &&
    s.cash >= 0 &&
    s.population >= 0 &&
    Number.isInteger(s.research) &&
    s.research >= 0 &&
    s.research <= 5 &&
    s.tax >= 0.1 &&
    s.tax <= 0.3 &&
    typeof s.green === "boolean" &&
    typeof s.manager === "boolean" &&
    Array.isArray(s.claimed) &&
    s.claimed.every((x) => typeof x === "string") &&
    Array.isArray(s.events) &&
    s.events.length <= 40 &&
    s.events.every(
      (e) =>
        e &&
        typeof e.text === "string" &&
        e.text.length < 1000 &&
        Number.isFinite(e.id) &&
        ["build", "economy", "milestone", "warning"].includes(e.kind) &&
        Number.isFinite(e.time),
    ) &&
    Array.isArray(s.buildings) &&
    s.buildings.length <= 32 &&
    new Set(s.buildings.map((b) => b.slot)).size === s.buildings.length &&
    s.buildings.every(
      (b) =>
        b &&
        Object.hasOwn(BUILDINGS, b.type) &&
        Number.isInteger(b.id) &&
        Number.isInteger(b.region) &&
        b.region >= 0 &&
        b.region < 6 &&
        Number.isInteger(b.slot) &&
        b.slot >= 0 &&
        b.slot < 32 &&
        Number.isInteger(b.level) &&
        b.level >= 0 &&
        b.level <= 5 &&
        Number.isInteger(b.target) &&
        b.target >= b.level &&
        b.target <= 5 &&
        Number.isFinite(b.remaining) &&
        b.remaining >= 0 &&
        Number.isFinite(b.total) &&
        b.total >= 0,
    )
  );
}
export function applyOffline(s: NationSave, now = Date.now()) {
  const seconds = Math.min(4 * 3600, Math.max(0, (now - s.lastSaved) / 1000)),
    cash = s.cash;
  let remaining = seconds;
  while (remaining > 0) {
    const dt = Math.min(5, remaining);
    tickNation(s, dt);
    remaining -= dt;
  }
  s.lastSaved = now;
  return { seconds, earned: s.cash - cash };
}
