'use strict';
// Herramientas pro: quedan EXACTAMENTE cinco (decisión del dueño, 15 de octubre de 2026):
//   1. Libro de registro      (pages/club-inventario.html)
//   2. Herramientas legales   (pages/club-legal.html)
//   3. Constantes fisiológicas (pestaña "constantes" de pages/club-herramientas.html)
//   4. Infusiones y diluciones (pages/club-infusiones.html)
//   5. Condición corporal BCS  (pestaña "bcs" de pages/club-herramientas.html)
// Dosis, Anestesia, Fluidoterapia, Urgencias y Hemograma se retiraron de la interfaz: el código y los datos
// siguen en el repositorio, pero ninguna página los muestra ni los carga.
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const existe = rel => fs.existsSync(path.join(RAIZ, rel));

const HERR = leer('pages/club-herramientas.html');
const INF = leer('pages/club-infusiones.html');
const INV = leer('pages/club-inventario.html');
const LEGAL = leer('pages/club-legal.html');
const SHELL = require('../assets/js/club-shell.js');
const SECCION = require('../assets/js/club-seccion.js');
const CONST = require('../assets/js/herramientas-constantes.js');

const RETIRADAS = ['dosis', 'anestesia', 'fluidos', 'urgencias', 'hemograma'];
const PALABRAS_RETIRADAS = /dosis|anestesi|fluidoterapia|urgencia|hemograma|f[aá]rmaco|farmacolog|protocolos? (an[eé]sticos?|de urgencia)/i;

// Texto que ve la persona: sin scripts, estilos, comentarios ni etiquetas
function textoVisible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}
// Lo que la tabla de datos reales de Constantes dice de cómo se midieron algunos valores no es una herramienta
const sinCaveat = t => t.replace(/bajo anestesia/gi, '');

test('las cinco herramientas existen y cada una tiene su página o pestaña', () => {
  // 1 Libro de registro: inventario, bitácora e informe
  assert.ok(existe('pages/club-inventario.html'));
  for (const tab of ['inventario', 'bitacora', 'informe']) assert.ok(INV.includes('data-tab="' + tab + '"'), 'registro: ' + tab);
  // 2 Herramientas legales
  assert.ok(existe('pages/club-legal.html'));
  assert.match(LEGAL, /<body[^>]*data-zoo="legal"/);
  // 3 Constantes
  assert.match(HERR, /data-tab="constantes"/);
  assert.match(HERR, /id="panel-constantes"/);
  assert.ok(CONST.ESPECIES.length >= 50, 'constantes: ' + CONST.ESPECIES.length + ' especies');
  // 4 Infusiones y diluciones: las cuatro calculadoras
  assert.ok(existe('pages/club-infusiones.html'));
  const tabsInf = [...INF.matchAll(/data-tab="([\w-]+)"/g)].map(m => m[1]);
  assert.deepEqual(tabsInf, ['cri', 'dilucion', 'conversiones', 'duracion']);
  // 5 BCS
  assert.match(HERR, /data-tab="bcs"/);
  assert.match(HERR, /id="panel-bcs"/);
});

test('el menú de Herramientas pro tiene cuatro apartados que dan las cinco herramientas, y ninguno se llama dosis ni urgencias', () => {
  const grupo = SHELL.GRUPOS.find(g => g.id === 'herramientas');
  assert.equal(grupo.titulo, 'Herramientas pro');
  assert.deepEqual(grupo.items.map(i => i.href), ['club-herramientas.html', 'club-infusiones.html', 'club-inventario.html', 'club-legal.html']);
  assert.deepEqual(grupo.items.map(i => i.label), ['Referencia clínica', 'Infusiones y diluciones', 'Libro de registro', 'Herramientas legales']);
  for (const i of grupo.items) assert.doesNotMatch(i.label, PALABRAS_RETIRADAS, i.label);
  // el buscador del Club no encuentra nada de lo retirado
  for (const q of ['dosis', 'anestesia', 'fluidoterapia', 'urgencias', 'hemograma', 'farmacologia']) {
    assert.deepEqual(SHELL.buscarSecciones(q), [], q);
  }
  assert.equal(SHELL.buscarSecciones('referencia clinica')[0].id, 'herramientas');
});

test('la página de Referencia clínica solo tiene las pestañas Constantes (activa) y BCS', () => {
  const tabs = [...HERR.matchAll(/<button class="tool-tab( is-active)?" data-tab="([\w-]+)"/g)].map(m => [m[2], !!m[1]]);
  assert.deepEqual(tabs, [['constantes', true], ['bcs', false]]);
  const paneles = [...HERR.matchAll(/class="tool-panel( is-active)?" id="panel-([\w-]+)"/g)].map(m => [m[2], !!m[1]]);
  assert.deepEqual(paneles, [['constantes', true], ['bcs', false]]);
  for (const t of RETIRADAS) {
    assert.ok(!HERR.includes('data-tab="' + t + '"'), 'queda la pestaña ' + t);
    assert.ok(!HERR.includes('id="panel-' + t + '"'), 'queda el panel ' + t);
  }
});

