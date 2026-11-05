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

const textoVisible = html => html.replace(/<details[\s\S]*?<\/details>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

test('bloque (Mis logros): título, UNA línea de apoyo, dos tarjetas, una barra, tres mini-barras y un botón; SIN insignias ni XP', () => {
  const html = CAL.cambioOrdenHTML(CAL.cambioOrden(resp()), { modo: 'cursos', hrefRetos: 'club-retos.html' });
  assert.match(html, /<h3 class="zco__t" id="zcoTitulo">Cambia el orden de tu calendario<\/h3>/);
  assert.match(html, /<p class="zco__apoyo">2 cambios en total\. Tú eliges qué curso se abre antes\.<\/p>/);
  assert.equal((html.match(/<li class="zco-tj/g) || []).length, 2, 'dos tarjetas');
  assert.match(html, /Cambio 1<\/b>[\s\S]*35 retos/);
  assert.match(html, /Cambio 2<\/b>[\s\S]*55 retos/);
  assert.equal(/XP|Calendario a tu medida|Rumbo propio|insignia/i.test(html), false, 'ni insignias ni su valor en XP en el bloque');
  assert.match(html, /zco-tj__estado">En curso/);
  assert.match(html, /zco-tj__estado">Pendiente/);
  assert.equal((html.match(/role="progressbar"/g) || []).length, 1, 'una barra de avance total');
  assert.match(html, /<b>35 de 35<\/b> retos nuevos/);
  assert.equal((html.match(/<li class="zcal-tipo/g) || []).length, 3, 'tres mini-barras');
  assert.match(html, /Quiz<\/span>/);
  assert.match(html, /Detective<\/span>/);
  assert.match(html, /Ordena<\/span>/);
  assert.match(html, /7\/8/, 'ordena va 7 de 8');
  assert.equal(/data-zco="elegir"/.test(html), false, 'todavía no alcanza: sin botón de elegir');
  assert.equal((html.match(/<(button|a) /g) || []).length, 1, 'un solo botón');
  assert.match(html, /href="club-retos.html"/);
});

test('bloque: nada de párrafos largos visibles; las reglas van en el desplegable cerrado "Cómo funciona"', () => {
  const html = CAL.cambioOrdenHTML(CAL.cambioOrden(resp({ cambios: [{ n: 1, titulo: 'Curso 4', en: Date.now() }], usados: 1 })), { modo: 'cursos' });
  const visible = textoVisible(html);
  assert.ok(visible.length < 420, 'poco texto visible: ' + visible.length + ' caracteres -> ' + visible);
  for (const regla of ['historia', 'una sola vez', 'fechas', 'ya abiertos', 'mínimo']) assert.equal(visible.toLowerCase().includes(regla), false, 'la regla "' + regla + '" no va a la vista');
  const det = html.match(/<details class="zco-como">([\s\S]*?)<\/details>/)[1];
  assert.equal(/<details[^>]*\sopen/.test(html), false, 'cerrado');
  assert.match(det, /<summary>Cómo funciona<\/summary>/);
  assert.equal((det.match(/<li>/g) || []).length >= 5 && (det.match(/<li>/g) || []).length <= 7, true, '5 reglas cortas (más "Tus cambios")');
  assert.match(det, /El modo historia no cuenta/);
  assert.match(det, /cuenta una sola vez./);
  assert.match(det, /Las fechas no cambian/);
  assert.match(det, /cursos ya abiertos no se tocan/);
  assert.match(det, /mínimo 8 y 14 de cada tipo/);
  assert.match(det, /Tus cambios[\s\S]*Cambio 1: «Curso 4»/);
  for (const li of det.match(/<li>[\s\S]*?<\/li>/g)) assert.ok(li.length < 140, 'regla corta: ' + li);
});

test('bloque: con los retos cumplidos aparece el botón; en Retos lleva a Cursos; con los 2 cambios usados no hay botón ni barra', () => {
  const co = CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true }));
  const h = CAL.cambioOrdenHTML(co, { modo: 'cursos' });
  assert.match(h, /data-zco="elegir">[\s\S]*Elegir curso/);
  assert.match(h, /zco-tj__estado">Listo/);
  assert.match(h, /Listo para elegir/);
  const enRetos = CAL.cambioOrdenHTML(CAL.cambioOrden({ usados: 0, maximo: 2, contados: { quiz: 19, detective: 8, orden: 8 } }), { modo: 'retos', href: 'club-biblioteca.html#cambiar-orden' });
  assert.match(enRetos, /href="club-biblioteca.html#cambiar-orden"/);
  assert.equal(/data-zco="elegir"/.test(enRetos), false);
  const sinCursos = CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: false, cursosCerrados: [cerrados()[0]] }));
  const t = CAL.cambioOrdenHTML(sinCursos, { modo: 'cursos' });
  assert.equal(/data-zco="elegir"/.test(t), false);
  assert.match(t, /No hay otro curso cerrado/);
  const fin = CAL.cambioOrdenHTML(CAL.cambioOrden(resp({ usados: 2, contados: { quiz: 30, detective: 20, orden: 20 }, cambios: [{ n: 2, titulo: '<img src=x onerror=alert(1)>', en: Date.now() }] })), { modo: 'cursos' });
  assert.match(fin, /Usaste tus 2 cambios/);
  assert.equal(/role="progressbar"|data-zco="elegir"/.test(fin), false);
  assert.equal(/<img/.test(fin), false, 'los títulos se escapan');
  assert.match(fin, /zco-tj__estado"><svg[^>]*>[\s\S]*?<\/svg>Hecho/, 'las dos tarjetas quedan en Hecho');
});

test('ventana: cada opción trae carátula, nombre y "Se abre en N días (fecha)"; sin texto largo repetido; en el orden de apertura', () => {
  const co = CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true }));
  const html = CAL.cambioOrdenModalHTML(co, { c3: '../assets/img/cursos/c3.jpg', c4: 'https://ejemplo.test/c4.webp' });
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /Cambio 1 de 2/);
  assert.match(html, /Ahora se abre primero «Curso 2» \(en 5 días\)\./);
  assert.equal((html.match(/name="zcoCurso"/g) || []).length, 2, 'c3 y c4 (c2 ya es el siguiente)');
  assert.ok(html.indexOf('value="c3"') < html.indexOf('value="c4"'), 'orden de apertura');
  assert.match(html, /<span class="zco-op__img" aria-hidden="true"><img src="\.\.\/assets\/img\/cursos\/c3\.jpg" alt="" loading="lazy"/);
  assert.match(html, /<img src="https:\/\/ejemplo\.test\/c4\.webp"/);
  assert.match(html, /Curso &lt;b&gt;3&lt;\/b&gt;/);
  assert.match(html, /<small>Se abre en 13 días \(\d{1,2} de [a-zé]+\)<\/small>/);
  assert.match(html, /<small>Se abre en 21 días/);
  assert.equal(/pasaría a abrirse/.test(html), false, 'sin el texto largo repetido en cada opción');
  assert.match(html, /<p class="zco-modal__sel" id="zcoSel"[^>]*hidden>/, 'la frase de lo que pasaría va una sola vez, en el pie');
  assert.match(html, /Este cambio es definitivo/);
  assert.match(html, /data-zco="confirmar" disabled/);
  // sin imagen: relleno decente; imagen peligrosa: se descarta
  const sin = CAL.cambioOrdenModalHTML(co, { c3: 'javascript:alert(1)' });
  assert.match(sin, /zco-op__img zco-op__img--vacia/);
  assert.equal(/javascript:|<img/.test(sin), false);
  assert.equal((sin.match(/zco-op__img--vacia/g) || []).length, 2, 'las dos opciones con relleno');
});

test('ventana: la frase de lo que pasaría con el curso elegido sale una sola vez y con los días reales', () => {
  const co = CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true }));
  assert.match(CAL.llegaraTexto(co, 'c4'), /^«Curso 4» pasará a abrirse en 5 días \(\d{1,2} de [a-zé]+\)\.$/);
  assert.equal(CAL.llegaraTexto(co, 'zzz'), '');
  assert.equal(CAL.llegaraTexto(null, 'c4'), '');
});

