import { Router } from 'express';
import { findBunnyLesson, freePreviewVideoId, signBunnyEmbed } from '../bunny.js';
import { createSessionGuard, requireSession } from '../middleware/auth.js';

export function memberRoutes(config, services = {}) {
  const router = Router();
  const guard = createSessionGuard(services.verifyIdToken);

  router.post('/video/token', async (request, response, next) => {
    if (!config.bunnyConfigured) return response.status(503).json({ error: 'video_no_configurado', message: 'El video protegido todavía no está conectado.' });
    const match = findBunnyLesson(request.body?.courseId, request.body?.lesson ?? request.body?.n);
    if (!match) return response.status(404).json({ error: 'clase_no_encontrada' });

    const issueToken = async () => {
      const signed = signBunnyEmbed({
        libraryId: config.bunnyLibraryId,
        tokenAuthKey: config.bunnyTokenAuthKey,
        videoId: match.lesson.videoId,
        ttlSeconds: config.bunnyTtl,
      });
      return response.set('Cache-Control', 'no-store').json({
        ...signed,
        courseId: match.course.id,
        lesson: match.lesson.num,
      });
    };

    return guard(request, response, async () => {
      try {
        if (match.lesson.videoId === freePreviewVideoId) return issueToken();
        const membership = typeof services.getMembership === 'function' ? await services.getMembership(request.user.uid) : null;
        if (!membership?.active) return response.status(403).json({ error: 'membresia_requerida', message: 'Esta clase requiere una membresía activa.' });
        return issueToken();
      } catch (error) { return next(error); }
    });
  });

  router.get('/miembro/certificados', requireSession);
  router.get('/miembro/perfil', requireSession);
  router.get('/miembro/progreso', requireSession);
  return router;
}
