export type Gravity = "down" | "center" | "rotate";
export type Config = {
  seed: number;
  spawn: number;
  opening: number;
  rotation: number;
  gravity: number;
  speed: number;
  size: number;
  maxBalls: number;
  duration: number;
  gravityMode: Gravity;
  pulse: boolean;
  trails: boolean;
  particles: boolean;
  captions: boolean;
  palette: "citrus" | "candy" | "ocean";
};
export const DEFAULT: Config = {
  seed: 42,
  spawn: 2,
  opening: 46,
  rotation: 0.3,
  gravity: 110,
  speed: 1,
  size: 8,
  maxBalls: 150,
  duration: 30,
  gravityMode: "down",
  pulse: false,
  trails: true,
  particles: true,
  captions: true,
  palette: "citrus",
};
export const PRESETS = [
  {
    id: "population-explosion",
    name: "Population explosion",
    tag: "A little chaos",
    description:
      "Every escape welcomes three new arrivals. Watch a quiet orbit turn into a colorful crowd.",
    color: "#d8f36a",
    config: { spawn: 3, opening: 48, rotation: 0.3, palette: "citrus" },
  },
  {
    id: "musical-rain",
    name: "Musical rain",
    tag: "Slow & soothing",
    description:
      "Soft gravity, an unhurried ring, and gentle pentatonic notes. A little room to breathe.",
    color: "#a8c9f4",
    config: {
      spawn: 1,
      gravity: 60,
      rotation: 0.14,
      speed: 0.8,
      palette: "ocean",
    },
  },
  {
    id: "gravity-dance",
    name: "Gravity dance",
    tag: "Expect the unexpected",
    description:
      "The direction of gravity slowly turns. Familiar paths become a completely new choreography.",
    color: "#c9b6eb",
    config: {
      gravityMode: "rotate",
      rotation: -0.35,
      spawn: 2,
      palette: "candy",
    },
  },
  {
    id: "escape-race",
    name: "Escape race",
    tag: "Against the clock",
    description:
      "A narrow exit, quick-moving balls, and thirty seconds on the clock. Count every escape.",
    color: "#f4b48d",
    config: {
      opening: 28,
      speed: 1.35,
      spawn: 2,
      duration: 30,
      palette: "citrus",
    },
  },
  {
    id: "pressure-cooker",
    name: "Pressure cooker",
    tag: "Build the tension",
    description:
      "A breathing opening makes every escape a matter of timing. Let the anticipation build.",
    color: "#ecb6ca",
    config: {
      pulse: true,
      opening: 36,
      spawn: 3,
      gravity: 140,
      palette: "candy",
    },
  },
] as const;
export const PALETTES = {
  citrus: ["#d8f36a", "#f6b766", "#ede99b", "#95d5a7", "#f8e9c2"],
  candy: ["#d9b6ff", "#ff95bc", "#a8c9ff", "#ffe5a3", "#f9c8ed"],
  ocean: ["#8ee6d1", "#a9d0fc", "#c4b8fa", "#d4f4ec", "#77b6e8"],
};
export type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  escaped: boolean;
  trail: { x: number; y: number }[];
};
export type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};
export type Snapshot = {
  balls: Ball[];
  time: number;
  angle: number;
  escapes: number;
  nextId: number;
  rng: number;
};
export const CHARACTERS = ["Pip", "Nova", "Milo", "Luna", "Sol"];
export type Stats = {
  balls: number;
  escapes: number;
  time: number;
  finished: boolean;
  characters?: { name: string; color: string; escaped: boolean }[];
};
export class Simulation {
  config: Config;
  balls: Ball[] = [];
  sparks: Spark[] = [];
  time = 0;
  angle = -0.7;
  escapes = 0;
  nextId = 0;
  rng: number;
  radius = 190;
  onImpact?: (speed: number, id: number) => void;
  onEscape?: () => void;
  constructor(config: Config) {
    this.config = { ...config };
    this.rng = config.seed >>> 0;
    for (let i = 0; i < 5; i++) this.spawn();
  }
  random() {
    this.rng = (Math.imul(1664525, this.rng) + 1013904223) >>> 0;
    return this.rng / 4294967296;
  }
  spawn() {
    if (this.balls.filter((b) => !b.escaped).length >= this.config.maxBalls)
      return;
    const a = this.random() * Math.PI * 2,
      r = this.random() * 65;
    const colors = PALETTES[this.config.palette];
    this.balls.push({
      id: this.nextId++,
      x: Math.cos(a) * r,
      y: Math.sin(a) * r - 55,
      vx: (this.random() - 0.5) * 190,
      vy: (this.random() - 0.5) * 150,
      radius: this.config.size,
      color:
        colors[
          this.nextId <= 5
            ? this.nextId - 1
            : Math.floor(this.random() * colors.length)
        ],
      escaped: false,
      trail: [],
    });
  }
  get opening() {
    return (
      ((this.config.opening * Math.PI) / 180) *
      (this.config.pulse ? 0.75 + 0.45 * Math.sin(this.time * 1.3) : 1)
    );
  }
  get finished() {
    return this.time >= this.config.duration;
  }
  step(dt: number) {
    if (this.finished) return;
    dt = Math.min(dt, 1 / 30);
    this.time = Math.min(this.config.duration, this.time + dt);
    if (this.config.duration - this.time < 1e-8)
      this.time = this.config.duration;
    dt *= this.config.speed;
    this.angle += this.config.rotation * dt;
    let spawned = 0;
    for (const b of this.balls) {
      let gx = 0,
        gy = this.config.gravity;
      if (this.config.gravityMode === "rotate") {
        gx = Math.sin(this.time * 0.55) * gy;
        gy = Math.cos(this.time * 0.55) * gy;
      }
      if (this.config.gravityMode === "center") {
        const l = Math.hypot(b.x, b.y) || 1;
        gx = (-b.x / l) * this.config.gravity;
        gy = (-b.y / l) * this.config.gravity;
      }
      b.vx += gx * dt;
      b.vy += gy * dt;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > 480) {
        b.vx *= 480 / speed;
        b.vy *= 480 / speed;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const d = Math.hypot(b.x, b.y);
      const theta = Math.atan2(b.y, b.x);
      const diff = Math.atan2(
        Math.sin(theta - this.angle),
        Math.cos(theta - this.angle),
      );
      const fits =
        Math.abs(diff) <
        Math.max(
          0,
          this.opening / 2 - Math.asin(Math.min(1, b.radius / this.radius)),
        );
      if (!b.escaped && d >= this.radius - b.radius) {
        if (fits) {
          if (d > this.radius + b.radius) {
            b.escaped = true;
            this.escapes++;
            spawned += this.config.spawn;
            this.onEscape?.();
            if (this.config.particles)
              for (let j = 0; j < 12; j++) {
                const a = this.random() * Math.PI * 2;
                this.sparks.push({
                  x: b.x,
                  y: b.y,
                  vx: Math.cos(a) * 80,
                  vy: Math.sin(a) * 80,
                  life: 1,
                  color: b.color,
                });
              }
          }
        } else {
          const nx = b.x / d,
            ny = b.y / d;
          const v = b.vx * nx + b.vy * ny;
          b.x = nx * (this.radius - b.radius - 0.5);
          b.y = ny * (this.radius - b.radius - 0.5);
          if (v > 0) {
            b.vx -= 2 * v * nx;
            b.vy -= 2 * v * ny;
            this.onImpact?.(v, b.id);
          }
        }
      }
      if (this.config.trails) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 14) b.trail.shift();
      } else b.trail = [];
    }
    const active = this.balls.filter((b) => !b.escaped);
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i],
          b = active[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          minimum = a.radius + b.radius;
        if (Math.abs(dx) >= minimum || Math.abs(dy) >= minimum) continue;
        const distance = Math.hypot(dx, dy);
        if (distance >= minimum || distance < 0.00001) continue;
        const nx = dx / distance,
          ny = dy / distance,
          overlap = (minimum - distance) * 0.5;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        const approaching = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (approaching < 0) {
          a.vx += approaching * nx;
          a.vy += approaching * ny;
          b.vx -= approaching * nx;
          b.vy -= approaching * ny;
        }
      }
    this.balls = this.balls.filter(
      (b) => !b.escaped || (Math.abs(b.x) < 450 && Math.abs(b.y) < 650),
    );
    // Bound escaped particles as well as the active population.
    if (this.balls.length > this.config.maxBalls + 50)
      this.balls = this.balls.slice(-this.config.maxBalls - 50);
    for (let i = 0; i < Math.min(spawned, this.config.maxBalls); i++)
      this.spawn();
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt * 1.7;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);
  }
  stats(): Stats {
    return {
      balls: this.balls.filter((b) => !b.escaped).length,
      escapes: this.escapes,
      time: this.time,
      finished: this.finished,
      characters: CHARACTERS.map((name, id) => {
        const b = this.balls.find((b) => b.id === id);
        return {
          name,
          color: b?.color ?? PALETTES[this.config.palette][id],
          escaped: !b || b.escaped,
        };
      }),
    };
  }
  snapshot(): Snapshot {
    return JSON.parse(
      JSON.stringify({
        balls: this.balls,
        time: this.time,
        angle: this.angle,
        escapes: this.escapes,
        nextId: this.nextId,
        rng: this.rng,
      }),
    );
  }
  restore(s: Snapshot) {
    this.balls = structuredClone(s.balls);
    this.time = s.time;
    this.angle = s.angle;
    this.escapes = s.escapes;
    this.nextId = s.nextId;
    this.rng = s.rng;
    this.sparks = [];
  }
}
