'use strict';
// Tamaños en celular: la tarjeta de título, la del Inicio, las ventanas de bienvenida y el aviso de acceso gratuito
// bajan con el ancho (clamp) sin bajar de 12 px de letra ni de 40 px de objetivo táctil. Las alturas reales se miden
// en Chrome (ver informe); aquí se protege que las reglas existan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const desde = (css, marca) => { const i = css.indexOf(marca); assert.ok(i >= 0, 'falta ' + marca); return css.slice(i); };

test('tarjeta de título: relleno, título, subtítulo y personaje bajan en celular (640, 420 y 360 px)', () => {
  const b = desde(leer('assets/css/club-seccion.css'), 'TAMAÑOS EN CELULAR');
  assert.match(b, /@media \(max-width: 640px\)/);
  assert.match(b, /\.zs-seccion \{ padding: clamp\(14px, 4vw, 18px\)/);
  assert.match(b, /\.zs-seccion__titulo \{[^}]*font-size: clamp\(1\.45rem/);
  assert.match(b, /--zs-pj: clamp\(64px, 19vw, 76px\)/);
  assert.match(b, /@media \(max-width: 360px\)/);
  assert.doesNotMatch(b, /gradient\(/);
});

test('tarjeta del Inicio: cifras en cuadrícula a la izquierda y Jaguarito con su frase a la derecha', () => {
  const b = desde(leer('assets/css/club-inicio.css'), 'TARJETA DEL INICIO EN CELULAR');
  assert.match(b, /grid-template-areas: "cuerpo cuerpo" "cifras guia"/);
  assert.match(b, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(b, /\.zs-inicio__burbuja \{[^}]*font-size: \.75rem/);
  assert.doesNotMatch(b, /gradient\(/);
});

test('aviso de acceso gratuito: compacto en celular y con botón de 40 px', () => {
  const b = desde(leer('assets/css/club-shell.css'), 'Aviso de "Acceso gratuito" más compacto en celular');
  assert.match(b, /\.zoo-pay-banner \.zoo-pay-banner__btn \{[^}]*min-height: 40px/);
  assert.match(b, /@media \(min-width: 361px\) and \(max-width: 460px\)/);
});

test('ventanas de bienvenida y del perfil: iconos y relleno bajan con el ancho', () => {
  const css = leer('assets/css/club-onboarding.css');
  const b = desde(css, 'Celular: iconos y relleno de las tarjetas de bienvenida');
  assert.match(b, /\.zob__icono \{ width: 56px; height: 56px/);
  assert.match(b, /@media \(max-width: 360px\)/);
  const p = desde(css, 'Completa tu perfil profesional');
  assert.match(p, /--zpf-av: clamp\(/);
  assert.match(p, /@media \(max-width: 340px\)/);
  const premio = desde(leer('assets/css/club-curso-premio.css'), 'la tarjeta del premio baja de tamaño');
  assert.match(premio, /\.zcp__trofeo \{ width: clamp\(60px, 18vw, 72px\)/);
});

test('ningún bloque nuevo de tamaños baja de 12 px de letra', () => {
  const bloques = [
    desde(leer('assets/css/club-seccion.css'), 'TAMAÑOS EN CELULAR'),
    desde(leer('assets/css/club-inicio.css'), 'TARJETA DEL INICIO EN CELULAR'),
    desde(leer('assets/css/club-shell.css'), 'Aviso de "Acceso gratuito" más compacto en celular'),
    desde(leer('assets/css/club-onboarding.css'), 'Completa tu perfil profesional')
  ];
  for (const b of bloques) {
    for (const m of b.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)) {
      const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
      assert.ok(px >= 12, 'letra menor a 12 px: ' + m[0]);
    }
  }
});
