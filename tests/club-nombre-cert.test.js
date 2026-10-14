'use strict';
// Nombre del primer certificado: reglas del nombre, qué certificado hay que confirmar y el envío al servidor.
// La ventana en sí (solo navegador) se revisa a mano; aquí se prueba lo que decide qué se pregunta y qué se manda.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const N = require('../assets/js/club-nombre-cert.js');
const O = require('../assets/js/club-onboarding.js');

test('validarNombre: nombre y apellido, solo letras, mayúsculas acomodadas, 3 a 38 caracteres', () => {
  assert.deepEqual(N.validarNombre('  maría de la luz   lópez ruiz '), { ok: true, valor: 'María de la Luz López Ruiz', error: '' });
  assert.equal(N.validarNombre('LUIS GÓMEZ').valor, 'Luis Gómez');
  assert.equal(N.validarNombre('Ana María Pérez').valor, 'Ana María Pérez');
  assert.equal(N.validarNombre("O'Brien Smith").ok, true);
  for (const malo of ['', 'Pe', 'Pedro', 'Ana 3rd', 'a b', 'Ana de', 'Ana <b>', 'x'.repeat(39), null, undefined]) {
    const r = N.validarNombre(malo);
    assert.equal(r.ok, false, JSON.stringify(malo));
    assert.ok(r.error);
  }
});

test('las reglas del nombre son las mismas de la bienvenida (club-onboarding.js)', () => {
  const casos = ['maría de la luz lópez ruiz', 'LUIS GÓMEZ', 'Pedro', 'Ana 3rd', 'Ana de', "O'Brien Smith", 'Juan  de la Cruz', 'x'.repeat(39), 'Li Wu', 'Ana-María Pérez'];
  for (const c of casos) {
    const a = N.validarNombre(c), b = O.validarNombre(c);
    assert.equal(a.ok, b.ok, c);
    if (a.ok) assert.equal(a.valor, b.valor, c);
  }
  assert.equal(N.NOMBRE_MAX, O.NOMBRE_MAX);
  assert.equal(N.NOMBRE_MIN, O.NOMBRE_MIN);
});

test('nombreOfrecible: no se ofrece un correo, una palabra sola ni un nombre con números', () => {
  assert.equal(N.nombreOfrecible('Ana Pérez', 'ana.perez@example.com'), true);
  assert.equal(N.nombreOfrecible('anaperez', 'anaperez@example.com'), false);
  assert.equal(N.nombreOfrecible('Ana', 'x@y.com'), false);
  assert.equal(N.nombreOfrecible('Ana Pérez 2', 'x@y.com'), false);
  assert.equal(N.nombreOfrecible('', 'x@y.com'), false);
});

test('pendiente: solo propone certificados nuevos del servidor sin confirmar y respeta a quien tiene certificados anteriores', () => {
  const nuevo = (folio, extra) => Object.assign({ folio, origen: 'backend', verificado: true, issuedAt: '2026-10-12T10:00:00.000Z' }, extra);
  assert.equal(N.pendiente([]), null);
  assert.equal(N.pendiente(null), null);
  assert.equal(N.pendiente([nuevo('ZOO-2026-AAAAAAA1')]).folio, 'ZOO-2026-AAAAAAA1');
  // ya confirmado
  assert.equal(N.pendiente([nuevo('ZOO-2026-AAAAAAA1', { nombreConfirmado: true })]), null);
  // anteriores: escritos por el navegador (sin origen) o validados después: nunca se obliga
  const anterior = { folio: 'ZOO-2026-48213', memberUid: 'u', courseId: 'c' };
  const validado = { folio: 'ZOO-2026-11111', origen: 'legacy-validado', verificado: true };
  assert.equal(N.pendiente([anterior, nuevo('ZOO-2026-AAAAAAA1')]), null);
  assert.equal(N.pendiente([validado, nuevo('ZOO-2026-AAAAAAA1')]), null);
  assert.equal(N.pendiente([anterior]), null);
  // el emitido por el administrador no cuenta
  assert.equal(N.pendiente([{ folio: 'ZOO-2026-ADMIN001', origen: 'admin', verificado: true }, nuevo('ZOO-2026-AAAAAAA1')]).folio, 'ZOO-2026-AAAAAAA1');
  // varios nuevos: el más antiguo
  const dos = [nuevo('ZOO-2026-BBBBBBB2', { issuedAt: '2026-10-13T10:00:00.000Z' }), nuevo('ZOO-2026-AAAAAAA1')];
  assert.equal(N.pendiente(dos).folio, 'ZOO-2026-AAAAAAA1');
});

