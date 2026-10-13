/* ============================================================ */
/* CLUB VIP ZOORIGEN · TARJETA DE TÍTULO DE SECCIÓN              */
/* Un solo componente para el encabezado de TODOS los apartados: */
/* píldora con ícono, título con la parte final en acento,       */
/* subtítulo, cifras y segmentos/acciones a la derecha.          */
/* html() es puro y se prueba en Node; montar() corre en el      */
/* navegador. Estilos: assets/css/club-seccion.css               */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_SECCION = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function ico(nombre) {
    return nombre ? '<svg class="zi" aria-hidden="true"><use href="#zi-' + esc(nombre) + '"/></svg>' : '';
  }
  function idSeguro(v) { return String(v == null ? '' : v).replace(/[^\w-]/g, ''); }

  /* cfg: { id, seccion, icono, eyebrow, titulo, acento, sub, cifras:[{id, clave, valor, rotulo}],
            segmentos:{ etiqueta, activo, opciones:[{id, etiqueta}] }, acciones:[{href, id, etiqueta, icono, tono}] } */
  function html(cfg) {
    cfg = cfg || {};
    var titulo = esc(cfg.titulo || '');
    var acento = cfg.acento ? '<span class="zs-acento">' + esc(cfg.acento) + '</span>' : '';
    var h = '<header class="zs-seccion"' + (cfg.id ? ' id="' + idSeguro(cfg.id) + '"' : '') + ' data-seccion="' + idSeguro(cfg.seccion || cfg.id || '') + '">' +
      '<div class="zs-seccion__cuerpo"><div class="zs-seccion__texto">' +
      (cfg.eyebrow ? '<span class="zs-seccion__pildora">' + ico(cfg.icono) + '<span>' + esc(cfg.eyebrow) + '</span></span>' : '') +
      '<h1 class="zs-seccion__titulo">' + titulo + (titulo && acento ? ' ' : '') + acento + '</h1>' +
      (cfg.sub ? '<p class="zs-seccion__sub">' + esc(cfg.sub) + '</p>' : '') +
      '</div>';
    var lado = '';
    var seg = cfg.segmentos;
    if (seg && Array.isArray(seg.opciones) && seg.opciones.length) {
      lado += '<div class="zs-segmentos" role="group" aria-label="' + esc(seg.etiqueta || 'Filtrar') + '">' + seg.opciones.map(function (o) {
        return '<button type="button" class="zs-segmento" data-segmento="' + esc(o.id) + '" aria-pressed="' + (o.id === seg.activo ? 'true' : 'false') + '">' + esc(o.etiqueta) + '</button>';
      }).join('') + '</div>';
    }
    (cfg.acciones || []).forEach(function (a) {
      var clase = 'zs-seccion__btn' + (a.tono === 'oro' ? ' zs-seccion__btn--oro' : '');
      var idA = a.id ? ' id="' + idSeguro(a.id) + '"' : '';
      lado += a.href
        ? '<a class="' + clase + '"' + idA + ' href="' + esc(a.href) + '"' + (a.externo ? ' target="_blank" rel="noopener"' : '') + '>' + ico(a.icono) + esc(a.etiqueta) + '</a>'
        : '<button type="button" class="' + clase + '"' + idA + '>' + ico(a.icono) + esc(a.etiqueta) + '</button>';
    });
    if (lado) h += '<div class="zs-seccion__lado">' + lado + '</div>';
    h += '</div>';
    var cifras = Array.isArray(cfg.cifras) ? cfg.cifras : [];
    if (cifras.length) {
      h += '<div class="zs-seccion__cifras" role="list">' + cifras.map(function (c) {
        return '<div class="zs-cifra" role="listitem"><strong class="zs-cifra__v"' + (c.id ? ' id="' + idSeguro(c.id) + '"' : '') +
          ' data-cifra="' + idSeguro(c.clave || c.id || '') + '">' + esc(c.valor == null ? '—' : c.valor) + '</strong>' +
          '<span class="zs-cifra__r">' + esc(c.rotulo || '') + '</span></div>';
      }).join('') + '</div>';
    }
    return h + '</header>';
  }

  /* Bloque "Próximamente" (sin cuenta regresiva ni enlaces). */
  function prontoHTML(o) {
    o = o || {};
    return '<section class="zs-pronto" aria-live="polite"><span class="zs-pronto__ico">' + ico(o.icono || 'radio') + '</span>' +
      '<span class="zs-pronto__chip">Próximamente</span>' +
      '<h2 class="zs-pronto__titulo">' + esc(o.titulo || 'Muy pronto tendrás clases en vivo') + '</h2>' +
      '<p class="zs-pronto__texto">' + esc(o.texto || 'Estamos preparando las transmisiones en vivo con especialistas. Cuando estén listas aparecerán aquí.') + '</p></section>';
  }

  var API = { esc: esc, html: html, prontoHTML: prontoHTML };
  if (typeof document === 'undefined') return API;

  /* destino: selector o elemento; reemplaza su contenido y devuelve la tarjeta */
  API.montar = function (destino, cfg) {
    var el = typeof destino === 'string' ? document.querySelector(destino) : destino;
    if (!el) return null;
    el.innerHTML = html(cfg);
    return el.firstElementChild;
  };

  /* Actualiza cifras por su clave (data-cifra) o por id: { cursos: 13, clases: 51 } */
  API.cifras = function (valores, raiz) {
    var base = raiz || document;
    Object.keys(valores || {}).forEach(function (k) {
      var n = base.querySelector('[data-cifra="' + idSeguro(k) + '"]') || base.querySelector('#' + idSeguro(k));
      if (n) n.textContent = String(valores[k]);
    });
  };

  /* Conecta el control segmentado: alCambiar(idOpcion). Devuelve { fijar(id) }. */
  API.segmentos = function (alCambiar, raiz) {
    var base = raiz || document;
    var cont = base.querySelector('.zs-segmentos');
    if (!cont) return { fijar: function () {} };
    function fijar(id, avisar) {
      Array.prototype.forEach.call(cont.querySelectorAll('.zs-segmento'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-segmento') === id ? 'true' : 'false');
      });
      if (avisar && typeof alCambiar === 'function') alCambiar(id);
    }
    cont.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.zs-segmento');
      if (b) fijar(b.getAttribute('data-segmento'), true);
    });
    return { fijar: function (id) { fijar(id, false); } };
  };

  return API;
});
