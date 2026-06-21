import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import type { TasteProfile, WineColor, WineStatus } from "../types";
import { ALL_COLORS, COLOR_META, COMMON_TAGS } from "../lib/wine";
import { EMPTY_TASTE } from "../lib/taste";
import { TasteBars } from "../components/TasteBars";
import { StarRating } from "../components/StarRating";

// Log a wine: snap (or pick) a photo, jot what you like, and choose whether you
// bought it (→ wine rack) or it's a wish (→ cellar only). The photo step is the
// hook; everything else is optional so logging stays a 10-second affair.
export function AddWine() {
  const { addWine } = useStore();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [producer, setProducer] = useState("");
  const [vintage, setVintage] = useState("");
  const [varietal, setVarietal] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [color, setColor] = useState<WineColor>("red");
  const [notes, setNotes] = useState("");
  const [likes, setLikes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [price, setPrice] = useState("");
  const [pairing, setPairing] = useState("");
  const [taste, setTaste] = useState<TasteProfile>({ ...EMPTY_TASTE });
  const [status, setStatus] = useState<WineStatus>("rack");

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function toggleTag(t: string) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  function setAxis(axis: keyof TasteProfile, value: number) {
    setTaste((cur) => ({ ...cur, [axis]: value }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = addWine({
      name: name.trim(),
      producer: producer.trim(),
      vintage: vintage.trim() ? Number(vintage) : null,
      varietal: varietal.trim(),
      region: region.trim(),
      country: country.trim(),
      color,
      photo,
      notes: notes.trim(),
      likes: likes.trim(),
      likeTags: tags,
      rating,
      price: price.trim() ? Number(price) : null,
      taste,
      status,
      pairing: pairing.trim(),
    });
    navigate(`/wine/${id}`);
  }

  const canSave = name.trim().length > 0;

  return (
    <div className="page add-page">
      <form className="add-form" onSubmit={save}>
        {/* Photo capture — the signature step */}
        <button
          type="button"
          className={"photo-drop" + (photo ? " has-photo" : "")}
          onClick={() => fileRef.current?.click()}
        >
          {photo ? (
            <img src={photo} alt="Bottle" />
          ) : (
            <span className="photo-hint">
              <span className="photo-cam">📷</span>
              Take a photo of the bottle
              <small>or choose from your library</small>
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhoto}
          hidden
        />

        <label className="field">
          <span>Wine name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Barolo Riserva" autoFocus />
        </label>

        <div className="row-2">
          <label className="field">
            <span>Producer</span>
            <input value={producer} onChange={(e) => setProducer(e.target.value)} placeholder="Giacomo Conterno" />
          </label>
          <label className="field">
            <span>Vintage</span>
            <input value={vintage} onChange={(e) => setVintage(e.target.value)} placeholder="2016" inputMode="numeric" />
          </label>
        </div>

        <div className="row-2">
          <label className="field">
            <span>Grape</span>
            <input value={varietal} onChange={(e) => setVarietal(e.target.value)} placeholder="Nebbiolo" />
          </label>
          <label className="field">
            <span>Price</span>
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$" inputMode="decimal" />
          </label>
        </div>

        <div className="row-2">
          <label className="field">
            <span>Region</span>
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Piedmont" />
          </label>
          <label className="field">
            <span>Country</span>
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Italy" />
          </label>
        </div>

        <fieldset className="field">
          <span className="field-legend">Style</span>
          <div className="chip-row wrap">
            {ALL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={"chip" + (color === c ? " on" : "")}
                onClick={() => setColor(c)}
              >
                <span className="chip-dot" style={{ background: COLOR_META[c].hex }} />
                {COLOR_META[c].label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>What do you like about it?</span>
          <textarea value={likes} onChange={(e) => setLikes(e.target.value)} rows={2} placeholder="The dark cherry depth and silky tannins…" />
        </label>

        <fieldset className="field">
          <span className="field-legend">Flavour tags</span>
          <div className="chip-row wrap">
            {COMMON_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                className={"chip sm" + (tags.includes(t) ? " on" : "")}
                onClick={() => toggleTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <span className="field-legend">How does it taste?</span>
          <TasteBars taste={taste} onChange={setAxis} />
        </fieldset>

        <label className="field">
          <span>Tasting notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Rose petal, tar, dried cherry…" />
        </label>

        <label className="field">
          <span>Pairs with</span>
          <input value={pairing} onChange={(e) => setPairing(e.target.value)} placeholder="Braised beef, aged cheese" />
        </label>

        <div className="field">
          <span className="field-legend">Your rating</span>
          <StarRating value={rating} onChange={setRating} size={28} />
        </div>

        <fieldset className="field">
          <span className="field-legend">Where does it go?</span>
          <div className="seg">
            <button
              type="button"
              className={"seg-btn" + (status === "rack" ? " active" : "")}
              onClick={() => setStatus("rack")}
            >
              🗄️ I bought it — Rack
            </button>
            <button
              type="button"
              className={"seg-btn" + (status === "wishlist" ? " active" : "")}
              onClick={() => setStatus("wishlist")}
            >
              ✨ Wishlist — Cellar
            </button>
          </div>
          <p className="hint">
            {status === "rack"
              ? "Owned bottles sit in your wine rack and count toward your cellar value."
              : "Wishlist bottles rest in your cellar until you buy them."}
          </p>
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            Add to cellar
          </button>
        </div>
      </form>
    </div>
  );
}