test('la interfaz de Referencia clínica no expone dosis, anestesia, fluidoterapia, urgencias ni hemograma', () => {
  const t = sinCaveat(textoVisible(HERR));
  assert.doesNotMatch(t, PALABRAS_RETIRADAS, 'texto visible de club-herramientas.html');
  assert.doesNotMatch(t, /38 f[aá]rmacos|40\+|Cl[ií]nica y farmacolog/i);
  assert.match(t, /Referencia cl[ií]nica/);
  // título de la pestaña del navegador
  assert.match(HERR, /<title>Referencia clínica/);
  // tarjeta de título: cifras reales (especies y datos con fuente) y una escala BCS
  const cfg = JSON.parse(/ZOO_SECCION\.montar\('#zsSeccion', (\{[\s\S]*?\})\);<\/script>/.exec(HERR)[1]);
  assert.equal(cfg.titulo, 'Referencia clínica');
  const datos = CONST.ESPECIES.reduce((s, e) => s + e.datos.length, 0);
  const porId = Object.fromEntries(cfg.cifras.filter(c => c.id).map(c => [c.id, c.valor]));
  assert.equal(porId.statEspecies, String(CONST.ESPECIES.length));
  assert.equal(porId.statDatos, String(datos));
  assert.ok(cfg.cifras.some(c => /BCS/.test(c.rotulo) && c.valor === '1'));
  for (const c of cfg.cifras) assert.doesNotMatch(c.rotulo, PALABRAS_RETIRADAS, c.rotulo);
});

test('el resto del Club (inicio, guía, personaje de la sección) ya no nombra lo retirado', () => {
  const ini = require('../assets/js/club-inicio.js');
  const kpi = ini.kpisDe(null, {}).find(k => k.id === 'pro');
  assert.equal(kpi.valor, '5');
  assert.equal(kpi.nota, 'herramientas');
  // guía de bienvenida
  const onb = leer('assets/js/club-onboarding.js');
  const i = onb.indexOf("id: 'herramientas'");
  const bloque = onb.slice(i, onb.indexOf("id: 'foro'", i));
  assert.ok(bloque.length > 100);
  assert.doesNotMatch(bloque, PALABRAS_RETIRADAS);
  assert.doesNotMatch(bloque, /Calculadoras cl[ií]nicas/);
  // personaje de la sección
  for (const m of SECCION.MENSAJES.herramientas) assert.doesNotMatch(m, PALABRAS_RETIRADAS, m);
  const deco = SECCION.DECORACION.herramientas;
  for (const icono of deco.iconos) assert.ok(SECCION.ICONOS_DECOR[icono], icono);
  assert.ok(!deco.iconos.includes('pill') && !deco.iconos.includes('syringe'), 'los íconos de la tarjeta no sugieren fármacos');
  // club.js (menú de respaldo, bienvenida y bloqueo)
  const club = leer('assets/js/club.js');
  assert.doesNotMatch(club, /Herramientas clínicas/);
  assert.doesNotMatch(club, /<strong>Herramientas<\/strong> cl[ií]nicas y legales/);
});

test('ninguna página carga los módulos retirados y ningún enlace interno apunta a sus pestañas', () => {
  const retirados = ['herramientas-dosis', 'herramientas-protocolos', 'herramientas-hemograma', 'herramientas-clinica-retirada'];
  const htmls = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html')).map(f => 'pages/' + f)
    .concat(fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')));
  const js = fs.readdirSync(path.join(RAIZ, 'assets/js')).filter(f => f.endsWith('.js')).map(f => 'assets/js/' + f);
  for (const rel of htmls) {
    const h = leer(rel);
    for (const m of retirados) assert.ok(!h.includes(m), rel + ' carga ' + m);
  }
  const enlace = new RegExp('club-herramientas\\.html\\?[^"\'\\s)]*tab=(' + RETIRADAS.join('|') + ')', 'i');
  for (const rel of htmls.concat(js)) assert.doesNotMatch(leer(rel), enlace, rel + ' enlaza a una pestaña retirada');
  // el código y los datos retirados se conservan en el repositorio
  for (const m of retirados) assert.ok(existe('assets/js/' + m + '.js'), m + ' debe seguir en el repositorio');
});

test('un enlace viejo (?tab=dosis, anestesia, fluidos, hemograma, urgencias) abre Constantes', () => {
  assert.match(HERR, /const PESTANAS = \['constantes', 'bcs'\];/);
  assert.match(HERR, /const inicial = PESTANAS\.indexOf\(pedida\) !== -1 \? pedida : 'constantes';/);
  assert.match(HERR, /new URLSearchParams\(location\.search\)\.get\('tab'\)/);
  // se corrige la dirección sin recargar ni agregar una entrada al historial
  assert.match(HERR, /history\.replaceState\(/);
  assert.match(HERR, /if \(pedida !== null && pedida !== inicial\) ponerPestanaEnDireccion\(inicial\);/);
});

test('las dos pestañas conservan la vista previa para quien no es miembro (ver, no usar)', () => {
  assert.match(HERR, /Vista previa:<\/strong> puedes recorrer y llenar/);
  assert.match(HERR, /if \(usoBloqueado\('Ver equivalencia de condición corporal', rEl\)\) return;/);
  assert.match(HERR, /tarjetaVistaPrevia\(e, C\.esc\(e\.grupo\)\)/);
  assert.match(HERR, /ZOO_PAYWALL\.requiereMembresia\('Ver el detalle de '/);
});
