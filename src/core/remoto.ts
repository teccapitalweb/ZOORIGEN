import { Auth } from './auth';

const apiUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function requestApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiUrl) throw new Error('API no configurada');
  const token = await Auth.token();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json() as Promise<T>;
}
