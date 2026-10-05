import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { firebaseApp } from './firebase';

const currentAuth = () => {
  const app = firebaseApp();
  return app ? getAuth(app) : null;
};

export const Auth = Object.freeze({
  configured: (): boolean => Boolean(currentAuth()),
  current: (): User | null => currentAuth()?.currentUser ?? null,
  token: async (): Promise<string | null> => currentAuth()?.currentUser?.getIdToken() ?? null,
  signIn: async (email: string, password: string): Promise<User> => {
    const auth = currentAuth();
    if (!auth) throw new Error('Firebase no está configurado en este entorno local.');
    return (await signInWithEmailAndPassword(auth, email, password)).user;
  },
  register: async (email: string, password: string): Promise<User> => {
    const auth = currentAuth();
    if (!auth) throw new Error('Firebase no está configurado en este entorno local.');
    return (await createUserWithEmailAndPassword(auth, email, password)).user;
  },
  resetPassword: async (email: string): Promise<void> => {
    const auth = currentAuth();
    if (!auth) throw new Error('Firebase no está configurado en este entorno local.');
    await sendPasswordResetEmail(auth, email);
  },
  signOut: async (): Promise<void> => {
    const auth = currentAuth();
    if (auth) await signOut(auth);
  },
  subscribe: (listener: (user: User | null) => void): (() => void) => {
    const auth = currentAuth();
    if (!auth) { listener(null); return () => undefined; }
    return onAuthStateChanged(auth, listener);
  },
});
