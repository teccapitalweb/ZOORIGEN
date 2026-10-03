import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';

const config = {
  allowedOrigins: ['http://127.0.0.1:4173'],
  stripeConfigured: false,
  bunnyConfigured: false,
};

test('health responde sin afirmar que las integraciones funcionan', async () => {
  const response = await request(createApp({ config })).get('/health').expect(200);
  assert.deepEqual(response.body, { ok: true, service: 'zoorigen-membership-api' });
});

test('un catálogo inválido falla cerrado y no siembra contenido demo', async () => {
  const app = createApp({ config, loadCatalog: async () => ({ courses: 'incorrecto', plans: { monthly: '199' } }) });
  const response = await request(app).get('/landing/catalog').expect(200);
  assert.deepEqual(response.body.courses, []);
  assert.equal(response.body.plans.monthly, null);
});

test('checkout permanece cerrado sin Stripe configurado', async () => {
  const response = await request(createApp({ config })).post('/stripe/checkout').send({ plan: 'monthly' }).expect(503);
  assert.equal(response.body.error, 'stripe_no_configurado');
});

test('video permanece cerrado sin Bunny configurado', async () => {
  const response = await request(createApp({ config })).post('/video/token').send({ courseId: 'demo', lesson: 1 }).expect(503);
  assert.equal(response.body.error, 'video_no_configurado');
});
