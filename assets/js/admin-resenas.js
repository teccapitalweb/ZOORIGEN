/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · RESEÑAS DE CURSOS                   */
/* Lo que opinan las personas de los cursos que terminaron:      */
/* estrellas de 1 a 5 y, si quisieron, un comentario. Aquí se ve: */
/*   1. cifras: calificación promedio, reseñas, con comentario y  */
/*      cursos calificados                                        */
/*   2. gráfica de cursos coloreada por grupo (Excelentes,        */
/*      Mejor calificados, Por mejorar y «Pocas reseñas todavía») */
/*   3. los cursos de cada grupo con su promedio                  */
/*   4. cuántas reseñas hay de 1, 2, 3, 4 y 5 estrellas           */
/*   5. los comentarios, con filtros por curso, estrellas y       */
/*      «Solo con comentario»                                     */
/* Datos: GET /api/admin/resenas (solo la administración las lee; */
/* no se publican en ningún lado). Los constructores de HTML son  */
/* puros y se prueban en tests/admin-resenas.test.js.             */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'), require('./admin-iconos.js'), null);
  else root.ZOO_ADMIN_RESENAS = factory(root.ZOO_ADMIN_PANEL, root.ZOO_ICONOS, root.ZOO_ADMIN_VISTAS);
})(typeof self !== 'undefined' ? self : this, function (P, I, V) {
  'use strict';

  var esc = P.esc;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };
  var num = P.fmtNum;

  var MIN_RESENAS = 3;          // un curso necesita al menos 3 reseñas para clasificarse
  var LIMITE_EXCELENTE = 4.5;   // 4.5 estrellas o más
  var LIMITE_BUENO = 3.5;       // de 3.5 a 4.4
  var POR_PAGINA = 30;

  var GRUPOS = {
    excelentes: { nombre: 'Excelentes', rango: '4.5 estrellas o más', clase: 'ok', icono: 'trophy' },
    buenos: { nombre: 'Mejor calificados', rango: 'de 3.5 a 4.4 estrellas', clase: 'info', icono: 'circle-check' },
    mejorar: { nombre: 'Por mejorar', rango: 'menos de 3.5 estrellas', clase: 'bad', icono: 'triangle-alert' },
    pocas: { nombre: 'Pocas reseñas todavía', rango: 'menos de 3 reseñas', clase: 'idle', icono: 'hourglass' }
  };
  var ORDEN_GRUPOS = ['excelentes', 'buenos', 'mejorar'];

  function card(titulo, cuerpo, nota, id) {
    return '<section class="ap-card"' + (id ? ' id="' + esc(id) + '"' : '') + '><header class="ap-card__cab"><h2>' + esc(titulo) + '</h2>' + (nota ? '<p>' + esc(nota) + '</p>' : '') +
      '</header><div class="ap-card__cuerpo">' + cuerpo + '</div></section>';
  }
  function vacio(titulo, texto, icono) {
    return '<div class="zs-vacio ap-vacio">' + ico(icono || 'search-x', { size: 28 }) + '<strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></div>';
  }

  /* Un decimal, con punto (4.5), y sin «5.0» de más: 4 -> 4.0 para que todas las cifras se vean igual */
  function dos(n) { return (Math.round((Number(n) || 0) * 10) / 10).toFixed(1); }
  function entero(n) { var v = Math.round(Number(n)); return v >= 1 && v <= 5 ? v : 0; }

  /* Clasificación de un curso. Se usa el promedio ya redondeado a un decimal para que lo que se lee coincida con el grupo. */
  function grupoDe(prom, n) {
    if (!(n >= MIN_RESENAS)) return 'pocas';
    var p = Math.round((Number(prom) || 0) * 10) / 10;
    return p >= LIMITE_EXCELENTE ? 'excelentes' : p >= LIMITE_BUENO ? 'buenos' : 'mejorar';
  }

  /* Un renglón por curso: { id, titulo, n, prom, grupo }, del mejor promedio al peor (a igual promedio, el que tiene más reseñas primero) */
  function resumirCursos(todas) {
    var por = {};
    (Array.isArray(todas) ? todas : []).forEach(function (r) {
      if (!r || !r.cursoId) return;
      var c = por[r.cursoId] = por[r.cursoId] || { id: r.cursoId, titulo: r.curso || r.cursoId, suma: 0, n: 0 };
      c.suma += entero(r.estrellas); c.n += 1;
      if (r.curso) c.titulo = r.curso;
    });
    return Object.keys(por).map(function (k) {
      var c = por[k], prom = c.n ? c.suma / c.n : 0;
      return { id: c.id, titulo: c.titulo, n: c.n, prom: prom, grupo: grupoDe(prom, c.n) };
    }).sort(function (a, b) { return b.prom - a.prom || b.n - a.n || String(a.titulo).localeCompare(String(b.titulo), 'es'); });
  }

  function tieneComentario(r) { return !!String((r && r.comentario) || '').trim(); }

  /* Las cifras de arriba (nada inventado: sin reseñas, guiones y ceros) */
  function cifras(todas) {
    var lista = (Array.isArray(todas) ? todas : []).filter(function (r) { return entero(r.estrellas); });
    var total = lista.length;
    var suma = lista.reduce(function (t, r) { return t + entero(r.estrellas); }, 0);
    var cursos = resumirCursos(lista);
    return [
      { valor: total ? dos(suma / total) : '—', rotulo: 'calificación promedio' },
      { valor: num(total), rotulo: total === 1 ? 'reseña recibida' : 'reseñas recibidas' },
      { valor: num(lista.filter(tieneComentario).length), rotulo: 'con comentario' },
      { valor: num(cursos.length), rotulo: cursos.length === 1 ? 'curso calificado' : 'cursos calificados' }
    ];
  }

  /* Estrellas dibujadas (íconos, no texto): las que faltan salen apagadas */
  function estrellasHTML(n) {
    var k = entero(n), s = '';
    for (var i = 1; i <= 5; i++) s += '<span class="rs-estrella' + (i <= k ? ' rs-estrella--on' : '') + '">' + ico('star', { size: 15 }) + '</span>';
    return '<span class="rs-estrellas" role="img" aria-label="' + k + ' de 5 estrellas">' + s + '</span>';
  }

  /* ───────────────────────── Gráfica de cursos, por grupo ───────────────────────── */
  function leyendaHTML() {
    return '<ul class="rs-leyenda" aria-label="Grupos de cursos">' + ORDEN_GRUPOS.concat(['pocas']).map(function (k) {
      return '<li class="rs-chip rs-chip--' + GRUPOS[k].clase + '"><i aria-hidden="true"></i>' + esc(GRUPOS[k].nombre) + ' · ' + esc(GRUPOS[k].rango) + '</li>';
    }).join('') + '</ul>';
  }

  function graficaHTML(cursos) {
    if (!cursos.length) return vacio('Todavía no hay reseñas', 'Aparecerán cuando alguien termine un curso y lo califique.', 'star');
    return leyendaHTML() + '<ol class="rs-bh" aria-label="Calificación promedio de cada curso">' + cursos.map(function (c) {
      var ancho = Math.max(2, Math.round(c.prom / 5 * 1000) / 10);
      return '<li class="rs-bh__fila rs-g--' + GRUPOS[c.grupo].clase + '"><span class="rs-bh__t">' + esc(c.titulo) + '<small>' + esc(GRUPOS[c.grupo].nombre) + '</small></span>' +
        '<span class="rs-bh__n"><strong>' + dos(c.prom) + '</strong><span>' + num(c.n) + (c.n === 1 ? ' reseña' : ' reseñas') + '</span></span>' +
        '<span class="rs-bh__b" aria-hidden="true"><i style="width:' + ancho + '%"></i></span></li>';
    }).join('') + '</ol>';
  }

  /* «Cómo leerlo»: una frase con lo más importante */
  function fraseGrafica(cursos) {
    if (!cursos.length) return '';
    var clasif = cursos.filter(function (c) { return c.grupo !== 'pocas'; });
    var mejorar = cursos.filter(function (c) { return c.grupo === 'mejorar'; });
    var texto = '';
    if (clasif.length) {
      var a = clasif[0];
      texto = 'El mejor calificado es «' + a.titulo + '» con ' + dos(a.prom) + ' estrellas (' + a.n + (a.n === 1 ? ' reseña' : ' reseñas') + ').';
      if (mejorar.length) texto += ' ' + (mejorar.length === 1 ? 'Hay 1 curso por mejorar' : 'Hay ' + mejorar.length + ' cursos por mejorar') + ': conviene leer sus comentarios.';
    } else {
      texto = 'Todavía ningún curso llega a ' + MIN_RESENAS + ' reseñas, así que aún no se clasifican: una sola opinión no basta para juzgar un curso.';
    }
    return texto;
  }

  /* Los tres grupos, cada uno con sus cursos y su promedio */
  function gruposHTML(cursos) {
    if (!cursos.length) return '';
    var cajas = ORDEN_GRUPOS.map(function (k) {
      var lista = cursos.filter(function (c) { return c.grupo === k; });
      var g = GRUPOS[k];
      return '<div class="rs-grupo rs-g--' + g.clase + '"><h3><i aria-hidden="true"></i>' + esc(g.nombre) + ' (' + lista.length + ')</h3><small>' + esc(g.rango) + '</small>' +
        (lista.length ? '<ul>' + lista.map(function (c) { return '<li><span>' + esc(c.titulo) + '</span><strong>' + dos(c.prom) + ' · ' + c.n + '</strong></li>'; }).join('') + '</ul>'
          : '<p class="rs-vacio">Ningún curso por ahora.</p>') + '</div>';
    }).join('');
    var pocas = cursos.filter(function (c) { return c.grupo === 'pocas'; });
    var nota = pocas.length ? '<p class="rs-nota"><strong>' + esc(GRUPOS.pocas.nombre) + ' (' + pocas.length + '):</strong> ' +
      pocas.map(function (c) { return esc(c.titulo) + ' (' + dos(c.prom) + ', ' + c.n + (c.n === 1 ? ' reseña' : ' reseñas') + ')'; }).join(' · ') + '.</p>' : '';
    return '<div class="rs-grupos">' + cajas + '</div>' + nota;
  }

  /* ───────────────────────── Estrellas recibidas ───────────────────────── */
  function distribucionHTML(todas) {
    var lista = (Array.isArray(todas) ? todas : []).filter(function (r) { return entero(r.estrellas); });
    var total = lista.length;
    if (!total) return '<p class="rs-vacio">Todavía no hay reseñas.</p>';
    return '<ul class="rs-dist" aria-label="Reseñas por cantidad de estrellas">' + [5, 4, 3, 2, 1].map(function (n) {
      var k = lista.filter(function (r) { return entero(r.estrellas) === n; }).length;
      var pct = Math.round(k / total * 100);
      return '<li><b>' + n + (n === 1 ? ' estrella' : ' estrellas') + '</b><span class="rs-dist__b" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="rs-dist__n">' + num(k) + ' · ' + pct + ' %</span></li>';
    }).join('') + '</ul>';
  }

  /* ───────────────────────── Comentarios con filtros ───────────────────────── */
  function filtrar(todas, f) {
    var x = f || {};
    return (Array.isArray(todas) ? todas : []).filter(function (r) {
      return (!x.curso || r.cursoId === x.curso) && (!x.estrellas || String(entero(r.estrellas)) === String(x.estrellas)) && (!x.soloComentario || tieneComentario(r));
    });
  }

  function fechaDe(r) {
    var ms = Number(r.actualizadaMs || r.creadaMs) || 0;
    return ms ? P.fmtFechaHora(new Date(ms).toISOString()) : '';
  }

  function filaHTML(r) {
    var quien = r.nombre || String(r.email || '').split('@')[0] || 'Persona';
    var com = String(r.comentario || '').trim();
    return '<li class="rs-fila"><div class="rs-fila__cab"><span class="rs-fila__quien"><strong>' + esc(quien) + '</strong>' + estrellasHTML(r.estrellas) + '</span><span class="rs-fila__fecha">' + esc(fechaDe(r)) + '</span></div>' +
      '<p class="rs-fila__curso">' + esc(r.curso || r.cursoId) + (r.email ? ' · <span class="ap-correo">' + esc(r.email) + '</span>' : '') + '</p>' +
      (com ? '<p class="rs-fila__txt">' + esc(com) + '</p>' : '<p class="rs-fila__sin">Solo calificó, sin comentario.</p>') + '</li>';
  }

  function listaHTML(todas, f, visibles) {
    var vistas = filtrar(todas, f);
    var total = (Array.isArray(todas) ? todas : []).length;
    if (!vistas.length) return vacio(total ? 'Ninguna reseña coincide con los filtros' : 'Todavía no hay reseñas', total ? 'Cambia el curso, las estrellas o quita «Solo con comentario».' : 'Llegan cuando alguien termina un curso y lo califica.', 'star');
    var mostrar = vistas.slice(0, visibles || POR_PAGINA);
    return '<ul class="rs-lista" aria-label="Reseñas, de la más reciente a la más antigua">' + mostrar.map(filaHTML).join('') + '</ul>' +
      '<p class="ap-pie-tabla" role="status">Mostrando ' + num(mostrar.length) + ' de ' + num(vistas.length) + '</p>' +
      (vistas.length > mostrar.length ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="mas-resenas">Mostrar ' + Math.min(POR_PAGINA, vistas.length - mostrar.length) + ' más</button>' : '');
  }

  function controlesHTML(todas, f) {
    var x = f || {};
    var cursos = resumirCursos(todas).sort(function (a, b) { return String(a.titulo).localeCompare(String(b.titulo), 'es'); });
    return '<div class="ap-controles rs-filtros">' +
      '<label class="ap-orden"><span class="sr-only">Filtrar por curso</span><select id="rsFiltroCurso"><option value="">Todos los cursos</option>' +
      cursos.map(function (c) { return '<option value="' + esc(c.id) + '"' + (x.curso === c.id ? ' selected' : '') + '>' + esc(c.titulo) + ' (' + c.n + ')</option>'; }).join('') + '</select></label>' +
      '<label class="ap-orden"><span class="sr-only">Filtrar por estrellas</span><select id="rsFiltroEstrellas"><option value="">Todas las estrellas</option>' +
      [5, 4, 3, 2, 1].map(function (n) { return '<option value="' + n + '"' + (String(x.estrellas) === String(n) ? ' selected' : '') + '>' + n + (n === 1 ? ' estrella' : ' estrellas') + '</option>'; }).join('') + '</select></label>' +
      '<label class="rs-solo"><input type="checkbox" id="rsSoloComentario"' + (x.soloComentario ? ' checked' : '') + '><span>Solo con comentario</span></label></div>';
  }

  /* ───────────────────────── Pantalla completa ───────────────────────── */
  function vistaHTML(todas, ui) {
    var lista = Array.isArray(todas) ? todas : [];
    var u = ui || {};
    var cursos = resumirCursos(lista);
    var frase = fraseGrafica(cursos);
    var titulo = P.tarjetaTitulo({
      icono: 'star', eyebrow: 'Panel de administración', titulo: 'Reseñas', acento: 'de los cursos.',
      sub: 'Lo que opinan las personas de los cursos que terminaron: estrellas de 1 a 5 y, si quisieron, un comentario. Solo tú las ves; no se publican en ningún lado.',
      cifras: cifras(lista), acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    });
    return titulo +
      card('¿Cómo califican tus cursos?', graficaHTML(cursos) + (frase ? '<p class="ap-frase" role="note"><strong>Cómo leerlo:</strong> ' + esc(frase) + '</p>' : '') + gruposHTML(cursos),
        'Calificación promedio de cada curso. Un curso necesita al menos ' + MIN_RESENAS + ' reseñas para clasificarse.', 'rsGrafica') +
      card('Estrellas recibidas', distribucionHTML(lista), 'Cuántas reseñas hay de cada calificación.', 'rsDistribucion') +
      card('Comentarios y calificaciones (' + num(lista.length) + ')', controlesHTML(lista, u) + '<div id="rsLista">' + listaHTML(lista, u, u.visibles) + '</div>',
        'De la más reciente a la más antigua, con el nombre y el correo de quien opinó.', 'rsComentarios');
  }

  /* ───────────────────────── Controlador (solo en el navegador) ───────────────────────── */
  var est = { todas: [], curso: '', estrellas: '', soloComentario: false, visibles: POR_PAGINA };

  function pintarLista() {
    var cont = document.getElementById('rsLista');
    if (cont) cont.innerHTML = listaHTML(est.todas, est, est.visibles);
  }

  function pintar() {
    var u = V.util; var v = u.vista();
    v.innerHTML = vistaHTML(est.todas, est);
    v.onchange = function (ev) {
      var t = ev.target;
      if (!t || !t.id) return;
      if (t.id === 'rsFiltroCurso') est.curso = t.value;
      else if (t.id === 'rsFiltroEstrellas') est.estrellas = t.value;
      else if (t.id === 'rsSoloComentario') est.soloComentario = !!t.checked;
      else return;
      est.visibles = POR_PAGINA;
      pintarLista();
    };
    v.onclick = function (ev) {
      u.acciones(ev, {
        recargar: function () { cargar(); },
        'mas-resenas': function () { est.visibles += POR_PAGINA; pintarLista(); }
      });
    };
  }

  async function cargar() {
    var u = V.util; var ctx = u.contexto(); var mi = u.nuevoContador();
    u.vista().innerHTML = u.cargando('Reseñas');
    var r;
    try {
      r = await ctx.api('/api/admin/resenas?limite=2000');
    } catch (e) {
      if (mi !== u.contadorActual()) return;
      u.vista().innerHTML = u.errorHTML('Reseñas', e, 'recargar');
      u.vista().onclick = function (ev) { u.acciones(ev, { recargar: function () { cargar(); } }); };
      return;
    }
    if (mi !== u.contadorActual()) return;
    est.todas = Array.isArray(r && r.resenas) ? r.resenas : [];
    est.curso = ''; est.estrellas = ''; est.soloComentario = false; est.visibles = POR_PAGINA;
    pintar();
  }

  return {
    MIN_RESENAS: MIN_RESENAS, LIMITE_EXCELENTE: LIMITE_EXCELENTE, LIMITE_BUENO: LIMITE_BUENO, GRUPOS: GRUPOS,
    grupoDe: grupoDe, resumirCursos: resumirCursos, cifras: cifras, estrellasHTML: estrellasHTML, graficaHTML: graficaHTML, fraseGrafica: fraseGrafica,
    gruposHTML: gruposHTML, distribucionHTML: distribucionHTML, filtrar: filtrar, filaHTML: filaHTML, listaHTML: listaHTML, controlesHTML: controlesHTML,
    vistaHTML: vistaHTML, resenas: cargar
  };
});
