'use strict';
// Noticias del sector: partes puras de club-noticias-ui.js (seguridad al mostrar texto externo, plantillas, fechas)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const N = require('../assets/js/club-noticias-ui.js');
const RAIZ = path.join(__dirname, '..');

test('urlSegura: solo https; todo lo demás se descarta', () => {
  assert.equal(N.urlSegura('https://es.mongabay.com/nota-1/'), 'https://es.mongabay.com/nota-1/');
  for (const mala of ['http://sitio.com', 'javascript:alert(1)', 'data:text/html,<b>x</b>', '//sitio.com', 'ftp://x.com', '', null, undefined,
    'https://x.com/a b', 'https://x.com/"onload="x', "https://x.com/'", 'https://', 'https://x.com/<script>'])
    assert.equal(N.urlSegura(mala), '', String(mala));
});

test('limpiar quita etiquetas y caracteres de control, y recorta sin partir palabras', () => {
  assert.equal(N.limpiar('<b>Hola</b>\n  <script>x</script> mundo'), 'Hola x mundo');
  const r = N.limpiar('palabra '.repeat(80), 100);
  assert.ok(r.length <= 101 && r.endsWith('…'));
  assert.ok(!/palabr…$/.test(r), 'no parte una palabra');
  assert.equal(N.limpiar(null), '');
});

test('el HTML de una hoja escapa todo el texto que viene de afuera', () => {
  const sucia = { id: 'a"><img src=x onerror=alert(1)>', titulo: '<img src=x onerror=alert(1)>Título', extracto: '"><script>alert(2)</script> texto', fuente: '<b>Medio</b>',
    link: 'javascript:alert(3)', imagen: 'http://malo.com/x.jpg', categoria: 'fauna', fecha: '2026-10-09T12:00:00Z' };
  for (const html of [N.hojaHTML(sucia, 0), N.lecturaHTML(sucia, 0)]) {
    assert.ok(!/<img src=x/i.test(html), 'no debe colarse una etiqueta ajena');
    assert.ok(!/<script/i.test(html), 'no debe colarse un script');
    assert.ok(!/href="javascript:/i.test(html), 'sin enlaces javascript:');
    assert.ok(!/src="http:\/\/malo/i.test(html), 'imagen http se descarta');
  }
  const lectura = N.lecturaHTML({ titulo: 'T', fuente: 'M', link: 'https://x.com/n', categoria: 'fauna' }, 0);
  assert.match(lectura, /href="https:\/\/x\.com\/n" target="_blank" rel="noopener noreferrer"/);
  assert.match(N.lecturaHTML({ titulo: 'T', fuente: 'M', link: 'http://x.com' }, 0), /Fuente: M/);
});

test('plantillas: la que elige el administrador, o se reparten verde, naranja y bicolor', () => {
  assert.equal(N.plantillaDe({ plantilla: 'bicolor' }, 0), 'bicolor');
  assert.equal(N.plantillaDe({ plantilla: 'rosa' }, 1), 'naranja');
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => N.plantillaDe({}, i)), ['verde', 'naranja', 'bicolor', 'verde', 'naranja', 'bicolor']);
});

test('fechas en español y tiempo relativo', () => {
  assert.equal(N.fechaLarga('2026-10-09T18:00:00'), 'viernes, 9 de octubre de 2026');
  assert.equal(N.fechaLarga('basura'), '');
  const ahora = new Date('2026-10-09T12:00:00');
  assert.equal(N.tiempoRelativo(new Date('2026-10-09T11:59:40'), ahora), 'hace un momento');
  assert.equal(N.tiempoRelativo(new Date('2026-10-09T11:30:00'), ahora), 'hace 30 min');
  assert.equal(N.tiempoRelativo(new Date('2026-10-09T09:00:00'), ahora), 'hace 3 h');
  assert.equal(N.tiempoRelativo(new Date('2026-10-08T09:00:00'), ahora), 'ayer');
  assert.equal(N.tiempoRelativo(new Date('2026-10-05T09:00:00'), ahora), 'hace 4 días');
  assert.equal(N.tiempoRelativo(new Date('2026-09-01T09:00:00'), ahora), '1 sep 2026');
});

