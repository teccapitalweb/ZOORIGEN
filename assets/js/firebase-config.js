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
 * Construye el URL de checkout de Shopify para un plan de suscripción.
 * Usa el endpoint /cart/VARIANT:1 con selling_plan y checkout=1 para
 * ir directo al formulario de pago sin pasar por carrito ni tienda.
 */
function buildCheckoutURL(plan, email) {
  const variantId   = plan === 'anual' ? VARIANT_ANUAL       : VARIANT_MENSUAL;
  const sellingPlan = plan === 'anual' ? SELLING_PLAN_ANUAL  : SELLING_PLAN_MENSUAL;
  const emailParam  = email ? `&checkout[email]=${encodeURIComponent(email)}` : '';

  // channel=buy_button indica a Shopify que es un botón externo → salta la tienda
  // checkout=1 fuerza ir directo al formulario de pago (salta carrito)
  return `https://pfueck-wm.myshopify.com/cart/${variantId}:1?selling_plan=${sellingPlan}&channel=buy_button&checkout=1${emailParam}`;
}

if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  window.auth = firebase.auth();
  window.db   = firebase.firestore();
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
}
