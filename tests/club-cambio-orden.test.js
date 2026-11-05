'use strict';
// "Cambia el orden de tu calendario": constructores de HTML (club-calendario.js) y conexión con las páginas.
// Las reglas (35 y 55 retos nuevos, 8 y 14 de cada tipo, solo 2 cambios) las decide el servidor; aquí se prueba que el sitio
// pinte lo que el servidor manda, escape los textos y no ofrezca el botón cuando no corresponde.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const CAL = require('../assets/js/club-calendario.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const DIA = 86400000;

const cerrados = () => [
  { cursoId: 'c2', titulo: 'Curso 2', lugar: 1, desbloqueoEn: new Date(Date.now() + 5 * DIA).toISOString(), diasFalta: 5 },
  { cursoId: 'c3', titulo: 'Curso <b>3</b>', lugar: 2, desbloqueoEn: new Date(Date.now() + 13 * DIA).toISOString(), diasFalta: 13 },
  { cursoId: 'c4', titulo: 'Curso 4', lugar: 3, desbloqueoEn: new Date(Date.now() + 21 * DIA).toISOString(), diasFalta: 21 }
];
const resp = (extra = {}) => ({
  ok: true, aplica: true, usados: 0, maximo: 2, contados: { quiz: 20, detective: 8, orden: 7 }, disponible: false,
  cursosCerrados: cerrados(), cambios: [], xpInsignias: { 1: 40, 2: 60 }, ...extra
});

test('cambioOrden: sin respuesta, sin aplicar o con error no se pinta nada', () => {
  assert.equal(CAL.cambioOrden(null), null);
  assert.equal(CAL.cambioOrden({ ok: false }), null);
  assert.equal(CAL.cambioOrden({ ok: true, aplica: false, contados: { quiz: 1 } }), null);
  assert.equal(CAL.cambioOrdenHTML(null), '');
  assert.equal(CAL.cambioOrdenModalHTML(null), '');
});

test('cambioOrden: normaliza avance, tramos y siguiente (35/8 y 55/14)', () => {
  const co = CAL.cambioOrden(resp());
  assert.deepEqual(co.contados, { quiz: 20, detective: 8, orden: 7, total: 35 });
  assert.deepEqual(co.tramos.map(t => [t.n, t.total, t.porTipo, t.usado, t.cumple]), [[1, 35, 8, false, false], [2, 55, 14, false, false]]);
  assert.equal(co.siguiente.n, 1);
  assert.equal(co.disponible, false, '35 retos pero 7 de ordena: no alcanza');
  assert.equal(CAL.faltanTexto(co), 'Te faltan 1 de ordena');
  const listo = CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true }));
  assert.equal(listo.siguiente.cumple, true);
  assert.equal(listo.disponible, true);
  // el servidor dice disponible pero los números no alcanzan: manda lo comprobable, no se ofrece el botón
  assert.equal(CAL.cambioOrden(resp({ disponible: true })).disponible, false);
  const usado1 = CAL.cambioOrden(resp({ usados: 1, contados: { quiz: 27, detective: 14, orden: 14 }, disponible: true }));
  assert.deepEqual([usado1.siguiente.n, usado1.siguiente.cumple, usado1.disponible], [2, true, true]);
  const fin = CAL.cambioOrden(resp({ usados: 2 }));
  assert.deepEqual([fin.completo, fin.siguiente], [true, null]);
});

test('bloque: título, aviso de solo 2 cambios, avance por tipo y las dos insignias con su XP', () => {
  const html = CAL.cambioOrdenHTML(CAL.cambioOrden(resp()), { modo: 'cursos', hrefRetos: 'club-retos.html' });
  assert.match(html, /Cambia el orden de tu calendario/);
  assert.match(html, /Solo hay 2 cambios en total/);
  assert.match(html, /35 retos nuevos/);
  assert.match(html, /55 retos nuevos/);
  assert.match(html, /\+40 XP/);
  assert.match(html, /\+60 XP/);
  assert.match(html, /35 de 35<\/b> retos nuevos/);
  assert.match(html, /Quiz<\/span>/);
  assert.match(html, /Ordena<\/span>/);
  assert.match(html, /7\/8/, 'ordena va 7 de 8');
  assert.match(html, /El modo historia no cuenta/);
  assert.equal(/data-zco="elegir"/.test(html), false, 'sin botón de elegir: todavía no alcanza');
  assert.match(html, /href="club-retos.html"/, 'en su lugar, ir a los retos');
  assert.match(html, /Te faltan 1 de ordena/);
});

