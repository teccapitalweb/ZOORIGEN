/* Portadas de la web pública y las recomendaciones de la encuesta. */
(function () {
  'use strict';
  var covers = [
    [/tiburon|raya/, 'tiburones-rayas'], [/canin|obediencia/, 'entrenamiento-canino'],
    [/etologia/, 'etologia-cautiverio'], [/ponzonosa|toxicologia/, 'fauna-ponzonosa'],
    [/fototrampeo/, 'fototrampeo'], [/entomologia/, 'entomologia-forense'],
    [/legislacion|umas?\b/, 'legislacion-uma'], [/rapaces/, 'aves-rapaces'],
    [/manifiesto|impacto ambiental/, 'impacto-ambiental'], [/mariposario/, 'mariposarios'],
    [/bioindicador/, 'aves-bioindicadoras'], [/felino/, 'felinos-mexico'],
    [/rescate|reubicacion/, 'rescate-reubicacion'], [/ultrasonograf/, 'ultrasonografia'],
    [/vector|zoonosis/, 'vectores-zoonosis']
  ];
  window.ZOORIGEN_COURSE_COVER = function (course) {
    var title = String(course.titulo || course.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (var i = 0; i < covers.length; i++) if (covers[i][0].test(title)) return 'assets/img/cursos/portadas/curso-' + covers[i][1] + '.webp';
    var area = String(course.area || '').toLowerCase();
    var fallback = /ponzo|toxic/.test(area) ? 'toxicologia' : /etolog/.test(area) ? 'etologia' : /apicul|polini/.test(area) ? 'polinizacion' : /investig|monitoreo/.test(area) ? 'monitoreo' : /cautiver|exhibic/.test(area) ? 'manejo' : 'conservacion';
    return 'assets/img/landing/area-' + fallback + '.webp';
  };
})();
