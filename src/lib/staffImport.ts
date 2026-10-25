import type { TeamRole } from "../types";

// Mass-import the staff roster: one person per line, "Name, role" (comma or
// tab separated), with an optional trainee level. Role spellings are loose:
// RN, CST, scrub, CRNA and friends all land on the right role.

export interface ParsedStaff {
  name: string;
  role: TeamRole;
  level?: 1 | 2 | 3;
}

const ROLE_ALIASES: Record<string, TeamRole> = {
  surgeon: "surgeon", md: "surgeon", do: "surgeon", doctor: "surgeon", attending: "surgeon",
  nurse: "nurse", rn: "nurse", circulator: "nurse", "circulating nurse": "nurse", lpn: "nurse",
  tech: "tech", cst: "tech", scrub: "tech", "scrub tech": "tech", "surgical tech": "tech", "st": "tech",
  "surgical technologist": "tech", "surgical technician": "tech", technologist: "tech",
  trainee: "trainee", student: "trainee", "trainee tech": "trainee",
  resident: "resident", fellow: "resident", pgy: "resident",
  phase2: "phase2", "phase ii": "phase2", "phase 2": "phase2", "phase ii student": "phase2", "phase 2 student": "phase2",
  anesthesia: "anesthesia", "anesthesia provider": "anesthesia", crna: "crna", anesthesiologist: "anesthesiologist",
  "or admin": "oradmin", admin: "oradmin", administrator: "oradmin", "or manager": "oradmin", manager: "oradmin", director: "oradmin",
  scheduler: "scheduler", scheduling: "scheduler",
  rep: "rep", "vendor rep": "rep", "sales rep": "rep", vendor: "rep", "device rep": "rep",
  spd: "spd", "spd tech": "spd", "sterile processing": "spd", "sterile processing tech": "spd", "cs tech": "spd",
};

function parseRole(raw: string): { role: TeamRole; level?: 1 | 2 | 3 } | null {
  const t = raw.trim().toLowerCase().replace(/\./g, "");
  if (!t) return null;
  // "trainee 2", "trainee ii", "resident lvl 3", "trainee level I"
  const lvl = /(?:^|\s)(?:lvl|level)?\s*(1|2|3|i{1,3})$/i.exec(t);
  const base = lvl ? t.slice(0, lvl.index).trim().replace(/\s*(?:lvl|level)\s*$/i, "").trim() : t;
  const role = ROLE_ALIASES[base] ?? ROLE_ALIASES[t];
  if (!role) return null;
  let level: 1 | 2 | 3 | undefined;
  if (role === "trainee" && lvl) {
    const v = lvl[1].toLowerCase();
    level = v === "i" ? 1 : v === "ii" ? 2 : v === "iii" ? 3 : (Number(v) as 1 | 2 | 3);
  }
  return { role, level };
}

/** Best-effort role from free text: a person's "RN, Charge" label, a
 *  position's name ("Tech 2", "On-call Ortho Surgeon"). Null when no role
 *  can be read out of it. Order matters: "surgical tech" is a tech. */
export function guessRole(raw?: string): TeamRole | null {
  if (!raw?.trim()) return null;
  const t = raw.toLowerCase().replace(/\./g, "");
  const direct = parseRole(t);
  if (direct) return direct.role;
  for (const tok of t.split(/[,/()&]|\band\b|\bor\b/)) {
    const r = parseRole(tok.trim());
    if (r) return r.role;
  }
  if (/\bcrna\b/.test(t)) return "crna";
  if (/anesthesiologist/.test(t)) return "anesthesiologist";
  if (/anesthes/.test(t)) return "anesthesia";
  if (/\bspd\b|sterile proc/.test(t)) return "spd";
  if (/\brep\b|vendor/.test(t)) return "rep";
  if (/schedul/.test(t)) return "scheduler";
  if (/\badmin|manager|director/.test(t)) return "oradmin";
  if (/resident|fellow|\bpgy/.test(t)) return "resident";
  if (/tech|cst|scrub/.test(t)) return "tech";
  if (/nurse|\brn\b|charge|circulat|\blpn\b/.test(t)) return "nurse";
  if (/phase\s*(ii|2)/.test(t)) return "phase2";
  if (/trainee|student/.test(t)) return "trainee";
  if (/surgeon|\bmd\b|\bdo\b|\bdr\b/.test(t)) return "surgeon";
  return null;
}

export function parseStaffList(text: string): { members: ParsedStaff[]; errors: string[] } {
  const members: ParsedStaff[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/\t|,/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      errors.push(`"${line}": needs a name and a role, like "Kim Park, nurse"`);
      continue;
    }
    // "Last, First, role" also works: the role is always the LAST part.
    const roleRaw = parts[parts.length - 1];
    const parsed = parseRole(roleRaw);
    if (!parsed) {
      errors.push(`"${line}": unknown role "${roleRaw}"`);
      continue;
    }
    const name = parts.slice(0, -1).join(", ");
    const key = `${name.toLowerCase()}|${parsed.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    members.push({ name, role: parsed.role, level: parsed.level });
  }
  if (members.length === 0 && errors.length === 0) errors.push("Nothing to import.");
  return { members, errors };
}
