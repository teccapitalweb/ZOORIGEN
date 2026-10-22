/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · VISTAS                              */
/* Dibuja las secciones nuevas (Resumen, Miembros, Suscripciones,*/
/* Retos, Foro y directorio, Referidos,                         */
/* Configuración) con los datos que entrega el                   */
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
  var S = root.ZOO_ADMIN_SERVIDOR;
  var esc = P.esc;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };

  var ctx = null;               // { api, toast, contenedor, irA, zonaModal }
  var estado = { miembros: null, resumen: null, filtro: 'todos', texto: '', orden: 'registro', visibles: 25 };
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

    var lAcc = Array.isArray(r.accionesEquipo) ? r.accionesEquipo : [];
    var accionesEquipo = lAcc.length
      ? '<ol class="ap-linea-tiempo">' + lAcc.map(function (a) {
        return '<li><span class="ap-linea-tiempo__ico">' + ico('shield-check', { size: 16 }) + '</span><div><p>' + esc(a.resumen || a.accion) + '</p><time datetime="' + esc(a.en || '') + '">' + esc(P.fmtFecha(a.en)) + ' · ' + esc(P.relativo(a.en)) + '</time></div></li>';
      }).join('') + '</ol>'
      : vacio('Sin acciones del equipo todavía', 'Activar o cancelar una membresía, o guardar un ajuste, queda anotado aquí.', 'shield-check');

    vista().innerHTML = titulo + tarjetas +
      (r.truncado ? '<div class="ap-aviso ap-aviso--info" role="note">' + ico('info', { size: 20 }) + '<div><p>Hay más de 5,000 cuentas: las cifras usan las primeras 5,000.</p></div></div>' : '') +
      '<div class="ap-columnas">' +
      tarjeta('Altas por semana', altas, { nota: 'Personas que crearon su cuenta, semana a semana.' }) +
      tarjeta('Ingresos estimados por mes', ingresos, { nota: r.notas.ingresos }) +
      '</div><div class="ap-columnas">' +
      tarjeta('Estado de las cuentas', estados, { nota: 'Cómo se reparten hoy los ' + P.fmtNum(k.miembros) + ' miembros.' }) +
      tarjeta('Próximos vencimientos', venc, { nota: 'Quienes vencen en los próximos 7 días.' }) +
      '</div>' + tarjeta('Actividad reciente', act, { nota: 'Registros, pagos, certificados y acciones del equipo.' }) +
      tarjeta('Acciones del equipo', accionesEquipo, { nota: 'Lo último que se hizo desde este panel: activar o cancelar membresías, guardar ajustes y más.' });
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

  // Tarjeta de miembro (como en Alintec): nombre en negrita; debajo, el correo con su ícono; debajo, la fecha y hora de registro con su ícono.
  // El correo y la fecha NUNCA comparten renglón. A la derecha, las insignias (Registrado + Sin pagar, Mensual + Activo...) y el menú «…».
  function filaMiembro(m) {
    var pronto = m.conAcceso && m.vence && (new Date(m.vence).getTime() - Date.now()) < 7 * 86400000;
    var origen = planTexto(m);
    var vence = m.vence ? '<span class="ap-mi__vence' + (pronto ? ' ap-mi__vence--aviso' : '') + '">Vence ' + esc(P.fmtFecha(m.vence)) + ' · ' + esc(P.relativo(m.vence)) + '</span>' : '';
    var registro = m.registro
      ? '<span class="ap-mi__linea ap-mi__reg">' + ico('clock', { size: 14 }) + '<span>Se registró ' + esc(P.fmtFechaHora(m.registro)).replace(/ · (.+)$/, ' · <span class="ap-nw">$1</span>') + '</span></span>'
      : '<span class="ap-mi__linea ap-mi__reg ap-mi__reg--nd">' + ico('clock', { size: 14 }) + '<span>Fecha de registro no disponible</span></span>';
    return '<li class="ap-mi ap-mi--' + esc(m.estado) + '" data-uid="' + esc(m.uid) + '">' +
      '<span class="ap-mi__av"><span class="ap-avatar ap-avatar--' + esc(m.estado) + '" aria-hidden="true">' + esc(P.iniciales(m.nombre || m.correo)) + '</span></span>' +
      '<div class="ap-mi__txt">' +
      '<button type="button" class="ap-mi__nombre" data-accion="ficha" data-uid="' + esc(m.uid) + '">' + esc(m.nombre || 'Sin nombre') + (m.esAdmin ? ' <span class="ap-etiqueta">Admin</span>' : '') + '</button>' +
      '<span class="ap-mi__linea ap-mi__correo">' + ico('mail', { size: 14 }) + '<span class="ap-correo">' + esc(m.correo || 'Sin correo') + '</span></span>' +
      registro + '</div>' +
      '<div class="ap-mi__estado"><span class="ap-mi__insignias">' + P.insigniasMiembro(m) + '</span>' + (origen ? '<span class="ap-mi__origen">' + esc(origen) + '</span>' : '') + vence + '</div>' +
      '<div class="ap-mi__fin">' + F.botonMenu({ acciones: accionesMiembro(m), etiqueta: 'Acciones de ' + (m.nombre || m.correo || 'este miembro'), datos: { uid: m.uid } }) + '</div></li>';
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
    cont.innerHTML = '<div class="ap-fc-zona"><div class="ap-fc-caja"><ul class="ap-fc-lista ap-mi-lista" aria-label="Miembros">' + mostrar.map(filaMiembro).join('') + '</ul></div></div>' +
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
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }, { id: 'csv-miembros', texto: 'Descargar lista (CSV)', icono: 'download' }, { id: 'eliminados', texto: 'Eliminados', icono: 'archive-restore' }]
    }) +
      '<div class="ap-controles"><div class="zs-chips" id="apMiembrosChips" role="group" aria-label="Filtrar por estado del plan"></div>' +
      '<div class="ap-controles__der"><label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar por nombre o correo</span>' +
      '<input type="search" id="apBuscar" placeholder="Buscar por nombre o correo" autocomplete="off" value="' + esc(estado.texto) + '"></label>' +
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
        eliminados: function () { abrirEliminados(); },
        'csv-miembros': function () {
          var blob = new Blob(['\uFEFF' + S.csvMiembros(estado.miembros.miembros)], { type: 'text/csv;charset=utf-8' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = 'miembros-zoorigen-' + new Date().toISOString().slice(0, 10) + '.csv';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
          ctx.toast('Lista de miembros descargada. Guárdala en un lugar privado: lleva correos.');
        }
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
      '</dl>' + historialFichaHTML(r.retos) + '</div>';
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
  var NOMBRES_RETO = { quiz: 'Quiz relámpago', detective: 'Detective de campo', orden: 'Ordena la secuencia', historia: 'Modo historia', flashcards: 'Flashcards' };
  var RETO_CORTO = { quiz: 'Quiz', detective: 'Detective', orden: 'Ordena', historia: 'Historia', flashcards: 'Flashcards' };
  var rEst = { tipo: 'todos', q: '', desde: '', hasta: '', pagina: 1, hist: null, usuarios: null, uq: '', uVisibles: 25 };

  function nombreReto(e) {
    var n = NOMBRES_RETO[e.retoId] || e.reto || e.retoId || 'Reto';
    return e.tipo === 'camino' && e.indice !== null && e.indice !== undefined ? n + ' · reto ' + (e.indice + 1) : n;
  }

  // Renglones del historial de UNA persona (ficha del miembro)
  function historialFichaHTML(r) {
    var lista = r.historial || [];
    if (!lista.length) {
      return '<h3>Historial de retos</h3><p class="ap-nada">' + (r.superados > 0
        ? 'Esta persona ya tenía ' + esc(P.fmtNum(r.superados)) + ' retos superados antes de que el historial detallado existiera: solo se conserva el total. Los nuevos aparecerán aquí con fecha y hora.'
        : 'Todavía no ha superado ningún reto.') + '</p>';
    }
    return '<h3>Historial de retos <small>(' + esc(P.fmtNum(r.historialTotal)) + (r.historialTotal > lista.length ? ', los ' + lista.length + ' más recientes' : '') + ')</small></h3>' +
      '<ul class="ap-progreso">' + lista.map(function (e) {
        return '<li><span class="ap-progreso__t">' + esc(nombreReto(e)) + '<small>' + esc(e.tipo === 'camino' ? 'Camino' : 'Práctica diaria') +
          (e.puntaje !== null && e.total ? ' · ' + e.puntaje + '/' + e.total : '') + (e.perfecto ? ' · perfecto' : '') + ' · ' + esc(P.fmtFechaHora(e.en)) + '</small></span>' +
          '<span class="ap-progreso__e"><span class="ap-badge ap-badge--ok">' + ico('zap', { size: 14 }) + '<span>+' + esc(P.fmtNum(e.xp)) + ' XP</span></span></span></li>';
      }).join('') + '</ul>';
  }

  function parametrosHistorial() {
    var q = '?pagina=' + rEst.pagina + '&limite=25';
    if (rEst.tipo !== 'todos') q += '&tipo=' + encodeURIComponent(rEst.tipo);
    if (rEst.q.trim()) q += '&q=' + encodeURIComponent(rEst.q.trim());
    if (rEst.desde) q += '&desde=' + encodeURIComponent(rEst.desde);
    if (rEst.hasta) q += '&hasta=' + encodeURIComponent(rEst.hasta);
    return q;
  }

  function pintarHistorialRetos() {
    var cont = document.getElementById('apRHist');
    if (!cont) return;
    var h = rEst.hist;
    if (!h) { cont.innerHTML = '<div class="ap-esqueleto"><div class="ap-esqueleto__fila"></div></div>'; return; }
    var hayFiltros = rEst.tipo !== 'todos' || rEst.q.trim() || rEst.desde || rEst.hasta;
    var aviso = h.historialDesde
      ? '<div class="ap-aviso ap-aviso--info" role="note">' + ico('info', { size: 20 }) + '<div><p>El historial detallado empieza el <strong>' + esc(P.fmtFecha(h.historialDesde)) + '</strong>. Lo anterior solo tiene totales por persona (más abajo).</p></div></div>'
      : '<div class="ap-aviso ap-aviso--info" role="note">' + ico('info', { size: 20 }) + '<div><p><strong>El historial detallado empieza el día que se publique esta versión.</strong> Desde entonces, cada reto superado queda con persona, reto, fecha, hora y XP. Lo anterior solo tiene totales por persona (más abajo).</p></div></div>';
    var tabla = h.eventos.length
      ? tablaZona('<table class="ap-tabla ap-tabla--simple"><thead><tr><th scope="col">Persona</th><th scope="col">Reto</th><th scope="col">Tipo</th><th scope="col">Fecha y hora</th><th scope="col">XP</th></tr></thead><tbody>' +
        h.eventos.map(function (e) {
          return '<tr><td data-label="Persona"><button type="button" class="ap-enlace" data-accion="ficha" data-uid="' + esc(e.uid) + '">' + esc(e.nombre) + '</button></td>' +
            '<td data-label="Reto">' + esc(nombreReto(e)) + (e.puntaje !== null && e.total ? '<small class="ap-sub">Puntaje ' + e.puntaje + '/' + e.total + (e.perfecto ? ' · perfecto' : '') + '</small>' : '') + '</td>' +
            '<td data-label="Tipo"><span class="ap-badge ap-badge--' + (e.tipo === 'camino' ? 'ok' : 'info') + '">' + esc(e.tipo === 'camino' ? 'Camino' : 'Práctica diaria') + '</span></td>' +
            '<td data-label="Fecha y hora"><span class="ap-fecha">' + esc(P.fmtFechaHora(e.en)) + '</span></td>' +
            '<td data-label="XP"><strong>+' + esc(P.fmtNum(e.xp)) + '</strong></td></tr>';
        }).join('') + '</tbody></table>') +
        '<div class="ap-paginacion"><button type="button" class="ap-btn ap-btn--suave" data-accion="pag-ant"' + (h.pagina <= 1 ? ' disabled' : '') + '>' + ico('chevron-left', { size: 16 }) + 'Anterior</button>' +
        '<span role="status">Página ' + P.fmtNum(h.pagina) + ' de ' + P.fmtNum(h.paginas) + ' · ' + P.fmtNum(h.totales.eventos) + ' retos resueltos · ' + P.fmtNum(h.totales.personas) + ' personas · +' + P.fmtNum(h.totales.xp) + ' XP</span>' +
        '<button type="button" class="ap-btn ap-btn--suave" data-accion="pag-sig"' + (h.pagina >= h.paginas ? ' disabled' : '') + '>Siguiente' + ico('chevron-right', { size: 16 }) + '</button></div>'
      : vacio(hayFiltros ? 'Ningún reto coincide con esos filtros' : 'Todavía no hay retos en el historial detallado',
        hayFiltros ? 'Prueba con otra persona, otro tipo o un rango de fechas más amplio.' : 'Cuando alguien supere un reto aparecerá aquí con fecha, hora y XP.', 'target');
    cont.innerHTML = aviso + tabla;
  }

  async function cargarHistorialRetos() {
    try { rEst.hist = await ctx.api('/api/admin/retos/historial' + parametrosHistorial()); }
    catch (e) { rEst.hist = null; var c = document.getElementById('apRHist'); if (c) c.innerHTML = errorHTML('Historial de retos', e, 'recargar-hist'); return; }
    if (rEst.hist.pagina !== rEst.pagina) rEst.pagina = rEst.hist.pagina;
    pintarHistorialRetos();
  }

  function pintarUsuariosRetos() {
    var cont = document.getElementById('apRUsuarios');
    if (!cont || !rEst.usuarios) return;
    var q = P.sinAcentos ? P.sinAcentos(rEst.uq) : String(rEst.uq).toLowerCase();
    var lista = rEst.usuarios.filter(function (u) { return !q.trim() || (P.sinAcentos ? P.sinAcentos(u.nombre) : u.nombre.toLowerCase()).indexOf(q.trim()) !== -1; });
    if (!lista.length) { cont.innerHTML = vacio(rEst.uq ? 'Nadie coincide con esa búsqueda' : 'Aún nadie ha jugado retos', rEst.uq ? 'Prueba con otro nombre.' : 'Cuando los miembros superen retos aparecerán aquí con su XP.', 'target'); return; }
    var mostrar = lista.slice(0, rEst.uVisibles);
    cont.innerHTML = tablaZona('<table class="ap-tabla ap-tabla--simple"><thead><tr><th scope="col">#</th><th scope="col">Persona</th><th scope="col">Retos superados</th><th scope="col">XP</th><th scope="col">Días activos</th><th scope="col">Por tipo (superados)</th><th scope="col">Última vez</th></tr></thead><tbody>' +
      mostrar.map(function (u, i) {
        var tipos = Object.keys(u.porReto).map(function (k) { return esc(RETO_CORTO[k] || k) + ' ' + P.fmtNum(u.porReto[k].superados); }).join(' · ') || '—';
        return '<tr><td data-label="Lugar">' + (rEst.usuarios.indexOf(u) + 1) + '</td><td data-label="Persona"><button type="button" class="ap-enlace" data-accion="ficha" data-uid="' + esc(u.uid) + '">' + esc(u.nombre) + '</button></td>' +
          '<td data-label="Retos superados">' + esc(P.fmtNum(u.superados)) + '</td><td data-label="XP"><strong>' + esc(P.fmtNum(u.xp)) + '</strong></td>' +
          '<td data-label="Días activos">' + esc(P.fmtNum(u.dias)) + '</td><td data-label="Por tipo (superados)">' + tipos + '</td>' +
          '<td data-label="Última vez">' + (u.ultimaVez ? esc(P.fmtFecha(u.ultimaVez)) + '<small class="ap-sub">' + esc(P.relativo(u.ultimaVez)) + '</small>' : '—') + '</td></tr>';
      }).join('') + '</tbody></table>') +
      '<p class="ap-pie-tabla" role="status">Mostrando ' + P.fmtNum(mostrar.length) + ' de ' + P.fmtNum(lista.length) + '</p>' +
      (lista.length > mostrar.length ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="usuarios-mas">Mostrar ' + Math.min(25, lista.length - mostrar.length) + ' más</button>' : '');
  }

  async function retos(forzar) {
    var mi = ++contador;
    vista().innerHTML = cargando('Retos y XP');
    var r;
    try {
      var par = await Promise.all([
        ctx.api('/api/admin/retos' + (forzar ? '?refrescar=1' : '')),
        ctx.api('/api/admin/retos/usuarios' + (forzar ? '?refrescar=1' : '')),
        ctx.api('/api/admin/retos/historial' + parametrosHistorial() + (forzar ? '&refrescar=1' : ''))
      ]);
      r = par[0]; rEst.usuarios = par[1].usuarios; rEst.hist = par[2];
      if (rEst.hist.pagina !== rEst.pagina) rEst.pagina = rEst.hist.pagina;
    } catch (e) {
      if (mi !== contador) return;
      vista().innerHTML = errorHTML('Retos y XP', e, 'recargar');
      vista().onclick = function (ev) { acciones(ev, { recargar: function () { retos(true); } }); };
      return;
    }
    if (mi !== contador) return;
    var t = r.totales;
    rEst.uVisibles = 25;
    vista().innerHTML = P.tarjetaTitulo({
      icono: 'target', eyebrow: 'Panel de administración', titulo: 'Retos', acento: 'y XP.',
      sub: 'Quién resuelve los retos, cuáles y cuándo, y cuánto XP ganó. El historial detallado empieza el día que se publicó y los totales por persona incluyen todo lo anterior.',
      cifras: [
        { valor: P.fmtNum(t.conActividad), rotulo: 'personas con retos' },
        { valor: P.fmtNum(t.retosSuperados), rotulo: 'retos superados' },
        { valor: P.fmtNum(t.xpTotal), rotulo: 'XP en total' }
      ],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    }) +
      '<div class="ap-kpis">' + [
        kpi({ icono: 'users', rotulo: 'Personas con actividad', valor: P.fmtNum(t.conActividad), nota: 'De ' + P.fmtNum(t.personas) + ' con registro de retos', tono: 'info' }),
        kpi({ icono: 'target', rotulo: 'Retos superados', valor: P.fmtNum(t.retosSuperados), nota: 'Suma de los totales por persona', tono: 'ok' }),
        kpi({ icono: 'zap', rotulo: 'XP acumulado', valor: P.fmtNum(t.xpTotal), nota: 'Solo XP de retos', tono: 'aviso' }),
        kpi({ icono: 'trophy', rotulo: 'XP promedio', valor: P.fmtNum(t.xpPromedio), nota: 'Por persona con actividad', tono: 'neutro' })
      ].join('') + '</div>' +
      tarjeta('Historial de retos resueltos', '<div class="ap-controles ap-controles--hist">' +
        '<label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar por persona o reto</span><input type="search" id="apRQ" placeholder="Buscar persona o reto" autocomplete="off" value="' + esc(rEst.q) + '"></label>' +
        '<label class="ap-campo-fila"><span>Tipo</span><select id="apRTipo"><option value="todos">Todos</option><option value="practica">Práctica diaria</option><option value="camino">Camino</option></select></label>' +
        '<label class="ap-campo-fila"><span>Desde</span><input type="date" id="apRDesde" value="' + esc(rEst.desde) + '"></label>' +
        '<label class="ap-campo-fila"><span>Hasta</span><input type="date" id="apRHasta" value="' + esc(rEst.hasta) + '"></label>' +
        '<button type="button" class="ap-btn ap-btn--suave" data-accion="limpiar-filtros">' + ico('x', { size: 16 }) + 'Limpiar</button></div>' +
        '<div id="apRHist"></div>', { nota: 'Cada vez que alguien supera un reto: quién, cuál, de qué tipo, cuándo (hora de México) y cuánto XP ganó.' }) +
      tarjeta('Totales por persona', '<div class="ap-controles"><label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar persona</span><input type="search" id="apRUQ" placeholder="Buscar por nombre" autocomplete="off" value="' + esc(rEst.uq) + '"></label></div><div id="apRUsuarios"></div>',
        { nota: 'Retos superados y XP de cada persona, también de antes del historial detallado.', id: 'apRetosPersonas' });
    document.getElementById('apRTipo').value = rEst.tipo;
    pintarHistorialRetos();
    pintarUsuariosRetos();
    var espera = null;
    var recargarHist = function (conEspera) {
      clearTimeout(espera);
      var ir = function () { rEst.pagina = 1; cargarHistorialRetos(); };
      if (conEspera) espera = setTimeout(ir, 300); else ir();
    };
    vista().oninput = function (e) {
      if (e.target.id === 'apRQ') { rEst.q = e.target.value; recargarHist(true); }
      else if (e.target.id === 'apRUQ') { rEst.uq = e.target.value; rEst.uVisibles = 25; pintarUsuariosRetos(); }
    };
    vista().onchange = function (e) {
      if (e.target.id === 'apRTipo') { rEst.tipo = e.target.value; recargarHist(false); }
      else if (e.target.id === 'apRDesde') { rEst.desde = e.target.value; recargarHist(false); }
      else if (e.target.id === 'apRHasta') { rEst.hasta = e.target.value; recargarHist(false); }
    };
    vista().onclick = function (e) {
      acciones(e, {
        recargar: function () { retos(true); },
        'recargar-hist': function () { cargarHistorialRetos(); },
        ficha: function (b) { abrirFicha(b.dataset.uid); },
        'pag-ant': function () { rEst.pagina = Math.max(1, rEst.pagina - 1); cargarHistorialRetos(); },
        'pag-sig': function () { rEst.pagina += 1; cargarHistorialRetos(); },
        'usuarios-mas': function () { rEst.uVisibles += 25; pintarUsuariosRetos(); },
        'limpiar-filtros': function () {
          rEst.tipo = 'todos'; rEst.q = ''; rEst.desde = ''; rEst.hasta = ''; rEst.pagina = 1;
          document.getElementById('apRQ').value = ''; document.getElementById('apRTipo').value = 'todos';
          document.getElementById('apRDesde').value = ''; document.getElementById('apRHasta').value = '';
          cargarHistorialRetos();
        }
      });
    };
  }

  /* ───────── FORO Y DIRECTORIO ───────── */
  var cEst = { tab: 'foro', foro: null, dir: null, dq: '', dfiltro: 'todos', dVisibles: 25, abiertas: {}, texto: '' };
  var MAX_OFICIAL = 1500;

  function inicialDe(t) { var c = String(t || '').trim().charAt(0); return c ? c.toUpperCase() : '?'; }

  /* Publicar como Zoorigen (cuenta oficial) */
  function composerOficialHTML() {
    return '<section class="ap-card ap-oficial" aria-labelledby="apOficialTitulo">' +
      '<header class="ap-oficial__cab"><span class="ap-oficial__av" aria-hidden="true">Z</span><div><h2 id="apOficialTitulo">ZOORIGEN</h2>' +
      '<p>Publica como cuenta oficial, ideal para anuncios o resolver dudas de membresía.</p></div></header>' +
      '<div class="ap-card__cuerpo"><label class="sr-only" for="apOficialTexto">Mensaje oficial para la comunidad</label>' +
      '<textarea id="apOficialTexto" class="ap-oficial__texto" rows="4" maxlength="' + MAX_OFICIAL + '" placeholder="Escribe un anuncio o mensaje para la comunidad..."></textarea>' +
      '<div class="ap-oficial__pie"><span class="ap-oficial__nota">Solo texto. Lo verán todos los miembros del foro con la insignia «Zoorigen oficial».</span>' +
      '<span class="ap-oficial__cont" id="apOficialCont" aria-live="polite">0/' + MAX_OFICIAL + '</span>' +
      '<button type="button" class="ap-btn ap-btn--primario" id="apOficialBtn" data-accion="publicar" disabled>' + ico('send', { size: 16 }) + 'Publicar como Zoorigen</button></div></div></section>';
  }

  function respuestaHTML(postId, r) {
    return '<li class="ap-resp"><span class="ap-post__av ap-post__av--chico" aria-hidden="true">' + esc(inicialDe(r.autor)) + '</span>' +
      '<div class="ap-resp__txt"><strong>' + esc(r.autor) + '</strong>' + (r.oficial ? ' <span class="ap-badge ap-badge--ok">' + ico('badge-check', { size: 12 }) + '<span>Zoorigen oficial</span></span>' : '') +
      '<time datetime="' + esc(r.creado || '') + '">' + esc(P.fmtFechaHora(r.creado)) + '</time><p>' + esc(r.texto) + '</p></div>' +
      '<button type="button" class="ap-icono ap-icono--chico ap-icono--peligro" data-accion="borrar-resp" data-id="' + esc(postId) + '" data-rid="' + esc(r.id) + '" aria-label="Eliminar la respuesta de ' + esc(r.autor) + '">' + ico('trash-2', { size: 16 }) + '</button></li>';
  }

  function publicacionHTML(po) {
    var abierta = !!cEst.abiertas[po.id];
    var cuerpo = po.texto && po.texto !== po.titulo ? '<p class="ap-post__texto">' + esc(po.texto) + '</p>' : '';
    return '<article class="ap-post' + (po.oficial ? ' ap-post--oficial' : '') + '" data-id="' + esc(po.id) + '">' +
      '<header class="ap-post__cab"><span class="ap-post__av" aria-hidden="true">' + esc(inicialDe(po.autor)) + '</span>' +
      '<div class="ap-post__quien"><strong>' + esc(po.autor) + '</strong>' + (po.oficial ? ' <span class="ap-badge ap-badge--ok">' + ico('badge-check', { size: 14 }) + '<span>Zoorigen oficial</span></span>' : '') +
      '<time datetime="' + esc(po.creado || '') + '">' + esc(P.fmtFechaHora(po.creado)) + '</time></div>' +
      '<button type="button" class="ap-icono ap-icono--peligro" data-accion="borrar-post" data-id="' + esc(po.id) + '" aria-label="Eliminar la publicación «' + esc(po.titulo) + '»">' + ico('trash-2', { size: 18 }) + '</button></header>' +
      '<h3 class="ap-post__titulo">' + esc(po.titulo || 'Sin título') + '</h3>' + cuerpo +
      '<footer class="ap-post__pie"><span>' + ico('message-square', { size: 14 }) + esc(P.fmtNum(po.respuestas)) + (po.respuestas === 1 ? ' respuesta' : ' respuestas') + '</span><span>' + ico('star', { size: 14 }) + esc(P.fmtNum(po.meGusta)) + ' me gusta</span><span>' + ico('eye', { size: 14 }) + esc(P.fmtNum(po.vistas)) + (po.vistas === 1 ? ' vista' : ' vistas') + '</span>' +
      (po.respuestasLista.length ? '<button type="button" class="ap-btn ap-btn--chico ap-btn--suave" data-accion="ver-resp" data-id="' + esc(po.id) + '" aria-expanded="' + abierta + '">' + (abierta ? 'Ocultar respuestas' : 'Ver respuestas (' + po.respuestasLista.length + ')') + '</button>' : '') + '</footer>' +
      (po.respuestasLista.length ? '<ul class="ap-resps"' + (abierta ? '' : ' hidden') + '>' + po.respuestasLista.map(function (r) { return respuestaHTML(po.id, r); }).join('') + '</ul>' : '') + '</article>';
  }

  function pintarForo() {
    var cont = document.getElementById('apComTab');
    if (!cont) return;
    var f = cEst.foro;
    var lista = !f ? '<div class="ap-esqueleto"><div class="ap-esqueleto__fila"></div></div>'
      : f.publicaciones.length ? '<div class="ap-posts">' + f.publicaciones.map(publicacionHTML).join('') + '</div>'
      : vacio('Aún no hay publicaciones en el foro', 'Las discusiones de los miembros y tus anuncios oficiales aparecerán aquí, de la más reciente a la más antigua.', 'message-square');
    cont.innerHTML = composerOficialHTML() +
      '<div class="ap-seccion-cab"><h2>Publicaciones del foro</h2><p>Las ' + (f ? P.fmtNum(f.publicaciones.length) : '') + ' más recientes. Puedes borrar lo inapropiado con la papelera.</p></div>' + lista;
    var t = document.getElementById('apOficialTexto');
    if (t) { t.value = cEst.texto; actualizarContador(); }
  }

  function actualizarContador() {
    var t = document.getElementById('apOficialTexto'); var c = document.getElementById('apOficialCont'); var b = document.getElementById('apOficialBtn');
    if (!t || !c || !b) return;
    var n = t.value.length;
    c.textContent = n + '/' + MAX_OFICIAL;
    c.classList.toggle('ap-oficial__cont--limite', n >= MAX_OFICIAL);
    b.disabled = !t.value.trim();
  }

  async function cargarForo() {
    try { cEst.foro = await ctx.api('/api/admin/foro'); }
    catch (e) { var c = document.getElementById('apComTab'); if (c) c.innerHTML = errorHTML('Foro', e, 'recargar-tab'); return; }
    if (cEst.tab === 'foro') pintarForo();
  }

  async function publicarOficial() {
    var t = document.getElementById('apOficialTexto');
    var texto = t ? t.value.trim() : '';
    if (!texto) return;
    var ok = await confirmar({
      titulo: 'Publicar como Zoorigen',
      texto: 'Este mensaje lo verán <strong>todos los miembros</strong> en el foro con la insignia «Zoorigen oficial». Puedes borrarlo después con la papelera.',
      aceptar: 'Sí, publicar', cancelar: 'Seguir editando'
    });
    if (!ok) return;
    var b = document.getElementById('apOficialBtn'); if (b) b.disabled = true;
    try {
      await ctx.api('/api/admin/foro/publicar', { method: 'POST', body: { texto: texto } });
      cEst.texto = '';
      ctx.toast('Publicado en el foro como Zoorigen.');
      await cargarForo();
    } catch (e) { ctx.toast(e.message || 'No se pudo publicar.', true); if (b) b.disabled = false; }
  }

  function buscarPost(id) { return ((cEst.foro && cEst.foro.publicaciones) || []).filter(function (x) { return x.id === id; })[0] || null; }

  async function borrarPost(id) {
    var po = buscarPost(id);
    if (!po) return;
    var ok = await confirmar({
      titulo: 'Eliminar publicación',
      texto: '¿Eliminar la publicación «<strong>' + esc(po.titulo) + '</strong>» de ' + esc(po.autor) + '? Se borran también sus <strong>' + esc(P.fmtNum(po.respuestasLista.length)) + (po.respuestasLista.length === 1 ? ' respuesta' : ' respuestas') + '</strong>. No se puede deshacer; queda anotado en la bitácora.',
      aceptar: 'Sí, eliminar', cancelar: 'Mejor no', peligro: true
    });
    if (!ok) return;
    try { await ctx.api('/api/admin/foro/' + encodeURIComponent(id) + '/eliminar', { method: 'POST' }); ctx.toast('Publicación eliminada.'); await cargarForo(); }
    catch (e) { ctx.toast(e.message || 'No se pudo eliminar.', true); }
  }

  async function borrarRespuesta(id, rid) {
    var po = buscarPost(id);
    var r = po && po.respuestasLista.filter(function (x) { return x.id === rid; })[0];
    if (!r) return;
    var ok = await confirmar({
      titulo: 'Eliminar respuesta',
      texto: '¿Eliminar la respuesta de <strong>' + esc(r.autor) + '</strong>? «' + esc(r.texto.length > 140 ? r.texto.slice(0, 139) + '…' : r.texto) + '». No se puede deshacer.',
      aceptar: 'Sí, eliminar', cancelar: 'Mejor no', peligro: true
    });
    if (!ok) return;
    try { await ctx.api('/api/admin/foro/' + encodeURIComponent(id) + '/respuestas/' + encodeURIComponent(rid) + '/eliminar', { method: 'POST' }); ctx.toast('Respuesta eliminada.'); await cargarForo(); }
    catch (e) { ctx.toast(e.message || 'No se pudo eliminar.', true); }
  }

  /* Directorio: todas las tarjetas, con el contacto completo (solo lo ve la administración) */
  function contactoHTML(c) {
    var out = [];
    var enlace = function (url) { return /^https:\/\//i.test(url) ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url.replace(/^https:\/\//i, '')) + '</a>' : esc(url); };
    if (c.whatsapp) out.push('<span class="ap-dir__c">' + ico('phone', { size: 14 }) + '<span>WhatsApp ' + esc(c.whatsapp) + '</span></span>');
    if (c.email) out.push('<span class="ap-dir__c">' + ico('mail', { size: 14 }) + '<span class="ap-correo">' + esc(c.email) + '</span></span>');
    if (c.web) out.push('<span class="ap-dir__c">' + ico('globe', { size: 14 }) + '<span>' + enlace(c.web) + '</span></span>');
    if (c.linkedin) out.push('<span class="ap-dir__c">' + ico('link', { size: 14 }) + '<span>LinkedIn ' + enlace(c.linkedin) + '</span></span>');
    if (c.instagram) out.push('<span class="ap-dir__c">' + ico('link', { size: 14 }) + '<span>Instagram @' + esc(c.instagram) + '</span></span>');
    return out.length ? out.join('') : '<span class="ap-dir__c ap-dir__c--nd">' + ico('lock', { size: 14 }) + '<span>Sin contacto</span></span>';
  }

  function tarjetaDirHTML(t) {
    var puesto = [t.profesion, t.institucion].filter(Boolean).join(' · ');
    var lugar = [t.sector, t.ciudad].filter(Boolean).join(' · ');
    return '<li class="ap-dir" data-uid="' + esc(t.uid) + '"><span class="ap-post__av" aria-hidden="true">' + esc(P.iniciales(t.nombre)) + '</span>' +
      '<div class="ap-dir__txt"><div class="ap-dir__nombre"><strong>' + esc(t.nombre || 'Sin nombre') + '</strong>' +
      (t.publicado ? '<span class="ap-badge ap-badge--ok">' + ico('eye', { size: 14 }) + '<span>Visible</span></span>' : '<span class="ap-badge ap-badge--neutro">' + ico('lock', { size: 14 }) + '<span>Privada</span></span>') +
      (t.verificado ? '<span class="ap-badge ap-badge--info">' + ico('badge-check', { size: 14 }) + '<span>Verificado</span></span>' : '') + '</div>' +
      (puesto ? '<span class="ap-dir__linea">' + ico('briefcase', { size: 14 }) + '<span>' + esc(puesto) + '</span></span>' : '') +
      (lugar ? '<span class="ap-dir__linea">' + ico('map-pin', { size: 14 }) + '<span>' + esc(lugar) + '</span></span>' : '') +
      '<div class="ap-dir__contacto">' + contactoHTML(t.contacto || {}) + '</div>' +
      (t.cedula ? '<span class="ap-dir__linea ap-dir__linea--chica">' + ico('shield-check', { size: 14 }) + '<span>Cédula ' + esc(t.cedula) + (t.cedulaVisible ? ' (visible para los miembros)' : ' (no la muestra)') + '</span></span>' : '') + '</div>' +
      '<button type="button" class="ap-icono ap-icono--peligro" data-accion="borrar-dir" data-uid="' + esc(t.uid) + '" aria-label="Eliminar la tarjeta de ' + esc(t.nombre || 'esta persona') + '">' + ico('trash-2', { size: 18 }) + '</button></li>';
  }

  function pintarDirectorio() {
    var cont = document.getElementById('apComTab');
    if (!cont) return;
    var d = cEst.dir;
    if (!d) { cont.innerHTML = '<div class="ap-esqueleto"><div class="ap-esqueleto__fila"></div></div>'; return; }
    var q = P.sinAcentos(cEst.dq).trim();
    var lista = d.tarjetas.filter(function (t) {
      if (cEst.dfiltro === 'visibles' && !t.publicado) return false;
      if (cEst.dfiltro === 'privadas' && t.publicado) return false;
      if (!q) return true;
      return P.sinAcentos([t.nombre, t.profesion, t.institucion, t.sector, t.ciudad, (t.contacto || {}).email, (t.contacto || {}).whatsapp].join(' ')).indexOf(q) !== -1;
    });
    var chips = [['todos', 'Todas · ' + d.totales.total], ['visibles', 'Visibles · ' + d.totales.publicadas], ['privadas', 'Privadas · ' + d.totales.privadas]].map(function (c) {
      return '<button type="button" class="zs-chip" data-dfiltro="' + c[0] + '" aria-pressed="' + (cEst.dfiltro === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('');
    var mostrar = lista.slice(0, cEst.dVisibles);
    cont.innerHTML = '<div class="ap-controles"><div class="zs-chips" role="group" aria-label="Filtrar tarjetas">' + chips + '</div>' +
      '<div class="ap-controles__der"><label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar tarjeta</span><input type="search" id="apDirQ" placeholder="Buscar nombre, puesto o ciudad" autocomplete="off" value="' + esc(cEst.dq) + '"></label></div></div>' +
      '<p class="ap-nota ap-nota--sola">' + ico('lock', { size: 14 }) + ' El contacto completo y la cédula solo los ves tú: los miembros ven únicamente lo que cada persona decidió publicar.</p>' +
      (lista.length
        ? '<div class="ap-fc-zona"><div class="ap-fc-caja"><ul class="ap-fc-lista ap-dir-lista" aria-label="Tarjetas del directorio">' + mostrar.map(tarjetaDirHTML).join('') + '</ul></div></div>' +
          '<p class="ap-pie-tabla" role="status">Mostrando ' + P.fmtNum(mostrar.length) + ' de ' + P.fmtNum(lista.length) + '</p>' +
          (lista.length > mostrar.length ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="dir-mas">Mostrar ' + Math.min(25, lista.length - mostrar.length) + ' más</button>' : '')
        : vacio(d.totales.total ? 'Ninguna tarjeta coincide' : 'Aún no hay tarjetas en el directorio', d.totales.total ? 'Prueba con otra búsqueda o quita el filtro.' : 'Cuando los miembros creen su tarjeta aparecerá aquí, publicada o privada.', 'users'));
  }

  async function cargarDirectorio(forzar) {
    try { cEst.dir = await ctx.api('/api/admin/directorio' + (forzar ? '?refrescar=1' : '')); }
    catch (e) { var c = document.getElementById('apComTab'); if (c) c.innerHTML = errorHTML('Directorio', e, 'recargar-tab'); return; }
    if (cEst.tab === 'directorio') pintarDirectorio();
  }

  async function borrarTarjeta(uid) {
    var t = cEst.dir && cEst.dir.tarjetas.filter(function (x) { return x.uid === uid; })[0];
    if (!t) return;
    var ok = await confirmar({
      titulo: 'Eliminar tarjeta del directorio',
      texto: '¿Eliminar la tarjeta de <strong>' + esc(t.nombre || 'esta persona') + '</strong>' + (t.publicado ? ' (ahora la ven todos los miembros)' : '') + '? Deja de aparecer en el directorio; la persona puede crear otra. Queda anotado en la bitácora.',
      aceptar: 'Sí, eliminar', cancelar: 'Mejor no', peligro: true
    });
    if (!ok) return;
    try { await ctx.api('/api/admin/directorio/' + encodeURIComponent(uid) + '/eliminar', { method: 'POST' }); ctx.toast('Tarjeta eliminada.'); await cargarDirectorio(true); }
    catch (e) { ctx.toast(e.message || 'No se pudo eliminar.', true); }
  }

  function mostrarTab(tab) {
    cEst.tab = tab;
    document.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tab === tab)); });
    if (tab === 'foro') { pintarForo(); cargarForo(); } else { pintarDirectorio(); cargarDirectorio(false); }
  }

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
    cEst.foro = null; cEst.dir = null; cEst.abiertas = {};
    vista().innerHTML = P.tarjetaTitulo({
      icono: 'message-square', eyebrow: 'Panel de administración', titulo: 'Foro', acento: 'y directorio.',
      sub: 'Modera el foro, publica como Zoorigen y revisa todas las tarjetas del directorio, publicadas o privadas, con su contacto.',
      cifras: [
        { valor: P.fmtNum(r.discusiones.length), rotulo: 'discusiones recientes' },
        { valor: P.fmtNum(d.total), rotulo: 'tarjetas del directorio' },
        { valor: P.fmtNum(d.publicadas), rotulo: 'visibles' }
      ],
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    }) +
      '<div class="ap-kpis">' + [
        kpi({ icono: 'message-square', rotulo: 'Discusiones recientes', valor: P.fmtNum(r.discusiones.length), nota: 'Las últimas 30 del foro', tono: 'info' }),
        kpi({ icono: 'eye', rotulo: 'Tarjetas visibles', valor: P.fmtNum(d.publicadas), nota: 'Las ven los miembros', tono: 'ok' }),
        kpi({ icono: 'lock', rotulo: 'Tarjetas privadas', valor: P.fmtNum(d.privadas), nota: 'Solo su dueña o dueño', tono: 'neutro' }),
        kpi({ icono: 'shield-check', rotulo: 'Con cédula visible', valor: P.fmtNum(d.conCedulaVisible), nota: 'Eligieron mostrarla', tono: 'info' })
      ].join('') + '</div>' +
      '<div class="ap-controles"><div class="zs-chips" role="group" aria-label="Foro o directorio">' +
      '<button type="button" class="zs-chip" data-tab="foro" aria-pressed="true">' + ico('message-square', { size: 16 }) + 'Foro</button>' +
      '<button type="button" class="zs-chip" data-tab="directorio" aria-pressed="false">' + ico('users', { size: 16 }) + 'Directorio · ' + P.fmtNum(d.total) + '</button></div></div>' +
      '<div id="apComTab"></div>';
    cEst.tab = 'foro';
    pintarForo(); cargarForo();
    vista().oninput = function (e) {
      if (e.target.id === 'apOficialTexto') { cEst.texto = e.target.value; actualizarContador(); }
      else if (e.target.id === 'apDirQ') { cEst.dq = e.target.value; cEst.dVisibles = 25; pintarDirectorio(); var i = document.getElementById('apDirQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    };
    vista().onclick = function (e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) { mostrarTab(tab.dataset.tab); return; }
      var chip = e.target.closest('[data-dfiltro]');
      if (chip) { cEst.dfiltro = chip.dataset.dfiltro; cEst.dVisibles = 25; pintarDirectorio(); return; }
      acciones(e, {
        recargar: function () { comunidad(true); },
        'recargar-tab': function () { mostrarTab(cEst.tab); },
        publicar: function () { publicarOficial(); },
        'borrar-post': function (b) { borrarPost(b.dataset.id); },
        'borrar-resp': function (b) { borrarRespuesta(b.dataset.id, b.dataset.rid); },
        'ver-resp': function (b) {
          var art = b.closest('.ap-post'); var ul = art && art.querySelector('.ap-resps');
          if (!ul) return;
          var abrir = ul.hidden; ul.hidden = !abrir; cEst.abiertas[b.dataset.id] = abrir;
          b.setAttribute('aria-expanded', String(abrir));
          b.textContent = abrir ? 'Ocultar respuestas' : 'Ver respuestas (' + ul.children.length + ')';
        },
        'borrar-dir': function (b) { borrarTarjeta(b.dataset.uid); },
        'dir-mas': function () { cEst.dVisibles += 25; pintarDirectorio(); }
      });
    };
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

  /* ───────── CONFIGURACIÓN ─────────
     Cuatro tarjetas, en este orden: Precios de la membresía VIP (solo lectura), Contacto, Estado de servicios e Historial del servidor.
     Las piezas de cada tarjeta están en admin-servidor.js (se prueban en Node). Aquí solo se leen los endpoints y se conectan los botones. */
  var cfg = { datos: null, modo: 'problemas', dias: 30 };

  function leerSuave(ruta) { return ctx.api(ruta).then(function (r) { return r; }, function (e) { return { __error: e }; }); }
  function sinError(r) { return r && !r.__error ? r : null; }

  async function configuracion() {
    var mi = ++contador;
    vista().innerHTML = cargando('Configuración');
    var r = await Promise.all([leerSuave('/api/admin/precios'), leerSuave('/api/admin/contacto'), leerSuave('/api/admin/servicios'), leerSuave('/api/admin/servidor/historial?dias=' + cfg.dias)]);
    if (mi !== contador) return;
    if (r.every(function (x) { return x.__error; })) {
      vista().innerHTML = errorHTML('Configuración', r[0].__error, 'recargar');
      vista().onclick = function (ev) { acciones(ev, { recargar: function () { configuracion(); } }); };
      return;
    }
    cfg.datos = { precios: sinError(r[0]), contacto: sinError(r[1]), servicios: sinError(r[2]), historial: sinError(r[3]) };
    pintarConfiguracion();
  }

  function reemplazarTarjeta(id, html) {
    var el = document.getElementById(id);
    if (el) el.outerHTML = html;
  }

  function pintarConfiguracion() {
    var d = cfg.datos;
    var sv = d.servicios && d.servicios.comprobaciones ? d.servicios.comprobaciones : [];
    var h = d.historial && d.historial.resumen;
    vista().innerHTML = P.tarjetaTitulo({
      icono: 'settings', eyebrow: 'Panel de administración', titulo: 'Ajustes', acento: 'del sitio.',
      sub: 'Los precios que se cobran, el contacto que ve el Club, el estado de los servicios y el historial del servidor.',
      cifras: [
        sv.length ? { valor: sv.filter(function (x) { return x.nivel === 'ok'; }).length + ' de ' + sv.length, rotulo: 'servicios en orden' } : null,
        h ? { valor: P.fmtNum(h.caidas), rotulo: 'caídas en ' + d.historial.dias + ' días' } : null
      ].filter(Boolean),
      acciones: [{ id: 'recargar', texto: 'Actualizar todo', icono: 'refresh-cw' }]
    }) + S.tarjetasHTML(d, { modo: cfg.modo });
    var v = vista();

    var copiar = async function (texto, ok) {
      try { await navigator.clipboard.writeText(texto); ctx.toast(ok); } catch (e) { ctx.toast('No se pudo copiar el reporte.', true); }
    };
    var ocupado = function (b, si, texto) {
      if (!b) return;
      b.disabled = si;
      if (texto) b.lastChild.textContent = texto;
    };
    var recargarServicios = async function (b) {
      ocupado(b, true, 'Revisando…');
      var r = await leerSuave('/api/admin/servicios');
      if (sinError(r)) { cfg.datos.servicios = r; ctx.toast('Estado revisado.'); } else ctx.toast((r.__error && r.__error.message) || 'No se pudo revisar el estado.', true);
      reemplazarTarjeta('apCfgServicios', S.tarjetaServicios(cfg.datos.servicios));
    };
    var recargarHistorial = async function (b) {
      ocupado(b, true, 'Actualizando…');
      var r = await leerSuave('/api/admin/servidor/historial?dias=' + cfg.dias);
      if (sinError(r)) cfg.datos.historial = r; else ctx.toast((r.__error && r.__error.message) || 'No se pudo leer el historial.', true);
      reemplazarTarjeta('apCfgHistorial', S.tarjetaHistorial(cfg.datos.historial, { modo: cfg.modo }));
    };
    var guardarContacto = async function (cuerpo, okTexto) {
      var err = document.getElementById('apContactoError');
      if (err) err.hidden = true;
      var botones = v.querySelectorAll('#apCfgContacto button'); botones.forEach(function (x) { x.disabled = true; });
      try {
        var r = await ctx.api('/api/admin/contacto', { method: 'POST', body: cuerpo });
        cfg.datos.contacto = { contacto: r.contacto, porDefecto: cfg.datos.contacto ? cfg.datos.contacto.porDefecto : null };
        reemplazarTarjeta('apCfgContacto', S.tarjetaContacto(cfg.datos.contacto));
        ctx.toast(okTexto);
      } catch (e) {
        botones.forEach(function (x) { x.disabled = false; });
        if (err) { err.textContent = (e && e.message) || 'No se pudo guardar el contacto.'; err.hidden = false; }
        else ctx.toast((e && e.message) || 'No se pudo guardar el contacto.', true);
      }
    };
    var leerFormulario = function () {
      var g = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
      return { whatsapp: g('apCtWhatsapp'), instagram: g('apCtInstagram'), correo: g('apCtCorreo') };
    };

    v.onclick = function (ev) {
      var chip = ev.target.closest('[data-historial-modo]');
      if (chip) {
        cfg.modo = chip.dataset.historialModo === 'todo' ? 'todo' : 'problemas';
        reemplazarTarjeta('apCfgHistorial', S.tarjetaHistorial(cfg.datos.historial, { modo: cfg.modo }));
        return;
      }
      acciones(ev, {
        recargar: function () { configuracion(); },
        'actualizar-precios': async function (b) {
          ocupado(b, true, 'Actualizando…');
          var r = await leerSuave('/api/admin/precios?refrescar=1');
          if (sinError(r)) cfg.datos.precios = r; else ctx.toast((r.__error && r.__error.message) || 'No se pudieron leer los precios.', true);
          reemplazarTarjeta('apCfgPrecios', S.tarjetaPrecios(cfg.datos.precios));
        },
        'guardar-contacto': function () { guardarContacto(leerFormulario(), 'Contacto guardado. El Club lo mostrará en unos minutos.'); },
        'restablecer-contacto': function () {
          var por = cfg.datos.contacto && cfg.datos.contacto.porDefecto;
          if (!por) { ctx.toast('No se pudieron leer los datos de siempre.', true); return; }
          confirmar({ titulo: 'Volver a los datos de siempre', texto: 'El Club volverá a usar el WhatsApp, el Instagram y el correo con los que nació. Podrás cambiarlos otra vez cuando quieras.', aceptar: 'Sí, volver', cancelar: 'Mejor no', peligro: false })
            .then(function (si) { if (si) guardarContacto({ whatsapp: por.whatsapp, instagram: por.instagram, correo: por.correo }, 'Contacto restablecido.'); });
        },
        'revisar-servicios': function (b) { recargarServicios(b); },
        'copiar-servicios': function () { copiar(S.reporteServicios(cfg.datos.servicios, new Date().toISOString()), 'Reporte copiado. Pégalo en un mensaje para pedir ayuda.'); },
        'actualizar-historial': function (b) { recargarHistorial(b); },
        'copiar-historial': function () { copiar(S.reporteHistorial(cfg.datos.historial, new Date().toISOString()), 'Reporte copiado. Pégalo en un mensaje para pedir ayuda.'); },
        'marcar-normales': function () {
          var n = cfg.datos.historial && cfg.datos.historial.resumen ? cfg.datos.historial.resumen.reiniciosInesperados : 0;
          confirmar({
            titulo: 'Marcar como publicaciones normales',
            texto: 'Se marcarán ' + P.fmtNum(n) + (n === 1 ? ' reinicio' : ' reinicios') + ' como publicaciones normales. Quedan en el historial, pero dejan de contar como problema. Hazlo solo si sabes que fueron por publicar cambios.',
            aceptar: 'Sí, marcarlos', cancelar: 'Mejor no', peligro: false
          }).then(async function (si) {
            if (!si) return;
            try {
              var r = await ctx.api('/api/admin/servidor/reconocer-reinicios', { method: 'POST', body: {} });
              ctx.toast(P.fmtNum(r.marcados) + (r.marcados === 1 ? ' reinicio marcado.' : ' reinicios marcados.'));
              await recargarHistorial(null);
            } catch (e) { ctx.toast((e && e.message) || 'No se pudo marcar.', true); }
          });
        }
      });
    };
    v.onsubmit = function (ev) {
      if (ev.target && ev.target.id === 'apContactoForm') { ev.preventDefault(); guardarContacto(leerFormulario(), 'Contacto guardado. El Club lo mostrará en unos minutos.'); }
    };
    v.onchange = function (ev) {
      var sel = ev.target.closest('#apHistorialDias');
      if (!sel) return;
      cfg.dias = parseInt(sel.value, 10) || 30;
      recargarHistorial(null);
    };
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
    referidos: referidos, configuracion: configuracion, avance: avanceMiembros,
    agregarVerificadorFolio: agregarVerificadorFolio, modal: modal, confirmar: confirmar,
    abrirFicha: function (uid) { return abrirFicha(uid); },
    // Piezas que reutilizan las vistas de Marketing (admin-marketing.js)
    util: {
      contexto: function () { return ctx; }, vista: vista, cargando: cargando, errorHTML: errorHTML, vacio: vacio, kpi: kpi, tarjeta: tarjeta,
      tablaZona: tablaZona, acciones: acciones, nuevoContador: function () { return ++contador; }, contadorActual: function () { return contador; }
    }
  };
})(typeof self !== 'undefined' ? self : this);
