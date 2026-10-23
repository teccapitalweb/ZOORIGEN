'use strict';
// Aviso en la campana por cada regalo de créditos: «Recibiste N créditos» -> PDFs y materiales (solo canjeables).
// Ejecutar: node --test tests/club-avisos-creditos.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../assets/js/club-avisos.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const AHORA = new Date('2026-10-22T18:00:00Z');
const hace = ms => new Date(AHORA.getTime() - ms).toISOString();
const regalo = (id, cantidad, ms) => ({ id, cantidad, en: hace(ms) });

test('«Recibiste N créditos» con singular y plural correctos, y el subtítulo pedido', () => {
  const a = A.deRegalo(regalo('regalo_abc', 300, 3600000));
  assert.equal(a.titulo, 'Recibiste 300 créditos');
  assert.equal(a.texto, 'Canjéalos por el material que quieras');
  assert.equal(A.deRegalo(regalo('regalo_uno', 1, 1000)).titulo, 'Recibiste 1 crédito');
  assert.equal(A.deRegalo(regalo('regalo_mil', 1000, 1000)).titulo.replace(/\s/g, ' '), 'Recibiste 1,000 créditos');
  assert.equal(A.textoCreditos(100), '100 créditos'); assert.equal(A.textoCreditos(1), '1 crédito');
  assert.equal(a.tipo, 'creditos'); assert.equal(a.ambito, 'personal');
  assert.equal(a.enlace, 'club-pdfs.html?canjeables=1');
  assert.equal(A.DESTINO_CREDITOS, 'club-pdfs.html?canjeables=1');
});

test('el id del aviso sale del id estable del movimiento; datos raros no producen avisos', () => {
  assert.equal(A.deRegalo(regalo('regalo_abc', 100, 1)).id, 'creditos_regalo_abc');
  for (const malo of [null, {}, { id: '', cantidad: 5 }, { id: 'a/b', cantidad: 5 }, { id: 'ok', cantidad: 0 }, { id: 'ok', cantidad: -3 }, { id: 'ok', cantidad: 'mucho' }]) assert.equal(A.deRegalo(malo), null, JSON.stringify(malo));
  assert.deepEqual(A.deRegalos(null, AHORA), []);
  assert.deepEqual(A.deRegalos({}, AHORA), [], 'servidor viejo: sin campo, sin avisos');
  assert.deepEqual(A.deRegalos({ regalos: 'x' }, AHORA), []);
});

test('solo los de los últimos 30 días; varios regalos son varios avisos, el más nuevo primero, sin repetir', () => {
  const dia = 86400000;
  const r = { regalos: [regalo('r1', 100, dia), regalo('r2', 250, 2 * dia), regalo('viejo', 500, 31 * dia), regalo('r1', 100, dia)] };
  const lista = A.mezclar(A.deRegalos(r, AHORA));
  assert.deepEqual(lista.map(x => x.id), ['creditos_r1', 'creditos_r2']);
  assert.deepEqual(lista.map(x => x.titulo), ['Recibiste 100 créditos', 'Recibiste 250 créditos']);
  assert.equal(A.DIAS_REGALO, 30);
});

test('leído y borrado se recuerdan por cuenta con el id estable; recargar no lo vuelve a poner como nuevo', () => {
  const lista = A.mezclar(A.deRegalos({ regalos: [regalo('r1', 300, 1000)] }, AHORA));
  let e = A.estadoVacio();
  assert.equal(A.noLeidas(lista, e).length, 1, 'punto de no leído y contador sumado');
  e = A.conLeidos(e, ['creditos_r1']);
  assert.equal(A.noLeidas(lista, e).length, 0);
  // Se guarda y se lee otra vez (como al recargar la página)
  const almacen = (() => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; })();
  A.guardarEstado(almacen, 'uidAna', e);
  const recargado = A.leerEstado(almacen, 'uidAna');
  const lista2 = A.mezclar(A.deRegalos({ regalos: [regalo('r1', 300, 1000)] }, AHORA));
  assert.equal(A.noLeidas(lista2, recargado).length, 0, 'no reaparece como no leído');
  assert.equal(A.noLeidas(lista2, A.leerEstado(almacen, 'otraCuenta')).length, 1, 'cada cuenta lleva lo suyo');
  const borrado = A.conBorrados(recargado, ['creditos_r1']);
  assert.equal(A.visibles(lista2, borrado).length, 0, 'borrado: ya no se ve');
});

test('el destino es seguro: acepta club-pdfs.html?canjeables=1 y rechaza lo demás', () => {
  assert.equal(A.destino('club-pdfs.html?canjeables=1'), 'club-pdfs.html?canjeables=1');
  assert.equal(A.destino('club-pdfs.html'), 'club-pdfs.html');
  for (const mal of ['club-pdfs.html?x=<script>', 'https://malo.example/club-pdfs.html', '//malo.example', 'club-pdfs.html?a=1#b', 'javascript:alert(1)', 'club-pdfs.html?' + 'a'.repeat(60)]) assert.equal(A.destino(mal), '', mal);
});

test('el aviso entra a la mezcla sin pisar a los demás y no usa emoji', () => {
  const lista = A.mezclar([{ id: 'dato1', tipo: 'dato', titulo: 'Dato curioso', fecha: hace(5 * 3600000) }], A.deRegalos({ regalos: [regalo('r1', 100, 3600000)] }, AHORA));
  assert.deepEqual(lista.map(x => x.id), ['creditos_r1', 'dato1']);
  assert.equal(A.PRESET.creditos.icono, 'wallet');
  assert.match(A.PRESET.creditos.color, /^#[0-9A-Fa-f]{6}$/);
  assert.doesNotMatch(A.deRegalo(regalo('r1', 100, 1)).titulo, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test('la campana pide /api/creditos/regalos con tolerancia a fallos y la fila lleva aria-label con el texto completo', () => {
  const js = leer('assets/js/club-avisos.js');
  assert.match(js, /o\.apiFetch\('\/api\/creditos\/regalos'\)[\s\S]*?catch\(function \(\) \{ return \[\]; \}\)/, 'si el servidor no responde, la campana sigue');
  assert.match(js, /Promise\.all\(\[servidor, local, regalos\]\)/);
  assert.match(js, /role="link" tabindex="0" aria-label="'/);
  assert.match(js, /etiqueta = a\.titulo \+ \(a\.texto/);
  assert.match(js, /window\.ZOO_ICONOS\.svg\('wallet'/, 'ícono de cartera (Lucide)');
});

test('todas las páginas con campana cargan la versión nueva de club-avisos.js y la hoja de la campana respeta 12 px y 40 px', () => {
  const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html') && /club-avisos\.js\?v=/.test(leer('pages/' + f)));
  assert.equal(paginas.length, 18);
  const versiones = new Set(paginas.map(f => /club-avisos\.js\?v=([\w.-]+)/.exec(leer('pages/' + f))[1]));
  assert.deepEqual([...versiones], ['20261210-creditos']);
  const shell = leer('assets/css/club-shell.css');
  for (const m of shell.matchAll(/\.av-[a-z_-]+[^{]*\{[^}]*font-size:\s*([\d.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1])) >= 12, m[0].slice(0, 60));
  assert.match(leer('assets/css/club-responsivo.css'), /\.av-cerrar, \.notif-panel__close, \.av-borrar, \.av-todo/);
});

test('PDFs y materiales ya entiende ?canjeables=1 (solo canjeables, con el saldo visible)', () => {
  const js = leer('assets/js/club-materiales.js');
  assert.match(js, /canjeables=1/);
  assert.match(js, /soloCanjeables/);
});
