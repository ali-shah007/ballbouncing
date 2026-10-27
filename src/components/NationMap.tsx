"use client";
import { useEffect, useRef } from "react";
import { BUILDINGS, Building, NationSave, nationStats } from "@/lib/nation";
export type Country = {
  type: string;
  properties: { name: string; code: string };
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
};
export function mainland(country: Country): number[][] {
  const polygons =
    country.geometry.type === "Polygon"
      ? [country.geometry.coordinates as number[][][]]
      : (country.geometry.coordinates as number[][][][]);
  return polygons.map((p) => p[0]).sort((a, b) => area(b) - area(a))[0] || [];
}
function area(p: number[][]) {
  return Math.abs(
    p.reduce((n, v, i) => {
      const q = p[(i + 1) % p.length];
      return n + v[0] * q[1] - q[0] * v[1];
    }, 0),
  );
}
function inside(x: number, y: number, poly: number[][]) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      yes = !yes;
  }
  return yes;
}
export default function NationMap({
  country,
  save,
  zoom,
  onSelect,
  onCanvas,
}: {
  country: Country;
  save: NationSave;
  zoom: number;
  onSelect: (id: number) => void;
  onCanvas: (c: HTMLCanvasElement) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    latest = useRef({ save, zoom, onSelect }),
    sites = useRef<{ x: number; y: number }[]>([]);
  latest.current = { save, zoom, onSelect };
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    onCanvas(canvas);
    let frame = 0;
    const started = performance.now(),
      poly = mainland(country);
    const xs = poly.map((p) => p[0]),
      ys = poly.map((p) => p[1]);
    const bounds = {
      left: Math.min(...xs),
      right: Math.max(...xs),
      bottom: Math.min(...ys),
      top: Math.max(...ys),
    };
    const worldSites: number[][] = [];
    for (let row = 0; row < 32; row++)
      for (let col = 0; col < 32; col++) {
        const x =
            bounds.left + ((col + 0.5) / 32) * (bounds.right - bounds.left),
          y = bounds.bottom + ((row + 0.5) / 32) * (bounds.top - bounds.bottom);
        if (inside(x, y, poly)) worldSites.push([x, y]);
      }
    const chosen = Array.from(
      { length: 32 },
      (_, i) =>
        worldSites[Math.floor(((i + 0.5) / 32) * worldSites.length)] || poly[0],
    );
    const draw = (now: number) => {
      const p = latest.current,
        s = p.save,
        stats = nationStats(s),
        t = now / 1000,
        W = 1600,
        H = 1000;
      const arrival = Math.min(1, (now - started) / 1800),
        ease = 1 - Math.pow(1 - arrival, 3),
        spanX = bounds.right - bounds.left,
        spanY = bounds.top - bounds.bottom,
        cos = Math.max(
          0.35,
          Math.cos((((bounds.top + bounds.bottom) / 2) * Math.PI) / 180),
        );
      const scale =
        Math.min(
          1100 / Math.max(0.001, spanX * cos),
          650 / Math.max(0.001, spanY),
        ) *
        (0.5 + ease * 0.5) *
        p.zoom;
      const project = (v: number[]) => ({
        x: 800 + (v[0] - (bounds.left + bounds.right) / 2) * cos * scale,
        y: 490 - (v[1] - (bounds.top + bounds.bottom) / 2) * scale * 0.82,
      });
      const outline = poly.map(project);
      sites.current = chosen.map(project);
      ctx.fillStyle = "#e9f0ef";
      ctx.fillRect(0, 0, W, H);
      const water = ctx.createLinearGradient(0, 0, W, H);
      water.addColorStop(0, "#cbdfe1");
      water.addColorStop(0.6, "#e4eeee");
      water.addColorStop(1, "#c0d5d8");
      ctx.fillStyle = water;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#8daeb522";
      ctx.lineWidth = 1;
      for (let x = -100; x < W; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 200, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 56) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      const path = (offset = 0) => {
        ctx.beginPath();
        outline.forEach((v, i) => {
          if (!i) ctx.moveTo(v.x, v.y + offset);
          else ctx.lineTo(v.x, v.y + offset);
        });
        ctx.closePath();
      };
      ctx.shadowColor = "#345d6140";
      ctx.shadowBlur = 45;
      ctx.shadowOffsetY = 25;
      path(14);
      ctx.fillStyle = "#97afa2";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      path();
      const land = ctx.createLinearGradient(200, 100, 1300, 800);
      land.addColorStop(0, "#d7ddbb");
      land.addColorStop(0.5, "#bfcca6");
      land.addColorStop(1, "#a4bca0");
      ctx.fillStyle = land;
      ctx.fill();
      ctx.strokeStyle = "#eef4de";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.save();
      path();
      ctx.clip();
      for (let i = 0; i < 140; i++) {
        const x = (Math.sin(i * 234.7) * 0.5 + 0.5) * W,
          y = (Math.cos(i * 168.3) * 0.5 + 0.5) * H;
        ctx.fillStyle = i % 3 ? "#748f6616" : "#ffffff15";
        ctx.beginPath();
        ctx.ellipse(x, y, 35 + (i % 60), 10 + (i % 20), -0.4, 0, 7);
        ctx.fill();
      }
      const capital =
        sites.current[
          s.buildings.find((b) => b.type === "housing")?.slot ?? 12
        ];
      if (capital)
        for (const b of s.buildings) {
          const pos = sites.current[b.slot];
          ctx.strokeStyle = b.type === "road" ? "#f8f2da" : "#e9e6cf";
          ctx.lineWidth = 4 + Math.min(4, stats.transport * 4);
          ctx.beginPath();
          ctx.moveTo(capital.x, capital.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
          ctx.strokeStyle = "#a5aa92";
          ctx.lineWidth = 1;
          ctx.stroke();
          const travel = (t * 0.055 + b.slot * 0.11) % 1;
          ctx.fillStyle = b.type === "port" ? "#4d8598" : "#f5f5e5";
          ctx.fillRect(
            capital.x + (pos.x - capital.x) * travel - 3,
            capital.y + (pos.y - capital.y) * travel - 2,
            8,
            4,
          );
        }
      ctx.restore();
      const tree = (x: number, y: number, size: number) => {
        ctx.fillStyle = "#71816b";
        ctx.fillRect(x - 1, y, size * 0.12, size * 0.5);
        ctx.fillStyle = "#5f8d71";
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.55, y + size * 0.1);
        ctx.lineTo(x - size * 0.55, y + size * 0.1);
        ctx.fill();
        ctx.fillStyle = "#78a27f";
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y);
        ctx.lineTo(x - size * 0.55, y + size * 0.1);
        ctx.fill();
      };
      const house = (x: number, y: number, height: number, color: string) => {
        ctx.fillStyle = "#44645820";
        ctx.beginPath();
        ctx.ellipse(x + 10, y + 8, 19, 6, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillRect(x - 12, y - height, 24, height);
        ctx.fillStyle = "#8b9b85";
        ctx.beginPath();
        ctx.moveTo(x + 12, y - height);
        ctx.lineTo(x + 21, y - height - 7);
        ctx.lineTo(x + 21, y - 7);
        ctx.lineTo(x + 12, y);
        ctx.fill();
        ctx.fillStyle = "#f1eddc";
        ctx.beginPath();
        ctx.moveTo(x - 12, y - height);
        ctx.lineTo(x - 3, y - height - 7);
        ctx.lineTo(x + 21, y - height - 7);
        ctx.lineTo(x + 12, y - height);
        ctx.fill();
        for (let f = 0; f < height / 12; f++) {
          ctx.fillStyle = Math.sin(t * 0.2) > -0.5 ? "#ffe7ac" : "#87a7a4";
          ctx.fillRect(x - 7, y - height + 5 + f * 12, 4, 5);
          ctx.fillRect(x + 2, y - height + 5 + f * 12, 4, 5);
        }
      };
      for (const b of [...s.buildings].sort(
        (a, b) => sites.current[a.slot].y - sites.current[b.slot].y,
      )) {
        const pos = sites.current[b.slot];
        if (!pos) continue;
        const level = b.remaining
          ? Math.max(0.2, b.target * (1 - b.remaining / b.total))
          : b.level;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        const completion = b.remaining ? 1 - b.remaining / b.total : 1;
        ctx.globalAlpha = b.remaining ? 0.5 + 0.5 * completion : 1;
        if (b.type === "forest") {
          for (let j = 0; j < 5 + level * 3; j++)
            tree(Math.sin(j * 12) * 25, Math.cos(j * 7) * 16, 14 + level * 2);
        } else if (b.type === "farm") {
          for (let j = 0; j < 5; j++) {
            ctx.fillStyle = j % 2 ? "#c7bf78" : "#99b477";
            ctx.beginPath();
            ctx.ellipse(0, j * 6 - 14, 31, 6, -0.2, 0, 7);
            ctx.fill();
          }
          house(20, -10, 14, "#dbba90");
        } else if (b.type === "solar") {
          for (let j = 0; j < 3 + level; j++) {
            ctx.fillStyle = "#466e82";
            ctx.fillRect(
              -22 + (j % 3) * 19,
              -8 + Math.floor(j / 3) * 14,
              16,
              10,
            );
            ctx.strokeStyle = "#a5cfdf";
            ctx.lineWidth = 0.7;
            ctx.strokeRect(
              -22 + (j % 3) * 19,
              -8 + Math.floor(j / 3) * 14,
              16,
              10,
            );
          }
          ctx.fillStyle = "#dbedf380";
          ctx.fillRect(-20 + Math.sin(t) * 3, -7, 3, 8);
        } else if (b.type === "road") {
          ctx.fillStyle = "#a0a69a";
          ctx.fillRect(-28, -4, 56, 18);
          house(0, -3, 13, "#c7c9b6");
        } else {
          const color = BUILDINGS[b.type].color;
          house(-12, 7, 16 + level * 11, color);
          if (level >= 2) house(20, -7, 12 + level * 8, color);
          if (b.type === "factory") {
            house(15, -3, 30, "#c1b1a0");
            for (let j = 0; j < 3; j++) {
              ctx.fillStyle = `rgba(146,145,131,${0.1 + stats.pollution / 500})`;
              ctx.beginPath();
              ctx.arc(
                23 + Math.sin(t + j) * 5,
                -40 - ((t * 12 + j * 15) % 40),
                7 + j * 2,
                0,
                7,
              );
              ctx.fill();
            }
          }
          if (b.type === "hospital") {
            ctx.fillStyle = "#f3f1e8";
            ctx.fillRect(-18, -25, 12, 4);
            ctx.fillRect(-14, -29, 4, 12);
          }
          if (b.type === "school") {
            ctx.fillStyle = "#8a78a0";
            ctx.fillRect(1, -40, 2, 23);
            ctx.fillStyle = "#d6bf88";
            ctx.fillRect(3, -40, 12, 7);
          }
        }
        if (b.remaining) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#a78d60";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-30, 8);
          ctx.lineTo(-30, -60);
          ctx.lineTo(30, -60);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(12, -60);
          ctx.lineTo(12, -30 + Math.sin(t) * 4);
          ctx.stroke();
          ctx.fillStyle = "#fff9e9";
          ctx.fillRect(-27, 18, 54, 5);
          ctx.fillStyle = "#9baf78";
          ctx.fillRect(-27, 18, 54 * completion, 5);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = "center";
        ctx.font = "11px Arial";
        ctx.fillStyle = "#3a5549";
        ctx.fillText(b.remaining ? "BUILDING…" : `Lv.${b.level}`, 0, 37);
        ctx.restore();
      }
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "#ffffff35";
        ctx.beginPath();
        ctx.ellipse(
          ((t * 9 + i * 370) % 1900) - 150,
          120 + i * 140,
          90,
          13,
          -0.1,
          0,
          7,
        );
        ctx.fill();
      }
      if (stats.exports > 0) {
        ctx.strokeStyle = "#779eb3aa";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 8]);
        ctx.beginPath();
        ctx.moveTo(1200, 650);
        ctx.quadraticCurveTo(1500, 450, 1600, 700);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#527d91";
        const f = (t * 0.08) % 1;
        ctx.fillRect(1200 + 400 * f, 650 - 200 * Math.sin(f * Math.PI), 20, 7);
      }
      ctx.textAlign = "left";
      ctx.fillStyle = "#526e68";
      ctx.font = "11px Arial";
      ctx.fillText("NATION RISE  /  LIVE DEVELOPMENT MAP", 50, 48);
      ctx.font = "34px Georgia";
      ctx.fillStyle = "#304d47";
      ctx.fillText(country.properties.name, 50, 96);
      ctx.font = "12px Arial";
      ctx.fillStyle = "#6b847b";
      ctx.fillText("A little investment. A lasting difference.", 50, 122);
      ctx.textAlign = "right";
      ctx.fillStyle = "#304d47";
      ctx.font = "24px Arial";
      ctx.fillText(
        `◈ ${Math.floor(s.cash).toLocaleString()} credits`,
        1550,
        62,
      );
      ctx.font = "12px Arial";
      ctx.fillText(
        `${Math.floor(s.population).toLocaleString()} residents  ·  ${Math.round(stats.happiness)}% happiness`,
        1550,
        90,
      );
      ctx.fillStyle = "#f7faf1ed";
      ctx.fillRect(220, 880, 1160, 79);
      ctx.textAlign = "center";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#526d58";
      ctx.fillText(
        s.events[0]?.text || "Your next chapter starts here.",
        800,
        909,
        1110,
      );
      ctx.font = "11px Arial";
      ctx.fillStyle = "#8a9b85";
      ctx.fillText(
        `FOOD ${Math.round(stats.food)}  ·  POWER ${Math.round(stats.power)}  ·  JOBS ${Math.round(stats.employment)}%  ·  NET INCOME ${Math.round(stats.net)}/MIN`,
        800,
        938,
      );
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [country, onCanvas]);
  return (
    <canvas
      ref={ref}
      width={1600}
      height={1000}
      className="nation-map-canvas"
      aria-label={`Animated development map of ${country.properties.name}`}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect(),
          scale = Math.min(rect.width / 1600, rect.height / 1000),
          x = (e.clientX - rect.left - (rect.width - 1600 * scale) / 2) / scale,
          y = (e.clientY - rect.top - (rect.height - 1000 * scale) / 2) / scale;
        const b = latest.current.save.buildings
          .map((b) => ({
            b,
            d: Math.hypot(
              sites.current[b.slot]?.x - x,
              sites.current[b.slot]?.y - y,
            ),
          }))
          .sort((a, b) => a.d - b.d)[0];
        if (b && b.d < 65) latest.current.onSelect(b.b.id);
      }}
    />
  );
}
