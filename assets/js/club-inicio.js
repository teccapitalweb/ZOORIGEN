/* ============================================================ */
/* CLUB VIP ZOORIGEN · INICIO                                    */
/* Saludo, tarjeta del curso ("Continúa tu curso" o "Espera tu    */
/* próximo curso"), "Tu siguiente meta" y accesos con números.    */
/* Usa las reglas de club-acceso.js (las mismas de Cursos).       */
/* La parte pura se prueba en Node.                               */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./club-acceso.js'), require('./club-seccion.js'), require('./guia-personaje.js'));
  else root.ZOO_INICIO = factory(root.ZOO_ACCESO, root.ZOO_SECCION, root.ZOO_GUIA);
})(typeof self !== 'undefined' ? self : this, function (ACCESO, SECCION, GUIA_MOD) {
  'use strict';

  /* Personaje guía: si el módulo no está cargado, siempre la pose de bienvenida. */
  var GUIA = GUIA_MOD || {
    imagenExpresion: function () { return 'assets/img/guia/guia-bienvenida.webp'; },
    expresionEfectiva: function () { return 'neutral'; },
    puedeSaludar: function () { return false; }, puedeParpadear: function () { return false; },
    secuenciaSaludo: function () { return []; }, esperaParpadeo: function () { return 5000; }, CUADROS: {}, PARPADEO_DURA_MS: 140
  };

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
     salida:  { tipo: 'sin-cursos' | 'continuar' | 'proximo' | 'terminado' | 'elegir-prueba', curso?, hechas?, total?, diasFalta?,
                ('elegir-prueba' no sale de aquí: la arma el Inicio cuando la prueba gratuita aún no se elige)
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
    var portada = (typeof ZOO_PORTADAS !== 'undefined' && ZOO_PORTADAS && ZOO_PORTADAS.paraCurso) ? ZOO_PORTADAS.paraCurso(curso, '../') : '';
    if (portada) return portada;
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
    regalo: '<path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/>',
    copiar: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
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
    if (h && h.tipo === 'elegir-prueba') return { titulo: 'Tu prueba gratuita te espera', pasos: [
      ['Ahora', 'Entra a Cursos y elige el curso que más te interese', 'club-biblioteca.html?elegir=1', 'play'],
      ['Después', 'Verás todas sus clases, menos la última', 'club-biblioteca.html', 'flecha'],
      ['Cuando quieras', 'Puedes hacerlo hoy o volver más tarde: no corre prisa', 'club-biblioteca.html', 'foco']] };
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
      { id: 'cursos', etiqueta: 'Cursos', valor: r.cursosAbiertos + '/' + r.cursosTotal, nota: 'abiertos', href: 'club-biblioteca.html', color: '#1F5F3A' },
      { id: 'clases', etiqueta: 'Clases', valor: r.clasesHechas + '/' + r.clasesTotal, nota: 'completadas', href: 'club-biblioteca.html', color: '#3B4A9E' },
      { id: 'pdfs', etiqueta: 'PDFs', valor: pdfs, nota: 'materiales', href: 'club-pdfs.html', color: '#1F5A7A' },
      { id: 'pro', etiqueta: 'Pro', valor: '13', nota: 'herramientas', href: 'club-herramientas.html', color: '#0F5E60' }
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

  /* ───── Tarjeta de saludo del Inicio ───── */
  var DURACION_CONTEO = 600;

  /* Valor entero del conteo ascendente: curva suave (sale rápido y frena al llegar). ms = tiempo transcurrido. */
  function valorConteo(desde, hasta, ms, dur) {
    var a = Number(desde), b = Number(hasta);
    if (!Number.isFinite(a)) a = 0;
    if (!Number.isFinite(b)) return 0;
    var d = Number(dur) > 0 ? Number(dur) : DURACION_CONTEO;
    var t = Math.max(0, Math.min(1, (Number(ms) || 0) / d));
    var suave = 1 - Math.pow(1 - t, 3);
    return Math.round(a + (b - a) * suave);
  }

  /* ¿El valor se puede contar? (enteros no negativos, como número o texto) */
  function esConteo(v) {
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return false;
    var n = Number(v);
    return Number.isFinite(n) && n >= 0 && Math.floor(n) === n;
  }

  function rotuloPlural(n, uno, varios) { return Number(n) === 1 ? uno : varios; }

  /* Las cifras de la tarjeta de saludo. datos: { cursos, clases, enProgreso, completados, racha }.
     La racha solo aparece si se conoce (los miembros); sin dato no se inventa. */
  function cifrasDelHero(datos) {
    var x = datos || {};
    var v = function (n) { return esConteo(n) ? String(Number(n)) : '—'; };
    var lista = [
      { clave: 'cursos', valor: v(x.cursos), rotulo: rotuloPlural(x.cursos, 'curso', 'cursos') },
      { clave: 'clases', valor: v(x.clases), rotulo: rotuloPlural(x.clases, 'clase', 'clases') },
      { clave: 'enProgreso', valor: v(x.enProgreso), rotulo: 'en progreso' },
      { clave: 'completados', valor: v(x.completados), rotulo: rotuloPlural(x.completados, 'completado', 'completados') }
    ];
    if ((x.racha !== null && x.racha !== undefined) || x.conRacha) lista.push({ clave: 'racha', valor: v(x.racha), rotulo: rotuloPlural(x.racha, 'día seguido', 'días seguidos') });
    return lista;
  }

  /* Botón principal de la tarjeta según el estado de los cursos. */
  function botonHero(h, hrefCursos) {
    var href = hrefCursos || 'club-biblioteca.html';
    if (h && h.tipo === 'continuar') return { href: href, etiqueta: h.hechas > 0 ? 'Continuar mi curso' : 'Empezar mi curso' };
    if (h && h.tipo === 'elegir-prueba') return { href: 'club-biblioteca.html?elegir=1', etiqueta: 'Elegir mi curso' };
    return { href: href, etiqueta: 'Ver cursos' };
  }

  /* Frase corta de Jaguarito según el estado. e: { hero, racha } → { texto, expresion } (expresión del mapa de guia-personaje.js) */
  function mensajeGuia(e) {
    var h = (e && e.hero) || null;
    var racha = e && Number.isFinite(Number(e.racha)) ? Math.max(0, Math.floor(Number(e.racha))) : 0;
    if (!h) return { texto: 'Aquí tienes tu avance de hoy.', expresion: 'neutral' };
    if (h.tipo === 'continuar') {
      var faltan = Math.max(0, (h.total || 0) - (h.hechas || 0));
      if (!h.hechas) return { texto: 'Tu primer curso te espera. ¡Empecemos!', expresion: 'excited' };
      if (faltan === 1) return { texto: 'Te falta una clase para terminar este curso.', expresion: 'excited' };
      if (racha >= 3) return { texto: 'Llevas ' + racha + ' días seguidos. Tu siguiente clase te espera.', expresion: 'happy' };
      return { texto: 'Tu siguiente clase te espera.', expresion: 'happy' };
    }
    if (h.tipo === 'elegir-prueba') return { texto: 'Elige tu curso de prueba cuando quieras. No corre prisa.', expresion: 'happy' };
    if (h.tipo === 'proximo') return { texto: 'Tu próximo curso se abre pronto. Mientras, supera un reto.', expresion: 'thinking' };
    if (h.tipo === 'terminado') return { texto: 'Terminaste tus cursos. Te avisaremos cuando haya uno nuevo.', expresion: 'happy' };
    return { texto: 'Pronto habrá cursos nuevos. Mientras, lee las noticias.', expresion: 'neutral' };
  }

  /* Hojas y huellas que flotan detrás de la tarjeta (formas sólidas, un tono más claro que el verde). */
  var HOJA = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/></svg>';
  var HUELLA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6.5" cy="11" r="2.1"/><circle cx="10" cy="6.4" r="2.1"/><circle cx="14" cy="6.4" r="2.1"/><circle cx="17.5" cy="11" r="2.1"/><path d="M12 12.4c-2.9 0-5.1 2.7-5.1 5.1 0 1.7 1.2 2.6 2.7 2.6.9 0 1.6-.4 2.4-.4s1.5.4 2.4.4c1.5 0 2.7-.9 2.7-2.6 0-2.4-2.2-5.1-5.1-5.1z"/></svg>';
  var HUELLA_ICONO = HUELLA.replace('<svg ', '<svg width="22" height="22" ');
  var DECOR = [['hoja', 1], ['hoja', 2], ['huella', 3], ['hoja', 4], ['huella', 5], ['hoja', 6]];
  function decorHTML() {
    return '<div class="zs-inicio__decor" aria-hidden="true"><span class="zs-inicio__capa zs-inicio__capa--a"></span><span class="zs-inicio__capa zs-inicio__capa--b"></span>' +
      DECOR.map(function (d) { return '<span class="zid zid--' + d[1] + '">' + (d[0] === 'hoja' ? HOJA : HUELLA) + '</span>'; }).join('') + '</div>';
  }

  /* Tarjeta de título del Inicio (el mismo componente de todos los apartados) con el personaje, su frase y la decoración.
     datos: { cursos, clases, enProgreso, completados, racha }; opciones: { hero, base, hrefCursos } */
  function saludoHTML(nombre, ahora, datos, opciones) {
    var d = ahora instanceof Date ? ahora : new Date();
    var o = opciones || {};
    var base = typeof o.base === 'string' ? o.base : '../';
    var fecha = fechaLarga(d); fecha = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    var boton = botonHero(o.hero, o.hrefCursos);
    var msg = mensajeGuia({ hero: o.hero || null, racha: datos && datos.racha });
    var html = SECCION.html({
      id: 'zsSeccionInicio', seccion: 'inicio', icono: 'house', eyebrow: 'Tu espacio de aprendizaje',
      titulo: saludoHora(d.getHours()) + ',', acento: String(nombre || '') + '.',
      sub: fecha + '. Tu acceso a cursos, herramientas pro y la comunidad de fauna silvestre más activa de México.',
      cifras: cifrasDelHero(datos),
      acciones: [{ href: boton.href, id: 'zsInicioCta', etiqueta: boton.etiqueta, icono: 'play', tono: 'oro' }]
    });
    var guia = '<div class="zs-inicio__guia">' +
      '<img class="zs-inicio__jaguar" src="' + esc(base + GUIA.imagenExpresion(msg.expresion)) + '" alt="Jaguarito, tu guía de Zoorigen" width="220" height="220" decoding="async">' +
      '<p class="zs-inicio__burbuja" id="zsInicioMensaje" role="status">' + esc(msg.texto) + '</p></div>';
    // Cada cifra lleva su índice para la entrada escalonada.
    var n = 0;
    html = html.replace(/<div class="zs-cifra"/g, function () { return '<div class="zs-cifra" style="--i:' + (n++) + '"'; });
    html = html.replace('class="zs-seccion"', 'class="zs-seccion zs-inicio"');
    return html.replace(/<\/header>$/, decorHTML() + guia + '</header>');
  }

  /* ───── Tarjeta "Invita amigos" ───── */
  var META_REFERIDOS = 4;   // un solo premio: 4 invitados válidos

  /* Lo que muestra la tarjeta a partir de GET /api/referidos/estado (sin cambiar el contrato). */
  function estadoInvitados(r, meta) {
    var m = Number(meta) > 0 ? Math.floor(Number(meta)) : META_REFERIDOS;
    var n = function (v) { v = Number(v); return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0; };
    r = r && typeof r === 'object' ? r : {};
    var validos = n(r.validos), pendientes = n(r.pendientes), puntos = n(r.puntosTotales);
    var premios = Array.isArray(r.premios) ? r.premios : [];
    var listo = premios.some(function (p) { return p && p.ganado && !p.usado; });
    var usado = premios.some(function (p) { return p && p.usado; });
    var llenas = Math.max(0, Math.min(m, validos));
    var faltan = Math.max(0, m - validos);
    var aviso = listo ? 'Tienes un premio listo para canjear'
      : (validos >= m || usado) ? 'Ya ganaste tu premio de invitados'
      : 'Te ' + (faltan === 1 ? 'falta 1' : 'faltan ' + faltan) + ' para tu premio';
    var huellas = [];
    for (var i = 0; i < m; i++) huellas.push(i < llenas);
    return { validos: validos, pendientes: pendientes, puntos: puntos, meta: m, llenas: llenas, faltan: faltan, listo: listo, usado: usado, aviso: aviso, huellas: huellas };
  }

  /* Dirección y texto para compartir por WhatsApp. */
  function urlRegistroConCodigo(codigo) {
    return 'https://www.zoorigen.com/pages/club-registro.html?ref=' + encodeURIComponent(String(codigo || ''));
  }
  function mensajeCompartir(codigo) {
    var c = String(codigo || '');
    return '¡Hola! Te invito al Club VIP Zoorigen, la comunidad científica de fauna más completa de México. Únete con mi código ' + c +
      ' y obtén todos los beneficios VIP: cursos, webinars en vivo, certificados y más. Regístrate aquí: ' + urlRegistroConCodigo(c);
  }
  function urlWhatsapp(codigo) { return 'https://wa.me/?text=' + encodeURIComponent(mensajeCompartir(codigo)); }

  /* HTML interior de la tarjeta. o: { codigo, estado: salida de estadoInvitados | null, error: boolean } */
  function invitaHTML(o) {
    o = o || {};
    var e = o.estado || null;
    var cargando = !e && !o.error;
    var codigo = esc(o.codigo || 'ZOO-XXXXXX');
    var meta = e ? e.meta : META_REFERIDOS;
    var llenas = e ? e.llenas : 0;
    var huellas = '';
    for (var i = 0; i < meta; i++) {
      var llena = i < llenas;
      huellas += '<li class="inv__huella' + (llena ? ' is-llena' : '') + '" style="--n:' + i + '">' + HUELLA_ICONO + '<span class="inv__sr">' + (llena ? 'Amigo confirmado' : 'Falta un amigo') + '</span></li>';
    }
    var leyenda = e ? e.aviso : (o.error ? 'No pudimos cargar tus invitados ahora.' : 'Cargando tus invitados…');
    var cif = function (valor, rotulo, tono) { return '<div class="inv__cifra' + (tono ? ' inv__cifra--' + tono : '') + '"><dt>' + esc(rotulo) + '</dt><dd>' + esc(valor) + '</dd></div>'; };
    var v = function (k) { return e ? String(e[k]) : '—'; };
    return '<div class="inv__banda" aria-hidden="true"></div>' +
      '<div class="inv__icono" aria-hidden="true"><span class="inv__pulso"></span>' + svg('regalo', 34) + '</div>' +
      '<div class="inv__cuerpo">' +
        '<p class="inv__etq">Invita amigos y gana cursos antes de tiempo</p>' +
        '<h2 class="inv__titulo">Invita a ' + meta + ' amigos y adelanta un curso</h2>' +
        '<p class="inv__sub">Comparte tu código. Cuando ' + meta + ' amigos se registren con él y confirmen su correo, eliges un curso y lo abres antes de su fecha.</p>' +
        '<div class="inv__fila">' +
          '<div class="inv__boleto"><span class="inv__boleto-etq">Tu código</span><code class="inv__codigo" id="dashRefCode">' + codigo + '</code>' +
            '<button type="button" class="inv__copiar" data-copiar>' + svg('copiar', 16) + '<span>Copiar</span></button></div>' +
          '<div class="inv__progreso">' +
            '<ol class="inv__huellas" aria-label="' + llenas + ' de ' + meta + ' amigos confirmados">' + huellas + '</ol>' +
            '<p class="inv__leyenda' + (e && (e.listo || e.usado || e.faltan === 0) ? ' is-listo' : '') + '" role="status">' + esc(leyenda) + '</p>' +
          '</div>' +
        '</div>' +
        '<dl class="inv__cifras">' + cif(v('validos'), 'confirmados', 'ok') + cif(v('pendientes'), 'por confirmar', 'pen') + cif(v('puntos'), 'puntos', 'pts') + '</dl>' +
        '<div class="inv__acciones">' +
          '<button type="button" class="inv__wa" data-compartir>' + svg('chat', 18) + '<span>Compartir por WhatsApp</span></button>' +
          '<a class="inv__ver" href="club-referidos.html">Ver mis invitados</a>' +
        '</div>' +
      '</div>';
  }

  /* HTML de la tarjeta principal + "Tu siguiente meta" + accesos. opciones: { ahora, pdfsAbiertos, pdfsTotal, hrefCursos } */
  function widgetHTML(h, opciones) {
    opciones = opciones || {};
    h = h || { tipo: 'sin-cursos' };
    var href = esc(opciones.hrefCursos || 'club-biblioteca.html');
    var espera = h.tipo === 'proximo';
    var vacio = h.tipo === 'sin-cursos' || h.tipo === 'terminado';
    var foto = h.curso ? fotoDelCurso(h.curso) : '../' + FOTO_GENERAL;
    var elegirPrueba = h.tipo === 'elegir-prueba';
    var titulo = vacio ? (h.tipo === 'terminado' ? 'Terminaste tus cursos.' : 'Pronto habrá cursos.') : (elegirPrueba ? 'Elige tu curso de prueba.' : (espera ? 'Espera tu próximo curso.' : 'Continúa tu curso.'));
    var boton = elegirPrueba
      ? '<a class="ih-btn" href="club-biblioteca.html?elegir=1">' + svg('play', 14) + 'Elegir mi curso</a>'
      : '<a class="ih-btn" href="' + href + '">' + svg('play', 14) + (h.tipo === 'continuar' ? (h.hechas > 0 ? 'Seguir aprendiendo' : 'Ver curso') : 'Ver mis cursos') + '</a>';
    var tarjeta;
    if (h.tipo === 'sin-cursos') {
      tarjeta = '<div class="ih-card"><div class="ih-card__etq">Cursos</div><div class="ih-card__nombre">El equipo está subiendo los primeros cursos</div>' + boton + '</div>';
    } else if (elegirPrueba) {
      // Ningún curso se le impone: solo se le recuerda que puede elegir el suyo cuando quiera
      tarjeta = '<div class="ih-card"><div class="ih-card__etq">Prueba gratuita</div><div class="ih-card__nombre">Aún no eliges tu curso</div>' +
        '<div class="ih-card__caja"><small>Siguiente paso</small><strong>Elige el curso de tu preferencia</strong></div>' + boton + '</div>';
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
    if (!sesion) return '<div class="ih-aside ih-aside--vivo"><div class="ih-aside__etq">Clases en vivo</div><div class="ih-aside__centro"><span class="ih-pildora">Próximamente</span><p>Estamos preparando las clases en vivo con especialistas.</p></div></div>';
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

  // publicada: false = la tarjeta existe pero es privada (solo su dueña o dueño la ve); sin dato se trata como publicada.
  function presenciaHTML(tieneTarjeta, publicada) {
    var pct = tieneTarjeta ? 100 : 0;
    var privada = !!tieneTarjeta && publicada === false;
    var titulo = !tieneTarjeta ? 'Crea tu tarjeta profesional' : (privada ? 'Tu tarjeta es privada' : 'Tu tarjeta profesional está activa');
    var texto = privada ? 'Solo tú la ves. Publícala cuando quieras aparecer en el Directorio VIP.'
      : 'Aparece en el Directorio VIP y haz networking con otros profesionales de fauna silvestre.';
    return '<div class="ih-aside ih-aside--presencia"><div class="ih-aside__etq">' + svg('usuarios', 14) + 'Tu presencia en la comunidad</div>' +
      '<h3>' + titulo + '</h3>' +
      '<p>' + texto + '</p>' +
      '<div class="ih-fila"><span></span><i><b style="width:' + pct + '%"></b></i><em>' + pct + '%</em></div>' +
      '<a class="ih-btn-oscuro" href="club-directorio.html">' + (!tieneTarjeta ? 'Crear mi tarjeta' : (privada ? 'Ver mi tarjeta' : 'Ver el directorio')) + '</a></div>';
  }

  var API = {
    vivoHTML: vivoHTML, comunidadHTML: comunidadHTML, descuentoHTML: descuentoHTML, actividadHTML: actividadHTML, presenciaHTML: presenciaHTML, textoApertura: textoApertura, fechaDiaMes: fechaDiaMes,
    elegirHero: elegirHero, widgetHTML: widgetHTML, saludoHTML: saludoHTML, textoDias: textoDias, imagenSegura: imagenSegura, fotoDelCurso: fotoDelCurso,
    totalClases: totalClases, avanceDe: avanceDe, pasosDe: pasosDe, kpisDe: kpisDe, fechaLarga: fechaLarga, saludoHora: saludoHora,
    valorConteo: valorConteo, esConteo: esConteo, cifrasDelHero: cifrasDelHero, botonHero: botonHero, mensajeGuia: mensajeGuia, DURACION_CONTEO: DURACION_CONTEO,
    estadoInvitados: estadoInvitados, invitaHTML: invitaHTML, urlRegistroConCodigo: urlRegistroConCodigo, mensajeCompartir: mensajeCompartir, urlWhatsapp: urlWhatsapp, META_REFERIDOS: META_REFERIDOS
  };
  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* PANTALLA (solo navegador)                                     */
  /* ============================================================ */
  function sinMovimiento() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function rotuloDe(clave, n) {
    if (clave === 'cursos') return rotuloPlural(n, 'curso', 'cursos');
    if (clave === 'clases') return rotuloPlural(n, 'clase', 'clases');
    if (clave === 'completados') return rotuloPlural(n, 'completado', 'completados');
    if (clave === 'racha') return rotuloPlural(n, 'día seguido', 'días seguidos');
    return null;
  }

  /* Pinta la tarjeta de saludo en `contenedor` y devuelve su controlador:
       cifras({ clave: valor })  -> pone cada cifra con conteo ascendente de 600 ms
       estado(hero, racha)       -> frase y expresión de Jaguarito + texto del botón principal
     Las animaciones se apagan con "reducir movimiento" y se pausan con la pestaña oculta o la tarjeta fuera de pantalla. */
  API.pintarSaludo = function (contenedor, nombre, ahora, datos, opciones) {
    if (!contenedor) return null;
    var o = opciones || {};
    var base = typeof o.base === 'string' ? o.base : '../';
    contenedor.innerHTML = saludoHTML(nombre, ahora, datos, o);
    var raiz = contenedor.querySelector('.zs-inicio');
    if (!raiz) return null;
    var img = raiz.querySelector('.zs-inicio__jaguar');
    var burbuja = raiz.querySelector('.zs-inicio__burbuja');
    var cta = raiz.querySelector('#zsInicioCta');
    var est = { visible: true, pestanaVisible: !document.hidden, reducido: sinMovimiento(), saludando: false, expresion: 'neutral' };
    var deseada = 'neutral', yaSaludo = false, tSaludo = null, tParpadeo = null, tPaso = null;

    function pausar() { raiz.classList.toggle('is-pausa', !est.visible || !est.pestanaVisible); }
    function ruta(clave) { return base + (GUIA.CUADROS && GUIA.CUADROS[clave] ? GUIA.CUADROS[clave] : GUIA.imagenExpresion(clave)); }
    function precargar(clave) { try { var i = new Image(); i.src = ruta(clave); } catch (e) { /* sin imagen */ } }
    function aplicarExpresion() {
      est.expresion = GUIA.expresionEfectiva(deseada);
      if (img) img.src = base + GUIA.imagenExpresion(deseada);
    }
    function saludar() {
      yaSaludo = true;
      if (!GUIA.puedeSaludar(est)) { aplicarExpresion(); return; }
      var seq = GUIA.secuenciaSaludo(2);
      var i = 0;
      est.saludando = true;
      (function paso() {
        if (i >= seq.length - 1 || !est.pestanaVisible) { est.saludando = false; aplicarExpresion(); return; }
        if (img) img.src = base + seq[i].ruta;
        var ms = seq[i].ms; i++;
        tPaso = setTimeout(paso, ms);
      })();
    }
    function parpadear() {
      tParpadeo = setTimeout(function () {
        if (GUIA.puedeParpadear(est) && img && GUIA.CUADROS && GUIA.CUADROS.parpadeo) {
          img.src = base + GUIA.CUADROS.parpadeo;
          setTimeout(function () { if (!est.saludando) aplicarExpresion(); }, GUIA.PARPADEO_DURA_MS || 140);
        }
        parpadear();
      }, GUIA.esperaParpadeo(Math.random()));
    }

    if (!est.reducido) {
      ['saludo1', 'saludo2'].forEach(precargar);
      tSaludo = setTimeout(saludar, 1600);   // respaldo: si los datos tardan, saluda de todos modos
      parpadear();
    }
    document.addEventListener('visibilitychange', function () { est.pestanaVisible = !document.hidden; pausar(); });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { est.visible = es.some(function (x) { return x.isIntersecting; }); pausar(); }, { threshold: 0.05 }).observe(raiz);
    }
    try {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var cambio = function () { est.reducido = mq.matches; };
      if (mq.addEventListener) mq.addEventListener('change', cambio); else if (mq.addListener) mq.addListener(cambio);
    } catch (e) { /* sin matchMedia */ }

    function poner(n, valor) {
      var nuevo = String(valor);
      var token = (n._conteo = (n._conteo || 0) + 1);
      var actual = esConteo(n.textContent) ? Number(n.textContent) : 0;
      if (!esConteo(valor) || est.reducido || document.hidden || !window.requestAnimationFrame) { n.textContent = nuevo; return; }
      var meta = Number(valor), t0 = null;
      (function cuadro(ts) {
        if (n._conteo !== token) return;
        if (t0 === null) t0 = ts;
        var ms = ts - t0;
        n.textContent = String(ms >= DURACION_CONTEO ? meta : valorConteo(actual, meta, ms, DURACION_CONTEO));
        if (ms < DURACION_CONTEO) window.requestAnimationFrame(cuadro);
      })(performance.now());
    }

    return {
      raiz: raiz,
      cifras: function (valores) {
        Object.keys(valores || {}).forEach(function (k) {
          var n = raiz.querySelector('[data-cifra="' + k.replace(/[^\w-]/g, '') + '"]');
          if (!n || valores[k] === undefined) return;
          poner(n, valores[k]);
          var r = rotuloDe(k, valores[k]), rot = n.parentNode && n.parentNode.querySelector('.zs-cifra__r');
          if (r && rot && esConteo(valores[k])) rot.textContent = r;
        });
      },
      estado: function (hero, racha) {
        var m = mensajeGuia({ hero: hero, racha: racha });
        if (burbuja) {
          burbuja.textContent = m.texto;
          burbuja.classList.remove('is-nuevo'); void burbuja.offsetWidth; burbuja.classList.add('is-nuevo');
        }
        deseada = m.expresion;
        precargar(deseada);
        if (cta) {
          var b = botonHero(hero, o.hrefCursos);
          cta.setAttribute('href', b.href);
          if (cta.lastChild && cta.lastChild.nodeType === 3) cta.lastChild.nodeValue = b.etiqueta; else cta.textContent = b.etiqueta;
        }
        if (!yaSaludo && !est.reducido) { clearTimeout(tSaludo); tSaludo = setTimeout(saludar, 450); }
        else if (!est.saludando) aplicarExpresion();
      }
    };
  };

  /* Monta la tarjeta de invitación dentro de `contenedor` (que debe tener un hijo .inv__marco). Devuelve { fijar(respuesta), error() }.
     Las huellas se llenan cuando la tarjeta entra en pantalla. */
  API.montarInvita = function (contenedor, codigo) {
    if (!contenedor) return null;
    var marco = contenedor.querySelector('.inv__marco') || contenedor;
    var estado = null, fallo = false, observador = null, tCopiado = null;

    function ver() {
      if (observador) { observador.disconnect(); observador = null; }
      contenedor.classList.remove('is-visible');
      if (window.IntersectionObserver) {
        observador = new IntersectionObserver(function (es) {
          if (es.some(function (x) { return x.isIntersecting; })) { contenedor.classList.add('is-visible'); observador.disconnect(); observador = null; }
        }, { threshold: 0.35 });
        observador.observe(contenedor);
      } else contenedor.classList.add('is-visible');
    }
    function pintar() { marco.innerHTML = invitaHTML({ codigo: codigo, estado: estado, error: fallo }); ver(); }

    function copiarTexto(txt) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
      return new Promise(function (ok, no) {
        try {
          var a = document.createElement('textarea'); a.value = txt; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
          document.body.appendChild(a); a.select();
          var bien = document.execCommand('copy'); document.body.removeChild(a);
          if (bien) ok(); else no(new Error('copiar'));
        } catch (e) { no(e); }
      });
    }
    contenedor.addEventListener('click', function (ev) {
      var c = ev.target.closest && ev.target.closest('[data-copiar]');
      if (c && contenedor.contains(c)) {
        var rot = c.querySelector('span');
        copiarTexto(codigo).then(function () {
          if (!rot) return;
          c.classList.add('is-ok'); rot.textContent = 'Copiado';
          clearTimeout(tCopiado);
          tCopiado = setTimeout(function () { c.classList.remove('is-ok'); rot.textContent = 'Copiar'; }, 1500);
        }).catch(function () { if (rot) { rot.textContent = 'Copia a mano'; setTimeout(function () { rot.textContent = 'Copiar'; }, 1800); } });
        return;
      }
      var s = ev.target.closest && ev.target.closest('[data-compartir]');
      if (s && contenedor.contains(s)) window.open(urlWhatsapp(codigo), '_blank', 'noopener');
    });

    pintar();
    return {
      fijar: function (respuesta) { estado = estadoInvitados(respuesta); fallo = false; pintar(); },
      error: function () { estado = null; fallo = true; pintar(); }
    };
  };

  return API;
});
