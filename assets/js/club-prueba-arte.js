/* ============================================================ */
/* PRUEBA GRATUITA · abanico de portadas                         */
/*                                                                */
/* Dibuja el "abanico" de tres portadas con la pastilla "Gratis"  */
/* que usan la ventana de bienvenida, la tarjeta de selección de  */
/* Cursos, el aviso y la confirmación de la prueba gratuita (el   */
/* mismo diseño que alintecfood, con color sólido y la marca de   */
/* Zoorigen). Solo construye HTML: se prueba en Node              */
/* (tests/club-prueba-arte.test.js). Estilos: club-prueba.css     */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./club-portadas.js'));
  else root.ZOO_PRUEBA_ARTE = factory(root.ZOO_PORTADAS);
})(typeof self !== 'undefined' ? self : this, function (PORTADAS) {
  'use strict';

  var RUTA = 'assets/img/cursos/portadas/';
  /* Respaldo cuando todavía no se conocen los cursos (por ejemplo en el Inicio): tres portadas reales del catálogo. */
  var PREFERIDAS = ['curso-felinos-mexico', 'curso-fototrampeo', 'curso-aves-rapaces'];
  var TOTAL = 3;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* Solo rutas del propio sitio o https; las comillas, paréntesis y espacios se codifican para no romper el url(...). */
  function urlSegura(u) {
    var t = String(u == null ? '' : u).trim();
    if (!t || /^(javascript|data|vbscript):/i.test(t)) return '';
    if (!/^(https?:\/\/|\.\.\/|\.\/|\/(?!\/))/i.test(t) && /^[a-z][a-z0-9+.-]*:/i.test(t)) return '';
    return t.replace(/['"()\\\s<>]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'); });
  }

  function absoluta(rel) {
    try { if (typeof document !== 'undefined' && document.baseURI) return new URL(rel, document.baseURI).href; } catch (e) { /* se queda relativa */ }
    return rel;
  }

  /* Hasta TOTAL portadas distintas: primero las de los cursos que se pasan (en orden), después las del respaldo.
     o: { cursos: [{ title, ... }], base: '../', portadas: ZOO_PORTADAS (opcional, para pruebas) } */
  function portadas(o) {
    o = o || {};
    var base = typeof o.base === 'string' ? o.base : '../';
    var P = o.portadas || PORTADAS || null;
    var vistas = {};
    var salida = [];
    function agrega(u) {
      var s = urlSegura(u);
      if (!s || vistas[s] || salida.length >= TOTAL) return;
      vistas[s] = true; salida.push(s);
    }
    if (P && typeof P.paraCurso === 'function') {
      (Array.isArray(o.cursos) ? o.cursos : []).forEach(function (c) { agrega(P.paraCurso(c, base, '4x3')); });
    }
    PREFERIDAS.concat(P && typeof P.todas === 'function' ? P.todas() : []).forEach(function (k) {
      agrega(absoluta(base + RUTA + k + '-4x3.webp'));
    });
    return salida;
  }

  /* Abanico con la pastilla. urls: lista de portadas ya seguras (si faltan, se completan con las de respaldo).
     o: { clase: 'zpg-art--mini', etiqueta: 'Gratis', base } */
  function arteHTML(urls, o) {
    o = o || {};
    var lista = (Array.isArray(urls) ? urls : []).map(urlSegura).filter(Boolean).slice(0, TOTAL);
    if (lista.length < TOTAL) {
      portadas({ base: o.base }).forEach(function (u) { if (lista.length < TOTAL && lista.indexOf(u) === -1) lista.push(u); });
    }
    return '<div class="zpg-art' + (o.clase ? ' ' + esc(o.clase) : '') + '" aria-hidden="true">' +
      lista.map(function (u, i) { return '<i class="zpg-cover zpg-cover--' + i + '" style="background-image:url(\'' + u + '\')"></i>'; }).join('') +
      '<span class="zpg-badge">' + esc(o.etiqueta || 'Gratis') + '</span></div>';
  }

  /* Portada grande de la confirmación, con la pastilla en la esquina. */
  function portadaGrandeHTML(url, o) {
    o = o || {};
    var u = urlSegura(url);
    return '<div class="zpg-portada-caja"><div class="zpg-portada' + (u ? '' : ' zpg-portada--vacia') + '"' + (u ? ' style="background-image:url(\'' + u + '\')"' : '') + '></div>' +
      '<span class="zpg-badge zpg-badge--esquina">' + esc(o.etiqueta || 'Gratis') + '</span></div>';
  }

  return { RUTA: RUTA, PREFERIDAS: PREFERIDAS, TOTAL: TOTAL, urlSegura: urlSegura, portadas: portadas, arteHTML: arteHTML, portadaGrandeHTML: portadaGrandeHTML };
});
