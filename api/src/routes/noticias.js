import { Router } from 'express';

export function newsRoutes() {
  const router = Router();
  router.get('/', (_request, response) => response.json([]));
  return router;
}
