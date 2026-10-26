import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Mascot } from "../components/Mascot";
import { FREE_PERKS, PRO_PERKS, FACILITY_PERKS, hasPersonalCloud } from "../lib/tier";
import { facilityPricingMailto, repLinkMailto } from "../lib/contact";
import { useContactContext } from "../components/HelpContact";
import { useAuth } from "../state/auth";
import { buyPro, iapPlatform, iapReady, initIap, manageSubscriptionsUrl, proPackages, restorePro, type ProPackage } from "../lib/iap";

// The Pro paywall. During beta it's informational (everything's already
// unlocked); at launch the CTA becomes a real StoreKit purchase.
export function Paywall() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const contact = useContactContext();
  const [pro, setPro] = useState(hasPersonalCloud());
  const [pkgs, setPkgs] = useState<ProPackage[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const native = iapPlatform();
  const storeName = native === "android" ? "Google Play" : "the App Store";

  useEffect(() => {
    if (!iapReady() || !user?.uid) { setPkgs([]); return; }
    let on = true;
    initIap(user.uid).then((p) => { if (on) setPro(p || hasPersonalCloud()); }).catch(() => undefined);
    proPackages()
      .then((list) => { if (!on) return; setPkgs(list); setChosen(list.find((x) => x.period === "year")?.id ?? list[0]?.id ?? null); })
      .catch(() => { if (on) setPkgs([]); });
    return () => { on = false; };
  }, [user?.uid]);

  async function subscribe() {
    const pkg = pkgs?.find((x) => x.id === chosen);
    if (!pkg) return;
    setBusy(true); setMsg(null);
    try {
      const ok = await buyPro(pkg);
      if (ok) { setPro(true); setMsg({ ok: true, text: "You're Pro. Your library now syncs to every device you sign in on." }); }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "The purchase didn't go through." });
    } finally { setBusy(false); }
  }

  async function restore() {
    setBusy(true); setMsg(null);
    try {
      const ok = await restorePro();
      setPro(ok || hasPersonalCloud());
      setMsg(ok ? { ok: true, text: "Pro restored." } : { ok: false, text: `No active Pro subscription found for this ${storeName} account.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't restore purchases." });
    } finally { setBusy(false); }
  }

  const facilityMail = facilityPricingMailto(contact);
  const repMail = repLinkMailto(contact);

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <button className="link" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="paywall-hero">
        <Mascot size={96} className="paywall-logo" />
        <h1>Plans</h1>
        <p className="muted">ORSync is free on your phone. Pay only for storage beyond it.</p>
      </div>

      <div className="card plan-section">
        <h2>Free <span className="pill">on this phone</span></h2>
        <ul className="perks">
          {FREE_PERKS.map((p) => (
            <li key={p}><span className="perk-check"><Icon name="check" size={16} /></span> {p}</li>
          ))}
        </ul>
      </div>

      <div className="card plan-section">
        <h2>Pro <span className="pill pill-brand">your library in the cloud</span></h2>
        <ul className="perks">
          {PRO_PERKS.map((p) => (
            <li key={p}><span className="perk-check"><Icon name="check" size={16} /></span> {p}</li>
          ))}
        </ul>

        {pro ? (
          <>
            <button className="btn btn-primary paywall-cta" disabled><Icon name="check" size={18} /> You're Pro</button>
            {native && <a className="btn paywall-cta" href={manageSubscriptionsUrl()} target="_blank" rel="noreferrer">Manage subscription</a>}
          </>
        ) : !native ? (
          <p className="muted small">Subscribe to Pro in the ORSync app for iPhone or Android. It applies to your account everywhere you sign in.</p>
        ) : !iapReady() || (pkgs && pkgs.length === 0) ? (
          <p className="muted small">Pro subscriptions are coming soon in {storeName}.</p>
        ) : pkgs === null ? (
          <p className="muted small">Loading prices from {storeName}…</p>
        ) : (
          <>
            <div className="plan-row">
              {pkgs.map((p) => (
                <button key={p.id} className={"plan-card" + (chosen === p.id ? " selected" : "")} onClick={() => setChosen(p.id)}>
                  {p.period === "year" && <span className="plan-badge">Best value</span>}
                  <span className="plan-label">{p.title}</span>
                  <span className="plan-price">{p.price}</span>
                  <span className="plan-cadence">{p.period === "year" ? "per year" : p.period === "month" ? "per month" : ""}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-primary paywall-cta" disabled={busy || !chosen} onClick={subscribe}>
              {busy ? "Opening " + storeName + "…" : "Subscribe"}
            </button>
          </>
        )}

        {native && !pro && (
          <button className="link small" style={{ display: "block", margin: "8px auto 0" }} disabled={busy} onClick={restore}>Restore purchases</button>
        )}
        {msg && <p className={(msg.ok ? "pos" : "neg") + " small"} style={{ textAlign: "center" }}>{msg.text}</p>}

        {native && (
          <p className="muted small paywall-fine">
            Payment is charged to your {native === "android" ? "Google Play" : "Apple ID"} account at confirmation of
            purchase. The subscription renews automatically at the same price for each period unless it's
            cancelled at least 24 hours before the end of the current period; your account is charged for
            renewal within 24 hours before the period ends. Manage or cancel anytime in your {storeName}{" "}
            account settings. Your cards stay on your phone either way.{" "}
            <a className="link" href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer">Terms of Use</a>
            {" · "}
            <a className="link" href="https://stevenl0ve.github.io/Restaurant-preview/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a>
          </p>
        )}
      </div>

      <div className="card plan-section">
        <h2>Facility <span className="pill">for a whole OR</span></h2>
        <ul className="perks">
          {FACILITY_PERKS.map((p) => (
            <li key={p}><span className="perk-check"><Icon name="check" size={16} /></span> {p}</li>
          ))}
        </ul>
        <p className="muted small">
          Members don't need Pro: everything they keep in the facility's library is stored and synced
          under the facility's account. Their own phone keeps its copy too.
        </p>
        <a className="btn btn-primary" href={facilityMail}>Contact us for facility pricing</a>
      </div>

      <div className="card plan-section">
        <h2>Vendor reps <span className="pill">set requests</span></h2>
        <p className="muted small">
          A rep's link shows only the set requests assigned to them at a facility, with status,
          check-in, and printable set labels. Never the facility's library.
        </p>
        <a className="btn" href={repMail}>Contact us about a rep link</a>
      </div>
    </div>
  );
}
