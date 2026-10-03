import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';

test('la API conserva módulos separados por dominio', async () => {
  const modules = ['landing', 'stripe', 'miembro', 'publicas', 'noticias', 'recompensas', 'experiencia', 'cupones', 'admin'];
  await Promise.all(modules.map((name) => access(new URL(`../src/routes/${name}.js`, import.meta.url))));
});

test('app monta las rutas de dominio y el middleware de errores', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  for (const marker of ['landingRoutes', 'stripeRoutes', 'memberRoutes', 'adminRoutes', 'notFound', 'handleError']) {
    assert.match(source, new RegExp(marker));
  }
});
