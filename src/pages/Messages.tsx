import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, triggerDownload } from "../state/store";
import { asset } from "../lib/asset";
import { analyzeTone, toneLabel } from "../lib/tone";
import { time, fullDate } from "../lib/format";
import { messagesCSV } from "../lib/csv";
import { printMessageLog } from "../lib/printable";
import { notifySuccess } from "../lib/haptics";

export function Messages() {
  const { state, sendMessage, markAllRead, saveDraft } = useStore();
  const [text, setText] = useState(state.draft?.body ?? "");
  const [filter, setFilter] = useState("");
  const [showRewrite, setShowRewrite] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const me = state.meId;
  const tone = useMemo(() => analyzeTone(text), [text]);

  // Mark incoming messages read when the thread is open.
  useEffect(() => {
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save drafts (OurFamilyWizard famously can't save drafts).
  useEffect(() => {
    const t = setTimeout(() => saveDraft(text), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages.length]);

  const filtered = filter.trim()
    ? state.messages.filter((m) =>
        m.body.toLowerCase().includes(filter.toLowerCase()),
      )
    : state.messages;

  function handleSend() {
    if (!text.trim()) return;
    // Guard: if the message reads as heated, make the user pass through the
    // rewrite panel once before it will send.
    if (tone.level === "hostile" && !showRewrite) {
      setShowRewrite(true);
      return;
    }
    sendMessage(text);
    notifySuccess();
    setText("");
    setShowRewrite(false);
  }

  return (
    <div className="page page-tight">
      <div className="page-head">
        <div>
          <h1>Messages</h1>
          <p className="muted">
            Every message is timestamped and can't be edited or deleted — a
            clean record if you ever need one.
          </p>
        </div>
        <div className="head-actions">
          <div className="search-mini">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search this thread…"
            />
          </div>
          <button
            className="btn"
            onClick={() =>
              triggerDownload(
                new Blob([messagesCSV(state)], { type: "text/csv" }),
                "coparent-messages.csv",
              )
            }
          >
            ⤓ Export record
          </button>
          <button
            className="btn"
            onClick={() => {
              if (!printMessageLog(state)) {
                alert("Please allow pop-ups to print the message record.");
              }
            }}
          >
            🖨 Print log
          </button>
        </div>
      </div>

      <div className="thread">
        {state.messages.length === 0 ? (
          <div className="empty-state">
            <img className="empty-art" src={asset("brand/nav-messages.png")} alt="" aria-hidden width={72} height={72} />
            <p>
              No messages yet. Say hello — every message is timestamped and kept
              as a clean, unchangeable record.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="muted pad">No messages match “{filter}”.</p>
        ) : null}
        {filtered.map((m, i) => {
          const mine = m.fromId === me;
          const showDay =
            i === 0 ||
            fullDate(filtered[i - 1].createdAt) !== fullDate(m.createdAt);
          return (
            <div key={m.id}>
              {showDay && <div className="day-sep">{fullDate(m.createdAt)}</div>}
              <div className={"bubble-row " + (mine ? "mine" : "theirs")}>
                <div className="bubble">
                  <div className="bubble-body">{m.body}</div>
                  <div className="bubble-meta">
                    <span>{time(m.createdAt)}</span>
                    {mine && (
                      <span className="read-state">
                        {m.readAt ? "Read" : "Delivered"}
                      </span>
                    )}
                    {m.tone !== "calm" && (
                      <span className={"tone-chip tone-" + m.tone}>
                        {toneLabel(m.tone)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="composer">
        {text && (
          <div className={"tone-bar tone-" + tone.level}>
            <span className="tone-dot" />
            <span className="tone-text">
              Tone: <strong>{toneLabel(tone.level)}</strong>
              {tone.flagged.length > 0 && (
                <span className="muted"> · flagged: {tone.flagged.slice(0, 3).join(", ")}</span>
              )}
            </span>
            {tone.suggestion && (
              <button className="link" onClick={() => setShowRewrite((s) => !s)}>
                {showRewrite ? "Hide suggestion" : "Suggest calmer wording"}
              </button>
            )}
          </div>
        )}

        {showRewrite && tone.suggestion && (
          <div className="rewrite">
            <div className="rewrite-label">Suggested rewrite</div>
            <p className="rewrite-text">{tone.suggestion}</p>
            <div className="rewrite-actions">
              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setText(tone.suggestion!);
                  setShowRewrite(false);
                }}
              >
                Use this
              </button>
              <button className="btn btn-sm" onClick={() => setShowRewrite(false)}>
                Keep mine
              </button>
            </div>
          </div>
        )}

        <div className="composer-row">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
            placeholder="Write a message…  (⌘/Ctrl + Enter to send)"
            rows={3}
          />
          <div className="composer-side">
            <button
              className={"btn btn-primary " + (tone.level === "hostile" ? "btn-warn" : "")}
              onClick={handleSend}
              disabled={!text.trim()}
            >
              {tone.level === "hostile" && !showRewrite ? "Review tone" : "Send"}
            </button>
            <span className="draft-note">
              {state.draft ? "Draft saved ✓" : "Drafts auto-save"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
