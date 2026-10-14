/* ============================================================ */
/* PORTADAS DE LOS CURSOS · Club VIP Zoorigen                    */
/* Las portadas nuevas (sin texto) reemplazan a los volantes de  */
/* promoción que antes se usaban como imagen del curso.          */
/* Se reconocen por el título del curso (no hace falta tocar los */
/* datos en Firestore). Si un curso no coincide, conserva su     */
/* imagen de siempre.                                            */
/*   ZOO_PORTADAS.paraCurso(curso, base, variante) -> ruta | ''  */
/*   variante: '16x9' (por defecto) o '4x3'                      */
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

  return { paraCurso: paraCurso, claveDe: claveDe, todas: todas, RUTA: RUTA, normalizar: normalizar };
});
