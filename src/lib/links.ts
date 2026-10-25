// Deep links into the digital library, for QR codes on printed cards and
// anywhere else a paper copy needs a way back to the live version. The web
// app serves anyone without the app installed; same routes, same data model.
export const WEB_APP_URL = "https://stevenl0ve.github.io/Restaurant-preview";

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
