'use strict';
// Vista previa de Referencia clínica (Constantes y BCS) e Infusiones para quien NO es miembro:
// ve toda la interfaz y puede llenar los campos, pero calcular o abrir el detalle pide la membresía.
// Miembros y administradores conservan el comportamiento de siempre.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const leer = r => fs.readFileSync(path.resolve(__dirname, '..', r), 'utf8');
const HERR = leer('pages/club-herramientas.html');
const INF = leer('pages/club-infusiones.html');
const PAYWALL = require('../assets/js/club-paywall.js');
const CALC = require('../assets/js/herramientas-calculos.js');
const CONST = require('../assets/js/herramientas-constantes.js');
const INFUS = require('../assets/js/herramientas-infusiones.js');

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;

// Cuerpo de una función declarada en la página (hasta su llave de cierre en columna 0)
function funcion(src, nombre) {
  const ini = src.indexOf('function ' + nombre + '(');
  assert.ok(ini >= 0, 'no está la función ' + nombre);
  const linea = src.slice(ini, src.indexOf('\n', ini));
  if (/\}\s*$/.test(linea) && linea.split('{').length === linea.split('}').length) return linea; // función de una línea
  const fin = src.indexOf('\n}\n', ini);
  assert.ok(fin > ini, 'no cierra la función ' + nombre);
  return src.slice(ini, fin + 2);
}

test('ya no hay reemplazo total para quien no es miembro (ni bloqueo, ni paywall grande)', () => {
  for (const [nombre, src] of [['herramientas', HERR], ['infusiones', INF]]) {
    assert.doesNotMatch(src, /Herramientas exclusivas para miembros/, nombre);
    assert.doesNotMatch(src, /ZOORIGEN_CLUB\.showPaywall\(/, nombre);
    assert.doesNotMatch(src, /if \(!isVIP\)/, nombre);
    assert.doesNotMatch(src, /\.style\.display = 'none'\);\s*\n\s*\/\/ Aviso fijo/, nombre);
    assert.doesNotMatch(src, /hero\.querySelectorAll\('\.tools-hero__stats'\)/, nombre);
  }
});

