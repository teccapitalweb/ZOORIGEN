import { Router } from 'express';
import { requireSession } from '../middleware/auth.js';

export function experienceRoutes() {
  const router = Router();
  router.get('/', requireSession);
  router.put('/', requireSession);
  return router;
}
