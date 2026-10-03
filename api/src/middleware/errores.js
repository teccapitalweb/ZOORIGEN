export function notFound(_request, response) {
  response.status(404).json({ error: 'no_encontrado' });
}

export function handleError(error, _request, response, _next) {
  const corsError = error instanceof Error && error.message === 'Origen no autorizado';
  response.status(corsError ? 403 : 500).json({ error: corsError ? 'origen_no_autorizado' : 'error_interno' });
}
