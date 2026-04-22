/* ============================================================ */
/* FIREBASE CONFIG - CLUB VIP ZOORIGEN                           */
/* ============================================================ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBTNq3PsopzEbO4nmrUOP2Kz4Q0IMAn40k",
  authDomain: "club-zoorigen.firebaseapp.com",
  projectId: "club-zoorigen",
  storageBucket: "club-zoorigen.firebasestorage.app",
  messagingSenderId: "239752114394",
  appId: "1:239752114394:web:ee763ce27504771f44f5e3"
};

const WEBHOOK_SERVER_URL = "https://zoorigen-webhook-production.up.railway.app";

const VARIANT_MENSUAL = "45386138714166";
const VARIANT_ANUAL   = "45386327916598";

const SHOPIFY_CHECKOUT_URL        = `https://pfueck-wm.myshopify.com/cart/${VARIANT_MENSUAL}:1`;
const SHOPIFY_ANNUAL_CHECKOUT_URL = `https://pfueck-wm.myshopify.com/cart/${VARIANT_ANUAL}:1`;

function buildCheckoutURL(plan, email) {
  const variantId = plan === 'anual' ? VARIANT_ANUAL : VARIANT_MENSUAL;
  const emailParam = email ? `&checkout[email]=${encodeURIComponent(email)}` : '';
  const returnTo = encodeURIComponent('https://www.zoorigen.com/pages/club-suscripcion.html?paid=1');
  return `https://pfueck-wm.myshopify.com/cart/${variantId}:1?channel=buy_button&skip_shop_pay=true&return_to=${returnTo}${emailParam}`;
}

if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  window.auth = firebase.auth();
  window.db   = firebase.firestore();
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
}
