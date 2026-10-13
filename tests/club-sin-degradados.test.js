'use strict';
// El panel del Club usa colores SÓLIDOS (verde de marca predominante, dorado solo de acento).
// Esta prueba falla si reaparece un degradado decorativo con 2 o más colores no neutros en los estilos del panel.
//
// Lo que SÍ se permite (y por qué):
//   - Scrims funcionales: negro / verde casi negro -> transparente sobre fotos, para que el texto se lea.
//   - Brillos y sombras con blancos, negros o grises (esqueletos de carga, lomo de libro, papel rayado).
//   - Una capa plana de UN solo color encima de una foto: linear-gradient(c, c).
// Lista blanca (archivos que NO se revisan), con su razón:
//   - assets/css/club-juegos.css      : juegos, diseño aprobado por el dueño.
//   - assets/css/club-extra.css       : hoja heredada que ninguna página carga (se comprueba abajo).
//   - pages/club-certificados.html y pages/ver-certificado.html : certificado, diseño aprobado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const LISTA_BLANCA = new Set([
  'assets/css/club-juegos.css',
  'assets/css/club-extra.css',
  'pages/club-certificados.html',
  'pages/ver-certificado.html'
]);

function archivosDelPanel() {
  const css = fs.readdirSync(path.join(RAIZ, 'assets/css')).filter(f => /^club-.*\.css$/.test(f) || f === 'club.css').map(f => 'assets/css/' + f);
  const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => /^club-.*\.html$/.test(f) || f === 'admin-club.html').map(f => 'pages/' + f);
  const extra = ['assets/css/admin-redesign.css', 'assets/css/auth-redesign.css', 'assets/js/club.js', 'assets/js/club-premios.js'];
  return [...css, ...paginas, ...extra].filter(f => !LISTA_BLANCA.has(f) && fs.existsSync(path.join(RAIZ, f)));
}

const VARIABLES = {
  '--zoo-amber': '232,163,23', '--zoo-green-900': '31,95,58', '--zoo-green-800': '23,69,40', '--zoo-green-700': '47,122,79',
  '--zoo-green-500': '111,191,115', '--zoo-solid': '31,95,58', '--zoo-solid-dark': '23,74,45', '--zoo-solid-mid': '42,122,78',
  '--zoo-fill': '42,122,78', '--zoo-tint': '234,242,236', '--zoo-tint-2': '220,235,224', '--zoo-orange': '213,90,40', '--zoo-blue': '42,164,213'
};

function partir(texto) {
  const partes = []; let nivel = 0, ini = 0;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '(') nivel++; else if (c === ')') nivel--; else if (c === ',' && nivel === 0) { partes.push(texto.slice(ini, i)); ini = i + 1; }
  }
  partes.push(texto.slice(ini));
  return partes.map(s => s.trim()).filter(Boolean);
}

