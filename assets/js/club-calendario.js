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
    flecha: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'
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
    cuando: cuando, fechaLarga: fechaLarga, tituloTarjeta: tituloTarjeta, textoFaltan: textoFaltan,
    tarjetaRetosHTML: tarjetaRetosHTML, tiraRetosHTML: tiraRetosHTML, avisoRetosHTML: avisoRetosHTML, proximoHTML: proximoHTML, bannerRutaHTML: bannerRutaHTML
  };
});
