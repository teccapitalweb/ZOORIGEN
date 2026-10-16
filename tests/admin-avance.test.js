'use strict';

// Panel de administración · sección «Avance de miembros»: ensayo de la importación del avance del sitio anterior
// (GET /api/admin/progreso-legado) e importación por persona (POST /api/admin/progreso-legado/:uid/importar).
// Las ayudas puras (insignias, frases, botones) y el dibujo de la tabla se prueban aquí sin red ni navegador.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const I = require(path.join(RAIZ, 'assets', 'js', 'admin-iconos.js'));
const html = leer('pages/admin-club.html');
const vistasJs = leer('assets/js/admin-vistas.js');
const css = leer('assets/css/admin-club.css');

const fila = (extra = {}) => ({
  uid: 'ana', nombre: 'Ana Pérez', correo: 'a**@example.com', estadoPlan: 'activo', planTipo: 'mensual', conAcceso: true,
  veredicto: 'completo', elegible: true, motivoNoElegible: null, importado: false, importadoEn: null, verificado: null, formatoInvalido: false,
  cursosConAvance: 2, clasesViejas: 4, clasesImportables: 4, clasesPerdidas: 0, clasesFaltantes: 0,
  cursosCompletadosViejos: 0, listosParaCertificado: 0, entradasInvalidas: 0,
  certificados: { total: 0, firmados: 0, aceptables: 0, noAceptables: 0 }, detalleRecortado: false,
  cursos: [{ cursoId: 'c1', estado: 'ok', curso: 'Aves rapaces', clasesViejas: 3, clasesImportables: 3, clasesPerdidas: 0, clasesActuales: 3, completadoViejo: false, certificado: null, faltantes: 0 }],
  ...extra
});

test('la sección existe, está en Sistema, tiene botón en la barra lateral y se dibuja desde renderSection', () => {
  const s = P.seccion('avance');
  assert.equal(s.grupo, 'Sistema');
  assert.equal(s.titulo, 'Avance de miembros');
  assert.equal(s.origen, 'servidor');
  assert.ok(I.existe(s.icono));
  assert.match(html, /data-sec="avance"><svg class="zi"/);
  assert.match(html, /sec === 'avance'\) V\.avance\(\)/);
  assert.equal(P.seccionDeHash('#/avance'), 'avance');
});

test('las versiones de los archivos cambiados suben juntas en la página', () => {
  const v = html.match(/admin-club\.css\?v=([\w-]+)/)[1];
  assert.equal(html.match(/admin-panel\.js\?v=([\w-]+)/)[1], v);
  assert.equal(html.match(/admin-vistas\.js\?v=([\w-]+)/)[1], v);
});

test('insignias: un estado claro por veredicto, con ícono y texto (nunca solo color)', () => {
  const casos = [
    [fila({ veredicto: 'completo' }), 'Completo, por importar', 'info', 'importar'],
    [fila({ veredicto: 'parcial', clasesPerdidas: 2 }), 'Parcial', 'aviso', 'importar'],
    [fila({ veredicto: 'no-elegible', elegible: false, motivoNoElegible: 'cuenta-posterior' }), 'No elegible', 'error', 'forzar'],
    [fila({ veredicto: 'ya-importado', importado: true }), 'Importado y verificado', 'ok', null],
    [fila({ veredicto: 'ya-importado', importado: true, clasesFaltantes: 3 }), 'Importado, faltan clases', 'aviso', 'reparar'],
    [fila({ veredicto: 'ya-importado', importado: true, clasesPerdidas: 1 }), 'Importado; algunas clases ya no existen', 'aviso', null],
    [fila({ veredicto: 'sin-progreso-viejo' }), 'Sin avance anterior', 'neutro', null]
  ];
  for (const [f, texto, tono, accion] of casos) {
    const e = P.estadoAvance(f);
    assert.equal(e.texto, texto);
    assert.equal(e.tono, tono);
    assert.equal(e.accion, accion);
    assert.ok(I.existe(e.icono), 'ícono ' + e.icono);
    const h = P.insigniaAvance(f);
    assert.match(h, new RegExp(`ap-badge--${tono}`));
    assert.match(h, /<svg/);
    assert.ok(h.includes(texto));
  }
});

