import { Auth } from './auth';

const apiUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function requestApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiUrl) throw new Error('API no configurada');
  const token = await Auth.token();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(payload?.message || payload?.error || `API ${response.status}`);
  }
  return response.json() as Promise<T>;
}
