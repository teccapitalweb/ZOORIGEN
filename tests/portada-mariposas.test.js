'use strict';
// Mariposas monarca de fondo en el pie de la portada: capa decorativa, sin degradados, sin emojis y con respeto a "reducir movimiento".
// Ejecutar: node --test tests/portada-mariposas.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const leer = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('mariposas: el CSS pinta la capa, pausa fuera de pantalla y se detiene con reducir movimiento', () => {
  const css = leer('assets/css/landing-mariposas.css');
  assert.match(css, /\.zs-mariposas\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.is-fuera[\s\S]*animation-play-state:\s*paused/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none/);
  assert.doesNotMatch(css, /gradient/i);
  assert.doesNotMatch(css, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test('mariposas: el script crea una capa aria-hidden dentro del pie con 7 monarcas dibujadas en SVG', () => {
  const js = leer('assets/js/landing-mariposas.js');
  assert.match(js, /getElementById\('pie'\)/);
  assert.match(js, /setAttribute\('aria-hidden', 'true'\)/);
  assert.match(js, /IntersectionObserver/);
  assert.doesNotMatch(js, /gradient/i);
  assert.doesNotMatch(js, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  const lista = js.slice(js.indexOf('var LISTA'), js.indexOf('];', js.indexOf('var LISTA')));
  assert.equal((lista.match(/^\s*\[/gm) || []).length, 7);
});

test('mariposas: la portada enlaza la hoja y el script', () => {
  const h = leer('index.html');
  assert.match(h, /assets\/css\/landing-mariposas\.css\?v=/);
  assert.match(h, /assets\/js\/landing-mariposas\.js\?v=/);
});
