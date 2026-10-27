import { amount, audit, Book, openAccount, settle, Transfer } from "./ledger";
import { agentFor, loanEligibility } from "./agents";
import {
  BASELINE,
  Code,
  DEFAULT_BUDGET,
  PROFILES,
  SECTORS,
  Sector,
} from "./scenarios";
export type CountryState = {
  code: Code;
  fx: number;
  gdp: number;
  realCapacity: number;
  population: number;
  cpi: number;
  inflation: number;
  rate: number;
  unemployment: number;
  infrastructure: number;
  education: number;
  health: number;
  readiness: number;
  tax: number;
  budget: Record<Sector, number>;
  autoBorrow: boolean;
  domesticDebt: number;
  privateBonds: number;
  domesticArrears: number;
  trust?: number;
  relations: Partial<Record<Code, number>>;
  pacts: Code[];
};
export type Report = {
  month: number;
  gdp: number;
  c: number;
  i: number;
  g: number;
  x: number;
  m: number;
  tax: number;
  spending: number;
  transfers: number;
  interest: number;
  principal: number;
  borrowed: number;
  shortfall: number;
  deficit: number;
  inflation: number;
  fx: number;
  cpi: number;
  unemployment: number;
  debt: number;
  importsUSD: number;
  exportsUSD: number;
};
export type Loan = {
  id: number;
  borrower: Code;
  lender: Code | "IMF" | "MARKET";
  original: number;
  outstanding: number;
  rate: number;
  term: number;
  remaining: number;
  start: number;
  arrears: number;
  interestDueUSD: number;
};
export type Project = {
  id: number;
  country: Code;
  kind: "grid" | "transport" | "schools";
  cost: number;
  remaining: number;
  total: number;
};
export type Deal = {
  id: number;
  kind: "loan" | "trade" | "pact";
  partner: Code | "IMF";
  amount: number;
  rate: number;
  term: number;
  expires: number;
  accepted: boolean;
  signedMonth?: number;
  feeUSD?: number;
  personality?: string;
  pricing?: import("./agents").LoanPricing;
  reason: string;
};
export type Message = {
  id: number;
  partner: Code | "IMF";
  speaker: "You" | "Envoy";
  text: string;
  month: number;
};
export type Event = {
  id: number;
  month: number;
  text: string;
  severity: "info" | "warning" | "success";
};
export type World = {
  version: 1;
  player: Code;
  month: number;
  seed: number;
  nextId: number;
  countries: Record<Code, CountryState>;
  book: Book;
  loans: Loan[];
  projects: Project[];
  deals: Deal[];
  messages: Message[];
  events: Event[];
  reports: Record<Code, Report[]>;
  energy: number;
  food: number;
  pending: Record<Code, number>;
  lastSaved: number;
};
export const codes = Object.keys(PROFILES) as Code[];
export const key = (
  c: Code,
  type: "treasury" | "private" | "settlement" | "reserves",
) => `${c}:${type}`;
export const money = (
  w: World,
  c: Code,
  type: "treasury" | "private" | "settlement" | "reserves",
) => amount(w.book, key(c, type));
export const debt = (w: World, c: Code) =>
  w.countries[c].domesticDebt +
  w.countries[c].domesticArrears +
  w.loans
    .filter((l) => l.borrower === c)
    .reduce(
      (n, l) => n + (l.outstanding + l.interestDueUSD) * w.countries[c].fx,
      0,
    );
export const coverage = (w: World, c: Code) =>
  c === "USA"
    ? Infinity
    : money(w, c, "reserves") /
      Math.max(
        0.01,
        ((w.countries[c].gdp / w.countries[c].fx) * PROFILES[c].imports) / 12,
      );
