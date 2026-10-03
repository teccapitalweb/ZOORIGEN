import { DEMO_CATALOG } from '../data/catalog';
import type { Catalog, DataMode } from './types';

const apiUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const Data = {
  mode: (apiUrl ? 'api' : 'demo') as DataMode,

  async catalog(): Promise<Catalog> {
    if (!apiUrl) return structuredClone(DEMO_CATALOG);

    try {
      const response = await fetch(`${apiUrl}/landing/catalog`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as Partial<Catalog>;
      return {
        courses: Array.isArray(payload.courses) ? payload.courses : [],
        resources: Array.isArray(payload.resources) ? payload.resources : [],
        areas: Array.isArray(payload.areas) ? payload.areas : [],
        plans: payload.plans ?? { monthly: null, annual: null },
        verifiedAt: payload.verifiedAt ?? null,
      };
    } catch (error) {
      console.warn('ZOORIGEN API no disponible; se muestra un estado vacío y explícito.', error);
      return { courses: [], resources: [], areas: [], plans: { monthly: null, annual: null }, verifiedAt: null };
    }
  },
};
