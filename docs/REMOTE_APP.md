# Universal Remote — Architecture & AI Integration

Build #1 from the [iOS market analysis](./IOS_APP_MARKET_ANALYSIS.md): a universal
TV remote that out-executes the ~$1M/mo incumbents (TV Remote, Screen Mirroring
apps) on two fronts — honest pricing, and a headline feature none of them have:
**any AI agent can take over your screens.** Point Siri, Claude, ChatGPT, Kimi,
or your own agent at the TV and say "open Netflix and search for Dune on the
living room TV" — the Tony-Stark-takes-over-the-courtroom-screens moment.

This document describes the control core and the agent layer that ships in
`src/remote/`. It is framework-agnostic TypeScript with full unit tests; the
React UI and native iOS bridge sit on top of it.

## Why this is fast to build (and to monetize)

The incumbents charge $5.99/mo for buttons that wrap **free, open protocols**:

- **Roku** exposes the External Control Protocol (ECP) — plain unauthenticated
  HTTP on port 8060. Fully implemented here (`connectors/roku.ts`).
- **Samsung** Tizen TVs accept commands over a WebSocket on port 8002.
  Implemented here (`connectors/samsung.ts`).
- **LG webOS, Android TV / Google TV, Fire TV, Chromecast/DIAL** follow the same
  pattern — a connector per brand behind one interface.

Per-scan/per-command cost is effectively zero, so honest pricing
($9.99–19.99/yr, or a one-time purchase) still has ~99% margin while undercutting
the weekly-subscription fleeceware.

## Layered design

```
            ┌──────────────────────────────────────────────┐
            │  Agent surfaces (one command registry)        │
            │  • MCP server  (Claude, ChatGPT, Kimi, …)     │  agent/mcp.ts
            │  • Siri / App Intents                         │  agent/intents.ts
            │  • Natural-language planner (Claude adapter)  │  agent/nl.ts
            └───────────────────────┬──────────────────────┘
                                    │  AGENT_COMMANDS (agent/commands.ts)
            ┌───────────────────────▼──────────────────────┐
            │  TvController — one high-level surface         │  agent/controller.ts
            │  (the touch UI uses this too)                 │
            └───────────────────────┬──────────────────────┘
                                    │  TvConnector interface
            ┌───────────────────────▼──────────────────────┐
            │  Per-brand connectors                         │  connectors/*
            │  Roku (HTTP/ECP) · Samsung (WebSocket) · …    │
            └───────────────────────┬──────────────────────┘
                                    │
            ┌───────────────────────▼──────────────────────┐
            │  Discovery (SSDP via pluggable transport)     │  discovery.ts
            └──────────────────────────────────────────────┘
```

The key idea: **one canonical command registry** (`AGENT_COMMANDS`) is the single
source of truth for what an agent can do. The MCP tool list, the Siri intents,
and the Claude tool definitions are all *generated* from it, so adding a
capability once exposes it to every agent surface at the same time.

## The AI control layer

### MCP — works with any agent that speaks the protocol

`createMcpTvServer(controller)` returns `{ tools, call }`:

```ts
import { TvController, createConnector, createMcpTvServer } from "./remote";

const controller = new TvController((d) => createConnector(d));
controller.addDevices(await discoverDevices(transport));

const tv = createMcpTvServer(controller);
// tv.tools  → hand to an MCP server's tools/list handler
// tv.call(name, args) → hand to its tools/call handler
```

Drop `tv.tools` / `tv.call` into a stdio or HTTP MCP server process and Claude
Desktop, ChatGPT connectors, or any MCP client can drive the TV directly.

### Natural language — Claude adapter (provider-agnostic)

`NaturalLanguageController` is the seam. `ClaudeController` is one implementation
(Anthropic Messages API, model `claude-opus-4-8`, tools = the command registry);
ChatGPT/Kimi/local models are just other implementations of the same interface.

```ts
import { ClaudeController, runNaturalLanguage } from "./remote";

// In production, point baseUrl at a backend proxy that injects the key —
// never ship an API key inside the distributed app.
const planner = new ClaudeController({ apiKey, baseUrl: "/api/agent" });

await runNaturalLanguage(
  planner,
  controller,
  "turn on the living room TV and play Dune on Netflix",
);
```

`runNaturalLanguage` asks the model to plan a sequence of canonical commands,
then executes them in order against the controller, stopping at the first
failure.

### Siri / Shortcuts

`buildAppIntents()` produces declarative `AppIntentSpec`s from the command
registry. The native iOS layer registers these as App Intents so the same
actions are available to Siri and the Shortcuts app — the bridge is a thin
generated mapping rather than a hand-maintained duplicate.

## Security notes

- **Never ship the Anthropic API key in the client.** `ClaudeController` takes a
  `baseUrl` precisely so production points it at a small backend proxy that holds
  the key; the test suite injects a fake `fetch`.
- TV protocols here are LAN-only and (Roku) unauthenticated by design — this app
  controls devices on the user's own network, the same as the physical remote.

## What's implemented vs. next

| Area | Status |
|---|---|
| Roku connector (ECP) | ✅ complete + tested |
| Samsung connector (WebSocket) | ✅ implemented (message-building tested) |
| TvController + command registry | ✅ complete + tested |
| MCP tool surface | ✅ complete + tested |
| Claude NL adapter + executor | ✅ complete + tested |
| Siri App Intents metadata | ✅ generated from registry |
| SSDP discovery core | ✅ logic done; needs a native UDP transport |
| LG / Android TV / Fire TV connectors | ⬜ next (same interface) |
| React remote UI | ⬜ next |
| Native iOS bridge (UDP discovery, App Intents, WoL) | ⬜ next |

## Tests

```
npm run test   # connectors, controller, command registry, MCP, NL planner
npm run build  # strict type-check + production build
```
