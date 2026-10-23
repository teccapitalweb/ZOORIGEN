/* ============================================================ */
/* CLUB VIP ZOORIGEN · RESEÑA DEL CURSO                           */
/* Después de sacar el certificado de un curso, una tarjeta       */
/* pregunta «¿Qué te pareció el curso?»: de 1 a 5 estrellas y un  */
/* comentario opcional (hasta 500 letras). Botones: Enviar (no se */
/* activa hasta elegir estrellas) y Ahora no.                      */
/*                                                                */
/*  · Sale después de la felicitación del certificado, en la cola */
/*    de ventanas (club-cola.js) y sin encimarse con otras.        */
/*  · Si dice «Ahora no», se le vuelve a preguntar en visitas      */
/*    posteriores, hasta 3 veces en total por curso.              */
/*  · Solo cursos terminados desde que existe la función; a quien */
/*    ya los había terminado no se le pregunta.                    */
/*  · La reseña la guarda el servidor (POST /api/resenas), que     */
/*    comprueba que la persona sí terminó ese curso. Una por       */
/*    persona y curso. Solo la administración las lee.             */
/* Usa el diseño de las tarjetas de premio (club-curso-premio.css) */
/* y club-resenas.css. La lógica de decisión se prueba en Node:   */
/*   tests/club-resenas.test.js                                    */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'));
  else root.ZOO_RESENAS = factory(root.ZOO_ICONOS);
})(typeof self !== 'undefined' ? self : this, function (ICONOS) {
  'use strict';

  var DESDE_MS = Date.parse('2026-10-23T00:00:00-06:00');   // solo cursos terminados desde que existe esta función
  var OMISIONES_MAX = 3;                                      // «Ahora no»: se pregunta hasta 3 veces en total por curso
  var MAX_COMENTARIO = 500;
  var PRIORIDAD = 92;                                         // en la cola: al final, después de los créditos regalados (90) y del cupón (91)
  var FRASES = ['', 'No me gustó', 'Podría mejorar', 'Está bien', 'Me gustó', '¡Excelente!'];
  var TEXTOS = {
    kicker: 'Tu opinión cuenta',
    titulo: '¿Qué te pareció el curso?',
    sub: 'Tu opinión nos ayuda a mejorar',
    ayuda: 'Toca una estrella para calificar',
    etiqueta: 'Cuéntanos más (opcional)',
    placeholder: '¿Qué te gustó? ¿Qué podemos mejorar?',
    enviar: 'Enviar',
    enviando: 'Enviando…',
    ahoraNo: 'Ahora no',
    gracias: '¡Gracias por tu opinión!',
    graciasTexto: 'Tu reseña nos ayuda a mejorar los cursos.',
    error: 'No se pudo enviar tu reseña. Inténtalo de nuevo.'
  };

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icono(nombre, tam) { return ICONOS && ICONOS.svg ? ICONOS.svg(nombre, { size: tam || 18 }) : ''; }

  /* ───────────────────────── Decisión (pura, se prueba en Node) ───────────────────────── */

  // ¿A qué curso preguntarle ahora? terminados: [{ cursoId, curso, emitidoMs }] (del servidor); mias: [{ cursoId }] (ya calificados);
  // omisiones(cursoId): cuántas veces dijo «Ahora no». Devuelve el más reciente que cumple, o null.
  function elegirPendiente(terminados, mias, omisiones, opc) {
    var o = opc || {};
    var desde = o.desde === undefined ? DESDE_MS : o.desde;
    var maximo = o.maximo === undefined ? OMISIONES_MAX : o.maximo;
    var hechas = {};
    (Array.isArray(mias) ? mias : []).forEach(function (m) { if (m && m.cursoId) hechas[m.cursoId] = true; });
    var lista = (Array.isArray(terminados) ? terminados : []).filter(function (t) {
      if (!t || !t.cursoId || hechas[t.cursoId]) return false;
      if (!(Number(t.emitidoMs) >= desde)) return false;
      var n = typeof omisiones === 'function' ? Number(omisiones(t.cursoId)) || 0 : 0;
      return n < maximo;
    });
    lista.sort(function (a, b) { return Number(b.emitidoMs) - Number(a.emitidoMs); });
    return lista[0] || null;
  }

  function claveOmision(uid, cursoId) { return 'zoo_resena_omitida_' + (uid || '') + '_' + cursoId; }
  function leerOmisiones(almacen, uid, cursoId) {
    try { return Number(almacen.getItem(claveOmision(uid, cursoId))) || 0; } catch (e) { return 0; }
  }
  function sumarOmision(almacen, uid, cursoId) {
    try { almacen.setItem(claveOmision(uid, cursoId), String(leerOmisiones(almacen, uid, cursoId) + 1)); } catch (e) { /* sin almacenamiento: se le preguntará otra vez */ }
  }

  function frase(estrellas) { return FRASES[Math.min(Math.max(Math.round(Number(estrellas) || 0), 0), 5)] || ''; }

  /* ───────────────────────── HTML de la tarjeta ───────────────────────── */
  function estrellasHTML() {
    return [1, 2, 3, 4, 5].map(function (n) {
      return '<button type="button" class="zrs__est" role="radio" aria-checked="false" data-e="' + n + '" aria-label="' + n + (n === 1 ? ' estrella' : ' estrellas') + '">' + icono('star', 38) + '</button>';
    }).join('');
  }

  function tarjetaHTML(curso) {
    var titulo = String((curso && curso.curso) || '').trim();
    return '<div class="zrs__cuerpo" data-zrs-cuerpo>' +
      '<div class="zcp__trofeo">' + icono('star', 42) + '</div>' +
      '<p class="zcp__kicker">' + esc(TEXTOS.kicker) + '</p>' +
      '<h2 class="zcp__titulo" id="zrs-titulo">' + esc(TEXTOS.titulo) + '</h2>' +
      '<p class="zcp__texto zrs__curso" id="zrs-desc">' + (titulo ? esc(titulo) + '. ' : '') + esc(TEXTOS.sub) + '</p>' +
      '<div class="zrs__estrellas" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">' + estrellasHTML() + '</div>' +
      '<p class="zrs__frase" id="zrs-frase" aria-live="polite">' + esc(TEXTOS.ayuda) + '</p>' +
      '<label class="zrs__lbl" for="zrs-com">' + esc(TEXTOS.etiqueta) + '</label>' +
      '<textarea class="zrs__com" id="zrs-com" maxlength="' + MAX_COMENTARIO + '" rows="3" placeholder="' + esc(TEXTOS.placeholder) + '"></textarea>' +
      '<p class="zrs__cont"><span id="zrs-n">0</span>/' + MAX_COMENTARIO + '</p>' +
      '<p class="zrs__error" id="zrs-error" role="alert" hidden></p>' +
      '<div class="zrs__botones"><button type="button" class="zrs__btn zrs__btn--suave" data-zrs-ahora>' + esc(TEXTOS.ahoraNo) + '</button>' +
      '<button type="button" class="zcp__btn zrs__btn" data-zrs-enviar disabled>' + esc(TEXTOS.enviar) + '</button></div></div>';
  }

  function graciasHTML() {
    return '<div class="zrs__gracias" role="status"><div class="zcp__trofeo">' + icono('circle-check', 42) + '</div><h2 class="zcp__titulo" id="zrs-titulo">' + esc(TEXTOS.gracias) + '</h2>' +
      '<p class="zcp__texto" id="zrs-desc">' + esc(TEXTOS.graciasTexto) + '</p></div>';
  }

  /* ───────────────────────── Navegador ───────────────────────── */
  var SELECTOR_ENFOCABLE = 'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  var SELECTOR_VENTANAS = '#zoo-welcome-modal,#zoo-pay-waiting,.course-detail-modal,.webinar-popup-box,.zoo-guide-box,.zcp:not([data-zoo-resena]),.pw-modal,.zoo-onboard,[role="dialog"][aria-modal="true"]:not([data-zoo-resena])';

  function reducirMovimiento() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function hayVentanaAbierta() {
    if (typeof document === 'undefined') return false;
    if (document.visibilityState === 'hidden') return true;
    return Array.prototype.some.call(document.querySelectorAll(SELECTOR_VENTANAS), function (el) { return el.getClientRects().length > 0; });
  }

  // Cola libre: nada corriendo, nada esperando y ninguna retención
  function colaLibre(est) {
    return !!est && !est.corriendo && !(est.pendientes && est.pendientes.length) && !(est.retenciones && est.retenciones.length);
  }

  // Espera su turno: resuelve true cuando la cola lleva varias revisiones seguidas libres y no hay ventana abierta (false = se rindió)
  function esperarTurno(opc) {
    var o = opc || {};
    var setT = o.setTimeout || setTimeout;
    var ahora = o.ahora || Date.now;
    var intervalo = o.intervaloMs || 700;
    var seguidas = o.quietoVeces || 4;
    var minimo = o.minimoMs === undefined ? 2500 : o.minimoMs;
    var maximo = o.maximoMs || 600000;
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

  // La tarjeta. Devuelve una promesa con { como: 'enviada' | 'ahora-no' }. Un clic en el fondo NO la cierra; Escape = Ahora no.
  // enviar(estrellas, comentario) debe devolver una promesa: si falla, la tarjeta se queda abierta con el aviso.
  function abrirTarjeta(curso, enviar) {
    return new Promise(function (resolver) {
      var previo = document.activeElement;
      var el = document.createElement('div');
      el.className = 'zcp zcp--bienvenida zrs';
      el.setAttribute('data-zoo-resena', '1');
      el.innerHTML = '<div class="zcp__tarjeta" role="dialog" aria-modal="true" aria-labelledby="zrs-titulo" aria-describedby="zrs-desc" data-zoo-resena="1">' + tarjetaHTML(curso) + '</div>';
      var tarjeta = el.firstChild;
      document.body.appendChild(el);
      document.documentElement.classList.add('zcp-lock');
      var cerrado = false, estrellas = 0, enviando = false;
      var botones = Array.prototype.slice.call(tarjeta.querySelectorAll('.zrs__est'));
      var btnEnviar = tarjeta.querySelector('[data-zrs-enviar]');
      var btnAhora = tarjeta.querySelector('[data-zrs-ahora]');
      var com = tarjeta.querySelector('#zrs-com');
      var fraseEl = tarjeta.querySelector('#zrs-frase');
      var error = tarjeta.querySelector('#zrs-error');

      function pintar(n) {
        botones.forEach(function (b) {
          var e = Number(b.getAttribute('data-e'));
          b.classList.toggle('zrs__est--on', e <= n);
          b.setAttribute('aria-checked', String(e === estrellas));
        });
      }
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
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); if (!enviando) cerrar('ahora-no'); return; }
        if (ev.key !== 'Tab') return;
        var lista = enfocables();
        if (!lista.length) { ev.preventDefault(); return; }
        var primero = lista[0], ultimo = lista[lista.length - 1], activo = document.activeElement;
        if (!tarjeta.contains(activo)) { ev.preventDefault(); primero.focus(); }
        else if (ev.shiftKey && activo === primero) { ev.preventDefault(); ultimo.focus(); }
        else if (!ev.shiftKey && activo === ultimo) { ev.preventDefault(); primero.focus(); }
      }
      function alEnfocarFuera(ev) { if (!cerrado && !tarjeta.contains(ev.target)) { var l = enfocables(); if (l.length) l[l.length - 1].focus(); } }

      botones.forEach(function (b) {
        b.addEventListener('click', function () {
          estrellas = Number(b.getAttribute('data-e')); pintar(estrellas);
          fraseEl.textContent = frase(estrellas); btnEnviar.disabled = enviando;
        });
        b.addEventListener('mouseenter', function () { pintar(Number(b.getAttribute('data-e'))); });
        b.addEventListener('mouseleave', function () { pintar(estrellas); });
        b.addEventListener('focus', function () { pintar(Number(b.getAttribute('data-e'))); });
        b.addEventListener('blur', function () { pintar(estrellas); });
      });
      com.addEventListener('input', function () { var n = tarjeta.querySelector('#zrs-n'); if (n) n.textContent = String(com.value.length); });
      btnAhora.addEventListener('click', function () { if (!enviando) cerrar('ahora-no'); });
      btnEnviar.addEventListener('click', function () {
        if (!estrellas || enviando) return;
        enviando = true; btnEnviar.disabled = true; btnAhora.disabled = true; btnEnviar.textContent = TEXTOS.enviando; error.hidden = true;
        Promise.resolve().then(function () { return enviar(estrellas, com.value); }).then(function () {
          var cuerpo = tarjeta.querySelector('[data-zrs-cuerpo]');
          if (cuerpo) cuerpo.outerHTML = graciasHTML();
          setTimeout(function () { cerrar('enviada'); }, 1700);
        }, function (e) {
          enviando = false; btnEnviar.disabled = false; btnAhora.disabled = false; btnEnviar.textContent = TEXTOS.enviar;
          error.textContent = (e && e.message) || TEXTOS.error; error.hidden = false;
        });
      });
      document.addEventListener('keydown', alTeclear, true);
      document.addEventListener('focusin', alEnfocarFuera, true);
      tarjeta.setAttribute('tabindex', '-1');
      setTimeout(function () { if (!cerrado) tarjeta.focus({ preventScroll: true }); }, 60);   // el foco entra a la tarjeta sin marcar ninguna estrella
    });
  }

  /* Arranque en cada página del Club que lo pide. Espera su turno en la cola y pregunta por UN curso a la vez.
     opc: { session, club, cola, almacen } → Promise<{ mostrado, como? }>. Nunca rechaza ni bloquea la página. */
  function iniciar(opc) {
    var o = opc || {};
    var club = o.club;
    var sesion = o.session || {};
    if (!club || typeof club.apiFetch !== 'function' || !sesion.uid || sesion.role === 'admin') return Promise.resolve({ mostrado: false });
    var almacen = o.almacen || (typeof localStorage !== 'undefined' ? localStorage : null);
    var omisiones = function (cursoId) { return almacen ? leerOmisiones(almacen, sesion.uid, cursoId) : 0; };
    return Promise.resolve().then(function () { return club.apiFetch('/api/resenas/mias'); }).then(function (datos) {
      var pendiente = elegirPendiente(datos && datos.terminados, datos && datos.resenas, omisiones);
      if (!pendiente) return { mostrado: false };
      return esperarTurno({ cola: o.cola, hayVentana: hayVentanaAbierta }).then(function (turno) {
        if (!turno) return { mostrado: false };
        var mostrar = function () {
          if (typeof window !== 'undefined') window.__zooTarjetaCarga = 'resena';   // una sola tarjeta por visita
          return abrirTarjeta(pendiente, function (estrellas, comentario) {
            return club.apiFetch('/api/resenas', { method: 'POST', body: { cursoId: pendiente.cursoId, estrellas: estrellas, comentario: comentario } });
          }).then(function (r) {
            if (r.como !== 'enviada' && almacen) sumarOmision(almacen, sesion.uid, pendiente.cursoId);
            return r;
          });
        };
        var vigente = function () { return typeof window === 'undefined' || !window.__zooTarjetaCarga; };
        if (o.cola && typeof o.cola.encolar === 'function') {
          return o.cola.encolar({ id: 'resena-' + pendiente.cursoId, tipo: 'resena', prioridad: PRIORIDAD, vigente: vigente, mostrar: mostrar }).then(function (res) { return { mostrado: res.estado === 'mostrado', como: res.resultado && res.resultado.como }; });
        }
        return mostrar().then(function (r) { return { mostrado: true, como: r.como }; });
      });
    }).catch(function () { return { mostrado: false }; });
  }

  return {
    DESDE_MS: DESDE_MS, OMISIONES_MAX: OMISIONES_MAX, MAX_COMENTARIO: MAX_COMENTARIO, PRIORIDAD: PRIORIDAD, FRASES: FRASES, TEXTOS: TEXTOS,
    esc: esc, elegirPendiente: elegirPendiente, claveOmision: claveOmision, leerOmisiones: leerOmisiones, sumarOmision: sumarOmision, frase: frase,
    tarjetaHTML: tarjetaHTML, graciasHTML: graciasHTML, colaLibre: colaLibre, esperarTurno: esperarTurno, hayVentanaAbierta: hayVentanaAbierta,
    abrirTarjeta: abrirTarjeta, iniciar: iniciar
  };
});
