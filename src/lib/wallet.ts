// Apple Wallet + Google Wallet integration for the café punch card.
//
// A real Wallet pass must be cryptographically signed with the venue's Apple
// Pass certificate (for a .pkpass) or a Google service-account key (for the
// "Save to Google Wallet" JWT). Those secrets can only live on a server, so the
// app calls out to the CGP pass service and opens whatever signed pass URL it
// returns. When no pass service is configured (e.g. this preview build), we fall
// back to downloading the unsigned pass payload so the card is still tangible
// and the same code path lights up the moment an endpoint is wired in.

export interface WalletPass {
  memberId: string;
  memberName: string;
  punches: number;
  goal: number;
  rewards: number;
  lifetime: number;
}

export type WalletKind = "apple" | "google";

export interface WalletResult {
  opened: boolean; // did we open a real signed pass in Wallet?
  message: string; // user-facing status
}

// The pass service base URL, injected at build time. Left unset in the preview
// build; set VITE_WALLET_ENDPOINT to enable one-tap Wallet adding.
const ENDPOINT = (import.meta.env.VITE_WALLET_ENDPOINT as string | undefined)?.replace(/\/$/, "");

// Deterministic loyalty number from the account email — stable across devices,
// short enough for a barista to read aloud, and the value encoded in the pass
// barcode.
export function memberId(email: string): string {
  let h = 5381;
  for (const ch of email.toLowerCase()) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return `CGP-${h.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

// Detect the device so we can lead with the right wallet.
export function preferredWallet(): WalletKind {
  return /iphone|ipad|ipod|mac/i.test(navigator.userAgent) ? "apple" : "google";
}

function download(filename: string, data: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Shape the pass payload the same way a signing server would consume it.
export function passPayload(kind: WalletKind, pass: WalletPass) {
  const balance = `${pass.punches} / ${pass.goal} punches`;
  const rewards = `${pass.rewards} free drink${pass.rewards === 1 ? "" : "s"} ready`;
  return {
    kind,
    organizationName: "The Common Ground Projects",
    description: "Common Grounds Café Punch Card",
    barcode: { format: "QR", message: pass.memberId, altText: pass.memberId },
    fields: {
      member: pass.memberName,
      memberId: pass.memberId,
      balance,
      rewards,
      lifetime: `${pass.lifetime} lifetime`,
    },
    colors: { background: "#2f6b3f", foreground: "#ffffff", label: "#cfe6d3" },
  };
}

// Add the punch card to Apple Wallet or Google Wallet. Opens the signed pass
// when the pass service is available; otherwise downloads the payload and says
// so, without pretending the card was added.
export async function addToWallet(kind: WalletKind, pass: WalletPass): Promise<WalletResult> {
  const payload = passPayload(kind, pass);

  if (ENDPOINT) {
    try {
      const res = await fetch(`${ENDPOINT}/wallet/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Pass service error (${res.status}).`);
      const { url } = (await res.json()) as { url?: string };
      if (!url) throw new Error("Pass service did not return a pass link.");
      // Apple serves a .pkpass to open in Wallet; Google returns a save link.
      window.open(url, kind === "google" ? "_blank" : "_self");
      return { opened: true, message: "Opening your Wallet pass…" };
    } catch (err) {
      return {
        opened: false,
        message: err instanceof Error ? err.message : "Could not reach the pass service.",
      };
    }
  }

  // Preview fallback: hand the user their pass payload so nothing is faked.
  const ext = kind === "apple" ? "applewallet.json" : "googlewallet.json";
  download(`cgp-punchcard.${ext}`, JSON.stringify(payload, null, 2), "application/json");
  const wallet = kind === "apple" ? "Apple Wallet" : "Google Wallet";
  return {
    opened: false,
    message: `Your punch card is ready. One-tap ${wallet} adding turns on once CGP connects its pass service — we downloaded the card in the meantime.`,
  };
}
