import { useMemo, useState } from "react";
import { NavIcon } from "../components/NavIcon";
import { Mascot } from "../components/Mascot";
import { Link, useNavigate } from "react-router-dom";
import { useStore, surgeonOf, totalItems, facilityOf, locationLabelOf, dayNotesFor, localDay } from "../state/store";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { cardsPdfBlob, cardsPdfFilename, type CardPdfEntry } from "../lib/cardPdf";
import { cardLink } from "../lib/links";
import { shareBlobFile } from "../lib/share";
import { relativeTime } from "../lib/format";
import { accentStyle } from "../lib/accent";
import { tapLight } from "../lib/haptics";
import type { PrefCard } from "../types";

// The library: every preference card, filterable by specialty and searchable,
// favorites pinned to the top.
export function CardsPage() {
  const { state, toggleFavorite } = useStore();
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState<string>("all");
  const [q, setQ] = useState("");
  // Multi-print: pick several cards, share them as one PDF packet.
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const toggleSel = (id: string) => {
    tapLight();
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const specialties = useMemo(
    () => ["all", ...Array.from(new Set(state.cards.map((c) => c.specialty))).sort()],
    [state.cards],
  );

  const cards = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.cards
      .filter((c) => specialty === "all" || c.specialty === specialty)
      .filter((c) => {
        if (!needle) return true;
        const sg = surgeonOf(state, c.surgeonId);
        return (
          c.procedure.toLowerCase().includes(needle) ||
          (sg?.name.toLowerCase().includes(needle) ?? false)
        );
      })
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [state, specialty, q]);

  return (
    <div className="page">
      <div className="dash-hero">
        <Mascot size={78} className="dash-mascot" />
        <div className="dash-hero-text">
          <h1 className="page-title"><NavIcon name="cards" size={40} />Ready for your next case</h1>
          <p>Your preference cards, your way. On your phone, and synced with your OR.</p>
        </div>
        <button className="btn dash-hero-btn" onClick={() => navigate("/cards/new")}>
          <Icon name="plus" size={17} /> New card
        </button>
      </div>

      <div className="page-head">
        <div>
          <p className="muted">{state.cards.length} preference cards across {specialties.length - 1} specialties.</p>
        </div>
        <div className="head-actions">
          {selecting ? (
            <>
              <PrintSelectedButton ids={sel} order={cards} />
              <button className="btn" onClick={() => { setSelecting(false); setSel([]); }}>Done</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => navigate("/catalog")}>Supply catalog</button>
              <button className="btn" onClick={() => { setSelecting(true); setSel([]); }}>Print several…</button>
              <button className="btn" onClick={() => navigate("/cards/combine")}>Combine</button>
              <button className="btn" onClick={() => navigate("/cards/templates")}>Templates</button>
              <button className="btn" onClick={() => navigate("/cards/scan")}>Scan / paste</button>
            </>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="search-page-input"
          placeholder="Filter by procedure or surgeon…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="chips">
          {specialties.map((s) => (
            <button
              key={s}
              className={"chip" + (specialty === s ? " active" : "")}
              onClick={() => setSpecialty(s)}
            >
              {s === "all" ? "All specialties" : s}
            </button>
          ))}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="empty-state">
          <Mascot size={104} />
          <p>No cards yet. Start from a <strong>template</strong>, scan a printed card, or build from scratch.</p>
          <div className="form-actions" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => navigate("/cards/templates")}>Start from a template</button>
            <button className="btn" onClick={() => navigate("/cards/scan")}>Scan / paste a card</button>
            <button className="btn" onClick={() => navigate("/cards/new")}>+ New card</button>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {cards.map((c) =>
            selecting ? (
              <div
                key={c.id}
                className={"select-wrap" + (sel.includes(c.id) ? " on" : "")}
                role="checkbox"
                aria-checked={sel.includes(c.id)}
                tabIndex={0}
                onClick={() => toggleSel(c.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSel(c.id); } }}
              >
                <CardTile card={c} onFav={() => {}} />
              </div>
            ) : (
              <CardTile key={c.id} card={c} onFav={() => { tapLight(); toggleFavorite(c.id); }} />
            ),
          )}
        </div>
      )}
      {selecting && (
        <p className="muted small" style={{ textAlign: "center" }}>
          Tap cards to pick them ({sel.length} picked), then Print.
        </p>
      )}
    </div>
  );
}

function CardTile({ card, onFav }: { card: PrefCard; onFav: () => void }) {
  const { state } = useStore();
  const sg = surgeonOf(state, card.surgeonId);
  return (
    <div className="pref-tile" style={accentStyle(card.specialty)}>
      <button
        className={"fav" + (card.favorite ? " on" : "")}
        onClick={onFav}
        aria-label={card.favorite ? "Unfavorite" : "Favorite"}
        title={card.favorite ? "Unfavorite" : "Favorite"}
      >
        {card.favorite ? "★" : "☆"}
      </button>
      <Link to={`/cards/${card.id}`} className="pref-tile-body">
        <div className="pref-tile-head">
          {sg && <Avatar surgeon={sg} size={34} />}
          <div className="pref-tile-meta">
            <div className="pref-proc">{card.procedure}{card.oneCase && <span className="onecase-pill">one case</span>}</div>
            <div className="pref-sub">{sg?.name ?? "Unassigned"} · {card.specialty}</div>
          </div>
        </div>
        <div className="pref-tile-foot">
          <span className="pill">{totalItems(card)} items</span>
          <span className="muted small">Updated {relativeTime(card.updatedAt)}</span>
        </div>
      </Link>
    </div>
  );
}

// Share the picked cards as one PDF packet, each card on its own page with
// a QR code back to its live version.
function PrintSelectedButton({ ids, order }: { ids: string[]; order: PrefCard[] }) {
  const { state } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    const picked = order.filter((c) => ids.includes(c.id));
    if (!picked.length) return;
    setBusy(true);
    setErr(null);
    try {
      const entries: CardPdfEntry[] = picked.map((card) => ({
        card,
        surgeon: surgeonOf(state, card.surgeonId),
        facility: facilityOf(state, card.facilityId),
        locationName: (id: string) => locationLabelOf(state, id),
        dayConsiderations: dayNotesFor(state, card.id, localDay(0)).map((n) => n.text),
        link: { url: cardLink(card.id), label: "Scan for the live card in ORSync" },
      }));
      const blob = await cardsPdfBlob(entries);
      await shareBlobFile(
        cardsPdfFilename(`${picked.length}-cards`),
        blob,
        `Preference cards: ${picked.map((c) => c.procedure).slice(0, 3).join(", ")}${picked.length > 3 ? ` and ${picked.length - 3} more` : ""}`,
        "application/pdf",
      );
    } catch {
      setErr("Couldn't build the PDF. Try again.");
      setTimeout(() => setErr(null), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary" disabled={busy || ids.length === 0} onClick={go}>
        {busy ? "Building…" : `Print ${ids.length || ""}`.trim()}
      </button>
      {err && <span className="neg small">{err}</span>}
    </>
  );
}
