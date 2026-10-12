/* ============================================================ */
/* INFUSIONES Y DILUCIONES · CÁLCULOS (parte pura, probada en Node) */
/* Aquí viven las cuentas de infusión continua (CRI), diluciones, */
/* conversiones de unidades y duración de bolsas o jeringas.      */
/* La página solo toma los datos del formulario y dibuja lo que   */
/* esta parte devuelve.                                           */
/*                                                                */
/* IMPORTANTE: este archivo NO trae dosis clínicas. Solo hace     */
/* aritmética con los números que escribe el veterinario. Cada    */
/* resultado devuelve también la fórmula con los números puestos, */
/* para que se pueda comprobar a mano.                            */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_INFUSIONES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PESO_MIN = 0.001;            // kg
  var PESO_MAX = 6000;             // kg
  var CONC_MAX = 10000;            // mg/ml
  var VOLUMEN_MAX = 100000;        // ml
  var DURACION_MAX = 100000;       // h
  var DOSIS_MAX = 1000000;         // en la unidad que se escriba
  var TASA_MIN_BOMBA = 0.1;        // ml/h: menos que esto no lo mide una bomba de jeringa estándar
  var VOLUMEN_MIN_MEDIBLE = 0.1;   // ml: lo mínimo que se mide con una jeringa de insulina
  var EQUIPOS = [10, 15, 20, 60];  // gotas por ml
  var N_COMODOS = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  var AVISO_GENERAL = 'Confirma siempre la dosis con tu fuente y revisa unidades y concentración antes de preparar.';

  /* ───── unidades ───── */
  // mgKgH = valor × mult ÷ div
  var UNIDADES_DOSIS = {
    'ug/kg/min': { etiqueta: 'μg/kg/min', mult: 60, div: 1000 },
    'ug/kg/h':   { etiqueta: 'μg/kg/h',   mult: 1,  div: 1000 },
    'mg/kg/h':   { etiqueta: 'mg/kg/h',   mult: 1,  div: 1 },
    'mg/kg/min': { etiqueta: 'mg/kg/min', mult: 60, div: 1 }
  };
  // mgMl = valor × mult ÷ div
  var UNIDADES_CONC = {
    'mg/ml': { etiqueta: 'mg/ml', mult: 1,  div: 1 },
    'ug/ml': { etiqueta: 'μg/ml', mult: 1,  div: 1000 },
    '%':     { etiqueta: '%',     mult: 10, div: 1 }
  };
  var UNIDADES_MASA = {
    'mg': { etiqueta: 'mg', mult: 1, div: 1 },
    'ug': { etiqueta: 'μg', mult: 1, div: 1000 }
  };
  // Para el convertidor: exp = potencia de 10 respecto a la base (mg/ml para concentración, mg para masa)
  var UNIDADES = {
    '%':     { fam: 'conc', exp: 1,  etiqueta: '%' },
    'g/l':   { fam: 'conc', exp: 0,  etiqueta: 'g/L' },
    'mg/ml': { fam: 'conc', exp: 0,  etiqueta: 'mg/ml' },
    'ug/ml': { fam: 'conc', exp: -3, etiqueta: 'μg/ml' },
    'ppm':   { fam: 'conc', exp: -3, etiqueta: 'ppm' },
    'g':     { fam: 'masa', exp: 3,  etiqueta: 'g' },
    'mg':    { fam: 'masa', exp: 0,  etiqueta: 'mg' },
    'ug':    { fam: 'masa', exp: -3, etiqueta: 'μg' },
    'ng':    { fam: 'masa', exp: -6, etiqueta: 'ng' }
  };

  /* ───── lectura y validación ───── */
  // Acepta "12.5" y "12,5". Devuelve NaN si no es un número.
  function leerNumero(texto) {
    var s = String(texto == null ? '' : texto).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '' || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }

  function errorPeso(p) {
    if (typeof p !== 'number' || !isFinite(p)) return 'Escribe el peso en kilogramos (por ejemplo 12.5).';
    if (p < 0) return 'El peso no puede ser negativo.';
    if (p < PESO_MIN) return 'El peso debe ser mayor a 0 kg.';
    if (p > PESO_MAX) return 'El peso parece demasiado alto (máximo ' + PESO_MAX + ' kg). Revisa que esté en kilogramos.';
    return '';
  }

  // nombre: "la dosis", "el volumen (ml)"... Devuelve '' si el número sirve.
  function errorNumero(v, nombre, max, permiteCero) {
    if (typeof v !== 'number' || !isFinite(v)) return 'Escribe ' + nombre + ' (un número, por ejemplo 5).';
    if (v < 0) return 'Revisa ' + nombre + ': no puede ser negativo.';
    if (v === 0 && !permiteCero) return 'Revisa ' + nombre + ': debe ser mayor que 0.';
    if (max != null && v > max) return 'Revisa ' + nombre + ': el valor parece demasiado alto. Revisa la unidad.';
    return '';
  }

  /* ───── formato ───── */
  // 4 cifras significativas, sin ceros sobrantes, nunca "0.00" para algo que no es cero y nunca notación científica.
  function fmt(x) {
    if (typeof x !== 'number' || !isFinite(x)) return '—';
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e4) return a >= 1e21 ? x.toExponential(2) : x.toFixed(0);
    var dec = Math.max(0, 3 - Math.floor(Math.log10(a)));
    if (dec > 20) return x.toExponential(2);
    var t = x.toFixed(dec);
    if (t.indexOf('.') >= 0) t = t.replace(/0+$/, '').replace(/\.$/, '');
    return t === '0' || t === '-0' ? x.toExponential(2) : t;
  }

  function limpia(x) { return Number(x.toPrecision(12)); }

  // Horas a "16 h 40 min"
  function textoDuracion(horas) {
    if (typeof horas !== 'number' || !isFinite(horas) || horas < 0) return '—';
    var min = Math.round(horas * 60);
    if (min < 1) return 'menos de 1 min';
    var d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60, p = [];
    if (d) p.push(d + ' d');
    if (h) p.push(h + ' h');
    if (m) p.push(m + ' min');
    return p.join(' ');
  }

  // Segundos entre gota y gota, en la unidad que se lee mejor: "30 s", "6 min", "2.5 h"
  function textoSegundos(seg) {
    if (typeof seg !== 'number' || !isFinite(seg) || seg < 0) return '—';
    if (seg < 120) return fmt(seg) + ' s';
    if (seg < 7200) return fmt(seg / 60) + ' min';
    return fmt(seg / 3600) + ' h';
  }

  // "16.67 h (16 h 40 min)"; si el texto no agrega nada, solo "10 h"
  function horasTexto(horas) {
    var a = fmt(horas) + ' h', t = textoDuracion(horas);
    return t === a ? a : a + ' (' + t + ')';
  }

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ───── piezas comunes ───── */
  // " × 60 ÷ 1000": lo que se le hace al número para pasarlo a la unidad base
  function operador(u) {
    var s = '';
    if (u.mult !== 1) s += ' × ' + fmt(u.mult);
    if (u.div !== 1) s += ' ÷ ' + fmt(u.div);
    return s;
  }

  function leerDosis(valor, unidad) {
    var u = UNIDADES_DOSIS[unidad];
    if (!u) return { error: 'Elige la unidad de la dosis.' };
    var e = errorNumero(valor, 'la dosis', DOSIS_MAX);
    if (e) return { error: e };
    var mgKgH = valor * u.mult / u.div;
    var linea = (u.mult === 1 && u.div === 1) ? null
      : 'Dosis en mg/kg/h = ' + fmt(valor) + ' ' + u.etiqueta + operador(u) + ' = ' + fmt(mgKgH) + ' mg/kg/h';
    return { mgKgH: mgKgH, linea: linea, etiqueta: u.etiqueta };
  }

  // nombre: "la concentración de la solución". cap: nombre al inicio de frase.
  function leerConc(valor, unidad, nombre, cap) {
    var u = UNIDADES_CONC[unidad];
    if (!u) return { error: 'Elige la unidad de ' + nombre + '.' };
    var e = errorNumero(valor, nombre);
    if (e) return { error: e };
    var mgMl = valor * u.mult / u.div;
    if (mgMl > CONC_MAX) return { error: 'Revisa ' + nombre + ': parece demasiado alta. Revisa la unidad.' };
    var linea = (u.mult === 1 && u.div === 1) ? null
      : cap + ' = ' + fmt(valor) + ' ' + u.etiqueta + operador(u) + ' = ' + fmt(mgMl) + ' mg/ml';
    return { mgMl: mgMl, linea: linea, etiqueta: u.etiqueta };
  }

  function gotasPorEquipo(mlH) {
    return EQUIPOS.map(function (eq) {
      var g = mlH * eq / 60;
      return { equipo: eq, gotasMin: g, segPorGota: g > 0 ? 60 / g : 0 };
    });
  }
  function formulasGotas(mlH) {
    return gotasPorEquipo(mlH).map(function (g) {
      return 'Gotas por minuto con equipo de ' + g.equipo + ' gtt/ml = ' + fmt(mlH) + ' ml/h × ' + g.equipo + ' ÷ 60 = ' + fmt(g.gotasMin) + ' gtt/min';
    });
  }

  function avisoTasaBaja(mlH, enPreparar) {
    return {
      codigo: 'tasa-baja',
      texto: 'La velocidad (' + fmt(mlH) + ' ml/h) es menor de ' + TASA_MIN_BOMBA + ' ml/h: una bomba de jeringa estándar no la mide con exactitud. ' +
        (enPreparar ? 'Aumenta la tasa y prepara una solución más diluida (menor concentración).' : 'Prepara una solución más diluida (menor concentración) para que la velocidad sea mayor.')
    };
  }
  function avisoVolumenPequeno(ml, que) {
    return {
      codigo: 'volumen-pequeno',
      texto: 'El volumen ' + que + ' (' + fmt(ml) + ' ml) es menor de ' + VOLUMEN_MIN_MEDIBLE + ' ml: es difícil medirlo con exactitud. Usa la ayuda «Volumen muy pequeño» de la pestaña Dilución o prepara un volumen final mayor.'
    };
  }

  /* ───── 1. INFUSIÓN CONTINUA: velocidad ───── */
  // e: { peso (kg), dosis, unidadDosis, conc, unidadConc, volumen (ml, opcional: null) }
  function cri(e) {
    e = e || {};
    var ep = errorPeso(e.peso); if (ep) return { error: ep };
    var d = leerDosis(e.dosis, e.unidadDosis); if (d.error) return { error: d.error };
    var c = leerConc(e.conc, e.unidadConc, 'la concentración de la solución', 'Concentración'); if (c.error) return { error: c.error };
    var vol = null;
    if (e.volumen !== null && e.volumen !== undefined) {
      var ev = errorNumero(e.volumen, 'el volumen de la bolsa o jeringa (ml)', VOLUMEN_MAX);
      if (ev) return { error: ev };
      vol = e.volumen;
    }

    var mgH = d.mgKgH * e.peso;
    var mlH = mgH / c.mgMl;
    var formulas = [];
    if (d.linea) formulas.push(d.linea);
    if (c.linea) formulas.push(c.linea);
    formulas.push('Fármaco por hora = ' + fmt(d.mgKgH) + ' mg/kg/h × ' + fmt(e.peso) + ' kg = ' + fmt(mgH) + ' mg/h');
    formulas.push('Velocidad = ' + fmt(mgH) + ' mg/h ÷ ' + fmt(c.mgMl) + ' mg/ml = ' + fmt(mlH) + ' ml/h');
    formulas = formulas.concat(formulasGotas(mlH));

    var r = {
      ok: true, peso: e.peso, mgKgH: d.mgKgH, mgH: mgH, concMgMl: c.mgMl, mlH: mlH,
      gotas: gotasPorEquipo(mlH), volumen: vol, duracionH: null, duracionTexto: null, mgEnVolumen: null,
      avisos: [], formulas: formulas
    };
    if (vol !== null) {
      r.duracionH = vol / mlH;
      r.duracionTexto = textoDuracion(r.duracionH);
      r.mgEnVolumen = c.mgMl * vol;
      formulas.push('Fármaco en el volumen = ' + fmt(c.mgMl) + ' mg/ml × ' + fmt(vol) + ' ml = ' + fmt(r.mgEnVolumen) + ' mg');
      formulas.push('Duración = ' + fmt(vol) + ' ml ÷ ' + fmt(mlH) + ' ml/h = ' + horasTexto(r.duracionH));
    }
    if (mlH < TASA_MIN_BOMBA) r.avisos.push(avisoTasaBaja(mlH, false));
    return r;
  }

  /* ───── 1b. INFUSIÓN CONTINUA: preparar la solución ───── */
  // e: { peso, dosis, unidadDosis, tasaMlH | duracionH, volumenFinal (ml), concFrasco, unidadFrasco }
  // Si vienen tasa y duración, se usa la tasa.
  function preparar(e) {
    e = e || {};
    var ep = errorPeso(e.peso); if (ep) return { error: ep };
    var d = leerDosis(e.dosis, e.unidadDosis); if (d.error) return { error: d.error };
    var f = leerConc(e.concFrasco, e.unidadFrasco, 'la concentración del frasco', 'Concentración del frasco'); if (f.error) return { error: f.error };
    var ev = errorNumero(e.volumenFinal, 'el volumen final de la bolsa o jeringa (ml)', VOLUMEN_MAX);
    if (ev) return { error: ev };
    var V = e.volumenFinal;

    var tasa, formulas = [], tasaDeDuracion = false;
    var hayTasa = e.tasaMlH !== null && e.tasaMlH !== undefined;
    var hayDur = e.duracionH !== null && e.duracionH !== undefined;
    if (hayTasa) {
      var et = errorNumero(e.tasaMlH, 'la tasa de infusión (ml/h)', VOLUMEN_MAX);
      if (et) return { error: et };
      tasa = e.tasaMlH;
    } else if (hayDur) {
      var edu = errorNumero(e.duracionH, 'la duración (horas)', DURACION_MAX);
      if (edu) return { error: edu };
      tasa = V / e.duracionH;
      tasaDeDuracion = true;
    } else {
      return { error: 'Escribe la tasa de infusión (ml/h) o la duración deseada (horas).' };
    }

    var mgH = d.mgKgH * e.peso;
    var cNec = mgH / tasa;
    if (d.linea) formulas.push(d.linea);
    if (f.linea) formulas.push(f.linea);
    if (tasaDeDuracion) formulas.push('Tasa = ' + fmt(V) + ' ml ÷ ' + fmt(e.duracionH) + ' h = ' + fmt(tasa) + ' ml/h');
    formulas.push('Fármaco por hora = ' + fmt(d.mgKgH) + ' mg/kg/h × ' + fmt(e.peso) + ' kg = ' + fmt(mgH) + ' mg/h');
    formulas.push('Concentración necesaria = ' + fmt(mgH) + ' mg/h ÷ ' + fmt(tasa) + ' ml/h = ' + fmt(cNec) + ' mg/ml');

    if (cNec > f.mgMl * (1 + 1e-9)) {
      return {
        error: 'La concentración que necesitas (' + fmt(cNec) + ' mg/ml) es mayor que la del frasco (' + fmt(f.mgMl) + ' mg/ml): no se puede lograr diluyendo. ' +
          'Revisa la dosis, el peso, la unidad o la tasa de infusión.',
        imposible: true, concNecesaria: cNec, concFrasco: f.mgMl
      };
    }
    if (cNec > f.mgMl) cNec = f.mgMl;

    var mg = cNec * V;
    var mlFrasco = mg / f.mgMl;
    var mlDiluente = Math.max(0, V - mlFrasco);
    var horas = V / tasa;
    formulas.push('Fármaco a agregar = ' + fmt(cNec) + ' mg/ml × ' + fmt(V) + ' ml = ' + fmt(mg) + ' mg');
    formulas.push('Volumen del frasco = ' + fmt(mg) + ' mg ÷ ' + fmt(f.mgMl) + ' mg/ml = ' + fmt(mlFrasco) + ' ml');
    formulas.push('Diluyente = ' + fmt(V) + ' ml - ' + fmt(mlFrasco) + ' ml = ' + fmt(mlDiluente) + ' ml');
    formulas.push('Duración = ' + fmt(V) + ' ml ÷ ' + fmt(tasa) + ' ml/h = ' + horasTexto(horas));
    formulas = formulas.concat(formulasGotas(tasa));

    var r = {
      ok: true, peso: e.peso, mgKgH: d.mgKgH, mgH: mgH, tasaMlH: tasa, concNecesaria: cNec, concFrasco: f.mgMl,
      mgAgregar: mg, mlFrasco: mlFrasco, mlDiluente: mlDiluente, volumenFinal: V,
      duracionH: horas, duracionTexto: textoDuracion(horas), gotas: gotasPorEquipo(tasa),
      avisos: [], formulas: formulas
    };
    if (tasa < TASA_MIN_BOMBA) r.avisos.push(avisoTasaBaja(tasa, true));
    if (mlFrasco < VOLUMEN_MIN_MEDIBLE) r.avisos.push(avisoVolumenPequeno(mlFrasco, 'del frasco que debes tomar'));
    return r;
  }

  /* ───── 2. DILUCIÓN por concentración deseada (C1 × V1 = C2 × V2) ───── */
  // e: { c1, unidadC1, c2, unidadC2, v2 (ml) }
  function dilucion(e) {
    e = e || {};
    var c1 = leerConc(e.c1, e.unidadC1, 'la concentración del frasco (C1)', 'C1'); if (c1.error) return { error: c1.error };
    var c2 = leerConc(e.c2, e.unidadC2, 'la concentración que quieres (C2)', 'C2'); if (c2.error) return { error: c2.error };
    var ev = errorNumero(e.v2, 'el volumen final que quieres preparar (ml)', VOLUMEN_MAX);
    if (ev) return { error: ev };
    var C1 = c1.mgMl, C2 = c2.mgMl, V2 = e.v2;
    if (C2 > C1 * (1 + 1e-9)) {
      return {
        error: 'La concentración que quieres (' + fmt(C2) + ' mg/ml) es mayor que la del frasco (' + fmt(C1) + ' mg/ml): no se puede lograr diluyendo.',
        imposible: true
      };
    }
    if (C2 > C1) C2 = C1;
    var V1 = C2 * V2 / C1;
    var dil = Math.max(0, V2 - V1);
    var factor = C1 / C2;
    var formulas = [];
    if (c1.linea) formulas.push(c1.linea);
    if (c2.linea) formulas.push(c2.linea);
    formulas.push('Volumen del frasco (V1) = (C2 × V2) ÷ C1 = (' + fmt(C2) + ' mg/ml × ' + fmt(V2) + ' ml) ÷ ' + fmt(C1) + ' mg/ml = ' + fmt(V1) + ' ml');
    formulas.push('Diluyente = V2 - V1 = ' + fmt(V2) + ' ml - ' + fmt(V1) + ' ml = ' + fmt(dil) + ' ml');
    formulas.push('Factor de dilución = C1 ÷ C2 = ' + fmt(C1) + ' ÷ ' + fmt(C2) + ' = ' + fmt(factor) + ' (relación 1:' + fmt(factor) + ')');
    var r = {
      ok: true, c1MgMl: C1, c2MgMl: C2, v2: V2, v1: V1, diluyente: dil, factor: factor, relacion: '1:' + fmt(factor),
      partesDiluyente: factor - 1, avisos: [], formulas: formulas
    };
    if (C2 === C1) r.avisos.push({ codigo: 'sin-dilucion', texto: 'La concentración que quieres es igual a la del frasco: no hay nada que diluir.' });
    if (V1 < VOLUMEN_MIN_MEDIBLE) r.avisos.push(avisoVolumenPequeno(V1, 'del frasco que debes tomar'));
    return r;
  }

  /* ───── 2b. DILUCIÓN por relación 1:N ───── */
  // 1:N = 1 parte de fármaco en N partes en total (N - 1 de diluyente). e: { c1, unidadC1, n, v2 }
  function dilucionRelacion(e) {
    e = e || {};
    var c1 = leerConc(e.c1, e.unidadC1, 'la concentración del frasco (C1)', 'C1'); if (c1.error) return { error: c1.error };
    if (typeof e.n !== 'number' || !isFinite(e.n)) return { error: 'Escribe N de la relación 1:N (un número, por ejemplo 10).' };
    if (e.n < 1) return { error: 'N debe ser 1 o mayor (1:1 es sin diluir; 1:10 es diez veces más diluido).' };
    if (e.n > 1e6) return { error: 'Revisa N: el valor parece demasiado alto.' };
    var ev = errorNumero(e.v2, 'el volumen final que quieres preparar (ml)', VOLUMEN_MAX);
    if (ev) return { error: ev };
    var N = e.n, V2 = e.v2, C1 = c1.mgMl;
    var V1 = V2 / N, dil = V2 - V1, C2 = C1 / N;
    var formulas = [];
    if (c1.linea) formulas.push(c1.linea);
    formulas.push('Volumen del frasco = V2 ÷ N = ' + fmt(V2) + ' ml ÷ ' + fmt(N) + ' = ' + fmt(V1) + ' ml');
    formulas.push('Diluyente = V2 - V1 = ' + fmt(V2) + ' ml - ' + fmt(V1) + ' ml = ' + fmt(dil) + ' ml');
    formulas.push('Concentración resultante = C1 ÷ N = ' + fmt(C1) + ' mg/ml ÷ ' + fmt(N) + ' = ' + fmt(C2) + ' mg/ml (' + fmt(C2 * 1000) + ' μg/ml)');
    var r = { ok: true, n: N, c1MgMl: C1, c2MgMl: C2, c2UgMl: C2 * 1000, v2: V2, v1: V1, diluyente: dil, avisos: [], formulas: formulas };
    if (N === 1) r.avisos.push({ codigo: 'sin-dilucion', texto: 'Con N = 1 no hay dilución: usas el frasco tal cual.' });
    if (V1 < VOLUMEN_MIN_MEDIBLE) r.avisos.push(avisoVolumenPequeno(V1, 'del frasco que debes tomar'));
    return r;
  }

  /* ───── 2c. VOLUMEN MUY PEQUEÑO: qué dilución 1:N usar ───── */
  // e: { dosis, unidadDosis ('mg'|'ug'), c1, unidadC1, vMin (ml; null = 0.1) }
  function volumenPequeno(e) {
    e = e || {};
    var um = UNIDADES_MASA[e.unidadDosis];
    if (!um) return { error: 'Elige la unidad de la dosis total (mg o μg).' };
    var ed = errorNumero(e.dosis, 'la dosis total', DOSIS_MAX);
    if (ed) return { error: ed };
    var c1 = leerConc(e.c1, e.unidadC1, 'la concentración del frasco', 'Concentración del frasco'); if (c1.error) return { error: c1.error };
    var vMin = (e.vMin === null || e.vMin === undefined) ? VOLUMEN_MIN_MEDIBLE : e.vMin;
    var evm = errorNumero(vMin, 'el volumen mínimo que puedes medir (ml)', 1000);
    if (evm) return { error: evm };

    var mg = e.dosis * um.mult / um.div;
    var C1 = c1.mgMl;
    var vDirecto = mg / C1;
    var formulas = [];
    if (um.div !== 1) formulas.push('Dosis = ' + fmt(e.dosis) + ' μg ÷ 1000 = ' + fmt(mg) + ' mg');
    if (c1.linea) formulas.push(c1.linea);
    formulas.push('Volumen directo = dosis ÷ concentración = ' + fmt(mg) + ' mg ÷ ' + fmt(C1) + ' mg/ml = ' + fmt(vDirecto) + ' ml');

    var r = { ok: true, dosisMg: mg, c1MgMl: C1, vMin: vMin, vDirecto: vDirecto, avisos: [], formulas: formulas };
    if (vDirecto >= vMin * (1 - 1e-9)) {
      r.necesitaDilucion = false;
      formulas.push('El volumen directo (' + fmt(vDirecto) + ' ml) ya es igual o mayor que el mínimo medible (' + fmt(vMin) + ' ml): no hace falta diluir.');
      return r;
    }
    var nMin = vMin / vDirecto;
    var n = null;
    for (var i = 0; i < N_COMODOS.length; i++) { if (N_COMODOS[i] >= nMin * (1 - 1e-9)) { n = N_COMODOS[i]; break; } }
    if (n === null) {
      return { error: 'La dilución necesaria sería mayor que 1:' + N_COMODOS[N_COMODOS.length - 1] + ' (el volumen directo es de ' + fmt(vDirecto) + ' ml). Revisa la dosis, la unidad y la concentración del frasco.' };
    }
    var cDil = C1 / n;
    var volumen = vDirecto * n;
    var pasos = [];
    var a = n, b = null;
    if (n > 100) { a = n <= 1000 ? 10 : 100; b = n / a; }
    // Cada paso: se toma "vMin" ml del paso anterior (o del frasco) y se completa hasta "factor × vMin" ml.
    pasos.push({ n: a, mlTomar: vMin, mlDiluente: limpia(vMin * (a - 1)), mlTotal: limpia(vMin * a), concMgMl: limpia(C1 / a), de: 'frasco' });
    if (b !== null) pasos.push({ n: b, mlTomar: vMin, mlDiluente: limpia(vMin * (b - 1)), mlTotal: limpia(vMin * b), concMgMl: limpia(C1 / a / b), de: 'dilución anterior' });

    formulas.push('Dilución mínima = volumen mínimo medible ÷ volumen directo = ' + fmt(vMin) + ' ml ÷ ' + fmt(vDirecto) + ' ml = ' + fmt(nMin) + ' (1:' + fmt(nMin) + ')');
    formulas.push('Dilución sugerida (número cómodo igual o mayor) = 1:' + fmt(n));
    formulas.push('Concentración de la dilución = ' + fmt(C1) + ' mg/ml ÷ ' + fmt(n) + ' = ' + fmt(cDil) + ' mg/ml');
    formulas.push('Volumen a administrar = ' + fmt(mg) + ' mg ÷ ' + fmt(cDil) + ' mg/ml = ' + fmt(volumen) + ' ml');
    if (b === null) {
      formulas.push('Preparación = ' + fmt(vMin) + ' ml del frasco + ' + fmt(vMin * (n - 1)) + ' ml de diluyente = ' + fmt(vMin * n) + ' ml en total (' + fmt(vMin) + ' ml × ' + fmt(n) + ')');
    } else {
      formulas.push('Preparación en dos pasos (1:' + fmt(a) + ' y luego 1:' + fmt(b) + '; ' + fmt(a) + ' × ' + fmt(b) + ' = ' + fmt(n) + '): ' +
        'paso 1 = ' + fmt(vMin) + ' ml del frasco + ' + fmt(vMin * (a - 1)) + ' ml de diluyente; ' +
        'paso 2 = ' + fmt(vMin) + ' ml del paso 1 + ' + fmt(vMin * (b - 1)) + ' ml de diluyente = ' + fmt(vMin * b) + ' ml en total');
    }
    r.necesitaDilucion = true;
    r.nMin = nMin; r.n = n; r.cDilucion = cDil; r.volumenAdministrar = volumen; r.pasos = pasos;
    r.volumenPreparado = pasos[pasos.length - 1].mlTotal;
    if (b !== null) r.avisos.push({ codigo: 'dos-pasos', texto: 'La dilución es mayor que 1:100. Para no preparar un volumen enorme, hazla en dos pasos seguidos.' });
    return r;
  }

  /* ───── 3. CONVERSIONES ───── */
  function convertir(valor, de, a) {
    var ud = UNIDADES[de], ua = UNIDADES[a];
    if (!ud || !ua) return { error: 'Elige las dos unidades.' };
    if (ud.fam !== ua.fam) return { error: 'No se puede convertir ' + ud.etiqueta + ' a ' + ua.etiqueta + ': son magnitudes distintas (una es concentración y la otra cantidad).' };
    if (typeof valor !== 'number' || !isFinite(valor)) return { error: 'Escribe el valor que quieres convertir (un número, por ejemplo 2.5).' };
    if (valor < 0) return { error: 'El valor no puede ser negativo.' };
    var e = ud.exp - ua.exp, res, formula;
    if (e > 0) {
      res = valor * Math.pow(10, e);
      formula = fmt(valor) + ' ' + ud.etiqueta + ' × ' + fmt(Math.pow(10, e)) + ' = ' + fmt(limpia(res)) + ' ' + ua.etiqueta;
    } else if (e < 0) {
      res = valor / Math.pow(10, -e);
      formula = fmt(valor) + ' ' + ud.etiqueta + ' ÷ ' + fmt(Math.pow(10, -e)) + ' = ' + fmt(limpia(res)) + ' ' + ua.etiqueta;
    } else {
      res = valor;
      formula = fmt(valor) + ' ' + ud.etiqueta + ' × 1 = ' + fmt(res) + ' ' + ua.etiqueta + ' (son equivalentes)';
    }
    var factor = e >= 0 ? Math.pow(10, e) : 1 / Math.pow(10, -e);
    return { ok: true, valor: valor, de: de, a: a, resultado: limpia(res), factor: factor, formula: formula, texto: fmt(limpia(res)) + ' ' + ua.etiqueta, avisos: [] };
  }

  // 1:N como concentración: 1 g en N ml.
  function relacionAConc(n) {
    if (typeof n !== 'number' || !isFinite(n)) return { error: 'Escribe N de la relación 1:N (un número, por ejemplo 1000).' };
    if (n < 1) return { error: 'N debe ser 1 o mayor.' };
    if (n > 1e9) return { error: 'Revisa N: el valor parece demasiado alto.' };
    var mgMl = 1000 / n;
    return {
      ok: true, n: n, mgMl: mgMl, ugMl: mgMl * 1000, porcentaje: 100 / n,
      formula: '1:' + fmt(n) + ' = 1 g en ' + fmt(n) + ' ml = 1000 mg ÷ ' + fmt(n) + ' ml = ' + fmt(mgMl) + ' mg/ml (' + fmt(mgMl * 1000) + ' μg/ml; ' + fmt(100 / n) + ' %)'
    };
  }

  // Equivalencias de consulta rápida (se calculan con convertir para que coincidan siempre)
  function equivalencias() {
    return [['%', 'mg/ml'], ['mg/ml', 'ug/ml'], ['ppm', 'ug/ml'], ['ppm', 'mg/ml'], ['mg', 'ug'], ['g', 'mg']].map(function (p) {
      var r = convertir(1, p[0], p[1]);
      return { de: p[0], a: p[1], texto: '1 ' + UNIDADES[p[0]].etiqueta + ' = ' + fmt(r.resultado) + ' ' + UNIDADES[p[1]].etiqueta };
    });
  }

  /* ───── 4. DURACIÓN Y TASA ───── */
  // e: { volumen (ml), tasa (ml/h) } → horas
  function duracionInfusion(e) {
    e = e || {};
    var ev = errorNumero(e.volumen, 'el volumen de la bolsa o jeringa (ml)', VOLUMEN_MAX); if (ev) return { error: ev };
    var et = errorNumero(e.tasa, 'la tasa de infusión (ml/h)', VOLUMEN_MAX); if (et) return { error: et };
    var h = e.volumen / e.tasa;
    var r = {
      ok: true, volumen: e.volumen, tasaMlH: e.tasa, horas: h, texto: textoDuracion(h), gotas: gotasPorEquipo(e.tasa), avisos: [],
      formulas: ['Duración = volumen ÷ tasa = ' + fmt(e.volumen) + ' ml ÷ ' + fmt(e.tasa) + ' ml/h = ' + horasTexto(h)].concat(formulasGotas(e.tasa))
    };
    if (e.tasa < TASA_MIN_BOMBA) r.avisos.push(avisoTasaBaja(e.tasa, false));
    return r;
  }

  // e: { volumen (ml), tiempo, unidadTiempo ('h' | 'min') } → ml/h
  function tasaPorDuracion(e) {
    e = e || {};
    var ev = errorNumero(e.volumen, 'el volumen de la bolsa o jeringa (ml)', VOLUMEN_MAX); if (ev) return { error: ev };
    var unidad = e.unidadTiempo || 'h';
    if (unidad !== 'h' && unidad !== 'min') return { error: 'Elige la unidad de la duración (horas o minutos).' };
    var et = errorNumero(e.tiempo, 'la duración deseada', DURACION_MAX * 60); if (et) return { error: et };
    var formulas = [], horas = e.tiempo;
    if (unidad === 'min') {
      horas = e.tiempo / 60;
      formulas.push('Duración en horas = ' + fmt(e.tiempo) + ' min ÷ 60 = ' + fmt(horas) + ' h');
    }
    var tasa = e.volumen / horas;
    formulas.push('Tasa = volumen ÷ duración = ' + fmt(e.volumen) + ' ml ÷ ' + fmt(horas) + ' h = ' + fmt(tasa) + ' ml/h');
    var r = { ok: true, volumen: e.volumen, horas: horas, texto: textoDuracion(horas), tasaMlH: tasa, gotas: gotasPorEquipo(tasa), avisos: [], formulas: formulas.concat(formulasGotas(tasa)) };
    if (tasa < TASA_MIN_BOMBA) r.avisos.push(avisoTasaBaja(tasa, false));
    return r;
  }

  return {
    PESO_MIN: PESO_MIN, PESO_MAX: PESO_MAX, CONC_MAX: CONC_MAX, TASA_MIN_BOMBA: TASA_MIN_BOMBA, VOLUMEN_MIN_MEDIBLE: VOLUMEN_MIN_MEDIBLE,
    EQUIPOS: EQUIPOS, N_COMODOS: N_COMODOS, AVISO_GENERAL: AVISO_GENERAL,
    UNIDADES_DOSIS: UNIDADES_DOSIS, UNIDADES_CONC: UNIDADES_CONC, UNIDADES_MASA: UNIDADES_MASA, UNIDADES: UNIDADES,
    leerNumero: leerNumero, errorPeso: errorPeso, errorNumero: errorNumero, fmt: fmt, textoDuracion: textoDuracion, horasTexto: horasTexto, textoSegundos: textoSegundos, esc: esc,
    gotasPorEquipo: gotasPorEquipo,
    cri: cri, preparar: preparar, dilucion: dilucion, dilucionRelacion: dilucionRelacion, volumenPequeno: volumenPequeno,
    convertir: convertir, relacionAConc: relacionAConc, equivalencias: equivalencias,
    duracionInfusion: duracionInfusion, tasaPorDuracion: tasaPorDuracion
  };
});
