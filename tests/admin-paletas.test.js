'use strict';

// Vigila que cada paleta del panel admin esté completa y que todo color usado exista.
// Ejecutar: node --test tests/admin-paletas.test.js

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(RAIZ, 'assets', 'css', 'admin-redesign.css'), 'utf8').replace(/\r\n/g, '\n');

// Bloques de paleta: ":root, :root[data-tema="selva"] {" y ":root[data-tema="x"] {"
const bloques = {};
for (const m of css.matchAll(/(:root(?:,\s*:root)?\[data-tema="([a-z]+)"\])\s*\{([\s\S]*?)\n\}/g)) {
  bloques[m[2]] = m[3];
}
const variablesDe = cuerpo => new Set([...cuerpo.matchAll(/(--c-[a-z0-9-]+)\s*:/g)].map(x => x[1]));

test('existen las cinco paletas', () => {
  assert.deepEqual(Object.keys(bloques).sort(), ['grafito', 'indigo', 'oceano', 'selva', 'tierra']);
});

test('la paleta por defecto (:root) es la de selva, la actual', () => {
  assert.ok(/:root,\s*:root\[data-tema="selva"\]\s*\{/.test(css));
});

for (const tema of ['oceano', 'tierra', 'indigo', 'grafito']) {
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
  // variables locales de componente que no son de paleta
  const locales = new Set(['--c-radius', '--c-ease']);
  const usadas = new Set([...css.matchAll(/var\((--c-[a-z0-9-]+)/g)].map(x => x[1]));
  const sinDefinir = [...usadas].filter(v => !definidas.has(v) && !locales.has(v));
  assert.deepEqual(sinDefinir, [], `se usan sin definir: ${sinDefinir.join(', ')}`);
});

test('los valores de cada color no están vacíos', () => {
  for (const [tema, cuerpo] of Object.entries(bloques)) {
    for (const m of cuerpo.matchAll(/(--c-[a-z0-9-]+)\s*:\s*([^;]*);/g)) {
      assert.ok(m[2].trim().length > 0, `${tema}: ${m[1]} está vacío`);
    }
  }
});

test('en las paletas claras el texto principal es oscuro y en las oscuras es claro', () => {
  const luminancia = hex => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const color = (tema, nombre) => (bloques[tema].match(new RegExp(`${nombre}\\s*:\\s*(#[0-9a-fA-F]{6})`)) || [])[1];
  for (const claro of ['oceano', 'tierra']) assert.ok(luminancia(color(claro, '--c-text')) < 0.1, `${claro}: texto debería ser oscuro`);
  for (const oscuro of ['selva', 'indigo', 'grafito']) assert.ok(luminancia(color(oscuro, '--c-text')) > 0.8, `${oscuro}: texto debería ser claro`);
});

test('el texto principal tiene contraste suficiente (AA) sobre el fondo en las paletas claras', () => {
  const luminancia = hex => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contraste = (a, b) => { const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const color = (tema, nombre) => (bloques[tema].match(new RegExp(`${nombre}\\s*:\\s*(#[0-9a-fA-F]{6})`)) || [])[1];
  for (const tema of ['oceano', 'tierra']) {
    assert.ok(contraste(color(tema, '--c-text'), color(tema, '--c-bg')) >= 7, `${tema}: texto sobre fondo`);
    assert.ok(contraste(color(tema, '--c-text-2'), color(tema, '--c-bg')) >= 4.5, `${tema}: texto secundario sobre fondo`);
    assert.ok(contraste(color(tema, '--c-accent-ink'), color(tema, '--c-accent')) >= 4.5, `${tema}: texto del botón principal`);
  }
});

test('el botón principal tiene contraste suficiente en las paletas oscuras', () => {
  const luminancia = hex => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contraste = (a, b) => { const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const color = (tema, nombre) => (bloques[tema].match(new RegExp(`${nombre}\\s*:\\s*(#[0-9a-fA-F]{6})`)) || [])[1];
  for (const tema of ['selva', 'indigo', 'grafito']) {
    assert.ok(contraste(color(tema, '--c-accent-ink'), color(tema, '--c-accent')) >= 4.5, `${tema}: texto del botón principal`);
  }
});
