'use strict';

// Íconos del panel admin (Lucide, incrustados). Ejecutar: node --test tests/admin-iconos.test.js

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.join(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const I = require(path.join(RAIZ, 'assets', 'js', 'admin-iconos.js'));

test('svg() devuelve un SVG en línea que hereda el color del texto y se oculta a lectores de pantalla', () => {
  const s = I.svg('users', { size: 20 });
  assert.ok(s.startsWith('<svg class="zi"'));
  assert.ok(s.includes('width="20"') && s.includes('height="20"'));
  assert.ok(s.includes('stroke="currentColor"') && s.includes('fill="none"'));
  assert.ok(s.includes('aria-hidden="true"') && s.includes('focusable="false"'));
  assert.ok(s.endsWith('</svg>'));
});

test('el tamaño por defecto es 18 y un tamaño inválido no rompe nada', () => {
  assert.ok(I.svg('eye').includes('width="18"'));
  assert.ok(I.svg('eye', { size: 'abc' }).includes('width="18"'));
  assert.ok(I.svg('eye', { size: -4 }).includes('width="18"'));
});

test('un ícono inexistente devuelve texto vacío (la interfaz sigue funcionando)', () => {
  assert.equal(I.svg('no-existe'), '');
  assert.equal(I.svg(''), '');
  assert.equal(I.svg(undefined), '');
  assert.equal(I.existe('no-existe'), false);
  assert.equal(I.existe('users'), true);
});

test('un nombre de ícono con código no se interpreta (no inyecta HTML)', () => {
  assert.equal(I.svg('"><script>alert(1)</script>'), '');
  assert.equal(I.svg('__proto__'), '');
  assert.equal(I.svg('constructor'), '');
});

test('la clase extra se escapa', () => {
  const s = I.svg('x', { clase: '"><img src=x onerror=alert(1)>' });
  assert.ok(!s.includes('<img'));
  assert.ok(s.includes('&lt;img'));
});

test('cada ícono es un SVG bien formado con contenido y sin scripts', () => {
  assert.ok(I.lista().length >= 30);
  for (const n of I.lista()) {
    const s = I.svg(n);
    assert.ok(/<(path|circle|rect|line|polyline|polygon|ellipse)/.test(s), `${n}: sin formas`);
    assert.ok(!/<script|onload|onerror|javascript:/i.test(s), `${n}: contenido sospechoso`);
    assert.equal((s.match(/<svg/g) || []).length, 1, `${n}: más de un <svg>`);
  }
});

test('el archivo conserva el crédito de la licencia de Lucide', () => {
  const t = leer('assets/js/admin-iconos.js');
  assert.ok(/Lucide/.test(t) && /ISC/.test(t));
});

test('todos los íconos que usa el panel existen', () => {
  const fuentes = ['pages/admin-club.html', 'assets/js/admin-miembros.js', 'assets/js/admin-vistas.js', 'assets/js/admin-marketing.js', 'assets/js/admin-encuesta.js', 'assets/js/admin-panel.js'].map(leer).join('\n');
  const usados = new Set();
  for (const m of fuentes.matchAll(/(?:\.svg|ico)\('([a-z0-9-]+)'/g)) usados.add(m[1]);
  for (const m of fuentes.matchAll(/icono:\s*'([a-z0-9-]+)'/g)) usados.add(m[1]);
  for (const m of fuentes.matchAll(/class="zi[^"]*"[\s\S]{0,40}?viewBox/g)) void m;
  assert.ok(usados.size >= 15, `se esperaban muchos íconos usados y hay ${usados.size}`);
  const faltan = [...usados].filter(n => !I.existe(n));
  assert.deepEqual(faltan, [], `íconos que no existen: ${faltan.join(', ')}`);
});

test('el menú lateral, el pie y la marca llevan ícono y el logo real', () => {
  const h = leer('pages/admin-club.html');
  for (const sec of ['resumen', 'miembros', 'suscripciones', 'cursos', 'certificados', 'videos', 'pdfs', 'sesiones', 'noticias', 'retos', 'comunidad', 'referidos', 'metricas', 'pruebas', 'encuesta', 'configuracion', 'avance', 'estado']) {
    const m = h.match(new RegExp(`data-sec="${sec}">(<svg class="zi"[^>]*>)`));
    assert.ok(m, `el botón "${sec}" no empieza con un ícono`);
  }
  assert.ok(h.includes('class="asb-logo"') && h.includes('zoorigen-logo-remaster-v1.png'));
  assert.ok(h.includes('admin-iconos.js'));
  assert.ok(h.indexOf('admin-iconos.js') < h.indexOf('admin-panel.js'), 'los íconos deben cargarse antes que las ayudas del panel');
  assert.ok(h.indexOf('admin-panel.js') < h.indexOf('admin-vistas.js'), 'las ayudas del panel van antes que las vistas');
});

test('no queda ningún emoji en la interfaz del panel (solo el campo de "Icono" de noticias, que es contenido)', () => {
  const emoji = /[\p{Extended_Pictographic}️]/u;
  const permitido = l => l.includes("id=\"f_icon\"") || l.includes("icon: document.getElementById('f_icon')");
  for (const rel of ['pages/admin-club.html', 'assets/js/admin-miembros.js', 'assets/js/admin-cursos.js', 'assets/js/admin-certificados.js', 'assets/css/admin-redesign.css', 'assets/js/admin-panel.js', 'assets/js/admin-vistas.js', 'assets/css/admin-club.css']) {
    const malas = leer(rel).split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => emoji.test(l) && !permitido(l));
    assert.deepEqual(malas.map(([n, l]) => `${rel}:${n} ${l.trim().slice(0, 80)}`), [], 'quedaron emojis');
  }
});

test('el módulo de miembros dibuja los estados y botones con ícono y sigue funcionando sin íconos', () => {
  const A = require(path.join(RAIZ, 'assets', 'js', 'admin-miembros.js'));
  const club = { calculateStatus: () => 'active', toDate: () => new Date(Date.now() + 5 * 86400000), formatShort: () => '1 ene 2027', getInitials: () => 'AB' };
  const html = A.filaHTML(A.analizar({ id: 'u1', name: 'Ana', email: 'a@x.com', createdAt: new Date().toISOString(), planActivo: true }, club), club);
  assert.ok(/status-pill[^>]*><svg class="zi"/.test(html), 'la pastilla de estado debe llevar ícono');
  assert.ok(/btn-small extend[^>]*><svg class="zi"/.test(html), 'Extender debe llevar ícono');
  assert.ok(/btn-small cancel[^>]*><svg class="zi"/.test(html), 'Cancelar debe llevar ícono');
});
