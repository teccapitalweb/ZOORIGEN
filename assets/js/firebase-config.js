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

const SELLING_PLAN_MENSUAL = "2071691318";
const SELLING_PLAN_ANUAL   = "2071724086";

const SHOPIFY_CHECKOUT_URL        = `https://pfueck-wm.myshopify.com/cart/${VARIANT_MENSUAL}:1?selling_plan=${SELLING_PLAN_MENSUAL}`;
const SHOPIFY_ANNUAL_CHECKOUT_URL = `https://pfueck-wm.myshopify.com/cart/${VARIANT_ANUAL}:1?selling_plan=${SELLING_PLAN_ANUAL}`;

/**
 * Cart permalink oficial de Shopify.
 * Sin el parámetro "storefront" va DIRECTO al checkout.
 * Ref: https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks
 */
function buildCheckoutURL(plan, email) {
  const variantId   = plan === 'anual' ? VARIANT_ANUAL       : VARIANT_MENSUAL;
  const sellingPlan = plan === 'anual' ? SELLING_PLAN_ANUAL  : SELLING_PLAN_MENSUAL;
  const emailParam  = email ? `&checkout[email]=${encodeURIComponent(email)}` : '';
  return `https://pfueck-wm.myshopify.com/cart/${variantId}:1?selling_plan=${sellingPlan}&channel=buy_button${emailParam}`;
}

if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  window.auth = firebase.auth();
  window.db   = firebase.firestore();
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
}
