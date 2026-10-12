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
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./encuesta-motor.js'));
  else root.ZOO_ADMIN_ENCUESTA = factory(root.ZOO_ENCUESTA);
})(typeof self !== 'undefined' ? self : this, function (motor) {
  'use strict';

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
      var conContacto = g.filter(function (d) { return contactoDe(d).numero; }).sort(function (a, b) { return ms(b) - ms(a); })[0];
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
        copias: g.length
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

    var leads = sesiones.filter(function (s) { return s.numero; }).map(function (s) {
      var caliente = s.respuestas.urgencia === M.URGENTE;
      return {
        sessionId: s.sessionId, numero: s.numero, wa: 'https://wa.me/' + s.numero,
        urgencia: s.respuestas.urgencia || '', caliente: caliente,
        perfil: s.respuestas.p1 || '', grupo: s.respuestas.grupo || '', completada: s.completada,
        fecha: s.fecha, avisoAceptado: s.avisoAceptado, avisoVersion: s.avisoVersion, dudoso: numeroDudoso(s.numero)
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
      calientesConWhatsapp: calientes.filter(function (s) { return s.numero; }).length,
      conAviso: leads.filter(function (l) { return l.avisoAceptado; }).length,
      distribuciones: dist, abandono: abandono, sinRespuestas: sinRespuestas, retos: retos, leads: leads
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
          tipo: p.tipo === 'animal' ? 'animal' : 'otro'
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
    var a = Promise.resolve().then(function () { return apiFetch('/api/admin/encuesta?limite=' + l1); })
      .then(function (r) { return { ok: true, docs: r && Array.isArray(r.docs) ? r.docs : [] }; }, function (e) { return { ok: false, error: mensajeError(e) }; });
    var b = Promise.resolve().then(function () { return apiFetch('/api/admin/chatbot/sin-respuesta?limite=' + l2); })
      .then(function (r) { return { ok: true, preguntas: r && Array.isArray(r.preguntas) ? r.preguntas : [] }; }, function (e) { return { ok: false, error: mensajeError(e) }; });
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
    return '<svg class="zi" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONOS[n] || '') + '</svg>';
  }

  function kpisHTML(r) {
    var caja = function (clase, etiqueta, valor, nota) {
      return '<div class="stat-box ' + clase + '"><div class="stat-box__label">' + esc(etiqueta) + '</div><div class="stat-box__value">' + esc(valor) + '</div><div class="stat-box__note">' + nota + '</div></div>';
    };
    return '<div class="admin-stats cols-4">' +
      caja('total', 'Personas que respondieron', num(r.total), 'Una por visitante, incluye completas y a medias') +
      caja('green', 'Terminaron la encuesta', num(r.completas), r.total ? '<strong>' + r.pctCompletas + '%</strong> de quienes empezaron' : 'Aún sin respuestas') +
      caja('amber', 'Leads calientes', num(r.calientes), 'Quieren empezar lo antes posible · ' + num(r.calientesConWhatsapp) + ' dejaron WhatsApp') +
      caja('review', 'Dejaron su WhatsApp', num(r.conWhatsapp), num(r.conAviso) + ' aceptaron el aviso de privacidad') +
      '</div>';
  }

  function barrasHTML(titulo, dist, nota) {
    var cuerpo;
    if (!dist || !dist.items.length) cuerpo = '<p class="enc-vacio">Aún no hay respuestas para esta pregunta.</p>';
    else {
      var max = dist.items[0].n || 1;
      cuerpo = '<ul class="enc-barras">' + dist.items.map(function (it) {
        var ancho = Math.max(2, Math.round(it.n / max * 100));
        return '<li><span class="enc-barras__l">' + esc(it.valor) + '</span>' +
          '<span class="enc-barras__b" aria-hidden="true"><i style="width:' + ancho + '%"></i></span>' +
          '<span class="enc-barras__n">' + num(it.n) + ' <small>' + it.pct + '%</small></span></li>';
      }).join('') + '</ul>';
    }
    return '<section class="enc-panel"><h3>' + esc(titulo) + '</h3>' +
      (dist && dist.base ? '<p class="enc-nota">' + (nota ? esc(nota) + ' ' : '') + 'Base: ' + num(dist.base) + ' ' + (dist.base === 1 ? 'persona' : 'personas') + '.</p>' : '') +
      cuerpo + '</section>';
  }

  function abandonoHTML(r) {
    var hay = r.abandono.some(function (a) { return a.n > 0; });
    var max = r.abandono.reduce(function (m, a) { return Math.max(m, a.n); }, 0) || 1;
    var cuerpo = hay
      ? '<ul class="enc-barras">' + r.abandono.map(function (a) {
        return '<li><span class="enc-barras__l">' + esc(a.etiqueta) + '</span>' +
          '<span class="enc-barras__b enc-barras__b--alerta" aria-hidden="true"><i style="width:' + (a.n ? Math.max(2, Math.round(a.n / max * 100)) : 0) + '%"></i></span>' +
          '<span class="enc-barras__n">' + num(a.n) + ' <small>' + (a.respondieron ? a.pct + '% de ' + num(a.respondieron) : '-') + '</small></span></li>';
      }).join('') + '</ul>'
      : '<p class="enc-vacio">Nadie ha abandonado todavía.</p>';
    return '<section class="enc-panel enc-panel--ancho"><h3>Dónde se quedan quienes no terminan</h3>' +
      '<p class="enc-nota">Última pregunta que contestaron antes de irse; el porcentaje es sobre quienes contestaron esa pregunta. Quien no contestó ninguna no deja registro.</p>' +
      cuerpo + '</section>';
  }

  function retosHTML(r) {
    var cuerpo = r.retos.length
      ? '<ul class="enc-lista">' + r.retos.map(function (x) {
        return '<li><span><b>' + esc(x.perfil) + '</b> · ' + esc(x.reto) + '</span><span class="enc-barras__n">' + num(x.n) + '</span></li>';
      }).join('') + '</ul>'
      : '<p class="enc-vacio">Aún no hay respuestas para esta pregunta.</p>';
    return '<section class="enc-panel"><h3>Reto principal por perfil</h3>' + cuerpo + '</section>';
  }

  function leadsHTML(r) {
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
      var perfil = [l.perfil, l.grupo].filter(Boolean).join(' · ');
      return '<li class="enc-lead' + (l.caliente ? ' is-caliente' : '') + '">' +
        '<a class="enc-lead__num" href="' + esc(l.wa) + '" target="_blank" rel="noopener">' + ico('message-circle', 15) + '+' + esc(l.numero) + '</a>' +
        '<span class="enc-lead__perfil">' + esc(perfil || 'Sin perfil') + (l.completada ? '' : ' <small>(encuesta incompleta)</small>') + '</span>' +
        '<span class="enc-lead__chips">' + chips.join('') + '</span>' +
        '<span class="enc-lead__fecha">' + esc(formatoFecha(l.fecha)) + '</span></li>';
    }).join('');
    return '<section class="enc-panel enc-panel--ancho"><h3>Personas que pidieron que un asesor las escriba</h3>' +
      '<p class="enc-nota">Los calientes (quieren empezar lo antes posible) van primero. Escríbeles solo si aceptaron el aviso de privacidad.</p>' +
      '<ul class="enc-leads">' + filas + '</ul></section>';
  }

  function preguntasHTML(estadoPreguntas) {
    if (!estadoPreguntas.ok) {
      return '<section class="enc-panel enc-panel--ancho"><h3>Preguntas que la guía no supo contestar</h3><p class="enc-error">' + esc(estadoPreguntas.error) + '</p></section>';
    }
    var p = calcularPreguntas(estadoPreguntas.preguntas);
    var cuerpo = p.items.length
      ? '<div class="mtable enc-tabla"><table><thead><tr><th>Pregunta</th><th>Tipo</th><th class="enc-der">Veces</th><th>Última vez</th></tr></thead><tbody>' +
        p.items.map(function (x) {
          return '<tr><td>' + esc(x.texto) + '</td><td>' + (x.tipo === 'animal' ? 'Animal' : 'Otra') + '</td><td class="enc-der">' + num(x.veces) + '</td><td>' + esc(formatoFecha(x.ultimaVez)) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : '<p class="enc-vacio">La guía no ha tenido preguntas sin respuesta.</p>';
    return '<section class="enc-panel enc-panel--ancho"><h3>Preguntas que la guía no supo contestar</h3>' +
      '<p class="enc-nota">De la más frecuente a la menos: sirven para decidir qué fichas, respuestas o cursos agregar. Los textos se limpian en el servidor (sin correos ni teléfonos).</p>' +
      cuerpo + '</section>';
  }

  function cargandoHTML() {
    return '<header class="sec-hero"><div class="sec-hero__txt"><span class="sec-eyebrow">Marketing</span><h1>Encuesta de la portada</h1><p>Cargando resultados...</p></div></header>';
  }

  // Vista completa de la sección. `estado` = resultado de cargar().
  function vistaHTML(estado) {
    var e = estado || {};
    var enc = e.encuesta || { ok: false, error: 'Sin datos.' };
    var cabecera = '<header class="sec-hero"><div class="sec-hero__txt"><span class="sec-eyebrow">Marketing</span><h1>Encuesta de la portada</h1>' +
      '<p>Quién visita, qué busca, qué tan pronto quiere empezar y quién pidió que lo contacten. Se cuenta una vez por visitante.</p></div>' +
      '<div class="sec-hero__acc"><button type="button" class="btn-add btn-add--suave" id="encRecargar">' + ico('refresh-cw', 16) + ' Actualizar</button></div></header>';
    if (!enc.ok) {
      return cabecera + '<section class="enc-panel enc-panel--ancho"><h3>No se pudieron cargar las respuestas</h3><p class="enc-error">' + esc(enc.error) + '</p></section>' +
        preguntasHTML(e.preguntas || { ok: false, error: 'Sin datos.' });
    }
    var r = calcular(enc.docs);
    var D = r.distribuciones;
    return cabecera + kpisHTML(r) +
      '<div class="enc-rejilla">' +
        barrasHTML('Perfil de quién responde', D.p1) +
        barrasHTML('Cómo nos conocieron', D.origen) +
        barrasHTML('Qué quieren lograr este año', D.meta) +
        barrasHTML('Fauna que les interesa', D.grupo) +
        barrasHTML('Cuándo quieren empezar', D.urgencia) +
        barrasHTML('Qué los detiene hoy', D.freno) +
        barrasHTML('Tamaño del equipo', D.tamano, 'Solo se pregunta a personal de UMA o zoológico y a consultores.') +
        barrasHTML('Experiencia con cursos en línea', D.experiencia) +
        retosHTML(r) +
        abandonoHTML(r) +
      '</div>' + leadsHTML(r) + preguntasHTML(e.preguntas || { ok: false, error: 'Sin datos.' });
  }

  return {
    esc: esc, aFecha: aFecha, formatoFecha: formatoFecha, contactoDe: contactoDe, consolidar: consolidar, numeroDudoso: numeroDudoso,
    distribucion: distribucion, calcular: calcular, calcularPreguntas: calcularPreguntas,
    mensajeError: mensajeError, cargar: cargar,
    kpisHTML: kpisHTML, barrasHTML: barrasHTML, abandonoHTML: abandonoHTML, retosHTML: retosHTML, leadsHTML: leadsHTML,
    preguntasHTML: preguntasHTML, cargandoHTML: cargandoHTML, vistaHTML: vistaHTML
  };
});
