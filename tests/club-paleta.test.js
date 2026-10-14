'use strict';
// Paleta por apartado: cada pantalla del Club tiene su propio color (sobrio, calmado), el verde de marca queda solo en
// Inicio y Cursos, y todo par fondo/texto cumple contraste AA (>= 4.5:1). Un solo mapa en club-seccion.css.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const S = require('../assets/js/club-seccion.js');

/* ───────── contraste ───────── */
function luminancia(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function mezcla(a, b, pa) { // pa = proporción de a
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const m = ch(A).map((v, i) => Math.round(v * pa + ch(B)[i] * (1 - pa)));
  return '#' + m.map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ───────── mapa de la paleta ───────── */
const CSS = leer('assets/css/club-seccion.css');
const MAPA = {};
for (const m of CSS.matchAll(/body\[data-zoo="([a-z]+)"\]\s*\{\s*--zs-bg:\s*(#[0-9A-Fa-f]{6});\s*--zs-claro:\s*(#[0-9A-Fa-f]{6});\s*\}/g)) {
  MAPA[m[1]] = { bg: m[2].toUpperCase(), claro: m[3].toUpperCase() };
}
const CLAVES = ['inicio', 'cursos', 'pdfs', 'herramientas', 'infusiones', 'legal', 'registro', 'sesiones', 'videos', 'foro', 'directorio',
  'retos', 'logros', 'certificados', 'referidos', 'perfil', 'suscripcion', 'canal'];
const VERDE_MARCA = '#1F5F3A';
const NOCHE_ELEVADA = '#1E2329';
const NOCHE_SUPERFICIE = '#171B20';
const DIA_PAGINA = '#F6F4EF';

test('el mapa de paleta define las 18 pantallas (una sola vez, en club-seccion.css)', () => {
  assert.deepEqual(Object.keys(MAPA).sort(), [...CLAVES].sort());
  // no hay otro mapa duplicado en otras hojas
  for (const f of fs.readdirSync(path.join(RAIZ, 'assets/css')).filter(x => /^club.*\.css$/.test(x) && x !== 'club-seccion.css')) {
    assert.doesNotMatch(leer('assets/css/' + f), /--zs-bg:/, f + ' no debe repetir el mapa de paleta');
  }
});

test('cada apartado: texto blanco sobre su fondo >= 4.5:1 y acento claro >= 4.5:1 sobre ese fondo y sobre la superficie de noche', () => {
  const informe = [];
  for (const k of CLAVES) {
    const { bg, claro } = MAPA[k];
    const blanco = contraste('#FFFFFF', bg);
    const claroSobreBg = contraste(claro, bg);
    const claroSobreNoche = contraste(claro, NOCHE_ELEVADA);
    const claroSobreSup = contraste(claro, NOCHE_SUPERFICIE);
    informe.push(`${k} ${bg} blanco=${blanco.toFixed(2)} claro=${claro} sobreBg=${claroSobreBg.toFixed(2)} noche=${claroSobreNoche.toFixed(2)}`);
    assert.ok(blanco >= 4.5, `${k}: blanco sobre ${bg} = ${blanco.toFixed(2)}`);
    assert.ok(claroSobreBg >= 4.5, `${k}: ${claro} sobre ${bg} = ${claroSobreBg.toFixed(2)}`);
    assert.ok(claroSobreNoche >= 4.5, `${k}: ${claro} sobre ${NOCHE_ELEVADA} = ${claroSobreNoche.toFixed(2)}`);
    assert.ok(claroSobreSup >= 4.5, `${k}: ${claro} sobre ${NOCHE_SUPERFICIE} = ${claroSobreSup.toFixed(2)}`);
  }
  assert.equal(informe.length, 18);
});

test('modo día: el color del apartado como texto se lee sobre blanco, página cálida y tintes de 9 % y 16 %', () => {
  for (const k of CLAVES) {
    const { bg } = MAPA[k];
    for (const [nombre, sup] of [['blanco', '#FFFFFF'], ['página', DIA_PAGINA], ['tinte 9 %', mezcla(bg, '#FFFFFF', 0.09)], ['tinte 16 %', mezcla(bg, '#FFFFFF', 0.16)]]) {
      assert.ok(contraste(bg, sup) >= 4.5, `${k}: ${bg} sobre ${nombre} (${sup}) = ${contraste(bg, sup).toFixed(2)}`);
    }
  }
});

test('el verde de marca #1F5F3A es el fondo SOLO de Inicio y Cursos; los otros 16 apartados llevan un color propio', () => {
  for (const k of CLAVES) {
    if (k === 'inicio' || k === 'cursos') assert.equal(MAPA[k].bg, VERDE_MARCA, k);
    else assert.notEqual(MAPA[k].bg, VERDE_MARCA, k + ' no debe usar el verde de marca en su tarjeta de título');
  }
  // y ninguno de los 16 es otro verde "casi marca": tono dentro de +-25 grados del verde de marca y poca luminosidad distinta
  const tono = hex => {
    const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return 0;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const verdes = CLAVES.filter(k => k !== 'inicio' && k !== 'cursos' && Math.abs(tono(MAPA[k].bg) - tono(VERDE_MARCA)) < 25);
  assert.deepEqual(verdes, [], 'apartados con un verde muy parecido al de marca: ' + verdes.join(', '));
});

test('variedad: al menos 15 colores de fondo distintos y ninguna tarjeta de título con degradado', () => {
  const distintos = new Set(CLAVES.map(k => MAPA[k].bg));
  assert.ok(distintos.size >= 15, 'colores distintos: ' + distintos.size);
  assert.doesNotMatch(CSS, /(linear|radial|conic)-gradient\(/, 'club-seccion.css sin degradados');
});

test('colores sólidos: el verde de marca ya no pinta las tarjetas de título de los otros apartados (se pinta con --zs-bg)', () => {
  const dia = CSS.match(/\[data-theme="light"\] \.zs-seccion \{[^}]*\}/)[0];
  assert.match(dia, /background:\s*var\(--zs-bg, #1F5F3A\)/);
  assert.doesNotMatch(dia, /background:\s*#1F5F3A/);
  const noche = CSS.match(/\n\.zs-seccion \{[\s\S]*?\n\}/)[0];
  assert.match(noche, /border-left:\s*5px solid var\(--zs-claro/, 'noche: barra lateral de 5 px del acento');
  assert.match(noche, /background:\s*var\(--zoo-hero/, 'noche: superficie elevada neutra (--zoo-hero = #1E2329)');
});

test('cada página del Club lleva <body data-zoo> con la clave de su apartado, y coincide con el apartado de su tarjeta', () => {
  const paginas = {
    'club-dashboard': 'inicio', 'club-biblioteca': 'cursos', 'club-pdfs': 'pdfs', 'club-herramientas': 'herramientas', 'club-infusiones': 'infusiones',
    'club-legal': 'legal', 'club-inventario': 'registro', 'club-sesiones': 'sesiones', 'club-videos': 'videos', 'club-foro': 'foro',
    'club-directorio': 'directorio', 'club-retos': 'retos', 'club-logros': 'logros', 'club-certificados': 'certificados',
    'club-referidos': 'referidos', 'club-perfil': 'perfil', 'club-suscripcion': 'suscripcion', 'club-canal': 'canal'
  };
  assert.equal(Object.keys(paginas).length, 18);
  for (const [pag, clave] of Object.entries(paginas)) {
    const h = leer('pages/' + pag + '.html');
    const m = h.match(/<body data-zoo="([a-z]+)"/);
    assert.ok(m, pag + ' sin <body data-zoo>');
    assert.equal(m[1], clave, pag);
    assert.ok(MAPA[m[1]], pag + ': la clave no está en el mapa');
    // la tarjeta de la página pide el mismo apartado (con sus alias)
    const cfg = h.match(/["']?seccion["']?\s*:\s*['"]([a-z]+)['"]/);
    if (cfg) assert.equal(S.claveApartado(cfg[1]), clave, pag + ': la tarjeta pide ' + cfg[1]);
  }
  assert.equal(S.claveApartado(leer('assets/js/club-materiales.js').match(/seccion: '([a-z]+)'/)[1]), 'pdfs');
  assert.equal(S.claveApartado(leer('assets/js/club-inicio.js').match(/seccion: '([a-z]+)'/)[1]), 'inicio');
});

test('el mapa de decoración (personajes) y la paleta usan las mismas claves, con alias', () => {
  for (const k of Object.keys(S.DECORACION)) assert.ok(MAPA[k], 'falta color para ' + k);
  for (const dest of Object.values(S.ALIAS)) assert.ok(MAPA[dest], 'alias a un apartado sin color: ' + dest);
  assert.equal(S.claveApartado('biblioteca'), 'cursos');
  assert.equal(S.claveApartado('inventario'), 'registro');
  assert.equal(S.claveApartado('webinars'), 'sesiones');
  assert.equal(S.claveApartado('dashboard'), 'inicio');
  assert.equal(S.claveApartado('no-existe'), '');
});

test('tokens derivados: acento, tinte y reasignación de los tokens antiguos por apartado', () => {
  for (const t of ['--zoo-acc:', '--zoo-acc-claro:', '--zoo-acc-oscuro:', '--zoo-acc-txt:', '--zoo-acc-tinte:', '--zoo-acc-tinte-2:', '--zoo-solid:', '--zoo-fill:', '--zoo-green-500:']) {
    assert.ok(CSS.includes(t), 'falta ' + t);
  }
  assert.match(CSS, /body\[data-zoo\]\s*\{[\s\S]*--zoo-solid:\s*var\(--zs-bg\)/);
});

test('colores semánticos de estado definidos (éxito verde, aviso ámbar, info azul, error coral), de día y de noche, con AA', () => {
  const css = leer('assets/css/club.css');
  for (const t of ['--zoo-ok-txt', '--zoo-ok-tinte', '--zoo-ok-borde', '--zoo-aviso-txt', '--zoo-aviso-tinte', '--zoo-info-txt', '--zoo-info-tinte', '--zoo-error-txt', '--zoo-error-tinte']) {
    assert.ok(css.includes(t + ':'), 'falta ' + t);
  }
  const par = (txt, fondo) => contraste(txt, fondo);
  // día
  assert.ok(par('#1F6A41', '#E6F1E9') >= 4.5, 'éxito de día');
  assert.ok(par('#7A5200', '#FBF1D8') >= 4.5, 'aviso de día');
  assert.ok(par('#1F5F8F', '#E4EFF8') >= 4.5, 'info de día');
  assert.ok(par('#9C3A2C', '#FBE9E5') >= 4.5, 'error de día');
  // noche
  assert.ok(par('#7FD08A', '#17261D') >= 4.5, 'éxito de noche');
  assert.ok(par('#F0BE55', '#2A2514') >= 4.5, 'aviso de noche');
  assert.ok(par('#8EC3EA', '#16222E') >= 4.5, 'info de noche');
  assert.ok(par('#F19A8E', '#2C1C1A') >= 4.5, 'error de noche');
});

test('comodidad visual: día cálido (#F6F4EF), texto #1F2933 / #52606D; noche neutra sin blanco puro', () => {
  const tema = leer('assets/css/club-theme.css');
  assert.match(tema, /--zoo-bg-dark:\s*#F6F4EF/i);
  assert.match(tema, /--zoo-border:\s*#E4DFD3/i);
  assert.match(tema, /--zoo-text:\s*#1F2933/i);
  assert.match(tema, /--zoo-text-muted:\s*#52606D/i);
  assert.ok(contraste('#1F2933', DIA_PAGINA) >= 7);
  assert.ok(contraste('#52606D', '#FFFFFF') >= 4.5);
  const club = leer('assets/css/club.css');
  assert.match(club, /--zoo-text:\s*#E7EAEE/i, 'noche: texto no blanco puro');
  assert.match(club, /--zoo-bg-dark:\s*#0F1215/i);
  // sombras sin halo de color: ninguna sombra usa dorado o verde translúcido
  for (const f of ['assets/css/club.css', 'assets/css/club-theme.css', 'assets/css/club-seccion.css', 'assets/css/club-inicio.css']) {
    const t = leer(f);
    for (const m of t.matchAll(/box-shadow\s*:[^;}]*/g)) {
      assert.doesNotMatch(m[0], /rgba\(\s*(232\s*,\s*163\s*,\s*23|31\s*,\s*95\s*,\s*58|111\s*,\s*191\s*,\s*115)/, f + ': halo de color en ' + m[0].slice(0, 80));
    }
  }
});

test('banner de acceso gratuito: dorado sólido #E8B431 con texto oscuro y botón azul pizarra con texto blanco (AA)', () => {
  const js = leer('assets/js/club.js');
  assert.match(js, /background:#E8B431;color:#2B2000/);
  assert.match(js, /zoo-pay-banner__btn" style="background:#24384F;color:#fff/);
  assert.ok(contraste('#2B2000', '#E8B431') >= 7);
  assert.ok(contraste('#FFFFFF', '#24384F') >= 7);
});

test('avisos: "Tu ruta VIP" y avisos de estado usan el tinte del apartado con borde de 4 px y texto oscuro (no bloque de color sólido)', () => {
  const css = leer('assets/css/club.css');
  for (const sel of ['.unlock-schedule-banner', '.status-banner']) {
    const b = css.match(new RegExp('\\n' + sel.replace('.', '\\.') + ' \\{[^}]*\\}'))[0];
    assert.match(b, /background:\s*var\(--zoo-acc-tinte/, sel + ' con tinte del acento');
    assert.match(b, /border-left:\s*4px solid var\(--zoo-acc-txt/, sel + ' con borde de 4 px del acento');
    assert.match(b, /color:\s*var\(--zoo-text\)/, sel + ' con texto del tema');
  }
});

test('barra lateral: elemento activo con tinte cálido neutro y marca dorada (no verde sólido)', () => {
  const css = leer('assets/css/club.css');
  const b = css.match(/\n\.club-sidebar a\.is-active \{[^}]*\}/)[0];
  assert.doesNotMatch(b, /green|1F5F3A|zoo-solid/);
  assert.match(b, /var\(--zoo-amber\)/);
  const tema = leer('assets/css/club-theme.css');
  assert.match(tema, /\.club-sidebar a\.is-active \{\s*background:\s*#F1ECDF/);
});
