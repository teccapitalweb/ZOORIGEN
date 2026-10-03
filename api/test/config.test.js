import assert from 'node:assert/strict';
import test from 'node:test';
import { readConfig, validateFirebaseProject } from '../src/config.js';

test('acepta únicamente el proyecto Firebase dedicado a ZOORIGEN', () => {
  assert.equal(validateFirebaseProject('club-zoorigen'), 'club-zoorigen');
  assert.throws(() => validateFirebaseProject('visionpecuaria-vip'), /rechazado/);
  assert.throws(() => validateFirebaseProject('club-globalvet'), /rechazado/);
});

test('pagos y videos permanecen desactivados sin variables completas', () => {
  const config = readConfig({});
  assert.equal(config.stripeConfigured, false);
  assert.equal(config.bunnyConfigured, false);
});
