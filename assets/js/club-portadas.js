/* ============================================================ */
/* PORTADAS DE LOS CURSOS · Club VIP Zoorigen                    */
/* Las portadas nuevas (sin texto) reemplazan a los volantes de  */
/* promoción que antes se usaban como imagen del curso.          */
/* Se reconocen por el título del curso (no hace falta tocar los */
/* datos en Firestore). Si un curso no coincide, conserva su     */
/* imagen de siempre.                                            */
/*   ZOO_PORTADAS.paraCurso(curso, base, variante) -> ruta | ''  */
/*   variante: '16x9' (por defecto) o '4x3'                      */
/*                                                               */
/* Jerarquía de la portada de un curso (todas las pantallas):    */
/*   1. la que el administrador fijó en el curso (portadaPropia) */
/*   2. la que le toca por su título (los 15 cursos actuales)    */
/*   3. la imagen que el curso ya traía (campo image)            */
/*   4. la portada por defecto de la marca (sin texto)           */
/*   ZOO_PORTADAS.resolver(curso, base, variante) -> ruta (nunca vacía) */
/*   ZOO_PORTADAS.origenDe(curso) -> 'propia' | 'titulo' | 'defecto'    */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_PORTADAS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RUTA = 'assets/img/cursos/portadas/';

  /* Orden importa: lo más específico primero (p. ej. "Rescate... en Proyectos de Impacto Ambiental"
     debe ganar a "Impacto ambiental"). Las expresiones se aplican al título sin acentos. */
  var REGLAS = [
    [/rescate|reubicaci/, 'curso-rescate-reubicacion'],
    [/ultrason|diagnostico por imagen/, 'curso-ultrasonografia'],
    [/bioindicador/, 'curso-aves-bioindicadoras'],
    [/rapaces/, 'curso-aves-rapaces'],
    [/fototramp/, 'curso-fototrampeo'],
    [/felino/, 'curso-felinos-mexico'],
    [/mariposar/, 'curso-mariposarios'],
    [/entomolog/, 'curso-entomologia-forense'],
    [/etolog/, 'curso-etologia-cautiverio'],
    [/ponzon/, 'curso-fauna-ponzonosa'],
    [/tiburon|\brayas?\b/, 'curso-tiburones-rayas'],
    [/canin|entrenamiento/, 'curso-entrenamiento-canino'],
    [/legislaci|\bumas?\b|zoologico/, 'curso-legislacion-uma'],
    [/impacto ambiental|manifiesto/, 'curso-impacto-ambiental'],
    [/vector|zoonosis/, 'curso-vectores-zoonosis']
  ];

  function normalizar(t) {
    return String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }

  /* Nombre de archivo (sin extensión) de la portada que le toca al curso, o ''. */
  function claveDe(curso) {
    if (!curso || typeof curso !== 'object') return '';
    var titulo = normalizar(curso.title || curso.titulo || '');
    if (!titulo) return '';
    for (var i = 0; i < REGLAS.length; i++) if (REGLAS[i][0].test(titulo)) return REGLAS[i][1];
    return '';
  }

  /* Ruta lista para <img src>. base: prefijo desde la página ('../' en pages/). */
  function paraCurso(curso, base, variante) {
    if (curso && curso.portadaPropia === true) return '';
    var clave = claveDe(curso);
    if (!clave) return '';
    var sufijo = variante === '4x3' ? '-4x3' : '';
    var rel = (typeof base === 'string' ? base : '../') + RUTA + clave + sufijo + '.webp';
    /* En el navegador se devuelve la dirección completa: una variable CSS con url() relativa se resuelve
       desde la hoja de estilos (no desde la página) y la imagen no cargaría. */
    try {
      if (typeof document !== 'undefined' && document.baseURI) return new URL(rel, document.baseURI).href;
    } catch (e) { /* se queda con la ruta relativa */ }
    return rel;
  }

  function todas() { return REGLAS.map(function (r) { return r[1]; }); }

  /* Portada por defecto de la marca: un solo archivo vectorial que sirve para 16x9 y 4x3 (se recorta con cover). */
  var DEFECTO = 'curso-por-defecto.svg';

  function absoluta(rel) {
    try {
      if (typeof document !== 'undefined' && document.baseURI) return new URL(rel, document.baseURI).href;
    } catch (e) { /* se queda con la ruta relativa */ }
    return rel;
  }

  function defecto(base) {
    return absoluta((typeof base === 'string' ? base : '../') + RUTA + DEFECTO);
  }

  /* Imagen que el curso trae en su campo image: https o ruta del propio sitio (assets/...). Nunca javascript: ni data:. */
  function imagenPropia(valor, base) {
    var s = String(valor == null ? '' : valor).trim();
    if (!s || s.length > 2000 || /drive\.google\.com/i.test(s)) return '';
    if (/^https:\/\/[^\s"'<>()\\]+$/i.test(s)) return s;
    if (/^(\.\.\/)?assets\/[A-Za-z0-9_\/.\-]+$/.test(s)) {
      return absoluta((typeof base === 'string' ? base : '../') + s.replace(/^\.\.\//, ''));
    }
    return '';
  }

  function propia(curso, base) {
    return curso && typeof curso === 'object' ? imagenPropia(curso.image, base) : '';
  }

  /* Portada final: propia fijada > título > imagen que ya traía > por defecto. Nunca devuelve vacío. */
  function resolver(curso, base, variante) {
    return paraCurso(curso, base, variante) || propia(curso, base) || defecto(base);
  }

  /* De dónde sale la portada: 'propia' (la fijó el administrador o el curso ya la traía), 'titulo' o 'defecto'. */
  function origenDe(curso) {
    var fijada = Boolean(curso && curso.portadaPropia === true);
    if (fijada && propia(curso, '../')) return 'propia';
    if (!fijada && claveDe(curso)) return 'titulo';
    if (propia(curso, '../')) return 'propia';
    return 'defecto';
  }

  return {
    paraCurso: paraCurso, claveDe: claveDe, todas: todas, RUTA: RUTA, normalizar: normalizar,
    DEFECTO: DEFECTO, defecto: defecto, propia: propia, imagenPropia: imagenPropia, resolver: resolver, origenDe: origenDe
  };
});
