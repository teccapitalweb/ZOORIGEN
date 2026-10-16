'use strict';
// PDFs y materiales: partes puras de club-materiales.js (metas de retos, filtros, seguridad al pintar, guardados, paginación)
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../assets/js/club-materiales.js');

const libro = (id, req, extra) => Object.assign({ id, titulo: 'Libro ' + id, subtitulo: 'Sub', autor: 'Equipo Zoorigen', categoria: 'Normatividad', color: '#1F5F3A', icono: 'scale', resumen: 'Resumen', paginasTotal: 10, requiereRetos: req, desbloqueado: false, faltan: req }, extra || {});

test('siguienteMeta: el libro de menor umbral que aún falta, con su porcentaje', () => {
  const libros = [libro('c', 30), libro('a', 5), libro('b', 15)];
  const m = M.siguienteMeta(libros, 3);
  assert.equal(m.libro.id, 'a');
  assert.equal(m.faltan, 2);
  assert.equal(m.porcentaje, 60);
  assert.equal(M.siguienteMeta(libros, 5).libro.id, 'b');       // justo en el umbral: ese ya se abrió
  assert.equal(M.siguienteMeta(libros, 14).faltan, 1);
  assert.equal(M.siguienteMeta(libros, 30).todosAbiertos, true);
  assert.equal(M.siguienteMeta([], 4), null);
  assert.equal(M.siguienteMeta(null, 4), null);
  assert.equal(M.siguienteMeta(libros, -3).libro.id, 'a');
  assert.equal(M.siguienteMeta(libros, 'abc').superados, 0);
});

test('textos de bloqueo', () => {
  assert.equal(M.textoBloqueo({ desbloqueado: true }), '');
  assert.equal(M.textoBloqueo({ desbloqueado: false, soloMiembros: true }), 'Solo para miembros');
  assert.equal(M.textoBloqueo({ desbloqueado: false, faltan: 1 }), 'Supera 1 reto más');
  assert.equal(M.textoBloqueo({ desbloqueado: false, faltan: 8 }), 'Supera 8 retos más');
  assert.equal(M.textoBloqueo({ desbloqueado: false, faltan: 0, requiereRetos: 5 }), 'Supera 5 retos más');
  assert.match(M.mensajeBloqueo({ titulo: 'X', faltan: 3 }), /«X» se desbloquea al superar 3 retos más\./);
  assert.match(M.mensajeBloqueo({ titulo: 'X', soloMiembros: true }), /solo para miembros/);
});

test('filtros: pestaña, texto sin acentos y guardados', () => {
  const docs = [
    { id: 'a', titulo: 'Checklist de bioseguridad', tipo: 'checklist', area: 'Bioseguridad', descripcion: 'x' },
    { id: 'b', titulo: 'Introducción a la NOM-059', tipo: 'presentacion', area: 'Normatividad', descripcion: 'x' },
    { id: 'c', titulo: 'Glosario', tipo: 'glosario', area: 'Normatividad', descripcion: 'términos' }
  ];
  assert.deepEqual(M.filtrarMateriales(docs, { pestana: 'presentaciones' }).map(d => d.id), ['b']);
  assert.deepEqual(M.filtrarMateriales(docs, { pestana: 'guias' }).map(d => d.id), ['a', 'c']);
  assert.deepEqual(M.filtrarMateriales(docs, { texto: 'INTRODUCCION' }).map(d => d.id), ['b']);
  assert.deepEqual(M.filtrarMateriales(docs, { texto: 'terminos' }).map(d => d.id), ['c']);
  assert.deepEqual(M.filtrarMateriales(docs, { pestana: 'guardados', guardados: ['doc:c'] }).map(d => d.id), ['c']);
  assert.deepEqual(M.filtrarMateriales(null, {}), []);
  const libros = [libro('a', 5), libro('b', 15, { titulo: 'Bienestar animal' })];
  assert.deepEqual(M.filtrarLibros(libros, { texto: 'bienestar' }).map(l => l.id), ['b']);
  assert.deepEqual(M.filtrarLibros(libros, { pestana: 'guardados', guardados: ['libro:a'] }).map(l => l.id), ['a']);
});

