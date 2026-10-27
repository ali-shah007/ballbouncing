import { describe, it, expect } from "vitest";
import { amount, audit, Book, openAccount, settle } from "./ledger";
import {
  acceptDeal,
  codes,
  createWorld,
  debt,
  identities,
  issueDomestic,
  key,
  money,
  nextMonth,
  setBudget,
  startProject,
} from "./model";
import { meet } from "./diplomacy";
import { validWorld } from "./persistence";
import { STARTERS } from "./scenarios";
describe("cash settlement", () => {
  it("moves cash exactly, rejects cross-currency legs and rolls back an unfunded bundle", () => {
    const b: Book = { accounts: {}, opening: {}, entries: [], nextId: 1 };
    openAccount(b, "a", "USD", 10);
    openAccount(b, "b", "USD", 0);
    openAccount(b, "c", "INR", 0);
    expect(
      settle(
        b,
        [{ from: "a", to: "b", bn: 2.123456, memo: "funded" }],
        0,
        "test",
      ),
    ).toBe(true);
    expect(amount(b, "b")).toBe(2.123456);
    const before = structuredClone(b);
    expect(
      settle(
        b,
        [
          { from: "a", to: "b", bn: 1, memo: "first" },
          { from: "a", to: "b", bn: 100, memo: "unfunded" },
        ],
        1,
        "rollback",
      ),
    ).toBe(false);
    expect(b).toEqual(before);
    expect(
      settle(
        b,
        [{ from: "a", to: "c", bn: 1, memo: "wrong currency" }],
        0,
        "bad",
      ),
    ).toBe(false);
    expect(audit(b)).toBe(true);
  });
});
describe("national accounts", () => {
  for (const code of STARTERS)
    it(`${code}: closes 120 months with conserved cash, finite states and expenditure identities`, () => {
      const w = createWorld(code);
      expect(validWorld(w)).toBe(true);
      for (let i = 0; i < 120; i++) {
        nextMonth(w);
        expect(Object.values(identities(w)).every(Boolean)).toBe(true);
        for (const c of codes) {
          const r = w.reports[c].at(-1)!;
          expect(w.countries[c].gdp).toBeCloseTo(r.gdp * 12, 5);
          expect(r.gdp).toBeGreaterThan(0);
          expect(Number.isFinite(debt(w, c))).toBe(true);
        }
        expect(validWorld(w)).toBe(true);
      }
    });
  it("enforces the NPR/INR peg and USD numeraire while clearing cross-border USD balances", () => {
    const w = createWorld("NPL");
    nextMonth(w);
    expect(w.countries.NPL.fx).toBeCloseTo(w.countries.IND.fx * 1.6, 10);
    expect(w.countries.SAU.fx).toBe(3.75);
    expect(w.countries.USA.fx).toBe(1);
    const x = codes.reduce((n, c) => n + w.reports[c][0].exportsUSD, 0),
      m = codes.reduce((n, c) => n + w.reports[c][0].importsUSD, 0);
    expect(x).toBeCloseTo(m, 6);
    expect(w.book.entries.some((e) => e.group === "trade")).toBe(true);
  });
  it("a funded bond issue transfers private money and creates matching claims, not cash", () => {
    const w = createWorld("NPL"),
      initial = money(w, "NPL", "treasury"),
      liability = w.countries.NPL.domesticDebt;
    expect(issueDomestic(w, "NPL", 10)).toBe(10);
    expect(money(w, "NPL", "treasury")).toBeCloseTo(initial + 10, 5);
    expect(w.countries.NPL.domesticDebt).toBe(liability + 10);
    expect(w.countries.NPL.privateBonds).toBe(liability + 10);
    expect(audit(w.book)).toBe(true);
  });
  it("unfunded spending is constrained and unpaid interest remains a liability", () => {
    const w = createWorld("NPL");
    const a = w.book.accounts[key("NPL", "treasury")],
      b = w.book.accounts[key("NPL", "private")];
    b.units += a.units;
    a.units = 0;
    w.countries.NPL.autoBorrow = false;
    w.countries.NPL.tax = 0.05;
    setBudget(w, "defence", 0.15);
    setBudget(w, "social", 0.15);
    for (let i = 0; i < 4; i++) nextMonth(w);
    expect(w.reports.NPL.some((r) => r.shortfall > 0)).toBe(true);
    expect(audit(w.book)).toBe(true);
  });
  it("projects debit money now, enter the next expenditure account, and finish after their lead time", () => {
    const w = createWorld("IND"),
      treasury = money(w, "IND", "treasury"),
      cost = w.countries.IND.gdp * 0.004;
    expect(startProject(w, "grid")).toBe(null);
    expect(money(w, "IND", "treasury")).toBeCloseTo(treasury - cost, 5);
    nextMonth(w);
    expect(w.reports.IND[0].g).toBeGreaterThan(cost);
    for (let i = 0; i < 4; i++) nextMonth(w);
    expect(w.projects).toHaveLength(1);
    nextMonth(w);
    expect(w.projects).toHaveLength(0);
    expect(w.events.some((e) => e.text.includes("project completed"))).toBe(
      true,
    );
    expect(Object.values(identities(w)).every(Boolean)).toBe(true);
  });
  it("budget allocations reject impossible shares and leave prior policy unchanged", () => {
    const w = createWorld("USA");
    expect(setBudget(w, "defence", 0.8)).toContain("between");
    expect(w.countries.USA.budget.defence).toBe(0.025);
  });
});
describe("state-bound diplomacy", () => {
  it("talk creates no cash; accepting a loan settles actual funds, then repayments reduce principal", () => {
    const w = createWorld("NPL"),
      before = structuredClone(w.book.accounts);
    expect(
      meet(w, "IMF", "Can you offer a 1 billion USD loan over 36 months?"),
    ).toBe(null);
    expect(w.book.accounts).toEqual(before);
    const d = w.deals.at(-1)!;
    expect(d.kind).toBe("loan");
    expect(acceptDeal(w, d.id)).toBe(null);
    expect(money(w, "NPL", "treasury")).toBeGreaterThan(
      before[key("NPL", "treasury")].units / 1e6,
    );
    const l = w.loans.at(-1)!;
    nextMonth(w);
    expect(l.outstanding).toBeLessThan(1);
    expect(acceptDeal(w, d.id)).toContain("no longer");
    expect(validWorld(w)).toBe(true);
  });
  it("revalidates IMF conditions at signature and preserves accounts on rejection", () => {
    const w = createWorld("NPL");
    meet(w, "IMF", "loan 1 billion");
    w.countries.NPL.tax = 0.1;
    const before = structuredClone(w.book);
    expect(acceptDeal(w, w.deals.at(-1)!.id)).toContain("conditions");
    expect(w.book).toEqual(before);
  });
  it("pacts require an explicit signature and update both governments", () => {
    const w = createWorld("IND");
    meet(w, "USA", "Can we negotiate a defence pact?");
    expect(w.countries.IND.pacts).toHaveLength(0);
    expect(acceptDeal(w, w.deals.at(-1)!.id)).toBe(null);
    expect(w.countries.IND.pacts).toContain("USA");
    expect(w.countries.USA.pacts).toContain("IND");
  });
  it("save round-trips preserve state; malformed or unbalanced imports are rejected", () => {
    const w = createWorld("USA");
    nextMonth(w);
    const round = JSON.parse(JSON.stringify(w));
    expect(validWorld(round)).toBe(true);
    round.book.accounts["USA:treasury"].units++;
    expect(validWorld(round)).toBe(false);
    expect(validWorld({})).toBe(false);
  });
});
