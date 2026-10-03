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
