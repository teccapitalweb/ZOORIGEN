'use strict';

// Contacto del Club (WhatsApp, Instagram y correo editables desde el panel): validación de lo que llega del servidor, reescritura de
// enlaces y que SIEMPRE haya un enlace de respaldo en cada página. Ejecutar: node --test tests/club-contacto.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const C = require(path.join(RAIZ, 'assets', 'js', 'club-contacto.js'));

test('validar: datos buenos se aceptan y cada campo malo cae al valor de siempre', () => {
  const bien = C.validar({ ok: true, whatsappNumero: '5215512345678', instagram: 'https://www.instagram.com/zoo.nuevo/', correo: 'Ayuda@Zoorigen.com' });
  assert.deepEqual(bien, { whatsappNumero: '5215512345678', instagram: 'https://www.instagram.com/zoo.nuevo/', correo: 'ayuda@zoorigen.com' });
  const mal = C.validar({ whatsappNumero: '123', instagram: 'javascript:alert(1)', correo: 'no-es-correo' });
  assert.deepEqual(mal, C.DEFECTO);
  assert.deepEqual(C.validar(null), C.DEFECTO);
  assert.deepEqual(C.validar('texto'), C.DEFECTO);
  // un Instagram de otro sitio (por ejemplo un enlace de fraude) nunca se acepta
  assert.equal(C.validar({ instagram: 'https://instagram.com.malo.example/x/' }).instagram, C.DEFECTO.instagram);
  assert.equal(C.validar({ instagram: 'https://www.instagram.com/x/../../y/' }).instagram, C.DEFECTO.instagram);
});

test('los datos de siempre son los de las páginas', () => {
  assert.deepEqual(C.DEFECTO, { whatsappNumero: '5212361113237', instagram: 'https://www.instagram.com/zoorigen.mexico1/', correo: 'zooorigen@gmail.com' });
});

test('tipoDeHref: solo reconoce los enlaces de siempre (WhatsApp, Instagram y correo), no los de compartir ni los de otras personas', () => {
  assert.equal(C.tipoDeHref('https://wa.me/5212361113237?text=Hola'), 'wa');
  assert.equal(C.tipoDeHref('https://wa.me/5212361113237'), 'wa');
  assert.equal(C.tipoDeHref('https://wa.me/?text=compartir'), null, 'compartir con amigos no se toca');
  assert.equal(C.tipoDeHref('https://wa.me/5215599999999'), null, 'el WhatsApp de otra persona no se toca');
  assert.equal(C.tipoDeHref('https://www.instagram.com/zoorigen.mexico1/'), 'ig');
  assert.equal(C.tipoDeHref('https://www.instagram.com/otra.cuenta/'), null);
  assert.equal(C.tipoDeHref('mailto:zooorigen@gmail.com'), 'correo');
  assert.equal(C.tipoDeHref('mailto:ZOOORIGEN@gmail.com?subject=Hola'), 'correo');
  assert.equal(C.tipoDeHref('mailto:alguien@x.test'), null);
  assert.equal(C.tipoDeHref(''), null);
});

test('reescribirHref: cambia el número pero conserva el mensaje de WhatsApp; Instagram y correo se sustituyen', () => {
  const d = { whatsappNumero: '5215512345678', instagram: 'https://www.instagram.com/zoo.nuevo/', correo: 'ayuda@zoorigen.com' };
  assert.equal(C.reescribirHref('https://wa.me/5212361113237?text=Hola%2C%20quiero%20aplicar%20mi%2020%25%20VIP', 'wa', d), 'https://wa.me/5215512345678?text=Hola%2C%20quiero%20aplicar%20mi%2020%25%20VIP');
  assert.equal(C.reescribirHref('https://wa.me/5212361113237', 'wa', d), 'https://wa.me/5215512345678');
  assert.equal(C.reescribirHref('https://www.instagram.com/zoorigen.mexico1/', 'ig', d), 'https://www.instagram.com/zoo.nuevo/');
  assert.equal(C.reescribirHref('mailto:zooorigen@gmail.com?subject=Ayuda', 'correo', d), 'mailto:ayuda@zoorigen.com?subject=Ayuda');
  assert.equal(C.reescribirHref('https://otra.pagina/', 'otro', d), 'https://otra.pagina/');
});