test('todo lo que viene del servidor se escapa al pintar', () => {
  const sucio = libro('x', 5, { titulo: '<img src=x onerror=alert(1)>', subtitulo: '"><script>1</script>', color: 'red;background:url(x)', autor: '<b>a</b>' });
  for (const html of [M.libroCardHTML(sucio, {}), M.libroDestacadoHTML(sucio)]) {
    assert.ok(!/<img src=x/.test(html));
    assert.ok(!/<script/.test(html));
    assert.ok(!/red;background/.test(html), 'color inválido se reemplaza');
  }
  const doc = M.materialCardHTML({ id: 'd', titulo: '<svg onload=1>', tipo: 'inventado', area: '"><b>', descripcion: '<i>', desbloqueado: false, faltan: 2 }, {});
  assert.ok(!/<svg onload/.test(doc));
  assert.match(doc, /Supera 2 retos más/);
  const fila = M.filaMaterialHTML({ id: 'a"><script>', fuente: 'drive', titulo: '<x onerror=1>', area: '<b>a</b>', cursoId: 'c1', clase: 2, cursoTitulo: '<img src=x>', desbloqueado: false, condicion: 'clase' }, {});
  assert.ok(!/<script/.test(fila) && !/<x onerror/.test(fila) && !/<img src=x/.test(fila) && !/<b>/.test(fila));
  const seccion = M.seccionCursosHTML(M.agruparPorCurso([{ id: 'p', titulo: 'T', cursoId: 'c"><script>', cursoTitulo: '</h3><script>', clase: 1, desbloqueado: true }]), 'club-biblioteca.html');
  assert.ok(!/<script/.test(seccion));
  const pag = M.paginaHTML({ titulo: '<b>T</b>', parrafos: ['<img src=x onerror=1>'], lista: ['<script>'] }, 0, 3);
  assert.ok(!/<img src=x/.test(pag) && !/<script/.test(pag));
});

test('el libro bloqueado muestra candado y avance gris; el abierto, su página', () => {
  assert.match(M.libroCardHTML(libro('a', 5), {}), /mt-libro__lock/);
  assert.match(M.libroCardHTML(libro('a', 5), {}), /is-bloq/);
  const abierto = M.libroCardHTML(libro('a', 5, { desbloqueado: true, faltan: 0 }), { pagina: 3 });
  assert.ok(!/mt-libro__lock/.test(abierto));
  assert.match(abierto, /Página 4 de 10/);
  assert.match(M.libroCardHTML(libro('a', 5, { desbloqueado: true }), { guardado: true }), /is-on/);
});

test('banner de retos', () => {
  assert.equal(M.bannerRetosHTML(null), '');
  const b = M.bannerRetosHTML(M.siguienteMeta([libro('a', 5)], 2));
  assert.match(b, /llevas 2 de 5 retos/);
  assert.match(b, /Supera 3 retos más/);
  assert.match(M.bannerRetosHTML(M.siguienteMeta([libro('a', 5)], 9)), /Desbloqueaste todos los libros/);
});

