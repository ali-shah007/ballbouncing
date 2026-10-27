"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Coins,
  Download,
  Globe2,
  Landmark,
  MessageSquare,
  Plus,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import ModeSwitcher from "../ModeSwitcher";
import {
  ASSUMPTIONS,
  BASELINE,
  Code,
  PROFILES,
  SECTORS,
  SECTOR_LABELS,
  STARTERS,
  Sector,
} from "@/state-sim/scenarios";
import {
  acceptDeal,
  coverage,
  debt,
  forecast,
  identities,
  issueDomestic,
  key,
  money,
  nextMonth,
  setBudget,
  startProject,
} from "@/state-sim/model";
import { amount, SCALE } from "@/state-sim/ledger";
import { meet, Partner } from "@/state-sim/diplomacy";
import { agentFor } from "@/state-sim/agents";
import CountryMap from "./CountryMap";
import Sparkline from "./Sparkline";
import { useMandate } from "./useMandate";
type Tab =
  | "Overview"
  | "Budget"
  | "Economy"
  | "Infrastructure"
  | "Defence"
  | "Diplomacy"
  | "Ledger"
  | "Model";
const tabs: Tab[] = [
  "Overview",
  "Budget",
  "Economy",
  "Infrastructure",
  "Defence",
  "Diplomacy",
  "Ledger",
  "Model",
];
const bn = (n: number, digits = 2) =>
  n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
