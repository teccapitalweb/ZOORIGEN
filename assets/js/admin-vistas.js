/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · VISTAS                              */
/* Dibuja las secciones nuevas (Resumen, Miembros, Suscripciones,*/
/* Retos, Foro y directorio, Referidos, Herramientas,            */
/* Configuración y Estado) con los datos que entrega el          */
/* servidor (GET /api/admin/*). Nunca lee Firestore directo y    */
/* nunca inventa cifras: sin datos, muestra un vacío amable.     */
/* Todo texto que viene del servidor pasa por esc().             */
/* ============================================================ */
(function (root) {
  'use strict';

  var P = root.ZOO_ADMIN_PANEL;
  var I = root.ZOO_ICONOS;
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
      (o.nota ? '<p class="ap-kpi__nota">' + esc(o.nota) + '</p>' : '') + '</div></article>';
  }

  function tarjeta(titulo, cuerpo, o) {
    var op = o || {};
    return '<section class="ap-card' + (op.clase ? ' ' + op.clase : '') + '"' + (op.id ? ' id="' + esc(op.id) + '"' : '') + '>' +
      '<header class="ap-card__cab"><h2>' + esc(titulo) + '</h2>' + (op.nota ? '<p>' + esc(op.nota) + '</p>' : '') + '</header>' +
      '<div class="ap-card__cuerpo">' + cuerpo + '</div></section>';
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
      kpi({ icono: 'user-plus', rotulo: 'Nuevos esta semana', valor: P.fmtNum(k.nuevosSemana), nota: 'Registros de los últimos 7 días', tono: 'info' }),
      kpi({ icono: 'calendar-clock', rotulo: 'Vencen pronto', valor: P.fmtNum(k.vencenPronto), nota: 'En los próximos 7 días', tono: k.vencenPronto ? 'aviso' : 'neutro' }),
      kpi({ icono: 'credit-card', rotulo: 'Ingresos estimados del mes', valor: k.ingresosMesEstimado === null ? null : '$' + P.fmtNum(k.ingresosMesEstimado), nota: k.ingresosMesEstimado === null ? 'Aún no hay pagos registrados' : 'MXN · ' + P.fmtNum(k.pagosMes) + ' pagos · estimación', tono: 'ok' }),
      kpi({ icono: 'award', rotulo: 'Certificados emitidos', valor: P.fmtNum(k.certificadosEmitidos), nota: 'Con folio verificable', tono: 'info' }),
      kpi({ icono: 'graduation-cap', rotulo: 'Cursos completados', valor: P.fmtNum(k.cursosCompletados), nota: 'Terminados en la plataforma', tono: 'ok' }),
      kpi({ icono: 'triangle-alert', rotulo: 'Pago pendiente', valor: P.fmtNum(k.pagoPendiente), nota: k.vencidos ? P.fmtNum(k.vencidos) + ' vencidos' : 'Sin vencidos', tono: k.pagoPendiente ? 'error' : 'neutro' })
    ].join('') + '</div>';

    var altas = P.graficaLinea(r.altasSemanales.map(function (s) { return { etiqueta: P.fmtFecha(s.desde).replace(/ \d{4}$/, ''), valor: s.n }; }),
      { titulo: 'Altas por semana', descripcion: 'Altas semanales de miembros de las últimas 12 semanas' });
    var ingresos = P.graficaBarras(r.ingresosMensuales.map(function (m) { return { etiqueta: P.fmtMes(m.mes).split(' ')[0], valor: m.estimado }; }),
      { titulo: 'Ingresos estimados por mes', formato: function (v) { return '$' + Math.round(v).toLocaleString('es-MX'); }, descripcion: 'Ingresos estimados de los últimos 6 meses' });

    var estados = P.barraReparto([
      { etiqueta: 'Activos', valor: r.porEstado.activo, tono: 'ok' },
      { etiqueta: 'Cancelados con acceso', valor: r.porEstado['cancelado-vigente'], tono: 'aviso' },
      { etiqueta: 'Pago pendiente', valor: r.porEstado['pago-pendiente'], tono: 'error' },
      { etiqueta: 'Vencidos', valor: r.porEstado.vencido, tono: 'apagado' },
      { etiqueta: 'Sin membresía', valor: r.porEstado['sin-plan'], tono: 'neutro' }
    ]);

    var venc = r.proximosVencimientos.length
      ? '<ul class="ap-lista">' + r.proximosVencimientos.map(function (v) {
        return '<li><button type="button" class="ap-lista__fila" data-accion="ficha" data-uid="' + esc(v.uid) + '"><span class="ap-lista__t"><strong>' + esc(v.nombre || 'Sin nombre') + '</strong><span>' + esc(v.correo) + '</span></span>' +
          '<span class="ap-lista__d">' + esc(P.fmtFecha(v.vence)) + '<small>' + esc(P.relativo(v.vence)) + '</small></span></button></li>';
      }).join('') + '</ul>'
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

  function filaMiembro(m) {
    var accionPlan = '<button type="button" class="ap-btn ap-btn--chico ap-btn--suave" data-accion="activar" data-uid="' + esc(m.uid) + '">' + ico(m.conAcceso ? 'calendar-plus' : 'badge-check', { size: 16 }) + (m.conAcceso ? 'Ampliar' : 'Activar') + '</button>';
    var accionCancelar = m.conAcceso && m.estado !== 'cancelado-vigente'
      ? '<button type="button" class="ap-btn ap-btn--chico ap-btn--peligro-suave" data-accion="cancelar" data-uid="' + esc(m.uid) + '">' + ico('ban', { size: 16 }) + 'Cancelar</button>' : '';
    var pronto = m.conAcceso && m.vence && (new Date(m.vence).getTime() - Date.now()) < 7 * 86400000;
    return '<tr class="ap-fila" data-uid="' + esc(m.uid) + '">' +
      '<td class="ap-celda-miembro" data-label="Miembro"><div class="ap-persona"><span class="ap-avatar ap-avatar--' + esc(m.estado) + '" aria-hidden="true">' + esc(P.iniciales(m.nombre || m.correo)) + '</span>' +
      '<div class="ap-persona__txt"><strong>' + esc(m.nombre || 'Sin nombre') + (m.esAdmin ? ' <span class="ap-etiqueta">Admin</span>' : '') + '</strong><span>' + esc(m.correo || '—') + '</span></div></div></td>' +
      '<td data-label="Estado">' + P.insignia(m.estado) + (planTexto(m) ? '<span class="ap-sub">' + esc(planTexto(m)) + '</span>' : '') + '</td>' +
      '<td data-label="Vence">' + (m.vence ? '<span class="ap-fecha">' + esc(P.fmtFecha(m.vence)) + '</span><span class="ap-sub' + (pronto ? ' ap-sub--aviso' : '') + '">' + esc(P.relativo(m.vence)) + '</span>' : '<span class="ap-sub">—</span>') + '</td>' +
      '<td data-label="Registro"><span class="ap-fecha">' + esc(P.fmtFecha(m.registro)) + '</span></td>' +
      '<td class="ap-celda-acciones"><button type="button" class="ap-btn ap-btn--chico ap-btn--primario" data-accion="ficha" data-uid="' + esc(m.uid) + '">' + ico('eye', { size: 16 }) + 'Ver ficha</button>' + accionPlan + accionCancelar + '</td></tr>';
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
    cont.innerHTML = '<div class="ap-tabla-envoltura"><table class="ap-tabla"><thead><tr><th scope="col">Miembro</th><th scope="col">Estado</th><th scope="col">Vence</th><th scope="col">Registro</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
      mostrar.map(filaMiembro).join('') + '</tbody></table></div>' +
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
      acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
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
        cancelar: function (b) { abrirCancelar(b.dataset.uid); }
      });
    };
  }

  function miembroLocal(uid) {
    var l = estado.miembros && estado.miembros.miembros;
    return (l || []).filter(function (m) { return m.uid === uid; })[0] || null;
  }

  async function abrirFicha(uid) {
    var r;
    try { r = await ctx.api('/api/admin/miembros/' + encodeURIComponent(uid)); } catch (e) {
      ctx.toast(e.status === 404 ? 'No encontramos a esa persona.' : (e.message || 'No se pudo abrir la ficha.'), true);
      return;
    }
    var m = r.miembro;
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
      '<div><strong>' + esc(m.nombre || 'Sin nombre') + '</strong><span>' + esc(m.correo || '—') + '</span>' + P.insignia(m.estado) + '</div></div>' +
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
    if (miembroLocal(uid)) {
      botones.push({ id: 'activar', texto: m.conAcceso ? 'Ampliar plan' : 'Activar plan', tipo: 'primario' });
    }
    var elegido = await modal({ titulo: 'Ficha del miembro', cuerpo: cuerpo, botones: botones, ancho: 'ancho' });
    if (elegido === 'activar') abrirActivar(uid);
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

    var fila = function (m) {
      return '<li><button type="button" class="ap-lista__fila" data-accion="ficha" data-uid="' + esc(m.uid) + '"><span class="ap-lista__t"><strong>' + esc(m.nombre || 'Sin nombre') + '</strong><span>' + esc(planTexto(m) || m.correo) + '</span></span>' +
        '<span class="ap-lista__d">' + esc(P.fmtFecha(m.vence)) + '<small>' + esc(P.relativo(m.vence)) + '</small></span></button></li>';
    };
    var bloque = function (arr, vacioT, vacioX) {
      return arr.length ? '<ul class="ap-lista">' + arr.slice(0, 8).map(fila).join('') + '</ul>' + (arr.length > 8 ? '<p class="ap-pie-tabla">Y ' + (arr.length - 8) + ' más. Búscalos en Miembros.</p>' : '') : vacio(vacioT, vacioX, 'circle-check');
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
      tarjeta('Ingresos estimados por mes', P.graficaBarras(r.ingresosMensuales.map(function (m) { return { etiqueta: P.fmtMes(m.mes).split(' ')[0], valor: m.estimado }; }),
        { titulo: 'Ingresos estimados por mes', formato: function (v) { return '$' + Math.round(v).toLocaleString('es-MX'); } }), { nota: r.notas.ingresos }) +
      tarjeta('Planes y origen', P.barraReparto([
        { etiqueta: 'Mensual', valor: r.porPlan.mensual, tono: 'info' },
        { etiqueta: 'Anual', valor: r.porPlan.anual, tono: 'ok' },
        { etiqueta: 'Sin tipo de plan', valor: r.porPlan.otro, tono: 'neutro' }
      ]) + '<div class="ap-separador"></div>' + P.barraReparto([
        { etiqueta: 'Stripe', valor: r.porOrigen.stripe, tono: 'info' },
        { etiqueta: 'Manual', valor: r.porOrigen.manual, tono: 'aviso' },
        { etiqueta: 'Heredado', valor: r.porOrigen.heredado, tono: 'neutro' },
        { etiqueta: 'Otro', valor: r.porOrigen.otro, tono: 'apagado' }
      ]), { nota: 'Solo cuentan quienes tienen acceso hoy.' }) +
      '</div><div class="ap-columnas">' +
      tarjeta('Vencen en los próximos 30 días', bloque(en30, 'Nadie vence pronto', 'Cuando una membresía esté por vencer aparecerá aquí.')) +
      tarjeta('Pago pendiente', bloque(pendientes, 'Sin pagos pendientes', 'Todos los cobros recientes se confirmaron.')) +
      '</div>' +
      tarjeta('Activaciones manuales vigentes', bloque(manuales, 'Sin activaciones manuales', 'Las membresías que actives a mano aparecerán aquí.'), { nota: 'Transferencias, efectivo y cortesías.' }) +
      P.bloqueProntoHTML({
        icono: 'credit-card', titulo: 'Historial de cobros de Stripe',
        texto: 'Aquí verás cada cobro, reembolso y factura. Hoy el servidor guarda el estado del plan de cada persona, pero no un libro de cobros.',
        faltan: ['GET /api/admin/pagos (cobros, reembolsos y facturas de Stripe)']
      });
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
      ? '<div class="ap-tabla-envoltura"><table class="ap-tabla ap-tabla--simple"><thead><tr><th scope="col">#</th><th scope="col">Persona</th><th scope="col">Retos superados</th><th scope="col">XP</th></tr></thead><tbody>' +
        top.map(function (f, i) { return '<tr><td data-label="Lugar">' + (i + 1) + '</td><td data-label="Persona"><strong>' + esc(f.nombre) + '</strong></td><td data-label="Retos superados">' + esc(P.fmtNum(f.superados)) + '</td><td data-label="XP">' + esc(P.fmtNum(f.xp)) + '</td></tr>'; }).join('') +
        '</tbody></table></div>'
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
      tarjeta('Quiénes van al frente', tabla, { nota: 'Las diez personas con más XP de retos.' }) +
      P.bloqueProntoHTML({
        icono: 'target', titulo: 'Editar el catálogo de retos y su XP',
        texto: 'Hoy los retos y su XP viven en el código del servidor. Desde aquí podrás activar, pausar y ajustar cada reto sin publicar.',
        faltan: ['GET y POST /api/admin/retos/catalogo (editar retos, XP y vigencia)']
      });
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
      ? P.barraReparto(d.porSector.map(function (s, i) { return { etiqueta: s.sector, valor: s.n, tono: ['info', 'ok', 'aviso', 'neutro'][i % 4] }; }))
      : vacio('Sin tarjetas todavía', 'Cuando los miembros creen su tarjeta aparecerán sus sectores aquí.', 'users');
    var discusiones = r.discusiones.length
      ? '<ul class="ap-lista">' + r.discusiones.map(function (p) {
        return '<li><div class="ap-lista__fila ap-lista__fila--texto"><span class="ap-lista__t"><strong>' + esc(p.titulo || 'Sin título') + '</strong><span>' + esc(p.autor || 'Anónimo') + ' · ' + esc(P.fmtFecha(p.creado)) + '</span>' +
          (p.extracto ? '<span class="ap-extracto">' + esc(p.extracto) + '</span>' : '') + '</span>' +
          '<span class="ap-lista__d">' + esc(P.fmtNum(p.respuestas)) + ' resp.<small>' + esc(P.fmtNum(p.me_gusta)) + ' me gusta</small></span></div></li>';
      }).join('') + '</ul>'
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
      tarjeta('Discusiones recientes', discusiones, { nota: 'Las últimas 30 del foro.' }) + '</div>' +
      P.bloqueProntoHTML({
        icono: 'shield-check', titulo: 'Moderación: reportes y ocultar publicaciones',
        texto: 'Aquí verás las tarjetas y discusiones reportadas por la comunidad y podrás ocultarlas o devolverlas con un clic. Hoy el foro no tiene reportes ni acciones de moderación en el servidor.',
        faltan: ['Campo de reportes en foroPosts y directorio', 'POST /api/admin/foro/:id/ocultar', 'POST /api/admin/directorio/:uid/ocultar']
      });
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
      ? '<div class="ap-tabla-envoltura"><table class="ap-tabla ap-tabla--simple"><thead><tr><th scope="col">Persona que invita</th><th scope="col">Invitados</th><th scope="col">Válidos</th></tr></thead><tbody>' +
        r.anfitriones.map(function (a) { return '<tr><td data-label="Persona"><strong>' + esc(a.nombre) + '</strong></td><td data-label="Invitados">' + esc(P.fmtNum(a.invitados)) + '</td><td data-label="Válidos">' + esc(P.fmtNum(a.validos)) + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : vacio('Aún no hay invitaciones', 'Cuando un miembro invite a alguien y esa persona se registre, aparecerá aquí.', 'gift');
    var motivos = r.motivosRechazo.length
      ? '<ul class="ap-lista">' + r.motivosRechazo.map(function (m) { return '<li><div class="ap-lista__fila ap-lista__fila--texto"><span class="ap-lista__t"><strong>' + esc(m.motivo) + '</strong></span><span class="ap-lista__d">' + esc(P.fmtNum(m.n)) + '</span></div></li>'; }).join('') + '</ul>'
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

  /* ───────── HERRAMIENTAS ───────── */
  function herramientas() {
    ++contador;
    vista().innerHTML = P.tarjetaTitulo({
      icono: 'wrench', eyebrow: 'Panel de administración', titulo: 'Herramientas', acento: 'del Club.',
      sub: 'Referencia clínica y legal que ven los miembros. Aquí se revisará el estado de cada una.'
    }) +
      P.bloqueProntoHTML({
        icono: 'wrench', titulo: 'Estado de cada herramienta',
        texto: 'Verás de cada herramienta si está activa, cuántas veces se usó y cuándo se revisaron sus datos. Hoy las herramientas se administran desde el código del sitio y no reportan uso al servidor.',
        faltan: ['GET /api/admin/herramientas (estado y uso de cada herramienta)', 'Registro de uso por herramienta (sin datos personales)']
      }) +
      '<div class="ap-aviso ap-aviso--info" role="note">' + ico('info', { size: 20 }) + '<div><p>Mientras tanto, revisa las herramientas tal como las ve un miembro.</p>' +
      '<a class="ap-btn ap-btn--suave" href="club-herramientas.html?como=user">' + ico('external-link', { size: 16 }) + 'Abrir Herramientas en el Club</a></div></div>';
    vista().onclick = null;
  }

  /* ───────── CONFIGURACIÓN ───────── */
  async function configuracion() {
    var mi = ++contador;
    var enVivo = !!(root.ZOO_CONFIG && root.ZOO_CONFIG.enVivoPronto && root.ZOO_CONFIG.enVivoPronto());
    var admins = null; var fallo = null;
    vista().innerHTML = cargando('Configuración');
    try { admins = (await ctx.api('/api/admin/estado')).administradores; } catch (e) { fallo = e; }
    if (mi !== contador) return;
    var listaAdmins = admins && admins.length
      ? '<ul class="ap-lista">' + admins.map(function (a) { return '<li><div class="ap-lista__fila ap-lista__fila--texto"><span class="ap-lista__t"><strong>' + esc(a) + '</strong><span>Correo de administración (parcialmente oculto)</span></span></div></li>'; }).join('') + '</ul>'
      : '<p class="ap-nada">' + (fallo ? 'No se pudo leer la lista.' : 'No hay correos en ADMIN_EMAILS: las cuentas con marca de administrador en Firestore siguen funcionando.') + '</p>';
    vista().innerHTML = P.tarjetaTitulo({
      icono: 'settings', eyebrow: 'Panel de administración', titulo: 'Ajustes', acento: 'del sitio.',
      sub: 'Quién administra y los interruptores que cambian lo que ven los miembros.'
    }) +
      '<div class="ap-columnas">' +
      tarjeta('Clases en vivo (webinars)', '<div class="ap-ajuste"><span class="ap-badge ap-badge--' + (enVivo ? 'aviso' : 'ok') + '">' + ico(enVivo ? 'hourglass' : 'circle-check', { size: 14 }) + '<span>' + (enVivo ? 'Se muestran como Próximamente' : 'Activas para los miembros') + '</span></span>' +
        '<p>Valor actual de <code>clasesEnVivoPronto</code>: <strong>' + (enVivo ? 'sí' : 'no') + '</strong>. Mientras sea «sí», el Club dice Próximamente en Webinars, el widget de próximo webinar y el menú.</p>' +
        '<p class="ap-nota">Hoy se cambia en el archivo <code>assets/js/club-config.js</code> y se publica el sitio. Editarlo desde aquí queda Próximamente.</p></div>', { nota: 'Interruptor global del Club.' }) +
      tarjeta('Quién administra', listaAdmins + '<p class="ap-nota">Los correos se definen en la variable <code>ADMIN_EMAILS</code> del servidor (Railway). El panel no puede cambiarlos: por seguridad, solo el equipo técnico lo hace.</p>', { nota: 'Cuentas con acceso a este panel.' }) +
      '</div>' +
      P.bloqueProntoHTML({
        icono: 'settings', titulo: 'Textos y avisos del sitio',
        texto: 'Podrás editar los mensajes generales del Club (banners, avisos de mantenimiento y textos de ayuda) sin publicar el sitio.',
        faltan: ['GET y POST /api/admin/config (interruptores y textos)']
      });
    vista().onclick = null;
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

    var variables = '<div class="ap-tabla-envoltura"><table class="ap-tabla ap-tabla--simple"><thead><tr><th scope="col">Variable</th><th scope="col">Para qué sirve</th><th scope="col">Estado</th></tr></thead><tbody>' +
      r.variables.map(function (v) {
        var estadoV = v.definida ? '<span class="ap-badge ap-badge--ok">' + ico('circle-check', { size: 14 }) + '<span>Definida</span></span>'
          : '<span class="ap-badge ap-badge--' + (v.critica ? 'error' : 'neutro') + '">' + ico(v.critica ? 'triangle-alert' : 'circle-dashed', { size: 14 }) + '<span>' + (v.critica ? 'Falta' : 'No definida') + '</span></span>';
        return '<tr><td data-label="Variable"><code>' + esc(v.nombre) + '</code></td><td data-label="Para qué sirve">' + esc(v.para) + '</td><td data-label="Estado">' + estadoV + '</td></tr>';
      }).join('') + '</tbody></table></div>';

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
    return '<span class="ap-num">' + esc(P.fmtNum(guardadas)) + '</span><span class="ap-sub">' + (f.importado ? 'ya guardadas' : 'por importar') + '</span>';
  }

  function filaAvance(f) {
    var e = P.estadoAvance(f);
    var uid = esc(f.uid);
    var acc = '<button type="button" class="ap-btn ap-btn--chico ap-btn--suave" data-accion="detalle" data-uid="' + uid + '">' + ico('eye', { size: 16 }) + 'Ver detalle</button>';
    if (e.accion === 'importar') acc = '<button type="button" class="ap-btn ap-btn--chico ap-btn--primario" data-accion="importar" data-uid="' + uid + '">' + ico('download', { size: 16 }) + 'Importar ahora</button>' + acc;
    else if (e.accion === 'reparar') acc = '<button type="button" class="ap-btn ap-btn--chico ap-btn--primario" data-accion="reparar" data-uid="' + uid + '">' + ico('refresh-cw', { size: 16 }) + 'Reparar</button>' + acc;
    else if (e.accion === 'forzar') acc = '<button type="button" class="ap-btn ap-btn--chico ap-btn--peligro-suave" data-accion="forzar" data-uid="' + uid + '">' + ico('download', { size: 16 }) + 'Importar de todos modos</button>' + acc;
    var sub = P.detalleAvance(f);
    var plan = f.planTipo === 'anual' ? 'Anual' : f.planTipo === 'mensual' ? 'Mensual' : '';
    return '<tr class="ap-fila" data-uid="' + uid + '">' +
      '<td class="ap-celda-miembro" data-label="Miembro"><div class="ap-persona"><span class="ap-avatar ap-avatar--' + esc(f.estadoPlan) + '" aria-hidden="true">' + esc(P.iniciales(f.nombre || f.correo)) + '</span>' +
      '<div class="ap-persona__txt"><strong>' + esc(f.nombre || 'Sin nombre') + '</strong><span>' + esc(f.correo || '—') + '</span></div></div></td>' +
      '<td data-label="Plan">' + P.insignia(f.estadoPlan) + (plan ? '<span class="ap-sub">' + esc(plan) + '</span>' : '') + '</td>' +
      '<td data-label="Cursos con avance"><span class="ap-num">' + esc(P.fmtNum(f.cursosConAvance)) + '</span></td>' +
      '<td data-label="Clases del sitio anterior"><span class="ap-num">' + esc(P.fmtNum(f.clasesViejas)) + '</span></td>' +
      '<td data-label="Clases importadas">' + celdaImportadas(f) + '</td>' +
      '<td class="ap-celda-estado" data-label="Estado">' + P.insigniaAvance(f) + (sub ? '<span class="ap-sub ap-sub--texto">' + esc(sub) + '</span>' : '') + '</td>' +
      '<td class="ap-celda-acciones">' + acc + '</td></tr>';
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
      cuerpo = '<div class="ap-tabla-envoltura"><table class="ap-tabla ap-tabla--avance"><thead><tr><th scope="col">Miembro</th><th scope="col">Plan</th><th scope="col">Cursos con avance</th>' +
        '<th scope="col">Clases del sitio anterior</th><th scope="col">Clases importadas</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
        r.miembros.map(filaAvance).join('') + '</tbody></table></div>' +
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
    referidos: referidos, herramientas: herramientas, configuracion: configuracion, estado: estadoSistema, avance: avanceMiembros,
    agregarVerificadorFolio: agregarVerificadorFolio, modal: modal, confirmar: confirmar
  };
})(typeof self !== 'undefined' ? self : this);
