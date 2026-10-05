import type { AppState, LoanerSet, LoanerStatus, LoanerTray } from "../types";
import { LOANER_STATUSES } from "../types";

// The loaner request travels as a file, exactly like a shared preference card:
// the clinic sends the rep a request (surgeon, facility, clinic contact,
// procedure, special considerations), the rep's copy of ORSync imports it,
// they fill in sets, layer photos, ETA and statuses, and send the same file
// back. The loaner keeps one id across both devices, so re-imports merge
// instead of duplicating. No server, no accounts: the file is the sync.

export const LOANER_KIND = "orsync/loaner";

export interface LoanerFile {
  kind: typeof LOANER_KIND;
  version: 1;
  exportedAt: string;
  loaner: Omit<LoanerTray, "facilityId" | "surgeonId" | "cardId">;
}

export function isLoanerFile(x: unknown): x is LoanerFile {
  return !!x && typeof x === "object" && (x as { kind?: string }).kind === LOANER_KIND;
}

const VALID_STATUS = new Set<string>(LOANER_STATUSES.map((s) => s.key));

function cleanStatus(s: unknown): LoanerStatus {
  return VALID_STATUS.has(String(s)) ? (s as LoanerStatus) : "requested";
}

function cleanSets(sets: unknown): LoanerSet[] {
  if (!Array.isArray(sets)) return [];
  return sets
    .filter((s) => s && typeof s === "object" && typeof (s as LoanerSet).name === "string")
    .map((s: LoanerSet) => ({
      id: s.id || `set-${Math.random().toString(36).slice(2, 9)}`,
      name: s.name,
      photos: Array.isArray(s.photos) ? s.photos.filter((p) => typeof p === "string" && p.startsWith("data:image/")) : [],
      status: cleanStatus(s.status),
      history: Array.isArray(s.history) ? s.history : [],
    }));
}

/** Build the shareable file for one request. Ids for surgeon/facility/card
 *  don't cross devices, so they're resolved to names here. */
export function buildLoanerFile(state: AppState, loanerId: string, exportedAt: string): LoanerFile | null {
  const l = state.loaners.find((x) => x.id === loanerId);
  if (!l) return null;
  const surgeon = state.surgeons.find((s) => s.id === l.surgeonId);
  const facility = state.facilities.find((f) => f.id === l.facilityId);
  const { facilityId: _f, surgeonId: _s, cardId: _c, ...rest } = l;
  return {
    kind: LOANER_KIND,
    version: 1,
    exportedAt,
    loaner: {
      ...rest,
      surgeonName: surgeon?.name ?? l.surgeonName,
      facilityName: facility?.name ?? l.facilityName,
    },
  };
}

export interface LoanerImportResult {
  state: AppState;
  /** "created" = a new request landed (rep side); "merged" = an update came
   *  back for a request already here (clinic side). */
  outcome: "created" | "merged";
}

/** Fields the other side owns and may update on a merge. The local links
 *  (facilityId/surgeonId/cardId) and local notes are never clobbered. */
const MERGE_FIELDS = [
  "repName", "repPhone", "repEmail", "altContact", "vendor",
  "estimatedDelivery", "quantity", "poNumber", "status",
] as const;

export function applyLoanerFile(state: AppState, file: LoanerFile, now: string): LoanerImportResult {
  const incoming = file.loaner;
  const sets = cleanSets(incoming.sets);
  const existing = state.loaners.find((l) => l.id === incoming.id);

  if (!existing) {
    const created: LoanerTray = {
      ...incoming,
      status: cleanStatus(incoming.status),
      sets,
      history: Array.isArray(incoming.history) ? incoming.history : [],
      createdAt: incoming.createdAt || now,
      updatedAt: now,
    };
    return { state: { ...state, loaners: [created, ...state.loaners] }, outcome: "created" };
  }

  const merged: LoanerTray = { ...existing, updatedAt: now };
  for (const k of MERGE_FIELDS) {
    const v = incoming[k];
    if (v !== undefined && v !== "") (merged as unknown as Record<string, unknown>)[k] = v;
  }
  merged.status = cleanStatus(merged.status);
  // Sets are owned by whoever sent the latest file: replace wholesale, but
  // keep local photos if the incoming copy stripped them (e.g. sent "light").
  merged.sets = sets.map((s) => {
    const local = existing.sets?.find((x) => x.id === s.id);
    return s.photos.length || !local ? s : { ...s, photos: local.photos };
  });
  return {
    state: { ...state, loaners: state.loaners.map((l) => (l.id === existing.id ? merged : l)) },
    outcome: "merged",
  };
}

/** Normalize loaners from older app versions (or hand-edited files): the old
 *  6-step pipeline maps onto the full SPD pipeline, and `sets` always exists. */
const OLD_STATUS_MAP: Record<string, LoanerStatus> = {
  ready: "cooling",
  "in-use": "in-room",
  returned: "checked-out",
};

export function normalizeLoaner(l: LoanerTray): LoanerTray {
  const mapStatus = (s: unknown): LoanerStatus =>
    OLD_STATUS_MAP[String(s)] ?? cleanStatus(s);
  return {
    ...l,
    status: mapStatus(l.status),
    sets: cleanSets(l.sets),
    history: (l.history ?? []).map((h) => ({ ...h, status: mapStatus(h.status) })),
  };
}
