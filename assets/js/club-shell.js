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
      { id: 'certificados', label: 'Mis certificados', icon: 'certificate', href: 'club-certificados.html' },
      { id: 'referidos', label: 'Invitar amigos', icon: 'gift', href: 'club-referidos.html' }
    ] },
    { id: 'material', titulo: 'Material', items: [
      { id: 'pdfs', label: 'PDFs y materiales', icon: 'filetext', href: 'club-pdfs.html' },
      { id: 'videos', label: 'Videos', icon: 'video', href: 'club-videos.html' },
      { id: 'sesiones', label: 'Webinars en vivo', icon: 'broadcast', href: 'club-sesiones.html' }
    ] },
    { id: 'herramientas', titulo: 'Herramientas pro', items: [
      { id: 'herramientas', label: 'Referencia clínica', icon: 'flask', href: 'club-herramientas.html' },
      { id: 'infusiones', label: 'Infusiones y diluciones', icon: 'flask', href: 'club-infusiones.html' },
      { id: 'inventario', label: 'Libro de registro', icon: 'filetext', href: 'club-inventario.html' },
      { id: 'legal', label: 'Herramientas legales', icon: 'scale', href: 'club-legal.html' }
    ] },
    { id: 'comunidad', titulo: 'Comunidad', items: [
      { id: 'foro', label: 'Foro VIP', icon: 'messages', href: 'club-foro.html' },
      { id: 'directorio', label: 'Directorio VIP', icon: 'users', href: 'club-directorio.html' },
      { id: 'canal', label: 'Canal de WhatsApp', icon: 'brandwhatsapp', href: 'club-canal.html' }
    ] },
    { id: 'cuenta', titulo: 'Mi cuenta', items: [
      { id: 'perfil', label: 'Mi perfil', icon: 'user', href: 'club-perfil.html' },
      { id: 'suscripcion', label: 'Suscripción', icon: 'creditcard', href: 'club-suscripcion.html' }
    ] }
  ];

  /* Pestañas de la barra inferior del celular (la última abre el cajón "Más").
     Hay dos juegos que comparten las tres primeras y "Más": el de miembro (Vivo y Pro) y el de cuenta gratuita
     (Retos y Logros). El CSS muestra uno u otro según <html data-plan>. */
  var BARRA = [
    { id: 'inicio', label: 'Inicio', icon: 'home', href: 'club-dashboard.html' },
    { id: 'biblioteca', label: 'Cursos', icon: 'book', href: 'club-biblioteca.html' },
    { id: 'pdfs', label: 'PDFs', icon: 'news', href: 'club-pdfs.html' },
    { id: 'sesiones', label: 'Vivo', icon: 'broadcast', href: 'club-sesiones.html', solo: 'vip' },
    { id: 'herramientas', label: 'Pro', icon: 'tools', href: 'club-herramientas.html', solo: 'vip' },
    { id: 'retos', label: 'Retos', icon: 'target', href: 'club-retos.html', solo: 'libre' },
    { id: 'logros', label: 'Logros', icon: 'trophy', href: 'club-logros.html', solo: 'libre' },
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
  function pestanaActiva(activoId, variante) {
    var v = variante === 'libre' ? 'libre' : 'vip';
    if (v === 'vip' && (activoId === 'herramientas' || activoId === 'legal')) return 'herramientas';
    for (var i = 0; i < BARRA.length - 1; i++) if (BARRA[i].id === activoId && (!BARRA[i].solo || BARRA[i].solo === v)) return activoId;
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

  /* ¿Tiene membresía vigente? Solo cuenta la membresía real (planStatus). El administrador no entra por aquí: va a su panel;
     con "Ver como usuario" la sesión llega con rol de miembro y se ve exactamente lo que vería esa cuenta. */
  function esMiembroVip(sesion) {
    if (!sesion) return false;
    var cl = null;
    try { cl = (typeof ZOORIGEN_CLUB !== 'undefined') ? ZOORIGEN_CLUB : null; } catch (e) { cl = null; }
    if (cl && typeof cl.hasActiveMembership === 'function') { try { if (cl.hasActiveMembership(sesion)) return true; } catch (e) { /* nada */ } }
    return sesion.planStatus === 'active' || sesion.planStatus === 'cancelled_active';
  }

  function enlaceSoporte(texto) {
    return 'https://wa.me/' + SOPORTE + '?text=' + encodeURIComponent(texto);
  }

  /* ───── MARCADO (el mismo que usa el navegador y el que se escribe, ya hecho, en el HTML de cada página) ─────
     Todo lo de esta parte es puro: el generador (tools/generar-cromo-club.js) lo ejecuta en Node para dejar la barra lateral,
     la barra superior y la barra inferior escritas en el HTML. Así existen desde el primer pintado, sin esperar a que cargue
     Firebase ni a que responda la sesión. El navegador solo las completa (nombre, plan) y les pone sus eventos. */
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icono(nombre, tam) {
    return (typeof zooIcon === 'function') ? zooIcon(nombre, tam || 18) : '';
  }

  /* Clases en vivo en "Próximamente" (ZOO_CONFIG.clasesEnVivoPronto): el menú lo marca con una etiqueta "Pronto". */
  function enVivoPronto() {
    try { return typeof ZOO_CONFIG !== 'undefined' && ZOO_CONFIG.clasesEnVivoPronto === true; } catch (e) { return false; }
  }

  /* Íconos que el menú nuevo necesita y club.js aún no tenía. */
  var ICONOS_EXTRA = {
    news: '<path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11"/><path d="M8 8l4 0"/><path d="M8 12l4 0"/><path d="M8 16l4 0"/>',
    menu: '<path d="M4 6l16 0"/><path d="M4 12l16 0"/><path d="M4 18l16 0"/>',
    logout: '<path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2"/><path d="M9 12h12l-3 -3"/><path d="M18 15l3 -3"/>',
    tools: '<path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5"/>',
    x: '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
    download: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 11l5 5l5 -5"/><path d="M12 4l0 12"/>',
    bulb: '<path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7"/><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3"/><path d="M9.7 17l4.6 0"/>'
  };

  function enlaceHTML(item, activo, clase) {
    var pronto = item.id === 'sesiones' && enVivoPronto();
    return '<a href="' + esc(item.href) + '" class="' + (clase || '') + (item.id === activo ? ' is-active' : '') + '">' +
      '<span class="icon">' + icono(item.icon) + '</span>' + esc(item.label) +
      (item.nuevo ? '<span class="badge badge--nuevo">Nuevo</span>' : '') +
      (pronto ? '<span class="badge badge--pronto">Pronto</span>' : '') + '</a>';
  }

  /* Menú agrupado (lo usan el menú lateral y el cajón). */
  function menuHTML(activo, clase) {
    var instalar = '<a href="#instalar" class="' + (clase || '') + ' zs-instalar" data-instalar="1"><span class="icon">' + icono('download') + '</span>Instalar app</a>';
    return GRUPOS.map(function (g, n) {
      var cierre = (n === GRUPOS.length - 1) ? instalar : '';
      return '<div class="club-sidebar__section">' + esc(g.titulo) + '</div>' + g.items.map(function (i) { return enlaceHTML(i, activo, clase); }).join('') + cierre;
    }).join('');
  }

  /* Estado de la membresía en palabras cortas (se guarda en localStorage como "zoo_plan" y se pone en <html data-plan>
     para que el CSS pinte el bloque de plan desde el primer pintado). Es solo el estado, nunca nombre ni correo. */
  var ESTADOS_PLAN = ['active', 'cancelled_active', 'past_due', 'expired', 'free'];
  function estadoPlan(planStatus) {
    return ESTADOS_PLAN.indexOf(planStatus) !== -1 ? planStatus : 'free';
  }

  /* Bloque de plan de la barra lateral ANTES de saber la sesión: cada texto trae sus variantes y el CSS muestra la del
     <html data-plan>. Cuando llega la sesión, club.js lo reemplaza por el bloque real (con la fecha de renovación). */
  function planEsqueletoHTML() {
    var v = function (estado, txt) { return '<span class="zs-pv zs-pv--' + estado + '">' + txt + '</span>'; };
    return '<div class="club-sidebar__plan zs-plan-esq" style="padding:10px 12px;text-align:center;">' +
      '<div style="display:flex;justify-content:center;align-items:center;gap:6px;margin-bottom:4px;">' +
        '<span class="zs-plan-punto" style="width:7px;height:7px;border-radius:50%;"></span>' +
        '<span class="plan-label" style="margin:0;font-size:.75rem;letter-spacing:.06em;">' +
          v('active', 'MEMBRESÍA ACTIVA') + v('cancelled_active', 'ACCESO VIGENTE') + v('past_due', 'PAGO NO CONFIRMADO') +
          v('expired', 'MEMBRESÍA VENCIDA') + v('free', 'CUENTA GRATUITA') + '</span>' +
      '</div>' +
      '<div class="plan-meta" style="font-size:.75rem;margin-bottom:8px;opacity:.75;">&nbsp;</div>' +
      '<a href="club-suscripcion.html" class="zs-pv zs-pv--boton" style="font-size:.78rem;background:rgba(232,163,23,0.12);border:1px solid rgba(232,163,23,0.4);color:var(--zoo-amber,#E8A317);padding:7px 10px;border-radius:8px;margin-bottom:8px;font-weight:700;text-decoration:none;">Activar membresía</a>' +
      '<a href="#" class="plan-logout" style="display:inline-block;font-size:.8rem;" onclick="ZOORIGEN_CLUB.logout(); return false;">Cerrar sesión</a>' +
    '</div>';
  }

  /* Barra lateral completa sin sesión: marca, menú agrupado y bloque de plan. */
  function barraLateralHTML(activo) {
    return '<button class="club-sidebar__close" id="sidebarCloseBtn" aria-label="Cerrar menú"><svg class="zi" aria-hidden="true"><use href="#zi-x"/></svg></button>' +
      '<div class="club-sidebar__brand"><img src="../assets/img/logo/logo-96.webp" alt="Zoorigen" width="44" height="44">' +
        '<div class="club-sidebar__brand-text"><h3>Zoorigen</h3><small>' +
          '<span class="zs-pv zs-pv--vip">Club VIP</span><span class="zs-pv zs-pv--libre">Acceso gratuito</span></small></div></div>' +
      menuHTML(activo, '') + planEsqueletoHTML();
  }

  /* Barra superior. Con sesión lleva el nombre; sin ella (el HTML estático) deja esos huecos vacíos y el navegador los llena. */
  function barraSuperiorHTML(sesion) {
    var nombre = sesion ? primerNombre(sesion.name, sesion.email) : '';
    var inic = sesion ? iniciales(sesion.name, sesion.email) : '';
    return '' +
      '<span class="zs-quien' + (sesion ? ' is-listo' : '') + '">' + icono('user', 14) + '<span class="zs-quien__n">' + esc(nombre) + '</span></span>' +
      '<div class="zs-search" id="zsSearch" role="search">' +
        '<span class="zs-search__ico">' + icono('search', 17) + '</span>' +
        '<input type="search" id="zsSearchInput" placeholder="Buscar cursos o secciones…" autocomplete="off" aria-label="Buscar">' +
        '<div class="zs-results" id="zsResults" hidden></div>' +
      '</div>' +
      '<div class="zs-actions">' +
        '<button type="button" class="zs-btn zs-help" id="zsHelp" title="Ver guía de bienvenida" aria-label="Ver guía de bienvenida">' + icono('helpcircle', 18) + '</button>' +
        '<button type="button" class="zs-btn notif-icon zs-bell" id="notifBtn" title="Notificaciones" aria-label="Notificaciones">' + icono('bell', 18) +
          '<span class="notif-badge" id="notifBadge" style="display:none;">0</span></button>' +
        '<button type="button" class="zs-btn zs-theme" id="zsTheme" data-dual="1" title="Cambiar entre modo día y noche" aria-label="Cambiar entre modo día y noche">' +
          '<span class="zs-theme__v zs-theme__luna">' + icono('moon', 17) + '<span class="zs-theme__txt">Noche</span></span>' +
          '<span class="zs-theme__v zs-theme__sol">' + icono('sun', 17) + '<span class="zs-theme__txt">Día</span></span></button>' +
        '<a class="zs-avatar" id="zsAvatar" href="club-perfil.html" title="Tu espacio: perfil, plan y accesos" aria-label="Mi perfil y mi cuenta" aria-haspopup="dialog" aria-expanded="false">' +
          '<span class="zs-avatar__circle">' + esc(inic) + '</span>' +
          '<span class="zs-avatar__name">' + esc(nombre) + '</span></a>' +
        '<button type="button" class="zs-btn zs-salir" id="zsSalir" title="Cerrar sesión" aria-label="Cerrar sesión">' + icono('logout', 18) + '</button>' +
      '</div>';
  }

  function barraInferiorHTML(activo) {
    var mVip = pestanaActiva(activo, 'vip'), mLibre = pestanaActiva(activo, 'libre');
    return BARRA.map(function (t) {
      var enVip = t.solo !== 'libre' && t.id === mVip, enLibre = t.solo !== 'vip' && t.id === mLibre;
      var es = enVip || enLibre;
      var extra = (t.solo ? ' zs-tab--solo-' + t.solo : '') + (es && !t.solo && !(enVip && enLibre) ? (enVip ? ' zs-tab--act-vip' : ' zs-tab--act-libre') : '');
      var etiqueta = '<span class="zs-tab__ico">' + icono(t.icon, 20) + '</span><span class="zs-tab__txt">' + esc(t.label) + '</span>' +
        (t.id === 'sesiones' && enVivoPronto() ? '<span class="zs-tab__pronto">Pronto</span>' : '');
      return t.id === 'mas'
        ? '<button type="button" class="zs-tab' + extra + (es ? ' is-active' : '') + '" id="zsMas" aria-label="Más opciones" aria-haspopup="dialog">' + etiqueta + '</button>'
        : '<a class="zs-tab' + extra + (es ? ' is-active' : '') + '" href="' + esc(t.href) + '">' + etiqueta + '</a>';
    }).join('');
  }

  /* ───── MENÚ DEL AVATAR ("Tu espacio"): resumen de la cuenta y accesos ───── */
  var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function aFecha(v) {
    if (!v) return null;
    var d = null;
    if (v instanceof Date) d = v;
    else if (typeof v.toDate === 'function') { try { d = v.toDate(); } catch (e) { d = null; } }
    else if (isFinite(v.seconds != null ? v.seconds : v._seconds)) d = new Date((v.seconds != null ? v.seconds : v._seconds) * 1000);
    else d = new Date(v);
    return d && !isNaN(d.getTime()) ? d : null;
  }
  function fechaCorta(v) {
    var d = aFecha(v);
    return d ? d.getDate() + ' ' + MESES_CORTOS[d.getMonth()] + ' ' + d.getFullYear() : '';
  }
  /* Estado del plan en palabras: { clave, miembro, etiqueta, detalle }  (detalle = renovación o vencimiento, si se conoce) */
  function resumenPlan(sesion) {
    var s = sesion || {};
    if (s.role === 'admin') return { clave: 'admin', miembro: true, etiqueta: 'Administrador', detalle: '' };
    var f = fechaCorta(s.planVence);
    switch (s.planStatus) {
      case 'active': return { clave: 'active', miembro: true, etiqueta: 'Membresía activa', detalle: f ? 'Se renueva el ' + f : '' };
      case 'cancelled_active': return { clave: 'cancelled_active', miembro: true, etiqueta: 'Acceso vigente', detalle: f ? 'Sin renovación. Conservas acceso hasta el ' + f : 'Cancelaste la renovación' };
      case 'past_due': return { clave: 'past_due', miembro: false, etiqueta: 'Pago no confirmado', detalle: 'Revisa tu suscripción para recuperar el acceso' };
      case 'expired': return { clave: 'expired', miembro: false, etiqueta: 'Membresía vencida', detalle: f ? 'Venció el ' + f : '' };
      default: return { clave: 'free', miembro: false, etiqueta: 'Cuenta gratuita', detalle: '' };
    }
  }

  var ATAJOS_PERFIL = [
    { id: 'perfil', label: 'Mi perfil', sub: 'Datos y nombre del certificado', href: 'club-perfil.html', icon: 'user' },
    { id: 'suscripcion', label: 'Suscripción', sub: 'Plan y renovación', href: 'club-suscripcion.html', icon: 'creditcard' },
    { id: 'referidos', label: 'Invitar amigos', sub: 'Gana cursos antes', href: 'club-referidos.html', icon: 'gift' },
    { id: 'certificados', label: 'Mis certificados', sub: 'Descarga los tuyos', href: 'club-certificados.html', icon: 'certificate' },
    { id: 'logros', label: 'Mis logros', sub: 'Nivel y premios', href: 'club-logros.html', icon: 'trophy' }
  ];

  /* Contenido del panel. datos (opcional, solo miembros): { xp, nivel, cursos } del servidor. */
  function perfilMenuHTML(sesion, datos) {
    var s = sesion || {};
    var plan = resumenPlan(s);
    var nombre = (s.name && String(s.name).trim()) || primerNombre(s.name, s.email);
    var correo = s.email || '';
    var d = datos || {};
    var num = function (v) { return isFinite(Number(v)) && v !== null && v !== '' && v !== undefined ? Number(v).toLocaleString('es-MX') : '—'; };
    var estadisticas = plan.miembro
      ? '<div class="zs-pm__stats" data-pm-stats>' +
          '<div><b data-pm-xp>' + esc(num(d.xp)) + '</b><span>XP</span></div>' +
          '<div><b data-pm-nivel>' + esc(d.nivel ? String(d.nivel) : '—') + '</b><span>Nivel</span></div>' +
          '<div><b data-pm-cursos>' + esc(num(d.cursos)) + '</b><span>Cursos</span></div></div>'
      : '<div class="zs-pm__libre"><strong>Tu cuenta es gratuita</strong>' +
          '<p>Con la membresía abres todos los cursos, retos y herramientas, y puedes invitar amigos.</p>' +
          '<a class="zs-pm__sus" href="club-suscripcion.html">' + icono('creditcard', 17) + '<span>Suscribirme</span></a></div>';
    var atajos = ATAJOS_PERFIL.map(function (a) {
      return '<a class="zs-pm__atajo" href="' + esc(a.href) + '" role="menuitem"><span class="zs-pm__ico">' + icono(a.icon, 18) + '</span>' +
        '<span><b>' + esc(a.label) + '</b><small>' + esc(a.sub) + '</small></span></a>';
    }).join('');
    return '<div class="zs-pm__cab">' +
        '<button type="button" class="zs-pm__x" id="zsPmCerrar" aria-label="Cerrar">' + icono('x', 17) + '</button>' +
        '<p class="zs-pm__kick">Tu espacio Zoorigen</p>' +
        '<div class="zs-pm__id"><span class="zs-pm__foto" aria-hidden="true">' + esc(iniciales(s.name, s.email)) + '</span>' +
          '<div><h2 id="zsPmTitulo">' + esc(nombre) + '</h2>' + (correo ? '<p class="zs-pm__correo">' + esc(correo) + '</p>' : '') +
          '<span class="zs-pm__plan zs-pm__plan--' + esc(plan.clave) + '">' + esc(plan.etiqueta) + '</span></div></div>' +
        (plan.detalle ? '<p class="zs-pm__detalle">' + esc(plan.detalle) + '</p>' : '') +
      '</div>' +
      '<div class="zs-pm__cuerpo">' + estadisticas +
        '<nav class="zs-pm__atajos" aria-label="Accesos de tu cuenta" role="menu">' + atajos + '</nav>' +
        '<div class="zs-pm__pie">' +
          '<button type="button" class="zs-pm__btn" id="zsPmAyuda">' + icono('helpcircle', 17) + '<span>Ver la guía de bienvenida</span></button>' +
          '<button type="button" class="zs-pm__btn zs-theme" id="zsPmTema"></button>' +
          '<button type="button" class="zs-pm__btn zs-pm__btn--salir" id="zsPmSalir">' + icono('logout', 17) + '<span>Cerrar sesión</span></button>' +
        '</div>' +
      '</div>';
  }

  var API = {
    GRUPOS: GRUPOS, BARRA: BARRA, SOPORTE: SOPORTE, BREAKPOINT_MOVIL: BREAKPOINT_MOVIL,
    planos: planos, normalizar: normalizar, buscarSecciones: buscarSecciones, buscarCursos: buscarCursos,
    pestanaActiva: pestanaActiva, primerNombre: primerNombre, iniciales: iniciales, enlaceSoporte: enlaceSoporte, esMiembroVip: esMiembroVip, modoInstalacion: modoInstalacion,
    ICONOS_EXTRA: ICONOS_EXTRA, ESTADOS_PLAN: ESTADOS_PLAN, resumenPlan: resumenPlan, fechaCorta: fechaCorta, perfilMenuHTML: perfilMenuHTML, ATAJOS_PERFIL: ATAJOS_PERFIL, estadoPlan: estadoPlan, menuHTML: menuHTML,
    barraLateralHTML: barraLateralHTML, barraSuperiorHTML: barraSuperiorHTML, barraInferiorHTML: barraInferiorHTML, planEsqueletoHTML: planEsqueletoHTML
  };

  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* PARTE DE PANTALLA                                             */
  /* ============================================================ */
  var estado = { montado: false, cursos: null, sesion: null };

  /* ZOORIGEN_CLUB se declara con const en club.js: no es propiedad de window, se busca por su nombre. */
  function club() { try { return (typeof ZOORIGEN_CLUB !== 'undefined') ? ZOORIGEN_CLUB : null; } catch (e) { return null; } }

  /* Íconos que el menú nuevo necesita y club.js aún no tenía. */
  function completarIconos() {
    try {
      if (typeof ZOORIGEN_ICONS === 'undefined') return;
      Object.keys(ICONOS_EXTRA).forEach(function (k) { if (!ZOORIGEN_ICONS[k]) ZOORIGEN_ICONS[k] = ICONOS_EXTRA[k]; });
    } catch (e) { /* sin íconos extra */ }
  }

  completarIconos();

  /* ───── Instalar la app (PWA): el navegador avisa una sola vez que se puede instalar; se guarda ese aviso ───── */
  var avisoInstalar = null;
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); avisoInstalar = e; });
    window.addEventListener('appinstalled', function () { avisoInstalar = null; });
  }
  function modoInstalacion(info) {
    info = info || {};
    if (info.instalada) return 'instalada';
    if (info.hayAviso) return 'aviso';
    if (info.esIOS) return 'ios';
    return 'manual';
  }
  function abrirInstalar() {
    var ua = (navigator.userAgent || '');
    var instalada = false;
    try { instalada = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) { instalada = false; }
    var modo = modoInstalacion({ instalada: instalada, hayAviso: !!avisoInstalar, esIOS: /iPhone|iPad|iPod/i.test(ua) });
    var previo = document.getElementById('zsInstalar'); if (previo) previo.remove();
    var texto = {
      instalada: '<p>Zoorigen ya está instalada en este dispositivo. Ábrela desde tu pantalla de inicio.</p>',
      aviso: '<p>Instala Zoorigen para abrirla como una app: acceso directo, pantalla completa y carga más rápida.</p><button type="button" class="zs-inst__btn" id="zsInstalarYa">Instalar ahora</button>',
      ios: '<p>En iPhone y iPad se instala desde Safari:</p><ol><li>Toca el botón <strong>Compartir</strong> (el cuadro con la flecha hacia arriba).</li><li>Elige <strong>Agregar a pantalla de inicio</strong>.</li><li>Toca <strong>Agregar</strong>.</li></ol>',
      manual: '<p>Abre el menú de tu navegador (los tres puntos) y elige <strong>Instalar Zoorigen</strong> o <strong>Agregar a pantalla de inicio</strong>.</p><p>Si no aparece la opción, abre esta página en Chrome, Edge o Safari.</p>'
    }[modo];
    var c = document.createElement('div');
    c.id = 'zsInstalar';
    c.className = 'zs-inst';
    c.setAttribute('role', 'dialog');
    c.setAttribute('aria-modal', 'true');
    c.innerHTML = '<div class="zs-inst__velo" data-cerrar="1"></div><div class="zs-inst__caja"><button type="button" class="zs-inst__x" data-cerrar="1" aria-label="Cerrar">' + icono('x', 18) + '</button>' +
      '<div class="zs-inst__icono">' + icono('download', 26) + '</div><h2>Instalar app</h2>' + texto + '</div>';
    document.body.appendChild(c);
    c.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-cerrar]')) c.remove();
    });
    var ya = c.querySelector('#zsInstalarYa');
    if (ya && avisoInstalar) ya.addEventListener('click', function () {
      var ev = avisoInstalar;
      ev.prompt();
      Promise.resolve(ev.userChoice).then(function () { avisoInstalar = null; c.remove(); }).catch(function () { c.remove(); });
    });
  }

  function temaActual() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  function pintarTema() {
    var oscuro = temaActual() === 'dark';
    document.querySelectorAll('.zs-theme').forEach(function (b) {
      /* el botón de la barra superior trae ya los dos estados (el CSS muestra el que toca por <html data-theme>) */
      if (!b.hasAttribute('data-dual')) b.innerHTML = icono(oscuro ? 'sun' : 'moon', 17) + '<span class="zs-theme__txt">' + (oscuro ? 'Día' : 'Noche') + '</span>';
      b.setAttribute('aria-label', oscuro ? 'Cambiar a modo día' : 'Cambiar a modo noche');
      b.title = oscuro ? 'Cambiar a modo día' : 'Cambiar a modo noche';
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = oscuro ? '#0F1215' : '#F3F5F1';
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

  /* El contenido del panel lo pinta club-avisos.js (o, si no está, la campana anterior de club.js). */
  function panelNotifHTML() {
    return '<div class="notif-panel zs-notif" id="notifPanel" style="display:none;"></div>';
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

  /* La barra superior estática trae los huecos del nombre vacíos: se llenan con la sesión (sin tocar nada más). */
  function completarBarra(barra, sesion) {
    var nombre = primerNombre(sesion && sesion.name, sesion && sesion.email);
    var q = barra.querySelector('.zs-quien');
    if (q) {
      var n = q.querySelector('.zs-quien__n');
      if (n) n.textContent = nombre;
      q.classList.add('is-listo');
    }
    var c = barra.querySelector('.zs-avatar__circle');
    if (c) c.textContent = iniciales(sesion && sesion.name, sesion && sesion.email);
    var an = barra.querySelector('.zs-avatar__name');
    if (an) an.textContent = nombre;
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

  /* ── Panel del avatar ("Tu espacio") ──
     Se crea al primer toque (el primer pintado no cambia). Cierra con Esc, clic fuera o la X, devuelve el foco al avatar y
     no se abre encima de otra ventana (bienvenida, premio, recorrido, aviso): la cola de ventanas manda. */
  var pm = { abierto: false, previo: null };

  function hayVentanaAjena() {
    var lista = document.querySelectorAll('[aria-modal="true"], .zob:not(.zob-toast), .zc-ov, .pw-modal__fondo, #zoo-welcome-modal');
    return Array.prototype.some.call(lista, function (el) {
      return el.id !== 'zsPm' && !(el.closest && el.closest('#zsPm')) && el.getClientRects().length > 0;
    });
  }

  function crearPanelPerfil() {
    var velo = document.createElement('div');
    velo.className = 'zs-pm-velo'; velo.id = 'zsPmVelo';
    var panel = document.createElement('aside');
    panel.className = 'zs-pm'; panel.id = 'zsPm';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'zsPmTitulo');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = perfilMenuHTML(estado.sesion, null);
    document.body.appendChild(velo);
    document.body.appendChild(panel);
    velo.addEventListener('click', function () { cerrarPerfil(); });
    panel.querySelector('#zsPmCerrar').addEventListener('click', function () { cerrarPerfil(); });
    panel.querySelector('#zsPmAyuda').addEventListener('click', function () {
      cerrarPerfil();
      if (club() && club()._showGuideFromSidebar) club()._showGuideFromSidebar();
    });
    panel.querySelector('#zsPmTema').addEventListener('click', cambiarTema);
    panel.querySelector('#zsPmSalir').addEventListener('click', cerrarSesion);
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(panel.querySelectorAll('a[href],button:not([disabled])'), function (x) { return x.getClientRects().length > 0; });
      if (!f.length) return;
      var primero = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    });
    pintarTema();
    return panel;
  }

  /* XP, nivel y cursos terminados solo se piden a los miembros (los demás no tienen esas cifras). */
  function cargarCifrasPerfil(panel) {
    var plan = resumenPlan(estado.sesion);
    var cl = club();
    if (!plan.miembro || !cl || typeof cl.apiFetch !== 'function') return;
    Promise.resolve().then(function () { return cl.apiFetch('/api/premios'); }).then(function (r) {
      if (!r || r.membresia === false || !panel.isConnected) return;
      var q = function (s) { return panel.querySelector(s); };
      if (r.xp && isFinite(Number(r.xp.total)) && q('[data-pm-xp]')) q('[data-pm-xp]').textContent = Number(r.xp.total).toLocaleString('es-MX');
      if (r.nivel && r.nivel.nombre && q('[data-pm-nivel]')) q('[data-pm-nivel]').textContent = String(r.nivel.nombre);
      if (r.cursos && isFinite(Number(r.cursos.terminados)) && q('[data-pm-cursos]')) q('[data-pm-cursos]').textContent = Number(r.cursos.terminados).toLocaleString('es-MX');
    }).catch(function () { /* sin cifras: quedan los guiones */ });
  }

  function abrirPerfil() {
    if (pm.abierto || hayVentanaAjena()) return;
    var panel = document.getElementById('zsPm') || crearPanelPerfil();
    var velo = document.getElementById('zsPmVelo');
    abrirCajon(false);
    pm.abierto = true;
    pm.previo = document.activeElement;
    panel.setAttribute('aria-hidden', 'false');
    var av = document.getElementById('zsAvatar');
    if (av) av.setAttribute('aria-expanded', 'true');
    document.body.classList.add('zs-noscroll');
    requestAnimationFrame(function () {
      panel.classList.add('is-open'); velo.classList.add('is-open');
      var x = panel.querySelector('#zsPmCerrar');
      if (x) { try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); } }
    });
    cargarCifrasPerfil(panel);
  }

  function cerrarPerfil() {
    if (!pm.abierto) return;
    pm.abierto = false;
    var panel = document.getElementById('zsPm'), velo = document.getElementById('zsPmVelo');
    if (panel) { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); }
    if (velo) velo.classList.remove('is-open');
    var av = document.getElementById('zsAvatar');
    if (av) av.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('zs-noscroll');
    var volver = pm.previo && pm.previo !== document.body && pm.previo.isConnected ? pm.previo : av;
    if (volver && typeof volver.focus === 'function') { try { volver.focus({ preventScroll: true }); } catch (e) { volver.focus(); } }
    pm.previo = null;
  }

  /* Monta la estructura. opciones: { sesion, activo }. Se puede llamar más de una vez sin duplicar nada. */
  function montar(opciones) {
    opciones = opciones || {};
    if (estado.montado) return false;
    var main = document.querySelector('.club-main');
    if (!main) return false;
    estado.montado = true;
    completarIconos();
    limpiarEncabezadosViejos();

    var sesion = opciones.sesion || {};
    var activo = opciones.activo || '';
    estado.sesion = sesion;

    /* La barra superior y la inferior ya vienen escritas en el HTML de la página (generados con las
       mismas funciones de arriba), así que existen desde el primer pintado. Aquí solo se completan con la sesión y se les
       pone sus eventos. Si una página no las trae, se arman como siempre. */
    var barra = document.getElementById('zsTopbar');
    if (barra) {
      completarBarra(barra, sesion);
    } else {
      barra = document.createElement('header');
      barra.className = 'zs-topbar';
      barra.id = 'zsTopbar';
      barra.innerHTML = barraSuperiorHTML(sesion);
      main.insertBefore(barra, main.firstChild);
    }

    var cuerpo = document.createElement('div');
    cuerpo.innerHTML =
      (document.getElementById('notifPanel') ? '' : panelNotifHTML()) +
      (document.getElementById('zsBottom') ? '' : '<nav class="zs-bottom" id="zsBottom" aria-label="Navegación principal">' + barraInferiorHTML(activo) + '</nav>') +
      '<div class="zs-velo" id="zsVelo"></div>' +
      '<aside class="zs-drawer" id="zsDrawer" role="dialog" aria-label="Menú" aria-hidden="true">' + cajonHTML(sesion, activo) + '</aside>';
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
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { abrirCajon(false); cerrarPerfil(); } });

    /* avatar: abre "Tu espacio". Con clic medio, Ctrl o Cmd (abrir en otra pestaña) sigue siendo el enlace a Mi perfil. */
    var avatar = document.getElementById('zsAvatar') || barra.querySelector('.zs-avatar');
    if (avatar) {
      avatar.id = 'zsAvatar';
      avatar.setAttribute('aria-haspopup', 'dialog');
      avatar.setAttribute('aria-expanded', 'false');
      avatar.addEventListener('click', function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        if (pm.abierto) cerrarPerfil(); else abrirPerfil();
      });
    }

    /* Instalar app (menú lateral y cajón) */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-instalar]');
      if (!a) return;
      e.preventDefault();
      abrirInstalar();
    });

    window.addEventListener('storage', function (e) { if (e.key === 'zoo_theme') { document.documentElement.setAttribute('data-theme', e.newValue === 'dark' ? 'dark' : 'light'); pintarTema(); } });
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
