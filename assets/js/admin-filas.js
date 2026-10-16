/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · FILAS COMPACTAS Y MENÚ «…»          */
/* Una sola forma de listar en todo el panel (como Alintec):     */
/* avatar o ícono, título, una línea pequeña, insignias de       */
/* estado a la derecha y UN menú de acciones. Tocar la fila abre */
/* la ficha o el detalle.                                        */
/* Parte pura (HTML) probada en tests/admin-filas.test.js; la    */
/* parte del navegador (menú accesible) se instala sola.         */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'));
  else root.ZOO_ADMIN_FILAS = factory(root.ZOO_ICONOS);
})(typeof self !== 'undefined' ? self : this, function (iconos) {
  'use strict';

  var ico = function (n, o) { return iconos && iconos.svg ? iconos.svg(n, o) : ''; };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ───────── Menú de acciones ─────────
     Una acción: { t: texto, i: ícono, a: valor de data-accion, d: { otros data-* }, h: enlace (se abre en otra pestaña),
                   p: true si es peligrosa, sep: true para una línea separadora antes }. */
  function atributosDatos(datos) {
    var s = '';
    Object.keys(datos || {}).forEach(function (k) {
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(k)) return;
      s += ' data-' + k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }) + '="' + esc(datos[k]) + '"';
    });
    return s;
  }

  function limpiarAcciones(acciones) {
    return (Array.isArray(acciones) ? acciones : []).filter(function (a) { return a && (a.t || a.sep); }).map(function (a) {
      var x = { t: String(a.t || '') };
      if (a.i) x.i = String(a.i);
      if (a.a) x.a = String(a.a);
      if (a.d && typeof a.d === 'object') x.d = a.d;
      if (a.h) x.h = String(a.h);
      if (a.p) x.p = 1;
      if (a.sep) x.sep = 1;
      return x;
    });
  }

  // Botón «…» de una fila. o: { acciones, etiqueta (para lectores de pantalla), datos (data-* que reciben las acciones) }
  function botonMenu(o) {
    var acc = limpiarAcciones(o.acciones);
    if (!acc.length) return '';
    return '<button type="button" class="ap-fc__menu" aria-haspopup="menu" aria-expanded="false" aria-label="' + esc(o.etiqueta || 'Acciones') + '"' +
      ' data-menu="' + esc(JSON.stringify(acc)) + '"' + atributosDatos(o.datos) + '>' + ico('ellipsis', { size: 20 }) + '</button>';
  }

  // Las acciones de un botón «…» tal como las lee el menú (para pruebas).
  function accionesDeHTML(html) {
    var m = /data-menu="([^"]*)"/.exec(html || '');
    if (!m) return [];
    var txt = m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    try { return JSON.parse(txt); } catch (e) { return []; }
  }

  /* ───────── Fila compacta ─────────
     o: {
       avatar: HTML ya escapado (círculo con iniciales o ícono),
       titulo: texto (se escapa), etiqueta: texto pequeño junto al título (por ejemplo «Admin»),
       accion: { a, datos, h }  → el título es el botón (o enlace con h) que abre la ficha; tocar cualquier punto de la fila lo activa,
       meta: HTML ya escapado de la línea pequeña, metaChico: HTML que solo se ve cuando la fila es angosta,
       cols: [ { html, ter: true } ]  → columnas de datos (se esconden cuando la fila es angosta),
       estado: HTML ya escapado de insignias,
       acciones + etiqueta + datos: botón «…»; chevron: true si solo hay la acción principal,
       clase, atributos: data-* de la fila
     } */
  function fila(o) {
    var cols = (o.cols || []).map(function (c) { return '<div class="ap-fc__col' + (c.ter ? ' ap-fc__col--ter' : '') + '">' + c.html + '</div>'; }).join('');
    var titulo;
    var t = esc(o.titulo || 'Sin nombre') + (o.etiqueta ? ' <span class="ap-etiqueta">' + esc(o.etiqueta) + '</span>' : '');
    if (o.accion && o.accion.h) {
      titulo = '<a class="ap-fc__titulo" href="' + esc(o.accion.h) + '" target="_blank" rel="noopener">' + t + '</a>';
    } else if (o.accion) {
      titulo = '<button type="button" class="ap-fc__titulo" data-' + (o.accion.attr || 'accion') + '="' + esc(o.accion.a) + '"' + atributosDatos(o.accion.datos) + '>' + t + '</button>';
    } else {
      titulo = '<span class="ap-fc__titulo ap-fc__titulo--texto">' + t + '</span>';
    }
    var menu = botonMenu({ acciones: o.acciones, etiqueta: o.etiquetaMenu || ('Acciones de ' + (o.titulo || 'esta fila')), datos: o.datos });
    var fin = menu || (o.reservarFin ? '<span></span>' : '') || (o.chevron ? '<span class="ap-fc__chevron" aria-hidden="true">' + ico('chevron-right', { size: 18 }) + '</span>' : '');
    var cl = 'ap-fc' + (o.clase ? ' ' + o.clase : '') + (cols ? ' ap-fc--col' : '') + (o.cols && o.cols.length > 1 ? ' ap-fc--col2' : '') + (o.estado != null ? ' ap-fc--est' : '') + (fin ? ' ap-fc--fin' : '') + (o.accion ? ' ap-fc--toca' : '');
    return '<li class="' + cl + '"' + atributosDatos(o.atributos) + '>' +
      '<span class="ap-fc__av">' + (o.avatar || '') + '</span>' +
      titulo +
      '<span class="ap-fc__meta">' + (o.meta || '') + (o.metaChico ? '<span class="ap-fc__chico">' + o.metaChico + '</span>' : '') + '</span>' +
      cols +
      (o.estado != null ? '<div class="ap-fc__estado">' + o.estado + '</div>' : '') +
      (fin ? '<div class="ap-fc__fin">' + fin + '</div>' : '') + '</li>';
  }

  // Lista de filas con su contenedor (el contenedor, no la ventana, decide cuánto se muestra). cab: encabezados de columnas.
  function lista(filas, o) {
    var op = o || {};
    // Encabezados opcionales: op.cab = { principal, cols: [texto], estado }. Toman las mismas columnas que la primera fila.
    var cab = '';
    if (op.cab && filas.length) {
      var modo = (/class="ap-fc ([^"]*)"/.exec(filas[0]) || [0, ''])[1].split(' ').filter(function (c) { return /^ap-fc--(col2?|est|fin)$/.test(c); });
      cab = '<div class="ap-fc-cab ' + modo.join(' ') + '" aria-hidden="true"><span></span><span>' + esc(op.cab.principal || '') + '</span>' +
        (op.cab.cols || []).map(function (c) { return '<span class="ap-fc__col">' + esc(c) + '</span>'; }).join('') +
        (modo.indexOf('ap-fc--est') !== -1 ? '<span class="ap-fc__estado">' + esc(op.cab.estado || '') + '</span>' : '') +
        (modo.indexOf('ap-fc--fin') !== -1 ? '<span></span>' : '') + '</div>';
    }
    return '<div class="ap-fc-zona' + (op.clase ? ' ' + op.clase : '') + '"><div class="ap-fc-caja">' + cab + '<ul class="ap-fc-lista"' + (op.etiqueta ? ' aria-label="' + esc(op.etiqueta) + '"' : '') + '>' + filas.join('') + '</ul></div></div>';
  }

  var API = { esc: esc, botonMenu: botonMenu, accionesDeHTML: accionesDeHTML, fila: fila, lista: lista, atributosDatos: atributosDatos };
  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* MENÚ EN EL NAVEGADOR                                          */
  /* Botón con aria-haspopup, menú role="menu", flechas, Inicio/Fin, */
  /* Esc, Tab, clic afuera, foco devuelto y apertura hacia arriba    */
  /* cuando abajo no cabe.                                         */
  /* ============================================================ */
  var abierto = null;     // { btn, menu }
  var contador = 0;

  function items(menu) { return Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]')); }

  function leerAcciones(btn) {
    try { var a = JSON.parse(btn.getAttribute('data-menu') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }

  function construir(btn, id) {
    var html = '';
    leerAcciones(btn).forEach(function (a) {
      if (a.sep) html += '<div class="ap-menu__sep" role="separator"></div>';
      if (!a.t) return;
      var contenido = (a.i ? ico(a.i, { size: 18 }) : '') + '<span>' + esc(a.t) + '</span>';
      var clase = 'ap-menu__item' + (a.p ? ' ap-menu__item--peligro' : '');
      if (a.h) html += '<a role="menuitem" tabindex="-1" class="' + clase + '" href="' + esc(a.h) + '" target="_blank" rel="noopener">' + contenido + '</a>';
      else html += '<button type="button" role="menuitem" tabindex="-1" class="' + clase + '" data-menu-a="' + esc(a.a || '') + '" data-menu-d="' + esc(JSON.stringify(a.d || {})) + '">' + contenido + '</button>';
    });
    var m = document.createElement('div');
    m.className = 'ap-menu';
    m.id = id;
    m.setAttribute('role', 'menu');
    m.setAttribute('aria-label', btn.getAttribute('aria-label') || 'Acciones');
    m.innerHTML = html;
    return m;
  }

  function colocar(btn, menu) {
    var margen = 8;
    menu.style.visibility = 'hidden';
    menu.style.top = '0px'; menu.style.left = '0px'; menu.style.maxHeight = '';
    var r = btn.getBoundingClientRect();
    var alto = menu.offsetHeight; var ancho = menu.offsetWidth;
    var abajo = window.innerHeight - r.bottom - margen; var arriba = r.top - margen;
    var haciaArriba = abajo < alto && arriba > abajo;
    var espacio = haciaArriba ? arriba - 4 : abajo - 4;
    if (alto > espacio) { menu.style.maxHeight = Math.max(120, espacio) + 'px'; alto = menu.offsetHeight; }
    var top = haciaArriba ? r.top - alto - 4 : r.bottom + 4;
    var left = Math.min(Math.max(margen, r.right - ancho), Math.max(margen, window.innerWidth - ancho - margen));
    menu.style.top = Math.max(margen, top) + 'px';
    menu.style.left = left + 'px';
    menu.setAttribute('data-lado', haciaArriba ? 'arriba' : 'abajo');
    menu.style.visibility = '';
  }

  function cerrar(devolverFoco) {
    if (!abierto) return;
    var a = abierto; abierto = null;
    a.menu.remove();
    a.btn.setAttribute('aria-expanded', 'false');
    a.btn.removeAttribute('aria-controls');
    if (devolverFoco !== false) { try { a.btn.focus(); } catch (e) { /* ya no existe */ } }
  }

  function abrir(btn, ultimo) {
    cerrar(false);
    var id = 'apMenu' + (++contador);
    var menu = construir(btn, id);
    if (!menu.firstChild) return;
    document.body.appendChild(menu);
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-controls', id);
    colocar(btn, menu);
    abierto = { btn: btn, menu: menu };
    var it = items(menu);
    var f = ultimo ? it[it.length - 1] : it[0];
    if (f) f.focus({ preventScroll: true });
  }

  // Lleva la acción elegida al mismo lugar donde la esperan las vistas: un clic sobre un elemento con data-accion dentro de la fila.
  function ejecutar(item) {
    var a = abierto; if (!a) return;
    var btn = a.btn;
    var datos = {};
    Object.keys(btn.dataset).forEach(function (k) { if (k !== 'menu') datos[k] = btn.dataset[k]; });
    var accion = item.getAttribute('data-menu-a');
    var extra = {};
    try { extra = JSON.parse(item.getAttribute('data-menu-d') || '{}'); } catch (e) { extra = {}; }
    cerrar(true);
    var puente = document.createElement('button');
    puente.type = 'button'; puente.hidden = true; puente.tabIndex = -1;
    Object.keys(datos).forEach(function (k) { puente.dataset[k] = datos[k]; });
    Object.keys(extra).forEach(function (k) { puente.dataset[k] = extra[k]; });
    if (accion) puente.dataset.accion = accion;
    (btn.parentNode || document.body).appendChild(puente);
    try { puente.click(); } finally { puente.remove(); }
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    var btn = t.closest ? t.closest('.ap-fc__menu') : null;
    if (btn) {
      ev.preventDefault(); ev.stopPropagation();
      if (abierto && abierto.btn === btn) cerrar(true); else abrir(btn, false);
      return;
    }
    if (!abierto) return;
    var item = t.closest ? t.closest('.ap-menu__item') : null;
    if (item && abierto.menu.contains(item)) {
      if (item.tagName === 'A') { cerrar(true); return; }
      ev.preventDefault(); ejecutar(item);
      return;
    }
    if (!abierto.menu.contains(t)) cerrar(false);
  }, true);

  document.addEventListener('keydown', function (ev) {
    var t = ev.target;
    if (abierto) {
      var it = items(abierto.menu);
      var i = it.indexOf(document.activeElement);
      if (/^(Escape|ArrowDown|ArrowUp|Home|End|Tab)$/.test(ev.key)) ev.stopImmediatePropagation();
      if (ev.key === 'Escape') { ev.preventDefault(); cerrar(true); return; }
      if (ev.key === 'ArrowDown') { ev.preventDefault(); it[(i + 1) % it.length].focus(); return; }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); it[(i <= 0 ? it.length : i) - 1].focus(); return; }
      if (ev.key === 'Home') { ev.preventDefault(); it[0].focus(); return; }
      if (ev.key === 'End') { ev.preventDefault(); it[it.length - 1].focus(); return; }
      if (ev.key === 'Tab') { ev.preventDefault(); cerrar(true); return; }
      if (ev.key.length === 1 && /\S/.test(ev.key)) {
        var letra = ev.key.toLowerCase();
        var orden = it.slice(i + 1).concat(it.slice(0, i + 1));
        var hallado = orden.filter(function (x) { return x.textContent.trim().toLowerCase().indexOf(letra) === 0; })[0];
        if (hallado) hallado.focus();
      }
      return;
    }
    var btn = t.closest ? t.closest('.ap-fc__menu') : null;
    if (btn && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) { ev.preventDefault(); abrir(btn, ev.key === 'ArrowUp'); }
  }, true);

  window.addEventListener('resize', function () { cerrar(false); });
  window.addEventListener('scroll', function (ev) { if (abierto && !(ev.target && ev.target.nodeType === 1 && abierto.menu.contains(ev.target))) cerrar(false); }, true);
  window.addEventListener('blur', function () { cerrar(false); });

  API.cerrarMenu = cerrar;
  return API;
});
