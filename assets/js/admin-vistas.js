/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · VISTAS                              */
/* Dibuja las secciones nuevas (Resumen, Miembros, Suscripciones,*/
/* Retos, Foro y directorio, Referidos,                         */
/* Configuración y Estado) con los datos que entrega el          */
/* servidor (GET /api/admin/*). Nunca lee Firestore directo y    */
/* nunca inventa cifras: sin datos, muestra un vacío amable.     */
/* Todo texto que viene del servidor pasa por esc().             */
/* ============================================================ */
(function (root) {
  'use strict';

  var P = root.ZOO_ADMIN_PANEL;
  var I = root.ZOO_ICONOS;
  var F = root.ZOO_ADMIN_FILAS;
  var G = root.ZOO_ADMIN_GRAFICAS;
  var C = root.ZOO_ADMIN_CONFIG;
  var esc = P.esc;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };

  var ctx = null;               // { api, toast, contenedor, irA, zonaModal }
  var estado = { miembros: null, resumen: null, filtro: 'todos', texto: '', orden: 'vence', visibles: 25 };
  var contador = 0;             // descarta respuestas de una sección que ya no está a la vista

  function iniciar(contexto) { ctx = contexto; }
  function vista() { return ctx.contenedor(); }

  /* ───────── Piezas comunes ───────── */
  function cargando(titulo) {
    return P.tarjetaTitulo({ titulo: titulo, sub: 'Cargando los datos reales del servidor…' }) +
      '<div class="ap-esqueleto" role="status" aria-live="polite"><span class="sr-only">Cargando</span>' +
      '<div class="ap-esqueleto__fila"></div><div class="ap-esqueleto__fila"></div><div class="ap-esqueleto__fila"></div></div>';
  }

  function errorHTML(titulo, e, reintento) {
    var sinPermiso = e && (e.status === 401 || e.status === 403);
    var sinRed = e && e.status === 0;
    var texto = sinPermiso ? 'Tu cuenta no tiene permiso para ver esta sección. Inicia sesión de nuevo con una cuenta de administración.'
      : sinRed ? 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
      : (e && e.message) || 'No se pudieron cargar los datos. Inténtalo de nuevo en un momento.';
    return P.tarjetaTitulo({ titulo: titulo, sub: 'No pudimos cargar esta sección.' }) +
      '<div class="ap-aviso ap-aviso--error" role="alert">' + ico('circle-alert', { size: 20 }) +
      '<div><strong>Algo salió mal</strong><p>' + esc(texto) + '</p>' +
      (reintento ? '<button type="button" class="ap-btn ap-btn--suave" data-accion="' + esc(reintento) + '">' + ico('refresh-cw', { size: 16 }) + 'Reintentar</button>' : '') +
      '</div></div>';
  }

  function vacio(titulo, texto, icono) {
    return '<div class="zs-vacio ap-vacio">' + ico(icono || 'search-x', { size: 28 }) + '<strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></div>';
  }

  function kpi(o) {
    return '<article class="ap-kpi ap-tono-' + esc(o.tono || 'neutro') + '">' +
      '<span class="ap-kpi__ico">' + ico(o.icono, { size: 20 }) + '</span>' +
      '<div class="ap-kpi__txt"><p class="ap-kpi__rot">' + esc(o.rotulo) + '</p>' +
      '<p class="ap-kpi__val">' + (o.valor === null || o.valor === undefined ? '<span class="ap-kpi__nd">Sin datos</span>' : esc(o.valor)) + '</p>' +
      (o.nota ? '<p class="ap-kpi__nota">' + esc(o.nota) + '</p>' : '') +
      (o.spark ? '<div class="ap-kpi__spark">' + o.spark + '</div>' : '') + '</div></article>';
  }

  function tarjeta(titulo, cuerpo, o) {
    var op = o || {};
    return '<section class="ap-card' + (op.clase ? ' ' + op.clase : '') + '"' + (op.id ? ' id="' + esc(op.id) + '"' : '') + '>' +
      '<header class="ap-card__cab"><h2>' + esc(titulo) + '</h2>' + (op.nota ? '<p>' + esc(op.nota) + '</p>' : '') + '</header>' +
      '<div class="ap-card__cuerpo">' + cuerpo + '</div></section>';
  }

  // Toda tabla va dentro de .ap-tabla-zona: el CONTENEDOR (no la ventana) decide si se ve como tabla o como tarjetas apiladas.
  function tablaZona(tabla) { return '<div class="ap-tabla-zona"><div class="ap-tabla-envoltura">' + tabla + '</div></div>'; }

  // Fila de persona con su vencimiento (Resumen y Suscripciones): título = nombre, línea pequeña, vence a la derecha y ficha al tocar.
  function filaPersonaVence(m, nota) {
    var vence = m.vence ? '<span class="ap-fc__v"><span class="sr-only">Vence </span>' + esc(P.fmtFecha(m.vence)) + '</span><span class="ap-fc__s">' + esc(P.relativo(m.vence)) + '</span>' : '<span class="ap-fc__v">—</span>';
    return F.fila({
      avatar: '<span class="ap-avatar ap-avatar--' + esc(m.estado || 'activo') + '" aria-hidden="true">' + esc(P.iniciales(m.nombre || m.correo)) + '</span>',
      titulo: m.nombre || 'Sin nombre', accion: { a: 'ficha', datos: { uid: m.uid } },
      meta: '<span class="ap-fc__correo">' + esc(nota || m.correo || '—') + '</span>',
      metaChico: m.vence ? '<span class="ap-fc__sep"> · </span>Vence ' + esc(P.fmtFecha(m.vence)) : '',
      cols: [{ html: vence }], chevron: true
    });
  }

  function acciones(e, mapa) {
    var b = e.target.closest('[data-accion]');
    if (b && mapa[b.dataset.accion]) { e.preventDefault(); mapa[b.dataset.accion](b); }
  }

  /* ───────── Ventana emergente accesible ───────── */
  // Devuelve una promesa con el id del botón elegido (o null si se cierra). El foco vuelve a quien la abrió.
  function modal(o) {
    return new Promise(function (resolver) {
      var previo = document.activeElement;
      var fondo = document.createElement('div');
      fondo.className = 'ap-modal-fondo';
      var botones = (o.botones || [{ id: 'cerrar', texto: 'Cerrar' }]).map(function (b) {
        return '<button type="button" class="ap-btn ap-btn--' + esc(b.tipo || 'suave') + '" data-modal="' + esc(b.id) + '">' + esc(b.texto) + '</button>';
      }).join('');
      var idTitulo = 'apModalTitulo' + (++contador);
      fondo.innerHTML = '<div class="ap-modal' + (o.ancho ? ' ap-modal--' + esc(o.ancho) : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + idTitulo + '">' +
        '<header class="ap-modal__cab"><h2 id="' + idTitulo + '">' + esc(o.titulo) + '</h2>' +
        '<button type="button" class="ap-icono" data-modal="cerrar" aria-label="Cerrar">' + ico('x', { size: 20 }) + '</button></header>' +
        '<div class="ap-modal__cuerpo">' + o.cuerpo + '</div>' +
        (botones ? '<footer class="ap-modal__pie">' + botones + '</footer>' : '') + '</div>';
      document.body.appendChild(fondo);
      document.body.classList.add('ap-sin-scroll');
      var caja = fondo.firstElementChild;

      function cerrar(valor) {
        document.removeEventListener('keydown', teclas, true);
        fondo.remove();
        if (!document.querySelector('.ap-modal-fondo')) document.body.classList.remove('ap-sin-scroll');
        if (previo && previo.focus) { try { previo.focus(); } catch (e) { /* ya no existe */ } }
        resolver(valor);
      }
      function teclas(ev) {
        if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(null); return; }
        if (ev.key !== 'Tab') return;
        var f = caja.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        var primero = f[0]; var ultimo = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
        else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
      }
      document.addEventListener('keydown', teclas, true);
      fondo.addEventListener('mousedown', function (ev) { if (ev.target === fondo) cerrar(null); });
      fondo.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-modal]');
        if (!b) return;
        var id = b.dataset.modal;
        if (id === 'cerrar') return cerrar(null);
        if (o.alElegir) { Promise.resolve(o.alElegir(id, caja, cerrar)).catch(function () { /* el mensaje lo muestra alElegir */ }); return; }
        cerrar(id);
      });
      if (o.alAbrir) o.alAbrir(caja);
      var foco = caja.querySelector('[data-foco]') || caja.querySelector('input,select,textarea,button[data-modal]:not(.ap-icono)') || caja.querySelector('button');
      if (foco) foco.focus();
    });
  }

  function confirmar(o) {
    return modal({
      titulo: o.titulo,
      cuerpo: '<p class="ap-modal__texto">' + o.texto + '</p>',
      botones: [{ id: 'no', texto: o.cancelar || 'Mejor no', tipo: 'suave' }, { id: 'si', texto: o.aceptar, tipo: o.peligro ? 'peligro' : 'primario' }]
    }).then(function (r) { return r === 'si'; });
  }

  /* ───────── Datos compartidos ───────── */
  async function cargarMiembros(forzar) {
    var ruta = '/api/admin/miembros' + (forzar ? '?refrescar=1' : '');
    var r = await ctx.api(ruta);
    estado.miembros = r;
    return r;
  }

  /* ───────── RESUMEN ───────── */
  async function resumen(forzar) {
    var mi = ++contador;
    vista().innerHTML = cargando('Resumen');
    var r;
    try { r = await ctx.api('/api/admin/resumen' + (forzar ? '?refrescar=1' : '')); } catch (e) {
      if (mi !== contador) return;
      vista().innerHTML = errorHTML('Resumen', e, 'recargar');
      return;
    }
    if (mi !== contador) return;
    estado.resumen = r;
    var k = r.kpis;
    var titulo = P.tarjetaTitulo({
      icono: 'chart-column', eyebrow: 'Panel de administración', titulo: 'Todo el Club,', acento: 'de un vistazo.',
      sub: 'Miembros, membresías, ingresos estimados y actividad reciente. Son datos reales del servidor, sin cifras de ejemplo.',
      cifras: [
        { valor: P.fmtNum(k.miembros), rotulo: 'miembros' },
        { valor: P.fmtNum(k.activos), rotulo: 'membresías activas' },
        { valor: P.fmtNum(k.vencenPronto), rotulo: 'vencen en 7 días' }
      ],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    });

    if (!k.miembros) {
      vista().innerHTML = titulo + vacio('Todavía no hay miembros', 'Cuando alguien cree su cuenta aparecerá aquí con su estado y su plan.', 'users');
      return;
    }

    var tarjetas = '<div class="ap-kpis">' + [
      kpi({ icono: 'users', rotulo: 'Miembros totales', valor: P.fmtNum(k.miembros), nota: k.administradores ? P.fmtNum(k.administradores) + ' de administración' : 'Cuentas registradas', tono: 'info' }),
      kpi({ icono: 'badge-check', rotulo: 'Membresías activas', valor: P.fmtNum(k.activos), nota: k.cancelados ? P.fmtNum(k.cancelados) + ' ya cancelaron y siguen con acceso' : 'Con acceso hoy', tono: 'ok' }),
      kpi({ icono: 'user-plus', rotulo: 'Nuevos esta semana', valor: P.fmtNum(k.nuevosSemana), nota: 'Registros de los últimos 7 días', tono: 'info', spark: G.sparkline(r.altasSemanales.map(function (s) { return s.n; }), { color: 2 }) }),
      kpi({ icono: 'calendar-clock', rotulo: 'Vencen pronto', valor: P.fmtNum(k.vencenPronto), nota: 'En los próximos 7 días', tono: k.vencenPronto ? 'aviso' : 'neutro' }),
      kpi({ icono: 'credit-card', rotulo: 'Ingresos estimados del mes', valor: k.ingresosMesEstimado === null ? null : '$' + P.fmtNum(k.ingresosMesEstimado), nota: k.ingresosMesEstimado === null ? 'Aún no hay pagos registrados' : 'MXN · ' + P.fmtNum(k.pagosMes) + ' pagos · estimación', tono: 'ok', spark: G.sparkline(r.ingresosMensuales.map(function (m) { return m.estimado; }), { color: 1 }) }),
      kpi({ icono: 'award', rotulo: 'Certificados emitidos', valor: P.fmtNum(k.certificadosEmitidos), nota: 'Con folio verificable', tono: 'info' }),
      kpi({ icono: 'graduation-cap', rotulo: 'Cursos completados', valor: P.fmtNum(k.cursosCompletados), nota: 'Terminados en la plataforma', tono: 'ok' }),
      kpi({ icono: 'triangle-alert', rotulo: 'Pago pendiente', valor: P.fmtNum(k.pagoPendiente), nota: k.vencidos ? P.fmtNum(k.vencidos) + ' vencidos' : 'Sin vencidos', tono: k.pagoPendiente ? 'error' : 'neutro' })
    ].join('') + '</div>';

    var altas = G.serie({
      titulo: 'Altas por semana', tipo: 'area', unidad: 'cuentas nuevas en 12 semanas', alto: 220,
      etiquetas: r.altasSemanales.map(function (x) { return P.fmtFecha(x.desde).replace(/ \d{4}$/, ''); }),
      titulos: r.altasSemanales.map(function (x) { return 'Semana del ' + P.fmtFecha(x.desde); }),
      series: [{ nombre: 'Cuentas nuevas', valores: r.altasSemanales.map(function (x) { return x.n; }), color: 1 }],
      vacio: { titulo: 'Sin altas en 12 semanas', texto: 'Cuando alguien cree su cuenta aparecerá aquí.' }
    });
    var ingresos = G.serie({
      titulo: 'Ingresos estimados por mes', tipo: 'barras', formato: 'mxn', unidad: 'estimados en 6 meses', alto: 220,
      etiquetas: r.ingresosMensuales.map(function (m) { return P.fmtMes(m.mes).split(' ')[0]; }),
      titulos: r.ingresosMensuales.map(function (m) { return P.fmtMes(m.mes) + ' · ' + P.fmtNum(m.pagos) + ' pagos'; }),
      series: [{ nombre: 'Ingresos estimados (MXN)', valores: r.ingresosMensuales.map(function (m) { return m.estimado; }), color: 3 }],
      vacio: { titulo: 'Sin pagos registrados', texto: 'Cuando haya pagos aparecerá la estimación de cada mes.' }
    });

    var estados = G.anillo({
      titulo: 'Estado de las cuentas', centro: { valor: P.fmtNum(k.miembros), rotulo: 'cuentas' },
      partes: [
        { etiqueta: 'Activos', valor: r.porEstado.activo, color: 1 },
        { etiqueta: 'Cancelados con acceso', valor: r.porEstado['cancelado-vigente'], color: 3 },
        { etiqueta: 'Pago pendiente', valor: r.porEstado['pago-pendiente'], color: 4 },
        { etiqueta: 'Vencidos', valor: r.porEstado.vencido, color: 8 },
        { etiqueta: 'Sin membresía', valor: r.porEstado['sin-plan'], color: 2 }
      ]
    });

    var venc = r.proximosVencimientos.length
      ? F.lista(r.proximosVencimientos.map(function (v) { return filaPersonaVence(v); }), { etiqueta: 'Próximos vencimientos' })
      : vacio('Nadie vence esta semana', 'Cuando una membresía esté por vencer, aparecerá aquí.', 'calendar-clock');

    var act = r.actividadReciente.length
      ? '<ol class="ap-linea-tiempo">' + r.actividadReciente.map(function (a) {
        var icono = a.tipo === 'registro' ? 'user-plus' : a.tipo === 'pago' ? 'credit-card' : a.tipo === 'certificado' ? 'award' : 'shield-check';
        return '<li><span class="ap-linea-tiempo__ico">' + ico(icono, { size: 16 }) + '</span><div><p>' + esc(a.texto) + '</p><time datetime="' + esc(a.en) + '">' + esc(P.fmtFecha(a.en)) + ' · ' + esc(P.relativo(a.en)) + '</time></div></li>';
      }).join('') + '</ol>'
      : vacio('Sin actividad reciente', 'Los registros, pagos y certificados nuevos aparecerán aquí.', 'activity');

    vista().innerHTML = titulo + tarjetas +
      (r.truncado ? '<div class="ap-aviso ap-aviso--info" role="note">' + ico('info', { size: 20 }) + '<div><p>Hay más de 5,000 cuentas: las cifras usan las primeras 5,000.</p></div></div>' : '') +
      '<div class="ap-columnas">' +
      tarjeta('Altas por semana', altas, { nota: 'Personas que crearon su cuenta, semana a semana.' }) +
      tarjeta('Ingresos estimados por mes', ingresos, { nota: r.notas.ingresos }) +
      '</div><div class="ap-columnas">' +
      tarjeta('Estado de las cuentas', estados, { nota: 'Cómo se reparten hoy los ' + P.fmtNum(k.miembros) + ' miembros.' }) +
      tarjeta('Próximos vencimientos', venc, { nota: 'Quienes vencen en los próximos 7 días.' }) +
      '</div>' + tarjeta('Actividad reciente', act, { nota: 'Registros, pagos, certificados y acciones del equipo.' });
    G.activar(vista());
    vista().onclick = function (e) {
      acciones(e, {
        recargar: function () { resumen(true); },
        ficha: function (b) { abrirFicha(b.dataset.uid); }
      });
    };
  }

  /* ───────── MIEMBROS ───────── */
  function planTexto(m) {
    var plan = m.planTipo === 'anual' ? 'Anual' : m.planTipo === 'mensual' ? 'Mensual' : '';
    var origen = P.ORIGENES[m.origen] && m.origen !== 'ninguno' ? P.ORIGENES[m.origen] : '';
    return [plan, origen].filter(Boolean).join(' · ');
  }

  // Acciones del menú «…» de cada miembro. Las cuentas de administración solo tienen «Ver ficha» (no se regalan ni se eliminan).
  function accionesMiembro(m) {
    var a = [{ t: 'Ver ficha', i: 'eye', a: 'ficha' }];
    if (m.esAdmin) return a;
    a.push({ t: m.conAcceso ? 'Ampliar membresía' : 'Activar membresía', i: m.conAcceso ? 'calendar-plus' : 'badge-check', a: 'activar' });
    a.push({ t: 'Regalar 1 mes o 1 año', i: 'gift', a: 'regalar' });
    if (m.conAcceso && m.estado !== 'cancelado-vigente') a.push({ t: 'Cancelar membresía', i: 'ban', a: 'cancelar' });
    a.push({ t: 'Eliminar miembro', i: 'trash-2', a: 'eliminar', p: true, sep: true });
    return a;
  }

  function filaMiembro(m) {
    var pronto = m.conAcceso && m.vence && (new Date(m.vence).getTime() - Date.now()) < 7 * 86400000;
    var vence = m.vence
      ? '<span class="ap-fc__v"><span class="sr-only">Vence </span>' + esc(P.fmtFecha(m.vence)) + '</span><span class="ap-fc__s' + (pronto ? ' ap-fc__s--aviso' : '') + '">' + esc(P.relativo(m.vence)) + '</span>'
      : '<span class="ap-fc__v">—</span>';
    return F.fila({
      avatar: '<span class="ap-avatar ap-avatar--' + esc(m.estado) + '" aria-hidden="true">' + esc(P.iniciales(m.nombre || m.correo)) + '</span>',
      titulo: m.nombre || 'Sin nombre', etiqueta: m.esAdmin ? 'Admin' : '',
      accion: { a: 'ficha', datos: { uid: m.uid } },
      meta: '<span class="ap-fc__correo">' + ico('mail', { size: 12 }) + '<span class="ap-correo">' + esc(m.correo || '—') + '</span></span>' +
        (m.registro ? '<span class="ap-fc__reg"> · Registro ' + esc(P.fmtFecha(m.registro)) + '</span>' : ''),
      metaChico: m.vence ? '<span class="ap-fc__sep"> · </span>Vence ' + esc(P.fmtFecha(m.vence)) : '',
      cols: [{ html: vence }],
      estado: P.insignia(m.estado) + (planTexto(m) ? '<span class="ap-fc__s">' + esc(planTexto(m)) + '</span>' : ''),
      acciones: accionesMiembro(m), etiquetaMenu: 'Acciones de ' + (m.nombre || m.correo || 'este miembro'), datos: { uid: m.uid },
      atributos: { uid: m.uid }
    });
  }

  function pintarListaMiembros() {
    var cont = document.getElementById('apMiembrosLista');
    if (!cont) return;
    var lista = P.ordenarMiembros(P.filtrarMiembros(estado.miembros.miembros, { filtro: estado.filtro, texto: estado.texto }), estado.orden);
    var conteo = P.contarPorFiltro(estado.miembros.miembros);
    document.getElementById('apMiembrosChips').innerHTML = P.FILTROS.map(function (f) {
      return '<button type="button" class="zs-chip" data-filtro="' + f.id + '" aria-pressed="' + (f.id === estado.filtro) + '">' + esc(f.texto) + ' · ' + P.fmtNum(conteo[f.id]) + '</button>';
    }).join('');
    if (!lista.length) {
      cont.innerHTML = vacio(estado.texto || estado.filtro !== 'todos' ? 'Nadie coincide con ese filtro' : 'Todavía no hay miembros', estado.texto ? 'Prueba con otro nombre o correo, o quita el filtro.' : 'Cambia el filtro para ver a las demás personas.', 'search-x');
      return;
    }
    var mostrar = lista.slice(0, estado.visibles);
    cont.innerHTML = F.lista(mostrar.map(filaMiembro), { cab: { principal: 'Miembro', cols: ['Vence'], estado: 'Estado' }, etiqueta: 'Miembros' }) +
      '<p class="ap-pie-tabla" role="status">Mostrando ' + P.fmtNum(mostrar.length) + ' de ' + P.fmtNum(lista.length) + '</p>' +
      (lista.length > mostrar.length ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="mas">Mostrar ' + Math.min(25, lista.length - mostrar.length) + ' más</button>' : '');
  }

  async function miembros(forzar) {
    var mi = ++contador;
    vista().innerHTML = cargando('Miembros');
    var r;
    try { r = await cargarMiembros(forzar); } catch (e) {
      if (mi !== contador) return;
      vista().innerHTML = errorHTML('Miembros', e, 'recargar');
      vista().onclick = function (ev) { acciones(ev, { recargar: function () { miembros(true); } }); };
      return;
    }
    if (mi !== contador) return;
    var conteo = P.contarPorFiltro(r.miembros);
    estado.visibles = 25;
    vista().innerHTML = P.tarjetaTitulo({
      icono: 'users', eyebrow: 'Panel de administración', titulo: 'Quién forma', acento: 'el Club.',
      sub: 'Busca a una persona, revisa el estado de su plan y entra a su ficha. Aquí ves solo lo necesario para administrar.',
      cifras: [
        { valor: P.fmtNum(conteo.todos), rotulo: 'miembros' },
        { valor: P.fmtNum(conteo.activo + conteo['cancelado-vigente']), rotulo: 'con acceso hoy' },
        { valor: P.fmtNum(conteo['pago-pendiente'] + conteo.vencido), rotulo: 'vencidos o con pago pendiente' }
      ],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }, { id: 'eliminados', texto: 'Eliminados', icono: 'archive-restore' }]
    }) +
      '<div class="ap-controles"><div class="zs-chips" id="apMiembrosChips" role="group" aria-label="Filtrar por estado del plan"></div>' +
      '<div class="ap-controles__der"><label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar por nombre o correo</span>' +
      '<input type="search" id="apBuscar" placeholder="Buscar persona o correo" autocomplete="off" value="' + esc(estado.texto) + '"></label>' +
      '<label class="ap-orden"><span class="sr-only">Ordenar</span><select id="apOrden">' + P.ORDENES.map(function (o) {
        return '<option value="' + o.id + '"' + (o.id === estado.orden ? ' selected' : '') + '>' + esc(o.texto) + '</option>';
      }).join('') + '</select></label></div></div>' +
      '<div id="apMiembrosLista"></div>';
    pintarListaMiembros();
    document.getElementById('apBuscar').addEventListener('input', function (e) { estado.texto = e.target.value; estado.visibles = 25; pintarListaMiembros(); });
    document.getElementById('apOrden').addEventListener('change', function (e) { estado.orden = e.target.value; pintarListaMiembros(); });
    vista().onclick = function (e) {
      var chip = e.target.closest('[data-filtro]');
      if (chip) { estado.filtro = chip.dataset.filtro; estado.visibles = 25; pintarListaMiembros(); return; }
      acciones(e, {
        recargar: function () { miembros(true); },
        mas: function () { estado.visibles += 25; pintarListaMiembros(); },
        ficha: function (b) { abrirFicha(b.dataset.uid); },
        activar: function (b) { abrirActivar(b.dataset.uid); },
        cancelar: function (b) { abrirCancelar(b.dataset.uid); },
        regalar: function (b) { abrirRegalar(b.dataset.uid); },
        eliminar: function (b) { abrirEliminar(b.dataset.uid); },
        eliminados: function () { abrirEliminados(); }
      });
    };
  }

  // La lista de la sección o, si se llegó desde otra sección (Pruebas gratuitas, Resumen...), la ficha recién abierta.
  function miembroLocal(uid) {
    var l = estado.miembros && estado.miembros.miembros;
    var local = (l || []).filter(function (m) { return m.uid === uid; })[0];
    if (local) return local;
    return estado.fichaActual && estado.fichaActual.uid === uid ? estado.fichaActual : null;
  }

  async function abrirFicha(uid) {
    var r;
    try { r = await ctx.api('/api/admin/miembros/' + encodeURIComponent(uid)); } catch (e) {
      ctx.toast(e.status === 404 ? 'No encontramos a esa persona.' : (e.message || 'No se pudo abrir la ficha.'), true);
      return;
    }
    var m = r.miembro;
    estado.fichaActual = m;
    var dato = function (t, v) { return '<div class="ap-dato"><dt>' + esc(t) + '</dt><dd>' + v + '</dd></div>'; };
    var progreso = r.progreso.length
      ? '<ul class="ap-progreso">' + r.progreso.map(function (p) {
        return '<li><span class="ap-progreso__t">' + esc(p.curso) + '</span><span class="ap-progreso__e">' + (p.completado ? P.insignia('activo').replace('Activo', 'Completado') : '<span class="ap-badge ap-badge--neutro">' + ico('clock', { size: 14 }) + '<span>' + P.fmtNum(p.clasesVistas) + ' clases vistas</span></span>') + '</span></li>';
      }).join('') + '</ul>'
      : '<p class="ap-nada">Todavía no ha empezado ningún curso.</p>';
    var certs = r.certificados.length
      ? '<ul class="ap-progreso">' + r.certificados.map(function (c) {
        return '<li><span class="ap-progreso__t">' + esc(c.curso) + '<small>' + esc(c.folio) + '</small></span><span class="ap-progreso__e">' + esc(P.fmtFecha(c.emitido)) + '</span></li>';
      }).join('') + '</ul>'
      : '<p class="ap-nada">Sin certificados.</p>';
    var cuerpo = '<div class="ap-ficha">' +
      '<div class="ap-ficha__cab"><span class="ap-avatar ap-avatar--grande ap-avatar--' + esc(m.estado) + '" aria-hidden="true">' + esc(P.iniciales(m.nombre || m.correo)) + '</span>' +
      '<div><strong>' + esc(m.nombre || 'Sin nombre') + '</strong><span class="ap-correo">' + esc(m.correo || '—') + '</span>' + P.insignia(m.estado) + '</div></div>' +
      '<dl class="ap-datos">' +
      dato('Plan', esc(planTexto(m) || 'Sin plan')) +
      dato('Vence', m.vence ? esc(P.fmtFecha(m.vence)) + ' · ' + esc(P.relativo(m.vence)) : '—') +
      dato('Último pago', esc(P.fmtFecha(m.ultimoPago))) +
      dato('Registro', esc(P.fmtFecha(m.registro))) +
      dato('Teléfono', esc(m.telefono || '—')) +
      dato('Racha', esc(P.fmtNum(m.racha)) + ' días') +
      (m.activadoPor ? dato('Activado por', esc(m.activadoPor) + (m.metodoPago ? ' · ' + esc(m.metodoPago) : '') + (m.montoManual ? ' · ' + esc(P.fmtMxn(m.montoManual)) : '')) : '') +
      '</dl>' +
      '<h3>Progreso por curso</h3>' + progreso +
      '<h3>Certificados</h3>' + certs +
      '<h3>Comunidad</h3><dl class="ap-datos">' +
      dato('Invitados', esc(P.fmtNum(r.referidos.total)) + ' (' + esc(P.fmtNum(r.referidos.validos)) + ' válidos)') +
      dato('Retos superados', esc(P.fmtNum(r.retos.superados))) +
      dato('XP de retos', esc(P.fmtNum(r.retos.xp))) +
      '</dl></div>';
    var botones = [{ id: 'cerrar', texto: 'Cerrar', tipo: 'suave' }];
    if (!m.esAdmin) {
      botones.push({ id: 'eliminar', texto: 'Eliminar', tipo: 'peligro' });
      botones.push({ id: 'regalar', texto: 'Regalar tiempo', tipo: 'suave' });
      botones.push({ id: 'activar', texto: m.conAcceso ? 'Ampliar plan' : 'Activar plan', tipo: 'primario' });
    }
    var elegido = await modal({ titulo: 'Ficha del miembro', cuerpo: cuerpo, botones: botones, ancho: 'ancho' });
    if (elegido === 'activar') abrirActivar(uid);
    else if (elegido === 'regalar') abrirRegalar(uid);
    else if (elegido === 'eliminar') abrirEliminar(uid);
  }

  async function abrirActivar(uid) {
    var m = miembroLocal(uid) || { nombre: '', correo: '' };
    var cuerpo = '<p class="ap-modal__texto">Activarás o ampliarás la membresía de <strong>' + esc(m.nombre || m.correo || 'esta persona') + '</strong>. ' +
      'Úsalo cuando el pago se hizo fuera de Stripe (transferencia, efectivo o cortesía).</p>' +
      '<div class="ap-campo"><label for="apTipo">Tipo de plan</label><select id="apTipo" data-foco>' +
      '<option value="mensual">Mensual · 30 días</option><option value="anual">Anual · 365 días</option><option value="custom">Personalizado (elige los días)</option></select></div>' +
      '<div class="ap-campo" id="apDiasCampo" hidden><label for="apDias">Días de acceso</label><input type="number" id="apDias" min="1" max="3650" value="30" inputmode="numeric"></div>' +
      '<div class="ap-campo"><label for="apMetodo">Método de pago <small>(opcional, para tu registro)</small></label><input type="text" id="apMetodo" maxlength="60" placeholder="Transferencia, efectivo, cortesía…"></div>' +
      '<div class="ap-campo"><label for="apMonto">Monto cobrado en MXN <small>(opcional)</small></label><input type="text" id="apMonto" inputmode="decimal" placeholder="Por ejemplo 199"></div>' +
      '<p class="ap-error" id="apActError" role="alert" hidden></p>';
    var hecho = await modal({
      titulo: 'Activar membresía a mano', cuerpo: cuerpo,
      alAbrir: function (caja) {
        var tipoSel = caja.querySelector('#apTipo'); var campo = caja.querySelector('#apDiasCampo');
        tipoSel.addEventListener('change', function () { campo.hidden = tipoSel.value !== 'custom'; });
      },
      botones: [{ id: 'cerrar', texto: 'Cancelar', tipo: 'suave' }, { id: 'guardar', texto: 'Activar ahora', tipo: 'primario' }],
      alElegir: async function (id, caja, cerrar) {
        if (id !== 'guardar') return cerrar(null);
        var tipo = caja.querySelector('#apTipo').value;
        var cuerpoPeticion = { tipo: tipo, metodo: caja.querySelector('#apMetodo').value, monto: caja.querySelector('#apMonto').value };
        if (tipo === 'custom') cuerpoPeticion.dias = caja.querySelector('#apDias').value;
        var err = caja.querySelector('#apActError');
        var boton = caja.querySelector('[data-modal="guardar"]');
        boton.disabled = true; err.hidden = true;
        try {
          var r = await ctx.api('/api/admin/miembros/' + encodeURIComponent(uid) + '/activar', { method: 'POST', body: cuerpoPeticion });
          cerrar(r);
        } catch (e) {
          err.textContent = e.message || 'No se pudo activar la membresía.';
          err.hidden = false; boton.disabled = false;
        }
      }
    });
    if (hecho && hecho.ok) {
      ctx.toast('Membresía ' + hecho.planTipo + ' activada por ' + hecho.dias + ' días.');
      await miembros(true);
    }
  }

  async function abrirCancelar(uid) {
    var m = miembroLocal(uid) || { nombre: '', correo: '' };
    var ok = await confirmar({
      titulo: 'Cancelar membresía',
      texto: '¿Cancelar la membresía de <strong>' + esc(m.nombre || m.correo || 'esta persona') + '</strong>? Conservará el acceso hasta su fecha de vencimiento. ' +
        'Si paga con Stripe, la suscripción se cancela además desde el panel de Stripe.',
      aceptar: 'Sí, cancelar membresía', cancelar: 'Mejor no', peligro: true
    });
    if (!ok) return;
    try {
      await ctx.api('/api/admin/miembros/' + encodeURIComponent(uid) + '/cancelar', { method: 'POST' });
      ctx.toast('Membresía cancelada. Conserva el acceso hasta su vencimiento.');
      await miembros(true);
    } catch (e) { ctx.toast(e.message || 'No se pudo cancelar.', true); }
  }

  /* ───────── REGALAR, ELIMINAR Y RESTAURAR ───────── */
  // Recarga la tabla de Miembros solo si es la que se está viendo.
  function recargarSiMiembros() { if (document.getElementById('apMiembrosLista')) return miembros(true); }

  async function abrirRegalar(uid) {
    var m = miembroLocal(uid) || { nombre: '', correo: '' };
    var base = m.conAcceso && m.vence && new Date(m.vence).getTime() > Date.now() ? new Date(m.vence) : new Date();
    var vence = function (dias) { return P.fmtFecha(new Date(base.getTime() + dias * 86400000).toISOString()); };
    var cuerpo = '<p class="ap-modal__texto">Le regalarás tiempo de acceso a <strong>' + esc(m.nombre || m.correo || 'esta persona') + '</strong>. ' +
      (base.getTime() > Date.now() + 60000 ? 'Se suma a su vencimiento actual (' + esc(P.fmtFecha(base.toISOString())) + ').' : 'Empieza hoy porque ahora no tiene acceso vigente.') +
      ' No cuenta como pago y no toca Stripe.</p>' +
      (m.stripeActiva ? '<div class="ap-aviso ap-aviso--error" role="note">' + ico('triangle-alert', { size: 20 }) + '<div><strong>Sigue cobrándose en Stripe</strong><p>Esta persona tiene una suscripción de Stripe activa. El regalo no la detiene y, en su próximo cobro, Stripe vuelve a fijar la fecha de vencimiento.</p></div></div>' : '') +
      '<div class="ap-opciones" role="group" aria-label="Duración del regalo">' +
      '<button type="button" class="ap-opcion" data-opcion="30" aria-pressed="true"><strong>1 mes</strong><span>30 días · hasta el ' + esc(vence(30)) + '</span></button>' +
      '<button type="button" class="ap-opcion" data-opcion="365" aria-pressed="false"><strong>1 año</strong><span>365 días · hasta el ' + esc(vence(365)) + '</span></button></div>' +
      '<div class="ap-campo"><label for="apRegaloNota">Nota <small>(opcional, solo para tu registro)</small></label><textarea id="apRegaloNota" maxlength="200" placeholder="Por ejemplo: cortesía por su ayuda en el foro"></textarea></div>' +
      '<p class="ap-error" id="apRegaloError" role="alert" hidden></p>';
    var dias = 30;
    var hecho = await modal({
      titulo: 'Regalar acceso', cuerpo: cuerpo,
      alAbrir: function (caja) {
        caja.querySelectorAll('[data-opcion]').forEach(function (b) {
          b.addEventListener('click', function () {
            dias = Number(b.dataset.opcion);
            caja.querySelectorAll('[data-opcion]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          });
        });
      },
      botones: [{ id: 'cerrar', texto: 'Cancelar', tipo: 'suave' }, { id: 'guardar', texto: 'Regalar', tipo: 'primario' }],
      alElegir: async function (id, caja, cerrar) {
        if (id !== 'guardar') return cerrar(null);
        var err = caja.querySelector('#apRegaloError'); var boton = caja.querySelector('[data-modal="guardar"]');
        boton.disabled = true; err.hidden = true;
        try {
          var r = await ctx.api('/api/admin/miembros/' + encodeURIComponent(uid) + '/regalar', { method: 'POST', body: { dias: dias, nota: caja.querySelector('#apRegaloNota').value } });
          cerrar(r);
        } catch (e) {
          err.textContent = e.message || 'No se pudo regalar el acceso.';
          err.hidden = false; boton.disabled = false;
        }
      }
    });
    if (hecho && hecho.ok) {
      ctx.toast((hecho.dias === 365 ? 'Se regaló un año' : 'Se regaló un mes') + '. Vence el ' + P.fmtFecha(hecho.vence) + '.' + (hecho.stripeActiva ? ' Ojo: sigue cobrándose en Stripe.' : ''));
      await recargarSiMiembros();
    }
  }

  async function abrirEliminar(uid) {
    var m = miembroLocal(uid) || { nombre: '', correo: '' };
    var esperado = (m.correo || '').trim().toLowerCase();
    var cuerpo = '<p class="ap-modal__texto">Vas a eliminar a <strong>' + esc(m.nombre || m.correo || 'esta persona') + '</strong>' + (m.correo ? ' (<span class="ap-correo">' + esc(m.correo) + '</span>)' : '') + '.</p>' +
      '<div class="ap-peligro"><strong>Esto quita su cuenta del Club</strong><ul>' +
      '<li>Ya no podrá iniciar sesión.</li>' +
      '<li>Se quitan su ficha de miembro, su tarjeta del directorio y sus retos y XP.</li>' +
      '<li>Se conservan sus certificados y el avance de sus cursos.</li>' +
      '<li>Antes de borrar, el servidor guarda una copia completa. Durante 30 días puedes restaurarla desde «Eliminados».</li></ul></div>' +
      (m.stripeActiva ? '<div class="ap-aviso ap-aviso--error" role="alert">' + ico('triangle-alert', { size: 20 }) + '<div><strong>Tiene una suscripción de Stripe activa</strong><p>Eliminar la cuenta NO detiene los cobros. Cancela primero su suscripción en Stripe (Clientes, Suscripciones).</p></div></div>' +
        '<label class="ap-casilla"><input type="checkbox" id="apElimStripe"><span>Entiendo que debo cancelar su suscripción en Stripe yo mismo.</span></label>' : '') +
      '<div class="ap-campo"><label for="apElimCorreo">Para confirmar, escribe ' + (esperado ? 'su correo' : 'su identificador') + ': <code>' + esc(esperado || uid) + '</code></label>' +
      '<input type="text" id="apElimCorreo" data-foco autocomplete="off" spellcheck="false" inputmode="email" placeholder="' + esc(esperado ? 'correo@ejemplo.com' : 'identificador') + '"></div>' +
      '<p class="ap-error" id="apElimError" role="alert" hidden></p>';
    var hecho = await modal({
      titulo: 'Eliminar miembro', cuerpo: cuerpo,
      alAbrir: function (caja) {
        var campo = caja.querySelector('#apElimCorreo'); var boton = caja.querySelector('[data-modal="eliminar"]'); var casilla = caja.querySelector('#apElimStripe');
        var objetivo = (esperado || uid).toLowerCase();
        var revisar = function () { boton.disabled = !(campo.value.trim().toLowerCase() === objetivo && (!casilla || casilla.checked)); };
        campo.addEventListener('input', revisar);
        if (casilla) casilla.addEventListener('change', revisar);
        boton.disabled = true;
      },
      botones: [{ id: 'cerrar', texto: 'Mejor no', tipo: 'suave' }, { id: 'eliminar', texto: 'Eliminar miembro', tipo: 'peligro' }],
      alElegir: async function (id, caja, cerrar) {
        if (id !== 'eliminar') return cerrar(null);
        var err = caja.querySelector('#apElimError'); var boton = caja.querySelector('[data-modal="eliminar"]');
        var casilla = caja.querySelector('#apElimStripe');
        boton.disabled = true; err.hidden = true;
        try {
          var r = await ctx.api('/api/admin/miembros/' + encodeURIComponent(uid), { method: 'DELETE', body: { confirmarCorreo: caja.querySelector('#apElimCorreo').value, confirmarStripe: Boolean(casilla && casilla.checked) } });
          cerrar(r);
        } catch (e) {
          err.textContent = e.message || 'No se pudo eliminar al miembro.';
          err.hidden = false; boton.disabled = false;
        }
      }
    });
    if (hecho && hecho.ok) {
      ctx.toast((hecho.yaEliminado ? 'Esa persona ya estaba eliminada.' : 'Miembro eliminado. Se puede restaurar durante 30 días.') + (hecho.aviso ? ' ' + hecho.aviso : ''));
      await recargarSiMiembros();
    }
  }

  function filaEliminado(e) {
    var estadoE = e.restaurable ? ''
      : '<span class="ap-badge ap-badge--' + (e.estado === 'restaurado' ? 'ok' : 'apagado') + '">' + ico(e.estado === 'restaurado' ? 'circle-check' : 'circle-x', { size: 14 }) +
        '<span>' + esc(e.estado === 'restaurado' ? 'Ya restaurado' : e.motivo === 'vencido' ? 'Pasaron los 30 días' : 'No restaurable') + '</span></span>';
    return F.fila({
      clase: 'ap-fc--meta2',
      avatar: '<span class="ap-avatar ap-avatar--vencido" aria-hidden="true">' + esc(P.iniciales(e.nombre || e.correo)) + '</span>',
      titulo: e.nombre || 'Sin nombre', accion: e.restaurable ? { a: 'restaurar', datos: { uid: e.uid } } : null,
      meta: '<span class="ap-correo">' + esc(e.correo || '—') + '</span> · Eliminada el ' + esc(P.fmtFecha(e.eliminadoEn)) + (e.restaurable ? ' · restaurable hasta el ' + esc(P.fmtFecha(e.restaurableHasta)) : '') + ' · ' + esc(P.fmtNum(e.cursosConAvance)) + ' cursos con avance',
      estado: estadoE, reservarFin: true,
      acciones: e.restaurable ? [{ t: 'Restaurar miembro', i: 'rotate-ccw', a: 'restaurar' }] : [],
      etiquetaMenu: 'Acciones de ' + (e.nombre || e.correo || 'esta persona'), datos: { uid: e.uid }
    });
  }

  async function abrirEliminados() {
    var r;
    try { r = await ctx.api('/api/admin/eliminados'); } catch (e) { ctx.toast(e.message || 'No se pudo abrir la lista.', true); return; }
    var cuerpo = r.eliminados.length
      ? '<p class="ap-modal__texto">Estas cuentas se eliminaron con una copia completa. Puedes restaurarlas durante ' + esc(P.fmtNum(r.diasParaRestaurar)) + ' días; la persona debe usar «Olvidé mi contraseña» para entrar de nuevo.</p>' + F.lista(r.eliminados.map(filaEliminado), { etiqueta: 'Eliminados recientemente' })
      : vacio('Nadie eliminado', 'Cuando elimines a un miembro, aparecerá aquí para que puedas restaurarlo.', 'archive-restore');
    var elegido = null;
    await modal({
      titulo: 'Eliminados recientemente', cuerpo: cuerpo, ancho: 'ancho',
      alAbrir: function (caja) {
        caja.addEventListener('click', function (ev) {
          var b = ev.target.closest('[data-accion="restaurar"]');
          if (b) { elegido = b.dataset.uid; var cierre = caja.querySelector('[data-modal="cerrar"]'); if (cierre) cierre.click(); }
        });
      }
    });
    if (elegido) await restaurarMiembro(elegido, r.eliminados.filter(function (x) { return x.uid === elegido; })[0]);
  }

  async function restaurarMiembro(uid, e) {
    var ok = await confirmar({
      titulo: 'Restaurar miembro',
      texto: '¿Restaurar a <strong>' + esc((e && (e.nombre || e.correo)) || 'esta persona') + '</strong>? Se vuelve a crear su cuenta de acceso con el mismo correo y se reescribe su ficha, su tarjeta, sus retos y su avance.',
      aceptar: 'Sí, restaurar', cancelar: 'Mejor no', peligro: false
    });
    if (!ok) return;
    try {
      var r = await ctx.api('/api/admin/eliminados/' + encodeURIComponent(uid) + '/restaurar', { method: 'POST', body: {} });
      ctx.toast('Miembro restaurado. ' + (r.aviso || ''));
      await recargarSiMiembros();
    } catch (err) { ctx.toast(err.message || 'No se pudo restaurar.', true); }
  }

  /* ───────── SUSCRIPCIONES Y PAGOS ───────── */
  async function suscripciones(forzar) {
    var mi = ++contador;
    vista().innerHTML = cargando('Suscripciones y pagos');
    var r; var lista;
    try {
      var par = await Promise.all([ctx.api('/api/admin/resumen' + (forzar ? '?refrescar=1' : '')), cargarMiembros(false)]);
      r = par[0]; lista = par[1].miembros;
    } catch (e) {
      if (mi !== contador) return;
      vista().innerHTML = errorHTML('Suscripciones y pagos', e, 'recargar');
      vista().onclick = function (ev) { acciones(ev, { recargar: function () { suscripciones(true); } }); };
      return;
    }
    if (mi !== contador) return;
    var k = r.kpis;
    var ahora = Date.now();
    var en30 = lista.filter(function (m) {
      if (!m.conAcceso || !m.vence) return false;
      var d = new Date(m.vence).getTime() - ahora;
      return d >= 0 && d <= 30 * 86400000;
    }).sort(function (a, b) { return new Date(a.vence) - new Date(b.vence); });
    var pendientes = lista.filter(function (m) { return m.estado === 'pago-pendiente'; });
    var manuales = lista.filter(function (m) { return m.origen === 'manual' && m.conAcceso; });

    var fila = function (m) { return filaPersonaVence(m, planTexto(m) || m.correo); };
    var bloque = function (arr, vacioT, vacioX) {
      return arr.length ? F.lista(arr.slice(0, 8).map(fila)) + (arr.length > 8 ? '<p class="ap-pie-tabla">Y ' + (arr.length - 8) + ' más. Búscalos en Miembros.</p>' : '') : vacio(vacioT, vacioX, 'circle-check');
    };

    vista().innerHTML = P.tarjetaTitulo({
      icono: 'credit-card', eyebrow: 'Panel de administración', titulo: 'Suscripciones', acento: 'y pagos.',
      sub: 'Cómo se reparten los planes, quién vence pronto y cuánto se estima de ingreso. Los cobros con Stripe se confirman en Stripe.',
      cifras: [
        { valor: P.fmtNum(r.porPlan.mensual), rotulo: 'plan mensual' },
        { valor: P.fmtNum(r.porPlan.anual), rotulo: 'plan anual' },
        { valor: k.ingresosMesEstimado === null ? 'Sin datos' : P.fmtMxn(k.ingresosMesEstimado), rotulo: 'ingreso estimado del mes' }
      ],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    }) +
      '<div class="ap-kpis">' + [
        kpi({ icono: 'badge-check', rotulo: 'Con acceso hoy', valor: P.fmtNum(k.activos), nota: P.fmtNum(r.porOrigen.stripe) + ' Stripe · ' + P.fmtNum(r.porOrigen.manual) + ' manual · ' + P.fmtNum(r.porOrigen.heredado) + ' heredado', tono: 'ok' }),
        kpi({ icono: 'calendar-clock', rotulo: 'Vencen en 30 días', valor: P.fmtNum(en30.length), nota: 'Conviene recordarles renovar', tono: en30.length ? 'aviso' : 'neutro' }),
        kpi({ icono: 'triangle-alert', rotulo: 'Pago pendiente', valor: P.fmtNum(pendientes.length), nota: 'El cobro no se confirmó', tono: pendientes.length ? 'error' : 'neutro' }),
        kpi({ icono: 'hourglass', rotulo: 'Cancelados con acceso', valor: P.fmtNum(k.cancelados), nota: 'No renovarán', tono: k.cancelados ? 'aviso' : 'neutro' })
      ].join('') + '</div>' +
      '<div class="ap-columnas">' +
      tarjeta('Ingresos estimados por mes', G.serie({
        titulo: 'Ingresos estimados por mes', tipo: 'barras', formato: 'mxn', unidad: 'estimados en 6 meses', alto: 220,
        etiquetas: r.ingresosMensuales.map(function (m) { return P.fmtMes(m.mes).split(' ')[0]; }),
        titulos: r.ingresosMensuales.map(function (m) { return P.fmtMes(m.mes) + ' · ' + P.fmtNum(m.pagos) + ' pagos'; }),
        series: [{ nombre: 'Ingresos estimados (MXN)', valores: r.ingresosMensuales.map(function (m) { return m.estimado; }), color: 3 }],
        vacio: { titulo: 'Sin pagos registrados', texto: 'Cuando haya pagos aparecerá la estimación de cada mes.' }
      }), { nota: r.notas.ingresos }) +
      tarjeta('Planes y origen', '<h3 class="ap-subtitulo">Plan</h3>' + G.anillo({
        titulo: 'Reparto por plan', centro: { valor: P.fmtNum(k.activos), rotulo: 'con acceso' },
        partes: [{ etiqueta: 'Mensual', valor: r.porPlan.mensual, color: 2 }, { etiqueta: 'Anual', valor: r.porPlan.anual, color: 1 }, { etiqueta: 'Sin tipo de plan', valor: r.porPlan.otro, color: 8 }]
      }) + '<div class="ap-separador"></div><h3 class="ap-subtitulo">Origen del acceso</h3>' + G.anillo({
        titulo: 'Reparto por origen del acceso', centro: { valor: P.fmtNum(k.activos), rotulo: 'con acceso' },
        partes: [{ etiqueta: 'Stripe', valor: r.porOrigen.stripe, color: 2 }, { etiqueta: 'Manual', valor: r.porOrigen.manual, color: 3 }, { etiqueta: 'Regalo', valor: r.porOrigen.regalo, color: 7 }, { etiqueta: 'Heredado', valor: r.porOrigen.heredado, color: 5 }, { etiqueta: 'Otro', valor: r.porOrigen.otro, color: 8 }]
      }), { nota: 'Solo cuentan quienes tienen acceso hoy.' }) +
      '</div><div class="ap-columnas">' +
      tarjeta('Vencen en los próximos 30 días', bloque(en30, 'Nadie vence pronto', 'Cuando una membresía esté por vencer aparecerá aquí.')) +
      tarjeta('Pago pendiente', bloque(pendientes, 'Sin pagos pendientes', 'Todos los cobros recientes se confirmaron.')) +
      '</div>' +
      tarjeta('Activaciones manuales vigentes', bloque(manuales, 'Sin activaciones manuales', 'Las membresías que actives a mano aparecerán aquí.'), { nota: 'Transferencias, efectivo y cortesías.' });
    G.activar(vista());
    vista().onclick = function (e) {
      acciones(e, {
        recargar: function () { suscripciones(true); },
        ficha: function (b) { abrirFicha(b.dataset.uid); }
      });
    };
  }

  /* ───────── RETOS Y XP ───────── */
  async function retos(forzar) {
    var mi = ++contador;
    vista().innerHTML = cargando('Retos y XP');
    var r;
    try { r = await ctx.api('/api/admin/retos' + (forzar ? '?refrescar=1' : '')); } catch (e) {
      if (mi !== contador) return;
      vista().innerHTML = errorHTML('Retos y XP', e, 'recargar');
      vista().onclick = function (ev) { acciones(ev, { recargar: function () { retos(true); } }); };
      return;
    }
    if (mi !== contador) return;
    var t = r.totales;
    var top = r.top.filter(function (f) { return f.xp > 0 || f.superados > 0; });
    var tabla = top.length
      ? tablaZona('<table class="ap-tabla ap-tabla--simple"><thead><tr><th scope="col">#</th><th scope="col">Persona</th><th scope="col">Retos superados</th><th scope="col">XP</th></tr></thead><tbody>' +
        top.map(function (f, i) { return '<tr><td data-label="Lugar">' + (i + 1) + '</td><td data-label="Persona"><strong>' + esc(f.nombre) + '</strong></td><td data-label="Retos superados">' + esc(P.fmtNum(f.superados)) + '</td><td data-label="XP">' + esc(P.fmtNum(f.xp)) + '</td></tr>'; }).join('') +
        '</tbody></table>')
      : vacio('Aún nadie ha jugado retos', 'Cuando los miembros superen retos, aparecerán aquí con su XP.', 'target');
    vista().innerHTML = P.tarjetaTitulo({
      icono: 'target', eyebrow: 'Panel de administración', titulo: 'Retos', acento: 'y XP.',
      sub: 'Cuánto juega la comunidad y quiénes van al frente. Los datos salen de los retos que cada persona completó.',
      cifras: [
        { valor: P.fmtNum(t.conActividad), rotulo: 'personas con retos' },
        { valor: P.fmtNum(t.retosSuperados), rotulo: 'retos superados' },
        { valor: P.fmtNum(t.xpTotal), rotulo: 'XP en total' }
      ],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    }) +
      '<div class="ap-kpis">' + [
        kpi({ icono: 'users', rotulo: 'Personas con actividad', valor: P.fmtNum(t.conActividad), nota: 'De ' + P.fmtNum(t.personas) + ' con registro de retos', tono: 'info' }),
        kpi({ icono: 'target', rotulo: 'Retos superados', valor: P.fmtNum(t.retosSuperados), tono: 'ok' }),
        kpi({ icono: 'zap', rotulo: 'XP acumulado', valor: P.fmtNum(t.xpTotal), tono: 'aviso' }),
        kpi({ icono: 'trophy', rotulo: 'XP promedio', valor: P.fmtNum(t.xpPromedio), nota: 'Por persona con actividad', tono: 'neutro' })
      ].join('') + '</div>' +
      tarjeta('Quiénes van al frente', tabla, { nota: 'Las diez personas con más XP de retos.' });
    vista().onclick = function (e) { acciones(e, { recargar: function () { retos(true); } }); };
  }

  /* ───────── FORO Y DIRECTORIO ───────── */
  async function comunidad(forzar) {
    var mi = ++contador;
    vista().innerHTML = cargando('Foro y directorio');
    var r;
    try { r = await ctx.api('/api/admin/comunidad' + (forzar ? '?refrescar=1' : '')); } catch (e) {
      if (mi !== contador) return;
      vista().innerHTML = errorHTML('Foro y directorio', e, 'recargar');
      vista().onclick = function (ev) { acciones(ev, { recargar: function () { comunidad(true); } }); };
      return;
    }
    if (mi !== contador) return;
    var d = r.directorio;
    var sectores = d.porSector.length
      ? G.anillo({ titulo: 'Tarjetas por sector', centro: { valor: P.fmtNum(d.porSector.reduce(function (t, s) { return t + s.n; }, 0)), rotulo: 'tarjetas' }, partes: d.porSector.map(function (s, i) { return { etiqueta: s.sector, valor: s.n, color: i + 1 }; }) })
      : vacio('Sin tarjetas todavía', 'Cuando los miembros creen su tarjeta aparecerán sus sectores aquí.', 'users');
    var discusiones = r.discusiones.length
      ? F.lista(r.discusiones.map(function (p) {
        return F.fila({
          clase: 'ap-fc--meta2', avatar: '<span class="ap-ico-tile ap-tono-info" aria-hidden="true">' + ico('message-square', { size: 18 }) + '</span>',
          titulo: p.titulo || 'Sin título',
          meta: esc(p.autor || 'Anónimo') + ' · ' + esc(P.fmtFecha(p.creado)) + (p.extracto ? ' · ' + esc(p.extracto) : ''),
          cols: [{ html: '<span class="ap-fc__v">' + esc(P.fmtNum(p.respuestas)) + ' resp.</span><span class="ap-fc__s">' + esc(P.fmtNum(p.me_gusta)) + ' me gusta</span>' }],
          metaChico: '<span class="ap-fc__sep"> · </span>' + esc(P.fmtNum(p.respuestas)) + ' resp.'
        });
      }), { etiqueta: 'Discusiones recientes' })
      : vacio('Aún no hay discusiones', 'Las discusiones del foro aparecerán aquí, de la más reciente a la más antigua.', 'message-square');
    vista().innerHTML = P.tarjetaTitulo({
      icono: 'message-square', eyebrow: 'Panel de administración', titulo: 'Foro', acento: 'y directorio.',
      sub: 'Qué tan activa está la comunidad: tarjetas publicadas y privadas del directorio, y las discusiones más recientes del foro.',
      cifras: [
        { valor: P.fmtNum(d.total), rotulo: 'tarjetas del directorio' },
        { valor: P.fmtNum(d.publicadas), rotulo: 'publicadas' },
        { valor: P.fmtNum(r.discusiones.length), rotulo: 'discusiones recientes' }
      ],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    }) +
      '<div class="ap-kpis">' + [
        kpi({ icono: 'users', rotulo: 'Tarjetas creadas', valor: P.fmtNum(d.total), tono: 'info' }),
        kpi({ icono: 'eye', rotulo: 'Publicadas', valor: P.fmtNum(d.publicadas), nota: 'Visibles para los miembros', tono: 'ok' }),
        kpi({ icono: 'lock', rotulo: 'Privadas', valor: P.fmtNum(d.privadas), nota: 'Solo las ve su dueña o dueño', tono: 'neutro' }),
        kpi({ icono: 'shield-check', rotulo: 'Con cédula visible', valor: P.fmtNum(d.conCedulaVisible), nota: 'Eligieron mostrarla', tono: 'info' })
      ].join('') + '</div>' +
      '<div class="ap-columnas">' + tarjeta('Tarjetas por sector', sectores, { nota: 'Las doce áreas más frecuentes.' }) +
      tarjeta('Discusiones recientes', discusiones, { nota: 'Las últimas 30 del foro.' }) + '</div>';
    G.activar(vista());
    vista().onclick = function (e) { acciones(e, { recargar: function () { comunidad(true); } }); };
  }

  /* ───────── REFERIDOS ───────── */
  async function referidos(forzar) {
    var mi = ++contador;
    vista().innerHTML = cargando('Referidos');
    var r;
    try { r = await ctx.api('/api/admin/referidos' + (forzar ? '?refrescar=1' : '')); } catch (e) {
      if (mi !== contador) return;
      vista().innerHTML = errorHTML('Referidos', e, 'recargar');
      vista().onclick = function (ev) { acciones(ev, { recargar: function () { referidos(true); } }); };
      return;
    }
    if (mi !== contador) return;
    var t = r.totales;
    var tabla = r.anfitriones.length
      ? tablaZona('<table class="ap-tabla ap-tabla--simple"><thead><tr><th scope="col">Persona que invita</th><th scope="col">Invitados</th><th scope="col">Válidos</th></tr></thead><tbody>' +
        r.anfitriones.map(function (a) { return '<tr><td data-label="Persona"><strong>' + esc(a.nombre) + '</strong></td><td data-label="Invitados">' + esc(P.fmtNum(a.invitados)) + '</td><td data-label="Válidos">' + esc(P.fmtNum(a.validos)) + '</td></tr>'; }).join('') + '</tbody></table>')
      : vacio('Aún no hay invitaciones', 'Cuando un miembro invite a alguien y esa persona se registre, aparecerá aquí.', 'gift');
    var motivos = r.motivosRechazo.length
      ? F.lista(r.motivosRechazo.map(function (m) {
        return F.fila({ clase: 'ap-fc--meta2', avatar: '<span class="ap-ico-tile ap-tono-error" aria-hidden="true">' + ico('circle-x', { size: 18 }) + '</span>', titulo: m.motivo,
          cols: [{ html: '<span class="ap-fc__v">' + esc(P.fmtNum(m.n)) + '</span>' }] });
      }), { etiqueta: 'Motivos de rechazo' })
      : vacio('Sin rechazos', 'No hay invitaciones rechazadas.', 'circle-check');
    vista().innerHTML = P.tarjetaTitulo({
      icono: 'gift', eyebrow: 'Panel de administración', titulo: 'Invitaciones', acento: 'entre miembros.',
      sub: 'Cuántas personas llegan por invitación, cuántas son válidas y quiénes invitan más. Solo cuentan quienes confirmaron su correo.',
      cifras: [
        { valor: P.fmtNum(t.total), rotulo: 'invitaciones' },
        { valor: P.fmtNum(t.validos), rotulo: 'válidas' },
        { valor: P.fmtNum(t.conPago), rotulo: 'ya pagaron' }
      ],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    }) +
      '<div class="ap-kpis">' + [
        kpi({ icono: 'gift', rotulo: 'Invitaciones', valor: P.fmtNum(t.total), tono: 'info' }),
        kpi({ icono: 'badge-check', rotulo: 'Válidas', valor: P.fmtNum(t.validos), tono: 'ok' }),
        kpi({ icono: 'hourglass', rotulo: 'Esperando su correo', valor: P.fmtNum(t.pendientes), nota: 'Aún no confirman', tono: t.pendientes ? 'aviso' : 'neutro' }),
        kpi({ icono: 'circle-x', rotulo: 'Rechazadas', valor: P.fmtNum(t.rechazados), tono: t.rechazados ? 'error' : 'neutro' })
      ].join('') + '</div>' +
      '<div class="ap-columnas">' + tarjeta('Quiénes invitan más', tabla, { nota: 'Las diez personas con más invitados válidos.' }) +
      tarjeta('Por qué se rechazan', motivos, { nota: 'Reglas contra invitaciones repetidas o de la misma persona.' }) + '</div>';
    vista().onclick = function (e) { acciones(e, { recargar: function () { referidos(true); } }); };
  }

  /* ───────── CONFIGURACIÓN ───────── */
  // Interruptores guardados por el servidor (GET y POST /api/admin/config). Nada de claves ni secretos: solo ajustes seguros.
  var PARRAFO_PRIVACIDAD = 'Contador de visitas. Para saber cuántas personas visitan nuestro sitio, contamos de forma agregada las visitas a cada página por día. ' +
    'Este conteo no usa cookies, no guarda tu dirección IP, no te identifica ni te sigue entre sitios y no se comparte con terceros. ' +
    'Si tu navegador envía la señal «No rastrear» o «Control global de privacidad», no contamos tu visita. Solo se guarda un número por página y por día.';

  function filaInterruptor(o) {
    return '<li><div class="ap-interruptores__t"><strong>' + esc(o.titulo) + '</strong><span>' + o.texto + '</span></div>' + o.control + '</li>';
  }

  function controlSi(accion, activo, etiqueta) {
    return '<button type="button" class="ap-interruptor" role="switch" aria-checked="' + (activo ? 'true' : 'false') + '" aria-label="' + esc(etiqueta) + '" data-accion="' + accion + '"></button>';
  }

  async function configuracion() {
    var mi = ++contador;
    var enVivoSitio = !!(root.ZOO_CONFIG && root.ZOO_CONFIG.enVivoPronto && root.ZOO_CONFIG.enVivoPronto());
    vista().innerHTML = cargando('Configuración');
    var cfg; var est = null; var cal = null; var mie = null;
    try {
      var par = await Promise.all([ctx.api('/api/admin/config'), ctx.api('/api/admin/estado').catch(function () { return null; }), ctx.api('/api/admin/calendario').catch(function () { return null; }), ctx.api('/api/admin/miembros').catch(function () { return null; })]);
      cfg = par[0]; est = par[1]; cal = par[2]; mie = par[3];
    } catch (e) {
      if (mi !== contador) return;
      vista().innerHTML = errorHTML('Configuración', e, 'recargar');
      vista().onclick = function (ev) { acciones(ev, { recargar: function () { configuracion(); } }); };
      return;
    }
    if (mi !== contador) return;
    var c = cfg.config;
    var admins = cfg.administradores;
    var visitasTexto = (c.contadorVisitas ? 'Encendido. ' : 'Apagado. ') + 'Solo suma cuántas visitas hubo por día y por página: sin cookies, sin dirección IP y sin identificar a nadie. ' +
      (c.contadorVisitas ? P.fmtNum(cfg.visitas.ultimos7Dias) + ' visitas en los últimos 7 días. ' : '') +
      'Antes de encenderlo, agrega un párrafo al aviso de privacidad. Ojo: el sitio todavía no envía las visitas al servidor, así que por ahora el conteo seguiría en cero.';
    var vivoValor = c.clasesEnVivoPronto === null ? 'auto' : (c.clasesEnVivoPronto ? 'si' : 'no');
    var interruptores = '<ul class="ap-interruptores">' +
      filaInterruptor({ titulo: 'Contador de visitas de la portada', texto: esc(visitasTexto) + ' <button type="button" class="ap-btn ap-btn--chico ap-btn--suave" data-accion="parrafo">' + ico('file-text', { size: 16 }) + 'Ver el párrafo para el aviso de privacidad</button>',
        control: controlSi('visitas', c.contadorVisitas, 'Contador de visitas') }) +
      filaInterruptor({ titulo: 'Clases en vivo (webinars)', texto: 'Hoy el sitio decide con <code>club-config.js</code>: ' + (enVivoSitio ? 'muestra «Próximamente»' : 'las muestra activas') + '. Aquí puedes dejar guardado un valor en el servidor; el Club empezará a leerlo cuando se publique ese cambio del sitio.',
        control: '<div class="ap-selector"><label class="sr-only" for="apVivo">Clases en vivo</label><select id="apVivo" data-accion-cambio="vivo"><option value="auto"' + (vivoValor === 'auto' ? ' selected' : '') + '>Que decida el sitio</option><option value="si"' + (vivoValor === 'si' ? ' selected' : '') + '>Mostrar Próximamente</option><option value="no"' + (vivoValor === 'no' ? ' selected' : '') + '>Mostrar activas</option></select></div>' }) +
      '</ul>';

    var aviso = c.avisoGlobal;
    var avisoCard = '<div class="ap-campo"><label for="apAvisoTexto">Texto del aviso <small>(hasta 240 letras)</small></label><textarea id="apAvisoTexto" maxlength="240" placeholder="Por ejemplo: Esta noche habrá mantenimiento de 11 a 12.">' + esc(aviso.texto) + '</textarea></div>' +
      '<div class="ap-campo ap-selector"><label for="apAvisoTono">Tono</label><select id="apAvisoTono"><option value="info"' + (aviso.tono === 'info' ? ' selected' : '') + '>Informativo</option><option value="aviso"' + (aviso.tono === 'aviso' ? ' selected' : '') + '>Importante</option></select></div>' +
      '<label class="ap-casilla"><input type="checkbox" id="apAvisoActivo"' + (aviso.activo ? ' checked' : '') + '><span>Mostrar el aviso a todo el Club</span></label>' +
      '<p class="ap-error" id="apAvisoError" role="alert" hidden></p>' +
      '<div class="ap-acciones-lote"><button type="button" class="ap-btn ap-btn--primario" data-accion="guardar-aviso">' + ico('check', { size: 16 }) + 'Guardar aviso</button>' +
      '<span class="ap-badge ap-badge--info">' + ico('info', { size: 14 }) + '<span>El Club aún no lo muestra</span></span></div>' +
      '<p class="ap-nota">El servidor ya lo guarda y lo entrega en <code>GET /api/config-publica</code>. Falta que el Club lo consulte al abrir para pintarlo; hasta entonces, guardar el aviso no cambia lo que ven los miembros.</p>';

    var lista = function (arr, vacioT) {
      return arr.length ? F.lista(arr) : '<p class="ap-nada">' + esc(vacioT) + '</p>';
    };
    var tileAdmin = '<span class="ap-ico-tile" aria-hidden="true">' + ico('shield-check', { size: 18 }) + '</span>';
    var porCorreo = lista(admins.porCorreo.map(function (a) { return F.fila({ clase: 'ap-fc--meta2', avatar: tileAdmin, titulo: a, meta: 'Correo de ADMIN_EMAILS (parcialmente oculto)' }); }), 'No hay correos en ADMIN_EMAILS: solo funcionan las cuentas con la marca de administrador.');
    var porDoc = lista(admins.porDocumento.map(function (a) { return F.fila({ clase: 'ap-fc--meta2', avatar: tileAdmin, titulo: a.nombre, meta: esc(a.correo || 'Sin correo') + ' · Marca de administrador en su ficha' }); }), 'Ninguna cuenta tiene la marca de administrador en su ficha.');

    var listaServicios = C.servicios(est, cal);

    vista().innerHTML = P.tarjetaTitulo({
      icono: 'settings', eyebrow: 'Panel de administración', titulo: 'Ajustes', acento: 'del sitio.',
      sub: 'Estado de los servicios, interruptores que guarda el servidor, el calendario de cursos, quién administra y las copias de seguridad. Lo que implica claves, precios o textos públicos del sitio no se edita desde aquí.',
      cifras: listaServicios.length ? [
        { valor: listaServicios.filter(function (x) { return x.nivel === 'ok'; }).length + ' de ' + listaServicios.length, rotulo: 'servicios en orden' },
        { valor: P.fmtNum(admins.porCorreo.length + admins.porDocumento.length), rotulo: 'administran el panel' }
      ] : [],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    }) +
      tarjeta('Estado de los servicios', C.semaforoHTML(listaServicios) +
        (listaServicios.length ? '<div class="ap-acciones-lote"><button type="button" class="ap-btn ap-btn--suave" data-accion="recargar">' + ico('refresh-cw', { size: 16 }) + 'Revisar ahora</button>' +
          '<button type="button" class="ap-btn ap-btn--suave" data-accion="copiar-reporte">' + ico('copy', { size: 16 }) + 'Copiar reporte</button>' +
          '<a class="ap-btn ap-btn--suave" href="#/estado">' + ico('activity', { size: 16 }) + 'Ver el estado del sistema</a></div>' +
          '<p class="ap-nota">Solo se ve el nombre de cada variable y si está definida; los valores nunca salen del servidor. El reporte se puede pegar en un mensaje para pedir ayuda.</p>' : ''),
        { nota: 'Semáforo de lo que revisa «Estado del sistema». Revisar no cobra ni envía nada.' }) +
      tarjeta('Interruptores', interruptores, { nota: 'Los cambios se guardan al instante y quedan anotados en la bitácora de acciones.' }) +
      '<div class="ap-columnas">' +
      tarjeta('Aviso para todo el Club', avisoCard, { nota: 'Un mensaje corto, por ejemplo de mantenimiento.' }) +
      tarjeta('Calendario de cursos del servidor', C.calendarioHTML(cal), { nota: 'Solo lectura: así abre el servidor los cursos de cada miembro.' }) +
      '</div><div class="ap-columnas">' +
      tarjeta('Quién administra', '<h3 class="ap-subtitulo">Por correo</h3>' + porCorreo + '<h3 class="ap-subtitulo">Por marca en su ficha</h3>' + porDoc +
        '<p class="ap-nota">Los correos se definen en la variable <code>ADMIN_EMAILS</code> del servidor (Railway). El panel no puede cambiarlos: por seguridad, solo el equipo técnico lo hace.</p>', { nota: 'Cuentas con acceso a este panel.' }) +
      tarjeta('Versiones', C.versionesHTML(est, versionDelPanel()), { nota: 'Para saber exactamente qué está publicado.' }) +
      '</div><div class="ap-columnas">' +
      tarjeta('Enlaces útiles', C.enlacesHTML(), { nota: 'Atajos a los servicios que usa el Club. Se abren en otra pestaña.' }) +
      tarjeta('Exportar datos', C.exportacionesHTML(mie && mie.miembros ? mie.miembros.length : 0), { nota: 'Copias en CSV de lo que ya ves en el panel.' }) +
      '</div>' +
      tarjeta('Respaldo recomendado', C.respaldoHTML(), { nota: 'Qué guardar y dónde vive cada cosa. Este panel no hace copias por sí solo.' }) +
      tarjeta('Qué no se cambia desde aquí', F.lista([
        ['Precios de la membresía', 'Se definen en Stripe y en las variables STRIPE_PRICE_MENSUAL y STRIPE_PRICE_ANUAL del servidor. Cambiarlos desde el panel implicaría tocar los cobros, y por seguridad no se hace.'],
        ['WhatsApp, Instagram y correo de contacto', 'Están escritos en las páginas del sitio; cambiarlos requiere publicar el sitio.'],
        ['Claves de Stripe, Bunny, correo y certificados', 'Son secretos: solo se guardan en Railway y nunca aparecen en el panel.']
      ].map(function (x) { return F.fila({ clase: 'ap-fc--meta2', avatar: '<span class="ap-ico-tile ap-tono-neutro" aria-hidden="true">' + ico('lock', { size: 18 }) + '</span>', titulo: x[0], meta: x[1] }); })));

    var guardar = async function (cuerpo, okTexto, boton) {
      if (boton) boton.disabled = true;
      try {
        await ctx.api('/api/admin/config', { method: 'POST', body: cuerpo });
        ctx.toast(okTexto);
        await configuracion();
      } catch (e) {
        ctx.toast(e.message || 'No se pudo guardar.', true);
        if (boton) boton.disabled = false;
      }
    };
    var v = vista();
    v.onclick = function (ev) {
      acciones(ev, {
        recargar: function () { configuracion(); },
        'copiar-reporte': async function () {
          var texto = C.reporteTexto(listaServicios, est, new Date().toISOString());
          try { await navigator.clipboard.writeText(texto); ctx.toast('Reporte copiado. Pégalo en un mensaje para pedir ayuda.'); } catch (e) { ctx.toast('No se pudo copiar el reporte.', true); }
        },
        'csv-miembros': function () {
          if (!mie || !mie.miembros) { ctx.toast('No se pudo leer la lista de miembros.', true); return; }
          var blob = new Blob(['﻿' + C.csvMiembros(mie.miembros)], { type: 'text/csv;charset=utf-8' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = 'miembros-zoorigen-' + new Date().toISOString().slice(0, 10) + '.csv';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
          ctx.toast('Lista de miembros descargada.');
        },
        visitas: function (b) {
          var encender = b.getAttribute('aria-checked') !== 'true';
          if (!encender) { guardar({ contadorVisitas: false }, 'Contador de visitas apagado.', b); return; }
          confirmar({
            titulo: 'Encender el contador de visitas',
            texto: 'El contador solo suma visitas por día y por página, sin cookies ni dirección IP. Antes de encenderlo conviene agregar al aviso de privacidad este párrafo:<br><br><em>' + esc(PARRAFO_PRIVACIDAD) + '</em>',
            aceptar: 'Ya lo agregué, encender', cancelar: 'Todavía no', peligro: false
          }).then(function (si) { if (si) guardar({ contadorVisitas: true }, 'Contador de visitas encendido.', b); });
        },
        parrafo: function () {
          modal({ titulo: 'Párrafo para el aviso de privacidad', cuerpo: '<p class="ap-modal__texto">' + esc(PARRAFO_PRIVACIDAD) + '</p><p class="ap-nota">Agrégalo al aviso de privacidad del sitio antes de encender el contador.</p>',
            botones: [{ id: 'copiar', texto: 'Copiar el texto', tipo: 'primario' }, { id: 'cerrar', texto: 'Cerrar', tipo: 'suave' }],
            alElegir: async function (id, caja, cerrar) {
              if (id !== 'copiar') return cerrar(null);
              try { await navigator.clipboard.writeText(PARRAFO_PRIVACIDAD); ctx.toast('Texto copiado.'); } catch (e) { ctx.toast('No se pudo copiar. Selecciona el texto y cópialo.', true); }
            } });
        },
        'guardar-aviso': function (b) {
          var texto = document.getElementById('apAvisoTexto').value; var activo = document.getElementById('apAvisoActivo').checked;
          var err = document.getElementById('apAvisoError'); err.hidden = true;
          if (activo && texto.trim().length < 4) { err.textContent = 'Escribe el texto del aviso o desmarca «Mostrar».'; err.hidden = false; return; }
          guardar({ avisoGlobal: { activo: activo, texto: texto, tono: document.getElementById('apAvisoTono').value } }, activo ? 'Aviso guardado.' : 'Aviso guardado (apagado).', b);
        }
      });
    };
    v.onchange = function (ev) {
      var sel = ev.target.closest('[data-accion-cambio="vivo"]');
      if (!sel) return;
      guardar({ clasesEnVivoPronto: sel.value === 'auto' ? null : sel.value === 'si' }, 'Ajuste de clases en vivo guardado.', sel);
    };
  }

  /* ───────── ESTADO DEL SISTEMA ───────── */
  async function estadoSistema(forzar) {
    var mi = ++contador;
    vista().innerHTML = cargando('Estado del sistema');
    var r;
    try { r = await ctx.api('/api/admin/estado'); } catch (e) {
      if (mi !== contador) return;
      vista().innerHTML = errorHTML('Estado del sistema', e, 'recargar');
      vista().onclick = function (ev) { acciones(ev, { recargar: function () { estadoSistema(true); } }); };
      return;
    }
    if (mi !== contador) return;
    void forzar;
    var s = r.servidor; var sv = r.servicios;
    var semaforo = function (ok, tono) { return '<span class="ap-semaforo ap-tono-' + (ok ? (tono || 'ok') : 'error') + '" aria-hidden="true"></span>'; };
    var servicio = function (nombre, ok, detalle, icono) {
      return '<article class="ap-servicio"><span class="ap-servicio__ico">' + ico(icono, { size: 20 }) + '</span><div><h3>' + esc(nombre) + '</h3><p>' +
        semaforo(ok) + '<span>' + esc(ok ? 'Funcionando' : 'Revisar') + '</span></p><small>' + esc(detalle) + '</small></div></article>';
    };
    var servicios = '<div class="ap-servicios">' + [
      servicio('Servidor', true, 'Activo hace ' + P.duracion(s.segundosActivo) + ' · Node ' + s.node.replace(/^v/, ''), 'server'),
      servicio('Base de datos', sv.baseDeDatos.ok, sv.baseDeDatos.ok ? 'Responde en ' + sv.baseDeDatos.ms + ' ms' : (sv.baseDeDatos.error || 'Sin respuesta'), 'layers'),
      servicio('Cobros (Stripe)', sv.stripe.configurado, sv.stripe.configurado ? 'Modo ' + (sv.stripe.modo === 'real' ? 'real' : 'de prueba') : 'Falta STRIPE_SECRET_KEY', 'credit-card'),
      servicio('Videos', sv.videos.configurado, sv.videos.configurado ? (sv.videos.catalogoApi ? 'Reproducción y catálogo' : 'Reproducción (sin catálogo automático)') : 'Falta BUNNY_TOKEN_AUTH_KEY', 'clapperboard'),
      servicio('Correos', sv.correo.configurado, sv.correo.configurado ? 'Envío configurado' : 'Falta RESEND_API_KEY', 'mail'),
      servicio('Certificados', sv.certificados.configurado, sv.certificados.configurado ? 'Firma configurada' : 'Falta CERTIFICATE_SIGNING_KEY', 'award')
    ].join('') + '</div>';

    var variables = F.lista(r.variables.map(function (v) {
      var estadoV = v.definida ? '<span class="ap-badge ap-badge--ok">' + ico('circle-check', { size: 14 }) + '<span>Definida</span></span>'
        : '<span class="ap-badge ap-badge--' + (v.critica ? 'error' : 'neutro') + '">' + ico(v.critica ? 'triangle-alert' : 'circle-dashed', { size: 14 }) + '<span>' + (v.critica ? 'Falta' : 'No definida') + '</span></span>';
      return F.fila({ clase: 'ap-fc--meta2 ap-fc--variable', avatar: '<span class="ap-ico-tile ap-tono-' + (v.definida ? 'ok' : (v.critica ? 'error' : 'neutro')) + '" aria-hidden="true">' + ico('server', { size: 18 }) + '</span>',
        titulo: v.nombre, meta: esc(v.para), estado: estadoV });
    }), { etiqueta: 'Variables del servidor' });

    var errores = r.errores.recientes.length
      ? '<ol class="ap-linea-tiempo">' + r.errores.recientes.map(function (e) {
        return '<li><span class="ap-linea-tiempo__ico ap-linea-tiempo__ico--error">' + ico('triangle-alert', { size: 16 }) + '</span><div><p>' + esc(e.mensaje) + '</p><time datetime="' + esc(e.en) + '">' + esc(P.fmtFecha(e.en)) + ' · ' + esc(P.relativo(e.en)) + '</time></div></li>';
      }).join('') + '</ol>'
      : vacio('Sin errores desde el último arranque', 'Si algo falla en el servidor, aparecerá aquí con la hora.', 'circle-check');

    var acc = r.acciones.length
      ? '<ol class="ap-linea-tiempo">' + r.acciones.map(function (a) {
        return '<li><span class="ap-linea-tiempo__ico">' + ico('shield-check', { size: 16 }) + '</span><div><p>' + esc(a.resumen || a.accion) + '</p><time datetime="' + esc(a.en || '') + '">' + esc(P.fmtFecha(a.en)) + ' · ' + esc(P.relativo(a.en)) + '</time></div></li>';
      }).join('') + '</ol>'
      : vacio('Sin acciones del equipo todavía', 'Activar o cancelar una membresía queda anotado aquí.', 'shield-check');

    var versiones = '<dl class="ap-datos">' +
      '<div class="ap-dato"><dt>Servidor</dt><dd>' + esc(s.version || '—') + '</dd></div>' +
      '<div class="ap-dato"><dt>Versión de Node</dt><dd>' + esc(s.node) + '</dd></div>' +
      '<div class="ap-dato"><dt>Publicación</dt><dd>' + esc(s.commit || 'Sin dato') + '</dd></div>' +
      '<div class="ap-dato"><dt>Entorno</dt><dd>' + esc(s.entorno || '—') + '</dd></div>' +
      '<div class="ap-dato"><dt>Iniciado</dt><dd>' + esc(P.fmtFecha(s.iniciado)) + '</dd></div>' +
      '<div class="ap-dato"><dt>Memoria</dt><dd>' + esc(P.fmtNum(s.memoriaMb)) + ' MB</dd></div></dl>';

    vista().innerHTML = P.tarjetaTitulo({
      icono: 'activity', eyebrow: 'Panel de administración', titulo: 'Estado', acento: 'del sistema.',
      sub: 'Salud del servidor, qué servicios están configurados y los errores más recientes. Nunca se muestran claves, solo si existen.',
      cifras: [
        { valor: P.duracion(s.segundosActivo), rotulo: 'servidor activo' },
        { valor: sv.baseDeDatos.ok ? sv.baseDeDatos.ms + ' ms' : 'Sin respuesta', rotulo: 'base de datos' },
        { valor: P.fmtNum(r.errores.recientes.length), rotulo: 'errores recientes' }
      ],
      acciones: [{ id: 'recargar', texto: 'Revisar de nuevo', icono: 'refresh-cw' }]
    }) + servicios +
      '<div class="ap-columnas">' + tarjeta('Errores recientes', errores, { nota: r.errores.nota }) +
      tarjeta('Acciones del equipo', acc, { nota: 'Lo último que se hizo desde este panel.' }) + '</div>' +
      tarjeta('Variables del servidor', variables, { nota: 'Solo el nombre y si está definida; los valores nunca salen del servidor.' }) +
      '<div class="ap-columnas">' + tarjeta('Versiones', versiones) +
      tarjeta('Panel de administración', '<dl class="ap-datos"><div class="ap-dato"><dt>Versión del panel</dt><dd>' + esc(versionDelPanel()) + '</dd></div>' +
        '<div class="ap-dato"><dt>Administran hoy</dt><dd>' + esc(P.fmtNum(r.administradores.length)) + ' correo(s) en ADMIN_EMAILS</dd></div></dl>') + '</div>';
    vista().onclick = function (e) { acciones(e, { recargar: function () { estadoSistema(true); } }); };
  }

  function versionDelPanel() {
    try {
      var l = document.querySelector('link[href*="admin-club.css"]');
      var m = l && /[?&]v=([\w.-]+)/.exec(l.getAttribute('href'));
      return m ? m[1] : '—';
    } catch (e) { return '—'; }
  }

  /* ───────── AVANCE DE MIEMBROS ─────────
     Ensayo (sin escribir nada) de la importación del avance que cada miembro llevaba en el sitio anterior, e importación
     persona por persona. GET /api/admin/progreso-legado y POST /api/admin/progreso-legado/:uid/importar. */
  var avance = { pagina: 1, datos: null };

  function filaDeAvance(uid) {
    var l = avance.datos && avance.datos.miembros;
    return (l || []).filter(function (m) { return m.uid === uid; })[0] || null;
  }

  function celdaImportadas(f) {
    if (f.veredicto === 'sin-progreso-viejo') return '<span class="ap-sub">—</span>';
    var guardadas = f.importado ? Math.max(0, f.clasesImportables - f.clasesFaltantes) : f.clasesImportables;
    return '<span class="ap-num">' + esc(P.fmtNum(guardadas)) + '</span><span class="ap-sub">' + (f.importado ? 'guardadas' : 'por importar') + '</span>';
  }

  // Acciones del menú «…» de una fila de avance: siempre «Ver detalle» y, según el veredicto del servidor, importar, reparar o forzar.
  function accionesAvance(f) {
    var e = P.estadoAvance(f);
    var a = [{ t: 'Ver detalle', i: 'eye', a: 'detalle' }];
    if (e.accion === 'importar') a.push({ t: 'Importar ahora', i: 'download', a: 'importar' });
    else if (e.accion === 'reparar') a.push({ t: 'Reparar', i: 'refresh-cw', a: 'reparar' });
    else if (e.accion === 'forzar') a.push({ t: 'Importar de todos modos', i: 'download', a: 'forzar', p: true, sep: true });
    return a;
  }

  function filaAvance(f) {
    var uid = esc(f.uid);
    var sub = P.detalleAvance(f);
    var plan = f.planTipo === 'anual' ? 'Anual' : f.planTipo === 'mensual' ? 'Mensual' : '';
    return '<tr class="ap-fila ap-fila-t ap-fila-t--toca" data-uid="' + uid + '">' +
      '<td class="ap-celda-miembro" data-label="Miembro"><div class="ap-persona"><span class="ap-avatar ap-avatar--' + esc(f.estadoPlan) + '" aria-hidden="true">' + esc(P.iniciales(f.nombre || f.correo)) + '</span>' +
      '<div class="ap-persona__txt"><button type="button" class="ap-titulo-fila" data-accion="detalle" data-uid="' + uid + '">' + esc(f.nombre || 'Sin nombre') + '</button><span class="ap-correo">' + esc(f.correo || '—') + '</span></div></div></td>' +
      '<td class="ap-col-2" data-label="Plan">' + P.insignia(f.estadoPlan) + (plan ? '<span class="ap-sub">' + esc(plan) + '</span>' : '') + '</td>' +
      '<td class="ap-col-2 ap-col-num" data-label="Cursos con avance">' + esc(P.fmtNum(f.cursosConAvance)) + '</td>' +
      '<td class="ap-col-2 ap-col-num" data-label="Clases del sitio anterior">' + esc(P.fmtNum(f.clasesViejas)) + '</td>' +
      '<td class="ap-col-3 ap-col-num" data-label="Clases importadas">' + celdaImportadas(f) + '</td>' +
      '<td class="ap-celda-estado" data-label="Estado"' + (sub ? ' title="' + esc(sub) + '"' : '') + '>' + P.insigniaAvance(f) + '</td>' +
      '<td class="ap-celda-acciones">' + F.botonMenu({ acciones: accionesAvance(f), etiqueta: 'Acciones de ' + (f.nombre || f.correo || 'esta persona'), datos: { uid: f.uid } }) + '</td></tr>';
  }

  function avisosAvance(r) {
    var c = r.configuracion || {};
    var html = '';
    if (!c.importacionActiva) {
      html += '<div class="ap-aviso ap-tono-error" role="alert">' + ico('triangle-alert', { size: 20 }) + '<div><strong>La importación automática está apagada</strong>' +
        '<p>Falta la variable <code>LEGACY_PROGRESS_IMPORT_BEFORE</code> en el servidor, así que nadie recupera su avance al entrar. Puedes importarlo a mano aquí, persona por persona.</p></div></div>';
    } else {
      html += '<div class="ap-aviso ap-tono-info" role="note">' + ico('info', { size: 20 }) + '<div><p>Se importa solo el avance de las cuentas creadas antes del <b>' + esc(P.fmtFecha(c.corte)) + '</b>. ' +
        'El avance del sitio anterior no se borra nunca: queda en cada cuenta como respaldo.</p></div></div>';
    }
    if (c.certificados === 'limite-invalido') {
      html += '<div class="ap-aviso ap-tono-error" role="alert">' + ico('triangle-alert', { size: 20 }) + '<div><strong>Los certificados anteriores no se están aceptando</strong>' +
        '<p>La variable <code>CERTIFICADOS_ANTERIORES_HASTA</code> no es una fecha válida. Corrígela o quítala para que se acepten los certificados del sitio anterior.</p></div></div>';
    }
    if (!c.firmaConfigurada) {
      html += '<div class="ap-aviso ap-tono-error" role="alert">' + ico('triangle-alert', { size: 20 }) + '<div><strong>Los certificados no están configurados</strong>' +
        '<p>Falta <code>CERTIFICATE_SIGNING_KEY</code>: sin ella no se reconocen ni se emiten certificados.</p></div></div>';
    }
    if (r.truncado) {
      html += '<div class="ap-aviso ap-tono-info" role="note">' + ico('info', { size: 20 }) + '<div><p>Hay más cuentas de las que se revisan a la vez; la lista muestra las primeras.</p></div></div>';
    }
    return html;
  }

  async function avanceMiembros(forzar) {
    var mi = ++contador;
    vista().innerHTML = cargando('Avance de miembros');
    var r;
    try { r = await ctx.api('/api/admin/progreso-legado?pagina=' + avance.pagina + '&limite=25' + (forzar ? '&refrescar=1' : '')); } catch (e) {
      if (mi !== contador) return;
      vista().innerHTML = errorHTML('Avance de miembros', e, 'recargar');
      vista().onclick = function (ev) { acciones(ev, { recargar: function () { avanceMiembros(true); } }); };
      return;
    }
    if (mi !== contador) return;
    avance.datos = r;
    avance.pagina = r.pagina;
    var s = r.resumen;
    var frase = P.resumenAvance(s);
    var cuerpo;
    if (!r.miembros.length) {
      cuerpo = vacio('Nadie tiene avance del sitio anterior', 'Si alguien traía cursos empezados, aparecerá aquí con lo que se conserva.', 'graduation-cap');
    } else {
      var desde = (r.pagina - 1) * r.limite + 1;
      var hasta = Math.min(r.total, r.pagina * r.limite);
      cuerpo = tablaZona('<table class="ap-tabla ap-tabla--avance"><thead><tr><th scope="col">Miembro</th><th scope="col" class="ap-col-2">Plan</th><th scope="col" class="ap-col-2 ap-col-num">Cursos</th>' +
        '<th scope="col" class="ap-col-2 ap-col-num">Clases anteriores</th><th scope="col" class="ap-col-3 ap-col-num">Importadas</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
        r.miembros.map(filaAvance).join('') + '</tbody></table>') +
        '<div class="ap-paginas"><p class="ap-pie-tabla" role="status">Mostrando ' + P.fmtNum(desde) + ' a ' + P.fmtNum(hasta) + ' de ' + P.fmtNum(r.total) + '</p>' +
        (r.paginas > 1
          ? '<div class="ap-paginas__botones"><button type="button" class="ap-btn ap-btn--chico ap-btn--suave" data-accion="anterior"' + (r.pagina <= 1 ? ' disabled' : '') + '>' + ico('arrow-up', { size: 16 }) + 'Anterior</button>' +
            '<span>Página ' + P.fmtNum(r.pagina) + ' de ' + P.fmtNum(r.paginas) + '</span>' +
            '<button type="button" class="ap-btn ap-btn--chico ap-btn--suave" data-accion="siguiente"' + (r.pagina >= r.paginas ? ' disabled' : '') + '>' + ico('arrow-down', { size: 16 }) + 'Siguiente</button></div>'
          : '') + '</div>';
    }
    vista().innerHTML = P.tarjetaTitulo({
      icono: 'graduation-cap', eyebrow: 'Panel de administración', titulo: 'Que nadie pierda', acento: 'su avance.',
      sub: 'Compara lo que cada miembro llevaba en el sitio anterior con lo que guarda el servidor. Esta revisión no cambia nada: solo el botón «Importar ahora» guarda datos.',
      cifras: [
        { valor: P.fmtNum(s.conAvanceViejo), rotulo: 'con avance del sitio anterior' },
        { valor: P.fmtNum(s.verificados), rotulo: 'con avance verificado' },
        { valor: P.fmtNum(s.requierenRevision), rotulo: 'por revisar' }
      ],
      acciones: [{ id: 'recargar', texto: 'Revisar de nuevo', icono: 'refresh-cw' }]
    }) +
      '<div class="ap-aviso ap-tono-' + esc(frase.tono) + ' ap-aviso--resumen" role="status">' + ico(frase.icono, { size: 22 }) +
      '<div><strong>' + esc(frase.titulo) + '</strong><p>' + esc(frase.detalle) + '</p></div></div>' +
      avisosAvance(r) + cuerpo;
    vista().onclick = function (ev) {
      acciones(ev, {
        recargar: function () { avanceMiembros(true); },
        anterior: function () { avance.pagina = Math.max(1, avance.pagina - 1); avanceMiembros(false); },
        siguiente: function () { avance.pagina += 1; avanceMiembros(false); },
        detalle: function (b) { abrirDetalleAvance(b.dataset.uid); },
        importar: function (b) { importarAvance(b.dataset.uid, 'importar'); },
        reparar: function (b) { importarAvance(b.dataset.uid, 'reparar'); },
        forzar: function (b) { importarAvance(b.dataset.uid, 'forzar'); }
      });
    };
  }

  function filaCursoAvance(c) {
    var perdida = c.clasesPerdidas > 0;
    var tono = c.estado === 'ok' ? 'ok' : (c.estado === 'listo-para-certificado' ? 'info' : 'aviso');
    var nombre = c.curso || (c.estado === 'curso-eliminado' ? 'Curso que ya no existe' : 'Curso sin nombre');
    var cert = c.certificado === 'firmado' ? 'Certificado firmado' : c.certificado === 'aceptable' ? 'Certificado anterior, aceptado por el servidor'
      : c.certificado === 'no-aceptable' ? 'Certificado anterior que el servidor no acepta' : '';
    return '<li class="ap-curso-avance"><div class="ap-curso-avance__t"><strong>' + esc(nombre) + '</strong>' +
      '<span class="ap-badge ap-badge--' + tono + '">' + esc(P.textoEstadoCurso(c.estado)) + '</span>' +
      (cert ? '<small>' + esc(cert) + '</small>' : '') + (c.completadoViejo ? '<small>Lo tenía marcado como terminado.</small>' : '') + '</div>' +
      '<div class="ap-curso-avance__n"><span class="ap-num">' + esc(P.fmtNum(c.clasesImportables)) + ' de ' + esc(P.fmtNum(c.clasesViejas)) + '</span>' +
      '<small>' + (perdida ? esc(P.fmtNum(c.clasesPerdidas)) + ' no se pueden importar' : 'clases se conservan') + '</small></div></li>';
  }

  function abrirDetalleAvance(uid) {
    var f = filaDeAvance(uid);
    if (!f) return;
    var cs = f.certificados || { total: 0, firmados: 0, aceptables: 0, noAceptables: 0 };
    var certs = cs.total
      ? 'Certificados anteriores: ' + P.fmtNum(cs.total) + ' (' + P.fmtNum(cs.firmados) + ' firmados, ' + P.fmtNum(cs.aceptables) + ' aceptados por el servidor, ' + P.fmtNum(cs.noAceptables) + ' no aceptados).'
      : 'No tiene certificados anteriores.';
    var cuerpo = '<div class="ap-ficha"><div class="ap-ficha__cab"><span class="ap-avatar ap-avatar--grande ap-avatar--' + esc(f.estadoPlan) + '" aria-hidden="true">' + esc(P.iniciales(f.nombre || f.correo)) + '</span>' +
      '<div><strong>' + esc(f.nombre || 'Sin nombre') + '</strong><span>' + esc(f.correo || '—') + '</span>' + P.insigniaAvance(f) + '</div></div>' +
      (P.detalleAvance(f) ? '<p class="ap-modal__texto">' + esc(P.detalleAvance(f)) + '</p>' : '') +
      '<dl class="ap-datos">' +
      '<div class="ap-dato"><dt>Cursos con avance</dt><dd>' + esc(P.fmtNum(f.cursosConAvance)) + '</dd></div>' +
      '<div class="ap-dato"><dt>Clases del sitio anterior</dt><dd>' + esc(P.fmtNum(f.clasesViejas)) + '</dd></div>' +
      '<div class="ap-dato"><dt>Clases que se conservan</dt><dd>' + esc(P.fmtNum(f.clasesImportables)) + '</dd></div>' +
      '<div class="ap-dato"><dt>Cursos terminados</dt><dd>' + esc(P.fmtNum(f.cursosCompletadosViejos)) + '</dd></div></dl>' +
      '<h3>Por curso</h3>' +
      (f.cursos.length ? '<ul class="ap-cursos-avance">' + f.cursos.map(filaCursoAvance).join('') + '</ul>' : '<p class="ap-nada">No hay cursos con avance legible.</p>') +
      (f.detalleRecortado ? '<p class="ap-nada">Se muestran los primeros cursos; hay más.</p>' : '') +
      '<h3>Certificados</h3><p class="ap-modal__texto">' + esc(certs) + '</p>' +
      '<p class="ap-modal__texto">El avance del sitio anterior no se borra: queda como respaldo en la cuenta.</p></div>';
    var e = P.estadoAvance(f);
    var botones = [{ id: 'cerrar', texto: 'Cerrar', tipo: 'suave' }];
    if (e.accion === 'importar') botones.push({ id: 'importar', texto: 'Importar ahora', tipo: 'primario' });
    else if (e.accion === 'reparar') botones.push({ id: 'reparar', texto: 'Reparar', tipo: 'primario' });
    return modal({ titulo: 'Avance de ' + (f.nombre || 'la persona'), cuerpo: cuerpo, botones: botones, ancho: 'ancho' }).then(function (elegido) {
      if (elegido === 'importar' || elegido === 'reparar') return importarAvance(uid, elegido);
    });
  }

  async function importarAvance(uid, modo) {
    var f = filaDeAvance(uid);
    if (!f) return;
    var quien = '<strong>' + esc(f.nombre || f.correo || 'esta persona') + '</strong>';
    var textos = {
      importar: { titulo: 'Importar el avance anterior', aceptar: 'Sí, importar', peligro: false,
        texto: 'Se guardará en la cuenta de ' + quien + ' el avance que llevaba en el sitio anterior (' + esc(P.fmtNum(f.clasesImportables)) + ' clases en ' + esc(P.fmtNum(f.cursosConAvance)) + ' cursos). ' +
          (f.clasesPerdidas > 0 ? esc(P.fmtNum(f.clasesPerdidas)) + ' clases no se pueden importar porque ya no existen en su curso. ' : '') +
          'No borra nada del sitio anterior y repetirlo no duplica nada.' },
      reparar: { titulo: 'Completar el avance importado', aceptar: 'Sí, completar', peligro: false,
        texto: 'A ' + quien + ' le faltan ' + esc(P.fmtNum(f.clasesFaltantes)) + ' clases por guardar. Se volverá a unir su avance del sitio anterior con lo que ya tiene: nunca se quita nada.' },
      forzar: { titulo: 'Importar aunque la cuenta no cumple la fecha', aceptar: 'Sí, importar de todos modos', peligro: true,
        texto: 'La cuenta de ' + quien + ' normalmente no importa sola. ' + esc(P.textoMotivoNoElegible(f.motivoNoElegible)) + ' Hazlo solo si estás seguro de que ese avance es suyo. Quedará anotado en la bitácora del panel.' }
    };
    var t = textos[modo];
    if (!t) return;
    var ok = await confirmar({ titulo: t.titulo, texto: t.texto, aceptar: t.aceptar, cancelar: 'Mejor no', peligro: t.peligro });
    if (!ok) return;
    var cuerpoPeticion = modo === 'reparar' ? { reintentar: true } : modo === 'forzar' ? { aceptarCuentaPosterior: true } : {};
    try {
      var r = await ctx.api('/api/admin/progreso-legado/' + encodeURIComponent(uid) + '/importar', { method: 'POST', body: cuerpoPeticion });
      var res = r.resultado || {};
      if (res.estado === 'importado') ctx.toast('Avance importado: ' + res.clasesImportadas + ' clases en ' + res.cursosImportados + ' cursos.');
      else if (res.estado === 'ya-importado') ctx.toast('Ya estaba importado; no se cambió nada.');
      else ctx.toast('No tenía avance anterior que importar.');
      await avanceMiembros(true);
    } catch (e) { ctx.toast(e.message || 'No se pudo importar el avance.', true); }
  }

  /* ───────── CERTIFICADOS: verificación por folio (ruta pública del servidor) ───────── */
  function agregarVerificadorFolio() {
    var cont = vista();
    if (!cont || document.getElementById('apFolio')) return;
    var bloque = document.createElement('section');
    bloque.className = 'ap-card ap-folio';
    bloque.id = 'apFolio';
    bloque.innerHTML = '<header class="ap-card__cab"><h2>Verificar un folio</h2><p>Comprueba si un certificado es válido: el servidor revisa su firma.</p></header>' +
      '<form class="ap-folio__form" novalidate><label class="sr-only" for="apFolioCampo">Folio del certificado</label>' +
      '<input id="apFolioCampo" type="text" maxlength="60" placeholder="Folio, por ejemplo ZOO-2026-ABC123" autocomplete="off" spellcheck="false">' +
      '<button type="submit" class="ap-btn ap-btn--primario">' + ico('search', { size: 16 }) + 'Verificar</button></form>' +
      '<div id="apFolioRes" class="ap-folio__res" role="status" aria-live="polite"></div>';
    var cab = cont.querySelector('.sec-hero');
    if (cab && cab.nextSibling) cab.parentNode.insertBefore(bloque, cab.nextSibling); else cont.prepend(bloque);
    bloque.querySelector('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var folio = bloque.querySelector('input').value.trim();
      var res = bloque.querySelector('#apFolioRes');
      if (!/^[A-Za-z0-9._-]{4,60}$/.test(folio)) { res.innerHTML = '<span class="ap-badge ap-badge--aviso">' + ico('triangle-alert', { size: 14 }) + '<span>Escribe un folio válido (letras, números y guiones).</span></span>'; return; }
      res.textContent = 'Verificando…';
      try {
        var d = await fetch(ctx.apiBase() + '/api/certificados/' + encodeURIComponent(folio), { cache: 'no-store' });
        var j = null; try { j = await d.json(); } catch (x) { j = null; }
        if (d.ok && j && (j.valido !== false)) {
          var c = j.certificado || j;
          res.innerHTML = '<span class="ap-badge ap-badge--ok">' + ico('circle-check', { size: 14 }) + '<span>Folio válido</span></span> <span class="ap-folio__det">' +
            esc(c.nombre || c.memberName || '') + (c.curso ? ' · ' + esc(c.curso) : '') + (c.emitido ? ' · ' + esc(P.fmtFecha(c.emitido)) : '') + '</span>';
        } else {
          res.innerHTML = '<span class="ap-badge ap-badge--error">' + ico('circle-x', { size: 14 }) + '<span>' + esc((j && j.error) || 'No encontramos ese folio.') + '</span></span>';
        }
      } catch (err) {
        res.innerHTML = '<span class="ap-badge ap-badge--error">' + ico('circle-x', { size: 14 }) + '<span>No hay conexión con el servidor.</span></span>';
      }
    });
  }

  root.ZOO_ADMIN_VISTAS = {
    iniciar: iniciar, resumen: resumen, miembros: miembros, suscripciones: suscripciones, retos: retos, comunidad: comunidad,
    referidos: referidos, configuracion: configuracion, estado: estadoSistema, avance: avanceMiembros,
    agregarVerificadorFolio: agregarVerificadorFolio, modal: modal, confirmar: confirmar,
    abrirFicha: function (uid) { return abrirFicha(uid); },
    // Piezas que reutilizan las vistas de Marketing (admin-marketing.js)
    util: {
      contexto: function () { return ctx; }, vista: vista, cargando: cargando, errorHTML: errorHTML, vacio: vacio, kpi: kpi, tarjeta: tarjeta,
      tablaZona: tablaZona, acciones: acciones, nuevoContador: function () { return ++contador; }, contadorActual: function () { return contador; }
    }
  };
})(typeof self !== 'undefined' ? self : this);
