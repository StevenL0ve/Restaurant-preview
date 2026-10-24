import { useEffect, useRef, useState } from "react";
import { ConsiderationsBanner } from "../components/Considerations";
import { Lightbox } from "../components/Lightbox";
import { localDay } from "../state/store";
import { Mascot } from "../components/Mascot";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, surgeonOf, setupProgress, groupByArea, locationLabelOf } from "../state/store";
import { accentStyle } from "../lib/accent";
import { tapLight, successBuzz } from "../lib/haptics";
import { SECTIONS, type CardItem, type SectionKey } from "../types";

type GroupMode = "location" | "section";

const CONFETTI_COLORS = ["#2472d8", "#f59e0b", "#e11d48", "#6366f1", "#10b981", "#63a6f4"];

/** Short celebratory burst rendered when the pull-list hits 100%. */
function Confetti() {
  const pieces = Array.from({ length: 22 }, (_, i) => ({
    left: `${(i * 137.5) % 100}%`, // golden-angle spread, no Math.random needed
    delay: `${(i % 7) * 0.05}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    drift: `${((i % 5) - 2) * 34}px`,
    spin: `${(i % 2 ? 1 : -1) * (240 + (i % 4) * 90)}deg`,
  }));
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: p.left,
            animationDelay: p.delay,
            background: p.color,
            ["--drift" as string]: p.drift,
            ["--spin" as string]: p.spin,
          }}
        />
      ))}
    </div>
  );
}

// Setup mode turns a card into a live pull-list: big tap targets, check items
// off as you gather them, and a progress bar that hits "Case ready" at 100%.
// Default view is by section, equipment first (it gets positioned before the
// field opens), then instrument sets, with "have available" items grouped at
// the very bottom. Toggle to "By location" to walk cart-to-cabinet instead.

// Equipment first, then instruments & trays, then the rest in library order.
const SETUP_SECTIONS = [...SECTIONS].sort((a, b) => {
  const rank = (k: string) => (k === "equipment" ? 0 : k === "instruments" ? 1 : 2);
  return rank(a.key) - rank(b.key) || SECTIONS.findIndex((s) => s.key === a.key) - SECTIONS.findIndex((s) => s.key === b.key);
});

export function SetupMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, toggleSetupItem, resetSetup } = useStore();
  const [mode, setMode] = useState<GroupMode>("section");
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const card = state.cards.find((c) => c.id === id);

  // Completion state is computed before the not-found return so the
  // celebration hooks below run unconditionally.
  const { done, total } = card ? setupProgress(state, card) : { done: 0, total: 0 };
  const ready = total > 0 && done === total;
  const [burst, setBurst] = useState(false);
  const prevReady = useRef(ready);
  useEffect(() => {
    const was = prevReady.current;
    prevReady.current = ready;
    if (ready && !was) {
      successBuzz();
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 1700);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (!card) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>That card doesn’t exist. <Link className="link" to="/cards">Back to all cards</Link>.</p>
        </div>
      </div>
    );
  }

  const sg = surgeonOf(state, card.surgeonId);
  const checked = new Set(state.setups[card.id]?.checked ?? []);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const Row = ({ it, sub }: { it: CardItem; sub?: string }) => {
    const on = checked.has(it.id);
    const where = locationLabelOf(state, it.locationId);
    return (
      <li className={on ? "done" : ""}>
        <label className="check-row">
          <input
            type="checkbox"
            checked={on}
            onChange={() => {
              tapLight();
              toggleSetupItem(card.id, it.id);
            }}
          />
          <span className="check-main">
            <span className="check-line">
              <span className="check-name">{(it.qty ?? 1) > 1 && <span className="qty-chip">{it.qty}×</span>}{it.name}</span>
              {it.detail && <span className="item-detail">{it.detail}</span>}
              {it.hold && <span className="hold-chip" title="Pull it, keep it unopened unless asked">hold</span>}
              {it.photo && (
                <button
                  type="button"
                  className="row-thumb"
                  title="See the item"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLightbox({ src: it.photo!, alt: `${it.name}${it.ref ? ` · REF ${it.ref}` : ""}` });
                  }}
                >
                  <img src={it.photo} alt="" />
                </button>
              )}
            </span>
            {sub && <span className="row-sub">{sub}</span>}
            {where && mode === "section" && <span className="item-location">{where}</span>}
          </span>
        </label>
      </li>
    );
  };

  const areaGroups = groupByArea(state, card);

  return (
    <div className="page page-narrow setup" style={accentStyle(card.specialty)}>
      {burst && <Confetti />}
      <div className="detail-top">
        <Link className="link" to={`/cards/${card.id}`}>← Done</Link>
        <button className="link" onClick={() => resetSetup(card.id)}>Reset</button>
      </div>

      <div className="page-head">
        <div>
          <h1>{card.procedure}</h1>
          <p className="muted">{sg?.name} · Pull-list setup</p>
        </div>
      </div>

      <ConsiderationsBanner card={card} date={localDay(0)} />

      <div className={"progress-card" + (ready ? " ready" : "")}>
        <div className="progress-top">
          <span className="progress-count">{done} / {total} gathered</span>
          {ready ? <span className="ready-badge">✓ Case ready</span> : <span className="muted">{pct}%</span>}
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="seg">
        <button className={"seg-btn" + (mode === "section" ? " active" : "")} onClick={() => setMode("section")}>
          By section
        </button>
        <button className={"seg-btn" + (mode === "location" ? " active" : "")} onClick={() => setMode("location")}>
          By location
        </button>
      </div>

      {(card.position || card.prep || sg?.gloveSize) && (
        <div className="card setup-ref">
          {sg?.gloveSize && <div><strong>Gloves</strong> {sg.gloveSize}{sg.gloveType ? ` · ${sg.gloveType}` : ""}</div>}
          {card.position && <div><strong>Position</strong> {card.position}</div>}
          {card.prep && <div><strong>Prep</strong> {card.prep}</div>}
        </div>
      )}

      {(card.mayoPhoto || card.backTablePhoto) && (
        <div className="setup-photo-strip">
          {card.mayoPhoto && (
            <button className="setup-photo-thumb" onClick={() => setLightbox({ src: card.mayoPhoto!, alt: "Mayo stand" })}>
              <img src={card.mayoPhoto} alt="Mayo stand setup" />
              <span>Mayo stand</span>
            </button>
          )}
          {card.backTablePhoto && (
            <button className="setup-photo-thumb" onClick={() => setLightbox({ src: card.backTablePhoto!, alt: "Back table" })}>
              <img src={card.backTablePhoto} alt="Back table setup" />
              <span>Back table</span>
            </button>
          )}
        </div>
      )}

      {mode === "location"
        ? areaGroups.map((g) => {
            // "Have available" items live in their own group at the bottom.
            const rows = g.rows.filter((r) => !r.item.haveAvailable);
            if (!rows.length) return null;
            const groupDone = rows.filter((r) => checked.has(r.item.id)).length;
            return (
              <div className="card section-card" key={g.area || "__none"}>
                <div className="card-head">
                  <h2>
                    {g.area || "No location set"}
                  </h2>
                  <span className="pill">{groupDone}/{rows.length}</span>
                </div>
                <ul className="check-list">
                  {rows.map((r) => (
                    <Row
                      key={r.item.id}
                      it={r.item}
                      sub={`${r.sectionLabel}${locationLabelOf(state, r.item.locationId) ? ` · ${locationLabelOf(state, r.item.locationId)}` : ""}`}
                    />
                  ))}
                </ul>
              </div>
            );
          })
        : SETUP_SECTIONS.map((sec) => {
            const arr = card[sec.key as SectionKey].filter((it) => !it.haveAvailable);
            if (!arr.length) return null;
            return (
              <div className="card section-card" key={sec.key}>
                <div className="card-head">
                  <h2>{sec.label}</h2>
                </div>
                <ul className="check-list">
                  {arr.map((it) => <Row key={it.id} it={it} />)}
                </ul>
              </div>
            );
          })}

      {(() => {
        const avail = SECTIONS.flatMap((sec) =>
          card[sec.key as SectionKey].filter((it) => it.haveAvailable).map((it) => ({ it, sec: sec.label })),
        );
        if (!avail.length) return null;
        const availDone = avail.filter((r) => checked.has(r.it.id)).length;
        return (
          <div className="card section-card avail-card">
            <div className="card-head">
              <h2>Have available</h2>
              <span className="pill">{availDone}/{avail.length}</span>
            </div>
            <p className="muted small" style={{ margin: "0 0 4px" }}>
              In the room, not opened: ready if the surgeon asks.
            </p>
            <ul className="check-list">
              {avail.map((r) => <Row key={r.it.id} it={r.it} sub={r.sec} />)}
            </ul>
          </div>
        );
      })()}

      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

      {ready && (
        <div className="ready-cta">
          <Mascot size={104} />
          <p>Everything’s pulled. Case ready.</p>
          <button className="btn btn-primary" onClick={() => navigate(`/cards/${card.id}`)}>Back to card</button>
        </div>
      )}
    </div>
  );
}
