import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, getPullerName } from "../state/store";
import { fileToDataUrl } from "../lib/photos";
import { ocrImage } from "../lib/ocr";
import { parseRefCandidates } from "../lib/refExtract";
import { stampLine } from "../lib/user";
import { Lightbox } from "../components/Lightbox";
import { PhiNote } from "../components/PhiNote";
import { tapLight } from "../lib/haptics";
import type { CatalogItem, PrefCard } from "../types";

// The supply custodian's workbench: photograph an item, let the scanner read
// the REF off the packaging (custodian confirms with a tap), give it the
// official nomenclature, done. Card editors then pick from this list, so the
// same item never lives under five different names, and a REF change here
// updates every preference card that uses it.

function cardsUsing(cards: PrefCard[], catalogId: string): number {
  return cards.filter((c) =>
    [c.instruments, c.sutures, c.supplies, c.medications, c.equipment].some((arr) =>
      arr.some((it) => it.catalogId === catalogId),
    ),
  ).length;
}

export function CatalogPage() {
  const { state, addCatalogItem } = useStore();
  const me = getPullerName();
  const [q, setQ] = useState("");
  const [facilityId, setFacilityId] = useState(state.facilities[0]?.id ?? "");
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  // ---- add form ----
  const [photo, setPhoto] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [ref, setRef] = useState("");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [ocrState, setOcrState] = useState<"idle" | "reading" | "done" | "failed">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setCandidates([]);
    try {
      setPhoto(await fileToDataUrl(f));
    } catch {
      return;
    }
    // Read the REF off the packaging; the custodian confirms with a tap.
    setOcrState("reading");
    try {
      const text = await ocrImage(f, () => {});
      const found = parseRefCandidates(text);
      setCandidates(found);
      setOcrState("done");
      if (found.length === 1 && !ref.trim()) setRef(found[0]);
    } catch {
      setOcrState("failed");
    }
  }

  function add() {
    if (!name.trim() || !ref.trim()) return;
    tapLight();
    addCatalogItem({ name, ref, facilityId: facilityId || undefined, photo });
    setName("");
    setRef("");
    setPhoto(undefined);
    setCandidates([]);
    setOcrState("idle");
  }

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.catalog
      .filter((c) => !facilityId || !c.facilityId || c.facilityId === facilityId)
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.ref.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.catalog, q, facilityId]);

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <Link className="link" to="/cards">← Cards</Link>
      </div>
      <div className="page-head">
        <div>
          <h1>Supply catalog</h1>
          <p className="muted">
            The master list of supplies: one photo, one official name, one REF number per item.
            Cards pick from here, and a REF change here updates every card that uses it.
          </p>
        </div>
      </div>

      <div className="card form-card">
        <h2>Add an item{me ? <span className="muted small"> · custodian: {me}</span> : null}</h2>
        <div className="catalog-add">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
          {photo ? (
            <button className="setup-photo-thumb" onClick={() => fileRef.current?.click()} title="Replace photo">
              <img src={photo} alt="Item photo" />
            </button>
          ) : (
            <button className="btn setup-photo-add" onClick={() => fileRef.current?.click()}>+ Item photo</button>
          )}
          <div className="catalog-add-fields">
            {ocrState === "reading" && <p className="muted small">Reading the packaging for a REF number…</p>}
            {ocrState === "done" && candidates.length > 0 && (
              <div className="catalog-candidates">
                <span className="muted small">Found on the label; tap the right one:</span>
                <span className="chips chips-tight">
                  {candidates.map((c) => (
                    <button key={c} className={"chip chip-sm" + (ref === c ? " active" : "")} onClick={() => setRef(c)}>
                      {c}
                    </button>
                  ))}
                </span>
              </div>
            )}
            {ocrState === "done" && candidates.length === 0 && (
              <p className="muted small">No REF found on the photo; type it below.</p>
            )}
            {ocrState === "failed" && <p className="muted small">Couldn't read the photo; type the REF below.</p>}
            <label className="field"><span>Nomenclature (official name)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Polypropylene mesh 6x6" />
            </label>
            <label className="field"><span>REF #</span>
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="PRO-4521" />
            </label>
            {state.facilities.length > 0 && (
              <label className="field"><span>Facility</span>
                <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                  {state.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  <option value="">All facilities</option>
                </select>
              </label>
            )}
            <div className="form-actions">
              <button className="btn btn-primary" disabled={!name.trim() || !ref.trim()} onClick={add}>
                Add to catalog
              </button>
            </div>
          </div>
        </div>
        <PhiNote />
      </div>

      <div className="filter-bar">
        <input
          className="search-page-input"
          placeholder="Search the catalog by name or REF…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <p>No catalog items{q ? " match" : " yet"}. Photograph a supply item above to start the master list.</p>
        </div>
      ) : (
        list.map((item) => (
          <CatalogRow
            key={item.id}
            item={item}
            usedOn={cardsUsing(state.cards, item.id)}
            onView={(src, alt) => setLightbox({ src, alt })}
          />
        ))
      )}

      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function CatalogRow({ item, usedOn, onView }: {
  item: CatalogItem;
  usedOn: number;
  onView: (src: string, alt: string) => void;
}) {
  const { updateCatalogItem, deleteCatalogItem } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [ref, setRef] = useState(item.ref);
  const [confirmDel, setConfirmDel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function replacePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      updateCatalogItem(item.id, { photo: await fileToDataUrl(f) });
    } catch { /* unreadable: keep current */ }
  }

  return (
    <div className="card catalog-row">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={replacePhoto} />
      {item.photo ? (
        <button className="item-thumb catalog-thumb" onClick={() => onView(item.photo!, `${item.name} · REF ${item.ref}`)}>
          <img src={item.photo} alt={item.name} />
        </button>
      ) : (
        <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>Photo</button>
      )}
      {editing ? (
        <div className="catalog-edit">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nomenclature" />
          <input value={ref} onChange={(e) => setRef(e.target.value)} aria-label="REF number" />
          <div className="form-actions">
            <button
              className="btn btn-sm btn-primary"
              disabled={!name.trim() || !ref.trim()}
              onClick={() => { updateCatalogItem(item.id, { name: name.trim(), ref: ref.trim() }); setEditing(false); }}
            >
              Save{usedOn > 0 ? ` (updates ${usedOn} ${usedOn === 1 ? "card" : "cards"})` : ""}
            </button>
            <button className="btn btn-sm" onClick={() => { setName(item.name); setRef(item.ref); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="catalog-main">
          <span className="stock-name">{item.name}</span>
          <span className="muted small">
            REF {item.ref}
            {usedOn > 0 ? ` · on ${usedOn} ${usedOn === 1 ? "card" : "cards"}` : ""}
            {stampLine(item.updatedBy, item.updatedAt) ? ` · ${stampLine(item.updatedBy, item.updatedAt)}` : ""}
          </span>
        </div>
      )}
      {!editing && (
        <div className="catalog-actions">
          {item.photo && <button className="link small" onClick={() => fileRef.current?.click()}>Replace photo</button>}
          <button className="btn btn-sm" onClick={() => setEditing(true)}>Edit</button>
          {confirmDel ? (
            <span className="confirm small">
              Remove? Cards keep their values.
              <button className="btn btn-danger btn-sm" onClick={() => deleteCatalogItem(item.id)}>Yes</button>
              <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>No</button>
            </span>
          ) : (
            <button className="icon-btn" title="Remove from catalog" onClick={() => setConfirmDel(true)}>✕</button>
          )}
        </div>
      )}
    </div>
  );
}
