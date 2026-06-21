// Universal TV remote — public surface.
//
// Two layers:
//   1. Device control:  types, TvConnector, per-brand connectors, discovery.
//   2. Agent control:   TvController + a canonical command registry exposed to
//      MCP (Claude/ChatGPT/any agent), Siri App Intents, and a natural-language
//      planner. One command registry powers every surface.

export * from "./types";
export * from "./connector";
export * from "./discovery";
export {
  createConnector,
  SUPPORTED_BRANDS,
  type ConnectorDeps,
} from "./connectors";

export {
  TvController,
  matchApp,
  type ConnectorFactory,
  type NavDirection,
} from "./agent/controller";
export {
  AGENT_COMMANDS,
  getCommand,
  runCommand,
  type AgentCommand,
  type AgentCommandResult,
  type JsonSchema,
} from "./agent/commands";
export {
  createMcpTvServer,
  listMcpTools,
  callMcpTool,
  type McpTool,
  type McpToolResult,
  type McpTvServer,
} from "./agent/mcp";
export {
  ClaudeController,
  runNaturalLanguage,
  commandsToClaudeTools,
  extractPlan,
  type NaturalLanguageController,
  type PlannedCommand,
  type NlRunResult,
  type ClaudeControllerOptions,
} from "./agent/nl";
export { buildAppIntents, type AppIntentSpec } from "./agent/intents";
