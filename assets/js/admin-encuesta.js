/* ============================================================ */
/* PANEL ADMIN · ENCUESTA DE LA PORTADA                          */
/*                                                                */
/* Lee (con ZOORIGEN_CLUB.apiFetch, token de administrador):      */
/*   GET /api/admin/encuesta?limite=1000                          */
/*   GET /api/admin/chatbot/sin-respuesta?limite=200              */
/* y calcula: totales, perfiles, origen, fauna de interés,        */
/* urgencia, freno, tamaño, abandono por pregunta, leads          */
/* calientes con WhatsApp y consentimiento, y las preguntas que   */
/* la guía virtual no supo contestar (por frecuencia).            */
/*                                                                */
/* La agregación es pura y se prueba en Node:                     */
/*   tests/admin-encuesta.test.js                                 */
/* Las preguntas y sus etiquetas salen de encuesta-motor.js (una  */
/* sola fuente de verdad con la pantalla de la portada).          */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./encuesta-motor.js'), require('./admin-iconos.js'), require('./admin-filas.js'), require('./admin-panel.js'), require('./admin-graficas.js'));
  else root.ZOO_ADMIN_ENCUESTA = factory(root.ZOO_ENCUESTA, root.ZOO_ICONOS, root.ZOO_ADMIN_FILAS, root.ZOO_ADMIN_PANEL, root.ZOO_ADMIN_GRAFICAS);
})(typeof self !== 'undefined' ? self : this, function (motor, iconos, filas, panel, graficas) {
  'use strict';

  var F = filas;
  var P = panel;
  var G = graficas;
  var M = motor || { CLAVES: [], ETIQUETAS_PREGUNTA: {}, URGENTE: 'Lo antes posible', ultimaRespondida: function () { return null; }, esNumeroFalso: function () { return false; } };
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function texto(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 200); }
  function num(n) { return (Number(n) || 0).toLocaleString('es-MX'); }

  // ISO, Date, número (ms), {seconds} / {_seconds} o con toDate(): devuelve Date o null.
  function aFecha(v) {
    if (v == null || v === '') return null;
    var d = null;
    if (v instanceof Date) d = v;
    else if (typeof v === 'object' && typeof v.toDate === 'function') { try { d = v.toDate(); } catch (e) { d = null; } }
    else if (typeof v === 'object' && Number.isFinite(v.seconds)) d = new Date(v.seconds * 1000);
    else if (typeof v === 'object' && Number.isFinite(v._seconds)) d = new Date(v._seconds * 1000);
    else if (typeof v === 'string' || typeof v === 'number') d = new Date(v);
    return d && !isNaN(d.getTime()) ? d : null;
  }
  function formatoFecha(d) { return d ? d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear() : '-'; }

  /* ───────────────────────── Consolidar por sesión ───────────────────────── */

  // El servidor guarda `contacto` como cadena de dígitos y `avisoAceptado` / `avisoVersion` al nivel superior;
  // también se tolera la forma anterior { numero, avisoAceptado, avisoVersion }.
  // «••• ••• 5678»: solo los últimos cuatro dígitos
  function enmascarar(numero) {
    var d = String(numero == null ? '' : numero).replace(/\D/g, '');
    return d.length >= 8 ? '••• ••• ' + d.slice(-4) : '';
  }

  function contactoDe(d) {
    var c = d && d.contacto;
    var numero = '', aviso = d && d.avisoAceptado === true, version = texto(d && d.avisoVersion, 60);
    if (c && typeof c === 'object') {
      numero = String(c.numero == null ? '' : c.numero);
      if (c.avisoAceptado === true) aviso = true;
      if (!version) version = texto(c.avisoVersion, 60);
    } else if (c != null) {
      numero = String(c);
    }
    numero = numero.replace(/\D/g, '');
    if (numero.length < 8 || numero.length > 15) numero = '';
    return { numero: numero, avisoAceptado: aviso === true, avisoVersion: version };
  }

  // Una misma persona puede tener varias copias (parcial, completa, otra vuelta, una con WhatsApp). Por sesión se
  // conserva una sola: la completa gana a la parcial; entre iguales, la más reciente (y con más respuestas). El
  // WhatsApp y su aviso se conservan de la copia que los traiga.
  function consolidar(docs) {
    var grupos = {};
    var orden = [];
    (Array.isArray(docs) ? docs : []).forEach(function (d, i) {
      if (!d || typeof d !== 'object') return;
      var clave = texto(d.sessionId, 100) || ('sin-sesion-' + i);
      if (!grupos[clave]) { grupos[clave] = []; orden.push(clave); }
      grupos[clave].push(d);
    });
    var cantidad = function (d) { return d.respuestas && typeof d.respuestas === 'object' ? Object.keys(d.respuestas).length : 0; };
    var ms = function (d) { var f = aFecha(d.creado); return f ? f.getTime() : 0; };
    return orden.map(function (clave) {
      var g = grupos[clave];
      var elegida = g.reduce(function (a, d) {
        if ((d.completada === true) !== (a.completada === true)) return d.completada === true ? d : a;
        if (ms(d) !== ms(a)) return ms(d) > ms(a) ? d : a;
        return cantidad(d) > cantidad(a) ? d : a;
      });
      var conContacto = g.filter(function (d) { return contactoDe(d).numero || d.tieneContacto === true; }).sort(function (a, b) { return ms(b) - ms(a); })[0];
      var contacto = contactoDe(conContacto || elegida);
      // Respuestas: las de la elegida (si hay una copia completa distinta con más respuestas, ya la eligió).
      var respuestas = {};
      var origen = elegida.respuestas && typeof elegida.respuestas === 'object' ? elegida.respuestas : {};
      Object.keys(origen).forEach(function (k) { if (typeof origen[k] === 'string' && origen[k]) respuestas[k] = texto(origen[k], 80); });
      return {
        sessionId: clave,
        respuestas: respuestas,
        completada: elegida.completada === true,
        fecha: aFecha((conContacto || elegida).creado) || aFecha(elegida.creado),
        numero: contacto.numero,
        avisoAceptado: contacto.avisoAceptado,
        avisoVersion: contacto.avisoVersion,
        copias: g.length,
        ids: g.map(function (d) { return texto(d.id, 64); }).filter(Boolean),
        idContacto: conContacto ? texto(conContacto.id, 64) : '',
        tieneContacto: Boolean(contacto.numero) || g.some(function (d) { return d.tieneContacto === true; }),
        mascara: texto(g.map(function (d) { return d.contactoMascara; }).filter(Boolean)[0], 24) || enmascarar(contacto.numero),
        atendida: g.some(function (d) { return d.atendida === true; })
      };
    });
  }

  /* ───────────────────────── Agregación ───────────────────────── */

  function numeroDudoso(numero) {
    var n = String(numero || '').replace(/\D/g, '');
    if (n.length < 8 || n.length > 15) return true;
    if (n.indexOf('52') === 0) {
      // México: 52 + 10 dígitos (acepta 521 de los celulares antiguos); la lada no empieza en 0 ni en 1
      if (n.length === 13 && n.indexOf('521') === 0) n = '52' + n.slice(3);
      if (n.length !== 12) return true;
      var nacional = n.slice(2);
      return !/^[2-9]/.test(nacional) || M.esNumeroFalso(nacional);
    }
    return M.esNumeroFalso(n);
  }

  function distribucion(sesiones, clave) {
    var cuenta = {};
    var base = 0;
    sesiones.forEach(function (s) {
      var v = s.respuestas[clave];
      if (!v) return;
      base++;
      cuenta[v] = (cuenta[v] || 0) + 1;
    });
    var items = Object.keys(cuenta).map(function (v) { return { valor: v, n: cuenta[v], pct: base ? Math.round(cuenta[v] / base * 100) : 0 }; });
    items.sort(function (a, b) { return b.n - a.n || (a.valor < b.valor ? -1 : 1); });
    return { clave: clave, etiqueta: M.ETIQUETAS_PREGUNTA[clave] || clave, base: base, items: items };
  }

  // Valor más frecuente de una pregunta dentro de un grupo de sesiones → { valor, n } o null
  function masFrecuente(grupo, clave) {
    var cuenta = {}; var mejor = null;
    grupo.forEach(function (s) { var v = s.respuestas[clave]; if (v) cuenta[v] = (cuenta[v] || 0) + 1; });
    Object.keys(cuenta).forEach(function (v) { if (!mejor || cuenta[v] > mejor.n || (cuenta[v] === mejor.n && v < mejor.valor)) mejor = { valor: v, n: cuenta[v] }; });
    return mejor;
  }

  // Resumen por rama del flujo: cada perfil (primera pregunta) con cuántos empezaron, terminaron, pidieron contacto y dónde se quedan.
  function ramas(sesiones) {
    var mapa = {};
    sesiones.forEach(function (s) { var k = s.respuestas.p1 || 'Sin perfil'; (mapa[k] = mapa[k] || []).push(s); });
    return Object.keys(mapa).map(function (k) {
      var g = mapa[k];
      var completas = g.filter(function (s) { return s.completada; }).length;
      var abandonos = {}; var peor = null;
      g.filter(function (s) { return !s.completada; }).forEach(function (s) {
        var u = M.ultimaRespondida(s.respuestas);
        if (u) abandonos[u] = (abandonos[u] || 0) + 1;
      });
      Object.keys(abandonos).forEach(function (u) { if (!peor || abandonos[u] > peor.n) peor = { clave: u, etiqueta: M.ETIQUETAS_PREGUNTA[u] || u, n: abandonos[u] }; });
      return {
        perfil: k, total: g.length, completas: completas, pctCompletas: g.length ? Math.round(completas / g.length * 100) : 0,
        calientes: g.filter(function (s) { return s.respuestas.urgencia === M.URGENTE; }).length,
        conWhatsapp: g.filter(function (s) { return s.numero || s.tieneContacto; }).length,
        abandono: peor, reto: masFrecuente(g, 'p2'), origen: masFrecuente(g, 'origen'), urgencia: masFrecuente(g, 'urgencia')
      };
    }).sort(function (a, b) { return b.total - a.total || (a.perfil < b.perfil ? -1 : 1); });
  }

  // Una fila por persona para la tabla de respuestas y el CSV. Solo datos mínimos: el WhatsApp va enmascarado.
  function filasRespuestas(sesiones) {
    return sesiones.map(function (s) {
      var r = s.respuestas;
      return {
        sessionId: s.sessionId, fecha: s.fecha, perfil: r.p1 || '', grupo: r.grupo || '', reto: r.p2 || '', urgencia: r.urgencia || '', origen: r.origen || '',
        completada: s.completada, tieneContacto: Boolean(s.numero || s.tieneContacto), mascara: s.mascara || enmascarar(s.numero),
        avisoAceptado: s.avisoAceptado === true, atendida: s.atendida === true, ids: s.ids || [], idContacto: s.idContacto || '', respuestas: r
      };
    }).sort(function (a, b) { return (b.fecha ? b.fecha.getTime() : 0) - (a.fecha ? a.fecha.getTime() : 0); });
  }

  var FILTROS_RESPUESTAS = [
    { id: 'todas', texto: 'Todas', pasa: function () { return true; } },
    { id: 'completas', texto: 'Terminaron', pasa: function (f) { return f.completada; } },
    { id: 'incompletas', texto: 'No terminaron', pasa: function (f) { return !f.completada; } },
    { id: 'whatsapp', texto: 'Dejaron WhatsApp', pasa: function (f) { return f.tieneContacto; } },
    { id: 'por-atender', texto: 'Por atender', pasa: function (f) { return f.tieneContacto && !f.atendida; } },
    { id: 'atendidas', texto: 'Atendidas', pasa: function (f) { return f.atendida; } }
  ];
  function filtrarRespuestas(filas, id) {
    var f = FILTROS_RESPUESTAS.filter(function (x) { return x.id === id; })[0] || FILTROS_RESPUESTAS[0];
    return filas.filter(f.pasa);
  }

  // CSV con comillas escapadas y protección contra fórmulas de hoja de cálculo (=, +, -, @).
  function celdaCsv(v) {
    var t = String(v == null ? '' : v).replace(/\r?\n/g, ' ');
    if (/^[=+\-@\t]/.test(t)) t = "'" + t;
    return /[",;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  function fechaIso(d) { return d ? d.toISOString().slice(0, 10) : ''; }
  function csvRespuestas(filas) {
    var cab = ['Fecha', 'Perfil', 'Fauna de interés', 'Reto principal', 'Cuándo quiere empezar', 'Cómo nos conoció', 'Terminó la encuesta', 'WhatsApp (enmascarado)', 'Aceptó el aviso de privacidad', 'Atendida'];
    var lineas = filas.map(function (f) {
      return [fechaIso(f.fecha), f.perfil, f.grupo, f.reto, f.urgencia, f.origen, f.completada ? 'Sí' : 'No', f.tieneContacto ? f.mascara : '', f.tieneContacto ? (f.avisoAceptado ? 'Sí' : 'No') : '', f.tieneContacto ? (f.atendida ? 'Sí' : 'No') : '']
        .map(celdaCsv).join(',');
    });
    return [cab.map(celdaCsv).join(',')].concat(lineas).join('\r\n');
  }
  function csvPreguntas(items) {
    var cab = ['Pregunta', 'Tipo', 'Veces', 'Última vez', 'Atendida'];
    return [cab.map(celdaCsv).join(',')].concat(items.map(function (p) {
      return [p.texto, p.tipo === 'animal' ? 'Animal' : 'Otra', p.veces, fechaIso(p.ultimaVez), p.atendida ? 'Sí' : 'No'].map(celdaCsv).join(',');
    })).join('\r\n');
  }

  function calcular(docs) {
    var sesiones = consolidar(docs);
    var total = sesiones.length;
    var completas = sesiones.filter(function (s) { return s.completada; }).length;
    var claves = M.CLAVES.length ? M.CLAVES : [];
    var dist = {};
    claves.forEach(function (k) { dist[k] = distribucion(sesiones, k); });

    // Abandono: de quienes NO terminaron, en qué pregunta se quedaron (la última que contestaron).
    var abandono = claves.map(function (k) {
      var respondieron = sesiones.filter(function (s) { return s.respuestas[k]; }).length;
      var n = sesiones.filter(function (s) { return !s.completada && M.ultimaRespondida(s.respuestas) === k; }).length;
      return { clave: k, etiqueta: M.ETIQUETAS_PREGUNTA[k] || k, n: n, respondieron: respondieron, pct: respondieron ? Math.round(n / respondieron * 100) : 0 };
    });
    var sinRespuestas = sesiones.filter(function (s) { return !s.completada && M.ultimaRespondida(s.respuestas) === null; }).length;

    // Retos por perfil (p1 + p2), de mayor a menor.
    var retosMapa = {};
    sesiones.forEach(function (s) {
      if (!s.respuestas.p1 || !s.respuestas.p2) return;
      var k = s.respuestas.p1 + '\u0000' + s.respuestas.p2;
      retosMapa[k] = (retosMapa[k] || 0) + 1;
    });
    var retos = Object.keys(retosMapa).map(function (k) { var p = k.split('\u0000'); return { perfil: p[0], reto: p[1], n: retosMapa[k] }; })
      .sort(function (a, b) { return b.n - a.n || (a.perfil + a.reto < b.perfil + b.reto ? -1 : 1); }).slice(0, 12);

    var porPerfil = {};
    sesiones.forEach(function (s) {
      if (!s.respuestas.p1 || !s.respuestas.p2) return;
      var g = porPerfil[s.respuestas.p1] = porPerfil[s.respuestas.p1] || {};
      g[s.respuestas.p2] = (g[s.respuestas.p2] || 0) + 1;
    });
    var retosPorPerfil = Object.keys(porPerfil).map(function (p) {
      var retosP = Object.keys(porPerfil[p]).map(function (k) { return { reto: k, n: porPerfil[p][k] }; }).sort(function (a, b) { return b.n - a.n || (a.reto < b.reto ? -1 : 1); });
      return { perfil: p, total: retosP.reduce(function (t, x) { return t + x.n; }, 0), retos: retosP };
    }).sort(function (a, b) { return b.total - a.total || (a.perfil < b.perfil ? -1 : 1); });

    var leads = sesiones.filter(function (s) { return s.numero || s.tieneContacto; }).map(function (s) {
      var caliente = s.respuestas.urgencia === M.URGENTE;
      return {
        sessionId: s.sessionId, numero: s.numero, wa: s.numero ? 'https://wa.me/' + s.numero : '', mascara: s.mascara || enmascarar(s.numero),
        idContacto: s.idContacto, ids: s.ids, atendida: s.atendida,
        urgencia: s.respuestas.urgencia || '', caliente: caliente,
        perfil: s.respuestas.p1 || '', grupo: s.respuestas.grupo || '', completada: s.completada,
        fecha: s.fecha, avisoAceptado: s.avisoAceptado, avisoVersion: s.avisoVersion, dudoso: s.numero ? numeroDudoso(s.numero) : false
      };
    }).sort(function (a, b) {
      if (a.caliente !== b.caliente) return a.caliente ? -1 : 1;
      return (b.fecha ? b.fecha.getTime() : 0) - (a.fecha ? a.fecha.getTime() : 0);
    });

    var calientes = sesiones.filter(function (s) { return s.respuestas.urgencia === M.URGENTE; });
    return {
      total: total, completas: completas, parciales: total - completas,
      pctCompletas: total ? Math.round(completas / total * 100) : 0,
      conWhatsapp: leads.length,
      calientes: calientes.length,
      calientesConWhatsapp: calientes.filter(function (s) { return s.numero || s.tieneContacto; }).length,
      conAviso: leads.filter(function (l) { return l.avisoAceptado; }).length,
      porAtender: leads.filter(function (l) { return !l.atendida; }).length,
      sesiones: sesiones, ramas: ramas(sesiones), filas: filasRespuestas(sesiones),
      distribuciones: dist, abandono: abandono, sinRespuestas: sinRespuestas, retos: retos, retosPorPerfil: retosPorPerfil, leads: leads
    };
  }

  // Preguntas que la guía no supo contestar, de la más frecuente a la menos.
  function calcularPreguntas(lista) {
    var items = (Array.isArray(lista) ? lista : []).filter(function (p) { return p && typeof p === 'object' && texto(p.texto || p.ejemplo, 200); })
      .map(function (p) {
        var veces = Math.floor(Number(p.veces));
        return {
          texto: texto(p.texto || p.ejemplo, 200),
          veces: Number.isFinite(veces) && veces > 0 ? veces : 1,
          ultimaVez: aFecha(p.ultimaVez),
          tipo: p.tipo === 'animal' ? 'animal' : 'otro',
          clave: texto(p.clave, 90),
          atendida: p.atendida === true
        };
      });
    items.sort(function (a, b) {
      return b.veces - a.veces || (b.ultimaVez ? b.ultimaVez.getTime() : 0) - (a.ultimaVez ? a.ultimaVez.getTime() : 0);
    });
    return { items: items, totalVeces: items.reduce(function (s, p) { return s + p.veces; }, 0) };
  }

  /* ───────────────────────── Carga ───────────────────────── */

  function mensajeError(e) {
    var st = e && e.status;
    if (st === 401 || st === 403) return 'Tu cuenta no tiene permiso de administrador para ver estos datos.';
    if (st === 404) return 'El servidor todavía no tiene esta ruta. Publica la rama webhook-chatbot del servidor y vuelve a intentar.';
    if (st === 429) return 'Demasiadas consultas seguidas. Espera un minuto y vuelve a intentar.';
    return (e && e.message) ? String(e.message) : 'No se pudieron cargar los datos.';
  }

  // apiFetch(ruta, opciones) -> Promise<json>. Cada mitad falla por separado.
  function cargar(apiFetch, opciones) {
    var o = opciones || {};
    var l1 = Number(o.limiteEncuesta) > 0 ? Math.min(2000, Math.floor(o.limiteEncuesta)) : 1000;
    var l2 = Number(o.limitePreguntas) > 0 ? Math.min(500, Math.floor(o.limitePreguntas)) : 200;
    // Con detalle:true se piden primero las rutas nuevas (con id y marca de atendida); si el servidor aún no las tiene (404)
    // se usan las anteriores y la pantalla oculta las acciones.
    var pedir = function (rutaNueva, rutaVieja) {
      if (!o.detalle) return Promise.resolve().then(function () { return apiFetch(rutaVieja); }).then(function (r) { return { r: r, detalle: false }; });
      return Promise.resolve().then(function () { return apiFetch(rutaNueva); }).then(function (r) { return { r: r, detalle: true }; }, function (e) {
        if (e && e.status === 404) return Promise.resolve().then(function () { return apiFetch(rutaVieja); }).then(function (r) { return { r: r, detalle: false }; });
        throw e;
      });
    };
    var a = pedir('/api/admin/encuesta/detalle?limite=' + l1, '/api/admin/encuesta?limite=' + l1)
      .then(function (x) { return { ok: true, detalle: x.detalle, docs: x.r && Array.isArray(x.r.docs) ? x.r.docs : [] }; }, function (e) { return { ok: false, error: mensajeError(e) }; });
    var b = pedir('/api/admin/chatbot/sin-respuesta/detalle?limite=' + l2, '/api/admin/chatbot/sin-respuesta?limite=' + l2)
      .then(function (x) { return { ok: true, detalle: x.detalle, preguntas: x.r && Array.isArray(x.r.preguntas) ? x.r.preguntas : [] }; }, function (e) { return { ok: false, error: mensajeError(e) }; });
    return Promise.all([a, b]).then(function (par) { return { encuesta: par[0], preguntas: par[1] }; });
  }

  /* ───────────────────────── HTML ───────────────────────── */

  var ICONOS = {
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'
  };
  function ico(n, tam) {
    var s = tam || 16;
    if (iconos && iconos.existe && iconos.existe(n)) return iconos.svg(n, { size: s });
    return '<svg class="zi" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONOS[n] || '') + '</svg>';
  }

  function kpisHTML(r) {
    var k = function (icono, tono, rotulo, valor, nota) {
      return '<article class="ap-kpi ap-tono-' + tono + '"><span class="ap-kpi__ico">' + ico(icono, 20) + '</span><div class="ap-kpi__txt"><p class="ap-kpi__rot">' + esc(rotulo) + '</p>' +
        '<p class="ap-kpi__val">' + esc(valor) + '</p><p class="ap-kpi__nota">' + nota + '</p></div></article>';
    };
    return '<div class="ap-kpis">' +
      k('users', 'info', 'Personas que respondieron', num(r.total), 'Una por visitante, incluye completas y a medias') +
      k('circle-check', 'ok', 'Terminaron la encuesta', num(r.completas), r.total ? '<strong>' + r.pctCompletas + ' %</strong> de quienes empezaron' : 'Aún sin respuestas') +
      k('flame', 'aviso', 'Leads calientes', num(r.calientes), 'Quieren empezar lo antes posible · ' + num(r.calientesConWhatsapp) + ' dejaron WhatsApp') +
      k('message-circle', 'neutro', 'Dejaron su WhatsApp', num(r.conWhatsapp), num(r.conAviso) + ' aceptaron el aviso de privacidad · ' + num(r.porAtender) + ' por atender') +
      '</div>';
  }

  /* ───────────────────────── Las 11 gráficas ─────────────────────────
     Cada una vive en su tarjeta, con la base (cuántas personas contestaron esa pregunta) y una frase «Cómo leerlo» armada con los datos
     de esa misma gráfica. Si no hay datos, cada gráfica muestra su estado vacío (o uno solo si nadie ha respondido). */
  var CORTAS = {
    'Aprender desde cero sobre fauna silvestre': 'Aprender desde cero', 'Especializarme en mi profesión': 'Especializarme',
    'Cumplir trámites y normatividad': 'Cumplir trámites', 'Certificarme y destacar en mi currículum': 'Certificarme'
  };
  function persona(n) { return num(n) + (n === 1 ? ' persona' : ' personas'); }
  function ord(dist, clave) {
    // En el orden en que se ofrecen las opciones de la encuesta (las que no se reconocen, al final)
    var q = M.COMUNES && M.COMUNES[clave];
    var opciones = q && q.opts ? q.opts : [];
    return dist.items.slice().sort(function (a, b) {
      var ia = opciones.indexOf(a.valor); var ib = opciones.indexOf(b.valor);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || b.n - a.n;
    });
  }

  // «Lo más común es «X»: 4 personas de 9 (44 %). Le sigue «Y» con 33 %.» (con empate y con una sola respuesta)
  function nombres(lista) {
    var n = lista.map(function (x) { return '«' + x.valor + '»'; });
    return n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0];
  }
  function fraseTop(dist, inicio) {
    if (!dist || !dist.items.length) return '';
    var a = dist.items[0]; var b = dist.items[1];
    if (!b) return (inicio || 'Lo más común es') + ' «' + a.valor + '»: ' + persona(a.n) + ' (' + a.pct + ' %).';
    if (a.n === b.n) {
      var empatadas = dist.items.filter(function (x) { return x.n === a.n; });
      return 'Hay empate entre ' + nombres(empatadas) + ': ' + persona(a.n) + ' cada una (' + a.pct + ' %).';
    }
    return (inicio || 'Lo más común es') + ' «' + a.valor + '»: ' + persona(a.n) + ' de ' + num(dist.base) + ' (' + a.pct + ' %). Le sigue «' + b.valor + '» con ' + b.pct + ' %.';
  }
  function fraseDeCada10(dist) {
    if (!dist || !dist.items.length || !dist.base) return '';
    var a = dist.items[0];
    var k = a.n / dist.base * 10;
    var texto = k < 1 ? 'menos de 1' : String(Math.round(k));
    var empatadas = dist.items.filter(function (x) { return x.n === a.n; });
    if (empatadas.length > 1) return 'Hay empate entre ' + nombres(empatadas) + ': ' + persona(a.n) + ' cada una (' + a.pct + ' %), más o menos ' + texto + ' de cada 10.';
    return 'De cada 10 personas que contestaron, ' + texto + ' ' + (texto === '1' ? 'es' : 'son') + ' «' + a.valor + '».' + (dist.items[1] ? ' Después sigue «' + dist.items[1].valor + '» (' + dist.items[1].pct + ' %).' : '');
  }

  function tarjetaGrafica(titulo, dist, nota, cuerpo, frase, ancho) {
    var base = dist && dist.base ? 'Base: ' + persona(dist.base) + ' que contestaron esta pregunta.' : '';
    return '<section class="ap-card enc-g' + (ancho ? ' enc-g--ancho' : '') + '"><header class="ap-card__cab"><h2>' + esc(titulo) + '</h2>' +
      ((nota || base) ? '<p>' + esc([nota, base].filter(Boolean).join(' ')) + '</p>' : '') + '</header><div class="ap-card__cuerpo">' + cuerpo +
      (frase ? '<p class="enc-g__frase" role="note"><strong>Cómo leerlo:</strong> ' + esc(frase) + '</p>' : '') + '</div></section>';
  }
  var VACIO_PREGUNTA = { titulo: 'Aún no hay respuestas', texto: 'Cuando alguien conteste esta pregunta en la portada, aparecerá aquí.' };

  function graficaDona(titulo, dist, nota) {
    var cuerpo = G.anillo({
      titulo: titulo, centro: { valor: num(dist.base), rotulo: dist.base === 1 ? 'persona' : 'personas' },
      partes: dist.items.map(function (it, i) { return { etiqueta: it.valor, valor: it.n, color: i + 1 }; }), vacio: VACIO_PREGUNTA
    });
    return tarjetaGrafica(titulo, dist, nota, cuerpo, fraseDeCada10(dist));
  }
  function graficaBarrasH(titulo, dist, nota, frase) {
    var cuerpo = G.barrasH({ titulo: titulo, filas: dist.items.map(function (it) { return { etiqueta: it.valor, valor: it.n }; }), total: dist.base, vacio: VACIO_PREGUNTA });
    return tarjetaGrafica(titulo, dist, nota, cuerpo, frase || fraseTop(dist));
  }
  function graficaColumnas(titulo, dist, clave, nota, frase) {
    var items = ord(dist, clave);
    var cuerpo = G.serie({
      titulo: titulo, tipo: 'barras', unidad: 'personas', alto: 210,
      etiquetas: items.map(function (it) { return CORTAS[it.valor] || it.valor; }), titulos: items.map(function (it) { return it.valor; }),
      series: [{ nombre: 'Personas', valores: items.map(function (it) { return it.n; }), color: 1 }], vacio: VACIO_PREGUNTA
    });
    return tarjetaGrafica(titulo, dist, nota, cuerpo, frase || fraseTop(dist));
  }

  function graficaRetos(r) {
    var datos = r.retosPorPerfil || [];
    var cuerpo = G.apiladas({
      titulo: 'Reto principal por perfil', unidad: 'personas',
      filas: datos.map(function (p) { return { etiqueta: p.perfil, segmentos: p.retos.map(function (x) { return { etiqueta: x.reto, valor: x.n }; }) }; }),
      vacio: { titulo: 'Aún no hay retos elegidos', texto: 'Aquí verás, por perfil, qué reto eligen más las personas.' }
    });
    var f = '';
    if (datos.length) {
      var p = datos[0]; var top = p.retos[0];
      f = 'Cada barra es un perfil y se reparte entre los retos que ese perfil puede elegir. Entre «' + p.perfil + '» (el perfil con más respuestas, ' + persona(p.total) + '), ' + (p.retos[1] && p.retos[1].n === top.n ? 'hay empate entre los retos más elegidos: ' + top.n + ' de ' + p.total + ' cada uno.' : 'el reto más elegido es «' + top.reto + '» con ' + top.n + ' de ' + p.total + '.');
    }
    var base = datos.reduce(function (t, x) { return t + x.total; }, 0);
    return tarjetaGrafica('Reto principal por perfil', { base: base }, 'Cada perfil tiene sus propios retos, por eso cada barra tiene partes distintas.', cuerpo, f, true);
  }

  function graficaAbandono(r) {
    var pasos = r.abandono.filter(function (a) { return a.n > 0; });
    var cuerpo = G.barrasH({
      titulo: 'Dónde se quedan quienes no terminan', porcentaje: false, color: 4, total: r.parciales || 1,
      filas: pasos.map(function (a) { return { etiqueta: a.etiqueta, valor: a.n, nota: 'Se fueron aquí: ' + num(a.n) + ' de ' + num(a.respondieron) + ' que la contestaron (' + a.pct + ' %)' }; }),
      vacio: { titulo: r.total ? 'Nadie ha abandonado' : 'Aún no hay respuestas', texto: r.total ? 'Todas las personas que empezaron la encuesta la terminaron.' : 'Cuando alguien empiece la encuesta, verás en qué pregunta se detiene.' }
    });
    var encabezado = r.total ? '<p class="enc-g__cifra"><strong>' + num(r.completas) + ' de ' + num(r.total) + '</strong> terminaron la encuesta (' + r.pctCompletas + ' %). ' + (r.parciales ? 'Las otras ' + num(r.parciales) + ' se fueron en estos pasos, en el orden de la encuesta:' : '') + '</p>' : '';
    var peor = pasos.slice().sort(function (a, b) { return b.n - a.n; })[0];
    var f = peor ? 'La encuesta se pierde más en «' + peor.etiqueta + '»: ' + persona(peor.n) + ' se fueron ahí (' + peor.pct + ' % de quienes llegaron a esa pregunta). El porcentaje de cada fila es sobre quienes contestaron ese paso.' : '';
    return tarjetaGrafica('Dónde se quedan quienes no terminan', null, 'Última pregunta que contestaron antes de irse.', encabezado + cuerpo + (r.sinRespuestas ? '<p class="ap-nota">' + persona(r.sinRespuestas) + ' abrieron la encuesta y no contestaron nada, por eso no aparecen en ningún paso.</p>' : ''), f, true);
  }

  function graficasHTML(r) {
    if (!r.total) {
      return '<div class="zs-vacio ap-vacio enc-g__vacio">' + ico('list-checks', 28) + '<strong>Todavía nadie responde la encuesta</strong>' +
        '<span>Cuando alguien conteste en la portada, aquí verás de golpe quiénes son, cómo llegaron y qué los detiene: 11 gráficas con una frase que explica cada una.</span></div>';
    }
    var D = r.distribuciones;
    var urgentes = D.urgencia.items.filter(function (it) { return it.valor === M.URGENTE; })[0];
    var fraseUrgencia = fraseTop(D.urgencia) + (urgentes ? ' Quienes quieren empezar lo antes posible (' + persona(urgentes.n) + ') son los contactos más calientes.' : '');
    var listos = D.freno.items.filter(function (it) { return it.valor === 'Nada, listo'; })[0];
    var fraseFreno = fraseTop(D.freno, 'Lo que más los detiene es') + (listos && D.freno.items[0].valor !== listos.valor ? ' ' + listos.pct + ' % dice que no lo detiene nada.' : '');
    return '<div class="enc-graficas">' +
      graficaDona('Perfil de quién responde', D.p1, 'Qué tipo de persona es.') +
      graficaBarrasH('Cómo nos conocieron', D.origen, 'De la más a la menos frecuente.', fraseTop(D.origen, 'La mayoría nos conoció por')) +
      graficaColumnas('Qué quieren lograr este año', D.meta, 'meta', 'Cada columna es una meta.', fraseTop(D.meta, 'Lo que más buscan es')) +
      graficaBarrasH('Fauna que les interesa', D.grupo, 'Del grupo de fauna que más interesa al que menos.', fraseTop(D.grupo, 'Lo que más les interesa es')) +
      graficaColumnas('Cuándo quieren empezar', D.urgencia, 'urgencia', 'Del más urgente al más tranquilo.', fraseUrgencia) +
      graficaBarrasH('Qué los detiene hoy', D.freno, 'Lo que frena a la persona para empezar.', fraseFreno) +
      graficaDona('Tamaño del equipo', D.tamano, 'Solo se pregunta a personal de UMA o zoológico y a consultores.') +
      graficaDona('Experiencia con cursos en línea', D.experiencia, 'Si ya estudió en línea.') +
      graficaRetos(r) + graficaAbandono(r) + ramasHTML(r) + '</div>';
  }

  // Estado de la pantalla (filtros y cuántas filas se ven). Vive en el módulo: sobrevive a recargar los datos.
  var UI = { filtro: 'todas', visibles: 25, ocultarAtendidas: false };

  function botonAcc(accion, atributos, icono, texto, clase) {
    return '<button type="button" class="ap-btn ap-btn--chico ap-btn--' + (clase || 'suave') + '" data-enc="' + accion + '" ' + atributos + '>' + ico(icono, 16) + texto + '</button>';
  }

  function tile(icono, tono) { return '<span class="ap-ico-tile ap-tono-' + tono + '" aria-hidden="true">' + ico(icono, 18) + '</span>'; }

  function leadsHTML(r, detalle) {
    if (!r.leads.length) {
      return '<section class="enc-panel enc-panel--ancho"><h3>Personas que pidieron que un asesor las escriba</h3><p class="enc-vacio">Nadie ha dejado su WhatsApp todavía.</p></section>';
    }
    var filas = r.leads.map(function (l) {
      var chips = [];
      if (l.caliente) chips.push('<span class="enc-chip enc-chip--caliente">' + ico('flame', 13) + 'Lo antes posible</span>');
      else if (l.urgencia) chips.push('<span class="enc-chip">' + esc(l.urgencia) + '</span>');
      if (l.dudoso) chips.push('<span class="enc-chip enc-chip--aviso" title="No parece un WhatsApp válido: revísalo antes de escribir">Número dudoso</span>');
      chips.push(l.avisoAceptado
        ? '<span class="enc-chip enc-chip--ok" title="' + esc(l.avisoVersion ? 'Versión: ' + l.avisoVersion : 'Sin versión registrada') + '">' + ico('check', 13) + 'Aviso aceptado</span>'
        : '<span class="enc-chip enc-chip--aviso">Sin constancia del aviso</span>');
      if (l.atendida) chips.push('<span class="enc-chip enc-chip--ok">' + ico('check', 13) + 'Atendida</span>');
      var perfil = [l.perfil, l.grupo].filter(Boolean).join(' · ');
      // El número completo no está en la pantalla: se pide al servidor solo cuando se quiere escribir (queda anotado)
      var puedeWa = detalle && l.idContacto;
      var ids = (l.ids || []).join(',');
      var acc = [];
      if (puedeWa) acc.push({ t: 'Escribir por WhatsApp', i: 'message-circle', d: { enc: 'wa', id: l.idContacto } });
      else if (l.wa) acc.push({ t: 'Escribir por WhatsApp', i: 'message-circle', h: l.wa });
      if (detalle && ids) acc.push({ t: l.atendida ? 'Quitar marca de atendida' : 'Marcar atendida', i: l.atendida ? 'rotate-ccw' : 'check-check', d: { enc: 'atender', atendida: l.atendida ? '0' : '1' } });
      return F.fila({
        clase: 'ap-fc--lead' + (l.atendida ? ' ap-fc--atenuada' : ''),
        avatar: tile(l.caliente ? 'flame' : 'message-circle', l.caliente ? 'aviso' : 'ok'),
        titulo: l.mascara || 'Sin número',
        accion: puedeWa ? { attr: 'enc', a: 'wa', datos: { id: l.idContacto } } : (l.wa ? { h: l.wa } : null),
        meta: esc(perfil || 'Sin perfil') + (l.completada ? '' : ' (encuesta incompleta)'),
        cols: [{ html: '<span class="ap-fc__v">' + esc(formatoFecha(l.fecha)) + '</span>' }],
        estado: chips.join(''), reservarFin: true,
        acciones: acc, etiquetaMenu: 'Acciones de ' + (l.mascara || 'esta persona'), datos: { ids: ids }
      });
    });
    return '<section class="enc-panel enc-panel--ancho"><h3>Personas que pidieron que un asesor las escriba</h3>' +
      '<p class="enc-nota">Los calientes (quieren empezar lo antes posible) van primero. Escríbeles solo si aceptaron el aviso de privacidad. ' +
      (detalle ? 'El número se muestra oculto; al pulsarlo se abre WhatsApp y la consulta queda anotada.' : '') + '</p>' +
      F.lista(filas, { etiqueta: 'Personas que pidieron contacto' }) + '</section>';
  }

  function ramasHTML(r) {
    var datos = r.ramas || [];
    var cuerpo;
    if (!datos.length) {
      cuerpo = '<div class="zs-vacio ap-vacio">' + ico('list-checks', 28) + '<strong>Aún no hay ramas</strong><span>Cuando alguien elija su perfil en la portada aparecerá aquí su rama.</span></div>';
    } else {
      var mayor = datos.reduce(function (m, x) { return Math.max(m, x.total); }, 1);
      var d = function (x) { return x ? esc(x.valor) + ' <small>(' + num(x.n) + ')</small>' : '<span class="ap-sub">—</span>'; };
      cuerpo = '<div class="ap-tabla-zona"><div class="ap-tabla-envoltura"><table class="ap-tabla ap-tabla--simple ap-tabla--ramas"><thead><tr><th scope="col">Perfil (rama)</th><th scope="col">Empezaron</th><th scope="col">Terminaron</th>' +
        '<th scope="col" class="ap-num-der ap-col-3">Calientes</th><th scope="col" class="ap-num-der ap-col-3">Dejaron WhatsApp</th><th scope="col" class="ap-col-2">Reto más frecuente</th><th scope="col" class="ap-col-2">Dónde se quedan</th></tr></thead><tbody>' +
        datos.map(function (x) {
          return '<tr><td data-label="Perfil"><strong>' + esc(x.perfil) + '</strong></td>' +
            '<td data-label="Empezaron"><div class="ap-mini"><span class="ap-mini__b" aria-hidden="true"><i style="width:' + Math.max(3, Math.round(x.total / mayor * 100)) + '%"></i></span><span class="ap-mini__n">' + num(x.total) + '</span></div></td>' +
            '<td data-label="Terminaron"><div class="ap-mini"><span class="ap-mini__b ap-mini__b--ok" aria-hidden="true"><i style="width:' + x.pctCompletas + '%"></i></span><span class="ap-mini__n">' + num(x.completas) + ' <small>(' + x.pctCompletas + ' %)</small></span></div></td>' +
            '<td class="ap-num-der ap-col-3" data-label="Calientes">' + num(x.calientes) + '</td>' +
            '<td class="ap-num-der ap-col-3" data-label="Dejaron WhatsApp">' + num(x.conWhatsapp) + '</td><td class="ap-col-2" data-label="Reto más frecuente">' + d(x.reto) + '</td>' +
            '<td class="ap-col-2" data-label="Dónde se quedan">' + (x.abandono ? esc(x.abandono.etiqueta) + ' <small>(' + num(x.abandono.n) + ')</small>' : '<span class="ap-sub">Nadie abandona</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    var primera = datos[0];
    var mejor = datos.filter(function (x) { return x.total >= 2; }).sort(function (a, b) { return b.pctCompletas - a.pctCompletas || b.total - a.total; })[0];
    var frase = primera ? 'La rama es el perfil que la persona elige al principio. «' + primera.perfil + '» es la que más empieza (' + persona(primera.total) + ') y ' + primera.pctCompletas + ' % la termina.' +
      (mejor && mejor.perfil !== primera.perfil ? ' La que más termina es «' + mejor.perfil + '» (' + mejor.pctCompletas + ' %).' : '') : '';
    return '<section class="ap-card enc-g enc-g--ancho"><header class="ap-card__cab"><h2>Resumen por rama del flujo</h2><p>Cuántas personas empezaron cada rama, cuántas llegaron al final y en qué pregunta se quedan las demás.</p></header>' +
      '<div class="ap-card__cuerpo">' + cuerpo + (frase ? '<p class="enc-g__frase" role="note"><strong>Cómo leerlo:</strong> ' + esc(frase) + '</p>' : '') + '</div></section>';
  }

  function accionesRespuesta(f, detalle) {
    var a = [{ t: 'Ver detalle', i: 'eye', d: { enc: 'detalle' } }];
    if (detalle && f.ids.length) {
      if (f.tieneContacto) a.push({ t: f.atendida ? 'Quitar marca de atendida' : 'Marcar atendida', i: f.atendida ? 'rotate-ccw' : 'check-check', d: { enc: 'atender', atendida: f.atendida ? '0' : '1' } });
      a.push({ t: 'Borrar respuesta', i: 'trash-2', d: { enc: 'borrar' }, p: true, sep: true });
    }
    return a;
  }

  function respuestasHTML(r, detalle) {
    var filas = filtrarRespuestas(r.filas, UI.filtro);
    var mostrar = filas.slice(0, UI.visibles);
    var chips = FILTROS_RESPUESTAS.map(function (f) {
      var n = r.filas.filter(f.pasa).length;
      return '<button type="button" class="zs-chip" data-enc="filtro" data-id="' + f.id + '" aria-pressed="' + (UI.filtro === f.id) + '">' + esc(f.texto) + ' · ' + num(n) + '</button>';
    }).join('');
    var cuerpo;
    if (!filas.length) cuerpo = '<p class="enc-vacio">Nadie coincide con ese filtro.</p>';
    else {
      cuerpo = '<div class="ap-tabla-zona"><div class="ap-tabla-envoltura"><table class="ap-tabla ap-tabla--simple ap-tabla--respuestas"><thead><tr><th scope="col">Perfil</th><th scope="col" class="ap-col-2">Fecha</th><th scope="col" class="ap-col-2">Reto</th><th scope="col" class="ap-col-3">Cuándo quiere empezar</th><th scope="col">Estado</th><th scope="col" class="ap-col-3">WhatsApp</th>' +
        '<th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
        mostrar.map(function (f) {
          var acc = accionesRespuesta(f, detalle);
          var datos = { sid: f.sessionId, ids: f.ids.join(',') };
          var fin = acc.length > 1 ? F.botonMenu({ acciones: acc, etiqueta: 'Acciones de la respuesta de ' + (f.perfil || 'una persona'), datos: datos }) : '<span class="ap-fc__chevron" aria-hidden="true">' + ico('chevron-right', 18) + '</span>';
          return '<tr class="ap-fila ap-fila-t ap-fila-t--toca">' +
            '<td data-label="Perfil"><button type="button" class="ap-titulo-fila" data-enc="detalle" data-sid="' + esc(f.sessionId) + '">' + esc(f.perfil || 'Sin perfil') + '</button>' + (f.grupo ? '<span class="ap-sub">' + esc(f.grupo) + '</span>' : '') + '</td>' +
            '<td class="ap-col-2" data-label="Fecha"><span class="ap-fecha">' + esc(formatoFecha(f.fecha)) + '</span></td>' +
            '<td class="ap-col-2" data-label="Reto">' + esc(f.reto || '—') + '</td><td class="ap-col-3" data-label="Cuándo quiere empezar">' + esc(f.urgencia || '—') + '</td>' +
            '<td data-label="Estado"><span class="ap-badge ap-badge--' + (f.completada ? 'ok' : 'neutro') + '">' + ico(f.completada ? 'circle-check' : 'clock', 14) + '<span>' + (f.completada ? 'Terminó' : 'No terminó') + '</span></span></td>' +
            '<td class="ap-col-3" data-label="WhatsApp">' + (f.tieneContacto ? esc(f.mascara) + (f.atendida ? '<span class="ap-sub">Atendida</span>' : '<span class="ap-sub ap-sub--aviso">Por atender</span>') : '<span class="ap-sub">No dejó</span>') + '</td>' +
            '<td class="ap-celda-acciones">' + fin + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        '<p class="ap-pie-tabla" role="status">Mostrando ' + num(mostrar.length) + ' de ' + num(filas.length) + '</p>' +
        (filas.length > mostrar.length ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-enc="mas">Mostrar ' + Math.min(25, filas.length - mostrar.length) + ' más</button>' : '');
    }
    return '<section class="enc-panel enc-panel--ancho"><div class="ap-acciones-lote" style="justify-content:space-between"><h3>Respuestas, una por persona</h3>' +
      botonAcc('csv-respuestas', filas.length ? '' : 'disabled', 'download', 'Descargar lista (CSV)') + '</div>' +
      '<p class="enc-nota">Datos mínimos: el WhatsApp aparece oculto y la lista descargada también. Toca una fila para ver todas sus respuestas. ' + (detalle ? '' : 'Para marcar como atendida o borrar hace falta publicar el servidor nuevo.') + '</p>' +
      '<div class="zs-chips" role="group" aria-label="Filtrar respuestas">' + chips + '</div>' + cuerpo + '</section>';
  }

  // Ventana con todas las respuestas de una persona (sin el número completo).
  function detalleRespuestaHTML(f) {
    var dato = function (t, v) { return '<div class="ap-dato"><dt>' + esc(t) + '</dt><dd>' + (v || '—') + '</dd></div>'; };
    var etiquetas = M.ETIQUETAS_PREGUNTA || {};
    var claves = (M.CLAVES || []).filter(function (k) { return f.respuestas && f.respuestas[k]; });
    return '<div class="ap-ficha"><div class="ap-ficha__cab"><span class="ap-ico-tile" aria-hidden="true">' + ico('list-checks', 20) + '</span><div><strong>' + esc(f.perfil || 'Sin perfil') + '</strong>' +
      '<span class="ap-badge ap-badge--' + (f.completada ? 'ok' : 'neutro') + '">' + ico(f.completada ? 'circle-check' : 'clock', 14) + '<span>' + (f.completada ? 'Terminó la encuesta' : 'No terminó') + '</span></span></div></div>' +
      '<dl class="ap-datos">' + dato('Fecha', esc(formatoFecha(f.fecha))) + dato('Cuándo quiere empezar', esc(f.urgencia)) +
      dato('WhatsApp', f.tieneContacto ? esc(f.mascara) + ' · ' + (f.atendida ? 'atendida' : 'por atender') : 'No dejó') +
      dato('Aviso de privacidad', f.tieneContacto ? (f.avisoAceptado ? 'Aceptado' : 'Sin constancia') : '—') + '</dl>' +
      '<h3>Sus respuestas</h3>' +
      (claves.length ? '<dl class="ap-datos">' + claves.map(function (k) { return dato(etiquetas[k] || k, esc(f.respuestas[k])); }).join('') + '</dl>' : '<p class="ap-nada">No contestó ninguna pregunta.</p>') + '</div>';
  }

  function accionesPregunta(x) {
    return [{ t: 'Ver detalle', i: 'eye', d: { enc: 'pregunta-detalle' } },
      { t: x.atendida ? 'Quitar marca de atendida' : 'Marcar atendida', i: x.atendida ? 'rotate-ccw' : 'check-check', d: { enc: 'pregunta-atender', atendida: x.atendida ? '0' : '1' } },
      { t: 'Borrar pregunta', i: 'trash-2', d: { enc: 'pregunta-borrar' }, p: true, sep: true }];
  }

  function preguntasHTML(estadoPreguntas) {
    if (!estadoPreguntas.ok) {
      return '<section class="enc-panel enc-panel--ancho"><h3>Preguntas que la guía no supo contestar</h3><p class="enc-error">' + esc(estadoPreguntas.error) + '</p></section>';
    }
    var detalle = estadoPreguntas.detalle === true;
    var p = calcularPreguntas(estadoPreguntas.preguntas);
    var items = UI.ocultarAtendidas ? p.items.filter(function (x) { return !x.atendida; }) : p.items;
    var cuerpo = items.length
      ? '<div class="ap-tabla-zona"><div class="ap-tabla-envoltura"><table class="ap-tabla ap-tabla--simple ap-tabla--preguntas"><thead><tr><th scope="col">Pregunta</th><th scope="col" class="ap-col-3">Tipo</th><th scope="col" class="ap-col-num">Veces</th><th scope="col" class="ap-col-2">Última vez</th>' +
        (detalle ? '<th scope="col" class="ap-col-3">Estado</th><th scope="col"><span class="sr-only">Acciones</span></th>' : '') + '</tr></thead><tbody>' +
        items.map(function (x) {
          var conAcciones = detalle && x.clave;
          var titulo = conAcciones ? '<button type="button" class="ap-titulo-fila" data-enc="pregunta-detalle" data-id="' + esc(x.clave) + '">' + esc(x.texto) + '</button>' : esc(x.texto);
          var acc = detalle
            ? '<td class="ap-col-3" data-label="Estado">' + (x.atendida ? '<span class="ap-badge ap-badge--ok">' + ico('check-check', 14) + '<span>Atendida</span></span>' : '<span class="ap-badge ap-badge--aviso">' + ico('clock', 14) + '<span>Por atender</span></span>') + '</td>' +
              '<td class="ap-celda-acciones">' + (conAcciones ? F.botonMenu({ acciones: accionesPregunta(x), etiqueta: 'Acciones de la pregunta ' + x.texto.slice(0, 40), datos: { id: x.clave } }) : '') + '</td>'
            : '';
          return '<tr class="ap-fila ap-fila-t' + (conAcciones ? ' ap-fila-t--toca' : '') + '"><td data-label="Pregunta">' + titulo + '</td><td class="ap-col-3" data-label="Tipo">' + (x.tipo === 'animal' ? 'Animal' : 'Otra') + '</td><td class="ap-col-num" data-label="Veces">' + num(x.veces) + '</td><td class="ap-col-2" data-label="Última vez">' + esc(formatoFecha(x.ultimaVez)) + '</td>' + acc + '</tr>';
        }).join('') + '</tbody></table></div></div>'
      : '<p class="enc-vacio">' + (p.items.length ? 'Todas las preguntas están atendidas.' : 'La guía no ha tenido preguntas sin respuesta.') + '</p>';
    var controles = '<div class="ap-acciones-lote">' +
      (detalle ? '<button type="button" class="zs-chip" data-enc="ocultar-atendidas" aria-pressed="' + UI.ocultarAtendidas + '">Ocultar las atendidas</button>' : '') +
      botonAcc('csv-preguntas', p.items.length ? '' : 'disabled', 'download', 'Descargar lista (CSV)') + '</div>';
    return '<section class="enc-panel enc-panel--ancho"><h3>Preguntas que la guía no supo contestar</h3>' +
      '<p class="enc-nota">De la más frecuente a la menos: sirven para decidir qué fichas, respuestas o cursos agregar. Los textos se limpian en el servidor (sin correos ni teléfonos). ' +
      (detalle ? 'Si una pregunta atendida vuelve a llegar, regresa a «Por atender».' : '') + '</p>' + controles + cuerpo + '</section>';
  }

  function titulo(sub, cifras) {
    return P.tarjetaTitulo({
      icono: 'list-checks', eyebrow: 'Marketing', titulo: 'Encuesta', acento: 'de la portada.', sub: sub,
      cifras: cifras || [], acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    });
  }

  function cargandoHTML() {
    return P.tarjetaTitulo({ icono: 'list-checks', eyebrow: 'Marketing', titulo: 'Encuesta', acento: 'de la portada.', sub: 'Cargando los datos reales del servidor…' });
  }

  // Vista completa de la sección. `estado` = resultado de cargar().
  function vistaHTML(estado) {
    var e = estado || {};
    var enc = e.encuesta || { ok: false, error: 'Sin datos.' };
    var cabecera = titulo('Quién visita, qué busca, qué tan pronto quiere empezar y quién pidió que lo contacten. Se cuenta una vez por visitante.');
    if (!enc.ok) {
      return cabecera + '<section class="enc-panel enc-panel--ancho"><h3>No se pudieron cargar las respuestas</h3><p class="enc-error">' + esc(enc.error) + '</p></section>' +
        preguntasHTML(e.preguntas || { ok: false, error: 'Sin datos.' });
    }
    var r = calcular(enc.docs);
    var detalle = enc.detalle === true;
    return cabecera + kpisHTML(r) + graficasHTML(r) + leadsHTML(r, detalle) + respuestasHTML(r, detalle) + preguntasHTML(e.preguntas || { ok: false, error: 'Sin datos.' });
  }

  /* ───────────────────────── Montaje (solo en el navegador) ───────────────────────── */
  function descargar(nombre, texto) {
    var blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function hoyTexto() { return new Date().toISOString().slice(0, 10); }

  // contenedor: donde se pinta · estado: resultado de cargar() ·
  // deps: { api(ruta, op), toast(texto, esError), modal(o), confirmar(o), recargar() }
  function montar(contenedor, estado, deps) {
    var y = typeof window !== 'undefined' ? window.scrollY : 0;
    contenedor.innerHTML = vistaHTML(estado);
    if (typeof window !== 'undefined') window.scrollTo(0, y);
    var enc = estado.encuesta || {};
    var detalle = enc.ok && enc.detalle === true;
    var calculado = enc.ok ? calcular(enc.docs) : null;
    var repintar = function () { montar(contenedor, estado, deps); };
    var ids = function (ds) { return String(ds.ids || '').split(',').filter(Boolean); };

    async function pedirNumero(id) {
      var r = await deps.api('/api/admin/encuesta/' + encodeURIComponent(id) + '/contacto');
      return String(r.contacto || '').replace(/\D/g, '');
    }

    contenedor.onclick = async function (ev) {
      var rec = ev.target.closest('[data-accion="recargar"]');
      if (rec) { ev.preventDefault(); deps.recargar(); return; }
      var b = ev.target.closest('[data-enc]');
      if (!b || b.disabled) return;
      await hacer(b.dataset.enc, b.dataset);
    };

    async function hacer(acc, ds) {
      try {
        if (acc === 'filtro') { UI.filtro = ds.id; UI.visibles = 25; repintar(); return; }
        if (acc === 'mas') { UI.visibles += 25; repintar(); return; }
        if (acc === 'ocultar-atendidas') { UI.ocultarAtendidas = !UI.ocultarAtendidas; repintar(); return; }
        if (acc === 'csv-respuestas') {
          if (!calculado) return;
          var filas = filtrarRespuestas(calculado.filas, UI.filtro);
          descargar('encuesta-' + hoyTexto() + '.csv', csvRespuestas(filas));
          deps.toast('Se descargaron ' + filas.length + (filas.length === 1 ? ' respuesta' : ' respuestas') + ' (WhatsApp oculto).');
          return;
        }
        if (acc === 'csv-preguntas') {
          var lista = calcularPreguntas(estado.preguntas.preguntas || []).items;
          descargar('preguntas-sin-respuesta-' + hoyTexto() + '.csv', csvPreguntas(UI.ocultarAtendidas ? lista.filter(function (x) { return !x.atendida; }) : lista));
          deps.toast('Se descargó la lista de preguntas.');
          return;
        }
        if (acc === 'detalle') {
          var fila = (calculado ? calculado.filas : []).filter(function (x) { return x.sessionId === ds.sid; })[0];
          if (!fila) return;
          var botones = [{ id: 'cerrar', texto: 'Cerrar', tipo: 'suave' }];
          if (detalle && fila.ids.length && fila.tieneContacto) botones.push({ id: 'atender', texto: fila.atendida ? 'Quitar marca de atendida' : 'Marcar atendida', tipo: 'primario' });
          var elegido = await deps.modal({ titulo: 'Respuesta de la encuesta', cuerpo: detalleRespuestaHTML(fila), botones: botones, ancho: 'ancho' });
          if (elegido === 'atender') await hacer('atender', { ids: fila.ids.join(','), atendida: fila.atendida ? '0' : '1' });
          return;
        }
        if (acc === 'pregunta-detalle') {
          var preg = calcularPreguntas(estado.preguntas.preguntas || []).items.filter(function (x) { return x.clave === ds.id; })[0];
          if (!preg) return;
          var cuerpoP = '<div class="ap-ficha"><p class="ap-modal__texto">' + esc(preg.texto) + '</p><dl class="ap-datos">' +
            '<div class="ap-dato"><dt>Tipo</dt><dd>' + (preg.tipo === 'animal' ? 'Animal' : 'Otra') + '</dd></div>' +
            '<div class="ap-dato"><dt>Veces</dt><dd>' + num(preg.veces) + '</dd></div>' +
            '<div class="ap-dato"><dt>Última vez</dt><dd>' + esc(formatoFecha(preg.ultimaVez)) + '</dd></div>' +
            '<div class="ap-dato"><dt>Estado</dt><dd>' + (preg.atendida ? 'Atendida' : 'Por atender') + '</dd></div></dl></div>';
          var eleg = await deps.modal({ titulo: 'Pregunta sin respuesta', cuerpo: cuerpoP, ancho: 'ancho',
            botones: [{ id: 'cerrar', texto: 'Cerrar', tipo: 'suave' }, { id: 'borrar', texto: 'Borrar', tipo: 'peligro' }, { id: 'atender', texto: preg.atendida ? 'Quitar marca de atendida' : 'Marcar atendida', tipo: 'primario' }] });
          if (eleg === 'atender') await hacer('pregunta-atender', { id: preg.clave, atendida: preg.atendida ? '0' : '1' });
          else if (eleg === 'borrar') await hacer('pregunta-borrar', { id: preg.clave });
          return;
        }
        if (acc === 'wa') {
          // Se abre la ventana en el clic (para que no la bloquee el navegador) y se llena cuando llega el número
          var ventana = window.open('', '_blank');
          if (ventana) ventana.opener = null;
          try {
            var numero = await pedirNumero(ds.id);
            if (!numero) throw new Error('Esa respuesta no tiene número.');
            if (ventana) ventana.location.href = 'https://wa.me/' + numero; else window.location.href = 'https://wa.me/' + numero;
          } catch (e) { if (ventana) ventana.close(); throw e; }
          return;
        }
        if (acc === 'atender') {
          await deps.api('/api/admin/encuesta/atender', { method: 'POST', body: { ids: ids(ds), atendida: ds.atendida === '1' } });
          deps.toast(ds.atendida === '1' ? 'Marcada como atendida.' : 'Se quitó la marca.');
          await deps.recargar();
          return;
        }
        if (acc === 'borrar') {
          var si = await deps.confirmar({ titulo: 'Borrar respuesta', texto: 'Se borrará esta respuesta de la encuesta. El servidor guarda una copia en <code>adminPapelera</code> por si fue un error.', aceptar: 'Sí, borrar', cancelar: 'Mejor no', peligro: true });
          if (!si) return;
          await deps.api('/api/admin/encuesta/borrar', { method: 'POST', body: { ids: ids(ds) } });
          deps.toast('Respuesta borrada.');
          await deps.recargar();
          return;
        }
        if (acc === 'pregunta-atender') {
          await deps.api('/api/admin/chatbot/sin-respuesta/atender', { method: 'POST', body: { claves: [ds.id], atendida: ds.atendida === '1' } });
          deps.toast(ds.atendida === '1' ? 'Pregunta marcada como atendida.' : 'Se quitó la marca.');
          await deps.recargar();
          return;
        }
        if (acc === 'pregunta-borrar') {
          var ok = await deps.confirmar({ titulo: 'Borrar pregunta', texto: 'Se borrará esta pregunta de la lista. El servidor guarda una copia en <code>adminPapelera</code>.', aceptar: 'Sí, borrar', cancelar: 'Mejor no', peligro: true });
          if (!ok) return;
          await deps.api('/api/admin/chatbot/sin-respuesta/borrar', { method: 'POST', body: { claves: [ds.id] } });
          deps.toast('Pregunta borrada.');
          await deps.recargar();
        }
      } catch (e) { deps.toast((e && e.message) || 'No se pudo completar la acción.', true); }
    }
    void detalle;
  }

  return {
    UI: UI, enmascarar: enmascarar, ramas: ramas, filasRespuestas: filasRespuestas, FILTROS_RESPUESTAS: FILTROS_RESPUESTAS, filtrarRespuestas: filtrarRespuestas,
    csvRespuestas: csvRespuestas, csvPreguntas: csvPreguntas, celdaCsv: celdaCsv, ramasHTML: ramasHTML, respuestasHTML: respuestasHTML, montar: montar,
    detalleRespuestaHTML: detalleRespuestaHTML, accionesRespuesta: accionesRespuesta, accionesPregunta: accionesPregunta,
    esc: esc, aFecha: aFecha, formatoFecha: formatoFecha, contactoDe: contactoDe, consolidar: consolidar, numeroDudoso: numeroDudoso,
    distribucion: distribucion, calcular: calcular, calcularPreguntas: calcularPreguntas,
    mensajeError: mensajeError, cargar: cargar,
    kpisHTML: kpisHTML, graficasHTML: graficasHTML, fraseTop: fraseTop, fraseDeCada10: fraseDeCada10, leadsHTML: leadsHTML,
    preguntasHTML: preguntasHTML, cargandoHTML: cargandoHTML, vistaHTML: vistaHTML
  };
});