test('categorías, filtro y chips; el respaldo de imagen es una foto propia del sitio', () => {
  const lista = [{ categoria: 'fauna' }, { categoria: 'normativa' }, { categoria: 'fauna' }];
  assert.equal(N.filtrar(lista, 'fauna').length, 2);
  assert.equal(N.filtrar(lista, 'todas').length, 3);
  assert.deepEqual(N.filtrar(null, 'fauna'), []);
  const chips = N.chipsHTML(lista, 'fauna');
  assert.match(chips, /data-cat="todas"/);
  assert.match(chips, /data-cat="fauna"/);
  assert.match(chips, /data-cat="normativa"/);
  assert.ok(!/data-cat="apicultura"/.test(chips), 'solo categorías que existen');
  for (const c of Object.keys(N.CATEGORIAS)) {
    const u = N.imagenRespaldo(c);
    assert.match(u, /^\.\.\/assets\/img\/noticias\/respaldo-[a-z]+\.jpg$/, c);
    assert.ok(fs.existsSync(path.join(RAIZ, u.replace('../', ''))), `existe la foto de ${c}`);
  }
  assert.equal(N.categoriaDe({ categoria: 'inventada' }).id, 'ciencia');
});

/* ───── imagen de la nota como portada ───── */
const hoja = (n, i = 0) => N.hojaHTML(n, i, { ahora: new Date('2026-10-09T12:00:00') });
const NOTA = { id: 'n_1', titulo: 'Jaguares regresan a la selva Maya', extracto: 'Un extracto corto de la nota.', link: 'https://es.mongabay.com/jaguar',
  fuente: 'Mongabay Latam', categoria: 'conservacion', fecha: '2026-10-09T08:00:00Z', origen: 'auto' };

test('la portada es la imagen de la nota: 16:9 por CSS, carga perezosa, alt vacío y sin enviar referencia', () => {
  const h = hoja({ ...NOTA, imagen: 'https://cdn.mongabay.com/fotos/jaguar.jpg' });
  assert.match(h, /<img class="hoja__img" src="https:\/\/cdn\.mongabay\.com\/fotos\/jaguar\.jpg"/);
  assert.match(h, /alt=""/);
  assert.match(h, /loading="lazy"/);
  assert.match(h, /referrerpolicy="no-referrer"/);
  assert.match(h, /data-real="1"/);
  assert.ok(!/hoja--respaldo/.test(h), 'con imagen real no es una tarjeta de respaldo');
  assert.ok(!/Zoorigen Actualidad/.test(h), 'sin el encabezado de color de relleno');
  assert.ok(!/noticias de ejemplo/i.test(h));
  assert.match(h, /class="hoja__etq">Conservación</, 'etiqueta de la categoría');
});

test('sin imagen (o con una que no es https) se usa la foto del sitio de su categoría, con la fuente encima', () => {
  for (const imagen of ['', undefined, null, 'http://inseguro.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA']) {
    const h = hoja({ ...NOTA, categoria: 'apicultura', imagen });
    assert.match(h, /src="\.\.\/assets\/img\/noticias\/respaldo-apicultura\.jpg"/, String(imagen));
    assert.match(h, /class="hoja hoja--verde hoja--respaldo"/);
    assert.match(h, /class="hoja__fuente">Mongabay Latam</);
    assert.ok(!/data-real/.test(h));
  }
  // cada categoría tiene su foto y lo desconocido cae en la general
  const fotos = Object.keys(N.CATEGORIAS).map(c => N.imagenRespaldo(c));
  assert.equal(new Set(fotos).size, fotos.length, 'una foto distinta por categoría');
  assert.equal(N.imagenRespaldo('inventada'), N.imagenRespaldo('fauna'));
  assert.equal(N.imagenRespaldo('fauna', { base: '/assets/img/noticias/' }), '/assets/img/noticias/respaldo-fauna.jpg');
});

test('las notas del equipo (origen admin) sin imagen también usan la foto de respaldo', () => {
  const h = hoja({ id: 'adm_1', titulo: 'Cómo preparar un informe anual', resumen: ['Uno', 'Dos'], categoria: 'normativa', fuente: 'Zoorigen', origen: 'admin', plantilla: 'naranja' });
  assert.match(h, /respaldo-normativa\.jpg/);
  assert.match(h, /hoja--naranja hoja--respaldo/);
  const lectura = N.lecturaHTML({ titulo: 'T', categoria: 'veterinaria', origen: 'admin' }, 0);
  assert.match(lectura, /respaldo-veterinaria\.jpg/);
  assert.match(lectura, /hoja--respaldo/);
});

