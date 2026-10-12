/* ============================================================ */
/* PROGRESO DE CURSOS · Club VIP Zoorigen                        */
/*                                                                */
/* El avance de cada curso, el orden de las clases, las preguntas */
/* y el certificado los guarda y los valida el SERVIDOR (igual    */
/* que en alintecfood). El navegador ya no escribe el progreso    */
/* en Firestore ni crea certificados. Aquí está la lógica pura:   */
/*  - GET  /api/cursos/progreso            (leer el avance)       */
/*  - POST /api/cursos/:cursoId/progreso   (clase vista)          */
/*  - POST /api/cursos/:cursoId/quiz       (preguntas de clase)   */
/*  - traducir la respuesta a la forma que usa la biblioteca:     */
/*      { [cursoId]: { completedLessons, isCompleted,             */
/*                     certificateFolio, completedAt? } }         */
/*  - mensajes de error en español                                */
/* Lo último que respondió el servidor se guarda en localStorage  */
/* SOLO para mostrar si el servidor no responde; nunca certifica. */
/* Se prueba en Node: tests/club-progreso.test.js                 */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_PROGRESO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ESPERA_MS = 9000;
  var MAX_CLASES = 500;

  /* ───────────────────────── Utilidades ───────────────────────── */

  function esObjeto(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  // Lista de enteros >= 0, sin repetir y en orden
  function indices(lista) {
    var vistos = {}, fuera = [];
    (Array.isArray(lista) ? lista : []).forEach(function (n) {
      if (typeof n !== 'number' || !isFinite(n) || n % 1 !== 0 || n < 0 || n >= MAX_CLASES) return;
      if (!vistos[n]) { vistos[n] = true; fuera.push(n); }
    });
    return fuera.sort(function (a, b) { return a - b; });
  }

  function folioDe(v) {
    var s = typeof v === 'string' ? v.replace(/\s+/g, '').toUpperCase().slice(0, 40) : '';
    return /^[A-Z0-9][A-Z0-9-]{4,39}$/.test(s) ? s : '';
  }

  function fechaIso(v) {
    if (!v) return '';
    var d = typeof v.toDate === 'function' ? v.toDate() : new Date(v);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }

  function claveCache(uid) { return 'zoo_course_progress_' + uid; }

  /* ───────────────────────── Traducción servidor → página ───────────────────────── */

  // resp: GET /api/cursos/progreso. previo: lo último que se mostró (solo aporta la fecha de término).
  function traducirProgreso(resp, previo) {
    var cursos = esObjeto(resp) && esObjeto(resp.cursos) ? resp.cursos : {};
    var antes = esObjeto(previo) ? previo : {};
    var fuera = {};
    Object.keys(cursos).forEach(function (id) {
      var c = cursos[id];
      if (!esObjeto(c) || !id) return;
      var completado = c.completado === true;
      var folio = folioDe(c.certificadoFolio);
      var entrada = {
        completedLessons: indices(c.sesionesVistas),
        quizzesPassed: indices(c.quizzesAprobados),
        isCompleted: completado,
        certificateFolio: folio || null
      };
      if (completado) {
        var p = esObjeto(antes[id]) ? antes[id] : {};
        var cuando = fechaIso(c.completadoEn || c.certificadoEmitido || c.emitido) || (p.isCompleted === true ? fechaIso(p.completedAt || p.certificateIssuedAt) : '');
        if (cuando) entrada.completedAt = cuando;
      }
      fuera[id] = entrada;
    });
    return fuera;
  }

  // resp: POST /api/cursos/:cursoId/progreso. Devuelve la entrada del curso ya traducida.
  function entradaTrasClase(previa, resp) {
    var p = esObjeto(previa) ? previa : {};
    var r = esObjeto(resp) ? resp : {};
    var cert = esObjeto(r.certificado) ? r.certificado : null;
    var completado = r.completado === true;
    var vistas = Array.isArray(r.sesionesVistas) ? indices(r.sesionesVistas) : indices(p.completedLessons);
    var folio = (cert && folioDe(cert.folio)) || (completado ? folioDe(p.certificateFolio) : '');
    var entrada = {
      completedLessons: vistas,
      quizzesPassed: indices(p.quizzesPassed),
      isCompleted: completado,
      certificateFolio: folio || null
    };
    var cuando = (cert && fechaIso(cert.emitido)) || (completado ? fechaIso(p.completedAt) : '');
    if (completado && cuando) entrada.completedAt = cuando;
    return entrada;
  }

  // Respuesta de POST /api/cursos/:cursoId/quiz. null si viene mal armada.
  function resultadoQuiz(resp) {
    if (!esObjeto(resp) || !Array.isArray(resp.detalle)) return null;
    var detalle = resp.detalle.map(function (d) {
      var x = esObjeto(d) ? d : {};
      return { correcta: Number.isInteger(x.correcta) ? x.correcta : null, acertada: x.acertada === true };
    });
    var total = Number.isInteger(resp.total) && resp.total >= 0 ? resp.total : detalle.length;
    var correctas = Number.isInteger(resp.correctas) && resp.correctas >= 0 ? resp.correctas : detalle.filter(function (d) { return d.acertada; }).length;
    return { aprobado: resp.aprobado === true, correctas: correctas, total: total, detalle: detalle };
  }

  /* ───────────────────────── Mensajes de error ───────────────────────── */

  // err: Error de apiFetch (con .status y a veces .message del servidor).
  // ctx: { accion: 'clase' | 'quiz' | 'lista', esMiembro: boolean }
  function mensajeError(err, ctx) {
    var e = err || {};
    var c = ctx || {};
    var status = Number.isInteger(e.status) ? e.status : (typeof e.status === 'string' ? parseInt(e.status, 10) : 0);
    var msg = String(e.message || '');
    var bajo = msg.toLowerCase();
    if (status === 0 || (!status && /network|fetch|conexi/i.test(msg))) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo. Tu avance no se pierde.';
    if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.';
    if (status === 403) {
      if (c.esMiembro === false) return 'Esta clase no está incluida en tu prueba gratuita. Activa tu membresía para continuar con el curso.';
      return 'Esta clase todavía está bloqueada para tu cuenta. Revisa que tu membresía esté vigente y que el curso ya esté disponible en tu ruta.';
    }
    if (status === 409) {
      if (bajo.indexOf('quiz') >= 0 || bajo.indexOf('pregunta') >= 0) return 'Contesta primero las preguntas de esta clase para poder completarla.';
      if (bajo.indexOf('anterior') >= 0) return 'Completa primero la clase anterior para poder terminar esta.';
      return msg || 'No se pudo registrar la clase en este momento.';
    }
    if (status === 429) return 'Hiciste demasiadas acciones seguidas. Espera un momento e inténtalo otra vez.';
    if (status === 503) return 'El sistema de certificados todavía no está listo. Tu avance está a salvo; inténtalo más tarde o avisa a soporte.';
    if (status >= 500) return 'El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.';
    if (c.accion === 'quiz') return 'No se pudieron comprobar tus respuestas. Inténtalo de nuevo.';
    return msg || 'No se pudo completar la acción. Inténtalo de nuevo.';
  }

  /* ───────────────────────── Cliente (dependencias inyectables) ───────────────────────── */

  // deps: {
  //   apiFetch(ruta, { method, body }) → Promise<json>   (ZOORIGEN_CLUB.apiFetch)
  //   uid() → string
  //   leerCache(uid) → objeto | null      guardarCache(uid, objeto)
  //   fechasCertificados(uid) → Promise<{ [cursoId]: iso }>   (opcional: fecha de término de cursos ya certificados)
  //   esperaMs
  // }
  function crear(deps) {
    var d = deps || {};
    var espera = d.esperaMs || ESPERA_MS;
    var ultimo = {};          // lo último que se mostró, por curso
    var enVuelo = {};         // 'curso:indice' → promesa

    function conCorte(promesa) {
      var t;
      var corte = new Promise(function (_, rechazar) {
        t = setTimeout(function () { var e = new Error('No hay conexión con el servidor.'); e.status = 0; rechazar(e); }, espera);
      });
      return Promise.race([promesa, corte]).then(
        function (v) { clearTimeout(t); return v; },
        function (e) { clearTimeout(t); throw e; }
      );
    }

    function leerCache(uid) {
      try { var c = d.leerCache ? d.leerCache(uid) : null; return esObjeto(c) ? c : {}; } catch (e) { return {}; }
    }
    function guardarCache(uid, obj) { try { if (d.guardarCache) d.guardarCache(uid, obj); } catch (e) { /* sin almacenamiento */ } }

    function marcarCache(obj, desdeCache) {
      try { Object.defineProperty(obj, '__desdeCache', { value: desdeCache, enumerable: false, configurable: true }); } catch (e) { /* objeto congelado */ }
      return obj;
    }

    // Avance de todos los cursos. Si el servidor no responde, devuelve lo último conocido (solo para mostrar;
    // el resultado trae __desdeCache === true, no enumerable).
    async function cargar(uid) {
      if (!uid) return marcarCache({}, false);
      var cache = leerCache(uid);
      try {
        var resp = await conCorte(Promise.resolve(d.apiFetch('/api/cursos/progreso')));
        var nuevo = traducirProgreso(resp, cache);
        // Cursos terminados sin fecha: se toma la del certificado (para la ruta de desbloqueo de 8 días)
        var sinFecha = Object.keys(nuevo).filter(function (id) { return nuevo[id].isCompleted && !nuevo[id].completedAt; });
        if (sinFecha.length && typeof d.fechasCertificados === 'function') {
          try {
            var fechas = await conCorte(Promise.resolve(d.fechasCertificados(uid)));
            sinFecha.forEach(function (id) { var f = fechaIso(fechas && fechas[id]); if (f) nuevo[id].completedAt = f; });
          } catch (e) { /* sin fecha: cuenta desde ahora */ }
        }
        ultimo = nuevo;
        guardarCache(uid, nuevo);
        return marcarCache(nuevo, false);
      } catch (e) {
        ultimo = cache;
        return marcarCache(cache, true);
      }
    }

    function revisarArgumentos(cursoId, indice) {
      var id = typeof cursoId === 'string' ? cursoId.trim() : '';
      if (!id || id.length > 120 || !Number.isInteger(indice) || indice < 0 || indice >= MAX_CLASES) {
        var e = new Error('No se pudo identificar la clase. Recarga la página e inténtalo de nuevo.');
        e.status = 400; e.mensajeUsuario = e.message;
        throw e;
      }
      return id;
    }

    // Marca una clase como vista en el servidor. Devuelve
    //   { entrada, completado, nuevoCompletado, certificado, bono, sesionesVistas }
    // o lanza un Error con .status y .mensajeUsuario (texto en español para mostrar).
    function registrarClaseVista(cursoId, indice, ctx) {
      var id;
      try { id = revisarArgumentos(cursoId, indice); } catch (e) { return Promise.reject(e); }
      var clave = id + ':' + indice;
      if (enVuelo[clave]) return enVuelo[clave];
      var p = (async function () {
        try {
          var resp = await conCorte(Promise.resolve(d.apiFetch('/api/cursos/' + encodeURIComponent(id) + '/progreso', { method: 'POST', body: { sessionIndex: indice } })));
          if (!esObjeto(resp) || resp.ok === false) { var m = new Error('El servidor respondió algo inesperado.'); m.status = 500; throw m; }
          var previa = ultimo[id] || {};
          var entrada = entradaTrasClase(previa, resp);
          var cert = esObjeto(resp.certificado) ? resp.certificado : null;
          var nuevoCompletado = resp.completado === true && previa.isCompleted !== true;
          ultimo[id] = entrada;
          var uid = d.uid ? d.uid() : '';
          if (uid) { var c = leerCache(uid); c[id] = entrada; guardarCache(uid, c); }
          return {
            entrada: entrada, completado: resp.completado === true, nuevoCompletado: nuevoCompletado,
            certificado: cert, bono: esObjeto(resp.bono) ? resp.bono : null, sesionesVistas: entrada.completedLessons
          };
        } catch (err) {
          if (!err.mensajeUsuario) err.mensajeUsuario = mensajeError(err, Object.assign({ accion: 'clase' }, ctx || {}));
          throw err;
        } finally {
          delete enVuelo[clave];
        }
      })();
      enVuelo[clave] = p;
      return p;
    }

    // Manda las respuestas de la clase al servidor. Devuelve { aprobado, correctas, total, detalle }.
    async function validarQuiz(cursoId, indice, respuestas, ctx) {
      var id = revisarArgumentos(cursoId, indice);
      var lista = Array.isArray(respuestas) ? respuestas : [];
      if (!lista.length || !lista.every(function (n) { return Number.isInteger(n) && n >= 0 && n < 50; })) {
        var e = new Error('Contesta todas las preguntas antes de comprobar.');
        e.status = 400; e.mensajeUsuario = e.message;
        throw e;
      }
      try {
        var resp = await conCorte(Promise.resolve(d.apiFetch('/api/cursos/' + encodeURIComponent(id) + '/quiz', { method: 'POST', body: { sessionIndex: indice, respuestas: lista } })));
        var r = resultadoQuiz(resp);
        if (!r) { var m = new Error('El servidor respondió algo inesperado.'); m.status = 500; throw m; }
        return r;
      } catch (err) {
        if (!err.mensajeUsuario) err.mensajeUsuario = mensajeError(err, Object.assign({ accion: 'quiz' }, ctx || {}));
        throw err;
      }
    }

    return { cargar: cargar, registrarClaseVista: registrarClaseVista, validarQuiz: validarQuiz, ultimo: function () { return ultimo; } };
  }

  return {
    ESPERA_MS: ESPERA_MS, claveCache: claveCache,
    indices: indices, traducirProgreso: traducirProgreso, entradaTrasClase: entradaTrasClase, resultadoQuiz: resultadoQuiz,
    mensajeError: mensajeError, crear: crear
  };
});
