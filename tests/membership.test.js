const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const clubPath = path.join(__dirname, '..', 'assets', 'js', 'club.js');
const source = fs.readFileSync(clubPath, 'utf8')
  .replace('const ZOORIGEN_CLUB =', 'result =');

const context = {
  result: null,
  window: {},
  localStorage: { getItem: () => 'dark', setItem: () => {} },
  document: {
    documentElement: { setAttribute: () => {}, getAttribute: () => 'dark' },
    querySelectorAll: () => [],
  },
  console,
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  Date,
};
vm.runInNewContext(source, context, { filename: clubPath });
const club = context.result;

const future = () => new Date(Date.now() + 86400000).toISOString();
const past = () => new Date(Date.now() - 86400000).toISOString();

test('no concede acceso cuando planActivo quedó true pero la fecha venció', () => {
  const member = { planActivo: true, planCancelado: false, planVence: past(), planStatus: 'active' };
  assert.equal(club.calculateStatus(member), 'expired');
  assert.equal(club.hasActiveMembership(member), false);
});

test('concede acceso a un pago activo con fecha futura', () => {
  const member = { planActivo: true, planCancelado: false, planVence: future(), planStatus: 'active' };
  assert.equal(club.calculateStatus(member), 'active');
  assert.equal(club.hasActiveMembership(member), true);
});

test('mantiene acceso hasta el fin del periodo después de cancelar', () => {
  const member = { planActivo: true, planCancelado: true, planVence: future(), planStatus: 'cancelled_active' };
  assert.equal(club.calculateStatus(member), 'cancelled_active');
  assert.equal(club.hasActiveMembership(member), true);
});

test('suspende un cobro fallido aunque la fecha almacenada sea futura', () => {
  const member = { planActivo: true, planCancelado: false, planVence: future(), stripeSubscriptionStatus: 'past_due' };
  assert.equal(club.calculateStatus(member), 'past_due');
  assert.equal(club.hasActiveMembership(member), false);
});

test('no concede acceso a una bandera activa sin vigencia verificable', () => {
  const member = { planActivo: true, planCancelado: false, planVence: null };
  assert.equal(club.calculateStatus(member), 'pending_payment');
  assert.equal(club.hasActiveMembership(member), false);
});
