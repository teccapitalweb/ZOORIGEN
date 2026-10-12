/* ============================================================ */
/* CERTIFICADOS · Zoorigen                                       */
/*                                                                */
/* El certificado ya NO se crea en el navegador: lo emite el      */
/* servidor al terminar la última clase. Aquí solo hay lógica de  */
/* lectura, compartida por verificar.html, ver-certificado.html y */
/* "Mis certificados":                                            */
/*  - formato del folio (nuevo ZOO-AAAA-XXXXXXXX y anterior       */
/*    ZOO-AAAA-NNNNN)                                             */
/*  - consulta PÚBLICA GET /api/certificados/:folio (sin token)   */
/*  - datos listos para dibujar (fecha, duración, mensajes)       */
/* No necesita Firebase. Se prueba en Node:                       */
/*   tests/club-certificado.test.js                               */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_CERT = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BASE_POR_DEFECTO = 'https://zoorigen-webhook-production.up.railway.app';
  var URL_VERIFICAR = 'https://www.zoorigen.com/pages/verificar.html';
  var ESPERA_MS = 9000;
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  // Folio nuevo (lo emite el servidor): ZOO-2026-1A2B3C4D. Folio anterior (emitido por el navegador): ZOO-2026-12345.
  var FOLIO_NUEVO = /^ZOO-\d{4}-[0-9A-F]{8}$/;
  var FOLIO_ANTERIOR = /^ZOO-\d{4}-\d{5}$/;
  // Revisión mínima antes de preguntar al servidor (el servidor decide si de verdad existe).
  var FOLIO_PLAUSIBLE = /^[A-Z0-9][A-Z0-9-]{4,39}$/;

  function texto(v, max) {
    var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    return max ? s.slice(0, max) : s;
  }

  function normalizarFolio(v) {
    return String(v == null ? '' : v).replace(/\s+/g, '').toUpperCase().slice(0, 40);
  }
  // 'nuevo' | 'anterior' | null
  function tipoFolio(v) {
    var f = normalizarFolio(v);
    if (FOLIO_NUEVO.test(f)) return 'nuevo';
    if (FOLIO_ANTERIOR.test(f)) return 'anterior';
    return null;
  }
  function folioValido(v) { return tipoFolio(v) !== null; }
  function folioPlausible(v) { return FOLIO_PLAUSIBLE.test(normalizarFolio(v)); }

  function urlVerificacion(folio) { return URL_VERIFICAR + '?folio=' + encodeURIComponent(normalizarFolio(folio)); }

  /* ───────────────────────── Fecha y duración ───────────────────────── */

  function aFecha(v) {
    if (!v) return null;
    var d = typeof v.toDate === 'function' ? v.toDate() : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  // Día, mes y año en hora de México (así todos ven la misma fecha sin importar dónde abran el certificado).
  function partesFecha(d) {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d);
      var o = {};
      p.forEach(function (x) { o[x.type] = Number(x.value); });
      if (o.day && o.month && o.year) return { dia: o.day, mes: o.month, anio: o.year };
    } catch (e) { /* sin Intl: se usa UTC */ }
    return { dia: d.getUTCDate(), mes: d.getUTCMonth() + 1, anio: d.getUTCFullYear() };
  }

  // "12 de octubre de 2026"
  function fechaLarga(v) {
    var d = aFecha(v);
    if (!d) return '';
    var p = partesFecha(d);
    return p.dia + ' de ' + MESES[p.mes - 1] + ' de ' + p.anio;
  }
  // "12 oct 2026"
  function fechaCorta(v) {
    var d = aFecha(v);
    if (!d) return '';
    var p = partesFecha(d);
    return p.dia + ' ' + MESES_CORTOS[p.mes - 1] + ' ' + p.anio;
  }

  function clases(n) { return n + (n === 1 ? ' clase' : ' clases'); }

  /* ───────────────────────── Datos del certificado ───────────────────────── */

  // c: certificado tal como lo manda el servidor { folio, nombre, curso, area, horas, sesiones, instructor, emitido }
  function vistaCertificado(c) {
    var d = c && typeof c === 'object' ? c : {};
    var horas = Number(d.horas);
    var sesiones = Math.round(Number(d.sesiones));
    var horasTexto = '';
    if (isFinite(horas) && horas > 0) horasTexto = (Math.round(horas * 10) / 10) + (horas === 1 ? ' hora' : ' horas');
    else if (typeof d.horas === 'string' && texto(d.horas, 30) && !isFinite(horas)) horasTexto = texto(d.horas, 30);
    var nSesiones = isFinite(sesiones) && sesiones > 0 ? sesiones : 0;
    var fechaTexto = fechaLarga(d.emitido);
    return {
      folio: normalizarFolio(d.folio),
      nombre: texto(d.nombre, 120),
      curso: texto(d.curso, 200),
      area: texto(d.area, 80),
      horas: horasTexto,
      sesiones: nSesiones,
      sesionesTexto: nSesiones ? clases(nSesiones) : '',
      instructor: texto(d.instructor, 120),
      emitido: texto(d.emitido, 60),
      fechaTexto: fechaTexto,
      // "6 horas · 5 clases" para la ficha de verificación
      duracionTexto: [horasTexto, nSesiones ? clases(nSesiones) : ''].filter(Boolean).join(' · ')
    };
  }

  // Datos de la línea de detalle del certificado (área, clases, horas, instructor) en el orden en que se muestran.
  function lineaDetalle(vista) {
    var v = vista || {};
    var partes = [];
    if (v.area) partes.push(v.area);
    if (v.sesionesTexto) partes.push(v.sesionesTexto);
    if (v.horas) partes.push(v.horas);
    if (v.instructor) partes.push('Instructor: ' + v.instructor);
    partes.push('Modalidad en línea');
    return partes;
  }

  /* ───────────────────────── Mensajes ───────────────────────── */

  // estado: 'formato' | 'no-encontrado' | 'limite' | 'red' | 'error'
  var MENSAJES = {
    'formato': {
      titulo: 'Folio con formato no válido',
      detalle: 'Revisa que el folio esté escrito completo. Se ve así: ZOO-2026-1A2B3C4D.'
    },
    'no-encontrado': {
      titulo: 'Folio no encontrado',
      detalle: 'Este folio no corresponde a ningún certificado emitido por Zoorigen. Revisa que lo hayas escrito bien.'
    },
    'limite': {
      titulo: 'Demasiadas consultas',
      detalle: 'Hiciste muchas consultas seguidas. Espera un minuto e inténtalo de nuevo.'
    },
    'red': {
      titulo: 'Sin conexión con el servidor',
      detalle: 'No pudimos conectar con Zoorigen. Revisa tu internet e inténtalo de nuevo.'
    },
    'error': {
      titulo: 'No se pudo verificar',
      detalle: 'Ocurrió un problema al consultar el certificado. Inténtalo de nuevo en unos minutos.'
    },
    'falta-folio': {
      titulo: 'Falta el folio',
      detalle: 'El enlace no trae el número de folio del certificado.'
    }
  };

  function estadoDeStatus(status) {
    if (status === 400) return 'formato';
    if (status === 404) return 'no-encontrado';
    if (status === 429) return 'limite';
    if (status === 0) return 'red';
    return 'error';
  }
  function mensajeEstado(estado) { return MENSAJES[estado] || MENSAJES.error; }

  /* ───────────────────────── Consulta pública ───────────────────────── */

  function baseApi() {
    try {
      if (typeof WEBHOOK_SERVER_URL !== 'undefined' && WEBHOOK_SERVER_URL) return String(WEBHOOK_SERVER_URL).replace(/\/+$/, '');
    } catch (e) { /* sin constante global */ }
    return BASE_POR_DEFECTO;
  }

  // GET /api/certificados/:folio. No manda token (es pública). Nunca rechaza: devuelve
  //   { ok:true, certificado: vista, folio }
  //   { ok:false, estado, status, titulo, detalle, folio }
  // deps (opcional, para pruebas): { fetch, base, esperaMs }
  async function consultar(folioCrudo, deps) {
    var d = deps || {};
    var folio = normalizarFolio(folioCrudo);
    function fallo(estado, status) {
      var m = mensajeEstado(estado);
      return { ok: false, estado: estado, status: status, titulo: m.titulo, detalle: m.detalle, folio: folio };
    }
    if (!folio) return fallo('falta-folio', 0);
    if (!folioPlausible(folio)) return fallo('formato', 400);
    var f = d.fetch || (typeof fetch === 'function' ? function (u, o) { return fetch(u, o); } : null);
    if (!f) return fallo('red', 0);
    var base = (d.base ? String(d.base).replace(/\/+$/, '') : baseApi());
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var corte = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) { /* ya terminó */ } }, d.esperaMs || ESPERA_MS) : null;
    try {
      var res = await f(base + '/api/certificados/' + encodeURIComponent(folio), { method: 'GET', cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      var datos = null;
      try { datos = await res.json(); } catch (e) { datos = null; }
      if (!res.ok) return fallo(estadoDeStatus(res.status), res.status);
      if (!datos || datos.valido !== true || !datos.certificado || typeof datos.certificado !== 'object') return fallo('no-encontrado', 404);
      var vista = vistaCertificado(datos.certificado);
      if (!vista.folio) vista.folio = folio;
      return { ok: true, certificado: vista, folio: vista.folio };
    } catch (e) {
      return fallo('red', 0);
    } finally {
      if (corte) clearTimeout(corte);
    }
  }

  /* ───────────────────────── "Mis certificados" ───────────────────────── */

  // Un certificado del propio miembro (documento de Firestore). Los emitidos por el servidor traen
  // verificado === true; los anteriores a la validación del servidor se muestran "En validación".
  function estadoVerificacion(doc) {
    return doc && doc.verificado === true ? 'verificado' : 'en-validacion';
  }
  var ETIQUETAS_VERIFICACION = {
    'verificado': 'Verificado',
    'en-validacion': 'En validación'
  };
  var AYUDA_VERIFICACION = {
    'verificado': 'Emitido por Zoorigen al terminar tu curso.',
    'en-validacion': 'Este certificado es anterior a la validación automática. Lo estamos revisando; tu folio sigue guardado.'
  };

  // Lista que se muestra en "Mis certificados": uno por curso (si hay dos, gana el verificado y, si empatan, el más
  // reciente), del más nuevo al más antiguo.
  function propiosParaMostrar(docs) {
    var t = function (d) { var n = Date.parse(d && d.issuedAt); return isFinite(n) ? n : 0; };
    var mejor = function (a, b) {
      var va = estadoVerificacion(a) === 'verificado', vb = estadoVerificacion(b) === 'verificado';
      if (va !== vb) return va ? a : b;
      return t(a) >= t(b) ? a : b;
    };
    var por = {}, orden = [];
    (Array.isArray(docs) ? docs : []).forEach(function (d) {
      if (!d || typeof d !== 'object') return;
      var k = String(d.courseId || d.folio || '');
      if (!k) return;
      if (!Object.prototype.hasOwnProperty.call(por, k)) { por[k] = d; orden.push(k); } else por[k] = mejor(por[k], d);
    });
    return orden.map(function (k) { return por[k]; }).sort(function (a, b) { return t(b) - t(a); });
  }

  return {
    BASE_POR_DEFECTO: BASE_POR_DEFECTO, URL_VERIFICAR: URL_VERIFICAR, MENSAJES: MENSAJES,
    ETIQUETAS_VERIFICACION: ETIQUETAS_VERIFICACION, AYUDA_VERIFICACION: AYUDA_VERIFICACION,
    FOLIO_NUEVO: FOLIO_NUEVO, FOLIO_ANTERIOR: FOLIO_ANTERIOR,
    normalizarFolio: normalizarFolio, tipoFolio: tipoFolio, folioValido: folioValido, folioPlausible: folioPlausible,
    urlVerificacion: urlVerificacion,
    aFecha: aFecha, fechaLarga: fechaLarga, fechaCorta: fechaCorta,
    vistaCertificado: vistaCertificado, lineaDetalle: lineaDetalle,
    estadoDeStatus: estadoDeStatus, mensajeEstado: mensajeEstado,
    consultar: consultar, estadoVerificacion: estadoVerificacion, propiosParaMostrar: propiosParaMostrar
  };
});