test('el respaldo viaja en la propia imagen para cambiarla si la de la nota falla, y todo se escapa', () => {
  const h = hoja({ ...NOTA, imagen: 'https://cdn.mongabay.com/x.jpg', categoria: 'ciencia' });
  assert.match(h, /data-respaldo="\.\.\/assets\/img\/noticias\/respaldo-ciencia\.jpg"/);
  const sucia = N.hojaHTML({ ...NOTA, imagen: 'https://x.com/a.jpg', fuente: '"><script>alert(1)</script>' }, 0, { base: '"><img src=x onerror=1>' });
  assert.ok(!/<script/i.test(sucia) && !/<img src=x/i.test(sucia));
});

test('la tarjeta lleva el enlace original solo en la lectura ampliada: pestaña nueva y noopener', () => {
  const lectura = N.lecturaHTML({ ...NOTA, imagen: 'https://cdn.mongabay.com/x.jpg' }, 0);
  assert.match(lectura, /<a class="lectura__leer" href="https:\/\/es\.mongabay\.com\/jaguar" target="_blank" rel="noopener noreferrer">/);
  assert.match(lectura, /src="https:\/\/cdn\.mongabay\.com\/x\.jpg"/);
  assert.ok(!/<a [^>]*href=/.test(hoja({ ...NOTA, imagen: 'https://cdn.mongabay.com/x.jpg' })), 'la tarjeta no es un enlace: abre la lectura');
});

test('la hoja de estilos de noticias no usa degradados ni encabezados de color (solo el hero del inicio, que no es de noticias)', () => {
  const css = fs.readFileSync(path.join(RAIZ, 'assets', 'css', 'club-noticias.css'), 'utf8');
  const parteNoticias = css.slice(0, css.indexOf('INICIO · tarjeta principal del curso'));
  assert.ok(parteNoticias.length > 1000);
  assert.ok(!/gradient\(/i.test(parteNoticias), 'sin degradados en las tarjetas de noticias');
  assert.match(parteNoticias, /\.hoja__etq\s*\{[^}]*background:\s*#1f5f3a/i, 'etiqueta en verde sólido');
  assert.match(parteNoticias, /\.hoja__foto\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/, 'relación 16:9 fija');
  assert.match(parteNoticias, /\.hoja__img\s*\{[^}]*object-fit:\s*cover/);
});

test('normalizar tolera datos incompletos', () => {
  const n = N.normalizar({}, 0);
  assert.equal(n.titulo, 'Noticia');
  assert.equal(n.fuente, 'Zoorigen');
  assert.equal(n.link, '');
  assert.deepEqual(n.resumen, []);
  const m = N.normalizar({ titulo: 'x', resumen: 'uno\n\ndos\n' + 'tres\n'.repeat(20) }, 0);
  assert.ok(m.resumen.length <= 8 && m.resumen[0] === 'uno');
});

/* ───── Primera plana de periódico ───── */
const NOTAS = [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ id: 'n' + i, titulo: 'Nota ' + i, extracto: 'Extracto de la nota ' + i, fuente: 'Zoorigen', categoria: i % 2 ? 'fauna' : 'conservacion',
  fecha: '2026-10-13T08:00:00Z', link: 'https://es.mongabay.com/n' + i, imagen: i === 3 ? 'https://cdn.mongabay.com/fotos/n3.jpg' : '' }));
const AHORA = new Date('2026-10-13T12:00:00');

test('composición: la principal es la primera con imagen propia; luego 4 secundarias y las demás como "más notas"', () => {
  const c = N.componerPortada(NOTAS);
  assert.equal(c.principal.indice, 2, 'la única con imagen sube a principal');
  assert.deepEqual(c.secundarias.map(x => x.indice), [0, 1, 3, 4]);
  assert.deepEqual(c.breves.map(x => x.indice), [5, 6, 7]);
  const sinImagen = N.componerPortada(NOTAS.map(n => ({ ...n, imagen: '' })));
  assert.equal(sinImagen.principal.indice, 0, 'sin imágenes, la primera');
  assert.equal(N.componerPortada(NOTAS.slice(0, 1)).secundarias.length, 0);
  assert.equal(N.componerPortada([]).principal, null);
  assert.equal(N.componerPortada(null).principal, null);
  assert.equal(N.componerPortada(NOTAS, { secundarias: 3, breves: 1 }).secundarias.length, 3);
  assert.equal(N.componerPortada(NOTAS, { secundarias: 3, breves: 1 }).breves.length, 1);
  const todos = [c.principal, ...c.secundarias, ...c.breves].map(x => x.indice).sort();
  assert.deepEqual(todos, [0, 1, 2, 3, 4, 5, 6, 7], 'ninguna nota se repite ni se pierde');
  assert.equal(N.componerPortada(['x', null, NOTAS[0]]).principal.indice, 2, 'lo que no es nota se ignora');
});

