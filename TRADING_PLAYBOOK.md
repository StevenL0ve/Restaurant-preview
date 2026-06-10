# Agentic Trading Playbook

Standing instructions for the Robinhood **Agentic** account (••••4357) — a taxable
individual cash account. This file is the source of truth so any future session
picks up where we left off. Memory does not persist on its own; this file does.

_Last updated: 2026-06-09_

## How we operate (the principle)
The broker and Robinhood do the always-on watching; the AI is just the hands when
pinged. **No plan ships without its trigger (a price alert) and its pre-approved
action defined.** The AI is NOT an always-on monitor — it only acts when invoked in
a session, and the environment is ephemeral. Do not rely on the AI to watch prices.

Reliable layers:
1. **Resting GTC limit orders** at the broker — auto-execute 24/7, no AI needed.
2. **Robinhood price alerts** — always-on; they notify the user, who then pings the AI.
3. **The AI** — handles only what can't rest at the broker (fractional sells) and the
   redeploy buys, when pinged.

## Cost basis (entry 2026-06-08; short-term until 2026-06-09-2027)
| Symbol | Shares    | Avg cost | Notes |
|--------|-----------|----------|-------|
| NVDA   | 0.957716  | $208.83  | AI hardware |
| PLTR   | 1.108156  | $135.36  | AI software |
| BTSG   | 2.571218  | $58.34   | healthcare small-cap (illiquid) |
| VOO    | 0.292487  | $683.79  | broad core (bought 6/9) |
| XLF    | 3.800843  | $52.62   | financials (bought 6/9) |

## Sell rules (NO stop-losses — hold through dips, take profit on strength)
Tax-adjusted targets (~+3% above original to offset short-term tax drag).

| Symbol | Target | Resting GTC order | Manual piece (needs AI) |
|--------|--------|-------------------|--------------------------|
| NVDA   | $247   | none — fractional can't rest | sell all 0.957716 sh (market, when alert fires) |
| PLTR   | $167   | 1 sh resting @ $167 (live)   | sell 0.108156 remainder |
| BTSG   | $69    | 2 sh resting @ $69 (live)    | sell 0.571218 remainder |

Note: Robinhood rejects limit orders with fractional quantities. Whole shares rest at
the broker; fractional remainders must be market-sold by the AI when the alert fires.
BTSG is illiquid — prefer care on fills.

## Robinhood price alerts (set by user)
- NVDA $247.00  ·  PLTR $167.00  ·  BTSG $69.00
When one fires, user pings the AI with which symbol hit.

## Pre-approved redeploy (execute on ping — no re-approval needed)
| Trigger      | Manual sell        | ~Proceeds | Redeploy into |
|--------------|--------------------|-----------|----------------|
| NVDA $247    | 0.957716 sh        | ~$236     | **VOO** |
| PLTR $167    | 0.108156 remainder | ~$185 tot | **QQQ** |
| BTSG $69     | 0.571218 remainder | ~$177 tot | **VXUS** |

Strategy = de-risk single-name AI/growth after a run-up, but stay growth-exposed
(QQQ, not pure value). End state target: VOO + QQQ + XLF + VXUS — broad core,
retained growth tilt, financials lean, international exposure.

## AI execution protocol (every time)
1. Pull live account state; confirm the fill and that buying power has settled (~1
   trading day).
2. Run the broker pre-trade review; show the verbatim market-data disclosure.
3. Place the dollar-based market buy sized to ACTUAL proceeds; report the fill.
4. Pause for approval ONLY if reality has drifted: redeploy target up >5%, partial
   fill, or clearly dislocated market. Otherwise execute and report.

## Tax notes
- Taxable account; gains held <1yr are short-term (ordinary income, ~22-24% assumed).
- Set aside ~25% of realized gains for taxes (nothing withheld).
- Don't let the tax tail wag the dog at this account size (~$7 of drag on this plan).
- Roth IRA (••••6573) would shelter gains but is NOT agentic-enabled — can't trade it.
- Wash-sale rules apply to losses only; not relevant to this profit-taking plan.

## Hard limits / honesty notes
- The AI cannot reliably monitor the account continuously. Broker orders + Robinhood
  alerts are the always-on layer; the AI is best-effort when pinged.
- Real money, irreversible. The brokerage tool requires a per-order review; blanket
  authorization does not bypass the review step.
