/* ============================================================ */
/* CLUB VIP ZOORIGEN · INICIO: tarjeta principal del curso       */
/* "Continúa tu curso" o "Próximo desbloqueo", según el avance.   */
/* Usa las reglas de club-acceso.js (las mismas de Cursos).       */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./club-acceso.js'));
  else root.ZOO_INICIO = factory(root.ZOO_ACCESO);
})(typeof self !== 'undefined' ? self : this, function (ACCESO) {
  'use strict';

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function totalClases(c) {
    if (c && Array.isArray(c.lecciones) && c.lecciones.length) return c.lecciones.length;
    return c && c.driveId ? 1 : 0;
  }

  function avanceDe(progreso, cursoId) {
    var p = progreso && progreso[cursoId];
    var hechas = p && Array.isArray(p.completedLessons) ? p.completedLessons.length : 0;
    return { hechas: hechas, terminado: !!(p && p.isCompleted === true) };
  }

  /* Decide qué mostrar.
     entrada: { cursos, dias, adelantados, progreso }
     salida:  { tipo: 'sin-cursos' | 'continuar' | 'proximo' | 'terminado', curso?, hechas?, total?, diasFalta? } */
  function elegirHero(entrada) {
    var o = entrada || {};
    var cursos = Array.isArray(o.cursos) ? o.cursos.filter(function (c) { return c && c.id; }) : [];
    if (!cursos.length) return { tipo: 'sin-cursos' };
    var lista = ACCESO.ordenParaDesbloqueo(cursos);
    var abiertos = [], cerrados = [];
    lista.forEach(function (c, i) {
      var r = ACCESO.desbloqueoCurso({ lista: lista, i: i, dias: o.dias, adelantados: o.adelantados });
      (r.desbloqueado ? abiertos : cerrados).push({ curso: c, diasFalta: r.diasFalta });
    });
    // 1) el primer curso abierto que aún no termina (el que ya empezó va antes que uno sin tocar)
    var pendientes = abiertos.map(function (x) {
      var a = avanceDe(o.progreso, x.curso.id);
      return { curso: x.curso, hechas: a.hechas, terminado: a.terminado, total: totalClases(x.curso) };
    }).filter(function (x) { return !x.terminado && x.total > 0; });
    var empezado = pendientes.filter(function (x) { return x.hechas > 0; })[0];
    var elegido = empezado || pendientes[0];
    if (elegido) return { tipo: 'continuar', curso: elegido.curso, hechas: elegido.hechas, total: elegido.total };
    // 2) si no hay nada por continuar, el próximo curso que se abre (el que menos días falte)
    var conFecha = cerrados.filter(function (x) { return Number.isFinite(Number(x.diasFalta)) && x.diasFalta !== null; })
      .sort(function (a, b) { return a.diasFalta - b.diasFalta; })[0];
    if (conFecha) return { tipo: 'proximo', curso: conFecha.curso, diasFalta: Math.max(0, Math.ceil(Number(conFecha.diasFalta))) };
    if (cerrados.length) return { tipo: 'proximo', curso: cerrados[0].curso, diasFalta: null };
    return { tipo: 'terminado' };
  }

  function textoDias(n) { return n === 0 ? 'hoy' : (n === 1 ? 'mañana' : 'en ' + n + ' días'); }

  function fechaCorta(ahora, dias) {
    var d = new Date((ahora instanceof Date ? ahora.getTime() : Date.now()) + dias * 86400000);
    return d.getDate() + ' ' + MESES[d.getMonth()];
  }

  function imagenSegura(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s || /drive\.google\.com/i.test(s)) return '';
    if (/^https:\/\/[^\s"'<>()\\]+$/i.test(s)) return s;
    if (/^(\.\.\/)?assets\/[A-Za-z0-9_\/.\-]+$/.test(s)) return (s.indexOf('../') === 0 ? '' : '../') + s;
    return '';
  }

  /* HTML de la tarjeta. opciones: { ahora, hrefCursos } */
  function heroHTML(h, opciones) {
    opciones = opciones || {};
    var href = opciones.hrefCursos || 'club-biblioteca.html';
    if (!h || h.tipo === 'sin-cursos') {
      return '<div class="ini-hero ini-hero--vacio"><div class="ini-hero__cuerpo"><div class="ini-hero__etq">Cursos</div>' +
        '<h2 class="ini-hero__titulo">Pronto tendrás cursos disponibles</h2><p class="ini-hero__meta">El equipo Zoorigen está subiendo los primeros cursos.</p></div></div>';
    }
    if (h.tipo === 'terminado') {
      return '<div class="ini-hero ini-hero--vacio"><div class="ini-hero__cuerpo"><div class="ini-hero__etq">¡Al día!</div>' +
        '<h2 class="ini-hero__titulo">Terminaste todos tus cursos</h2><p class="ini-hero__meta">Cuando se publique uno nuevo lo verás aquí.</p>' +
        '<a class="ini-hero__btn" href="' + esc(href) + '">Ver mis cursos</a></div></div>';
    }
    var c = h.curso, img = imagenSegura(c.image);
    var meta = [c.area, c.duration, totalClases(c) ? totalClases(c) + (totalClases(c) === 1 ? ' clase' : ' clases') : ''].filter(Boolean).map(esc).join(' · ');
    var fondo = img ? ' style="--ini-img:url(\'' + esc(img) + '\')"' : '';
    var cuerpo;
    if (h.tipo === 'continuar') {
      var pct = h.total ? Math.round(h.hechas * 100 / h.total) : 0;
      cuerpo = '<div class="ini-hero__etq">' + (h.hechas > 0 ? 'Continúa tu curso' : 'Empieza tu curso') + '</div>' +
        '<h2 class="ini-hero__titulo">' + esc(c.title) + '</h2><p class="ini-hero__meta">' + meta + '</p>' +
        (h.hechas > 0 ? '<div class="ini-hero__barra" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div><div class="ini-hero__avance">' + h.hechas + ' de ' + h.total + ' clases · ' + pct + '%</div>' : '') +
        '<a class="ini-hero__btn" href="' + esc(href) + '">' + (h.hechas > 0 ? 'Seguir aprendiendo' : 'Ver curso') + '</a>';
    } else {
      var cuando = h.diasFalta === null ? '' : '<div class="ini-hero__cuenta"><span>Se abre</span><strong>' + esc(textoDias(h.diasFalta)) + '</strong><small>' + esc(fechaCorta(opciones.ahora, h.diasFalta)) + '</small></div>';
      cuerpo = '<div class="ini-hero__etq">Próximo desbloqueo</div>' +
        '<h2 class="ini-hero__titulo">' + esc(c.title) + '</h2><p class="ini-hero__meta">' + meta + '</p>' + cuando +
        '<a class="ini-hero__btn ini-hero__btn--suave" href="' + esc(href) + '">Ver mis cursos</a>';
    }
    return '<div class="ini-hero' + (img ? ' ini-hero--img' : '') + (h.tipo === 'proximo' ? ' ini-hero--espera' : '') + '"' + fondo + '><div class="ini-hero__cuerpo">' + cuerpo + '</div></div>';
  }

  return { elegirHero: elegirHero, heroHTML: heroHTML, textoDias: textoDias, imagenSegura: imagenSegura, totalClases: totalClases, avanceDe: avanceDe };
});