test('cargan el módulo y la hoja de vista previa y lo inician justo tras requireAuth', () => {
  for (const [nombre, src] of [['herramientas', HERR], ['infusiones', INF]]) {
    assert.match(src, /<link rel="stylesheet" href="\.\.\/assets\/css\/club-paywall\.css\?v=[\w.-]+">/, nombre);
    assert.match(src, /<script src="\.\.\/assets\/js\/club-paywall\.js\?v=[\w.-]+"><\/script>/, nombre);
    assert.ok(src.indexOf('club-shell.js') < src.indexOf('club-paywall.js'), nombre + ': el módulo va después de club-shell.js');
    const iAuth = src.indexOf('await ZOORIGEN_CLUB.requireAuth()');
    const iIni = src.indexOf('ZOO_PAYWALL.iniciar(');
    assert.ok(iAuth > 0 && iIni > iAuth, nombre + ': iniciar tras requireAuth');
    assert.ok(src.indexOf('club-paywall.js') < iAuth, nombre + ': el módulo se carga antes de usarse');
    // el menú, el tema y el menú móvil siguen igual
    assert.match(src, /ZOORIGEN_CLUB\.initTheme\(\)/, nombre);
    assert.match(src, /ZOORIGEN_CLUB\.renderSidebar\('herramientas', session\)/, nombre);
    assert.match(src, /ZOORIGEN_CLUB\.initMobileMenu\(\)/, nombre);
    // aviso de vista previa para quien no es miembro
    assert.match(src, /avisoVistaPreviaHTML\(/, nombre);
    assert.match(src, /Vista previa:<\/strong> puedes recorrer y llenar/, nombre);
  }
});

test('herramientas: cada acción que da un resultado pide membresía ANTES de leer o validar datos', () => {
  const acciones = ['calcularBCS'];
  for (const a of acciones) {
    const f = funcion(HERR, a);
    const i = f.indexOf('usoBloqueado(');
    assert.ok(i > 0, a + ' debe llamar a usoBloqueado');
    assert.match(f, /if \(usoBloqueado\('[^']+', rEl\)\) return;/, a);
    // no se valida (showErr) ni se calcula antes del aviso
    const antes = f.slice(0, i);
    assert.doesNotMatch(antes, /showErr\(|C\.bcs\(/, a + ': usó datos antes del aviso');
  }
  const ayuda = funcion(HERR, 'usoBloqueado');
  assert.match(ayuda, /ZOO_PAYWALL\.requiereMembresia\(accion\)/);
  assert.match(ayuda, /ZOO_PAYWALL\.bloqueoHTML\(/);
  assert.match(ayuda, /rEl\.className = 'tool-result is-visible'/);
});

test('infusiones: cada calculadora y la conversión pide membresía antes de leer datos', () => {
  const acciones = ['calcularCRI', 'calcularDilucion', 'calcularConversion', 'calcularRelacion', 'calcularDuracion'];
  for (const a of acciones) {
    const f = funcion(INF, a);
    const i = f.indexOf('usoBloqueado(');
    assert.ok(i > 0, a + ' debe llamar a usoBloqueado');
    assert.match(f, /if \(usoBloqueado\('[^']+', el\)\) return;/, a);
    assert.doesNotMatch(f.slice(0, i), /valor\(|opcional\(|showErr\(/, a + ': leyó datos antes del aviso');
  }
  const ayuda = funcion(INF, 'usoBloqueado');
  assert.match(ayuda, /ZOO_PAYWALL\.requiereMembresia\(accion\)/);
  assert.match(ayuda, /el\.className = 'tool-result is-visible'/);
  // los chips solo llegan a calcular a través de calcularConversion (que ya pide membresía)
  assert.match(INF, /if \(\$\('convValor'\)\.value\.trim\(\) !== ''\) calcularConversion\(\); else \$\('convValor'\)\.focus\(\);/);
});

test('navegar y llenar sigue funcionando sin membresía: pestañas, modo, BCS y filtros no piden nada', () => {
  // ninguno de estos manejadores llama a requiereMembresia
  for (const nombre of ['filtrarEspecies', 'resetearForm']) {
    assert.doesNotMatch(funcion(HERR, nombre), /requiereMembresia|usoBloqueado/, nombre);
  }
  assert.doesNotMatch(funcion(INF, 'limpiar'), /requiereMembresia|usoBloqueado/);
  assert.doesNotMatch(funcion(INF, 'refrescarDestino'), /requiereMembresia|usoBloqueado/);
  // los manejadores de pestañas y de BCS siguen en la rama común (no dentro de if (!esMiembro))
  const hIni = HERR.indexOf(".querySelectorAll('.tool-tab')");
  assert.ok(hIni > HERR.indexOf('ZOO_PAYWALL.iniciar('));
  assert.match(HERR, /document\.querySelectorAll\('\.bcs-item'\)\.forEach/);
});

test('constantes: la vista previa muestra nombres y NO carga los valores ni las fuentes', () => {
  const ctx = vm.createContext({ ZOO_CALCULOS: CALC, ZOO_PAYWALL: PAYWALL });
  vm.runInContext(funcion(HERR, 'tarjetaVistaPrevia'), ctx);
  const grupos = [[CONST.ESPECIES, e => e.grupo]];
  for (const [lista, sub] of grupos) {
    let conDatos = 0;
    for (const e of lista) {
      const html = ctx.tarjetaVistaPrevia(e, CALC.esc(sub(e)));
      assert.ok(html.includes(CALC.esc(e.esp)), 'falta el nombre de ' + e.esp);
      assert.ok(html.includes(CALC.esc(sub(e))), 'falta el grupo de ' + e.esp);
      if (!e.datos.length) continue;
      conDatos++;
      for (const d of e.datos) {
        assert.ok(html.includes(CALC.esc(d.campo)), 'falta el nombre del dato ' + d.campo);
        assert.ok(!html.includes(CALC.esc(d.valor)), 'el valor real de ' + e.esp + ' / ' + d.campo + ' no debe ir en la vista previa');
        if (d.url) assert.ok(!html.includes(CALC.esc(d.url)), 'la fuente de ' + e.esp + ' no debe ir en la vista previa');
        if (d.nota) assert.ok(!html.includes(CALC.esc(d.nota)), 'la nota no debe ir en la vista previa');
      }
      assert.match(html, /class="pw-vista pw-vista--compacta"/);
      assert.match(html, /href="club-suscripcion\.html"/);
      assert.match(html, /pw-barra/);
    }
    assert.ok(conDatos > 10);
  }
});

test('equivalencias de consulta rápida (infusiones): títulos visibles, valores con marcador', () => {
  const f = funcion(INF, 'iniciarConversiones');
  assert.match(f, /if \(!ZOO_PAYWALL\.miembro\(\)\) \{/);
  const rama = f.slice(f.indexOf('if (!ZOO_PAYWALL.miembro())'), f.indexOf('return;', f.indexOf('if (!ZOO_PAYWALL.miembro())')));
  assert.match(rama, /Z\.UNIDADES\[p\.de\]\.etiqueta \+ ' a ' \+ Z\.UNIDADES\[p\.a\]\.etiqueta/);
  assert.match(rama, /vistaBorrosaHTML\(ZOO_PAYWALL\.marcadorHTML\(/);
  assert.doesNotMatch(rama, /p\.texto/, 'el texto real de la equivalencia no debe ir en la vista previa');
  // la rama de miembros sigue igual
  assert.match(f, /'<div class="tool-info-card__value">' \+ E\(p\.texto\) \+ '<\/div><\/div>'\)\.join\(''\);/);
  // el módulo da equivalencias reales (que la rama de miembros muestra)
  assert.ok(INFUS.equivalencias().length >= 4);
});

test('el módulo decide: miembro, administrador y sin plan', () => {
  assert.equal(PAYWALL.esMiembro({ planStatus: 'active' }), true);
  assert.equal(PAYWALL.esMiembro({ planStatus: 'cancelled_active' }), true);
  assert.equal(PAYWALL.esMiembro({ role: 'admin', planStatus: 'pending_payment' }), true);
  assert.equal(PAYWALL.esMiembro({ planStatus: 'pending_payment' }), false);
  assert.equal(PAYWALL.esMiembro(null), false);
  // el bloque que ocupa el lugar del resultado lleva el botón a Suscripción y ningún dato
  const b = PAYWALL.bloqueoHTML();
  assert.match(b, /class="tool-paywall"/);
  assert.match(b, /href="club-suscripcion\.html"/);
});

test('sin emojis en las dos páginas ni degradados nuevos en su estilo', () => {
  for (const [nombre, src] of [['herramientas', HERR], ['infusiones', INF]]) {
    assert.ok(!EMOJI.test(src), 'emoji en ' + nombre);
    assert.doesNotMatch(src, /gradient\(/, 'degradado en ' + nombre);
  }
});
