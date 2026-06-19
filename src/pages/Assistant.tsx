import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { answerQuery, type AssistantAnswer } from "../lib/assistant";

interface Turn {
  q: string;
  a: AssistantAnswer;
}

const SUGGESTIONS = [
  "Are the kids with me next Saturday?",
  "What size shoes does Ava wear?",
  "When's Leo's soccer practice?",
  "Did I message about the vacation next month?",
];

export function Assistant() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const navigate = useNavigate();

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    setTurns((t) => [...t, { q: text, a: answerQuery(state, text) }]);
    setQ("");
  }

  return (
    <div className="page page-tight">
      <div className="page-head">
        <div>
          <h1>Ask CoParent</h1>
          <p className="muted">
            Ask about your schedule, your kids' details, events, or messages.
            Answers come straight from your data — nothing leaves your device.
          </p>
        </div>
      </div>

      <div className="assistant-thread">
        {turns.length === 0 && (
          <div className="assistant-suggest">
            <p className="muted small">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggest-chip" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="assistant-turn">
            <div className="bubble-row mine">
              <div className="bubble">{t.q}</div>
            </div>
            <div className="bubble-row theirs">
              <div className="bubble">
                <div className="assistant-answer">{t.a.text}</div>
                {t.a.detail && <div className="assistant-detail">{t.a.detail}</div>}
                {t.a.route && (
                  <button className="link" onClick={() => navigate(t.a.route!)}>
                    Open →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="composer">
        <div className="composer-row">
          <input
            className="assistant-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(q)}
            placeholder="Ask a question…"
            aria-label="Ask CoParent"
          />
          <button className="btn btn-primary" onClick={() => ask(q)} disabled={!q.trim()}>
            Ask
          </button>
        </div>
        <span className="draft-note">On-device · private · works offline</span>
      </div>
    </div>
  );
}
