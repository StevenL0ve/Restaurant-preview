import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore, surgeonOf, locationLabelOf, facilityOf, dayNotesFor, localDay, getPullerName } from "../state/store";
import { Avatar } from "../components/Avatar";
import { shareBlobFile } from "../lib/share";
import { cardPdfBlob, cardPdfFilename } from "../lib/cardPdf";
import { accentStyle } from "../lib/accent";
import { tapLight } from "../lib/haptics";
import { SECTIONS, type PrefCard, type SectionKey } from "../types";
import { stampLine } from "../lib/user";

export function CardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, deleteCard, duplicateCard, toggleFavorite, exportCardFile, copyCardToFacility } = useStore();
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const card = state.cards.find((c) => c.id === id);
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
  const facility = facilityOf(state, card.facilityId);

  // One button for every way a card leaves the app: build a PDF on-device and
  // hand it to the phone's native share sheet, where the user picks what to do
  // with it: text it, email it, AirDrop it, save it, or print it (the iOS and
  // Android sheets both offer Print). On a computer without a share sheet the
  // PDF downloads instead, ready to print or attach.
  const [pdfBusy, setPdfBusy] = useState(false);
  async function onSharePdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const todays = dayNotesFor(state, card!.id, localDay(0)).map((n) => n.text);
      const blob = await cardPdfBlob(card!, sg, facility, (locId) => locationLabelOf(state, locId), todays);
      const r = await shareBlobFile(cardPdfFilename(card!.procedure), blob, `Preference card: ${card!.procedure}`, "application/pdf");
      setToast(r === "downloaded" ? "PDF downloaded. Open it to print, or attach it to a text or email." : null);
    } catch {
      setToast("Couldn’t build the PDF.");
    } finally {
      setPdfBusy(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  function onDuplicate() {
    const copy = duplicateCard(card!.id);
    if (copy) navigate(`/cards/${copy.id}/edit`);
  }

  const meta: [string, string | undefined][] = [
    ["Position", card.position],
    ["Skin prep", card.prep],
    ["Draping", card.draping],
  ];

  return (
    <div className="page card-detail" style={accentStyle(card.specialty)}>
      <div className="detail-top">
        <Link className="link" to="/cards">← Cards</Link>
        <button
          className={"fav big" + (card.favorite ? " on" : "")}
          onClick={() => { tapLight(); toggleFavorite(card.id); }}
          aria-label="Favorite"
        >
          {card.favorite ? "★" : "☆"}
        </button>
      </div>

      <div className="page-head">
        <div>
          <h1>{card.procedure}</h1>
          <p className="muted detail-sub">
            {sg ? (
              <Link className="link" to={`/surgeons/${sg.id}`}>{sg.name}</Link>
            ) : "Unassigned"}
            <span className="accent-pill">{card.specialty}</span>
            {card.oneCase && <span className="onecase-pill" title="A combined card built for one day's case">one case</span>}
            {facility ? <span className="detail-facility">{facility.name}</span> : null}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/cards/${card.id}/setup`)}>
            Start setup
          </button>
          <button className="btn" onClick={() => navigate(`/cards/${card.id}/edit`)}>Edit</button>
        </div>
      </div>

      {sg && (sg.gloveSize || sg.quirks) && (
        <div className="surgeon-banner" style={{ borderColor: sg.color }}>
          <Avatar surgeon={sg} size={40} />
          <div>
            {sg.gloveSize && (
              <div className="glove-line">
                <strong>Gloves {sg.gloveSize}</strong>
                {sg.gloveType ? ` · ${sg.gloveType}` : ""}
              </div>
            )}
            {sg.quirks && <div className="muted small">{sg.quirks}</div>}
          </div>
        </div>
      )}

      <ConsiderationsEditor card={card} />

      <div className="card detail-meta">
        {meta.filter(([, v]) => v?.trim()).map(([label, v]) => (
          <div className="meta-row" key={label}>
            <span className="meta-label">{label}</span>
            <span className="meta-value">{v}</span>
          </div>
        ))}
        {card.notes?.trim() && (
          <div className="meta-row note">
            <span className="meta-label">Notes</span>
            <span className="meta-value">{card.notes}</span>
          </div>
        )}
        {meta.every(([, v]) => !v?.trim()) && !card.notes?.trim() && (
          <p className="muted small" style={{ margin: 0 }}>No position / prep / notes recorded yet.</p>
        )}
        {card.updatedBy && (
          <p className="muted small" style={{ margin: "8px 0 0" }}>Last changed: {stampLine(card.updatedBy, card.updatedAt)}</p>
        )}
      </div>

      {SECTIONS.map((sec) => {
        const arr = card[sec.key as SectionKey];
        if (!arr.length) return null;
        return (
          <div className="card section-card" key={sec.key}>
            <div className="card-head">
              <h2>{sec.label}</h2>
              <span className="pill">{arr.length}</span>
            </div>
            <ul className="item-list">
              {arr.map((it) => {
                const where = locationLabelOf(state, it.locationId);
                return (
                  <li key={it.id}>
                    <span className="item-name">{(it.qty ?? 1) > 1 && <span className="qty-chip">{it.qty}×</span>}{it.name}</span>
                    {it.detail && <span className="item-detail">{it.detail}</span>}
                    {it.hold && <span className="hold-chip" title="Pull it, keep it unopened unless asked">hold</span>}
                    {where && <span className="item-location">{where}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div className="detail-actions">
        <button className="btn btn-primary" onClick={onSharePdf} disabled={pdfBusy}>
          {pdfBusy ? "Building PDF…" : "Share"}
        </button>
        <button className="btn" onClick={() => navigate("/carts/send", { state: { cardId: card.id } })}>Send to pull</button>
        <button className="btn" onClick={() => exportCardFile(card.id)}>Share import file</button>
        <button className="btn" onClick={onDuplicate}>Duplicate</button>
        {state.facilities.filter((f) => f.id !== card.facilityId).length > 0 && (
          <select
            className="loc-select"
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const copy = copyCardToFacility(card.id, e.target.value);
              if (copy) navigate(`/cards/${copy.id}`);
            }}
            title="Copy this card to another facility"
          >
            <option value="">Copy to facility…</option>
            {state.facilities
              .filter((f) => f.id !== card.facilityId)
              .map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
          </select>
        )}
        {card.oneCase && !confirmDel && (
          <span className="muted small">One-case combo: delete it when the day's done.</span>
        )}
        {confirmDel ? (
          <span className="confirm">
            Delete this card?
            <button className="btn btn-danger btn-sm" onClick={() => { deleteCard(card.id); navigate("/cards"); }}>
              Delete
            </button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>Cancel</button>
          </span>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>Delete</button>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// The surgeon's special requests: the standing text (edited with the card)
// plus "today only" entries that never touch the card itself. Upcoming
// entries show with their date; past days drop off on their own.
function ConsiderationsEditor({ card }: { card: PrefCard }) {
  const { state, addDayNote, deleteDayNote } = useStore();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [date, setDate] = useState(localDay(0));

  const today = localDay(0);
  const upcoming = state.dayNotes
    .filter((n) => n.cardId === card.id && n.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const standing = card.specialConsiderations?.trim();

  const pastDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date < today;
  function add() {
    if (!text.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || pastDate) return;
    tapLight();
    addDayNote(card.id, date, text, getPullerName() || undefined);
    setText("");
    setAdding(false);
  }

  if (!standing && upcoming.length === 0 && !adding) {
    return (
      <p className="considerations-add-hint">
        <button className="link small" onClick={() => setAdding(true)}>+ Add a special consideration for one day</button>
        <span className="muted small"> (standing requests are edited with the card)</span>
      </p>
    );
  }

  return (
    <div className="considerations-banner">
      <span className="considerations-title">Special considerations</span>
      {standing && <p className="considerations-text">{standing}</p>}
      {upcoming.map((n) => (
        <p key={n.id} className="considerations-text today">
          <span className="today-pill">{n.date === today ? "today only" : n.date}</span> {n.text}
          <span className="muted small"> · {stampLine(n.by, n.createdAt) || "unsigned"}</span>
          <button className="info-del" aria-label="Remove this one-day note" onClick={() => deleteDayNote(n.id)}>✕</button>
        </p>
      ))}
      {adding ? (
        <div className="considerations-form">
          <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} aria-label="Which day" />
          <input
            value={text}
            placeholder="Just for that case: open the smaller trials, rep bringing…"
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="btn btn-sm btn-primary" disabled={!text.trim() || pastDate} onClick={add}>Add</button>
          {pastDate && <span className="neg small">That day already happened; pick today or later.</span>}
          <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <button className="link small" onClick={() => setAdding(true)}>+ Add one for a specific day</button>
      )}
    </div>
  );
}
