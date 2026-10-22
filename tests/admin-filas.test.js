'use strict';

// Filas compactas y menú «…» del panel de administración (estilo de la lista de miembros de Alintec):
// estructura de la fila, menú accesible, cada acción disponible en su menú, sin degradados ni emojis y versiones coherentes.
// Ejecutar: node --test tests/admin-filas.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const F = require(path.join(RAIZ, 'assets', 'js', 'admin-filas.js'));
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const E = require(path.join(RAIZ, 'assets', 'js', 'admin-encuesta.js'));
const K = require(path.join(RAIZ, 'assets', 'js', 'admin-certificados.js'));
const C = require(path.join(RAIZ, 'assets', 'js', 'admin-cursos.js'));

const html = leer('pages/admin-club.html');
const css = leer('assets/css/admin-club.css');
const filasJs = leer('assets/js/admin-filas.js');
const vistas = leer('assets/js/admin-vistas.js');
const noticias = leer('assets/js/admin-noticias.js');
const sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '');

/* ───────── estructura de la fila ───────── */

test('botón «…»: aria-haspopup="menu", aria-expanded, nombre accesible y acciones en data-menu; sin acciones no hay botón', () => {
  const b = F.botonMenu({ acciones: [{ t: 'Ver ficha', i: 'eye', a: 'ficha' }, { t: 'Eliminar', i: 'trash-2', a: 'eliminar', p: true, sep: true }], etiqueta: 'Acciones de Ana', datos: { uid: 'u1' } });
  assert.match(b, /<button type="button" class="ap-fc__menu" aria-haspopup="menu" aria-expanded="false" aria-label="Acciones de Ana"/);
  assert.match(b, /data-uid="u1"/);
  const acc = F.accionesDeHTML(b);
  assert.deepEqual(acc.map(a => a.a), ['ficha', 'eliminar']);
  assert.equal(acc[1].p, 1);
  assert.equal(acc[1].sep, 1);
  assert.equal(F.botonMenu({ acciones: [] }), '');
  assert.equal(F.botonMenu({}), '');
});

test('el texto y los datos se escapan: nada de HTML vivo en el título, la etiqueta ni el menú', () => {
  const malo = '<img src=x onerror=alert(1)>"\'';
  const h = F.fila({ titulo: malo, etiqueta: malo, accion: { a: 'ficha', datos: { uid: malo } }, acciones: [{ t: malo, a: 'x' }], etiquetaMenu: malo, datos: { uid: malo } });
  assert.doesNotMatch(h, /<img/);
  assert.match(h, /&lt;img/);
  assert.equal(F.atributosDatos({ 'a b': '1', 'x"y': '2', ok: '3' }), ' data-ok="3"', 'nombres de atributo no válidos se descartan');
});

test('la fila: avatar, título que se toca (botón o enlace), línea pequeña, columnas, estado y menú; una sola línea principal', () => {
  const h = F.fila({
    avatar: '<span class="ap-avatar">AB</span>', titulo: 'Ana Beltrán', etiqueta: 'Admin', accion: { a: 'ficha', datos: { uid: 'u1' } },
    meta: 'ana@x.test', cols: [{ html: '<span class="ap-fc__v">22 oct</span>' }], estado: '<span class="ap-badge">Activo</span>',
    acciones: [{ t: 'Ver ficha', a: 'ficha' }], datos: { uid: 'u1' }
  });
  assert.match(h, /^<li class="ap-fc ap-fc--col ap-fc--est ap-fc--fin ap-fc--toca"/);
  assert.match(h, /<button type="button" class="ap-fc__titulo" data-accion="ficha" data-uid="u1">Ana Beltrán <span class="ap-etiqueta">Admin<\/span><\/button>/);
  assert.match(h, /<span class="ap-fc__meta">ana@x\.test<\/span>/);
  assert.match(h, /class="ap-fc__estado"/);
  assert.equal((h.match(/class="ap-fc__menu"/g) || []).length, 1, 'un solo menú por fila');
  assert.doesNotMatch(h, /ap-btn/, 'ningún botón suelto de acción en la fila');
  // título que es un enlace (certificados) y título sin acción (foro)
  assert.match(F.fila({ titulo: 'x', accion: { h: 'ver.html?folio=1' } }), /<a class="ap-fc__titulo" href="ver\.html\?folio=1" target="_blank" rel="noopener">/);
  assert.match(F.fila({ titulo: 'x' }), /<span class="ap-fc__titulo ap-fc__titulo--texto">/);
  // si solo hay la acción principal se ve un chevron en lugar del «…»
  assert.match(F.fila({ titulo: 'x', accion: { a: 'ficha' }, chevron: true }), /ap-fc__chevron/);
  // atributo distinto de data-accion (encuesta)
  assert.match(F.fila({ titulo: 'x', accion: { attr: 'enc', a: 'wa', datos: { id: '1' } } }), /data-enc="wa" data-id="1"/);
});

