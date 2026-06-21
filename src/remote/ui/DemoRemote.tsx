import { useCallback, useEffect, useMemo, useState } from "react";
import { TvController, type NavDirection } from "../agent/controller";
import { runNaturalLanguage } from "../agent/nl";
import { DemoConnector, DemoPlanner, DEMO_DEVICES } from "./demo";
import "./remote.css";

// Interactive demo of the universal remote. Uses the real TvController and
// command pipeline, with a DemoConnector (logs actions instead of hitting a real
// TV) and an offline DemoPlanner standing in for the Claude/ChatGPT path.

const APPS = ["Netflix", "YouTube", "Hulu", "Disney+", "Spotify"];

export function DemoRemote() {
  const [log, setLog] = useState<string[]>([]);
  const [activeName, setActiveName] = useState<string>("");
  const [aiText, setAiText] = useState("");
  const [busy, setBusy] = useState(false);

  const append = useCallback((message: string) => {
    setLog((prev) => [...prev.slice(-40), message]);
  }, []);

  const controller = useMemo(() => {
    const c = new TvController(
      (device) => new DemoConnector(device, append),
    );
    c.addDevices(DEMO_DEVICES);
    return c;
  }, [append]);

  const planner = useMemo(() => new DemoPlanner(), []);

  const sync = useCallback(() => {
    setActiveName(controller.getActiveDevice()?.name ?? "");
  }, [controller]);

  useEffect(() => {
    controller.selectDevice(DEMO_DEVICES[0].id).then(sync);
  }, [controller, sync]);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
      } catch (err) {
        append(`⚠️ ${(err as Error).message}`);
      }
      sync();
    },
    [append, sync],
  );

  const ask = useCallback(async () => {
    const utterance = aiText.trim();
    if (!utterance || busy) return;
    setBusy(true);
    append(`🗣️ "${utterance}"`);
    const { planned } = await runNaturalLanguage(planner, controller, utterance);
    if (planned.length === 0) append("(no actions matched — try rephrasing)");
    setAiText("");
    setBusy(false);
    sync();
  }, [aiText, busy, append, controller, planner, sync]);

  const nav = (direction: NavDirection) => run(() => controller.navigate(direction));

  return (
    <div className="remote-app">
      <header className="remote-head">
        <div>
          <h1>Universal Remote</h1>
          <p className="remote-sub">
            Controlling <strong>{activeName || "…"}</strong>
          </p>
        </div>
        <select
          className="remote-device"
          value={controller.getActiveDevice()?.id ?? ""}
          onChange={(e) => run(() => controller.selectDevice(e.target.value))}
        >
          {DEMO_DEVICES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.brand}
            </option>
          ))}
        </select>
      </header>

      <div className="remote-row">
        <button className="rk power" onClick={() => run(() => controller.power(false))}>
          ⏻
        </button>
        <button className="rk" onClick={() => nav("back")}>↩ Back</button>
        <button className="rk" onClick={() => nav("home")}>⌂ Home</button>
      </div>

      <div className="dpad">
        <button className="rk up" onClick={() => nav("up")}>▲</button>
        <button className="rk left" onClick={() => nav("left")}>◀</button>
        <button className="rk ok" onClick={() => nav("ok")}>OK</button>
        <button className="rk right" onClick={() => nav("right")}>▶</button>
        <button className="rk down" onClick={() => nav("down")}>▼</button>
      </div>

      <div className="remote-row">
        <button className="rk" onClick={() => run(() => controller.volume("down"))}>Vol −</button>
        <button className="rk" onClick={() => run(() => controller.volume("mute"))}>Mute</button>
        <button className="rk" onClick={() => run(() => controller.volume("up"))}>Vol +</button>
      </div>

      <div className="remote-row">
        <button className="rk" onClick={() => run(() => controller.media("rewind"))}>⏪</button>
        <button className="rk" onClick={() => run(() => controller.media("play_pause"))}>⏯</button>
        <button className="rk" onClick={() => run(() => controller.media("forward"))}>⏩</button>
      </div>

      <div className="remote-apps">
        {APPS.map((app) => (
          <button key={app} className="app-chip" onClick={() => run(() => controller.openApp(app))}>
            {app}
          </button>
        ))}
      </div>

      <div className="ai-bar">
        <input
          value={aiText}
          placeholder="Ask AI: “play Dune on Netflix in the bedroom”"
          onChange={(e) => setAiText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <button className="ai-send" onClick={ask} disabled={busy}>
          {busy ? "…" : "Send"}
        </button>
      </div>

      <div className="remote-log" aria-live="polite">
        {log.length === 0 ? (
          <p className="log-empty">Commands you send appear here.</p>
        ) : (
          log.map((line, i) => (
            <div key={i} className="log-line">{line}</div>
          ))
        )}
      </div>
    </div>
  );
}
