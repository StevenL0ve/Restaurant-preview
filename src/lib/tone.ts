import type { ToneLevel } from "../types";

// On-device tone checker. Runs entirely in the browser — no AI service, no
// subscription, no data leaving the device. OurFamilyWizard charges for its
// "ToneMeter"; here it's free and instant, and it suggests a calmer rewrite.

const HOSTILE = [
  "stupid", "idiot", "liar", "lying", "pathetic", "useless", "hate",
  "shut up", "never", "always", "ridiculous", "selfish", "disgusting",
  "loser", "worthless", "you people", "as usual", "obviously",
];

const TENSE = [
  "you need to", "you have to", "why didn't you", "why can't you",
  "again", "supposed to", "forgot", "late", "not my problem",
  "whatever", "fine.", "seriously", "unbelievable", "frankly",
];

const SOFTENERS = [
  "please", "thank you", "thanks", "appreciate", "could we",
  "would you mind", "let's", "i understand", "i know", "sorry",
];

export interface ToneResult {
  level: ToneLevel;
  score: number; // 0 (calm) .. 100 (hostile)
  flagged: string[];
  suggestion: string | null;
}

function countHits(text: string, phrases: string[]): string[] {
  const lower = text.toLowerCase();
  return phrases.filter((p) => lower.includes(p));
}

export function analyzeTone(text: string): ToneResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { level: "calm", score: 0, flagged: [], suggestion: null };
  }

  const hostileHits = countHits(trimmed, HOSTILE);
  const tenseHits = countHits(trimmed, TENSE);
  const softenerHits = countHits(trimmed, SOFTENERS);

  // ALL CAPS and excessive punctuation read as shouting.
  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  const capsRatio = letters ? (letters.replace(/[^A-Z]/g, "").length / letters.length) : 0;
  const shouting = letters.length > 8 && capsRatio > 0.6;
  const bangs = (trimmed.match(/!/g) || []).length;

  let score = 0;
  score += hostileHits.length * 34;
  score += tenseHits.length * 16;
  score += shouting ? 25 : 0;
  score += Math.min(bangs, 4) * 6;
  score -= softenerHits.length * 12;
  score = Math.max(0, Math.min(100, score));

  const level: ToneLevel = score >= 60 ? "hostile" : score >= 28 ? "tense" : "calm";

  const flagged = [
    ...hostileHits,
    ...tenseHits,
    ...(shouting ? ["ALL CAPS"] : []),
  ];

  let suggestion: string | null = null;
  if (level !== "calm") {
    suggestion = buildSuggestion(trimmed, level);
  }

  return { level, score, flagged, suggestion };
}

// A lightweight rewrite: strip the loaded phrases, drop the shouting, and
// reframe demands ("you need to") as requests ("could we"). It's deliberately
// conservative — it nudges rather than rewrites the meaning.
function buildSuggestion(text: string, level: ToneLevel): string {
  let out = text;

  const replacements: [RegExp, string][] = [
    [/\byou need to\b/gi, "could we"],
    [/\byou have to\b/gi, "it would help if we could"],
    [/\bwhy didn't you\b/gi, "next time, could we make sure to"],
    [/\bwhy can't you\b/gi, "could we find a way to"],
    [/\bnot my problem\b/gi, "something we should solve together"],
    [/\bas usual\b/gi, ""],
    [/\bobviously\b/gi, ""],
    [/\bseriously\b/gi, ""],
    [/\bwhatever\b/gi, ""],
    [/\bridiculous\b/gi, "frustrating"],
    [/\bselfish\b/gi, "difficult for me"],
  ];
  for (const [re, to] of replacements) out = out.replace(re, to);

  // De-shout: convert long all-caps runs to sentence case.
  out = out.replace(/\b[A-Z]{4,}\b/g, (w) => w[0] + w.slice(1).toLowerCase());
  // Collapse excessive punctuation.
  out = out.replace(/!{2,}/g, ".").replace(/!\s*/g, ". ");
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").trim();

  const opener = level === "hostile"
    ? "I'm frustrated, but I want to keep this productive. "
    : "";
  // Ensure it ends cleanly.
  if (out && !/[.?]$/.test(out)) out += ".";
  return (opener + out).trim();
}

export function toneLabel(level: ToneLevel): string {
  return level === "calm" ? "Calm" : level === "tense" ? "Tense" : "Heated";
}
