import type { TvController } from "./controller";
import {
  AGENT_COMMANDS,
  runCommand,
  type AgentCommand,
  type JsonSchema,
} from "./commands";

// Model Context Protocol (MCP) is the universal way to expose the TV to ANY
// agent that speaks it — Claude Desktop, ChatGPT's connectors, Kimi, and others.
// This module turns the canonical command registry into MCP tool definitions and
// a dispatcher. It deliberately has no MCP-SDK dependency: it returns plain tool
// specs + a handler that an MCP server process (stdio or HTTP) wires up. That
// keeps it buildable inside the Capacitor app and unit-testable.

/** An MCP tool definition, matching the MCP `tools/list` result shape. */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

/** The result shape MCP expects from `tools/call`. */
export interface McpToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

function toMcpTool(command: AgentCommand): McpTool {
  return {
    name: command.name,
    description: command.description,
    inputSchema: command.parameters,
  };
}

/** Generate the MCP `tools/list` payload from the command registry. */
export function listMcpTools(commands: AgentCommand[] = AGENT_COMMANDS): McpTool[] {
  return commands.map(toMcpTool);
}

/** Handle an MCP `tools/call` by executing the matching command. */
export async function callMcpTool(
  controller: TvController,
  name: string,
  args: Record<string, unknown> = {},
): Promise<McpToolResult> {
  const result = await runCommand(controller, name, args);
  return {
    content: [{ type: "text", text: result.message }],
    isError: !result.ok,
  };
}

/**
 * A self-contained MCP tool surface for a controller: hand `tools` to an MCP
 * server's list handler and `call` to its call handler.
 */
export interface McpTvServer {
  tools: McpTool[];
  call(name: string, args?: Record<string, unknown>): Promise<McpToolResult>;
}

export function createMcpTvServer(
  controller: TvController,
  commands: AgentCommand[] = AGENT_COMMANDS,
): McpTvServer {
  return {
    tools: listMcpTools(commands),
    call: (name, args) => callMcpTool(controller, name, args),
  };
}