test('frase de arriba en lenguaje llano: «7 de 7 miembros con avance verificado»', () => {
  const todo = P.resumenAvance({ conAvanceViejo: 7, verificados: 7, requierenRevision: 0, completos: 0, clasesViejas: 30, clasesImportables: 30, clasesPerdidas: 0 });
  assert.equal(todo.titulo, '7 de 7 miembros con avance verificado');
  assert.equal(todo.tono, 'ok');
  assert.match(todo.detalle, /Nadie perdería nada/);
  const uno = P.resumenAvance({ conAvanceViejo: 1, verificados: 1, requierenRevision: 0 });
  assert.equal(uno.titulo, '1 de 1 miembro con avance verificado');
  const revisar = P.resumenAvance({ conAvanceViejo: 7, verificados: 5, requierenRevision: 2, completos: 3, clasesViejas: 30, clasesImportables: 27, clasesPerdidas: 3 });
  assert.equal(revisar.titulo, '5 de 7 miembros con avance verificado');
  assert.equal(revisar.tono, 'aviso');
  assert.match(revisar.detalle, /2 necesitan tu revisión/);
  assert.match(revisar.detalle, /3 se importarán solos/);
  assert.match(revisar.detalle, /3 ya no existen en su curso/);
  const una = P.resumenAvance({ conAvanceViejo: 3, verificados: 2, requierenRevision: 1 });
  assert.match(una.detalle, /1 necesita tu revisión/);
  const nadie = P.resumenAvance({ conAvanceViejo: 0 });
  assert.match(nadie.titulo, /Ningún miembro/);
  assert.equal(nadie.tono, 'neutro');
});

test('detalle por persona y textos de curso y de motivo, sin tecnicismos', () => {
  assert.match(P.detalleAvance(fila({ veredicto: 'no-elegible', motivoNoElegible: 'cuenta-posterior' })), /se creó después de la fecha de corte/);
  assert.match(P.detalleAvance(fila({ veredicto: 'no-elegible', motivoNoElegible: 'sin-corte' })), /importación automática está apagada/);
  assert.match(P.detalleAvance(fila({ veredicto: 'parcial', clasesPerdidas: 1 })), /1 clase ya no existe/);
  assert.match(P.detalleAvance(fila({ veredicto: 'parcial', clasesPerdidas: 3 })), /3 clases ya no existen/);
  assert.match(P.detalleAvance(fila({ listosParaCertificado: 2 })), /2 cursos esperan su certificado/);
  assert.equal(P.detalleAvance(fila()), '');
  for (const estado of ['ok', 'listo-para-certificado', 'fuera-de-rango', 'curso-eliminado', 'sin-clases', 'id-invalido', 'excede-limite', 'datos-invalidos']) {
    assert.notEqual(P.textoEstadoCurso(estado), 'Sin revisar', estado);
  }
  assert.equal(P.textoEstadoCurso('inventado'), 'Sin revisar');
});

// ── Dibujo de la sección con un navegador falso mínimo ──
function cargarVistas() {
  const contenedor = { innerHTML: '', onclick: null };
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.self = sandbox;
  sandbox.ZOO_ADMIN_PANEL = P;
  sandbox.ZOO_ICONOS = I;
  sandbox.document = { createElement: () => ({}), body: {}, querySelector: () => null, addEventListener() {}, removeEventListener() {} };
  vm.createContext(sandbox);
  vm.runInContext(vistasJs, sandbox);
  return { V: sandbox.ZOO_ADMIN_VISTAS, contenedor };
}

function datos(extra = {}) {
  const miembros = [
    fila({ uid: 'carla', nombre: 'Carla Soto', veredicto: 'parcial', clasesViejas: 5, clasesImportables: 2, clasesPerdidas: 3 }),
    fila({ uid: 'luis', nombre: 'Luis <b>Mora</b>', veredicto: 'no-elegible', elegible: false, motivoNoElegible: 'cuenta-posterior' }),
    fila({ uid: 'ana' }),
    fila({ uid: 'fer', nombre: 'Fer Mora', veredicto: 'ya-importado', importado: true, verificado: true })
  ];
  return {
    ok: true, pagina: 1, paginas: 1, limite: 25, total: 4, truncado: false,
    configuracion: { importacionActiva: true, corte: '2026-10-16T00:00:00.000Z', certificados: 'transicion', firmaConfigurada: true },
    resumen: { miembros: 9, conAvanceViejo: 4, completos: 1, parciales: 1, noElegibles: 1, yaImportadosVerificados: 1, yaImportadosConFaltantes: 0, yaImportadosConPerdidas: 0, clasesViejas: 18, clasesImportables: 12, clasesPerdidas: 3, listosParaCertificado: 0, sinProgresoViejo: 5, verificados: 2, requierenRevision: 2 },
    miembros, ...extra
  };
}

