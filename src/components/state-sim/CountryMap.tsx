"use client";
import { useEffect, useState } from "react";
import { mainland, Country } from "../NationMap";
import { Code, PROFILES } from "@/state-sim/scenarios";
import type { World } from "@/state-sim/model";
export default function CountryMap({
  code,
  world,
  layer = "infrastructure",
  onLayer,
}: {
  code: Code;
  world?: World;
  layer?: "infrastructure" | "health" | "readiness";
  onLayer?: (layer: "infrastructure" | "health" | "readiness") => void;
}) {
  const [country, setCountry] = useState<Country | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/data/countries.geojson")
      .then((r) => {
        if (!r.ok) throw Error("Map unavailable");
        return r.json();
      })
      .then((data) => {
        if (live)
          setCountry(
            data.features.find((c: Country) => c.properties.code === code) ??
              null,
          );
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, [code]);
  const poly = country ? mainland(country) : [];
  const minX = Math.min(...poly.map((p) => p[0])),
    maxX = Math.max(...poly.map((p) => p[0])),
    minY = Math.min(...poly.map((p) => p[1])),
    maxY = Math.max(...poly.map((p) => p[1]));
  const width = maxX - minX,
    height = maxY - minY,
    scale = Math.min(540 / width, 280 / height);
  const points = poly.map((p) => [
    350 + (p[0] - (minX + maxX) / 2) * scale,
    210 - (p[1] - (minY + maxY) / 2) * scale,
  ]);
  const path =
    points
      .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
      .join(" ") + "Z";
  const p = PROFILES[code],
    c = world?.countries[code],
    value = c?.[layer];
  return (
    <div className="ns-map">
      <div className="ns-map-heading">
        <span>
          <i /> NATIONAL OBSERVATORY
        </span>
        <span>
          {p.currency} ·{" "}
          {p.regime === "union" ? "CURRENCY UNION" : p.regime.toUpperCase()}
        </span>
      </div>
      <svg
        viewBox="0 0 700 410"
        role="img"
        aria-label={`${p.name} country outline and national ${layer} indicator`}
      >
        <defs>
          <pattern
            id={`grid-${code}`}
            width="35"
            height="35"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M35 0H0V35"
              fill="none"
              stroke="#91aaa6"
              strokeOpacity=".13"
            />
          </pattern>
          <linearGradient id={`land-${code}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#bdd0bd" />
            <stop offset="1" stopColor={p.color} />
          </linearGradient>
          <filter id={`shadow-${code}`}>
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="8"
              floodColor="#597572"
              floodOpacity=".16"
            />
          </filter>
        </defs>
        <rect width="700" height="410" fill="#e8efec" />
        <rect width="700" height="410" fill={`url(#grid-${code})`} />
        {points.length > 0 && (
          <>
            <path
              d={path}
              fill={`url(#land-${code})`}
              stroke="#f7faf5"
              strokeWidth="2"
              filter={`url(#shadow-${code})`}
            />
            <path d={path} fill="none" stroke="#759489" strokeWidth=".6" />
            {[0.25, 0.45, 0.68].map((fraction, i) => {
              const index = Math.floor(points.length * fraction),
                point = points[index];
              return (
                <g key={i}>
                  <circle
                    cx={point[0]}
                    cy={point[1]}
                    r={10 + i * 2}
                    fill="#ffffff"
                    opacity=".25"
                  />
                  <circle cx={point[0]} cy={point[1]} r="3" fill="#466e60" />
                </g>
              );
            })}
          </>
        )}
        <text x="29" y="49" fill="#516f66" fontSize="12" letterSpacing="2">
          {p.name.toUpperCase()}
        </text>
        <text x="29" y="71" fill="#91a39a" fontSize="9">
          {error
            ? "Map could not load. Reload to retry."
            : !country
              ? "Loading country outline…"
              : "Natural Earth · mainland development view"}
        </text>
        {world && (
          <>
            <text
              x="29"
              y="342"
              fill="#718a80"
              fontSize="9"
              letterSpacing="1.5"
            >
              {layer.toUpperCase()} INDEX
            </text>
            <text x="29" y="375" fill="#3f6556" fontSize="29">
              {value?.toFixed(0)}
              <tspan fontSize="12" fill="#95a99d">
                {" "}
                /100
              </tspan>
            </text>
            <text x="675" y="355" textAnchor="end" fill="#7f978c" fontSize="10">
              {world.projects.filter((p) => p.country === code).length} projects
              underway
            </text>
            <text x="675" y="377" textAnchor="end" fill="#9eafa5" fontSize="8">
              National model indicators · not provincial measurements
            </text>
          </>
        )}
      </svg>
      {onLayer && (
        <div className="ns-map-layers">
          {(["infrastructure", "health", "readiness"] as const).map((l) => (
            <button
              aria-pressed={layer === l}
              className={layer === l ? "active" : ""}
              onClick={() => onLayer(l)}
              key={l}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
