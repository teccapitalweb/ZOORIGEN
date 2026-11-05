/* ============================================================ */
/* CALENDARIO DE CURSOS DEL MIEMBRO · Club VIP Zoorigen          */
/*                                                                */
/* El servidor calcula el calendario de desbloqueo de cada       */
/* miembro (GET /api/calendario): qué cursos están abiertos, en  */
/* cuántos días se abre cada uno y el avance de los 15 retos     */
/* para abrir el siguiente curso. Aquí solo se traduce esa       */
/* respuesta y se arman las tarjetas (constructores de HTML sin  */
/* efectos; todo texto de la base de datos se escapa).           */
/*                                                                */
/* Cambio de orden: con 35 y 55 retos nuevos (mínimo 8 y 14 de   */
/* cada tipo) el miembro elige qué curso cerrado se abre primero. */
/* Solo 2 cambios. Lo decide el servidor; aquí se pinta el        */
/* avance, la ventana para elegir el curso y la confirmación.     */
/*                                                                */
/* Si el servidor no responde, las páginas siguen con la regla   */
/* de siempre de club-acceso.js: nadie pierde un curso abierto.  */
/* Se prueba en Node: tests/club-calendario.test.js              */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_CALENDARIO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIA_MS = 86400000;
  var RETOS_META = 15;
  var TIPOS = [['quiz', 'Quiz relámpago'], ['detective', 'Detective de campo'], ['orden', 'Ordena el procedimiento']];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function entero(v, min, max) { var n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min; }
  function fechaMs(v) { if (!v) return null; var t = Date.parse(v); return Number.isFinite(t) ? t : null; }

  /* ───────────────────────── Traducción de la respuesta ───────────────────────── */

  // GET /api/calendario → { cursos: { [id]: {...} }, orden, proximo, primerCurso, modo, inicioMs } o null.
  // null = sin calendario del servidor (no es miembro, es administrador, el servidor no respondió o no hay cursos): la página
  // usa la regla de siempre.
  function normalizar(resp) {
    if (!resp || typeof resp !== 'object' || resp.ok !== true || resp.membresia !== true || resp.admin === true) return null;
    if (!Array.isArray(resp.cursos) || !resp.cursos.length) return null;
    var cursos = {}, orden = [];
    resp.cursos.forEach(function (c) {
      if (!c || typeof c.cursoId !== 'string' || !c.cursoId) return;
      cursos[c.cursoId] = {
        cursoId: c.cursoId, titulo: String(c.titulo || ''), abierto: c.abierto === true, desbloqueoEn: fechaMs(c.desbloqueoEn),
        porPremio: c.porPremio === true, porRetos: c.porRetos === true, esPrueba: c.esPrueba === true
      };
      orden.push(c.cursoId);
    });
    if (!orden.length) return null;
    var cal = resp.calendario && typeof resp.calendario === 'object' ? resp.calendario : {};
    return {
      cursos: cursos, orden: orden,
      modo: typeof cal.modo === 'string' ? cal.modo : 'legado',
      inicioMs: fechaMs(cal.inicio),
      eleccion: typeof cal.eleccion === 'string' ? cal.eleccion : null,
      primerCurso: primerCurso(resp.primerCurso)
    };
  }

  // Avance de los 15 retos. Devuelve null si no aplica; con estado 'pendiente' (falta) o 'abierto-ahora' (se acaba de abrir).
  function primerCurso(pc) {
    if (!pc || typeof pc !== 'object' || pc.aplica !== true || (pc.estado !== 'pendiente' && pc.estado !== 'abierto-ahora')) return null;
    var p = pc.progreso && typeof pc.progreso === 'object' ? pc.progreso : {};
    var tipos = TIPOS.map(function (t) {
      var x = p.tipos && p.tipos[t[0]] ? p.tipos[t[0]] : {};
      var meta = entero(x.meta, 1, 100) || 4;
      return { id: t[0], nombre: t[1], hechos: entero(x.hechos, 0, meta), meta: meta };
    });
    var meta = entero(p.meta, 1, 1000);
    if (meta < 1 || !p.meta) meta = RETOS_META;
    var libres = p.libres && typeof p.libres === 'object' ? { hechos: entero(p.libres.hechos, 0, 100), meta: entero(p.libres.meta, 0, 100) } : { hechos: 0, meta: 3 };
    return {
      estado: pc.estado, abierto: pc.estado === 'abierto-ahora', cursoId: String(pc.cursoId || ''), titulo: String(pc.titulo || ''),
      desbloqueoEn: fechaMs(pc.desbloqueoEn), diasFalta: Number.isFinite(Number(pc.diasFalta)) ? Math.max(0, Math.floor(Number(pc.diasFalta))) : null,
      hechos: entero(p.hechos, 0, meta), meta: meta, completo: p.completo === true, tipos: tipos, libres: libres
    };
  }

  // Desbloqueo de un curso según el servidor (misma forma que ZOO_ACCESO.desbloqueoCurso). null si el curso no está en el calendario.
  // La cuenta de días se calcula con la hora actual: la página puede llevar rato abierta.
  function desbloqueo(cal, cursoId, ahoraMs) {
    if (!cal || !cal.cursos || !cursoId) return null;
    var e = cal.cursos[cursoId];
    if (!e) return null;
    var ahora = Number.isFinite(ahoraMs) ? ahoraMs : Date.now();
    var base = { porPremio: e.porPremio, porRetos: e.porRetos, esPrueba: e.esPrueba, desbloqueoEn: e.desbloqueoEn };
    if (e.abierto) return Object.assign({ desbloqueado: true, diasFalta: 0, motivo: null }, base);
    if (e.desbloqueoEn === null) return Object.assign({ desbloqueado: false, diasFalta: null, motivo: null }, base);
    var ms = e.desbloqueoEn - ahora;
    if (ms <= 0) return Object.assign({ desbloqueado: true, diasFalta: 0, motivo: null }, base);
    return Object.assign({ desbloqueado: false, diasFalta: Math.ceil(ms / DIA_MS), msFalta: ms, motivo: 'tiempo' }, base);
  }

  // Resumen para los textos: cuántos abiertos, cuántos cerrados y el que se abre primero. Cada curso se evalúa con la hora actual.
  function resumen(cal, ahoraMs) {
    var ahora = Number.isFinite(ahoraMs) ? ahoraMs : Date.now();
    var r = { total: 0, abiertos: 0, cerrados: 0, proximo: null, diasComoMiembro: null };
    if (!cal) return r;
    cal.orden.forEach(function (id) {
      var d = desbloqueo(cal, id, ahora);
      r.total++;
      if (d.desbloqueado) { r.abiertos++; return; }
      r.cerrados++;
      if (d.msFalta != null && (r.proximo === null || d.msFalta < r.proximo.msFalta)) {
        r.proximo = { cursoId: id, titulo: cal.cursos[id].titulo, diasFalta: d.diasFalta, msFalta: d.msFalta, desbloqueoEn: d.desbloqueoEn };
      }
    });
    if (Number.isFinite(cal.inicioMs)) r.diasComoMiembro = Math.max(0, Math.floor((ahora - cal.inicioMs) / DIA_MS));
    return r;
  }

  /* ───────────────────────── Textos ───────────────────────── */

  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }

  // "en 5 días", "mañana", "hoy"
  function cuando(diasFalta) {
    var n = Number(diasFalta);
    if (!Number.isFinite(n) || n <= 0) return 'hoy';
    return n === 1 ? 'mañana' : 'en ' + n + ' días';
  }
  // "sábado 24 de octubre"
  function fechaLarga(ms) {
    if (!Number.isFinite(ms)) return '';
    var d = new Date(ms);
    return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  }
  function tituloTarjeta(meta) { return 'Abre tu siguiente curso resolviendo ' + (meta || RETOS_META) + ' retos'; }
  function textoFaltan(pc) { var f = Math.max(0, pc.meta - pc.hechos); return f === 1 ? 'Te falta 1 reto' : 'Te faltan ' + f + ' retos'; }

  /* ───────────────────────── Iconos (Lucide, ISC) ───────────────────────── */

  var IC = {
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    candadoAbierto: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    flecha: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    orden: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    libro: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    insignia: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>'
  };
  function svg(nombre, tam) {
    return '<svg class="zcal-ic" width="' + (tam || 18) + '" height="' + (tam || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (IC[nombre] || '') + '</svg>';
  }

  /* ───────────────────────── Tarjetas ───────────────────────── */

  function pct(pc) { return pc.meta ? Math.max(0, Math.min(100, Math.round(pc.hechos * 100 / pc.meta))) : 0; }

  // Tarjeta grande ("Abre tu siguiente curso resolviendo 15 retos") de Retos y Cursos.
  //   o: { href (a Retos; sin href no hay botón), clase }
  function tarjetaRetosHTML(pc, o) {
    if (!pc || pc.estado !== 'pendiente') return '';
    var op = o || {};
    var p = pct(pc);
    var curso = pc.titulo ? '«' + esc(pc.titulo) + '»' : 'tu siguiente curso';
    var espera = pc.diasFalta !== null ? ' Si no quieres esperar, se abre ' + esc(cuando(pc.diasFalta)) + (Number.isFinite(pc.desbloqueoEn) ? ' (' + esc(fechaLarga(pc.desbloqueoEn)) + ')' : '') + '.' : '';
    var tipos = pc.tipos.map(function (t) {
      var ok = t.hechos >= t.meta;
      return '<li class="zcal-tipo' + (ok ? ' is-ok' : '') + '"><span class="zcal-tipo__n">' + esc(t.nombre) + '</span><span class="zcal-tipo__b"><i style="width:' + Math.round(t.hechos * 100 / t.meta) + '%"></i></span>' +
        '<span class="zcal-tipo__c">' + (ok ? svg('check', 14) : esc(t.hechos + '/' + t.meta)) + '</span></li>';
    }).join('') + (pc.libres.meta ? '<li class="zcal-tipo' + (pc.libres.hechos >= pc.libres.meta ? ' is-ok' : '') + '"><span class="zcal-tipo__n">Retos libres <small>(de cualquier tipo)</small></span><span class="zcal-tipo__b"><i style="width:' + Math.round(pc.libres.hechos * 100 / pc.libres.meta) + '%"></i></span>' +
      '<span class="zcal-tipo__c">' + (pc.libres.hechos >= pc.libres.meta ? svg('check', 14) : esc(pc.libres.hechos + '/' + pc.libres.meta)) + '</span></li>' : '');
    return '<section class="zcal-retos' + (op.clase ? ' ' + esc(op.clase) : '') + '" aria-label="' + esc(tituloTarjeta(pc.meta)) + '">' +
      '<span class="zcal-retos__ic" aria-hidden="true">' + svg('zap', 26) + '</span>' +
      '<div class="zcal-retos__cuerpo">' +
        '<p class="zcal-eyebrow">Acelera tu ruta</p>' +
        '<h3 class="zcal-retos__t">' + esc(tituloTarjeta(pc.meta)) + '</h3>' +
        '<p class="zcal-retos__txt">Al superar ' + esc(pc.meta) + ' retos del camino abres ' + curso + ' sin esperar su fecha. Necesitas al menos 4 de cada tipo y 3 más del que prefieras.' + espera + '</p>' +
        '<div class="zcal-barra" role="progressbar" aria-label="Retos superados para abrir tu siguiente curso" aria-valuemin="0" aria-valuemax="' + pc.meta + '" aria-valuenow="' + pc.hechos + '"><span style="width:' + p + '%"></span></div>' +
        '<p class="zcal-retos__n"><b>' + esc(pc.hechos) + ' de ' + esc(pc.meta) + '</b> retos · ' + esc(textoFaltan(pc)) + '</p>' +
        '<ul class="zcal-tipos">' + tipos + '</ul>' +
        (op.href ? '<a class="zcal-btn" href="' + esc(op.href) + '">Ir a los retos' + svg('flecha', 16) + '</a>' : '') +
      '</div></section>';
  }

  // Tira compacta dentro de la tarjeta del curso cerrado ("Ábrelo antes con 15 retos · 9/15")
  function tiraRetosHTML(pc) {
    if (!pc || pc.estado !== 'pendiente') return '';
    return '<div class="zcal-tira" title="' + esc(textoFaltan(pc)) + '"><span class="zcal-tira__t">' + svg('zap', 14) + 'Ábrelo antes con ' + esc(pc.meta) + ' retos</span><b>' + esc(pc.hechos + '/' + pc.meta) + '</b>' +
      '<span class="zcal-tira__b" aria-hidden="true"><i style="width:' + pct(pc) + '%"></i></span></div>';
  }

  // Aviso dentro del detalle de un curso cerrado
  function avisoRetosHTML(pc) {
    if (!pc || pc.estado !== 'pendiente') return '';
    return '<div class="zcal-aviso">' + svg('zap', 18) + '<span><b>Ábrelo antes resolviendo ' + esc(pc.meta) + ' retos</b> · llevas ' + esc(pc.hechos) + ' de ' + esc(pc.meta) + '. ' +
      '<button type="button" class="zcal-enlace" data-zc="retos">Ir a los retos</button></span></div>';
  }

  // Tarjeta "Próximo desbloqueo" del Inicio: el curso que se abre primero, con su cuenta regresiva y la fecha.
  //   prox: { titulo, diasFalta, desbloqueoEn }  pc: avance de los 15 retos (opcional)
  function proximoHTML(prox, pc) {
    if (!prox) return '';
    var cuentas = Number.isFinite(prox.diasFalta) ? esc(plural(prox.diasFalta, 'día', 'días')) : '';
    var fecha = Number.isFinite(prox.desbloqueoEn) ? esc(fechaLarga(prox.desbloqueoEn)) : '';
    return '<div class="zcal-prox"><span class="zcal-prox__ic" aria-hidden="true">' + svg('calendario', 18) + '</span>' +
      '<span class="zcal-prox__txt"><small>Próximo desbloqueo</small><b>' + esc(prox.titulo || 'Tu siguiente curso') + '</b>' +
      '<span>' + (cuentas ? 'Restan ' + cuentas : 'Pronto') + (fecha ? ' · ' + fecha : '') + '</span></span>' +
      (pc && pc.estado === 'pendiente' ? '<a class="zcal-prox__retos" href="club-retos.html">' + svg('zap', 14) + esc(pc.hechos + '/' + pc.meta) + ' retos para abrirlo</a>' : '') + '</div>';
  }

  // Franja de la ruta en Cursos. Devuelve '' si no hay nada que decir (todo abierto).
  function bannerRutaHTML(r, cal) {
    if (!r || !r.cerrados) return '';
    var abiertos = r.abiertos;
    var mod = cal && cal.modo === 'prueba' ? 'Tu curso de prueba es el primero y cuenta como abierto. ' : '';
    var llevas = r.diasComoMiembro !== null ? ' Llevas <strong>' + esc(plural(r.diasComoMiembro, 'día', 'días')) + '</strong> como miembro.' : '';
    var sig = r.proximo ? ' El siguiente se desbloquea en <strong>' + esc(plural(r.proximo.diasFalta, 'día', 'días')) + '</strong>.' : '';
    return '<div class="unlock-schedule-banner"><div class="unlock-schedule-banner__icon">' + svg('candadoAbierto', 20) + '</div><div class="unlock-schedule-banner__text">' +
      esc(mod) + 'Tu ruta VIP: <strong>1 curso nuevo cada 8 días</strong> desde que te hiciste miembro.' + llevas + ' Tienes <strong>' + esc(abiertos) + '</strong> de ' + esc(r.total) + ' cursos disponibles.' + sig + '</div></div>';
  }

  /* ───────────────────────── Cambio de orden de los cursos ───────────────────────── */

  // Metas por si el servidor no las manda (las decide siempre el servidor: services/retos.js · CAMBIOS_ORDEN)
  var METAS_CAMBIO = [{ n: 1, total: 35, porTipo: 8 }, { n: 2, total: 55, porTipo: 14 }];
  var TIPOS_CORTOS = [['quiz', 'Quiz'], ['detective', 'Detective'], ['orden', 'Ordena']];

  // GET /api/calendario/cambio-orden (o el campo cambioOrden de GET /api/retos) → modelo para pintar, o null si no aplica.
  function cambioOrden(resp) {
    if (!resp || typeof resp !== 'object' || resp.ok === false || resp.aplica === false) return null;
    var c = resp.contados && typeof resp.contados === 'object' ? resp.contados : {};
    var contados = { quiz: entero(c.quiz, 0, 1000), detective: entero(c.detective, 0, 1000), orden: entero(c.orden, 0, 1000) };
    contados.total = contados.quiz + contados.detective + contados.orden;
    var usados = entero(resp.usados, 0, 10);
    var maximo = resp.maximo ? entero(resp.maximo, 1, 10) : METAS_CAMBIO.length;
    var tramos = METAS_CAMBIO.map(function (m, i) {
      var t = Array.isArray(resp.tramos) && resp.tramos[i] && typeof resp.tramos[i] === 'object' ? resp.tramos[i] : {};
      var total = Number(t.total) > 0 ? entero(t.total, 1, 1000) : m.total, porTipo = Number(t.porTipo) > 0 ? entero(t.porTipo, 1, 1000) : m.porTipo;
      var cumple = contados.total >= total && TIPOS_CORTOS.every(function (x) { return contados[x[0]] >= porTipo; });
      return { n: m.n, total: total, porTipo: porTipo, usado: usados >= m.n, cumple: cumple };
    });
    var sig = null;
    for (var i = 0; i < tramos.length; i++) { if (!tramos[i].usado) { sig = tramos[i]; break; } }
    var xp = resp.xpInsignias && typeof resp.xpInsignias === 'object' ? resp.xpInsignias : {};
    var cerrados = (Array.isArray(resp.cursosCerrados) ? resp.cursosCerrados : []).filter(function (x) { return x && typeof x.cursoId === 'string' && x.cursoId; }).map(function (x) {
      return { cursoId: x.cursoId, titulo: String(x.titulo || ''), lugar: entero(x.lugar, 1, 1000), desbloqueoEn: fechaMs(x.desbloqueoEn), diasFalta: Number.isFinite(Number(x.diasFalta)) ? Math.max(0, Math.floor(Number(x.diasFalta))) : null };
    });
    var cambios = (Array.isArray(resp.cambios) ? resp.cambios : []).filter(function (x) { return x && typeof x === 'object'; }).map(function (x) {
      return { n: entero(x.n, 1, 10), cursoId: String(x.cursoId || ''), titulo: String(x.titulo || ''), en: fechaMs(x.en) };
    });
    return {
      usados: Math.min(usados, maximo), maximo: maximo, completo: usados >= maximo, contados: contados, tramos: tramos, siguiente: sig,
      disponible: resp.disponible === true && !!sig && sig.cumple, cerrados: cerrados, siguienteCurso: cerrados[0] || null, cambios: cambios,
      xp: { 1: entero(xp[1], 0, 1000) || 40, 2: entero(xp[2], 0, 1000) || 60 }
    };
  }

  function faltanTexto(co) {
    var t = co.siguiente;
    if (!t) return '';
    var partes = [];
    TIPOS_CORTOS.forEach(function (x) { var f = t.porTipo - co.contados[x[0]]; if (f > 0) partes.push(f + ' de ' + x[1].toLowerCase()); });
    var faltaTotal = Math.max(t.total - co.contados.total, 0);
    if (!partes.length) return faltaTotal === 1 ? 'Te falta 1 reto de cualquier tipo' : 'Te faltan ' + faltaTotal + ' retos de cualquier tipo';
    return 'Te faltan ' + partes.join(', ') + (faltaTotal > 0 ? ' y, en total, ' + faltaTotal + ' retos más' : '');
  }

  function fechaCorta(ms) {
    if (!Number.isFinite(ms)) return '';
    var d = new Date(ms);
    return d.getDate() + ' de ' + MESES[d.getMonth()];
  }

  // Días que faltan para abrir un curso, calculados con la hora de AHORA a partir de su fecha de apertura: así la línea, la ventana,
  // las tarjetas de la biblioteca y la página del curso siempre dicen lo mismo (el servidor manda la fecha, no un conteo que envejece).
  function diasDe(c) {
    if (c && Number.isFinite(c.desbloqueoEn)) return Math.max(0, Math.ceil((c.desbloqueoEn - Date.now()) / DIA_MS));
    return c && Number.isFinite(c.diasFalta) ? c.diasFalta : null;
  }

  // Pone los cursos CERRADOS en el orden real en que se abren (el que se abre primero va primero). Los cursos abiertos conservan su lugar:
  // solo se reparten entre las posiciones de los cerrados. Sin cambios de orden el resultado es el mismo que ya había (estable).
  //   lista: cursos de la página · desbloqueoDe(curso): { desbloqueado, desbloqueoEn?, diasFalta? } (ZOO_CALENDARIO.desbloqueo o la regla local)
  function ordenarPorDesbloqueo(lista, desbloqueoDe) {
    var ahora = Date.now();
    var items = (Array.isArray(lista) ? lista : []).map(function (c, i) {
      var d = (typeof desbloqueoDe === 'function' ? desbloqueoDe(c) : null) || {};
      var cerrado = d.desbloqueado === false;
      var ms = Infinity;
      if (cerrado) ms = Number.isFinite(d.desbloqueoEn) ? d.desbloqueoEn : (Number.isFinite(d.diasFalta) ? ahora + d.diasFalta * DIA_MS : Infinity);
      return { c: c, i: i, cerrado: cerrado, ms: ms };
    });
    var cerrados = items.filter(function (x) { return x.cerrado; }).sort(function (a, b) { return a.ms === b.ms ? a.i - b.i : (a.ms < b.ms ? -1 : 1); });
    var k = 0;
    return items.map(function (x) { return x.cerrado ? cerrados[k++].c : x.c; });
  }

  // Las reglas, cortas y juntas, dentro de un desplegable cerrado "Cómo funciona"
  function comoFuncionaHTML(co) {
    var lineas = [
      'Cada cambio pide retos nuevos del camino: 35 el primero y 55 el segundo, con mínimo 8 y 14 de cada tipo.',
      'El modo historia no cuenta.',
      'Si repites un reto que ya habías resuelto, cuenta una sola vez.',
      'Las fechas no cambian, solo se reparten distinto. Los cursos ya abiertos no se tocan.',
      'Si tu siguiente curso se abre solo, la oferta pasa al nuevo siguiente y tus retos se conservan.'
    ];
    var hist = co && co.cambios && co.cambios.length ? '<p class="zco-como__sub">Tus cambios</p><ul>' + co.cambios.map(function (x) {
      return '<li>Cambio ' + esc(x.n) + ': «' + esc(x.titulo || 'Tu curso') + '»' + (Number.isFinite(x.en) ? ' (' + esc(fechaCorta(x.en)) + ')' : '') + '</li>';
    }).join('') + '</ul>' : '';
    return '<details class="zco-como"><summary>Cómo funciona</summary><ul>' + lineas.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' + hist + '</details>';
  }

  // Tres mini-barras por tipo (Quiz, Detective, Ordena) hacia el mínimo del cambio que sigue
  function tiposHTML(co, t) {
    return '<ul class="zcal-tipos">' + TIPOS_CORTOS.map(function (x) {
      var h = Math.min(co.contados[x[0]], t.porTipo), ok = co.contados[x[0]] >= t.porTipo;
      return '<li class="zcal-tipo' + (ok ? ' is-ok' : '') + '"><span class="zcal-tipo__n">' + esc(x[1]) + '</span><span class="zcal-tipo__b"><i style="width:' + Math.round(h * 100 / t.porTipo) + '%"></i></span>' +
        '<span class="zcal-tipo__c">' + (ok ? svg('check', 14) : esc(co.contados[x[0]] + '/' + t.porTipo)) + '</span></li>';
    }).join('') + '</ul>';
  }

  function barraTotalHTML(co, t) {
    var hecho = Math.min(co.contados.total, t.total);
    var pct = t.total ? Math.max(0, Math.min(100, Math.round(hecho * 100 / t.total))) : 0;
    return '<div class="zcal-barra" role="progressbar" aria-label="Retos nuevos para el cambio ' + esc(t.n) + '" aria-valuemin="0" aria-valuemax="' + t.total + '" aria-valuenow="' + hecho + '"><span style="width:' + pct + '%"></span></div>';
  }

  // Bloque "Cambia el orden de tu calendario" (Mis logros): título, una línea, dos tarjetas, una barra, tres mini-barras y un botón.
  //   o.modo: 'cursos' (con el botón para elegir el curso) | 'retos' (solo avance; el botón lleva a Cursos)
  //   o.href: enlace de Cursos para el modo 'retos'; o.hrefRetos: enlace a Retos para el modo 'cursos'
  function cambioOrdenHTML(co, o) {
    if (!co) return '';
    var op = o || {};
    var t = co.siguiente;
    var tarjetas = co.tramos.map(function (x) {
      var estado = x.usado ? 'Hecho' : (t && t.n === x.n ? (x.cumple ? 'Listo' : 'En curso') : 'Pendiente');
      var clase = x.usado ? ' is-hecho' : (t && t.n === x.n ? (x.cumple ? ' is-listo' : ' is-actual') : '');
      return '<li class="zco-tj' + clase + '"><span class="zco-tj__top"><b>Cambio ' + esc(x.n) + '</b><span class="zco-tj__estado">' + (x.usado ? svg('check', 13) : '') + esc(estado) + '</span></span>' +
        '<span class="zco-tj__meta">' + esc(x.total) + ' retos</span></li>';
    }).join('');
    var cuerpo;
    if (co.completo) {
      cuerpo = '<p class="zco__fin">' + svg('check', 18) + '<span>Usaste tus 2 cambios.</span></p>';
    } else {
      var hecho = Math.min(co.contados.total, t.total);
      // En Retos solo llega el avance (sin la lista de cursos): se considera listo cuando se cumplen los retos
      var listo = op.modo === 'retos' ? t.cumple : co.disponible;
      var boton = '';
      if (listo && op.modo !== 'retos') boton = '<button type="button" class="zcal-btn" data-zco="elegir">' + svg('orden', 16) + 'Elegir curso</button>';
      else if (listo && op.href) boton = '<a class="zcal-btn" href="' + esc(op.href) + '">' + svg('orden', 16) + 'Elegir curso</a>';
      else if (op.modo !== 'retos' && op.hrefRetos) boton = '<a class="zcal-btn" href="' + esc(op.hrefRetos) + '">Ir a los retos' + svg('flecha', 16) + '</a>';
      var estadoTxt = listo ? ' · Listo para elegir' : (t.cumple ? ' · No hay otro curso cerrado' : '');
      cuerpo = barraTotalHTML(co, t) + '<p class="zco__total"><b>' + esc(hecho) + ' de ' + esc(t.total) + '</b> retos nuevos' + esc(estadoTxt) + '</p>' +
        tiposHTML(co, t) + (boton ? '<div class="zco__acc">' + boton + '</div>' : '');
    }
    return '<section class="zco" id="cambiar-orden" aria-labelledby="zcoTitulo">' +
      '<div class="zco__cab"><span class="zco__ic" aria-hidden="true">' + svg('orden', 22) + '</span><h3 class="zco__t" id="zcoTitulo">Cambia el orden de tu calendario</h3></div>' +
      '<p class="zco__apoyo">2 cambios en total. Tú eliges qué curso se abre antes.</p>' +
      '<ol class="zco__tarjetas">' + tarjetas + '</ol>' + cuerpo + comoFuncionaHTML(co) + '</section>';
  }

  // Línea corta de Cursos: "Tu siguiente curso en desbloquearse es «X» (en N días). Puedes cambiarlo." con el botón Cambiar,
  // que lleva a la página de ESE curso (ahí están los requisitos y, si ya cumple, el botón para elegir). Con los 2 cambios usados: solo la línea.
  function cambioOrdenLineaHTML(co) {
    if (!co || !co.cerrados.length) return '';
    var p = co.cerrados[0];
    var dias = diasDe(p);
    var cuandoSe = Number.isFinite(dias) ? ' (' + cuando(dias) + ')' : '';
    return '<div class="zco-linea" id="cambiar-orden-linea"><span class="zco-linea__ic" aria-hidden="true">' + svg('orden', 16) + '</span>' +
      '<p class="zco-linea__t">Tu siguiente curso en desbloquearse es <b class="zco-linea__nombre">«' + esc(p.titulo || 'tu siguiente curso') + '»</b>' + esc(cuandoSe) + '.' + (co.completo ? '' : '<span class="zco-linea__ayuda"> Puedes cambiarlo.</span>') + '</p>' +
      (co.completo ? '' : '<button type="button" class="zco-linea__btn" data-zco="ver" data-curso="' + esc(p.cursoId) + '">Cambiar</button>') + '</div>';
  }

  // Oferta dentro de la página del curso: solo en el SIGUIENTE curso por abrirse (si ese se abre solo, pasa al nuevo siguiente).
  // Lo mínimo visible: qué necesita, progreso y botón; todo lo demás va en "Cómo funciona".
  function cambioOrdenOfertaHTML(co, cursoId) {
    if (!co || co.completo || !co.siguiente || !co.cerrados.length || co.cerrados[0].cursoId !== cursoId) return '';
    var t = co.siguiente;
    var hecho = Math.min(co.contados.total, t.total);
    var boton = co.disponible ? '<button type="button" class="zcal-btn" data-zco="elegir">' + svg('orden', 16) + 'Elegir curso</button>' : '';
    return '<section class="zco-oferta" aria-label="Cambia el orden de tu calendario">' +
      '<div class="zco-oferta__cab"><span class="zco-oferta__ic" aria-hidden="true">' + svg('orden', 18) + '</span><div><h4 class="zco-oferta__t">Elige otro curso en lugar de este</h4>' +
      '<p class="zco-oferta__sub">Cambio ' + esc(t.n) + ' de ' + esc(co.maximo) + ' · ' + esc(t.total) + ' retos nuevos (mínimo ' + esc(t.porTipo) + ' de cada tipo)</p></div></div>' +
      barraTotalHTML(co, t) + '<p class="zco__total"><b>' + esc(hecho) + ' de ' + esc(t.total) + '</b> retos nuevos' + (co.disponible ? ' · Listo para elegir' : '') + '</p>' +
      tiposHTML(co, t) + (boton ? '<div class="zco__acc">' + boton + '</div>' : '') + comoFuncionaHTML(co) + '</section>';
  }

  // Todo lo que los retos ofrecen en la página de un curso cerrado. Si hay dos ofertas se separan con claridad:
  //   Opción 1 (15 retos): abre ESTE curso antes; solo cuentas nuevas con prueba gratuita (ZOO_CALENDARIO.primerCurso).
  //   Opción 2 (35 / 55 retos nuevos): elegir OTRO curso en su lugar; para todos los miembros.
  function ofertasCursoHTML(pc, co, cursoId) {
    var acelera = pc && pc.estado === 'pendiente' && pc.cursoId === cursoId ? avisoRetosHTML(pc) : '';
    var cambia = cambioOrdenOfertaHTML(co, cursoId);
    if (acelera && cambia) {
      return '<div class="zco-ofertas"><p class="zco-ofertas__intro">Dos opciones con los retos, independientes: la <b>1</b> abre este curso antes (solo cuentas nuevas con prueba gratuita) y la <b>2</b> te deja elegir otro curso (todos los miembros).</p>' +
        '<p class="zco-ofertas__rot">Opción 1 · Abrir este curso antes</p>' + acelera + '<p class="zco-ofertas__rot">Opción 2 · Elegir otro curso en su lugar</p>' + cambia + '</div>';
    }
    return acelera + cambia;
  }

  // Texto de lo que pasaría con el curso elegido: "«X» pasará a abrirse en 2 días (7 de noviembre)." (una sola vez, en el pie de la ventana)
  function llegaraTexto(co, cursoId) {
    if (!co || !co.cerrados.length) return '';
    var c = co.cerrados.filter(function (x) { return x.cursoId === cursoId; })[0];
    var p = co.cerrados[0];
    if (!c || !p) return '';
    var dias = diasDe(p);
    return '«' + (c.titulo || 'Este curso') + '» pasará a abrirse ' + (Number.isFinite(dias) ? cuando(dias) : 'primero') + (Number.isFinite(p.desbloqueoEn) ? ' (' + fechaCorta(p.desbloqueoEn) + ')' : '') + '.';
  }

  // Solo rutas relativas del sitio o https (nada de javascript: ni datos raros) para las carátulas
  function urlImagen(u) {
    var s = String(u == null ? '' : u).trim();
    return /^(https?:\/\/|\.{1,2}\/|\/)[^\s"'<>()]*$/.test(s) ? s : '';
  }

  // Ventana para elegir el curso y confirmar (el cambio es definitivo). Cada opción lleva su carátula, nombre y cuándo se abre,
  // en el orden real de apertura. Los textos de la base de datos se escapan. imagenes: { cursoId: url } (opcional).
  function cambioOrdenModalHTML(co, imagenes) {
    if (!co || !co.siguiente) return '';
    var imgs = imagenes && typeof imagenes === 'object' ? imagenes : {};
    var primero = co.cerrados[0] || null;
    var otros = co.cerrados.filter(function (c) { return c.lugar !== 1; });
    var items = otros.map(function (c) {
      var u = urlImagen(imgs[c.cursoId]);
      var dias = diasDe(c);
      var cuandoSe = (Number.isFinite(dias) ? 'Se abre ' + cuando(dias) : 'Se abre más adelante') + (Number.isFinite(c.desbloqueoEn) ? ' (' + fechaCorta(c.desbloqueoEn) + ')' : '');
      return '<li><label class="zco-op"><input type="radio" name="zcoCurso" value="' + esc(c.cursoId) + '">' +
        '<span class="zco-op__img' + (u ? '' : ' zco-op__img--vacia') + '" aria-hidden="true">' + (u ? '<img src="' + esc(u) + '" alt="" loading="lazy" decoding="async">' : svg('libro', 22)) + '</span>' +
        '<span class="zco-op__t"><b>' + esc(c.titulo || 'Curso') + '</b><small>' + esc(cuandoSe) + '</small></span></label></li>';
    }).join('');
    var dPrimero = primero ? diasDe(primero) : null;
    return '<div class="zco-fondo" data-zco="cerrar"></div>' +
      '<div class="zco-modal" role="dialog" aria-modal="true" aria-labelledby="zcoModalT" tabindex="-1">' +
        '<button type="button" class="zco-x" data-zco="cerrar" aria-label="Cerrar">' + svg('x', 18) + '</button>' +
        '<p class="zcal-eyebrow">Cambio ' + esc(co.siguiente.n) + ' de ' + esc(co.maximo) + '</p>' +
        '<h3 id="zcoModalT" class="zco-modal__t">Elige el curso que se abre primero</h3>' +
        (primero ? '<p class="zco-modal__txt">Ahora se abre primero «' + esc(primero.titulo || 'tu siguiente curso') + '»' + (Number.isFinite(dPrimero) ? ' (' + esc(cuando(dPrimero)) + ')' : '') + '.</p>' : '') +
        '<ul class="zco-lista" role="radiogroup" aria-label="Cursos cerrados, en el orden en que se abren">' + items + '</ul>' +
        '<p class="zco-modal__sel" id="zcoSel" aria-live="polite" hidden></p>' +
        '<p class="zco-modal__aviso">' + svg('orden', 16) + '<span><b>Este cambio es definitivo.</b> No se puede deshacer.</span></p>' +
        '<p class="zco-modal__err" role="alert" hidden></p>' +
        '<div class="zco-pie"><button type="button" class="zco-sec" data-zco="cerrar">Cancelar</button><button type="button" class="zcal-btn" data-zco="confirmar" disabled>Confirmar el cambio</button></div>' +
      '</div>';
  }

  /* ───────────────────────── Red (solo navegador) ───────────────────────── */

  // apiFetch: ZOORIGEN_CLUB.apiFetch. Nunca lanza: si el servidor no responde devuelve null y la página usa la regla de siempre.
  function cargar(apiFetch, esperaMs) {
    var espera = Number.isFinite(esperaMs) ? esperaMs : 6000;
    return new Promise(function (resolver) {
      var listo = false;
      var t = setTimeout(function () { if (!listo) { listo = true; resolver(null); } }, espera);
      Promise.resolve().then(function () { return apiFetch('/api/calendario'); }).then(function (resp) {
        if (listo) return; listo = true; clearTimeout(t); resolver(normalizar(resp));
      }).catch(function () { if (listo) return; listo = true; clearTimeout(t); resolver(null); });
    });
  }

  return {
    RETOS_META: RETOS_META, TIPOS: TIPOS,
    normalizar: normalizar, primerCurso: primerCurso, desbloqueo: desbloqueo, resumen: resumen, cargar: cargar,
    diasDe: diasDe, ordenarPorDesbloqueo: ordenarPorDesbloqueo, llegaraTexto: llegaraTexto, comoFuncionaHTML: comoFuncionaHTML,
    cambioOrden: cambioOrden, cambioOrdenLineaHTML: cambioOrdenLineaHTML, cambioOrdenOfertaHTML: cambioOrdenOfertaHTML, ofertasCursoHTML: ofertasCursoHTML, cambioOrdenHTML: cambioOrdenHTML, cambioOrdenModalHTML: cambioOrdenModalHTML, faltanTexto: faltanTexto,
    cuando: cuando, fechaLarga: fechaLarga, tituloTarjeta: tituloTarjeta, textoFaltan: textoFaltan,
    tarjetaRetosHTML: tarjetaRetosHTML, tiraRetosHTML: tiraRetosHTML, avisoRetosHTML: avisoRetosHTML, proximoHTML: proximoHTML, bannerRutaHTML: bannerRutaHTML
  };
});
