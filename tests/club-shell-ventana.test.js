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

test('el Club ya no arma ningún botón flotante de WhatsApp (solo sigue en la página web pública)', () => {
  assert.equal(P.whatsappHTML, undefined);
  const js = fs.readFileSync(path.join(RAIZ, 'assets', 'js', 'club-shell.js'), 'utf8');
  assert.doesNotMatch(js, /zsWa|zs-wa|whatsappHTML|waMenuHTML/);
  // los enlaces de soporte por WhatsApp dentro del contenido se conservan
  assert.match(P.enlaceSoporte('Hola'), /^https:\/\/wa\.me\/\d+\?text=Hola$/);
});

test('esMiembroVip: solo cuenta la membresía vigente; el rol de administrador no abre nada', () => {
  assert.equal(P.esMiembroVip({ planStatus: 'active' }), true);
  assert.equal(P.esMiembroVip({ planStatus: 'cancelled_active' }), true);
  assert.equal(P.esMiembroVip({ role: 'admin', planStatus: 'pending_payment' }), false);
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

test('el 20% de descuento del inicio (y toda la columna derecha) solo se pinta con membresía vigente', () => {
  const t = fs.readFileSync(path.join(RAIZ, 'pages', 'club-dashboard.html'), 'utf8');
  assert.match(t, /const verAside = ZOORIGEN_CLUB\.hasActiveMembership\(session\);/);
  assert.match(t, /if \(verAside\) \{[\s\S]{0,700}asideDescuento'\)\.innerHTML = ZOO_INICIO\.descuentoHTML/);
});
