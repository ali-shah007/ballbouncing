import { World } from "./physics";
import {
  MUSHROOM,
  hexVertices,
  crusherArcs,
  spikeTriangles,
} from "./reference";
export function renderReference(
  c: CanvasRenderingContext2D,
  w: World,
  title: string,
  brand: string,
) {
  c.fillStyle =
    w.mode === "mushroom" || w.mode === "gravity" ? "#050505" : "#030814";
  c.fillRect(0, 0, 1080, 1920);
  function text(s: string, y: number, size: number, color = "#fff") {
    c.textAlign = "center";
    c.font = `800 ${size}px Arial`;
    c.fillStyle = color;
    c.fillText(s, 540, y, 970);
  }
  if (w.mode === "bloom") {
    text(
      w.balls.length.toLocaleString("en-US"),
      405,
      138,
      w.outcome ? "#ffd95a" : "#fff",
    );
    text(title || "Every collision splits both balls.", 475, 28, "#b0b5c2");
  } else {
    const head =
      title ||
      (w.mode === "mandala"
        ? "Collision mandalas"
        : w.mode === "mushroom"
          ? "EVERY BALL COLLISION"
          : w.mode === "crusher"
            ? "EVERY CRUSH SPLITS A BALL IN TWO"
            : w.mode === "pop"
              ? "EVERY POP BALL DOUBLES"
              : "COLLISIONS CREATE MORE BALLS");
    const words = head.split(/\s+/);
    let row = "",
      y = 280;
    c.font = "800 48px Arial";
    for (const word of words) {
      if (c.measureText(row + " " + word).width > 920) {
        text(row, y, 48);
        row = word;
        y += 60;
      } else row = (row + " " + word).trim();
    }
    text(row, y, 48);
    if (w.mode === "mushroom" && !title) text("MAKES ANOTHER BALL", y + 62, 48);
    text(
      `BALLS: ${w.balls.length.toLocaleString("en-US")}`,
      w.mode === "mushroom" ? 455 : 410,
      36,
      "#fff",
    );
  }
  c.save();
  c.translate(540, 1000);
  c.lineWidth = w.mode === "gravity" ? 2 : 4;
  c.strokeStyle = w.mode === "mandala" ? "#a4ffff" : "#eef6ff";
  c.shadowColor = c.strokeStyle;
  c.shadowBlur = w.mode === "mandala" ? 15 : 0;
  c.beginPath();
  if (w.mode === "pop") {
    hexVertices(w.angle).forEach((p, i) =>
      i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y),
    );
    c.closePath();
  } else if (w.mode === "mushroom") {
    MUSHROOM.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
  } else c.arc(0, 0, 440, 0, Math.PI * 2);
  c.stroke();
  c.shadowBlur = 0;
  if (w.mode === "crusher")
    for (const arc of crusherArcs(w.angle)) {
      c.beginPath();
      c.arc(arc.x, 0, 205, arc.start, arc.start + arc.span);
      c.strokeStyle = arc.x < 0 ? "#9ebcff" : "#ffc4a3";
      c.lineWidth = 15;
      c.lineCap = "round";
      c.shadowColor = c.strokeStyle;
      c.shadowBlur = 10;
      c.stroke();
    }
  c.shadowBlur = 0;
  if (w.mode === "pop")
    for (const tri of spikeTriangles(w.angle)) {
      c.beginPath();
      tri.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.closePath();
      c.fillStyle = "#ff264d";
      c.fill();
    }
  for (const p of w.sparks) {
    c.fillStyle = `hsla(${p.hue} 100% 75% / ${Math.min(1, p.life)})`;
    c.fillRect(p.x, p.y, 3, 3);
  }

  for (const b of w.balls) {
    if (w.mode === "mandala" && b.trail.length > 1) {
      c.lineWidth = 3;
      c.strokeStyle = `hsla(${b.hue} 100% 75% / .8)`;
      c.beginPath();
      b.trail.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.stroke();
    }
    const colour = `hsl(${b.hue} 85% 64%)`;
    if (w.mode === "bloom" && w.balls.length < 700) {
      const g = c.createRadialGradient(
        b.x - b.r * 0.32,
        b.y - b.r * 0.35,
        1,
        b.x,
        b.y,
        b.r,
      );
      g.addColorStop(0, "#f7f8ff");
      g.addColorStop(0.18, `hsl(${b.hue} 70% 88%)`);
      g.addColorStop(0.45, colour);
      g.addColorStop(1, `hsl(${b.hue} 80% 38%)`);
      c.fillStyle = g;
    } else c.fillStyle = colour;
    c.beginPath();
    c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    c.fill();
    if (w.mode === "bloom" && w.balls.length < 300) {
      c.strokeStyle = `hsla(${b.hue} 100% 90% / .8)`;
      c.lineWidth = 1.5;
      c.stroke();
    }
    if (w.mode === "mandala") {
      c.strokeStyle = "#ffffff90";
      c.lineWidth = 2;
      c.stroke();
    }
  }
  c.restore();
  if (w.mode === "gravity" || w.mode === "crusher" || w.mode === "pop")
    text(`Total Balls: ${w.balls.length}`, 1505, 30);
  if (w.outcome) text("CAPACITY REACHED", 1570, 38, "#ffda76");
  text(brand || "", 1655, 22, "#777d8b");
}
