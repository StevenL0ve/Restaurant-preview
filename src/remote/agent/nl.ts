import type { FetchLike } from "../types";
import type { TvController } from "./controller";
import {
  AGENT_COMMANDS,
  runCommand,
  type AgentCommand,
  type AgentCommandResult,
} from "./commands";

// Natural-language control: turn "turn on the living room TV and open Netflix"
// into a sequence of canonical commands. This is provider-agnostic — the
// `NaturalLanguageController` interface is the seam, and ClaudeController is one
// implementation. ChatGPT, Kimi, or a local model are just other implementations
// of the same interface, all driving the same command registry and controller.

/** A single command the model decided to run. */
export interface PlannedCommand {
  name: string;
  input: Record<string, unknown>;
}

/** Result of planning + executing a natural-language request. */
export interface NlRunResult {
  planned: PlannedCommand[];
  results: AgentCommandResult[];
}

/** The provider seam: anything that can turn an utterance into a command plan. */
export interface NaturalLanguageController {
  plan(utterance: string): Promise<PlannedCommand[]>;
}

const SYSTEM_PROMPT = [
  "You control TVs and streaming devices on a home network via the provided tools.",
  "Translate the user's request into the smallest correct sequence of tool calls.",
  "If a specific TV is named (e.g. 'the kitchen TV'), select it first with select_device.",
  "Prefer search_in_app over separate open_app + type_text when the user wants to find a title.",
  "Only call tools; do not ask follow-up questions.",
].join(" ");

/** Map the command registry to Anthropic Messages API tool definitions. */
export function commandsToClaudeTools(
  commands: AgentCommand[] = AGENT_COMMANDS,
): { name: string; description: string; input_schema: AgentCommand["parameters"] }[] {
  return commands.map((c) => ({
    name: c.name,
    description: c.description,
    input_schema: c.parameters,
  }));
}

export interface ClaudeControllerOptions {
  apiKey: string;
  /** Defaults to Anthropic's current most capable model. */
  model?: string;
  /** Override the endpoint (e.g. to point at your own proxy). */
  baseUrl?: string;
  /** Injected fetch for testing; defaults to global fetch. */
  fetchImpl?: FetchLike;
  /** Restrict/extend the exposed command set. */
  commands?: AgentCommand[];
}

/**
 * Claude-backed planner. Calls the Anthropic Messages API with the command
 * registry as tools and collects the tool_use blocks as the plan.
 *
 * Security note: do not ship a raw API key inside a distributed app. In
 * production, point `baseUrl` at a thin backend proxy that injects the key;
 * this class is written so the client never needs to hold the secret.
 */
export class ClaudeController implements NaturalLanguageController {
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly commands: AgentCommand[];

  constructor(private readonly options: ClaudeControllerOptions) {
    this.model = options.model ?? "claude-opus-4-8";
    this.baseUrl = options.baseUrl ?? "https://api.anthropic.com/v1/messages";
    this.fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
    this.commands = options.commands ?? AGENT_COMMANDS;
  }

  async plan(utterance: string): Promise<PlannedCommand[]> {
    const body = JSON.stringify({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: commandsToClaudeTools(this.commands),
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: utterance }],
    });

    const res = await this.fetchImpl(this.baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.options.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Claude request failed with status ${res.status}`);
    }

    const json = JSON.parse(await res.text()) as ClaudeResponse;
    return extractPlan(json);
  }
}

/** Pull the tool_use blocks out of a Messages API response, in order. */
export function extractPlan(response: ClaudeResponse): PlannedCommand[] {
  return (response.content ?? [])
    .filter((block): block is ClaudeToolUseBlock => block.type === "tool_use")
    .map((block) => ({ name: block.name, input: block.input ?? {} }));
}

/**
 * Plan with the given controller, then execute the commands in order against the
 * TV controller. Stops on the first failure so a bad step doesn't cascade.
 */
export async function runNaturalLanguage(
  planner: NaturalLanguageController,
  tv: TvController,
  utterance: string,
): Promise<NlRunResult> {
  const planned = await planner.plan(utterance);
  const results: AgentCommandResult[] = [];
  for (const step of planned) {
    const result = await runCommand(tv, step.name, step.input);
    results.push(result);
    if (!result.ok) break;
  }
  return { planned, results };
}

// Minimal shapes of the Anthropic Messages API response we rely on.
export interface ClaudeToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ClaudeTextBlock {
  type: "text";
  text: string;
}

export interface ClaudeResponse {
  content?: (ClaudeToolUseBlock | ClaudeTextBlock)[];
  stop_reason?: string;
}
