/* ============================================================ */
/* CLUB VIP ZOORIGEN · CUPONES DE CRÉDITOS                        */
/* La administración crea una clave y la comparte por el canal de */
/* WhatsApp. Aquí, del lado de la persona:                        */
/*   1) «Hay un cupón para ti»: tarjeta que avisa que HAY un      */
/*      cupón e invita a unirse al canal. NUNCA muestra la clave. */
/*      Botones: Ahora no · Ya tengo la clave · Unirme al canal.  */
/*      Se muestra una sola tarjeta por visita (después de las    */
/*      de bienvenida y de los créditos regalados), a lo más una  */
/*      vez al día y 3 veces por cupón.                           */
/*   2) «¿Tienes un código?»: campo en PDFs y materiales para     */
/*      canjear la clave (POST /api/creditos/cupon/canjear).      */
/*   3) «Lo sentimos»: tarjeta cuando el cupón ya llegó a su      */
/*      límite de personas (o ya venció).                         */
/* Lo decide el servidor (una vez por persona y cupón, límite de  */
/* intentos); aquí solo se dibuja. La parte pura se prueba en     */
/* tests/club-cupones.test.js.                                    */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'));
  else root.ZOO_CUPONES = factory(root.ZOO_ICONOS);
})(typeof self !== 'undefined' ? self : this, function (ICONOS) {
  'use strict';

  var PRIORIDAD = 91;                                  // en la cola: después de los créditos regalados (90) y antes de la reseña (92)
  var MAX_AVISOS = 3;                                  // veces que se le enseña la tarjeta por cupón
  var CADA_MS = 24 * 3600 * 1000;                      // y a lo más una vez al día
  var CANAL_URL = 'https://whatsapp.com/channel/0029Vb7o61hDp2Q0dfsG0W1g';
  var RUTA_CAMPO = 'club-pdfs.html?codigo=1';

  var TEXTOS = {
    kickerCupon: 'Créditos gratis',
    tituloCupon: 'Hay un cupón para ti',
    pasoCanal: 'Únete a nuestro canal de WhatsApp: ahí compartimos la clave y otras ofertas.',
    pasoClave: 'Escribe la clave en PDFs y material → «¿Tienes un código?». Si ya la tienes, toca «Ya tengo la clave» y te llevamos directo al campo.',
    limitado: 'Disponible por tiempo limitado.',
    ahoraNo: 'Ahora no',
    yaTengo: 'Ya tengo la clave',
    unirme: 'Unirme al canal',
    kickerSentimos: 'Llegaste un poquito tarde',
    tituloSentimos: 'Lo sentimos',
    entendido: 'Entendido',
    irCanal: 'Ir al canal',
    animo: 'No te desanimes.',
    animoTexto: 'Estate atento a nuestro canal de WhatsApp: ahí compartimos más cupones y ofertas para que no te pierdas el próximo.',
    campoTitulo: '¿Tienes un código?',
    campoPlaceholder: 'Escribe tu código',
    campoBoton: 'Canjear',
    campoCanjeando: 'Canjeando…',
    campoVacio: 'Escribe el código para canjearlo.',
    campoAyuda: 'Los códigos se comparten en nuestro canal de WhatsApp.',
    errorGenerico: 'No se pudo canjear el cupón. Inténtalo de nuevo.'
  };

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function icono(nombre, tam) { return ICONOS && ICONOS.svg ? ICONOS.svg(nombre, { size: tam || 18 }) : ''; }
  function entero(v) { var n = Math.floor(Number(v)); return isFinite(n) && n > 0 ? n : 0; }

  /* ───────────────────────── Decisión (pura, se prueba en Node) ───────────────────────── */

  // Un cupón disponible por este identificador (no es la clave): cuántas veces y cuándo se le enseñó
  function claveAviso(uid, id) { return 'zoo_cupon_aviso_' + (uid || '') + '_' + id; }
  function leerAviso(almacen, uid, id) {
    try { var v = JSON.parse(almacen.getItem(claveAviso(uid, id)) || 'null'); return v && typeof v === 'object' ? { n: entero(v.n), t: Number(v.t) || 0 } : { n: 0, t: 0 }; } catch (e) { return { n: 0, t: 0 }; }
  }
  function anotarAviso(almacen, uid, ids, ahora) {
    (Array.isArray(ids) ? ids : []).forEach(function (id) {
      try { var a = leerAviso(almacen, uid, id); almacen.setItem(claveAviso(uid, id), JSON.stringify({ n: a.n + 1, t: ahora })); } catch (e) { /* sin almacenamiento: se le avisará otra vez */ }
    });
  }

  // ¿Se le enseña la tarjeta ahora? Hay un cupón que no ha canjeado, no se le ha enseñado más de 3 veces y hace más de un día de la última.
  function debeAvisar(datos, almacen, uid, ahora, opc) {
    var o = opc || {};
    if (!datos || datos.ok === false || datos.hay !== true) return false;
    var ids = Array.isArray(datos.ids) ? datos.ids : [];
    if (!ids.length) return false;
    var max = o.max === undefined ? MAX_AVISOS : o.max;
    var cada = o.cadaMs === undefined ? CADA_MS : o.cadaMs;
    return ids.some(function (id) {
      var a = almacen ? leerAviso(almacen, uid, id) : { n: 0, t: 0 };
      return a.n < max && (ahora - a.t) >= cada;
    });
  }

  // El texto de «Hay un cupón…»: uno solo o varios
  function textoCupon(datos) {
    var d = datos || {};
    var n = entero(d.cantidad) || 1;
    var cred = entero(d.creditos);
    if (n === 1) return 'Hay un <strong>cupón de ' + fmt(cred) + ' créditos</strong> disponible. Con ellos puedes canjear un material de PDFs y material sin costo.';
    return 'Hay <strong>' + fmt(n) + ' cupones</strong> disponibles, de hasta ' + fmt(cred) + ' créditos. Con ellos puedes canjear materiales de PDFs y material sin costo.';
  }

  // Lo que dice el servidor cuando una clave no sirve → { tipo: 'sentimos' | 'error', ... }
  function interpretarError(err) {
    var datos = (err && err.data) || {};
    var codigo = datos.codigo || '';
    if (codigo === 'cupon-agotado') return { tipo: 'sentimos', razon: 'agotado', limite: entero(datos.limite) };
    if (codigo === 'cupon-vencido') return { tipo: 'sentimos', razon: 'vencido', limite: 0 };
    return { tipo: 'error', mensaje: (err && err.message) || TEXTOS.errorGenerico, codigo: codigo };
  }

  function textoSentimos(info) {
    var i = info || {};
    if (i.razon === 'vencido') return 'Este cupón ya venció y tú llegaste después de que terminó.';
    return i.limite ? 'Este cupón ya alcanzó su límite de ' + fmt(i.limite) + ' personas y tú llegaste después de que se acabaron.' : 'Este cupón ya alcanzó su límite de personas y tú llegaste después de que se acabaron.';
  }

  // El mensaje de éxito junto al campo
  function textoExito(r) {
    var c = entero(r && r.creditos), s = entero(r && r.saldo);
    return '¡Listo! Recibiste ' + fmt(c) + (c === 1 ? ' crédito' : ' créditos') + '. Ahora tienes ' + fmt(s) + '.';
  }

  /* ───────────────────────── HTML ───────────────────────── */
  function tarjetaCuponHTML(datos) {
    return '<button type="button" class="zcp__x" data-zcc-ahora aria-label="' + esc(TEXTOS.ahoraNo) + '">' + icono('x', 18) + '</button>' +
      '<div class="zcp__trofeo">' + icono('zap', 42) + '</div>' +
      '<p class="zcp__kicker">' + esc(TEXTOS.kickerCupon) + '</p>' +
      '<h2 class="zcp__titulo" id="zcc-titulo">' + esc(TEXTOS.tituloCupon) + '</h2>' +
      '<p class="zcp__texto" id="zcc-desc">' + textoCupon(datos) + '</p>' +
      '<ol class="zcc__pasos"><li>' + esc(TEXTOS.pasoCanal) + '</li><li>' + esc(TEXTOS.pasoClave) + '</li></ol>' +
      (datos && datos.limitado ? '<p class="zcc__limite">' + esc(TEXTOS.limitado) + '</p>' : '') +
      '<div class="zcc__botones"><button type="button" class="zcc__btn zcc__btn--suave" data-zcc-ahora>' + esc(TEXTOS.ahoraNo) + '</button>' +
      '<button type="button" class="zcc__btn zcc__btn--suave" data-zcc-clave>' + esc(TEXTOS.yaTengo) + '</button>' +
      '<button type="button" class="zcp__btn zcc__btn" data-zcc-canal>' + icono('message-circle', 18) + '<span>' + esc(TEXTOS.unirme) + '</span></button></div>';
  }

  function tarjetaSentimosHTML(info) {
    return '<button type="button" class="zcp__x" data-zcc-entendido aria-label="' + esc(TEXTOS.entendido) + '">' + icono('x', 18) + '</button>' +
      '<div class="zcp__trofeo">' + icono('zap', 42) + '</div>' +
      '<p class="zcp__kicker">' + esc(TEXTOS.kickerSentimos) + '</p>' +
      '<h2 class="zcp__titulo" id="zcc-titulo">' + esc(TEXTOS.tituloSentimos) + '</h2>' +
      '<p class="zcp__texto" id="zcc-desc">' + esc(textoSentimos(info)) + '</p>' +
      '<p class="zcp__texto"><strong>' + esc(TEXTOS.animo) + '</strong> ' + esc(TEXTOS.animoTexto) + '</p>' +
      '<div class="zcc__botones"><button type="button" class="zcc__btn zcc__btn--suave" data-zcc-entendido>' + esc(TEXTOS.entendido) + '</button>' +
      '<button type="button" class="zcp__btn zcc__btn" data-zcc-canal>' + icono('message-circle', 18) + '<span>' + esc(TEXTOS.irCanal) + '</span></button></div>';
  }

  /* El campo «¿Tienes un código?» de PDFs y materiales. e: { texto, mensaje, tipo: 'ok' | 'error', ocupado } */
  function campoHTML(e) {
    var x = e || {};
    return '<section class="zcc-campo" id="zccCampo" aria-labelledby="zccCampoT">' +
      '<h2 class="zcc-campo__t" id="zccCampoT">' + esc(TEXTOS.campoTitulo) + '</h2>' +
      '<form class="zcc-campo__fila" id="zccForm" autocomplete="off" novalidate>' +
        '<label class="sr-only" for="zccClave">' + esc(TEXTOS.campoPlaceholder) + '</label>' +
        '<input type="text" id="zccClave" class="zcc-campo__in" maxlength="40" placeholder="' + esc(TEXTOS.campoPlaceholder) + '" value="' + esc(x.texto || '') + '" autocapitalize="characters" spellcheck="false"' + (x.ocupado ? ' disabled' : '') + ' aria-describedby="zccMsg">' +
        '<button type="submit" class="zcc-campo__btn" data-zcc-canjear' + (x.ocupado ? ' disabled' : '') + '>' + esc(x.ocupado ? TEXTOS.campoCanjeando : TEXTOS.campoBoton) + '</button></form>' +
      '<p class="zcc-campo__msg' + (x.tipo ? ' zcc-campo__msg--' + esc(x.tipo) : '') + '" id="zccMsg" role="status" aria-live="polite"' + (x.mensaje ? '' : ' hidden') + '>' + esc(x.mensaje || '') + '</p>' +
      '</section>';
  }

  /* ───────────────────────── Navegador ───────────────────────── */
  var SELECTOR_ENFOCABLE = 'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  var SELECTOR_VENTANAS = '#zoo-welcome-modal,#zoo-pay-waiting,.course-detail-modal,.webinar-popup-box,.zoo-guide-box,.zcp:not([data-zoo-cupon]),.pw-modal,.zoo-onboard,[role="dialog"][aria-modal="true"]:not([data-zoo-cupon])';

  function reducirMovimiento() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function hayVentanaAbierta() {
    if (typeof document === 'undefined') return false;
    if (document.visibilityState === 'hidden') return true;
    return Array.prototype.some.call(document.querySelectorAll(SELECTOR_VENTANAS), function (el) { return el.getClientRects().length > 0; });
  }
  function colaLibre(est) {
    return !!est && !est.corriendo && !(est.pendientes && est.pendientes.length) && !(est.retenciones && est.retenciones.length);
  }
  function esperarTurno(opc) {
    var o = opc || {};
    var setT = o.setTimeout || setTimeout;
    var ahora = o.ahora || Date.now;
    var intervalo = o.intervaloMs || 700;
    var seguidas = o.quietoVeces || 4;
    var minimo = o.minimoMs === undefined ? 2500 : o.minimoMs;
    var maximo = o.maximoMs || 180000;
    var inicio = ahora();
    return new Promise(function (resolver) {
      var quietas = 0;
      function revisar() {
        var transcurrido = ahora() - inicio;
        if (transcurrido > maximo) { resolver(false); return; }
        var libre = (!o.cola || typeof o.cola.estado !== 'function' || colaLibre(o.cola.estado())) && !(typeof o.hayVentana === 'function' && o.hayVentana());
        quietas = libre ? quietas + 1 : 0;
        if (quietas >= seguidas && transcurrido >= minimo) { resolver(true); return; }
        setT(revisar, intervalo);
      }
      setT(revisar, intervalo);
    });
  }

  // Tarjeta modal accesible (mismo diseño que las tarjetas de premio). html: contenido; devuelve { como: 'ahora-no' | 'clave' | 'canal' | 'entendido' }.
  function abrirTarjeta(html, tituloId) {
    return new Promise(function (resolver) {
      var previo = document.activeElement;
      var el = document.createElement('div');
      el.className = 'zcp zcp--bienvenida zcc';
      el.setAttribute('data-zoo-cupon', '1');
      el.innerHTML = '<div class="zcp__tarjeta" role="dialog" aria-modal="true" aria-labelledby="' + (tituloId || 'zcc-titulo') + '" aria-describedby="zcc-desc" data-zoo-cupon="1" tabindex="-1">' + html + '</div>';
      var tarjeta = el.firstChild;
      document.body.appendChild(el);
      document.documentElement.classList.add('zcp-lock');
      var cerrado = false;
      function enfocables() {
        return Array.prototype.filter.call(tarjeta.querySelectorAll(SELECTOR_ENFOCABLE), function (n) { return n.offsetParent !== null || n === document.activeElement; });
      }
      function cerrar(como) {
        if (cerrado) return;
        cerrado = true;
        document.removeEventListener('keydown', alTeclear, true);
        document.removeEventListener('focusin', alEnfocarFuera, true);
        function quitar() {
          el.remove();
          document.documentElement.classList.remove('zcp-lock');
          if (previo && previo.isConnected && typeof previo.focus === 'function') { try { previo.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
          resolver({ como: como });
        }
        if (reducirMovimiento()) quitar(); else { el.classList.add('zcp--saliendo'); setTimeout(quitar, 210); }
      }
      function alTeclear(ev) {
        if (cerrado) return;
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cerrar(tarjeta.querySelector('[data-zcc-entendido]') ? 'entendido' : 'ahora-no'); return; }
        if (ev.key !== 'Tab') return;
        var lista = enfocables();
        if (!lista.length) { ev.preventDefault(); return; }
        var primero = lista[0], ultimo = lista[lista.length - 1], activo = document.activeElement;
        if (!tarjeta.contains(activo)) { ev.preventDefault(); primero.focus(); }
        else if (ev.shiftKey && activo === primero) { ev.preventDefault(); ultimo.focus(); }
        else if (!ev.shiftKey && activo === ultimo) { ev.preventDefault(); primero.focus(); }
      }
      function alEnfocarFuera(ev) { if (!cerrado && !tarjeta.contains(ev.target)) { var l = enfocables(); if (l.length) l[l.length - 1].focus(); } }
      document.addEventListener('keydown', alTeclear, true);
      document.addEventListener('focusin', alEnfocarFuera, true);
      el.addEventListener('click', function (ev) {
        if (cerrado) return;
        if (ev.target.closest('[data-zcc-canal]')) { cerrar('canal'); return; }
        if (ev.target.closest('[data-zcc-clave]')) { cerrar('clave'); return; }
        if (ev.target.closest('[data-zcc-entendido]')) { cerrar('entendido'); return; }
        if (ev.target.closest('[data-zcc-ahora]')) cerrar('ahora-no');
      });
      setTimeout(function () { if (!cerrado) tarjeta.focus({ preventScroll: true }); }, 60);
    });
  }

  function abrirCanal() {
    try { var w = window.open(CANAL_URL, '_blank', 'noopener'); if (w) w.opener = null; else window.location.href = CANAL_URL; } catch (e) { window.location.href = CANAL_URL; }
  }

  // La tarjeta «Lo sentimos» (cuando la clave era de un cupón que ya llegó a su límite o venció)
  function mostrarSentimos(info) {
    return abrirTarjeta(tarjetaSentimosHTML(info)).then(function (r) { if (r.como === 'canal') abrirCanal(); return r; });
  }

  // Canjea una clave: devuelve una promesa con { ok: true, creditos, saldo } o { ok: false, tipo: 'sentimos' | 'error', ... }. Nunca rechaza.
  function canjear(club, clave) {
    var texto = String(clave == null ? '' : clave).trim();
    if (!texto) return Promise.resolve({ ok: false, tipo: 'error', mensaje: TEXTOS.campoVacio, codigo: 'vacio' });
    return Promise.resolve().then(function () { return club.apiFetch('/api/creditos/cupon/canjear', { method: 'POST', body: { clave: texto } }); })
      .then(function (r) { return { ok: true, creditos: entero(r && r.creditos), saldo: entero(r && r.saldo) }; }, function (e) { return Object.assign({ ok: false }, interpretarError(e)); });
  }

  /* Arranque en el Inicio. Espera su turno en la cola (después de todo lo demás) y muestra UNA tarjeta por visita.
     opc: { session, club, cola, almacen, ahora } → Promise<{ mostrado, como? }>. Nunca rechaza ni bloquea la página. */
  function iniciar(opc) {
    var o = opc || {};
    var club = o.club;
    var sesion = o.session || {};
    if (!club || typeof club.apiFetch !== 'function' || !sesion.uid || sesion.role === 'admin') return Promise.resolve({ mostrado: false });
    var almacen = o.almacen || (typeof localStorage !== 'undefined' ? localStorage : null);
    var ahora = o.ahora || Date.now;
    return Promise.resolve().then(function () { return club.apiFetch('/api/creditos/cupon-disponible'); }).then(function (datos) {
      if (!debeAvisar(datos, almacen, sesion.uid, ahora())) return { mostrado: false };
      return (o.esperar || esperarTurno)({ cola: o.cola, hayVentana: hayVentanaAbierta }).then(function (turno) {
        if (!turno) return { mostrado: false };
        // Justo antes de enseñarla se vuelve a preguntar al servidor: si el cupón ya se pausó, venció, se agotó o la persona ya lo canjeó, no sale
        var mostrar = function () {
          return Promise.resolve().then(function () { return club.apiFetch('/api/creditos/cupon-disponible'); }).then(function (frescos) {
            if (!frescos || frescos.hay !== true) return { como: 'descartado' };
            if (typeof window !== 'undefined') window.__zooTarjetaCarga = 'cupon';
            if (almacen) anotarAviso(almacen, sesion.uid, frescos.ids, ahora());
            return abrirTarjeta(tarjetaCuponHTML(frescos)).then(function (r) {
              if (r.como === 'canal') abrirCanal();
              else if (r.como === 'clave') window.location.href = RUTA_CAMPO;
              return r;
            });
          }, function () { return { como: 'descartado' }; });
        };
        // Una sola tarjeta por visita: si ya salió otra (créditos regalados), esta espera a la siguiente visita
        var vigente = function () { return typeof window === 'undefined' || !window.__zooTarjetaCarga; };
        if (o.cola && typeof o.cola.encolar === 'function') {
          return o.cola.encolar({ id: 'cupon-creditos', tipo: 'cupon', prioridad: PRIORIDAD, vigente: vigente, mostrar: mostrar }).then(function (res) { var como = res.resultado && res.resultado.como; return { mostrado: res.estado === 'mostrado' && como !== 'descartado', como: como }; });
        }
        if (!vigente()) return { mostrado: false };
        return mostrar().then(function (r) { return { mostrado: r.como !== 'descartado', como: r.como }; });
      });
    }).catch(function () { return { mostrado: false }; });
  }

  return {
    PRIORIDAD: PRIORIDAD, MAX_AVISOS: MAX_AVISOS, CADA_MS: CADA_MS, CANAL_URL: CANAL_URL, RUTA_CAMPO: RUTA_CAMPO, TEXTOS: TEXTOS,
    esc: esc, claveAviso: claveAviso, leerAviso: leerAviso, anotarAviso: anotarAviso, debeAvisar: debeAvisar, textoCupon: textoCupon, interpretarError: interpretarError,
    textoSentimos: textoSentimos, textoExito: textoExito, tarjetaCuponHTML: tarjetaCuponHTML, tarjetaSentimosHTML: tarjetaSentimosHTML, campoHTML: campoHTML,
    colaLibre: colaLibre, esperarTurno: esperarTurno, hayVentanaAbierta: hayVentanaAbierta, abrirTarjeta: abrirTarjeta, mostrarSentimos: mostrarSentimos, canjear: canjear, iniciar: iniciar
  };
});
