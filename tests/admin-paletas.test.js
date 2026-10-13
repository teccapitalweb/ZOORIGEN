'use strict';

// Vigila que cada paleta del panel admin esté completa, que todo color usado exista y que
// los textos se lean bien (contraste WCAG AA). Ejecutar: node --test tests/admin-paletas.test.js

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(RAIZ, 'assets', 'css', 'admin-redesign.css'), 'utf8').replace(/\r\n/g, '\n');

const CLARAS = ['jirafa', 'laguna', 'trebol', 'cielo'];
const OSCURAS = ['selva'];

// Bloques de paleta: ":root, :root[data-tema="selva"] {" y ":root[data-tema="x"] {"
const bloques = {};
for (const m of css.matchAll(/(:root(?:,\s*:root)?\[data-tema="([a-z]+)"\])\s*\{([\s\S]*?)\n\}/g)) bloques[m[2]] = m[3];
const variablesDe = cuerpo => new Set([...cuerpo.matchAll(/(--c-[a-z0-9-]+)\s*:/g)].map(x => x[1]));

const luminancia = hex => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// primer color hexadecimal del valor (sirve también para degradados)
const hexDe = (tema, nombre) => {
  const m = bloques[tema].match(new RegExp(`${nombre}\\s*:\\s*([^;]*);`));
  assert.ok(m, `${tema}: no existe ${nombre}`);
  const h = m[1].match(/#[0-9a-fA-F]{6}/);
  assert.ok(h, `${tema}: ${nombre} no tiene un color #hex (${m[1].trim()})`);
  return h[0];
};

test('existen las cinco paletas', () => {
  assert.deepEqual(Object.keys(bloques).sort(), ['cielo', 'jirafa', 'laguna', 'selva', 'trebol']);
});

test('la paleta por defecto (:root) es la de selva, la actual: sin elegir tema nada cambia', () => {
  assert.ok(/:root,\s*:root\[data-tema="selva"\]\s*\{/.test(css));
});

for (const tema of CLARAS) {
  test(`la paleta "${tema}" define exactamente los mismos colores que la actual`, () => {
    const base = variablesDe(bloques.selva);
    const propia = variablesDe(bloques[tema]);
    const faltan = [...base].filter(v => !propia.has(v));
    const sobran = [...propia].filter(v => !base.has(v));
    assert.deepEqual(faltan, [], `a "${tema}" le faltan: ${faltan.join(', ')}`);
    assert.deepEqual(sobran, [], `"${tema}" define de más: ${sobran.join(', ')}`);
  });
}

test('todo color que usa la hoja (var(--c-*)) está definido en la paleta base', () => {
  const definidas = variablesDe(bloques.selva);
  const locales = new Set(['--c-radius', '--c-ease']);
  const usadas = new Set([...css.matchAll(/var\((--c-[a-z0-9-]+)/g)].map(x => x[1]));
  const sinDefinir = [...usadas].filter(v => !definidas.has(v) && !locales.has(v));
  assert.deepEqual(sinDefinir, [], `se usan sin definir: ${sinDefinir.join(', ')}`);
});

test('los valores de cada color no están vacíos', () => {
  for (const [tema, cuerpo] of Object.entries(bloques)) {
    for (const m of cuerpo.matchAll(/(--c-[a-z0-9-]+)\s*:\s*([^;]*);/g)) assert.ok(m[2].trim().length > 0, `${tema}: ${m[1]} está vacío`);
  }
});

test('las paletas claras tienen texto oscuro y la oscura, texto claro', () => {
  for (const t of CLARAS) assert.ok(luminancia(hexDe(t, '--c-text')) < 0.1, `${t}: el texto debería ser oscuro`);
  for (const t of OSCURAS) assert.ok(luminancia(hexDe(t, '--c-text')) > 0.8, `${t}: el texto debería ser claro`);
});

for (const tema of CLARAS) {
  test(`"${tema}": el texto se lee bien sobre el fondo y sobre las tarjetas (AA)`, () => {
    const bg = hexDe(tema, '--c-bg');
    const blanco = '#ffffff';
    assert.ok(contraste(hexDe(tema, '--c-text'), bg) >= 7, 'texto principal sobre fondo');
    assert.ok(contraste(hexDe(tema, '--c-text-2'), bg) >= 4.5, 'texto secundario sobre fondo');
    assert.ok(contraste(hexDe(tema, '--c-text-3'), bg) >= 4.5, 'etiquetas (texto terciario) sobre fondo');
    assert.ok(contraste(hexDe(tema, '--c-text-3'), blanco) >= 4.5, 'etiquetas sobre tarjeta blanca');
    assert.ok(contraste(hexDe(tema, '--c-text-2'), hexDe(tema, '--c-input')) >= 4.5, 'texto secundario sobre campos');
  });

  test(`"${tema}": cada color de estado y de acento se lee sobre blanco (AA)`, () => {
    const blanco = '#ffffff';
    for (const v of ['--c-accent-text', '--c-ok-ink', '--c-warn-ink', '--c-bad-ink', '--c-gone-ink', '--c-idle-ink', '--c-info-ink', '--c-kpi-ok-ink', '--c-kpi-warn-ink', '--c-kpi-bad-ink', '--c-kpi-review-ink']) {
      assert.ok(contraste(hexDe(tema, v), blanco) >= 4.5, `${v} sobre blanco: ${contraste(hexDe(tema, v), blanco).toFixed(2)}`);
    }
  });

  test(`"${tema}": el botón principal y el menú lateral se leen bien (AA)`, () => {
    assert.ok(contraste(hexDe(tema, '--c-accent-ink'), hexDe(tema, '--c-accent')) >= 4.5, 'texto del botón principal');
    assert.ok(contraste(hexDe(tema, '--c-accent-ink'), hexDe(tema, '--c-accent-2')) >= 4.5, 'texto del botón principal al pasar el mouse');
    assert.ok(contraste(hexDe(tema, '--c-sidebar-text'), hexDe(tema, '--c-sidebar')) >= 4.5, 'texto del menú sobre la barra lateral');
    assert.ok(contraste(hexDe(tema, '--c-sidebar-badge-ink'), '#ffffff') >= 4.5, 'contador del menú');
    assert.ok(contraste(hexDe(tema, '--c-avatar-ink'), hexDe(tema, '--c-avatar')) >= 3, 'iniciales del avatar (texto grande)');
  });
}

test('la paleta oscura (actual) conserva el contraste del botón principal', () => {
  assert.ok(contraste(hexDe('selva', '--c-accent-ink'), hexDe('selva', '--c-accent')) >= 4.5);
});

test('las cuatro claras usan los colores del logo (naranja, azul, verde) como base', () => {
  const todo = CLARAS.map(t => bloques[t]).join('\n').toLowerCase();
  assert.ok(todo.includes('#037bc9'), 'azul del logo (#037BC9)');
  assert.ok(todo.includes('#95a303'), 'verde del logo (#95A303)');
  assert.ok(/#f58220|#c75402/.test(todo), 'naranja de la jirafa');
});

test('la página del admin usa una paleta que existe (hoy: selva, verde de la marca, modo oscuro)', () => {
  const pagina = fs.readFileSync(path.join(RAIZ, 'pages', 'admin-club.html'), 'utf8');
  const m = pagina.match(/<html[^>]*data-tema="([a-z]+)"[^>]*data-modo="([a-z]+)"/);
  assert.ok(m, 'la etiqueta <html> debe declarar data-tema y data-modo');
  assert.ok(Object.keys(bloques).includes(m[1]), `la paleta "${m[1]}" no existe en la hoja de estilos`);
  assert.equal(m[1], 'selva');
  assert.equal(m[2], CLARAS.includes(m[1]) ? 'claro' : 'oscuro', 'el modo debe corresponder a la paleta');
});

test('la hoja de estilos del rediseño está enlazada en la página', () => {
  const pagina = fs.readFileSync(path.join(RAIZ, 'pages', 'admin-club.html'), 'utf8');
  assert.ok(pagina.includes('assets/css/admin-redesign.css'));
});
