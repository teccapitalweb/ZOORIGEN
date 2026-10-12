'use strict';

// Traspaso del curso elegido en la guía / encuesta de la portada hasta la prueba gratuita del Club.
// Ejecutar: node --test tests/traspaso-curso-pref.test.js

const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require(path.join(__dirname, '..', 'assets', 'js', 'club-curso-pref.js'));
const M = require(path.join(__dirname, '..', 'assets', 'js', 'encuesta-motor.js'));
const UI = require(path.join(__dirname, '..', 'assets', 'js', 'club-cursos-ui.js'));
const ONB = require(path.join(__dirname, '..', 'assets', 'js', 'club-onboarding.js'));
const ACC = require(path.join(__dirname, '..', 'assets', 'js', 'club-acceso.js'));

const RAIZ = path.join(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const AHORA = Date.UTC(2026, 9, 12, 15);
const DIA = 86400000;

function almacen(inicial = {}) {
  const d = Object.assign({}, inicial);
  return { d, getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: k => { delete d[k]; } };
}
const guardada = (a) => JSON.parse(a.d[P.CLAVE]);

/* ───────────────────────── Formato y vigencia ───────────────────────── */

test('normalizar: acepta { id, titulo, t } (objeto o JSON) y deja campos limpios', () => {
  assert.deepEqual(P.normalizar({ id: 'c1', titulo: '  Manejo   de colmenas ', t: AHORA - 1000 }, AHORA), { id: 'c1', titulo: 'Manejo de colmenas', t: AHORA - 1000 });
  assert.deepEqual(P.normalizar(JSON.stringify({ id: 'c1', titulo: 'X', t: AHORA }), AHORA), { id: 'c1', titulo: 'X', t: AHORA });
  assert.equal(P.normalizar({ id: 'c1' }, AHORA).titulo, '');
  assert.equal(P.normalizar({ id: 'c1' }, AHORA).t, AHORA, 'sin t se toma ahora');
});

test('normalizar: ids inválidos, JSON roto, caducidad y fechas del futuro', () => {
  for (const malo of [null, undefined, '', 'no json', '[]', 5, {}, { id: '' }, { id: 7 }, { id: 'a/b' }, { id: '../x' }, { id: 'x'.repeat(101) }, { id: '<script>' }, { id: 'a b' }, { id: '..' }]) {
    assert.equal(P.normalizar(malo, AHORA), null, JSON.stringify(malo));
  }
  assert.ok(P.normalizar({ id: 'c1', t: AHORA - 29 * DIA }, AHORA), 'a los 29 días sigue vigente');
  assert.equal(P.normalizar({ id: 'c1', t: AHORA - 31 * DIA }, AHORA), null, 'caduca a los 30 días');
  assert.equal(P.normalizar({ id: 'c1', t: AHORA + 40 * DIA }, AHORA).t, AHORA, 'una fecha del futuro no extiende la vigencia');
  assert.equal(P.normalizar({ id: 'c1', titulo: 'x'.repeat(400) }, AHORA).titulo.length, 160);
});

test('guardar / leer / borrar con un almacenamiento', () => {
  const a = almacen();
  assert.equal(P.leer(a, AHORA), null);
  const g = P.guardar(a, { id: 'c9', titulo: 'Sanidad apícola' }, AHORA);
  assert.deepEqual(g, { id: 'c9', titulo: 'Sanidad apícola', t: AHORA });
  assert.deepEqual(guardada(a), g);
  assert.deepEqual(P.leer(a, AHORA + 5 * DIA), g);
  assert.equal(P.leer(a, AHORA + 31 * DIA), null);
  P.borrar(a);
  assert.equal(P.leer(a, AHORA), null);
  assert.equal(P.guardar(a, { id: '' }, AHORA), null);
  // un almacenamiento que lanza (modo privado, bloqueado) no rompe nada
  const roto = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  assert.equal(P.leer(roto, AHORA), null);
  assert.doesNotThrow(() => { P.guardar(roto, { id: 'c1' }, AHORA); P.borrar(roto); });
  assert.equal(P.leer(null, AHORA), null);
});

test('lo que escribe la encuesta de la portada es lo que lee el Club', () => {
  const a = almacen();
  const pref = M.construirPreferencia({ id: 'Abc_123-x.y', titulo: 'Rescate de fauna silvestre' }, AHORA);
  a.setItem(M.PREF_KEY, JSON.stringify(pref));
  assert.equal(M.PREF_KEY, P.CLAVE);
  assert.deepEqual(P.leer(a, AHORA), pref);
});

/* ───────────────────────── ?curso= ───────────────────────── */

test('idDeUrl: solo ids válidos; lo demás se ignora sin error', () => {
  assert.equal(P.idDeUrl('?curso=abc123'), 'abc123');
  assert.equal(P.idDeUrl('?ref=ZOO-1&curso=Curso_1-a.b&x=1'), 'Curso_1-a.b');
  assert.equal(P.idDeUrl('?curso=a%20b'), null, 'espacios no son parte de un id');
  assert.equal(P.idDeUrl('?curso=%3Cscript%3E'), null);
  assert.equal(P.idDeUrl('?curso=%E0%A4%A'), null, 'codificación rota');
  assert.equal(P.idDeUrl('?curso='), null);
  assert.equal(P.idDeUrl('?otro=1'), null);
  assert.equal(P.idDeUrl(''), null);
  assert.equal(P.idDeUrl(null), null);
  assert.equal(P.idDeUrl('?curso=' + 'x'.repeat(101)), null);
});

test('las rutas que arma la portada se leen de vuelta con idDeUrl (ida y vuelta)', () => {
  for (const id of ['abc', 'c-1', 'Curso_2.0', '7Fh2KxQ9LmPa3ZtV']) {
    for (const url of [M.urlRegistro(id), M.urlLogin(id)]) {
      assert.ok(url.startsWith('pages/club-'), url);
      assert.equal(P.idDeUrl(url.slice(url.indexOf('?'))), id);
    }
  }
});

test('adoptarDeUrl: el id de la URL queda como preferencia y conserva el título si es del mismo curso', () => {
  const a = almacen();
  P.guardar(a, { id: 'c1', titulo: 'Sanidad apícola' }, AHORA - DIA);
  const mismo = P.adoptarDeUrl(a, '?curso=c1', AHORA);
  assert.deepEqual(mismo, { id: 'c1', titulo: 'Sanidad apícola', t: AHORA });
  const otro = P.adoptarDeUrl(a, '?curso=c2', AHORA);
  assert.deepEqual(otro, { id: 'c2', titulo: '', t: AHORA }, 'otro curso: no hereda el título del anterior');
  assert.equal(guardada(a).id, 'c2');
  // sin ?curso= no cambia nada
  assert.deepEqual(P.adoptarDeUrl(a, '?ref=ZOO-A1', AHORA), { id: 'c2', titulo: '', t: AHORA });
  // con un id malo tampoco pisa la preferencia vigente
  assert.equal(P.adoptarDeUrl(a, '?curso=%3Cb%3E', AHORA).id, 'c2');
  assert.equal(P.adoptarDeUrl(almacen(), '', AHORA), null);
});

/* ───────────────────────── Decisión ───────────────────────── */

const pref = { id: 'c1', titulo: 'Sanidad apícola', t: AHORA };
const elegible = (extra = {}) => Object.assign({ elegible: true, elegida: null, motivo: null, cursosElegibles: ['c1', 'c2'] }, extra);

test('resolver: preselecciona SOLO si el servidor dice elegible y el curso está entre los elegibles', () => {
  assert.deepEqual(P.resolver(elegible(), pref), { accion: 'destacar', id: 'c1', titulo: 'Sanidad apícola' });
  assert.deepEqual(P.resolver(elegible({ cursosElegibles: ['c2'] }), pref), { accion: 'borrar', motivo: 'no-elegible' });
  assert.deepEqual(P.resolver(elegible({ cursosElegibles: [] }), pref), { accion: 'borrar', motivo: 'no-elegible' });
});

test('resolver: ya eligió, tiene membresía o no puede elegir -> se ignora y se borra', () => {
  assert.deepEqual(P.resolver({ elegible: false, elegida: { cursoId: 'c2' }, motivo: 'Ya elegiste tu prueba gratuita' }, pref), { accion: 'borrar', motivo: 'ya-eligio' });
  assert.deepEqual(P.resolver({ elegible: false, elegida: 'c2' }, pref), { accion: 'borrar', motivo: 'ya-eligio' });
  assert.deepEqual(P.resolver({ elegible: false, elegida: null, motivo: 'Ya cuentas con una membresía activa' }, pref), { accion: 'borrar', motivo: 'no-aplica' });
  assert.deepEqual(P.resolver({ elegible: false, motivo: 'Tu cuenta ya tuvo una membresía, por eso no aplica la prueba gratuita' }, pref), { accion: 'borrar', motivo: 'no-aplica' });
  assert.deepEqual(P.resolver(elegible(), pref, true), { accion: 'borrar', motivo: 'membresia' }, 'la sesión dice que ya tiene plan');
  // elegible y a la vez elegida: nunca destaca
  assert.equal(P.resolver(elegible({ elegida: { cursoId: 'c2' } }), pref).accion, 'borrar');
});

test('resolver: si el servidor no respondió NO se borra (puede ser solo la red)', () => {
  for (const sinRespuesta of [null, undefined, {}, { elegible: false, elegida: null, motivo: '', cursosElegibles: [] }, { elegible: false, elegida: null, motivo: null }]) {
    assert.deepEqual(P.resolver(sinRespuesta, pref), { accion: 'conservar' }, JSON.stringify(sinRespuesta));
  }
  assert.deepEqual(P.resolver(elegible(), null), { accion: 'ninguna' });
});

test('resolver entiende el estado de ZOO_ACCESO.estadoPrueba y el del onboarding', () => {
  const deAcceso = ACC.estadoPrueba({ elegible: true, elegida: null, cursosElegibles: ['c1'], motivo: null });
  assert.equal(P.resolver(deAcceso, pref).accion, 'destacar');
  const yaElegida = ACC.estadoPrueba({ elegible: false, elegida: { cursoId: 'c5' }, motivo: 'Ya elegiste tu prueba gratuita y no se puede cambiar' });
  assert.equal(P.resolver(yaElegida, pref).accion, 'borrar');
  assert.equal(P.resolver(ACC.estadoPrueba(null), pref).accion, 'conservar', 'servidor caído: ZOO_ACCESO la devuelve sin prueba');
  const deOnb = ONB.normalizarEstadoPrueba({ elegible: true, elegida: null, motivo: null, cursosElegibles: ['c1'] });
  assert.equal(P.resolver(deOnb, pref).accion, 'destacar');
});

test('aplicar: borra lo que ya no aplica, conserva lo pendiente y nunca elige nada', () => {
  let a = almacen();
  P.guardar(a, pref, AHORA);
  assert.deepEqual(P.aplicar(elegible(), a, { ahora: AHORA }), { id: 'c1', titulo: 'Sanidad apícola' });
  assert.ok(a.d[P.CLAVE], 'se conserva mientras no elija');

  assert.equal(P.aplicar(elegible({ elegida: { cursoId: 'c2' }, elegible: false, motivo: 'x' }), a, { ahora: AHORA }), null);
  assert.equal(a.d[P.CLAVE], undefined, 'ya eligió: se borra');

  a = almacen(); P.guardar(a, pref, AHORA);
  assert.equal(P.aplicar(elegible({ cursosElegibles: ['c9'] }), a, { ahora: AHORA }), null);
  assert.equal(a.d[P.CLAVE], undefined, 'curso no elegible: se borra');

  a = almacen(); P.guardar(a, pref, AHORA);
  assert.equal(P.aplicar(null, a, { ahora: AHORA }), null);
  assert.ok(a.d[P.CLAVE], 'sin respuesta del servidor: se conserva');

  a = almacen(); P.guardar(a, pref, AHORA);
  assert.equal(P.aplicar(elegible(), a, { ahora: AHORA, tieneMembresia: true }), null);
  assert.equal(a.d[P.CLAVE], undefined, 'con membresía: se borra');

  a = almacen({ [P.CLAVE]: '{rota' });
  assert.equal(P.aplicar(elegible(), a, { ahora: AHORA }), null);
  assert.equal(a.d[P.CLAVE], undefined, 'preferencia ilegible: se limpia');

  a = almacen({ [P.CLAVE]: JSON.stringify({ id: 'c1', t: AHORA - 40 * DIA }) });
  assert.equal(P.aplicar(elegible(), a, { ahora: AHORA }), null);
  assert.equal(a.d[P.CLAVE], undefined, 'caducada: se limpia');
});

/* ───────────────────────── Pantalla de elegir ───────────────────────── */

const curso = { id: 'c1', title: 'Sanidad <b>apícola</b>', area: 'Apicultura' };

test('tarjeta pendiente: destaca el curso sugerido; sin sugerencia el HTML es el de siempre', () => {
  const normal = UI.tarjetaPendienteHTML(curso, { elegible: true });
  assert.ok(!/zc-card--pref|Elegiste este curso en la guía/.test(normal));
  assert.equal(UI.tarjetaPendienteHTML(curso, { elegible: true, destacado: false }), normal);
  const dest = UI.tarjetaPendienteHTML(curso, { elegible: true, destacado: true });
  assert.match(dest, /zc-card--pref/);
  assert.match(dest, /Elegiste este curso en la guía/);
  assert.match(dest, /data-elegir="c1"/, 'el botón sigue siendo el de elegir, con su confirmación');
  assert.ok(!/<b>apícola/.test(dest), 'el título va escapado');
  // un curso que no se puede elegir nunca se destaca
  const no = UI.tarjetaPendienteHTML(curso, { elegible: false, destacado: true, motivoNo: 'No disponible' });
  assert.ok(!/zc-card--pref|Elegiste este curso/.test(no));
});

test('aviso de la prueba: sin sugerencia dice solo lo de siempre; con ella ofrece "Elegir este curso"', () => {
  const normal = UI.bannerPruebaHTML();
  assert.equal(normal.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), 'Selecciona el curso de tu preferencia para obtener tu prueba gratuita');
  assert.equal(UI.bannerPruebaHTML(null), normal);
  const con = UI.bannerPruebaHTML({ id: 'c1', titulo: 'Sanidad <i>apícola</i>' });
  assert.match(con, /Elegiste <b>Sanidad &lt;i&gt;apícola&lt;\/i&gt;<\/b> en la guía/);
  assert.match(con, /data-elegir="c1"/);
  assert.match(con, /Elegir este curso/);
  assert.match(con, /id="prueba-card"/);
});

