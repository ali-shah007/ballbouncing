import type { World, Event } from "./physics";
export type Node = { x: number; y: number; vx: number; vy: number };
export type BlobBody = { nodes: Node[]; radius: number; hue: number };
export type Chunk = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  broken: boolean;
};
export type MaterialState = {
  blobs: BlobBody[];
  chunks: Chunk[];
  press: number;
  cycle: number;
  crushed: number;
  force: number;
};
export const isMaterial = (m: string) =>
  ["slime", "jelly", "press", "sand"].includes(m);
export function seedMaterial(w: World) {
  const state: MaterialState = {
    blobs: [],
    chunks: [],
    press: -330,
    cycle: 0,
    crushed: 0,
    force: 0,
  };
  if (w.mode === "slime" || w.mode === "jelly") {
    for (let i = 0; i < (w.mode === "slime" ? 1 : 5); i++) {
      const radius = w.mode === "slime" ? 170 : 65 + w.random() * 28;
      const cx = w.mode === "slime" ? 0 : (w.random() - 0.5) * 600,
        cy = w.mode === "slime" ? 220 : -230 - i * 100;
      state.blobs.push({
        radius,
        hue: (i * 93 + w.random() * 40 + 120) % 360,
        nodes: Array.from({ length: 24 }, (_, j) => {
          const a = (j * Math.PI * 2) / 24;
          return {
            x: cx + Math.cos(a) * radius,
            y: cy + Math.sin(a) * radius,
            vx: (w.random() - 0.5) * 25,
            vy: 0,
          };
        }),
      });
    }
  } else
    for (let i = 0; i < (w.mode === "sand" ? 180 : 12); i++) {
      const sand = w.mode === "sand";
      const x = sand ? (w.random() - 0.5) * 580 : ((i % 4) - 1.5) * 135,
        y = sand ? 70 + w.random() * 260 : 300 - Math.floor(i / 4) * 110;
      state.chunks.push({
        x,
        y,
        vx: 0,
        vy: 0,
        r: sand ? 12 : 48,
        hue: (i * 19 + 190) % 360,
        broken: false,
      });
    }
  w.material = state;
}
export function stepMaterial(w: World, dt: number): Event[] {
  const state = w.material!;
  const events: Event[] = [];
  dt = Math.max(0, Math.min(0.05, dt));
  const steps = Math.max(1, Math.ceil(dt / 0.005)),
    h = dt / steps;
  for (let step = 0; step < steps; step++) {
    w.time += h;
    const cycle = Math.floor(w.time / 9);
    if (cycle > state.cycle && w.loop) {
      w.round++;
      seedMaterial(w);
      w.material!.cycle = cycle;
      return [{ id: 0, kind: "win" }];
    }
    const phase = (w.time % 9) / 9;
    state.press =
      w.mode === "jelly"
        ? -600
        : -330 +
          (w.mode === "slime" ? 520 : 595) *
            (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
    state.force = 0;
    for (const blob of state.blobs) {
      const n = blob.nodes.length;
      for (const p of blob.nodes) {
        p.vx *= Math.exp(-1.8 * h);
        p.vy = (p.vy + 500 * h) * Math.exp(-1.8 * h);
        p.x += p.vx * h;
        p.y += p.vy * h;
      }
      const previous = blob.nodes.map((p) => ({ x: p.x, y: p.y }));
      for (let iteration = 0; iteration < 7; iteration++) {
        for (let offset = 1; offset <= 2; offset++)
          for (let j = 0; j < n; j++) {
            const a = blob.nodes[j],
              b = blob.nodes[(j + offset) % n],
              dx = b.x - a.x,
              dy = b.y - a.y,
              d = Math.hypot(dx, dy),
              rest = 2 * blob.radius * Math.sin((Math.PI * offset) / n);
            if (d < 0.001) continue;
            const correction = ((d - rest) / d) * 0.35;
            a.x += dx * correction;
            a.y += dy * correction;
            b.x -= dx * correction;
            b.y -= dy * correction;
          }
        const cx = blob.nodes.reduce((a, p) => a + p.x, 0) / n,
          cy = blob.nodes.reduce((a, p) => a + p.y, 0) / n;
        let area = 0;
        blob.nodes.forEach((p, j) => {
          const q = blob.nodes[(j + 1) % n];
          area += p.x * q.y - q.x * p.y;
        });
        area = Math.abs(area) / 2;
        const scale = Math.min(
          1.04,
          Math.max(
            0.98,
            Math.sqrt((Math.PI * blob.radius ** 2) / Math.max(1, area)),
          ),
        );
        for (const p of blob.nodes) {
          p.x = cx + (p.x - cx) * scale;
          p.y = cy + (p.y - cy) * scale;
          if (p.y < state.press + 12) {
            state.force++;
            p.y = state.press + 12;
          }
          p.x = Math.min(410, Math.max(-410, p.x));
          p.y = Math.min(355, p.y);
        }
      }
      blob.nodes.forEach((p, j) => {
        p.vx = Math.max(
          -400,
          Math.min(400, p.vx + ((p.x - previous[j].x) / h) * 0.12),
        );
        p.vy = Math.max(
          -450,
          Math.min(450, p.vy + ((p.y - previous[j].y) / h) * 0.12),
        );
      });
    }
    for (const p of [...state.chunks]) {
      p.vy = Math.min(650, p.vy + 450 * h);
      p.x += p.vx * h;
      p.y += p.vy * h;
      p.vx *= Math.exp(-h * 1.1);
      if (p.x + p.r > 410 || p.x - p.r < -410) {
        p.x = Math.max(-410 + p.r, Math.min(410 - p.r, p.x));
        p.vx *= -0.45;
      }
      if (p.y + p.r > 355) {
        p.y = 355 - p.r;
        p.vy *= -0.25;
      }
      if (p.y - p.r < state.press + 12) {
        p.y = state.press + 12 + p.r;
        p.vy = Math.max(0, p.vy);
        state.force++;
        if (!p.broken) {
          p.broken = true;
          state.crushed++;
          events.push({ id: state.crushed, kind: "split" });
          w.hits++;
          if (w.mode === "press" && state.chunks.length < 420) {
            for (let j = 0; j < 12; j++) {
              const a = (j * Math.PI) / 6;
              state.chunks.push({
                x: p.x + Math.cos(a) * p.r * 0.5,
                y: p.y + Math.sin(a) * p.r * 0.5,
                vx: Math.cos(a) * (90 + w.random() * 130),
                vy: 50 + w.random() * 170,
                r: 6 + w.random() * 8,
                hue: p.hue + j * 2,
                broken: true,
              });
            }
            p.r = 6;
            p.vx = (w.random() - 0.5) * 300;
          } else {
            p.vx = (p.x >= 0 ? 1 : -1) * (60 + w.random() * 100);
          }
        }
      }
    }
    // Sand grains and crushing fragments settle rather than overlap into one point.
    const cell = w.mode === "press" ? 96 : 32,
      grid = new Map<string, Chunk[]>();
    for (const p of state.chunks) {
      const gx = Math.floor(p.x / cell),
        gy = Math.floor(p.y / cell);
      for (let x = gx - 1; x <= gx + 1; x++)
        for (let y = gy - 1; y <= gy + 1; y++)
          for (const q of grid.get(`${x},${y}`) || []) {
            const dx = p.x - q.x,
              dy = p.y - q.y,
              d = Math.hypot(dx, dy),
              r = p.r + q.r;
            if (d > 0 && d < r) {
              const amount = (r - d) * 0.35;
              p.x += (dx / d) * amount;
              p.y += (dy / d) * amount;
              q.x -= (dx / d) * amount;
              q.y -= (dy / d) * amount;
            }
          }
      const key = `${gx},${gy}`;
      const bucket = grid.get(key) || [];
      bucket.push(p);
      grid.set(key, bucket);
      p.x = Math.min(410 - p.r, Math.max(-410 + p.r, p.x));
      p.y = Math.min(355 - p.r, Math.max(state.press + 12 + p.r, p.y));
    }
  }
  if (
    state.force > 0 &&
    Math.floor(w.time * 9) !== Math.floor((w.time - dt) * 9)
  )
    events.push({ id: state.force, kind: "hit" });
  return events;
}
export function renderMaterial(
  c: CanvasRenderingContext2D,
  w: World,
  title: string,
  brand: string,
) {
  const state = w.material!;
  c.fillStyle = "#080b16";
  c.fillRect(0, 0, 1080, 1920);
  c.textAlign = "center";
  c.fillStyle = "#fff";
  c.font = "800 54px Arial";
  c.fillText(
    title ||
      (w.mode === "slime"
        ? "SLIME SQUISH"
        : w.mode === "jelly"
          ? "JELLY RAIN"
          : w.mode === "press"
            ? "SATISFYING CRUSH"
            : "KINETIC SAND PRESS"),
    540,
    280,
    960,
  );
  c.font = "26px Arial";
  c.fillStyle = "#adbbd2";
  c.fillText(
    w.mode === "jelly"
      ? "SOFT BODIES · GRAVITY · BOUNCE"
      : "WATCH THE PRESS COME DOWN",
    540,
    355,
  );
  c.save();
  c.translate(540, 1040);
  c.fillStyle = "#121d31";
  c.fillRect(-430, -440, 860, 820);
  c.strokeStyle = "#4b668d";
  c.lineWidth = 3;
  c.strokeRect(-430, -440, 860, 820);
  for (const p of state.chunks) {
    c.save();
    c.translate(p.x, p.y);
    const g = c.createLinearGradient(-p.r, -p.r, p.r, p.r);
    g.addColorStop(0, `hsl(${p.hue} 85% 78%)`);
    g.addColorStop(1, `hsl(${p.hue} 80% 40%)`);
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(-p.r, -p.r, p.r * 2, p.r * 2, w.mode === "sand" ? p.r : 3);
    c.fill();
    c.restore();
  }
  for (const blob of state.blobs) {
    const nodes = blob.nodes,
      cx = nodes.reduce((a, p) => a + p.x, 0) / nodes.length,
      cy = nodes.reduce((a, p) => a + p.y, 0) / nodes.length;
    const g = c.createRadialGradient(
      cx - 40,
      cy - 40,
      5,
      cx,
      cy,
      blob.radius * 1.7,
    );
    g.addColorStop(0, `hsl(${blob.hue} 95% 85%)`);
    g.addColorStop(0.3, `hsl(${blob.hue} 90% 60%)`);
    g.addColorStop(1, `hsl(${blob.hue + 40} 85% 28%)`);
    c.fillStyle = g;
    c.beginPath();
    const last = nodes[nodes.length - 1];
    c.moveTo((last.x + nodes[0].x) / 2, (last.y + nodes[0].y) / 2);
    nodes.forEach((p, i) => {
      const q = nodes[(i + 1) % nodes.length];
      c.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
    });
    c.closePath();
    c.fill();
    c.strokeStyle = `hsla(${blob.hue} 100% 90% / .65)`;
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = "#ffffff80";
    c.beginPath();
    c.ellipse(
      cx - blob.radius * 0.25,
      Math.min(...nodes.map((p) => p.y)) + 22,
      blob.radius * 0.27,
      7,
      -0.3,
      0,
      7,
    );
    c.fill();
  }
  c.fillStyle = "#607a9a";
  c.fillRect(-425, 356, 850, 20);
  if (w.mode !== "jelly") {
    const g = c.createLinearGradient(-400, state.press - 55, 400, state.press);
    g.addColorStop(0, "#71869d");
    g.addColorStop(0.5, "#d9e6ef");
    g.addColorStop(1, "#586779");
    c.fillStyle = g;
    c.fillRect(-420, state.press - 48, 840, 60);
    c.fillStyle = "#384557";
    c.fillRect(-35, -445, 70, Math.max(0, state.press + 397));
    c.fillStyle = "#ffbe59";
    for (let x = -390; x < 400; x += 60) c.fillRect(x, state.press - 5, 29, 8);
  }
  c.restore();
  c.fillStyle = "#b5c7df";
  c.font = "28px Arial";
  c.fillText(
    w.mode === "jelly"
      ? `${state.blobs.length} DEFORMABLE BODIES`
      : `${state.crushed} CRUSHED · CYCLE ${w.round}`,
    540,
    1540,
  );
  c.font = "22px Arial";
  c.fillStyle = "#7787a5";
  c.fillText(brand, 540, 1690, 900);
}
