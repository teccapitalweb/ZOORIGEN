'use strict';
// Sistema responsivo del Club y de la cuenta: viewport que permite zoom, hoja fluida cargada con versión,
// escala de letra con clamp(), piso de 12 px y sin degradados en la hoja nueva.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

// Páginas del Club y de cuenta. La portada y las de certificado/verificación las rediseña otra persona.
const PAGINAS = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html') && !['ver-certificado.html', 'verificar.html'].includes(f));
const CON_CLUB_CSS = PAGINAS.filter(f => /assets\/css\/club\.css/.test(leer('pages/' + f)));

// ── lógica pura: tamaños de letra menores a 12 px en un texto CSS ──
function aPx(valor, unidad) {
  if (unidad === 'px') return valor;
  if (unidad === 'pt') return valor * 4 / 3;
  return valor * 16; // rem / em tomados sobre 16 px
}
function tamanosMenoresA(css, minimo) {
  const encontrados = [];
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const reFontSize = /font-size\s*:\s*(\d*\.?\d+)(px|rem|em|pt)\b/g;
  const reAtajo = /(?<![-\w])font\s*:\s*(?:(?:italic|normal|oblique|small-caps)\s+)*(?:\d{3}\s+)?(\d*\.?\d+)(px|rem|em|pt)(?=\s*\/|\s)/g;
  for (const re of [reFontSize, reAtajo]) {
    let m;
    while ((m = re.exec(sinComentarios))) {
      const v = parseFloat(m[1]);
      if (v > 0 && aPx(v, m[2]) < minimo) encontrados.push(m[0]);
    }
  }
  return encontrados;
}

test('lógica pura: el detector de letra pequeña entiende rem, px, em y el atajo font', () => {
  assert.deepEqual(tamanosMenoresA('a{font-size:.7rem}', 12), ['font-size:.7rem']);
  assert.deepEqual(tamanosMenoresA('a{font-size: 11px}', 12), ['font-size: 11px']);
  assert.deepEqual(tamanosMenoresA('a{font: 700 .66rem/1 Inter}', 12), ['font: 700 .66rem']);
  assert.deepEqual(tamanosMenoresA('a{font-size:.75rem;font-size:12px;font: 600 .8rem Inter}', 12), []);
  assert.deepEqual(tamanosMenoresA('/* font-size: 9px */ a{font-size:0}', 12), []);
  assert.deepEqual(tamanosMenoresA('a{font-size: clamp(.8rem, 1vw, 1rem)}', 12), []);
});

test('todas las páginas del Club y de cuenta declaran el viewport sin bloquear el zoom y html lang="es"', () => {
  assert.ok(PAGINAS.length >= 25, 'se esperaban las páginas del Club');
  for (const f of PAGINAS) {
    const html = leer('pages/' + f);
    const metas = [...html.matchAll(/<meta\s+name="viewport"\s+content="([^"]*)"/g)].map(m => m[1]);
    assert.equal(metas.length, 1, `${f}: debe tener exactamente un meta viewport`);
    assert.equal(metas[0], 'width=device-width, initial-scale=1', `${f}: viewport distinto del estándar`);
    assert.doesNotMatch(metas[0], /maximum-scale|user-scalable/i, `${f}: no debe bloquear el zoom`);
    assert.match(html, /<html\s+lang="es"/, `${f}: falta lang="es"`);
  }
});

test('las páginas con club.css cargan club-responsivo.css con ?v= y DESPUÉS de las demás hojas del Club', () => {
  assert.ok(CON_CLUB_CSS.length >= 20);
  for (const f of CON_CLUB_CSS) {
    const html = leer('pages/' + f);
    const enlaces = [...html.matchAll(/<link[^>]+href="([^"]*assets\/css\/[^"]+\.css[^"]*)"/g)].map(m => m[1]);
    const idx = enlaces.findIndex(h => /club-responsivo\.css\?v=[\w.-]+$/.test(h));
    assert.ok(idx >= 0, `${f}: falta club-responsivo.css?v=`);
    const despues = enlaces.slice(idx + 1).filter(h => /\/(club|admin|auth)[\w-]*\.css/.test(h));
    assert.deepEqual(despues, [], `${f}: hay hojas del Club después de la responsiva`);
    // la hoja responsiva va al final del <head> para ganar a los estilos de página
    const pos = html.indexOf('club-responsivo.css');
    const finHead = html.indexOf('</head>');
    const ultimoStyle = html.lastIndexOf('<style', finHead);
    assert.ok(pos > ultimoStyle, `${f}: club-responsivo.css debe ir después de los <style> del <head>`);
  }
});

