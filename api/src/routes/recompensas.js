import { Router } from 'express';
import { requireSession } from '../middleware/auth.js';

export function rewardRoutes() {
  const router = Router();
  router.get('/', requireSession);
  router.post('/canjear', requireSession);
  return router;
}
