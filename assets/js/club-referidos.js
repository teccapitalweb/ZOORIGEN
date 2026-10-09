/* ============================================================ */
/* INVITA A TUS AMIGOS · Club VIP Zoorigen                       */
/*                                                                */
/* Lógica y dibujo de la pantalla de referidos (sin tocar el      */
/* navegador): se prueba en Node con tests/club-referidos.test.js */
/* El servidor decide quién es invitado válido y cuánto vale cada */
/* hito (GET /api/referidos/estado); aquí solo se dibuja.         */
/* Todo texto que viene del servidor se escapa antes de pintarlo. */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./club-iconos-comunidad.js'));
  else root.ZOO_REFERIDOS = factory(root.ZOO_ICONOS_COM);
})(typeof self !== 'undefined' ? self : this, function (ICONOS) {
  'use strict';

  var URL_REGISTRO = 'https://www.zoorigen.com/pages/club-registro.html';
  var META_PREMIOS = { 'referidos-1': 3, 'referidos-2': 6 };   // invitados válidos para cada premio
  var TOTAL_BARRA = 6;
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  var TEXTOS = {
    titulo: 'Invita a tus amigos',
    subtitulo: 'Comparte tu enlace. Cuando tus amigos se unan y confirmen su correo, tú ganas cursos antes de tiempo y puntos para tu nivel.',
    vacio: 'Todavía nadie ha usado tu enlace. Cuando alguien se registre con él, aparecerá aquí.',
    error: 'No pudimos cargar tus invitados. Revisa tu conexión e inténtalo de nuevo.',
    sinMembresia: 'El premio se canjea con membresía activa. Tus invitados ya cuentan, y el premio te espera cuando actives tu membresía.',
    motivoGenerico: 'No cumplió las reglas de invitación.',
    comoCuenta: [
      'Tu amigo se registra con tu enlace.',
      'Confirma su correo. Con Google ya queda confirmado; si usa correo y contraseña, debe abrir el mensaje de confirmación que le llega.',
      'Se registra desde un dispositivo distinto al tuyo y al de tus otros invitados.'
    ],
    aviso: 'El control de dispositivos ayuda a evitar cuentas repetidas, pero no es infalible: algunos casos los revisamos a mano. Invita a personas reales y no cuentes con cuentas duplicadas.'
  };

  /* ───────────────────────── Utilidades ───────────────────────── */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function entero(v, max) {
    var n = Math.round(Number(v));
    if (!isFinite(n) || n < 0) return 0;
    return max ? Math.min(n, max) : n;
  }
  function texto(v, max) {
    if (v == null) return '';
    var t = String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) : t;
  }
  function icono(nombre, tam, clase) { return ICONOS ? ICONOS.svg(nombre, { size: tam || 16, clase: clase }) : ''; }

  function fechaCorta(valor) {
    if (!valor) return '';
    var d;
    if (typeof valor === 'object' && typeof valor.toDate === 'function') d = valor.toDate();
    else if (typeof valor === 'object' && isFinite(valor.seconds != null ? valor.seconds : valor._seconds)) d = new Date((valor.seconds != null ? valor.seconds : valor._seconds) * 1000);
    else d = new Date(valor);
    if (isNaN(d.getTime())) return '';
    return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ───────────────────────── Código y enlace ───────────────────────── */

  function codigoLocal(uid) { return 'ZOO-' + String(uid || '').substring(0, 6).toUpperCase(); }
  function enlaceLocal(codigo) { return URL_REGISTRO + '?ref=' + encodeURIComponent(codigo); }

  function textoInvitacion(enlace) {
    return 'Te invito al Club VIP Zoorigen: cursos de fauna silvestre, retos, webinars en vivo y certificados. Regístrate con mi enlace: ' + enlace;
  }
  function enlacesCompartir(enlace) {
    var msg = textoInvitacion(enlace);
    return {
      whatsapp: 'https://wa.me/?text=' + encodeURIComponent(msg),
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(enlace),
      x: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(msg),
      correo: 'mailto:?subject=' + encodeURIComponent('Te invito al Club VIP Zoorigen') + '&body=' + encodeURIComponent(msg)
    };
  }

  /* ───────────────────────── Normalizar la respuesta del servidor ───────────────────────── */

  function normalizarHito(h) {
    if (!h || typeof h !== 'object') return null;
    var t = texto(h.texto, 140);
    if (!t) return null;
    return { clave: texto(h.clave, 30), texto: t, puntos: entero(h.puntos, 100000), logrado: h.logrado === true };
  }

  function normalizarInvitado(i) {
    if (!i || typeof i !== 'object') return null;
    var estado = texto(i.estado, 30);
    if (['valido', 'pendiente-correo', 'rechazado'].indexOf(estado) < 0) estado = 'pendiente-correo';
    var hitos = Array.isArray(i.hitos) ? i.hitos.map(normalizarHito).filter(Boolean).slice(0, 10) : [];
    var puntos = i.puntos != null ? entero(i.puntos, 100000) : hitos.filter(function (h) { return h.logrado; }).reduce(function (a, h) { return a + h.puntos; }, 0);
    return { alias: texto(i.alias, 40) || 'Invitado', fecha: i.fecha || null, estado: estado, motivo: texto(i.motivo, 200), hitos: hitos, puntos: puntos };
  }

  function metaDe(p) {
    var porClave = META_PREMIOS[p.clave];
    if (porClave) return porClave;
    var m = /(\d+)/.exec(String(p.requisito == null ? '' : p.requisito));
    return m ? entero(m[1], 1000) : 0;
  }

  function normalizarPremio(p, validos) {
    if (!p || typeof p !== 'object') return null;
    var clave = texto(p.clave, 30);
    if (!clave) return null;
    var meta = metaDe({ clave: clave, requisito: p.requisito });
    var ganado = p.ganado === true;
    var usado = p.usado && typeof p.usado === 'object' ? { cursoId: texto(p.usado.cursoId, 80), fecha: p.usado.fecha || null } : (p.usado === true ? { cursoId: '', fecha: null } : null);
    var faltan = p.faltan != null ? entero(p.faltan, 1000) : Math.max(0, meta - validos);
    var numero = clave === 'referidos-2' ? 2 : 1;
    return { clave: clave, numero: numero, meta: meta, actual: Math.min(validos, meta), faltan: ganado ? 0 : faltan, ganado: ganado, usado: usado, disponible: ganado && !usado };
  }

  // Devuelve siempre el mismo molde, aunque el servidor mande datos incompletos o raros.
  function normalizarEstado(resp, uid) {
    var r = resp && typeof resp === 'object' ? resp : {};
    var codigo = texto(r.codigo, 40) || codigoLocal(uid);
    var enlace = typeof r.enlace === 'string' && /^https:\/\/[^\s]+$/.test(r.enlace) ? r.enlace : enlaceLocal(codigo);
    var invitados = Array.isArray(r.invitados) ? r.invitados.map(normalizarInvitado).filter(Boolean).slice(0, 200) : [];
    var validos = r.validos != null ? entero(r.validos, 100000) : invitados.filter(function (i) { return i.estado === 'valido'; }).length;
    var premios = (Array.isArray(r.premios) ? r.premios : []).map(function (p) { return normalizarPremio(p, validos); }).filter(Boolean);
    ['referidos-1', 'referidos-2'].forEach(function (clave) {   // si el servidor no manda un premio, se muestra con su meta de siempre
      if (!premios.some(function (p) { return p.clave === clave; })) premios.push(normalizarPremio({ clave: clave }, validos));
    });
    premios.sort(function (a, b) { return a.numero - b.numero; });
    return {
      codigo: codigo, enlace: enlace, validos: validos,
      pendientes: r.pendientes != null ? entero(r.pendientes, 100000) : invitados.filter(function (i) { return i.estado === 'pendiente-correo'; }).length,
      rechazados: r.rechazados != null ? entero(r.rechazados, 100000) : invitados.filter(function (i) { return i.estado === 'rechazado'; }).length,
      invitados: invitados,
      puntosTotales: r.puntosTotales != null ? entero(r.puntosTotales, 10000000) : invitados.reduce(function (a, i) { return a + i.puntos; }, 0),
      premios: premios
    };
  }

  function hayPremioDisponible(est) { return !!est && est.premios.some(function (p) { return p.disponible; }); }

  // Posición de la barra: de 0 a 6 invitados válidos, con marcas en 3 y 6.
  function progreso(est) {
    var v = Math.min(est.validos, TOTAL_BARRA);
    return { validos: est.validos, total: TOTAL_BARRA, pct: Math.round((v / TOTAL_BARRA) * 100), marcas: [Math.round(META_PREMIOS['referidos-1'] / TOTAL_BARRA * 100), 100] };
  }

  function etiquetaEstado(estado) {
    if (estado === 'valido') return { texto: 'Confirmado', clase: 'zc-est--ok', icono: 'circle-check' };
    if (estado === 'rechazado') return { texto: 'No válido', clase: 'zc-est--no', icono: 'circle-x' };
    return { texto: 'Falta confirmar su correo', clase: 'zc-est--espera', icono: 'hourglass' };
  }

  function textoHito(h) {
    var base = h.texto.replace(/[:\s]+$/, '');
    if (/\+\s*\d/.test(base)) return base;
    return base + ': +' + h.puntos + ' puntos';
  }

  /* ───────────────────────── Dibujo (devuelven HTML ya escapado) ───────────────────────── */

  function renderInvitado(inv) {
    var e = etiquetaEstado(inv.estado);
    var fecha = fechaCorta(inv.fecha);
    var inicial = esc((inv.alias || '?').charAt(0).toUpperCase());
    var detalle = '';
    if (inv.estado === 'rechazado') detalle = '<p class="zc-inv__nota zc-inv__nota--no">' + esc(inv.motivo || TEXTOS.motivoGenerico) + '</p>';
    else if (inv.estado === 'pendiente-correo') detalle = '<p class="zc-inv__nota">Empezará a contar en cuanto confirme su correo.</p>';
    var hitos = '';
    if (inv.estado === 'valido' && inv.hitos.length) {
      hitos = '<ul class="zc-hitos">' + inv.hitos.map(function (h) {
        return '<li class="zc-hito' + (h.logrado ? ' is-logrado' : '') + '">' + icono(h.logrado ? 'circle-check' : 'circle-dashed', 15) +
          '<span>' + esc(textoHito(h)) + (h.logrado ? '' : ' <em>(pendiente)</em>') + '</span></li>';
      }).join('') + '</ul>';
    }
    var puntos = inv.estado === 'valido' ? '<div class="zc-inv__puntos">Puntos de este invitado: <strong>' + inv.puntos + '</strong></div>' : '';
    return '<li class="zc-inv">' +
      '<div class="zc-inv__top"><span class="zc-avatar" aria-hidden="true">' + inicial + '</span>' +
      '<div class="zc-inv__id"><strong>' + esc(inv.alias) + '</strong>' + (fecha ? '<small>Aceptó tu invitación el ' + esc(fecha) + '</small>' : '') + '</div>' +
      '<span class="zc-est ' + e.clase + '">' + icono(e.icono, 14) + esc(e.texto) + '</span></div>' +
      detalle + hitos + puntos + '</li>';
  }

  function renderInvitados(est) {
    if (!est.invitados.length) {
      return '<div class="zc-vacio">' + icono('user-plus', 30) + '<p>' + esc(TEXTOS.vacio) + '</p></div>';
    }
    return '<ul class="zc-lista">' + est.invitados.map(renderInvitado).join('') + '</ul>';
  }

  function renderResumen(est) {
    var celda = function (valor, etiqueta) { return '<div class="zc-dato"><div class="zc-dato__v">' + valor + '</div><div class="zc-dato__l">' + esc(etiqueta) + '</div></div>'; };
    return '<div class="zc-datos">' + celda(est.validos, 'Confirmados') + celda(est.pendientes, 'Por confirmar') + celda(est.rechazados, 'No válidos') + celda(est.puntosTotales, 'Puntos ganados') + '</div>';
  }

  function renderBarra(est) {
    var p = progreso(est);
    return '<div class="zc-barra" role="progressbar" aria-valuemin="0" aria-valuemax="' + p.total + '" aria-valuenow="' + Math.min(p.validos, p.total) + '" aria-label="Invitados válidos">' +
      '<div class="zc-barra__relleno" style="width:' + p.pct + '%"></div>' +
      p.marcas.map(function (m, i) { return '<span class="zc-barra__marca" style="left:' + m + '%" title="Premio ' + (i + 1) + '"></span>'; }).join('') +
      '</div><div class="zc-barra__texto"><span>' + p.validos + ' de ' + p.total + ' invitados válidos</span><span>Premio 1 a los 3 · Premio 2 a los 6</span></div>';
  }

  function renderPremio(p, membresia) {
    var cuerpo;
    if (p.usado) {
      var f = fechaCorta(p.usado.fecha);
      cuerpo = '<div class="zc-premio__estado is-usado">' + icono('check', 15) + 'Ya lo usaste' + (f ? ' el ' + esc(f) : '') + '</div>';
    } else if (p.disponible && membresia) {
      cuerpo = '<div class="zc-premio__estado is-listo">' + icono('gift', 15) + 'Listo para canjear</div>' +
        '<button type="button" class="zc-btn zc-btn--primario" data-canjear>Elegir mi curso</button>';
    } else if (p.disponible) {
      cuerpo = '<div class="zc-premio__estado is-listo">' + icono('gift', 15) + 'Ganado</div>' +
        '<p class="zc-premio__nota">' + esc(TEXTOS.sinMembresia) + '</p>' +
        '<a class="zc-btn zc-btn--primario" href="club-suscripcion.html">Suscribirme</a>';
    } else {
      cuerpo = '<div class="zc-premio__estado">' + icono('lock', 15) + 'Te ' + (p.faltan === 1 ? 'falta 1 amigo válido' : 'faltan ' + p.faltan + ' amigos válidos') + '</div>';
    }
    return '<div class="zc-premio' + (p.disponible ? ' is-disponible' : '') + (p.usado ? ' is-usado' : '') + '" data-premio="' + esc(p.clave) + '">' +
      '<div class="zc-premio__cab">' + icono('award', 20) + '<div><strong>Premio ' + p.numero + '</strong><small>' + p.meta + ' invitados válidos</small></div></div>' +
      '<p class="zc-premio__desc">Elige un curso y ábrelo antes de su fecha. Se usa una sola vez y no se puede cambiar el curso.</p>' + cuerpo + '</div>';
  }

  function renderPremios(est, membresia) {
    return '<div class="zc-premios">' + est.premios.map(function (p) { return renderPremio(p, membresia); }).join('') + '</div>';
  }

  function renderComoCuenta() {
    return '<ol class="zc-pasos">' + TEXTOS.comoCuenta.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
      '<p class="zc-aviso">' + icono('info', 15) + '<span>' + esc(TEXTOS.aviso) + '</span></p>' +
      '<p class="zc-aviso">' + icono('award', 15) + '<span>Además, cada invitado válido te da puntos para tu nivel: +120 si paga una suscripción, +40 si supera 5 retos y +80 si supera 15 retos (una sola vez cada uno).</span></p>';
  }

  function renderError(mensaje) {
    return '<div class="zc-error" role="alert">' + icono('triangle-alert', 28) + '<p>' + esc(mensaje || TEXTOS.error) + '</p>' +
      '<button type="button" class="zc-btn zc-btn--suave" data-reintentar>' + icono('refresh-cw', 15) + 'Reintentar</button></div>';
  }

  return {
    TEXTOS: TEXTOS, META_PREMIOS: META_PREMIOS, URL_REGISTRO: URL_REGISTRO,
    esc: esc, fechaCorta: fechaCorta, codigoLocal: codigoLocal, enlaceLocal: enlaceLocal,
    textoInvitacion: textoInvitacion, enlacesCompartir: enlacesCompartir,
    normalizarEstado: normalizarEstado, hayPremioDisponible: hayPremioDisponible, progreso: progreso,
    etiquetaEstado: etiquetaEstado, textoHito: textoHito,
    renderInvitado: renderInvitado, renderInvitados: renderInvitados, renderResumen: renderResumen, renderBarra: renderBarra,
    renderPremio: renderPremio, renderPremios: renderPremios, renderComoCuenta: renderComoCuenta, renderError: renderError
  };
});
