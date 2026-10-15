/* ============================================================ */
/* MARIPOSAS MONARCA · fondo del pie de página                   */
/* Dibujo propio en SVG (sin imágenes). Crea la capa decorativa   */
/* dentro de .zs-pie y la pausa cuando el pie no se ve.           */
/* ============================================================ */
(function () {
  'use strict';
  var pie = document.getElementById('pie');
  if (!pie || pie.querySelector('.zs-mariposas')) return;

  /* Ala derecha (la izquierda es el mismo dibujo reflejado). Naranja liso con venas oscuras y puntos claros. */
  var ALA =
    '<path style="fill:var(--c,#F28C28);stroke:#1A1209;stroke-width:2.2;stroke-linejoin:round" d="M52 40 C58 12 86 2 96 14 C101 27 86 41 70 46 C62 48 56 46 52 42 Z"/>' +
    '<path style="fill:var(--c,#F28C28);stroke:#1A1209;stroke-width:2.2;stroke-linejoin:round" d="M52 42 C62 47 75 52 76 62 C76 72 62 74 56 66 C52 60 51 50 52 42 Z"/>' +
    '<path style="fill:none;stroke:#1A1209;stroke-width:1.6;stroke-linecap:round" d="M53 40 L90 13 M54 42 L94 24 M54 44 L82 41 M54 46 L70 62 M53 50 L62 68"/>' +
    '<circle style="fill:#FFFFFF" cx="90" cy="9" r="1.7"/><circle style="fill:#FFFFFF" cx="96" cy="19" r="1.6"/>' +
    '<circle style="fill:#FFFFFF" cx="89" cy="24" r="1.5"/><circle style="fill:#FFFFFF" cx="74" cy="66" r="1.5"/>' +
    '<circle style="fill:#FFFFFF" cx="66" cy="71" r="1.4"/>';

  var SIMBOLO =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
      '<symbol id="zs-monarca-ala" viewBox="0 0 100 80">' + ALA + '</symbol>' +
      '<symbol id="zs-monarca" viewBox="0 0 100 80">' +
        '<g class="ala"><use href="#zs-monarca-ala"/></g>' +
        '<g transform="translate(100 0) scale(-1 1)"><g class="ala"><use href="#zs-monarca-ala"/></g></g>' +
        '<ellipse style="fill:#1A1209" cx="50" cy="44" rx="2.4" ry="15"/><circle style="fill:#1A1209" cx="50" cy="28" r="3"/>' +
        '<path style="fill:none;stroke:#1A1209;stroke-width:1.2;stroke-linecap:round" d="M49 26 C46 20 42 17 40 16 M51 26 C54 20 58 17 60 16"/>' +
      '</symbol>' +
    '</defs></svg>';

  /* [arriba %, ancho px, duración s, retraso s, onda s, aleteo s, color, hacia la izquierda, opacidad, posición quieta %] */
  var LISTA = [
    [12, 84, 34, -4, 6.0, 0.55, '#FF8A1F', 0, 1, 12],
    [60, 60, 28, -19, 5.0, 0.48, '#F97316', 1, 0.95, 70],
    [32, 48, 40, -27, 7.0, 0.60, '#FFA43A', 0, 0.9, 38],
    [74, 72, 36, -11, 5.5, 0.52, '#FF8A1F', 1, 1, 86],
    [6,  44, 31, -22, 6.5, 0.46, '#FFA43A', 1, 0.85, 55],
    [50, 54, 44, -33, 7.5, 0.58, '#F97316', 0, 0.9, 24],
    [86, 42, 38, -8,  5.8, 0.50, '#FF8A1F', 0, 0.85, 93]
  ];

  var html = SIMBOLO;
  LISTA.forEach(function (m) {
    html += '<span class="zs-monarca' + (m[7] ? ' zs-monarca--izq' : '') + '" style="' +
      '--y:' + m[0] + '%;--w:' + m[1] + 'px;--w-base:' + m[1] + 'px;--dur:' + m[2] + 's;--delay:' + m[3] + 's;--onda:' + m[4] + 's;--aleteo:' + m[5] + 's;' +
      '--c:' + m[6] + ';--o:' + m[8] + ';--x0:' + m[9] + '%;--giro:' + (m[7] ? -8 : 8) + 'deg">' +
      '<span class="zs-monarca__onda"><svg viewBox="0 0 100 80" aria-hidden="true" focusable="false"><use href="#zs-monarca"/></svg></span></span>';
  });

  var capa = document.createElement('div');
  capa.className = 'zs-mariposas';
  capa.setAttribute('aria-hidden', 'true');
  capa.innerHTML = html;
  pie.insertBefore(capa, pie.firstChild);

  /* Pausa cuando el pie no está a la vista */
  if ('IntersectionObserver' in window) {
    pie.classList.add('is-fuera');
    new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { pie.classList.toggle('is-fuera', !e.isIntersecting); });
    }, { threshold: 0 }).observe(pie);
  }
})();
