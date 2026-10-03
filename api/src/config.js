const expectedFirebaseProject = 'club-zoorigen';

export function validateFirebaseProject(projectId) {
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID es obligatorio para iniciar en modo conectado.');
  if (projectId !== expectedFirebaseProject) {
    throw new Error(`Proyecto Firebase rechazado. Se esperaba ${expectedFirebaseProject}.`);
  }
  return projectId;
}

export function readConfig(env = process.env) {
  return Object.freeze({
    port: Number(env.PORT || 8080),
    appUrl: env.APP_URL || 'http://127.0.0.1:4173',
    allowedOrigins: String(env.ALLOWED_ORIGINS || 'http://127.0.0.1:4173,http://127.0.0.1:5173')
      .split(',').map((value) => value.trim()).filter(Boolean),
    firebaseProjectId: env.FIREBASE_PROJECT_ID || null,
    stripeConfigured: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_MONTHLY && env.STRIPE_PRICE_ANNUAL),
    bunnyConfigured: Boolean(env.BUNNY_LIBRARY_ID && env.BUNNY_TOKEN_AUTH_KEY),
  });
}
