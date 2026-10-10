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
    var ahoraMs = Number.isFinite(o.ahoraMs) ? o.ahoraMs : Date.now();
    lista.forEach(function (c, i) {
      var r = ACCESO.desbloqueoCurso({ lista: lista, i: i, dias: o.dias, adelantados: o.adelantados });
      var ms = r.desbloqueado ? 0 : ACCESO.msParaDesbloquear(lista, i, o.desdeMs, ahoraMs);
      (r.desbloqueado ? abiertos : cerrados).push({ curso: c, diasFalta: r.diasFalta, msFalta: ms });
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
      .sort(function (a, b) { return (Number.isFinite(a.msFalta) && Number.isFinite(b.msFalta) ? a.msFalta - b.msFalta : a.diasFalta - b.diasFalta); })[0];
    if (conFecha) return { tipo: 'proximo', curso: conFecha.curso, diasFalta: Math.max(0, Math.ceil(Number(conFecha.diasFalta))), msFalta: Number.isFinite(conFecha.msFalta) ? conFecha.msFalta : null, resumen: resumen };
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

  /* Íconos sencillos (trazo) usados en las tarjetas. */
  var IC = {
    play: '<path d="M7 4v16l13 -8z"/>',
    flecha: '<path d="M5 12h14"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/>',
    foco: '<path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7"/><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3"/><path d="M9.7 17l4.6 0"/>',
    calendario: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"/>',
    chat: '<path d="M3 20l1.3 -3.9a9 8 0 1 1 3.4 2.9l-4.7 1"/>',
    estrella: '<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/>',
    usuario: '<circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>',
    usuarios: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>'
  };
  function svg(nombre, tam) {
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[nombre] || '') + '</svg>';
  }

  /* Los tres pasos de "Tu siguiente meta". [etiqueta, texto, página, ícono] */
  function pasosDe(h) {
    if (h && h.tipo === 'continuar') return { titulo: 'Sigue avanzando', pasos: [
      ['Ahora', 'Continúa «' + (h.curso.title || 'tu curso') + '» y completa sus juegos', 'club-biblioteca.html', 'play'],
      ['Después', 'Supera retos para ganar XP y abrir libros', 'club-retos.html', 'flecha'],
      ['Al terminar', 'Obtén tu certificado y sube de nivel', 'club-certificados.html', 'foco']] };
    var proximo = h && h.curso && h.curso.title ? 'Podrás empezar «' + h.curso.title + '» desde Cursos' : 'Entra a tu curso y completa sus juegos';
    return { titulo: 'Mientras esperas', pasos: [
      ['Ahora', 'Supera un reto y gana XP', 'club-retos.html', 'play'],
      ['Después', 'Gana libros y sube de nivel superando retos', 'club-pdfs.html', 'flecha'],
      ['Cuando se abra', proximo, 'club-biblioteca.html', 'foco']] };
  }

  /* Los cuatro accesos con número. datos: { pdfsAbiertos, pdfsTotal } (opcionales). */
  function kpisDe(h, datos) {
    var r = (h && h.resumen) || { cursosAbiertos: 0, cursosTotal: 0, clasesHechas: 0, clasesTotal: 0 };
    datos = datos || {};
    var pdfs = Number.isFinite(datos.pdfsTotal) ? datos.pdfsAbiertos + '/' + datos.pdfsTotal : '—';
    return [
      { id: 'cursos', etiqueta: 'Cursos', valor: r.cursosAbiertos + '/' + r.cursosTotal, nota: 'abiertos', href: 'club-biblioteca.html', color: '#2F7A4F' },
      { id: 'clases', etiqueta: 'Clases', valor: r.clasesHechas + '/' + r.clasesTotal, nota: 'completadas', href: 'club-biblioteca.html', color: '#D4547A' },
      { id: 'pdfs', etiqueta: 'PDFs', valor: pdfs, nota: 'materiales', href: 'club-pdfs.html', color: '#D9A21B' },
      { id: 'pro', etiqueta: 'Pro', valor: '13', nota: 'herramientas', href: 'club-herramientas.html', color: '#8B7FBA' }
    ];
  }

  /* "sábado, 10 de octubre" */
  function fechaDiaMes(ahora, dias, ms) {
    var d = new Date((ahora instanceof Date ? ahora.getTime() : Date.now()) + (Number.isFinite(ms) ? ms : dias * 86400000));
    return DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES_LARGOS[d.getMonth()];
  }
  function textoApertura(n, ms) {
    // Con la hora exacta: menos de 1 hora, "19 horas" y, a partir de un día, días.
    if (Number.isFinite(ms) && ms >= 0) {
      if (ms < 3600000) return 'menos de 1 hora';
      if (ms < 86400000) { var h = Math.ceil(ms / 3600000); return h === 1 ? '1 hora' : h + ' horas'; }
      var d = Math.ceil(ms / 86400000); return d === 1 ? '1 día' : d + ' días';
    }
    return n === 0 ? 'hoy' : (n === 1 ? '1 día' : n + ' días');
  }

  /* Tarjeta de la barra superior con el saludo: ícono, saludo con nombre, frase y fecha. */
  function saludoHTML(nombre, ahora) {
    var d = ahora instanceof Date ? ahora : new Date();
    var fecha = fechaLarga(d); fecha = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    return '<section class="ih-saludo"><span class="ih-saludo__ico" aria-hidden="true">' + svg('sol', 28) + '</span>' +
      '<div class="ih-saludo__txt"><div class="ih-eyebrow"><i></i>Tu espacio de aprendizaje</div><h1 id="greeting">' + esc(saludoHora(d.getHours())) + ', <span>' + esc(nombre) + '</span></h1>' +
      '<p>Tu acceso a cursos, herramientas pro y la comunidad de fauna silvestre más activa de México.</p></div>' +
      '<div class="ih-fecha"><small>Hoy</small><strong id="date">' + svg('calendario', 15) + esc(fecha) + '</strong></div></section>';
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
    var boton = '<a class="ih-btn" href="' + href + '">' + svg('play', 14) + (h.tipo === 'continuar' ? (h.hechas > 0 ? 'Seguir aprendiendo' : 'Ver curso') : 'Ver mis cursos') + '</a>';
    var tarjeta;
    if (h.tipo === 'sin-cursos') {
      tarjeta = '<div class="ih-card"><div class="ih-card__etq">Cursos</div><div class="ih-card__nombre">El equipo está subiendo los primeros cursos</div>' + boton + '</div>';
    } else if (h.tipo === 'terminado') {
      tarjeta = '<div class="ih-card"><div class="ih-card__etq">¡Al día!</div><div class="ih-card__nombre">Cuando se publique un curso nuevo lo verás aquí</div>' + boton + '</div>';
    } else if (espera) {
      var caja = h.diasFalta === null || h.diasFalta === undefined ? '' :
        '<div class="ih-card__caja"><small>Se abre en</small><strong>' + esc(textoApertura(h.diasFalta, h.msFalta)) + ' · ' + esc(fechaDiaMes(opciones.ahora, h.diasFalta, h.msFalta)) + '</strong></div>';
      tarjeta = '<div class="ih-card"><div class="ih-card__etq">Próximo desbloqueo</div><div class="ih-card__nombre">' + esc(h.curso.title) + '</div>' + caja + boton + '</div>';
    } else {
      var pct = h.total ? Math.round(h.hechas * 100 / h.total) : 0;
      tarjeta = '<div class="ih-card"><div class="ih-card__etq">' + (h.hechas > 0 ? 'Tu curso en marcha' : 'Listo para empezar') + '</div><div class="ih-card__nombre">' + esc(h.curso.title) + '</div>' +
        '<div class="ih-card__caja"><small>Tu avance</small><strong>' + h.hechas + ' de ' + h.total + ' clases · ' + pct + '%</strong>' +
        '<div class="ih-card__prog" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div></div>' + boton + '</div>';
    }
    var m = pasosDe(h);
    var meta = '<div class="ih-meta"><div class="ih-meta__etq">' + svg('foco', 14) + 'Tu siguiente meta</div><h3>' + esc(m.titulo) + '</h3><ol>' +
      m.pasos.map(function (p) { return '<li><a href="' + esc(p[2]) + '"><span class="ih-meta__ico">' + svg(p[3], 16) + '</span><span class="ih-meta__txt"><b>' + esc(p[0]) + '</b><span>' + esc(p[1]) + '</span></span></a></li>'; }).join('') + '</ol></div>';
    var kpis = '<div class="ih-kpis">' + kpisDe(h, opciones).map(function (k) {
      return '<a class="ih-kpi ih-kpi--' + esc(k.id) + '" href="' + esc(k.href) + '" style="--k:' + esc(k.color) + '"><span class="ih-kpi__e">' + esc(k.etiqueta) + '</span><strong>' + esc(k.valor) + '</strong><small>' + esc(k.nota) + '</small><span class="ih-kpi__abrir">Abrir →</span></a>';
    }).join('') + '</div>';
    return '<div class="ih-widget"><div class="ih-hero' + (espera ? ' ih-hero--espera' : '') + '"><div class="ih-hero__foto" style="background-image:url(\'' + esc(foto) + '\')"></div><div class="ih-hero__cuerpo"><h2>' + esc(titulo) + '</h2>' + tarjeta +
      '<a class="ih-hero__todos" href="' + href + '">Ver todos los cursos →</a></div></div>' +
      '<div class="ih-lado">' + meta + kpis + '</div></div>';
  }

  /* ───── Columna derecha ───── */
  function vivoHTML(sesion, ahora) {
    if (!sesion) return '<div class="ih-aside ih-aside--vivo"><div class="ih-aside__etq">Clases en vivo</div><div class="ih-aside__centro"><span class="ih-pildora">Próximamente</span><p>Estamos preparando los webinars con especialistas.</p></div></div>';
    var fecha = String(sesion.date || '');
    return '<div class="ih-aside ih-aside--vivo"><div class="ih-aside__etq">Próximo webinar</div><h3>' + esc(sesion.title || 'Webinar') + '</h3>' +
      '<p>' + esc([sesion.speaker, fecha, sesion.time || '19:00'].filter(Boolean).join(' · ')) + '</p><div class="countdown" id="countdown"></div><a class="ih-btn-verde" href="club-sesiones.html">Ver webinar →</a></div>';
  }

  function comunidadHTML() {
    return '<div class="ih-aside ih-aside--comunidad"><div class="ih-aside__etq">' + svg('chat', 14) + 'Comunidad Zoorigen</div><h3>Canal de WhatsApp</h3><small>Zoorigen</small>' +
      '<p>Conecta con colegas y comparte casos de fauna silvestre.</p><a class="ih-btn-verde" href="club-canal.html">' + svg('chat', 15) + 'Abrir canal</a></div>';
  }

  function descuentoHTML(urlWhatsapp) {
    return '<div class="ih-aside ih-aside--descuento"><div class="ih-aside__etq">' + svg('estrella', 14) + 'Tu descuento VIP</div><div class="ih-aside__grande">20%</div>' +
      '<p>En todos los cursos de Zoorigen.</p><a class="ih-btn-oscuro" href="' + esc(urlWhatsapp) + '" target="_blank" rel="noopener">' + svg('chat', 15) + 'Solicitar mi 20% por WhatsApp</a></div>';
  }

  /* "Tu actividad": barras con lo que llevas. datos: { cursosHechos, cursosTotal, certificados, retos, logros, logrosTotal } */
  function actividadHTML(d) {
    d = d || {};
    var n = function (v) { v = Number(v); return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0; };
    var fila = function (nombre, valor, total) {
      var pct = total > 0 ? Math.min(100, Math.round(valor * 100 / total)) : (valor > 0 ? 100 : 0);
      return '<div class="ih-fila"><span>' + esc(nombre) + '</span><i><b style="width:' + pct + '%"></b></i><em>' + (total > 0 ? valor + '/' + total : valor) + '</em></div>';
    };
    return '<div class="ih-aside ih-aside--actividad"><div class="ih-aside__etq">Tu actividad</div>' +
      fila('Cursos', n(d.cursosHechos), n(d.cursosTotal)) + fila('Certificados', n(d.certificados), 0) + fila('Retos', n(d.retos), 0) + fila('Logros', n(d.logros), n(d.logrosTotal)) + '</div>';
  }

  function presenciaHTML(tieneTarjeta) {
    var pct = tieneTarjeta ? 100 : 0;
    return '<div class="ih-aside ih-aside--presencia"><div class="ih-aside__etq">' + svg('usuarios', 14) + 'Tu presencia en la comunidad</div>' +
      '<h3>' + (tieneTarjeta ? 'Tu tarjeta profesional está activa' : 'Crea tu tarjeta profesional') + '</h3>' +
      '<p>Aparece en el Directorio VIP y haz networking con otros profesionales de fauna silvestre.</p>' +
      '<div class="ih-fila"><span></span><i><b style="width:' + pct + '%"></b></i><em>' + pct + '%</em></div>' +
      '<a class="ih-btn-oscuro" href="club-directorio.html">' + (tieneTarjeta ? 'Ver el directorio' : 'Crear mi tarjeta') + '</a></div>';
  }

  return {
    vivoHTML: vivoHTML, comunidadHTML: comunidadHTML, descuentoHTML: descuentoHTML, actividadHTML: actividadHTML, presenciaHTML: presenciaHTML, textoApertura: textoApertura, fechaDiaMes: fechaDiaMes,
    elegirHero: elegirHero, widgetHTML: widgetHTML, saludoHTML: saludoHTML, textoDias: textoDias, imagenSegura: imagenSegura, fotoDelCurso: fotoDelCurso,
    totalClases: totalClases, avanceDe: avanceDe, pasosDe: pasosDe, kpisDe: kpisDe, fechaLarga: fechaLarga, saludoHora: saludoHora
  };
});