test('guardados y avance de lectura por cuenta, con almacenamiento roto sin fallar', () => {
  const mem = {};
  const alm = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  assert.deepEqual(M.alternarGuardado(alm, 'u1', 'libro:a'), ['libro:a']);
  assert.deepEqual(M.alternarGuardado(alm, 'u1', 'doc:b'), ['libro:a', 'doc:b']);
  assert.deepEqual(M.alternarGuardado(alm, 'u1', 'libro:a'), ['doc:b']);
  assert.deepEqual(M.leerGuardados(alm, 'u2'), []);
  mem[M.claveGuardados('u3')] = JSON.stringify(['libro:ok', 'cosa:mala', 5, 'doc:<x>']);
  assert.deepEqual(M.leerGuardados(alm, 'u3'), ['libro:ok']);
  M.guardarPagina(alm, 'u1', 'ley', 4);
  assert.equal(M.leerPagina(alm, 'u1', 'ley', 17), 4);
  assert.equal(M.leerPagina(alm, 'u1', 'ley', 3), 0, 'fuera de rango → inicio');
  assert.equal(M.leerPagina(alm, 'u9', 'ley', 17), 0);
  const roto = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.deepEqual(M.leerGuardados(roto, 'u1'), []);
  assert.deepEqual(M.alternarGuardado(roto, 'u1', 'libro:a'), ['libro:a']);
  assert.equal(M.leerPagina(roto, 'u1', 'ley', 5), 0);
});

test('vistaPaginas: dos páginas en pantalla ancha, una en celular, sin salirse del libro', () => {
  const ancha = M.vistaPaginas(17, 0, 1280);
  assert.deepEqual(ancha.paginas, [0, 1]);
  assert.equal(ancha.siguiente, 2);
  assert.equal(ancha.anterior, null);
  assert.equal(M.vistaPaginas(17, 3, 1280).indice, 2, 'siempre empieza en página par');
  assert.deepEqual(M.vistaPaginas(17, 16, 1280).paginas, [16]);
  assert.equal(M.vistaPaginas(17, 16, 1280).siguiente, null);
  const cel = M.vistaPaginas(17, 5, 390);
  assert.deepEqual(cel.paginas, [5]);
  assert.equal(cel.anterior, 4);
  assert.equal(cel.siguiente, 6);
  assert.equal(M.vistaPaginas(17, 99, 390).indice, 16);
  assert.equal(M.vistaPaginas(1, 0, 1280).doble, false);
});

