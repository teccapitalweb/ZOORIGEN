'use strict';

// PDFs y materiales: formatos PDF, Excel y PowerPoint (insignia, filtro por formato, botón Descargar sin visor),
// portadas de los 20 materiales nuevos (fotografía con ilustración de respaldo) y descarga con fetch + token.
// Ejecutar: node --test tests/club-materiales-office.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../assets/js/club-materiales.js');

const RAIZ = path.join(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const base = { id: 'x', titulo: 'Hoja de prueba', area: 'Sanidad', paginas: 4, acceso: 'miembros', requiereRetos: 0, desbloqueado: true, soloMiembros: false, faltan: 0 };
const NUEVOS = ['inventario-botiquin-caducidad', 'libro-entradas-salidas-insumos', 'peso-curva-crecimiento', 'calendario-preventivo-protocolo', 'registro-ingresos-bajas-traslados',
  'presupuesto-anual-uma-zoologico', 'bitacora-enriquecimiento-semanal', 'control-alimentacion-recintos', 'ppt-bioseguridad-recintos', 'ppt-enriquecimiento-ambiental', 'ppt-fototrampeo-muestreo',
  'ppt-uma-pimvs-zoologicos', 'ppt-observacion-conductual-etogramas', 'cuarentena-recepcion-ejemplares', 'formato-necropsia-mortalidad', 'plantilla-plan-manejo-uma', 'etograma-hoja-observacion',
  'carteles-visitantes-senales', 'checklist-auditoria-bienestar', 'guia-rotulado-trazabilidad-muestras'];

test('formatoDe: lo que manda el servidor manda; sin formato sale del tipo', () => {
  assert.equal(M.formatoDe({ formato: 'excel', tipo: 'excel' }), 'excel');
  assert.equal(M.formatoDe({ formato: 'powerpoint' }), 'powerpoint');
  assert.equal(M.formatoDe({ tipo: 'excel' }), 'excel');
  assert.equal(M.formatoDe({ tipo: 'powerpoint' }), 'powerpoint');
  assert.equal(M.formatoDe({ tipo: 'guia' }), 'pdf');
  assert.equal(M.formatoDe({ formato: '<script>', tipo: 'guia' }), 'pdf');
  assert.equal(M.formatoDe(null), 'pdf');
  assert.equal(M.esDescarga({ tipo: 'excel' }), true);
  assert.equal(M.esDescarga({ tipo: 'powerpoint' }), true);
  assert.equal(M.esDescarga({ tipo: 'checklist' }), false);
});

test('textos: cantidad con su unidad, tamaño, fecha y detalle del archivo', () => {
  assert.equal(M.cantidadTexto({ tipo: 'excel', paginas: 4 }), '4 hojas');
  assert.equal(M.cantidadTexto({ tipo: 'excel', paginas: 1 }), '1 hoja');
  assert.equal(M.cantidadTexto({ tipo: 'powerpoint', paginas: 16 }), '16 diapositivas');
  assert.equal(M.cantidadTexto({ tipo: 'guia', paginas: 7 }), '7 páginas');
  assert.equal(M.cantidadTexto({ tipo: 'guia', paginas: 0 }), '');
  assert.equal(M.tamanoTexto({ tamanoKb: 28 }), '28 KB');
  assert.equal(M.tamanoTexto({ tamanoKb: 1536 }), '1,5 MB');
  assert.equal(M.tamanoTexto({}), '');
  assert.equal(M.fechaTexto('2026-10-22'), '22/10/2026');
  assert.equal(M.fechaTexto('22/10/2026'), '');
  assert.equal(M.detalleArchivoTexto({ version: '1.0', fecha: '2026-10-22', tamanoKb: 57 }), 'v1.0 · 22/10/2026 · 57 KB');
  assert.equal(M.detalleArchivoTexto({}), '');
});

test('tarjeta de Excel y PowerPoint: insignia del formato, detalle del archivo y botón Descargar (sin visor) si está abierto', () => {
  const hoja = M.materialCardHTML({ ...base, id: 'inventario-botiquin-caducidad', tipo: 'excel', formato: 'excel', paginas: 3, tamanoKb: 28, version: '1.0', fecha: '2026-10-22' }, {});
  assert.match(hoja, /mt-doc--excel/);
  assert.match(hoja, /mt-doc__fmt--excel/);
  assert.match(hoja, />Excel</);
  assert.match(hoja, /3 hojas/);
  assert.match(hoja, /v1\.0 · 22\/10\/2026 · 28 KB/);
  assert.match(hoja, /data-descargar="inventario-botiquin-caducidad"/);
  assert.match(hoja, /Descargar/);
  assert.doesNotMatch(hoja, />PDF</);
  const deck = M.materialCardHTML({ ...base, id: 'ppt-x', tipo: 'powerpoint', formato: 'powerpoint', paginas: 16 }, {});
  assert.match(deck, /16 diapositivas/);
  assert.match(deck, /mt-doc__chip--powerpoint/);
  assert.match(deck, /data-descargar="ppt-x"/);
  // Bloqueado o en vista previa: sin botón Descargar (solo el candado y la condición)
  const cerrada = M.materialCardHTML({ ...base, tipo: 'excel', formato: 'excel', desbloqueado: false, faltan: 3, requiereRetos: 4 }, {});
  assert.doesNotMatch(cerrada, /data-descargar/);
  const previa = M.materialCardHTML({ ...base, tipo: 'powerpoint', formato: 'powerpoint', desbloqueado: false, soloMiembros: true }, {});
  assert.doesNotMatch(previa, /data-descargar/);
  assert.match(previa, /Solo miembros/);
});

test('tarjeta de un PDF no cambia: insignia PDF y sin botón Descargar (se abre en el visor)', () => {
  const pdf = M.materialCardHTML({ ...base, tipo: 'guia', formato: 'pdf', paginas: 3 }, {});
  assert.match(pdf, /mt-doc__fmt--pdf/);
  assert.match(pdf, />PDF</);
  assert.match(pdf, /3 páginas/);
  assert.doesNotMatch(pdf, /data-descargar/);
});

test('la tarjeta de un material canjeable sigue mostrando la insignia y el botón de créditos que le pasa el módulo de créditos', () => {
  const canje = '<div class="zcr-canje"><span class="zcr-ins">Canjeable por 100 créditos</span><button data-canjear="pdf:x">Canjear</button></div>';
  const h = M.materialCardHTML({ ...base, tipo: 'excel', formato: 'excel', desbloqueado: false, soloMiembros: false, faltan: 3, requiereRetos: 4 }, { canje });
  assert.match(h, /Canjeable por 100 créditos/);
  assert.match(h, /data-canjear="pdf:x"/);
});

test('filtro por formato: pdf, excel, powerpoint y todos; también cuenta en la búsqueda', () => {
  const lista = [
    { ...base, id: 'a', tipo: 'guia', titulo: 'Guía A' },
    { ...base, id: 'b', tipo: 'excel', formato: 'excel', titulo: 'Inventario B' },
    { ...base, id: 'c', tipo: 'powerpoint', formato: 'powerpoint', titulo: 'Presentación C' },
    { ...base, id: 'd', tipo: 'presentacion', titulo: 'Presentación D' }
  ];
  const ids = l => l.map(m => m.id).join('');
  assert.equal(ids(M.filtrarMateriales(lista, { formato: 'excel' })), 'b');
  assert.equal(ids(M.filtrarMateriales(lista, { formato: 'powerpoint' })), 'c');
  assert.equal(ids(M.filtrarMateriales(lista, { formato: 'pdf' })), 'ad');
  assert.equal(ids(M.filtrarMateriales(lista, { formato: 'todos' })), 'abcd');
  assert.equal(ids(M.filtrarMateriales(lista, { formato: '' })), 'abcd');
  assert.equal(ids(M.filtrarMateriales(lista, { formato: 'inventado' })), 'abcd');
  assert.equal(ids(M.filtrarMateriales(lista, { texto: 'excel' })), 'b', 'se busca también por el nombre del formato');
  assert.equal(ids(M.filtrarMateriales(lista, { pestana: 'presentaciones' })), 'cd', 'PowerPoint cuenta como presentación');
  assert.equal(ids(M.filtrarMateriales(lista, { pestana: 'guias' })), 'ab');
  assert.equal(ids(M.filtrarMateriales(lista, { pestana: 'presentaciones', formato: 'powerpoint' })), 'c');
});

test('formatosHTML: los cuatro filtros con su cuenta; sin Excel ni PowerPoint en el catálogo no aparece', () => {
  const lista = [{ tipo: 'guia' }, { tipo: 'excel' }, { tipo: 'excel' }, { tipo: 'powerpoint' }];
  const h = M.formatosHTML(lista, 'excel');
  for (const f of ['todos', 'pdf', 'excel', 'powerpoint']) assert.match(h, new RegExp('data-formato-filtro="' + f + '"'));
  assert.match(h, /class="mt-fmt is-active" data-formato-filtro="excel" aria-pressed="true"/);
  assert.match(h, /Todos los formatos<\/span><b>4<\/b>/);
  assert.match(h, /Excel<\/span><b>2<\/b>/);
  assert.match(h, /PowerPoint<\/span><b>1<\/b>/);
  assert.equal(M.formatosHTML([{ tipo: 'guia' }], 'todos'), '');
});

test('fila de material (curso o suelto): un Excel dice Descargar y lleva su ícono; un PDF sigue diciendo Abrir', () => {
  const f = M.filaMaterialHTML({ ...base, tipo: 'excel', formato: 'excel', paginas: 3 }, {});
  assert.match(f, /Descargar/);
  assert.match(f, /Excel · 3 hojas/);
  assert.doesNotMatch(f, />Abrir</);
  assert.match(M.filaMaterialHTML({ ...base, tipo: 'guia' }, {}), />Abrir</);
});

test('portadas de los 20 materiales nuevos: fotografía JPG que pesa poco y su ilustración PNG de respaldo', () => {
  for (const id of NUEVOS) {
    const ruta = M.portadaDe(id);
    assert.ok(ruta, id + ' sin portada');
    const archivo = path.join(RAIZ, ruta.replace(/^\.\.\//, ''));
    assert.ok(fs.existsSync(archivo), id + ': falta ' + ruta);
    assert.ok(fs.statSync(archivo).size < 150 * 1024, id + ' pesa 150 KB o más');
    assert.ok(fs.statSync(archivo).size > 5 * 1024, id + ' casi vacía');
    const respaldo = M.portadaRespaldoDe(id);
    assert.ok(respaldo, id + ' sin respaldo');
    assert.ok(fs.existsSync(path.join(RAIZ, respaldo.replace(/^\.\.\//, ''))), id + ': falta el respaldo ' + respaldo);
    assert.match(ruta, /\.jpg$/, id + ' debe usar la fotografía');
    assert.match(respaldo, /\.png$/, id + ': el respaldo es la ilustración');
    assert.ok(fs.statSync(path.join(RAIZ, respaldo.replace(/^\.\.\//, ''))).size < 60 * 1024, id + ': el respaldo debe ser ligero');
  }
  assert.equal(M.portadaRespaldoDe('intro-nom-059'), '', 'los de siempre no necesitan respaldo');
});

test('las portadas fotográficas son JPG de 900 x 1230 (la proporción de las demás portadas)', () => {
  for (const id of NUEVOS) {
    const ruta = M.portadaDe(id);
    if (!/\.jpg$/.test(ruta)) continue;
    const b = fs.readFileSync(path.join(RAIZ, ruta.replace(/^\.\.\//, '')));
    assert.equal(b[0], 0xff); assert.equal(b[1], 0xd8);
    let i = 2, ancho = 0, alto = 0;
    while (i < b.length) {   // busca el marcador SOF para leer el tamaño
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { alto = b.readUInt16BE(i + 5); ancho = b.readUInt16BE(i + 7); break; }
      i += 2 + b.readUInt16BE(i + 2);
    }
    assert.deepEqual([ancho, alto], [900, 1230], id);
  }
});

test('la foto de la tarjeta lleva su respaldo (data-respaldo) y la pantalla lo usa si la fotografía no carga', () => {
  const h = M.materialCardHTML({ ...base, id: 'ppt-fototrampeo-muestreo', tipo: 'powerpoint', formato: 'powerpoint' }, {});
  assert.match(h, /src="\.\.\/assets\/img\/materiales\/material-ppt-fototrampeo-muestreo\.jpg"/);
  assert.match(h, /data-respaldo="\.\.\/assets\/img\/materiales\/material-ppt-fototrampeo-muestreo\.png"/);
  assert.doesNotMatch(M.materialCardHTML({ ...base, id: 'intro-nom-059', tipo: 'presentacion' }, {}), /data-respaldo/);
  const js = leer('assets/js/club-materiales.js');
  assert.match(js, /addEventListener\('error'[\s\S]{0,300}data-respaldo[\s\S]{0,120}true\)/);
});

test('la descarga de Excel y PowerPoint se pide con fetch + token (apiBlob), se guarda desde una URL de blob y no hay visor', () => {
  const js = leer('assets/js/club-materiales.js');
  const desc = js.slice(js.indexOf('function descargarMaterial'), js.indexOf('function abrirVisorMaterial'));
  assert.match(desc, /club\.apiBlob\('\/api\/materiales\/' \+ encodeURIComponent\(m\.id\) \+ '\/archivo'\)/);
  assert.match(desc, /URL\.createObjectURL\(blob\)/);
  assert.match(desc, /a\.download = nombre/);
  assert.match(desc, /URL\.revokeObjectURL/);
  assert.doesNotMatch(desc, /iframe|window\.open|location\.href/);
  assert.match(js, /if \(fuente !== 'drive' && esDescarga\(m\)\) return descargarMaterial\(club, m\);/);
  assert.ok(M.descargarMaterial === undefined || typeof M.descargarMaterial === 'function');
});

test('ZOORIGEN no usa emojis ni degradados en lo nuevo de formatos y portadas', () => {
  const css = leer('assets/css/club-materiales.css');
  const nuevo = css.slice(css.indexOf('Formatos: PDF, Excel y PowerPoint'));
  assert.doesNotMatch(nuevo, /gradient/);
  assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(nuevo));
  const js = leer('assets/js/club-materiales.js');
  assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(js));
});

test('las páginas que cargan club-materiales usan la misma versión en el .js y en el .css', () => {
  const v = [];
  for (const pag of ['pages/club-pdfs.html', 'pages/club-biblioteca.html']) {
    const h = leer(pag);
    const js = /club-materiales\.js\?v=([\w-]+)/.exec(h), css = /club-materiales\.css\?v=([\w-]+)/.exec(h);
    assert.ok(js && css, pag);
    assert.equal(js[1], css[1], pag + ': .js y .css con la misma versión');
    v.push(js[1]);
  }
  assert.equal(v[0], v[1], 'las dos páginas con la misma versión');
});
