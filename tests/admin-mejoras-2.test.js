'use strict';

// Panel de administración, segunda ronda: miembros por fecha de registro (nombre, correo y fecha en renglones separados),
// retos con historial por persona, foro y directorio con borrado y publicación oficial, y el foro del Club con la insignia.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const vistas = leer('assets/js/admin-vistas.js');
const css = leer('assets/css/admin-club.css');
const html = leer('pages/admin-club.html');
const foro = leer('pages/club-foro.html');

/* ───────── Miembros ───────── */

test('orden de miembros: más recientes por defecto, más antiguos y vencimiento; sin fecha siempre al final', () => {
  assert.deepEqual(P.ORDENES.map(o => o.texto), ['Más recientes', 'Más antiguos', 'Vencimiento más cercano']);
  assert.equal(P.ORDENES[0].id, 'registro');
  const l = [
    { uid: 'a', registro: '2026-10-20T10:00:00Z', conAcceso: true, vence: '2026-11-01T00:00:00Z' },
    { uid: 'b', registro: null },
    { uid: 'c', registro: '2026-10-22T10:00:00Z', conAcceso: false },
    { uid: 'd', registro: '2026-09-01T10:00:00Z', conAcceso: true, vence: '2026-10-25T00:00:00Z' }
  ];
  assert.deepEqual(P.ordenarMiembros(l, 'registro').map(m => m.uid), ['c', 'a', 'd', 'b']);
  assert.deepEqual(P.ordenarMiembros(l, 'registro-antiguo').map(m => m.uid), ['d', 'a', 'c', 'b']);
  assert.deepEqual(P.ordenarMiembros(l, 'vence').map(m => m.uid).slice(0, 2), ['d', 'a']);
  assert.match(vistas, /orden: 'registro', visibles: 25/, 'la lista abre ordenada por registro');
});

test('fecha y hora de registro con la hora de México y sin fecha dice «—»', () => {
  assert.equal(P.fmtFechaHora('2026-10-21T05:54:00Z'), '20 oct 2026 · 11:54 p. m.');
  assert.equal(P.fmtFechaHora('2026-10-20T18:05:00Z'), '20 oct 2026 · 12:05 p. m.');
  assert.equal(P.fmtFechaHora('2026-10-20T14:05:00Z'), '20 oct 2026 · 8:05 a. m.');
  assert.equal(P.fmtFechaHora(null), '—');
  assert.equal(P.fmtFechaHora('basura'), '—');
});

test('insignias de la fila como en Alintec: Registrado + Sin pagar, o plan + estado', () => {
  const t = h => h.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
  assert.equal(t(P.insigniasMiembro({ estado: 'sin-plan' })), '|Registrado|Sin pagar|');
  assert.equal(t(P.insigniasMiembro({ estado: 'activo', planTipo: 'mensual' })), '|Mensual|Activo|');
  assert.equal(t(P.insigniasMiembro({ estado: 'activo', planTipo: 'anual' })), '|Anual|Activo|');
  assert.match(t(P.insigniasMiembro({ estado: 'cancelado-vigente', planTipo: 'mensual' })), /Mensual\|Cancelado, con acceso/);
  assert.match(t(P.insigniasMiembro({ estado: 'vencido', planTipo: 'anual' })), /Anual\|Vencido/);
  assert.match(t(P.insigniasMiembro({ estado: 'pago-pendiente', planTipo: 'mensual' })), /Pago pendiente/);
});

