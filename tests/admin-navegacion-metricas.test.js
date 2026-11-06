'use strict';

// «Métricas» (con su encabezado y pestañas) no debe dejar restos al pasar a otra sección, y volver a «Métricas» debe funcionar.
// Reproduce lo que hace el router de pages/admin-club.html: limpiar el contenedor, pintar la sección nueva con vista().
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const I = require(path.join(RAIZ, 'assets', 'js', 'admin-iconos.js'));
const F = require(path.join(RAIZ, 'assets', 'js', 'admin-filas.js'));

function cargarVistas(contenedor) {
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.self = sandbox;
  sandbox.ZOO_ADMIN_PANEL = P; sandbox.ZOO_ICONOS = I; sandbox.ZOO_ADMIN_FILAS = F;
  sandbox.document = { createElement: () => ({}), body: {}, querySelector: () => null, addEventListener() {}, removeEventListener() {} };
  vm.createContext(sandbox);
  vm.runInContext(leer('assets/js/admin-vistas.js'), sandbox);
  const V = sandbox.ZOO_ADMIN_VISTAS;
  V.iniciar({ api: async () => ({}), toast() {}, contenedor: () => contenedor });
  return V;
}

// Un contenedor mínimo que se comporta como #secView: primer hijo, #vzCuerpo y innerHTML
function nuevoContenedor() {
  const c = {
    innerHTML: '', firstElementChild: null, _cuerpo: null,
    querySelector(s) { return s === '#vzCuerpo' ? this._cuerpo : null; },
    // lo que haría el navegador al asignar innerHTML con la pantalla de Métricas (encabezado + cuerpo) o con otra sección
    pintar(html) {
      this.innerHTML = html;
      const esMetricas = /vz-hero/.test(html) && /id="vzCuerpo"/.test(html);
      this.firstElementChild = html ? { classList: { contains: k => (esMetricas ? k === 'vz-hero' : k === 'zs-seccion') } } : null;
      this._cuerpo = esMetricas ? { parentNode: this, innerHTML: '' } : null;
    }
  };
  return c;
}

test('Métricas → otra sección → Métricas: la sección nueva se pinta en el contenedor (sin el encabezado de Métricas) y volver a Métricas usa su cuerpo', () => {
  const cont = nuevoContenedor();
  const V = cargarVistas(cont);
  const VZ = require(path.join(RAIZ, 'assets', 'js', 'admin-visitas.js'));
  // 1) Métricas: encabezado + pestañas + cuerpo
  cont.pintar(VZ.cabeceraHTML('visitas'));
  assert.equal(V.util.vista(), cont._cuerpo, 'en Métricas se pinta en el cuerpo de la pestaña');
  V.util.vista().innerHTML = '<p>contenido de Visitas</p>';
  // 2) el router limpia al cambiar de sección (sv.innerHTML = '') y la sección nueva se pinta donde corresponde
  cont.pintar('');
  assert.equal(V.util.vista(), cont, 'tras limpiar, la vista es el contenedor entero');
  V.util.vista().innerHTML = '<header class="zs-seccion">Miembros</header>';
  cont.pintar(cont.innerHTML);
  assert.ok(!/vz-hero|vzCuerpo|Visitas/.test(cont.innerHTML), 'no queda nada de Métricas: ' + cont.innerHTML);
  assert.equal(V.util.vista(), cont);
  // 3) volver a Métricas
  cont.pintar('');
  cont.pintar(VZ.cabeceraHTML('negocio'));
  assert.equal(V.util.vista(), cont._cuerpo, 'otra vez se pinta en el cuerpo de la pestaña');
});

test('un #vzCuerpo viejo que quedó suelto (sin el encabezado de Métricas delante) NO se reutiliza: la sección nueva ocupa el contenedor', () => {
  const cont = nuevoContenedor();
  const V = cargarVistas(cont);
  cont._cuerpo = { parentNode: cont, innerHTML: '' };                 // resto de Métricas
  cont.firstElementChild = { classList: { contains: k => k === 'zs-seccion' } };   // pero lo primero ya es otra sección
  assert.equal(V.util.vista(), cont);
  cont.firstElementChild = { classList: { contains: k => k === 'vz-hero' } };
  cont._cuerpo = { parentNode: {}, innerHTML: '' };                    // un cuerpo de otro lugar tampoco
  assert.equal(V.util.vista(), cont);
});

test('el router limpia #secView ANTES de pintar cada sección (sin restos de la anterior), también con Métricas', () => {
  const html = leer('pages/admin-club.html');
  const i = html.indexOf('function renderSection(sec)');
  const bloque = html.slice(i, i + 900);
  assert.match(bloque, /sv\.innerHTML = ''/);
  assert.ok(bloque.indexOf("sv.innerHTML = ''") < bloque.indexOf("if (sec === 'resumen')"), 'se limpia antes de elegir la sección');
  assert.match(bloque, /sv\.onclick = null; sv\.oninput = null; sv\.onchange = null; sv\.onsubmit = null/);
  // todas las secciones del menú pasan por renderSection
  const menu = [...html.matchAll(/data-sec="([a-z]+)"/g)].map(m => m[1]);
  for (const sec of menu) assert.match(html, new RegExp("sec === '" + sec + "'"), 'renderSection conoce ' + sec);
  // y la vista de Métricas se vuelve a armar completa cada vez que se entra
  assert.match(leer('assets/js/admin-visitas.js'), /cont\.innerHTML = cabeceraHTML\(pestana\)/);
});
