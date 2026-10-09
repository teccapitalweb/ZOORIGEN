'use strict';
// club.js lo usan todas las páginas de miembros: si cambia su versión, tiene que cambiar en TODAS y en el service worker.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html'));
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('todas las páginas que cargan club.js usan la MISMA versión, y el service worker la conoce', () => {
  const versiones = new Set();
  for (const f of paginas) {
    for (const m of leer('pages/' + f).matchAll(/assets\/js\/club\.js\?v=([\w.-]+)/g)) versiones.add(m[1]);
  }
  assert.equal(versiones.size, 1, 'versiones distintas de club.js: ' + [...versiones].join(', '));
  const v = [...versiones][0];
  assert.ok(leer('sw.js').includes(`/assets/js/club.js?v=${v}`), 'sw.js debe precachear la misma versión de club.js');
});

test('ninguna página promete ya "la primera clase gratis" a quien entra por primera vez', () => {
  for (const [rel, frase] of [
    ['assets/js/club.js', 'Tu primera clase está incluida'],
    ['assets/js/club.js', 'Primera clase gratis'],
    ['pages/club-registro.html', 'Primera clase gratis'],
    ['pages/club-dashboard.html', 'Tu cuenta gratuita incluye la clase 1'],
    ['pages/club-suscripcion.html', 'incluye la primera clase del primer curso']
  ]) assert.equal(leer(rel).includes(frase), false, `${rel} todavía dice: ${frase}`);
});
