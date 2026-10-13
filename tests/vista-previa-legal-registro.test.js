'use strict';
// Vista previa de Herramientas Legales y del Libro de registro para quien no es miembro:
// se ve toda la pantalla (pestañas, listas, campos) y solo se bloquea USAR. Se lee el HTML de cada página.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const LEGAL = leer('pages/club-legal.html');
const INV = leer('pages/club-inventario.html');
const PW = require('../assets/js/club-paywall.js');
const R = require('../assets/js/registro-ejemplares-ui.js');

// Texto de una función declarada con `function nombre(...) { ... }` (llaves balanceadas)
function cuerpo(html, nombre) {
  const i = html.search(new RegExp('(async )?function ' + nombre + '\\('));
  assert.ok(i >= 0, 'no se encontró la función ' + nombre);
  const a = html.indexOf('{', html.indexOf(')', i));
  let n = 0;
  for (let j = a; j < html.length; j++) {
    if (html[j] === '{') n++;
    else if (html[j] === '}' && --n === 0) return html.slice(i, j + 1);
  }
  throw new Error('llaves sin cerrar en ' + nombre);
}
const primeraLinea = f => f.slice(f.indexOf('{') + 1).trim().split('\n')[0].trim();

test('las dos páginas cargan el módulo compartido en orden y no reemplazan la pantalla', () => {
  for (const [rel, h] of [['club-legal', LEGAL], ['club-inventario', INV]]) {
    assert.match(h, /club-paywall\.css\?v=[\w.-]+/, rel);
    const iShell = h.indexOf('club-shell.js'), iPw = h.indexOf('club-paywall.js'), iIco = h.indexOf('herramientas-iconos.js');
    assert.ok(iShell > 0 && iPw > iShell && iIco > iPw, rel + ': club-paywall.js va después de club-shell.js');
    assert.match(h, /ZOO_PAYWALL\.iniciar\(\{ sesion: session, club: ZOORIGEN_CLUB \}\)/, rel);
    assert.doesNotMatch(h, /Herramientas exclusivas para miembros/, rel);
    assert.doesNotMatch(h, /ZOORIGEN_CLUB\.showPaywall\(/, rel);
    assert.doesNotMatch(h, /function bloquear\(\)/, rel);
    assert.match(h, /club-suscripcion\.html/, rel);
  }
  assert.doesNotMatch(LEGAL, /querySelectorAll\('\.legal-panel, \.legal-tabs/);
  assert.doesNotMatch(INV, /\$\('regApp'\)\.style\.display = 'none'/);
});

test('legal: cada acción de uso pide membresía antes de hacer nada', () => {
  const esperado = {
    copiarNOM: 'Copiar la cita legal',
    copiarFichaNOM: 'Copiar la ficha',
    generarInformeUMA: 'Generar el borrador del informe UMA',
    copiarInformeUMA: 'Copiar el borrador del informe UMA',
    descargarInformeUMA: 'Descargar el borrador del informe UMA',
    cambiarCuota: 'Calcular el total estimado de derechos',
    toggleCheck: 'Marcar los puntos de la lista de revisión',
    resetChecklist: 'Reiniciar la lista de revisión'
  };
  for (const [fn, texto] of Object.entries(esperado)) {
    const l = primeraLinea(cuerpo(LEGAL, fn));
    assert.match(l, /ZOO_PAYWALL\.requiereMembresia\(/, fn + ' debe pedir membresía en su primera línea');
    assert.ok(l.includes(texto), fn + ' → ' + texto);
  }
});

test('legal: la tarjeta de vista previa de la NOM-059 no lleva el dato real debajo del difuminado', () => {
  const f = cuerpo(LEGAL, 'nomTarjetaVista');
  for (const prohibido of ['sp.cat', 'sp.cites', 'sp.dist', 'sp.habitat', 'sp.amenaza', 'sp.endemica', 'CAT_LABELS']) {
    assert.ok(!f.includes(prohibido), 'nomTarjetaVista usa ' + prohibido);
  }
  // sí muestra nombre, científico y grupo
  for (const permitido of ['sp.comun', 'sp.cientifico', 'sp.grupo']) assert.ok(f.includes(permitido), permitido);
  // se ejecuta con el módulo real: marcadores y botones que piden membresía, sin datos de la ficha
  const zlEsc = PW.esc;
  const nomTarjetaVista = new Function('ZOO_PAYWALL', 'zlEsc', f + '\nreturn nomTarjetaVista;')(PW, zlEsc);
  const html = nomTarjetaVista({ comun: 'Jaguar', cientifico: 'Panthera onca', grupo: 'Mamíferos', cat: 'P', cites: 'I', dist: 'SELVA-REAL', habitat: 'HABITAT-REAL', amenaza: 'AMENAZA-REAL', endemica: true }, 3);
  assert.match(html, /Jaguar/);
  assert.match(html, /Panthera onca/);
  assert.match(html, /pw-vista__contenido/);
  assert.match(html, /onclick="copiarNOM\(3\)"/);
  assert.match(html, /onclick="copiarFichaNOM\(3\)"/);
  for (const real of ['SELVA-REAL', 'HABITAT-REAL', 'AMENAZA-REAL', 'Peligro', 'CITES: I']) assert.ok(!html.includes(real), real);
});

test('legal: derechos con precio de relleno, total bloqueado y sin guardar nada en vista previa', () => {
  const rc = cuerpo(LEGAL, 'renderCuotas');
  assert.match(rc, /const vista = !ZOO_PAYWALL\.miembro\(\)/);
  assert.match(rc, /zl-precio__num[^`]*\$00,000\.00/);
  const at = cuerpo(LEGAL, 'actualizarTotal');
  assert.match(at, /bloqueoHTML\(/);
  assert.match(at, /if \(!ZOO_PAYWALL\.miembro\(\)\)/);
  const rl = cuerpo(LEGAL, 'renderChecklist');
  assert.match(rl, /const guardado = vista \? \{\} : zlAlmacen\.leer/);
  assert.match(rl, /marcadorHTML\(/);
});

test('legal: CITES y Marco Legal dejan solo títulos y cambian el texto por marcadores', () => {
  const c = cuerpo(LEGAL, 'citesVista');
  assert.match(c, /vistaBorrosaHTML\(/);
  assert.match(c, /marcadorHTML\(/);
  assert.match(c, /querySelector\('h3'\)/);
  const m = cuerpo(LEGAL, 'marcoVista');
  assert.match(m, /p\.remove\(\)/);
  assert.match(m, /vistaBorrosaHTML\(/);
  assert.match(cuerpo(LEGAL, 'renderCITES'), /ZOO_PAYWALL\.miembro\(\) \? html : citesVista\(html\)/);
  assert.match(cuerpo(LEGAL, 'renderMarcoLegal'), /ZOO_PAYWALL\.miembro\(\) \? html : marcoVista\(html\)/);
});

test('registro: sin membresía no se llama al servidor y las acciones piden membresía', () => {
  // cargar() y cargarInforme() resuelven con ejemplos antes de cualquier apiFetch
  for (const fn of ['cargar', 'cargarInforme']) {
    const f = cuerpo(INV, fn);
    const iVista = f.indexOf('modoVista'), iApi = f.indexOf('apiFetch');
    assert.ok(iVista >= 0 && iApi > iVista, fn + ': la rama de vista previa va antes de apiFetch');
  }
  assert.match(cuerpo(INV, 'recargarSilencioso'), /if \(modoVista\) return;/);
  // funciones de uso
  for (const [fn, accion] of [['abrirFormEvento', 'evento'], ['abrirFicha', 'ficha'], ['deshacerEvento', "'borrar-evento'"]]) {
    assert.match(primeraLinea(cuerpo(INV, fn)), /if \(!puede\(/, fn);
    assert.ok(cuerpo(INV, fn).includes(accion), fn + ' usa ' + accion);
  }
  assert.match(cuerpo(INV, 'abrirFormEjemplar'), /if \(!puede\(edita \?/);
  // el delegado de clics corta antes de llegar a abrir, copiar o descargar
  assert.match(INV, /if \(modoVista\) \{ if \(ACCIONES_DE_USO\[accion\]\) puede\(ACCIONES_DE_USO\[accion\]\); return; \}/);
  for (const a of ['agregar', 'ficha', 'evento', 'borrar-evento', 'copiar', 'txt', 'csv-resumen', 'csv-movimientos']) {
    assert.match(INV, new RegExp("(^|\\s|')" + a.replace('-', '\\-') + "'?: '[^']+'"), 'ACCIONES_DE_USO sin ' + a);
  }
  // csv del inventario, guardar y limpiar los datos de la unidad
  assert.match(INV, /btnCsvInventario'\)\.addEventListener\('click', \(\) => \{\s*if \(!puede\(/);
  assert.match(INV, /if \(modoVista\) return; almacen\.guardar\(CLAVE_UNIDAD/);
  assert.match(INV, /id="btnGuardarUnidad"/);
  assert.match(INV, /puede\('Guardar los datos de la unidad'\)/);
  assert.match(INV, /modoVista \? UNIDAD_VACIA : R\.unidadLimpia\(almacen\.leer/);
});

test('registro: los ejemplos de muestra son 2, están marcados como ejemplo y cuadran con el informe', () => {
  const a = cuerpo(INV, 'datosEjemplo'), b = cuerpo(INV, 'informeEjemplo');
  const fabrica = new Function('R', a + '\n' + b + '\nreturn { datosEjemplo, informeEjemplo };')(R);
  const d = fabrica.datosEjemplo();
  assert.equal(d.ejemplares.length, 2);
  for (const e of d.ejemplares) {
    assert.match(e.id, /^ejemplo-\d$/);
    assert.match(e.nombreComun + ' ' + e.marca + ' ' + e.origen, /ejemplo/i);
    assert.equal(e.estado, 'activo');
    assert.ok(R.fechaValida(e.fechaIngreso));
    assert.ok(e.fechaIngreso <= d.hoy, 'el ingreso de muestra no puede ser futuro');
  }
  assert.ok(d.eventos.length >= 1 && d.eventos.every(v => /^ejemplo-/.test(v.ejemplarId)));
  const hoy = d.hoy, anio = Number(hoy.slice(0, 4));
  const inf = fabrica.informeEjemplo(anio);
  assert.equal(inf.anio, anio);
  assert.equal(inf.enCurso, true);
  assert.equal(inf.porEspecie.length, 2);
  assert.equal(inf.total.existenciasFin, 2);
  assert.equal(inf.movimientos.length, 2);
  assert.equal(R.informeVacio(fabrica.informeEjemplo(anio - 1)), true);
  // la bitácora y el inventario se arman con las mismas funciones del módulo
  assert.equal(R.construirBitacora(d.ejemplares, d.eventos).length, 3);
  assert.equal(R.htmlInventario(d.ejemplares).includes('Ejemplo 1'), true);
});

test('registro: el borrador del informe no se arma ni se muestra en vista previa', () => {
  const f = cuerpo(INV, 'pintarInforme');
  assert.match(f, /const b = modoVista \? null : R\.construirBorrador/);
  assert.match(f, /modoVista\s*\?\s*ZOO_PAYWALL\.vistaBorrosaHTML\(ZOO_PAYWALL\.marcadorHTML\(/);
  assert.match(f, /if \(pre && b\)/);
});