test('enviar: manda folio y nombre a POST /api/certificados/nombre y traduce las respuestas', async () => {
  const llamadas = [];
  const ok = { apiFetch: async (ruta, op) => { llamadas.push({ ruta, op }); return { ok: true, nombre: 'Ana Pérez', corregido: true }; } };
  const r = await N.enviar(ok, 'ZOO-2026-AAAAAAA1', 'Ana Pérez');
  assert.deepEqual(r, { ok: true, nombre: 'Ana Pérez', corregido: true });
  assert.equal(llamadas[0].ruta, '/api/certificados/nombre');
  assert.equal(llamadas[0].op.method, 'POST');
  assert.deepEqual(llamadas[0].op.body, { folio: 'ZOO-2026-AAAAAAA1', nombre: 'Ana Pérez' });

  const err = (status, message) => ({ apiFetch: async () => { throw Object.assign(new Error(message || 'x'), { status }); } });
  assert.deepEqual(await N.enviar(err(409), 'F', 'Ana Pérez'), { ok: false, yaConfirmado: true });
  assert.deepEqual(await N.enviar(err(400, 'Usa solo letras, sin números ni símbolos.'), 'F', 'Ana 3'), { ok: false, error: 'Usa solo letras, sin números ni símbolos.' });
  assert.equal((await N.enviar(err(0), 'F', 'Ana Pérez')).error, N.TEXTOS.errorRed);
  assert.equal((await N.enviar({ apiFetch: async () => ({}) }, 'F', 'Ana Pérez')).ok, false);
});

test('textos: claros, honestos y sin emojis', () => {
  const todo = Object.values(N.TEXTOS).join(' ');
  assert.match(N.TEXTOS.titulo, /nombre que quieres en tu certificado/);
  assert.match(N.TEXTOS.pie, /ya no se puede cambiar/);
  assert.equal(/\p{Extended_Pictographic}/u.test(todo), false);
  const js = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'club-nombre-cert.js'), 'utf8');
  assert.equal(/gradient/i.test(js), false, 'sin degradados');
  assert.equal(/\p{Extended_Pictographic}/u.test(js.replace(/\\p\{Extended_Pictographic\}/g, '')), false, 'sin emojis en el archivo');
});

test('el progreso del club pasa confirmarNombre y las páginas cargan el módulo con versión', () => {
  const P = require('../assets/js/club-progreso.js');
  assert.ok(P);
  const prog = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'club-progreso.js'), 'utf8');
  assert.ok(/confirmarNombre: resp\.confirmarNombre === true/.test(prog));
  for (const p of ['club-biblioteca.html', 'club-certificados.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', 'pages', p), 'utf8');
    assert.ok(/assets\/js\/club-nombre-cert\.js\?v=[\w.-]+/.test(html), p + ' debe cargar club-nombre-cert.js con ?v=');
  }
  const biblio = fs.readFileSync(path.join(__dirname, '..', 'pages', 'club-biblioteca.html'), 'utf8');
  const ini = biblio.indexOf('async function celebrarCursoCompletado');
  const fin = biblio.indexOf('// Botón "Terminar curso"');
  const celebrar = biblio.slice(ini, fin);
  assert.ok(celebrar.indexOf('ZOO_NOMBRE_CERT.preguntar') > 0, 'confirma el nombre al terminar el primer curso');
  assert.ok(celebrar.indexOf('ZOO_NOMBRE_CERT.preguntar') < celebrar.indexOf('ZOO_CURSO_PREMIO.mostrar'), 'el nombre se confirma ANTES de abrir el certificado');
});

test('FIRESTORE-REGLAS-v6: el titular no escribe la confirmación del nombre (cambio propuesto, sin publicar)', () => {
  const v6 = fs.readFileSync(path.join(__dirname, '..', 'FIRESTORE-REGLAS-v6.txt'), 'utf8');
  assert.equal((v6.match(/'nombreCertificadoConfirmadoEn', 'nombreCertificadoFolio'/g) || []).length, 2, 'en create y en update');
});
