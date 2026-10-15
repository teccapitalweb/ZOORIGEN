/* ============================================================ */
/* REFERENCIA CLÍNICA · CÁLCULOS COMUNES (parte pura, en Node)   */
/* Lectura de números, formato, escape de texto y la            */
/* equivalencia de condición corporal (BCS). Es lo único que    */
/* usa la página de Referencia clínica (Constantes y BCS).      */
/* Dosis, anestesia, fluidos y urgencias se retiraron de la     */
/* interfaz el 15 de octubre de 2026 y viven, sin cargarse en   */
/* ninguna página, en herramientas-clinica-retirada.js.         */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_CALCULOS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PESO_MIN = 0.001;     // kg
  var PESO_MAX = 6000;      // kg (un elefante grande)
  var CONC_MAX = 10000;     // mg/ml

  /* ───── lectura y validación ───── */
  // Acepta "12.5" y "12,5". Devuelve NaN si no es un número.
  function leerNumero(texto) {
    var s = String(texto == null ? '' : texto).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '' || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }

  function errorPeso(p) {
    if (!Number.isFinite(p)) return 'Escribe el peso en kilogramos (por ejemplo 12.5).';
    if (p < PESO_MIN) return 'El peso debe ser mayor a 0 kg.';
    if (p > PESO_MAX) return 'El peso parece demasiado alto (máximo ' + PESO_MAX.toLocaleString('es-MX') + ' kg). Revisa que esté en kilogramos.';
    return '';
  }

  function errorConcentracion(c) {
    if (!Number.isFinite(c) || c <= 0) return 'Escribe la concentración del frasco en mg/ml (por ejemplo 100).';
    if (c > CONC_MAX) return 'La concentración parece demasiado alta. Revisa que esté en mg/ml.';
    return '';
  }

  /* ───── formato ───── */
  // Cantidad con los decimales justos: nunca "0.00" para algo que no es cero y sin ceros sobrantes (20 en vez de 20.0).
  function fmt(x) {
    if (!Number.isFinite(x)) return '—';
    var a = Math.abs(x), t;
    if (a === 0) return '0';
    if (a >= 1000) return x.toFixed(0);
    if (a >= 1) t = x.toFixed(a >= 10 ? 1 : 2);
    else if (a >= 0.1) t = x.toFixed(2);
    else if (a >= 0.01) t = x.toFixed(3);
    else if (a >= 0.001) t = x.toFixed(4);
    else return x.toExponential(1);
    return t.indexOf('.') >= 0 ? t.replace(/0+$/, '').replace(/\.$/, '') : t;
  }

  var ETIQUETA_GRUPO = { mamifero: 'Mamífero', ave: 'Ave', reptil: 'Reptil', pediatrico: 'Pediátrico / geriátrico', mamiferos: 'Mamíferos', aves: 'Aves', reptiles: 'Reptiles', perro: 'Perro', gato: 'Gato' };
  function etiquetaGrupo(g) { return ETIQUETA_GRUPO[g] || String(g || ''); }

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sinAcentos(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

  /* ───── BCS ─────
     Solo se muestra lo que respalda la fuente: cada punto por encima de 5 equivale a un 10 a 15% más de grasa corporal
     (Universidad de Guelph). La cifra "% de peso por punto" que había antes no tiene fuente y se retiró. */
  function bcs(puntaje) {
    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 9) return { error: 'Selecciona un BCS del 1 al 9.' };
    var sobre = puntaje - 5;
    return {
      ok: true, puntaje: puntaje, puntosSobre5: sobre,
      grasaExtraMin: sobre > 0 ? sobre * 10 : null,
      grasaExtraMax: sobre > 0 ? sobre * 15 : null
    };
  }

  return {
    PESO_MIN: PESO_MIN, PESO_MAX: PESO_MAX,
    leerNumero: leerNumero, errorPeso: errorPeso, errorConcentracion: errorConcentracion, fmt: fmt, etiquetaGrupo: etiquetaGrupo,
    esc: esc, sinAcentos: sinAcentos, bcs: bcs
  };
});
