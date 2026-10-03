import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';

export function adminRoutes() {
  const router = Router();
  router.use(requireAdmin);
  return router;
}
