import { getAuth, type User } from 'firebase/auth';
import { firebaseApp } from './firebase';

const currentAuth = () => {
  const app = firebaseApp();
  return app ? getAuth(app) : null;
};

export const Auth = Object.freeze({
  current: (): User | null => currentAuth()?.currentUser ?? null,
  token: async (): Promise<string | null> => currentAuth()?.currentUser?.getIdToken() ?? null,
});
