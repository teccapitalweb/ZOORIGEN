import cors from 'cors';
import express from 'express';
import { publicCatalog, sanitizeCatalog } from './catalog.js';
import { readConfig } from './config.js';

export function createApp(options = {}) {
  const config = options.config || readConfig(options.env);
  const loadCatalog = options.loadCatalog || (async () => publicCatalog);
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origen no autorizado'));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (_request, response) => {
    response.set('Cache-Control', 'no-store').json({ ok: true, service: 'zoorigen-membership-api' });
  });

  app.get('/landing/catalog', async (_request, response, next) => {
    try {
      const catalog = sanitizeCatalog(await loadCatalog());
      response.set('Cache-Control', 'public, max-age=60').json(catalog);
    } catch (error) {
      next(error);
    }
  });

  app.post('/stripe/checkout', (_request, response) => {
    if (!config.stripeConfigured) return response.status(503).json({ error: 'stripe_no_configurado', message: 'Los pagos todavía no están conectados.' });
    return response.status(501).json({ error: 'pendiente_integracion', message: 'La integración requiere autorización y productos verificados.' });
  });

  app.post('/video/token', (_request, response) => {
    if (!config.bunnyConfigured) return response.status(503).json({ error: 'video_no_configurado', message: 'El video protegido todavía no está conectado.' });
    return response.status(401).json({ error: 'no_autenticado', message: 'Se requiere una sesión verificada.' });
  });

  app.use((_request, response) => response.status(404).json({ error: 'no_encontrado' }));
  app.use((error, _request, response, _next) => {
    const corsError = error instanceof Error && error.message === 'Origen no autorizado';
    response.status(corsError ? 403 : 500).json({ error: corsError ? 'origen_no_autorizado' : 'error_interno' });
  });
  return app;
}
