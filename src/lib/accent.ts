// Per-specialty accent colors — ambient color that responds to context.
// Known specialties get a fixed, recognizable hue (ortho is always indigo,
// OB always rose…); anything else gets a stable hash-picked color so a
// specialty never changes tint between sessions.

const NAMED: [RegExp, string][] = [
  [/general/i, "#0d9488"], // teal — the home hue
  [/ortho/i, "#6366f1"], // indigo
  [/ob|gyn|obstet/i, "#e11d48"], // rose
  [/ent|otolaryng/i, "#d97706"], // amber
  [/cardi/i, "#dc2626"], // red
  [/neuro/i, "#7c3aed"], // violet
  [/uro/i, "#0891b2"], // cyan
  [/plast/i, "#db2777"], // pink
  [/vasc/i, "#b91c1c"], // deep red
  [/gi|endo|colorect/i, "#ca8a04"], // gold
  [/ophthal|eye/i, "#2563eb"], // blue
  [/spine/i, "#4f46e5"], // deep indigo
];

const FALLBACK = ["#0d9488", "#6366f1", "#e11d48", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#2563eb"];

export function accentFor(specialty: string): string {
  const s = specialty.trim();
  for (const [re, color] of NAMED) if (re.test(s)) return color;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return FALLBACK[Math.abs(h) % FALLBACK.length];
}

/** Inline style helper: sets the --accent custom property for CSS to use. */
export function accentStyle(specialty: string): Record<string, string> {
  return { "--accent": accentFor(specialty) };
}