export function event(
  w: World,
  text: string,
  severity: Event["severity"] = "info",
) {
  w.events.unshift({ id: w.nextId++, month: w.month, text, severity });
  w.events = w.events.slice(0, 70);
}
export function createWorld(player: Code, seed = 2023): World {
  const book: Book = { accounts: {}, opening: {}, entries: [], nextId: 1 };
  const countries = {} as World["countries"],
    reports = {} as World["reports"];
  const loans: Loan[] = [];
  let nextId = 1;
  for (const code of codes) {
    const p = PROFILES[code],
      gdp = (BASELINE[code].gdpUSD / 1e9) * p.fx,
      externalUSD = (gdp * p.debt * p.foreignShare) / p.fx,
      domestic = gdp * p.debt * (1 - p.foreignShare);
    countries[code] = {
      code,
      fx: p.fx,
      gdp,
      realCapacity: 1,
      population: BASELINE[code].population,
      cpi: 1,
      inflation: p.inflation,
      rate: p.rate,
      unemployment: code === "NPL" ? 10 : code === "IND" ? 7 : 4.5,
      infrastructure: code === "NPL" ? 43 : code === "IND" ? 61 : 80,
      education: code === "NPL" ? 50 : code === "IND" ? 66 : 85,
      health: code === "NPL" ? 51 : code === "IND" ? 65 : 83,
      readiness: code === "NPL" ? 30 : 65,
      tax: p.tax,
      budget: { ...DEFAULT_BUDGET },
      autoBorrow: true,
      domesticDebt: domestic,
      privateBonds: domestic,
      domesticArrears: 0,
      relations: Object.fromEntries(
        codes.filter((c) => c !== code).map((c) => [c, 55]),
      ),
      pacts: [],
    };
    openAccount(book, key(code, "treasury"), p.currency, gdp * 0.035);
    openAccount(book, key(code, "private"), p.currency, gdp * 1.5);
    openAccount(book, key(code, "settlement"), p.currency, gdp * 8);
    openAccount(book, key(code, "reserves"), "USD", p.reserves);
    loans.push({
      id: nextId++,
      borrower: code,
      lender: "MARKET",
      original: externalUSD,
      outstanding: externalUSD,
      rate: (p.rate + 1.5) / 100,
      term: 120,
      remaining: 120,
      start: 0,
      arrears: 0,
      interestDueUSD: 0,
    });
    reports[code] = [];
  }
  openAccount(book, "IMF:reserves", "USD", 1000);
  openAccount(book, "MARKET:reserves", "USD", 10000);
  return {
    version: 1,
    player,
    month: 0,
    seed,
    nextId,
    countries,
    book,
    loans,
    projects: [],
    deals: [],
    messages: [],
    events: [
      {
        id: 0,
        month: 0,
        text: "Your mandate begins. Review the inherited budget, then advance one month.",
        severity: "info",
      },
    ],
    reports,
    energy: 1,
    food: 1,
    pending: Object.fromEntries(codes.map((c) => [c, 0])) as Record<
      Code,
      number
    >,
    lastSaved: Date.now(),
  };
}
function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
export function forecast(w: World, code: Code) {
  const c = w.countries[code],
    tax =
      (c.gdp * c.tax * (code === "USA" ? 0.97 : code === "NPL" ? 0.8 : 0.88)) /
      12,
    spend = (c.gdp * SECTORS.reduce((n, s) => n + c.budget[s], 0)) / 12,
    interest =
      (c.domesticDebt * (c.rate / 100 + 0.01)) / 12 +
      c.domesticArrears +
      w.loans
        .filter((l) => l.borrower === code)
        .reduce(
          (n, l) =>
            n + ((l.outstanding * l.rate) / 12 + l.interestDueUSD) * c.fx,
          0,
        );
  return {
    tax,
    spend,
    interest,
    principal:
      c.domesticDebt / 120 +
      w.loans
        .filter((l) => l.borrower === code)
        .reduce(
          (n, l) =>
            n +
            Math.min(l.outstanding, (l.original / l.term) * (l.arrears + 1)) *
              c.fx,
          0,
        ),
    deficit: spend + interest - tax,
    financing: Math.max(
      0,
      spend +
        interest +
        c.domesticDebt / 120 +
        w.loans
          .filter((l) => l.borrower === code)
          .reduce(
            (n, l) =>
              n +
              Math.min(l.outstanding, (l.original / l.term) * (l.arrears + 1)) *
                c.fx,
            0,
          ) -
        tax -
        money(w, code, "treasury"),
    ),
  };
}
export function setBudget(w: World, sector: Sector, value: number) {
  if (
    !SECTORS.includes(sector) ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 0.15
  )
    return "Budget allocation must be between 0% and 15% of GDP.";
  const c = w.countries[w.player],
    sum = SECTORS.reduce((n, s) => n + (s === sector ? value : c.budget[s]), 0);
  if (sum > 0.6)
    return "Combined allocations cannot exceed 60% of GDP in this scenario.";
  c.budget[sector] = value;
  return null;
}
export function issueDomestic(w: World, code: Code, bn: number) {
  if (!Number.isFinite(bn) || bn <= 0) return 0;
  const available = Math.min(
      bn,
      money(w, code, "private") * 0.2,
      w.countries[code].gdp * 0.1,
    ),
    rounded = Math.round(available * 1e6) / 1e6;
  if (
    settle(
      w.book,
      [
        {
          from: key(code, "private"),
          to: key(code, "treasury"),
          bn: rounded,
          memo: "Domestic bond auction",
        },
      ],
      w.month,
      "domestic-bonds",
    )
  ) {
    w.countries[code].domesticDebt += rounded;
    w.countries[code].privateBonds += rounded;
    return rounded;
  }
  return 0;
}
function loanTransfers(
  w: World,
  borrower: Code,
  lender: Loan["lender"],
  usd: number,
  disburse: boolean,
): Transfer[] {
  const b = w.countries[borrower],
    l = codes.includes(lender as Code) ? w.countries[lender as Code] : null;
  const sourceUSD =
    lender === "USA"
      ? key("USA", "treasury")
      : l
        ? key(l.code, "reserves")
        : `${lender}:reserves`;
  const targetUSD =
    borrower === "USA" ? key(borrower, "treasury") : key(borrower, "reserves");
  const list: Transfer[] = [];
  if (disburse) {
    if (l && l.code !== "USA")
      list.push({
        from: key(l.code, "treasury"),
        to: key(l.code, "settlement"),
        bn: usd * l.fx,
        memo: "Lender purchases foreign exchange",
      });
    list.push({
      from: sourceUSD,
      to: targetUSD,
      bn: usd,
      memo: "External loan disbursement (USD)",
    });
    if (borrower !== "USA")
      list.push({
        from: key(borrower, "settlement"),
        to: key(borrower, "treasury"),
        bn: usd * b.fx,
        memo: "Borrowed FX converted to local treasury funds",
      });
  } else {
    if (borrower !== "USA")
      list.push({
        from: key(borrower, "treasury"),
        to: key(borrower, "settlement"),
        bn: usd * b.fx,
        memo: "Treasury purchases debt-service FX",
      });
    list.push({
      from: targetUSD,
      to: sourceUSD,
      bn: usd,
      memo: "External debt service (USD)",
    });
    if (l && l.code !== "USA")
      list.push({
        from: key(l.code, "settlement"),
        to: key(l.code, "treasury"),
        bn: usd * l.fx,
        memo: "Creditor converts debt-service receipts",
      });
  }
  return list;
}
export function startProject(w: World, kind: Project["kind"]) {
  if (!["grid", "transport", "schools"].includes(kind))
    return "Unknown project.";
  if (w.projects.filter((p) => p.country === w.player).length >= 3)
    return "Three projects are already underway.";
  const c = w.countries[w.player],
    cost = c.gdp * 0.004;
  if (
    !settle(
      w.book,
      [
        {
          from: key(c.code, "treasury"),
          to: key(c.code, "private"),
          bn: cost,
          memo: `Capital project: ${kind}`,
        },
      ],
      w.month,
      "project",
    )
  )
    return "Insufficient treasury. Adjust your budget or arrange financing.";
  w.pending[c.code] += cost;
  w.projects.push({
    id: w.nextId++,
    country: c.code,
    kind,
    cost,
    remaining: kind === "transport" ? 8 : 6,
    total: kind === "transport" ? 8 : 6,
  });
  event(
    w,
    `${kind === "grid" ? "Electricity grid" : kind === "transport" ? "Transport corridor" : "School renewal"} funded. Benefits arrive on completion.`,
    "success",
  );
  return null;
}
export function acceptDeal(w: World, id: number) {
  const d = w.deals.find((d) => d.id === id);
  if (!d || d.accepted || d.expires < w.month)
    return "This proposal is no longer available.";
  const c = w.countries[w.player];
  if (d.partner === w.player)
    return "A government cannot negotiate with itself.";
  if (d.kind === "loan") {
    if (w.loans.length >= 80)
      return "The scenario loan-book limit has been reached.";
    if (d.amount <= 0 || d.amount > (c.gdp / c.fx) * 0.1)
      return "Loan exceeds this scenario’s financing limit.";
    if (
      d.partner === "IMF" &&
      (c.tax < 0.17 ||
        SECTORS.reduce((n, s) => n + c.budget[s], 0) - c.tax > 0.08)
    )
      return "Programme conditions no longer hold: tax take ≥17% and primary spending gap ≤8% of GDP.";
    if (debt(w, c.code) / c.gdp > 1.8)
      return "Credit risk is outside the lender’s current mandate.";
    const eligibility = loanEligibility(w, d.partner, d.amount, d.term, d.rate);
    if (eligibility) return eligibility;
    const fee = d.feeUSD ?? 0;
    const transfers = loanTransfers(w, c.code, d.partner, d.amount, true);
    if (fee > 0)
      transfers.push({
        from: key(c.code, "treasury"),
        to: key(c.code, "private"),
        bn: fee * c.fx,
        memo: "Disclosed patronage advisory procurement: domestic private intermediaries",
      });
    if (!settle(w.book, transfers, w.month, `loan-${d.id}`))
      return "The parties cannot fund this settlement. No balances changed.";
    if (fee > 0) {
      w.pending[c.code] += fee * c.fx;
      c.trust = clamp((c.trust ?? 65) - 4, 0, 100);
    }
    w.loans.push({
      id: w.nextId++,
      borrower: c.code,
      lender: d.partner,
      original: d.amount,
      outstanding: d.amount,
      rate: d.rate,
      term: d.term,
      remaining: d.term,
      start: w.month,
      arrears: 0,
      interestDueUSD: 0,
    });
  } else {
    if (d.partner === "IMF" || d.partner === c.code)
      return "Invalid counterparty.";
    const partner = w.countries[d.partner];
    if ((c.relations[d.partner] || 0) < 35)
      return "Relations have deteriorated. Renegotiate first.";
    const persona = agentFor(w, d.partner);
    if (persona.style === "security" && c.budget.defence < 0.02)
      return "This delegate requires defence funding of at least 2% of GDP.";
    const fee =
      c.gdp *
      (d.kind === "pact" ? 0.0005 : 0.0001) *
      (persona.style === "patronage" ? 3 : 1);
    if (
      !settle(
        w.book,
        [
          {
            from: key(c.code, "treasury"),
            to: key(c.code, "private"),
            bn: fee,
            memo:
              d.kind === "pact"
                ? "Joint readiness administration"
                : "Trade facilitation administration",
          },
        ],
        w.month,
        `agreement-${d.id}`,
      )
    )
      return "Insufficient treasury for implementation.";
    w.pending[c.code] += fee;
    if (persona.style === "patronage")
      c.trust = clamp((c.trust ?? 65) - 4, 0, 100);
    if (d.kind === "pact") {
      if (!c.pacts.includes(d.partner)) c.pacts.push(d.partner);
      if (!partner.pacts.includes(c.code)) partner.pacts.push(c.code);
    }
    c.relations[d.partner] = clamp((c.relations[d.partner] || 0) + 8, 0, 100);
    partner.relations[c.code] = clamp(
      (partner.relations[c.code] || 0) + 8,
      0,
      100,
    );
  }
  d.accepted = true;
  d.signedMonth = w.month;
  event(
    w,
    `${d.kind === "loan" ? "Financing disbursed" : d.kind === "trade" ? "Trade facilitation signed" : "Defence cooperation signed"} with ${d.partner === "IMF" ? "the IMF-style scenario facility" : PROFILES[d.partner].name}.`,
    "success",
  );
  return null;
}
function trade(w: World) {
  const flows = Object.fromEntries(
    codes.map((c) => [c, { x: 0, m: 0, usdX: 0, usdM: 0 }]),
  ) as Record<Code, { x: number; m: number; usdX: number; usdM: number }>;
  const supply = Object.fromEntries(
    codes.map((c) => [
      c,
      (((w.countries[c].gdp / w.countries[c].fx) * PROFILES[c].exports) / 12) *
        clamp(w.countries[c].realCapacity, 0.7, 1.4),
    ]),
  ) as Record<Code, number>;
  for (const buyer of codes) {
    const b = w.countries[buyer],
      desired =
        (((b.gdp / b.fx) * PROFILES[buyer].imports) / 12) *
        (0.7 + 0.3 * w.energy),
      partners = codes.filter((c) => c !== buyer);
    const total = partners.reduce((n, c) => n + supply[c], 0);
    for (const seller of partners) {
      const s = w.countries[seller],
        fraction = total > 0 ? supply[seller] / total : 0,
        facilitation = w.deals.some(
          (d) =>
            d.accepted &&
            d.kind === "trade" &&
            w.month < (d.signedMonth ?? 0) + d.term &&
            ((w.player === buyer && d.partner === seller) ||
              (w.player === seller && d.partner === buyer)),
        )
          ? 1.06
          : 1;
      const usd = Math.min(
        desired * fraction * facilitation,
        supply[seller],
        buyer === "USA"
          ? money(w, buyer, "private") * 0.1
          : money(w, buyer, "reserves") * 0.35,
      );
      if (usd <= 0.000001) continue;
      const rows: Transfer[] = [];
      if (buyer !== "USA")
        rows.push({
          from: key(buyer, "private"),
          to: key(buyer, "settlement"),
          bn: usd * b.fx,
          memo: "Import buyer purchases foreign exchange",
        });
      rows.push({
        from: buyer === "USA" ? key(buyer, "private") : key(buyer, "reserves"),
        to: seller === "USA" ? key(seller, "private") : key(seller, "reserves"),
        bn: usd,
        memo: `Trade settlement: ${buyer} → ${seller} (USD)`,
      });
      if (seller !== "USA")
        rows.push({
          from: key(seller, "settlement"),
          to: key(seller, "private"),
          bn: usd * s.fx,
          memo: "Exporter receives local-currency proceeds",
        });
      if (settle(w.book, rows, w.month, "trade")) {
        flows[buyer].m += usd * b.fx;
        flows[buyer].usdM += usd;
        flows[seller].x += usd * s.fx;
        flows[seller].usdX += usd;
        supply[seller] -= usd;
      }
    }
  }
  return flows;
}
export function nextMonth(w: World) {
  if (w.month >= 1200)
    throw Error(
      "This 100-year scenario has reached its endpoint. Export a backup or start a new mandate.",
    );
  w.month++;
  w.energy += (1 - w.energy) * 0.2;
  w.food += (1 - w.food) * 0.2;
  if (w.month === 3) {
    w.food = 1.2;
    event(
      w,
      "Scenario shock: a poor regional harvest raises food import costs.",
      "warning",
    );
  }
  if (w.month === 6) {
    w.energy = 1.45;
    event(
      w,
      "Scenario shock: disrupted energy shipping raises fuel costs.",
      "warning",
    );
  }
  if (w.month === 9) {
    w.energy = 1.35;
    event(
      w,
      "Fictional regional conflict disrupts supply routes. Defence cooperation softens readiness pressure.",
      "warning",
    );
  }
  const before = Object.fromEntries(
    codes.map((code) => [
      code,
      { fx: w.countries[code].fx, gdp: w.countries[code].gdp },
    ]),
  ) as Record<Code, { fx: number; gdp: number }>;
  const reports = {} as Record<Code, Report>;
  for (const code of codes) {
    const c = w.countries[code];
    if (code !== w.player) {
      const pressure = debt(w, code) / c.gdp;
      if (pressure > 1)
        c.budget.administration = Math.max(
          0.008,
          c.budget.administration - 0.0003,
        );
      if (c.unemployment > 8)
        c.budget.infrastructure = Math.min(
          0.045,
          c.budget.infrastructure + 0.0002,
        );
    }
    const f = forecast(w, code),
      domesticPrincipal = Math.min(c.domesticDebt, c.domesticDebt / 120),
      dueLoans = w.loans.filter(
        (l) => l.borrower === code && l.start < w.month,
      );
    const externalDue = dueLoans.reduce(
      (n, l) =>
        n +
        (Math.min(l.outstanding, (l.original / l.term) * (l.arrears + 1)) +
          (l.outstanding * l.rate) / 12 +
          l.interestDueUSD) *
          c.fx,
      0,
    );
    const needed = Math.max(
      0,
      f.spend +
        domesticPrincipal +
        externalDue +
        (c.domesticDebt * (c.rate / 100 + 0.01)) / 12 +
        c.domesticArrears -
        f.tax -
        money(w, code, "treasury"),
    );
    let borrowed = 0;
    if (c.autoBorrow) borrowed = issueDomestic(w, code, needed);
    const tax = Math.min(f.tax, money(w, code, "private"));
    settle(
      w.book,
      [
        {
          from: key(code, "private"),
          to: key(code, "treasury"),
          bn: tax,
          memo: "Tax collection",
        },
      ],
      w.month,
      "tax",
    );
    const couponDue =
      (c.domesticDebt * (c.rate / 100 + 0.01)) / 12 + c.domesticArrears;
    const domesticInterest = Math.min(couponDue, money(w, code, "treasury"));
    c.domesticArrears = Math.max(0, couponDue - domesticInterest);
    settle(
      w.book,
      [
        {
          from: key(code, "treasury"),
          to: key(code, "private"),
          bn: domesticInterest,
          memo: "Domestic bond coupon",
        },
      ],
      w.month,
      "debt-service",
    );
    const paidPrincipal = Math.min(
      domesticPrincipal,
      money(w, code, "treasury"),
    );
    settle(
      w.book,
      [
        {
          from: key(code, "treasury"),
          to: key(code, "private"),
          bn: paidPrincipal,
          memo: "Domestic bond redemption",
        },
      ],
      w.month,
      "debt-service",
    );
    c.domesticDebt -= paidPrincipal;
    c.privateBonds -= paidPrincipal;
    let externalInterest = 0,
      externalPrincipal = 0;
    for (const loan of dueLoans) {
      const principal = Math.min(
          loan.outstanding,
          (loan.original / loan.term) * (loan.arrears + 1),
        ),
        interest = (loan.outstanding * loan.rate) / 12 + loan.interestDueUSD,
        total = principal + interest;
      if (total < 0.000001) continue;
      if (
        settle(
          w.book,
          loanTransfers(w, code, loan.lender, total, false),
          w.month,
          `service-${loan.id}`,
        )
      ) {
        loan.outstanding = Math.max(0, loan.outstanding - principal);
        loan.remaining = Math.max(0, loan.remaining - 1 - loan.arrears);
        loan.arrears = 0;
        loan.interestDueUSD = 0;
        externalInterest += interest * c.fx;
        externalPrincipal += principal * c.fx;
      } else {
        loan.arrears++;
        loan.interestDueUSD = interest;
        if (code === w.player)
          event(
            w,
            "An external debt payment could not settle. Treasury or reserves are insufficient; the unpaid principal remains due.",
            "warning",
          );
      }
    }
    const spend = Math.min(f.spend, money(w, code, "treasury")),
      funded = f.spend ? spend / f.spend : 0;
    settle(
      w.book,
      [
        {
          from: key(code, "treasury"),
          to: key(code, "private"),
          bn: spend,
          memo: "Public services, wages, procurement and transfers",
        },
      ],
      w.month,
      "budget",
    );
    const transfers = ((c.gdp * c.budget.social) / 12) * funded,
      capital = w.pending[code],
      g = spend - transfers + capital;
    w.pending[code] = 0;
    c.health = clamp(
      c.health + (c.budget.health * funded - 0.04) * 18,
      15,
      100,
    );
    c.education = clamp(
      c.education + (c.budget.education * funded - 0.03) * 9,
      15,
      100,
    );
    c.infrastructure = clamp(
      c.infrastructure + (c.budget.infrastructure * funded - 0.02) * 12,
      10,
      100,
    );
    c.readiness = clamp(
      c.readiness +
        (c.budget.defence * funded - 0.02) * 40 +
        (c.pacts.length ? 0.12 : 0) -
        (w.month === 9 && !c.pacts.length ? 3 : 0),
      5,
      100,
    );
    reports[code] = {
      month: w.month,
      gdp: 0,
      c: 0,
      i: 0,
      g,
      x: 0,
      m: 0,
      tax,
      spending: spend + capital,
      transfers,
      interest: domesticInterest + externalInterest,
      principal: paidPrincipal + externalPrincipal,
      borrowed,
      shortfall: f.spend - spend,
      deficit: spend + capital + domesticInterest + externalInterest - tax,
      inflation: c.inflation,
      fx: c.fx,
      cpi: c.cpi,
      unemployment: c.unemployment,
      debt: debt(w, code),
      importsUSD: 0,
      exportsUSD: 0,
    };
  }
  const flows = trade(w);
  for (const code of codes) {
    const c = w.countries[code],
      r = reports[code],
      profile = PROFILES[code];
    const externalPressure = flows[code].usdM - flows[code].usdX;
    const baseGDP = (BASELINE[code].gdpUSD / 1e9) * profile.fx;
    if (
      (profile.regime === "float" && code !== "USA") ||
      profile.regime === "managed" ||
      profile.regime === "union"
    ) {
      const pressure = clamp(
        (externalPressure / (BASELINE[code].gdpUSD / 1e9)) * 0.18 +
          (c.inflation - w.countries.USA.inflation) / 1200 +
          (debt(w, code) / c.gdp - profile.debt) * 0.003,
        -0.025,
        0.04,
      );
      c.fx *= 1 + pressure;
    }
    if (code === "NPL") c.fx = w.countries.IND.fx * 1.6;
    if (code === "SAU") c.fx = 3.75;
    if (code === "USA") c.fx = 1;
    const depreciation = c.fx / before[code].fx - 1,
      shortage = r.shortfall / Math.max(0.01, before[code].gdp / 12);
    const monthlyPrice = clamp(
      0.02 / 12 +
        (w.energy - 1) * 0.012 +
        (w.food - 1) * 0.012 +
        depreciation * 0.25 +
        Math.max(0, 0.025 - c.budget.infrastructure) * 0.03,
      -0.008,
      0.05,
    );
    c.cpi *= 1 + monthlyPrice;
    const history = w.reports[code],
      anchor = history.length >= 12 ? history[history.length - 12].cpi : 1,
      periods = Math.min(12, w.month);
    c.inflation = (Math.pow(c.cpi / anchor, 12 / periods) - 1) * 100;
    if (profile.regime === "managed" || code === "USA")
      c.rate = clamp(
        c.rate * 0.85 +
          (0.02 * 100 + Math.max(0, c.inflation - 2) * 0.7) * 0.15,
        1,
        18,
      );
    if (code === "NPL") c.rate = w.countries.IND.rate + 0.75;
    if (code === "DEU") c.rate = 3.75;
    if (code === "SAU") c.rate = w.countries.USA.rate + 0.5;
    c.realCapacity *=
      1 +
      clamp(
        0.001 +
          (c.education - 65) * 0.00002 +
          (c.infrastructure - 65) * 0.00003 -
          (w.energy - 1) * 0.002 -
          shortage * 0.006,
        -0.01,
        0.006,
      );
    const potential = (baseGDP * c.realCapacity) / 12,
      confidence = clamp(
        1 -
          (c.rate - profile.rate) * 0.012 -
          shortage * 0.15 -
          Math.max(0, 65 - (c.trust ?? 65)) * 0.001,
        0.78,
        1.08,
      );
    const consumptionShare =
      1 -
      0.18 -
      (SECTORS.reduce((n, k) => n + DEFAULT_BUDGET[k], 0) -
        DEFAULT_BUDGET.social) -
      (profile.exports - profile.imports);
    r.c = potential * consumptionShare * confidence * c.cpi;
    r.i =
      potential *
      0.18 *
      clamp(1 - (c.rate - profile.rate) * 0.025, 0.5, 1.3) *
      c.cpi;
    r.x = flows[code].x;
    r.m = flows[code].m;
    r.importsUSD = flows[code].usdM;
    r.exportsUSD = flows[code].usdX;
    r.gdp = r.c + r.i + r.g + r.x - r.m;
    c.gdp = r.gdp * 12;
    c.unemployment = clamp(
      c.unemployment + (1 - confidence) * 0.2 + (shortage > 0.1 ? 0.2 : -0.03),
      2,
      35,
    );
    c.population *=
      1 + (code === "NPL" ? 0.0008 : code === "IND" ? 0.0007 : 0.0002);
    r.inflation = c.inflation;
    r.fx = c.fx;
    r.cpi = c.cpi;
    r.unemployment = c.unemployment;
    r.debt = debt(w, code);
    w.reports[code].push(r);
    w.reports[code] = w.reports[code].slice(-60);
    if (code === w.player && coverage(w, code) < 3)
      event(
        w,
        "Foreign-exchange reserves cover less than three months of baseline imports. Consider financing or import-dependency reduction.",
        "warning",
      );
  }
  for (const p of w.projects) {
    p.remaining--;
    if (p.remaining === 0) {
      const c = w.countries[p.country];
      if (p.kind === "schools") c.education = clamp(c.education + 7, 0, 100);
      else c.infrastructure = clamp(c.infrastructure + 8, 0, 100);
      c.realCapacity *= p.kind === "grid" ? 1.025 : 1.015;
      if (p.country === w.player)
        event(
          w,
          `${p.kind} project completed. Productive capacity and service coverage improved.`,
          "success",
        );
    }
  }
  w.projects = w.projects.filter((p) => p.remaining > 0);
  w.deals = w.deals.slice(-60);
  w.lastSaved = Date.now();
  if (!audit(w.book)) throw Error("Cash ledger failed conservation checks.");
  event(
    w,
    `Month ${w.month} closed. Transactions balanced across all currencies.`,
  );
}
export function identities(w: World) {
  return {
    cash: audit(w.book),
    domesticBonds: codes.every(
      (c) =>
        Math.abs(w.countries[c].domesticDebt - w.countries[c].privateBonds) <
        0.00001,
    ),
    gdp: codes.every((c) =>
      w.reports[c].every(
        (r) => Math.abs(r.gdp - (r.c + r.i + r.g + r.x - r.m)) < 0.00001,
      ),
    ),
    externalAssets: w.loans.every(
      (l) => l.outstanding >= 0 && l.outstanding <= l.original + 0.000001,
    ),
  };
}
