export type Route = { path: string; params: Record<string, string> };

const patterns = [
  '/login', '/cursos', '/curso/:id', '/materiales', '/comunidad', '/en-vivo', '/retos', '/recompensas',
  '/certificados', '/perfil', '/suscripcion', '/admin', '/',
];

function match(pattern: string, path: string): Route | null {
  const expected = pattern.split('/').filter(Boolean);
  const received = path.split('/').filter(Boolean);
  if (expected.length !== received.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index].startsWith(':')) params[expected[index].slice(1)] = decodeURIComponent(received[index]);
    else if (expected[index] !== received[index]) return null;
  }
  return { path: pattern, params };
}

export function currentRoute(): Route {
  const path = location.hash.replace(/^#/, '') || '/';
  return patterns.map((pattern) => match(pattern, path)).find(Boolean) ?? { path: '/', params: {} };
}