// Devuelve { rgb:[r,g,b], a } | { dinamico:string } | null (no es un color: ángulo, forma, posición)
function resolverColor(arg) {
  const s = arg.replace(/(\s+-?[\d.]+(%|px|deg|em|turn)?)+$/i, '').trim();
  if (!s || /^(to |from |circle|ellipse|closest|farthest|at |in |-?[\d.]+(deg|turn|%|px))/i.test(s) || /^-?[\d.]+(deg|turn)?$/i.test(s)) return null;
  if (/^transparent$/i.test(s)) return { rgb: [0, 0, 0], a: 0 };
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (m) return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] };
  m = s.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/);
  if (m) {
    if (VARIABLES[m[1]]) return { rgb: VARIABLES[m[1]].split(',').map(Number), a: 1 };
    if (m[2] && /^(#|rgb)/.test(m[2].trim())) return resolverColor(m[2].trim());
    return { dinamico: s };
  }
  if (/^(white)$/i.test(s)) return { rgb: [255, 255, 255], a: 1 };
  if (/^(black)$/i.test(s)) return { rgb: [0, 0, 0], a: 1 };
  return { dinamico: s };
}

function esNeutro(c) {
  if (c.dinamico) return false;
  if (c.a === 0) return true;
  const mx = Math.max(...c.rgb), mn = Math.min(...c.rgb);
  return mx <= 45 || (mx - mn) <= 14; // casi negro (aunque verdoso), blanco, grises
}

function degradados(texto) {
  const salida = []; const re = /(repeating-)?(linear|radial|conic)-gradient\(/g; let m;
  while ((m = re.exec(texto))) {
    let i = m.index + m[0].length, nivel = 1;
    while (i < texto.length && nivel > 0) { if (texto[i] === '(') nivel++; else if (texto[i] === ')') nivel--; i++; }
    salida.push({ expr: texto.slice(m.index, i), interno: texto.slice(m.index + m[0].length, i - 1), repetido: !!m[1], pos: m.index });
    re.lastIndex = i;
  }
  return salida;
}

function coloresDistintosNoNeutros(interno) {
  const llaves = new Set();
  for (const arg of partir(interno)) {
    const c = resolverColor(arg);
    if (!c || esNeutro(c)) continue;
    llaves.add(c.dinamico ? c.dinamico.replace(/\s+/g, ' ') : c.rgb.join(','));
  }
  return [...llaves];
}

test('el panel no tiene degradados decorativos de 2 o más colores (solo colores sólidos y scrims neutros)', () => {
  const culpables = [];
  for (const f of archivosDelPanel()) {
    const t = leer(f);
    for (const g of degradados(t)) {
      if (g.repetido) continue;
      const colores = coloresDistintosNoNeutros(g.interno);
      if (colores.length >= 2) culpables.push(`${f}:${t.slice(0, g.pos).split('\n').length}  ${g.expr.slice(0, 110)}`);
    }
  }
  assert.deepEqual(culpables, [], 'degradados multicolor en el panel:\n' + culpables.join('\n'));
});

test('el detector de la prueba distingue scrims neutros de degradados de color', () => {
  const caso = e => coloresDistintosNoNeutros(degradados(e)[0].interno).length;
  assert.equal(caso('linear-gradient(180deg, transparent 40%, rgba(14,31,20,0.6) 100%)'), 0, 'scrim verde casi negro');
  assert.equal(caso('linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)'), 0, 'scrim negro');
  assert.equal(caso('linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.09))'), 0, 'esqueleto');
  assert.equal(caso('linear-gradient(rgba(31, 95, 58, .9), rgba(31, 95, 58, .9))'), 1, 'capa plana de un color');
  assert.ok(caso('linear-gradient(135deg, #E8A317, #D68A0A)') >= 2, 'dorado a dorado oscuro');
  assert.ok(caso('linear-gradient(135deg, #1F5F3A 0%, #0F3B22 60%, #2AA4D5 120%)') >= 2, 'verde a azul');
  assert.ok(caso('conic-gradient(from 210deg, var(--a), var(--b))') >= 2, 'cónico con variables');
});

test('la lista blanca es honesta: ninguna página carga club-extra.css', () => {
  for (const f of fs.readdirSync(path.join(RAIZ, 'pages')).filter(x => x.endsWith('.html'))) {
    assert.equal(leer('pages/' + f).includes('club-extra.css'), false, f + ' carga club-extra.css (hoja con degradados morados)');
  }
});

test('tokens de color sólido definidos una vez en club.css y banner de acceso gratuito en verde liso', () => {
  const css = leer('assets/css/club.css');
  for (const t of ['--zoo-solid: #1F5F3A', '--zoo-solid-dark: #174A2D', '--zoo-solid-mid: #2A7A4E', '--zoo-tint', '--zoo-fill']) {
    assert.ok(css.includes(t), 'falta el token ' + t);
  }
  const js = leer('assets/js/club.js');
  const i = js.indexOf("banner.id = 'zooPayBanner'");
  assert.ok(i > 0, 'banner de acceso gratuito');
  const bloque = js.slice(i, i + 1400);
  assert.match(bloque, /background:var\(--zoo-solid, #1F5F3A\);color:#fff/, 'fondo verde liso con texto blanco');
  assert.match(bloque, /zoo-pay-banner__btn" style="background:#fff;color:#1F5F3A/, 'botón blanco con texto verde');
  assert.doesNotMatch(bloque, /gradient|box-shadow:0 6px 18px rgba\(232/, 'sin degradado ni sombra dorada');
});
