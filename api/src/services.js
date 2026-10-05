import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

function parseServiceAccount(value) {
  if (!value) return null;
  try { return JSON.parse(value); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT debe contener JSON válido.'); }
}

function expirationDate(data = {}) {
  const value = data.planVence || data.fechaExpiracion;
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasAccess(data = {}) {
  const expires = expirationDate(data);
  const current = Boolean(expires && expires.getTime() > Date.now());
  if (['past_due', 'unpaid', 'incomplete', 'expired', 'cancelled', 'pending_payment'].includes(data.planStatus)) return false;
  if (data.planStatus === 'active' || data.planStatus === 'cancelled_active') return current;
  return data.planActivo === true && current;
}

export function createServices(config) {
  const services = {};
  if (config.stripeSecretKey) services.stripe = new Stripe(config.stripeSecretKey);

  const serviceAccount = parseServiceAccount(config.firebaseServiceAccount);
  if (!serviceAccount) return services;
  const firebaseApp = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId: config.firebaseProjectId });
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);

  services.verifyIdToken = (token) => auth.verifyIdToken(token);
  services.getMembership = async (uid) => {
    const [member, user] = await Promise.all([db.collection('miembros').doc(uid).get(), db.collection('usuarios').doc(uid).get()]);
    const memberData = member.data() || {};
    const userData = user.data() || {};
    return {
      active: hasAccess(memberData) || hasAccess(userData),
      stripeCustomerId: memberData.stripeCustomerId || userData.stripeCustomerId || null,
    };
  };

  const syncSubscription = async (subscription, fallback = {}) => {
    const uid = subscription.metadata?.firebaseUID || fallback.firebaseUID;
    if (!uid) throw new Error('La suscripción de Stripe no contiene firebaseUID.');
    const item = subscription.items?.data?.[0];
    const periodEnd = subscription.current_period_end || item?.current_period_end || subscription.cancel_at || subscription.ended_at;
    const future = Number(periodEnd || 0) * 1000 > Date.now();
    const billing = subscription.status === 'active' || subscription.status === 'trialing';
    const active = billing && future;
    const cancelledActive = active && subscription.cancel_at_period_end;
    const status = cancelledActive ? 'cancelled_active' : active ? 'active' : ['past_due', 'unpaid', 'incomplete'].includes(subscription.status) ? 'past_due' : 'expired';
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null;
    const subscriptionId = subscription.id;
    const planType = subscription.metadata?.planType || fallback.planType || 'mensual';
    const shared = { planActivo: active, planCancelado: cancelledActive || status === 'expired', planStatus: status, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, stripeSubscriptionStatus: subscription.status || null, actualizadoDesdeStripe: FieldValue.serverTimestamp() };
    if (periodEnd) shared.planVence = Timestamp.fromMillis(Number(periodEnd) * 1000);
    const batch = db.batch();
    batch.set(db.collection('miembros').doc(uid), { ...shared, planTipo: planType }, { merge: true });
    batch.set(db.collection('usuarios').doc(uid), { ...shared, tipoPlan: planType, fechaExpiracion: shared.planVence || null }, { merge: true });
    await batch.commit();
  };

  services.applyStripeEvent = async (event) => {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status !== 'paid' || !session.subscription) return;
      const subscription = await services.stripe.subscriptions.retrieve(session.subscription);
      await syncSubscription(subscription, { firebaseUID: session.metadata?.firebaseUID || session.client_reference_id, planType: session.metadata?.planType });
      return;
    }
    if (event.type.startsWith('customer.subscription.')) await syncSubscription(event.data.object);
  };
  return services;
}
