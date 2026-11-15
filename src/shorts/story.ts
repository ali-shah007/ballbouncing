import { World } from "./physics";
import { isMaterial } from "./material";
export const EPISODE_SECONDS = 45;
export class Episode {
  elapsed = 0;
  finished = false;
  constructor(
    public world: World,
    public duration = EPISODE_SECONDS,
  ) {
    if (!isMaterial(world.mode)) world.loop = false;
  }
  get resultStarts() {
    return this.duration - 4;
  }
  get result() {
    const w = this.world;
    if (isMaterial(w.mode))
      return w.mode === "press"
        ? `${w.material!.crushed} BLOCKS CRUSHED`
        : w.mode === "sand"
          ? `${w.material!.crushed} GRAINS PRESSED`
          : w.mode === "slime"
            ? "FINAL SQUISH COMPLETE"
            : "JELLY RAIN COMPLETE";
    if (w.mode === "duel") {
      const [a, b] = w.balls;
      return a.hits === b.hits
        ? "THE ROUND IS A DRAW"
        : a.hits > b.hits
          ? "GREEN WINS THE ROUND"
          : "CYAN WINS THE ROUND";
    }
    if (w.mode === "collision")
      return w.round > 1 || w.outcome
        ? "THEY COLLIDED!"
        : "TIME UP · NO COLLISION";
    if (w.mode === "escape")
      return `${w.escaped} ESCAPED · ${w.failed} TIMED OUT`;
    if (w.mode === "growth") return `FINAL SIZE: ${w.balls[0].r.toFixed(0)}`;
    if (w.mode === "mandala" || w.mode === "vortex")
      return `${w.balls.length} BALLS · PATTERN COMPLETE`;
    return `${w.balls.length.toLocaleString()} BALLS · ${w.balls.length >= w.cap ? "CAPACITY REACHED" : "FINAL COUNT"}`;
  }
  step(dt: number) {
    if (this.finished) return [];
    const previous = this.elapsed;
    this.elapsed = Math.min(this.duration, this.elapsed + Math.max(0, dt));
    if (this.elapsed >= this.duration) this.finished = true;
    const motion = Math.max(
      0,
      Math.min(this.elapsed, this.resultStarts) - previous,
    );
    if (!motion) return [];
    const w = this.world;
    let rate = 1;
    // A birth remains a physical contact. Pacing varies simulation time, never the displayed count.
    if (
      [
        "bloom",
        "mushroom",
        "gravity",
        "crusher",
        "pop",
        "hammer",
        "overflow",
      ].includes(w.mode)
    ) {
      const initial = ["crusher", "pop", "hammer"].includes(w.mode) ? 1 : 2;
      const progress =
        Math.log(Math.max(initial, w.balls.length) / initial) /
        Math.log(Math.max(initial + 1, w.cap) / initial);
      const target = Math.pow(
        Math.min(1, this.elapsed / (this.resultStarts - 1)),
        1.45,
      );
      rate = Math.min(3, Math.max(0.12, 1 + (target - progress) * 8));
    } else if (w.mode === "growth") rate = 2.5;
    else if (w.mode === "duel") rate = 1.8;
    else if (w.mode === "collision") rate = 0.035;
    let remaining = Math.min(0.18, motion * rate);
    const events = [];
    while (remaining > 0 && (!w.outcome || w.mode === "escape")) {
      const h = Math.min(0.025, remaining);
      events.push(...w.step(h));
      remaining -= h;
    }
    return events;
  }
}
export function renderEnding(c: CanvasRenderingContext2D, e: Episode) {
  const remaining = Math.max(0, Math.ceil(e.duration - e.elapsed));
  c.save();
  c.textAlign = "center";
  c.font = "700 23px Arial";
  c.fillStyle = "#b9c9df";
  c.fillText(
    e.elapsed >= e.resultStarts
      ? "THE RESULT"
      : e.elapsed > e.duration - 12
        ? "THE FINAL STRETCH"
        : `45-SECOND CHALLENGE · ${remaining}s LEFT`,
    540,
    1815,
  );
  c.fillStyle = "#26364e";
  c.fillRect(90, 1840, 900, 5);
  c.fillStyle = "#b8f481";
  c.fillRect(90, 1840, (900 * e.elapsed) / e.duration, 5);
  if (e.elapsed >= e.resultStarts) {
    c.fillStyle = "#050912";
    c.beginPath();
    c.roundRect(55, 1480, 970, 270, 25);
    c.fill();
    c.strokeStyle = "#b8f481";
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = "#b8f481";
    c.font = "800 43px Arial";
    c.fillText(e.result, 540, 1590, 910);
    c.fillStyle = "#d9e6f7";
    c.font = "26px Arial";
    c.fillText("CHALLENGE COMPLETE · 45 SECONDS", 540, 1660, 920);
  }
  c.restore();
}