test('la sección dibuja resumen, tabla con etiquetas para celular, botones por estado y escapa el texto del servidor', async () => {
  const { V, contenedor } = cargarVistas();
  const llamadas = [];
  V.iniciar({ api: async ruta => { llamadas.push(ruta); return datos(); }, toast() {}, contenedor: () => contenedor });
  await V.avance();
  assert.deepEqual(llamadas, ['/api/admin/progreso-legado?pagina=1&limite=25']);
  const h = contenedor.innerHTML;
  assert.match(h, /2 de 4 miembros con avance verificado/);
  assert.match(h, /Que nadie pierda/);
  for (const etiqueta of ['Miembro', 'Plan', 'Cursos con avance', 'Clases del sitio anterior', 'Clases importadas', 'Estado']) {
    assert.ok(h.includes(`data-label="${etiqueta}"`), etiqueta);
  }
  assert.equal((h.match(/data-accion="importar"/g) || []).length, 2, 'completo y parcial');
  assert.equal((h.match(/data-accion="forzar"/g) || []).length, 1, 'no elegible');
  assert.equal((h.match(/data-accion="detalle"/g) || []).length, 4);
  assert.equal(h.includes('Luis <b>Mora</b>'), false);
  assert.ok(h.includes('Luis &lt;b&gt;Mora&lt;/b&gt;'));
  assert.match(h, /Mostrando 1 a 4 de 4/);
  assert.match(h, /16 oct 2026|15 oct 2026/, 'la fecha de corte se muestra en lenguaje llano');
  assert.equal(typeof contenedor.onclick, 'function');
});

test('sin miembros con avance anterior: vacío amable; con importación apagada: aviso rojo claro; con error: mensaje y reintento', async () => {
  const vacia = cargarVistas();
  vacia.V.iniciar({ api: async () => datos({ miembros: [], total: 0, resumen: { ...datos().resumen, conAvanceViejo: 0, verificados: 0, requierenRevision: 0 } }), toast() {}, contenedor: () => vacia.contenedor });
  await vacia.V.avance();
  assert.match(vacia.contenedor.innerHTML, /Nadie tiene avance del sitio anterior/);

  const apagada = cargarVistas();
  apagada.V.iniciar({ api: async () => datos({ configuracion: { importacionActiva: false, corte: null, certificados: 'transicion', firmaConfigurada: false } }), toast() {}, contenedor: () => apagada.contenedor });
  await apagada.V.avance();
  assert.match(apagada.contenedor.innerHTML, /La importación automática está apagada/);
  assert.match(apagada.contenedor.innerHTML, /LEGACY_PROGRESS_IMPORT_BEFORE/);
  assert.match(apagada.contenedor.innerHTML, /Los certificados no están configurados/);

  const roto = cargarVistas();
  roto.V.iniciar({ api: async () => { throw Object.assign(new Error('Servidor caído'), { status: 500 }); }, toast() {}, contenedor: () => roto.contenedor });
  await roto.V.avance();
  assert.match(roto.contenedor.innerHTML, /Algo salió mal/);
  assert.match(roto.contenedor.innerHTML, /data-accion="recargar"/);
});

test('paginación: los botones piden la página siguiente y la anterior al servidor', async () => {
  const { V, contenedor } = cargarVistas();
  const llamadas = [];
  V.iniciar({
    api: async ruta => { llamadas.push(ruta); const pagina = Number((/pagina=(\d+)/.exec(ruta) || [])[1]); return datos({ pagina, paginas: 3, total: 60 }); },
    toast() {}, contenedor: () => contenedor
  });
  await V.avance();
  const clic = accion => contenedor.onclick({ target: { closest: () => ({ dataset: { accion } }) }, preventDefault() {} });
  clic('siguiente');
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  assert.equal(llamadas.at(-1), '/api/admin/progreso-legado?pagina=2&limite=25');
  clic('anterior');
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  assert.equal(llamadas.at(-1), '/api/admin/progreso-legado?pagina=1&limite=25');
  assert.match(contenedor.innerHTML, /Página 1 de 3/);
});

test('la sección solo habla con el servidor: GET del ensayo y POST de importar, y pide confirmación antes de importar', () => {
  assert.match(vistasJs, /'\/api\/admin\/progreso-legado\?pagina='/);
  assert.match(vistasJs, /'\/api\/admin\/progreso-legado\/' \+ encodeURIComponent\(uid\) \+ '\/importar'/);
  assert.match(vistasJs, /var ok = await confirmar\(\{ titulo: t\.titulo[\s\S]{0,200}if \(!ok\) return;[\s\S]{0,300}method: 'POST'/);
  // el uid va en la ruta de la petición, nunca en el enlace del panel
  assert.doesNotMatch(vistasJs, /location\.hash\s*=.*uid/);
});

test('hoja de estilos: sin degradados, letra de 12 px o más, y la tabla pasa a tarjetas en celular', () => {
  const trozo = css.slice(css.indexOf('Avance de miembros'), css.indexOf('Miembros: controles y tabla'));
  assert.ok(trozo.length > 200);
  assert.doesNotMatch(trozo, /gradient\(/i);
  for (const m of trozo.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) {
    const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
    assert.ok(px >= 11.99, `letra de ${px}px: ${m[0]}`);
  }
  assert.doesNotMatch(vistasJs.slice(vistasJs.indexOf('AVANCE DE MIEMBROS')), /[\p{Extended_Pictographic}\u{FE0F}]/u);
});
