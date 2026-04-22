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

// URLs directas al checkout (salta la página de producto Y el carrito)
const SHOPIFY_CHECKOUT_URL        = `https://pfueck-wm.myshopify.com/cart/${VARIANT_MENSUAL}:1?selling_plan=${SELLING_PLAN_MENSUAL}`;
const SHOPIFY_ANNUAL_CHECKOUT_URL = `https://pfueck-wm.myshopify.com/cart/${VARIANT_ANUAL}:1?selling_plan=${SELLING_PLAN_ANUAL}`;

function buildCheckoutURL(plan, email) {
  const variantId   = plan === 'anual' ? VARIANT_ANUAL       : VARIANT_MENSUAL;
  const sellingPlan = plan === 'anual' ? SELLING_PLAN_ANUAL  : SELLING_PLAN_MENSUAL;
  const emailParam  = email ? `&checkout[email]=${encodeURIComponent(email)}` : '';
  const returnTo    = encodeURIComponent('https://www.zoorigen.com/pages/club-suscripcion.html?paid=1');

  // Formato /checkout/ directo: salta carrito y lleva directo a formulario de pago
  return `https://pfueck-wm.myshopify.com/checkout/?variant=${variantId}&quantity=1&selling_plan=${sellingPlan}&return_to=${returnTo}${emailParam}`;
}

if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  window.auth = firebase.auth();
  window.db   = firebase.firestore();
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
}
