const expectedFirebaseProject = 'club-zoorigen';

export function validateFirebaseProject(projectId) {
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID es obligatorio para iniciar en modo conectado.');
  if (projectId !== expectedFirebaseProject) {
    throw new Error(`Proyecto Firebase rechazado. Se esperaba ${expectedFirebaseProject}.`);
  }
  return projectId;
}

export function readConfig(env = process.env) {
  const bunnyTtl = Math.min(900, Math.max(60, Number(env.BUNNY_TOKEN_TTL_SECONDS || 300)));
  return Object.freeze({
    port: Number(env.PORT || 8080),
    appUrl: env.APP_URL || 'http://127.0.0.1:4173',
    allowedOrigins: String(env.ALLOWED_ORIGINS || 'http://127.0.0.1:4173,http://127.0.0.1:5173')
      .split(',').map((value) => value.trim()).filter(Boolean),
    firebaseProjectId: env.FIREBASE_PROJECT_ID || null,
    firebaseServiceAccount: env.FIREBASE_SERVICE_ACCOUNT || null,
    stripeConfigured: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_MONTHLY && env.STRIPE_PRICE_ANNUAL),
    stripeSecretKey: env.STRIPE_SECRET_KEY || null,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || null,
    stripePriceMonthly: env.STRIPE_PRICE_MONTHLY || null,
    stripePriceAnnual: env.STRIPE_PRICE_ANNUAL || null,
    bunnyConfigured: Boolean(env.BUNNY_LIBRARY_ID && env.BUNNY_TOKEN_AUTH_KEY),
    bunnyLibraryId: env.BUNNY_LIBRARY_ID || null,
    bunnyTokenAuthKey: env.BUNNY_TOKEN_AUTH_KEY || null,
    bunnyTtl,
  });
}
