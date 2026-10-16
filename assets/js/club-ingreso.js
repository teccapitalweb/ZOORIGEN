/* ============================================================ */
/* PANTALLA DE INGRESO · Club VIP Zoorigen                       */
/*                                                                */
/* Reglas puras de la pantalla única "Iniciar sesión / Crear      */
/* cuenta" (pages/club-login.html): qué pestaña se abre, cómo se  */
/* limpia el código de invitación de la URL y qué se valida antes */
/* de hablar con Firebase. No toca el navegador: se prueba en     */
/* Node con tests/club-ingreso.test.js.                           */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_INGRESO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TEXTOS = {
    faltanLogin: 'Escribe tu correo y tu contraseña.',
    correoInvalido: 'Escribe un correo válido, por ejemplo tucorreo@ejemplo.com.',
    faltaNombre: 'Escribe tu nombre completo.',
    faltanRegistro: 'Escribe tu correo y una contraseña.',
    claveCorta: 'La contraseña debe tener al menos 8 caracteres.',
    sinTerminos: 'Para crear tu cuenta debes aceptar los Términos y condiciones y el Aviso de privacidad.',
    sinTerminosGoogle: 'Marca primero la casilla de los Términos y condiciones y el Aviso de privacidad para registrarte con Google.'
  };

  var MIN_CLAVE = 8;

  function texto(v) { return String(v == null ? '' : v); }

  // Pestaña que se abre al llegar. Un enlace de invitación (?ref=) o ?tab=crear / #crear abre "Crear cuenta";
  // cualquier otra llegada (incluidos ?curso= y ?verificado=1) abre "Iniciar sesión".
  function tabInicial(search, hash) {
    var q = texto(search).replace(/^\?/, '');
    var pares = {};
    q.split('&').forEach(function (p) {
      if (!p) return;
      var i = p.indexOf('=');
      var k = i < 0 ? p : p.slice(0, i);
      var v = i < 0 ? '' : p.slice(i + 1);
      try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { /* queda como vino */ }
      if (!(k in pares)) pares[k] = v;
    });
    var t = texto(pares.tab).toLowerCase();
    if (t === 'crear' || t === 'registro' || t === 'register') return 'crear';
    if (t === 'entrar' || t === 'login') return 'entrar';
    var h = texto(hash).toLowerCase();
    if (/^#crear/.test(h) || /^#registro/.test(h)) return 'crear';
    if (/^#entrar/.test(h) || /^#login/.test(h)) return 'entrar';
    if (texto(pares.verificado) === '1') return 'entrar';
    if (texto(pares.ref) !== '') return 'crear';
    return 'entrar';
  }

  // Código de invitación de la URL: solo letras, números y guion (del tipo ZOO-A1B2C3). Nada más se guarda.
  function refDeUrl(search) {
    var m = /[?&]ref=([^&#]*)/.exec(texto(search));
    if (!m) return '';
    var v = m[1];
    try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { /* queda como vino */ }
    return v.replace(/[^A-Za-z0-9-]/g, '').toUpperCase().slice(0, 40);
  }

  function correoValido(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto(v).trim()); }

  // Validación de "Iniciar sesión". Devuelve { ok: true } o { ok: false, campo, msg }.
  function validarLogin(d) {
    d = d || {};
    var correo = texto(d.email).trim();
    if (!correo || !texto(d.password)) return { ok: false, campo: correo ? 'password' : 'email', msg: TEXTOS.faltanLogin };
    if (!correoValido(correo)) return { ok: false, campo: 'email', msg: TEXTOS.correoInvalido };
    return { ok: true };
  }

  // Validación de "Crear cuenta" con correo. Los términos son obligatorios.
  function validarRegistro(d) {
    d = d || {};
    var correo = texto(d.email).trim();
    if (!texto(d.name).trim()) return { ok: false, campo: 'name', msg: TEXTOS.faltaNombre };
    if (!correo || !texto(d.password)) return { ok: false, campo: correo ? 'password' : 'email', msg: TEXTOS.faltanRegistro };
    if (!correoValido(correo)) return { ok: false, campo: 'email', msg: TEXTOS.correoInvalido };
    if (texto(d.password).length < MIN_CLAVE) return { ok: false, campo: 'password', msg: TEXTOS.claveCorta };
    if (d.terminos !== true) return { ok: false, campo: 'terminos', msg: TEXTOS.sinTerminos };
    return { ok: true };
  }

  // Registrarse con Google: lo único que se exige antes de abrir Google son los términos.
  function validarGoogleCrear(d) {
    d = d || {};
    if (d.terminos !== true) return { ok: false, campo: 'terminos', msg: TEXTOS.sinTerminosGoogle };
    return { ok: true };
  }

  // Búsqueda de la URL para una pestaña, conservando el resto de lo que traía (?ref=, ?curso=, ...).
  function urlConTab(search, tab) {
    var q = texto(search).replace(/^\?/, '').split('&').filter(function (p) { return p && !/^tab=/.test(p); });
    q.push('tab=' + (tab === 'crear' ? 'crear' : 'entrar'));
    return '?' + q.join('&');
  }

  return {
    TEXTOS: TEXTOS, MIN_CLAVE: MIN_CLAVE,
    tabInicial: tabInicial, refDeUrl: refDeUrl, correoValido: correoValido,
    validarLogin: validarLogin, validarRegistro: validarRegistro, validarGoogleCrear: validarGoogleCrear, urlConTab: urlConTab
  };
});
