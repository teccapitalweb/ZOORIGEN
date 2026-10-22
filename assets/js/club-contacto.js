/* ============================================================ */
/* CLUB VIP ZOORIGEN · DATOS DE CONTACTO                         */
/* WhatsApp, Instagram y correo de ayuda. Los edita la persona   */
/* administradora en Panel > Configuración > Contacto y viven en */
/* el servidor (GET /api/config/contacto, con caché).            */
/*                                                               */
/* Cómo funciona: cada página YA trae los datos de siempre en    */
/* sus enlaces, así que si el servidor no responde (o aún no     */
/* tiene la ruta) no cambia nada y nunca falta un enlace. Cuando */
/* llega un valor válido, este archivo reescribe los enlaces que */
/* apuntan al WhatsApp, Instagram o correo de siempre, también   */
/* los que se dibujan después. Solo toca esos enlaces.           */
/* La parte pura se prueba en tests/club-contacto.test.js        */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.ZOO_CONTACTO = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  // Los datos de siempre: coinciden con los que están escritos en las páginas
  var DEFECTO = Object.freeze({
    whatsappNumero: '5212361113237',
    instagram: 'https://www.instagram.com/zoorigen.mexico1/',
    correo: 'zooorigen@gmail.com'
  });
  var CLAVE = 'zoo_contacto_v1';
  var VIGENCIA_MS = 10 * 60 * 1000;
  var RUTA = '/api/config/contacto';
  var actual = { whatsappNumero: DEFECTO.whatsappNumero, instagram: DEFECTO.instagram, correo: DEFECTO.correo };

  var RE_NUMERO = /^\d{10,15}$/;
  var RE_INSTAGRAM = /^https:\/\/www\.instagram\.com\/[A-Za-z0-9._]{1,30}\/$/;
  var RE_CORREO = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;

  /* ── Parte pura ── */

  // Respuesta del servidor → datos seguros. Cada campo malo se queda con el valor de siempre.
  function validar(r) {
    var d = r && typeof r === 'object' ? r : {};
    var numero = String(d.whatsappNumero == null ? '' : d.whatsappNumero).replace(/\D/g, '');
    return {
      whatsappNumero: RE_NUMERO.test(numero) ? numero : DEFECTO.whatsappNumero,
      instagram: RE_INSTAGRAM.test(String(d.instagram || '')) ? String(d.instagram) : DEFECTO.instagram,
      correo: RE_CORREO.test(String(d.correo || '')) ? String(d.correo).toLowerCase() : DEFECTO.correo
    };
  }

  // ¿A qué dato de siempre apunta este enlace? 'wa' | 'ig' | 'correo' | null
  function tipoDeHref(href) {
    var h = String(href || '');
    if (/^https:\/\/wa\.me\/\d{10,15}(?:[?#].*)?$/.test(h)) return h.indexOf('https://wa.me/' + DEFECTO.whatsappNumero) === 0 ? 'wa' : null;
    if (h.indexOf('https://www.instagram.com/zoorigen.mexico1') === 0) return 'ig';
    if (h.toLowerCase().indexOf('mailto:' + DEFECTO.correo) === 0) return 'correo';
    return null;
  }

  // Nuevo href para un enlace del tipo dado. Conserva el texto del mensaje de WhatsApp (?text=...).
  function reescribirHref(href, tipo, datos) {
    var d = datos || actual;
    var h = String(href || '');
    if (tipo === 'wa') { var m = /^https:\/\/wa\.me\/\d+(.*)$/.exec(h); return 'https://wa.me/' + d.whatsappNumero + (m ? m[1] : ''); }
    if (tipo === 'ig') return d.instagram;
    if (tipo === 'correo') { var q = /^mailto:[^?]*(\?.*)?$/i.exec(h); return 'mailto:' + d.correo + (q && q[1] ? q[1] : ''); }
    return h;
  }

  /* ── Parte del navegador ── */
  function aplicar(raiz) {
    if (typeof document === 'undefined') return 0;
    var base = raiz || document;
    var n = 0;
    var enlaces = base.querySelectorAll ? base.querySelectorAll('a[href], a[data-zoo-contacto]') : [];
    for (var i = 0; i < enlaces.length; i++) {
      var a = enlaces[i];
      var tipo = a.getAttribute('data-zoo-contacto');
      var original = a.getAttribute('data-zoo-contacto-href');
      if (!tipo) {
        tipo = tipoDeHref(a.getAttribute('href'));
        if (!tipo) continue;
        original = a.getAttribute('href');
        a.setAttribute('data-zoo-contacto', tipo);
        a.setAttribute('data-zoo-contacto-href', original);
      }
      var nuevo = reescribirHref(original, tipo, actual);
      if (a.getAttribute('href') !== nuevo) { a.setAttribute('href', nuevo); n += 1; }
      if (tipo === 'correo' && a.hasAttribute('data-zoo-contacto-texto')) a.textContent = actual.correo;
    }
    return n;
  }

  function leerCache() {
    try {
      var t = JSON.parse(root.sessionStorage.getItem(CLAVE));
      if (t && typeof t.t === 'number' && t.v) return { t: t.t, v: validar(t.v) };
    } catch (e) { /* sin almacenamiento */ }
    return null;
  }
  function guardarCache(v) { try { root.sessionStorage.setItem(CLAVE, JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* sin almacenamiento */ } }

  function apiBase() {
    try { if (typeof WEBHOOK_SERVER_URL !== 'undefined' && WEBHOOK_SERVER_URL) return WEBHOOK_SERVER_URL; } catch (e) { /* nada */ }
    return 'https://zoorigen-webhook-production.up.railway.app';
  }

  var vigilante = null;
  function vigilar() {
    if (vigilante || typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body) return;
    var pendiente = false;
    vigilante = new MutationObserver(function () {
      if (pendiente) return;
      pendiente = true;
      setTimeout(function () { pendiente = false; aplicar(document); }, 60);
    });
    vigilante.observe(document.body, { childList: true, subtree: true });
  }

  function iniciar() {
    var guardado = leerCache();
    if (guardado) { actual = guardado.v; }
    aplicar(document);
    vigilar();
    if (guardado && Date.now() - guardado.t < VIGENCIA_MS) return Promise.resolve(actual);
    if (typeof fetch !== 'function') return Promise.resolve(actual);
    var control = typeof AbortController === 'function' ? new AbortController() : null;
    var reloj = setTimeout(function () { if (control) control.abort(); }, 4000);
    return fetch(apiBase() + RUTA, { signal: control ? control.signal : undefined })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) {
        clearTimeout(reloj);
        if (!json || json.ok !== true) return actual;
        actual = validar(json);
        guardarCache(actual);
        aplicar(document);
        return actual;
      })
      .catch(function () { clearTimeout(reloj); return actual; }); // sin red o sin ruta: se quedan los de siempre
  }

  if (typeof document !== 'undefined' && typeof module === 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
  }

  return {
    DEFECTO: DEFECTO, validar: validar, tipoDeHref: tipoDeHref, reescribirHref: reescribirHref, aplicar: aplicar, iniciar: iniciar,
    waUrl: function (texto) { return 'https://wa.me/' + actual.whatsappNumero + (texto ? '?text=' + encodeURIComponent(texto) : ''); },
    instagram: function () { return actual.instagram; }, correo: function () { return actual.correo; }, vigente: function () { return { whatsappNumero: actual.whatsappNumero, instagram: actual.instagram, correo: actual.correo }; }
  };
});
