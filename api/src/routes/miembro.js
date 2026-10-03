import { Router } from 'express';
import { requireSession } from '../middleware/auth.js';

export function memberRoutes(config) {
  const router = Router();
  router.post('/video/token', (request, response, next) => {
    if (!config.bunnyConfigured) return response.status(503).json({ error: 'video_no_configurado', message: 'El video protegido todavía no está conectado.' });
    return requireSession(request, response, next);
  });
  router.get('/miembro/certificados', requireSession);
  router.get('/miembro/perfil', requireSession);
  router.get('/miembro/progreso', requireSession);
  return router;
}
