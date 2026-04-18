/* ============================================================ */
/* FIREBASE CONFIG - CLUB VIP ZOORIGEN                           */
/* ✅ CONFIGURACIÓN COMPLETA Y PRODUCCIÓN                         */
/* ============================================================ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBTNq3PsopzEbO4nmrUOP2Kz4Q0IMAn40k",
  authDomain: "club-zoorigen.firebaseapp.com",
  projectId: "club-zoorigen",
  storageBucket: "club-zoorigen.firebasestorage.app",
  messagingSenderId: "239752114394",
  appId: "1:239752114394:web:ee763ce27504771f44f5e3"
};

// ✅ URL del servidor webhook en Railway
const WEBHOOK_SERVER_URL = "https://zoorigen-webhook-production.up.railway.app";

// ✅ Variant IDs de los productos Shopify
const VARIANT_MENSUAL = "45386138714166";  // $199 MXN
const VARIANT_ANUAL   = "45386327916598";  // $1,899 MXN

// ✅ Checkout DIRECTO (sin pasar por página intermedia)
// Estos links llevan al usuario directamente al formulario de tarjeta
const SHOPIFY_CHECKOUT_URL        = `https://pfueck-wm.myshopify.com/cart/${VARIANT_MENSUAL}:1`;
const SHOPIFY_ANNUAL_CHECKOUT_URL = `https://pfueck-wm.myshopify.com/cart/${VARIANT_ANUAL}:1`;

/**
 * Construye un link de checkout directo con el email prellenado.
 * Usa esto desde el frontend para enviar al usuario al pago.
 *
 * Parámetros añadidos:
 *   - checkout[email]=xxx  → prellena el email
 *   - channel=buy_button   → salta la página de selección de payment methods
 *
 * @param {'mensual'|'anual'} plan
 * @param {string} email
 * @returns {string} URL lista para redireccionar
 */
function buildCheckoutURL(plan, email) {
  const baseURL = plan === 'anual' ? SHOPIFY_ANNUAL_CHECKOUT_URL : SHOPIFY_CHECKOUT_URL;
  const emailParam = email ? `&checkout[email]=${encodeURIComponent(email)}` : '';
  return `${baseURL}?channel=buy_button${emailParam}`;
}

// ============================================================
// INICIALIZAR FIREBASE (no tocar esto)
// ============================================================
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  window.auth = firebase.auth();
  window.db   = firebase.firestore();
  // ⭐ Persistencia LOCAL — el usuario queda logueado aunque cierre el navegador
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
}
