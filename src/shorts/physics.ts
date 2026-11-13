import { isReference, seedReference, stepReference } from "./reference";
export type Mode =
  | "collision"
  | "escape"
  | "growth"
  | "duel"
  | "overflow"
  | "bloom"
  | "mandala"
  | "mushroom"
  | "gravity"
  | "crusher"
  | "pop";
export const MODES: {
  id: Mode;
  name: string;
  hook: string;
  description: string;
}[] = [
  {
    id: "crusher",
    name: "Crescent Crushers",
    hook: "EVERY CRUSH SPLITS A BALL IN TWO",
    description:
      "Counter-rotating curved crushers trigger splits and sparkling bursts.",
  },
  {
    id: "pop",
    name: "Hexagon Pop",
    hook: "EVERY POP BALL DOUBLES",
    description: "Red spikes split balls inside a rotating hexagon.",
  },

  {
    id: "bloom",
    name: "Collision Bloom",
    hook: "EVERY COLLISION SPLITS BOTH BALLS",
    description: "Pearlescent balls multiply and shrink into a living mosaic.",
  },
  {
    id: "mandala",
    name: "Collision Mandalas",
    hook: "COLLISION MANDALAS",
    description: "Twenty-four synchronized neon paths weave circular patterns.",
  },
  {
    id: "mushroom",
    name: "Mushroom Multiplier",
    hook: "EVERY BALL COLLISION MAKES ANOTHER BALL",
    description:
      "A mushroom-shaped arena fills through actual ball collisions.",
  },
  {
    id: "gravity",
    name: "Gravity Cascade",
    hook: "HOW MANY BALLS WILL FIT?",
    description:
      "Two balls become a colourful crowd as collisions create more.",
  },

  {
    id: "collision",
    name: "Collision Chase",
    hook: "CAN THE BALLS COLLIDE?",
    description: "Two neon comets ricochet inside a seven-sided arena.",
  },
  {
    id: "escape",
    name: "Four-Second Escape",
    hook: "4 SECONDS TO ESCAPE",
    description: "Each ball races a countdown to find the rotating opening.",
  },
  {
    id: "growth",
    name: "Growing Ball",
    hook: "BIGGER. FASTER. EVERY BOUNCE.",
    description: "A rainbow ball grows and accelerates with every impact.",
  },
  {
    id: "duel",
    name: "Neon Duel",
    hook: "WHO WINS THIS ROUND?",
    description: "Two contenders score wall hits in a glowing trail battle.",
  },
  {
    id: "overflow",
    name: "Splitter Overflow",
    hook: "WILL IT OVERFLOW?",
    description: "A rotating three-arm splitter multiplies balls on contact.",
  },
];
export type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  hits: number;
  cool: number;
  trail: { x: number; y: number }[];
};
export type Event = {
  id: number;
  kind: "hit" | "escape" | "fail" | "split" | "win";
};
export class World {
  mode: Mode;
  balls: Ball[] = [];
  time = 0;
  hits = 0;
  escaped = 0;
  failed = 0;
  round = 1;
  angle = 0;
  outcome = "";
  hold = 0;
  nextId = 0;
  referenceWave = 0;
  loop = false;
  sparks: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    hue: number;
    life: number;
  }[] = [];
  constructor(
    mode: Mode,
    public limit = 4,
    public target = 30,
    public cap = 180,
  ) {
    this.mode = mode;
    this.seed();
  }
  add(x = 0, y = -160, vx = 235, vy = 110) {
    const b: Ball = {
      id: this.nextId++,
      x,
      y,
      vx,
      vy,
      r: 18,
      hue: (this.nextId * 137) % 360,
      hits: 0,
      cool: 0,
      trail: [],
    };
    this.balls.push(b);
    return b;
  }
  seed() {
    this.balls = [];
    this.referenceWave = 0;
    this.sparks = [];
    this.time = 0;
    this.outcome = "";
    this.hold = 0;
    if (isReference(this.mode)) {
      seedReference(this);
      return;
    }
    this.add(-130, -110, 235, 160);
    if (this.mode === "collision" || this.mode === "duel") {
      this.balls[0].hue = 140;
      const b = this.add(140, 130, -190, -215);
      b.hue = 190;
    }
    if (this.mode === "growth") this.balls[0].r = 13;
  }
  step(dt: number): Event[] {
    if (isReference(this.mode)) {
      if (this.outcome && this.loop) {
        this.hold -= Math.min(0.05, Math.max(0, dt));
        if (this.hold <= 0) {
          this.round++;
          this.seed();
        }
        return [];
      }
      return stepReference(this, dt);
    }
    const events: Event[] = [];
    dt = Math.min(Math.max(dt, 0), 0.05);
    if (this.hold > 0) {
      this.hold -= dt;
      if (this.hold <= 0) {
        this.round++;
        this.seed();
      }
      return events;
    }
    if (this.outcome) return events;
    const steps = Math.ceil(dt / 0.004);
    if (!steps) return events;
    const h = dt / steps;
    for (let n = 0; n < steps; n++) {
      if (this.outcome) break;
      this.time += h;
      this.angle += h * 0.55;
      for (const b of [...this.balls]) {
        b.cool = Math.max(0, b.cool - h);
        b.x += b.vx * h;
        b.y += b.vy * h;
        if (this.mode === "growth" || this.mode === "overflow")
          b.vy = Math.min(950, b.vy + 165 * h);
        let hit = false;
        if (this.mode === "collision") {
          for (let i = 0; i < 7; i++) {
            const a = (i * Math.PI * 2) / 7 - Math.PI / 2;
            const nx = Math.cos(a),
              ny = Math.sin(a);
            const distance = b.x * nx + b.y * ny;
            const plane = 440 * Math.cos(Math.PI / 7) - b.r;
            if (distance > plane) {
              b.x -= (distance - plane) * nx;
              b.y -= (distance - plane) * ny;
              const dot = b.vx * nx + b.vy * ny;
              if (dot > 0) {
                b.vx -= 2 * dot * nx;
                b.vy -= 2 * dot * ny;
                hit = true;
              }
            }
          }
        } else {
          const d = Math.hypot(b.x, b.y);
          if (d + b.r >= 440) {
            const a = Math.atan2(b.y, b.x);
            const diff = Math.atan2(
              Math.sin(a - this.angle),
              Math.cos(a - this.angle),
            );
            if (this.mode === "escape" && Math.abs(diff) < 0.19) {
              if (d > 440 + b.r) {
                this.escaped++;
                events.push({ id: b.id, kind: "escape" });
                this.outcome = "ESCAPED!";
                this.hold = 1.3;
              }
              continue;
            }
            const nx = b.x / d,
              ny = b.y / d;
            b.x = nx * (440 - b.r);
            b.y = ny * (440 - b.r);
            const dot = b.vx * nx + b.vy * ny;
            if (dot > 0) {
              b.vx -= 2 * dot * nx;
              b.vy -= 2 * dot * ny;
              hit = true;
            }
          }
        }
        if (this.mode === "overflow" && b.cool === 0) {
          for (let i = 0; i < 3; i++) {
            const a = this.angle + (i * Math.PI * 2) / 3;
            const ux = Math.cos(a),
              uy = Math.sin(a);
            const t = Math.min(355, Math.max(0, b.x * ux + b.y * uy));
            const dx = b.x - ux * t,
              dy = b.y - uy * t,
              d = Math.hypot(dx, dy);
            if (d < b.r + 9) {
              const nx = d > 0 ? dx / d : -uy,
                ny = d > 0 ? dy / d : ux;
              b.x += nx * (b.r + 10 - d);
              b.y += ny * (b.r + 10 - d);
              const dot = b.vx * nx + b.vy * ny;
              if (dot < 0) {
                b.vx -= 2 * dot * nx;
                b.vy -= 2 * dot * ny;
              }
              b.vx += nx * 30;
              b.vy += ny * 30;
              b.cool = 0.22;
              if (this.balls.length < this.cap) {
                const child = this.add(
                  b.x + nx * 2,
                  b.y + ny * 2,
                  -b.vy * 0.85,
                  b.vx * 0.85,
                );
                child.r = 9;
                child.cool = 0.25;
                child.hue = b.hue + 17;
                b.r = 9;
                events.push({ id: b.id, kind: "split" });
              }
              break;
            }
          }
        }
        if (hit) {
          b.hits++;
          this.hits++;
          events.push({ id: b.id, kind: "hit" });
          if (this.mode === "growth") {
            b.r = Math.min(190, b.r + 1.8);
            b.vx *= 1.025;
            b.vy *= 1.025;
            b.hue += 17;
          }
          if (this.mode === "duel" && b.hits >= this.target) {
            this.outcome = (b.id % 2 === 0 ? "GREEN" : "CYAN") + " WINS";
            this.hold = 4;
            events.push({ id: b.id, kind: "win" });
          }
        }
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > 1100) {
          b.vx *= 1100 / speed;
          b.vy *= 1100 / speed;
        }
      }
      if (
        this.balls.length === 2 &&
        (this.mode === "collision" || this.mode === "duel")
      ) {
        const [a, b] = this.balls;
        const dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy);
        if (d < a.r + b.r && d > 0) {
          const nx = dx / d,
            ny = dy / d,
            over = (a.r + b.r - d) / 2;
          a.x -= nx * over;
          a.y -= ny * over;
          b.x += nx * over;
          b.y += ny * over;
          const v = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (v > 0) {
            a.vx -= v * nx;
            a.vy -= v * ny;
            b.vx += v * nx;
            b.vy += v * ny;
            events.push({
              id: a.id,
              kind: this.mode === "collision" ? "win" : "hit",
            });
            if (this.mode === "collision") {
              this.outcome = "THEY COLLIDED!";
              this.hold = 4;
            }
          }
        }
      }
      if (this.mode === "escape" && this.time >= this.limit && !this.outcome) {
        this.failed++;
        this.outcome = "TIME UP · NEXT BALL";
        this.hold = 1.3;
        events.push({ id: 0, kind: "fail" });
      }
      if (this.mode === "overflow" && this.balls.length >= this.cap) {
        this.outcome = "CAPACITY REACHED";
        events.push({ id: 0, kind: "win" });
      }
      if (this.mode === "growth" && this.balls[0].r >= 190) {
        this.outcome = "MAXIMUM GROWTH REACHED";
        events.push({ id: 0, kind: "win" });
      }
    }
    for (const b of this.balls) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > (this.mode === "overflow" ? 12 : 65))
        b.trail.shift();
    }
    return events;
  }
}
