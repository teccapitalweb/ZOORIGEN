export const publicCatalog = Object.freeze({
  source: 'public-evidence',
  verifiedAt: null,
  courses: [],
  resources: [],
  areas: [],
  plans: { monthly: null, annual: null },
});

export function sanitizeCatalog(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    courses: Array.isArray(source.courses) ? source.courses : [],
    resources: Array.isArray(source.resources) ? source.resources : [],
    areas: Array.isArray(source.areas) ? source.areas : [],
    plans: {
      monthly: Number.isFinite(source.plans?.monthly) ? source.plans.monthly : null,
      annual: Number.isFinite(source.plans?.annual) ? source.plans.annual : null,
    },
    verifiedAt: typeof source.verifiedAt === 'string' ? source.verifiedAt : null,
  };
}
