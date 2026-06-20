import { AGENT_COMMANDS, type AgentCommand } from "./commands";

// Siri / App Intents metadata. On iOS, exposing actions to Siri and Shortcuts is
// done by registering App Intents in the native (Swift) layer. The web/Capacitor
// side can't declare those directly, but it CAN own the canonical list of
// intents — derived from the same command registry — so the native bridge stays
// a thin, generated mapping instead of a hand-maintained duplicate.

/** A declarative App Intent the native iOS layer registers with Siri. */
export interface AppIntentSpec {
  /** Maps 1:1 to an AgentCommand name. */
  command: string;
  /** The intent's display title in Shortcuts. */
  title: string;
  /** Example spoken phrases that should trigger this intent. */
  phrases: string[];
  /** Parameter names the intent collects from the user. */
  parameters: string[];
}

const PHRASE_TEMPLATES: Record<string, string[]> = {
  set_power: ["Turn ${app} TV on", "Turn off my TV"],
  navigate: ["Go ${direction} on the TV", "Select on my TV"],
  set_volume: ["Turn the TV volume ${change}", "Mute the TV"],
  media_control: ["Pause the TV", "Play on my TV"],
  open_app: ["Open ${app} on my TV", "Launch ${app}"],
  search_in_app: ["Search ${query} in ${app} on my TV"],
  type_text: ["Type ${text} on the TV"],
  select_device: ["Control the ${device} TV"],
  list_devices: ["What TVs can I control"],
};

function titleFromCommand(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toIntentSpec(command: AgentCommand): AppIntentSpec {
  return {
    command: command.name,
    title: titleFromCommand(command.name),
    phrases: PHRASE_TEMPLATES[command.name] ?? [titleFromCommand(command.name)],
    parameters: Object.keys(command.parameters.properties),
  };
}

/** The full set of Siri/Shortcuts intents, generated from the command registry. */
export function buildAppIntents(
  commands: AgentCommand[] = AGENT_COMMANDS,
): AppIntentSpec[] {
  return commands.map(toIntentSpec);
}
