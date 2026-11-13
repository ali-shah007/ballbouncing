import { isReference } from "./reference";
import { renderReference } from "./reference-render";
import { MODES, World } from "./physics";
export function render(
  ctx: CanvasRenderingContext2D,
  w: World,
  title: string,
  brand: string,
) {
  if (isReference(w.mode)) {
    renderReference(ctx, w, title, brand);
    return;
  }
  const W = 1080,
    H = 1920;
  ctx.fillStyle = "#050711";
  ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(540, 1000, 80, 540, 1000, 750);
  halo.addColorStop(0, "#10172a");
  halo.addColorStop(1, "#050711");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);
  function text(t: string, y: number, size: number, color = "#fff") {
    ctx.fillStyle = color;
    ctx.font = `800 ${size}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(t, 540, y, 950);
  }
  text("ORBIT / SHORTS LAB", 180, 24, "#9baac9");
  const headline = title.trim() || MODES.find((m) => m.id === w.mode)!.hook;
  const words = headline.slice(0, 100).split(/\s+/);
  let lines: string[] = [""];
  ctx.font = "800 58px Arial";
  for (const word of words) {
    const last = lines.length - 1;
    const next = (lines[last] + " " + word).trim();
    if (ctx.measureText(next).width > 930 && lines[last]) lines.push(word);
    else lines[last] = next;
  }
  lines.slice(0, 3).forEach((l, i) => text(l, 282 + i * 70, 58));
  let sub =
    w.mode === "escape"
      ? `${Math.max(0, w.limit - w.time).toFixed(1)} SECONDS LEFT`
      : w.mode === "duel"
        ? `ROUND ${w.round} · FIRST TO ${w.target} HITS`
        : w.mode === "overflow"
          ? "EVERY SPLITTER HIT ADDS A BALL"
          : w.mode === "growth"
            ? "EVERY WALL HIT ADDS SIZE + SPEED"
            : "TWO BALLS. ONE COLLISION.";
  text(sub, 490, 27, "#b8f481");
  ctx.save();
  ctx.translate(540, 1000);
  ctx.lineWidth = 5;
  ctx.strokeStyle =
    w.mode === "escape"
      ? "#f5ff54"
      : w.mode === "collision"
        ? "#66ff8b"
        : "#d9e8ff";
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  if (w.mode === "collision") {
    for (let i = 0; i <= 7; i++) {
      const a = (i * Math.PI * 2) / 7 - Math.PI / 2 - Math.PI / 7;
      const x = Math.cos(a) * 440,
        y = Math.sin(a) * 440;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  } else if (w.mode === "escape")
    ctx.arc(0, 0, 440, w.angle + 0.19, w.angle + Math.PI * 2 - 0.19);
  else ctx.arc(0, 0, 440, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (w.mode === "overflow") {
    for (let i = 0; i < 3; i++) {
      const a = w.angle + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 355, Math.sin(a) * 355);
      ctx.strokeStyle = "#7288bb";
      ctx.lineWidth = 18;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.fillStyle = "#dbe8ff";
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, 7);
    ctx.fill();
  }
  for (const b of w.balls) {
    if (w.mode === "duel" && b.trail.length) {
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = `hsl(${b.hue} 100% 65%)`;
      ctx.lineWidth = 1;
      for (const p of b.trail) {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        const len = Math.hypot(p.x, p.y);
        ctx.lineTo(
          (p.x / Math.max(1, len)) * 438,
          (p.y / Math.max(1, len)) * 438,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    for (let j = 1; j < b.trail.length; j++) {
      const a = b.trail[j - 1],
        p = b.trail[j];
      ctx.strokeStyle = `hsla(${w.mode === "growth" ? b.hue + j * 4 : b.hue} 100% 65% / ${(j / b.trail.length) * 0.8})`;
      ctx.lineWidth = Math.max(1, (b.r * 2 * j) / b.trail.length);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.shadowColor = `hsl(${b.hue} 100% 65%)`;
    ctx.shadowBlur = 22;
    const g = ctx.createRadialGradient(
      b.x - b.r * 0.3,
      b.y - b.r * 0.3,
      0,
      b.x,
      b.y,
      b.r,
    );
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.3, `hsl(${b.hue} 100% 75%)`);
    g.addColorStop(1, `hsl(${b.hue} 90% 40%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  const detail =
    w.mode === "escape"
      ? `${w.escaped} ESCAPED / ${w.failed} TIMED OUT`
      : w.mode === "overflow"
        ? `${w.balls.length} / ${w.cap} BALLS`
        : w.mode === "growth"
          ? `RADIUS ${w.balls[0].r.toFixed(0)} · SPEED ${Math.hypot(w.balls[0].vx, w.balls[0].vy).toFixed(0)}`
          : w.mode === "duel"
            ? `GREEN ${w.balls[0].hits} : ${w.balls[1].hits} CYAN`
            : `${w.hits} WALL HITS`;
  text(
    w.outcome || detail,
    1570,
    w.outcome ? 43 : 32,
    w.outcome ? "#b8f481" : "#fff",
  );
  text(w.outcome ? detail : "WATCH WHAT HAPPENS NEXT", 1640, 24, "#a9b7d4");
  text(brand.slice(0, 45) || "ORBIT STUDIO", 1750, 24, "#7787a5");
}