test('biblioteca: destaca y preselecciona, pero NO elige nada sola', () => {
  const html = leer('pages/club-biblioteca.html');
  assert.match(html, /club-curso-pref\.js/);
  assert.ok(html.indexOf('club-curso-pref.js') < html.indexOf('ZOO_CURSO_PREF.aplicar'));
  // lectura de la preferencia
  const i = html.indexOf('window.__zooPref = window.ZOO_CURSO_PREF');
  assert.ok(i > 0);
  const lectura = html.slice(i, html.indexOf(': null;', i) + 7);
  assert.match(lectura, /ZOO_CURSO_PREF\.aplicar\(estadoPrueba/);
  assert.match(lectura, /hasActiveMembership\(session\)/);
  assert.ok(!/llamarPrueba|confirmarPrueba|POST/.test(lectura), 'leer la preferencia no elige');
  // el único camino que llama al servidor para elegir sigue siendo la confirmación dentro de confirmarPrueba
  const llamadasPOST = [...html.matchAll(/llamarPrueba\('POST'/g)];
  assert.equal(llamadasPOST.length, 1);
  assert.ok(html.indexOf("llamarPrueba('POST'") > html.indexOf('function confirmarPrueba'));
  assert.match(html, /Sí, es mi prueba gratuita/);
  // al elegir (o al ya haber elegido) la sugerencia se borra
  assert.match(html, /ZOO_CURSO_PREF\.borrar\(window\.localStorage\)/);
  // destacado y orden
  assert.match(html, /destacado: c\.id === prefId/);
  assert.match(html, /p\.cursosElegibles\.includes\(window\.__zooPref\.id\)/);
});

test('registro, login y panel: cargan el módulo y adoptan ?curso= antes de cualquier redirección', () => {
  for (const f of ['pages/club-registro.html', 'pages/club-login.html']) {
    const html = leer(f);
    assert.match(html, /club-curso-pref\.js\?v=/);
    assert.match(html, /ZOO_CURSO_PREF\.adoptarDeUrl\(window\.localStorage, window\.location\.search\)/);
    assert.ok(html.indexOf('club-curso-pref.js') < html.indexOf('adoptarDeUrl('), f);
  }
  const login = leer('pages/club-login.html');
  assert.ok(login.indexOf('adoptarDeUrl(') < login.indexOf('onAuthStateChanged'), 'antes de que el login redirija al panel');
  const dash = leer('pages/club-dashboard.html');
  assert.match(dash, /club-curso-pref\.js/);
  assert.match(dash, /ZOO_CURSO_PREF\.borrar\(window\.localStorage\)/);
});

test('onboarding: la tarjeta de la prueba menciona el curso sugerido (solo texto, sin elegir)', () => {
  assert.match(ONB.TEXTOS.pref.conTitulo, /\{t\}/);
  assert.match(ONB.TEXTOS.pref.conTitulo, /Elegiste/);
  assert.match(ONB.TEXTOS.pref.sinTitulo, /elegiste en la guía/);
  const js = leer('assets/js/club-onboarding.js');
  assert.match(js, /ZOO_CURSO_PREF\.aplicar\(est, ls/);
  assert.ok(!/\{t\}.*cursoId/.test(js));
});

test('sin emojis en el módulo del traspaso', () => {
  assert.ok(!/[\p{Extended_Pictographic}️]/u.test(leer('assets/js/club-curso-pref.js')));
});
