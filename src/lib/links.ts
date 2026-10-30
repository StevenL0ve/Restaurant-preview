// Deep links into the digital library, for QR codes on printed cards and
// anywhere else a paper copy needs a way back to the live version. The web
// app serves anyone without the app installed; same routes, same data model.
//
// The website is moving to its own domain. Builds already in the stores keep
// the github.io address, which GitHub redirects (paths and #links intact)
// once the domain is live; the website itself links to wherever it's served.
export const NEW_WEB_HOST = "orsyncapp.com";
/** Addresses the website may be served from (orsync.ourgymapp.com is the
 *  fallback if that's the one pointed at GitHub). */
const WEB_HOSTS = [NEW_WEB_HOST, "orsync.ourgymapp.com"];
const OLD_WEB_APP_URL = "https://stevenl0ve.github.io/Restaurant-preview";
const servedFrom = typeof location !== "undefined" ? location.hostname.replace(/^www\./, "") : "";
export const WEB_APP_URL = WEB_HOSTS.includes(servedFrom) ? `https://${servedFrom}` : OLD_WEB_APP_URL;
/** On the website at its old github.io address (not the apps). */
export const onOldWebAddress = servedFrom.endsWith("github.io");
/** "orsyncapp.com" or "stevenl0ve.github.io/Restaurant-preview". */
export const WEB_APP_LABEL = WEB_APP_URL.replace(/^https:\/\//, "");

/** The live preference card. */
export const cardLink = (cardId: string) => `${WEB_APP_URL}/#/cards/${cardId}`;

/** The live case cart: one card, one case, one day, with live pulls,
 *  missing items, QC state, and that day's special considerations. */
export const cartLink = (cartId: string) => `${WEB_APP_URL}/#/carts/${cartId}`;

/** A join link that opens the app with the facility name and password
 *  filled in (sent by admins after a password change). The password rides
 *  in the hash, which browsers never send to a server. */
export const facilityJoinLink = (name: string, password: string) =>
  `${WEB_APP_URL}/#/join?f=${encodeURIComponent(name)}&p=${encodeURIComponent(password)}`;

/** Same, as the native app's own scheme (opens ORSync directly when installed). */
export const facilityJoinAppLink = (name: string, password: string) =>
  `orsync://join?f=${encodeURIComponent(name)}&p=${encodeURIComponent(password)}`;

/** A loaner request and one of its sets: what the printed set label's QR
 *  points at, so a scan opens the live request. */
export const loanerSetLink = (loanerId: string, setId: string) => `${WEB_APP_URL}/#/loaners?req=${loanerId}&set=${setId}`;
