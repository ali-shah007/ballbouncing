import { Code } from "./scenarios";
import { codes, coverage, debt, forecast, money, World } from "./model";
export type Style = "strict" | "pragmatic" | "patronage" | "security";
export type Agent = {
  name: string;
  style: Style;
  label: string;
  description: string;
  spread: number;
  fee: number;
  maxDebt: number;
  maxService: number;
  maxTerm: number;
};
const AGENTS: Agent[] = [
  {
    name: "Avery Cole",
    style: "strict",
    label: "Fiscal disciplinarian",
    description:
      "Demands credible repayment capacity, shorter maturities and tighter debt limits.",
    spread: 0.0025,
    fee: 0,
    maxDebt: 1.2,
    maxService: 0.75,
    maxTerm: 36,
  },
  {
    name: "Mira Vale",
    style: "pragmatic",
    label: "Pragmatic deal-maker",
    description:
      "Favours affordable agreements and rewards established trade relationships.",
    spread: -0.002,
    fee: 0,
    maxDebt: 1.8,
    maxService: 0.95,
    maxTerm: 60,
  },
  {
    name: "Ivo Mercer",
    style: "patronage",
    label: "Patronage-driven official",
    description:
      "Demands a disclosed domestic advisory outlay benefiting connected private intermediaries. Signing lowers public trust; this is fictional corruption, not a claim about a real country.",
    spread: 0.008,
    fee: 0.015,
    maxDebt: 1.6,
    maxService: 0.95,
    maxTerm: 48,
  },
  {
    name: "Jonas Reed",
    style: "security",
    label: "Security-first negotiator",
    description:
      "Prioritizes funded defence commitments and strategic cooperation.",
    spread: 0.004,
    fee: 0,
    maxDebt: 1.5,
    maxService: 0.85,
    maxTerm: 48,
  },
];
export function agentFor(w: World, partner: Code | "IMF"): Agent {
  if (partner === "IMF")
    return {
      name: "Programme review desk",
      style: "strict",
      label: "Institutional programme reviewer",
      description:
        "Uses the scenario facility’s published fiscal conditions. Not an actual IMF official or programme.",
      spread: 0,
      fee: 0,
      maxDebt: 1.8,
      maxService: 0.95,
      maxTerm: 60,
    };
  const others = codes.filter((c) => c !== w.player);
  return AGENTS[
    (Math.max(0, others.indexOf(partner)) +
      (Math.abs(Math.floor(w.seed)) % AGENTS.length)) %
      AGENTS.length
  ];
}
export type LoanPricing = {
  funding: number;
  lossSpread: number;
  liquidity: number;
  personality: number;
  relationship: number;
  defaultProxy: number;
  rate: number;
  feeUSD: number;
  firstPaymentUSD: number;
  totalInterestUSD: number;
  totalCostUSD: number;
  serviceRatio: number;
  debtRatio: number;
  stressPaymentLocal: number;
  npvUSD: number;
};
/** Policy-rate opportunity cost + expected-loss spread + transparent premiums.
 * Risk proxies and premiums are scenario assumptions, not real credit ratings. */
