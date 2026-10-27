# Nation State: model card and implementation guide

Nation State (`/nation-state`) is an auditable monthly policy sandbox, not a validated economic forecasting system. It is separate from Nation Rise and Nation Tycoon and does not change their saves. Begin a US, Indian or Nepalese mandate. Germany and Saudi Arabia are additional strategic counterparties. All five economies settle transactions and service debt each month.

## Data and starting conditions

Historical 2023 nominal GDP in current US dollars and population are preserved in `src/state-sim/baselines.json`. See `/state-sim/SOURCES.md` for the World Bank indicator attribution and datasets-mirror URLs. The retrieved mirror values may differ from newer World Bank revisions.

Initial fiscal ratios, exchange-rate levels, debt composition, reserves, policy rates and behavioral coefficients are illustrative calibration. They are **not** a full reconstruction of actual national accounts. Country maps use the existing Natural Earth mainland polygons; map dots and indices are illustrative national observatory markers, not provincial statistics.

## Units and accounting

- Displayed monetary flows are billions of the named currency, or explicitly USD billion.
- Cash balances are integer micro-billions (one unit = 1,000 currency units). Opening stocks are explicit and fixed per currency.
- Each settlement leg debits one funded account and credits another account in the **same currency**. Bundles preflight completely; any failed leg rejects the bundle without changing balances or history.
- Accounts represent treasury, aggregate private sector, funded domestic FX settlement counterparty, and official USD reserves. Funded IMF-style and global-creditor USD accounts are separate.
- Cross-border purchases combine a local-currency purchase of FX, an actual USD payment, and a local-currency credit to the exporter. USD domestic payers/receivers settle in their own currency directly. Insufficient reserves or counterparty funds constrain trade.
- Domestic bond auctions transfer existing private cash to government and create matching public liabilities/private bond assets. Principal redemption reverses the claim. Interest transfers are separate.
- External loan contracts are authoritative records of the borrower liability and creditor claim. Amortization is equal-principal, with interest on outstanding principal. Missed interest is retained as an obligation, and missed principal installments accumulate for catch-up. Debt ratios include local-currency FX revaluation.
- Monthly expenditure GDP is `C + I + G + X − M`. It measures output, not new money. Transfers and debt repayments are excluded from public purchases. Prepaid project and agreement-administration costs enter the following closed period’s purchases.

This aggregate model does not implement private banks, loan-created deposits, household distribution, a full international investment position, or unconstrained central-bank issuance. Stock conservation applies to its modeled accounts; it does not imply that real-world money supply is fixed.

## Government and economy

Budget sliders are annual shares of GDP, disbursed monthly subject to cash and financing. Effective tax take is a revenue/GDP proxy with country-specific collection efficiency, not an individual tax schedule. Automatic bond auctions may fund the gap, but private investors must actually hold the money. The preview includes debt principal in the cash requirement; principal is excluded from the deficit.

Public investment has explicit six/eight-month lead times. Current health, education, infrastructure and defence allocations affect indices gradually. Private consumption and investment follow documented coefficients in `model.ts`; capacity, rate changes relative to the starting policy rate, trust and funding shortfalls affect confidence. Prices respond to scheduled food/energy shocks, depreciation, and infrastructure constraints. These coefficients require empirical validation before any predictive claim.

USD is the numeraire. INR responds to trade, inflation and debt pressure. NPR follows INR at 1.6, SAR follows USD at 3.75. EUR floats against USD, with an externally specified shared monetary-policy rate. Player governments cannot directly set independent policy rates. Banking, private lending, tariffs, detailed commodity inventories, sovereign restructuring and current news are outside this release.

Scenario shocks occur on fixed turns: poor harvest at month 3, energy shipping disruption at month 6, fictional regional conflict at month 9. This is not a live account of actual wars. Defence models budgets, readiness and cooperation—not battlefield operations or casualty forecasts.

## Fictional strategic agents

Delegates are **local rule/utility-based agents**, not GPT, Claude, actual officials, or a connected LLM. A random mandate seed assigns four distinct styles to the non-player countries, reproducibly within that save:

- Avery Cole: fiscal disciplinarian, shorter maturities and tighter debt/service limits.
- Mira Vale: pragmatic negotiator, flexible maturities and a small bounded counteroffer discount.
- Ivo Mercer: patronage-driven official, extra publicly recorded advisory procurement benefiting domestic private intermediaries. Accepting reduces public trust by four points. This is fictional corruption, not a claim about the represented country or a payment to an actual politician.
- Jonas Reed: security-first negotiator, requires defence funding of at least 2% of GDP.
- The IMF-style programme desk uses published scenario conditions, not actual IMF rules or staff.

Free-text messages recognize financing, trade, security, and limited counteroffer intents. Unknown requests receive a state-grounded agenda explanation; this is not general-purpose language understanding. Chat alone cannot transfer money or sign commitments. Proposals expire after three turns and are revalidated on explicit acceptance. Trade agreements last 24 months; defence cooperation is open-ended in this release.

## Loan calculations

`agents.ts` publishes every component:

1. USD funding opportunity cost = simulated US policy rate + 0.5 percentage point; the illustrative multilateral facility uses a fixed 4.5% rate.
2. A bounded default-risk **proxy** uses debt, fiscal pressure, reserve coverage and trust. This is not a credit rating or validated default probability.
3. Expected-loss premium = `proxy × 45% / (1 − proxy)` (illustrative loss given default).
4. Add maturity/liquidity and personality premiums; subtract the relationship adjustment. Apply a 2% floor and 25% ceiling.
5. Reject terms outside the delegate’s projected debt/GDP, debt-service/tax, liquidity and maturity limits. With automatic domestic auctions, affordability excludes rolled domestic principal but retains external principal.

For principal `P`, annual rate `r`, and `n` months:

- Monthly principal: `P/n`.
- Interest in month `t`: `(P − (t−1)P/n) × r/12`.
- First payment: `P/n + Pr/12`.
- Total scheduled interest: `Pr(n+1)/24`.
- Local payment: USD payment × current local units/USD.
- FX stress: local payment × 1.2 for a USD borrower with a non-USD home currency. A USD/USD obligation has no self-exchange-rate mismatch.

Lifetime interest assumes no arrears and unchanged terms. Risk spread, stress scenarios and personal negotiation rules are game assumptions, not live lending quotes. Patronage fees are additional funded local procurement with no infrastructure benefit, not hidden off-ledger money.

## Saves and validation

Separate IndexedDB keys: `nation-state:save` and `nation-state:backup`. Writes are serialized. Loading and JSON import validate structure, finite values, currency balances, domestic bond claims, external loan limits and GDP identities. A previous-good backup can recover a corrupted primary save. No offline months or automatic policy decisions are simulated. The scenario endpoint is 1,200 monthly turns. Reports retain 60 months and the ledger retains 500 recent legs.

## Verification and remaining work

Unit tests cover atomic rollback, currency conservation, ten-year runs for all starters, GDP identities, pegs, reserve-constrained settlement, funded auctions, project lead times, arrears, proposal acceptance, seeded personalities, amortization, patronage costs, policy conditions and save rejection. Browser tests cover budgeting, negotiations, signing, turns, persistence, export and phone layouts.

Passing accounting tests establishes internal consistency, not real-world predictive accuracy. Historical backtesting, richer price formation, private banking, political institutions/elections, multilateral programme reviews, more countries, and a secure server-side LLM conversation layer remain future work. No AI API key or external model provider is configured.