test('documentos oficiales: solo https y sin repetidos', () => {
  const ids = new Set();
  for (const o of M.OFICIALES) {
    assert.match(o.url, /^https:\/\//);
    assert.ok(!ids.has(o.id));
    ids.add(o.id);
  }
  assert.ok(M.OFICIALES.some(o => /LGVS/.test(o.url)) && M.OFICIALES.some(o => /dof\.gob\.mx/.test(o.url)));
  assert.match(M.oficialesHTML(), /rel="noopener noreferrer"/);
});

test('la página de PDFs carga el módulo y la hoja de estilos', () => {
  const fs = require('node:fs'), path = require('node:path');
  const h = fs.readFileSync(path.resolve(__dirname, '../pages/club-pdfs.html'), 'utf8');
  assert.ok(h.includes('club-materiales.js') && h.includes('club-materiales.css') && h.includes('ZOO_MATERIALES.montar'));
});

test('el lector: modo una página forzado, en pantalla angosta siempre una, y la foto de cada material', () => {
  assert.equal(M.vistaPaginas(17, 4, 1280, 'una').doble, false);
  assert.equal(M.vistaPaginas(17, 4, 1280, 'dos').doble, true);
  assert.equal(M.vistaPaginas(17, 4, 1280, '').doble, true);
  assert.equal(M.vistaPaginas(17, 4, 390, 'dos').doble, false, 'en celular nunca dos páginas');
  assert.equal(M.vistaPaginas(17, 5, 1280, 'una').anterior, 4);
  assert.match(M.fotoDeMaterial({ area: 'Apicultura', titulo: 'x' }), /apicultura-polinizacion/);
  assert.match(M.fotoDeMaterial({ area: 'Bienestar', titulo: 'x' }), /etologia/);
  assert.match(M.fotoDeMaterial({ area: 'Normatividad', titulo: 'Glosario' }), /fauna-silvestre-conservacion/);
  const html = M.materialCardHTML({ id: 'a', titulo: 'T', tipo: 'guia', area: 'Manejo', paginas: 2, desbloqueado: true }, {});
  assert.match(html, /mt-doc__foto/);
  assert.match(html, /Material de apoyo/);
  const pag = M.paginaHTML({ titulo: 'T', parrafos: ['x'] }, 4, 17, 'Mi libro');
  assert.match(pag, /MI LIBRO/);
  assert.ok(pag.includes('<span>5</span>'));
});

test('las fotos que usan las portadas existen en el sitio', () => {
  const fs = require('node:fs'), path = require('node:path');
  const lista = [];
  const src = fs.readFileSync(path.resolve(__dirname, '../assets/js/club-materiales.js'), 'utf8');
  for (const m of src.matchAll(/'\.\.\/(assets\/img\/areas\/[a-z0-9.-]+)'/g)) lista.push(m[1]);
  assert.ok(lista.length >= 5);
  for (const rel of lista) assert.ok(fs.existsSync(path.resolve(__dirname, '..', rel)), rel + ' no existe');
});

// ── Portadas propias de libros y materiales ──
test('portadas propias: cada id mapeado tiene su archivo y se usa en la tarjeta', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const ids = Object.keys(M.PORTADAS);
  assert.equal(ids.length, 12, '3 libros + 9 materiales');
  for (const id of ids) {
    const ruta = M.portadaDe(id);
    assert.match(ruta, /^\.\.\/assets\/img\/materiales\/[a-z0-9-]+\.jpg$/);
    const archivo = path.join(__dirname, '..', ruta.replace(/^\.\.\//, ''));
    assert.ok(fs.existsSync(archivo), 'falta el archivo de ' + id);
    assert.ok(fs.statSync(archivo).size < 250 * 1024, id + ' pesa demasiado');
  }
  // un material con portada propia la usa; sin portada cae a la foto del tema
  assert.match(M.fotoDeMaterial({ id: 'intro-nom-059', area: 'Normatividad', titulo: 'x' }), /material-intro-nom-059\.jpg/);
  assert.match(M.fotoDeMaterial({ id: 'otro', area: 'Apicultura', titulo: 'x' }), /apicultura-polinizacion/);
  assert.equal(M.portadaDe('__proto__'), '');
  assert.equal(M.portadaDe('constructor'), '');
});

test('portadas propias: el libro muestra su foto y, sin portada, conserva el ícono', () => {
  const base = { titulo: 'Fauna silvestre y ley', categoria: 'Normatividad', icono: 'scale', desbloqueado: true, paginasTotal: 10, color: '#1F5F3A' };
  const con = M.libroCardHTML ? M.libroCardHTML({ ...base, id: 'ley-fauna-mx' }, {}) : null;
  const sin = M.libroCardHTML ? M.libroCardHTML({ ...base, id: 'libro-nuevo' }, {}) : null;
  if (con === null) return; // si el módulo no exporta la tarjeta del libro, la prueba de arriba cubre el mapa
  assert.match(con, /mt-libro__foto/);
  assert.match(con, /libro-ley-fauna-mx\.jpg/);
  assert.doesNotMatch(con, /mt-libro__icono/);
  assert.doesNotMatch(sin, /mt-libro__foto/);
  assert.match(sin, /mt-libro__icono/);
});

// ── Materiales de curso: la condición clara, con candado y avance ──
const delCurso = (id, clase, extra) => Object.assign({ id, titulo: 'Guía ' + id, area: 'Manejo', paginas: 4, cursoId: 'tiburones', cursoTitulo: 'Tiburones y rayas', clase, condicion: clase ? 'clase' : 'curso', desbloqueado: false, soloMiembros: false, faltan: 0, requiereRetos: 0 }, extra);

test('condicionTexto: dice qué falta para abrir cada material (clase, retos, solo miembros, pendiente)', () => {
  assert.equal(M.condicionTexto(delCurso('a', 2)), 'Se desbloquea al terminar la clase 2 de «Tiburones y rayas»');
  assert.equal(M.condicionTexto(delCurso('a', 2, { cursoTitulo: '' })), 'Se desbloquea al terminar la clase 2 del curso');
  assert.equal(M.condicionTexto({ id: 'r', titulo: 'R', requiereRetos: 5, faltan: 3, acceso: 'retos' }), 'Resuelve 5 retos para abrirlo');
  assert.equal(M.condicionTexto({ id: 'r', titulo: 'R', requiereRetos: 1, faltan: 1 }), 'Resuelve 1 reto para abrirlo');
  assert.equal(M.condicionTexto(delCurso('a', 2, { soloMiembros: true })), 'Solo para miembros');
  assert.equal(M.condicionTexto(delCurso('a', 2, { pendiente: true })), 'Disponible muy pronto');
  assert.equal(M.condicionTexto(delCurso('a', 2, { desbloqueado: true })), '', 'abierto: sin condición');
  assert.equal(M.reglaTexto(delCurso('a', 0)), 'Material del curso «Tiburones y rayas»');
  assert.equal(M.textoAbierto(delCurso('a', 2, { desbloqueado: true })), 'Desbloqueado: terminaste la clase 2');
  assert.equal(M.textoAbierto({ id: 'r', requiereRetos: 5, desbloqueado: true }), 'Desbloqueado con tus retos');
});

test('filaMaterialHTML: bloqueado muestra candado y la regla; abierto, "Abrir"; sin membresía, el chip y la regla; con retos, avance', () => {
  const bloq = M.filaMaterialHTML(delCurso('a', 2), {});
  assert.match(bloq, /is-bloq/);
  assert.match(bloq, /Se desbloquea al terminar la clase 2 de «Tiburones y rayas»/);
  assert.match(bloq, /data-fila="catalogo:a"/);
  assert.doesNotMatch(bloq, /Abrir/);
  const abierto = M.filaMaterialHTML(delCurso('a', 2, { desbloqueado: true }), {});
  assert.match(abierto, /is-abierto/);
  assert.match(abierto, /mt-fila__abrir">Abrir/);
  assert.match(abierto, /Desbloqueado: terminaste la clase 2/);
  assert.doesNotMatch(abierto, /is-bloq/);
  const previa = M.filaMaterialHTML(delCurso('a', 2, { soloMiembros: true }), {});
  assert.match(previa, /is-previa/);
  assert.match(previa, /Solo miembros/);
  assert.match(previa, /Se desbloquea al terminar la clase 2/, 'la regla se ve aunque falte la membresía');
  const retos = M.filaMaterialHTML({ id: 'g', fuente: 'drive', titulo: 'Atlas', requiereRetos: 5, faltan: 2, desbloqueado: false, soloMiembros: false }, {});
  assert.match(retos, /data-fila="drive:g"/);
  assert.match(retos, /Resuelve 5 retos para abrirlo/);
  assert.match(retos, /3 de 5 retos/);
  assert.match(retos, /width:60%/);
});

test('agruparPorCurso: un bloque por curso, ordenado por clase y con cuántos están abiertos; ids raros no rompen nada', () => {
  const g = M.agruparPorCurso([
    delCurso('c', 3), delCurso('a', 1, { desbloqueado: true }), delCurso('z', 0, { desbloqueado: true }),
    delCurso('o', 1, { cursoId: 'constructor', cursoTitulo: 'Otro curso' }), { id: 'suelto', titulo: 'Sin curso' }, null
  ]);
  assert.equal(g.length, 2);
  assert.deepEqual(g[0].items.map(m => m.id), ['a', 'c', 'z'], 'por clase; el del curso completo al final');
  assert.equal(g[0].abiertos, 2);
  assert.equal(g[0].titulo, 'Tiburones y rayas');
  assert.equal(g[1].cursoId, 'constructor');
  assert.deepEqual(M.agruparPorCurso(null), []);
  const html = M.seccionCursosHTML(g, 'club-biblioteca.html');
  assert.match(html, /2 de 3 abiertos/);
  assert.match(html, /href="club-biblioteca\.html\?curso=tiburones"/);
  assert.equal(M.seccionCursosHTML([], 'x'), '');
});