export default function NationState() {
  const {
    world: w,
    ready,
    notice,
    setNotice,
    update,
    start,
    exportFile,
    importFile,
  } = useMandate();
  const [tab, setTab] = useState<Tab>("Overview"),
    [layer, setLayer] = useState<"infrastructure" | "health" | "readiness">(
      "infrastructure",
    ),
    [partner, setPartner] = useState<Partner>("IMF"),
    [message, setMessage] = useState(""),
    [newMandate, setNewMandate] = useState(false),
    [bond, setBond] = useState("1");
  const file = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (w && partner === w.player) setPartner("IMF");
  }, [w?.player, partner]);
  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [w?.messages.length, partner, tab]);
  const c = w?.countries[w.player],
    profile = c ? PROFILES[c.code] : null,
    r = w && c ? w.reports[c.code].at(-1) : null,
    f = w && c ? forecast(w, c.code) : null;
  const history = w && c ? w.reports[c.code] : [];
  function advance() {
    update(nextMonth);
  }
  return (
    <div className="ns-page">
      <header className="ns-header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          orbit<span className="brand-light">studio</span>
        </Link>
        <span className="ns-header-note">
          A WORLD OF DECISIONS. A COUNTRY TO CARE FOR.
        </span>
        <span className="ns-experiment">
          NATION STATE <span>SIMULATION LAB</span>
        </span>
      </header>
      <main className="ns-main">
        <ModeSwitcher active="state" />
        {!ready ? (
          <div className="ns-empty">Opening the national accounts…</div>
        ) : !w || newMandate ? (
          <>
            <section className="ns-intro">
              <div className="ns-eyebrow">
                PUBLIC AFFAIRS / ECONOMIC SIMULATION
              </div>
              <h1>
                The world is connected.
                <br />
                <em>Your decisions matter.</em>
              </h1>
              <p>
                Take office. Balance the books. Build a future worth negotiating
                for.
              </p>
              <span className="ns-data-note">
                <BookOpen size={13} /> 2023 GDP & population baselines · Other
                starting parameters are illustrative
              </span>
            </section>
            <section className="ns-scenarios">
              {STARTERS.map((code) => (
                <article className="ns-scenario" key={code}>
                  <CountryMap code={code} />
                  <div>
                    <span className="ns-eyebrow">{PROFILES[code].tag}</span>
                    <h2>
                      {PROFILES[code].flag} {PROFILES[code].name}
                    </h2>
                    <p>{PROFILES[code].summary}</p>
                    <dl>
                      <div>
                        <dt>2023 GDP</dt>
                        <dd>${bn(BASELINE[code].gdpUSD / 1e12)}T</dd>
                      </div>
                      <div>
                        <dt>Population</dt>
                        <dd>{bn(BASELINE[code].population / 1e6, 1)}M</dd>
                      </div>
                      <div>
                        <dt>Currency</dt>
                        <dd>{PROFILES[code].currency}</dd>
                      </div>
                    </dl>
                    <button
                      className="ns-primary"
                      onClick={() => {
                        start(code);
                        setNewMandate(false);
                        setTab("Overview");
                      }}
                    >
                      Begin {PROFILES[code].name} mandate{" "}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </section>
            <div className="ns-selection-note">
              <Shield size={18} />
              <p>
                A serious sandbox, with honest boundaries. Accounting identities
                are checked; economic responses are simplified models, not
                predictions. Agents are local strategic simulations, not
                language models or real officials.{" "}
                <a
                  href="/state-sim/SOURCES.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read data provenance ↗
                </a>
              </p>
            </div>
            {newMandate && (
              <button className="ns-text" onClick={() => setNewMandate(false)}>
                Return to current mandate
              </button>
            )}
          </>
        ) : (
          c &&
          profile && (
            <>
              <section className="ns-mandate-head">
                <div>
                  <div className="ns-eyebrow">
                    YOUR MANDATE / {profile.regime.toUpperCase()} CURRENCY
                    REGIME
                  </div>
                  <h1>
                    {profile.flag} {profile.name}
                    <em> in your hands.</em>
                  </h1>
                  <p>
                    Public policy is a long game. Make the next month count.
                  </p>
                </div>
                <div className="ns-time">
                  <span>
                    SCENARIO MONTH{" "}
                    <strong>{String(w.month).padStart(2, "0")}</strong>
                  </span>
                  <button
                    className="ns-primary"
                    disabled={w.month >= 1200}
                    onClick={advance}
                  >
                    Advance one month <ArrowRight size={15} />
                  </button>
                  <small>
                    Manual turns · no hidden offline policy decisions
                  </small>
                </div>
              </section>
              <section className="ns-metrics">
                <Metric
                  title="ANNUALIZED OUTPUT"
                  value={`${profile.currency} ${bn(c.gdp / 1000)}T`}
                  note="Expenditure GDP · nominal"
                  values={history.map((r) => r.gdp * 12)}
                />
                <Metric
                  title="CPI INFLATION"
                  value={`${bn(c.inflation, 1)}%`}
                  note={
                    w.month < 12
                      ? "Annualized recent trend"
                      : "Trailing 12-month price change"
                  }
                  values={history.map((r) => r.inflation)}
                  alert={c.inflation > 8}
                />
                <Metric
                  title="PUBLIC DEBT / GDP"
                  value={`${bn((debt(w, c.code) / c.gdp) * 100, 1)}%`}
                  note="Includes external FX revaluation"
                  values={history.map((r) => (r.debt / (r.gdp * 12)) * 100)}
                />
                <Metric
                  title="TREASURY BALANCE"
                  value={`${profile.currency} ${bn(money(w, c.code, "treasury"))}B`}
                  note={`Next-month funding gap ${bn(f!.financing)}B`}
                  values={history.map((r) => r.deficit)}
                  alert={f!.financing > c.gdp * 0.01}
                />
              </section>
              <nav className="ns-tabs" aria-label="National management">
                {tabs.map((t) => (
                  <button
                    key={t}
                    aria-current={tab === t ? "page" : undefined}
                    className={tab === t ? "active" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </nav>
              {tab === "Overview" && (
                <div className="ns-overview">
                  <div>
                    <CountryMap
                      code={c.code}
                      world={w}
                      layer={layer}
                      onLayer={setLayer}
                    />
                    <div className="ns-under-map">
                      <span>
                        <Check size={13} />{" "}
                        {Object.values(identities(w)).every(Boolean)
                          ? "Accounting checks balanced"
                          : "Accounting discrepancy"}
                      </span>
                      <span>Base year 2023 · modelled outcomes thereafter</span>
                    </div>
                  </div>
                  <aside className="ns-brief">
                    <div className="ns-panel-label">
                      THE CABINET BRIEFING <span>MONTH {w.month}</span>
                    </div>
                    <h2>
                      What needs
                      <br />
                      <em>your attention?</em>
                    </h2>
                    <div className="ns-brief-item">
                      <span className={f!.deficit > 0 ? "amber" : "green"} />
                      <div>
                        <strong>
                          {f!.deficit > 0
                            ? "A budget to finance"
                            : "Fiscal room to manoeuvre"}
                        </strong>
                        <p>
                          Projected monthly balance:{" "}
                          {f!.deficit > 0 ? "deficit" : "surplus"} of{" "}
                          {bn(Math.abs(f!.deficit))}B {profile.currency}, before
                          principal repayments.
                        </p>
                        <button onClick={() => setTab("Budget")}>
                          Review the budget <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="ns-brief-item">
                      <span
                        className={coverage(w, c.code) < 3 ? "amber" : "green"}
                      />
                      <div>
                        <strong>
                          {c.code === "USA"
                            ? "The settlement currency"
                            : "Foreign-exchange resilience"}
                        </strong>
                        <p>
                          {c.code === "USA"
                            ? "USD is the model’s numeraire. Private USD balances fund imports; this does not give the government unlimited spending authority."
                            : `Official reserves: $${bn(money(w, c.code, "reserves"))}B. Coverage: ${bn(coverage(w, c.code), 1)} months of baseline imports.`}
                        </p>
                        <button onClick={() => setTab("Diplomacy")}>
                          Open diplomatic channels <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="ns-brief-item">
                      <span className="green" />
                      <div>
                        <strong>Capacity takes time</strong>
                        <p>
                          Fund a grid, transport, or school project. Spending
                          happens now; capacity benefits arrive after six to
                          eight turns.
                        </p>
                        <button onClick={() => setTab("Infrastructure")}>
                          Plan an investment <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </aside>
                </div>
              )}
              {tab === "Budget" && (
                <section className="ns-two-col">
                  <div className="ns-panel">
                    <div className="ns-panel-label">
                      ANNUAL COMMITMENTS · % OF GDP
                    </div>
                    <h2>
                      Every allocation
                      <br />
                      <em>has a consequence.</em>
                    </h2>
                    <p className="ns-copy">
                      Sliders set annual allocations. Monthly spending depends
                      on available cash and financing; changes take effect on
                      your next turn.
                    </p>
                    {SECTORS.map((sector) => (
                      <label className="ns-budget-row" key={sector}>
                        <span>
                          {SECTOR_LABELS[sector]}
                          <strong>
                            {(c.budget[sector] * 100).toFixed(1)}%{" "}
                            <small>
                              {profile.currency}{" "}
                              {bn((c.gdp * c.budget[sector]) / 12)}B/mo
                            </small>
                          </strong>
                        </span>
                        <input
                          aria-label={SECTOR_LABELS[sector]}
                          type="range"
                          min={0}
                          max={15}
                          step={0.1}
                          value={c.budget[sector] * 100}
                          onChange={(e) => {
                            const value = Number(e.target.value) / 100;
                            update((w) => setBudget(w, sector, value));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <aside className="ns-panel">
                    <div className="ns-panel-label">REVENUE & FINANCING</div>
                    <label className="ns-budget-row">
                      <span>
                        Effective tax take
                        <strong>{(c.tax * 100).toFixed(1)}% of GDP</strong>
                      </span>
                      <input
                        aria-label="Effective tax take"
                        type="range"
                        min={5}
                        max={40}
                        step={0.5}
                        value={c.tax * 100}
                        onChange={(e) => {
                          const v = Number(e.target.value) / 100;
                          update((w) => {
                            w.countries[w.player].tax = v;
                          });
                        }}
                      />
                    </label>
                    <p className="ns-fine">
                      Aggregate tax-revenue proxy, adjusted for collection
                      efficiency. This is not a personal income-tax bracket.
                    </p>
                    <dl className="ns-ledger-summary">
                      <Row
                        name="Expected tax receipts"
                        value={`${bn(f!.tax)}B`}
                      />
                      <Row
                        name="Public allocation"
                        value={`${bn(f!.spend)}B`}
                      />
                      <Row name="Interest due" value={`${bn(f!.interest)}B`} />
                      <Row
                        name="Principal redemptions"
                        value={`${bn(f!.principal)}B`}
                      />
                      <Row
                        name="Public trust · model index"
                        value={`${bn(c.trust ?? 65, 0)}/100`}
                      />
                      <Row
                        name="Primary + interest balance"
                        value={`${f!.deficit > 0 ? "−" : "+"}${bn(Math.abs(f!.deficit))}B`}
                      />
                    </dl>
                    <label className="ns-toggle">
                      <span>
                        Automatic domestic bond auctions
                        <small>
                          Private investors must have the cash. Debt and private
                          bond assets rise together.
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        checked={c.autoBorrow}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          update((w) => {
                            w.countries[w.player].autoBorrow = checked;
                          });
                        }}
                      />
                    </label>
                    <label className="ns-field">
                      Manual bond issue · billions {profile.currency}
                      <input
                        type="number"
                        min="0.01"
                        max={c.gdp * 0.1}
                        step=".1"
                        value={bond}
                        onChange={(e) => setBond(e.target.value)}
                      />
                    </label>
                    <button
                      className="ns-secondary"
                      onClick={() =>
                        update((w) => {
                          const n = Number(bond);
                          if (!Number.isFinite(n) || n <= 0)
                            return "Enter a positive amount.";
                          const raised = issueDomestic(w, w.player, n);
                          return raised > 0
                            ? null
                            : "Investors cannot fund this auction.";
                        })
                      }
                    >
                      Issue funded domestic bonds <Plus size={13} />
                    </button>
                    <p className="ns-fine">
                      Auctions are capped by private liquidity and 10% of GDP
                      per issue. Principal repayments are separate from the
                      deficit.
                    </p>
                  </aside>
                </section>
              )}
              {tab === "Economy" && (
                <section className="ns-two-col">
                  <div className="ns-panel">
                    <div className="ns-panel-label">
                      THE EXPENDITURE ACCOUNT
                    </div>
                    <h2>
                      Output is activity.
                      <br />
                      <em>Not new money.</em>
                    </h2>
                    {r ? (
                      <>
                        <div className="ns-equation">
                          GDP = C + I + G + X − M
                        </div>
                        <dl className="ns-ledger-summary">
                          <Row
                            name="Household consumption · C"
                            value={`${bn(r.c)}B`}
                          />
                          <Row
                            name="Private investment · I"
                            value={`${bn(r.i)}B`}
                          />
                          <Row
                            name="Public purchases & investment · G"
                            value={`${bn(r.g)}B`}
                          />
                          <Row name="Exports · X" value={`${bn(r.x)}B`} />
                          <Row name="Imports · M" value={`−${bn(r.m)}B`} />
                          <Row
                            name="Monthly expenditure GDP"
                            value={`${bn(r.gdp)}B ${profile.currency}`}
                          />
                        </dl>
                      </>
                    ) : (
                      <p className="ns-copy">
                        Advance one month to generate the first expenditure
                        account. Opening GDP is a historical annual observation,
                        not a fabricated monthly transaction.
                      </p>
                    )}
                    <p className="ns-fine">
                      Social transfers and debt repayments are excluded from G.
                      The private sector is aggregated; there is no
                      household-level or bank-credit microsimulation in this
                      release.
                    </p>
                  </div>
                  <aside className="ns-panel">
                    <div className="ns-panel-label">PRICES, WORK & MONEY</div>
                    <dl className="ns-ledger-summary">
                      <Row
                        name="Exchange rate · local per USD"
                        value={bn(c.fx, 3)}
                      />
                      <Row
                        name="Independent policy rate"
                        value={`${bn(c.rate, 2)}%`}
                      />
                      <Row
                        name="Unemployment · model estimate"
                        value={`${bn(c.unemployment, 1)}%`}
                      />
                      <Row
                        name="Consumer price index · start = 100"
                        value={bn(c.cpi * 100, 1)}
                      />
                      <Row
                        name="Energy import price · start = 100"
                        value={bn(w.energy * 100, 1)}
                      />
                      <Row
                        name="Food import price · start = 100"
                        value={bn(w.food * 100, 1)}
                      />
                    </dl>
                    <div className="ns-note">
                      {c.code === "NPL"
                        ? `Peg check: ${bn(c.fx, 3)} NPR/USD = 1.6 × ${bn(w.countries.IND.fx, 3)} INR/USD. Reserve shortages constrain imports; this model does not automatically abandon the peg.`
                        : profile.regime === "union"
                          ? "The government cannot independently set the shared currency area’s policy rate."
                          : c.code === "USA"
                            ? "USD/USD is always 1 by definition. Other exchange rates measure changes against that anchor."
                            : "The managed exchange rate responds to trade pressure, inflation differences, and debt risk. Intervention is not yet a player-controlled instrument."}
                    </div>
                  </aside>
                </section>
              )}
              {tab === "Infrastructure" && (
                <section className="ns-panel">
                  <div className="ns-panel-label">
                    PATIENT CAPITAL / REAL IMPLEMENTATION LAGS
                  </div>
                  <h2>
                    A better economy
                    <br />
                    <em>has to be built.</em>
                  </h2>
                  <div className="ns-project-grid">
                    {(
                      [
                        {
                          kind: "grid",
                          name: "Electricity grid renewal",
                          time: 6,
                          icon: "⌁",
                          detail:
                            "Completion improves infrastructure by 8 points and productive capacity by 2.5%.",
                        },
                        {
                          kind: "transport",
                          name: "National transport corridor",
                          time: 8,
                          icon: "⇄",
                          detail:
                            "Completion improves infrastructure by 8 points and productive capacity by 1.5%.",
                        },
                        {
                          kind: "schools",
                          name: "School renewal programme",
                          time: 6,
                          icon: "⌂",
                          detail:
                            "Completion improves education by 7 points and productive capacity by 1.5%.",
                        },
                      ] as const
                    ).map((p) => (
                      <article key={p.kind}>
                        <span>{p.icon}</span>
                        <h3>{p.name}</h3>
                        <p>{p.detail}</p>
                        <small>
                          {p.time} months · {profile.currency}{" "}
                          {bn(c.gdp * 0.004)}B
                        </small>
                        <button
                          className="ns-secondary"
                          onClick={() => update((w) => startProject(w, p.kind))}
                        >
                          Fund {p.name.toLowerCase()} <ArrowRight size={13} />
                        </button>
                      </article>
                    ))}
                  </div>
                  <div className="ns-project-list">
                    {w.projects
                      .filter((p) => p.country === c.code)
                      .map((p) => (
                        <div key={p.id}>
                          <span>
                            {p.kind} programme
                            <strong>{p.remaining} months remaining</strong>
                          </span>
                          <progress
                            max={p.total}
                            value={p.total - p.remaining}
                          />
                        </div>
                      ))}
                  </div>
                  <p className="ns-fine">
                    Stylized national projects with illustrative cost-benefit
                    coefficients. They are not engineering estimates for a
                    specific real-world project.
                  </p>
                </section>
              )}
              {tab === "Defence" && (
                <section className="ns-two-col">
                  <div className="ns-panel">
                    <div className="ns-panel-label">STRATEGIC RESILIENCE</div>
                    <h2>
                      Readiness takes
                      <br />
                      <em>more than a budget.</em>
                    </h2>
                    <div className="ns-readiness">
                      <Shield size={36} />
                      <strong>
                        {bn(c.readiness, 0)}
                        <small>/100 readiness</small>
                      </strong>
                    </div>
                    <p className="ns-copy">
                      Readiness changes gradually with funded defence spending
                      and cooperation. Scenario conflict shocks reduce readiness
                      resilience without a pact. Spending does not guarantee
                      victory.
                    </p>
                    <dl className="ns-ledger-summary">
                      <Row
                        name="Annual defence allocation"
                        value={`${(c.budget.defence * 100).toFixed(1)}% GDP`}
                      />
                      <Row
                        name="Expected monthly allocation"
                        value={`${bn((c.gdp * c.budget.defence) / 12)}B ${profile.currency}`}
                      />
                      <Row
                        name="Active cooperation pacts"
                        value={String(c.pacts.length)}
                      />
                    </dl>
                    <button
                      className="ns-secondary"
                      onClick={() => setTab("Budget")}
                    >
                      Review defence allocation <ArrowRight size={13} />
                    </button>
                  </div>
                  <aside className="ns-panel">
                    <div className="ns-panel-label">
                      COOPERATION & LIMITATIONS
                    </div>
                    {c.pacts.length ? (
                      c.pacts.map((p) => (
                        <div className="ns-pact" key={p}>
                          <Shield size={18} />
                          <span>
                            {PROFILES[p].flag} {PROFILES[p].name}
                            <small>Open-ended scenario cooperation</small>
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="ns-copy">
                        No defence pacts have been signed. Meet a delegation to
                        negotiate one.
                      </p>
                    )}
                    <button
                      className="ns-primary"
                      onClick={() => {
                        setPartner(c.code === "USA" ? "IND" : "USA");
                        setTab("Diplomacy");
                      }}
                    >
                      Request a diplomatic meeting <ArrowRight size={14} />
                    </button>
                    <div className="ns-note">
                      This release models readiness, budgets, cooperation and
                      fictional external shocks. It does not simulate
                      battlefield operations, casualties, arms inventories,
                      sanctions law, or real treaty obligations.
                    </div>
                  </aside>
                </section>
              )}
              {tab === "Diplomacy" && (
                <section className="ns-diplomacy">
                  <div className="ns-meeting">
                    <div className="ns-panel-label">
                      THE MEETING ROOM <span>LOCAL STRATEGIC AGENT</span>
                    </div>
                    <label className="ns-field">
                      Delegation
                      <select
                        aria-label="Delegation"
                        value={partner === c.code ? "IMF" : partner}
                        onChange={(e) => setPartner(e.target.value as Partner)}
                      >
                        <option value="IMF">IMF-style scenario facility</option>
                        {(Object.keys(PROFILES) as Code[])
                          .filter((p) => p !== c.code)
                          .map((p) => (
                            <option key={p} value={p}>
                              {PROFILES[p].name} · scenario delegation
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="ns-meeting-identity">
                      <span>
                        {partner === "IMF" ? "◈" : PROFILES[partner].flag}
                      </span>
                      <div>
                        <strong>
                          {partner === "IMF"
                            ? "Multilateral financing desk"
                            : `${PROFILES[partner].name} delegation`}
                        </strong>
                        <small>
                          Fictional representatives · no real officials or LLM
                          connected
                        </small>
                      </div>
                    </div>
                    <div className="ns-persona">
                      <span>{agentFor(w, partner).label}</span>
                      <strong>
                        {agentFor(w, partner).name} · fictional delegate
                      </strong>
                      <p>{agentFor(w, partner).description}</p>
                      <small>
                        Assigned for this playthrough, not a claim about this
                        country.
                      </small>
                    </div>
                    <div
                      ref={chatRef}
                      className="ns-chat-log"
                      aria-live="polite"
                    >
                      {w.messages.filter((m) => m.partner === partner)
                        .length ? (
                        w.messages
                          .filter((m) => m.partner === partner)
                          .map((m) => (
                            <div
                              className={m.speaker === "You" ? "you" : "envoy"}
                              key={m.id}
                            >
                              <span>
                                {m.speaker} · Month {m.month}
                              </span>
                              <p>{m.text}</p>
                            </div>
                          ))
                      ) : (
                        <div className="ns-chat-empty">
                          <MessageSquare size={27} />
                          <h3>Start with a shared interest.</h3>
                          <p>
                            Ask about trade, a loan in USD billion, or a defence
                            pact. The agent evaluates the current scenario and
                            may offer structured terms.
                          </p>
                        </div>
                      )}
                    </div>
                    <form
                      className="ns-compose"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const text = message;
                        update((w) => meet(w, partner, text));
                        setMessage("");
                      }}
                    >
                      <label className="ns-field">
                        Your message
                        <textarea
                          aria-label="Your diplomatic message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          maxLength={700}
                          placeholder="Could we discuss a 1 billion USD loan over 36 months?"
                        />
                      </label>
                      <button className="ns-primary" disabled={!message.trim()}>
                        Send to delegation <ArrowUpRight size={14} />
                      </button>
                    </form>
                  </div>
                  <aside className="ns-panel">
                    <div className="ns-panel-label">
                      PROPOSALS & COMMITMENTS
                    </div>
                    <p className="ns-fine">
                      Conversation does not move money or sign agreements.
                      Review terms and accept explicitly. Every settlement is
                      validated atomically against current funds.
                    </p>
                    {w.deals
                      .filter((d) => d.partner === partner)
                      .slice()
                      .reverse()
                      .map((d) => (
                        <article className="ns-deal" key={d.id}>
                          <span>
                            {d.accepted
                              ? "SIGNED"
                              : d.expires < w.month
                                ? "EXPIRED"
                                : "PROPOSED"}{" "}
                            · {d.kind.toUpperCase()}
                          </span>
                          <h3>
                            {d.kind === "loan"
                              ? `USD ${bn(d.amount)}B financing`
                              : d.kind === "pact"
                                ? "Defence cooperation"
                                : "Trade facilitation"}
                          </h3>
                          <p>{d.reason}</p>
                          {d.pricing && (
                            <div className="ns-pricing">
                              <div className="ns-panel-label">
                                TRANSPARENT LOAN PRICING · SCENARIO ASSUMPTIONS
                              </div>
                              <dl>
                                {[
                                  ["USD funding cost", d.pricing.funding],
                                  [
                                    "Expected-loss spread",
                                    d.pricing.lossSpread,
                                  ],
                                  ["Liquidity & maturity", d.pricing.liquidity],
                                  [
                                    "Personality adjustment",
                                    d.pricing.personality,
                                  ],
                                  [
                                    "Relationship discount",
                                    d.pricing.relationship,
                                  ],
                                ].map(([name, value]) => (
                                  <Row
                                    key={name}
                                    name={String(name)}
                                    value={`${(Number(value) * 100).toFixed(2)} pp`}
                                  />
                                ))}
                                <Row
                                  name="First monthly payment"
                                  value={`USD ${bn(d.pricing.firstPaymentUSD, 4)}B`}
                                />
                                <Row
                                  name="Lifetime interest · scheduled"
                                  value={`USD ${bn(d.pricing.totalInterestUSD, 4)}B`}
                                />
                                <Row
                                  name="Upfront domestic advisory outlay"
                                  value={`USD equiv. ${bn(d.feeUSD ?? 0, 4)}B`}
                                />
                                <Row
                                  name="Borrower interest + outlay"
                                  value={`USD equiv. ${bn(d.pricing.totalCostUSD, 4)}B`}
                                />
                                <Row
                                  name={
                                    c.code === "USA"
                                      ? "No FX mismatch: USD payment"
                                      : "+20% FX stress: first payment"
                                  }
                                  value={`${profile.currency} ${bn(d.pricing.stressPaymentLocal, 4)}B`}
                                />
                                <Row
                                  name="Debt-service / tax receipts"
                                  value={`${bn(d.pricing.serviceRatio * 100, 1)}%`}
                                />
                              </dl>
                              <p className="ns-fine">
                                Equal-principal amortization. Lifetime cost
                                assumes timely repayment and unchanged FX; the
                                stress case is a sensitivity, not a forecast.
                                Risk premiums are illustrative, not live bank
                                quotes.
                              </p>
                            </div>
                          )}

                          {d.kind === "loan" && (
                            <dl>
                              <Row
                                name="Annual interest"
                                value={`${bn(d.rate * 100)}%`}
                              />
                              <Row
                                name="Repayment term"
                                value={`${d.term} months`}
                              />
                            </dl>
                          )}
                          <button
                            className="ns-secondary"
                            disabled={d.accepted || d.expires < w.month}
                            onClick={() => update((w) => acceptDeal(w, d.id))}
                          >
                            {d.accepted
                              ? "Agreement signed"
                              : "Accept reviewed proposal"}{" "}
                            <Check size={13} />
                          </button>
                        </article>
                      ))}
                  </aside>
                </section>
              )}
              {tab === "Ledger" && (
                <section className="ns-panel">
                  <div className="ns-panel-label">
                    AN AUDITABLE STATE / NOT A BLACK BOX
                  </div>
                  <h2>Follow the money.</h2>
                  <div className="ns-audits">
                    {Object.entries(identities(w)).map(([name, ok]) => (
                      <span key={name} className={ok ? "pass" : "fail"}>
                        <Check size={13} />
                        {name} {ok ? "balanced" : "FAILED"}
                      </span>
                    ))}
                  </div>
                  <div className="ns-table-scroll">
                    <table className="ns-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Transaction</th>
                          <th>From → to</th>
                          <th>Amount · billions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {w.book.entries
                          .filter(
                            (e) =>
                              e.from.startsWith(c.code) ||
                              e.to.startsWith(c.code),
                          )
                          .slice(0, 70)
                          .map((e) => (
                            <tr key={e.id}>
                              <td>{e.month}</td>
                              <td>{e.memo}</td>
                              <td>
                                {e.from} → {e.to}
                              </td>
                              <td>
                                {e.currency} {bn(e.units / SCALE, 6)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <h3>External loan book</h3>
                  <div className="ns-table-scroll">
                    <table className="ns-table">
                      <thead>
                        <tr>
                          <th>Creditor</th>
                          <th>Principal · USD B</th>
                          <th>Interest due · USD B</th>
                          <th>Rate</th>
                          <th>Missed payments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {w.loans
                          .filter((l) => l.borrower === c.code)
                          .map((l) => (
                            <tr key={l.id}>
                              <td>{l.lender}</td>
                              <td>{bn(l.outstanding)}</td>
                              <td>{bn(l.interestDueUSD)}</td>
                              <td>{bn(l.rate * 100)}%</td>
                              <td>{l.arrears}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="ns-fine">
                    Cash uses integer micro-billions (1 unit = 1,000 currency
                    units). Loan principal and economic indices use
                    floating-point values. The most recent 500 transfer legs are
                    retained; currency-stock checks use all account balances.
                  </p>
                </section>
              )}
              {tab === "Model" && (
                <section className="ns-two-col">
                  <div className="ns-panel">
                    <div className="ns-panel-label">
                      MODEL CARD / READ BEFORE INTERPRETING
                    </div>
                    <h2>
                      Consistent accounting.
                      <br />
                      <em>Explicit assumptions.</em>
                    </h2>
                    {ASSUMPTIONS.map((text, i) => (
                      <div className="ns-assumption" key={i}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <p>{text}</p>
                      </div>
                    ))}
                    <a
                      className="ns-text"
                      href="/state-sim/SOURCES.md"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Baseline provenance & sources ↗
                    </a>
                  </div>
                  <aside className="ns-panel">
                    <div className="ns-panel-label">
                      YOUR MANDATE, YOUR RECORD
                    </div>
                    <p className="ns-copy">
                      This mode uses its own local IndexedDB save and a
                      previous-good backup. No idle time is simulated; policy
                      advances only when you choose a turn.
                    </p>
                    <button className="ns-secondary" onClick={exportFile}>
                      <Download size={14} /> Export mandate JSON
                    </button>
                    <button
                      className="ns-secondary"
                      onClick={() => file.current?.click()}
                    >
                      <Upload size={14} /> Import validated mandate
                    </button>
                    <button
                      className="ns-text"
                      onClick={() => {
                        exportFile();
                        setNewMandate(true);
                      }}
                    >
                      Export backup & choose a new scenario{" "}
                      <ArrowRight size={13} />
                    </button>
                    <div className="ns-note">
                      Still outside this release: private banks and credit
                      creation, household inequality, real elections, detailed
                      sanctions, sovereign restructuring, a globally calibrated
                      commodity market, live data, and LLM-powered leaders.
                      Accounting tests alone do not establish predictive
                      accuracy.
                    </div>
                    <p className="ns-fine">
                      Current scenario endpoint: 1,200 monthly turns. Historical
                      charts retain the latest 60 months.
                    </p>
                  </aside>
                </section>
              )}
              <section className="ns-events">
                <div className="ns-panel-label">
                  THE NATIONAL RECORD <span>YOUR LATEST BRIEFINGS</span>
                </div>
                {w.events.slice(0, 5).map((e) => (
                  <div key={e.id}>
                    <span
                      className={e.severity === "warning" ? "amber" : "green"}
                    />
                    <p>{e.text}</p>
                    <small>M{e.month}</small>
                  </div>
                ))}
              </section>
            </>
          )
        )}
        <footer className="ns-footer">
          <span>
            nation state <small>BY ORBIT STUDIO</small>
          </span>
          <span>Decisions have consequences. Models have limits.</span>
          <span>Historical baselines · Scenario outcomes</span>
        </footer>
      </main>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) void importFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {notice && (
        <div className="ns-toast" role="status">
          <p>{notice}</p>
          <button
            aria-label="Dismiss Nation State notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Metric({
  title,
  value,
  note,
  values,
  alert = false,
}: {
  title: string;
  value: string;
  note: string;
  values: number[];
  alert?: boolean;
}) {
  return (
    <article className={`ns-metric ${alert ? "alert" : ""}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
      <Sparkline
        values={values}
        label={`${title} monthly history`}
        color={alert ? "#bd926d" : "#709b8c"}
      />
    </article>
  );
}
function Row({ name, value }: { name: string; value: string }) {
  return (
    <div>
      <dt>{name}</dt>
      <dd>{value}</dd>
    </div>
  );
}