test('la versión de club-responsivo.css es la misma de club.css y el service worker la precachea', () => {
  const sw = leer('sw.js');
  for (const f of CON_CLUB_CSS) {
    const html = leer('pages/' + f);
    const vResp = (html.match(/club-responsivo\.css\?v=([\w.-]+)/) || [])[1];
    const vClub = (html.match(/club\.css\?v=([\w.-]+)/) || [])[1];
    assert.ok(vResp && vClub, f);
    assert.equal(vResp, vClub, `${f}: club-responsivo.css y club.css deben compartir versión`);
  }
  const v = (leer('pages/club-dashboard.html').match(/club-responsivo\.css\?v=([\w.-]+)/) || [])[1];
  assert.ok(sw.includes(`/assets/css/club-responsivo.css?v=${v}`), 'sw.js debe precachear club-responsivo.css con la misma versión');
});

test('la hoja responsiva define tokens fluidos con clamp(), objetivo táctil de 44 px y zona segura', () => {
  const css = leer('assets/css/club-responsivo.css');
  for (const token of ['--zoo-gutter', '--zoo-fs-base', '--zoo-fs-h1', '--zoo-fs-h2', '--zoo-fs-h3', '--zoo-fs-sm']) {
    assert.match(css, new RegExp(token + '\\s*:\\s*clamp\\('), `${token} debe usar clamp()`);
  }
  assert.match(css, /--zoo-gutter:\s*clamp\(14px,\s*4vw,\s*32px\)/);
  assert.match(css, /--zoo-tap:\s*44px/);
  // cuerpo mínimo de 16 px
  assert.match(css, /--zoo-fs-base:\s*clamp\(1rem,/);
  // zona segura y altura dinámica para ventanas y barra inferior
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /100dvh/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  // rejilla principal que no se ensancha con el contenido
  assert.match(css, /grid-template-columns:\s*240px minmax\(0,\s*1fr\)/);
});

test('la hoja responsiva no introduce degradados ni bloquea el zoom', () => {
  const css = leer('assets/css/club-responsivo.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /gradient\s*\(/i, 'sin degradados');
  assert.doesNotMatch(css, /maximum-scale|user-scalable/i);
  // sin letra por debajo de 12 px
  assert.deepEqual(tamanosMenoresA(css, 12), []);
});

test('ningún CSS del Club ni de cuenta usa letra menor a 12 px (salvo la lista blanca justificada)', () => {
  const css = fs.readdirSync(path.join(RAIZ, 'assets/css'))
    .filter(f => /^(club.*|auth-redesign|admin-.*)\.css$/.test(f));
  assert.ok(css.length >= 15);
  // Lista blanca: ninguna por ahora. Si algo debe ir por debajo de 12 px, se anota aquí con la razón.
  const BLANCA = {};
  for (const f of css) {
    const permitidas = BLANCA[f] || [];
    const malas = tamanosMenoresA(leer('assets/css/' + f), 12).filter(x => !permitidas.includes(x));
    assert.deepEqual(malas, [], `${f}: letra menor a 12 px`);
  }
});

test('los <style> de las páginas y el CSS inyectado por club.js y club-shell.js tampoco bajan de 12 px', () => {
  for (const f of PAGINAS) {
    const html = leer('pages/' + f);
    const bloques = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    const atributos = [...html.matchAll(/style="([^"]*)"/g)].map(m => m[1]).join(';\n');
    assert.deepEqual(tamanosMenoresA(bloques + '\n' + atributos, 12), [], `${f}: letra menor a 12 px en estilos de la página`);
  }
  for (const rel of ['assets/js/club.js', 'assets/js/club-shell.js', 'assets/js/club-seccion.js']) {
    assert.deepEqual(tamanosMenoresA(leer(rel), 12), [], `${rel}: letra menor a 12 px en estilos inyectados`);
  }
});

test('las rejillas auto-fit/auto-fill del Club no fijan columnas que desborden pantallas de 320 px', () => {
  const archivos = fs.readdirSync(path.join(RAIZ, 'assets/css')).filter(f => /^(club.*|admin-.*)\.css$/.test(f))
    .map(f => 'assets/css/' + f)
    .concat(PAGINAS.map(f => 'pages/' + f));
  for (const rel of archivos) {
    const s = leer(rel);
    const malas = [...s.matchAll(/repeat\(\s*auto-(?:fit|fill)\s*,\s*minmax\(\s*(\d+)px\s*,\s*1fr\s*\)\s*\)/g)].filter(m => Number(m[1]) >= 200);
    assert.deepEqual(malas.map(m => m[0]), [], `${rel}: usa minmax(min(100%, Npx), 1fr) para que no se salga en 320 px`);
  }
});
