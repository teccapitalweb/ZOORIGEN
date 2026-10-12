/* ============================================================ */
/* CURSO PREFERIDO DE LA GUÍA / ENCUESTA · Club VIP Zoorigen     */
/*                                                                */
/* La encuesta y la guía virtual de la portada guardan en el      */
/* navegador el curso que la persona quiso como prueba gratuita:  */
/*     localStorage "zoo_curso_pref" = { id, titulo, t }          */
/* y la llevan a club-registro.html?curso=<id> (o club-login).    */
/*                                                                */
/* Este módulo lleva esa preferencia hasta la pantalla de elegir  */
/* la prueba gratuita (club-biblioteca.html) SOLO como curso      */
/* preseleccionado y destacado. NUNCA elige por la persona: la    */
/* elección es irreversible y la confirma ella.                   */
/*                                                                */
/* Reglas (tests/club-curso-pref.test.js):                        */
/*  - id solo con letras, números, "_", "-" y "." (hasta 100)     */
/*  - la preferencia caduca a los 30 días                         */
/*  - si el servidor dice que ya eligió, que tiene membresía o    */
/*    que no puede elegir -> se ignora y se BORRA                 */
/*  - si el curso ya no es elegible -> se ignora y se borra       */
/*  - si el servidor no respondió -> se conserva (no se borra)    */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_CURSO_PREF = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CLAVE = 'zoo_curso_pref';
  var VIGENCIA_MS = 30 * 86400000;
  var ID_VALIDO = /^[A-Za-z0-9_.\-]{1,100}$/;

  function texto(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max); }
  function ahoraDe(n) { return Number.isFinite(n) ? n : Date.now(); }

  function idValido(v) { return typeof v === 'string' && ID_VALIDO.test(v) && v !== '.' && v !== '..'; }

  // Lleva un valor (objeto o texto JSON) a { id, titulo, t } o null si no sirve o ya caducó.
  function normalizar(valor, ahora) {
    var v = valor;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { return null; } }
    if (!v || typeof v !== 'object') return null;
    var id = typeof v.id === 'string' ? v.id.trim() : '';
    if (!idValido(id)) return null;
    var ts = ahoraDe(ahora);
    var t = Number(v.t);
    if (!Number.isFinite(t)) t = ts;
    if (ts - t > VIGENCIA_MS) return null;          // caducada
    if (t - ts > 86400000) t = ts;                  // fecha del futuro: no se confía
    return { id: id, titulo: texto(v.titulo, 160), t: t };
  }

  function leer(almacen, ahora) {
    try { return normalizar(almacen.getItem(CLAVE), ahora); } catch (e) { return null; }
  }
  function guardar(almacen, curso, ahora) {
    var pref = normalizar({ id: curso && curso.id, titulo: curso && curso.titulo, t: ahoraDe(ahora) }, ahora);
    if (!pref) return null;
    try { almacen.setItem(CLAVE, JSON.stringify(pref)); } catch (e) { /* sin almacenamiento */ }
    return pref;
  }
  function borrar(almacen) { try { almacen.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ } }

  // ?curso=<id> de una cadena de búsqueda (o null si falta o no es un id válido).
  function idDeUrl(search) {
    var m = /[?&]curso=([^&#]*)/.exec(String(search || ''));
    if (!m) return null;
    var v;
    try { v = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim(); } catch (e) { return null; }
    return idValido(v) ? v : null;
  }

  // En registro y login: el id de la URL queda como preferencia (si ya había una del mismo curso,
  // conserva su título). Devuelve la preferencia vigente o null.
  function adoptarDeUrl(almacen, search, ahora) {
    var id = idDeUrl(search);
    if (!id) return leer(almacen, ahora);
    var previa = leer(almacen, ahora);
    return guardar(almacen, { id: id, titulo: previa && previa.id === id ? previa.titulo : '' }, ahora);
  }

  // Estado de la prueba gratuita tal como lo da el servidor (o ZOO_ACCESO.estadoPrueba / el normalizador del
  // onboarding). Devuelve { respondio, elegible, elegida, elegibles }.
  function leerEstado(estado) {
    var e = estado && typeof estado === 'object' ? estado : {};
    var el = e.elegida && typeof e.elegida === 'object' ? e.elegida.cursoId : e.elegida;
    var elegida = typeof el === 'string' && el ? el : null;
    var motivo = typeof e.motivo === 'string' && e.motivo.length > 0;
    var elegibles = Array.isArray(e.cursosElegibles) ? e.cursosElegibles.map(String) : [];
    return { respondio: e.elegible === true || !!elegida || motivo, elegible: e.elegible === true && !elegida, elegida: elegida, elegibles: elegibles };
  }

  // Qué hacer con la preferencia dado el estado de la prueba:
  //   { accion: 'ninguna' }                       no hay preferencia
  //   { accion: 'conservar' }                     el servidor no respondió: no se toca
  //   { accion: 'borrar', motivo }                ya no aplica (ya eligió, membresía, no elegible)
  //   { accion: 'destacar', id, titulo }          mostrarla preseleccionada y destacada
  // `tieneMembresia` (opcional) viene de la sesión del navegador; el servidor manda igual.
  function resolver(estado, pref, tieneMembresia) {
    if (!pref || !pref.id) return { accion: 'ninguna' };
    if (tieneMembresia === true) return { accion: 'borrar', motivo: 'membresia' };
    var e = leerEstado(estado);
    if (!e.respondio) return { accion: 'conservar' };
    if (e.elegida) return { accion: 'borrar', motivo: 'ya-eligio' };
    if (!e.elegible) return { accion: 'borrar', motivo: 'no-aplica' };
    if (e.elegibles.indexOf(pref.id) === -1) return { accion: 'borrar', motivo: 'no-elegible' };
    return { accion: 'destacar', id: pref.id, titulo: pref.titulo };
  }

  // Lee, resuelve y limpia. Devuelve { id, titulo } si hay que destacar un curso; si no, null.
  function aplicar(estado, almacen, opciones) {
    var o = opciones || {};
    var pref = leer(almacen, o.ahora);
    if (!pref) { borrar(almacen); return null; }   // ilegible o caducada: se limpia
    var r = resolver(estado, pref, o.tieneMembresia);
    if (r.accion === 'borrar') { borrar(almacen); return null; }
    if (r.accion === 'destacar') return { id: r.id, titulo: r.titulo };
    return null;
  }

  return {
    CLAVE: CLAVE, VIGENCIA_MS: VIGENCIA_MS,
    idValido: idValido, normalizar: normalizar, leer: leer, guardar: guardar, borrar: borrar,
    idDeUrl: idDeUrl, adoptarDeUrl: adoptarDeUrl, leerEstado: leerEstado, resolver: resolver, aplicar: aplicar
  };
});