test('bloque: con los retos cumplidos aparece el botón para elegir; en Retos lleva a Cursos', () => {
  const co = CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true }));
  assert.match(CAL.cambioOrdenHTML(co, { modo: 'cursos' }), /data-zco="elegir"/);
  const enRetos = CAL.cambioOrdenHTML(CAL.cambioOrden({ usados: 0, maximo: 2, contados: { quiz: 19, detective: 8, orden: 8 } }), { modo: 'retos', href: 'club-biblioteca.html#cambiar-orden' });
  assert.match(enRetos, /href="club-biblioteca.html#cambiar-orden"/);
  assert.equal(/data-zco="elegir"/.test(enRetos), false);
  // sin otro curso cerrado que mover no hay botón y se explica
  const sinCursos = CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: false, cursosCerrados: [cerrados()[0]] }));
  const t = CAL.cambioOrdenHTML(sinCursos, { modo: 'cursos' });
  assert.equal(/data-zco="elegir"/.test(t), false);
  assert.match(t, /no hay otro curso cerrado que mover/);
});

test('bloque: con los 2 cambios usados no hay botón ni barra, y se listan los cambios hechos', () => {
  const co = CAL.cambioOrden(resp({ usados: 2, contados: { quiz: 30, detective: 20, orden: 20 }, cambios: [
    { n: 1, cursoId: 'c4', titulo: 'Curso 4', en: '2026-11-10T12:00:00.000Z' }, { n: 2, cursoId: 'c3', titulo: '<img src=x onerror=alert(1)>', en: '2026-12-20T12:00:00.000Z' }] }));
  const html = CAL.cambioOrdenHTML(co, { modo: 'cursos' });
  assert.match(html, /Ya usaste tus 2 cambios/);
  assert.equal(/role="progressbar"/.test(html), false);
  assert.equal(/data-zco="elegir"/.test(html), false);
  assert.match(html, /Cambio 1: «Curso 4»/);
  assert.equal(/<img/.test(html), false, 'los títulos se escapan');
  assert.match(html, /&lt;img/);
});

test('ventana: lista solo los cursos que NO son el siguiente, escapa títulos, avisa que es definitivo y el botón nace apagado', () => {
  const co = CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true }));
  const html = CAL.cambioOrdenModalHTML(co);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /Cambio 1 de 2/);
  assert.match(html, /Ahora se abre primero «Curso 2»/);
  assert.equal((html.match(/name="zcoCurso"/g) || []).length, 2, 'c3 y c4 (c2 ya es el siguiente)');
  assert.match(html, /value="c3"/);
  assert.match(html, /value="c4"/);
  assert.equal(/value="c2"/.test(html), false);
  assert.match(html, /Curso &lt;b&gt;3&lt;\/b&gt;/);
  assert.match(html, /Este cambio es definitivo/);
  assert.match(html, /data-zco="confirmar" disabled/);
  assert.match(html, /pasaría a abrirse en 5 días/);
});

test('sin emojis ni degradados en los textos, estilos y archivos nuevos', () => {
  const co = CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true, cambios: [{ n: 1, titulo: 'X', en: Date.now() }] }));
  const todo = CAL.cambioOrdenHTML(co, { modo: 'cursos' }) + CAL.cambioOrdenModalHTML(co) + leer('assets/js/club-cambio-orden.js') + leer('assets/css/club-calendario.css');
  assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(todo.replace(/[«»·…→]/g, '')), false, 'sin emojis');
  assert.equal(/gradient/.test(leer('assets/css/club-calendario.css')), false, 'solo colores sólidos');
});

test('el módulo del navegador usa los dos endpoints, pide confirmación explícita y no toca cursos por su cuenta', () => {
  const js = leer('assets/js/club-cambio-orden.js');
  assert.match(js, /\/api\/calendario\/cambio-orden/);
  assert.match(js, /\/api\/calendario\/cambiar-orden/);
  assert.match(js, /confirmar: true/);
  assert.match(js, /method: 'POST'/);
  assert.match(js, /Escape/, 'se cierra con Esc');
});

test('las páginas cargan el módulo con la misma versión y la página de Cursos tiene su contenedor; Retos solo muestra el avance', () => {
  const cursos = leer('pages/club-biblioteca.html');
  assert.match(cursos, /<div id="cambioOrden"><\/div>/);
  assert.match(cursos, /club-cambio-orden\.js\?v=20261105-cambioorden/);
  assert.match(cursos, /ZOO_CAMBIO_ORDEN\.iniciar/);
  assert.match(cursos, /alCambiar:[^\n]*render\(/, 'después del cambio se vuelven a pintar los cursos');
  const retos = leer('pages/club-retos.html');
  assert.equal(retos.includes('club-cambio-orden.js'), false, 'en Retos no se elige curso: eso es en Cursos');
  assert.match(leer('assets/js/club-retos.js'), /id="rzCambioOrden"|id=\\"rzCambioOrden\\"|rzCambioOrden/);
  // un solo valor de versión para club-calendario.js/css en todas las páginas
  const versiones = new Set();
  for (const f of fs.readdirSync(path.join(RAIZ, 'pages')).filter(x => x.endsWith('.html'))) {
    for (const m of leer('pages/' + f).matchAll(/club-calendario\.(?:js|css)\?v=([\w.-]+)/g)) versiones.add(m[1]);
  }
  assert.equal(versiones.size, 1, 'versiones distintas de club-calendario: ' + [...versiones].join(', '));
});
