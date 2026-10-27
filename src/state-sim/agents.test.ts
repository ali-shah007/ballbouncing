import { describe, it, expect } from "vitest";
import { agentFor, loanEligibility, priceLoan } from "./agents";
import {
  acceptDeal,
  codes,
  createWorld,
  forecast,
  key,
  money,
  nextMonth,
} from "./model";
import { meet } from "./diplomacy";
import { audit, settle } from "./ledger";
import { validWorld } from "./persistence";
describe("fictional negotiation agents", () => {
  it("assigns distinct personalities reproducibly, with variation across seeds rather than fixed national stereotypes", () => {
    const a = createWorld("NPL", 2023),
      b = createWorld("NPL", 2024);
    const partners = codes.filter((c) => c !== "NPL");
    expect(new Set(partners.map((p) => agentFor(a, p).style)).size).toBe(4);
    expect(agentFor(a, "USA")).toEqual(
      agentFor(createWorld("NPL", 2023), "USA"),
    );
    expect(agentFor(a, "USA").style).not.toBe(agentFor(b, "USA").style);
  });
  it("calculates declining-balance interest and pricing components, with no USD self-FX risk", () => {
    const w = createWorld("NPL"),
      p = priceLoan(w, "DEU", 1, 36);
    let interest = 0;
    for (let i = 0; i < 36; i++) interest += ((1 - i / 36) * p.rate) / 12;
    expect(p.totalInterestUSD).toBeCloseTo(interest, 12);
    expect(p.rate).toBeCloseTo(
      Math.min(
        0.25,
        Math.max(
          0.02,
          p.funding +
            p.lossSpread +
            p.liquidity +
            p.personality +
            p.relationship,
        ),
      ),
      12,
    );
    expect(p.firstPaymentUSD).toBeCloseTo(1 / 36 + p.rate / 12, 12);
    expect(p.stressPaymentLocal).toBeCloseTo(
      p.firstPaymentUSD * w.countries.NPL.fx * 1.2,
      10,
    );
    const us = createWorld("USA");
    const q = priceLoan(us, "DEU", 1, 36);
    expect(q.stressPaymentLocal).toBe(q.firstPaymentUSD);
  });
  it("records patronage outlays visibly, deducts them from loan proceeds, and lowers trust without creating cash", () => {
    const w = createWorld("NPL"),
      partner = codes.find(
        (c) => c !== "NPL" && agentFor(w, c).style === "patronage",
      )!;
    meet(w, partner, "Loan 1 billion USD for 36 months");
    const d = w.deals.at(-1)!;
    expect(d.feeUSD).toBeGreaterThan(0);
    const balance = money(w, "NPL", "treasury");
    expect(acceptDeal(w, d.id)).toBe(null);
    expect(money(w, "NPL", "treasury")).toBeCloseTo(
      balance + (d.amount - d.feeUSD!) * w.countries.NPL.fx,
      5,
    );
    expect(w.countries.NPL.trust).toBe(61);
    expect(w.book.entries.some((e) => e.memo.includes("patronage"))).toBe(true);
    expect(audit(w.book)).toBe(true);
    expect(validWorld(w)).toBe(true);
  });
  it("a security-first government requires an actual defence allocation", () => {
    const w = createWorld("NPL"),
      partner = codes.find(
        (c) => c !== "NPL" && agentFor(w, c).style === "security",
      )!;
    w.countries.NPL.budget.defence = 0.01;
    expect(loanEligibility(w, partner, 0.1, 36)).toContain("2%");
    meet(w, partner, "defence pact");
    expect(w.deals).toHaveLength(0);
  });
  it("includes principal in the financing preview and preserves missed interest as an obligation", () => {
    const w = createWorld("NPL");
    const f = forecast(w, "NPL");
    expect(f.principal).toBeGreaterThan(0);
    expect(f.financing).toBeCloseTo(
      Math.max(
        0,
        f.spend +
          f.interest +
          f.principal -
          f.tax -
          money(w, "NPL", "treasury"),
      ),
      6,
    );
    const loan = w.loans.find((l) => l.borrower === "NPL")!;
    settle(
      w.book,
      [
        {
          from: key("NPL", "reserves"),
          to: "MARKET:reserves",
          bn: money(w, "NPL", "reserves"),
          memo: "Reserve depletion stress test",
        },
      ],
      0,
      "stress",
    );
    nextMonth(w);
    expect(loan.arrears).toBe(1);
    expect(loan.interestDueUSD).toBeGreaterThan(0);
    expect(loan.outstanding).toBe(loan.original);
    expect(audit(w.book)).toBe(true);
  });
});
