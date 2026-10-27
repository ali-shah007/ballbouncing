import baseline from "./baselines.json";
export type Code = keyof typeof baseline;
export const SECTORS = [
  "health",
  "education",
  "infrastructure",
  "defence",
  "social",
  "administration",
] as const;
export type Sector = (typeof SECTORS)[number];
export const SECTOR_LABELS: Record<Sector, string> = {
  health: "Health & care",
  education: "Education & skills",
  infrastructure: "Infrastructure",
  defence: "Defence & readiness",
  social: "Social protection",
  administration: "Public administration",
};
export type Profile = {
  name: string;
  flag: string;
  currency: string;
  fx: number;
  regime: "float" | "managed" | "peg" | "union";
  peg?: Code;
  pegRatio?: number;
  tag: string;
  summary: string;
  color: string;
  tax: number;
  debt: number;
  foreignShare: number;
  reserves: number;
  inflation: number;
  rate: number;
  imports: number;
  exports: number;
  capacity: number;
};
export const PROFILES: Record<Code, Profile> = {
  USA: {
    name: "United States",
    flag: "🇺🇸",
    currency: "USD",
    fx: 1,
    regime: "float",
    tag: "ADVANCED · RESERVE CURRENCY",
    summary:
      "Deep domestic capital markets. High debt, an independent central bank, and a diversified economy.",
    color: "#718aab",
    tax: 0.21,
    debt: 1.12,
    foreignShare: 0.13,
    reserves: 240,
    inflation: 3.2,
    rate: 5.25,
    imports: 0.145,
    exports: 0.115,
    capacity: 1.02,
  },
  IND: {
    name: "India",
    flag: "🇮🇳",
    currency: "INR",
    fx: 83,
    regime: "managed",
    tag: "EMERGING · MANAGED FLOAT",
    summary:
      "A large domestic market and growing productive capacity, with energy imports and infrastructure constraints.",
    color: "#c59b6c",
    tax: 0.2,
    debt: 0.82,
    foreignShare: 0.07,
    reserves: 580,
    inflation: 5.4,
    rate: 6.5,
    imports: 0.23,
    exports: 0.21,
    capacity: 0.94,
  },
  NPL: {
    name: "Nepal",
    flag: "🇳🇵",
    currency: "NPR",
    fx: 132.8,
    regime: "peg",
    peg: "IND",
    pegRatio: 1.6,
    tag: "IMPORT-DEPENDENT · CURRENCY PEG",
    summary:
      "A smaller economy with limited fiscal room. The rupee is pegged to India’s, making reserves and imports central decisions.",
    color: "#8aab8f",
    tax: 0.19,
    debt: 0.43,
    foreignShare: 0.48,
    reserves: 11,
    inflation: 6.5,
    rate: 7,
    imports: 0.37,
    exports: 0.12,
    capacity: 0.82,
  },
  DEU: {
    name: "Germany",
    flag: "🇩🇪",
    currency: "EUR",
    fx: 0.92,
    regime: "union",
    tag: "ADVANCED · CURRENCY UNION",
    summary:
      "An industrial export partner operating within a shared monetary policy.",
    color: "#a4a483",
    tax: 0.34,
    debt: 0.64,
    foreignShare: 0.25,
    reserves: 230,
    inflation: 3.5,
    rate: 4,
    imports: 0.42,
    exports: 0.46,
    capacity: 1.04,
  },
  SAU: {
    name: "Saudi Arabia",
    flag: "🇸🇦",
    currency: "SAR",
    fx: 3.75,
    regime: "peg",
    pegRatio: 3.75,
    tag: "ENERGY EXPORTER · DOLLAR PEG",
    summary:
      "Energy export revenues support fiscal capacity, while a dollar peg constrains monetary policy.",
    color: "#a7b48a",
    tax: 0.28,
    debt: 0.27,
    foreignShare: 0.25,
    reserves: 430,
    inflation: 2,
    rate: 5.75,
    imports: 0.28,
    exports: 0.4,
    capacity: 1.01,
  },
};
export const STARTERS: Code[] = ["USA", "IND", "NPL"];
export const BASELINE = baseline;
export const DEFAULT_BUDGET: Record<Sector, number> = {
  health: 0.045,
  education: 0.035,
  infrastructure: 0.025,
  defence: 0.025,
  social: 0.055,
  administration: 0.02,
};
export const ASSUMPTIONS = [
  "Country delegate personalities are assigned per mandate and saved with its seed; they are not national stereotypes. Patronage outlays are disclosed domestic private-sector procurement, with a trust penalty, not secret payments to actual officials.",
  "GDP and population start from 2023 World Bank WDI observations via the datasets mirrors. Values are historical; there is no live-data connection.",
  "Exchange rates, fiscal ratios, debt composition, reserves, and response coefficients are illustrative scenario calibration, not a complete reconstruction of 2023 accounts.",
  "Monthly GDP is C + I + G + X − M. GDP measures output, not newly created money. Private-sector internal spending is aggregated rather than household-level microsimulation.",
  "All cash transfers conserve integer balances within each currency. A funded settlement account represents the domestic FX counterparty; reserve assets settle cross-border USD payments.",
  "Domestic debt is held by an aggregate private sector; external creditors own the principal and accrued unpaid interest of recorded USD loans. Banks, private credit creation and defaults are not yet modeled.",
  "USD is the numeraire. India is a managed float; Nepal follows INR at 1.6 NPR/INR; SAR follows USD at 3.75. The euro floats against USD, but euro-area monetary policy is external to the German government.",
  "Central-bank reaction functions, prices, production, investment and expectations are simplified behavioral equations, not forecasts or scientifically validated causal estimates.",
  "Diplomatic agents use visible local decision rules with fictional, seeded personalities—not a language model or real officials. Regional shocks are fictional scenarios; no current conflict feed is used.",
];