export function priceLoan(
  w: World,
  partner: Code | "IMF",
  principal: number,
  term: number,
): LoanPricing {
  const c = w.countries[w.player],
    a = agentFor(w, partner),
    f = forecast(w, c.code),
    ratio = debt(w, c.code) / c.gdp,
    cover = coverage(w, c.code),
    trust = c.trust ?? 65;
  const funding =
    partner === "IMF" ? 0.045 : w.countries.USA.rate / 100 + 0.005;
  const defaultProxy = Math.min(
    0.3,
    Math.max(
      0.01,
      0.015 +
        Math.max(0, ratio - 0.6) * 0.06 +
        (Number.isFinite(cover) ? Math.max(0, 3 - cover) * 0.015 : 0) +
        Math.max(0, (f.deficit * 12) / c.gdp) * 0.4 +
        Math.max(0, 65 - trust) * 0.001,
    ),
  );
  const lossSpread =
      partner === "IMF" ? 0 : (defaultProxy * 0.45) / (1 - defaultProxy),
    liquidity = partner === "IMF" ? 0 : 0.003 + term / 12000,
    relationship =
      partner === "IMF" ? 0 : -(c.relations[partner] || 0) * 0.00004;
  const rate = Math.max(
    0.02,
    Math.min(0.25, funding + lossSpread + liquidity + a.spread + relationship),
  );
  const feeUSD = principal * a.fee,
    firstPaymentUSD = principal / term + (principal * rate) / 12,
    totalInterestUSD = (((principal * rate) / 12) * (term + 1)) / 2;
  const externalPrincipal = w.loans
      .filter((l) => l.borrower === c.code)
      .reduce(
        (n, l) =>
          n +
          Math.min(l.outstanding, (l.original / l.term) * (l.arrears + 1)) *
            c.fx,
        0,
      ),
    principalDue = c.autoBorrow ? externalPrincipal : f.principal;
  const serviceRatio =
    (f.interest + principalDue + firstPaymentUSD * c.fx) /
    Math.max(0.001, f.tax);
  let npvUSD = -principal;
  for (let t = 1; t <= term; t++) {
    const outstanding = principal - ((t - 1) * principal) / term,
      payment = principal / term + (outstanding * rate) / 12;
    npvUSD += payment / Math.pow(1 + funding / 12, t);
  }
  return {
    funding,
    lossSpread,
    liquidity,
    personality: a.spread,
    relationship,
    defaultProxy,
    rate,
    feeUSD,
    firstPaymentUSD,
    totalInterestUSD,
    totalCostUSD: totalInterestUSD + feeUSD,
    serviceRatio,
    debtRatio: (debt(w, c.code) + principal * c.fx) / c.gdp,
    stressPaymentLocal: firstPaymentUSD * c.fx * (c.code === "USA" ? 1 : 1.2),
    npvUSD,
  };
}
export function loanEligibility(
  w: World,
  partner: Code | "IMF",
  principal: number,
  term: number,
  rate?: number,
) {
  const c = w.countries[w.player],
    a = agentFor(w, partner),
    pricing = priceLoan(w, partner, principal, term);
  if (partner === w.player)
    return "A government cannot negotiate an external loan with itself.";
  if (
    !Number.isFinite(principal) ||
    principal <= 0 ||
    principal > (c.gdp / c.fx) * 0.1
  )
    return "The tranche must be positive and no larger than 10% of annual USD-equivalent GDP.";
  if (pricing.debtRatio > a.maxDebt)
    return `${a.label} rejects projected debt above ${(a.maxDebt * 100).toFixed(0)}% of GDP.`;
  const lender =
    partner === "IMF"
      ? amountAvailable(w, "IMF")
      : partner === "USA"
        ? money(w, partner, "treasury")
        : Math.min(
            money(w, partner, "treasury") / w.countries[partner].fx,
            money(w, partner, "reserves"),
          );
  if (principal > lender * 0.25)
    return "The delegation cannot commit more than 25% of its available financing liquidity.";
  const projected =
    rate === undefined
      ? pricing.serviceRatio
      : pricing.serviceRatio +
        (((principal * (rate - pricing.rate)) / 12) * c.fx) /
          Math.max(0.001, forecast(w, c.code).tax);
  if (projected > a.maxService)
    return `Debt service would absorb ${(projected * 100).toFixed(1)}% of monthly tax receipts, above this delegate’s ${(a.maxService * 100).toFixed(0)}% limit. Rolled domestic principal is excluded when automatic auctions are enabled.`;
  if (a.style === "security" && c.budget.defence < 0.02)
    return "This security-first delegate requires defence funding of at least 2% of GDP.";
  return null;
}
function amountAvailable(w: World, _partner: "IMF") {
  return w.book.accounts["IMF:reserves"].units / 1e6;
}
