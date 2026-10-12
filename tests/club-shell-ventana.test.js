'use strict';
// Parte de pantalla del panel: botón flotante de WhatsApp (miembros vs no miembros) y "Instalar app".
// La parte de pantalla de club-shell.js solo corre con `document`: aquí se carga en un navegador mínimo falso.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.resolve(__dirname, '..');

function cargar() {
  const modulo = { exports: {} };
  const contexto = {
    module: modulo,
    window: { addEventListener() {} },
    document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
    navigator: { userAgent: 'Prueba' },
    console, setTimeout, clearTimeout, Promise,
    zooIcon: (n) => '<svg data-icono="' + n + '"></svg>'
  };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'assets', 'js', 'club-shell.js'), 'utf8'), contexto, { filename: 'club-shell.js' });
  return modulo.exports;
}
const P = cargar();

test('WhatsApp flotante: sin membresía va directo a WhatsApp (sin menú); con membresía muestra las 4 opciones', () => {
  const sin = P.whatsappHTML(false);
  assert.ok(!sin.includes('zsWaMenu'), 'sin membresía no hay menú');
  assert.match(sin, /id="zsWaBtn"/);
  assert.match(sin, /data-vip="0"/);
  const con = P.whatsappHTML(true);
  assert.match(con, /id="zsWaMenu"/);
  for (const t of ['Mi descuento 20%', 'Soporte VIP', 'Contactar dirección', 'Canal oficial Zoorigen']) assert.ok(con.includes(t), t);
  assert.match(con, /href="club-canal\.html"/);
  assert.match(con, /wa\.me\/5212361113237\?text=/);
  assert.doesNotMatch(con, /\p{Extended_Pictographic}/u);
});

test('esMiembroVip: membresía vigente o administrador; el resto no', () => {
  assert.equal(P.esMiembroVip({ planStatus: 'active' }), true);
  assert.equal(P.esMiembroVip({ planStatus: 'cancelled_active' }), true);
  assert.equal(P.esMiembroVip({ role: 'admin', planStatus: 'pending_payment' }), true);
  for (const s of ['pending_payment', 'expired', 'past_due']) assert.equal(P.esMiembroVip({ planStatus: s }), false, s);
  assert.equal(P.esMiembroVip(null), false);
});

test('Instalar app: el menú la trae al final y la ventana elige la explicación correcta', () => {
  assert.match(P.menuHTML('inicio', 'x'), /data-instalar="1"[^>]*>[\s\S]*Instalar app<\/a>$/);
  assert.equal(P.modoInstalacion({ instalada: true, hayAviso: true }), 'instalada');
  assert.equal(P.modoInstalacion({ hayAviso: true, esIOS: true }), 'aviso');
  assert.equal(P.modoInstalacion({ esIOS: true }), 'ios');
  assert.equal(P.modoInstalacion({}), 'manual');
});

test('el 20% de descuento del inicio solo se pinta con membresía', () => {
  const t = fs.readFileSync(path.join(RAIZ, 'pages', 'club-dashboard.html'), 'utf8');
  assert.match(t, /asideDescuento'\)\.innerHTML = ZOORIGEN_CLUB\.hasActiveMembership\(session\)/);
});
