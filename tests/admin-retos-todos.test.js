'use strict';
// Panel de administración > Retos: lista a TODAS las personas (también con 0 retos) con XP total, nivel y desglose,
// buscador, filtros, orden, gráficas (por tipo, por nivel y por día) y los cambios de orden de cursos en la ficha.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const vistas = leer('assets/js/admin-vistas.js');
const retos = vistas.slice(vistas.indexOf('/* ───────── RETOS Y XP'), vistas.indexOf('/* ───────── FORO Y DIRECTORIO'));

test('la sección Retos pide las personas y sus gráficas al servidor y no inventa cifras', () => {
  assert.ok(retos.includes("'/api/admin/retos/usuarios'"));
  assert.match(retos, /par\[1\]\.graficas/);
  assert.match(retos, /rEst\.total = par\[1\]\.total/);
  assert.doesNotMatch(retos, /\b(valor|n|superados|retos): [1-9]\d*[,}]/, 'ninguna cifra fija');
});

test('la tabla trae XP total y de retos, nivel, tipo, días, última vez, cambio de orden y el botón Ver historial', () => {
  for (const t of ['XP total', 'Nivel ', 'Retos superados', 'Por tipo (superados)', 'Días activos', 'Última vez', 'Cambio de orden', 'Ver historial', 'XP de retos:', 'Membresía activa', 'Sin membresía']) {
    assert.ok(retos.includes(t), 'falta: ' + t);
  }
  assert.match(retos, /data-accion="ficha" data-uid=/, 'el historial se abre con la ficha');
  assert.match(retos, /u\.xpTotal/);
  assert.match(retos, /u\.nivel\.nombre/);
});

test('buscador, filtro (todas, con retos, sin retos) y orden (XP, retos, última vez, nombre); por defecto XP de mayor a menor', () => {
  assert.match(retos, /uOrden: 'xp'/);
  assert.match(retos, /uMostrar: 'todos'/);
  for (const id of ['apRUQ', 'apRUMostrar', 'apRUOrden', 'Sin retos todavía', 'Con retos', 'Última vez', 'XP total (mayor a menor)']) assert.ok(retos.includes(id), id);
  // las personas con 0 retos NO se filtran en el modo "todas"
  const f = retos.slice(retos.indexOf('function pintarUsuariosRetos'), retos.indexOf('function pintarUsuariosRetos') + 900);
  assert.match(f, /uMostrar === 'con'/);
  assert.match(f, /uMostrar === 'sin'/);
});

test('gráficas: retos por tipo, personas por nivel y retos por día (30 días), con la nota de qué es total y qué es historial', () => {
  for (const t of ['Qué retos resuelven más', 'Personas por nivel', 'Retos superados por día', 'G.barrasH', 'G.serie', 'G.activar(vista())']) assert.ok(retos.includes(t), t);
  assert.match(retos, /incluye lo de antes del historial detallado/);
  assert.match(retos, /lo anterior solo tiene totales por persona/);
  assert.match(retos, /g\.porTipo/);
  assert.match(retos, /g\.niveles/);
  assert.match(retos, /g\.porDia/);
});

test('la ficha del miembro muestra sus cambios de orden de cursos', () => {
  assert.match(vistas, /cambioOrdenFichaDato\(r\.retos\.cambioOrden, dato\)/);
  assert.match(vistas, /cambioOrdenFichaLista\(r\.retos\.cambioOrden\)/);
  assert.match(vistas, /Cambios de orden de cursos/);
});

test('sin emojis ni degradados en lo nuevo del panel', () => {
  assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(retos), false);
  assert.equal(/gradient/.test(retos), false);
});

test('el panel carga las vistas con la misma versión que su hoja de estilos', () => {
  const html = leer('pages/admin-club.html');
  const v = html.match(/admin-club\.css\?v=([\w-]+)/)[1];
  assert.match(html, new RegExp('admin-vistas\\.js\\?v=' + v + '"'));
  assert.match(html, new RegExp('admin-graficas\\.js\\?v=' + v + '"'));
});