test('waUrl, instagram y correo entregan los de siempre mientras no llegue otra cosa', () => {
  assert.equal(C.waUrl('Hola quiero ayuda'), 'https://wa.me/5212361113237?text=Hola%20quiero%20ayuda');
  assert.equal(C.waUrl(), 'https://wa.me/5212361113237');
  assert.equal(C.instagram(), C.DEFECTO.instagram);
  assert.equal(C.correo(), C.DEFECTO.correo);
});

test('aplicar: reescribe una sola vez cada enlace reconocido y recuerda el original (sin documento, no hace nada)', () => {
  assert.equal(C.aplicar(), 0);
  // Documento mínimo falso: dos enlaces reconocidos y uno ajeno
  const crear = (href, extra) => {
    const attrs = Object.assign({ href }, extra || {});
    return { getAttribute: k => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = v; }, hasAttribute: k => k in attrs, attrs };
  };
  const a = crear('https://wa.me/5212361113237?text=Hola');
  const b = crear('https://otra.pagina/');
  const global = globalThis.document;
  globalThis.document = { querySelectorAll: () => [a, b] };
  try {
    assert.equal(C.aplicar(globalThis.document), 0, 'con los datos de siempre no hay nada que cambiar');
    assert.equal(a.attrs['data-zoo-contacto'], 'wa');
    assert.equal(a.attrs['data-zoo-contacto-href'], 'https://wa.me/5212361113237?text=Hola');
    assert.equal(b.attrs['data-zoo-contacto'], undefined, 'el enlace ajeno ni se marca');
  } finally { globalThis.document = global; }
});

test('cada página del Club con WhatsApp de siempre carga club-contacto.js y deja su enlace de respaldo escrito', () => {
  const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html'));
  const conWa = paginas.filter(f => leer('pages/' + f).includes('wa.me/5212361113237'));
  assert.ok(conWa.length >= 5, 'se esperaban varias páginas con WhatsApp: ' + conWa.join(', '));
  for (const f of conWa) assert.match(leer('pages/' + f), /assets\/js\/club-contacto\.js\?v=[\w.-]+/, f + ' no carga club-contacto.js');
  for (const f of ['club-canal.html', 'club-dashboard.html', 'club-gracias.html', 'club-perfil.html', 'verificar-correo.html']) {
    assert.ok(paginas.includes(f), f);
    assert.match(leer('pages/' + f), /club-contacto\.js/, f);
  }
  assert.match(leer('pages/club-canal.html'), /instagram\.com\/zoorigen\.mexico1\//, 'el Instagram de respaldo sigue escrito');
});

test('todas las páginas que cargan club-contacto.js usan la MISMA versión', () => {
  const v = new Set();
  for (const f of fs.readdirSync(path.join(RAIZ, 'pages')).filter(x => x.endsWith('.html'))) {
    for (const m of leer('pages/' + f).matchAll(/assets\/js\/club-contacto\.js\?v=([\w.-]+)/g)) v.add(m[1]);
  }
  assert.equal(v.size, 1, [...v].join(', '));
});

test('el módulo solo habla con GET /api/config/contacto, sin sesión, y no escribe nada en el servidor ni guarda datos personales', () => {
  const js = leer('assets/js/club-contacto.js');
  assert.match(js, /\/api\/config\/contacto/);
  assert.doesNotMatch(js, /method:\s*'(POST|PUT|PATCH|DELETE)'|Authorization|getIdToken/);
  assert.doesNotMatch(js, /gradient\(/i);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(js));
});
