import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('el cliente limita Firebase al proyecto dedicado de ZOORIGEN', async () => {
  const source = await readFile(new URL('../src/core/firebase.ts', import.meta.url), 'utf8');
  assert.match(source, /club-zoorigen/);
  assert.doesNotMatch(source, /visionpecuaria-vip|globalvet|elite-pecuario/i);
});

test('el modo API no recurre al catálogo demo cuando falla', async () => {
  const source = await readFile(new URL('../src/core/data.ts', import.meta.url), 'utf8');
  const catchBlock = source.slice(source.indexOf('catch (error)'));
  assert.doesNotMatch(catchBlock, /DEMO_CATALOG/);
  assert.match(catchBlock, /courses: \[\]/);
});

test('la tabla conserva todas las rutas funcionales de la arquitectura Elite', async () => {
  const source = await readFile(new URL('../src/core/route-table.ts', import.meta.url), 'utf8');
  const required = [
    '/curso/:id/clase/:n', '/materiales/:id/visor', '/retos/historia/:id', '/herramientas',
    '/logros', '/configuracion', '/admin/cursos', '/admin/materiales', '/admin/en-vivo',
    '/admin/quizzes', '/admin/miembros', '/admin/cupones', '/admin/comunidad',
    '/admin/avisos', '/admin/ajustes', '/admin/experiencia',
  ];
  for (const route of required) assert.match(source, new RegExp(route.replaceAll('/', '\\/').replaceAll(':', '\\:')));
});

test('la interfaz separa shell y parciales reutilizables', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /from '\.\/ui\/shell'/);
  assert.match(main, /from '\.\/ui\/partials'/);
});
