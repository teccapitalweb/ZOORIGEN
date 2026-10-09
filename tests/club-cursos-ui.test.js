'use strict';
// Constructores de HTML de la biblioteca (tarjetas, detalle, estados de clase).
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../assets/js/club-cursos-ui.js');

const curso = (extra) => Object.assign({ id: 'c1', title: 'Manejo integral de colmenas', area: 'Apicultura', level: 'Intermedio', duration: '6 h', instructor: 'Dra. Ana',
  lecciones: [{ titulo: 'a' }, { titulo: 'b' }, { titulo: 'c' }] }, extra || {});

test('urlSegura solo deja pasar http(s) y rutas del sitio', () => {
  assert.equal(U.urlSegura('https://x.com/a.jpg'), 'https://x.com/a.jpg');
  assert.equal(U.urlSegura('../assets/img/a.jpg'), '../assets/img/a.jpg');
  for (const mala of ['javascript:alert(1)', 'data:text/html,<b>', "https://x.com/a'b", 'https://x.com/a b', '//evil.com/x', '', null, undefined, '"><img src=x>', 'file:///c:/x']) assert.equal(U.urlSegura(mala), '', String(mala));
});

test('las tarjetas escapan todo texto de la base de datos', () => {
  const html = U.tarjetaHTML(curso({ title: '<img src=x onerror=alert(1)>', instructor: '"><script>x</script>', area: '<b>', level: '<i>', tag: '<u>' }), { imagen: "https://x.com/a.jpg" });
  assert.ok(!/<img src=x|<script>|<b>|<i>|<u>/.test(html.replace(/<(\/?)(article|div|span|h3|svg|path|circle|rect|line|polyline|button)\b[^>]*>/g, '')), 'no debe quedar HTML inyectado');
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('tarjeta de miembro bloqueada por tiempo muestra "Restan N días" y se ve en gris', () => {
  const html = U.tarjetaHTML(curso(), { modo: 'miembro', desbloqueo: { desbloqueado: false, diasFalta: 3, motivo: 'tiempo' } });
  assert.match(html, /Restan 3 días para su desbloqueo/);
  assert.match(html, /zc-card--locked/);
  assert.match(U.tarjetaHTML(curso(), { modo: 'miembro', desbloqueo: { desbloqueado: false, diasFalta: 1, motivo: 'tiempo' } }), /Resta 1 día para su desbloqueo/);
  assert.match(U.tarjetaHTML(curso(), { modo: 'miembro', desbloqueo: { desbloqueado: false, diasFalta: null, motivo: 'termina-prueba' } }), /Termina primero tu curso de prueba/);
});

test('tarjeta abierta no lleva etiqueta de bloqueo; con progreso muestra barra y con certificado la insignia', () => {
  const html = U.tarjetaHTML(curso(), { modo: 'miembro', desbloqueo: { desbloqueado: true, diasFalta: 0 }, completadas: 2, certificado: true });
  assert.ok(!/zc-badge--lock|zc-card--locked/.test(html));
  assert.match(html, /67% completado/);
  assert.match(html, /Certificado/);
  assert.match(html, /3 clases/);
});

test('tarjeta de la prueba gratuita y de cursos "con membresía"; curso siempre disponible', () => {
  assert.match(U.tarjetaHTML(curso(), { modo: 'prueba', esPrueba: true, clasesGratis: 2 }), /2 CLASES GRATIS/);
  assert.match(U.tarjetaHTML(curso(), { modo: 'prueba', esPrueba: true, clasesGratis: 1 }), /1 CLASE GRATIS/);
  assert.match(U.tarjetaHTML(curso(), { modo: 'prueba' }), /Con membresía/);
  assert.match(U.tarjetaHTML(curso({ disponibleSiempre: true }), { modo: 'miembro', desbloqueo: { desbloqueado: true } }), /DISPONIBLE/);
});

test('tarjeta "solo título" para elegir: botón activo o deshabilitado con su motivo', () => {
  const si = U.tarjetaPendienteHTML(curso(), { elegible: true });
  assert.match(si, /data-elegir="c1"/);
  assert.match(si, /Elegir como prueba gratuita/);
  assert.ok(!/zc-cta/.test(si), 'la tarjeta de elegir no muestra el botón Ver curso');
  const no = U.tarjetaPendienteHTML(curso(), { elegible: false, motivoNo: 'Se abre después de tu prueba' });
  assert.match(no, /disabled/);
  assert.match(no, /Se abre después de tu prueba/);
  assert.ok(!/data-elegir/.test(no));
});

test('banner de la prueba gratuita', () => {
  const b = U.bannerPruebaHTML();
  assert.match(b, /Selecciona el curso de tu preferencia para obtener tu prueba gratuita/);
  assert.match(b, /Solo puedes elegir <b>un<\/b> curso y después no se puede cambiar/);
  assert.match(b, /id="prueba-card"/);
});

/* ── estados de clase ── */
const base = { hecha: false, anteriorHecha: false, esPrimera: false, esMiembro: true, gratis: false, espera: { desbloqueado: true }, esSiguiente: false };
const est = (o) => U.estadoClase(Object.assign({}, base, o));

test('miembro: primera clase abierta, siguientes por orden, vistas para repasar', () => {
  assert.deepEqual([est({ esPrimera: true }).estado, est({ esPrimera: true }).accion], ['abierta', 'abrir']);
  assert.equal(est({ esPrimera: true, esSiguiente: true }).estado, 'siguiente');
  assert.match(est({ esPrimera: true, esSiguiente: true }).texto, /Siguiente clase/);
  assert.equal(est({ anteriorHecha: true }).accion, 'abrir');
  assert.deepEqual([est({}).estado, est({}).accion], ['orden', 'aviso-orden']);
  assert.match(est({}).texto, /Marca como vista la clase anterior/);
  assert.match(est({ hecha: true }).texto, /Vista · click para repasar/);
});

test('curso aún bloqueado: todas las clases piden esperar (con los días o "termina tu prueba")', () => {
  const t = est({ esPrimera: true, espera: { desbloqueado: false, diasFalta: 5, motivo: 'tiempo' } });
  assert.deepEqual([t.estado, t.accion, t.texto], ['espera', 'aviso-espera', 'Faltan 5 días para su desbloqueo']);
  assert.match(est({ esPrimera: true, espera: { desbloqueado: false, diasFalta: null, motivo: 'termina-prueba' } }).texto, /Termina primero tu curso de prueba/);
  assert.match(est({ esPrimera: true, espera: { desbloqueado: false, diasFalta: 1, motivo: 'tiempo' } }).texto, /Falta 1 día/);
});

test('sin membresía: clase de pago → paywall; clase gratis abierta u ordenada', () => {
  const nm = { esMiembro: false };
  assert.deepEqual([est({ ...nm, gratis: false, esPrimera: true }).estado, est({ ...nm, gratis: false }).accion], ['paywall', 'paywall']);
  assert.match(est({ ...nm }).texto, /Activa tu membresía para ver esta clase/);
  assert.match(est({ ...nm, gratis: true, esPrimera: true }).texto, /CLASE GRATIS · Click para verla/);
  assert.equal(est({ ...nm, gratis: true, anteriorHecha: true }).accion, 'abrir');
  const orden = est({ ...nm, gratis: true });
  assert.deepEqual([orden.estado, orden.accion], ['orden', 'aviso-orden']);
  assert.match(orden.texto, /Clase gratuita · marca como vista la anterior/);
  assert.match(est({ ...nm, gratis: true, hecha: true }).texto, /Vista/);
});

test('detalle del curso: portada, instructor, avance, clases y avisos (todo escapado)', () => {
  const filas = [
    { i: 0, titulo: 'Intro <b>', duracion: '25 min', estado: 'hecha', texto: 'Vista · click para repasar', accion: 'abrir', preguntas: 2, juego: 'Memorama' },
    { i: 1, titulo: 'Dos', duracion: '', estado: 'paywall', texto: 'Activa tu membresía para ver esta clase', accion: 'paywall', preguntas: 0, juego: '' }
  ];
  const html = U.detalleHTML({ curso: curso({ description: 'Texto <script>x</script>' }), imagen: 'https://x.com/p.jpg', completadas: 1, total: 2, filas,
    espera: { desbloqueado: false, diasFalta: 2, motivo: 'tiempo' }, accionPrincipal: { id: 'continuar', texto: 'Continuar con la clase 2' }, certificadoHTML: '', etiquetaPrueba: 'Prueba gratuita' });
  assert.match(html, /Faltan 2 días para su desbloqueo\./);
  assert.match(html, /Mientras tanto puedes ver de qué trata y qué clases incluye/);
  assert.match(html, /1\/2 · 50%/);
  assert.match(html, /Curso especializado · Zoorigen/);
  assert.match(html, /Dra\. Ana/);
  assert.match(html, /2 preguntas/);
  assert.match(html, /Memorama/);
  assert.match(html, /data-zc="continuar"/);
  assert.match(html, /data-accion="paywall"/);
  assert.ok(!html.includes('<script>') && !html.includes('Intro <b>'));
  assert.match(html, /Prueba gratuita/);
});

test('detalle sin instructor usa "Equipo Zoorigen"; sin aviso cuando el curso está abierto', () => {
  const html = U.detalleHTML({ curso: curso({ instructor: '' }), completadas: 0, total: 3, filas: [], espera: { desbloqueado: true } });
  assert.match(html, /Equipo Zoorigen/);
  assert.ok(!/zc-aviso/.test(html));
});

test('textos de espera', () => {
  assert.equal(U.textoEspera({ desbloqueado: true }), '');
  assert.equal(U.textoFaltan({ desbloqueado: false, diasFalta: 0, motivo: 'tiempo' }), 'Faltan 0 días para su desbloqueo');
  assert.equal(U.textoEspera({ desbloqueado: false, diasFalta: NaN, motivo: 'tiempo' }), 'Aún no disponible');
});
