import { Router } from 'express';
import { sanitizeCatalog } from '../catalog.js';

export function landingRoutes({ loadCatalog }) {
  const router = Router();
  router.get('/catalog', async (_request, response, next) => {
    try {
      const catalog = sanitizeCatalog(await loadCatalog());
      response.set('Cache-Control', 'public, max-age=60').json(catalog);
    } catch (error) { next(error); }
  });
  return router;
}