test('sin emojis ni degradados en los textos, estilos y archivos nuevos', () => {
  const co = CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true, cambios: [{ n: 1, titulo: 'X', en: Date.now() }] }));
  const todo = CAL.cambioOrdenHTML(co, { modo: 'cursos' }) + CAL.cambioOrdenModalHTML(co, {}) + CAL.cambioOrdenOfertaHTML(co, 'c2') + CAL.cambioOrdenLineaHTML(co) + leer('assets/js/club-cambio-orden.js') + leer('assets/css/club-calendario.css');
  assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(todo.replace(/[«»·…→]/g, '')), false, 'sin emojis');
  assert.equal(/gradient/.test(leer('assets/css/club-calendario.css')), false, 'solo colores sólidos');
});

test('el módulo del navegador usa los dos endpoints, pide confirmación explícita, carga carátulas y no toca cursos por su cuenta', () => {
  const js = leer('assets/js/club-cambio-orden.js');
  assert.match(js, /\/api\/calendario\/cambio-orden/);
  assert.match(js, /\/api\/calendario\/cambiar-orden/);
  assert.match(js, /confirmar: true/);
  assert.match(js, /method: 'POST'/);
  assert.match(js, /Escape/, 'se cierra con Esc');
  assert.match(js, /o\.imagenes/, 'las carátulas las pone la página');
  assert.match(js, /llegaraTexto/);
});

