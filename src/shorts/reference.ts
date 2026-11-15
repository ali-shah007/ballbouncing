import type { World, Ball, Event } from "./physics";
export const isReference = (mode: string) =>
  [
    "bloom",
    "mandala",
    "mushroom",
    "gravity",
    "crusher",
    "pop",
    "hammer",
    "vortex",
  ].includes(mode);
export type Point = { x: number; y: number };
// Clockwise on the screen; sampled quadratic curves form a closed, concave arena.
export const MUSHROOM: Point[] = (() => {
  const points: Point[] = [{ x: -420, y: -20 }];
  function curve(cx: number, cy: number, x: number, y: number, n = 16) {
    const a = points[points.length - 1];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      points.push({
        x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t * t * x,
        y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t * t * y,
      });
    }
  }
  curve(-410, -240, -180, -370);
  curve(0, -490, 180, -370);
  curve(410, -240, 420, -20);
  curve(425, 35, 330, 35);
  curve(240, 35, 145, 30);
  curve(110, 35, 145, 95);
  curve(205, 185, 125, 185);
  curve(90, 185, 125, 285);
  curve(200, 460, 0, 460);
  curve(-200, 460, -125, 285);
  curve(-90, 185, -125, 185);
  curve(-205, 185, -145, 95);
  curve(-110, 35, -145, 30);
  curve(-240, 35, -330, 35);
  curve(-425, 35, -420, -20);
  return points;
})();
export function insideMushroom(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = MUSHROOM.length - 1; i < MUSHROOM.length; j = i++) {
    const a = MUSHROOM[i],
      b = MUSHROOM[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function mushroomWall(b: Ball) {
  let best = Infinity,
    px = 0,
    py = 0,
    nx = 0,
    ny = 0;
  for (let i = 0; i < MUSHROOM.length - 1; i++) {
    const a = MUSHROOM[i],
      z = MUSHROOM[i + 1],
      dx = z.x - a.x,
      dy = z.y - a.y,
      l = dx * dx + dy * dy;
    const t = Math.max(
      0,
      Math.min(1, ((b.x - a.x) * dx + (b.y - a.y) * dy) / l),
    );
    const x = a.x + t * dx,
      y = a.y + t * dy,
      d = (b.x - x) ** 2 + (b.y - y) ** 2;
    if (d < best) {
      best = d;
      px = x;
      py = y;
      const len = Math.sqrt(l);
      nx = -dy / len;
      ny = dx / len;
    }
  }
  const d = Math.sqrt(best),
    inside = insideMushroom(b.x, b.y);
  if (inside && d >= b.r) return false;
  if (inside && d > 0.001) {
    nx = (b.x - px) / d;
    ny = (b.y - py) / d;
  }
  b.x = px + nx * (b.r + 0.15);
  b.y = py + ny * (b.r + 0.15);
  const dot = b.vx * nx + b.vy * ny;
  if (dot < 0) {
    b.vx -= 2 * dot * nx;
    b.vy -= 2 * dot * ny;
  }
  return true;
}
export function seedReference(w: World) {
  if (w.mode === "vortex") {
    for (let i = 0; i < Math.min(160, w.cap); i++) {
      const a = w.random() * Math.PI * 2,
        r = 50 + w.random() * 320;
      const b = w.add(
        Math.cos(a) * r,
        Math.sin(a) * r,
        -Math.sin(a) * 210,
        Math.cos(a) * 210,
      );
      b.r = 6 + w.random() * 5;
      b.hue = i * 2.25;
    }
    return;
  }
  if (w.mode === "crusher" || w.mode === "pop" || w.mode === "hammer") {
    const b = w.add(80, -180, 175, 100);
    b.r = 12;
    b.hue = 180;
    return;
  }
  if (w.mode === "mandala") {
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI * 2) / 24;
      const b = w.add(
        Math.cos(a) * 270,
        Math.sin(a) * 270,
        Math.cos(a + 0.83) * 310,
        Math.sin(a + 0.83) * 310,
      );
      b.r = 10;
      b.hue = (i * 360) / 24;
    }
  } else {
    const r = w.mode === "bloom" ? 78 : 12;
    const a = w.add(-105, w.mode === "mushroom" ? -180 : -90, 240, 125),
      b = w.add(105, w.mode === "mushroom" ? -180 : -90, -240, 125);
    a.r = b.r = r;
    a.hue = 0;
    b.hue = 230;
  }
}
export function stepReference(w: World, dt: number): Event[] {
  const events: Event[] = [];
  if (w.outcome) return events;
  dt = Math.min(0.05, Math.max(0, dt));
  if (!dt) return events;
  const count = w.balls.length;
  const steps = Math.max(
    1,
    Math.min(8, Math.ceil(dt / (count > 600 ? 0.012 : 0.006))),
  );
  const h = dt / steps;
  for (let tick = 0; tick < steps; tick++) {
    w.time += h;
    w.angle += h * 0.25;
    if (w.mode === "mandala" && Math.floor(w.time / 8) > w.referenceWave) {
      w.referenceWave++;
      for (let i = 0; i < 4 && w.balls.length < Math.min(64, w.cap); i++) {
        const a = (i * Math.PI) / 2 + w.referenceWave * 0.21;
        const b = w.add(
          Math.cos(a) * 280,
          Math.sin(a) * 280,
          Math.cos(a + 0.83) * 310,
          Math.sin(a + 0.83) * 310,
        );
        b.r = 10;
        b.hue = ((a * 180) / Math.PI + 360) % 360;
      }
    }
    for (const b of w.balls) {
      b.cool = Math.max(0, b.cool - h);
      if (w.mode === "vortex") {
        const r = Math.max(50, Math.hypot(b.x, b.y));
        b.vx += ((-b.y / r) * 90 - b.x * 0.1) * h;
        b.vy += ((b.x / r) * 90 - b.y * 0.1) * h;
      }
      if (w.mode === "gravity" || w.mode === "pop" || w.mode === "hammer")
        b.vy += 100 * h;
      b.x += b.vx * h;
      b.y += b.vy * h;
      let wall = false;
      if (w.mode === "pop") wall = hexWall(b, w.angle);
      else if (w.mode === "mushroom") wall = mushroomWall(b);
      else {
        const d = Math.hypot(b.x, b.y);
        if (d + b.r > 440) {
          const nx = b.x / d,
            ny = b.y / d;
          b.x = nx * (440 - b.r - 0.1);
          b.y = ny * (440 - b.r - 0.1);
          const dot = b.vx * nx + b.vy * ny;
          if (dot > 0) {
            b.vx -= 2 * dot * nx;
            b.vy -= 2 * dot * ny;
            wall = true;
          }
        }
      }
      if (w.mode === "crusher" || w.mode === "pop" || w.mode === "hammer") {
        let touched = false;
        if (w.mode === "hammer") {
          const p = hammerPose(w.time);
          const dx = b.x - p.x,
            dy = b.y - p.y,
            d = Math.hypot(dx, dy);
          if (d < b.r + 53 && d > 0.001) {
            const nx = dx / d,
              ny = dy / d;
            b.x += nx * (b.r + 54 - d);
            b.y += ny * (b.r + 54 - d);
            const relative = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
            if (relative < 0) {
              b.vx -= 1.8 * relative * nx;
              b.vy -= 1.8 * relative * ny;
            }
            touched = true;
          }
        } else if (w.mode === "crusher") {
          for (const arc of crusherArcs(w.angle)) {
            const dx = b.x - arc.x,
              dy = b.y;
            const a = Math.atan2(dy, dx);
            const relative =
              (((a - arc.start) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            if (relative > arc.span) continue;
            const d = Math.hypot(dx, dy);
            if (Math.abs(d - 205) < b.r + 9 && d > 0.01) {
              const sign = d >= 205 ? 1 : -1;
              const nx = (dx / d) * sign,
                ny = (dy / d) * sign;
              b.x += nx * (b.r + 10 - Math.abs(d - 205));
              b.y += ny * (b.r + 10 - Math.abs(d - 205));
              const dot = b.vx * nx + b.vy * ny;
              if (dot < 0) {
                b.vx -= 2 * dot * nx;
                b.vy -= 2 * dot * ny;
              }
              b.vx += nx * 40;
              b.vy += ny * 40;
              touched = true;
              break;
            }
          }
        } else
          for (const tri of spikeTriangles(w.angle)) {
            if (triangleContact(b, tri)) {
              touched = true;
              break;
            }
          }
        if (touched && b.cool <= 0 && w.balls.length < w.cap) {
          b.cool = 0.35;
          b.hue = (b.hue + 137.5) % 360;
          const child = w.add(b.x, b.y, -b.vy, b.vx);
          child.cool = 0.35;
          if (w.mode === "hammer")
            for (let j = 0; j < 2 && w.balls.length < w.cap; j++) {
              const a = w.random() * Math.PI * 2;
              const c = w.add(
                b.x + Math.cos(a) * 35,
                b.y + Math.sin(a) * 35,
                Math.cos(a) * 230,
                Math.sin(a) * 230,
              );
              c.r = b.r;
              c.cool = 0.4;
              c.hue = w.random() * 360;
            }
          child.r = b.r;
          child.hue = (b.hue + 90) % 360;
          const speed = Math.max(180, Math.hypot(b.vx, b.vy));
          const a = Math.atan2(b.vy, b.vx);
          child.x += Math.cos(a + Math.PI / 2) * (b.r * 2 + 1);
          child.y += Math.sin(a + Math.PI / 2) * (b.r * 2 + 1);
          child.vx = Math.cos(a + 0.8) * speed;
          child.vy = Math.sin(a + 0.8) * speed;
          b.vx = Math.cos(a - 0.8) * speed;
          b.vy = Math.sin(a - 0.8) * speed;
          for (let k = 0; k < 18 && w.sparks.length < 700; k++) {
            const a = (k * Math.PI * 2) / 18;
            w.sparks.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(a) * 140,
              vy: Math.sin(a) * 140,
              hue: b.hue,
              life: 1.3,
            });
          }
          events.push({ id: b.id, kind: "split" });
          w.hits++;
        }
      }
      if (wall) {
        w.hits++;
        events.push({ id: b.id, kind: "hit" });
      }
    }
    // Broad-phase grid keeps thousands of balls from requiring N² pair tests.
    const cell = Math.max(10, 2 * Math.max(...w.balls.map((b) => b.r)));
    const grid = new Map<string, Ball[]>();
    for (const b of [...w.balls]) {
      const gx = Math.floor(b.x / cell),
        gy = Math.floor(b.y / cell);
      for (let xx = gx - 1; xx <= gx + 1; xx++)
        for (let yy = gy - 1; yy <= gy + 1; yy++)
          for (const a of grid.get(`${xx},${yy}`) || []) {
            const dx = b.x - a.x,
              dy = b.y - a.y,
              d = Math.hypot(dx, dy),
              sum = a.r + b.r;
            if (d >= sum || d < 0.00001) continue;
            const nx = dx / d,
              ny = dy / d,
              over = (sum - d) / 2;
            a.x -= nx * over;
            a.y -= ny * over;
            b.x += nx * over;
            b.y += ny * over;
            const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (approach <= 0) continue;
            a.vx -= approach * nx;
            a.vy -= approach * ny;
            b.vx += approach * nx;
            b.vy += approach * ny;
            w.hits++;
            events.push({ id: b.id, kind: "hit" });
            if (
              !["mandala", "crusher", "pop", "hammer", "vortex"].includes(
                w.mode,
              ) &&
              a.cool <= 0 &&
              b.cool <= 0 &&
              w.balls.length < w.cap
            ) {
              a.cool = b.cool = 0.12;
              const copies = w.mode === "bloom" ? 2 : 1;
              for (let j = 0; j < copies && w.balls.length < w.cap; j++) {
                const origin = j ? a : b;
                const side = j ? -1 : 1;
                const child = w.add(
                  origin.x + ny * sum * 0.4 * side,
                  origin.y - nx * sum * 0.4 * side,
                  -origin.vy * side,
                  origin.vx * side,
                );
                child.cool = 0.15;
                child.r = origin.r;
                child.hue = (w.balls.length * 137.5) % 360;
              }
              events.push({ id: b.id, kind: "split" });
            }
          }
      const key = `${gx},${gy}`;
      const bucket = grid.get(key) || [];
      bucket.push(b);
      grid.set(key, bucket);
    }
    const total = w.balls.length;
    for (const b of w.balls) {
      if (w.mode === "bloom") {
        b.r = Math.max(4, 110 / Math.sqrt(total));
        b.hue = (w.time * 32 + b.id * 9) % 360;
      } else if (w.mode !== "mandala" && w.mode !== "vortex")
        b.r = Math.max(5, Math.min(12, 280 / Math.sqrt(total)));
      const speed = Math.hypot(b.vx, b.vy);
      const max = total > 1000 ? 340 : 650;
      if (speed > max) {
        b.vx *= max / speed;
        b.vy *= max / speed;
      }
      // Project contact corrections and newborns back into the playable shape.
      if (w.mode === "pop") hexWall(b, w.angle);
      else if (w.mode === "mushroom") mushroomWall(b);
      else {
        const d = Math.hypot(b.x, b.y);
        if (d + b.r > 440) {
          b.x *= (440 - b.r - 0.1) / d;
          b.y *= (440 - b.r - 0.1) / d;
        }
      }
    }
    if (total >= w.cap) {
      w.outcome = w.loop ? "CAPACITY REACHED · NEXT CYCLE" : "ARENA FILLED";
      w.hold = 2;
      events.push({ id: 0, kind: "win" });
      break;
    }
  }
  for (const p of w.sparks) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 180 * dt;
  }
  w.sparks = w.sparks.filter((p) => p.life > 0);
  for (const b of w.balls) {
    b.trail.push({ x: b.x, y: b.y });
    const n = w.mode === "mandala" ? 420 : w.mode === "vortex" ? 30 : 3;
    if (b.trail.length > n) b.trail.shift();
  }
  return events;
}

