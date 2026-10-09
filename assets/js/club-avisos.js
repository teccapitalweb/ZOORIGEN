/* ============================================================ */
/* CLUB VIP ZOORIGEN · CAMPANA DE AVISOS                         */
/* Mezcla los avisos del servidor (personales y generales: datos  */
/* curiosos, noticias, premios, certificados...) con los que se   */
/* calculan en el navegador (webinars próximos, cursos nuevos).   */
/* Lo leído y lo borrado se guarda en este navegador, por cuenta. */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_AVISOS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_LISTA = 40;
  var MAX_MEMORIA = 300;      // ids recordados (leídos / borrados) por cuenta
  var ESPERA_LEER_MS = 800;   // al abrir la campana, tras este tiempo todo cuenta como leído

  /* Ícono (nombre de club.js) y color por tipo; los desconocidos usan "general". */
  var PRESET = {
    noticia: { icono: 'news', color: '#6FBF73' },
    dato: { icono: 'bulb', color: '#F59E0B' },
    certificado: { icono: 'certificate', color: '#34D399' },
    logro: { icono: 'trophy', color: '#FBBF24' },
    premio: { icono: 'gift', color: '#F59E0B' },
    libro: { icono: 'book', color: '#34D399' },
    xp: { icono: 'trophy', color: '#FBBF24' },
    bienvenida: { icono: 'gift', color: '#F59E0B' },
    clase: { icono: 'broadcast', color: '#60A5FA' },
    webinar: { icono: 'broadcast', color: '#60A5FA' },
    curso: { icono: 'book', color: '#6FBF73' },
    foro: { icono: 'messages', color: '#60A5FA' },
    sistema: { icono: 'bell', color: '#9CA3AF' },
    general: { icono: 'bell', color: '#6FBF73' }
  };

  /* ───── funciones puras ───── */
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function aFecha(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v.toDate === 'function') return v.toDate();
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  /* El título trae un emoji al inicio ("💡 Dato curioso"); como ya hay un ícono, se quita para no repetir. */
  function sinEmojiInicial(t) {
    var s = String(t || '');
    try { s = s.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, ''); } catch (e) { /* motor sin soporte: se deja igual */ }
    return s || String(t || '');
  }

  function colorSeguro(c, defecto) { return /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? String(c) : defecto; }

  /* Un aviso del servidor o local, ya limpio y con ícono/color. */
  function normalizar(a) {
    a = a || {};
    var tipo = PRESET[a.tipo] ? a.tipo : 'general';
    var p = PRESET[tipo];
    var f = aFecha(a.fecha);
    return {
      id: String(a.id || ''),
      ambito: a.ambito === 'global' ? 'global' : (a.ambito === 'local' ? 'local' : 'personal'),
      tipo: tipo,
      titulo: sinEmojiInicial(a.titulo).slice(0, 140),
      texto: String(a.texto || a.descripcion || '').slice(0, 340),
      enlace: String(a.enlace || '').slice(0, 60),
      icono: p.icono,
      color: colorSeguro(a.color, p.color),
      fecha: f,
      leidoAntes: !!a.leidoAntes
    };
  }

  /* Junta varias listas, quita repetidos por id y ordena de más nuevo a más viejo. */
  function mezclar() {
    var vistos = {}, todo = [];
    Array.prototype.slice.call(arguments).forEach(function (lista) {
      (Array.isArray(lista) ? lista : []).forEach(function (a) {
        var n = normalizar(a);
        if (!n.id || vistos[n.id] || !n.titulo) return;
        vistos[n.id] = true; todo.push(n);
      });
    });
    todo.sort(function (x, y) { return (y.fecha ? y.fecha.getTime() : 0) - (x.fecha ? x.fecha.getTime() : 0); });
    return todo.slice(0, MAX_LISTA);
  }

  /* ---- memoria de leído / borrado (un objeto { leidos:[], borrados:[] }) ---- */
  function estadoVacio() { return { leidos: [], borrados: [] }; }
  function recortar(arr) { return arr.slice(Math.max(0, arr.length - MAX_MEMORIA)); }
  function unico(arr) { var v = {}, r = []; arr.forEach(function (x) { if (!v[x]) { v[x] = 1; r.push(x); } }); return r; }

  function visibles(lista, estado) {
    var b = {}; (estado.borrados || []).forEach(function (i) { b[i] = 1; });
    return lista.filter(function (a) { return !b[a.id]; });
  }
  function esLeido(a, estado) { return a.leidoAntes || (estado.leidos || []).indexOf(a.id) !== -1; }
  function noLeidas(lista, estado) { return visibles(lista, estado).filter(function (a) { return !esLeido(a, estado); }); }
  function conLeidos(estado, ids) { return { leidos: recortar(unico((estado.leidos || []).concat(ids))), borrados: estado.borrados || [] }; }
  function conBorrados(estado, ids) { return { leidos: estado.leidos || [], borrados: recortar(unico((estado.borrados || []).concat(ids))) }; }

  function claveLocal(uid, que) { return 'zoo_avisos_' + que + '_' + String(uid || 'anon'); }
  function leerEstado(almacen, uid) {
    var e = estadoVacio();
    try {
      ['leidos', 'borrados'].forEach(function (k) {
        var v = JSON.parse(almacen.getItem(claveLocal(uid, k)) || '[]');
        e[k] = Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }).slice(0, MAX_MEMORIA) : [];
      });
    } catch (err) { return estadoVacio(); }
    return e;
  }
  function guardarEstado(almacen, uid, estado) {
    try {
      almacen.setItem(claveLocal(uid, 'leidos'), JSON.stringify(estado.leidos || []));
      almacen.setItem(claveLocal(uid, 'borrados'), JSON.stringify(estado.borrados || []));
      return true;
    } catch (err) { return false; }
  }

  /* El texto del encabezado: "3 nuevas" / "1 nueva" / "Al día". */
  function resumenEncabezado(n) { return n > 0 ? n + (n === 1 ? ' nueva' : ' nuevas') : 'Al día'; }

  /* "hace 5 min", "hace 3 h", "ayer", "hace 4 días" */
  function hace(v, ahora) {
    var d = aFecha(v); if (!d) return '';
    var ms = Math.max(0, (ahora instanceof Date ? ahora.getTime() : Date.now()) - d.getTime());
    var min = Math.floor(ms / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return 'hace ' + min + ' min';
    var h = Math.floor(min / 60);
    if (h < 24) return 'hace ' + h + ' h';
    var dias = Math.floor(h / 24);
    return dias === 1 ? 'ayer' : (dias < 30 ? 'hace ' + dias + ' días' : 'hace más de un mes');
  }

  /* Solo se navega a páginas del propio sitio: un id del menú ("certificados") o un nombre de página ("club-pdfs.html"). */
  function destino(enlace, secciones) {
    var e = String(enlace || '').trim();
    if (!e) return '';
    if (/^[a-z0-9-]+\.html$/i.test(e)) return e;
    if (/^[a-z0-9-]+$/i.test(e)) {
      var hit = (secciones || []).filter(function (s) { return s.id === e; })[0];
      return hit ? hit.href : '';
    }
    return '';
  }

  /* Avisos que se arman en el navegador con datos que ya se leen (webinars, cursos nuevos...). */
  function deLegado(n) {
    return { id: 'local_' + n.id, ambito: 'local', tipo: n.type === 'curso' ? 'curso' : (n.type === 'webinar' ? 'clase' : (n.type === 'welcome' ? 'bienvenida' : 'general')),
      titulo: n.title, texto: n.message, enlace: n.href || '', fecha: n.time, leidoAntes: !!n.read };
  }

  var montada = false;
  var API = {
    activo: function () { return montada; },
    PRESET: PRESET, MAX_LISTA: MAX_LISTA, ESPERA_LEER_MS: ESPERA_LEER_MS,
    normalizar: normalizar, mezclar: mezclar, visibles: visibles, esLeido: esLeido, noLeidas: noLeidas,
    conLeidos: conLeidos, conBorrados: conBorrados, estadoVacio: estadoVacio, leerEstado: leerEstado, guardarEstado: guardarEstado,
    claveLocal: claveLocal, resumenEncabezado: resumenEncabezado, hace: hace, destino: destino, deLegado: deLegado, esc: esc
  };

  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* PANTALLA                                                      */
  /* ============================================================ */
  function icono(n, t) { return (typeof zooIcon === 'function') ? zooIcon(n, t || 18) : ''; }

  function filaHTML(a, estado, ahora) {
    var leido = esLeido(a, estado);
    return '<div class="av-fila' + (leido ? '' : ' is-nueva') + (a.enlace ? ' is-enlace' : '') + '" data-id="' + esc(a.id) + '"' + (a.enlace ? ' role="link" tabindex="0"' : '') + '>' +
      '<span class="av-ico" style="--av:' + esc(a.color) + '">' + icono(a.icono, 18) + '</span>' +
      '<div class="av-cuerpo"><div class="av-titulo">' + esc(a.titulo) + '</div>' +
        (a.texto ? '<div class="av-texto">' + esc(a.texto) + '</div>' : '') +
        '<div class="av-hora">' + esc(hace(a.fecha, ahora)) + '</div></div>' +
      (leido ? '' : '<span class="av-punto" aria-label="Nueva"></span>') +
      '<button type="button" class="av-borrar" data-borrar="' + esc(a.id) + '" aria-label="Eliminar aviso" title="Eliminar">' + icono('x', 14) + '</button>' +
    '</div>';
  }

  /* Monta la campana. opciones: { sesion, boton, panel, apiFetch(ruta), legado():Promise<[]>, secciones:[{id,href}], almacen } */
  function montar(o) {
    o = o || {};
    var boton = o.boton, panel = o.panel, sesion = o.sesion || {};
    if (!boton || !panel || !sesion.uid) return null;
    if (montada) return null;
    montada = true;
    var almacen = o.almacen || (function () { try { return window.localStorage; } catch (e) { return null; } })();
    var uid = sesion.uid;
    var lista = [], estado = almacen ? leerEstado(almacen, uid) : estadoVacio();
    var abierto = false, temporizador = null, cargando = false;
    var badge = document.getElementById('notifBadge');

    function guardar() { if (almacen) guardarEstado(almacen, uid, estado); }

    function pintarBadge() {
      var n = noLeidas(lista, estado).length;
      if (badge) { badge.textContent = n > 9 ? '9+' : String(n); badge.style.display = n > 0 ? 'flex' : 'none'; }
      boton.setAttribute('aria-label', n > 0 ? 'Notificaciones: ' + n + (n === 1 ? ' nueva' : ' nuevas') : 'Notificaciones');
    }

    function pintarPanel() {
      var vis = visibles(lista, estado), nuevas = noLeidas(lista, estado).length, ahora = new Date();
      panel.innerHTML =
        '<div class="av-cab"><div class="av-cab__t">' + icono('bell', 16) + '<strong>Notificaciones</strong></div>' +
        '<span class="av-cab__n' + (nuevas ? ' hay' : '') + '">' + esc(resumenEncabezado(nuevas)) + '</span>' +
        '<button type="button" class="notif-panel__close av-cerrar" id="notifPanelClose" aria-label="Cerrar">✕</button></div>' +
        '<div class="av-lista" id="notifList">' + (vis.length
          ? vis.map(function (a) { return filaHTML(a, estado, ahora); }).join('')
          : '<div class="av-vacio">' + icono('bell', 28) + '<strong>Sin notificaciones</strong><span>Aquí verás datos curiosos, noticias, premios y avisos de tus cursos.</span></div>') + '</div>' +
        (vis.length ? '<div class="av-pie"><span>Mostrando últimas ' + vis.length + '</span><button type="button" class="av-todo" data-borrar-todo="1">Eliminar todo</button></div>' : '');
    }

    function refrescar() { pintarBadge(); if (abierto) pintarPanel(); }

    function cargar() {
      if (cargando) return Promise.resolve();
      cargando = true;
      var servidor = o.apiFetch ? Promise.resolve().then(function () { return o.apiFetch('/api/avisos'); }).then(function (r) { return (r && r.avisos) || []; }).catch(function () { return []; }) : Promise.resolve([]);
      var local = o.legado ? Promise.resolve().then(o.legado).then(function (l) { return (l || []).map(deLegado); }).catch(function () { return []; }) : Promise.resolve([]);
      return Promise.all([servidor, local]).then(function (r) { lista = mezclar(r[0], r[1]); refrescar(); }).then(function () { cargando = false; }, function () { cargando = false; });
    }

    function marcarTodoLeido() {
      var ids = visibles(lista, estado).map(function (a) { return a.id; });
      if (!ids.length) return;
      estado = conLeidos(estado, ids); guardar(); pintarBadge();
      if (abierto) { panel.querySelectorAll('.av-fila.is-nueva').forEach(function (f) { f.classList.remove('is-nueva'); var p = f.querySelector('.av-punto'); if (p) p.remove(); });
        var n = panel.querySelector('.av-cab__n'); if (n) { n.textContent = resumenEncabezado(0); n.classList.remove('hay'); } }
    }

    function abrir() {
      abierto = true;
      panel.style.display = 'flex';
      pintarPanel();
      setTimeout(function () { panel.classList.add('is-open'); }, 10);
      boton.setAttribute('aria-expanded', 'true');
      cargar().then(function () { if (abierto) { clearTimeout(temporizador); temporizador = setTimeout(function () { if (abierto) marcarTodoLeido(); }, ESPERA_LEER_MS); } });
      clearTimeout(temporizador); temporizador = setTimeout(function () { if (abierto) marcarTodoLeido(); }, ESPERA_LEER_MS);
    }
    function cerrar() {
      abierto = false; clearTimeout(temporizador);
      panel.classList.remove('is-open'); boton.setAttribute('aria-expanded', 'false');
      setTimeout(function () { if (!abierto) panel.style.display = 'none'; }, 200);
    }

    boton.addEventListener('click', function (e) { e.stopPropagation(); abierto ? cerrar() : abrir(); });
    document.addEventListener('click', function (e) { if (abierto && !panel.contains(e.target) && !boton.contains(e.target)) cerrar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && abierto) cerrar(); });

    function alActuar(e) {
      var t = e.target;
      if (t.closest && t.closest('#notifPanelClose')) return cerrar();
      var del = t.closest && t.closest('[data-borrar]');
      if (del) { e.stopPropagation(); estado = conBorrados(estado, [del.getAttribute('data-borrar')]); guardar(); refrescar(); return; }
      if (t.closest && t.closest('[data-borrar-todo]')) { estado = conBorrados(estado, visibles(lista, estado).map(function (a) { return a.id; })); guardar(); refrescar(); return; }
      var fila = t.closest && t.closest('.av-fila.is-enlace');
      if (fila) {
        var a = lista.filter(function (x) { return x.id === fila.getAttribute('data-id'); })[0];
        var url = a && destino(a.enlace, o.secciones);
        if (url) { estado = conLeidos(estado, [a.id]); guardar(); window.location.href = url; }
      }
    }
    panel.addEventListener('click', alActuar);
    panel.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('av-fila')) { e.preventDefault(); alActuar(e); } });

    cargar();
    setInterval(function () { if (!document.hidden) cargar(); }, 120000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) cargar(); });

    return { cargar: cargar, abrir: abrir, cerrar: cerrar, estado: function () { return estado; }, lista: function () { return lista; } };
  }

  API.montar = montar;
  return API;
});
