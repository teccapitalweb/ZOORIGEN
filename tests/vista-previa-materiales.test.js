'use strict';
// PDFs y materiales: vista previa para quien NO es miembro. Se ve todo el catálogo (portadas, tipo, área, descripción)
// pero no se puede usar: abrir, leer, descargar o guardar pide membresía. Miembros y administradores, igual que siempre.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../assets/js/club-materiales.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const libro = (id, extra) => Object.assign({ id, titulo: 'Libro ' + id, subtitulo: 'Sub', autor: 'Equipo Zoorigen', categoria: 'Normatividad', color: '#1F5F3A', icono: 'scale', resumen: 'Resumen', paginasTotal: 17, requiereRetos: 5, desbloqueado: false, faltan: 5, soloMiembros: true }, extra || {});
const material = (id, extra) => Object.assign({ id, titulo: 'Material ' + id, tipo: 'guia', area: 'Manejo', descripcion: 'Desc', paginas: 3, acceso: 'miembros', requiereRetos: 0, desbloqueado: false, faltan: 0, soloMiembros: true }, extra || {});

test('esVistaPrevia / hayVistaPrevia: lo decide el servidor con soloMiembros', () => {
  assert.equal(M.esVistaPrevia(libro('a')), true);
  assert.equal(M.esVistaPrevia(libro('a', { soloMiembros: false })), false);
  assert.equal(M.esVistaPrevia(null), false);
  assert.equal(M.hayVistaPrevia([libro('a')], []), true);
  assert.equal(M.hayVistaPrevia([], [material('m')]), true);
  assert.equal(M.hayVistaPrevia([libro('a', { soloMiembros: false })], [material('m', { soloMiembros: false })]), false);
  assert.equal(M.hayVistaPrevia(null, undefined), false);
});

test('tarjeta de libro en vista previa: portada, chip "Solo miembros", guardar, sin texto de retos ni gris de bloqueado', () => {
  const html = M.libroCardHTML(libro('ley-fauna-mx'), {});
  assert.match(html, /libro-ley-fauna-mx\.jpg/, 'conserva su portada');
  assert.match(html, /pw-chip/);
  assert.match(html, /Solo miembros/);
  assert.match(html, /is-previa/);
  assert.doesNotMatch(html, /is-bloq/);
  assert.doesNotMatch(html, /Supera|retos más/);
  assert.match(html, /data-guardar="libro:ley-fauna-mx"/);
  assert.match(html, /data-libro="ley-fauna-mx"/);
  // el miembro con el libro cerrado por retos sigue viendo lo de siempre
  const conRetos = M.libroCardHTML(libro('a', { soloMiembros: false, faltan: 3 }), {});
  assert.match(conRetos, /is-bloq/);
  assert.match(conRetos, /Supera 3 retos más/);
  assert.doesNotMatch(conRetos, /pw-chip/);
});

test('tarjeta de material en vista previa: portada, tipo, área, chip y guardar', () => {
  const html = M.materialCardHTML(material('intro-nom-059', { tipo: 'presentacion', area: 'Normatividad' }), {});
  assert.match(html, /material-intro-nom-059\.jpg/);
  assert.match(html, /Presentación/);
  assert.match(html, /Normatividad/);
  assert.match(html, /pw-chip/);
  assert.match(html, /Solo miembros/);
  assert.match(html, /is-previa/);
  assert.doesNotMatch(html, /is-bloq/);
  assert.doesNotMatch(html, /Supera/);
  assert.match(html, /data-guardar="doc:intro-nom-059"/);
  assert.match(html, /data-doc="intro-nom-059"/);
  const conRetos = M.materialCardHTML(material('x', { soloMiembros: false, acceso: 'retos', requiereRetos: 5, faltan: 2 }), {});
  assert.match(conRetos, /Supera 2 retos más/);
  assert.doesNotMatch(conRetos, /pw-chip/);
});

test('libro destacado en vista previa: "Leer ahora" (abre el aviso), chip y nada de retos', () => {
  const html = M.libroDestacadoHTML(libro('ley-fauna-mx'));
  assert.match(html, />Leer ahora</);
  assert.match(html, /data-abrir-libro="ley-fauna-mx"/);
  assert.match(html, /pw-chip/);
  assert.match(html, /Libro destacado/);
  assert.doesNotMatch(html, /Supera|desbloquear/);
});

test('todo lo que viene del servidor se escapa también en la vista previa', () => {
  const sucio = '<img src=x onerror=alert(1)>';
  const html = M.libroCardHTML(libro('x', { titulo: sucio, autor: sucio }), {}) + M.materialCardHTML(material('y', { titulo: sucio, area: sucio }), {}) + M.libroDestacadoHTML(libro('z', { titulo: sucio, resumen: sucio }));
  assert.doesNotMatch(html, /<img src=x/);
  const t = M.textoPaywallRecurso({ titulo: sucio }, true);
  assert.ok(t.texto.includes(sucio), 'el texto crudo lo escapa el módulo del aviso (esc), no se inserta como HTML aquí');
});

