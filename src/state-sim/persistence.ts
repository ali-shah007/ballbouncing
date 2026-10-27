import { get, set } from "idb-keyval";
import { audit } from "./ledger";
import { codes, identities, World } from "./model";
import { PROFILES, SECTORS } from "./scenarios";
const finite = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) && Math.abs(n) < 1e15;
export function validWorld(value: unknown): value is World {
  try {
    const w = value as World;
    if (
      !w ||
      w.version !== 1 ||
      !codes.includes(w.player) ||
      !Number.isInteger(w.month) ||
      w.month < 0 ||
      w.month > 1200 ||
      !finite(w.nextId) ||
      !finite(w.seed) ||
      !finite(w.energy) ||
      !finite(w.food) ||
      !finite(w.lastSaved) ||
      !w.countries ||
      !w.pending ||
      !codes.every((c) => finite(w.pending[c]) && w.pending[c] >= 0) ||
      !w.book ||
      !w.book.accounts ||
      !w.book.opening ||
      !Array.isArray(w.book.entries) ||
      w.book.entries.length > 500 ||
      !audit(w.book) ||
      !w.book.entries.every(
        (e) =>
          e &&
          typeof e.memo === "string" &&
          e.memo.length < 1000 &&
          w.book.accounts[e.from] &&
          w.book.accounts[e.to] &&
          Number.isSafeInteger(e.units) &&
          e.units >= 0 &&
          finite(e.id) &&
          finite(e.month),
      )
    )
      return false;
    const accountNames = [
      ...codes.flatMap((c) =>
        ["treasury", "private", "settlement", "reserves"].map(
          (t) => `${c}:${t}`,
        ),
      ),
      "IMF:reserves",
      "MARKET:reserves",
    ];
    if (
      Object.keys(w.book.accounts).length !== accountNames.length ||
      !accountNames.every((n) => w.book.accounts[n])
    )
      return false;
    for (const c of codes) {
      const s = w.countries[c];
      if (
        !s ||
        s.code !== c ||
        ![
          "fx",
          "gdp",
          "realCapacity",
          "population",
          "cpi",
          "inflation",
          "rate",
          "unemployment",
          "infrastructure",
          "education",
          "health",
          "readiness",
          "tax",
          "domesticDebt",
          "privateBonds",
          "domesticArrears",
        ].every((k) => finite(s[k as keyof typeof s])) ||
        s.fx <= 0 ||
        s.gdp <= 0 ||
        s.cpi <= 0 ||
        s.realCapacity <= 0 ||
        s.domesticDebt < 0 ||
        s.privateBonds < 0 ||
        s.population < 0 ||
        (s.trust !== undefined &&
          (!finite(s.trust) || s.trust < 0 || s.trust > 100)) ||
        s.tax < 0.05 ||
        s.tax > 0.4 ||
        !s.budget ||
        !SECTORS.every(
          (k) => finite(s.budget[k]) && s.budget[k] >= 0 && s.budget[k] <= 0.15,
        ) ||
        SECTORS.reduce((n, k) => n + s.budget[k], 0) > 0.600001 ||
        typeof s.autoBorrow !== "boolean" ||
        !s.relations ||
        !Array.isArray(s.pacts) ||
        !s.pacts.every((p) => codes.includes(p))
      )
        return false;
      for (const t of ["treasury", "private", "settlement"])
        if (w.book.accounts[`${c}:${t}`].currency !== PROFILES[c].currency)
          return false;
      if (w.book.accounts[`${c}:reserves`].currency !== "USD") return false;
    }
    if (
      !Array.isArray(w.loans) ||
      w.loans.length > 100 ||
      !w.loans.every(
        (l) =>
          codes.includes(l.borrower) &&
          [...codes, "IMF", "MARKET"].includes(l.lender) &&
          [
            "id",
            "original",
            "outstanding",
            "rate",
            "term",
            "remaining",
            "start",
            "arrears",
            "interestDueUSD",
          ].every((k) => finite(l[k as keyof typeof l])) &&
          l.interestDueUSD >= 0 &&
          l.outstanding >= 0 &&
          l.outstanding <= l.original + 0.000001 &&
          l.original >= 0 &&
          l.rate >= 0 &&
          l.rate <= 0.3 &&
          l.term >= 1,
      ) ||
      !Array.isArray(w.projects) ||
      w.projects.length > 30 ||
      !w.projects.every(
        (p) =>
          codes.includes(p.country) &&
          ["grid", "transport", "schools"].includes(p.kind) &&
          finite(p.remaining) &&
          p.remaining > 0 &&
          finite(p.cost) &&
          p.cost >= 0 &&
          finite(p.total) &&
          p.total >= p.remaining,
      )
    )
      return false;
    if (
      !Array.isArray(w.deals) ||
      w.deals.length > 60 ||
      !w.deals.every(
        (d) =>
          [...codes, "IMF"].includes(d.partner) &&
          ["loan", "trade", "pact"].includes(d.kind) &&
          ["id", "amount", "rate", "term", "expires"].every((k) =>
            finite(d[k as keyof typeof d]),
          ) &&
          typeof d.accepted === "boolean" &&
          typeof d.reason === "string" &&
          d.reason.length < 2000 &&
          (d.feeUSD === undefined ||
            (finite(d.feeUSD) &&
              d.feeUSD >= 0 &&
              d.feeUSD <= d.amount * 0.05)) &&
          (d.pricing === undefined ||
            (Object.values(d.pricing).every(finite) &&
              d.pricing.rate >= 0.02 &&
              d.pricing.rate <= 0.25)),
      ) ||
      !Array.isArray(w.messages) ||
      w.messages.length > 80 ||
      !w.messages.every(
        (m) =>
          [...codes, "IMF"].includes(m.partner) &&
          ["You", "Envoy"].includes(m.speaker) &&
          typeof m.text === "string" &&
          m.text.length <= 2000,
      ) ||
      !Array.isArray(w.events) ||
      w.events.length > 70 ||
      !w.events.every(
        (e) =>
          typeof e.text === "string" &&
          e.text.length < 2000 &&
          finite(e.id) &&
          finite(e.month),
      )
    )
      return false;
    if (
      !w.reports ||
      !codes.every(
        (c) =>
          Array.isArray(w.reports[c]) &&
          w.reports[c].length <= 60 &&
          w.reports[c].every((r) => Object.values(r).every(finite)),
      )
    )
      return false;
    return Object.values(identities(w)).every(Boolean);
  } catch {
    return false;
  }
}
let writing: Promise<void> = Promise.resolve();
export function saveWorld(w: World) {
  const snapshot = structuredClone(w);
  writing = writing
    .catch(() => {})
    .then(async () => {
      const previous = await get("nation-state:save");
      if (validWorld(previous)) await set("nation-state:backup", previous);
      await set("nation-state:save", snapshot);
    });
  return writing;
}
export async function loadWorld() {
  const raw = await get("nation-state:save");
  if (raw === undefined) return { world: null, recovered: false };
  if (validWorld(raw)) return { world: raw, recovered: false };
  const backup = await get("nation-state:backup");
  return { world: validWorld(backup) ? backup : null, recovered: true };
}
