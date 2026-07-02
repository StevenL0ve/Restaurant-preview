import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/auth";
import { useStore } from "../state/store";
import { addGiftToWallet, giftCardNumber, preferredWallet, type WalletKind } from "../lib/wallet";
import { isValidReload } from "../lib/gift";
import { money, fullDate } from "../lib/format";
import { tapLight, notifySuccess } from "../lib/haptics";

const RELOADS = [10, 25, 50];

export function GiftCard() {
  const { user } = useAuth();
  const { state, reloadGift } = useStore();
  const { gift } = state;
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<WalletKind | null>(null);

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