test('encabezado: sin membresía cuenta lo que hay; con membresía, abiertos y retos', () => {
  const libros = [libro('a'), libro('b'), libro('c')];
  const mats = Array.from({ length: 9 }, (_, i) => material('m' + i));
  const previa = M.resumenCatalogo(libros, mats, true, 0);
  assert.deepEqual(previa.map(k => k.valor), ['3', '9', String(M.OFICIALES.length)]);
  assert.deepEqual(previa.map(k => k.etiqueta), ['Libros', 'Materiales', 'Documentos oficiales']);
  assert.ok(!previa.some(k => /\//.test(k.valor)), 'nada de 0/3');
  assert.ok(!previa.some(k => /Retos superados/.test(k.etiqueta)));
  const miembro = M.resumenCatalogo([libro('a', { soloMiembros: false, desbloqueado: true })], [material('m', { soloMiembros: false, desbloqueado: true })], false, 8);
  assert.deepEqual(miembro, [{ valor: '1/1', etiqueta: 'Libros' }, { valor: '1/1', etiqueta: 'Materiales' }, { valor: '8', etiqueta: 'Retos superados' }]);
});

test('franja de retos en vista previa: no promete retos antes de tener membresía y lleva a Suscripción', () => {
  const html = M.bannerVistaPreviaHTML([libro('a', { requiereRetos: 15 }), libro('b', { requiereRetos: 5 }), libro('c', { requiereRetos: 30 })]);
  assert.match(html, /Con tu membresía se desbloquean con retos/);
  assert.match(html, /5 retos/, 'usa el menor umbral');
  assert.match(html, /href="club-suscripcion\.html"/);
  assert.match(html, />Ver planes</);
  assert.doesNotMatch(html, /Supera|llevas|Ir a los retos/);
  assert.match(M.bannerVistaPreviaHTML([], '../otra.html'), /href="\.\.\/otra\.html"/);
  assert.doesNotMatch(M.textoAvisoPrevia(), /<script|onerror/);
});

test('ventana al intentar abrir: título fijo y el nombre del recurso', () => {
  const l = M.textoPaywallRecurso({ titulo: 'Bienestar animal en cautiverio' }, true);
  assert.equal(l.titulo, 'Contenido exclusivo para miembros');
  assert.match(l.texto, /«Bienestar animal en cautiverio»/);
  assert.match(l.texto, /leerlo/);
  const m = M.textoPaywallRecurso({ titulo: 'Ficha de registro de ejemplar' }, false);
  assert.match(m.texto, /«Ficha de registro de ejemplar»/);
  assert.match(m.texto, /descargarlo/);
  assert.match(M.textoPaywallRecurso(null, false).texto, /^Este contenido /);
});

test('respaldo local: 3 libros y 9 materiales con portada, solo metadatos y cerrados', () => {
  const libros = M.respaldoLibros(), mats = M.respaldoMateriales();
  assert.equal(libros.length, 3);
  assert.equal(mats.length, 9);
  const ids = libros.concat(mats).map(x => x.id).sort();
  assert.deepEqual(ids, Object.keys(M.PORTADAS).sort(), 'cada elemento del respaldo tiene su portada propia');
  for (const it of libros.concat(mats)) {
    assert.equal(it.soloMiembros, true);
    assert.equal(it.desbloqueado, false);
    assert.ok(it.titulo && it.titulo.length > 3);
    assert.ok(M.portadaDe(it.id));
    assert.equal(Array.isArray(it.paginas), false);
    for (const prohibido of ['fuentes', 'ruta', 'archivo', 'driveId', 'url', 'parrafos']) assert.equal(prohibido in it, false);
  }
  assert.ok(libros.every(l => l.paginasTotal > 0 && l.requiereRetos > 0));
  assert.ok(mats.every(m => M.TIPOS[m.tipo] && m.area));
  // son copias nuevas: tocarlas no cambia el respaldo
  libros[0].titulo = 'x';
  assert.notEqual(M.respaldoLibros()[0].titulo, 'x');
});

test('el filtro y el buscador funcionan igual con las tarjetas de vista previa', () => {
  const mats = M.respaldoMateriales();
  assert.deepEqual(M.filtrarMateriales(mats, { pestana: 'presentaciones' }).map(m => m.id).sort(), ['bienestar-cinco-dominios', 'intro-nom-059', 'polinizadores-abejas']);
  assert.equal(M.filtrarMateriales(mats, { pestana: 'guias' }).length, 6);
  assert.deepEqual(M.filtrarMateriales(mats, { texto: 'colmenas' }).map(m => m.id), ['calendario-colmenas']);
  assert.equal(M.filtrarLibros(M.respaldoLibros(), { texto: 'bienestar' }).length, 1);
});

// ── Código de la pantalla: nunca se pide contenido a quien no es miembro ──
test('club-materiales.js: abrir libro o material revisa la vista previa ANTES de llamar a los endpoints de contenido', () => {
  const src = leer('assets/js/club-materiales.js');
  const libroIni = src.indexOf('function abrirLibro(id)');
  assert.ok(libroIni > 0);
  const libroCuerpo = src.slice(libroIni, src.indexOf('function cerrarLector', libroIni));
  assert.ok(libroCuerpo.indexOf('esVistaPrevia(meta)') > -1);
  assert.ok(libroCuerpo.indexOf('esVistaPrevia(meta)') < libroCuerpo.indexOf("apiFetch('/api/libros/'"), 'primero el aviso, después (solo miembros) la API');
  const docIni = src.indexOf('function abrirDoc(id)');
  const docCuerpo = src.slice(docIni, src.indexOf('document.addEventListener(\'keydown\'', docIni));
  assert.ok(docCuerpo.indexOf('esVistaPrevia(m)') > -1);
  assert.ok(docCuerpo.indexOf('esVistaPrevia(m)') < docCuerpo.indexOf('apiBlob('), 'primero el aviso, después la descarga');
  assert.match(src, /modalPaywall/);
  assert.match(src, /requiereMembresia/);
  // guardar pide membresía en la vista previa
  assert.match(src, /if \(estado\.previa\) \{ pedirMembresiaFuncion\(/);
});

test('club-materiales.js: los materiales sueltos de Drive no se muestran a quien no es miembro', () => {
  const src = leer('assets/js/club-materiales.js');
  assert.match(src, /estado\.drive = previa \? \[\] : d;/);
});

test('club-materiales.js se sigue cargando en Node sin document y devuelve su API', () => {
  assert.equal(typeof M.montar, 'undefined', 'montar solo existe en el navegador');
  for (const f of ['libroCardHTML', 'materialCardHTML', 'libroDestacadoHTML', 'bannerVistaPreviaHTML', 'resumenCatalogo', 'respaldoLibros', 'respaldoMateriales', 'textoPaywallRecurso']) {
    assert.equal(typeof M[f], 'function', f);
  }
});

// ── La página ──
test('club-pdfs.html: ya no oculta nada a quien no es miembro y monta siempre el catálogo', () => {
  const h = leer('pages/club-pdfs.html');
  assert.doesNotMatch(h, /isVIP/);
  assert.doesNotMatch(h, /showPaywall/);
  assert.doesNotMatch(h, /style\.display\s*=\s*'none'/);
  assert.match(h, /ZOO_PAYWALL\.iniciar\(\{ sesion: session, club: ZOORIGEN_CLUB \}\)/);
  assert.match(h, /ZOO_MATERIALES\.montar\(/);
  // el montaje no depende de una condición de membresía
  const montar = h.indexOf('ZOO_MATERIALES.montar(');
  const antes = h.slice(h.indexOf('ZOO_PAYWALL.iniciar'), montar);
  assert.doesNotMatch(antes, /if\s*\([^)]*(isVIP|miembro|Membership|member|esMiembro)/i);
  assert.doesNotMatch(antes, /return;/);
});

test('club-pdfs.html carga el módulo de vista previa después de club.js y club-shell.js, y antes del catálogo', () => {
  const h = leer('pages/club-pdfs.html');
  const pos = s => { const i = h.indexOf(s); assert.ok(i > -1, s); return i; };
  assert.ok(pos('assets/js/club.js') < pos('assets/js/club-paywall.js'));
  assert.ok(pos('assets/js/club-shell.js') < pos('assets/js/club-paywall.js'));
  assert.ok(pos('assets/js/club-paywall.js') < pos('assets/js/club-materiales.js'));
  assert.match(h, /assets\/css\/club-paywall\.css\?v=20261102-paywall/);
  assert.match(h, /assets\/js\/club-paywall\.js\?v=20261102-paywall/);
  // el ?v= del módulo cambió (la copia en caché del navegador ya no sirve)
  assert.match(h, /club-materiales\.js\?v=20261102-previa/);
  assert.match(h, /club-materiales\.css\?v=20261102-previa/);
});

test('la hoja de estilos de la vista previa no usa degradados', () => {
  const css = leer('assets/css/club-materiales.css');
  const i = css.indexOf('Vista previa para quien no es miembro');
  assert.ok(i > 0);
  assert.doesNotMatch(css.slice(i), /gradient/i);
});
