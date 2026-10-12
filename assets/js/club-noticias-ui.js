/* ============================================================ */
/* CLUB VIP ZOORIGEN · NOTICIAS DEL SECTOR (tarjetas "hoja")     */
/* Titular + extracto corto + enlace a la nota original.         */
/* La parte pura se prueba en Node; la de pantalla solo en el    */
/* navegador. Todo texto externo se escapa antes de mostrarse.   */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_NOTICIAS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PLANTILLAS = ['verde', 'naranja', 'bicolor'];
  var CATEGORIAS = {
    fauna: { nombre: 'Fauna silvestre', color: '#2F7A4F' },
    conservacion: { nombre: 'Conservación', color: '#6FBF73' },
    veterinaria: { nombre: 'Veterinaria y medicina zoológica', color: '#2AA4D5' },
    normativa: { nombre: 'Normatividad ambiental', color: '#E8A317' },
    apicultura: { nombre: 'Apicultura', color: '#D4A017' },
    ciencia: { nombre: 'Ciencia y biodiversidad', color: '#8B7FBA' }
  };
  /* Cuando la nota no trae foto (o falla al cargar) se muestra una ilustración propia, sin texto, hecha con el color
     y el ícono de su categoría. Así nunca aparece una foto ajena a la noticia ni un cartel con precios. */
  var ICONOS = {
    fauna: '<ellipse cx="12" cy="16.2" rx="4.2" ry="3.4"/><ellipse cx="5.6" cy="11" rx="1.7" ry="2.3"/><ellipse cx="9.4" cy="6.6" rx="1.7" ry="2.4"/><ellipse cx="14.6" cy="6.6" rx="1.7" ry="2.4"/><ellipse cx="18.4" cy="11" rx="1.7" ry="2.3"/>',
    conservacion: '<path d="M5 21c.5 -4.5 2.5 -8 7 -10"/><path d="M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3z"/>',
    veterinaria: '<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/><path d="M3.5 12h3l1.5 -3l2 6l1 -3h2.5"/>',
    normativa: '<path d="M12 3v18"/><path d="M9 21h6"/><path d="M5 6h14"/><path d="M5 6l-2 6a3 3 0 0 0 6 0l-2 -6"/><path d="M19 6l-2 6a3 3 0 0 0 6 0l-2 -6"/>',
    apicultura: '<path d="M12 3l4 2.3v4.6l-4 2.3l-4 -2.3v-4.6z"/><path d="M6 12.6l4 2.3v4.6l-4 2.3l-4 -2.3v-4.6z" transform="translate(1 -1.6)"/><path d="M18 12.6l4 2.3v4.6l-4 2.3l-4 -2.3v-4.6z" transform="translate(-1 -1.6)"/>',
    ciencia: '<path d="M9 3l6 0"/><path d="M10 3v5.5a3.5 3.5 0 0 1 -.5 1.8l-3.5 5.8a3.5 3.5 0 0 0 3 5.4h6a3.5 3.5 0 0 0 3 -5.4l-3.5 -5.8a3.5 3.5 0 0 1 -.5 -1.8v-5.5"/><path d="M6 14l12 0"/>'
  };
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* ───── funciones puras ───── */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* Solo direcciones https (nunca javascript:, data:, http:). Devuelve '' si no es segura. */
  function urlSegura(u) {
    var s = String(u == null ? '' : u).trim();
    if (!/^https:\/\//i.test(s) || /[\s<>"'`\\]/.test(s) || s.length > 2000) return '';
    try { var x = new URL(s); return x.protocol === 'https:' && x.hostname ? x.href : ''; } catch (e) { return ''; }
  }

  /* Quita etiquetas y caracteres de control, junta espacios y recorta sin partir palabras. */
  function limpiar(s, max) {
    var t = String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!max || t.length <= max) return t;
    var corte = t.slice(0, max);
    var sp = corte.lastIndexOf(' ');
    if (sp > max * 0.6) corte = corte.slice(0, sp);
    return corte.replace(/[\s,;:.\-–—]+$/, '') + '…';
  }

  function aFecha(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v.toDate === 'function') return v.toDate();
    if (typeof v === 'object' && Number.isFinite(v._seconds)) return new Date(v._seconds * 1000);
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  /* "viernes, 9 de octubre de 2026" */
  function fechaLarga(v) {
    var d = aFecha(v);
    if (!d) return '';
    return DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }

  /* "hace 5 min", "hace 3 h", "ayer", "hace 4 días", "12 sep 2026" */
  function tiempoRelativo(v, ahora) {
    var d = aFecha(v);
    if (!d) return '';
    var ms = (ahora instanceof Date ? ahora.getTime() : Date.now()) - d.getTime();
    if (ms < 0) ms = 0;
    var min = Math.floor(ms / 60000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return 'hace ' + min + ' min';
    var h = Math.floor(min / 60);
    if (h < 24) return 'hace ' + h + ' h';
    var dias = Math.floor(h / 24);
    if (dias === 1) return 'ayer';
    if (dias < 7) return 'hace ' + dias + ' días';
    return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
  }

  /* La plantilla que eligió la persona administradora; si no hay, se reparten verde → naranja → bicolor. */
  function plantillaDe(n, indice) {
    if (n && PLANTILLAS.indexOf(n.plantilla) !== -1) return n.plantilla;
    return PLANTILLAS[Math.abs(indice || 0) % PLANTILLAS.length];
  }

  function categoriaDe(n) {
    var c = n && CATEGORIAS[n.categoria] ? n.categoria : 'ciencia';
    return { id: c, nombre: (n && n.categoriaNombre) ? limpiar(n.categoriaNombre, 40) : CATEGORIAS[c].nombre, color: CATEGORIAS[c].color };
  }

  function imagenRespaldo(categoria) {
    var id = ICONOS[categoria] ? categoria : 'ciencia';
    var color = CATEGORIAS[id].color;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f2418"/><stop offset="1" stop-color="' + color + '"/></linearGradient></defs>' +
      '<rect width="640" height="400" fill="url(#g)"/>' +
      '<g fill="#ffffff" fill-opacity=".07"><circle cx="560" cy="60" r="150"/><circle cx="60" cy="380" r="120"/><circle cx="330" cy="420" r="90"/></g>' +
      '<g transform="translate(320 200) scale(7) translate(-12 -12)" fill="none" stroke="#ffffff" stroke-opacity=".88" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">' + ICONOS[id] + '</g></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  /* Datos ya limpios y seguros para pintar una noticia. */
  function normalizar(n, indice) {
    n = n || {};
    var cat = categoriaDe(n);
    var resumen = Array.isArray(n.resumen) ? n.resumen : String(n.resumen || '').split(/\r?\n/);
    resumen = resumen.map(function (l) { return limpiar(l, 400); }).filter(Boolean).slice(0, 8);
    return {
      id: String(n.id || ''),
      titulo: limpiar(n.titulo, 180) || 'Noticia',
      extracto: limpiar(n.extracto, 520),
      resumen: resumen,
      fuente: limpiar(n.fuente, 60) || 'Zoorigen',
      link: urlSegura(n.link),
      imagen: urlSegura(n.imagen),
      fecha: aFecha(n.fecha || n.creadoEn),
      categoria: cat,
      plantilla: plantillaDe(n, indice),
      origen: n.origen === 'admin' ? 'admin' : 'auto'
    };
  }

  /* Filtra por categoría (o 'todas'). */
  function filtrar(lista, categoria) {
    if (!Array.isArray(lista)) return [];
    if (!categoria || categoria === 'todas') return lista.slice();
    return lista.filter(function (n) { return n && n.categoria === categoria; });
  }

  /* ───── HTML (devuelve texto; todo valor externo pasa por esc) ───── */
  function hojaHTML(raw, indice, opciones) {
    opciones = opciones || {};
    var n = normalizar(raw, indice);
    var ahora = opciones.ahora instanceof Date ? opciones.ahora : new Date();
    var respaldo = imagenRespaldo(n.categoria.id);
    var texto = n.extracto || (n.resumen[0] || '');
    return '<article class="hoja hoja--' + n.plantilla + '" role="button" tabindex="0" data-noticia="' + esc(n.id) + '" data-i="' + esc(indice) + '" aria-label="' + esc(n.titulo) + '">' +
      '<div class="hoja__top"><span>zoorigen.com</span><span>' + esc(fechaLarga(n.fecha || ahora)) + '</span></div>' +
      '<div class="hoja__mast"><span class="hoja__logo">Zoorigen Actualidad</span><strong>' + esc(n.categoria.nombre) + ' — ' + esc(n.fuente) + '</strong></div>' +
      '<div class="hoja__foto"><img src="' + esc(n.imagen || respaldo) + '" data-cat="' + esc(n.categoria.id) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>' +
      '<h3 class="hoja__titulo">' + esc(n.titulo) + '</h3>' +
      '<div class="hoja__meta">' + esc(n.fuente) + (n.fecha ? ' · ' + esc(tiempoRelativo(n.fecha, ahora)) : '') + '</div>' +
      (texto ? '<p class="hoja__texto">' + esc(limpiar(texto, 300)) + '</p>' : '') +
      '<div class="hoja__pie"><span>Ver resumen ampliado →</span><span>' + String(Number(indice || 0) + 1).padStart(2, '0') + '</span></div>' +
    '</article>';
  }

  /* Hoja grande para leer ("Lo esencial"). */
  function lecturaHTML(raw, indice, opciones) {
    opciones = opciones || {};
    var n = normalizar(raw, indice);
    var ahora = opciones.ahora instanceof Date ? opciones.ahora : new Date();
    var respaldo = imagenRespaldo(n.categoria.id);
    var cuerpo = n.resumen.length
      ? '<ul class="lectura__lista">' + n.resumen.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'
      : (n.extracto ? '<p>' + esc(n.extracto) + '</p>' : '');
    return '<div class="hoja hoja--' + n.plantilla + ' hoja--grande" role="document">' +
      '<div class="hoja__top"><span>zoorigen.com</span><span>' + esc(fechaLarga(n.fecha || ahora)) + '</span></div>' +
      '<div class="hoja__mast"><span class="hoja__logo">Zoorigen Actualidad</span><strong>' + esc(n.categoria.nombre) + ' — ' + esc(n.fuente) + '</strong></div>' +
      '<h2 class="hoja__titulo hoja__titulo--grande">' + esc(n.titulo) + '</h2>' +
      '<div class="hoja__meta">Por ' + esc(n.fuente) + (n.fecha ? ' · ' + esc(tiempoRelativo(n.fecha, ahora)) : '') + '</div>' +
      '<div class="hoja__foto hoja__foto--grande"><img src="' + esc(n.imagen || respaldo) + '" data-cat="' + esc(n.categoria.id) + '" alt="" decoding="async" referrerpolicy="no-referrer"></div>' +
      '<div class="lectura__esencial"><div class="lectura__etq">Lo esencial</div>' + cuerpo + '</div>' +
      '<p class="lectura__aviso">Resumen informativo. La nota completa es de ' + esc(n.fuente) + '.</p>' +
      (n.link ? '<a class="lectura__leer" href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer">Leer nota completa en ' + esc(n.fuente) + ' <svg class="zi" aria-hidden="true"><use href="#zi-arrow-up-right"/></svg></a>'
              : '<div class="lectura__leer lectura__leer--sin">Fuente: ' + esc(n.fuente) + '</div>') +
    '</div>';
  }

  /* Chips de categoría con solo las que existen en la lista. */
  function chipsHTML(lista, activa) {
    var presentes = {};
    (lista || []).forEach(function (n) { if (n && n.categoria) presentes[n.categoria] = true; });
    var ids = Object.keys(CATEGORIAS).filter(function (c) { return presentes[c]; });
    var chip = function (id, txt) { return '<button type="button" class="nt-chip' + ((activa || 'todas') === id ? ' is-active' : '') + '" data-cat="' + esc(id) + '">' + esc(txt) + '</button>'; };
    return chip('todas', 'Todas') + ids.map(function (c) { return chip(c, CATEGORIAS[c].nombre); }).join('');
  }

  var API = {
    PLANTILLAS: PLANTILLAS, CATEGORIAS: CATEGORIAS, ICONOS: ICONOS,
    esc: esc, urlSegura: urlSegura, limpiar: limpiar, fechaLarga: fechaLarga, tiempoRelativo: tiempoRelativo,
    plantillaDe: plantillaDe, categoriaDe: categoriaDe, imagenRespaldo: imagenRespaldo, normalizar: normalizar, filtrar: filtrar,
    hojaHTML: hojaHTML, lecturaHTML: lecturaHTML, chipsHTML: chipsHTML
  };

  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* PANTALLA                                                      */
  /* ============================================================ */
  function cuando(handler) { return function (e) { try { handler(e); } catch (err) { console.warn('Noticias:', err); } }; }

  /* Si una imagen falla, se cambia por la imagen de respaldo (una sola vez). */
  function vigilarImagenes(contenedor) {
    contenedor.addEventListener('error', function (e) {
      var img = e.target;
      if (!img || img.tagName !== 'IMG' || !img.dataset.cat || img.dataset.cambiada) return;
      img.dataset.cambiada = '1';
      img.src = imagenRespaldo(img.dataset.cat);
    }, true);
  }

  var modal = null, ultimoFoco = null;
  function cerrarModal() {
    if (!modal) return;
    modal.remove(); modal = null;
    document.body.classList.remove('nt-noscroll');
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }
  function abrirModal(raw, indice, opciones) {
    cerrarModal();
    ultimoFoco = document.activeElement;
    modal = document.createElement('div');
    modal.className = 'nt-modal';
    modal.innerHTML = '<div class="nt-modal__cuerpo" role="dialog" aria-modal="true" aria-label="Noticia">' +
      '<button type="button" class="nt-modal__x" aria-label="Cerrar"><svg class="zi" aria-hidden="true"><use href="#zi-x"/></svg></button>' + lecturaHTML(raw, indice, opciones) + '</div>';
    document.body.appendChild(modal);
    document.body.classList.add('nt-noscroll');
    vigilarImagenes(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.nt-modal__x')) cerrarModal(); });
    var x = modal.querySelector('.nt-modal__x'); if (x) x.focus();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarModal(); });

  /* Pinta la rejilla de hojas y engancha clics/teclado. opciones: { mensajeVacio, tituloVacio, max }. */
  function pintar(contenedor, lista, opciones) {
    opciones = opciones || {};
    if (!contenedor) return;
    var datos = Array.isArray(lista) ? lista.slice(0, opciones.max || 60) : [];
    if (!datos.length) {
      contenedor.innerHTML = '<div class="nt-vacio"><strong>' + esc(opciones.tituloVacio || 'Noticias en camino') + '</strong><span>' + esc(opciones.mensajeVacio || 'Aún no hay noticias publicadas. Se actualizan cada mañana.') + '</span></div>';
      return;
    }
    contenedor.innerHTML = '<div class="hojas">' + datos.map(function (n, i) { return hojaHTML(n, i, opciones); }).join('') + '</div>';
    vigilarImagenes(contenedor);
    var abrir = cuando(function (e) {
      var h = e.target.closest && e.target.closest('.hoja[data-i]');
      if (!h || !contenedor.contains(h)) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      if (e.type === 'keydown') e.preventDefault();
      var i = Number(h.getAttribute('data-i'));
      if (datos[i]) abrirModal(datos[i], i, opciones);
    });
    contenedor.onclick = abrir;
    contenedor.onkeydown = abrir;
  }

  API.pintar = pintar;
  API.abrirModal = abrirModal;
  API.cerrarModal = cerrarModal;
  return API;
});
