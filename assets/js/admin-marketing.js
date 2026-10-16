/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · MARKETING                            */
/* Métricas (GET /api/admin/metricas) y Pruebas gratuitas         */
/* (GET /api/admin/pruebas). Todo se calcula en el servidor con   */
/* datos que ya existen; aquí solo se dibuja. Gráficas SVG        */
/* propias, sin librerías. Los constructores de HTML son puros y  */
/* se prueban en tests/admin-marketing.test.js.                   */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'), require('./admin-iconos.js'), null, require('./admin-filas.js'));
  else root.ZOO_ADMIN_MARKETING = factory(root.ZOO_ADMIN_PANEL, root.ZOO_ICONOS, root.ZOO_ADMIN_VISTAS, root.ZOO_ADMIN_FILAS);
})(typeof self !== 'undefined' ? self : this, function (P, I, V, F) {
  'use strict';

  var esc = P.esc;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };
  var num = P.fmtNum;

  function hoyMx() { return new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10); }
  function tablaZona(tabla) { return '<div class="ap-tabla-zona"><div class="ap-tabla-envoltura">' + tabla + '</div></div>'; }
  function card(titulo, cuerpo, nota) {
    return '<section class="ap-card"><header class="ap-card__cab"><h2>' + esc(titulo) + '</h2>' + (nota ? '<p>' + esc(nota) + '</p>' : '') + '</header><div class="ap-card__cuerpo">' + cuerpo + '</div></section>';
  }
  function vacio(titulo, texto, icono) {
    return '<div class="zs-vacio ap-vacio">' + ico(icono || 'search-x', { size: 28 }) + '<strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></div>';
  }
  function kpiTend(o) {
    var t = o.tendencia;
    return '<article class="ap-kpi ap-tono-' + esc(o.tono || 'neutro') + '"><span class="ap-kpi__ico">' + ico(o.icono, { size: 20 }) + '</span><div class="ap-kpi__txt">' +
      '<p class="ap-kpi__rot">' + esc(o.rotulo) + '</p>' +
      '<p class="ap-kpi__val">' + (o.valor === null || o.valor === undefined ? '<span class="ap-kpi__nd">Sin datos</span>' : esc(o.valor)) + '</p>' +
      (o.nota ? '<p class="ap-kpi__nota">' + esc(o.nota) + '</p>' : '') +
      (t ? '<p class="ap-kpi__tend ap-tono-' + esc(t.tono) + '">' + ico(t.icono, { size: 14 }) + '<span>' + esc(t.texto) + '</span></p>' : '') + '</div></article>';
  }

  /* ───────────────────────── MÉTRICAS ───────────────────────── */

  // Agrupación automática según el largo del periodo (día hasta 45 días, semana hasta 200, mes después)
  function agruparAuto(dias) { return dias <= 45 ? 'dia' : dias <= 200 ? 'semana' : 'mes'; }
  var NOMBRE_AGRUPAR = { dia: 'Día', semana: 'Semana', mes: 'Mes' };
  function modoDe(ui, dias) { return ui && NOMBRE_AGRUPAR[ui.agrupar] ? ui.agrupar : agruparAuto(dias); }
  function valorAgrupar(m) { return m === 'dia' ? 'dia' : m === 'semana' ? 'semana' : 'mes'; }

  function barraRango(d, ui) {
    var r = d.rango;
    var chips = P.RANGOS.map(function (x) {
      return '<button type="button" class="zs-chip" data-rango="' + x.id + '" aria-pressed="' + (ui.preset === x.id) + '">' + esc(x.texto) + '</button>';
    }).join('');
    return '<section class="ap-rango" aria-label="Periodo de las métricas">' +
      '<div class="zs-chips" role="group" aria-label="Periodos rápidos">' + chips + '</div>' +
      '<form class="ap-rango__fechas" id="apRangoForm" novalidate>' +
      '<label>Desde<input type="date" id="apDesde" value="' + esc(r.desde) + '" max="' + esc(hoyMx()) + '"></label>' +
      '<label>Hasta<input type="date" id="apHasta" value="' + esc(r.hasta) + '" max="' + esc(hoyMx()) + '"></label>' +
      '<button type="submit" class="ap-btn ap-btn--suave">' + ico('calendar', { size: 16 }) + 'Aplicar fechas</button></form>' +
      '<p class="ap-rango__leyenda" role="status">Del <strong>' + esc(P.fmtFecha(r.desde + 'T12:00:00Z')) + '</strong> al <strong>' + esc(P.fmtFecha(r.hasta + 'T12:00:00Z')) + '</strong> (' + esc(num(r.dias)) + ' días). ' +
      'Las tendencias comparan con los ' + esc(num(r.dias)) + ' días anteriores.</p></section>';
  }

  function selectorAgrupar(modo) {
    return '<div class="ap-agrupar" role="group" aria-label="Agrupar las gráficas por">' + ['dia', 'semana', 'mes'].map(function (m) {
      return '<button type="button" data-agrupar="' + m + '" aria-pressed="' + (m === modo) + '">' + NOMBRE_AGRUPAR[m] + '</button>';
    }).join('') + '</div>';
  }

  function cohortesHTML(filas) {
    if (!filas.length) return vacio('Sin registros todavía', 'Cuando haya cuentas nuevas aparecerá cada mes aquí.', 'users');
    return tablaZona('<table class="ap-tabla ap-tabla--simple"><thead><tr><th scope="col">Mes de registro</th><th scope="col" class="ap-num-der">Se registraron</th><th scope="col" class="ap-num-der ap-col-3">Tuvieron membresía</th>' +
      '<th scope="col" class="ap-num-der">Conversión</th><th scope="col" class="ap-num-der ap-col-3">Con acceso hoy</th><th scope="col" class="ap-num-der">Retención</th></tr></thead><tbody>' +
      filas.map(function (f) {
        return '<tr><td data-label="Mes"><strong>' + esc(P.fmtMes(f.mes)) + '</strong></td><td class="ap-num-der" data-label="Se registraron">' + esc(num(f.registrados)) + '</td>' +
          '<td class="ap-num-der ap-col-3" data-label="Tuvieron membresía">' + esc(num(f.conPlanAlgunaVez)) + '</td><td class="ap-num-der" data-label="Conversión">' + esc(P.fmtPct(f.conversion)) + '</td>' +
          '<td class="ap-num-der ap-col-3" data-label="Con acceso hoy">' + esc(num(f.conAccesoHoy)) + '</td><td class="ap-num-der" data-label="Retención">' + esc(P.fmtPct(f.retencion)) + '</td></tr>';
      }).join('') + '</tbody></table>');
  }

  function rankingCursos(lista, vacioT, vacioX) {
    if (!lista.length) return vacio(vacioT, vacioX, 'book-open');
    return P.barrasHorizontales(lista.map(function (c) { return { etiqueta: c.curso, valor: c.n }; }));
  }

  // d = respuesta de GET /api/admin/metricas · ui = { preset, agrupar }
  function metricasHTML(d, ui) {
    var u = ui || {};
    var t = d.totales; var a = d.anterior; var c = d.cuentas; var cv = d.conversion;
    var modo = modoDe(u, d.rango.dias);
    var ag = function (serie) { return P.agruparSerie(serie, modo); };
    var titulo = P.tarjetaTitulo({
      icono: 'chart-line', eyebrow: 'Marketing', titulo: 'Cómo va', acento: 'el Club.',
      sub: 'Altas, pruebas gratuitas, membresías, cursos y comunidad con los datos que ya guarda el servidor. Elige el periodo y compáralo con el anterior.',
      cifras: [
        { valor: num(t.altas), rotulo: 'cuentas nuevas en el periodo' },
        { valor: P.fmtPct(cv.tasaRango), rotulo: 'de prueba a miembro' },
        { valor: num(c.conAccesoHoy), rotulo: 'con acceso hoy' }
      ],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    });

    var kpis = '<div class="ap-kpis">' + [
      kpiTend({ icono: 'user-plus', rotulo: 'Cuentas nuevas', valor: num(t.altas), tono: 'info', tendencia: P.variacion(t.altas, a.altas) }),
      kpiTend({ icono: 'flask-conical', rotulo: 'Pruebas gratuitas elegidas', valor: num(t.pruebas), tono: 'info', tendencia: P.variacion(t.pruebas, a.pruebas) }),
      kpiTend({ icono: 'percent', rotulo: 'De prueba a miembro', valor: P.fmtPct(cv.tasaRango), tono: cv.tasaRango === null ? 'neutro' : 'ok',
        nota: cv.eligieronRango ? num(cv.seHicieronMiembroRango) + ' de ' + num(cv.eligieronRango) + ' que eligieron en el periodo' : 'Nadie eligió su prueba en este periodo' }),
      kpiTend({ icono: 'badge-check', rotulo: 'Con acceso hoy', valor: num(c.conAccesoHoy), tono: 'ok', nota: 'De ' + num(c.total) + ' cuentas (sin administradores)' }),
      kpiTend({ icono: 'rotate-ccw', rotulo: 'Retención', valor: P.fmtPct(c.retencion), tono: c.retencion === null ? 'neutro' : 'ok',
        nota: c.conPlanAlgunaVez ? num(c.conAccesoHoy) + ' de ' + num(c.conPlanAlgunaVez) + ' que alguna vez tuvieron membresía' : 'Aún nadie ha tenido membresía' }),
      kpiTend({ icono: 'award', rotulo: 'Certificados emitidos', valor: num(t.certificados), tono: 'info', tendencia: P.variacion(t.certificados, a.certificados) }),
      kpiTend({ icono: 'credit-card', rotulo: 'Últimos pagos registrados', valor: num(t.pagos), tono: 'ok', tendencia: P.variacion(t.pagos, a.pagos), nota: 'Cuenta el último pago de cada miembro' }),
      d.visitas.activo
        ? kpiTend({ icono: 'globe', rotulo: 'Visitas a la portada', valor: num(d.visitas.total), tono: 'info', nota: 'Conteo agregado, sin cookies ni IP' })
        : kpiTend({ icono: 'globe', rotulo: 'Visitas a la portada', valor: null, tono: 'neutro', nota: 'El contador está apagado' })
    ].join('') + '</div>';

    var graficas = selectorAgrupar(modo) +
      '<div class="ap-columnas">' +
      card('Cuentas nuevas', P.graficaSerie(ag(d.series.altas), { titulo: 'Cuentas nuevas', unidad: 'cuentas nuevas' }), 'Personas que crearon su cuenta (sin administradores).') +
      card('Pruebas gratuitas elegidas', P.graficaSerie(ag(d.series.pruebas), { tipo: 'linea', titulo: 'Pruebas gratuitas elegidas', unidad: 'pruebas elegidas' }), 'Quienes escogieron su curso de prueba.') +
      '</div><div class="ap-columnas">' +
      card('Certificados emitidos', P.graficaSerie(ag(d.series.certificados), { titulo: 'Certificados emitidos', unidad: 'certificados' }), 'Con folio verificable.') +
      card('Últimos pagos registrados', P.graficaSerie(ag(d.series.pagos), { titulo: 'Últimos pagos registrados', unidad: 'pagos' }), d.notas.pagos) +
      '</div>';

    var visitas = d.visitas.activo
      ? card('Visitas a la portada', P.graficaSerie(ag(d.visitas.porDia), { titulo: 'Visitas a la portada', unidad: 'visitas' }) +
        (d.visitas.porPagina.length ? '<div class="ap-separador"></div><h3 class="ap-subtitulo">Páginas más vistas</h3>' + P.barrasHorizontales(d.visitas.porPagina.map(function (p) { return { etiqueta: p.pagina, valor: p.n }; })) : ''),
        'Conteo agregado por día y página. No guarda IP, cookies ni identificadores.')
      : '<div class="ap-aviso ap-aviso--info" role="note">' + ico('globe', { size: 20 }) + '<div><strong>El contador de visitas está apagado</strong><p>Cuando lo enciendas, aquí verás cuántas personas visitan la portada por día y qué páginas se ven más. Es un conteo agregado: sin cookies, sin IP y sin identificar a nadie. Antes de encenderlo conviene agregar un párrafo al aviso de privacidad.</p>' +
        '<a class="ap-btn ap-btn--suave" href="#/configuracion">' + ico('settings', { size: 16 }) + 'Ir a Configuración</a></div></div>';

    var estados = P.barraReparto([
      { etiqueta: 'Activos', valor: c.activos, tono: 'ok' },
      { etiqueta: 'Cancelados con acceso', valor: c.cancelados, tono: 'aviso' },
      { etiqueta: 'Pago pendiente', valor: c.pagoPendiente, tono: 'error' },
      { etiqueta: 'Vencidos', valor: c.vencidos, tono: 'apagado' },
      { etiqueta: 'Sin membresía', valor: c.sinMembresia, tono: 'neutro' }
    ]) || vacio('Todavía no hay cuentas', 'Cuando alguien se registre aparecerá aquí.', 'users');

    var conversion = P.barrasHorizontales([
      { etiqueta: 'Eligieron su prueba (en el periodo)', valor: cv.eligieronRango },
      { etiqueta: 'De ellos, ya son miembros', valor: cv.seHicieronMiembroRango }
    ]) + '<div class="ap-separador"></div>' + P.barrasHorizontales([
      { etiqueta: 'Eligieron su prueba (todo el tiempo)', valor: cv.eligieronTotal },
      { etiqueta: 'De ellos, ya son miembros', valor: cv.seHicieronMiembroTotal, nota: cv.tasaTotal === null ? '' : P.fmtPct(cv.tasaTotal) + ' de conversión' }
    ]) + '<p class="ap-nota">«Ya son miembros» incluye a quien tuvo cualquier plan después de elegir, también los regalos.</p>';

    var r = d.retos;
    var retos = '<div class="ap-datos">' +
      '<div class="ap-dato"><dt>Personas con retos</dt><dd>' + esc(num(r.conActividad)) + ' de ' + esc(num(r.personas)) + '</dd></div>' +
      '<div class="ap-dato"><dt>Retos superados</dt><dd>' + esc(num(r.retosSuperados)) + '</dd></div>' +
      '<div class="ap-dato"><dt>XP acumulado</dt><dd>' + esc(num(r.xpTotal)) + '</dd></div>' +
      '<div class="ap-dato"><dt>XP promedio</dt><dd>' + esc(num(r.xpPromedio)) + '</dd></div></div>' +
      '<h3 class="ap-subtitulo">Cuántos tienen cada nivel de XP</h3>' +
      (P.sumaSerie(r.bandas.map(function (b) { return { n: b.n }; })) ? P.barrasHorizontales(r.bandas.map(function (b) { return { etiqueta: b.banda + ' XP', valor: b.n }; })) : vacio('Sin retos jugados', 'Cuando los miembros jueguen aparecerá aquí.', 'target')) +
      '<h3 class="ap-subtitulo">Personas que jugaron por ' + (modo === 'dia' ? 'día' : modo) + '</h3>' +
      P.graficaSerie(ag(r.actividadPorDia.map(function (x) { return { dia: x.dia, n: x.n }; })), { titulo: 'Personas que jugaron', unidad: 'personas' });

    return titulo + barraRango(d, u) + kpis + graficas + visitas +
      '<div class="ap-columnas">' +
      card('Cuentas hoy', estados + '<p class="ap-nota">Retención: ' + esc(d.notas.retencion) + '</p>', 'Cómo se reparten las ' + num(c.total) + ' cuentas.') +
      card('De prueba gratuita a miembro', conversion, 'Cuántas personas que eligieron su curso de prueba terminaron con membresía.') +
      '</div>' +
      card('Cohortes por mes de registro', cohortesHTML(d.cohortes), 'De cada mes: cuántos se registraron, cuántos tuvieron membresía y cuántos tienen acceso hoy.') +
      '<div class="ap-columnas">' +
      card('Cursos más elegidos como prueba', rankingCursos(d.cursos.masElegidos, 'Nadie ha elegido prueba', 'Cuando alguien elija su curso aparecerá aquí.'), 'Toda la historia, no solo el periodo.') +
      card('Cursos más completados', rankingCursos(d.cursos.masCompletados, 'Aún no hay cursos completados', 'Cuando alguien termine un curso aparecerá aquí.'), 'Certificados y cursos terminados.') +
      '</div>' +
      card('Cursos más empezados', rankingCursos(d.cursos.masEmpezados, 'Nadie ha empezado un curso', 'El avance de los miembros aparecerá aquí.'), 'Cuántas personas vieron al menos una clase.') +
      card('Retos y XP', retos, d.notas.retos);
  }

  /* ───────────────────────── PRUEBAS GRATUITAS ───────────────────────── */

  var FILTROS_PRUEBAS = [
    { id: 'todos', texto: 'Todos', pasa: function () { return true; } },
    { id: 'terminaron', texto: 'Terminaron las clases gratis', pasa: function (f) { return f.terminoGratis; } },
    { id: 'en-curso', texto: 'Siguen en clases gratis', pasa: function (f) { return !f.terminoGratis && !f.yaMiembro; } },
    { id: 'miembros', texto: 'Ya son miembros', pasa: function (f) { return f.yaMiembro; } },
    { id: 'no-miembros', texto: 'Aún no son miembros', pasa: function (f) { return !f.yaMiembro; } }
  ];

  function filtrarPruebas(filas, o) {
    var op = o || {};
    var f = FILTROS_PRUEBAS.filter(function (x) { return x.id === op.filtro; })[0] || FILTROS_PRUEBAS[0];
    var q = String(op.texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    return filas.filter(function (x) {
      if (!f.pasa(x)) return false;
      if (op.curso && op.curso !== 'todos' && x.cursoId !== op.curso) return false;
      if (!q) return true;
      return (x.nombre + ' ' + x.correo + ' ' + x.curso).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().indexOf(q) !== -1;
    });
  }

  function insigniasPrueba(f) {
    var h = [];
    if (f.yaMiembro) h.push('<span class="ap-badge ap-badge--ok">' + ico('badge-check', { size: 14 }) + '<span>' + (f.conAcceso ? 'Es miembro' : 'Fue miembro') + '</span></span>');
    if (f.terminoGratis) h.push('<span class="ap-badge ap-badge--info">' + ico('circle-check', { size: 14 }) + '<span>Terminó las clases gratis</span></span>');
    else if (!f.yaMiembro) h.push('<span class="ap-badge ap-badge--neutro">' + ico('clock', { size: 14 }) + '<span>En clases gratis</span></span>');
    if (!f.cuentaExiste) h.push('<span class="ap-badge ap-badge--apagado">' + ico('circle-x', { size: 14 }) + '<span>Cuenta eliminada</span></span>');
    return h.join(' ');
  }

  // Fila compacta de una prueba gratuita: persona, curso elegido y avance (en pantallas anchas), insignias de estado. Tocarla abre la ficha.
  function filaPrueba(f) {
    var avance = f.avance === null ? '<span class="ap-fc__s">—</span>'
      : '<div class="ap-mini"><span class="ap-mini__b" aria-hidden="true"><i style="width:' + f.avance + '%"></i></span><span class="ap-mini__n">' + esc(num(Math.min(f.clasesVistas, f.clasesGratis))) + ' de ' + esc(num(f.clasesGratis)) + '</span></div>';
    return F.fila({
      clase: 'ap-fc--est-solo',
      avatar: '<span class="ap-avatar ap-avatar--' + (f.conAcceso ? 'activo' : 'sin-plan') + '" aria-hidden="true">' + esc(P.iniciales(f.nombre || f.correo)) + '</span>',
      titulo: f.nombre || 'Sin nombre', accion: f.cuentaExiste ? { a: 'ficha', datos: { uid: f.uid } } : null,
      meta: '<span class="ap-fc__correo">' + esc(f.correo || '—') + '</span>',
      metaChico: '<span class="ap-fc__sep"> · </span>' + esc(f.curso),
      cols: [
        { html: '<span class="ap-fc__v" title="' + esc(f.curso) + '">' + esc(f.curso) + '</span><span class="ap-fc__s">Elegida ' + esc(P.fmtFecha(f.elegidoEn)) + ' · ' + esc(P.relativo(f.elegidoEn)) + '</span>' },
        { html: avance }
      ],
      estado: insigniasPrueba(f), chevron: f.cuentaExiste, reservarFin: true
    });
  }

  function tablaPruebas(filas, visibles) {
    if (!filas.length) return vacio('Nadie coincide con ese filtro', 'Quita el filtro o prueba con otro nombre.', 'search-x');
    var mostrar = filas.slice(0, visibles);
    return F.lista(mostrar.map(filaPrueba), { etiqueta: 'Pruebas gratuitas', cab: { principal: 'Persona', cols: ['Curso elegido', 'Avance'], estado: 'Estado' } }) +
      '<p class="ap-pie-tabla" role="status">Mostrando ' + esc(num(mostrar.length)) + ' de ' + esc(num(filas.length)) + '</p>' +
      (filas.length > mostrar.length ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="mas">Mostrar ' + Math.min(25, filas.length - mostrar.length) + ' más</button>' : '');
  }

  function sinElegirHTML(se) {
    if (!se.total) return vacio('Todos ya eligieron', 'No hay cuentas sin membresía pendientes de elegir su prueba.', 'circle-check');
    return F.lista(se.lista.map(function (x) {
      return F.fila({
        avatar: '<span class="ap-avatar ap-avatar--sin-plan" aria-hidden="true">' + esc(P.iniciales(x.nombre || x.correo)) + '</span>',
        titulo: x.nombre || 'Sin nombre', accion: { a: 'ficha', datos: { uid: x.uid } },
        meta: '<span class="ap-fc__correo">' + esc(x.correo || '—') + '</span>', metaChico: '<span class="ap-fc__sep"> · </span>Registro ' + esc(P.fmtFecha(x.registro)),
        cols: [{ html: '<span class="ap-fc__v"><span class="sr-only">Registro </span>' + esc(P.fmtFecha(x.registro)) + '</span><span class="ap-fc__s">' + esc(P.relativo(x.registro)) + '</span>' }], chevron: true
      });
    }), { etiqueta: 'Cuentas sin elegir' }) + (se.total > se.lista.length ? '<p class="ap-pie-tabla">Se muestran las ' + esc(num(se.lista.length)) + ' más recientes de ' + esc(num(se.total)) + '.</p>' : '');
  }

  // d = respuesta de GET /api/admin/pruebas · ui = { texto, curso, filtro, visibles, pestana }
  function pruebasHTML(d, ui) {
    var u = ui || {};
    var t = d.totales;
    var titulo = P.tarjetaTitulo({
      icono: 'flask-conical', eyebrow: 'Marketing', titulo: 'Pruebas', acento: 'gratuitas.',
      sub: 'Quién eligió su curso de prueba, cuánto avanzó en las clases gratis y si ya se hizo miembro. La elección es definitiva para cada persona.',
      cifras: [
        { valor: num(t.elegidas), rotulo: 'pruebas elegidas' },
        { valor: num(t.seHicieronMiembro), rotulo: 'ya son miembros' },
        { valor: num(d.sinElegir.total), rotulo: 'sin elegir aún' }
      ],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    });
    var kpis = '<div class="ap-kpis">' + [
      kpiTend({ icono: 'flask-conical', rotulo: 'Pruebas elegidas', valor: num(t.elegidas), tono: 'info', nota: 'Desde que existe la función' }),
      kpiTend({ icono: 'circle-check', rotulo: 'Terminaron las clases gratis', valor: num(t.terminaronGratis), tono: 'ok', nota: t.tasaTerminaron === null ? 'Aún nadie elige' : P.fmtPct(t.tasaTerminaron) + ' de quienes eligieron' }),
      kpiTend({ icono: 'badge-check', rotulo: 'Se hicieron miembros', valor: num(t.seHicieronMiembro), tono: 'ok', nota: t.tasaMiembro === null ? 'Aún nadie elige' : P.fmtPct(t.tasaMiembro) + ' de quienes eligieron' }),
      kpiTend({ icono: 'user-plus', rotulo: 'Cuentas sin elegir', valor: num(d.sinElegir.total), tono: d.sinElegir.total ? 'aviso' : 'neutro', nota: 'Sin membresía y sin curso de prueba' })
    ].join('') + '</div>';
    var porCurso = d.porCurso.length
      ? tablaZona('<table class="ap-tabla ap-tabla--simple"><thead><tr><th scope="col">Curso</th><th scope="col" class="ap-num-der">Eligieron</th><th scope="col" class="ap-num-der ap-col-3">Terminaron las clases gratis</th><th scope="col" class="ap-num-der">Ya son miembros</th></tr></thead><tbody>' +
        d.porCurso.map(function (c) {
          return '<tr><td data-label="Curso"><strong>' + esc(c.curso) + '</strong></td><td class="ap-num-der" data-label="Eligieron">' + esc(num(c.elegidas)) + '</td><td class="ap-num-der ap-col-3" data-label="Terminaron las clases gratis">' + esc(num(c.terminaronGratis)) + '</td><td class="ap-num-der" data-label="Ya son miembros">' + esc(num(c.seHicieronMiembro)) + '</td></tr>';
        }).join('') + '</tbody></table>')
      : vacio('Nadie ha elegido todavía', 'Cuando alguien elija su curso de prueba aparecerá aquí con su avance.', 'flask-conical');

    var pest = u.pestana === 'sin' ? 'sin' : 'elegidas';
    var pestanas = '<div class="zs-chips" role="group" aria-label="Ver cuentas"><button type="button" class="zs-chip" data-pestana="elegidas" aria-pressed="' + (pest === 'elegidas') + '">Eligieron · ' + esc(num(t.elegidas)) + '</button>' +
      '<button type="button" class="zs-chip" data-pestana="sin" aria-pressed="' + (pest === 'sin') + '">Sin elegir · ' + esc(num(d.sinElegir.total)) + '</button></div>';
    var cuerpoLista;
    if (pest === 'sin') {
      cuerpoLista = pestanas + sinElegirHTML(d.sinElegir);
    } else {
      var opcionesCurso = '<option value="todos">Todos los cursos</option>' + d.porCurso.map(function (c) {
        return '<option value="' + esc(c.cursoId) + '"' + (u.curso === c.cursoId ? ' selected' : '') + '>' + esc(c.curso) + ' (' + esc(num(c.elegidas)) + ')</option>';
      }).join('');
      var filtradas = filtrarPruebas(d.filas, { filtro: u.filtro, curso: u.curso, texto: u.texto });
      cuerpoLista = pestanas +
        '<div class="ap-controles"><div class="zs-chips" role="group" aria-label="Filtrar por estado">' + FILTROS_PRUEBAS.map(function (f) {
          return '<button type="button" class="zs-chip" data-filtro="' + f.id + '" aria-pressed="' + ((u.filtro || 'todos') === f.id) + '">' + esc(f.texto) + '</button>';
        }).join('') + '</div><div class="ap-controles__der"><label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar por nombre, correo o curso</span>' +
        '<input type="search" id="apPruebaBuscar" placeholder="Buscar persona o curso" autocomplete="off" value="' + esc(u.texto || '') + '"></label>' +
        '<label class="ap-orden"><span class="sr-only">Curso</span><select id="apPruebaCurso">' + opcionesCurso + '</select></label></div></div>' +
        '<div id="apPruebasLista">' + tablaPruebas(filtradas, u.visibles || 25) + '</div>';
    }
    return titulo + kpis + card('Por curso', porCurso, 'Cuántas personas eligieron cada curso y cuántas llegaron a la membresía.') +
      card(pest === 'sin' ? 'Cuentas que aún no eligen su prueba' : 'Quiénes eligieron', cuerpoLista,
        pest === 'sin' ? 'Cuentas sin membresía que todavía pueden elegir su curso gratis.' : 'La prueba abre todas las clases del curso menos la última.') +
      (d.truncado ? '<div class="ap-aviso ap-aviso--info" role="note">' + ico('info', { size: 20 }) + '<div><p>Se muestran las primeras 1,000 pruebas.</p></div></div>' : '');
  }

  /* ───────────────────────── Controladores (solo en el navegador) ───────────────────────── */
  var estadoM = { preset: '30', desde: null, hasta: null, agrupar: null, datos: null };
  var estadoP = { datos: null, texto: '', curso: 'todos', filtro: 'todos', visibles: 25, pestana: 'elegidas' };

  function errorVista(titulo, e, reintento) {
    var u = V.util;
    u.vista().innerHTML = u.errorHTML(titulo, e, 'recargar');
    u.vista().onclick = function (ev) { u.acciones(ev, { recargar: reintento }); };
  }

  async function metricas(forzar) {
    var u = V.util; var ctx = u.contexto(); var mi = u.nuevoContador();
    u.vista().innerHTML = u.cargando('Métricas');
    var q = estadoM.preset === 'custom' && estadoM.desde && estadoM.hasta ? { desde: estadoM.desde, hasta: estadoM.hasta } : P.rangoRapido(estadoM.preset === 'custom' ? '30' : estadoM.preset, hoyMx());
    var d;
    try { d = await ctx.api('/api/admin/metricas?desde=' + encodeURIComponent(q.desde) + '&hasta=' + encodeURIComponent(q.hasta) + (forzar ? '&refrescar=1' : '')); } catch (e) {
      if (mi !== u.contadorActual()) return;
      errorVista('Métricas', e, function () { metricas(true); });
      return;
    }
    if (mi !== u.contadorActual()) return;
    estadoM.datos = d;
    pintarMetricas();
  }

  function pintarMetricas() {
    var u = V.util; var v = u.vista();
    v.innerHTML = metricasHTML(estadoM.datos, estadoM);
    v.onclick = function (ev) {
      var r = ev.target.closest('[data-rango]');
      if (r) { estadoM.preset = r.dataset.rango; estadoM.agrupar = null; metricas(false); return; }
      var g = ev.target.closest('[data-agrupar]');
      if (g) { estadoM.agrupar = g.dataset.agrupar; pintarMetricas(); return; }
      u.acciones(ev, { recargar: function () { metricas(true); } });
    };
    var form = document.getElementById('apRangoForm');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var desde = document.getElementById('apDesde').value; var hasta = document.getElementById('apHasta').value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) { u.contexto().toast('Elige las dos fechas.', true); return; }
      if (desde > hasta) { var x = desde; desde = hasta; hasta = x; }
      estadoM.preset = 'custom'; estadoM.desde = desde; estadoM.hasta = hasta; estadoM.agrupar = null;
      metricas(false);
    });
  }

  async function pruebas(forzar) {
    var u = V.util; var ctx = u.contexto(); var mi = u.nuevoContador();
    u.vista().innerHTML = u.cargando('Pruebas gratuitas');
    var d;
    try { d = await ctx.api('/api/admin/pruebas' + (forzar ? '?refrescar=1' : '')); } catch (e) {
      if (mi !== u.contadorActual()) return;
      errorVista('Pruebas gratuitas', e, function () { pruebas(true); });
      return;
    }
    if (mi !== u.contadorActual()) return;
    estadoP.datos = d; estadoP.visibles = 25;
    pintarPruebas();
  }

  function pintarListaPruebas() {
    var cont = document.getElementById('apPruebasLista');
    if (!cont) return;
    cont.innerHTML = tablaPruebas(filtrarPruebas(estadoP.datos.filas, estadoP), estadoP.visibles);
  }

  function pintarPruebas() {
    var u = V.util; var v = u.vista();
    v.innerHTML = pruebasHTML(estadoP.datos, estadoP);
    var buscar = document.getElementById('apPruebaBuscar');
    if (buscar) buscar.addEventListener('input', function (e) { estadoP.texto = e.target.value; estadoP.visibles = 25; pintarListaPruebas(); });
    var curso = document.getElementById('apPruebaCurso');
    if (curso) { curso.value = estadoP.curso; curso.addEventListener('change', function (e) { estadoP.curso = e.target.value; estadoP.visibles = 25; pintarListaPruebas(); }); }
    v.onclick = function (ev) {
      var pe = ev.target.closest('[data-pestana]');
      if (pe) { estadoP.pestana = pe.dataset.pestana; pintarPruebas(); return; }
      var fi = ev.target.closest('[data-filtro]');
      if (fi) {
        estadoP.filtro = fi.dataset.filtro; estadoP.visibles = 25;
        v.querySelectorAll('[data-filtro]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === fi)); });
        pintarListaPruebas();
        return;
      }
      u.acciones(ev, {
        recargar: function () { pruebas(true); },
        mas: function () { estadoP.visibles += 25; pintarListaPruebas(); },
        ficha: function (b) { V.abrirFicha(b.dataset.uid); }
      });
    };
  }

  return {
    agruparAuto: agruparAuto, modoDe: modoDe, metricasHTML: metricasHTML, cohortesHTML: cohortesHTML, barraRango: barraRango,
    FILTROS_PRUEBAS: FILTROS_PRUEBAS, filtrarPruebas: filtrarPruebas, pruebasHTML: pruebasHTML, tablaPruebas: tablaPruebas, filaPrueba: filaPrueba,
    metricas: metricas, pruebas: pruebas
  };
});
