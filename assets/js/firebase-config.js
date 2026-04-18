/* ============================================================ */
/* FIREBASE CONFIG - CLUB VIP ZOORIGEN                           */
/* ✅ CONFIGURACIÓN COMPLETA Y FUNCIONAL                          */
/* ============================================================ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBTNq3PsopzEbO4nmrUOP2Kz4Q0IMAn40k",
  authDomain: "club-zoorigen.firebaseapp.com",
  projectId: "club-zoorigen",
  storageBucket: "club-zoorigen.firebasestorage.app",
  messagingSenderId: "239752114394",
  appId: "1:239752114394:web:ee763ce27504771f44f5e3"
};

// ✅ URL del servidor webhook en Railway (confirmada online)
const WEBHOOK_SERVER_URL = "https://zoorigen-webhook-production.up.railway.app";

// ✅ URL del checkout de Shopify - plan mensual $199 MXN
const SHOPIFY_CHECKOUT_URL = "https://pfueck-wm.myshopify.com/products/membresia-mensual-club-vip-zoorigen";

// ✅ URL del checkout de Shopify - plan anual $1,899 MXN (2 meses gratis)
const SHOPIFY_ANNUAL_CHECKOUT_URL = "https://pfueck-wm.myshopify.com/products/membresia-anual-club-vip-zoorigen";

// ============================================================
// INICIALIZAR FIREBASE (no tocar esto)
// ============================================================
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  window.auth = firebase.auth();
  window.db   = firebase.firestore();
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
}
