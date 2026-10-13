'use strict';
// Noticias del sector: partes puras de club-noticias-ui.js (seguridad al mostrar texto externo, cabeceras, fechas, rejilla estilo Alintec)
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

test('cabeceras: la que elige el administrador; si no, una estable derivada del id (no cambia al recargar ni al reordenar)', () => {
  assert.deepEqual(N.PLANTILLAS, ['verde', 'naranja', 'bicolor']);
  assert.equal(N.plantillaDe({ plantilla: 'bicolor', id: 'x' }, 0), 'bicolor');
  const ids = ['n_demo_serpientes', 'n_demo_colmenas', 'abc123', 'adm_7', 'Zq9', 'n_2026_10_13_aves'];
  for (const id of ids) {
    const p = N.plantillaDe({ id }, 0);
    assert.ok(N.PLANTILLAS.includes(p), id);
    assert.equal(N.plantillaDe({ id }, 5), p, 'no depende de la posición');
    assert.equal(N.plantillaDe({ id, plantilla: 'rosa' }, 9), p, 'una plantilla inválida cae al hash del id');
  }
  assert.equal(N.hashTexto('n_demo_serpientes'), N.hashTexto('n_demo_serpientes'));
  assert.notEqual(N.hashTexto('a'), N.hashTexto('b'));
  const reparto = new Set(Array.from({ length: 30 }, (_, i) => N.plantillaDe({ id: 'nota-' + i }, 0)));
  assert.equal(reparto.size, 3, 'con varias notas aparecen las tres cabeceras');
  // sin id se reparten por posición
  assert.deepEqual([0, 1, 2, 3].map(i => N.plantillaDe({}, i)), ['verde', 'naranja', 'bicolor', 'verde']);
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

test('línea superior y fuente: fecha corta en español, "Ahora", "hace N h", "Ayer"', () => {
  assert.equal(N.fechaCorta('2026-10-13T12:00:00'), '13 de octubre de 2026');
  assert.equal(N.fechaCorta(new Date('2026-01-05T12:00:00')), '5 de enero de 2026');
  assert.equal(N.fechaCorta('basura'), '');
  const ahora = new Date('2026-10-13T12:00:00');
  assert.equal(N.tiempoCorto(new Date('2026-10-13T11:40:00'), ahora), 'Ahora');
  assert.equal(N.tiempoCorto(new Date('2026-10-13T09:00:00'), ahora), 'hace 3 h');
  assert.equal(N.tiempoCorto(new Date('2026-10-12T09:00:00'), ahora), 'Ayer');
  assert.equal(N.tiempoCorto(new Date('2026-10-09T09:00:00'), ahora), 'hace 4 días');
  assert.equal(N.tiempoCorto(new Date('2026-09-20T09:00:00'), ahora), '20 sep');
  assert.equal(N.tiempoCorto(null, ahora), '');
});

test('número de orden con dos cifras: 01, 02, ... 10', () => {
  assert.deepEqual([0, 1, 8, 9, 10, 98].map(N.numeroOrden), ['01', '02', '09', '10', '11', '99']);
  assert.equal(N.numeroOrden(undefined), '01');
  assert.equal(N.numeroOrden(-3), '01');
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
  assert.ok(!/noticias de ejemplo/i.test(h));
  assert.match(h, /class="hj-lema">Conservación — <em>Mongabay Latam<\/em>/, 'categoría — fuente bajo el nombre del periódico');
  assert.ok(!/hoja__etq/.test(h), 'la categoría ya no va encima de la foto');
});

test('la foto va siempre debajo de la cabecera de color', () => {
  const h = hoja({ ...NOTA, imagen: 'https://cdn.mongabay.com/fotos/jaguar.jpg' });
  assert.ok(h.indexOf('hj-top') < h.indexOf('hj-mast') && h.indexOf('hj-mast') < h.indexOf('hoja__foto') && h.indexOf('hoja__foto') < h.indexOf('hoja__titulo'));
});

test('sin imagen (o con una que no es https) se usa la foto del sitio de su categoría, con la fuente encima', () => {
  for (const imagen of ['', undefined, null, 'http://inseguro.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA']) {
    const h = hoja({ ...NOTA, categoria: 'apicultura', imagen });
    assert.match(h, /src="\.\.\/assets\/img\/noticias\/respaldo-apicultura\.jpg"/, String(imagen));
    assert.match(h, /class="hoja hoja--(verde|naranja|bicolor) hoja--tarjeta hoja--respaldo"/);
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
  assert.match(h, /hoja--naranja hoja--tarjeta hoja--respaldo/);
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
  assert.match(parteNoticias, /--h-mast:\s*#1F5F3A/i, 'cabecera verde de marca');
  assert.match(parteNoticias, /--h-mast:\s*#C25100/i, 'cabecera naranja quemado');
  assert.match(parteNoticias, /--h-mast:\s*#1B1F23/i, 'cabecera carbón');
  assert.match(parteNoticias, /--h-b1-bg:\s*#E8A317/i, 'etiqueta dorada');
  assert.match(parteNoticias, /--h-papel:\s*#171B20/i, 'superficie de noche');
  assert.match(parteNoticias, /--h-papel:\s*#FFFEFA/i, 'papel de día');
  assert.match(parteNoticias, /border-bottom:\s*3px double/, 'doble filete bajo dominio y fecha');
  assert.match(parteNoticias, /'Playfair Display'/);
  assert.match(parteNoticias, /ui-monospace/);
  assert.match(parteNoticias, /text-align:\s*justify/);
  assert.match(parteNoticias, /-webkit-line-clamp:\s*5/, 'extracto a 5 líneas');
  assert.match(parteNoticias, /-webkit-line-clamp:\s*3/, 'titular a 3 líneas');
  for (const [ancho, cols] of [[500, 2], [760, 3], [960, 4]])
    assert.match(parteNoticias, new RegExp('@container \\(min-width: ' + ancho + 'px\\)\\s*\\{\\s*\\.hojas\\s*\\{\\s*grid-template-columns:\\s*repeat\\(' + cols + ','), cols + ' columnas desde ' + ancho + ' px');
  assert.doesNotMatch(parteNoticias, /\.np-|--np-/, 'sin restos de la primera plana');
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

/* ───── Rejilla estilo Alintec ───── */
const NOTAS = [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ id: 'n' + i, titulo: 'Nota ' + i, extracto: 'Extracto de la nota ' + i, fuente: 'Zoorigen', categoria: i % 2 ? 'fauna' : 'conservacion',
  fecha: '2026-10-13T08:00:00', link: 'https://es.mongabay.com/n' + i, imagen: i === 3 ? 'https://cdn.mongabay.com/fotos/n3.jpg' : '' }));
const AHORA = new Date('2026-10-13T12:00:00');

test('la tarjeta trae dominio y fecha, cabecera con el nombre, foto, titular, fuente, extracto y pie con número', () => {
  const h = N.hojaHTML(NOTAS[2], 2, { ahora: AHORA });
  assert.match(h, /<span class="hj-dom">zoorigen\.com<\/span><span class="hj-fecha">13 de octubre de 2026<\/span>/);
  assert.match(h, /<h3 class="hj-brand"><span class="hj-b1">Zoorigen<\/span> <span class="hj-b2">Actualidad<\/span><\/h3>/);
  assert.match(h, /class="hj-lema">Fauna silvestre — <em>Zoorigen<\/em>/);
  assert.match(h, /src="https:\/\/cdn\.mongabay\.com\/fotos\/n3\.jpg"/);
  assert.match(h, /<h3 class="hoja__titulo">Nota 3<\/h3>/);
  assert.match(h, /<p class="hj-deck">Zoorigen · hace 4 h<\/p>/);
  assert.match(h, /<p class="hoja__texto" lang="es">Extracto de la nota 3<\/p>/);
  assert.match(h, /Ver resumen ampliado <span aria-hidden="true">→<\/span>/);
  assert.match(h, /<span class="hj-page" aria-hidden="true">03<\/span>/);
  assert.match(h, /data-i="2"/, 'el índice abre la nota correcta en la lectura ampliada');
  assert.doesNotMatch(h, /gradient/i);
  assert.doesNotMatch(h, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test('la variante de cabecera sale de la plantilla del administrador o del id, y es la misma en cada recarga', () => {
  const clase = (n, i) => (N.hojaHTML(n, i, { ahora: AHORA }).match(/hoja--(verde|naranja|bicolor)/) || [])[1];
  for (const n of NOTAS) assert.equal(clase(n, 0), clase(n, 7), 'no depende de la posición ni del momento');
  assert.equal(clase({ id: 'a', plantilla: 'naranja' }, 0), 'naranja');
  assert.equal(clase({ id: 'a', plantilla: 'bicolor' }, 0), 'bicolor');
  assert.equal(new Set(NOTAS.map(n => clase(n, 0))).size >= 2, true, 'las notas se reparten entre varias cabeceras');
});

test('recorte de textos: titular a 180, extracto de tarjeta a 420 sin partir palabras, y sin etiquetas', () => {
  const largo = { ...NOTA, titulo: 'palabra '.repeat(60), extracto: '<b>texto</b> ' + 'extracto '.repeat(120) };
  const n = N.normalizar(largo, 0);
  assert.ok(n.titulo.length <= 181 && n.titulo.endsWith('…'));
  const h = hoja(largo);
  const texto = h.match(/<p class="hoja__texto" lang="es">([^<]*)<\/p>/)[1];
  assert.ok(texto.length <= 421 && texto.endsWith('…'), String(texto.length));
  assert.ok(!/<b>|texto<\/b>/.test(texto));
  assert.ok(!/extract…$/.test(texto), 'no parte una palabra');
  // sin extracto se usa el resumen
  const r = hoja({ id: 'adm', titulo: 'T', resumen: ['Primera línea.', 'Segunda línea.'], categoria: 'normativa', origen: 'admin' });
  assert.match(r, /Primera línea\. Segunda línea\./);
});

test('la rejilla numera 01, 02..., escapa lo externo y avisa cuando no hay notas', () => {
  const h = N.rejillaHTML(NOTAS, { ahora: AHORA });
  assert.equal((h.match(/class="hoja hoja--/g) || []).length, 8);
  assert.deepEqual([...h.matchAll(/class="hj-page"[^>]*>(\d\d)</g)].map(m => m[1]), ['01', '02', '03', '04', '05', '06', '07', '08']);
  assert.match(h, /^<div class="hojas">/);
  assert.equal((N.rejillaHTML(NOTAS, { ahora: AHORA, max: 3 }).match(/class="hoja hoja--/g) || []).length, 3);
  const sucia = N.rejillaHTML([{ id: 'a"><img src=x>', titulo: '<img src=x onerror=1>Título', extracto: '<script>x</script> texto', fuente: '"><b>M</b>', categoriaNombre: '<i>cat</i>',
    link: 'javascript:alert(1)', imagen: 'http://malo.com/x.jpg', categoria: 'fauna' }], { ahora: AHORA });
  assert.doesNotMatch(sucia, /<img src=x|<script|<b>M|<i>cat|href="javascript:/i);
  assert.match(sucia, /respaldo-fauna\.jpg/);
  assert.match(sucia, /hoja--respaldo/);
  const vacia = N.rejillaHTML([], { tituloVacio: 'Sin conexión' });
  assert.match(vacia, /nt-vacio/);
  assert.match(vacia, /Sin conexión/);
  assert.equal(N.rejillaHTML(null).includes('nt-vacio'), true);
});

test('la lectura ampliada usa la misma cabecera y conserva el enlace original en pestaña nueva', () => {
  const l = N.lecturaHTML({ ...NOTA, imagen: 'https://cdn.mongabay.com/x.jpg' }, 0, { ahora: AHORA });
  assert.match(l, /hoja--grande/);
  assert.match(l, /class="hj-brand"/);
  assert.match(l, /zoorigen\.com/);
  assert.match(l, /rel="noopener noreferrer"/);
});

test('la primera plana ya no existe: sin periodicoHTML ni estilos np-', () => {
  assert.equal(N.periodicoHTML, undefined);
  assert.equal(N.componerPortada, undefined);
  const css = fs.readFileSync(path.join(RAIZ, 'assets/css/club-noticias.css'), 'utf8');
  assert.doesNotMatch(css, /\.np-|--np-/);
});
