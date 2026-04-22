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

// Storefront API de Shopify (genera checkouts dinámicos con selling_plan)
const SHOPIFY_DOMAIN = "pfueck-wm.myshopify.com";
const STOREFRONT_TOKEN = "4c5d8f6909eccf2964cbb97e0ee2187e";

const SHOPIFY_CHECKOUT_URL        = `https://${SHOPIFY_DOMAIN}/cart/${VARIANT_MENSUAL}:1?selling_plan=${SELLING_PLAN_MENSUAL}`;
const SHOPIFY_ANNUAL_CHECKOUT_URL = `https://${SHOPIFY_DOMAIN}/cart/${VARIANT_ANUAL}:1?selling_plan=${SELLING_PLAN_ANUAL}`;

/**
 * Crea un checkout dinámico usando la Storefront API y devuelve su URL.
 * Esta es la ÚNICA forma de generar URLs tipo /checkouts/cn/XXX con selling_plan.
 */
async function buildCheckoutURL(plan, email) {
  const variantGid   = plan === 'anual'
    ? `gid://shopify/ProductVariant/${VARIANT_ANUAL}`
    : `gid://shopify/ProductVariant/${VARIANT_MENSUAL}`;
  const sellingPlanGid = plan === 'anual'
    ? `gid://shopify/SellingPlan/${SELLING_PLAN_ANUAL}`
    : `gid://shopify/SellingPlan/${SELLING_PLAN_MENSUAL}`;

  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    input: {
      lines: [{
        quantity: 1,
        merchandiseId: variantGid,
        sellingPlanId: sellingPlanGid
      }],
      buyerIdentity: email ? { email: email } : undefined
    }
  };

  try {
    const resp = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
      },
      body: JSON.stringify({ query, variables })
    });
    const data = await resp.json();
    const url = data?.data?.cartCreate?.cart?.checkoutUrl;
    if (url) return url;
    console.error('cartCreate error:', data);
  } catch (err) {
    console.error('Shopify API error:', err);
  }

  // Fallback: link normal si la API falla
  const variantId  = plan === 'anual' ? VARIANT_ANUAL       : VARIANT_MENSUAL;
  const sellingPlan = plan === 'anual' ? SELLING_PLAN_ANUAL : SELLING_PLAN_MENSUAL;
  const emailParam = email ? `&checkout[email]=${encodeURIComponent(email)}` : '';
  return `https://${SHOPIFY_DOMAIN}/cart/${variantId}:1?selling_plan=${sellingPlan}${emailParam}`;
}

if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  window.auth = firebase.auth();
  window.db   = firebase.firestore();
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
}
