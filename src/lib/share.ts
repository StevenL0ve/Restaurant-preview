import type { PrefCard, SectionKey, Surgeon } from "../types";
import { SECTIONS } from "../types";

// Render a card as clean plain text. Travelers move between facilities and want
// to drop a card into Notes, a text, or an email — so "share" is just good text,
// not a locked-in format.

export function cardToText(
  card: PrefCard,
  surgeon?: Surgeon,
  locationName?: (id: string) => string | undefined,
): string {
  const lines: string[] = [];
  lines.push(card.procedure.toUpperCase());
  if (surgeon) {
    lines.push(`${surgeon.name} — ${surgeon.specialty}${surgeon.facility ? ` · ${surgeon.facility}` : ""}`);
    if (surgeon.gloveSize) lines.push(`Gloves: ${surgeon.gloveSize}${surgeon.gloveType ? ` (${surgeon.gloveType})` : ""}`);
  }
  lines.push("");

  const meta: [string, string | undefined][] = [
    ["Position", card.position],
    ["Prep", card.prep],
    ["Draping", card.draping],
  ];
  for (const [label, val] of meta) if (val?.trim()) lines.push(`${label}: ${val}`);
  if (card.notes?.trim()) lines.push(`Notes: ${card.notes}`);

  for (const sec of SECTIONS) {
    const arr = card[sec.key as SectionKey];
    if (!arr.length) continue;
    lines.push("");
    lines.push(`${sec.label.toUpperCase()}`);
    for (const it of arr) {
      lines.push(`  • ${it.name}${it.detail ? ` — ${it.detail}` : ""}`);
      const where = it.locationId ? locationName?.(it.locationId) : undefined;
      if (where) lines.push(`      📍 ${where}`);
    }
  }

  lines.push("");
  lines.push("— shared from ORSync");
  return lines.join("\n");
}

/** mailto: link that opens the user's mail app with the card as the body —
 *  works everywhere (phone or computer) with no server. */
export function mailtoHref(
  card: PrefCard,
  surgeon?: Surgeon,
  locationName?: (id: string) => string | undefined,
): string {
  const subject = `Preference card: ${card.procedure}${surgeon ? ` — ${surgeon.name}` : ""}`;
  const body = cardToText(card, surgeon, locationName);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** sms: link with the card text prefilled — opens Messages on a phone. */
export function smsHref(
  card: PrefCard,
  surgeon?: Surgeon,
  locationName?: (id: string) => string | undefined,
): string {
  const body = cardToText(card, surgeon, locationName);
  // `sms:?&body=` is the form iOS and Android both accept for no-recipient texts.
  return `sms:?&body=${encodeURIComponent(body)}`;
}

/** Copy text to the clipboard, falling back to a hidden textarea + execCommand
 *  for the older WKWebView path. Resolves true on success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Use the native share sheet when available (iOS), else fall back to copy. */
export async function shareCard(
  card: PrefCard,
  surgeon?: Surgeon,
  locationName?: (id: string) => string | undefined,
): Promise<"shared" | "copied" | "failed"> {
  const text = cardToText(card, surgeon, locationName);
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title: card.procedure, text });
      return "shared";
    } catch {
      // user cancelled or share failed — fall back to clipboard
    }
  }
  return (await copyText(text)) ? "copied" : "failed";
}
