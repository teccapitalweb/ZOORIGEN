/* ============================================================ */
/* CLUB VIP ZOORIGEN · INICIO                                    */
/* Saludo, tarjeta del curso ("Continúa tu curso" o "Espera tu    */
/* próximo curso"), "Tu siguiente meta" y accesos con números.    */
/* Usa las reglas de club-acceso.js (las mismas de Cursos).       */
/* La parte pura se prueba en Node.                               */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./club-acceso.js'));
  else root.ZOO_INICIO = factory(root.ZOO_ACCESO);
})(typeof self !== 'undefined' ? self : this, function (ACCESO) {
  'use strict';

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* Fotos propias del sitio por área, para cuando el curso no trae imagen. */
  var FOTO_POR_AREA = [
    [/apic|abeja|polin|miel/i, 'assets/img/areas/apicultura-polinizacion.jpg'],
    [/etolog|comport|bienestar/i, 'assets/img/areas/etologia-manejo-animal.jpg'],
    [/ponzo|venen|toxic|serpient|arac/i, 'assets/img/areas/fauna-ponzonosa-toxicologia.jpg'],
    [/investig|monitor|ciencia|biolog/i, 'assets/img/areas/investigacion-cientifica-monitoreo.jpg'],
    [/cautiv|manejo|exhib|zool/i, 'assets/img/areas/manejo-fauna-cautiverio-exhibicion.jpg']
  ];
  var FOTO_GENERAL = 'assets/img/areas/fauna-silvestre-conservacion.webp';

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

  /* Decide qué mostrar y resume los números del inicio.
     entrada: { cursos, dias, adelantados, progreso }
     salida:  { tipo: 'sin-cursos' | 'continuar' | 'proximo' | 'terminado', curso?, hechas?, total?, diasFalta?,
                resumen: { cursosAbiertos, cursosTotal, clasesHechas, clasesTotal } } */
  function elegirHero(entrada) {
    var o = entrada || {};
    var cursos = Array.isArray(o.cursos) ? o.cursos.filter(function (c) { return c && c.id; }) : [];
    var resumen = { cursosAbiertos: 0, cursosTotal: cursos.length, clasesHechas: 0, clasesTotal: 0 };
    cursos.forEach(function (c) {
      resumen.clasesTotal += totalClases(c);
      resumen.clasesHechas += Math.min(avanceDe(o.progreso, c.id).hechas, totalClases(c));
    });
    if (!cursos.length) return { tipo: 'sin-cursos', resumen: resumen };
    var lista = ACCESO.ordenParaDesbloqueo(cursos);
    var abiertos = [], cerrados = [];
    lista.forEach(function (c, i) {
      var r = ACCESO.desbloqueoCurso({ lista: lista, i: i, dias: o.dias, adelantados: o.adelantados });
      (r.desbloqueado ? abiertos : cerrados).push({ curso: c, diasFalta: r.diasFalta });
    });
    resumen.cursosAbiertos = abiertos.length;
    // 1) el primer curso abierto que aún no termina (el que ya empezó va antes que uno sin tocar)
    var pendientes = abiertos.map(function (x) {
      var a = avanceDe(o.progreso, x.curso.id);
      return { curso: x.curso, hechas: a.hechas, terminado: a.terminado, total: totalClases(x.curso) };
    }).filter(function (x) { return !x.terminado && x.total > 0; });
    var empezado = pendientes.filter(function (x) { return x.hechas > 0; })[0];
    var elegido = empezado || pendientes[0];
    if (elegido) return { tipo: 'continuar', curso: elegido.curso, hechas: elegido.hechas, total: elegido.total, resumen: resumen };
    // 2) si no hay nada por continuar, el próximo curso que se abre (el que menos días falte)
    var conFecha = cerrados.filter(function (x) { return Number.isFinite(Number(x.diasFalta)) && x.diasFalta !== null; })
      .sort(function (a, b) { return a.diasFalta - b.diasFalta; })[0];
    if (conFecha) return { tipo: 'proximo', curso: conFecha.curso, diasFalta: Math.max(0, Math.ceil(Number(conFecha.diasFalta))), resumen: resumen };
    if (cerrados.length) return { tipo: 'proximo', curso: cerrados[0].curso, diasFalta: null, resumen: resumen };
    return { tipo: 'terminado', resumen: resumen };
  }

  function textoDias(n) { return n === 0 ? 'hoy' : (n === 1 ? 'mañana' : 'en ' + n + ' días'); }

  function fechaCorta(ahora, dias) {
    var d = new Date((ahora instanceof Date ? ahora.getTime() : Date.now()) + dias * 86400000);
    return d.getDate() + ' ' + MESES[d.getMonth()];
  }

  /* "viernes 9 de octubre de 2026" */
  function fechaLarga(ahora) {
    var d = ahora instanceof Date ? ahora : new Date();
    return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES_LARGOS[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function saludoHora(hora) { return hora < 12 ? 'Buenos días' : (hora < 19 ? 'Buenas tardes' : 'Buenas noches'); }

  function imagenSegura(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s || /drive\.google\.com/i.test(s)) return '';
    if (/^https:\/\/[^\s"'<>()\\]+$/i.test(s)) return s;
    if (/^(\.\.\/)?assets\/[A-Za-z0-9_\/.\-]+$/.test(s)) return (s.indexOf('../') === 0 ? '' : '../') + s;
    return '';
  }

  /* Foto de portada del curso: la suya, o una foto propia del sitio según su área. */
  function fotoDelCurso(curso) {
    var propia = imagenSegura(curso && curso.image);
    if (propia) return propia;
    var area = String((curso && (curso.area || curso.title)) || '');
    for (var i = 0; i < FOTO_POR_AREA.length; i++) if (FOTO_POR_AREA[i][0].test(area)) return '../' + FOTO_POR_AREA[i][1];
    return '../' + FOTO_GENERAL;
  }

  /* Los tres pasos de "Tu siguiente meta". */
  function pasosDe(h) {
    if (h && h.tipo === 'continuar') return { titulo: 'Sigue avanzando', pasos: [
      ['Ahora', 'Continúa «' + (h.curso.title || 'tu curso') + '» y completa sus juegos', 'club-biblioteca.html'],
      ['Después', 'Supera retos para ganar XP y abrir libros', 'club-retos.html'],
      ['Al terminar', 'Obtén tu certificado y sube de nivel', 'club-certificados.html']] };
    return { titulo: 'Mientras esperas', pasos: [
      ['Ahora', 'Supera un reto y gana XP', 'club-retos.html'],
      ['Después', 'Lee un libro o descarga una guía', 'club-pdfs.html'],
      ['Cuando se abra', 'Entra a tu curso y completa sus juegos', 'club-biblioteca.html']] };
  }

  /* Los cuatro accesos con número. datos: { pdfsAbiertos, pdfsTotal } (opcionales). */
  function kpisDe(h, datos) {
    var r = (h && h.resumen) || { cursosAbiertos: 0, cursosTotal: 0, clasesHechas: 0, clasesTotal: 0 };
    datos = datos || {};
    var pdfs = Number.isFinite(datos.pdfsTotal) ? datos.pdfsAbiertos + '/' + datos.pdfsTotal : '—';
    return [
      { id: 'cursos', etiqueta: 'Cursos', valor: r.cursosAbiertos + '/' + r.cursosTotal, nota: 'abiertos', href: 'club-biblioteca.html', color: '#2F7A4F' },
      { id: 'clases', etiqueta: 'Clases', valor: r.clasesHechas + '/' + r.clasesTotal, nota: 'completadas', href: 'club-biblioteca.html', color: '#2AA4D5' },
      { id: 'pdfs', etiqueta: 'PDFs', valor: pdfs, nota: 'materiales', href: 'club-pdfs.html', color: '#E8A317' },
      { id: 'pro', etiqueta: 'Pro', valor: '13', nota: 'herramientas', href: 'club-herramientas.html', color: '#D55A28' }
    ];
  }

  /* HTML del saludo (ícono, saludo con nombre, frase y fecha). */
  function saludoHTML(nombre, ahora) {
    var d = ahora instanceof Date ? ahora : new Date();
    return '<section class="ih-saludo"><span class="ih-saludo__ico" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"/></svg></span>' +
      '<div class="ih-saludo__txt"><div class="ih-eyebrow">Tu espacio de aprendizaje</div><h1 id="greeting">' + esc(saludoHora(d.getHours())) + ', <span>' + esc(nombre) + '</span></h1>' +
      '<p>Retoma tus cursos, supera retos y explora el material del Club.</p></div>' +
      '<div class="ih-fecha"><small>Hoy</small><strong id="date">' + esc(fechaLarga(d)) + '</strong></div></section>';
  }

  /* HTML de la tarjeta principal + "Tu siguiente meta" + accesos. opciones: { ahora, pdfsAbiertos, pdfsTotal, hrefCursos } */
  function widgetHTML(h, opciones) {
    opciones = opciones || {};
    h = h || { tipo: 'sin-cursos' };
    var href = esc(opciones.hrefCursos || 'club-biblioteca.html');
    var espera = h.tipo === 'proximo';
    var vacio = h.tipo === 'sin-cursos' || h.tipo === 'terminado';
    var foto = h.curso ? fotoDelCurso(h.curso) : '../' + FOTO_GENERAL;
    var titulo = vacio ? (h.tipo === 'terminado' ? 'Terminaste tus cursos.' : 'Pronto habrá cursos.') : (espera ? 'Espera tu próximo curso.' : 'Continúa tu curso.');
    var tarjeta;
    if (h.tipo === 'sin-cursos') {
      tarjeta = '<div class="ih-card"><div class="ih-card__etq">Cursos</div><div class="ih-card__nombre">El equipo está subiendo los primeros cursos</div><a class="ih-btn ih-btn--suave" href="' + href + '">Ver mis cursos</a></div>';
    } else if (h.tipo === 'terminado') {
      tarjeta = '<div class="ih-card"><div class="ih-card__etq">¡Al día!</div><div class="ih-card__nombre">Cuando se publique un curso nuevo lo verás aquí</div><a class="ih-btn ih-btn--suave" href="' + href + '">Ver mis cursos</a></div>';
    } else if (espera) {
      var cuando = h.diasFalta === null || h.diasFalta === undefined ? '' :
        '<span class="ih-btn__cuenta"><small>Se abre</small><b>' + esc(textoDias(h.diasFalta)) + '</b><em>· ' + esc(fechaCorta(opciones.ahora, h.diasFalta)) + '</em></span>';
      tarjeta = '<div class="ih-card"><div class="ih-card__etq">Próximo desbloqueo</div><div class="ih-card__nombre">' + esc(h.curso.title) + '</div>' +
        (cuando ? '<div class="ih-card__cuenta">' + cuando + '</div>' : '') + '<a class="ih-btn ih-btn--suave" href="' + href + '">Ver mis cursos</a></div>';
    } else {
      var pct = h.total ? Math.round(h.hechas * 100 / h.total) : 0;
      tarjeta = '<div class="ih-card"><div class="ih-card__etq">' + (h.hechas > 0 ? 'Tu curso en marcha' : 'Listo para empezar') + '</div><div class="ih-card__nombre">' + esc(h.curso.title) + '</div>' +
        '<div class="ih-card__prog" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
        '<div class="ih-card__avance">' + h.hechas + ' de ' + h.total + ' clases · ' + pct + '%</div>' +
        '<a class="ih-btn" href="' + href + '">' + (h.hechas > 0 ? 'Seguir aprendiendo' : 'Ver curso') + '</a></div>';
    }
    var m = pasosDe(h);
    var meta = '<div class="ih-meta"><div class="ih-meta__etq">Tu siguiente meta</div><h3>' + esc(m.titulo) + '</h3><ol>' +
      m.pasos.map(function (p) { return '<li><a href="' + esc(p[2]) + '"><b>' + esc(p[0]) + '</b><span>' + esc(p[1]) + '</span></a></li>'; }).join('') + '</ol></div>';
    var kpis = '<div class="ih-kpis">' + kpisDe(h, opciones).map(function (k) {
      return '<a class="ih-kpi" href="' + esc(k.href) + '" style="--k:' + esc(k.color) + '"><span class="ih-kpi__e">' + esc(k.etiqueta) + '</span><strong>' + esc(k.valor) + '</strong><small>' + esc(k.nota) + '</small><span class="ih-kpi__abrir">Abrir →</span></a>';
    }).join('') + '</div>';
    return '<div class="ih-widget"><div class="ih-hero' + (espera ? ' ih-hero--espera' : '') + '"><div class="ih-hero__foto" style="background-image:url(\'' + esc(foto) + '\')"></div><div class="ih-hero__cuerpo"><h2>' + esc(titulo) + '</h2>' + tarjeta + '</div></div>' +
      '<div class="ih-lado">' + meta + kpis + '</div></div>';
  }

  return {
    elegirHero: elegirHero, widgetHTML: widgetHTML, saludoHTML: saludoHTML, textoDias: textoDias, imagenSegura: imagenSegura, fotoDelCurso: fotoDelCurso,
    totalClases: totalClases, avanceDe: avanceDe, pasosDe: pasosDe, kpisDe: kpisDe, fechaLarga: fechaLarga, saludoHora: saludoHora
  };
});
