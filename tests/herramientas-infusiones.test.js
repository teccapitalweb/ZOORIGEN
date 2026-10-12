'use strict';
// Infusiones y diluciones: solo aritmética (la herramienta no trae dosis). Cada caso numérico está calculado a mano.
// Ejecutar: node --test tests/herramientas-infusiones.test.js
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const Z = require('../assets/js/herramientas-infusiones.js');
const I = require('../assets/js/herramientas-iconos.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const cerca = (a, b, tol) => assert.ok(Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol), a + ' debía ser ≈ ' + b);
const EMOJI = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|☰/u;

/* ───────── lectura y formato ───────── */
test('leerNumero: acepta coma y punto, rechaza texto, vacío y notación científica', () => {
  assert.equal(Z.leerNumero('12.5'), 12.5);
  assert.equal(Z.leerNumero('12,5'), 12.5);
  assert.equal(Z.leerNumero(' 0,05 '), 0.05);
  assert.equal(Z.leerNumero('7'), 7);
  assert.ok(Number.isNaN(Z.leerNumero('')));
  assert.ok(Number.isNaN(Z.leerNumero('abc')));
  assert.ok(Number.isNaN(Z.leerNumero('1e5')));
  assert.ok(Number.isNaN(Z.leerNumero('1,2,3')));
  assert.ok(Number.isNaN(Z.leerNumero(null)));
  assert.ok(Number.isNaN(Z.leerNumero(undefined)));
});

test('fmt: sin ceros sobrantes, nunca "0.00" para algo que no es cero y nunca notación científica', () => {
  assert.equal(Z.fmt(0), '0');
  assert.equal(Z.fmt(20), '20');
  assert.equal(Z.fmt(6.25), '6.25');
  assert.equal(Z.fmt(1.5), '1.5');
  assert.equal(Z.fmt(16.666666), '16.67');
  assert.equal(Z.fmt(0.083333), '0.08333');
  assert.equal(Z.fmt(0.004), '0.004');
  assert.equal(Z.fmt(0.00005), '0.00005');
  assert.equal(Z.fmt(0.0000001), '0.0000001');
  assert.equal(Z.fmt(1234.5), '1235');
  assert.equal(Z.fmt(12345.6), '12346');
  assert.equal(Z.fmt(1000000), '1000000');
  assert.equal(Z.fmt(70.00000000000001), '70');
  assert.equal(Z.fmt(9.99996), '10');
  assert.equal(Z.fmt(NaN), '—');
  assert.equal(Z.fmt(Infinity), '—');
  for (const x of [0.4, 0.04, 0.004, 0.0004, 0.00004, 1.001, 99999, 0.1 + 0.2]) {
    const t = Z.fmt(x);
    assert.ok(!/e/i.test(t), x + ' salió con notación científica: ' + t);
    assert.ok(!/\.\d*0$/.test(t), x + ' salió con ceros sobrantes: ' + t);
    assert.notEqual(t, '0');
    assert.ok(!/^0\.0+$/.test(t));
  }
});

test('textoDuracion: horas y minutos legibles', () => {
  assert.equal(Z.textoDuracion(100 / 6), '16 h 40 min');
  assert.equal(Z.textoDuracion(0.5), '30 min');
  assert.equal(Z.textoDuracion(8), '8 h');
  assert.equal(Z.textoDuracion(24), '1 d');
  assert.equal(Z.textoDuracion(25.5), '1 d 1 h 30 min');
  assert.equal(Z.textoDuracion(1.999), '2 h');
  assert.equal(Z.textoDuracion(0.001), 'menos de 1 min');
  assert.equal(Z.textoDuracion(-1), '—');
  assert.equal(Z.textoDuracion(NaN), '—');
  assert.equal(Z.horasTexto(8), '8 h');
  assert.equal(Z.horasTexto(2.5), '2.5 h (2 h 30 min)');
});

test('textoSegundos: segundos, minutos u horas entre gota y gota', () => {
  assert.equal(Z.textoSegundos(30), '30 s');
  assert.equal(Z.textoSegundos(0.9), '0.9 s');
  assert.equal(Z.textoSegundos(119), '119 s');
  assert.equal(Z.textoSegundos(360), '6 min');
  assert.equal(Z.textoSegundos(360000), '100 h');
  assert.equal(Z.textoSegundos(-1), '—');
  assert.equal(Z.textoSegundos(NaN), '—');
});

test('esc: escapa HTML', () => {
  assert.equal(Z.esc('<b>"a" & \'b\'</b>'), '&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;');
  assert.equal(Z.esc(null), '');
});

/* ───────── infusión continua: velocidad ───────── */
test('cri: 10 kg, 5 μg/kg/min, 0.5 mg/ml → 6 ml/h, gotas, duración de 100 ml', () => {
  const r = Z.cri({ peso: 10, dosis: 5, unidadDosis: 'ug/kg/min', conc: 0.5, unidadConc: 'mg/ml', volumen: 100 });
  assert.equal(r.ok, true);
  cerca(r.mgKgH, 0.3);      // 5 × 60 ÷ 1000
  cerca(r.mgH, 3);          // 0.3 × 10
  cerca(r.mlH, 6);          // 3 ÷ 0.5
  assert.deepEqual(r.gotas.map(g => g.equipo), [10, 15, 20, 60]);
  assert.deepEqual(r.gotas.map(g => g.gotasMin), [1, 1.5, 2, 6]);   // 6 × eq ÷ 60
  assert.deepEqual(r.gotas.map(g => g.segPorGota), [60, 40, 30, 10]);
  cerca(r.duracionH, 100 / 6);
  assert.equal(r.duracionTexto, '16 h 40 min');
  cerca(r.mgEnVolumen, 50);
  assert.deepEqual(r.avisos, []);
});

test('cri: la fórmula trae los números sustituidos', () => {
  const r = Z.cri({ peso: 10, dosis: 5, unidadDosis: 'ug/kg/min', conc: 0.5, unidadConc: 'mg/ml', volumen: 100 });
  assert.ok(r.formulas.includes('Dosis en mg/kg/h = 5 μg/kg/min × 60 ÷ 1000 = 0.3 mg/kg/h'));
  assert.ok(r.formulas.includes('Fármaco por hora = 0.3 mg/kg/h × 10 kg = 3 mg/h'));
  assert.ok(r.formulas.includes('Velocidad = 3 mg/h ÷ 0.5 mg/ml = 6 ml/h'));
  assert.ok(r.formulas.includes('Gotas por minuto con equipo de 20 gtt/ml = 6 ml/h × 20 ÷ 60 = 2 gtt/min'));
  assert.ok(r.formulas.some(f => f.startsWith('Duración = 100 ml ÷ 6 ml/h = 16.67 h (16 h 40 min)')));
});

test('cri: las cuatro unidades de dosis', () => {
  const base = { peso: 20, conc: 2, unidadConc: 'mg/ml' };
  // mg/kg/h: 0.1 × 20 = 2 mg/h → 1 ml/h
  cerca(Z.cri(Object.assign({}, base, { dosis: 0.1, unidadDosis: 'mg/kg/h' })).mlH, 1);
  // mg/kg/min: 0.01 × 60 = 0.6 mg/kg/h → 12 mg/h → 6 ml/h
  cerca(Z.cri(Object.assign({}, base, { dosis: 0.01, unidadDosis: 'mg/kg/min' })).mlH, 6);
  // μg/kg/h: 50 ÷ 1000 = 0.05 mg/kg/h → 1 mg/h → 0.5 ml/h
  cerca(Z.cri(Object.assign({}, base, { dosis: 50, unidadDosis: 'ug/kg/h' })).mlH, 0.5);
  // μg/kg/min: 10 × 60 ÷ 1000 = 0.6 mg/kg/h → 12 mg/h → 6 ml/h (igual que mg/kg/min 0.01)
  cerca(Z.cri(Object.assign({}, base, { dosis: 10, unidadDosis: 'ug/kg/min' })).mlH, 6);
});

test('cri: concentración en μg/ml se pasa a mg/ml y lo dice en la fórmula', () => {
  // 500 μg/ml = 0.5 mg/ml → igual que el caso base
  const r = Z.cri({ peso: 10, dosis: 5, unidadDosis: 'ug/kg/min', conc: 500, unidadConc: 'ug/ml', volumen: null });
  cerca(r.concMgMl, 0.5);
  cerca(r.mlH, 6);
  assert.ok(r.formulas.includes('Concentración = 500 μg/ml ÷ 1000 = 0.5 mg/ml'));
  assert.equal(r.volumen, null);
  assert.equal(r.duracionH, null);
  assert.equal(r.formulas.some(f => f.startsWith('Duración')), false);
});

test('cri: 4 kg, 30 μg/kg/h, 100 μg/ml → 1.2 ml/h', () => {
  // 30 ÷ 1000 = 0.03 mg/kg/h × 4 = 0.12 mg/h ÷ 0.1 mg/ml = 1.2 ml/h
  const r = Z.cri({ peso: 4, dosis: 30, unidadDosis: 'ug/kg/h', conc: 100, unidadConc: 'ug/ml' });
  cerca(r.mlH, 1.2);
  cerca(r.gotas[3].gotasMin, 1.2);   // equipo de 60: ml/h = gotas/min
});

test('cri: avisa si la tasa es menor de 0.1 ml/h y no avisa justo en 0.1', () => {
  const baja = Z.cri({ peso: 1, dosis: 1, unidadDosis: 'ug/kg/h', conc: 1, unidadConc: 'mg/ml' });
  cerca(baja.mlH, 0.001);
  assert.deepEqual(baja.avisos.map(a => a.codigo), ['tasa-baja']);
  assert.match(baja.avisos[0].texto, /0\.1 ml\/h/);
  assert.match(baja.avisos[0].texto, /bomba de jeringa/);
  const justo = Z.cri({ peso: 1, dosis: 0.1, unidadDosis: 'mg/kg/h', conc: 1, unidadConc: 'mg/ml' });
  cerca(justo.mlH, 0.1);
  assert.deepEqual(justo.avisos, []);
});

test('cri: peso fuera de 0.001–6000 kg, vacío o negativo da error', () => {
  const ok = { dosis: 1, unidadDosis: 'mg/kg/h', conc: 1, unidadConc: 'mg/ml' };
  for (const peso of [NaN, 0, -3, 0.0009, 6001, Infinity, null, undefined]) {
    const r = Z.cri(Object.assign({ peso }, ok));
    assert.ok(r.error, 'peso ' + peso + ' debía dar error');
    assert.equal(r.ok, undefined);
  }
  assert.equal(Z.cri(Object.assign({ peso: 0.001 }, ok)).ok, true);
  assert.equal(Z.cri(Object.assign({ peso: 6000 }, ok)).ok, true);
  assert.match(Z.cri(Object.assign({ peso: -3 }, ok)).error, /negativo/);
});

test('cri: dosis y concentración deben ser mayores que 0; unidades desconocidas dan error', () => {
  const ok = { peso: 10, dosis: 1, unidadDosis: 'mg/kg/h', conc: 1, unidadConc: 'mg/ml' };
  for (const dosis of [0, -1, NaN, null]) assert.ok(Z.cri(Object.assign({}, ok, { dosis })).error, 'dosis ' + dosis);
  for (const conc of [0, -2, NaN, null]) assert.ok(Z.cri(Object.assign({}, ok, { conc })).error, 'conc ' + conc);
  assert.ok(Z.cri(Object.assign({}, ok, { unidadDosis: 'mg/kg/dia' })).error);
  assert.ok(Z.cri(Object.assign({}, ok, { unidadConc: 'M' })).error);
  assert.ok(Z.cri(Object.assign({}, ok, { conc: 20000 })).error, 'concentración absurda');
  assert.ok(Z.cri(Object.assign({}, ok, { volumen: 0 })).error);
  assert.ok(Z.cri(Object.assign({}, ok, { volumen: -5 })).error);
  assert.ok(Z.cri(Object.assign({}, ok, { volumen: NaN })).error, 'texto raro en el volumen no se ignora');
  assert.ok(Z.cri().error);
});

/* ───────── infusión continua: preparar ───────── */
test('preparar: 10 kg, 5 μg/kg/min, 5 ml/h, 50 ml, frasco de 10 mg/ml', () => {
  const r = Z.preparar({ peso: 10, dosis: 5, unidadDosis: 'ug/kg/min', tasaMlH: 5, volumenFinal: 50, concFrasco: 10, unidadFrasco: 'mg/ml' });
  assert.equal(r.ok, true);
  cerca(r.mgH, 3);              // 0.3 × 10
  cerca(r.concNecesaria, 0.6);  // 3 ÷ 5
  cerca(r.mgAgregar, 30);       // 0.6 × 50
  cerca(r.mlFrasco, 3);         // 30 ÷ 10
  cerca(r.mlDiluente, 47);      // 50 - 3
  cerca(r.duracionH, 10);       // 50 ÷ 5
  assert.equal(r.duracionTexto, '10 h');
  assert.deepEqual(r.gotas.map(g => Number(g.gotasMin.toFixed(4))), [0.8333, 1.25, 1.6667, 5]);
  assert.deepEqual(r.avisos, []);
  assert.ok(r.formulas.includes('Concentración necesaria = 3 mg/h ÷ 5 ml/h = 0.6 mg/ml'));
  assert.ok(r.formulas.includes('Fármaco a agregar = 0.6 mg/ml × 50 ml = 30 mg'));
  assert.ok(r.formulas.includes('Volumen del frasco = 30 mg ÷ 10 mg/ml = 3 ml'));
  assert.ok(r.formulas.includes('Diluyente = 50 ml - 3 ml = 47 ml'));
});

test('preparar: con duración en vez de tasa, y con el frasco en % o en μg/ml', () => {
  const base = { peso: 10, dosis: 5, unidadDosis: 'ug/kg/min', volumenFinal: 50 };
  // 50 ml en 10 h = 5 ml/h → mismo resultado
  const a = Z.preparar(Object.assign({}, base, { duracionH: 10, concFrasco: 10, unidadFrasco: 'mg/ml' }));
  cerca(a.tasaMlH, 5); cerca(a.mlFrasco, 3);
  assert.ok(a.formulas.includes('Tasa = 50 ml ÷ 10 h = 5 ml/h'));
  // 1 % = 10 mg/ml
  const b = Z.preparar(Object.assign({}, base, { tasaMlH: 5, concFrasco: 1, unidadFrasco: '%' }));
  cerca(b.mlFrasco, 3);
  assert.ok(b.formulas.includes('Concentración del frasco = 1 % × 10 = 10 mg/ml'));
  // 10000 μg/ml = 10 mg/ml
  const c = Z.preparar(Object.assign({}, base, { tasaMlH: 5, concFrasco: 10000, unidadFrasco: 'ug/ml' }));
  cerca(c.mlFrasco, 3);
  // si vienen las dos, manda la tasa: 5 ml/h (no 50 ÷ 100 = 0.5)
  const d = Z.preparar(Object.assign({}, base, { tasaMlH: 5, duracionH: 100, concFrasco: 10, unidadFrasco: 'mg/ml' }));
  cerca(d.tasaMlH, 5);
});

test('preparar: concentración pedida mayor que la del frasco es imposible', () => {
  // 3 mg/h a 0.1 ml/h = 30 mg/ml > 10 mg/ml
  const r = Z.preparar({ peso: 10, dosis: 5, unidadDosis: 'ug/kg/min', tasaMlH: 0.1, volumenFinal: 50, concFrasco: 10, unidadFrasco: 'mg/ml' });
  assert.ok(r.error);
  assert.equal(r.imposible, true);
  assert.match(r.error, /no se puede lograr diluyendo/);
  cerca(r.concNecesaria, 30);
  assert.equal(r.mlFrasco, undefined);
  // justo igual a la del frasco (0.6 mg/ml): se puede, sin diluyente
  const j = Z.preparar({ peso: 10, dosis: 5, unidadDosis: 'ug/kg/min', tasaMlH: 5, volumenFinal: 50, concFrasco: 0.6, unidadFrasco: 'mg/ml' });
  assert.equal(j.ok, true);
  cerca(j.mlFrasco, 50); cerca(j.mlDiluente, 0);
});

test('preparar: avisa tasa baja y volumen del frasco muy pequeño', () => {
  // 1 kg × 0.01 mg/kg/h = 0.01 mg/h; a 1 ml/h → 0.01 mg/ml; en 10 ml → 0.1 mg; frasco 10 mg/ml → 0.01 ml
  const r = Z.preparar({ peso: 1, dosis: 0.01, unidadDosis: 'mg/kg/h', tasaMlH: 1, volumenFinal: 10, concFrasco: 10, unidadFrasco: 'mg/ml' });
  cerca(r.mlFrasco, 0.01);
  assert.deepEqual(r.avisos.map(a => a.codigo), ['volumen-pequeno']);
  // tasa 0.05 ml/h
  const t = Z.preparar({ peso: 1, dosis: 0.0001, unidadDosis: 'mg/kg/h', tasaMlH: 0.05, volumenFinal: 10, concFrasco: 10, unidadFrasco: 'mg/ml' });
  assert.ok(t.avisos.some(a => a.codigo === 'tasa-baja'));
});

test('preparar: faltan datos o son inválidos', () => {
  const ok = { peso: 10, dosis: 5, unidadDosis: 'ug/kg/min', tasaMlH: 5, volumenFinal: 50, concFrasco: 10, unidadFrasco: 'mg/ml' };
  assert.ok(Z.preparar(Object.assign({}, ok, { tasaMlH: null })).error, 'sin tasa ni duración');
  assert.match(Z.preparar(Object.assign({}, ok, { tasaMlH: null })).error, /tasa de infusión/);
  assert.ok(Z.preparar(Object.assign({}, ok, { tasaMlH: NaN })).error);
  assert.ok(Z.preparar(Object.assign({}, ok, { tasaMlH: 0 })).error);
  assert.ok(Z.preparar(Object.assign({}, ok, { tasaMlH: -1 })).error);
  assert.ok(Z.preparar(Object.assign({}, ok, { tasaMlH: null, duracionH: 0 })).error);
  assert.ok(Z.preparar(Object.assign({}, ok, { volumenFinal: 0 })).error);
  assert.ok(Z.preparar(Object.assign({}, ok, { volumenFinal: NaN })).error);
  assert.ok(Z.preparar(Object.assign({}, ok, { concFrasco: 0 })).error);
  assert.ok(Z.preparar(Object.assign({}, ok, { peso: 7000 })).error);
  assert.ok(Z.preparar(Object.assign({}, ok, { unidadFrasco: 'xx' })).error);
  assert.ok(Z.preparar().error);
});

/* ───────── dilución ───────── */
test('dilucion: C1 10 mg/ml, C2 2 mg/ml, V2 10 ml → 2 ml + 8 ml, factor 5', () => {
  const r = Z.dilucion({ c1: 10, unidadC1: 'mg/ml', c2: 2, unidadC2: 'mg/ml', v2: 10 });
  assert.equal(r.ok, true);
  cerca(r.v1, 2);            // 2 × 10 ÷ 10
  cerca(r.diluyente, 8);
  cerca(r.factor, 5);
  assert.equal(r.relacion, '1:5');
  assert.deepEqual(r.avisos, []);
  assert.ok(r.formulas.includes('Volumen del frasco (V1) = (C2 × V2) ÷ C1 = (2 mg/ml × 10 ml) ÷ 10 mg/ml = 2 ml'));
  assert.ok(r.formulas.includes('Diluyente = V2 - V1 = 10 ml - 2 ml = 8 ml'));
  // V1 + diluyente = V2 y C1 × V1 = C2 × V2
  cerca(r.v1 + r.diluyente, r.v2);
  cerca(r.c1MgMl * r.v1, r.c2MgMl * r.v2);
});

test('dilucion: unidades mezcladas (% y μg/ml)', () => {
  // 10 % = 100 mg/ml; 2 mg/ml; 10 ml → 0.2 ml + 9.8 ml; factor 50
  const a = Z.dilucion({ c1: 10, unidadC1: '%', c2: 2, unidadC2: 'mg/ml', v2: 10 });
  cerca(a.v1, 0.2); cerca(a.diluyente, 9.8); cerca(a.factor, 50);
  assert.ok(a.formulas.includes('C1 = 10 % × 10 = 100 mg/ml'));
  // 1 mg/ml → 100 μg/ml (0.1 mg/ml) en 20 ml → 2 ml + 18 ml
  const b = Z.dilucion({ c1: 1, unidadC1: 'mg/ml', c2: 100, unidadC2: 'ug/ml', v2: 20 });
  cerca(b.v1, 2); cerca(b.diluyente, 18);
  assert.ok(b.formulas.includes('C2 = 100 μg/ml ÷ 1000 = 0.1 mg/ml'));
});

test('dilucion: C2 mayor que C1 es imposible; igual no diluye', () => {
  const m = Z.dilucion({ c1: 1, unidadC1: 'mg/ml', c2: 2, unidadC2: 'mg/ml', v2: 10 });
  assert.ok(m.error); assert.equal(m.imposible, true);
  assert.match(m.error, /mayor que la del frasco/);
  // 1 % (10 mg/ml) contra 5 mg/ml: sí se puede; contra 20 mg/ml no
  assert.equal(Z.dilucion({ c1: 1, unidadC1: '%', c2: 5, unidadC2: 'mg/ml', v2: 10 }).ok, true);
  assert.ok(Z.dilucion({ c1: 1, unidadC1: '%', c2: 20, unidadC2: 'mg/ml', v2: 10 }).error);
  const i = Z.dilucion({ c1: 5, unidadC1: 'mg/ml', c2: 5, unidadC2: 'mg/ml', v2: 10 });
  assert.equal(i.ok, true);
  cerca(i.v1, 10); cerca(i.diluyente, 0);
  assert.deepEqual(i.avisos.map(a => a.codigo), ['sin-dilucion']);
});

test('dilucion: avisa si el volumen del frasco sale menor de 0.1 ml', () => {
  // 100 → 1 mg/ml en 5 ml: 0.05 ml
  const r = Z.dilucion({ c1: 100, unidadC1: 'mg/ml', c2: 1, unidadC2: 'mg/ml', v2: 5 });
  cerca(r.v1, 0.05);
  assert.deepEqual(r.avisos.map(a => a.codigo), ['volumen-pequeno']);
  assert.match(r.avisos[0].texto, /Volumen muy pequeño/);
});

test('dilucion: entradas inválidas', () => {
  const ok = { c1: 10, unidadC1: 'mg/ml', c2: 2, unidadC2: 'mg/ml', v2: 10 };
  for (const campo of ['c1', 'c2', 'v2']) {
    for (const v of [0, -1, NaN, null]) assert.ok(Z.dilucion(Object.assign({}, ok, { [campo]: v })).error, campo + '=' + v);
  }
  assert.ok(Z.dilucion(Object.assign({}, ok, { unidadC1: 'x' })).error);
  assert.ok(Z.dilucion().error);
});

test('dilucionRelacion: 1:10 de 10 mg/ml en 5 ml → 0.5 ml + 4.5 ml, 1 mg/ml', () => {
  const r = Z.dilucionRelacion({ c1: 10, unidadC1: 'mg/ml', n: 10, v2: 5 });
  assert.equal(r.ok, true);
  cerca(r.v1, 0.5); cerca(r.diluyente, 4.5); cerca(r.c2MgMl, 1); cerca(r.c2UgMl, 1000);
  assert.ok(r.formulas.includes('Volumen del frasco = V2 ÷ N = 5 ml ÷ 10 = 0.5 ml'));
  assert.ok(r.formulas.includes('Concentración resultante = C1 ÷ N = 10 mg/ml ÷ 10 = 1 mg/ml (1000 μg/ml)'));
  // N con decimales: 1:2.5 en 10 ml → 4 ml + 6 ml
  const d = Z.dilucionRelacion({ c1: 5, unidadC1: 'mg/ml', n: 2.5, v2: 10 });
  cerca(d.v1, 4); cerca(d.diluyente, 6); cerca(d.c2MgMl, 2);
});

test('dilucionRelacion: N = 1 no diluye; N menor de 1 o inválido da error', () => {
  const u = Z.dilucionRelacion({ c1: 10, unidadC1: 'mg/ml', n: 1, v2: 5 });
  cerca(u.v1, 5); cerca(u.diluyente, 0);
  assert.deepEqual(u.avisos.map(a => a.codigo), ['sin-dilucion']);
  for (const n of [0.5, 0, -2, NaN, null, 1e7]) assert.ok(Z.dilucionRelacion({ c1: 10, unidadC1: 'mg/ml', n, v2: 5 }).error, 'n=' + n);
  assert.ok(Z.dilucionRelacion({ c1: 0, unidadC1: 'mg/ml', n: 10, v2: 5 }).error);
  assert.ok(Z.dilucionRelacion({ c1: 10, unidadC1: 'mg/ml', n: 10, v2: 0 }).error);
});

/* ───────── volumen muy pequeño ───────── */
test('volumenPequeno: 0.05 mg de un frasco de 10 mg/ml pide 1:20 y se administran 0.1 ml', () => {
  const r = Z.volumenPequeno({ dosis: 0.05, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml', vMin: null });
  assert.equal(r.ok, true);
  assert.equal(r.necesitaDilucion, true);
  cerca(r.vDirecto, 0.005);
  cerca(r.vMin, 0.1);             // por defecto
  cerca(r.nMin, 20);
  assert.equal(r.n, 20);
  cerca(r.cDilucion, 0.5);
  cerca(r.volumenAdministrar, 0.1);
  assert.equal(r.pasos.length, 1);
  cerca(r.pasos[0].mlTomar, 0.1); cerca(r.pasos[0].mlDiluente, 1.9); cerca(r.pasos[0].mlTotal, 2);
  cerca(r.volumenPreparado, 2);
  assert.ok(r.formulas.includes('Volumen directo = dosis ÷ concentración = 0.05 mg ÷ 10 mg/ml = 0.005 ml'));
  assert.ok(r.formulas.includes('Concentración de la dilución = 10 mg/ml ÷ 20 = 0.5 mg/ml'));
  assert.ok(r.formulas.includes('Volumen a administrar = 0.05 mg ÷ 0.5 mg/ml = 0.1 ml'));
});

test('volumenPequeno: redondea la dilución al siguiente número cómodo (33.3 → 1:50)', () => {
  const r = Z.volumenPequeno({ dosis: 0.03, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml' });
  cerca(r.nMin, 100 / 3, 1e-6);
  assert.equal(r.n, 50);
  cerca(r.cDilucion, 0.2);
  cerca(r.volumenAdministrar, 0.15);   // 0.03 ÷ 0.2
  cerca(r.volumenPreparado, 5);        // 0.1 ml del frasco + 4.9 ml
  assert.ok(r.formulas.includes('Preparación = 0.1 ml del frasco + 4.9 ml de diluyente = 5 ml en total (0.1 ml × 50)'));
});

test('volumenPequeno: si ya es medible no hace falta diluir (incluido el borde justo)', () => {
  const a = Z.volumenPequeno({ dosis: 5, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml' });
  assert.equal(a.necesitaDilucion, false);
  cerca(a.vDirecto, 0.5);
  const borde = Z.volumenPequeno({ dosis: 1, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml' });   // 0.1 ml justo
  assert.equal(borde.necesitaDilucion, false);
});

test('volumenPequeno: dosis en μg, frasco en % y volumen mínimo propio', () => {
  // 50 μg = 0.05 mg; 1 % = 10 mg/ml → igual que el primer caso
  const a = Z.volumenPequeno({ dosis: 50, unidadDosis: 'ug', c1: 1, unidadC1: '%' });
  cerca(a.dosisMg, 0.05); assert.equal(a.n, 20);
  assert.ok(a.formulas.includes('Dosis = 50 μg ÷ 1000 = 0.05 mg'));
  // vMin 0.5 ml: 0.5 mg ÷ 10 = 0.05 ml → 1:10 → 0.5 ml; preparar 5 ml (0.5 + 4.5)
  const b = Z.volumenPequeno({ dosis: 0.5, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml', vMin: 0.5 });
  assert.equal(b.n, 10);
  cerca(b.volumenAdministrar, 0.5);
  cerca(b.pasos[0].mlTomar, 0.5); cerca(b.pasos[0].mlDiluente, 4.5); cerca(b.volumenPreparado, 5);
});

test('volumenPequeno: más de 1:100 se hace en dos pasos que multiplican a N', () => {
  // 0.0005 mg ÷ 10 mg/ml = 0.00005 ml → 0.1 ÷ 0.00005 = 2000
  const r = Z.volumenPequeno({ dosis: 0.0005, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml' });
  assert.equal(r.n, 2000);
  assert.equal(r.pasos.length, 2);
  assert.deepEqual(r.pasos.map(p => p.n), [100, 20]);
  assert.equal(r.pasos[0].n * r.pasos[1].n, r.n);
  cerca(r.pasos[0].concMgMl, 0.1); cerca(r.pasos[1].concMgMl, 0.005);
  cerca(r.cDilucion, 0.005);
  cerca(r.volumenAdministrar, 0.1);
  cerca(r.volumenPreparado, 2);
  assert.deepEqual(r.avisos.map(a => a.codigo), ['dos-pasos']);
  assert.equal(r.pasos[1].de, 'dilución anterior');
});

test('volumenPequeno: invariantes para muchas dosis (siempre medible y alcanza el volumen preparado)', () => {
  for (const dosis of [0.0001, 0.0007, 0.003, 0.0099, 0.02, 0.07, 0.0999]) {
    for (const vMin of [0.1, 0.05, 0.2]) {
      const r = Z.volumenPequeno({ dosis, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml', vMin });
      if (r.error) continue;
      if (!r.necesitaDilucion) { assert.ok(r.vDirecto >= vMin * (1 - 1e-9)); continue; }
      assert.ok(r.volumenAdministrar >= vMin * (1 - 1e-9), 'dosis ' + dosis + ' vMin ' + vMin + ' sale menor que lo medible');
      assert.ok(r.n >= r.nMin * (1 - 1e-9));
      cerca(r.volumenAdministrar * r.cDilucion, dosis, 1e-12);                       // volumen × concentración = dosis
      assert.ok(r.volumenAdministrar <= r.volumenPreparado + 1e-9, 'no alcanza lo preparado');
      const producto = r.pasos.reduce((a, p) => a * p.n, 1);
      assert.ok(Math.abs(producto - r.n) < 1e-9);
    }
  }
});

test('volumenPequeno: dilución mayor de 1:10000 o datos inválidos dan error', () => {
  assert.ok(Z.volumenPequeno({ dosis: 0.00001, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml' }).error);   // pediría 1:100000
  assert.ok(Z.volumenPequeno({ dosis: 0, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml' }).error);
  assert.ok(Z.volumenPequeno({ dosis: -1, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml' }).error);
  assert.ok(Z.volumenPequeno({ dosis: NaN, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml' }).error);
  assert.ok(Z.volumenPequeno({ dosis: 1, unidadDosis: 'kg', c1: 10, unidadC1: 'mg/ml' }).error);
  assert.ok(Z.volumenPequeno({ dosis: 1, unidadDosis: 'mg', c1: 0, unidadC1: 'mg/ml' }).error);
  assert.ok(Z.volumenPequeno({ dosis: 1, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml', vMin: 0 }).error);
  assert.ok(Z.volumenPequeno({ dosis: 1, unidadDosis: 'mg', c1: 10, unidadC1: 'mg/ml', vMin: NaN }).error);
});

/* ───────── conversiones ───────── */
test('convertir: % a mg/ml (1 % = 10 mg/ml) con su fórmula', () => {
  const r = Z.convertir(1, '%', 'mg/ml');
  assert.equal(r.resultado, 10);
  assert.equal(r.formula, '1 % × 10 = 10 mg/ml');
  assert.equal(Z.convertir(2.5, '%', 'mg/ml').resultado, 25);
  assert.equal(Z.convertir(0.5, '%', 'mg/ml').resultado, 5);
  assert.equal(Z.convertir(50, 'mg/ml', '%').resultado, 5);
  assert.equal(Z.convertir(50, 'mg/ml', '%').formula, '50 mg/ml ÷ 10 = 5 %');
});

test('convertir: mg/ml ↔ μg/ml', () => {
  assert.equal(Z.convertir(0.5, 'mg/ml', 'ug/ml').resultado, 500);
  assert.equal(Z.convertir(0.5, 'mg/ml', 'ug/ml').formula, '0.5 mg/ml × 1000 = 500 μg/ml');
  assert.equal(Z.convertir(250, 'ug/ml', 'mg/ml').resultado, 0.25);
  assert.equal(Z.convertir(250, 'ug/ml', 'mg/ml').formula, '250 μg/ml ÷ 1000 = 0.25 mg/ml');
  assert.equal(Z.convertir(0.07, 'mg/ml', 'ug/ml').resultado, 70, 'sin ruido de decimales (0.07 × 1000)');
});

test('convertir: ppm (1 ppm = 1 mg/L = 1 μg/ml = 0.001 mg/ml)', () => {
  assert.equal(Z.convertir(5, 'ppm', 'ug/ml').resultado, 5);
  assert.equal(Z.convertir(5, 'ppm', 'mg/ml').resultado, 0.005);
  assert.equal(Z.convertir(1000, 'ppm', 'mg/ml').resultado, 1);
  assert.equal(Z.convertir(1, '%', 'ppm').resultado, 10000);
  assert.equal(Z.convertir(0.1, '%', 'ppm').resultado, 1000);
  assert.equal(Z.convertir(2, 'mg/ml', 'ppm').resultado, 2000);
  assert.equal(Z.convertir(1, 'mg/ml', 'g/l').resultado, 1);
});

test('convertir: masa (g, mg, μg, ng)', () => {
  assert.equal(Z.convertir(2, 'g', 'mg').resultado, 2000);
  assert.equal(Z.convertir(2, 'g', 'mg').formula, '2 g × 1000 = 2000 mg');
  assert.equal(Z.convertir(1500, 'mg', 'g').resultado, 1.5);
  assert.equal(Z.convertir(0.25, 'mg', 'ug').resultado, 250);
  assert.equal(Z.convertir(500, 'ug', 'mg').resultado, 0.5);
  assert.equal(Z.convertir(1, 'mg', 'ng').resultado, 1000000);
  assert.equal(Z.convertir(1, 'g', 'ug').resultado, 1000000);
});

test('convertir: la misma unidad deja el valor; ida y vuelta vuelve al origen', () => {
  assert.equal(Z.convertir(3.7, 'mg', 'mg').resultado, 3.7);
  const unidades = Object.keys(Z.UNIDADES);
  for (const de of unidades) for (const a of unidades) {
    if (Z.UNIDADES[de].fam !== Z.UNIDADES[a].fam) continue;
    const ida = Z.convertir(12.5, de, a);
    const vuelta = Z.convertir(ida.resultado, a, de);
    cerca(vuelta.resultado, 12.5, 1e-9);
  }
});

test('convertir: magnitudes distintas, negativos y texto dan error; cero se acepta', () => {
  assert.match(Z.convertir(1, 'mg', 'mg/ml').error, /magnitudes distintas/);
  assert.ok(Z.convertir(1, '%', 'g').error);
  assert.ok(Z.convertir(-1, 'mg', 'g').error);
  assert.ok(Z.convertir(NaN, 'mg', 'g').error);
  assert.ok(Z.convertir(null, 'mg', 'g').error);
  assert.ok(Z.convertir(1, 'xx', 'g').error);
  assert.ok(Z.convertir(1, 'mg', undefined).error);
  assert.equal(Z.convertir(0, 'g', 'mg').resultado, 0);
});

test('relacionAConc: 1:1000 = 1 mg/ml, 1:10000 = 0.1 mg/ml', () => {
  const a = Z.relacionAConc(1000);
  assert.equal(a.mgMl, 1); assert.equal(a.ugMl, 1000); cerca(a.porcentaje, 0.1);
  assert.equal(a.formula, '1:1000 = 1 g en 1000 ml = 1000 mg ÷ 1000 ml = 1 mg/ml (1000 μg/ml; 0.1 %)');
  const b = Z.relacionAConc(10000);
  cerca(b.mgMl, 0.1); cerca(b.ugMl, 100);
  assert.equal(Z.relacionAConc(1).mgMl, 1000);
  assert.ok(Z.relacionAConc(0.5).error);
  assert.ok(Z.relacionAConc(0).error);
  assert.ok(Z.relacionAConc(NaN).error);
  assert.ok(Z.relacionAConc(-5).error);
});

test('equivalencias: la tabla rápida coincide con el convertidor', () => {
  const textos = Z.equivalencias().map(e => e.texto);
  for (const t of ['1 % = 10 mg/ml', '1 mg/ml = 1000 μg/ml', '1 ppm = 1 μg/ml', '1 ppm = 0.001 mg/ml', '1 mg = 1000 μg', '1 g = 1000 mg']) {
    assert.ok(textos.includes(t), 'falta ' + t + ' en ' + textos.join(' | '));
  }
});

/* ───────── duración y tasa ───────── */
test('duracionInfusion: 500 ml a 62.5 ml/h = 8 h; 100 ml a 30 ml/h = 3 h 20 min', () => {
  const a = Z.duracionInfusion({ volumen: 500, tasa: 62.5 });
  cerca(a.horas, 8); assert.equal(a.texto, '8 h');
  assert.ok(a.formulas.includes('Duración = volumen ÷ tasa = 500 ml ÷ 62.5 ml/h = 8 h'));
  assert.deepEqual(a.gotas.map(g => g.gotasMin), [10.416666666666666, 15.625, 20.833333333333332, 62.5]);
  const b = Z.duracionInfusion({ volumen: 100, tasa: 30 });
  cerca(b.horas, 10 / 3); assert.equal(b.texto, '3 h 20 min');
  assert.deepEqual(b.avisos, []);
});

test('duracionInfusion: avisa tasa menor de 0.1 ml/h y valida', () => {
  const r = Z.duracionInfusion({ volumen: 10, tasa: 0.05 });
  cerca(r.horas, 200);
  assert.deepEqual(r.avisos.map(a => a.codigo), ['tasa-baja']);
  for (const e of [{ volumen: 0, tasa: 5 }, { volumen: 5, tasa: 0 }, { volumen: -5, tasa: 5 }, { volumen: 5, tasa: NaN }, { volumen: NaN, tasa: 5 }, {}]) {
    assert.ok(Z.duracionInfusion(e).error);
  }
});

test('tasaPorDuracion: 500 ml en 8 h = 62.5 ml/h; 60 ml en 90 min = 40 ml/h', () => {
  const a = Z.tasaPorDuracion({ volumen: 500, tiempo: 8, unidadTiempo: 'h' });
  cerca(a.tasaMlH, 62.5);
  assert.ok(a.formulas.includes('Tasa = volumen ÷ duración = 500 ml ÷ 8 h = 62.5 ml/h'));
  const b = Z.tasaPorDuracion({ volumen: 60, tiempo: 90, unidadTiempo: 'min' });
  cerca(b.horas, 1.5); cerca(b.tasaMlH, 40);
  assert.ok(b.formulas.includes('Duración en horas = 90 min ÷ 60 = 1.5 h'));
  // por defecto horas
  cerca(Z.tasaPorDuracion({ volumen: 10, tiempo: 4 }).tasaMlH, 2.5);
});

test('tasaPorDuracion: avisa tasa baja y valida', () => {
  // 1 ml en 12 h = 0.0833 ml/h
  const r = Z.tasaPorDuracion({ volumen: 1, tiempo: 12, unidadTiempo: 'h' });
  assert.ok(r.avisos.some(a => a.codigo === 'tasa-baja'));
  assert.ok(Z.tasaPorDuracion({ volumen: 1, tiempo: 0, unidadTiempo: 'h' }).error);
  assert.ok(Z.tasaPorDuracion({ volumen: 1, tiempo: -2, unidadTiempo: 'h' }).error);
  assert.ok(Z.tasaPorDuracion({ volumen: 1, tiempo: 2, unidadTiempo: 'dias' }).error);
  assert.ok(Z.tasaPorDuracion({ volumen: 0, tiempo: 2, unidadTiempo: 'h' }).error);
  assert.ok(Z.tasaPorDuracion({ volumen: 1, tiempo: NaN, unidadTiempo: 'h' }).error);
});

/* ───────── el módulo no trae dosis ni emojis ───────── */
test('el módulo es aritmética pura: sin fármacos ni dosis propias y sin emojis', () => {
  const src = leer('assets/js/herramientas-infusiones.js');
  assert.ok(!EMOJI.test(src), 'emoji en el módulo');
  for (const farmaco of ['ketamina', 'fentanilo', 'lidoca', 'dexmedetomidina', 'morfina', 'propofol', 'dobutamina', 'xilacina', 'medetomidina']) {
    assert.equal(src.toLowerCase().includes(farmaco), false, 'el módulo menciona ' + farmaco);
  }
  assert.ok(src.includes(Z.AVISO_GENERAL));
  assert.equal(Z.AVISO_GENERAL, 'Confirma siempre la dosis con tu fuente y revisa unidades y concentración antes de preparar.');
});

/* ───────── la página ───────── */
const PAGINA = leer('pages/club-infusiones.html');
const HERR = leer('pages/club-herramientas.html');

test('página: mismo patrón que Herramientas (auth, membresía, menú, paywall, versiones)', () => {
  assert.match(PAGINA, /ZOORIGEN_CLUB\.requireAuth\(\)/);
  assert.match(PAGINA, /ZOORIGEN_CLUB\.hasActiveMembership\(session\)/);
  assert.match(PAGINA, /renderSidebar\('herramientas', session\)/);
  assert.match(PAGINA, /Herramientas exclusivas para miembros/);
  assert.match(PAGINA, /href="club-suscripcion\.html"/);
  assert.match(PAGINA, /class="tool-aviso-global"/);
  assert.match(PAGINA, /ZOORIGEN_CLUB\.showPaywall\(/);
  // mismas versiones de los archivos compartidos que la página de herramientas
  for (const re of [/assets\/js\/club\.js\?v=[\w.-]+/, /assets\/js\/club-shell\.js\?v=[\w.-]+/, /assets\/js\/herramientas-iconos\.js\?v=[\w.-]+/, /assets\/js\/club-avisos\.js\?v=[\w.-]+/, /assets\/css\/club-shell\.css\?v=[\w.-]+/, /assets\/css\/club\.css\?v=[\w.-]+/]) {
    const a = PAGINA.match(re), b = HERR.match(re);
    assert.ok(a, 'falta ' + re);
    assert.equal(a[0], b[0], 'versión distinta de ' + re);
  }
  assert.match(PAGINA, /assets\/js\/herramientas-infusiones\.js\?v=[\w.-]+/);
  assert.ok(PAGINA.indexOf('herramientas-iconos.js') < PAGINA.indexOf('herramientas-infusiones.js'), 'íconos antes que el módulo');
  assert.ok(PAGINA.indexOf('herramientas-infusiones.js') < PAGINA.indexOf('requireAuth'), 'el módulo debe cargarse antes de usarlo');
});

test('página: avisos de seguridad y sin emojis ni "☰"', () => {
  assert.ok(PAGINA.includes('Confirma siempre la dosis con tu fuente y revisa unidades y concentración antes de preparar'));
  assert.ok(PAGINA.includes('no incluye dosis clínicas'));
  assert.ok(!EMOJI.test(PAGINA), 'emoji en la página');
});

test('página: campos de número son texto con teclado decimal (nunca type="number")', () => {
  assert.ok(!/type="number"/.test(PAGINA));
  const entradas = [...PAGINA.matchAll(/<input\b[^>]*>/g)].map(m => m[0]);
  assert.ok(entradas.length >= 20);
  for (const t of entradas) {
    assert.match(t, /type="text"/, t);
    assert.match(t, /inputmode="decimal"/, t);
  }
});

test('página: las pestañas tienen su panel y los ids que usa el script existen', () => {
  const tabs = [...PAGINA.matchAll(/data-tab="([\w-]+)"/g)].map(m => m[1]);
  assert.deepEqual(tabs, ['cri', 'dilucion', 'conversiones', 'duracion']);
  for (const t of tabs) assert.match(PAGINA, new RegExp('id="panel-' + t + '"'));
  const ids = new Set([...PAGINA.matchAll(/\bid="([\w-]+)"/g)].map(m => m[1]));
  const script = PAGINA.slice(PAGINA.indexOf('// ═══════════════ Ayudas de la página'));
  const usados = new Set([...script.matchAll(/(?:\$|valor|opcional)\('([\w-]+)'\)/g)].map(m => m[1]));
  for (const m of PAGINA.matchAll(/(?:valor|opcional)\('([\w-]+)'\)/g)) usados.add(m[1]);
  assert.ok(usados.size >= 25);
  const faltan = [...usados].filter(id => !ids.has(id));
  assert.deepEqual(faltan, []);
});

test('página: las unidades de los selectores existen en el módulo', () => {
  const opciones = id => {
    const m = PAGINA.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'));
    assert.ok(m, 'falta el selector ' + id);
    return [...m[1].matchAll(/value="([^"]+)"/g)].map(x => x[1]);
  };
  const dentro = (id, tabla) => { const ops = opciones(id); assert.ok(ops.length >= 2); for (const o of ops) assert.ok(tabla[o], id + ' trae la unidad ' + o + ' que el módulo no conoce'); };
  dentro('criDosisU', Z.UNIDADES_DOSIS);
  dentro('criConcU', Z.UNIDADES_CONC);
  dentro('criFrascoU', Z.UNIDADES_CONC);
  for (const id of ['difC1U', 'difC2U', 'difRC1U', 'difPC1U']) dentro(id, Z.UNIDADES_CONC);
  dentro('difPDosisU', Z.UNIDADES_MASA);
  for (const d of ['ug/kg/min', 'ug/kg/h', 'mg/kg/h', 'mg/kg/min']) assert.ok(opciones('criDosisU').includes(d), 'falta ' + d);
  assert.deepEqual(opciones('durTiempoU'), ['h', 'min']);
});

test('página: todos los íconos que usa existen', () => {
  const nombres = new Set(I.nombres());
  const usados = new Set();
  for (const m of PAGINA.matchAll(/#zi-([a-z0-9-]+)/g)) usados.add(m[1]);
  for (const m of PAGINA.matchAll(/ico\('([a-z0-9-]+)'\)/g)) usados.add(m[1]);
  for (const m of PAGINA.matchAll(/(?:mostrar\([^)]*?,\s*'[^']*',\s*|mostrar\(el,\s*[^,]+,\s*)'([a-z0-9-]+)'/g)) usados.add(m[1]);
  assert.ok(usados.size >= 8);
  const faltan = [...usados].filter(n => !nombres.has(n));
  assert.deepEqual(faltan, []);
});

test('página: el módulo de íconos y el de infusiones funcionan juntos (la página dibuja sin errores de datos)', () => {
  // Mismos nombres de ícono que pide mostrar(): deben dar un SVG
  for (const n of ['syringe', 'flask-conical', 'refresh-cw', 'timer', 'droplet', 'hash', 'file-text', 'triangle-alert', 'info', 'clipboard-list', 'lock', 'menu']) {
    assert.ok(I.i(n).includes('<use href="#zi-' + n + '"/>'), n);
  }
});
