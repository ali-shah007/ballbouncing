import { Code, PROFILES, SECTORS } from "./scenarios";
import { coverage, debt, Deal, event, World, forecast } from "./model";
import { agentFor, loanEligibility, priceLoan } from "./agents";
export type Partner = Code | "IMF";
export function meet(w: World, partner: Partner, text: string) {
  if (partner === w.player || (partner !== "IMF" && !PROFILES[partner]))
    return "Choose another delegation.";
  const message = text.trim().slice(0, 700);
  if (!message) return "Write a message to begin.";
  w.messages.push({
    id: w.nextId++,
    month: w.month,
    partner,
    speaker: "You",
    text: message,
  });
  const c = w.countries[w.player],
    agent = agentFor(w, partner),
    ratio = debt(w, c.code) / c.gdp,
    months = coverage(w, c.code),
    previous = w.deals
      .filter(
        (d) =>
          d.partner === partner &&
          d.kind === "loan" &&
          !d.accepted &&
          d.expires >= w.month,
      )
      .at(-1);
  let response = "",
    proposal: Deal | undefined;
  const counter =
    /lower|reduce|discount|cheaper|better terms/i.test(message) && !!previous;
  if (/loan|lend|financ|borrow|credit|imf/i.test(message) || counter) {
    const match = message.match(/(\d+(?:\.\d+)?)\s*(?:billion|bn)\b/i),
      principal = match
        ? Number(match[1])
        : counter
          ? previous!.amount
          : (c.gdp / c.fx) * 0.01,
      termMatch = message.match(/(\d+)\s*months/i),
      term = Math.max(
        12,
        Math.min(
          agent.maxTerm,
          termMatch ? Number(termMatch[1]) : counter ? previous!.term : 36,
        ),
      );
    const pricing = priceLoan(w, partner, principal, term),
      primaryGap = SECTORS.reduce((n, s) => n + c.budget[s], 0) - c.tax;
    if (counter && agent.style === "pragmatic") {
      const originalPayment = pricing.firstPaymentUSD;
      pricing.personality -= 0.001;
      pricing.rate = Math.max(0.02, pricing.rate - 0.001);
      pricing.firstPaymentUSD =
        principal / term + (principal * pricing.rate) / 12;
      pricing.totalInterestUSD =
        (((principal * pricing.rate) / 12) * (term + 1)) / 2;
      pricing.totalCostUSD = pricing.totalInterestUSD + pricing.feeUSD;
      pricing.serviceRatio +=
        ((pricing.firstPaymentUSD - originalPayment) * c.fx) /
        Math.max(0.001, forecast(w, c.code).tax);
      pricing.stressPaymentLocal =
        pricing.firstPaymentUSD * c.fx * (c.code === "USA" ? 1 : 1.2);
      pricing.npvUSD = 0 - principal;
      for (let i = 1; i <= term; i++)
        pricing.npvUSD +=
          (principal / term +
            ((principal - ((i - 1) * principal) / term) * pricing.rate) / 12) /
          Math.pow(1 + pricing.funding / 12, i);
    }
    if (counter && agent.style === "patronage") {
      pricing.feeUSD *= 0.75;
      pricing.totalCostUSD = pricing.totalInterestUSD + pricing.feeUSD;
    }
    const blocked = loanEligibility(w, partner, principal, term, pricing.rate);
    if (blocked)
      response = `${agent.name}: ${blocked} Current debt is ${(ratio * 100).toFixed(1)}% of GDP. A smaller tranche or longer permitted maturity may improve affordability.`;
    else if (partner === "IMF" && (c.tax < 0.17 || primaryGap > 0.08))
      response =
        "This scenario facility requires effective tax take ≥17% of GDP and a primary spending gap ≤8% of GDP. Change policy yourself, then return; I cannot silently rewrite your budget.";
    else if (counter && agent.style === "strict")
      response = `Our fiscal mandate is binding. I am not reducing the risk premium without a change in repayment capacity. Projected debt-service use is ${(pricing.serviceRatio * 100).toFixed(1)}% of tax receipts. You may review the existing offer or request a smaller loan.`;
    else {
      proposal = {
        id: w.nextId++,
        kind: "loan",
        partner,
        amount: principal,
        rate: pricing.rate,
        term,
        expires: w.month + 3,
        accepted: false,
        feeUSD: pricing.feeUSD,
        personality: agent.label,
        pricing,
        reason:
          partner === "IMF"
            ? "Conditional scenario financing: equal monthly principal plus interest on the outstanding balance. Eligibility is rechecked at signature; this is not an actual IMF programme."
            : `${agent.label}. Funding cost and modelled credit risk determine the offer.${pricing.feeUSD > 0 ? " Includes a disclosed domestic patronage advisory outlay. Public trust falls by 4 points, with no productive-capacity benefit." : ""}`,
      };
      response = `${agent.name}: ${agent.style === "strict" ? "Repayment discipline comes first." : agent.style === "pragmatic" ? "Let’s find terms that work for both sides." : agent.style === "security" ? "Reliable security commitments support a durable partnership." : "Our preferred advisory network must be included in the package."} I offer USD ${principal.toFixed(2)} billion for ${term} months at ${(pricing.rate * 100).toFixed(2)}% annual interest. First monthly payment: USD ${pricing.firstPaymentUSD.toFixed(4)}B. Scheduled lifetime interest: USD ${pricing.totalInterestUSD.toFixed(4)}B.${pricing.feeUSD > 0 ? ` Additional domestic advisory outlay: USD-equivalent ${pricing.feeUSD.toFixed(4)}B at signing. This is publicly recorded, not an off-ledger payment.` : ""} These are model terms, not a real market quote. Review and explicitly accept before anything is executed.`;
    }
  } else if (/defen[cs]e|pact|alliance|secur|military/i.test(message)) {
    if (partner === "IMF")
      response =
        "This institution has no defence mandate. Please meet a country delegation.";
    else if ((c.relations[partner] || 0) < 35)
      response =
        "Relations are below our cooperation threshold. We are not offering a pact.";
    else if (agent.style === "security" && c.budget.defence < 0.02)
      response =
        "Security cooperation needs credible funding. Allocate at least 2% of GDP to defence before we consider a pact.";
    else {
      const pct = agent.style === "patronage" ? 0.15 : 0.05;
      proposal = {
        id: w.nextId++,
        kind: "pact",
        partner,
        amount: 0,
        rate: 0,
        term: 0,
        expires: w.month + 3,
        accepted: false,
        personality: agent.label,
        reason: `Open-ended scenario cooperation. Implementation costs ${pct.toFixed(2)}% of GDP.${agent.style === "patronage" ? " Includes politically connected domestic advisory procurement; signing lowers public trust by 4 points." : ""} Improves readiness resilience, not an automatic military victory.`,
      };
      response = `${agent.name}: ${proposal.reason} Review your budget before signing.`;
    }
  } else if (/trad|export|import|tariff|supply|energy/i.test(message)) {
    if (partner === "IMF")
      response =
        "Trade agreements are negotiated with governments. I can discuss financing instead.";
    else {
      const pct = agent.style === "patronage" ? 0.03 : 0.01;
      proposal = {
        id: w.nextId++,
        kind: "trade",
        partner,
        amount: 0,
        rate: 0,
        term: 24,
        expires: w.month + 3,
        accepted: false,
        personality: agent.label,
        reason: `24-month facilitation agreement. Upfront administration costs ${pct.toFixed(2)}% of GDP; eligible bilateral demand rises 6%, subject to supplies and reserves.${agent.style === "patronage" ? " Patronage procurement is included: public trust falls by 4 points." : ""}`,
      };
      response = `${agent.name}: ${agent.style === "strict" ? "Rules and settlement capacity must be respected." : agent.style === "pragmatic" ? "Reliable deliveries can benefit both economies." : agent.style === "security" ? "Dependable supply routes are strategically useful." : "Our connected advisory programme must be funded."} ${proposal.reason} This does not create goods or guarantee exports.`;
    }
  } else
    response = `${agent.name} — ${agent.label}: ${agent.description} Your current debt is ${(ratio * 100).toFixed(1)}% of GDP; inflation is ${c.inflation.toFixed(1)}%; ${Number.isFinite(months) ? `reserves cover ${months.toFixed(1)} months of baseline imports` : "USD is the settlement numeraire"}. Ask about a loan in USD billion, trade, or a defence pact. I am a fictional local strategic agent, not a language model or a real official.`;
  w.messages.push({
    id: w.nextId++,
    month: w.month,
    partner,
    speaker: "Envoy",
    text: response,
  });
  w.messages = w.messages.slice(-80);
  if (proposal) w.deals.push(proposal);
  w.deals = w.deals.slice(-60);
  event(
    w,
    `Meeting with ${agent.name} concluded${proposal ? ": a proposal is ready for review" : ""}.`,
  );
  return null;
}
