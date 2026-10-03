import { Router } from 'express';

export function stripeRoutes(config) {
  const router = Router();
  router.post('/checkout', (_request, response) => {
    if (!config.stripeConfigured) return response.status(503).json({ error: 'stripe_no_configurado', message: 'Los pagos todavía no están conectados.' });
    return response.status(501).json({ error: 'pendiente_integracion', message: 'La integración requiere autorización y productos verificados.' });
  });
  router.post('/portal', (_request, response) => response.status(503).json({ error: 'portal_no_configurado' }));
  router.post('/webhook', (_request, response) => response.status(503).json({ error: 'webhook_no_configurado' }));
  return router;
}
