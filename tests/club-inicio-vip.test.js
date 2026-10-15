'use strict';
// Columna derecha del Inicio del Club (Clases en vivo, Canal de WhatsApp, Tu descuento VIP, Tu actividad, Tu presencia en la
// comunidad): SOLO la ven los miembros con membresía vigente (active, cancelled_active). Sin hueco ni reserva de altura para el
// resto, y oculta desde el primer pintado con <html data-plan>.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const dash = leer('pages/club-dashboard.html');
const css = leer('assets/css/club-inicio.css');

test('las cinco tarjetas viven en una sola columna que el CSS oculta salvo con membresía vigente (antes del primer pintado)', () => {
  assert.match(dash, /<aside class="dashboard-aside" id="inicioAside">\s*<div id="asideVivo"><\/div>\s*<div id="asideComunidad"><\/div>\s*<div id="asideDescuento"><\/div>\s*<div id="asideActividad"><\/div>\s*<div id="asidePresencia"><\/div>\s*<\/aside>/);
  assert.match(css, /html:not\(\[data-plan="active"\]\):not\(\[data-plan="cancelled_active"\]\) #inicioAside \{ display: none !important; \}/);
  assert.match(css, /html:not\(\[data-plan="active"\]\):not\(\[data-plan="cancelled_active"\]\) \.dashboard-grid \{ grid-template-columns: minmax\(0, 1fr\) !important; \}/);
  assert.match(css, /#inicioAside\[hidden\] \{ display: none !important; \}/);
  // el estado lo escribe el script del <head> desde lo guardado: sin parpadeo
  assert.match(dash, /<script>\/\*zs-tema\*\/[\s\S]*?setAttribute\("data-plan",p\)/);
});

test('sin membresía vigente la columna se oculta, se vacía y no se piden sus datos', () => {
  assert.match(dash, /const verAside = ZOORIGEN_CLUB\.hasActiveMembership\(session\);/);
  assert.match(dash, /asideInicio\.hidden = !verAside;\s*if \(!verAside\) asideInicio\.innerHTML = '';/);
  // las cinco tarjetas solo se pintan dentro de la rama de miembro
  const i = dash.indexOf('const verAside');
  const resto = dash.slice(i);
  for (const [id, fn] of [['asideVivo', 'vivoHTML'], ['asideComunidad', 'comunidadHTML'], ['asideDescuento', 'descuentoHTML']]) {
    const k = resto.indexOf("getElementById('" + id + "').innerHTML = ZOO_INICIO." + fn);
    assert.ok(k > 0, id);
    const antes = resto.slice(0, k);
    assert.ok(antes.lastIndexOf('if (verAside) {') > antes.lastIndexOf('}\n      // Las cifras'), id + ' dentro de if (verAside)');
  }
  assert.match(resto, /if \(!verAside\) return;\s*const prem = /, 'Tu actividad no se dibuja a no miembros');
  assert.match(resto, /if \(verAside\) \{\s*\(async \(\) => \{[\s\S]{0,300}\/api\/directorio/, 'el directorio solo se consulta a miembros');
});

test('las cifras de la tarjeta de saludo (en progreso y completados) siguen calculándose para todos', () => {
  const i = dash.indexOf('const pintarActividad = async () => {');
  const bloque = dash.slice(i, i + 900);
  assert.match(bloque, /saludo\.cifras\(\{ enProgreso, completados: terminados \}\);\s*if \(!verAside\) return;/);
});

test('no quedan reservas de altura que dejen espacio vacío donde estaban las tarjetas', () => {
  assert.doesNotMatch(css, /#asideVivo|#asideComunidad|#asideDescuento|#asideActividad|#asidePresencia|#inicioAside[^{]*\{[^}]*min-height/);
  assert.match(css, /\.dashboard-aside > div:empty \{ display: none; \}/);
  // no se agrega nada nuevo en su lugar para quien no es miembro
  assert.doesNotMatch(dash.slice(dash.indexOf('<aside class="dashboard-aside"'), dash.indexOf('</aside>', dash.indexOf('<aside class="dashboard-aside"'))), /Hazte miembro|Activar membresía|Suscribirme/);
});

test('tarjetas de la columna: textos y enlaces tal como se pidieron (siguen existiendo para miembros)', () => {
  const js = leer('assets/js/club-inicio.js');
  for (const t of ['Clases en vivo', 'Próximamente', 'Canal de WhatsApp', 'Abrir canal', 'Tu descuento VIP', 'Solicitar mi 20% por WhatsApp', 'Tu actividad', 'Tu presencia en la comunidad', 'Crea tu tarjeta profesional']) {
    assert.ok(js.includes(t), t);
  }
});