test('la tarjeta de miembro pone nombre, correo y fecha de registro en renglones SEPARADOS (también en celular)', () => {
  const i0 = vistas.indexOf('  function filaMiembro(m) {');
  const fila = vistas.slice(i0, vistas.indexOf('  function pintarListaMiembros()'));
  assert.match(fila, /class="ap-mi__nombre"/);
  assert.match(fila, /ap-mi__linea ap-mi__correo">'[\s\S]*ico\('mail'/);
  assert.match(fila, /ap-mi__linea ap-mi__reg">'[\s\S]*ico\('clock'/);
  assert.match(fila, /Se registró '/);
  assert.match(fila, /P\.fmtFechaHora\(m\.registro\)/);
  assert.match(fila, /ap-mi__fin[\s\S]*F\.botonMenu/, 'menú «…» a la derecha');
  assert.doesNotMatch(fila, /ap-fc__reg|· Registro /, 'ya no comparten renglón con un punto medio');
  // cada línea es un bloque propio en una columna; en celular también
  assert.match(css, /\.ap-mi__txt \{[^}]*flex-direction: column/);
  assert.match(css, /\.ap-mi__linea \{[^}]*display: flex/);
  const movil = css.slice(css.lastIndexOf('@media (max-width: 720px)'));
  assert.doesNotMatch(movil, /\.ap-mi__(correo|reg)[^{]*\{[^}]*display: none/);
  // el menú conserva Ver ficha, Ampliar y Cancelar
  assert.match(vistas, /t: 'Ver ficha'[\s\S]{0,400}Ampliar membresía[\s\S]{0,600}Cancelar membresía/);
});

/* ───────── Retos ───────── */

test('Retos y XP: historial por persona con filtros, totales por persona reales y aviso de desde cuándo', () => {
  for (const ruta of ['/api/admin/retos/historial', '/api/admin/retos/usuarios', '/api/admin/retos']) assert.ok(vistas.includes("'" + ruta), ruta);
  for (const clave of ['apRQ', 'apRTipo', 'apRDesde', 'apRHasta', 'pag-ant', 'pag-sig', 'limpiar-filtros']) assert.ok(vistas.includes(clave), clave);
  assert.match(vistas, /El historial detallado empieza el día que se publique esta versión/);
  assert.match(vistas, /historialDesde/);
  assert.match(vistas, /Totales por persona/);
  // el espacio reservado «Créditos por retos» ya no existe: los créditos tienen su propia sección en el menú
  assert.doesNotMatch(vistas, /Créditos por retos|Espacio reservado|apRetosCreditos/);
  // la ficha del miembro lleva el historial
  assert.match(vistas, /historialFichaHTML\(r\.retos\)/);
  assert.match(vistas, /Historial de retos <small>/);
  // sin cifras inventadas: los números salen de la respuesta
  assert.doesNotMatch(vistas.slice(vistas.indexOf('async function retos('), vistas.indexOf('/* ───────── FORO Y DIRECTORIO')), /\b(valor|n): [1-9]\d*[,}]/);
});

/* ───────── Foro y directorio ───────── */

test('Foro y directorio del panel: composer oficial, papelera con confirmación y tarjetas con contacto', () => {
  for (const ruta of ['/api/admin/foro', '/api/admin/foro/publicar', '/eliminar', '/respuestas/', '/api/admin/directorio']) assert.ok(vistas.includes(ruta), ruta);
  assert.match(vistas, /Publica como cuenta oficial, ideal para anuncios o resolver dudas de membresía\./);
  assert.match(vistas, /placeholder="Escribe un anuncio o mensaje para la comunidad\.\.\."/);
  assert.match(vistas, /var MAX_OFICIAL = 1500;/);
  assert.match(vistas, /maxlength="' \+ MAX_OFICIAL/);
  assert.match(vistas, /Publicar como Zoorigen/);
  assert.match(vistas, /Aún no hay publicaciones en el foro/);
  // cada borrado pasa por un modal de confirmación peligroso
  for (const f of ['borrarPost', 'borrarRespuesta', 'borrarTarjeta']) {
    const cuerpo = vistas.slice(vistas.indexOf('async function ' + f), vistas.indexOf('async function ' + f) + 1300);
    assert.match(cuerpo, /await confirmar\(\{/, f);
    assert.match(cuerpo, /peligro: true/, f);
  }
  assert.match(vistas, /await confirmar\(\{\s*titulo: 'Publicar como Zoorigen'/);
  // tarjetas: avatar de iniciales, Visible/Privada, Verificado, contacto o «Sin contacto», papelera
  for (const t of ['Visible', 'Privada', 'Verificado', 'Sin contacto', 'ap-dir__contacto', 'borrar-dir', 'WhatsApp']) assert.ok(vistas.includes(t), t);
  assert.match(vistas, /Solo texto|Solo el texto|Solo texto\./);
  // sin imagen: no existe un mecanismo seguro de subida en el sitio
  assert.doesNotMatch(vistas, /type="file"|FileReader|uploadBytes|<input[^>]*image/);
  // todo texto del servidor se escapa
  assert.match(vistas, /esc\(po\.titulo \|\| 'Sin título'\)/);
  assert.match(vistas, /esc\(r\.texto\)/);
});

test('el foro de los miembros muestra «Zoorigen oficial» y no ofrece editar ni borrar', () => {
  assert.match(foro, /const INSIGNIA_OFICIAL = /);
  assert.match(foro, /Zoorigen oficial/);
  assert.match(foro, /oficial: data\.oficial === true/);
  assert.match(foro, /\$\{p\.oficial \? INSIGNIA_OFICIAL : ''\}/);
  assert.match(foro, /\$\{post\.oficial \? INSIGNIA_OFICIAL : ''\}/);
  assert.match(foro, /'oficial':/);
  // el navegador de un miembro no borra ni edita publicaciones (solo suma vistas, me gusta y respuestas)
  assert.doesNotMatch(foro, /collection\('foroPosts'\)\.doc\([^)]*\)\.delete\(/);
  assert.doesNotMatch(foro, /\.update\(\{\s*(title|content|oficial|authorName|authorUid)/);
  assert.doesNotMatch(foro, /oficial:\s*true/, 'el navegador no puede marcar nada como oficial');
});

test('las reglas de Firestore ya impiden que un miembro edite o borre lo que no escribió (las oficiales llevan un uid que no es de nadie)', () => {
  const reglas = leer('FIRESTORE-REGLAS-v6.txt');
  const foroReglas = reglas.slice(reglas.indexOf('match /foroPosts/{postId}'), reglas.indexOf('match /certificados'));
  assert.match(foroReglas, /allow delete: if isAdmin\(\)\s*\|\| \(isActiveVIP\(\) && resource\.data\.authorUid == request\.auth\.uid\);/);
  assert.match(foroReglas, /resource\.data\.authorUid == request\.auth\.uid\s*&& request\.resource\.data\.authorUid == resource\.data\.authorUid/);
  assert.match(foroReglas, /request\.resource\.data\.authorUid == request\.auth\.uid/, 'crear exige ser el autor');
});

/* ───────── Reglas de diseño ───────── */

test('sin degradados ni emojis en lo nuevo y la letra mínima sigue en 12 px', () => {
  for (const [n, t] of [['admin-club.css', css], ['admin-vistas.js', vistas], ['admin-panel.js', leer('assets/js/admin-panel.js')], ['admin-graficas.js', leer('assets/js/admin-graficas.js')]]) {
    assert.doesNotMatch(t, /gradient\(/i, n);
    assert.doesNotMatch(t, /[\p{Extended_Pictographic}\u{FE0F}]/u, n);
  }
  assert.doesNotMatch(foro.slice(foro.indexOf('INSIGNIA_OFICIAL')), /^[\s\S]{0,0}gradient/);
  for (const m of css.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) {
    const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
    assert.ok(px >= 11.99, `letra de ${px}px: ${m[0]}`);
  }
  assert.match(html, /sv\.oninput = null; sv\.onchange = null;/, 'al cambiar de sección se sueltan los oyentes de la anterior');
});

test('foro: la discusion nueva ya no guarda el correo del autor (lo leian los demas miembros)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'club-foro.html'), 'utf8');
  assert.doesNotMatch(html, /authorEmails*:/);
});
