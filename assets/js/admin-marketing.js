/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · MARKETING                            */
/* Métricas (GET /api/admin/metricas) y Pruebas gratuitas         */
/* (GET /api/admin/pruebas). Todo se calcula en el servidor con   */
/* datos que ya existen; aquí solo se dibuja. Gráficas SVG        */
/* propias, sin librerías. Los constructores de HTML son puros y  */
/* se prueban en tests/admin-marketing.test.js.                   */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'), require('./admin-iconos.js'), null, require('./admin-filas.js'), require('./admin-graficas.js'));
  else root.ZOO_ADMIN_MARKETING = factory(root.ZOO_ADMIN_PANEL, root.ZOO_ICONOS, root.ZOO_ADMIN_VISTAS, root.ZOO_ADMIN_FILAS, root.ZOO_ADMIN_GRAFICAS);
})(typeof self !== 'undefined' ? self : this, function (P, I, V, F, G) {
  'use strict';

  var esc = P.esc;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };
  var num = P.fmtNum;

  function hoyMx() { return new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10); }
  function tablaZona(tabla) { return '<div class="ap-tabla-zona"><div class="ap-tabla-envoltura">' + tabla + '</div></div>'; }
  function card(titulo, cuerpo, nota, clase) {
    return '<section class="ap-card' + (clase ? ' ' + clase : '') + '"><header class="ap-card__cab"><h2>' + esc(titulo) + '</h2>' + (nota ? '<p>' + esc(nota) + '</p>' : '') + '</header><div class="ap-card__cuerpo">' + cuerpo + '</div></section>';
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
      (t ? '<p class="ap-kpi__tend ap-tono-' + esc(t.tono) + '">' + ico(t.icono, { size: 14 }) + '<span>' + esc(t.texto) + '</span></p>' : '') +
      (o.spark ? '<div class="ap-kpi__spark">' + o.spark + '</div>' : '') + '</div></article>';
  }

  /* ───────────────────────── MÉTRICAS ───────────────────────── */

  // Agrupación automática según el largo del periodo (día hasta 45 días, semana hasta 200, mes después)
  function agruparAuto(dias) { return dias <= 45 ? 'dia' : dias <= 200 ? 'semana' : 'mes'; }
  var NOMBRE_AGRUPAR = { dia: 'Día', semana: 'Semana', mes: 'Mes' };
  function modoDe(ui, dias) { return ui && NOMBRE_AGRUPAR[ui.agrupar] ? ui.agrupar : agruparAuto(dias); }
  var DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

  // Serie diaria del servidor → { etiquetas, titulos, valores } agrupada por día, semana o mes (los títulos largos son para el tooltip)
  function agrupada(serie, modo) {
    var g = P.agruparSerie(serie, modo);
    return {
      etiquetas: g.map(function (x) { return x.etiqueta; }),
      titulos: g.map(function (x) { return modo === 'mes' ? P.fmtMes(x.clave) : (modo === 'semana' ? 'Semana del ' : '') + P.fmtFecha(x.clave + 'T12:00:00Z'); }),
      valores: g.map(function (x) { return x.valor; })
    };
  }
  function valoresDe(serie) { return (serie || []).map(function (x) { return Number(x.n) || 0; }); }

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

  var FRASES_EMBUDO = { prueba: 'eligen su prueba gratuita', clases: 'empiezan un curso', curso: 'terminan un curso' };

  // Barras horizontales de mayor a menor con el nombre completo del curso, valor y porcentaje al final; ocho a la vista y «Ver todos».
  function rankingCursos(lista, titulo, vacioT, vacioX, colorN, total, unidad) {
    return G.ranking({
      titulo: titulo, filas: (lista || []).map(function (c) { return { etiqueta: c.curso, valor: c.n }; }), color: colorN, maximo: 8,
      total: total || 0, unidad: unidad || 'personas', vacio: { titulo: vacioT, texto: vacioX }
    });
  }

  // CSV del historial: una fila por día del periodo (hora de México). Es solo lo que ya muestra el panel.
  function csvHistorial(d) {
    var ret = {}; (d.retos.actividadPorDia || []).forEach(function (x) { ret[x.dia] = x.n; });
    var ingresos = {}; (d.series.ingresos || []).forEach(function (x) { ingresos[x.dia] = x.n; });
    var visitas = {}; ((d.visitas && d.visitas.porDia) || []).forEach(function (x) { visitas[x.dia] = x.n; });
    var pr = {}; d.series.pruebas.forEach(function (x) { pr[x.dia] = x.n; });
    var ce = {}; d.series.certificados.forEach(function (x) { ce[x.dia] = x.n; });
    var pa = {}; d.series.pagos.forEach(function (x) { pa[x.dia] = x.n; });
    var conVisitas = Boolean(d.visitas && d.visitas.activo);
    var columnas = [{ titulo: 'fecha', clave: 'fecha' }, { titulo: 'cuentas_nuevas', clave: 'altas' }, { titulo: 'pruebas_elegidas', clave: 'pruebas' }, { titulo: 'certificados', clave: 'certs' },
      { titulo: 'ultimos_pagos', clave: 'pagos' }, { titulo: 'ingresos_estimados_mxn', clave: 'ingresos' }, { titulo: 'personas_que_jugaron_retos', clave: 'retos' }];
    if (conVisitas) columnas.push({ titulo: 'visitas_a_la_portada', clave: 'visitas' });
    var filas = d.series.altas.map(function (x) {
      return { fecha: x.dia, altas: x.n, pruebas: pr[x.dia] || 0, certs: ce[x.dia] || 0, pagos: pa[x.dia] || 0, ingresos: ingresos[x.dia] || 0, retos: ret[x.dia] || 0, visitas: visitas[x.dia] || 0 };
    });
    return P.aCsv(columnas, filas);
  }

  function csvCohortes(filas) {
    return P.aCsv([{ titulo: 'mes_de_registro', clave: 'mes' }, { titulo: 'se_registraron', clave: 'registrados' }, { titulo: 'tuvieron_membresia', clave: 'conPlanAlgunaVez' },
      { titulo: 'conversion_pct', clave: 'conversion' }, { titulo: 'con_acceso_hoy', clave: 'conAccesoHoy' }, { titulo: 'retencion_pct', clave: 'retencion' }],
      (filas || []).map(function (f) { return { mes: f.mes, registrados: f.registrados, conPlanAlgunaVez: f.conPlanAlgunaVez, conversion: f.conversion === null ? '' : f.conversion, conAccesoHoy: f.conAccesoHoy, retencion: f.retencion === null ? '' : f.retencion }; }));
  }

  // d = respuesta de GET /api/admin/metricas · ui = { preset, agrupar, embudo }
  function metricasHTML(d, ui) {
    var u = ui || {};
    var t = d.totales; var a = d.anterior; var c = d.cuentas; var cv = d.conversion;
    var modo = modoDe(u, d.rango.dias);
    var ag = function (serie) { return agrupada(serie, modo); };
    var sa = ag(d.series.altas); var sp = ag(d.series.pruebas); var sc = ag(d.series.certificados); var sg = ag(d.series.pagos); var si = ag(d.series.ingresos || []);
    var titulo = P.tarjetaTitulo({
      icono: 'chart-line', eyebrow: 'Marketing', titulo: 'Cómo va', acento: 'el Club.',
      sub: 'Altas, pruebas gratuitas, membresías, cursos y comunidad con los datos que ya guarda el servidor. Elige el periodo y compáralo con el anterior.',
      cifras: [
        { valor: num(t.altas), rotulo: 'cuentas nuevas en el periodo' },
        { valor: P.fmtPct(cv.tasaRango), rotulo: 'de prueba a miembro' },
        { valor: num(c.conAccesoHoy), rotulo: 'con acceso hoy' }
      ],
      acciones: [{ id: 'csv', texto: 'Descargar historial (CSV)', icono: 'download' }, { id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    });

    var kpis = '<div class="ap-kpis">' + [
      kpiTend({ icono: 'user-plus', rotulo: 'Cuentas nuevas', valor: num(t.altas), tono: 'info', tendencia: P.variacion(t.altas, a.altas), spark: G.sparkline(sa.valores, { color: 1 }) }),
      kpiTend({ icono: 'flask-conical', rotulo: 'Pruebas gratuitas elegidas', valor: num(t.pruebas), tono: 'info', tendencia: P.variacion(t.pruebas, a.pruebas), spark: G.sparkline(sp.valores, { color: 2 }) }),
      kpiTend({ icono: 'percent', rotulo: 'De prueba a miembro', valor: P.fmtPct(cv.tasaRango), tono: cv.tasaRango === null ? 'neutro' : 'ok',
        nota: cv.eligieronRango ? num(cv.seHicieronMiembroRango) + ' de ' + num(cv.eligieronRango) + ' que eligieron en el periodo' : 'Nadie eligió su prueba en este periodo' }),
      kpiTend({ icono: 'banknote', rotulo: 'Ingresos estimados', valor: '$' + num(t.ingresos || 0), tono: 'ok', tendencia: P.variacion(t.ingresos || 0, a.ingresos || 0), nota: 'MXN · estimación por precio de lista', spark: G.sparkline(si.valores, { color: 3 }) }),
      kpiTend({ icono: 'badge-check', rotulo: 'Con acceso hoy', valor: num(c.conAccesoHoy), tono: 'ok', nota: 'De ' + num(c.total) + ' cuentas (sin administradores)' }),
      kpiTend({ icono: 'rotate-ccw', rotulo: 'Retención', valor: P.fmtPct(c.retencion), tono: c.retencion === null ? 'neutro' : 'ok',
        nota: c.conPlanAlgunaVez ? num(c.conAccesoHoy) + ' de ' + num(c.conPlanAlgunaVez) + ' que alguna vez tuvieron membresía' : 'Aún nadie ha tenido membresía' }),
      kpiTend({ icono: 'award', rotulo: 'Certificados emitidos', valor: num(t.certificados), tono: 'info', tendencia: P.variacion(t.certificados, a.certificados), spark: G.sparkline(sc.valores, { color: 5 }) }),
      kpiTend({ icono: 'wallet', rotulo: 'Últimos pagos registrados', valor: num(t.pagos), tono: 'ok', tendencia: P.variacion(t.pagos, a.pagos), nota: 'Cuenta el último pago de cada miembro', spark: G.sparkline(sg.valores, { color: 4 }) }),
      d.visitas.activo
        ? kpiTend({ icono: 'globe', rotulo: 'Visitas a la portada', valor: num(d.visitas.total), tono: 'info', nota: 'Conteo agregado, sin cookies ni IP', spark: G.sparkline(valoresDe(d.visitas.porDia), { color: 6 }) })
        : kpiTend({ icono: 'globe', rotulo: 'Visitas a la portada', valor: null, tono: 'neutro', nota: 'El contador está apagado' })
    ].join('') + '</div>';

    // Comparación con el periodo anterior (marca punteada): solo cuando se ve día por día, que es cuando coinciden uno a uno
    var previa = modo === 'dia' && d.seriesAnterior ? valoresDe(d.seriesAnterior.altas) : null;
    var altasSeries = [{ nombre: 'Cuentas nuevas', valores: sa.valores, color: 1 }];
    if (previa && previa.length === sa.valores.length && P.sumaSerie(d.seriesAnterior.altas)) altasSeries.push({ nombre: 'Periodo anterior', valores: previa, color: 8, punteada: true });

    var actividad = G.serie({
      titulo: 'Actividad del Club', tipo: 'lineas', unidad: '', alto: 260,
      etiquetas: sa.etiquetas, titulos: sa.titulos,
      series: [{ nombre: 'Cuentas nuevas', valores: sa.valores, color: 1 }, { nombre: 'Pruebas elegidas', valores: sp.valores, color: 2 }, { nombre: 'Certificados', valores: sc.valores, color: 3 }, { nombre: 'Últimos pagos', valores: sg.valores, color: 4 }],
      vacio: { titulo: 'Sin actividad en este periodo', texto: 'Prueba con un periodo más largo o espera a que haya altas, pruebas, certificados o pagos.' }
    });
    var graficas = selectorAgrupar(modo) +
      card('Actividad del Club', actividad, 'Las cuatro señales principales juntas. Pasa el cursor o toca la gráfica para ver cada valor.') +
      '<div class="ap-columnas">' +
      card('Cuentas nuevas', G.serie({ titulo: 'Cuentas nuevas', tipo: 'barras', unidad: 'cuentas nuevas', etiquetas: sa.etiquetas, titulos: sa.titulos, series: altasSeries,
        vacio: { titulo: 'Sin cuentas nuevas', texto: 'Cuando alguien cree su cuenta en este periodo aparecerá aquí.' } }), previa && altasSeries.length > 1 ? 'La raya punteada marca el periodo anterior, día por día.' : 'Personas que crearon su cuenta (sin administradores).') +
      card('Ingresos estimados', G.serie({ titulo: 'Ingresos estimados', tipo: 'barras', formato: 'mxn', unidad: 'estimados', etiquetas: si.etiquetas, titulos: si.titulos,
        series: [{ nombre: 'Ingresos estimados (MXN)', valores: si.valores, color: 3 }], vacio: { titulo: 'Sin pagos en este periodo', texto: 'Cuando haya pagos aparecerá la estimación.' } }), d.notas.ingresos) +
      '</div><div class="ap-columnas">' +
      card('Pruebas gratuitas elegidas', G.serie({ titulo: 'Pruebas gratuitas elegidas', tipo: 'area', unidad: 'pruebas elegidas', etiquetas: sp.etiquetas, titulos: sp.titulos,
        series: [{ nombre: 'Pruebas elegidas', valores: sp.valores, color: 2 }], vacio: { titulo: 'Nadie eligió su prueba', texto: 'Cuando alguien escoja su curso de prueba aparecerá aquí.' } }), 'Quienes escogieron su curso de prueba.') +
      card('Certificados emitidos', G.serie({ titulo: 'Certificados emitidos', tipo: 'barras', unidad: 'certificados', etiquetas: sc.etiquetas, titulos: sc.titulos,
        series: [{ nombre: 'Certificados', valores: sc.valores, color: 5 }], vacio: { titulo: 'Sin certificados', texto: 'Cuando alguien termine un curso aparecerá aquí.' } }), 'Con folio verificable.') +
      '</div>';

    // Embudo: del registro al curso terminado
    var emb = u.embudo === 'total' ? d.embudo.total : d.embudo.rango;
    var embudoCard = card('De la cuenta nueva al curso terminado',
      '<div class="zs-chips" role="group" aria-label="Personas del embudo"><button type="button" class="zs-chip" data-embudo="rango" aria-pressed="' + (u.embudo !== 'total') + '">Cuentas del periodo</button>' +
      '<button type="button" class="zs-chip" data-embudo="total" aria-pressed="' + (u.embudo === 'total') + '">Todas las cuentas</button></div>' +
      G.embudo({
        titulo: 'De la cuenta nueva al curso terminado', unidad: u.embudo === 'total' ? 'cuentas' : 'cuentas nuevas',
        etapas: emb.etapas.map(function (e) { return { etiqueta: e.etiqueta, valor: e.valor, frase: FRASES_EMBUDO[e.clave] || e.etiqueta }; }),
        vacio: { titulo: 'Sin cuentas en el periodo', texto: 'Cuando alguien se registre en este periodo verás aquí hasta dónde llega.' }
      }) +
      '<p class="ap-nota">' + esc(d.embudo.nota) + (emb.pagaronSinPrueba ? ' Aquí hay ' + esc(num(emb.pagaronSinPrueba)) + ' que pagaron sin pasar por la prueba.' : '') + '</p>',
      'Cuántas de las personas que se registraron llegan a cada paso.');

    var visitas = d.visitas.activo
      ? card('Visitas a la portada', G.serie({ titulo: 'Visitas a la portada', tipo: 'area', unidad: 'visitas', etiquetas: ag(d.visitas.porDia).etiquetas, titulos: ag(d.visitas.porDia).titulos,
        series: [{ nombre: 'Visitas', valores: ag(d.visitas.porDia).valores, color: 6 }], vacio: { titulo: 'Sin visitas en este periodo', texto: 'El contador está encendido; cuando alguien entre a la portada aparecerá aquí.' } }) +
        (d.visitas.porPagina.length ? '<div class="ap-separador"></div><h3 class="ap-subtitulo">Páginas más vistas</h3>' + G.barrasH({ titulo: 'Páginas más vistas', filas: d.visitas.porPagina.map(function (p) { return { etiqueta: p.pagina, valor: p.n }; }), color: 6 }) : ''),
        'Conteo agregado por día y página. No guarda IP, cookies ni identificadores.')
      : '<div class="ap-aviso ap-aviso--info" role="note">' + ico('globe', { size: 20 }) + '<div><strong>El contador de visitas está apagado</strong><p>Cuando lo enciendas, aquí verás cuántas personas visitan la portada por día y qué páginas se ven más. Es un conteo agregado: sin cookies, sin IP y sin identificar a nadie. El conteo empieza cuando lo activas y no reconstruye visitas anteriores.</p>' +
        '<a class="ap-btn ap-btn--suave" href="#/configuracion">' + ico('settings', { size: 16 }) + 'Ir a Configuración</a></div></div>';

    var estados = G.anillo({
      titulo: 'Cuentas hoy', centro: { valor: num(c.total), rotulo: 'cuentas' },
      partes: [
        { etiqueta: 'Activos', valor: c.activos, color: 1 }, { etiqueta: 'Cancelados con acceso', valor: c.cancelados, color: 3 },
        { etiqueta: 'Pago pendiente', valor: c.pagoPendiente, color: 4 }, { etiqueta: 'Vencidos', valor: c.vencidos, color: 8 }, { etiqueta: 'Sin membresía', valor: c.sinMembresia, color: 2 }
      ],
      vacio: { titulo: 'Todavía no hay cuentas', texto: 'Cuando alguien se registre aparecerá aquí.' }
    });
    var planes = c.planes ? G.anillo({
      titulo: 'Plan de quienes tienen acceso', centro: { valor: num(c.conAccesoHoy), rotulo: 'con acceso' },
      partes: [{ etiqueta: 'Mensual', valor: c.planes.mensual, color: 2 }, { etiqueta: 'Anual', valor: c.planes.anual, color: 1 }, { etiqueta: 'Sin tipo de plan', valor: c.planes.otro, color: 8 }],
      vacio: { titulo: 'Nadie tiene acceso hoy', texto: 'Cuando haya miembros verás aquí cómo se reparten los planes.' }
    }) : '';

    var conversion = G.barrasH({
      titulo: 'De prueba gratuita a miembro', porcentaje: false, color: 2,
      filas: [
        { etiqueta: 'Eligieron su prueba (en el periodo)', valor: cv.eligieronRango, color: 2 },
        { etiqueta: 'De ellos, ya son miembros', valor: cv.seHicieronMiembroRango, color: 1 },
        { etiqueta: 'Eligieron su prueba (todo el tiempo)', valor: cv.eligieronTotal, color: 2, nota: cv.tasaTotal === null ? '' : P.fmtPct(cv.tasaTotal) + ' de conversión' },
        { etiqueta: 'De ellos, ya son miembros', valor: cv.seHicieronMiembroTotal, color: 1 }
      ],
      vacio: { titulo: 'Nadie ha elegido su prueba', texto: 'Cuando alguien elija su curso de prueba aparecerá aquí.' }
    }) + '<p class="ap-nota">«Ya son miembros» incluye a quien tuvo cualquier plan después de elegir, también los regalos.</p>';

    // Actividad por día de la semana y hora
    var ac = d.actividad;
    var mapa = G.mapaCalor({
      titulo: 'Mapa de actividad por día y hora', unidad: 'movimientos',
      filas: DIAS_SEMANA.map(function (n, i) { return { etiqueta: n, valores: ac.mapa[i] }; }),
      columnas: Array.from({ length: 24 }, function (_, h) { return h + 'h'; }), mostrarCada: 3,
      vacio: { titulo: 'Sin actividad en este periodo', texto: 'Cuando haya altas, pruebas, certificados, pagos o retos aparecerá cuándo suceden.' }
    });
    var porDia = G.serie({
      titulo: 'Actividad promedio por día de la semana', tipo: 'barras', formato: 'dec', unidad: 'movimientos por día en promedio', entero: false, alto: 200,
      etiquetas: DIAS_SEMANA, titulos: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      series: [{ nombre: 'Movimientos por día', valores: ac.porDiaSemana.map(function (n, i) { return Math.round(n / Math.max(1, ac.diasPorSemana[i]) * 10) / 10; }), color: 1 }],
      vacio: { titulo: 'Sin actividad en este periodo', texto: 'Aquí verás qué día de la semana se mueve más el Club.' }
    });

    var r = d.retos;
    var retos = '<div class="ap-datos">' +
      '<div class="ap-dato"><dt>Personas con retos</dt><dd>' + esc(num(r.conActividad)) + ' de ' + esc(num(r.personas)) + '</dd></div>' +
      '<div class="ap-dato"><dt>Retos superados</dt><dd>' + esc(num(r.retosSuperados)) + '</dd></div>' +
      '<div class="ap-dato"><dt>XP acumulado</dt><dd>' + esc(num(r.xpTotal)) + '</dd></div>' +
      '<div class="ap-dato"><dt>XP promedio</dt><dd>' + esc(num(r.xpPromedio)) + '</dd></div></div>' +
      '<div class="ap-columnas ap-columnas--interna"><div><h3 class="ap-subtitulo">Cuántas personas tiene cada nivel de XP</h3>' +
      G.serie({ titulo: 'Personas por nivel de XP', tipo: 'barras', unidad: 'personas', alto: 180, etiquetas: r.bandas.map(function (b) { return b.banda + ' XP'; }),
        series: [{ nombre: 'Personas', valores: r.bandas.map(function (b) { return b.n; }), color: 5 }], vacio: { titulo: 'Sin retos jugados', texto: 'Cuando los miembros jueguen aparecerá aquí.' } }) + '</div>' +
      '<div><h3 class="ap-subtitulo">Personas que jugaron por ' + (modo === 'dia' ? 'día' : modo) + '</h3>' +
      (function () { var s = ag(r.actividadPorDia); return G.serie({ titulo: 'Personas que jugaron', tipo: 'area', unidad: 'personas', alto: 180, etiquetas: s.etiquetas, titulos: s.titulos,
        series: [{ nombre: 'Personas que jugaron', valores: s.valores, color: 5 }], vacio: { titulo: 'Nadie jugó en este periodo', texto: 'Cuando alguien juegue un reto aparecerá aquí.' } }); })() + '</div></div>';

    var cohortesGrafica = d.cohortes.length ? G.serie({
      titulo: 'Conversión y retención por mes de registro', tipo: 'barras', formato: 'pct', unidad: '', entero: true, alto: 200,
      etiquetas: d.cohortes.map(function (f) { return P.fmtMes(f.mes).split(' ')[0]; }), titulos: d.cohortes.map(function (f) { return P.fmtMes(f.mes) + ' · ' + num(f.registrados) + ' registros'; }),
      series: [{ nombre: 'Conversión', valores: d.cohortes.map(function (f) { return f.conversion || 0; }), color: 2 }, { nombre: 'Retención', valores: d.cohortes.map(function (f) { return f.retencion || 0; }), color: 1 }],
      vacio: { titulo: 'Sin registros', texto: 'Cuando haya cuentas aparecerán por mes.' }
    }) : '';

    return titulo + barraRango(d, u) + kpis + graficas +
      '<div class="ap-columnas">' + embudoCard +
      card('Cuentas hoy', estados + '<div class="ap-separador"></div>' + planes + '<p class="ap-nota">Retención: ' + esc(d.notas.retencion) + '</p>', 'Cómo se reparten las ' + num(c.total) + ' cuentas.') + '</div>' +
      '<div class="ap-columnas">' +
      card('Cuándo se mueve el Club', mapa + '<p class="ap-nota">' + esc(ac.nota) + '</p>', 'Altas, pruebas, certificados, pagos y retos por día y hora de México. Más oscuro es más actividad.') +
      card('Qué día se mueve más', porDia, ac.horaPico === null ? 'Sin actividad en el periodo.' : 'La hora con más movimiento es ' + ac.horaPico + ':00.') + '</div>' +
      visitas +
      '<div class="ap-columnas">' +
      card('De prueba gratuita a miembro', conversion, 'Cuántas personas que eligieron su curso de prueba terminaron con membresía.') +
      card('Conversión y retención por mes', cohortesGrafica || vacio('Sin registros todavía', 'Cuando haya cuentas nuevas aparecerá cada mes aquí.', 'users'), 'De cada mes de registro: qué parte tuvo membresía y qué parte conserva el acceso.') + '</div>' +
      card('Cohortes por mes de registro', cohortesHTML(d.cohortes) + (d.cohortes.length ? '<div class="ap-acciones-lote"><button type="button" class="ap-btn ap-btn--suave" data-accion="csv-cohortes">' + ico('download', { size: 16 }) + 'Descargar cohortes (CSV)</button></div>' : ''), 'De cada mes: cuántos se registraron, cuántos tuvieron membresía y cuántos tienen acceso hoy.') +
      '<div class="ap-columnas">' +
      card('Cursos más elegidos como prueba', rankingCursos(d.cursos.masElegidos, 'Cursos más elegidos como prueba', 'Nadie ha elegido prueba', 'Cuando alguien elija su curso aparecerá aquí.', 2, d.cursos.totales && d.cursos.totales.elegidos, 'pruebas elegidas'), 'Toda la historia, no solo el periodo.') +
      card('Cursos más completados', rankingCursos(d.cursos.masCompletados, 'Cursos más completados', 'Aún no hay cursos completados', 'Cuando alguien termine un curso aparecerá aquí.', 1, d.cursos.totales && d.cursos.totales.completados, 'cursos terminados'), 'Certificados y cursos terminados.') +
      '</div>' +
      card('Cursos más empezados', rankingCursos(d.cursos.masEmpezados, 'Cursos más empezados', 'Nadie ha empezado un curso', 'El avance de los miembros aparecerá aquí.', 3, d.cursos.totales && d.cursos.totales.empezados, 'personas'), 'Cuántas personas vieron al menos una clase de cada curso.') +
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

  /* ───────── Gráficas de Pruebas gratuitas ─────────
     Todo sale de GET /api/admin/pruebas (embudo, avance, destino y semanas los calcula el servidor con datos reales). Sin datos: estado vacío. */
  function personas(n) { return num(n) + (n === 1 ? ' persona' : ' personas'); }
  function frasePie(texto) { return texto ? '<p class="ap-frase" role="note"><strong>Cómo leerlo:</strong> ' + esc(texto) + '</p>' : ''; }

  function graficasPruebasHTML(d) {
    var t = d.totales;
    var semanas = d.semanas || [];
    var cuentas = semanas.reduce(function (a, x) { return a + x.cuentasNuevas; }, 0);
    var elegidas12 = semanas.reduce(function (a, x) { return a + x.pruebasElegidas; }, 0);
    var graficaSemanas = G.serie({
      titulo: 'Cuentas nuevas y pruebas elegidas por semana', tipo: 'barras', unidad: 'personas por semana', alto: 220,
      etiquetas: semanas.map(function (x) { return P.fmtFecha(x.desde).replace(/ \d{4}$/, ''); }),
      titulos: semanas.map(function (x) { return 'Semana del ' + P.fmtFecha(x.desde); }),
      series: [{ nombre: 'Cuentas nuevas', valores: semanas.map(function (x) { return x.cuentasNuevas; }), color: 2 }, { nombre: 'Pruebas elegidas', valores: semanas.map(function (x) { return x.pruebasElegidas; }), color: 1 }],
      vacio: { titulo: 'Sin movimiento en 12 semanas', texto: 'Cuando alguien cree su cuenta o elija su prueba, aparecerá semana a semana.' }
    });
    var fraseSemanas = cuentas || elegidas12
      ? 'En las últimas 12 semanas se crearon ' + personas(cuentas) + ' y ' + personas(elegidas12) + (elegidas12 === 1 ? ' eligió' : ' eligieron') + ' su curso de prueba' +
        (cuentas ? ' (' + (elegidas12 / cuentas * 10 < 1 ? 'menos de 1' : Math.round(elegidas12 / cuentas * 10)) + ' por cada 10 cuentas nuevas)' : '') + '. Cada par de columnas es una semana.' : '';

    var graficaCurso = G.ranking({
      titulo: 'Curso que eligen para su prueba', unidad: 'pruebas', color: 1, maximo: 6, total: t.elegidas,
      filas: (d.porCurso || []).map(function (c) { return { etiqueta: c.curso, valor: c.elegidas }; }),
      vacio: { titulo: 'Nadie ha elegido todavía', texto: 'Cuando alguien elija su curso de prueba, verás cuáles son los favoritos.' }
    });
    var primero = (d.porCurso || [])[0];
    var fraseCurso = primero && t.elegidas ? 'El curso más elegido es «' + primero.curso + '»: ' + personas(primero.elegidas) + ' (' + Math.round(primero.elegidas / t.elegidas * 100) + ' % de las pruebas).' : '';

    var avance = (d.avance || []).filter(function (x) { return x.clave !== 'sin-clases' || x.valor > 0; });
    var conClases = (d.avance || []).filter(function (x) { return x.clave !== 'sin-clases'; }).reduce(function (a, x) { return a + x.valor; }, 0);
    var graficaAvance = G.barrasH({
      titulo: 'Avance de la prueba', total: t.elegidas, variado: true,
      filas: avance.map(function (x, i) { return { etiqueta: x.etiqueta, valor: x.valor, color: [8, 3, 2, 1, 6][i] || 8 }; }),
      vacio: { titulo: 'Sin pruebas todavía', texto: 'Aquí verás cuánto avanza cada persona en sus clases gratis.' }
    });
    var sinEmpezar = (d.avance || []).filter(function (x) { return x.clave === 'sin-empezar'; })[0];
    var termino = (d.avance || []).filter(function (x) { return x.clave === 'termino'; })[0];
    var fraseAvance = conClases ? 'De ' + personas(conClases) + ' con clases gratis, ' + num(sinEmpezar ? sinEmpezar.valor : 0) + ' todavía no empiezan y ' + num(termino ? termino.valor : 0) + ' ya terminaron.' : '';

    var graficaEmbudo = G.embudo({
      titulo: 'Cuántas personas llegan a la última clase gratis', unidad: 'personas que eligieron su prueba',
      etapas: [
        { etiqueta: 'Eligieron su prueba', valor: (d.embudo || [])[0] ? d.embudo[0].valor : 0, frase: 'eligen su prueba' },
        { etiqueta: 'Empezaron el curso', valor: (d.embudo || [])[1] ? d.embudo[1].valor : 0, frase: 'empiezan el curso' },
        { etiqueta: 'Llegaron a la última clase gratis', valor: (d.embudo || [])[2] ? d.embudo[2].valor : 0, frase: 'llegan a la última clase gratis' }
      ],
      vacio: { titulo: 'Sin pruebas todavía', texto: 'Cuando alguien elija su prueba verás cuántas personas avanzan hasta el final.' }
    });

    var dest = d.destino || { miembros: 0, noMiembros: 0 };
    var graficaDestino = G.anillo({
      titulo: 'Cuántas pagan después', centro: { valor: t.tasaMiembro === null ? '—' : t.tasaMiembro + ' %', rotulo: 'ya son miembros' },
      partes: [{ etiqueta: 'Ya son miembros', valor: dest.miembros, color: 1 }, { etiqueta: 'Todavía no son miembros', valor: dest.noMiembros, color: 8 }],
      vacio: { titulo: 'Sin pruebas todavía', texto: 'Aquí verás cuántas personas se hacen miembros después de su prueba.' }
    });
    var fraseDestino = t.elegidas ? 'De cada 10 personas que eligieron una prueba, ' + (dest.miembros / t.elegidas * 10 < 1 && dest.miembros ? 'menos de 1' : Math.round(dest.miembros / t.elegidas * 10)) + ' ya ' + (Math.round(dest.miembros / t.elegidas * 10) === 1 ? 'es miembro' : 'son miembros') + '.' : '';

    return '<div class="enc-graficas">' +
      card('Cuentas nuevas y pruebas elegidas por semana', graficaSemanas + frasePie(fraseSemanas), 'Doce semanas: cuántas personas crean su cuenta y cuántas eligen su curso de prueba.', 'enc-g enc-g--ancho') +
      card('Curso que eligen para su prueba', graficaCurso + frasePie(fraseCurso), 'Cuántas pruebas eligió cada curso.', 'enc-g') +
      card('Avance de la prueba', graficaAvance + frasePie(fraseAvance), 'Dónde va cada persona dentro de sus clases gratis.', 'enc-g') +
      card('Cuántas personas llegan a la última clase gratis', graficaEmbudo, 'Cada paso cuenta solo a quienes llegaron al anterior.', 'enc-g') +
      card('Cuántas pagan después', graficaDestino + frasePie(fraseDestino), 'Quienes eligieron una prueba y hoy tienen o tuvieron membresía.', 'enc-g') +
      '</div>';
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
    return titulo + kpis + graficasPruebasHTML(d) + card('Detalle por curso', porCurso, 'Cuántas personas eligieron cada curso, cuántas terminaron sus clases gratis y cuántas llegaron a la membresía.') +
      card(pest === 'sin' ? 'Cuentas que aún no eligen su prueba' : 'Quiénes eligieron', cuerpoLista,
        pest === 'sin' ? 'Cuentas sin membresía que todavía pueden elegir su curso gratis.' : 'La prueba abre todas las clases del curso menos la última.') +
      (d.truncado ? '<div class="ap-aviso ap-aviso--info" role="note">' + ico('info', { size: 20 }) + '<div><p>Se muestran las primeras 1,000 pruebas.</p></div></div>' : '');
  }

  /* ───────────────────────── Controladores (solo en el navegador) ───────────────────────── */
  var estadoM = { preset: '30', desde: null, hasta: null, agrupar: null, embudo: 'rango', datos: null };
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
    try { pintarMetricas(); } catch (e) { errorVista('Métricas', e, function () { metricas(true); }); }
  }

  // Descarga un CSV (con marca de orden de bytes para que Excel respete los acentos)
  function descargarCsv(nombre, texto) {
    var blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function pintarMetricas() {
    var u = V.util; var v = u.vista();
    var y = typeof window !== 'undefined' ? window.scrollY : 0;
    v.innerHTML = metricasHTML(estadoM.datos, estadoM);
    G.activar(v);
    if (y && typeof window !== 'undefined') window.scrollTo(0, y);
    v.onclick = function (ev) {
      var r = ev.target.closest('[data-rango]');
      if (r) { estadoM.preset = r.dataset.rango; estadoM.agrupar = null; metricas(false); return; }
      var g = ev.target.closest('[data-agrupar]');
      if (g) { estadoM.agrupar = g.dataset.agrupar; pintarMetricas(); return; }
      var em = ev.target.closest('[data-embudo]');
      if (em) { estadoM.embudo = em.dataset.embudo; pintarMetricas(); return; }
      u.acciones(ev, {
        recargar: function () { metricas(true); },
        csv: function () { descargarCsv('metricas-zoorigen-' + estadoM.datos.rango.desde + '-a-' + estadoM.datos.rango.hasta + '.csv', csvHistorial(estadoM.datos)); },
        'csv-cohortes': function () { descargarCsv('cohortes-zoorigen-' + hoyMx() + '.csv', csvCohortes(estadoM.datos.cohortes)); }
      });
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
    G.activar(v);
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
    agruparAuto: agruparAuto, modoDe: modoDe, metricasHTML: metricasHTML, cohortesHTML: cohortesHTML, barraRango: barraRango, csvHistorial: csvHistorial, csvCohortes: csvCohortes,
    FILTROS_PRUEBAS: FILTROS_PRUEBAS, filtrarPruebas: filtrarPruebas, pruebasHTML: pruebasHTML, graficasPruebasHTML: graficasPruebasHTML, tablaPruebas: tablaPruebas, filaPrueba: filaPrueba,
    metricas: metricas, pruebas: pruebas
  };
});
