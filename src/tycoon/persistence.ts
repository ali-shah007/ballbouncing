import { get, set } from "idb-keyval";
import { DEFS, RESOURCES, TECHS } from "./data";
import { fresh, Save } from "./engine";
const finite = (v: unknown) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= 0 &&
  v <= Number.MAX_SAFE_INTEGER;
export function validate(value: unknown): value is Save {
  if (!value || typeof value !== "object") return false;
  const s = value as Save;
  if (
    s.version !== 2 ||
    (s.consumerDemand !== undefined && !finite(s.consumerDemand)) ||
    ![
      "money",
      "population",
      "research",
      "permits",
      "district",
      "time",
      "nextId",
      "sales",
      "deliveryCount",
      "lastSaved",
    ].every((k) => finite(s[k as keyof Save])) ||
    !Number.isInteger(s.district) ||
    s.district > 2 ||
    !Array.isArray(s.buildings) ||
    s.buildings.length > 25 ||
    !Array.isArray(s.deliveries) ||
    s.deliveries.length > 100 ||
    !Array.isArray(s.claimed) ||
    !s.claimed.every((x) => typeof x === "string") ||
    !s.tech ||
    !TECHS.every(
      (t) => Number.isInteger(s.tech[t]) && s.tech[t] >= 0 && s.tech[t] <= 5,
    ) ||
    !s.policies ||
    !["education", "health", "industry", "green", "trade"].every(
      (k) => typeof s.policies[k as keyof Save["policies"]] === "boolean",
    ) ||
    typeof s.message !== "string" ||
    s.message.length > 1000
  )
    return false;
  const inv = (i: unknown) =>
    !!i &&
    typeof i === "object" &&
    Object.entries(i).every(
      ([k, v]) =>
        RESOURCES.includes(k as (typeof RESOURCES)[number]) && finite(v),
    );
  return (
    inv(s.produced) &&
    new Set(s.buildings.map((b) => b?.id)).size === s.buildings.length &&
    new Set(s.buildings.map((b) => b?.plot)).size === s.buildings.length &&
    s.buildings.every(
      (b) =>
        b &&
        Object.hasOwn(DEFS, b.kind) &&
        [
          "id",
          "plot",
          "level",
          "build",
          "progress",
          "workers",
          "manager",
          "earned",
          "cycles",
        ].every((k) => finite(b[k as keyof typeof b])) &&
        Number.isInteger(b.plot) &&
        b.plot < 25 &&
        Number.isInteger(b.level) &&
        b.level >= 1 &&
        b.level <= 20 &&
        typeof b.running === "boolean" &&
        inv(b.inventory),
    ) &&
    s.deliveries.every(
      (t) =>
        t &&
        ["id", "from", "to", "amount", "elapsed", "duration"].every((k) =>
          finite(t[k as keyof typeof t]),
        ) &&
        t.duration >= 1 &&
        RESOURCES.includes(t.resource) &&
        s.buildings.some((b) => b.id === t.from) &&
        s.buildings.some((b) => b.id === t.to),
    )
  );
}
export function migrate(value: unknown): Save | null {
  if (validate(value)) return value;
  const s = value as Partial<Save> | null;
  if ((s?.version as number) === 1) {
    const candidate = {
      ...fresh(),
      ...s,
      version: 2,
      policies: { ...fresh().policies, ...s?.policies },
      tech: { ...fresh().tech, ...s?.tech },
    };
    return validate(candidate) ? candidate : null;
  }
  return null;
}
export async function saveGame(save: Save) {
  const previous = await get("tycoon:save");
  if (migrate(previous)) await set("tycoon:backup", previous);
  await set("tycoon:save", save);
}
export async function loadGame() {
  const value = await get("tycoon:save");
  if (value === undefined) return { save: fresh(), recovered: false };
  const save = migrate(value);
  if (save) return { save, recovered: false };
  const backup = migrate(await get("tycoon:backup"));
  return { save: backup || fresh(), recovered: true };
}
