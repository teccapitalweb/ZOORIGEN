import { initializeApp, type FirebaseApp } from 'firebase/app';

let app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp | null {
  if (app) return app;
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (!config.apiKey || !config.projectId || !config.authDomain) return null;
  if (config.projectId !== 'club-zoorigen') {
    throw new Error('Proyecto Firebase rechazado: este cliente solo admite club-zoorigen.');
  }
  app = initializeApp(config);
  return app;
}
