/* ============================================================ */
/* TARJETAS DE PREMIO · Club VIP Zoorigen                         */
/*                                                                */
/*  1) "Curso completado": al generar el certificado de un curso   */
/*     NUEVO se muestra el XP ganado, el avance del bloque de 10   */
/*     cursos y el nivel (datos de GET /api/premios).              */
/*  2) "Premio de bienvenida +100 XP" (secuencia del miembro       */
/*     nuevo): respuesta de POST /api/premios/bienvenida.          */
/*                                                                */
/* Uso:                                                            */
/*   ZOO_CURSO_PREMIO.mostrar({ courseId, titulo, alVerCertificado })*/
/*   ZOO_CURSO_PREMIO.mostrarBienvenida(info, { sinMembresia })    */
/*                                                                */
/* Si el servidor falla o no hay dato, NO bloquea: abre directo el */
/* certificado. Lo del servidor manda: aquí solo se calcula lo que */
/* se muestra (casillas, "te faltan", subida de nivel).           */
/* Necesita cargados: admin-iconos.js y club-premios.js, y el CSS  */
/* club-curso-premio.css. Se prueba en Node:                       */
/*   tests/club-curso-premio.test.js                               */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'), require('./club-premios.js'));
  else root.ZOO_CURSO_PREMIO = factory(root.ZOO_ICONOS, root.ZOO_PREMIOS);
})(typeof self !== 'undefined' ? self : this, function (ICONOS, PREMIOS) {
  'use strict';

  var CURSOS_POR_BLOQUE = 10;
  var XP_BIENVENIDA = 100;

  /* ───────────────────────── Utilidades ───────────────────────── */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function fmt(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : (d === undefined ? 0 : d); }
  function icono(nombre, tam) { return ICONOS && ICONOS.svg ? ICONOS.svg(nombre, { size: tam || 18 }) : ''; }

  // Fórmula fija del servidor (el servidor es quien manda: esto solo sirve de respaldo y para las pruebas).
  function xpPorCurso(n) {
    n = Math.max(1, Math.round(num(n, 1)));
    return n % 10 === 0 ? 180 : 10 + 10 * (n % 10);
  }
  // Posición dentro del bloque de 10: 1..10
  function posicionEnBloque(n) { return ((Math.max(1, Math.round(num(n, 1))) - 1) % CURSOS_POR_BLOQUE) + 1; }

  function nivelesDe(datos) {
    return datos && Array.isArray(datos.niveles) && datos.niveles.length >= 2 ? datos.niveles : PREMIOS.NIVELES;
  }
  function nivelEn(niveles, xp) {
    var x = Math.max(0, num(xp)), n = niveles[0];
    niveles.forEach(function (c) { if (x >= c.desde) n = c; });
    return n;
  }

  // Resumen de nivel para la barra: { nombre, id, xp, pct, faltan, maximo, siguiente }
  function resumenNivel(niveles, xpTotal, nivelServidor) {
    var actual = nivelServidor && nivelServidor.id ? nivelServidor : nivelEn(niveles, xpTotal);
    var maximo = actual.id >= niveles.length;
    var desde = num(actual.desde), hasta = num(actual.hasta);
    var pct = maximo ? 100 : (hasta > desde ? Math.max(0, Math.min(100, Math.round(((xpTotal - desde) / (hasta - desde)) * 100))) : 0);
    var faltan = maximo ? 0 : (nivelServidor && isFinite(Number(nivelServidor.faltan)) ? Math.max(0, Number(nivelServidor.faltan)) : Math.max(0, hasta - xpTotal));
    var sig = maximo ? null : niveles[actual.id] || null;
    return { id: actual.id, nombre: String(actual.nombre || ''), xp: Math.max(0, num(xpTotal)), pct: pct, faltan: faltan, maximo: maximo, siguiente: sig ? String(sig.nombre) : null };
  }

  /* ───────────────────────── 1) Curso completado: datos ───────────────────────── */

  // datos: respuesta ya normalizada (ZOO_PREMIOS.normalizar). Devuelve null si no hay dato de ESE curso
  // (sin membresía, servidor sin el curso, etc.): en ese caso no se muestra tarjeta.
  function calcularCurso(datos, opc) {
    var o = opc || {};
    if (!datos || !datos.membresia || !datos.cursos || !Array.isArray(datos.cursos.lista)) return null;
    var id = String(o.courseId == null ? '' : o.courseId);
    var fila = null;
    datos.cursos.lista.forEach(function (c) { if (c.courseId === id) fila = c; });
    if (!fila) return null;
    var n = Math.max(1, Math.round(num(fila.n, 1)));
    var xp = fila.xp > 0 ? Math.round(fila.xp) : xpPorCurso(n);
    var niveles = nivelesDe(datos);
    var total = Math.max(0, num(datos.xp && datos.xp.total, num(datos.nivel && datos.nivel.xp)));
    var antes = nivelEn(niveles, Math.max(0, total - xp));
    var ahora = datos.nivel && datos.nivel.id ? datos.nivel : nivelEn(niveles, total);
    var resumen = resumenNivel(niveles, total, datos.nivel);
    var bloque = posicionEnBloque(n);
    var casillas = [];
    for (var k = 1; k <= CURSOS_POR_BLOQUE; k++) casillas.push({ num: k, hecha: k <= bloque, estrella: k === CURSOS_POR_BLOQUE });
    return {
      tipo: 'curso', n: n, xp: xp, titulo: String(o.titulo || fila.titulo || 'tu curso'),
      especial: n % CURSOS_POR_BLOQUE === 0, bloque: bloque, casillas: casillas,
      nivel: resumen,
      subio: ahora.id > antes.id ? { nombre: String(ahora.nombre) } : null
    };
  }

  /* ───────────────────────── 2) Bienvenida: datos ───────────────────────── */

  // resp: respuesta de POST /api/premios/bienvenida. Devuelve null si no hay nada que celebrar
  // (ya reclamado, error del servidor o respuesta rara): entonces la tarjeta NO sale.
  function calcularBienvenida(resp) {
    if (!resp || typeof resp !== 'object' || Array.isArray(resp) || resp.ok !== true || resp.yaReclamado === true) return null;
    var xp = Math.max(0, Math.round(num(resp.xp, XP_BIENVENIDA))) || XP_BIENVENIDA;
    var norm = PREMIOS.normalizar({ ok: true, membresia: true, nivel: resp.nivel, niveles: resp.niveles, xp: { total: num(resp.xpTotal, num(resp.nivel && resp.nivel.xp, xp)) } });
    if (!norm) return null;
    var total = norm.xp.total;
    return { tipo: 'bienvenida', xp: xp, nivel: resumenNivel(norm.niveles, total, resp.nivel && resp.nivel.id ? norm.nivel : null) };
  }

  /* ───────────────────────── Textos ───────────────────────── */

  var TEXTOS = {
    kickerCurso: 'Curso completado',
    kickerBienvenida: 'Bienvenida',
    tituloCurso: '¡Premio por tu curso!',
    botonCertificado: 'Ver mi certificado',
    botonBienvenida: 'Continuar',
    tituloBienvenida: '¡Premio de bienvenida!',
    textoBienvenida: 'Por ser nuevo en Zoorigen ya empiezas a sumar para subir de nivel.',
    notaSinMembresia: 'Tu XP queda guardado y ya lo ves en Retos y en Mis logros. Para jugar y seguir sumando necesitas tu membresía.',
    cerrar: 'Cerrar'
  };

  function tituloCurso(info) {
    return info.especial ? '¡Premio especial por tu curso ' + info.n + '!' : TEXTOS.tituloCurso;
  }
  function textoCurso(info) {
    var base = 'Completaste tu curso número <b>' + info.n + '</b> (<b>' + esc(info.titulo) + '</b>) ';
    if (info.especial) return base + 'y cerraste tu bloque de 10 cursos. Ganaste un premio especial de <b>+' + fmt(info.xp) + ' XP</b>. ¡Gran constancia!';
    return base + 'y ganaste XP para subir de nivel. Sigue así: cada curso que termines suma más.';
  }
  function textoLlevas(info) {
    if (info.especial) return 'Llevas <b>10</b> de <b>10</b> cursos. ¡Ya recibiste tu premio especial!';
    return 'Llevas <b>' + info.bloque + '</b> de <b>10</b> cursos. ¡Al décimo te espera un premio especial!';
  }

  /* ───────────────────────── HTML ───────────────────────── */

  function casillasHTML(info) {
    return '<ol class="zcp__casillas" role="img" aria-label="Llevas ' + (info.especial ? 10 : info.bloque) + ' de 10 cursos en este bloque">' +
      info.casillas.map(function (c) {
        var clases = 'zcp__casilla' + (c.hecha ? ' is-hecha' : '') + (c.estrella ? ' zcp__casilla--estrella' : '');
        return '<li class="' + clases + '" aria-hidden="true">' + (c.estrella ? icono('star', 14) : c.num) + '</li>';
      }).join('') + '</ol>';
  }

  function nivelHTML(nv) {
    var derecha = nv.maximo
      ? 'Llegaste al <b>nivel máximo</b>'
      : 'Te faltan <b>' + fmt(nv.faltan) + ' XP</b> para el siguiente nivel';
    return '<div class="zcp__nivel"><div class="zcp__nivel-fila"><span>Nivel ' + esc(nv.nombre) + ' · ' + fmt(nv.xp) + ' XP</span><span>' + derecha + '</span></div>' +
      '<div class="zcp__barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + nv.pct + '" aria-label="Avance hacia ' + (nv.siguiente ? esc(nv.siguiente) : 'el nivel máximo') + '"><i style="width:' + nv.pct + '%"></i></div></div>';
  }

  function cabeceraHTML(iconoNombre, kicker, xp, titulo, idTitulo) {
    return '<button type="button" class="zcp__x" data-zcp-cerrar aria-label="' + esc(TEXTOS.cerrar) + '">' + icono('x', 18) + '</button>' +
      '<div class="zcp__trofeo">' + icono(iconoNombre, 42) + '</div>' +
      '<p class="zcp__kicker">' + esc(kicker) + '</p>' +
      '<p class="zcp__xp"><span class="zcp__xp-num">+' + fmt(xp) + '</span><span class="zcp__xp-u">XP</span></p>' +
      '<h2 class="zcp__titulo" id="' + idTitulo + '">' + esc(titulo) + '</h2>';
  }

  // Cuerpo de la tarjeta (sin el velo). Todo texto que viene de fuera va escapado.
  function cursoHTML(info) {
    return cabeceraHTML('trophy', TEXTOS.kickerCurso, info.xp, tituloCurso(info), 'zcp-titulo') +
      '<p class="zcp__texto" id="zcp-desc">' + textoCurso(info) + '</p>' +
      casillasHTML(info) +
      '<p class="zcp__hint">' + textoLlevas(info) + '</p>' +
      (info.subio ? '<p class="zcp__subida" role="status">' + icono('sparkles', 18) + '<span>¡Subiste a Nivel ' + esc(info.subio.nombre) + '!</span></p>' : '') +
      nivelHTML(info.nivel) +
      '<button type="button" class="zcp__btn" data-zcp-accion>' + esc(TEXTOS.botonCertificado) + ' <span aria-hidden="true">→</span></button>';
  }

  function bienvenidaHTML(info, opc) {
    var o = opc || {};
    return cabeceraHTML('gift', TEXTOS.kickerBienvenida, info.xp, TEXTOS.tituloBienvenida, 'zcp-titulo') +
      '<p class="zcp__texto" id="zcp-desc">' + esc(TEXTOS.textoBienvenida) + '</p>' +
      (o.sinMembresia ? '<p class="zcp__nota">' + esc(TEXTOS.notaSinMembresia) + '</p>' : '') +
      nivelHTML(info.nivel) +
      '<button type="button" class="zcp__btn" data-zcp-accion>' + esc(TEXTOS.botonBienvenida) + '</button>';
  }

  /* ───────────────────────── Flujo (dependencias inyectables para probar) ───────────────────────── */

  // deps: { pedir(ruta, metodo, cuerpo, ms) → Promise<{ok,status,datos}>, abrir(info, opc) → Promise<{como}> }
  // Nunca rechaza: si algo falla, abre el certificado directo.
  function crearFlujo(deps) {
    function abrirDirecto(o) {
      try { if (o && typeof o.alVerCertificado === 'function') o.alVerCertificado(); } catch (e) { /* el certificado no debe depender de la tarjeta */ }
      return { tarjeta: false, abrio: true, como: 'directo' };
    }
    async function mostrar(o) {
      o = o || {};
      var info = null;
      try {
        var r = await deps.pedir('/api/premios', 'GET', null, o.esperaMs || 6000);
        if (r && r.ok) info = calcularCurso(PREMIOS.normalizar(r.datos), o);
      } catch (e) { info = null; }
      if (!info) return abrirDirecto(o);
      var res;
      try { res = await deps.abrir(info, { clase: 'curso', alAccion: o.alVerCertificado }); }
      catch (e) { return abrirDirecto(o); }
      return { tarjeta: true, abrio: res && res.como === 'accion', como: res ? res.como : 'cerrar' };
    }
    return { mostrar: mostrar };
  }

  /* ───────────────────────── Navegador ───────────────────────── */

  var SELECTOR_ENFOCABLE = 'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

  function reducirMovimiento() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  // Ventana modal accesible: role=dialog, foco atrapado, Esc, clic en el fondo y botón X. Devuelve una
  // promesa con { como: 'accion' | 'esc' | 'fondo' | 'x' }. La acción se ejecuta DENTRO del clic (así el
  // navegador permite abrir el certificado en otra pestaña).
  function abrirTarjeta(info, opc) {
    var o = opc || {};
    return new Promise(function (resolver) {
      var previo = document.activeElement;
      var el = document.createElement('div');
      el.className = 'zcp zcp--' + (info.tipo || 'curso');
      el.innerHTML = '<div class="zcp__tarjeta" role="dialog" aria-modal="true" aria-labelledby="zcp-titulo" aria-describedby="zcp-desc">' +
        (info.tipo === 'bienvenida' ? bienvenidaHTML(info, o) : cursoHTML(info)) + '</div>';
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
        if (reducirMovimiento()) quitar();
        else { el.classList.add('zcp--saliendo'); setTimeout(quitar, 210); }
      }
      function alTeclear(ev) {
        if (cerrado) return;
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cerrar('esc'); return; }
        if (ev.key !== 'Tab') return;
        var lista = enfocables();
        if (!lista.length) { ev.preventDefault(); return; }
        var primero = lista[0], ultimo = lista[lista.length - 1], activo = document.activeElement;
        if (!tarjeta.contains(activo)) { ev.preventDefault(); primero.focus(); }
        else if (ev.shiftKey && activo === primero) { ev.preventDefault(); ultimo.focus(); }
        else if (!ev.shiftKey && activo === ultimo) { ev.preventDefault(); primero.focus(); }
      }
      function alEnfocarFuera(ev) {
        if (!cerrado && !tarjeta.contains(ev.target)) { var l = enfocables(); if (l.length) l[l.length - 1].focus(); }
      }
      document.addEventListener('keydown', alTeclear, true);
      document.addEventListener('focusin', alEnfocarFuera, true);

      el.addEventListener('click', function (ev) {
        if (cerrado) return;
        if (ev.target === el) { cerrar('fondo'); return; }
        if (ev.target.closest('[data-zcp-cerrar]')) { cerrar('x'); return; }
        if (ev.target.closest('[data-zcp-accion]')) {
          try { if (typeof o.alAccion === 'function') o.alAccion(); } catch (e) { try { console.warn('[premio]', e); } catch (_) { /* sin consola */ } }
          cerrar('accion');
        }
      });
      setTimeout(function () {
        if (cerrado) return;
        var boton = tarjeta.querySelector('[data-zcp-accion]');
        if (boton) boton.focus({ preventScroll: true });
      }, 60);
    });
  }

  var api = {
    CURSOS_POR_BLOQUE: CURSOS_POR_BLOQUE, XP_BIENVENIDA: XP_BIENVENIDA, TEXTOS: TEXTOS,
    esc: esc, fmt: fmt, xpPorCurso: xpPorCurso, posicionEnBloque: posicionEnBloque, resumenNivel: resumenNivel,
    calcularCurso: calcularCurso, calcularBienvenida: calcularBienvenida,
    tituloCurso: tituloCurso, textoCurso: textoCurso, textoLlevas: textoLlevas,
    casillasHTML: casillasHTML, nivelHTML: nivelHTML, cursoHTML: cursoHTML, bienvenidaHTML: bienvenidaHTML,
    crearFlujo: crearFlujo
  };

  if (typeof document !== 'undefined') {
    var flujo = crearFlujo({
      pedir: function (ruta, metodo, cuerpo, ms) { return PREMIOS.pedir(ruta, metodo, cuerpo, ms); },
      abrir: abrirTarjeta
    });
    // { courseId, titulo, alVerCertificado } → Promise<{ tarjeta, abrio, como }>. Nunca rechaza.
    api.mostrar = flujo.mostrar;
    // info: resultado de calcularBienvenida. opc: { sinMembresia } → Promise<{ como }>
    api.mostrarBienvenida = function (info, opc) { return abrirTarjeta(info, opc || {}); };
    api.abrirTarjeta = abrirTarjeta;
  }
  return api;
});