test('Cursos: línea corta, orden por desbloqueo y carátulas; Logros: el bloque completo; Retos: solo el avance', () => {
  const cursos = leer('pages/club-biblioteca.html');
  assert.match(cursos, /<div id="cambioOrden"><\/div>/);
  assert.match(cursos, /club-cambio-orden\.js\?v=20261107-cambioorden4/);
  assert.match(cursos, /modo: 'linea'/, 'en Cursos solo la línea corta');
  assert.match(cursos, /alVer:/, 'el botón Cambiar abre la página de ese curso');
  assert.match(cursos, /alCambiar:[\s\S]{0,400}render\(/, 'después del cambio se vuelven a pintar los cursos');
  assert.match(cursos, /ZOO_CALENDARIO\.ofertasCursoHTML\(/, 'la página del curso cerrado trae las ofertas ordenadas');
  assert.match(cursos, /imagenes: \(\) =>[^\n]*ZOO_PORTADAS\.paraCurso/, 'la ventana usa las carátulas reales de la biblioteca');
  assert.match(cursos, /lista = ZOO_CALENDARIO\.ordenarPorDesbloqueo\(lista, window\.__zooDesbloqueo\)/, 'las tarjetas siguen el orden real de desbloqueo');
  assert.ok(cursos.indexOf('ordenarPorDesbloqueo(lista') < cursos.indexOf('if (p.elegida) lista'), 'primero el orden de desbloqueo y luego el curso de prueba al frente');
  const logros = leer('pages/club-logros.html');
  assert.match(logros, /club-cambio-orden\.js/);
  assert.match(logros, /club-calendario\.css/);
  assert.match(logros, /club-portadas\.js/);
  assert.match(logros, /modo: 'completo'/, 'en Logros el bloque entero');
  assert.match(logros, /insertAdjacentHTML\('afterend'/, 'justo después de las metas de trayectoria (premios)');
  assert.match(logros, /ZOO_PORTADAS\.resolver\(c, '\.\.\/'\)/, 'carátulas reales también en Logros');
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

/* ───────────── Orden de las tarjetas de Cursos y días que coinciden ───────────── */

const cursoDe = (id, desbloqueoEn, extra = {}) => ({ id, desbloqueoEn, ...extra });
const desbloqueoDe = mapa => c => mapa[c.id];
const ids = l => l.map(c => c.id);

test('orden de tarjetas: tras un cambio los cerrados salen por días restantes de menor a mayor (el caso de Elena: 10, 18, 26, 2, 34, 42)', () => {
  const t = Date.now();
  const mapa = {
    a: { desbloqueado: true }, b: { desbloqueado: true },
    c10: { desbloqueado: false, desbloqueoEn: t + 10 * DIA }, c18: { desbloqueado: false, desbloqueoEn: t + 18 * DIA }, c26: { desbloqueado: false, desbloqueoEn: t + 26 * DIA },
    c2: { desbloqueado: false, desbloqueoEn: t + 2 * DIA }, c34: { desbloqueado: false, desbloqueoEn: t + 34 * DIA }, c42: { desbloqueado: false, desbloqueoEn: t + 42 * DIA }
  };
  const catalogo = ['a', 'b', 'c10', 'c18', 'c26', 'c2', 'c34', 'c42'].map(id => cursoDe(id));
  assert.deepEqual(ids(CAL.ordenarPorDesbloqueo(catalogo, desbloqueoDe(mapa))), ['a', 'b', 'c2', 'c10', 'c18', 'c26', 'c34', 'c42']);
  // con el filtro por categoría (una parte de la lista) también
  const filtrada = ['b', 'c26', 'c2', 'c42'].map(id => cursoDe(id));
  assert.deepEqual(ids(CAL.ordenarPorDesbloqueo(filtrada, desbloqueoDe(mapa))), ['b', 'c2', 'c26', 'c42']);
});

test('orden de tarjetas: sin cambios todo queda exactamente igual; los abiertos conservan su lugar (también los abiertos por premio entre cerrados)', () => {
  const t = Date.now();
  const mapa = {
    a: { desbloqueado: true }, b: { desbloqueado: true }, c: { desbloqueado: false, desbloqueoEn: t + 3 * DIA },
    d: { desbloqueado: true, porPremio: true }, e: { desbloqueado: false, desbloqueoEn: t + 11 * DIA }, f: { desbloqueado: false, desbloqueoEn: t + 19 * DIA }
  };
  const catalogo = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => cursoDe(id));
  assert.deepEqual(ids(CAL.ordenarPorDesbloqueo(catalogo, desbloqueoDe(mapa))), ['a', 'b', 'c', 'd', 'e', 'f'], 'ya estaban en orden: no se mueve nada');
  const dos = catalogo.slice().reverse();
  const alReves = ids(CAL.ordenarPorDesbloqueo(dos, desbloqueoDe(mapa)));
  assert.deepEqual(alReves.filter(x => ['c', 'e', 'f'].includes(x)), ['c', 'e', 'f'], 'los cerrados salen por fecha');
  assert.deepEqual(alReves.map((x, i) => (['a', 'b', 'd'].includes(x) ? x === dos[i].id : true)).every(Boolean), true, 'los abiertos no cambian de posición');
  assert.deepEqual(ids(CAL.ordenarPorDesbloqueo([], desbloqueoDe(mapa))), []);
  assert.deepEqual(ids(CAL.ordenarPorDesbloqueo(null, desbloqueoDe(mapa))), []);
});

test('orden de tarjetas: sin fecha (regla local) usa los días; los que no tienen fecha van después y estable; empates conservan el orden', () => {
  const mapa = { a: { desbloqueado: false, diasFalta: 20 }, b: { desbloqueado: false, diasFalta: 4 }, c: { desbloqueado: false }, d: { desbloqueado: false, diasFalta: 4 }, e: { desbloqueado: false } };
  assert.deepEqual(ids(CAL.ordenarPorDesbloqueo(['a', 'b', 'c', 'd', 'e'].map(id => cursoDe(id)), desbloqueoDe(mapa))), ['b', 'd', 'a', 'c', 'e']);
  assert.deepEqual(ids(CAL.ordenarPorDesbloqueo(['a', 'b'].map(id => cursoDe(id)), () => null)), ['a', 'b'], 'sin dato no cambia nada');
});

test('los días coinciden: línea, ventana y tarjetas calculan los días desde la MISMA fecha de apertura', () => {
  const f = Date.now() + 10 * DIA - 3600000;   // faltan 9 días y 23 horas -> 10 días
  assert.equal(CAL.diasDe({ desbloqueoEn: f, diasFalta: 99 }), 10, 'manda la fecha, no un conteo viejo');
  assert.equal(CAL.diasDe({ desbloqueoEn: null, diasFalta: 7 }), 7);
  assert.equal(CAL.diasDe({ desbloqueoEn: Date.now() - 1000 }), 0);
  const co = CAL.cambioOrden(resp({ cursosCerrados: [{ cursoId: 'x', titulo: 'X', lugar: 1, desbloqueoEn: new Date(f).toISOString(), diasFalta: 99 }, { cursoId: 'y', titulo: 'Y', lugar: 2, desbloqueoEn: new Date(f + 8 * DIA).toISOString(), diasFalta: 99 }], contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true }));
  assert.match(CAL.cambioOrdenLineaHTML(co), /\(en 10 días\)/);
  assert.match(CAL.cambioOrdenModalHTML(co, {}), /Ahora se abre primero «X» \(en 10 días\)/);
  assert.match(CAL.cambioOrdenModalHTML(co, {}), /Se abre en 18 días/);
  // el desbloqueo que usan las tarjetas (ZOO_CALENDARIO.desbloqueo) da los mismos días para la misma fecha
  const cal = { orden: ['x'], cursos: { x: { cursoId: 'x', titulo: 'X', abierto: false, desbloqueoEn: f, porPremio: false, porRetos: false, esPrueba: false } } };
  assert.equal(CAL.desbloqueo(cal, 'x').diasFalta, 10);
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
  const raro = CAL.cambioOrdenLineaHTML(CAL.cambioOrden(resp({ cursosCerrados: [{ cursoId: 'x', titulo: '<img src=x>', lugar: 1, desbloqueoEn: new Date(Date.now() + 3600000).toISOString() }] })));
  assert.equal(/<img/.test(raro), false);
  assert.match(raro, /\(mañana\)/);
});

test('oferta en la página del curso: solo en el SIGUIENTE curso por abrirse y lo mínimo visible (qué necesita, progreso y botón)', () => {
  const co = CAL.cambioOrden(resp());
  const html = CAL.cambioOrdenOfertaHTML(co, 'c2');
  assert.match(html, /<h4 class="zco-oferta__t">Elige otro curso en lugar de este<\/h4>/);
  assert.match(html, /Cambio 1 de 2 · 35 retos nuevos \(mínimo 8 de cada tipo\)/);
  assert.match(html, /<b>35 de 35<\/b> retos nuevos/);
  assert.equal((html.match(/<li class="zcal-tipo/g) || []).length, 3);
  assert.match(html, /7\/8/);
  assert.equal(/data-zco="elegir"/.test(html), false, 'todavía no cumple: sin botón');
  assert.match(html, /<summary>Cómo funciona<\/summary>/);
  const visible = textoVisible(html);
  assert.ok(visible.length < 330, 'poco texto visible: ' + visible.length + ' -> ' + visible);
  assert.equal(/historia|una sola vez|fechas|abre solo/i.test(visible), false, 'las reglas largas no se ven');
  assert.equal(CAL.cambioOrdenOfertaHTML(co, 'c3'), '', 'en otro curso cerrado no hay oferta');
  assert.equal(CAL.cambioOrdenOfertaHTML(co, 'c1'), '', 'ni en uno abierto');
  assert.equal(CAL.cambioOrdenOfertaHTML(CAL.cambioOrden(resp({ usados: 2 })), 'c2'), '', 'con los 2 cambios usados no hay oferta');
  assert.equal(CAL.cambioOrdenOfertaHTML(null, 'c2'), '');
});

test('oferta: cuando ya cumple aparece el botón de elegir; el 2.º cambio pide 55 y 14 de cada tipo', () => {
  const listo = CAL.cambioOrdenOfertaHTML(CAL.cambioOrden(resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true })), 'c2');
  assert.match(listo, /data-zco="elegir">[\s\S]*Elegir curso/);
  assert.match(listo, /Listo para elegir/);
  const dos = CAL.cambioOrdenOfertaHTML(CAL.cambioOrden(resp({ usados: 1, contados: { quiz: 20, detective: 10, orden: 10 } })), 'c2');
  assert.match(dos, /Cambio 2 de 2 · 55 retos nuevos \(mínimo 14 de cada tipo\)/);
  assert.match(dos, /<b>40 de 55<\/b> retos nuevos/);
  assert.match(dos, /10\/14/);
});

test('convivencia con los 15 retos: si hay dos ofertas se numeran y se explica a quién aplica cada una (en una frase)', () => {
  const co = CAL.cambioOrden(resp());
  const pc = CAL.primerCurso({ aplica: true, estado: 'pendiente', cursoId: 'c2', titulo: 'Curso 2', diasFalta: 5, progreso: { hechos: 9, meta: 15, tipos: {}, libres: { hechos: 0, meta: 3 } } });
  const ambas = CAL.ofertasCursoHTML(pc, co, 'c2');
  assert.match(ambas, /Dos opciones con los retos, independientes/);
  assert.match(ambas, /solo cuentas nuevas con prueba gratuita/);
  assert.match(ambas, /todos los miembros/);
  assert.ok(ambas.indexOf('Opción 1 · Abrir este curso antes') < ambas.indexOf('Ábrelo antes resolviendo 15 retos'), 'primero la de 15 retos');
  assert.ok(ambas.indexOf('Ábrelo antes resolviendo 15 retos') < ambas.indexOf('Opción 2 · Elegir otro curso en su lugar'));
  assert.ok(ambas.indexOf('Opción 2') < ambas.indexOf('zco-oferta__t'));
  const soloCambio = CAL.ofertasCursoHTML(null, co, 'c2');
  assert.equal(/Dos opciones|Opción 1/.test(soloCambio), false);
  assert.match(soloCambio, /zco-oferta/);
  const soloAcelera = CAL.ofertasCursoHTML(pc, null, 'c2');
  assert.match(soloAcelera, /Ábrelo antes resolviendo 15 retos/);
  assert.equal(/zco-oferta|Dos opciones/.test(soloAcelera), false);
  assert.equal(/Ábrelo antes/.test(CAL.ofertasCursoHTML(pc, co, 'c3')), false);
  assert.equal(CAL.ofertasCursoHTML(null, null, 'c2'), '');
});

test('estilos: desplegable, tarjetas lado a lado, carátulas, palabras sin partirse y pantalla angosta', () => {
  const css = leer('assets/css/club-calendario.css');
  for (const c of ['.zco-linea', '.zco-oferta', '.zco-tj', '.zco__tarjetas', '.zco-como', '.zco-op__img']) assert.ok(css.includes(c), c);
  assert.match(css, /\.zco__tarjetas \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, 'dos tarjetas lado a lado');
  assert.match(css, /\.zco \.zcal-tipo__n[^}]*white-space: nowrap/, 'Detective no se parte');
  assert.match(css, /overflow-wrap: normal; word-break: normal/);
  assert.match(css, /\.zco-op__img \{[^}]*object-fit|\.zco-op__img img \{[^}]*object-fit: cover/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.zco-op__img \{ width: 72px/);
  assert.equal(/gradient/.test(css), false);
});

/* ───────────── Las insignias viven en la lista de logros, sin XP visible ───────────── */

test('ni el bloque, ni la oferta del curso, ni "Cómo funciona", ni la línea muestran XP o insignias', () => {
  const casos = [
    resp(), resp({ contados: { quiz: 19, detective: 8, orden: 8 }, disponible: true }),
    resp({ usados: 1, contados: { quiz: 20, detective: 10, orden: 10 }, cambios: [{ n: 1, titulo: 'Curso 4', en: Date.now() }] }), resp({ usados: 2 })
  ];
  for (const r of casos) {
    const co = CAL.cambioOrden(r);
    const todo = CAL.cambioOrdenHTML(co, { modo: 'cursos' }) + CAL.cambioOrdenHTML(co, { modo: 'retos', href: 'x' }) + CAL.cambioOrdenOfertaHTML(co, 'c2') + CAL.cambioOrdenLineaHTML(co) +
      CAL.cambioOrdenModalHTML(co, {}) + CAL.comoFuncionaHTML(co);
    assert.equal(/\bXP\b|Calendario a tu medida|Rumbo propio|insignia/i.test(todo), false, 'sin XP ni insignias: ' + (todo.match(/.{0,30}(XP|insignia|Rumbo propio|Calendario a tu medida).{0,30}/i) || [''])[0]);
  }
  const js = leer('assets/js/club-calendario.js');
  assert.equal(/NOMBRES_INSIGNIA|co\.xp\[/.test(js), false);
});

const LG = require('../assets/js/club-logros-ui.js');
const logro = (id, extra = {}) => ({ id, nombre: 'Nombre ' + id, descripcion: 'Descripción corta', categoria: 'Retos', xp: 40, ganado: false, ...extra });

test('Mis logros: r11 y r12 salen como un logro más (categoría Retos, icono propio, nombre y descripción), bloqueados hasta ganarlos y SIN valor en XP', () => {
  const d = { membresia: true, logros: [logro('r10', { xp: 70 }), logro('r11', { nombre: 'Calendario a tu medida', descripcion: 'Cambiaste el orden de tu calendario por primera vez', xp: 40 }), logro('r12', { nombre: 'Rumbo propio', descripcion: 'Usaste tu segundo y último cambio de orden', xp: 60 })] };
  const html = LG.categoriasHTML(d);
  assert.match(html, /<h3>Retos<\/h3>/);
  assert.match(html, /<span class="lg-cat__cuenta">0\/3<\/span>/);
  const bloque = id => html.match(new RegExp('<article class="lg-ins[^>]*data-logro="' + id + '"[\\s\\S]*?<\\/article>'))[0];
  const r11 = bloque('r11'), r12 = bloque('r12'), r10 = bloque('r10');
  assert.match(r11, /is-bloqueada/);
  assert.match(r11, /Calendario a tu medida/);
  assert.match(r11, /Cambiaste el orden de tu calendario por primera vez/);
  assert.equal(/XP/.test(r11 + r12), false, 'sin XP visible');
  assert.match(r10, /\+70 XP/, 'las demás insignias siguen mostrando su XP');
  const ganadas = LG.categoriasHTML({ membresia: true, logros: [logro('r11', { ganado: true, nombre: 'Calendario a tu medida' }), logro('r12', { ganado: true, nombre: 'Rumbo propio' })] });
  assert.match(ganadas, /is-ganada[\s\S]*?Ganada<\/span>/);
  assert.equal(/XP/.test(ganadas), false, 'ganadas tampoco muestran XP');
  assert.match(ganadas, /<span class="lg-cat__cuenta">2\/2<\/span>/, 'cuentan en el N/total de la categoría');
});

test('Mis logros: el icono propio es Lucide y existe en la biblioteca de iconos; sin membresía no se muestra nada de XP ni descripción', () => {
  const I = require('../assets/js/admin-iconos.js');
  for (const n of ['calendar-clock', 'map-pin']) assert.ok(I.existe(n), n);
  const ganada = LG.insigniaHTML(logro('r11', { ganado: true }), true, '#E8A317', 'target');
  assert.match(ganada, /<svg/);
  const vista = LG.insigniaHTML(logro('r11'), false, '#E8A317', 'target');
  assert.equal(/XP|Descripción corta/.test(vista), false);
});
