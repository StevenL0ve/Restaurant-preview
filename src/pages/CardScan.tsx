import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, emptyCard, uid } from "../state/store";
import { parseCardText, summarizeParse, type ParsedCard } from "../lib/parseCard";
import { ocrImage } from "../lib/ocr";
import type { CardItem, PrefCard } from "../types";
import { SECTIONS } from "../types";

const PLACEHOLDER = `Paste or type a card — for example:

Procedure: Laparoscopic Cholecystectomy
Surgeon: Dr. Chen
Position: Supine, arms tucked
Prep: ChloraPrep

Instruments
- Lap chole tray
- Maryland dissector

Sutures
- Vicryl 0 — fascia

Equipment
- ESU unit (coag 30)`;

// Build a ready-to-edit card from parsed text, matching the surgeon to one you
// already have by name (so we don't create a duplicate). If unmatched, the name
// is handed to the editor to prefill the "new surgeon" field.
function buildSeed(
  parsed: ParsedCard,
  surgeons: { id: string; name: string; specialty: string }[],
): { seed: PrefCard; surgeonName?: string } {
  const sgMatch = parsed.surgeonName
    ? surgeons.find((s) => s.name.trim().toLowerCase() === parsed.surgeonName!.trim().toLowerCase())
    : undefined;
  const specialty = parsed.specialty || sgMatch?.specialty || "General Surgery";
  const toItems = (arr: ParsedCard["sections"][keyof ParsedCard["sections"]]): CardItem[] =>
    arr.map((i) => ({ id: uid("it"), name: i.name, detail: i.detail }));

  const seed: PrefCard = {
    ...emptyCard(sgMatch?.id ?? "", specialty),
    procedure: parsed.procedure ?? "",
    position: parsed.position ?? "",
    prep: parsed.prep ?? "",
    draping: parsed.draping ?? "",
    notes: parsed.notes ?? "",
    instruments: toItems(parsed.sections.instruments),
    sutures: toItems(parsed.sections.sutures),
    supplies: toItems(parsed.sections.supplies),
    medications: toItems(parsed.sections.medications),
    equipment: toItems(parsed.sections.equipment),
  };
  return { seed, surgeonName: sgMatch ? undefined : parsed.surgeonName };
}

function prettyStatus(s: string): string {
  const map: Record<string, string> = {
    "loading tesseract core": "Loading scanner…",
    "initializing tesseract": "Starting scanner…",
    "initializing api": "Starting scanner…",
    "loading language traineddata": "Loading language…",
    "initialized api": "Reading…",
    "recognizing text": "Reading the card…",
  };
  return map[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
}

// Scan a printed/typed preference card (photo → OCR) or paste its text, then
// hand a prefilled draft to the normal editor. The paste/type path is fully
// offline and 100% reliable; OCR is a lazy-loaded convenience on top.
export function CardScan() {
  const navigate = useNavigate();
  const { state } = useStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseCardText(text), [text]);
  const canCreate = !!parsed.procedure || parsed.itemCount > 0;

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setBusy(true);
    setPct(0);
    setStatus("Loading scanner…");
    try {
      const recognized = await ocrImage(file, (p, s) => { setPct(p); setStatus(prettyStatus(s)); });
      if (!recognized) {
        setErr("Couldn’t read any text from that photo. Try a straighter, brighter shot — or just type it below.");
      } else {
        setText((prev) => (prev.trim() ? `${prev}\n${recognized}` : recognized));
      }
    } catch {
      setErr("Couldn’t start the scanner — you may be offline. You can still paste or type the card below.");
    } finally {
      setBusy(false);
    }
  }

  function onCreate() {
    const { seed, surgeonName } = buildSeed(parsed, state.surgeons);
    navigate("/cards/new", { state: { seed, surgeonName } });
  }

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <button className="link" onClick={() => navigate(-1)}>← Cancel</button>
      </div>
      <div className="page-head">
        <div>
          <h1>Scan or paste a card</h1>
          <p className="muted">
            Take a photo of a printed card, or paste text you already have. We’ll pull out the
            procedure, surgeon, and items so you can review and save — a fast head start on a new card.
          </p>
        </div>
      </div>

      <div className="card form-card">
        <h2>Scan a printed or typed card</h2>
        <p className="muted small">
          The photo is read <strong>on your device</strong> — nothing is uploaded. Best results: lay the
          card flat, fill the frame, good light.
        </p>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? "Reading…" : "📷 Take / choose photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onPhoto}
          />
        </div>
        {busy && (
          <div className="ocr-progress" role="status" aria-live="polite">
            <div className="ocr-bar"><span style={{ width: `${pct}%` }} /></div>
            <span className="muted small">{status} {pct > 0 && `${pct}%`}</span>
          </div>
        )}
        {err && <p className="ocr-error small">{err}</p>}
      </div>

      <div className="card form-card">
        <h2>Card text</h2>
        <p className="muted small">
          Edit anything the scan got wrong, or paste text here directly. Put each item on its own line;
          section headers like <em>Instruments</em>, <em>Sutures</em>, <em>Supplies</em>,
          <em> Medications</em>, <em>Equipment</em> sort items for you.
        </p>
        <textarea
          className="scan-textarea"
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
        />
        <p className="parse-summary small">{summarizeParse(parsed)}</p>
        {parsed.itemCount > 0 && (
          <ul className="parse-preview">
            {SECTIONS.filter((s) => parsed.sections[s.key].length).map((s) => (
              <li key={s.key}>
                <span aria-hidden>{s.icon}</span> <strong>{parsed.sections[s.key].length}</strong> {s.label.toLowerCase()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" disabled={!canCreate} onClick={onCreate}>
          Create card from this →
        </button>
        <button className="btn" onClick={() => navigate("/cards/new")}>Start blank instead</button>
        {!canCreate && <span className="muted small">Add a procedure or some items to continue.</span>}
      </div>
    </div>
  );
}
