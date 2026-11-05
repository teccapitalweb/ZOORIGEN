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
  assert.match(html, /Solo&nbsp;hay&nbsp;2&nbsp;cambios&nbsp;en&nbsp;total/, 'sin partirse en el celular');
  assert.match(html, /mueves&nbsp;2&nbsp;cursos/);
  assert.match(html, /Insignia «Calendario a tu medida» · \+40 XP/);
  assert.match(html, /Insignia «Rumbo propio» · \+60 XP/);
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

test('Cursos: línea corta con el siguiente curso y el botón Cambiar; Logros: el bloque completo; Retos: solo el avance', () => {
  const cursos = leer('pages/club-biblioteca.html');
  assert.match(cursos, /<div id="cambioOrden"><\/div>/);
  assert.match(cursos, /club-cambio-orden\.js\?v=20261106-cambioorden2/);
  assert.match(cursos, /ZOO_CAMBIO_ORDEN\.iniciar/);
  assert.match(cursos, /modo: 'linea'/, 'en Cursos solo la línea corta');
  assert.match(cursos, /alVer:/, 'el botón Cambiar abre la página de ese curso');
  assert.match(cursos, /openCourseCard\(\{ type: 'click'[^\n]*cursoId\)/);
  assert.match(cursos, /alCambiar:[\s\S]{0,400}render\(/, 'después del cambio se vuelven a pintar los cursos');
  assert.match(cursos, /ZOO_CALENDARIO\.ofertasCursoHTML\(/, 'la página del curso cerrado trae las ofertas ordenadas');
  assert.match(cursos, /data-zco="elegir"[^\n]*\n[^\n]*abrir\(zo\)|\[data-zco="elegir"\]'\);\s*if \(zo/, 'el botón de la página del curso abre la ventana de elegir');
  const logros = leer('pages/club-logros.html');
  assert.match(logros, /club-cambio-orden\.js/);
  assert.match(logros, /club-calendario\.css/);
  assert.match(logros, /modo: 'completo'/, 'en Logros el bloque entero');
  assert.match(logros, /insertAdjacentHTML\('afterend'/, 'justo después de las metas de trayectoria (premios)');
  assert.match(logros, /alCambiar: \(\) => \{ cargar\(\); \}/, 'al cambiar se refrescan XP e insignias');
  const retos = leer('pages/club-retos.html');
  assert.equal(retos.includes('club-cambio-orden.js'), false, 'en Retos no se elige curso');
  assert.match(leer('assets/js/club-retos.js'), /rzCambioOrden/);
  const versiones = new Set();
  for (const f of fs.readdirSync(path.join(RAIZ, 'pages')).filter(x => x.endsWith('.html'))) {
    for (const m of leer('pages/' + f).matchAll(/club-calendario\.(?:js|css)\?v=([\w.-]+)/g)) versiones.add(m[1]);
  }
  assert.equal(versiones.size, 1, 'versiones distintas de club-calendario: ' + [...versiones].join(', '));
});

/* ───────────── Línea corta y oferta dentro de la página del curso ───────────── */

test('línea corta: nombre del siguiente curso, cuándo se abre y el botón Cambiar (sin botón si ya usó los 2 cambios)', () => {
  const co = CAL.cambioOrden(resp());
  const html = CAL.cambioOrdenLineaHTML(co);
  assert.match(html, /Tu siguiente curso en desbloquearse es <b class="zco-linea__nombre">«Curso 2»<\/b> \(en 5 días\)\.<span class="zco-linea__ayuda"> Puedes cambiarlo\.<\/span>/);
  assert.match(html, /data-zco="ver" data-curso="c2">Cambiar<\/button>/);
  assert.ok(html.length < 900, 'es una sola línea compacta');
  assert.equal((html.match(/<button/g) || []).length, 1);
  const fin = CAL.cambioOrdenLineaHTML(CAL.cambioOrden(resp({ usados: 2 })));
  assert.match(fin, /Tu siguiente curso en desbloquearse es/);
  assert.equal(/Puedes cambiarlo|<button/.test(fin), false, 'sin botón');
  assert.equal(CAL.cambioOrdenLineaHTML(CAL.cambioOrden(resp({ cursosCerrados: [] }))), '', 'sin cursos cerrados no se muestra nada');
  assert.equal(CAL.cambioOrdenLineaHTML(null), '');
  const raro = CAL.cambioOrdenLineaHTML(CAL.cambioOrden(resp({ cursosCerrados: [{ cursoId: 'x', titulo: '<img src=x>', lugar: 1, diasFalta: 1 }] })));
  assert.equal(/<img/.test(raro), false);
  assert.match(raro, /\(mañana\)/);
});

test('oferta en la página del curso: solo en el SIGUIENTE curso por abrirse, con requisitos 35/8 y progreso por tipo', () => {
  const co = CAL.cambioOrden(resp());
  const html = CAL.cambioOrdenOfertaHTML(co, 'c2');
  assert.match(html, /Si completas <b>35 retos nuevos<\/b> \(mínimo 8 de quiz, 8 de detective y 8 de ordena\) podrás elegir cuál curso se desbloquea antes en lugar de este\./);
  assert.match(html, /35 de 35<\/b> retos nuevos/);
  assert.match(html, /Ordena<\/span>/);
  assert.match(html, /7\/8/);
  assert.equal(/data-zco="elegir"/.test(html), false, 'todavía no cumple: sin botón');
  assert.match(html, /el modo historia no cuenta/);
  assert.match(html, /la oferta pasa al siguiente y tus retos se conservan/);
  assert.equal(CAL.cambioOrdenOfertaHTML(co, 'c3'), '', 'en otro curso cerrado no hay oferta');
  assert.equal(CAL.cambioOrdenOfertaHTML(co, 'c1'), '', 'ni en uno abierto');
  assert.equal(CAL.cambioOrdenOfertaHTML(CAL.cambioOrden(resp({ usados: 2 })), 'c2'), '', 'con los 2 cambios usados no hay oferta');
  assert.equal(CAL.cambioOrdenOfertaHTML(null, 'c2'), '');
});

test('oferta: cuando ya cumple aparece el botón de elegir; el 2.º cambio pide 55 y 14 de cada tipo', () => {
  const listo = CAL.cambioOrdenOfertaHTML(CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true })), 'c2');
  assert.match(listo, /data-zco="elegir"/);
  assert.match(listo, /Ya cumpliste los retos del cambio 1/);
  const dos = CAL.cambioOrdenOfertaHTML(CAL.cambioOrden(resp({ usados: 1, contados: { quiz: 20, detective: 10, orden: 10 } })), 'c2');
  assert.match(dos, /Cambio 2 de 2/);
  assert.match(dos, /Ya usaste tu primer cambio\./);
  assert.match(dos, /<b>55 retos nuevos<\/b> \(mínimo 14 de quiz, 14 de detective y 14 de ordena\)/);
  assert.match(dos, /Te faltan 4 de detective, 4 de ordena/);
});

test('convivencia con los 15 retos: si hay dos ofertas se numeran y se explica a quién aplica cada una', () => {
  const co = CAL.cambioOrden(resp());
  const pc = CAL.primerCurso({ aplica: true, estado: 'pendiente', cursoId: 'c2', titulo: 'Curso 2', diasFalta: 5, progreso: { hechos: 9, meta: 15, tipos: {}, libres: { hechos: 0, meta: 3 } } });
  const ambas = CAL.ofertasCursoHTML(pc, co, 'c2');
  assert.match(ambas, /dos opciones/);
  assert.match(ambas, /solo cuentas nuevas con prueba gratuita/);
  assert.match(ambas, /todos los miembros/);
  assert.ok(ambas.indexOf('Opción 1 · Abrir este curso antes') < ambas.indexOf('Ábrelo antes resolviendo 15 retos'), 'primero la de 15 retos');
  assert.ok(ambas.indexOf('Ábrelo antes resolviendo 15 retos') < ambas.indexOf('Opción 2 · Elegir otro curso en su lugar'));
  assert.ok(ambas.indexOf('Opción 2') < ambas.indexOf('Si completas <b>35 retos nuevos'));
  // solo una de las dos: sin explicaciones de más
  const soloCambio = CAL.ofertasCursoHTML(null, co, 'c2');
  assert.equal(/dos opciones|Opción 1/.test(soloCambio), false);
  assert.match(soloCambio, /zco-oferta/);
  const soloAcelera = CAL.ofertasCursoHTML(pc, null, 'c2');
  assert.match(soloAcelera, /Ábrelo antes resolviendo 15 retos/);
  assert.equal(/zco-oferta|dos opciones/.test(soloAcelera), false);
  // la de 15 retos es de OTRO curso (no es este): no se mezcla
  assert.equal(/Ábrelo antes/.test(CAL.ofertasCursoHTML(pc, co, 'c3')), false);
  assert.equal(CAL.ofertasCursoHTML(null, null, 'c2'), '');
});

test('estilos: palabras sin partirse, etiquetas de tipo completas y tarjeta de pasos legible en pantalla angosta', () => {
  const css = leer('assets/css/club-calendario.css');
  assert.match(css, /\.zco-linea/);
  assert.match(css, /\.zco-oferta/);
  assert.match(css, /\.zco \.zcal-tipo__n[^}]*white-space: nowrap/, 'Detective no se parte');
  assert.match(css, /overflow-wrap: normal; word-break: normal/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.zco-paso \{ grid-template-columns: 30px minmax\(0, 1fr\)/);
  assert.equal(/gradient/.test(css), false);
});