test('las columnas de una lista son las mismas en todas las filas y los encabezados las repiten', () => {
  const a = F.fila({ titulo: 'a', cols: [{ html: '1' }], estado: '', reservarFin: true });
  const b = F.fila({ titulo: 'b', cols: [{ html: '2' }], estado: '<span>x</span>', acciones: [{ t: 'Ver', a: 'v' }] });
  const clases = h => h.match(/class="(ap-fc[^"]*)"/)[1];
  assert.equal(clases(a), clases(b).replace(' ap-fc--toca', '').replace(/ap-fc--toca ?/, ''));
  const l = F.lista([a, b], { cab: { principal: 'Miembro', cols: ['Vence'], estado: 'Estado' }, etiqueta: 'Miembros' });
  assert.match(l, /<div class="ap-fc-zona"><div class="ap-fc-caja"><div class="ap-fc-cab ap-fc--col ap-fc--est ap-fc--fin" aria-hidden="true">/);
  assert.match(l, /<ul class="ap-fc-lista" aria-label="Miembros">/);
  assert.match(l, /Vence/);
});

/* ───────── menú accesible ───────── */

test('menú accesible: role="menu" y "menuitem", flechas, Inicio/Fin, Esc, Tab, clic afuera, foco devuelto y apertura hacia arriba', () => {
  const j = sinComentarios(filasJs);
  assert.match(j, /setAttribute\('role', 'menu'\)/);
  assert.match(j, /role="menuitem"/);
  assert.match(j, /role="separator"/);
  assert.match(j, /aria-haspopup="menu"/);
  assert.match(j, /setAttribute\('aria-expanded', 'true'\)/);
  assert.match(j, /setAttribute\('aria-expanded', 'false'\)/);
  assert.match(j, /setAttribute\('aria-controls', id\)/);
  assert.match(j, /setAttribute\('aria-label'/);
  for (const k of ['Escape', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab']) assert.match(j, new RegExp("'" + k + "'"), 'tecla ' + k);
  // Esc, Tab y elegir una acción devuelven el foco al botón «…»
  assert.match(j, /cerrar\(true\)/);
  assert.match(j, /a\.btn\.focus\(\)/);
  // clic fuera, scroll, cambio de tamaño y salir de la ventana lo cierran
  assert.match(j, /!abierto\.menu\.contains\(t\)\) cerrar\(false\)/);
  assert.match(j, /addEventListener\('resize'/);
  assert.match(j, /addEventListener\('scroll'/);
  // abre hacia arriba cuando abajo no cabe y nunca se sale de la pantalla
  assert.match(j, /haciaArriba/);
  assert.match(j, /window\.innerHeight - r\.bottom/);
  assert.match(j, /data-lado/);
  // elegir una acción llega a la misma vista que un botón normal (data-accion dentro de la fila)
  assert.match(j, /puente\.dataset\.accion = accion/);
  assert.match(j, /puente\.click\(\)/);
});

test('hoja del menú: contenedor flotante sobre todo, objetivos de 40 px o más, peligro en rojo y foco visible', () => {
  const c = sinComentarios(css);
  assert.match(c, /\.ap-menu \{ position: fixed; z-index: 2300;/);
  assert.match(c, /\.ap-menu__item \{[^}]*min-height: 42px/);
  assert.match(c, /\.ap-fc__menu \{[^}]*width: 40px; height: 40px/);
  assert.match(c, /\.ap-menu__item--peligro, \.ap-menu__item--peligro \.zi \{ color: var\(--c-bad-ink\); \}/);
  assert.match(c, /\.ap-menu__item:focus-visible \{ outline: 3px solid/);
  // por encima de las ventanas emergentes del panel (z-index 2000)
  assert.ok(2300 > 2000);
});

/* ───────── cada acción sigue disponible, ahora en el menú ───────── */

test('Miembros: las cinco acciones están en el menú de cada miembro (el administrador solo tiene Ver ficha)', () => {
  // las acciones se evalúan directamente del código de la vista
  const trozo = vistas.slice(vistas.indexOf('function accionesMiembro'), vistas.indexOf('function filaMiembro'));
  const acciones = m => new Function(trozo + ' return accionesMiembro;')()(m);
  const normal = acciones({ esAdmin: false, conAcceso: true, estado: 'activo' });
  assert.deepEqual(normal.map(a => a.a), ['ficha', 'activar', 'regalar', 'cancelar', 'eliminar']);
  assert.equal(normal.find(a => a.a === 'activar').t, 'Ampliar membresía');
  assert.equal(normal.find(a => a.a === 'eliminar').p, true);
  const sinAcceso = acciones({ esAdmin: false, conAcceso: false, estado: 'vencido' });
  assert.deepEqual(sinAcceso.map(a => a.a), ['ficha', 'activar', 'regalar', 'eliminar'], 'sin acceso no hay Cancelar');
  assert.equal(sinAcceso.find(a => a.a === 'activar').t, 'Activar membresía');
  assert.deepEqual(acciones({ esAdmin: true, conAcceso: true, estado: 'activo' }).map(a => a.a), ['ficha']);
  const cancelada = acciones({ esAdmin: false, conAcceso: true, estado: 'cancelado-vigente' });
  assert.ok(!cancelada.some(a => a.a === 'cancelar'), 'ya cancelada: sin Cancelar');
  assert.equal(normal.find(a => a.a === 'regalar').t, 'Regalar 1 mes o 1 año');
});

test('Avance de miembros: Ver detalle, Importar ahora, Reparar e Importar de todos modos en el menú', () => {
  const t = vistas.slice(vistas.indexOf('function accionesAvance'), vistas.indexOf('function filaAvance'));
  for (const a of ['detalle', 'importar', 'reparar', 'forzar']) assert.match(t, new RegExp("a: '" + a + "'"));
  assert.match(t, /Importar ahora/);
  assert.match(t, /Reparar/);
  assert.match(t, /a: 'forzar', p: true/);
});

test('Eliminados: Restaurar sigue disponible (menú y tocar la fila)', () => {
  const t = vistas.slice(vistas.indexOf('function filaEliminado'), vistas.indexOf('async function abrirEliminados'));
  assert.match(t, /a: 'restaurar'/);
  assert.match(t, /Restaurar miembro/);
});

test('Certificados: Ver, Copiar enlace y Verificar están en el menú; tocar la fila abre el certificado', () => {
  const h = K.filaHTML(K.normalizar({ folio: 'ZOO-1', memberName: 'Ana', courseTitle: 'X' }), Date.now());
  assert.deepEqual(F.accionesDeHTML(h).map(a => a.t), ['Ver certificado', 'Copiar enlace de verificación', 'Verificar (vista pública)']);
  assert.match(h, /<a class="ap-fc__titulo" href="ver-certificado\.html\?folio=ZOO-1"/);
});

test('Cursos: Editar y Eliminar en el menú; la vista de lista es la predeterminada', () => {
  const h = C.listaHTML([{ id: 'c1', title: 'Curso', area: 'Etología', lecciones: [] }], 'lista');
  assert.deepEqual(F.accionesDeHTML(h).map(a => a.a), ['editar', 'eliminar']);
  assert.match(h, /class="ap-fc__titulo" data-accion="editar" data-id="c1"/);
  assert.match(html, /orden: 'recientes', vista: 'lista' \}/);
});

test('Videos, PDFs y webinars: Editar y Eliminar en el menú de cada fila, con el mismo manejo de clics', () => {
  assert.match(html, /function listaContenido\(coleccion, items, icono, tono, meta, etiqueta\)/);
  assert.match(html, /acciones: \[\{ t: 'Editar', i: 'pencil', a: 'editar' \}, \{ t: 'Eliminar', i: 'trash-2', a: 'eliminar', p: true, sep: true \}\]/);
  for (const [col, fn] of [['videos', 'formVideo'], ['pdfs', 'formPdf'], ['sesiones', 'formSesion']]) {
    assert.match(html, new RegExp("listaContenido\\('" + col + "'"));
    assert.match(html, new RegExp(col + ': window\\.' + fn));
  }
  assert.match(html, /window\.delDoc\(b\.dataset\.col, x\.id, x\.title \|\| ''\)/);
  assert.doesNotMatch(html, /class="btn-small (edit|delete)"/, 'sin botones Editar y Eliminar sueltos en cada fila');
  assert.equal((html.match(/enlazarContenido\(\);/g) || []).length, 3);
});

test('Noticias y avisos: noticias, datos curiosos y avisos usan filas con menú y los mismos data-* de siempre', () => {
  for (const d of ['borrarNoticia', 'datoEnviar', 'datoPausa', 'datoBorrar', 'avisoBorrar']) assert.match(noticias, new RegExp('d: \\{ ' + d + ':'));
  assert.match(noticias, /h: n\.link/, 'Ver la nota original');
  assert.match(noticias, /Pausar dato/);
  assert.match(noticias, /Enviar ahora a todos/);
  assert.doesNotMatch(noticias, /class="btn-small/, 'sin botones sueltos por fila');
  // los clics siguen escuchándose con los mismos atributos
  for (const a of ['data-borrar-noticia', 'data-dato-enviar', 'data-dato-pausa', 'data-dato-borrar', 'data-aviso-borrar']) assert.ok(noticias.includes(a), a);
});

test('Encuesta: respuestas y preguntas con detalle al tocar la fila y Marcar atendida / Borrar en el menú', () => {
  const sesion = { id: 'a1', sessionId: 's-a1', respuestas: { p1: 'Estudiante', urgencia: 'Lo antes posible' }, completada: true, creado: '2026-10-10T00:00:00Z', tieneContacto: true, contactoMascara: '••• ••• 0100', idContacto: 'a1' };
  const h = E.vistaHTML({ encuesta: { ok: true, detalle: true, docs: [sesion] }, preguntas: { ok: true, detalle: true, preguntas: [{ texto: 'axolote', veces: 2, tipo: 'animal', clave: 'axolote', atendida: false }] } });
  const todas = [...h.matchAll(/<button type="button" class="ap-fc__menu"[^>]*>/g)].flatMap(m => F.accionesDeHTML(m[0]).map(a => a.d && a.d.enc));
  for (const a of ['wa', 'atender', 'detalle', 'borrar', 'pregunta-detalle', 'pregunta-atender', 'pregunta-borrar']) assert.ok(todas.includes(a), a);
  assert.match(h, /class="ap-titulo-fila" data-enc="detalle" data-sid="s-a1"/);
  const det = E.detalleRespuestaHTML(E.filasRespuestas(E.calcular([sesion]).sesiones)[0]);
  assert.match(det, /Sus respuestas/);
  assert.match(det, /••• ••• 0100/);
  assert.doesNotMatch(det, /\d{10}/);
});

test('Pruebas gratuitas, Referidos y Configuración usan filas compactas sin botones por fila (el foro tiene sus propias tarjetas con papelera)', () => {
  assert.match(vistas, /F\.lista\(r\.motivosRechazo\.map/);
  assert.match(leer('assets/js/admin-servidor.js'), /ap-incidentes/);
  assert.match(vistas, /function filaPersonaVence/);
  assert.match(leer('assets/js/admin-marketing.js'), /F\.lista\(mostrar\.map\(filaPrueba\)/);
  assert.match(leer('assets/js/admin-marketing.js'), /F\.lista\(se\.lista\.map/);
});

/* ───────── sin degradados ni emojis, tamaños y versiones ───────── */

test('sin degradados ni emojis en las filas, el menú y las hojas del panel', () => {
  for (const [n, t] of [['admin-filas.js', filasJs], ['admin-club.css', css], ['admin-club.html', html], ['admin-noticias.js', noticias], ['admin-vistas.js', vistas], ['admin-encuesta.js', leer('assets/js/admin-encuesta.js')], ['admin-cursos.js', leer('assets/js/admin-cursos.js')], ['admin-certificados.js', leer('assets/js/admin-certificados.js')], ['admin-marketing.js', leer('assets/js/admin-marketing.js')]]) {
    assert.doesNotMatch(t, /gradient\(/i, n + ': degradado');
    assert.doesNotMatch(t, /[\p{Extended_Pictographic}\u{FE0F}]/u, n + ': emoji');
  }
});

test('letra mínima de 12 px en las reglas nuevas de filas, tablas y menú', () => {
  const c = sinComentarios(css);
  const desde = c.indexOf('.ap-tabla-zona {');
  assert.ok(desde > 0);
  for (const m of c.slice(desde).matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) {
    const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
    assert.ok(px >= 11.99, `letra de ${px}px: ${m[0]}`);
  }
});

test('los íconos nuevos existen (puntos suspensivos, flecha, pausa, reproducir, enviar)', () => {
  const I = require(path.join(RAIZ, 'assets', 'js', 'admin-iconos.js'));
  for (const n of ['ellipsis', 'chevron-right', 'pause', 'play', 'send']) assert.ok(I.existe(n), n);
});

test('versiones ?v= coherentes: admin-filas.js y todas las hojas y programas cambiados suben juntos y se carga antes que las vistas', () => {
  const v = html.match(/admin-club\.css\?v=([\w-]+)/)[1];
  for (const a of ['admin-filas.js', 'admin-vistas.js', 'admin-marketing.js', 'admin-cursos.js', 'admin-certificados.js', 'admin-noticias.js', 'admin-encuesta.js', 'admin-iconos.js']) {
    assert.match(html, new RegExp(a.replace('.', '\\.') + '\\?v=' + v + '"'), a + ' con la misma versión');
  }
  assert.ok(html.indexOf('admin-filas.js') < html.indexOf('admin-vistas.js'));
  assert.ok(html.indexOf('admin-filas.js') < html.indexOf('admin-encuesta.js'));
  assert.ok(html.indexOf('admin-filas.js') < html.indexOf('admin-noticias.js'));
});
