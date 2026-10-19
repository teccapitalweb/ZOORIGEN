/* Invitación de instalación en la pantalla pública de acceso. No cambia la sesión. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(null);
  else root.ZOO_INSTALAR_ACCESO = factory(root);
})(typeof window !== 'undefined' ? window : this, function (win) {
  'use strict';
  function modo(info) { return info.instalada ? 'instalada' : info.hayAviso ? 'aviso' : info.esIOS ? 'ios' : 'manual'; }
  if (!win || !win.document) return { modo: modo };
  var doc = win.document, aviso = null, modal = null, previo = null, mostrado = false, instalada = false;
  function info() {
    var ua = win.navigator.userAgent || '';
    return { instalada: instalada || !!(win.matchMedia && win.matchMedia('(display-mode: standalone)').matches) || win.navigator.standalone === true,
      hayAviso: !!aviso, esIOS: /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && win.navigator.maxTouchPoints > 1) };
  }
  function cerrar() {
    if (!modal) return;
    modal.remove(); modal = null; doc.removeEventListener('keydown', teclado);
    if (previo && previo.isConnected) previo.focus({ preventScroll: true });
  }
  function teclado(ev) {
    if (!modal) return;
    if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); return; }
    if (ev.key !== 'Tab') return;
    var botones = Array.from(modal.querySelectorAll('button:not([disabled])'));
    var primero = botones[0], ultimo = botones[botones.length - 1];
    if (ev.shiftKey && (doc.activeElement === primero || !modal.contains(doc.activeElement))) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && (doc.activeElement === ultimo || !modal.contains(doc.activeElement))) { ev.preventDefault(); primero.focus(); }
  }
  function pintarAccion() {
    if (!modal) return;
    var m = modo(info()), ayuda = modal.querySelector('[data-ayuda]'), boton = modal.querySelector('[data-instalar-app]');
    ayuda.innerHTML = m === 'ios' ? '<strong>En iPhone o iPad:</strong> abre esta página en Safari, toca Compartir y elige Agregar a pantalla de inicio.' : '<strong>Desde el navegador:</strong> abre el menú y elige Instalar Zoorigen o Agregar a pantalla de inicio. Si no aparece, abre esta página en Chrome, Edge o Safari.';
    ayuda.hidden = m === 'aviso'; boton.hidden = m !== 'aviso';
  }
  function mostrar() {
    if (modo(info()) === 'instalada' || modal) return;
    // Una sesión que ya está entrando al Club no recibe una tarjeta nueva encima.
    var card = doc.getElementById('authCard');
    if (!card || card.classList.contains('is-saliendo') || doc.getElementById('zv-pantalla')) return;
    mostrado = true; previo = doc.activeElement;
    modal = doc.createElement('div'); modal.className = 'zia'; modal.id = 'zoo-instalar-acceso';
    modal.innerHTML = '<div class="zia__fondo" data-cerrar-app></div><section class="zia__tarjeta" role="dialog" aria-modal="true" aria-labelledby="ziaTitulo" aria-describedby="ziaTexto">' +
      '<button type="button" class="zia__cerrar" data-cerrar-app aria-label="Cerrar invitación">&#215;</button>' +
      '<img class="zia__logo" src="../assets/img/icon-apple-touch.png" width="72" height="72" alt="">' +
      '<span class="zia__etiqueta">ZOORIGEN EN TU DISPOSITIVO</span><h2 id="ziaTitulo">Instala Zoorigen como app</h2>' +
      '<p id="ziaTexto">Tus cursos, retos y materiales con acceso directo desde tu pantalla de inicio.</p>' +
      '<p class="zia__ayuda" data-ayuda></p><button type="button" class="zia__instalar" data-instalar-app>Instalar ahora</button>' +
      '<button type="button" class="zia__despues" data-cerrar-app>Ahora no, continuar</button></section>';
    doc.body.appendChild(modal); pintarAccion();
    modal.querySelectorAll('[data-cerrar-app]').forEach(function (b) { b.addEventListener('click', cerrar); });
    modal.querySelector('[data-instalar-app]').addEventListener('click', async function () {
      if (!aviso) { pintarAccion(); return; }
      var evento = aviso, boton = this; boton.disabled = true;
      try { await evento.prompt(); await evento.userChoice; aviso = null; cerrar(); }
      catch (e) { aviso = null; boton.disabled = false; pintarAccion(); }
    });
    doc.addEventListener('keydown', teclado); modal.querySelector('.zia__cerrar').focus({ preventScroll: true });
  }
  win.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); aviso = ev; if (modal) pintarAccion(); });
  win.addEventListener('appinstalled', function () { instalada = true; aviso = null; cerrar(); });
  function iniciar() { win.setTimeout(function () { if (!mostrado) mostrar(); }, 1400); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar, { once: true }); else iniciar();
  return { modo: modo, mostrar: mostrar, cerrar: cerrar };
});
