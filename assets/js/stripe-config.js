// ═══════════════════════════════════════════════════════════════════════
//  GLOBALVET MÉXICO — Configuración de Stripe
//  
//  📝 CÓMO LLENAR ESTE ARCHIVO:
//  
//  1. Crea una cuenta en https://stripe.com (o usa la existente)
//  
//  2. En el dashboard de Stripe, ve a Products → Create product:
//     • Product 1: "Club GlobalVet — Mensual"
//       → Precio recurrente mensual ($XXX MXN)
//       → Te generará un Price ID tipo "price_1Abc..."
//     • Product 2: "Club GlobalVet — Anual"
//       → Precio recurrente anual ($YYYY MXN, con descuento)
//       → Te generará otro Price ID tipo "price_1Def..."
//  
//  3. Copia los Price IDs y pégalos abajo en PRICE_MENSUAL y PRICE_ANUAL
//  
//  4. Publishable Key: Developers → API keys → "Publishable key" (pk_test_... o pk_live_...)
//     Pégalo en PUBLIC_KEY
//  
//  5. API_URL: URL de tu servidor Node.js/Railway con endpoint /create-checkout-session
//     (si aún no tienes servidor, deja el placeholder; cuando lo tengas lo cambias)
//  
//  6. Cambia el precio visible en PRECIO_MENSUAL_MXN y PRECIO_ANUAL_MXN
//     (estos son solo para mostrar en pantalla, el cobro real lo hace Stripe)
// ═══════════════════════════════════════════════════════════════════════

window.STRIPE_CONFIG = {
  // ──────── ENDPOINT DEL SERVIDOR (Railway, Vercel, Render, etc.) ────────
  // Ejemplo: 'https://globalvet-webhook.up.railway.app/create-checkout-session'
  API_URL: 'REEMPLAZAR_CON_TU_URL_DE_RAILWAY/create-checkout-session',

  // ──────── STRIPE PUBLISHABLE KEY (visible, segura de compartir) ────────
  // Desde: https://dashboard.stripe.com/apikeys
  // Ejemplo: 'pk_live_51Abc...xyz' (live) o 'pk_test_51Abc...xyz' (test mode)
  PUBLIC_KEY: 'pk_test_REEMPLAZAR_CON_TU_PUBLISHABLE_KEY',

  // ──────── PRICE IDs DE STRIPE (creados al dar de alta los productos) ────────
  // Ejemplo: 'price_1TPVMWPBgqsOPfUYytgZtVTv'
  PRICE_MENSUAL: 'price_REEMPLAZAR_CON_TU_PRICE_ID_MENSUAL',
  PRICE_ANUAL:   'price_REEMPLAZAR_CON_TU_PRICE_ID_ANUAL',

  // ──────── PRECIOS VISIBLES (solo para mostrar en la UI) ────────
  // El cobro real lo hace Stripe según el precio configurado en los productos.
  PRECIO_MENSUAL_MXN: 199,   // Mostrado como "$199 /mes"
  PRECIO_ANUAL_MXN:   1899,  // Mostrado como "$1,899 /año"
  AHORRO_ANUAL_MXN:   489,   // $199 × 12 − $1,899 = $489 de ahorro (mostrar como beneficio)
};

// Detecta si la configuración aún tiene placeholders
window.STRIPE_CONFIG.isConfigured = function() {
  const c = window.STRIPE_CONFIG;
  return !c.API_URL.includes('REEMPLAZAR') &&
         !c.PUBLIC_KEY.includes('REEMPLAZAR') &&
         !c.PRICE_MENSUAL.includes('REEMPLAZAR') &&
         !c.PRICE_ANUAL.includes('REEMPLAZAR');
};
