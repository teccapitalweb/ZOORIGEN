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

test('el catálogo integrado contiene los 15 cursos y 61 videos propios de ZOORIGEN', async () => {
  const catalog = JSON.parse(await readFile(new URL('../data/zoorigen-bunny-catalog.json', import.meta.url), 'utf8'));
  assert.equal(catalog.length, 15);
  assert.equal(catalog.reduce((total, course) => total + course.lecciones.length, 0), 61);
  assert.equal(new Set(catalog.flatMap((course) => course.lecciones.map((lesson) => lesson.videoId))).size, 61);
});

test('el cliente solicita Bunny y Stripe a la API sin contener claves privadas', async () => {
  const remote = await readFile(new URL('../src/core/video.ts', import.meta.url), 'utf8');
  assert.match(remote, /\/video\/token/);
  assert.match(remote, /\/stripe\/checkout/);
  assert.doesNotMatch(remote, /BUNNY_TOKEN_AUTH_KEY|STRIPE_SECRET_KEY|createHash/);
});

test('el acceso cubre entrar, registro, recuperación y parámetros del hash', async () => {
  const auth = await readFile(new URL('../src/core/auth.ts', import.meta.url), 'utf8');
  const router = await readFile(new URL('../src/core/router.ts', import.meta.url), 'utf8');
  for (const marker of ['signInWithEmailAndPassword', 'createUserWithEmailAndPassword', 'sendPasswordResetEmail']) assert.match(auth, new RegExp(marker));
  assert.match(router, /split\('\?'\)/);
});
