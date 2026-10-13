/* ============================================================ */
/* CLUB VIP ZOORIGEN · NOTICIAS DEL SECTOR                       */
/* Rejilla de tarjetas tipo recorte de periódico (igual que las  */
/* de Alintec Food): dominio y fecha, cabecera de color SÓLIDO   */
/* con el nombre del periódico, foto de la nota, titular serif,  */
/* extracto justificado y "Ver resumen ampliado" con su número.  */
/* La lectura ampliada reutiliza la misma cabecera.              */
/* La parte pura se prueba en Node; la de pantalla solo en el    */
/* navegador. Todo texto externo se escapa antes de mostrarse.   */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_NOTICIAS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Las tres cabeceras: verde de marca, naranja quemado y carbón con etiqueta dorada. */
  var PLANTILLAS = ['verde', 'naranja', 'bicolor'];
  var DOMINIO = 'zoorigen.com';
  var NOMBRE_PERIODICO = 'Zoorigen Actualidad';
  var CATEGORIAS = {
    fauna: { nombre: 'Fauna silvestre', color: '#2F7A4F' },
    conservacion: { nombre: 'Conservación', color: '#6FBF73' },
    veterinaria: { nombre: 'Veterinaria y medicina zoológica', color: '#2AA4D5' },
    normativa: { nombre: 'Normatividad ambiental', color: '#E8A317' },
    apicultura: { nombre: 'Apicultura', color: '#D4A017' },
    ciencia: { nombre: 'Ciencia y biodiversidad', color: '#8B7FBA' }
  };
  /* La foto de cada tarjeta es la imagen de la propia nota. Cuando la nota no trae imagen (o falla al cargar, o es
     una miniatura de menos de 200 px) se usa una FOTO propia del sitio según la categoría, con la fuente en una
     etiqueta pequeña encima. Sin degradados ni ilustraciones: son las mismas fotos que ya usa el sitio, recortadas a 16:9
     y optimizadas en assets/img/noticias/ (salen de assets/img/areas/). */
  var RUTA_FOTOS = '../assets/img/noticias/';
  var FOTOS_RESPALDO = {
    fauna: 'respaldo-fauna.jpg',               /* pangolín */
    conservacion: 'respaldo-conservacion.jpg', /* equipo de campo en un monitoreo nocturno */
    veterinaria: 'respaldo-veterinaria.jpg',   /* perro con su cuidadora */
    normativa: 'respaldo-normativa.jpg',       /* manejo de fauna en una UMA */
    apicultura: 'respaldo-apicultura.jpg',     /* abeja polinizando */
    ciencia: 'respaldo-ciencia.jpg'            /* serpiente verde (biodiversidad) */
  };
  var FOTO_GENERAL = 'respaldo-fauna.jpg';
  var MIN_ANCHO_IMAGEN = 200;
  var MAX_TITULO = 180;
  var MAX_EXTRACTO_TARJETA = 420;  /* la hoja de estilos lo recorta a ~5 líneas */
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

  /* "13 de octubre de 2026" (línea superior de la tarjeta) */
  function fechaCorta(v) {
    var d = aFecha(v);
    if (!d) return '';
    return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
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

  /* Versión corta para la línea de la fuente: "Ahora", "hace 3 h", "Ayer", "hace 4 días", "12 sep". */
  function tiempoCorto(v, ahora) {
    var d = aFecha(v);
    if (!d) return '';
    var ms = (ahora instanceof Date ? ahora.getTime() : Date.now()) - d.getTime();
    if (ms < 0) ms = 0;
    var h = Math.floor(ms / 3600000);
    if (h < 1) return 'Ahora';
    if (h < 24) return 'hace ' + h + ' h';
    var dias = Math.floor(h / 24);
    if (dias === 1) return 'Ayer';
    if (dias < 8) return 'hace ' + dias + ' días';
    return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3);
  }

  /* Número entero estable a partir de un texto (djb2). Misma entrada, mismo resultado, siempre. */
  function hashTexto(s) {
    var h = 5381, t = String(s == null ? '' : s);
    for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
    return h;
  }

  /* La plantilla que eligió la persona administradora; si no hay, se deriva del id de la nota (así no cambia al
     recargar ni cuando llegan notas nuevas). Sin id, se reparten por posición. */
  function plantillaDe(n, indice) {
    if (n && PLANTILLAS.indexOf(n.plantilla) !== -1) return n.plantilla;
    var id = n && n.id != null ? String(n.id) : '';
    if (id) return PLANTILLAS[hashTexto(id) % PLANTILLAS.length];
    return PLANTILLAS[Math.abs(indice || 0) % PLANTILLAS.length];
  }

  function categoriaDe(n) {
    var c = n && CATEGORIAS[n.categoria] ? n.categoria : 'ciencia';
    return { id: c, nombre: (n && n.categoriaNombre) ? limpiar(n.categoriaNombre, 40) : CATEGORIAS[c].nombre, color: CATEGORIAS[c].color };
  }

  /* Dirección de la foto de respaldo de una categoría. `opciones.base` cambia la carpeta (por defecto la de las páginas del club). */
  function imagenRespaldo(categoria, opciones) {
    var base = opciones && typeof opciones.base === 'string' ? opciones.base : RUTA_FOTOS;
    var archivo = Object.prototype.hasOwnProperty.call(FOTOS_RESPALDO, categoria) ? FOTOS_RESPALDO[categoria] : FOTO_GENERAL;
    return base + archivo;
  }

  /* Número de orden de la tarjeta: 01, 02, ... 10, 11 */
  function numeroOrden(indice) {
    var n = Number(indice);
    n = Number.isFinite(n) && n >= 0 ? Math.floor(n) + 1 : 1;
    return (n < 10 ? '0' : '') + n;
  }

  /* Foto de la nota (16:9 por CSS) o, si no hay, la foto de respaldo (con la fuente encima). */
  function fotoHTML(n, opciones, grande) {
    var respaldo = imagenRespaldo(n.categoria.id, opciones);
    return '<div class="hoja__foto' + (grande ? ' hoja__foto--grande' : '') + '">' +
      '<img class="hoja__img" src="' + esc(n.imagen || respaldo) + '" data-respaldo="' + esc(respaldo) + '"' + (n.imagen ? ' data-real="1"' : '') +
      ' alt="" width="640" height="360"' + (grande ? '' : ' loading="lazy"') + ' decoding="async" referrerpolicy="no-referrer">' +
      '<span class="hoja__fuente">' + esc(n.fuente) + '</span>' +
    '</div>';
  }

  /* Datos ya limpios y seguros para pintar una noticia. */
  function normalizar(n, indice) {
    n = n || {};
    var cat = categoriaDe(n);
    var resumen = Array.isArray(n.resumen) ? n.resumen : String(n.resumen || '').split(/\r?\n/);
    resumen = resumen.map(function (l) { return limpiar(l, 400); }).filter(Boolean).slice(0, 8);
    return {
      id: String(n.id || ''),
      titulo: limpiar(n.titulo, MAX_TITULO) || 'Noticia',
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

  /* Línea superior (dominio + fecha) y cabecera de color con el nombre del periódico y "Categoría — fuente". */
  function cabeceraHTML(n, ahora) {
    var fecha = fechaCorta(n.fecha || ahora);
    var partes = NOMBRE_PERIODICO.split(' ');
    return '<div class="hj-top"><span class="hj-dom">' + esc(DOMINIO) + '</span><span class="hj-fecha">' + esc(fecha) + '</span></div>' +
      '<header class="hj-mast">' +
        '<h3 class="hj-brand"><span class="hj-b1">' + esc(partes[0]) + '</span> <span class="hj-b2">' + esc(partes[1]) + '</span></h3>' +
        '<p class="hj-lema">' + esc(n.categoria.nombre) + ' — <em>' + esc(n.fuente) + '</em></p>' +
      '</header>';
  }

  function claseHoja(n, extra) {
    return 'hoja hoja--' + n.plantilla + (extra ? ' ' + extra : '') + (n.imagen ? '' : ' hoja--respaldo');
  }

  /* Tarjeta de la rejilla. opciones: { ahora, base } */
  function hojaHTML(raw, indice, opciones) {
    opciones = opciones || {};
    var n = normalizar(raw, indice);
    var ahora = opciones.ahora instanceof Date ? opciones.ahora : new Date();
    var texto = n.extracto || n.resumen.join(' ');
    var tiempo = n.fecha ? tiempoCorto(n.fecha, ahora) : '';
    return '<article class="' + claseHoja(n, 'hoja--tarjeta') + '" role="button" tabindex="0" data-noticia="' + esc(n.id) + '" data-i="' + esc(indice) + '" aria-label="' + esc(n.titulo) + '">' +
      cabeceraHTML(n, ahora) +
      fotoHTML(n, opciones, false) +
      '<div class="hoja__cuerpo">' +
        '<h3 class="hoja__titulo">' + esc(n.titulo) + '</h3>' +
        '<p class="hj-deck">' + esc(n.fuente) + (tiempo ? ' · ' + esc(tiempo) : '') + '</p>' +
        (texto ? '<p class="hoja__texto" lang="es">' + esc(limpiar(texto, MAX_EXTRACTO_TARJETA)) + '</p>' : '') +
      '</div>' +
      '<footer class="hj-foot"><span class="hj-leer">Ver resumen ampliado <span aria-hidden="true">→</span></span><span class="hj-page" aria-hidden="true">' + numeroOrden(indice) + '</span></footer>' +
    '</article>';
  }

  /* Hoja grande para leer ("Lo esencial"). */
  function lecturaHTML(raw, indice, opciones) {
    opciones = opciones || {};
    var n = normalizar(raw, indice);
    var ahora = opciones.ahora instanceof Date ? opciones.ahora : new Date();
    var cuerpo = n.resumen.length
      ? '<ul class="lectura__lista">' + n.resumen.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'
      : (n.extracto ? '<p>' + esc(n.extracto) + '</p>' : '');
    return '<div class="' + claseHoja(n, 'hoja--grande') + '" role="document">' +
      cabeceraHTML(n, ahora) +
      fotoHTML(n, opciones, true) +
      '<div class="hoja__cuerpo">' +
        '<h2 class="hoja__titulo hoja__titulo--grande">' + esc(n.titulo) + '</h2>' +
        '<div class="hoja__meta">Por ' + esc(n.fuente) + (n.fecha ? ' · ' + esc(fechaLarga(n.fecha)) + ' (' + esc(tiempoRelativo(n.fecha, ahora)) + ')' : '') + '</div>' +
        '<div class="lectura__esencial"><div class="lectura__etq">Lo esencial</div>' + cuerpo + '</div>' +
        '<p class="lectura__aviso">Resumen informativo. La nota completa es de ' + esc(n.fuente) + '.</p>' +
        (n.link ? '<a class="lectura__leer" href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer">Leer nota completa en ' + esc(n.fuente) + ' <svg class="zi" aria-hidden="true"><use href="#zi-arrow-up-right"/></svg></a>'
                : '<div class="lectura__leer lectura__leer--sin">Fuente: ' + esc(n.fuente) + '</div>') +
      '</div>' +
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

  function vacioHTML(opciones) {
    opciones = opciones || {};
    return '<div class="nt-vacio"><strong>' + esc(opciones.tituloVacio || 'Noticias en camino') + '</strong><span>' + esc(opciones.mensajeVacio || 'Aún no hay noticias publicadas. Se actualizan cada mañana.') + '</span></div>';
  }

  /* Rejilla completa. lista: notas tal como llegan del servidor. opciones: { ahora, max, base, tituloVacio, mensajeVacio } */
  function rejillaHTML(lista, opciones) {
    var o = opciones || {};
    var datos = Array.isArray(lista) ? lista.filter(function (n) { return n && typeof n === 'object'; }).slice(0, o.max || 60) : [];
    if (!datos.length) return vacioHTML(o);
    return '<div class="hojas">' + datos.map(function (n, i) { return hojaHTML(n, i, o); }).join('') + '</div>';
  }

  var API = {
    PLANTILLAS: PLANTILLAS, CATEGORIAS: CATEGORIAS, FOTOS_RESPALDO: FOTOS_RESPALDO, RUTA_FOTOS: RUTA_FOTOS, MIN_ANCHO_IMAGEN: MIN_ANCHO_IMAGEN,
    DOMINIO: DOMINIO, NOMBRE_PERIODICO: NOMBRE_PERIODICO,
    esc: esc, urlSegura: urlSegura, limpiar: limpiar, fechaLarga: fechaLarga, fechaCorta: fechaCorta, tiempoRelativo: tiempoRelativo, tiempoCorto: tiempoCorto,
    hashTexto: hashTexto, plantillaDe: plantillaDe, categoriaDe: categoriaDe, imagenRespaldo: imagenRespaldo, numeroOrden: numeroOrden,
    normalizar: normalizar, filtrar: filtrar,
    hojaHTML: hojaHTML, lecturaHTML: lecturaHTML, rejillaHTML: rejillaHTML, chipsHTML: chipsHTML
  };

  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* PANTALLA                                                      */
  /* ============================================================ */
  function cuando(handler) { return function (e) { try { handler(e); } catch (err) { console.warn('Noticias:', err); } }; }

  /* Si la imagen de la nota falla (o es una miniatura de menos de 200 px) se cambia, una sola vez, por la foto de respaldo
     de su categoría y la tarjeta muestra la etiqueta de la fuente. Si hasta el respaldo falla, queda el fondo liso. */
  function usarRespaldo(img) {
    if (!img || img.tagName !== 'IMG' || !img.classList.contains('hoja__img')) return;
    var respaldo = img.getAttribute('data-respaldo');
    if (img.dataset.cambiada || !respaldo) { if (img.parentNode) img.parentNode.classList.add('hoja__foto--vacia'); return; }
    img.dataset.cambiada = '1';
    var hoja = img.closest ? img.closest('.hoja') : null;
    if (hoja) hoja.classList.add('hoja--respaldo');
    img.src = respaldo;
  }
  function vigilarImagenes(contenedor) {
    contenedor.addEventListener('error', function (e) { usarRespaldo(e.target); }, true);
    contenedor.addEventListener('load', function (e) {
      var img = e.target;
      if (img && img.tagName === 'IMG' && img.getAttribute('data-real') && !img.dataset.cambiada && img.naturalWidth && img.naturalWidth < MIN_ANCHO_IMAGEN) usarRespaldo(img);
    }, true);
    /* una imagen que ya falló antes de engancharse */
    Array.prototype.forEach.call(contenedor.querySelectorAll('img.hoja__img'), function (img) {
      if (img.complete && !img.naturalWidth && img.getAttribute('src')) usarRespaldo(img);
    });
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

  /* Pinta la rejilla de tarjetas y engancha clics/teclado. opciones: { mensajeVacio, tituloVacio, max }. */
  function pintar(contenedor, lista, opciones) {
    opciones = opciones || {};
    if (!contenedor) return;
    var datos = Array.isArray(lista) ? lista.filter(function (n) { return n && typeof n === 'object'; }).slice(0, opciones.max || 60) : [];
    contenedor.innerHTML = rejillaHTML(datos, opciones);
    if (!datos.length) return;
    vigilarImagenes(contenedor);
    var abrir = cuando(function (e) {
      var h = e.target.closest && e.target.closest('[data-noticia][data-i]');
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
