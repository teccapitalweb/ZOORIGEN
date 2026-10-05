export type Route = { path: string; params: Record<string, string> };
import { ROUTES } from './route-table';

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
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  return ROUTES.map((pattern) => match(pattern, path)).find(Boolean) ?? { path: '/', params: {} };
}