export function hexVertices(angle: number): Point[] {
  return Array.from({ length: 6 }, (_, i) => ({
    x: Math.cos(angle + (i * Math.PI) / 3 - Math.PI / 6) * 440,
    y: Math.sin(angle + (i * Math.PI) / 3 - Math.PI / 6) * 440,
  }));
}
export function hexWall(b: Ball, angle: number) {
  let hit = false;
  for (let i = 0; i < 6; i++) {
    const a = angle + (i * Math.PI) / 3,
      nx = Math.cos(a),
      ny = Math.sin(a),
      distance = b.x * nx + b.y * ny,
      plane = 440 * Math.cos(Math.PI / 6) - b.r;
    if (distance > plane) {
      b.x -= (distance - plane + 0.1) * nx;
      b.y -= (distance - plane + 0.1) * ny;
      const relative = b.vx * nx + b.vy * ny - 0.25 * (-b.y * nx + b.x * ny);
      if (relative > 0) {
        b.vx -= 2 * relative * nx;
        b.vy -= 2 * relative * ny;
        hit = true;
      }
    }
  }
  return hit;
}
export function crusherArcs(angle: number) {
  return [-175, 175].flatMap((x, i) =>
    [0, Math.PI].map((a) => ({
      x,
      start: (i ? -angle : angle) + a - 0.95,
      span: 1.9,
    })),
  );
}
export function spikeTriangles(angle: number): Point[][] {
  return [0, Math.PI].map((offset) => {
    const a = angle + offset,
      nx = Math.cos(a),
      ny = Math.sin(a),
      r = 440 * Math.cos(Math.PI / 6);
    return [
      { x: nx * r - ny * 17, y: ny * r + nx * 17 },
      { x: nx * (r - 48), y: ny * (r - 48) },
      { x: nx * r + ny * 17, y: ny * r - nx * 17 },
    ];
  });
}
function triangleContact(b: Ball, tri: Point[]) {
  for (let i = 0; i < 3; i++) {
    const a = tri[i],
      z = tri[(i + 1) % 3],
      dx = z.x - a.x,
      dy = z.y - a.y,
      l = dx * dx + dy * dy,
      t = Math.max(0, Math.min(1, ((b.x - a.x) * dx + (b.y - a.y) * dy) / l));
    const px = a.x + t * dx,
      py = a.y + t * dy,
      d = Math.hypot(b.x - px, b.y - py);
    if (d < b.r + 1) {
      const nx = (b.x - px) / Math.max(0.001, d),
        ny = (b.y - py) / Math.max(0.001, d);
      b.x += nx * (b.r + 1 - d);
      b.y += ny * (b.r + 1 - d);
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx -= 2 * dot * nx;
        b.vy -= 2 * dot * ny;
      }
      return true;
    }
  }
  return false;
}

export function hammerPose(t: number) {
  const a = Math.sin(t * 1.7) * 1.0,
    rate = Math.cos(t * 1.7) * 1.7;
  return {
    x: Math.sin(a) * 420,
    y: -260 + Math.cos(a) * 420,
    angle: a,
    vx: Math.cos(a) * 420 * rate,
    vy: -Math.sin(a) * 420 * rate,
  };
}
