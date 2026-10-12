'use strict';
// Herramientas legales e íconos: montos de la Ley Federal de Derechos, datos sin inventar y sin emojis
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../assets/js/herramientas-iconos.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const LEGAL = leer('pages/club-legal.html');
const CLINICA = leer('pages/club-herramientas.html');
const CALC = leer('assets/js/herramientas-calculos.js');

function extraer(html, nombre) {
  const m = html.match(new RegExp('const ' + nombre + ' = (\\{[\\s\\S]*?\\n\\}|\\[[\\s\\S]*?\\n\\]);'));
  assert.ok(m, 'no se encontró ' + nombre);
  const ico = n => '<svg class="zi" aria-hidden="true"><use href="#zi-' + n + '"/></svg>';
  return new Function('ico', 'return ' + m[1])(ico);
}

const EMOJI = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|☰/u;

test('ninguna de las dos herramientas ni el módulo de cálculos usa emojis', () => {
  for (const [nombre, t] of [['legal', LEGAL], ['clínica', CLINICA], ['cálculos', CALC]]) {
    const m = t.match(EMOJI);
    assert.ok(!m, nombre + ' todavía tiene el emoji ' + (m && m[0]));
  }
});

test('todos los íconos que se usan existen en el conjunto (Lucide)', () => {
  const nombres = new Set(I.nombres());
  const usados = new Set();
  for (const t of [LEGAL, CLINICA, CALC]) for (const m of t.matchAll(/#zi-([a-z0-9-]+)/g)) usados.add(m[1]);
  assert.ok(usados.size > 20);
  for (const u of usados) assert.ok(nombres.has(u), 'falta el ícono ' + u);
  // cada ícono dibuja algo
  for (const n of nombres) assert.match(I.ICONOS[n], /<(path|circle|rect|line|polyline|polygon)/, n);
  assert.match(I.i('pill'), /#zi-pill/);
  assert.equal(I.i('no-existe'), '');
  assert.match(I.sprite(), /<symbol id="zi-pill"/);
});

test('derechos: cada monto coincide con la Ley Federal de Derechos 2026 (DOF 07-11-2025, RMF 28-12-2025)', () => {
  const C = extraer(LEGAL, 'CUOTAS');
  const por = Object.fromEntries(C.map(c => [c.id, c.price]));
  const esperado = {
    'registro-vs': 685.83,          // 194-F-1 I
    'cites-solicitud': 880.20,      // 194-F B II
    'colecta-extranjeros': 24977.08,// 194-F B I
    'colecta-parental': 1047.51,    // 194-F B III
    'colecta-biotec': 25309.81,     // 194-F B IV
    'caza-prestador': 1903.77,      // 194-F-1 II
    'caza-cintillo': 441.34,        // 194-F-1 III
    'caza-lic-anual': 857.12,       // 194-F-1 IV a
    'caza-lic-indef': 2665.16,      // 194-F-1 IV b
    'estudios-g1': 30.67, 'estudios-g2': 41.38, 'estudios-g3': 51.65, 'estudios-sup': 15.15, // 194-G
    'mia-preventivo': 17975.34,     // 194-H I
    'mia-part-a': 48338.98, 'mia-part-b': 96680.23, 'mia-part-c': 145021.50,   // 194-H II
    'mia-reg-a': 63258.58, 'mia-reg-b': 126514.87, 'mia-reg-c': 189771.14,     // 194-H III
    'mia-modif': 12952.55, 'mia-exencion': 5941.17,                            // 194-H VI, VIII
    'forestal-k2': 7745.33, 'forestal-k3': 10585.30, 'forestal-k4': 13554.36,  // 194-K
    'forestal-rfn': 645.44          // 194-N-1
  };
  for (const [id, monto] of Object.entries(esperado)) assert.equal(por[id], monto, id);
  assert.equal(C.length, Object.keys(esperado).length, 'hay conceptos que no están verificados');
  const ids = new Set(C.map(c => c.id));
  assert.equal(ids.size, C.length, 'ids repetidos');
  for (const c of C) assert.match(c.ref, /^LFD art\. 194-/, c.id + ' sin artículo');
});

test('derechos: no se suma IVA y no quedan los códigos ni montos inventados', () => {
  assert.doesNotMatch(LEGAL, /IVA 16|cuotaIva|cuotaSubtotal|\* 0\.16/);
  for (const falso of ['194-CI', '194-A', '195-L1', 'HGI-T', '2,450', '3,400 MXN', '58000', '22500']) {
    assert.ok(!LEGAL.includes(falso), 'sigue apareciendo ' + falso);
  }
});

test('texto legal: sin las afirmaciones que no coinciden con la Ley', () => {
  assert.doesNotMatch(LEGAL, /\bSMG\b/, 'las multas son en UMA, no en salarios mínimos');
  assert.doesNotMatch(LEGAL, /marzo-abril/i, 'el informe anual es de abril a junio');
  assert.doesNotMatch(LEGAL, /SIMEC/);
  assert.doesNotMatch(LEGAL, /SEMARNAT-08-0\d\d/, 'códigos de formato sin verificar');
  assert.doesNotMatch(LEGAL, /INFORME DE INFORME/);
  assert.doesNotMatch(LEGAL, /Formato oficial SEMARNAT/);
  assert.match(LEGAL, /de abril a junio/);
  assert.match(LEGAL, /20 a 5,000/);
  assert.match(LEGAL, /200 a 75,000/);
  assert.match(LEGAL, /3 días hábiles/);
  assert.match(LEGAL, /DOF 16-07-2025/);
});

test('NOM-059: sin campo IUCN, sin especies inventadas y con CITES coherente', () => {
  const N = extraer(LEGAL, 'NOM059');
  assert.ok(N.length >= 40);
  const quitadas = ['Callinectes sapidus', 'Lithobates catesbeianus', 'Patagona gigas', 'Ceroxylon alpinum', 'Dasypus mexicanus', 'Puma concolor'];
  for (const q of quitadas) assert.ok(!N.some(s => s.cientifico === q), q + ' no debe estar');
  for (const s of N) {
    assert.ok(['P', 'A', 'Pr', 'E'].includes(s.cat), s.cientifico);
    assert.ok(['I', 'II', 'III', '—', 'verificar'].includes(s.cites), s.cientifico + ' cites ' + s.cites);
    assert.ok(!('iucn' in s), 'IUCN sin verificar en ' + s.cientifico);
  }
  const c = Object.fromEntries(N.map(s => [s.cientifico, s]));
  // los ejemplos del texto de CITES coinciden con la tabla
  assert.equal(c['Leopardus pardalis'].cites, 'I');
  assert.equal(c['Falco peregrinus'].cites, 'I');
  assert.equal(c['Ateles geoffroyi'].cites, 'II');
  assert.doesNotMatch(LEGAL, /Ejemplos mexicanos:<\/strong> Jaguar, tapir, manatí, vaquita marina, lobo mexicano, mono araña/);
});

test('copiar y almacenamiento: con control de errores', () => {
  assert.match(LEGAL, /async function zlCopiar/);
  assert.doesNotMatch(LEGAL, /navigator\.clipboard\.writeText\([^)]*\)\.then/);
  assert.doesNotMatch(LEGAL, /\balert\(/);
  assert.doesNotMatch(LEGAL, /localStorage\.(getItem|setItem|removeItem)\(('zooChecklist|'zoo)/, 'el almacenamiento va dentro de zlAlmacen');
  assert.match(LEGAL, /const zlAlmacen = \{[\s\S]*try \{ const v = localStorage\.getItem/);
});

test('las dos páginas muestran un aviso de material de referencia y no dejan la página en blanco sin membresía', () => {
  assert.match(LEGAL, /no es asesoría legal/i);
  assert.match(CLINICA, /no sustituyen el criterio del médico veterinario/);
  for (const t of [LEGAL, CLINICA]) {
    assert.match(t, /Ver planes/);
    assert.match(t, /club-suscripcion\.html/);
    assert.match(t, /herramientas-iconos\.js\?v=\w+/);
  }
});

// ── Barrido de emojis en todo el sitio ──
const archivosVivos = () => {
  const salida = [];
  for (const d of ['pages', 'assets/js']) {
    for (const f of fs.readdirSync(path.join(RAIZ, d))) if (/\.(html|js)$/.test(f)) salida.push(d + '/' + f);
  }
  // Código que ninguna página carga (sw.js lo documenta como muerto): no se muestra a nadie.
  const muertos = new Set(['assets/js/admin.js', 'assets/js/club-extra.js', 'assets/js/especies-data.js', 'assets/js/stripe-config.js']);
  return salida.filter(f => !muertos.has(f));
};

test('ninguna pantalla que se muestra usa emojis', () => {
  const fallas = [];
  for (const rel of archivosVivos()) {
    const t = leer(rel).replace(/[©®™]/g, '');
    const m = t.match(EMOJI);
    if (m) fallas.push(rel + ' → ' + m[0]);
  }
  assert.deepEqual(fallas, []);
});

test('todos los íconos #zi-* de todas las pantallas existen en el conjunto', () => {
  const nombres = new Set(I.nombres());
  const faltan = [];
  for (const rel of archivosVivos()) {
    if (rel === 'assets/js/herramientas-iconos.js') continue;
    for (const m of leer(rel).matchAll(/#zi-([a-z0-9-]+)/g)) if (!nombres.has(m[1])) faltan.push(rel + ' → ' + m[1]);
  }
  assert.deepEqual(faltan, []);
});

test('cada página que usa íconos carga el módulo de íconos', () => {
  const sin = [];
  for (const f of fs.readdirSync(path.join(RAIZ, 'pages')).filter(n => n.endsWith('.html'))) {
    const t = leer('pages/' + f);
    const usa = /#zi-|zi-logo/.test(t) || /assets\/js\/club\.js/.test(t);
    if (usa && !/herramientas-iconos\.js/.test(t)) sin.push(f);
  }
  assert.deepEqual(sin, ['club-noticias.html'.replace('club-noticias.html', '')].filter(Boolean));
});
