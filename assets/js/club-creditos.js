/* ============================================================ */
/* CLUB VIP ZOORIGEN · CRÉDITOS                                   */
/* El administrador regala créditos a mano (100, 200, 300, 400 u  */
/* otra cantidad); la persona los canjea por materiales de «PDFs  */
/* y materiales» que no sean de ningún curso (cada uno cuesta 100)*/
/*                                                                */
/*  1) Tarjeta de felicitación «has ganado 300 créditos»: entra a */
/*     la cola de ventanas (club-cola.js) con la prioridad MÁS    */
/*     BAJA, así que sale cuando terminan las demás tarjetas de   */
/*     bienvenida y avisos; nunca se encima. El aviso pendiente   */
/*     vive en el servidor (GET /api/creditos/estado y            */
/*     POST /api/creditos/aviso-visto), no en este navegador.     */
/*  2) Piezas de «PDFs y materiales»: pastilla «Tus créditos: N»  */
/*     siempre visible (con su ayuda), insignia                   */
/*     «Canjeable por 100 créditos», botón Canjear y confirmación */
/*     (POST /api/creditos/canjear).                              */
/* Lo que se muestra lo decide el servidor; aquí solo se dibuja.  */
/* La parte pura se prueba en tests/club-creditos.test.js         */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'));
  else root.ZOO_CREDITOS = factory(root.ZOO_ICONOS);
})(typeof self !== 'undefined' ? self : this, function (ICONOS) {
  'use strict';

  var COSTO = 100;
  var PRIORIDAD = 90;                      // más baja que todas las de la cola (otro = 80)
  var RUTA_CANJEABLES = 'club-pdfs.html?canjeables=1';
  var TEXTOS = {
    kicker: 'Regalo de Zoorigen',
    titulo: function (n) { return 'Felicidades, has ganado ' + fmt(n) + (n === 1 ? ' crédito' : ' créditos'); },
    // «Alcanzan para canjear 3 materiales.» · «Alcanzan para canjear 2 materiales y te sobran 50 créditos de saldo.»
    texto: function (n) { return fraseAlcance(n); },
    entendido: 'Entendido',
    canjear: 'Canjear',
    insignia: function (costo) { return 'Canjeable por ' + fmt(costo) + ' créditos'; },
    // Cuando el material también se abre por otra vía (retos o membresía): «o canjéalo por 100 créditos»
    alternativa: function (costo) { return 'o canjéalo por ' + fmt(costo) + ' créditos'; },
    desbloqueado: 'Desbloqueado',
    faltan: 'Te faltan créditos',
    saldo: function (n) { return 'Tienes ' + fmt(n) + (n === 1 ? ' crédito' : ' créditos'); },
    // Libros: con créditos se puede escoger UN solo libro por cuenta (el servidor lo hace cumplir)
    libroUno: 'Canjeable con créditos: puedes escoger UN solo libro',
    libroYa: 'Ya canjeaste tu libro con créditos',
    libroRecuerda: 'Recuerda: con créditos puedes escoger un solo libro',
    libroAyuda: 'Con créditos puedes escoger un libro.',
    libroConfirmarTitulo: 'Canjear libro',
    libroConfirmarTexto: function (titulo, costo) { return 'Solo puedes canjear UN libro con créditos y no se puede cambiar. Se descontarán ' + fmt(costo) + ' créditos y el libro ' + titulo + ' quedará desbloqueado para ti. ¿Quieres este libro?'; },
    libroConfirmarSi: 'Sí, canjear este libro',
    confirmarTitulo: 'Canjear material',
    confirmarTexto: function (costo) { return 'Se descontarán ' + fmt(costo) + ' créditos y el material quedará desbloqueado para ti.'; }
  };

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function icono(nombre, tam) { return ICONOS && ICONOS.svg ? ICONOS.svg(nombre, { size: tam || 18 }) : ''; }
  function entero(v) { var n = Math.floor(Number(v)); return isFinite(n) && n > 0 ? n : 0; }

  /* ───────────────────────── Piezas puras ───────────────────────── */

  // Cuántos materiales alcanzan con esta cantidad (cada uno cuesta 100) y cuánto sobra; con singular y plural
  function fraseAlcance(cantidad) {
    var n = entero(cantidad);
    var materiales = Math.floor(n / COSTO), sobra = n % COSTO;
    if (!materiales) return 'Todavía no alcanzan para un material (cada uno cuesta ' + COSTO + '), pero ya son parte de tu saldo.';
    var m = materiales + (materiales === 1 ? ' material' : ' materiales');
    if (!sobra) return 'Alcanzan para canjear ' + m + '.';
    return 'Alcanzan para canjear ' + m + ' y te ' + (sobra === 1 ? 'sobra 1 crédito' : 'sobran ' + sobra + ' créditos') + ' de saldo.';
  }

  // ¿Hay algo que celebrar? estado = respuesta de GET /api/creditos/estado
  function hayAviso(estado) { return !!(estado && estado.ok === true && entero(estado.avisoPendiente) > 0); }

  // El texto de «Felicidades»: usa lo que dice el servidor (lo regalado desde la última vez que lo viste: un regalo de 300, o dos de 100 y 200)
  function tarjetaHTML(estado) {
    var n = entero(estado && estado.avisoPendiente) || COSTO;
    return '<button type="button" class="zcp__x" data-zcr-entendido aria-label="' + esc(TEXTOS.entendido) + '">' + icono('x', 18) + '</button>' +
      '<div class="zcp__trofeo">' + icono('gift', 42) + '</div>' +
      '<p class="zcp__kicker">' + esc(TEXTOS.kicker) + '</p>' +
      '<p class="zcp__xp"><span class="zcp__xp-num">+' + fmt(n) + '</span><span class="zcp__xp-u">' + (n === 1 ? 'crédito' : 'créditos') + '</span></p>' +
      '<h2 class="zcp__titulo" id="zcr-titulo">' + esc(TEXTOS.titulo(n)) + '</h2>' +
      '<p class="zcp__texto" id="zcr-desc">' + esc(TEXTOS.texto(n)) + '</p>' +
      '<p class="zcp__texto zcr__recuerda" id="zcr-libro">' + esc(TEXTOS.libroRecuerda) + '</p>' +
      '<div class="zcr__botones"><button type="button" class="zcr__btn zcr__btn--suave" data-zcr-entendido>' + esc(TEXTOS.entendido) + '</button>' +
      '<button type="button" class="zcp__btn zcr__btn" data-zcr-canjear>' + icono('wallet', 18) + '<span>' + esc(TEXTOS.canjear) + '</span></button></div>';
  }

  // Idle de la cola: nada corriendo, nada esperando y ninguna retención (una ventana de bienvenida que aún decide qué mostrar)
  function colaLibre(est) {
    return !!est && !est.corriendo && !(est.pendientes && est.pendientes.length) && !(est.retenciones && est.retenciones.length);
  }

  // Espera su turno: resuelve cuando la cola lleva `quietoVeces` revisiones seguidas libres y no hay ventana abierta.
  // opc: { cola, hayVentana(): bool, intervaloMs, quietoVeces, minimoMs, maximoMs, setTimeout, ahora } → Promise<boolean> (false = se rindió)
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

  // Botón de canje de un material: texto, si se puede y por qué no
  function estadoCanje(item, saldo, costo) {
    var c = entero(costo) || COSTO;
    if (!item) return { visible: false };
    if (item.desbloqueado) return { visible: true, desbloqueado: true, puede: false, rotulo: TEXTOS.desbloqueado };
    var puede = entero(saldo) >= c;
    return { visible: true, desbloqueado: false, puede: puede, rotulo: puede ? TEXTOS.canjear : TEXTOS.faltan, falta: puede ? 0 : c - entero(saldo) };
  }

  // Insignia y botón que se suman a una tarjeta de material canjeable. clave = «libro:id», «pdf:id» o «drive:id»
  // opc.alternativa: el material también se abre con retos o con membresía; el texto dice «o canjéalo por 100 créditos»
  // opc.libro: es un libro (solo se puede canjear UNO con créditos) · opc.yaCanjeoLibro: la cuenta ya canjeó el suyo: el botón queda desactivado
  function canjeHTML(item, saldo, costo, opc) {
    var e = estadoCanje(item, saldo, costo);
    if (!e.visible) return '';
    if (e.desbloqueado) return '<div class="zcr-canje"><span class="zcr-ins zcr-ins--ok">' + icono('circle-check', 14) + '<span>' + esc(TEXTOS.desbloqueado) + '</span></span></div>';
    if (opc && opc.libro && opc.yaCanjeoLibro) {
      return '<div class="zcr-canje zcr-canje--libro"><span class="zcr-ins zcr-ins--ya">' + icono('info', 14) + '<span>' + esc(TEXTOS.libroYa) + '</span></span>' +
        '<button type="button" class="zcr-btn is-falta" disabled aria-disabled="true" title="' + esc(TEXTOS.libroYa) + '">' + esc(TEXTOS.canjear) + '</button></div>';
    }
    var nota = opc && opc.libro ? '<span class="zcr-uno">' + esc(TEXTOS.libroUno) + '</span>' : '';
    return '<div class="zcr-canje' + (nota ? ' zcr-canje--libro' : '') + '">' + nota + '<span class="zcr-ins">' + icono('wallet', 14) + '<span>' + esc(opc && opc.alternativa ? TEXTOS.alternativa(item.costo || costo || COSTO) : TEXTOS.insignia(item.costo || costo || COSTO)) + '</span></span>' +
      '<button type="button" class="zcr-btn' + (e.puede ? '' : ' is-falta') + '" data-canjear="' + esc(item.clave) + '"' + (e.puede ? '' : ' aria-disabled="true" title="Necesitas ' + fmt(item.costo || costo || COSTO) + ' créditos"') + '>' + esc(e.rotulo) + '</button></div>';
  }

  var AYUDA = '100 créditos = 1 material. Canjea los materiales que dicen «o canjéalo por 100 créditos». También se abren resolviendo retos (con membresía). Con créditos puedes escoger un libro.';

  /* Pastilla «Tus créditos: N», siempre visible en «PDFs y materiales» (también con 0). Al pulsarla muestra la ayuda; con 100 o más
     ofrece «Ver materiales canjeables». opc: { soloCanjeables, ayudaAbierta, reserva } — reserva dibuja solo el espacio (mientras carga). */
  function pastillaHTML(saldo, opc) {
    var o = opc || {};
    if (o.reserva) return '<div class="zcr-pastilla zcr-pastilla--reserva" id="zcrPastilla" aria-hidden="true"></div>';
    var n = entero(saldo);
    var abierta = !!o.ayudaAbierta;
    var ver = o.soloCanjeables
      ? '<a class="zcr-pastilla__ver" href="club-pdfs.html" data-zcr-ver-todos>Ver todos los materiales</a>'
      : (n >= COSTO ? '<button type="button" class="zcr-pastilla__ver" data-zcr-ver-canjeables>Ver materiales canjeables</button>' : '');
    return '<div class="zcr-pastilla' + (n > 0 ? ' zcr-pastilla--hay' : '') + '" id="zcrPastilla" data-saldo="' + n + '">' +
      '<button type="button" class="zcr-pastilla__btn" data-zcr-ayuda aria-expanded="' + abierta + '" aria-controls="zcrAyuda" title="' + esc(AYUDA) + '">' +
        icono('wallet', 20) + '<span class="zcr-pastilla__txt">Tus créditos: <strong>' + fmt(n) + '</strong></span>' + icono('info', 16) + '</button>' +
      ver +
      '<p class="zcr-pastilla__ayuda" id="zcrAyuda" role="note"' + (abierta ? '' : ' hidden') + '>' + esc(AYUDA) + '</p></div>';
  }

  /* ───────────────────────── Navegador ───────────────────────── */
  var SELECTOR_ENFOCABLE = 'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  var SELECTOR_VENTANAS = '#zoo-welcome-modal,#zoo-pay-waiting,.course-detail-modal,.webinar-popup-box,.zoo-guide-box,.zcp:not([data-zoo-creditos]),.pw-modal,.zoo-onboard,[role="dialog"][aria-modal="true"]:not([data-zoo-creditos])';

  function reducirMovimiento() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function hayVentanaAbierta() {
    if (typeof document === 'undefined') return false;
    if (document.visibilityState === 'hidden') return true;
    return Array.prototype.some.call(document.querySelectorAll(SELECTOR_VENTANAS), function (el) { return el.getClientRects().length > 0; });
  }

  // Tarjeta modal accesible (mismo diseño que las tarjetas de premio): foco atrapado, Escape = Entendido y reduce el movimiento.
  // Devuelve una promesa con { como: 'entendido' | 'canjear' }. Un clic en el fondo NO la cierra (el aviso no se pierde por error).
  function abrirTarjeta(estado) {
    return new Promise(function (resolver) {
      var previo = document.activeElement;
      var el = document.createElement('div');
      el.className = 'zcp zcp--bienvenida zcr';
      el.setAttribute('data-zoo-creditos', '1');
      el.innerHTML = '<div class="zcp__tarjeta" role="dialog" aria-modal="true" aria-labelledby="zcr-titulo" aria-describedby="zcr-desc" data-zoo-creditos="1">' + tarjetaHTML(estado) + '</div>';
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
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cerrar('entendido'); return; }
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
        if (ev.target.closest('[data-zcr-canjear]')) { cerrar('canjear'); return; }
        if (ev.target.closest('[data-zcr-entendido]')) cerrar('entendido');
      });
      setTimeout(function () { if (cerrado) return; var b = tarjeta.querySelector('[data-zcr-canjear]'); if (b) b.focus({ preventScroll: true }); }, 60);
    });
  }

  // Confirmación antes de gastar créditos: promesa con true / false
  // opc.libro: confirmación de un libro («solo UN libro con créditos, no se puede cambiar»)
  function confirmarCanje(titulo, costo, opc) {
    var libro = !!(opc && opc.libro);
    return new Promise(function (resolver) {
      var previo = document.activeElement;
      var el = document.createElement('div');
      el.className = 'zcr-conf'; el.setAttribute('data-zoo-creditos', '1');
      el.innerHTML = '<div class="zcr-conf__caja" role="alertdialog" aria-modal="true" aria-labelledby="zcr-conf-t" aria-describedby="zcr-conf-d" data-zoo-creditos="1">' +
        '<h2 id="zcr-conf-t">' + esc(libro ? TEXTOS.libroConfirmarTitulo : TEXTOS.confirmarTitulo) + '</h2><p class="zcr-conf__mat">' + esc(titulo) + '</p><p id="zcr-conf-d">' + esc(libro ? TEXTOS.libroConfirmarTexto('«' + titulo + '»', costo || COSTO) : TEXTOS.confirmarTexto(costo || COSTO)) + '</p>' +
        '<div class="zcr__botones"><button type="button" class="zcr__btn zcr__btn--suave" data-no>Mejor no</button><button type="button" class="zcr__btn zcr__btn--oro" data-si>' + esc(libro ? TEXTOS.libroConfirmarSi : 'Canjear') + '</button></div></div>';
      document.body.appendChild(el);
      var listo = false;
      function fin(r) {
        if (listo) return; listo = true;
        document.removeEventListener('keydown', teclas, true);
        el.remove();
        if (previo && previo.isConnected && typeof previo.focus === 'function') { try { previo.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
        resolver(r);
      }
      function teclas(ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fin(false); return; }
        if (ev.key !== 'Tab') return;
        var l = el.querySelectorAll('button'); var p = l[0], u = l[l.length - 1];
        if (!el.contains(document.activeElement)) { ev.preventDefault(); p.focus(); }
        else if (ev.shiftKey && document.activeElement === p) { ev.preventDefault(); u.focus(); }
        else if (!ev.shiftKey && document.activeElement === u) { ev.preventDefault(); p.focus(); }
      }
      document.addEventListener('keydown', teclas, true);
      el.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-si]')) fin(true);
        else if (ev.target.closest('[data-no]') || ev.target === el) fin(false);
      });
      setTimeout(function () { var b = el.querySelector('[data-si]'); if (b) b.focus({ preventScroll: true }); }, 30);
    });
  }

  /* Felicitación: espera su turno en la cola y se muestra UNA vez por regalo (el servidor recuerda que ya se vio).
     opc: { session, club, cola, ir(url) } → Promise<{ mostrado, como? }>. Nunca rechaza ni bloquea la página. */
  function iniciarAviso(opc) {
    var o = opc || {};
    var club = o.club;
    if (!club || typeof club.apiFetch !== 'function' || (o.session && o.session.role === 'admin')) return Promise.resolve({ mostrado: false });
    return Promise.resolve().then(function () { return club.apiFetch('/api/creditos/estado'); }).then(function (estado) {
      if (!hayAviso(estado)) return { mostrado: false };
      return esperarTurno({ cola: o.cola, hayVentana: hayVentanaAbierta }).then(function (turno) {
        if (!turno) return { mostrado: false };
        var mostrar = function () {
          if (typeof window !== 'undefined') window.__zooTarjetaCarga = 'creditos';   // una sola tarjeta por visita: el cupón y la reseña esperan a la siguiente
          return abrirTarjeta(estado).then(function (r) {
            return Promise.resolve().then(function () { return club.apiFetch('/api/creditos/aviso-visto', { method: 'POST', body: {} }); }).catch(function () { /* se avisará otra vez */ }).then(function () {
              if (r.como === 'canjear') { if (typeof o.ir === 'function') o.ir(RUTA_CANJEABLES); else if (typeof window !== 'undefined') window.location.href = RUTA_CANJEABLES; }
              return r;
            });
          });
        };
        if (o.cola && typeof o.cola.encolar === 'function') {
          return o.cola.encolar({ id: 'creditos-regalo', tipo: 'creditos', prioridad: PRIORIDAD, mostrar: mostrar }).then(function (res) { return { mostrado: res.estado === 'mostrado', como: res.resultado && res.resultado.como }; });
        }
        return mostrar().then(function (r) { return { mostrado: true, como: r.como }; });
      });
    }).catch(function () { return { mostrado: false }; });
  }

  return {
    COSTO: COSTO, PRIORIDAD: PRIORIDAD, RUTA_CANJEABLES: RUTA_CANJEABLES, TEXTOS: TEXTOS,
    esc: esc, fmt: fmt, hayAviso: hayAviso, tarjetaHTML: tarjetaHTML, colaLibre: colaLibre, esperarTurno: esperarTurno, estadoCanje: estadoCanje,
    canjeHTML: canjeHTML, pastillaHTML: pastillaHTML, fraseAlcance: fraseAlcance, AYUDA: AYUDA, abrirTarjeta: abrirTarjeta, confirmarCanje: confirmarCanje, iniciarAviso: iniciarAviso, hayVentanaAbierta: hayVentanaAbierta
  };
});
