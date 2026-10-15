/* ============================================================ */
/* CLUB VIP ZOORIGEN · VISTA PREVIA PARA QUIEN NO ES MIEMBRO     */
/*                                                                */
/* Principio: la persona sin membresía VE todo (listas, tarjetas, */
/* portadas, pestañas, campos) y puede explorar, pero no puede    */
/* USAR nada: cualquier acción que dé un resultado, descargue,    */
/* guarde, publique, comente, reaccione, abra un recurso o        */
/* contacte a alguien muestra el aviso de membresía y la lleva a  */
/* Suscripción. Los miembros y administradores conservan el       */
/* comportamiento de siempre: para ellos todo aquí es transparente */
/* (requiereMembresia devuelve true sin mostrar nada).            */
/*                                                                */
/* IMPORTANTE: esto es EXPERIENCIA, no seguridad. Lo que protege  */
/* el contenido de verdad son las reglas del servidor y de        */
/* Firestore. Lo que aparece "difuminado" aquí NO lleva el dato   */
/* real debajo: son marcadores de posición.                       */
/*                                                                */
/* La parte pura se prueba en Node (tests/club-paywall.test.js).  */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_PAYWALL = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RUTA_SUSCRIPCION = 'club-suscripcion.html';
  var TITULO_AVISO = 'Función de membresía';
  var RETARDO_NAVEGAR = 1300;   // ms que se ve el aviso antes de llevar a Suscripción

  /* ───────── funciones puras ───────── */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* Misma regla que usa el resto del sitio (club.js hasActiveMembership + club-shell esMiembroVip):
     plan activo o cancelado con acceso vigente, o administrador. `club` es ZOORIGEN_CLUB (opcional). */
  function esMiembro(sesion, club) {
    if (!sesion || typeof sesion !== 'object') return false;
    if (sesion.role === 'admin') return true;
    if (club && typeof club.hasActiveMembership === 'function') {
      try { if (club.hasActiveMembership(sesion)) return true; } catch (e) { /* se usa el estado de la sesión */ }
    }
    return sesion.planStatus === 'active' || sesion.planStatus === 'cancelled_active';
  }

  /* Texto del aviso al intentar usar algo. nombreAccion: "Ver equivalencia de condición corporal", "Publicar en el foro"... */
  function textoAviso(nombreAccion) {
    var n = String(nombreAccion == null ? '' : nombreAccion).trim();
    if (!n) return 'Esta función es para miembros. Activa tu membresía para usarla.';
    return '«' + n + '» es una función de membresía. Activa la tuya para usarla.';
  }

  var CANDADO = '<svg class="pw-ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  var CORONA = '<svg class="pw-ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>';

  /* Bloque que ocupa el lugar de un resultado: candado, título, texto y botón. */
  function bloqueoHTML(texto, opciones) {
    var o = opciones || {};
    var t = texto == null || texto === '' ? 'Captura tus datos con calma. Para ver el resultado necesitas una membresía activa.' : texto;
    return '<div class="tool-paywall" role="note">' +
      '<div class="tool-paywall__ic">' + CANDADO + '</div>' +
      '<h3>' + esc(o.titulo || 'Disponible para miembros') + '</h3>' +
      '<p>' + esc(t) + '</p>' +
      '<a class="tool-paywall__btn" href="' + esc(o.href || RUTA_SUSCRIPCION) + '">' + esc(o.boton || 'Hazte miembro') + '</a>' +
      '</div>';
  }

  /* Marcadores de posición (barras grises) para lo que va difuminado: NUNCA lleva texto real. */
  function marcadorHTML(lineas, anchos) {
    var n = Math.max(1, Math.min(12, Math.floor(Number(lineas)) || 3));
    var a = anchos && anchos.length ? anchos : [92, 78, 64, 86, 70];
    var out = '';
    for (var i = 0; i < n; i++) out += '<span class="pw-barra" style="width:' + (Number(a[i % a.length]) || 80) + '%"></span>';
    return '<span class="pw-barras" aria-hidden="true">' + out + '</span>';
  }

  /* Un contenido difuminado con una caja central de llamado a la acción (como la vista previa del directorio). */
  function vistaBorrosaHTML(contenidoHTML, opciones) {
    var o = opciones || {};
    return '<div class="pw-vista' + (o.compacta ? ' pw-vista--compacta' : '') + '">' +
      '<div class="pw-vista__contenido" aria-hidden="true">' + (contenidoHTML || '') + '</div>' +
      '<div class="pw-vista__cta"><div class="pw-vista__caja" role="note">' +
        CORONA +
        '<strong>' + esc(o.titulo || 'Disponible para miembros') + '</strong>' +
        (o.texto ? '<p>' + esc(o.texto) + '</p>' : '') +
        '<a class="tool-paywall__btn" href="' + esc(o.href || RUTA_SUSCRIPCION) + '">' + esc(o.boton || 'Hazte miembro') + '</a>' +
      '</div></div></div>';
  }

  /* Chip pequeño con candado para tarjetas (PDFs, libros, cursos...). */
  function chipCandadoHTML(texto) {
    return '<span class="pw-chip">' + CANDADO + esc(texto || 'Solo miembros') + '</span>';
  }

  function etiquetaEjemploHTML(texto) {
    return '<span class="pw-ejemplo">' + esc(texto || 'Ejemplo') + '</span>';
  }

  /* Aviso de "vista previa" que va arriba de una pantalla. */
  function avisoVistaPreviaHTML(texto) {
    return '<div class="pw-aviso" role="note">' + CANDADO + '<span>' + texto + '</span></div>';
  }

  function modalHTML(o) {
    o = o || {};
    return '<div class="pw-modal__fondo" data-pw-fondo>' +
      '<div class="pw-modal" role="dialog" aria-modal="true" aria-labelledby="pwModalTitulo" aria-describedby="pwModalTexto">' +
        '<div class="pw-modal__ic">' + CORONA + '</div>' +
        '<h2 id="pwModalTitulo">' + esc(o.titulo || 'Contenido exclusivo para miembros') + '</h2>' +
        '<p id="pwModalTexto">' + esc(o.texto || 'Hazte miembro para abrirlo.') + '</p>' +
        '<div class="pw-modal__acc">' +
          '<a class="tool-paywall__btn" id="pwVerPlanes" href="' + esc(o.href || RUTA_SUSCRIPCION) + '">' + esc(o.botonPrincipal || 'Ver planes') + '</a>' +
          '<button type="button" class="pw-modal__seguir" id="pwSeguir">' + esc(o.botonSecundario || 'Seguir explorando') + '</button>' +
        '</div>' +
      '</div></div>';
  }

  var API = {
    RUTA_SUSCRIPCION: RUTA_SUSCRIPCION, TITULO_AVISO: TITULO_AVISO, RETARDO_NAVEGAR: RETARDO_NAVEGAR,
    esc: esc, esMiembro: esMiembro, textoAviso: textoAviso, bloqueoHTML: bloqueoHTML, marcadorHTML: marcadorHTML,
    vistaBorrosaHTML: vistaBorrosaHTML, chipCandadoHTML: chipCandadoHTML, etiquetaEjemploHTML: etiquetaEjemploHTML,
    avisoVistaPreviaHTML: avisoVistaPreviaHTML, modalHTML: modalHTML
  };

  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* PANTALLA                                                      */
  /* ============================================================ */
  var estado = { sesion: null, club: null, miembro: false, ruta: RUTA_SUSCRIPCION, navegando: false, listo: false };

  /* Se llama una vez por página, después de requireAuth(). Devuelve true si la persona es miembro. */
  function iniciar(o) {
    o = o || {};
    estado.sesion = o.sesion || null;
    estado.club = o.club || (typeof ZOORIGEN_CLUB !== 'undefined' ? ZOORIGEN_CLUB : null);
    estado.ruta = o.ruta || RUTA_SUSCRIPCION;
    estado.miembro = esMiembro(estado.sesion, estado.club);
    estado.listo = true;
    estado.navegando = false;
    return estado.miembro;
  }
  function miembro() { return estado.miembro; }

  function toast(titulo, texto) {
    var t = document.getElementById('pwToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pwToast'; t.className = 'pw-toast';
      t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.innerHTML = CANDADO + '<div><strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></div>';
    t.classList.add('is-on');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('is-on'); }, 4200);
  }

  function irASuscripcion() {
    if (estado.navegando) return;
    estado.navegando = true;
    setTimeout(function () { window.location.href = estado.ruta; }, RETARDO_NAVEGAR);
  }

  /* Úsalo justo cuando la persona intenta USAR algo. Devuelve true si puede continuar (es miembro).
     Si no: muestra el aviso y, salvo opciones.sinNavegar, la lleva a Suscripción. */
  function requiereMembresia(nombreAccion, opciones) {
    if (estado.miembro) return true;
    var o = opciones || {};
    cerrarModal();
    toast(TITULO_AVISO, o.texto || textoAviso(nombreAccion));
    if (!o.sinNavegar) irASuscripcion();
    return false;
  }

  /* Ventana con "Ver planes" y "Seguir explorando". Para abrir un recurso (PDF, libro, clase). */
  var abierto = null;
  function cerrarModal() {
    if (!abierto) return;
    document.removeEventListener('keydown', abierto.teclas, true);
    var volver = abierto.volverA;
    abierto.nodo.remove();
    document.body.classList.remove('pw-noscroll');
    abierto = null;
    if (volver && typeof volver.focus === 'function') { try { volver.focus(); } catch (e) { /* nada */ } }
  }
  function modalPaywall(o) {
    if (estado.miembro) return true;
    cerrarModal();
    var cont = document.createElement('div');
    cont.innerHTML = modalHTML(o);
    var nodo = cont.firstChild;
    document.body.appendChild(nodo);
    document.body.classList.add('pw-noscroll');
    var principal = nodo.querySelector('#pwVerPlanes'), seguir = nodo.querySelector('#pwSeguir');
    var teclas = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); cerrarModal(); return; }
      if (e.key === 'Tab') {
        var orden = [principal, seguir];
        var i = orden.indexOf(document.activeElement);
        if (i === -1) { e.preventDefault(); principal.focus(); return; }
        e.preventDefault();
        orden[(i + (e.shiftKey ? orden.length - 1 : 1)) % orden.length].focus();
      }
    };
    document.addEventListener('keydown', teclas, true);
    abierto = { nodo: nodo, teclas: teclas, volverA: document.activeElement };
    seguir.addEventListener('click', cerrarModal);
    nodo.addEventListener('mousedown', function (e) { if (e.target === nodo) cerrarModal(); });
    principal.focus();
    return false;
  }

  /* Atajo: en un contenedor, cualquier clic dentro de `selector` pide membresía (captura antes que otros manejadores). */
  function bloquear(contenedor, selector, nombreAccion, opciones) {
    if (!contenedor || estado.miembro) return;
    contenedor.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest(selector) : null;
      if (!t || !contenedor.contains(t)) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      var nombre = typeof nombreAccion === 'function' ? nombreAccion(t) : nombreAccion;
      requiereMembresia(nombre, opciones);
    }, true);
  }

  API.iniciar = iniciar;
  API.miembro = miembro;
  API.toast = toast;
  API.requiereMembresia = requiereMembresia;
  API.modalPaywall = modalPaywall;
  API.cerrarModal = cerrarModal;
  API.bloquear = bloquear;
  return API;
});
