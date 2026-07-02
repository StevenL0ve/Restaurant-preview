import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/auth";
import { useStore } from "../state/store";
import { addGiftToWallet, giftCardNumber, preferredWallet, type WalletKind } from "../lib/wallet";
import { isValidReload } from "../lib/gift";
import { makeGiftCode } from "../lib/giftcode";
import { money, fullDate } from "../lib/format";
import { tapLight, notifySuccess } from "../lib/haptics";

const RELOADS = [10, 25, 50];
const GIFT_AMOUNTS = [10, 25, 50, 100];

export function GiftCard() {
  const { user } = useAuth();
  const { state, reloadGift, redeemGiftCode } = useStore();
  const { gift } = state;
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<WalletKind | null>(null);

  // Gift someone / redeem a code
  const [giftAmount, setGiftAmount] = useState(25);
  const [giftCode, setGiftCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function buyGift() {
    // Production: charge the card via Stripe first, then the server issues
    // the code. Demo: the code is issued directly.
    const code = makeGiftCode(giftAmount);
    if (code) {
      setGiftCode(code);
      setCopied(false);
      notifySuccess();
    }
  }

  const smsBody = giftCode
    ? encodeURIComponent(
        `You've got a Common Ground gift! 🎁 $${giftAmount} to spend at the café, Fig + Olive, yoga, massage or the Zen Den. ` +
        `Download the CGP app and paste this code on the Gift Card screen: ${giftCode}`,
      )
    : "";

  async function copyCode() {
    if (!giftCode) return;
    try {
      await navigator.clipboard.writeText(giftCode);
      setCopied(true);
    } catch {
      /* clipboard unavailable; the code is visible to copy manually */
    }
  }

  function redeem() {
    const res = redeemGiftCode(redeemInput);
    if (res.ok) {
      notifySuccess();
      setRedeemMsg({ ok: true, text: `🎉 ${money(res.amount!)} added to your card!` });
      setRedeemInput("");
    } else {
      setRedeemMsg({ ok: false, text: res.error ?? "Could not redeem that code." });
    }
  }

  const number = giftCardNumber(user?.email ?? "guest@cgp");
  const name = user?.name ?? "CGP Member";
  const preferred = preferredWallet();
  const customAmount = Number(custom);

  function reload(amount: number) {
    reloadGift(amount);
    notifySuccess();
    setCustom("");
  }

  async function add(kind: WalletKind) {
    setBusy(kind);
    setStatus(null);
    tapLight();
    const res = await addGiftToWallet(kind, { cardNumber: number, memberName: name, balance: gift.balance });
    setStatus(res.message);
    setBusy(null);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Gift Card</h1>
          <p className="page-sub">Reload anytime, pay with it at checkout, keep it in your wallet.</p>
        </div>
      </div>

      {/* The card — styled after the printed CGP gift card. */}
      <div className="gift-card">
        <img className="gift-card-logo" src="/brand/logo.jpeg" alt="Common Ground logo" />
        <div className="gift-card-strip">
          <span>GIFT CARD</span>
          <span className="gift-card-number">{number}</span>
        </div>
      </div>

      <div className="card row-card">
        <div>
          <div className="row-sub">Balance</div>
          <div className="gift-balance">{money(gift.balance)}</div>
        </div>
        <div className="row-sub">{name}</div>
      </div>

      {/* Reload */}
      <section className="section">
        <h2 className="section-title">Reload</h2>
        <div className="reload-row">
          {RELOADS.map((a) => (
            <button key={a} className="btn btn-ghost" onClick={() => reload(a)}>+{money(a)}</button>
          ))}
        </div>
        <div className="reload-custom">
          <input
            type="number"
            min="1"
            max="500"
            step="0.01"
            inputMode="decimal"
            placeholder="Custom amount"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            aria-label="Custom reload amount"
          />
          <button
            className="btn btn-primary"
            disabled={!isValidReload(customAmount)}
            onClick={() => reload(customAmount)}
          >
            Reload
          </button>
        </div>
        <p className="footnote">
          Demo reloads are instant. In production this charges your saved payment method.
        </p>
      </section>

      {/* Wallets */}
      <div className="wallet-actions">
        <button
          className={"btn wallet-btn wallet-apple" + (preferred === "apple" ? " wallet-primary" : "")}
          onClick={() => add("apple")}
          disabled={busy !== null}
        >
          {busy === "apple" ? "Adding…" : " Add to Apple Wallet"}
        </button>
        <button
          className={"btn wallet-btn wallet-google" + (preferred === "google" ? " wallet-primary" : "")}
          onClick={() => add("google")}
          disabled={busy !== null}
        >
          {busy === "google" ? "Adding…" : "Save to Google Wallet"}
        </button>
      </div>
      {status && <p className="wallet-status">{status}</p>}

      <div className="card row-card">
        <div>
          <div className="row-title">Use it at checkout</div>
          <div className="row-sub">Toggle "Pay with gift card" in your cart and the balance covers what it can.</div>
        </div>
        <Link to="/menu" className="btn btn-add">Order</Link>
      </div>

      {/* Gift someone */}
      <section className="section">
        <h2 className="section-title">🎁 Gift someone</h2>
        <div className="card reserve-form">
          <p className="row-sub" style={{ marginTop: 0 }}>
            Buy a gift and text them the code — perfect for a massage, Zen Den
            session, dinner at Fig + Olive, or coffee on you. They paste it into
            their CGP app and the balance lands on their card.
          </p>
          <div className="reload-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {GIFT_AMOUNTS.map((a) => (
              <button
                key={a}
                className={"btn " + (giftAmount === a ? "btn-primary" : "btn-ghost")}
                onClick={() => { setGiftAmount(a); setGiftCode(null); }}
              >
                {money(a)}
              </button>
            ))}
          </div>
          {!giftCode ? (
            <button className="btn btn-primary btn-block" onClick={buyGift}>
              Buy a {money(giftAmount)} gift
            </button>
          ) : (
            <>
              <div className="gift-code" aria-label="Your gift code">{giftCode}</div>
              <div className="form-actions">
                <a className="btn btn-primary" href={`sms:?&body=${smsBody}`}>💬 Send via text</a>
                <button className="btn" onClick={copyCode}>{copied ? "Copied ✓" : "Copy code"}</button>
              </div>
              <p className="footnote">
                Demo note: in production the charge happens first and codes are
                issued & tracked server-side.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Redeem a code */}
      <section className="section">
        <h2 className="section-title">Got a gift code?</h2>
        <div className="card">
          <div className="reload-custom">
            <input
              value={redeemInput}
              onChange={(e) => { setRedeemInput(e.target.value); setRedeemMsg(null); }}
              placeholder="Paste your code — CGPG-…"
              aria-label="Gift code"
              autoCapitalize="characters"
            />
            <button className="btn btn-primary" disabled={!redeemInput.trim()} onClick={redeem}>
              Redeem
            </button>
          </div>
          {redeemMsg && (
            <p className={redeemMsg.ok ? "wallet-status" : "auth-error"} style={{ marginTop: 10 }}>
              {redeemMsg.text}
            </p>
          )}
        </div>
      </section>

      {/* History */}
      {gift.history.length > 0 && (
        <section className="section">
          <h2 className="section-title">Activity</h2>
          <div className="stack">
            {gift.history.map((t) => (
              <div key={t.id} className="card row-card">
                <div>
                  <div className="row-title">{t.kind === "reload" ? "💳 Reload" : "☕️ Spent"}{t.note ? ` · ${t.note}` : ""}</div>
                  <div className="row-sub">{fullDate(t.at)}</div>
                </div>
                <span className={"gift-amount" + (t.kind === "reload" ? " gift-in" : "")}>
                  {t.kind === "reload" ? "+" : "−"}{money(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
