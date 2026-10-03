import cors from 'cors';
import express from 'express';
import { publicCatalog } from './catalog.js';
import { readConfig } from './config.js';
import { adminRoutes } from './routes/admin.js';
import { couponRoutes } from './routes/cupones.js';
import { experienceRoutes } from './routes/experiencia.js';
import { landingRoutes } from './routes/landing.js';
import { memberRoutes } from './routes/miembro.js';
import { newsRoutes } from './routes/noticias.js';
import { publicRoutes } from './routes/publicas.js';
import { rewardRoutes } from './routes/recompensas.js';
import { stripeRoutes } from './routes/stripe.js';
import { handleError, notFound } from './middleware/errores.js';

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

  app.use('/landing', landingRoutes({ loadCatalog }));
  app.use('/stripe', stripeRoutes(config));
  app.use(memberRoutes(config));
  app.use('/publicas', publicRoutes());
  app.use('/noticias', newsRoutes());
  app.use('/recompensas', rewardRoutes());
  app.use('/experiencia', experienceRoutes());
  app.use('/cupones', couponRoutes());
  app.use('/admin', adminRoutes());
  app.use(notFound);
  app.use(handleError);
  return app;
}
