import { Router } from 'express';

export function publicRoutes() {
  const router = Router();
  router.get('/certificados/:folio', (_request, response) => response.status(404).json({ error: 'certificado_no_encontrado' }));
  return router;
}