test('edición y fecha: día del año y fecha larga en español', () => {
  assert.equal(N.numeroEdicion(new Date('2026-10-13T12:00:00')), 286);
  assert.equal(N.numeroEdicion(new Date('2026-01-01T00:30:00')), 1);
  assert.equal(N.numeroEdicion(new Date('2026-12-31T23:00:00')), 365);
  assert.equal(N.fechaPeriodico(AHORA), 'Martes, 13 de octubre de 2026');
});

test('la primera plana trae cabecera de periódico, principal, columnas y "Más notas"', () => {
  const h = N.periodicoHTML(NOTAS, { ahora: AHORA });
  assert.match(h, /class="np-cab__titulo">Zoorigen Actualidad</);
  assert.match(h, /Edición N\.º 286/);
  assert.match(h, /np-cab__fecha">Martes, 13 de octubre de 2026</);
  assert.match(h, /Fauna silvestre, ciencia y conservación al día/);
  assert.match(h, /class="np-hoy">Hoy</);
  assert.equal((h.match(/class="np-nota np-principal/g) || []).length, 1);
  assert.equal((h.match(/class="np-nota np-sec/g) || []).length, 4);
  assert.equal((h.match(/class="np-nota np-breve"/g) || []).length, 3);
  assert.match(h, /np-columnas--4/);
  assert.match(h, /Más notas/);
  assert.match(h, /Leer nota completa/);
  assert.match(h, /src="https:\/\/cdn\.mongabay\.com\/fotos\/n3\.jpg"/, 'la foto real de la nota es la principal');
  assert.match(h, /data-i="2"/, 'el índice abre la nota correcta en la lectura ampliada');
  assert.match(h, /hace \d+ h/);
  assert.doesNotMatch(h, /gradient/i);
  assert.doesNotMatch(h, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test('la primera plana escapa lo externo y conserva respaldo por categoría', () => {
  const sucia = [{ id: 'a"><img src=x>', titulo: '<img src=x onerror=1>Título', extracto: '<script>x</script> texto', fuente: '"><b>M</b>', link: 'javascript:alert(1)', imagen: 'http://malo.com/x.jpg', categoria: 'fauna' }];
  const h = N.periodicoHTML(sucia, { ahora: AHORA });
  assert.doesNotMatch(h, /<img src=x|<script|<b>M|href="javascript:/i);
  assert.match(h, /respaldo-fauna\.jpg/);
  assert.match(h, /hoja--respaldo/);
  const vacia = N.periodicoHTML([], { ahora: AHORA, tituloVacio: 'Sin conexión' });
  assert.match(vacia, /Zoorigen Actualidad/);
  assert.match(vacia, /Sin conexión/);
});

test('la hoja de estilos de la primera plana: papel crema de día, superficie neutra de noche, sin degradados', () => {
  const css = fs.readFileSync(path.join(RAIZ, 'assets/css/club-noticias.css'), 'utf8');
  assert.match(css, /--np-papel:\s*#FAF7F0/i);
  assert.match(css, /--np-papel:\s*#171B20/i);
  assert.match(css, /--np-borde:\s*#2A3038/i);
  assert.match(css, /Playfair Display/);
  assert.match(css, /font-weight:\s*900/);
  assert.match(css, /4px double/);
  assert.match(css, /hyphens:\s*auto/);
  assert.match(css, /text-align:\s*justify/);
  assert.match(css, /::first-letter/);
  assert.match(css, /font-variant:\s*small-caps/);
  assert.match(css, /@container \(min-width: 800px\)/);
  assert.doesNotMatch(css.slice(css.indexOf('PRIMERA PLANA')), /gradient\(/);
});
