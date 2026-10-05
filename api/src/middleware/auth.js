export function requireSession(_request, response) {
  response.set('Cache-Control', 'no-store').status(401).json({ error: 'no_autenticado', message: 'Se requiere una sesión Firebase verificada.' });
}

export function requireAdmin(_request, response) {
  response.set('Cache-Control', 'no-store').status(403).json({ error: 'no_autorizado', message: 'Se requiere el custom claim administrativo de ZOORIGEN.' });
}

export function createSessionGuard(verifyIdToken) {
  return async function sessionGuard(request, response, next) {
    const authorization = String(request.get('authorization') || '');
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match || typeof verifyIdToken !== 'function') return requireSession(request, response);
    try {
      const user = await verifyIdToken(match[1]);
      if (!user?.uid) return requireSession(request, response);
      request.user = user;
      return next();
    } catch {
      return requireSession(request, response);
    }
  };
}
