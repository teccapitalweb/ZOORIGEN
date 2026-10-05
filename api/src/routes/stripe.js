import { Router } from 'express';
import { createSessionGuard } from '../middleware/auth.js';

const unavailable = (response, error = 'stripe_no_configurado') => response.status(503).json({ error, message: 'Los pagos todavía no están conectados en este entorno.' });

export function stripeRoutes(config, services = {}) {
  const router = Router();
  const guard = createSessionGuard(services.verifyIdToken);

  router.post('/checkout', (request, response, next) => {
    if (!config.stripeConfigured || !services.stripe) return unavailable(response);
    return guard(request, response, async () => {
      try {
        const plan = request.body?.plan;
        const price = plan === 'monthly' ? config.stripePriceMonthly : plan === 'annual' ? config.stripePriceAnnual : null;
        if (!price) return response.status(400).json({ error: 'plan_invalido' });
        const session = await services.stripe.checkout.sessions.create({
          mode: 'subscription',
          line_items: [{ price, quantity: 1 }],
          success_url: `${config.appUrl}/#/bienvenida?checkout=success`,
          cancel_url: `${config.appUrl}/#/suscripcion?checkout=cancelled`,
          client_reference_id: request.user.uid,
          customer_email: request.user.email || undefined,
          metadata: { firebaseUID: request.user.uid, planType: plan },
          subscription_data: { metadata: { firebaseUID: request.user.uid, planType: plan } },
        });
        return response.set('Cache-Control', 'no-store').json({ url: session.url });
      } catch (error) { return next(error); }
    });
  });

  router.post('/portal', (request, response, next) => {
    if (!config.stripeConfigured || !services.stripe || typeof services.getMembership !== 'function') return unavailable(response, 'portal_no_configurado');
    return guard(request, response, async () => {
      try {
        const membership = await services.getMembership(request.user.uid);
        if (!membership?.stripeCustomerId) return response.status(409).json({ error: 'cliente_stripe_no_disponible' });
        const session = await services.stripe.billingPortal.sessions.create({ customer: membership.stripeCustomerId, return_url: `${config.appUrl}/#/suscripcion` });
        return response.set('Cache-Control', 'no-store').json({ url: session.url });
      } catch (error) { return next(error); }
    });
  });
  return router;
}

export function stripeWebhook(config, services = {}) {
  return async (request, response, next) => {
    if (!config.stripeWebhookSecret || !services.stripe || typeof services.applyStripeEvent !== 'function') return unavailable(response, 'webhook_no_configurado');
    try {
      const signature = request.get('stripe-signature');
      const event = services.stripe.webhooks.constructEvent(request.body, signature, config.stripeWebhookSecret);
      await services.applyStripeEvent(event);
      return response.json({ received: true });
    } catch (error) { return next(error); }
  };
}
