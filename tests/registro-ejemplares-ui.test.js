'use strict';

// Libro de registro de ejemplares (assets/js/registro-ejemplares-ui.js y pages/club-inventario.html):
// formato, agrupar, filtrar, validar, borrador del informe anual, CSV y que nada del usuario llegue sin escapar.
// Ejecutar: node --test tests/registro-ejemplares-ui.test.js
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../assets/js/registro-ejemplares-ui.js');
const ICONOS = require('../assets/js/herramientas-iconos.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const PAGINA = leer('pages/club-inventario.html');
const MODULO = leer('assets/js/registro-ejemplares-ui.js');
const EMOJI = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|☰/u;
const HOY = '2026-10-12';

const ej = (id, extra = {}) => Object.assign({
  id, nombreComun: 'Boa', nombreCientifico: '', nombre: '', marca: '', sexo: 'indeterminado', origen: 'Criadero',
  tipoIngreso: 'alta', fechaIngreso: '2024-05-10', notas: '', estado: 'activo', fechaSalida: '', creado: '2024-05-10T10:00:00.000Z'
}, extra);
const ev = (id, ejemplarId, tipo, fecha, extra = {}) => Object.assign({
  id, ejemplarId, tipo, fecha, causa: '', destino: '', notas: '', creado: fecha + 'T12:00:00.000Z'
}, extra);

/* ───────── fechas ───────── */
test('fechaValida y formatearFecha: sin corrimiento de zona horaria', () => {
  assert.equal(R.fechaValida('2026-02-28'), true);
  assert.equal(R.fechaValida('2026-02-30'), false);
  assert.equal(R.fechaValida('26-02-28'), false);
  assert.equal(R.fechaValida(''), false);
  assert.equal(R.formatearFecha('2026-01-01'), '1 ene 2026');
  assert.equal(R.formatearFecha('2026-12-31'), '31 dic 2026');
  assert.equal(R.formatearFecha('2026-03-05', 'larga'), '5 de marzo de 2026');
  assert.equal(R.formatearFecha('2026-13-01'), '');
  assert.equal(R.formatearFecha(null), '');
  assert.match(R.fechaLocalIso(new Date(2026, 0, 5)), /^2026-01-05$/);
});

/* ───────── respuesta del servidor ───────── */
test('normalizarRespuesta: forma garantizada aunque el servidor mande basura', () => {
  const r = R.normalizarRespuesta({
    hoy: HOY,
    ejemplares: [{ id: 'a', nombreComun: 5, sexo: 'x', estado: 'raro', fechaIngreso: 'ayer' }, null, { nombreComun: 'sin id' }],
    eventos: [{ id: 'v', ejemplarId: 'a', tipo: 'fuga', fecha: 3 }, { id: 'w' }],
    resumen: { activos: '3', registrados: -1 }, limites: { maxEjemplares: 'x' }
  });
  assert.equal(r.hoy, HOY);
  assert.equal(r.ejemplares.length, 1);
  assert.deepEqual([r.ejemplares[0].nombreComun, r.ejemplares[0].sexo, r.ejemplares[0].estado, r.ejemplares[0].fechaIngreso], ['', 'indeterminado', 'activo', '']);
  assert.equal(r.eventos.length, 1);
  assert.equal(r.eventos[0].tipo, 'nota');
  assert.equal(r.limites.maxEjemplares, 500);
  assert.equal(r.limites.maxEventos, 5000);
  assert.deepEqual(R.normalizarRespuesta(null).ejemplares, []);
  assert.deepEqual(R.normalizarRespuesta(undefined).eventos, []);
});

test('normalizarInforme: números enteros, listas y total siempre presentes', () => {
  const inf = R.normalizarInforme({ anio: 2025, porEspecie: [{ especie: 'Boa', altas: '2', bajas: -3 }, null], total: { altas: 2 }, movimientos: [{ fecha: 'x', tipo: 'raro' }] });
  assert.equal(inf.anio, 2025);
  assert.equal(inf.porEspecie[0].altas, 2);
  assert.equal(inf.porEspecie[0].bajas, 0);
  assert.equal(inf.total.especie, 'TOTAL');
  assert.equal(inf.total.altas, 2);
  assert.equal(inf.total.existenciasFin, 0);
  assert.equal(inf.movimientos[0].fecha, '');
  assert.equal(inf.movimientos[0].tipo, 'nota');
  assert.equal(R.informeVacio(R.normalizarInforme({})), true);
  assert.equal(R.informeVacio(inf), false);
});

/* ───────── agrupar y filtrar ───────── */
test('agruparPorEspecie: sin importar mayúsculas ni acentos; activos primero; cuentas por estado', () => {
  const lista = [
    ej('1', { nombreComun: 'Águila real', marca: 'B-2' }),
    ej('2', { nombreComun: 'aguila  REAL', marca: 'A-1', nombreCientifico: 'Aquila chrysaetos' }),
    ej('3', { nombreComun: 'Águila real', marca: 'A-0', estado: 'muerte', fechaSalida: '2025-01-01' }),
    ej('4', { nombreComun: 'Boa', estado: 'traslado' }),
    ej('5', { nombreComun: 'Iguana verde', estado: 'baja' })
  ];
  const g = R.agruparPorEspecie(lista);
  assert.deepEqual(g.map(x => x.especie), ['Águila real', 'Boa', 'Iguana verde']);
  assert.deepEqual(g[0].ejemplares.map(e => e.id), ['2', '1', '3'], 'activos por marca y luego los demás');
  assert.equal(g[0].nombreCientifico, 'Aquila chrysaetos');
  assert.deepEqual([g[0].total, g[0].activos, g[0].muertes], [3, 2, 1]);
  assert.deepEqual([g[1].traslados, g[2].bajas], [1, 1]);
  assert.deepEqual(R.agruparPorEspecie([]), []);
  assert.deepEqual(R.contarPorEstado(lista), { activo: 2, baja: 1, muerte: 1, traslado: 1, todos: 5 });
});

test('filtrarEjemplares: texto sin acentos y por estado (activos por omisión)', () => {
  const lista = [
    ej('1', { nombreComun: 'Águila real', marca: 'ARETE-9', origen: 'Rescate en Xalapa' }),
    ej('2', { nombreComun: 'Boa', nombre: 'Luna', estado: 'muerte' }),
    ej('3', { nombreComun: 'Iguana', origen: 'Criadero Oaxaca', sexo: 'hembra' })
  ];
  assert.deepEqual(R.filtrarEjemplares(lista).map(e => e.id), ['1', '3']);
  assert.deepEqual(R.filtrarEjemplares(lista, { estado: 'todos' }).map(e => e.id), ['1', '2', '3']);
  assert.deepEqual(R.filtrarEjemplares(lista, { estado: 'muerte' }).map(e => e.id), ['2']);
  assert.deepEqual(R.filtrarEjemplares(lista, { q: 'aguila' }).map(e => e.id), ['1']);
  assert.deepEqual(R.filtrarEjemplares(lista, { q: 'XALAPA' }).map(e => e.id), ['1']);
  assert.deepEqual(R.filtrarEjemplares(lista, { q: 'hembra' }).map(e => e.id), ['3']);
  assert.deepEqual(R.filtrarEjemplares(lista, { q: 'luna', estado: 'todos' }).map(e => e.id), ['2']);
  assert.deepEqual(R.filtrarEjemplares(lista, { q: 'nada' }), []);
});

test('especiesConocidas: una por especie, ordenadas', () => {
  const s = R.especiesConocidas([ej('1', { nombreComun: 'Boa' }), ej('2', { nombreComun: 'boa' }), ej('3', { nombreComun: 'Águila', nombreCientifico: 'Aquila' }), ej('4', { nombreComun: '' })]);
  assert.deepEqual(s.map(x => x.nombreComun), ['Águila', 'Boa']);
});

/* ───────── bitácora ───────── */
test('construirBitacora: ingresos y eventos juntos, del más reciente al más antiguo, sin huérfanos', () => {
  const e1 = ej('e1', { fechaIngreso: '2024-01-10', origen: 'Criadero' });
  const e2 = ej('e2', { fechaIngreso: '2025-03-01', tipoIngreso: 'nacimiento', origen: 'Nacido en la unidad', nombreComun: 'Iguana' });
  const b = R.construirBitacora([e1, e2], [
    ev('v1', 'e1', 'traslado', '2025-06-01', { destino: 'UMA Norte', causa: 'Reproducción', notas: 'Con permiso' }),
    ev('v2', 'e2', 'nota', '2025-06-01', { notas: 'Revisión' }),
    ev('v3', 'fantasma', 'muerte', '2025-12-01')
  ]);
  assert.deepEqual(b.map(x => x.id), ['v2', 'v1', 'ing-e2', 'ing-e1']);
  const traslado = b.find(x => x.id === 'v1');
  assert.equal(traslado.detalle, 'Motivo: Reproducción. Destino: UMA Norte. Con permiso');
  assert.equal(traslado.borrable, true);
  const ingreso = b.find(x => x.id === 'ing-e2');
  assert.equal(ingreso.tipo, 'nacimiento');
  assert.equal(ingreso.detalle, 'Origen: Nacido en la unidad.');
  assert.equal(ingreso.borrable, false);
  assert.equal(b.find(x => x.id === 'v3'), undefined);
});

test('filtrarBitacora: tipo, ejemplar, año y texto', () => {
  const e1 = ej('e1', { fechaIngreso: '2024-01-10', nombreComun: 'Boa', marca: 'M-1' });
  const e2 = ej('e2', { fechaIngreso: '2025-03-01', nombreComun: 'Águila' });
  const b = R.construirBitacora([e1, e2], [ev('v1', 'e1', 'muerte', '2025-06-01', { causa: 'Neumonía' }), ev('v2', 'e2', 'nota', '2025-07-01', { notas: 'Todo bien' })]);
  assert.deepEqual(R.filtrarBitacora(b, { tipo: 'muerte' }).map(x => x.id), ['v1']);
  assert.deepEqual(R.filtrarBitacora(b, { tipo: 'todos' }).length, 4);
  assert.deepEqual(R.filtrarBitacora(b, { ejemplarId: 'e2' }).map(x => x.id), ['v2', 'ing-e2']);
  assert.deepEqual(R.filtrarBitacora(b, { anio: 2024 }).map(x => x.id), ['ing-e1']);
  assert.deepEqual(R.filtrarBitacora(b, { q: 'neumonia' }).map(x => x.id), ['v1']);
  assert.deepEqual(R.filtrarBitacora(b, { q: 'aguila' }).map(x => x.id), ['v2', 'ing-e2']);
  assert.deepEqual(R.filtrarBitacora(b, { q: 'muerte' }).map(x => x.id), ['v1']);
  assert.deepEqual(R.filtrarBitacora(b, { q: 'zzz' }), []);
});

test('aniosDisponibles: del año actual al más antiguo con datos', () => {
  assert.deepEqual(R.aniosDisponibles([], [], HOY), [2026]);
  assert.deepEqual(R.aniosDisponibles([ej('1', { fechaIngreso: '2024-05-10' })], [ev('v', '1', 'nota', '2025-01-01')], HOY), [2026, 2025, 2024]);
});

/* ───────── formularios ───────── */
const formEj = (extra) => Object.assign({ nombreComun: 'Boa', tipoIngreso: 'alta', fechaIngreso: '2026-03-15', origen: 'Criadero' }, extra);

test('validarEjemplarForm: obligatorios, largos, fechas y limpieza', () => {
  const ok = R.validarEjemplarForm(formEj({ nombreComun: '  Boa   constrictor ', sexo: 'hembra' }), { hoy: HOY });
  assert.equal(ok.ok, true);
  assert.equal(ok.valor.nombreComun, 'Boa constrictor');
  assert.equal(ok.valor.sexo, 'hembra');
  assert.equal(R.validarEjemplarForm(formEj({ sexo: 'raro' }), { hoy: HOY }).valor.sexo, 'indeterminado');
  const mal = R.validarEjemplarForm({ nombreComun: '', origen: ' ', tipoIngreso: 'compra', fechaIngreso: '2026-10-13', marca: 'm'.repeat(301), notas: 'n'.repeat(1001) }, { hoy: HOY });
  assert.equal(mal.ok, false);
  assert.deepEqual(Object.keys(mal.errores).sort(), ['fechaIngreso', 'marca', 'nombreComun', 'notas', 'origen', 'tipoIngreso']);
  assert.match(mal.errores.fechaIngreso, /futura/);
  assert.match(mal.errores.marca, /300/);
  assert.match(mal.errores.notas, /1000/);
  assert.equal(R.validarEjemplarForm(formEj({ nombreComun: 'x'.repeat(300), notas: 'n'.repeat(1000) }), { hoy: HOY }).ok, true);
  assert.match(R.validarEjemplarForm(formEj({ fechaIngreso: '2026-02-30' }), { hoy: HOY }).errores.fechaIngreso, /AAAA-MM-DD/);
  assert.equal(R.validarEjemplarForm(formEj({ fechaIngreso: HOY }), { hoy: HOY }).ok, true);
});

test('validarEventoForm: cada tipo pide lo suyo y manda solo lo suyo', () => {
  const opc = { hoy: HOY, ejemplar: { fechaIngreso: '2026-01-10' } };
  assert.equal(R.validarEventoForm({ tipo: 'baja', fecha: '2026-05-01' }, opc).errores.causa.length > 0, true);
  assert.equal(R.validarEventoForm({ tipo: 'traslado', fecha: '2026-05-01' }, opc).errores.destino.length > 0, true);
  assert.equal(R.validarEventoForm({ tipo: 'nota', fecha: '2026-05-01' }, opc).errores.notas.length > 0, true);
  assert.equal(R.validarEventoForm({ tipo: 'muerte', fecha: '2026-05-01' }, opc).ok, true);
  assert.deepEqual(R.validarEventoForm({ tipo: 'muerte', fecha: '2026-05-01', causa: 'Neumonía', destino: 'x' }, opc).valor,
    { tipo: 'muerte', fecha: '2026-05-01', causa: 'Neumonía', destino: '', notas: '' });
  assert.deepEqual(R.validarEventoForm({ tipo: 'nota', fecha: '2026-05-01', notas: 'Hola', causa: 'x' }, opc).valor,
    { tipo: 'nota', fecha: '2026-05-01', causa: '', destino: '', notas: 'Hola' });
  assert.equal(R.validarEventoForm({ tipo: 'baja', fecha: '2026-10-13', causa: 'x' }, opc).errores.fecha.length > 0, true, 'futura');
  assert.match(R.validarEventoForm({ tipo: 'nota', fecha: '2026-01-09', notas: 'x' }, opc).errores.fecha, /anterior al ingreso/);
  assert.equal(R.validarEventoForm({ tipo: 'nacimiento', fecha: '2026-05-01' }, opc).ok, false);
  assert.equal(R.validarEventoForm(null, opc).ok, false);
});

test('camposEvento: qué campos se muestran', () => {
  assert.deepEqual(R.camposEvento('baja'), { causa: true, destino: true, causaObligatoria: true, destinoObligatorio: false });
  assert.deepEqual(R.camposEvento('traslado'), { causa: true, destino: true, causaObligatoria: false, destinoObligatorio: true });
  assert.equal(R.camposEvento('muerte').destino, false);
  assert.equal(R.camposEvento('nota').causa, false);
});

/* ───────── borrador del informe ───────── */
const INFORME = R.normalizarInforme({
  anio: 2025, desde: '2025-01-01', hasta: '2025-12-31', enCurso: false, corte: '2025-12-31',
  porEspecie: [
    { especie: 'Boa', nombreCientifico: 'Boa imperator', existenciasInicio: 2, altas: 0, nacimientos: 2, bajas: 0, muertes: 1, traslados: 1, existenciasFin: 2 },
    { especie: 'Iguana verde de la costa del Pacífico', nombreCientifico: '', existenciasInicio: 0, altas: 2, nacimientos: 0, bajas: 1, muertes: 0, traslados: 0, existenciasFin: 1 }
  ],
  total: { existenciasInicio: 2, altas: 2, nacimientos: 2, bajas: 1, muertes: 1, traslados: 1, existenciasFin: 3 },
  movimientos: [
    { fecha: '2025-01-01', tipo: 'traslado', especie: 'Boa', marca: 'A-1', destino: 'UMA Norte', causa: 'Reproducción' },
    { fecha: '2025-06-01', tipo: 'muerte', especie: 'Boa', causa: 'Neumonía' },
    { fecha: '2025-03-01', tipo: 'nacimiento', especie: 'Boa', origen: 'Nacido en la unidad' }
  ]
});
const UNIDAD = { nombre: 'UMA El Palmar', tipo: 'intensiva', registro: 'SEMARNAT-UMA-0001', ubicacion: 'Xalapa, Veracruz', responsable: 'Dra. Ana Pérez', cedula: '1234567', observaciones: 'Sin novedades' };

test('construirBorrador: encabezado, datos de la unidad, tabla por especie y plazos de referencia', () => {
  const { texto, faltantes } = R.construirBorrador(INFORME, UNIDAD, { hoy: HOY });
  assert.deepEqual(faltantes, []);
  assert.match(texto, /BORRADOR · no es el formato oficial/);
  assert.match(texto, /AÑO QUE SE REPORTA: +2025/);
  assert.match(texto, /FECHA DE ELABORACIÓN: +12 de octubre de 2026/);
  for (const v of ['UMA El Palmar', 'UMA intensiva (confinamiento)', 'SEMARNAT-UMA-0001', 'Xalapa, Veracruz', 'Dra. Ana Pérez', '1234567', 'Sin novedades']) assert.ok(texto.includes(v), v);
  // tabla: cabecera, una fila por especie y TOTAL
  assert.match(texto, /Especie +Ene 1 +Altas +Nac\. +Bajas +Muer\. +Tras\. +Dic 31/);
  assert.match(texto, /^Boa +2 +0 +2 +0 +1 +1 +2$/m);
  assert.match(texto, /\(Boa imperator\)/);
  assert.match(texto, /^TOTAL +2 +2 +2 +1 +1 +1 +3$/m);
  // nombre largo: va completo en su línea y los números debajo
  assert.match(texto, /^Iguana verde de la costa del Pacífico$/m);
  // movimientos
  assert.match(texto, /1 ene 2025 · TRASLADO · Boa/);
  assert.match(texto, /destino: UMA Norte/);
  assert.match(texto, /causa: Neumonía/);
  // plazos del Reglamento, Art. 50
  assert.match(texto, /PLAZOS DE REFERENCIA \(Reglamento de la Ley General de Vida Silvestre, Art\. 50\)/);
  assert.match(texto, /Informe anual de actividades de la UMA: de abril a junio\./);
  assert.match(texto, /3 días hábiles/);
  assert.match(texto, /5 días naturales/);
  assert.match(texto, /delegación de SEMARNAT/);
  assert.equal(EMOJI.test(texto), false);
});

test('construirBorrador: lo que falta sale como [PENDIENTE] y se avisa', () => {
  const { texto, faltantes } = R.construirBorrador(INFORME, { nombre: 'UMA El Palmar' }, { hoy: HOY });
  assert.deepEqual(faltantes, ['Registro SEMARNAT', 'Ubicación', 'Responsable técnico', 'Cédula profesional']);
  assert.match(texto, /Registro SEMARNAT: +\[PENDIENTE: Registro SEMARNAT\]/);
  assert.match(texto, /Tipo: +No especificado/);
  assert.match(texto, /Sin observaciones adicionales\./);
});

test('construirBorrador: año en curso lo dice; informe vacío no inventa nada', () => {
  const enCurso = Object.assign({}, INFORME, { anio: 2026, enCurso: true, corte: HOY });
  assert.match(R.construirBorrador(enCurso, UNIDAD, { hoy: HOY }).texto, /todavía no termina/);
  const vacio = R.normalizarInforme({ anio: 2020 });
  const t = R.construirBorrador(vacio, UNIDAD, { hoy: HOY }).texto;
  assert.match(t, /Sin ejemplares ni movimientos registrados en este año\./);
  assert.match(t, /Sin movimientos en este año\./);
});

test('construirBorrador: datos de la unidad con texto raro no rompen el borrador', () => {
  const t = R.construirBorrador(INFORME, { nombre: '<script>alert(1)</script>\u0000\n\n', cedula: 'x'.repeat(500) }, { hoy: HOY }).texto;
  assert.ok(t.includes('<script>alert(1)</script>'), 'es texto plano: no se escapa aquí');
  assert.equal(t.includes('\u0000'), false);
  assert.ok(!t.includes('x'.repeat(301)), 'se recorta a 300');
});

test('unidadLimpia: tipo desconocido queda vacío y recorta', () => {
  assert.equal(R.unidadLimpia({ tipo: 'otra' }).tipo, '');
  assert.equal(R.unidadLimpia({ tipo: 'pimvs' }).tipo, 'pimvs');
  assert.equal(R.unidadLimpia(null).nombre, '');
  assert.equal(R.unidadLimpia({ observaciones: 'o'.repeat(2000) }).observaciones.length, 1000);
});

test('recordatorioInforme: abril a junio es el periodo; nunca promete avisos de contingencias', () => {
  for (const f of ['2026-04-01', '2026-05-15', '2026-06-30']) assert.equal(R.recordatorioInforme(f).enPeriodo, true, f);
  for (const f of ['2026-03-31', '2026-07-01', '2026-12-31', '2026-01-01']) assert.equal(R.recordatorioInforme(f).enPeriodo, false, f);
  const r = R.recordatorioInforme('2026-05-01');
  assert.match(r.texto, /abril a junio/);
  assert.match(r.aparte, /no los calcula ni los avisa/);
});

/* ───────── CSV ───────── */
test('csvResumen: BOM, CRLF, encabezados, una fila por especie y TOTAL', () => {
  const csv = R.csvResumen(INFORME);
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  const lineas = csv.slice(1).split('\r\n');
  assert.equal(lineas.pop(), '', 'termina con salto de línea');
  assert.equal(lineas.length, 4);
  assert.equal(lineas[0], 'Año,Especie,Nombre científico,Existencias al 1 de enero,Altas,Nacimientos,Bajas,Muertes,Traslados,Existencias al 31 de diciembre');
  assert.equal(lineas[1], '2025,Boa,Boa imperator,2,0,2,0,1,1,2');
  assert.equal(lineas[3], '2025,TOTAL,,2,2,2,1,1,1,3');
});

test('csv: comillas, comas y saltos de línea; neutraliza fórmulas de hoja de cálculo', () => {
  assert.equal(R.celdaCsv('hola, mundo'), '"hola, mundo"');
  assert.equal(R.celdaCsv('dijo "sí"'), '"dijo ""sí"""');
  assert.equal(R.celdaCsv('línea 1\nlínea 2'), '"línea 1\nlínea 2"');
  assert.equal(R.celdaCsv('=1+1'), "'=1+1");
  assert.equal(R.celdaCsv('+52 55'), "'+52 55");
  assert.equal(R.celdaCsv('-3'), "'-3");
  assert.equal(R.celdaCsv('@SUMA(A1)'), "'@SUMA(A1)");
  assert.equal(R.celdaCsv('  =cmd|calc'), "'  =cmd|calc");
  assert.equal(R.celdaCsv('=HYPERLINK("http://x","clic")'), `"'=HYPERLINK(""http://x"",""clic"")"`);
  assert.equal(R.celdaCsv(2025), '2025');
  assert.equal(R.celdaCsv(null), '');
  assert.equal(R.celdaCsv('2025-03-01'), '2025-03-01');
});

test('csvMovimientos y csvInventario: contenido y orden', () => {
  const m = R.csvMovimientos(INFORME).slice(1).split('\r\n');
  assert.equal(m[0], 'Fecha,Movimiento,Especie,Nombre científico,Marca,Sexo,Origen,Causa o motivo,Destino');
  assert.equal(m[1], '2025-01-01,Traslado,Boa,,A-1,Indeterminado,,Reproducción,UMA Norte');
  assert.equal(m.length, 5);
  const inv = R.csvInventario([
    ej('1', { nombreComun: 'Boa', marca: '=EVIL()', nombre: 'Luna', sexo: 'hembra', notas: 'a, b', estado: 'muerte', fechaSalida: '2025-06-01' }),
    ej('2', { nombreComun: 'Águila' })
  ]).slice(1).split('\r\n');
  assert.match(inv[0], /^Especie,Nombre científico,Nombre o apodo,Marca,Sexo,Estado,Tipo de ingreso,Fecha de ingreso,Origen,Fecha de salida,Notas$/);
  assert.match(inv[1], /^Águila,/);
  assert.match(inv[2], /^Boa,,Luna,'=EVIL\(\),Hembra,Muerte,Ingreso \(alta\),2024-05-10,Criadero,2025-06-01,"a, b"$/);
});

test('nombreArchivo', () => {
  assert.equal(R.nombreArchivo('informe', 2025, 'txt'), 'zoorigen-libro-registro-informe-2025.txt');
  assert.equal(R.nombreArchivo('inventario', '', 'csv'), 'zoorigen-libro-registro-inventario.csv');
});

/* ───────── HTML: nada del usuario sin escapar ───────── */
const ATAQUE = '<img src=x onerror=alert(1)>"\'`&';
// Todo "<" del HTML debe ser de una etiqueta nuestra, y sus atributos solo de una lista corta:
// si un dato del usuario se colara sin escapar, aparecería un "<" o un atributo (onerror, onclick...) fuera de la lista.
const ATRIBUTOS_OK = /^(class|data-[\w-]+|type|href|aria-[\w-]+|title|role|id|xmlns|viewBox)$/;
function soloEtiquetasNuestras(html) {
  const menores = (html.match(/</g) || []).length;
  const etiquetas = [...html.matchAll(/<\/?[a-zA-Z][\w-]*(?:\s+[\w:-]+(?:="[^"<>]*")?)*\s*\/?>/g)];
  assert.equal(etiquetas.length, menores, 'hay un "<" que no pertenece a una etiqueta con atributos válidos');
  for (const t of etiquetas) {
    const sinValores = t[0].replace(/="[^"]*"/g, '=""'); // el contenido entre comillas es un valor, no atributos
    for (const a of sinValores.matchAll(/\s([\w:-]+)(?==)/g)) assert.match(a[1], ATRIBUTOS_OK, 'atributo no permitido en ' + t[0].slice(0, 80));
  }
}
const sinPeligro = (html) => {
  soloEtiquetasNuestras(html);
  assert.equal(/<img/i.test(html), false, 'no debe haber una etiqueta img');
  assert.ok(html.includes('&lt;img'), 'el texto aparece escapado');
};

test('esc: escapa los cinco caracteres peligrosos', () => {
  assert.equal(R.esc('<a href="x">\'&`'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#96;');
  assert.equal(R.esc(null), '');
  assert.equal(R.esc(5), '5');
});

test('htmlInventario, htmlBitacora, informe y errores escapan todo lo que escribió el usuario', () => {
  const e = ej('id1', { nombreComun: ATAQUE, nombreCientifico: ATAQUE, marca: ATAQUE, nombre: ATAQUE, origen: ATAQUE, estado: 'muerte', fechaSalida: '2025-01-01' });
  sinPeligro(R.htmlInventario([e]));
  const b = R.construirBitacora([e], [ev('v1', 'id1', 'nota', '2025-02-02', { notas: ATAQUE, causa: ATAQUE, destino: ATAQUE })]);
  sinPeligro(R.htmlBitacora(b));
  const inf = R.normalizarInforme({
    anio: 2025, porEspecie: [{ especie: ATAQUE, nombreCientifico: ATAQUE }],
    movimientos: [{ fecha: '2025-01-01', tipo: 'baja', especie: ATAQUE, marca: ATAQUE, causa: ATAQUE, destino: ATAQUE, origen: ATAQUE }]
  });
  sinPeligro(R.htmlResumenInforme(inf));
  sinPeligro(R.htmlMovimientos(inf));
  sinPeligro(R.htmlError(ATAQUE));
  sinPeligro(R.htmlVacio(ATAQUE, { accion: ATAQUE, texto: ATAQUE }));
  // los id de los botones tampoco pueden romper el atributo
  const conId = R.htmlInventario([ej('x" onclick="alert(1)')]);
  soloEtiquetasNuestras(conId);
  assert.ok(conId.includes('data-id="x&quot; onclick=&quot;alert(1)"'));
});

test('htmlInventario: tabla agrupada con acciones; los que salieron no ofrecen "Evento"', () => {
  const html = R.htmlInventario([ej('a1', { marca: 'M-1' }), ej('a2', { estado: 'baja', fechaSalida: '2025-05-05' })]);
  assert.equal((html.match(/<section class="reg-grupo"/g) || []).length, 1);
  assert.equal((html.match(/data-accion="ficha"/g) || []).length, 2);
  assert.equal((html.match(/data-accion="evento"/g) || []).length, 1);
  assert.match(html, /data-label="Estado"/);
  assert.match(html, /1 activo · 1 baja/);
  assert.match(html, /5 may 2025/);
});

test('htmlBitacora: "Deshacer" solo en eventos, no en ingresos', () => {
  const b = R.construirBitacora([ej('e1')], [ev('v1', 'e1', 'nota', '2025-01-01', { notas: 'x' })]);
  const html = R.htmlBitacora(b);
  assert.equal((html.match(/data-accion="borrar-evento"/g) || []).length, 1);
  assert.match(html, /data-accion="borrar-evento" data-id="v1"/);
});

test('htmlError ofrece reintentar y htmlVacio un botón opcional', () => {
  assert.match(R.htmlError('Sin red'), /data-reintentar/);
  assert.match(R.htmlVacio('Nada', { accion: 'agregar', texto: 'Agregar' }), /data-accion="agregar"/);
  assert.equal(/<button/.test(R.htmlVacio('Nada')), false);
});

/* ───────── La página y el módulo cumplen las reglas del proyecto ───────── */
test('sin emojis en el módulo ni en la página', () => {
  for (const [nombre, t] of [['módulo', MODULO], ['página', PAGINA]]) {
    const m = t.match(EMOJI);
    assert.ok(!m, nombre + ' tiene el emoji ' + (m && m[0]));
  }
});

test('todos los íconos que se usan existen en herramientas-iconos.js', () => {
  const nombres = new Set(ICONOS.nombres());
  const usados = new Set();
  for (const t of [PAGINA, MODULO]) for (const m of t.matchAll(/#zi-([a-z0-9-]+)/g)) usados.add(m[1]);
  for (const n of Object.values(R.ICONOS_TIPO)) usados.add(n);
  for (const m of MODULO.matchAll(/ico\('([a-z0-9-]+)'/g)) usados.add(m[1]);
  assert.ok(usados.size >= 15);
  for (const u of usados) assert.ok(nombres.has(u), 'falta el ícono ' + u);
});

test('la página sigue el patrón de las herramientas: sesión, paywall, aviso de apoyo y estilos .tool-*', () => {
  assert.match(PAGINA, /ZOORIGEN_CLUB\.requireAuth\(\)/);
  assert.match(PAGINA, /renderSidebar\(MENU_ID, session\)/);
  assert.match(PAGINA, /const MENU_ID = 'herramientas'/);
  assert.match(PAGINA, /ZOORIGEN_CLUB\.hasActiveMembership\(session\)/);
  assert.match(PAGINA, /Herramientas exclusivas para miembros/);
  assert.match(PAGINA, /href="club-suscripcion\.html"/);
  assert.match(PAGINA, /ZOORIGEN_CLUB\.showPaywall\(/);
  assert.match(PAGINA, /Material de apoyo/);
  assert.match(PAGINA, /No es un formato oficial/);
  assert.match(PAGINA, /ZOORIGEN_CLUB\.apiFetch\('\/api\/registro'\)/);
  assert.match(PAGINA, /\/api\/registro\/informe\?anio=/);
  for (const clase of ['tools-hero', 'tool-tab', 'tool-panel', 'tool-header', 'tool-field', 'tool-btn-calc', 'tool-disclaimer', 'tool-table']) {
    assert.ok(PAGINA.includes(clase), clase);
  }
  // pestañas pedidas
  for (const tab of ['inventario', 'bitacora', 'informe']) assert.ok(PAGINA.includes('data-tab="' + tab + '"'), tab);
  assert.match(PAGINA, /abril a junio|recordatorio/i);
});

test('la página carga sus scripts en orden y con la misma versión de club.js que las demás', () => {
  const orden = ['firebase-config.js', 'club.js', 'club-shell.js', 'herramientas-iconos.js', 'registro-ejemplares-ui.js'];
  let desde = 0;
  for (const s of orden) {
    const i = PAGINA.indexOf(s, desde);
    assert.ok(i >= 0, 'falta o está fuera de orden ' + s);
    desde = i;
  }
  const mia = PAGINA.match(/assets\/js\/club\.js\?v=([\w.-]+)/)[1];
  const otra = leer('pages/club-herramientas.html').match(/assets\/js\/club\.js\?v=([\w.-]+)/)[1];
  assert.equal(mia, otra);
});

test('no toca el servidor de otra forma: nunca manda uid y escapa lo que dibuja', () => {
  assert.equal(/body:\s*\{[^}]*uid/i.test(PAGINA), false);
  assert.equal(/\.innerHTML\s*=\s*[^;]*\b(valor|nombreComun|marca|origen|notas)\b/.test(PAGINA.replace(/R\.esc\([^)]*\)/g, '')), false);
  assert.equal(/\bdocument\.write\b|\beval\(/.test(PAGINA + MODULO), false);
});

test('el módulo es UMD puro: no necesita navegador', () => {
  assert.equal(typeof R.construirBorrador, 'function');
  assert.equal(/\bdocument\.|\bwindow\./.test(MODULO.replace(/\/\*[\s\S]*?\*\//g, '')), false);
});

test('formularios sin números: no hay campos numéricos que pedir como decimal', () => {
  // La herramienta no pide pesos ni cantidades; si algún día se agregan deben ser type="text" inputmode="decimal"
  assert.equal(/type="number"/.test(PAGINA), false);
});
