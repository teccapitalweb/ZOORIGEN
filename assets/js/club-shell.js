/* ============================================================ */
/* CLUB VIP ZOORIGEN · ESTRUCTURA DEL PANEL                      */
/* Menú por grupos, barra superior (buscador, ayuda, campana,    */
/* tema, perfil), barra inferior del celular y cajón "Más".     */
/* La parte pura (menú, búsqueda, saludo) se prueba en Node;     */
/* la parte de pantalla solo corre en el navegador.              */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_SHELL = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SOPORTE = '5212361113237';
  var BREAKPOINT_MOVIL = 980;   // por debajo: barra inferior y cajón; por encima: menú lateral

  /* ───── MENÚ (única fuente: el menú lateral, el cajón y el buscador salen de aquí) ───── */
  var GRUPOS = [
    { id: 'principal', titulo: 'Principal', items: [
      { id: 'inicio', label: 'Inicio', icon: 'home', href: 'club-dashboard.html' },
      { id: 'biblioteca', label: 'Cursos', icon: 'book', href: 'club-biblioteca.html' },
      { id: 'retos', label: 'Retos', icon: 'target', href: 'club-retos.html', nuevo: true },
      { id: 'logros', label: 'Mis logros', icon: 'trophy', href: 'club-logros.html' },
      { id: 'certificados', label: 'Mis certificados', icon: 'certificate', href: 'club-certificados.html' }
    ] },
    { id: 'material', titulo: 'Material', items: [
      { id: 'pdfs', label: 'PDFs y materiales', icon: 'filetext', href: 'club-pdfs.html' },
      { id: 'videos', label: 'Videos', icon: 'video', href: 'club-videos.html' },
      { id: 'sesiones', label: 'Webinars en vivo', icon: 'broadcast', href: 'club-sesiones.html' }
    ] },
    { id: 'herramientas', titulo: 'Herramientas pro', items: [
      { id: 'herramientas', label: 'Herramientas clínicas', icon: 'flask', href: 'club-herramientas.html' },
      { id: 'legal', label: 'Herramientas legales', icon: 'scale', href: 'club-legal.html' }
    ] },
    { id: 'comunidad', titulo: 'Comunidad', items: [
      { id: 'foro', label: 'Foro VIP', icon: 'messages', href: 'club-foro.html' },
      { id: 'directorio', label: 'Directorio VIP', icon: 'users', href: 'club-directorio.html' },
      { id: 'canal', label: 'Canal de WhatsApp', icon: 'brandwhatsapp', href: 'club-canal.html' }
    ] },
    { id: 'cuenta', titulo: 'Mi cuenta', items: [
      { id: 'referidos', label: 'Invitar amigos', icon: 'gift', href: 'club-referidos.html' },
      { id: 'perfil', label: 'Mi perfil', icon: 'user', href: 'club-perfil.html' },
      { id: 'suscripcion', label: 'Suscripción', icon: 'creditcard', href: 'club-suscripcion.html' }
    ] }
  ];

  /* Pestañas de la barra inferior del celular (la última abre el cajón "Más") */
  var BARRA = [
    { id: 'inicio', label: 'Inicio', icon: 'home', href: 'club-dashboard.html' },
    { id: 'biblioteca', label: 'Cursos', icon: 'book', href: 'club-biblioteca.html' },
    { id: 'pdfs', label: 'PDFs', icon: 'news', href: 'club-pdfs.html' },
    { id: 'sesiones', label: 'Vivo', icon: 'broadcast', href: 'club-sesiones.html' },
    { id: 'herramientas', label: 'Pro', icon: 'tools', href: 'club-herramientas.html' },
    { id: 'mas', label: 'Más', icon: 'menu', href: '#' }
  ];

  /* ───── funciones puras ───── */
  function planos() {
    var lista = [];
    GRUPOS.forEach(function (g) { g.items.forEach(function (i) { lista.push({ id: i.id, label: i.label, icon: i.icon, href: i.href, grupo: g.titulo }); }); });
    return lista;
  }

  function normalizar(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }

  /* Secciones cuyo nombre o grupo contiene lo escrito (sin importar acentos). */
  function buscarSecciones(texto, max) {
    var q = normalizar(texto);
    if (!q) return [];
    var tope = max || 6;
    return planos().filter(function (i) { return normalizar(i.label).indexOf(q) !== -1 || normalizar(i.grupo).indexOf(q) !== -1; }).slice(0, tope);
  }

  /* Cursos cuyo título, área o instructor contiene lo escrito. */
  function buscarCursos(texto, cursos, max) {
    var q = normalizar(texto);
    if (!q || !Array.isArray(cursos)) return [];
    return cursos.filter(function (c) {
      return c && [c.title, c.area, c.instructor].some(function (v) { return normalizar(v).indexOf(q) !== -1; });
    }).slice(0, max || 5).map(function (c) { return { id: c.id, titulo: String(c.title || 'Curso'), area: String(c.area || '') }; });
  }

  /* Qué pestaña de la barra inferior queda marcada según la página. */
  function pestanaActiva(activoId) {
    if (activoId === 'herramientas' || activoId === 'legal') return 'herramientas';
    for (var i = 0; i < BARRA.length - 1; i++) if (BARRA[i].id === activoId) return activoId;
    return 'mas';
  }

  function primerNombre(nombre, correo) {
    var base = String(nombre || '').trim() || String(correo || '').split('@')[0] || 'Miembro';
    return base.split(/\s+/)[0];
  }

  function iniciales(nombre, correo) {
    var base = String(nombre || '').trim() || String(correo || '').split('@')[0] || 'M';
    var partes = base.split(/\s+/).filter(Boolean).slice(0, 2);
    return (partes.map(function (p) { return p.charAt(0); }).join('') || 'M').toUpperCase();
  }

  function enlaceSoporte(texto) {
    return 'https://wa.me/' + SOPORTE + '?text=' + encodeURIComponent(texto);
  }

  var API = {
    GRUPOS: GRUPOS, BARRA: BARRA, SOPORTE: SOPORTE, BREAKPOINT_MOVIL: BREAKPOINT_MOVIL,
    planos: planos, normalizar: normalizar, buscarSecciones: buscarSecciones, buscarCursos: buscarCursos,
    pestanaActiva: pestanaActiva, primerNombre: primerNombre, iniciales: iniciales, enlaceSoporte: enlaceSoporte
  };

  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* PARTE DE PANTALLA                                             */
  /* ============================================================ */
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var icono = function (nombre, tam) {
    return (typeof zooIcon === 'function') ? zooIcon(nombre, tam || 18) : '';
  };
  var estado = { montado: false, cursos: null };

  /* ZOORIGEN_CLUB se declara con const en club.js: no es propiedad de window, se busca por su nombre. */
  function club() { try { return (typeof ZOORIGEN_CLUB !== 'undefined') ? ZOORIGEN_CLUB : null; } catch (e) { return null; } }

  /* Íconos que el menú nuevo necesita y club.js aún no tenía. */
  function completarIconos() {
    try {
      if (typeof ZOORIGEN_ICONS === 'undefined') return;
      var extra = {
        news: '<path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11"/><path d="M8 8l4 0"/><path d="M8 12l4 0"/><path d="M8 16l4 0"/>',
        menu: '<path d="M4 6l16 0"/><path d="M4 12l16 0"/><path d="M4 18l16 0"/>',
        logout: '<path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2"/><path d="M9 12h12l-3 -3"/><path d="M18 15l3 -3"/>',
        tools: '<path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5"/>',
        x: '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
        bulb: '<path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7"/><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3"/><path d="M9.7 17l4.6 0"/>'
      };
      Object.keys(extra).forEach(function (k) { if (!ZOORIGEN_ICONS[k]) ZOORIGEN_ICONS[k] = extra[k]; });
    } catch (e) { /* sin íconos extra */ }
  }

  completarIconos();

  function enlaceHTML(item, activo, clase) {
    return '<a href="' + esc(item.href) + '" class="' + (clase || '') + (item.id === activo ? ' is-active' : '') + '">' +
      '<span class="icon">' + icono(item.icon) + '</span>' + esc(item.label) +
      (item.nuevo ? '<span class="badge badge--nuevo">Nuevo</span>' : '') + '</a>';
  }

  /* Menú agrupado (lo usan el menú lateral y el cajón). */
  function menuHTML(activo, clase) {
    return GRUPOS.map(function (g) {
      return '<div class="club-sidebar__section">' + esc(g.titulo) + '</div>' + g.items.map(function (i) { return enlaceHTML(i, activo, clase); }).join('');
    }).join('');
  }

  function temaActual() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  function pintarTema() {
    var oscuro = temaActual() === 'dark';
    document.querySelectorAll('.zs-theme').forEach(function (b) {
      b.innerHTML = icono(oscuro ? 'sun' : 'moon', 17) + '<span class="zs-theme__txt">' + (oscuro ? 'Día' : 'Noche') + '</span>';
      b.setAttribute('aria-label', oscuro ? 'Cambiar a modo día' : 'Cambiar a modo noche');
      b.title = oscuro ? 'Cambiar a modo día' : 'Cambiar a modo noche';
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = oscuro ? '#0A1710' : '#F3F5F1';
  }

  function cambiarTema() {
    if (club() && club().toggleTheme) club().toggleTheme();
    else {
      var sig = temaActual() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', sig);
      try { localStorage.setItem('zoo_theme', sig); } catch (e) { /* sin almacenamiento */ }
    }
    pintarTema();
  }

  /* Quita los botones sueltos que algunas páginas traían en su encabezado (tema, guía, campana):
     ahora viven en la barra superior de todas las páginas. */
  function limpiarEncabezadosViejos() {
    var quitar = '.club-main .theme-toggle, .club-main .guide-btn, .club-main .notif-icon:not(.zs-bell), .club-main .mobile-menu-btn, .club-main .notif-panel:not(.zs-notif)';
    document.querySelectorAll(quitar).forEach(function (el) {
      var padre = el.parentElement;
      el.remove();
      /* si el contenedor que traía esos botones se quedó vacío, también se quita */
      while (padre && padre.classList && !padre.classList.contains('club-main') && !padre.children.length && !(padre.textContent || '').trim()) {
        var sig = padre.parentElement; padre.remove(); padre = sig;
      }
    });
  }

  function barraSuperiorHTML(sesion) {
    var nombre = primerNombre(sesion && sesion.name, sesion && sesion.email);
    return '' +
      '<div class="zs-search" id="zsSearch" role="search">' +
        '<span class="zs-search__ico">' + icono('search', 17) + '</span>' +
        '<input type="search" id="zsSearchInput" placeholder="Buscar cursos o secciones…" autocomplete="off" aria-label="Buscar">' +
        '<div class="zs-results" id="zsResults" hidden></div>' +
      '</div>' +
      '<div class="zs-actions">' +
        '<button type="button" class="zs-btn zs-help" id="zsHelp" title="Ver guía de bienvenida" aria-label="Ver guía de bienvenida">' + icono('helpcircle', 18) + '</button>' +
        '<button type="button" class="zs-btn notif-icon zs-bell" id="notifBtn" title="Notificaciones" aria-label="Notificaciones">' + icono('bell', 18) +
          '<span class="notif-badge" id="notifBadge" style="display:none;">0</span></button>' +
        '<button type="button" class="zs-btn zs-theme" id="zsTheme"></button>' +
        '<a class="zs-avatar" href="club-perfil.html" title="Mi perfil" aria-label="Mi perfil">' +
          '<span class="zs-avatar__circle">' + esc(iniciales(sesion && sesion.name, sesion && sesion.email)) + '</span>' +
          '<span class="zs-avatar__name">' + esc(nombre) + '</span></a>' +
        '<button type="button" class="zs-btn zs-salir" id="zsSalir" title="Cerrar sesión" aria-label="Cerrar sesión">' + icono('logout', 18) + '</button>' +
      '</div>';
  }

  /* El contenido del panel lo pinta club-avisos.js (o, si no está, la campana anterior de club.js). */
  function panelNotifHTML() {
    return '<div class="notif-panel zs-notif" id="notifPanel" style="display:none;"></div>';
  }

  function barraInferiorHTML(activo) {
    var marcada = pestanaActiva(activo);
    return BARRA.map(function (t) {
      var es = t.id === marcada;
      var etiqueta = '<span class="zs-tab__ico">' + icono(t.icon, 20) + '</span><span class="zs-tab__txt">' + esc(t.label) + '</span>';
      return t.id === 'mas'
        ? '<button type="button" class="zs-tab' + (es ? ' is-active' : '') + '" id="zsMas" aria-label="Más opciones" aria-haspopup="dialog">' + etiqueta + '</button>'
        : '<a class="zs-tab' + (es ? ' is-active' : '') + '" href="' + esc(t.href) + '">' + etiqueta + '</a>';
    }).join('');
  }

  function cajonHTML(sesion, activo) {
    var nombre = primerNombre(sesion && sesion.name, sesion && sesion.email);
    return '<div class="zs-drawer__head"><div class="zs-drawer__who"><span class="zs-avatar__circle">' + esc(iniciales(sesion && sesion.name, sesion && sesion.email)) + '</span>' +
      '<div><strong>' + esc(nombre) + '</strong><small>Club VIP Zoorigen</small></div></div>' +
      '<button type="button" class="zs-drawer__close" id="zsCerrarCajon" aria-label="Cerrar menú">' + icono('x', 18) + '</button></div>' +
      '<nav class="zs-drawer__nav">' + menuHTML(activo, 'zs-drawer__link') + '</nav>' +
      '<div class="zs-drawer__foot"><button type="button" class="zs-drawer__btn" id="zsAyudaCajon">' + icono('helpcircle', 17) + ' Ver guía de bienvenida</button>' +
      '<button type="button" class="zs-drawer__btn zs-theme" id="zsThemeCajon"></button>' +
      '<button type="button" class="zs-drawer__btn zs-drawer__btn--salir" id="zsSalirCajon">' + icono('logout', 17) + ' Cerrar sesión</button></div>';
  }

  function whatsappHTML() {
    var item = function (txt, url, clase) { return '<a class="zs-wa__item" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(txt) + '</a>'; };
    return '<div class="zs-wa" id="zsWa">' +
      '<div class="zs-wa__menu" id="zsWaMenu" hidden>' +
        '<div class="zs-wa__title">¿En qué te ayudamos?</div>' +
        item('Soporte del Club VIP', enlaceSoporte('Hola, soy miembro del Club VIP Zoorigen y necesito ayuda')) +
        item('Mi 20% de descuento', enlaceSoporte('Hola, quiero aplicar mi 20% de descuento VIP')) +
        '<a class="zs-wa__item" href="club-canal.html">Canal de WhatsApp</a>' +
      '</div>' +
      '<button type="button" class="zs-wa__btn" id="zsWaBtn" aria-label="Ayuda por WhatsApp" aria-expanded="false">' + icono('brandwhatsapp', 24) + '</button></div>';
  }

  function cerrarResultados() { var r = document.getElementById('zsResults'); if (r) { r.hidden = true; r.innerHTML = ''; } }

  function pintarResultados(texto) {
    var cont = document.getElementById('zsResults');
    if (!cont) return;
    var secciones = buscarSecciones(texto, 6);
    var cursos = buscarCursos(texto, estado.cursos, 5);
    if (!normalizar(texto)) return cerrarResultados();
    var html = '';
    if (cursos.length) html += '<div class="zs-results__t">Cursos</div>' + cursos.map(function (c) {
      return '<a class="zs-res" href="club-biblioteca.html"><span class="zs-res__ico">' + icono('book', 16) + '</span><span><strong>' + esc(c.titulo) + '</strong>' + (c.area ? '<small>' + esc(c.area) + '</small>' : '') + '</span></a>';
    }).join('');
    if (secciones.length) html += '<div class="zs-results__t">Secciones</div>' + secciones.map(function (s) {
      return '<a class="zs-res" href="' + esc(s.href) + '"><span class="zs-res__ico">' + icono(s.icon, 16) + '</span><span><strong>' + esc(s.label) + '</strong><small>' + esc(s.grupo) + '</small></span></a>';
    }).join('');
    cont.innerHTML = html || '<div class="zs-results__vacio">Sin resultados para “' + esc(texto) + '”.</div>';
    cont.hidden = false;
  }

  function cargarCursosParaBuscar() {
    if (estado.cursos || !club() || !club().getCursos) return;
    estado.cursos = [];
    Promise.resolve().then(function () { return club().getCursos(); })
      .then(function (lista) { estado.cursos = Array.isArray(lista) ? lista : []; var i = document.getElementById('zsSearchInput'); if (i && i.value) pintarResultados(i.value); })
      .catch(function () { estado.cursos = []; });
  }

  function abrirCajon(abrir) {
    var cajon = document.getElementById('zsDrawer'), velo = document.getElementById('zsVelo');
    if (!cajon || !velo) return;
    cajon.classList.toggle('is-open', !!abrir);
    velo.classList.toggle('is-open', !!abrir);
    cajon.setAttribute('aria-hidden', abrir ? 'false' : 'true');
    document.body.classList.toggle('zs-noscroll', !!abrir);
  }

  function cerrarSesion() {
    if (club() && club().logout) club().logout();
  }

  /* Monta la estructura. opciones: { sesion, activo }. Se puede llamar más de una vez sin duplicar nada. */
  function montar(opciones) {
    opciones = opciones || {};
    if (estado.montado || document.getElementById('zsTopbar')) return false;
    var main = document.querySelector('.club-main');
    if (!main) return false;
    estado.montado = true;
    completarIconos();
    limpiarEncabezadosViejos();

    var sesion = opciones.sesion || {};
    var activo = opciones.activo || '';

    var barra = document.createElement('header');
    barra.className = 'zs-topbar';
    barra.id = 'zsTopbar';
    barra.innerHTML = barraSuperiorHTML(sesion);
    main.insertBefore(barra, main.firstChild);

    var cuerpo = document.createElement('div');
    cuerpo.innerHTML =
      panelNotifHTML() +
      '<nav class="zs-bottom" id="zsBottom" aria-label="Navegación principal">' + barraInferiorHTML(activo) + '</nav>' +
      '<div class="zs-velo" id="zsVelo"></div>' +
      '<aside class="zs-drawer" id="zsDrawer" role="dialog" aria-label="Menú" aria-hidden="true">' + cajonHTML(sesion, activo) + '</aside>' +
      whatsappHTML();
    while (cuerpo.firstChild) document.body.appendChild(cuerpo.firstChild);

    pintarTema();

    /* buscador (en pantallas chicas el texto de ayuda se acorta para que no se corte) */
    function ajustarPlaceholder() { var i = document.getElementById('zsSearchInput'); if (i) i.placeholder = window.innerWidth <= 560 ? 'Buscar…' : 'Buscar cursos o secciones…'; }
    ajustarPlaceholder(); window.addEventListener('resize', ajustarPlaceholder);
    var entrada = document.getElementById('zsSearchInput');
    entrada.addEventListener('focus', cargarCursosParaBuscar);
    entrada.addEventListener('input', function () { pintarResultados(entrada.value); });
    entrada.addEventListener('keydown', function (e) { if (e.key === 'Escape') { entrada.value = ''; cerrarResultados(); entrada.blur(); } });
    document.addEventListener('click', function (e) { var b = document.getElementById('zsSearch'); if (b && !b.contains(e.target)) cerrarResultados(); });

    /* botones */
    document.getElementById('zsTheme').addEventListener('click', cambiarTema);
    document.getElementById('zsThemeCajon').addEventListener('click', cambiarTema);
    document.getElementById('zsSalir').addEventListener('click', cerrarSesion);
    document.getElementById('zsSalirCajon').addEventListener('click', cerrarSesion);
    function verGuia() { abrirCajon(false); if (club() && club()._showGuideFromSidebar) club()._showGuideFromSidebar(); }
    document.getElementById('zsHelp').addEventListener('click', verGuia);
    document.getElementById('zsAyudaCajon').addEventListener('click', verGuia);
    document.getElementById('zsMas').addEventListener('click', function () { abrirCajon(true); });
    document.getElementById('zsCerrarCajon').addEventListener('click', function () { abrirCajon(false); });
    document.getElementById('zsVelo').addEventListener('click', function () { abrirCajon(false); });
    document.getElementById('zsDrawer').addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) abrirCajon(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { abrirCajon(false); abrirWa(false); } });

    /* WhatsApp flotante */
    var waBtn = document.getElementById('zsWaBtn'), waMenu = document.getElementById('zsWaMenu');
    function abrirWa(abrir) { waMenu.hidden = !abrir; waBtn.setAttribute('aria-expanded', abrir ? 'true' : 'false'); }
    waBtn.addEventListener('click', function (e) { e.stopPropagation(); abrirWa(waMenu.hidden); });
    document.addEventListener('click', function (e) { if (!waMenu.hidden && !document.getElementById('zsWa').contains(e.target)) abrirWa(false); });

    window.addEventListener('storage', function (e) { if (e.key === 'zoo_theme') { document.documentElement.setAttribute('data-theme', e.newValue === 'light' ? 'light' : 'dark'); pintarTema(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > BREAKPOINT_MOVIL) abrirCajon(false); });

    /* campana: la lógica ya existe en club.js y busca estos mismos ids */
    if (sesion && sesion.uid) {
      var cl = club();
      if (window.ZOO_AVISOS && cl) {
        window.ZOO_AVISOS.montar({
          sesion: sesion, boton: document.getElementById('notifBtn'), panel: document.getElementById('notifPanel'), secciones: planos(),
          apiFetch: function (ruta) { return cl.apiFetch(ruta); },
          legado: function () { return cl.getNotificaciones ? cl.getNotificaciones(sesion) : []; }
        });
      } else if (cl && cl.initNotifications) {
        /* respaldo: la campana anterior necesita su propio contenido dentro del panel */
        var p = document.getElementById('notifPanel');
        if (p) p.innerHTML = '<div class="notif-panel__header"><h3>Notificaciones</h3><button class="notif-panel__close" id="notifPanelClose" aria-label="Cerrar">✕</button></div><div class="notif-panel__actions" id="notifPanelActions" style="display:none;"><button class="notif-mark-all" id="notifMarkAll">Marcar todas como leídas</button></div><div class="notif-panel__list" id="notifList">Cargando…</div>';
        Promise.resolve().then(function () { return cl.initNotifications(sesion); }).catch(function () { /* sin campana */ });
      }
    }
    return true;
  }

  API.montar = montar;
  API.menuHTML = menuHTML;
  API.pintarTema = pintarTema;
  return API;
});
