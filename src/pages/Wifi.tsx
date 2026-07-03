import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { GUEST_WIFI, wifiQrPayload } from "../lib/wifi";
import { notifySuccess } from "../lib/haptics";

// Free guest Wi-Fi, one tap away: copy the password here, or let a friend
// scan the QR with their camera to join without the app.

export function Wifi() {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(wifiQrPayload(), { width: 480, margin: 1, color: { dark: "#2c332a", light: "#fbfaf2" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, []);

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(GUEST_WIFI.password);
      setCopied(true);
      notifySuccess();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable; the password is visible to type manually */
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Free Wi-Fi</h1>
          <p className="page-sub">You're on common ground — get online while you're here.</p>
        </div>
      </div>

      <div className="card wifi-card">
        <div className="wifi-row">
          <div>
            <div className="row-sub">Network</div>
            <div className="row-title">{GUEST_WIFI.ssid}</div>
          </div>
          <span className="pill pill-ok">📶 Guest</span>
        </div>
        <div className="wifi-row">
          <div>
            <div className="row-sub">Password</div>
            <div className="wifi-pass">{GUEST_WIFI.password}</div>
          </div>
          <button className="btn btn-primary" onClick={copyPassword}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <ol className="wifi-steps">
          <li>Copy the password above</li>
          <li>Open <strong>Settings → Wi-Fi</strong></li>
          <li>Tap <strong>{GUEST_WIFI.ssid}</strong> and paste</li>
        </ol>
      </div>

      {qr && (
        <div className="card wifi-qr-card">
          <img className="wifi-qr" src={qr} alt={`Wi-Fi QR code for ${GUEST_WIFI.ssid}`} />
          <p className="row-sub" style={{ textAlign: "center" }}>
            With a friend? Have them point their camera here — their phone
            joins without the app.
          </p>
        </div>
      )}
    </div>
  );
}
