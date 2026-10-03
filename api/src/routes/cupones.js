import { Router } from 'express';
import { requireSession } from '../middleware/auth.js';

export function couponRoutes() {
  const router = Router();
  router.post('/validar', requireSession);
  return router;
}
