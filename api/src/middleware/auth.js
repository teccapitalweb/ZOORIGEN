export function requireSession(_request, response) {
  response.set('Cache-Control', 'no-store').status(401).json({ error: 'no_autenticado', message: 'Se requiere una sesión Firebase verificada.' });
}

export function requireAdmin(_request, response) {
  response.set('Cache-Control', 'no-store').status(403).json({ error: 'no_autorizado', message: 'Se requiere el custom claim administrativo de ZOORIGEN.' });
}
