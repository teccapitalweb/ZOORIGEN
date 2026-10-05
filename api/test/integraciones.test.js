import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { signBunnyEmbed } from '../src/bunny.js';

const configured = {
  allowedOrigins: ['http://127.0.0.1:4173'], appUrl: 'http://127.0.0.1:4173',
  bunnyConfigured: true, bunnyLibraryId: '731751', bunnyTokenAuthKey: 'test-only-key', bunnyTtl: 300,
  stripeConfigured: true, stripeWebhookSecret: 'whsec_test', stripePriceMonthly: 'price_month', stripePriceAnnual: 'price_year',
};
const verifyIdToken = async (token) => token === 'ok' ? { uid: 'uid-1', email: 'member@example.test' } : null;

test('la firma Bunny es temporal y determinista', () => {
  const signed = signBunnyEmbed({ libraryId: '731751', tokenAuthKey: 'secret', videoId: 'video-1', ttlSeconds: 300, now: 1_700_000_000_000 });
  assert.equal(signed.expires, 1_700_000_300);
  assert.match(signed.embedUrl, /^https:\/\/iframe\.mediadelivery\.net\/embed\/731751\/video-1\?token=[a-f0-9]{64}&expires=1700000300$/);
});

test('Bunny exige sesión incluso para la vista previa y membresía para las demás clases', async () => {
  const services = { verifyIdToken, getMembership: async () => ({ active: false }) };
  const app = createApp({ config: configured, services });
  await request(app).post('/video/token').send({ courseId: 'biologia-tiburones-rayas', lesson: 1 }).expect(401);
  const preview = await request(app).post('/video/token').set('Authorization', 'Bearer ok').send({ courseId: 'biologia-tiburones-rayas', lesson: 1 }).expect(200);
  assert.match(preview.body.embedUrl, /mediadelivery\.net\/embed\/731751\/befd1641/);
  const locked = await request(app).post('/video/token').set('Authorization', 'Bearer ok').send({ courseId: 'biologia-tiburones-rayas', lesson: 2 }).expect(403);
  assert.equal(locked.body.error, 'membresia_requerida');
});

test('una membresía activa obtiene video y Stripe crea checkout con metadatos Firebase', async () => {
  let checkoutInput;
  const services = {
    verifyIdToken,
    getMembership: async () => ({ active: true }),
    stripe: { checkout: { sessions: { create: async (input) => { checkoutInput = input; return { url: 'https://checkout.stripe.test/session' }; } } } },
  };
  const app = createApp({ config: configured, services });
  await request(app).post('/video/token').set('Authorization', 'Bearer ok').send({ courseId: 'biologia-tiburones-rayas', lesson: 2 }).expect(200);
  const checkout = await request(app).post('/stripe/checkout').set('Authorization', 'Bearer ok').send({ plan: 'annual' }).expect(200);
  assert.equal(checkout.body.url, 'https://checkout.stripe.test/session');
  assert.equal(checkoutInput.line_items[0].price, 'price_year');
  assert.deepEqual(checkoutInput.metadata, { firebaseUID: 'uid-1', planType: 'annual' });
});
