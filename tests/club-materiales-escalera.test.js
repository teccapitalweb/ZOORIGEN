'use strict';

// Escalera de retos en PDFs y materiales: cada material cerrado dice «Se desbloquea con N retos» (barra y «Te faltan K retos» para miembros),
// y «o canjéalo por 100 créditos» (para todos); lo abierto dice «Desbloqueado»; orden ascendente y filtro Disponibles / Por desbloquear / Todos.
// Lo decide SIEMPRE el servidor (desbloqueado, faltan, requiereRetos); aquí solo se dibuja. Ejecutar: node --test tests/club-materiales-escalera.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const M = require('../assets/js/club-materiales.js');
const C = require('../assets/js/club-creditos.js');
const D = require('../assets/js/club-retos-datos.js');
const R = require('../assets/js/club-retos.js');

const mat = (id, extra) => Object.assign({ id, titulo: 'Material ' + id, tipo: 'excel', formato: 'excel', area: 'Sanidad', paginas: 3, acceso: 'retos', requiereRetos: 9, faltan: 4, desbloqueado: false, soloMiembros: false }, extra);

test('miembro con retos pendientes: «Se desbloquea con 9 retos», barra con lo avanzado y «Te faltan 4 retos»', () => {
  const h = M.materialCardHTML(mat('a'), {});
  assert.match(h, /Se desbloquea con 9 retos/);
  assert.match(h, /mt-prog--bloq" role="img" aria-label="5 de 9 retos"><i style="width:56%"/);
  assert.match(h, /Te faltan 4 retos · 5 de 9/);
  assert.match(h, /is-bloq/);
  assert.doesNotMatch(h, /Solo miembros/);
});

test('singular y plural: «Se desbloquea con 1 reto» y «Te faltan 1 reto»', () => {
  const h = M.materialCardHTML(mat('a', { requiereRetos: 1, faltan: 1 }), {});
  assert.match(h, /Se desbloquea con 1 reto</);
  assert.match(h, /Te faltan 1 reto ·/);
  assert.match(M.materialCardHTML(mat('b', { requiereRetos: 60, faltan: 57 }), {}), /Se desbloquea con 60 retos[\s\S]*Te faltan 57 retos · 3 de 60/);
});

test('sin membresía: «Solo miembros» y «Con membresía se desbloquea con N retos» (sin barra ni «Te faltan»)', () => {
  const h = M.materialCardHTML(mat('a', { soloMiembros: true, faltan: 9 }), {});
  assert.match(h, /Solo miembros/);
  assert.match(h, /Con membresía se desbloquea con 9 retos/);
  assert.doesNotMatch(h, /Te faltan|mt-prog/);
  assert.match(h, /is-previa/);
});

test('abierto (por retos, membresía o créditos): «Desbloqueado» una sola vez, con o sin la pieza de créditos', () => {
  const abierto = M.materialCardHTML(mat('a', { desbloqueado: true, faltan: 0 }), {});
  assert.match(abierto, /mt-doc__ok[^>]*>[\s\S]*Desbloqueado<\/span>/);
  assert.doesNotMatch(abierto, /Se desbloquea con|Te faltan/);
  const porCreditos = M.materialCardHTML(mat('a', { desbloqueado: true, faltan: 0 }), { canje: '<div class="zcr-canje"><span class="zcr-ins zcr-ins--ok">Desbloqueado</span></div>' });
  assert.equal((porCreditos.match(/Desbloqueado/g) || []).length, 1, 'no se repite');
  assert.match(M.estadoMaterialHTML({ id: 'x', desbloqueado: true, acceso: 'miembros' }, {}), /Desbloqueado/);
});

test('un material de solo membresía cerrado (sin retos) conserva su texto de siempre', () => {
  const h = M.materialCardHTML({ id: 'g', titulo: 'G', tipo: 'guia', area: 'A', acceso: 'miembros', requiereRetos: 0, faltan: 0, desbloqueado: false, soloMiembros: false }, {});
  assert.match(h, /mt-doc__lock/);
  assert.doesNotMatch(h, /Se desbloquea con|Te faltan/);
});

test('créditos para todos: «o canjéalo por 100 créditos» con el botón Canjear; sin la opción, el texto de siempre', () => {
  const item = { clave: 'pdf:a', costo: 100, desbloqueado: false };
  const alt = C.canjeHTML(item, 100, 100, { alternativa: true });
  assert.match(alt, /o canjéalo por 100 créditos/);
  assert.match(alt, /data-canjear="pdf:a"/);
  assert.match(alt, />Canjear</);
  const sinSaldo = C.canjeHTML(item, 0, 100, { alternativa: true });
  assert.match(sinSaldo, /o canjéalo por 100 créditos/);
  assert.match(sinSaldo, /Te faltan créditos/);
  assert.match(C.canjeHTML(item, 100, 100), /Canjeable por 100 créditos/);
  assert.doesNotMatch(C.canjeHTML(item, 100, 100), /o canjéalo/);
  assert.match(C.canjeHTML({ clave: 'pdf:a', desbloqueado: true }, 0, 100, { alternativa: true }), /Desbloqueado/);
  const js = leer('assets/js/club-materiales.js');
  assert.match(js, /var opc = \{ alternativa: true \};/);
  assert.match(js, /m\.canjeHTML\(c\.porClave\[tipo \+ ':' \+ id\], c\.saldo, c\.costo, opc\)/);
});

test('orden de escalera: lo de solo membresía primero y luego de menos a más retos; estable entre iguales', () => {
  const l = [mat('c', { requiereRetos: 12 }), mat('a', { requiereRetos: 0, acceso: 'miembros' }), mat('b', { requiereRetos: 3 }), mat('d', { requiereRetos: 3 }), mat('e', { requiereRetos: 60 }), mat('f', { requiereRetos: 6 })];
  assert.deepEqual(M.ordenarEscalera(l).map(m => m.id), ['a', 'b', 'd', 'f', 'c', 'e']);
  assert.deepEqual(l.map(m => m.id), ['c', 'a', 'b', 'd', 'e', 'f'], 'no modifica la lista original');
  assert.deepEqual(M.ordenarEscalera(null), []);
});

test('filtro Disponibles / Por desbloquear / Todos con sus cuentas', () => {
  const l = [mat('a', { desbloqueado: true }), mat('b'), mat('c'), mat('d', { desbloqueado: true })];
  const ids = x => x.map(m => m.id).join('');
  assert.equal(ids(M.filtrarDisponibilidad(l, 'disponibles')), 'ad');
  assert.equal(ids(M.filtrarDisponibilidad(l, 'por-desbloquear')), 'bc');
  assert.equal(ids(M.filtrarDisponibilidad(l, 'todos')), 'abcd');
  assert.equal(ids(M.filtrarDisponibilidad(l, 'raro')), 'abcd');
  const h = M.disponibilidadHTML(l, 'por-desbloquear');
  assert.match(h, /data-disp-filtro="todos" aria-pressed="false"><span>Todos<\/span><b>4<\/b>/);
  assert.match(h, /data-disp-filtro="disponibles" aria-pressed="false"><span>Disponibles<\/span><b>2<\/b>/);
  assert.match(h, /data-disp-filtro="por-desbloquear" aria-pressed="true"><span>Por desbloquear<\/span><b>2<\/b>/);
  assert.match(M.disponibilidadHTML([], 'x'), /data-disp-filtro="todos" aria-pressed="true"[\s\S]*<b>0<\/b>/);
});

test('la pantalla usa el orden y el filtro en libros, materiales y PDFs de Drive, y los botones cambian el filtro', () => {
  const js = leer('assets/js/club-materiales.js');
  assert.match(js, /var libros = filtrarDisponibilidad\(filtrarLibros\(/);
  assert.match(js, /var docs = ordenarEscalera\(filtrarDisponibilidad\(filtrarMateriales\(/);
  assert.match(js, /sueltosDrive = filtrarDisponibilidad\(sueltosDrive, estado\.disp\)/);
  assert.match(js, /data-disp-filtro'\)\s*;?\s*\n?\s*if \(fd\) \{ estado\.disp = fd\.getAttribute\('data-disp-filtro'\); pintar\(\); return; \}|estado\.disp = fd\.getAttribute\('data-disp-filtro'\)/);
  assert.match(js, /html \+= disponibilidadHTML\(/);
});

test('la escalera del catálogo es alcanzable con los retos que existen hoy en el sitio (con holgura)', () => {
  const total = D.quiz.length + D.orden.length + R.escenasActivas(D.detective).length;
  assert.equal(total, 116, 'retos distintos del camino: 32 quiz + 60 detective (Detective visual) + 24 ordena');
  const rutaCatalogo = path.join(RAIZ, '..', 'zoorigen-webhook', 'data', 'materiales', 'catalogo.json');
  if (!fs.existsSync(rutaCatalogo)) return;   // el servidor vive en otra carpeta: si no está, solo se comprueba el total
  const umbrales = JSON.parse(fs.readFileSync(rutaCatalogo, 'utf8')).filter(m => m.acceso === 'retos').map(m => m.requiereRetos);
  assert.ok(umbrales.length >= 23);
  assert.ok(Math.max(...umbrales) <= Math.floor(total * 0.9), 'el umbral más alto no pasa del 90 % de los retos que existen');
});

test('estilos nuevos: colores sólidos, letra de 12 px o más y sin emojis', () => {
  const css = leer('assets/css/club-materiales.css');
  const b = css.slice(css.indexOf('Cómo se abre cada material'));
  assert.ok(b.length > 300);
  assert.doesNotMatch(b, /gradient/i);
  for (const m of b.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])) >= 12, m[0]);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(b));
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(M.estadoMaterialHTML(mat('a'), {})));
});
