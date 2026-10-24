// Deep links into the digital library, for QR codes on printed cards and
// anywhere else a paper copy needs a way back to the live version. The web
// app serves anyone without the app installed; same routes, same data model.
export const WEB_APP_URL = "https://stevenl0ve.github.io/Restaurant-preview";

/** The live preference card. */
export const cardLink = (cardId: string) => `${WEB_APP_URL}/#/cards/${cardId}`;

/** The live case cart: one card, one case, one day, with live pulls,
 *  missing items, QC state, and that day's special considerations. */
export const cartLink = (cartId: string) => `${WEB_APP_URL}/#/carts/${cartId}`;
