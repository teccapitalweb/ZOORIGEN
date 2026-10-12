/* ============================================================ */
/* CATÁLOGO PÚBLICO DE CURSOS · Zoorigen                         */
/* Lo comparten el chatbot y la encuesta de la página principal. */
/* Pide al servidor GET /api/cursos/demo (solo título, área,     */
/* descripción y número de clases; nunca videos ni respuestas).  */
/*   ZOO_CATALOGO.cargar()  -> Promise<[{ id, titulo, area,      */
/*                              descripcion, clases, pronto,          */
/*                              elegiblePrueba }]>  */
/*   ZOO_CATALOGO.normalizar(respuesta) (pura, se prueba en Node)*/
/* Guarda el resultado 10 minutos en sessionStorage.             */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(null);
  else root.ZOO_CATALOGO = factory(root);
})(typeof self !== 'undefined' ? self : this, function (win) {
  'use strict';

  var BASE_DEFECTO = 'https://zoorigen-webhook-production.up.railway.app';
  var CLAVE = 'zoo_catalogo_v1';
  var VIGENCIA_MS = 10 * 60 * 1000;
  var memoria = null;
  var enCurso = null;

  function texto(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max); }

  // Convierte la respuesta del servidor en una lista segura (sin cursos incompletos).
  function normalizar(respuesta) {
    var lista = respuesta && Array.isArray(respuesta.cursos) ? respuesta.cursos : [];
    var vistos = {};
    var salida = [];
    lista.forEach(function (c) {
      if (!c || typeof c !== 'object') return;
      var id = texto(c.id, 80);
      var titulo = texto(c.titulo, 160);
      if (!id || !titulo || vistos[id]) return;
      vistos[id] = true;
      var clases = Number(c.clases);
      salida.push({
        id: id,
        titulo: titulo,
        area: texto(c.area, 80) || 'General',
        descripcion: texto(c.descripcion, 400),
        clases: Number.isFinite(clases) && clases >= 0 ? Math.floor(clases) : 0,
        pronto: c.proximamente === true || c.pronto === true,
        // el servidor dice si el curso se puede elegir como prueba gratuita (si no lo dice, se asume que sí)
        elegiblePrueba: c.elegiblePrueba !== false
      });
    });
    return salida;
  }

  function baseApi() {
    try {
      if (typeof WEBHOOK_SERVER_URL !== 'undefined' && WEBHOOK_SERVER_URL) return String(WEBHOOK_SERVER_URL).replace(/\/+$/, '');
    } catch (e) { /* sin variable global */ }
    return BASE_DEFECTO;
  }

  function leerCache() {
    try {
      var g = JSON.parse(win.sessionStorage.getItem(CLAVE) || 'null');
      if (g && Array.isArray(g.d) && Date.now() - g.t < VIGENCIA_MS) return g.d;
    } catch (e) { /* sin caché */ }
    return null;
  }
  function guardarCache(lista) {
    try { win.sessionStorage.setItem(CLAVE, JSON.stringify({ t: Date.now(), d: lista })); } catch (e) { /* sin caché */ }
  }

  function cargar() {
    if (memoria) return Promise.resolve(memoria);
    if (win) { var c = leerCache(); if (c) { memoria = c; return Promise.resolve(c); } }
    if (enCurso) return enCurso;
    var f = (win && win.fetch) || (typeof fetch === 'function' ? fetch : null);
    if (!f) return Promise.reject(new Error('sin-red'));
    enCurso = f(baseApi() + '/api/cursos/demo')
      .then(function (r) { if (!r.ok) throw new Error('catalogo'); return r.json(); })
      .then(function (j) {
        var lista = normalizar(j);
        if (!lista.length) throw new Error('vacio');
        memoria = lista;
        if (win) guardarCache(lista);
        return lista;
      })
      .then(function (lista) { enCurso = null; return lista; }, function (e) { enCurso = null; throw e; });
    return enCurso;
  }

  return { cargar: cargar, normalizar: normalizar, baseApi: baseApi };
});
