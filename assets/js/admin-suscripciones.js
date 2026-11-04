/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · SUSCRIPCIONES Y PAGOS                */
/* Quién pagó su membresía, cuánto pagó y cuándo, quién está por  */
/* perder el acceso y quién ya lo perdió. Se lee así, de arriba   */
/* hacia abajo:                                                   */
/*   1. seis cifras: dinero cobrado, personas que han pagado,     */
/*      monto más elegido, cobros rechazados, planes por vencer   */
/*      (7 días) y planes vencidos                                */
/*   2. «Planes por vencer y vencidos»: quién vence (en 7, 15 o   */
/*      30 días; con «Se renueva solo» o «No se renovará») y      */
/*      quién ya perdió su plan                                   */
/*   3. gráficas: «Por qué se rechazan los cobros» (por motivo y   */
/*      categoría), ¿cuánto prefieren pagar? y dinero cobrado     */
/*      por mes                                                   */
/*   4. «Pagos de suscripción»: cada cobro, con filtros y buscador;*/
/*      en cada cobro rechazado, el MOTIVO (ya en español, que     */
/*      viene traducido del servidor) con «Qué significa», «Qué    */
/*      hacer», intentos y fecha del último                        */
/* Datos: GET /api/admin/pagos (cobros que guarda el servidor),   */
/* GET /api/admin/miembros (quién vence) y                        */
/* POST /api/admin/pagos/sincronizar («Traer pagos desde Stripe»,  */
/* que además completa el motivo de los rechazados).              */
/* Los constructores son puros y se prueban en                    */
/* tests/admin-suscripciones.test.js.                             */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'), require('./admin-iconos.js'), null, require('./admin-graficas.js'));
  else root.ZOO_ADMIN_SUSCRIPCIONES = factory(root.ZOO_ADMIN_PANEL, root.ZOO_ICONOS, root.ZOO_ADMIN_VISTAS, root.ZOO_ADMIN_GRAFICAS);
})(typeof self !== 'undefined' ? self : this, function (P, I, V, G) {
  'use strict';

  var esc = P.esc;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };
  var num = P.fmtNum;
  var DIA = 86400000;
  var ZONA = 'America/Mexico_City';
  var INI_VENCEN = 8, PASO_VENCEN = 10;     // renglones de «por vencer / vencidos»: se ven 8, «Ver más» suma 10, «Ver menos» regresa a 8
  var INI_PAGOS = 20, PASO_PAGOS = 20;      // renglones de «Pagos de suscripción»

  function dinero(n) {
    var v = Number(n);
    if (!isFinite(v)) return '—';
    return '$' + v.toLocaleString('es-MX', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
  function dia(iso) { return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: ZONA }); }
  function hora(iso) { return new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: ZONA }); }

  function card(titulo, cuerpo, nota, id) {
    return '<section class="ap-card"' + (id ? ' id="' + esc(id) + '"' : '') + '><header class="ap-card__cab"><h2>' + esc(titulo) + '</h2>' + (nota ? '<p>' + esc(nota) + '</p>' : '') +
      '</header><div class="ap-card__cuerpo">' + cuerpo + '</div></section>';
  }
  function vacio(titulo, texto, icono) {
    return '<div class="zs-vacio ap-vacio">' + ico(icono || 'search-x', { size: 28 }) + '<strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></div>';
  }
  function chip(texto, clase) { return '<span class="ap-badge ap-badge--' + clase + '"><span>' + esc(texto) + '</span></span>'; }

  /* ───────────────────────── Pagos: cifras y gráficas ───────────────────────── */
  function pagados(pagos) { return (Array.isArray(pagos) ? pagos : []).filter(function (p) { return p && p.estado === 'pagado' && Number(p.monto) > 0; }); }

  /* Las seis cifras de los pagos */
  function resumenPagos(pagos) {
    var lista = Array.isArray(pagos) ? pagos : [];
    var ok = pagados(lista);
    var total = ok.reduce(function (t, p) { return t + Number(p.monto); }, 0);
    var personas = {};
    ok.forEach(function (p) { personas[(p.correo || p.uid || p.id || '').toLowerCase()] = true; });
    var primeros = ok.filter(function (p) { return p.tipo === 'primer'; });
    var moda = montosElegidos(ok, primeros.length ? 'primer' : 'todos');
    return {
      dineroCobrado: total, nPagos: ok.length, personas: Object.keys(personas).length, renovaciones: ok.filter(function (p) { return p.tipo === 'renov'; }).length,
      modaMonto: moda.length ? moda[0].monto : null, modaCuantos: moda.length ? moda[0].personas : 0, modaDe: moda.reduce(function (t, x) { return t + x.personas; }, 0),
      modaEsPrimer: primeros.length > 0, fallidos: lista.filter(function (p) { return p && p.estado === 'fallido'; }).length
    };
  }

  /* Cuántas personas escogieron cada monto (del más elegido al menos). modo: 'primer' (al suscribirse) o 'todos' (todos los cobros) */
  function montosElegidos(pagosOk, modo) {
    var por = {};
    pagados(pagosOk).filter(function (p) { return modo !== 'primer' || p.tipo === 'primer'; }).forEach(function (p) { por[p.monto] = (por[p.monto] || 0) + 1; });
    return Object.keys(por).map(function (k) { return { monto: Number(k), personas: por[k] }; }).sort(function (a, b) { return b.personas - a.personas || b.monto - a.monto; });
  }

  /* Dinero cobrado en cada uno de los últimos `meses` meses (hora de México), del más antiguo al más reciente */
  function dineroPorMes(pagos, ahora, meses) {
    var n = meses || 6;
    var hoy = new Date(ahora === undefined ? Date.now() : ahora);
    var clave = function (d) { var f = new Date(d.getTime() - 6 * 3600 * 1000); return f.getUTCFullYear() + '-' + String(f.getUTCMonth() + 1).padStart(2, '0'); };
    var y = new Date(hoy.getTime() - 6 * 3600 * 1000).getUTCFullYear(), m = new Date(hoy.getTime() - 6 * 3600 * 1000).getUTCMonth();
    var lista = [];
    for (var i = n - 1; i >= 0; i--) { var f = new Date(Date.UTC(y, m - i, 1)); lista.push({ mes: f.getUTCFullYear() + '-' + String(f.getUTCMonth() + 1).padStart(2, '0'), total: 0, pagos: 0 }); }
    var idx = {}; lista.forEach(function (x, k) { idx[x.mes] = k; });
    pagados(pagos).forEach(function (p) {
      var k = idx[clave(new Date(p.fecha))];
      if (k !== undefined) { lista[k].total += Number(p.monto); lista[k].pagos += 1; }
    });
    return lista;
  }

  /* ───────────────────────── Quién vence y quién ya venció ───────────────────────── */
  function esAdmin(m) { return !!(m && m.esAdmin); }
  function noSeRenueva(m) { return m.estado === 'cancelado-vigente'; }
  function seRenueva(m) { return m.origen === 'stripe' && m.stripeActiva !== false && !noSeRenueva(m) && !m.esRegalo; }

  /* { porVencer, vencidos }: porVencer = con acceso que vencen (el más cercano primero); vencidos = tuvieron plan y ya no tienen acceso (el más reciente primero) */
  function clasificarVencimientos(miembros, ahora) {
    var t = ahora === undefined ? Date.now() : ahora;
    var lista = (Array.isArray(miembros) ? miembros : []).filter(function (m) { return m && !esAdmin(m) && m.vence && !isNaN(Date.parse(m.vence)); });
    var porVencer = lista.filter(function (m) { return m.conAcceso && Date.parse(m.vence) > t; }).sort(function (a, b) { return Date.parse(a.vence) - Date.parse(b.vence); });
    var vencidos = lista.filter(function (m) { return !m.conAcceso && (m.estado === 'vencido' || m.estado === 'pago-pendiente') && Date.parse(m.vence) <= t; })
      .sort(function (a, b) { return Date.parse(b.vence) - Date.parse(a.vence); });
    return { porVencer: porVencer, vencidos: vencidos };
  }

  /* «en menos de 24 horas» · «mañana» · «en 5 días» · «hoy» · «hace 3 días» · «hace 2 meses» */
  function cuando(ms, ahora) {
    var d = ms - (ahora === undefined ? Date.now() : ahora);
    var H = 3600000;
    if (d >= 0) return d < 24 * H ? 'en menos de 24 horas' : d < 2 * DIA ? 'mañana' : 'en ' + Math.floor(d / DIA) + ' días';
    var p = -d;
    if (p < 24 * H) return 'hoy';
    if (p < 60 * DIA) { var k = Math.floor(p / DIA); return 'hace ' + k + (k === 1 ? ' día' : ' días'); }
    return 'hace ' + Math.floor(p / (30 * DIA)) + ' meses';
  }

  function planChip(m) {
    if (m.esRegalo) return chip('Regalo', 'info');
    if (m.planTipo === 'anual') return chip('Anual', 'ok');
    if (m.planTipo === 'mensual') return chip('Mensual', 'info');
    return chip(m.origen === 'manual' ? 'Acceso manual' : 'Plan', 'neutro');
  }

  /* Un renglón de «por vencer» o «vencidos» */
  function filaVencimiento(m, vence, ultimo, ahora) {
    var estado;
    if (vence) estado = noSeRenueva(m) ? chip('No se renovará', 'aviso') : seRenueva(m) ? chip('Se renueva solo', 'ok') : chip('Termina sin cobro', 'neutro');
    else estado = m.estado === 'pago-pendiente' ? chip('Pago rechazado', 'error') : chip('No renovó', 'error');
    var pago = ultimo ? '<div class="ap-sb__monto">' + esc(dinero(ultimo.monto)) + '<small>Pagó el ' + esc(dia(ultimo.fecha)) + '</small></div>' : '<div class="ap-sb__monto"></div>';
    return '<li class="ap-sb"><div class="ap-sb__fecha"><strong>' + esc((vence ? 'Vence el ' : 'Venció el ') + dia(m.vence)) + '</strong><span>' + esc(hora(m.vence) + ' · ' + cuando(Date.parse(m.vence), ahora)) + '</span></div>' +
      '<div class="ap-sb__quien"><strong>' + esc(m.nombre || (m.correo || '').split('@')[0] || 'Sin nombre') + '</strong><span class="ap-correo">' + esc(m.correo || '') + '</span></div>' +
      '<div class="ap-sb__chips">' + estado + planChip(m) + '</div>' + pago + '</li>';
  }

  /* El último cobro pagado de cada persona (por correo), con los pagos ya del más reciente al más antiguo */
  function ultimosPagos(pagos) {
    var por = {};
    pagados(pagos).forEach(function (p) { var k = (p.correo || '').toLowerCase(); if (k && !por[k]) por[k] = p; });
    return por;
  }

  /* El bloque completo: pestañas, plazo, «solo los que no se renovarán» y la lista con «Ver más» y «Ver menos» */
  function vencimientosHTML(miembros, pagos, ui, ahora) {
    var u = ui || {};
    var t = ahora === undefined ? Date.now() : ahora;
    var c = clasificarVencimientos(miembros, t);
    var horizonte = [7, 15, 30].indexOf(u.horizonte) !== -1 ? u.horizonte : 7;
    var tab = u.tab === 'vencidos' ? 'vencidos' : 'xvencer';
    var soloNo = !!u.solo;
    var xv = c.porVencer.filter(function (m) { return Date.parse(m.vence) - t <= horizonte * DIA && (!soloNo || noSeRenueva(m)); });
    var lista = tab === 'xvencer' ? xv : c.vencidos;
    var ultimos = ultimosPagos(pagos);
    var visibles = Math.max(INI_VENCEN, Number(u.visibles) || INI_VENCEN);
    var mostrar = lista.slice(0, visibles);
    var chips = function (grupo, items) {
      return '<div class="zs-chips" role="group" aria-label="' + esc(grupo) + '">' + items.map(function (x) {
        return '<button type="button" class="zs-chip" data-sb-' + x[0] + '="' + esc(x[1]) + '" aria-pressed="' + x[3] + '">' + esc(x[2]) + '</button>';
      }).join('') + '</div>';
    };
    var cab = '<div class="ap-controles">' + chips('Por vencer o vencidos', [['v', 'xvencer', 'Por vencer (' + xv.length + ')', tab === 'xvencer'], ['v', 'vencidos', 'Vencidos (' + c.vencidos.length + ')', tab === 'vencidos']]) +
      (tab === 'xvencer' ? chips('Qué tan pronto vence', [7, 15, 30].map(function (h) { return ['h', String(h), h + ' días', h === horizonte]; })) +
        chips('Filtrar por renovación', [['solo', '0', 'Todos', !soloNo], ['solo', '1', 'Solo los que no se renovarán', soloNo]]) : '') + '</div>';
    var ayuda = tab === 'xvencer'
      ? 'Membresías activas que llegan a su fecha de vencimiento en los próximos ' + horizonte + ' días. «Se renueva solo» significa que Stripe cobrará de nuevo; «No se renovará» es quien ya canceló y perderá el acceso.'
      : 'Personas que tuvieron un plan y ya no tienen acceso (del más reciente al más antiguo). Son buenas candidatas para invitarlas a volver.';
    var cuerpo;
    if (!lista.length) {
      cuerpo = vacio(tab === 'xvencer' ? (soloNo ? 'Nadie que no se vaya a renovar vence en ' + horizonte + ' días' : 'Nadie vence en los próximos ' + horizonte + ' días') : 'Todavía nadie ha perdido su plan',
        tab === 'xvencer' ? 'Cuando una membresía esté por vencer aparecerá aquí.' : 'Cuando alguien deje de tener acceso aparecerá aquí.', 'circle-check');
    } else {
      var faltan = lista.length - mostrar.length;
      var botones = '';
      if (faltan > 0) botones += '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="venc-mas">Ver más (' + num(faltan) + ')</button>';
      if (mostrar.length > INI_VENCEN) botones += '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="venc-menos">Ver menos</button>';
      cuerpo = '<ul class="ap-sb-lista" aria-label="' + (tab === 'xvencer' ? 'Planes por vencer, el más cercano primero' : 'Planes vencidos, el más reciente primero') + '">' +
        mostrar.map(function (m) { return filaVencimiento(m, tab === 'xvencer', ultimos[(m.correo || '').toLowerCase()], t); }).join('') + '</ul>' +
        '<p class="ap-pie-tabla" role="status">Mostrando ' + num(mostrar.length) + ' de ' + num(lista.length) + '</p>' + (botones ? '<div class="ap-cp-mas">' + botones + '</div>' : '');
    }
    return cab + '<p class="ap-sb__ayuda">' + esc(ayuda) + '</p>' + cuerpo;
  }

  /* «Causa más común: Fondos insuficientes (2 de 3)» para la cifra de cobros rechazados */
  function rechazosTop(pagos) {
    var a = agruparRechazos(pagos);
    if (!a.conMotivo) return '';
    var m = a.categorias[0].motivos[0];
    return 'Causa más común: ' + m.texto + ' (' + m.n + ' de ' + a.total + ')';
  }

  /* ───────────────────────── Las seis cifras de arriba ───────────────────────── */
  function cifrasHTML(pagos, miembros, ahora) {
    var t = ahora === undefined ? Date.now() : ahora;
    var s = resumenPagos(pagos);
    var c = clasificarVencimientos(miembros, t);
    var en7 = c.porVencer.filter(function (m) { return Date.parse(m.vence) - t <= 7 * DIA; });
    var no = en7.filter(noSeRenueva).length;
    var K = V && V.util ? V.util.kpi : function (o) { return '<article class="ap-kpi"><p class="ap-kpi__rot">' + esc(o.rotulo) + '</p><p class="ap-kpi__val">' + esc(o.valor) + '</p><p class="ap-kpi__nota">' + esc(o.nota || '') + '</p></article>'; };
    var hayPagos = (Array.isArray(pagos) ? pagos : []).length > 0;
    return '<div class="ap-kpis">' + [
      K({ icono: 'wallet', rotulo: 'Dinero cobrado', valor: hayPagos ? dinero(s.dineroCobrado) : '—', nota: hayPagos ? num(s.nPagos) + (s.nPagos === 1 ? ' pago' : ' pagos') + ' con monto registrado' : 'Aún no hay pagos guardados', tono: 'ok' }),
      K({ icono: 'users', rotulo: 'Personas que han pagado', valor: hayPagos ? num(s.personas) : '—', nota: hayPagos ? num(s.renovaciones) + (s.renovaciones === 1 ? ' renovación registrada' : ' renovaciones registradas') : 'Pulsa «Traer pagos desde Stripe»', tono: 'info' }),
      K({ icono: 'badge-check', rotulo: 'Monto más elegido', valor: s.modaMonto === null ? '—' : dinero(s.modaMonto), nota: s.modaMonto === null ? 'Aún no hay pagos' : s.modaCuantos + ' de ' + s.modaDe + (s.modaEsPrimer ? ' en su primer pago' : ' pagos'), tono: 'aviso' }),
      K({ icono: 'triangle-alert', rotulo: 'Cobros rechazados', valor: hayPagos ? num(s.fallidos) : '—', nota: s.fallidos ? (rechazosTop(pagos) || 'Pulsa «Traer pagos desde Stripe» para ver el motivo') : 'Ningún cobro rechazado', tono: s.fallidos ? 'error' : 'neutro' }),
      K({ icono: 'calendar-clock', rotulo: 'Planes por vencer', valor: num(en7.length), nota: en7.length ? no + (no === 1 ? ' no se renovará' : ' no se renovarán') + ' · próximos 7 días' : 'Nadie vence en los próximos 7 días', tono: en7.length ? 'aviso' : 'neutro' }),
      K({ icono: 'hourglass', rotulo: 'Planes vencidos', valor: num(c.vencidos.length), nota: c.vencidos.length ? 'El más reciente: ' + dia(c.vencidos[0].vence) : 'Nadie ha perdido su plan todavía', tono: 'neutro' })
    ].join('') + '</div>';
  }

  /* ───────────────────────── Gráficas ───────────────────────── */
  function graficaMontoHTML(pagos, modo) {
    var lista = montosElegidos(pagos, modo);
    var cuerpo = G.barrasH({
      titulo: '¿Cuánto prefieren pagar?', formato: 'num', porcentaje: false, color: 2,
      filas: lista.map(function (x) { return { etiqueta: dinero(x.monto), valor: x.personas }; }),
      vacio: { titulo: 'Aún no hay pagos', texto: 'Cuando alguien se suscriba verás aquí qué monto prefiere.' }
    });
    var chips = '<div class="zs-chips" role="group" aria-label="Qué pagos contar">' + [['primer', 'Primer pago'], ['todos', 'Todos los pagos']].map(function (x) {
      return '<button type="button" class="zs-chip" data-sb-graf="' + x[0] + '" aria-pressed="' + (x[0] === modo) + '">' + esc(x[1]) + '</button>';
    }).join('') + '</div>';
    return chips + '<p class="ap-sb__ayuda">' + (modo === 'primer' ? 'Cuántas personas escogieron cada monto al suscribirse por primera vez.' : 'Cuántos cobros hubo de cada monto, contando renovaciones.') + '</p>' + cuerpo;
  }

  function graficaMesesHTML(pagos, ahora) {
    var meses = dineroPorMes(pagos, ahora, 6);
    return G.serie({
      titulo: 'Dinero cobrado por mes', tipo: 'barras', formato: 'mxn', unidad: 'cobrados en 6 meses', alto: 220,
      etiquetas: meses.map(function (m) { return P.fmtMes(m.mes).split(' ')[0]; }),
      titulos: meses.map(function (m) { return P.fmtMes(m.mes) + ' · ' + num(m.pagos) + (m.pagos === 1 ? ' pago' : ' pagos'); }),
      series: [{ nombre: 'Dinero cobrado (MXN)', valores: meses.map(function (m) { return m.total; }), color: 2 }],
      vacio: { titulo: 'Sin pagos registrados', texto: 'Cuando haya pagos aparecerá lo cobrado cada mes.' }
    });
  }

  /* ───────────────────────── Lista «Pagos de suscripción» ───────────────────────── */
  function nombreDe(p, porCorreo) {
    var c = String(p.correo || '').toLowerCase();
    return p.nombre || (porCorreo && porCorreo[c]) || c.split('@')[0] || 'Sin nombre';
  }

  /* ───────────────────────── Motivo de un cobro rechazado ─────────────────────────
     Lo traduce el servidor (services/motivos-rechazo.js): p.motivo = { texto, significa, queHacer, categoria, codigo } o null si aún no se conoce. */
  var CATEGORIAS = { fondos: 'Fondos insuficientes', tarjeta: 'Problema con la tarjeta', banco: 'Decisión del banco', verificacion: 'Verificación del banco', seguridad: 'Seguridad o posible fraude', otro: 'Otro motivo' };
  var ORDEN_CAT = ['fondos', 'tarjeta', 'banco', 'verificacion', 'seguridad', 'otro'];
  var SIN_MOTIVO = 'Motivo no disponible todavía. Pulsa «Traer pagos desde Stripe» para completarlo.';

  function conMotivo(p) { return !!(p && p.motivo && p.motivo.texto); }

  /* «Motivo: Fondos insuficientes» (o el aviso de que aún no se conoce) + el botón «Ver detalle» */
  function motivoLineaHTML(p, abierto) {
    var id = esc(p.id || '');
    var texto = conMotivo(p)
      ? '<span class="ap-sb__motivo-t">' + ico('circle-alert', { size: 16 }) + '<span>Motivo: <strong>' + esc(p.motivo.texto) + '</strong></span></span>'
      : '<span class="ap-sb__motivo-t ap-sb__motivo-t--sin">' + ico('info', { size: 16 }) + '<span>' + esc(SIN_MOTIVO) + '</span></span>';
    var boton = conMotivo(p)
      ? '<button type="button" class="ap-sb__ver" data-sb-detalle="' + id + '" aria-expanded="' + (abierto ? 'true' : 'false') + '" aria-controls="apSbDet-' + id + '">' + (abierto ? 'Ocultar detalle' : 'Ver detalle') + '</button>' : '';
    return '<div class="ap-sb__motivo">' + texto + boton + '</div>';
  }

  /* El bloque «Qué significa / Qué hacer», con los intentos y la fecha del último */
  function detalleRechazoHTML(p) {
    if (!conMotivo(p)) return '';
    var m = p.motivo;
    var intentos = Number(p.intentos) > 0 ? num(p.intentos) + (Number(p.intentos) === 1 ? ' intento' : ' intentos') : 'Sin dato';
    var ultimo = p.ultimoIntento ? dia(p.ultimoIntento) + ' · ' + hora(p.ultimoIntento) : 'Sin dato';
    var proximo = p.proximoIntento && Date.parse(p.proximoIntento) > Date.parse(p.ultimoIntento || p.fecha || 0)
      ? '<div><dt>Próximo intento de Stripe</dt><dd>' + esc(dia(p.proximoIntento)) + '</dd></div>' : '';
    return '<div class="ap-sb__detalle" id="apSbDet-' + esc(p.id || '') + '"><dl>' +
      '<div><dt>Qué significa</dt><dd>' + esc(m.significa || '') + '</dd></div>' +
      '<div><dt>Qué hacer</dt><dd>' + esc(m.queHacer || '') + '</dd></div>' +
      '<div><dt>Intentos de cobro</dt><dd>' + esc(intentos) + '</dd></div>' +
      '<div><dt>Último intento</dt><dd>' + esc(ultimo) + '</dd></div>' + proximo +
      '</dl><p class="ap-sb__ref">Referencia para el equipo técnico: ' + esc(m.codigo || 'sin código') + '</p></div>';
  }

  /* Los rechazados agrupados por categoría (y dentro, por motivo): { total, conMotivo, sinMotivo, categorias: [{ clave, nombre, n, pct, motivos: [{ texto, n }] }] } */
  function agruparRechazos(pagos) {
    var rech = (Array.isArray(pagos) ? pagos : []).filter(function (p) { return p && p.estado === 'fallido'; });
    var grupos = {}; var con = 0;
    rech.forEach(function (p) {
      if (!conMotivo(p)) return;
      con++;
      var k = CATEGORIAS[p.motivo.categoria] ? p.motivo.categoria : 'otro';
      var g = grupos[k] || (grupos[k] = { clave: k, nombre: CATEGORIAS[k], n: 0, mapa: {} });
      g.n++; g.mapa[p.motivo.texto] = (g.mapa[p.motivo.texto] || 0) + 1;
    });
    var categorias = Object.keys(grupos).map(function (k) {
      var g = grupos[k];
      return { clave: g.clave, nombre: g.nombre, n: g.n, pct: con ? Math.round(g.n / con * 100) : 0,
        motivos: Object.keys(g.mapa).map(function (t) { return { texto: t, n: g.mapa[t] }; }).sort(function (a, b) { return b.n - a.n || a.texto.localeCompare(b.texto, 'es'); }) };
    }).sort(function (a, b) { return b.n - a.n || ORDEN_CAT.indexOf(a.clave) - ORDEN_CAT.indexOf(b.clave); });
    return { total: rech.length, conMotivo: con, sinMotivo: rech.length - con, categorias: categorias };
  }

  /* La frase «Cómo leerlo» de la gráfica, armada con los datos */
  function fraseRechazos(a) {
    if (!a.conMotivo) return '';
    var t = a.categorias[0]; var m = t.motivos[0];
    var txt = 'La causa más común es «' + t.nombre + '»: ' + num(t.n) + ' de ' + num(a.conMotivo) + ' cobros rechazados con motivo conocido (' + t.pct + ' %)' +
      (t.motivos.length === 1 || m.n === t.n ? ', casi siempre por «' + m.texto + '».' : '. El motivo más repetido dentro de esa categoría es «' + m.texto + '».');
    if (a.categorias[1] && a.categorias[1].n === t.n) txt = 'Hay empate arriba: «' + t.nombre + '» y «' + a.categorias[1].nombre + '» tienen ' + num(t.n) + ' cobros rechazados cada una, de ' + num(a.conMotivo) + ' con motivo conocido.';
    if (a.sinMotivo) txt += ' ' + num(a.sinMotivo) + (a.sinMotivo === 1 ? ' rechazo todavía no tiene motivo' : ' rechazos todavía no tienen motivo') + ': pulsa «Traer pagos desde Stripe» para completarlos.';
    return txt;
  }

  /* La gráfica «Por qué se rechazan los cobros»: una barra por categoría (con los motivos dentro), cuántos y qué porcentaje */
  function graficaRechazosHTML(pagos) {
    var a = agruparRechazos(pagos);
    var vacioT = !a.total
      ? { titulo: 'Todavía no hay cobros rechazados', texto: 'Cuando Stripe rechace un cobro, aquí verás por qué: fondos insuficientes, tarjeta vencida, el banco, etc.' }
      : { titulo: 'Aún no conocemos los motivos', texto: 'Hay ' + num(a.total) + (a.total === 1 ? ' cobro rechazado' : ' cobros rechazados') + ' sin motivo guardado. Pulsa «Traer pagos desde Stripe» para completarlos.' };
    var cuerpo = G.barrasH({
      titulo: 'Por qué se rechazan los cobros', color: 4, total: a.conMotivo || 1,
      filas: a.categorias.map(function (c) { return { etiqueta: c.nombre, valor: c.n, nota: c.motivos.length === 1 && c.motivos[0].texto === c.nombre ? '' : c.motivos.map(function (m) { return m.texto + ': ' + m.n; }).join(' · ') }; }),
      vacio: vacioT
    });
    var frase = fraseRechazos(a);
    return cuerpo + (frase ? '<p class="ap-frase" role="note"><strong>Cómo leerlo:</strong> ' + esc(frase) + '</p>' : '');
  }

  /* El último rechazo de una persona (por uid o por correo), para su ficha de miembro: la fila pública o null */
  function ultimoRechazoDe(pagos, miembro) {
    if (!miembro) return null;
    var correo = String(miembro.correo || '').toLowerCase();
    var lista = (Array.isArray(pagos) ? pagos : []).filter(function (p) {
      return p && p.estado === 'fallido' && ((miembro.uid && p.uid === miembro.uid) || (correo && String(p.correo || '').toLowerCase() === correo));
    }).sort(function (a, b) { return Date.parse(b.fecha) - Date.parse(a.fecha); });
    return lista[0] || null;
  }

  /* Lo que se agrega a la ficha de un miembro con pago pendiente */
  function fichaMotivoHTML(p) {
    if (!p) return '';
    if (!conMotivo(p)) return '<div class="ap-ficha__motivo"><strong>Último cobro rechazado</strong><span>' + esc(dia(p.fecha)) + ' · ' + esc(dinero(p.monto)) + '</span><p>' + esc(SIN_MOTIVO) + '</p></div>';
    return '<div class="ap-ficha__motivo"><strong>Último cobro rechazado</strong><span>' + esc(dia(p.fecha)) + ' · ' + esc(dinero(p.monto)) + (Number(p.intentos) > 0 ? ' · ' + num(p.intentos) + (Number(p.intentos) === 1 ? ' intento' : ' intentos') : '') + '</span>' +
      '<p>' + ico('circle-alert', { size: 16 }) + '<span>Motivo: <strong>' + esc(p.motivo.texto) + '</strong></span></p>' +
      '<p><b>Qué hacer:</b> ' + esc(p.motivo.queHacer || '') + '</p></div>';
  }

  function filaPago(p, porCorreo, abierto) {
    var tipo = p.estado === 'fallido' ? chip('Rechazado', 'error') : p.tipo === 'primer' ? chip('Primer pago', 'ok') : chip('Renovación', 'info');
    var plan = p.plan === 'anual' ? chip('Anual', 'ok') : p.plan === 'mensual' ? chip('Mensual', 'info') : '';
    var monto = p.monto === null || p.monto === undefined
      ? '<div class="ap-sb__monto"><small>Monto no registrado</small></div>'
      : '<div class="ap-sb__monto' + (p.estado === 'fallido' ? ' ap-sb__monto--fallido' : '') + '">' + esc(dinero(p.monto)) + (p.moneda && p.moneda !== 'MXN' ? '<small>' + esc(p.moneda) + '</small>' : '') + '</div>';
    var fallido = p.estado === 'fallido';
    return '<li class="ap-sb' + (fallido ? ' ap-sb--fallido' + (abierto && conMotivo(p) ? ' is-abierto' : '') : '') + '"' + (fallido ? ' data-pago="' + esc(p.id || '') + '"' : '') + '><div class="ap-sb__fecha"><strong>' + esc(dia(p.fecha)) + '</strong><span>' + esc(hora(p.fecha)) + '</span></div>' +
      '<div class="ap-sb__quien"><strong>' + esc(nombreDe(p, porCorreo)) + '</strong><span class="ap-correo">' + esc(p.correo || '') + '</span></div>' +
      '<div class="ap-sb__chips">' + tipo + plan + '</div>' + monto +
      (fallido ? motivoLineaHTML(p, !!abierto) + (abierto ? detalleRechazoHTML(p) : '') : '') + '</li>';
  }

  function filtrarPagos(pagos, filtro, texto, porCorreo) {
    var q = P.sinAcentos(String(texto || '')).trim();
    return (Array.isArray(pagos) ? pagos : []).filter(function (p) {
      var ok = filtro === 'primer' ? p.estado === 'pagado' && p.tipo === 'primer' : filtro === 'renov' ? p.estado === 'pagado' && p.tipo === 'renov' : filtro === 'fallido' ? p.estado === 'fallido' : true;
      return ok && (!q || P.sinAcentos(nombreDe(p, porCorreo) + ' ' + (p.correo || '')).indexOf(q) !== -1);
    });
  }

  function conteos(pagos) {
    var l = Array.isArray(pagos) ? pagos : [];
    return { todos: l.length, primer: l.filter(function (p) { return p.estado === 'pagado' && p.tipo === 'primer'; }).length, renov: l.filter(function (p) { return p.estado === 'pagado' && p.tipo === 'renov'; }).length, fallido: l.filter(function (p) { return p.estado === 'fallido'; }).length };
  }

  function pagosListaHTML(pagos, ui, porCorreo) {
    var u = ui || {};
    var total = (Array.isArray(pagos) ? pagos : []).length;
    var vistas = filtrarPagos(pagos, u.filtro || 'todos', u.texto, porCorreo);
    if (!vistas.length) return vacio(total ? 'No hay pagos con ese filtro' : 'Todavía no hay pagos registrados', total ? 'Cambia el filtro o la búsqueda.' : 'Los cobros nuevos se guardan solos. Para traer los anteriores pulsa «Traer pagos desde Stripe».', 'wallet');
    var n = Math.max(INI_PAGOS, Number(u.visiblesPagos) || INI_PAGOS);
    var mostrar = vistas.slice(0, n);
    var faltan = vistas.length - mostrar.length;
    var botones = '';
    if (faltan > 0) botones += '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="pagos-mas">Ver más (' + num(faltan) + ')</button>';
    if (mostrar.length > INI_PAGOS) botones += '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="pagos-menos">Ver menos</button>';
    return '<ul class="ap-sb-lista" aria-label="Pagos de suscripción, del más reciente al más antiguo">' + mostrar.map(function (p) { return filaPago(p, porCorreo, !!(u.abiertos && u.abiertos[p.id])); }).join('') + '</ul>' +
      '<p class="ap-pie-tabla" role="status">Mostrando ' + num(mostrar.length) + ' de ' + num(vistas.length) + '</p>' + (botones ? '<div class="ap-cp-mas">' + botones + '</div>' : '');
  }

  function pagosCardHTML(pagos, ui, porCorreo) {
    var u = ui || {}; var k = conteos(pagos);
    var chips = '<div class="zs-chips" role="group" aria-label="Filtrar pagos">' + [['todos', 'Todos'], ['primer', 'Primer pago'], ['renov', 'Renovaciones'], ['fallido', 'Rechazados']].map(function (x) {
      return '<button type="button" class="zs-chip" data-sb-filtro="' + x[0] + '" aria-pressed="' + ((u.filtro || 'todos') === x[0]) + '">' + esc(x[1]) + ' (' + num(k[x[0]]) + ')</button>';
    }).join('') + '</div>';
    var buscar = '<label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar por nombre o correo</span><input type="search" id="apSbBuscar" placeholder="Buscar por nombre o correo" autocomplete="off" value="' + esc(u.texto || '') + '"></label>';
    return '<div class="ap-controles">' + chips + '<div class="ap-controles__der">' + buscar + '</div></div><div id="apSbPagos">' + pagosListaHTML(pagos, u, porCorreo) + '</div>';
  }

  /* ───────────────────────── Pantalla completa ───────────────────────── */
  function nota() {
    return '<p class="ap-sb__pie">Las horas son de la Ciudad de México. «Primer pago» es cuando la persona se suscribió; los demás son renovaciones. Los cobros nuevos se guardan solos; los anteriores se traen con «Traer pagos desde Stripe». Si un cobro no aparece, revísalo en tu panel de Stripe.</p>';
  }

  // d = { pagos: [...] | null (el servidor todavía no los ofrece), miembros: [...] } · ui = { tab, horizonte, solo, visibles (por vencer), graf, filtro, texto, visiblesPagos }
  function vistaHTML(d, ui, ahora) {
    var data = d || {}; var u = ui || {};
    var pagos = Array.isArray(data.pagos) ? data.pagos : [];
    var miembros = Array.isArray(data.miembros) ? data.miembros : [];
    var porCorreo = {}; miembros.forEach(function (m) { if (m.correo) porCorreo[m.correo.toLowerCase()] = m.nombre; });
    var titulo = P.tarjetaTitulo({
      icono: 'credit-card', eyebrow: 'Panel de administración', titulo: 'Suscripciones', acento: 'y pagos.',
      sub: 'Quién pagó su membresía, cuánto pagó y cuándo. Abajo ves quién está por vencer, quién ya venció y qué monto prefieren pagar tus miembros.',
      acciones: [{ id: 'sincronizar', texto: 'Traer pagos desde Stripe', icono: 'download' }, { id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    });
    var aviso = data.pagos === null ? '<div class="ap-aviso ap-aviso--info" role="note">' + ico('info', { size: 20 }) + '<div><p>El servidor todavía no ofrece el registro de pagos. Cuando termine su actualización aparecerán aquí; mientras tanto ves quién vence y quién ya venció.</p></div></div>' : '';
    return titulo + aviso + cifrasHTML(pagos, miembros, ahora) +
      (pagos.length ? card('Por qué se rechazan los cobros', '<div id="apSbRechazos">' + graficaRechazosHTML(pagos) + '</div>', 'Qué dijo el banco o Stripe en cada cobro rechazado, ya traducido.', 'apSbRechazosCard') : '') +
      card('Planes por vencer y vencidos', '<div id="apSbVenc">' + vencimientosHTML(miembros, pagos, u, ahora) + '</div>', 'Quién está por perder el acceso y quién ya lo perdió.', 'apSbVencCard') +
      '<div class="ap-columnas">' +
      card('¿Cuánto prefieren pagar?', '<div id="apSbMonto">' + graficaMontoHTML(pagos, u.graf === 'todos' ? 'todos' : 'primer') + '</div>') +
      card('Dinero cobrado por mes', graficaMesesHTML(pagos, ahora), 'Últimos 6 meses · solo pagos con monto registrado.') +
      '</div>' +
      card('Pagos de suscripción', pagosCardHTML(pagos, u, porCorreo), 'Cada cobro, del más reciente al más antiguo.', 'apSbPagosCard') + nota();
  }

  /* ───────────────────────── Controlador (solo en el navegador) ───────────────────────── */
  var est = { datos: null, tab: 'xvencer', horizonte: 7, solo: false, visibles: INI_VENCEN, graf: 'primer', filtro: 'todos', texto: '', visP: INI_PAGOS, ocupado: false, abiertos: {} };

  function porCorreoActual() { var m = {}; ((est.datos && est.datos.miembros) || []).forEach(function (x) { if (x.correo) m[x.correo.toLowerCase()] = x.nombre; }); return m; }
  function pintarVenc() { var c = document.getElementById('apSbVenc'); if (c) c.innerHTML = vencimientosHTML(est.datos.miembros, est.datos.pagos || [], { tab: est.tab, horizonte: est.horizonte, solo: est.solo, visibles: est.visibles }); }
  function pintarMonto() { var c = document.getElementById('apSbMonto'); if (c) { c.innerHTML = graficaMontoHTML(est.datos.pagos || [], est.graf); G.activar(c); } }
  function pintarPagos() { var c = document.getElementById('apSbPagos'); if (c) c.innerHTML = pagosListaHTML(est.datos.pagos || [], { filtro: est.filtro, texto: est.texto, visiblesPagos: est.visP, abiertos: est.abiertos }, porCorreoActual()); }
  function pintarFiltros() { Array.prototype.forEach.call(document.querySelectorAll('[data-sb-filtro]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sb-filtro') === est.filtro)); }); }

  async function cargar(forzar) {
    var u = V.util; var ctx = u.contexto(); var mi = u.nuevoContador();
    u.vista().innerHTML = u.cargando('Suscripciones y pagos');
    var r;
    try {
      r = await Promise.all([ctx.api('/api/admin/miembros' + (forzar ? '?refrescar=1' : '')), ctx.api('/api/admin/pagos').catch(function () { return null; })]);
    } catch (e) {
      if (mi !== u.contadorActual()) return;
      u.vista().innerHTML = u.errorHTML('Suscripciones y pagos', e, 'recargar');
      u.vista().onclick = function (ev) { u.acciones(ev, { recargar: function () { cargar(true); } }); };
      return;
    }
    if (mi !== u.contadorActual()) return;
    est.datos = { miembros: (r[0] && r[0].miembros) || [], pagos: r[1] && Array.isArray(r[1].pagos) ? r[1].pagos : null };
    est.visibles = INI_VENCEN; est.visP = INI_PAGOS;
    pintar();
  }

  /* Lo que se dice al terminar «Traer pagos desde Stripe»: pagos nuevos, rechazos nuevos y motivos completados */
  function resumenSincronizacion(r) {
    var x = r || {};
    var partes = [];
    if (x.nuevos) partes.push((x.nuevos === 1 ? 'se guardó ' : 'se guardaron ') + num(x.nuevos) + (x.nuevos === 1 ? ' pago nuevo' : ' pagos nuevos'));
    if (x.fallidosNuevos) partes.push(num(x.fallidosNuevos) + (x.fallidosNuevos === 1 ? ' rechazo nuevo' : ' rechazos nuevos'));
    if (x.motivosCompletados) partes.push('motivos completados: ' + num(x.motivosCompletados));
    var texto = partes.length ? partes.join(' · ') : 'Todo estaba al día';
    texto = texto.charAt(0).toUpperCase() + texto.slice(1) + '.';
    if (x.motivosPendientes) texto += ' Quedan ' + num(x.motivosPendientes) + (x.motivosPendientes === 1 ? ' rechazo' : ' rechazos') + ' sin motivo (Stripe no lo informó o no respondió; puedes volver a intentarlo).';
    if (x.errores) texto += ' ' + num(x.errores) + (x.errores === 1 ? ' consulta' : ' consultas') + ' a Stripe no se pudieron hacer.';
    return texto;
  }

  async function sincronizar(boton) {
    var ctx = V.util.contexto();
    if (est.ocupado) return;
    est.ocupado = true; if (boton) { boton.disabled = true; }
    ctx.toast('Trayendo los pagos desde Stripe…');
    try {
      var r = await ctx.api('/api/admin/pagos/sincronizar', { method: 'POST', body: {} });
      est.ocupado = false;
      ctx.toast(resumenSincronizacion(r));
      await cargar(true);
    } catch (e) {
      est.ocupado = false; if (boton) boton.disabled = false;
      ctx.toast((e && e.message) || 'No se pudieron traer los pagos.', true);
    }
  }

  function pintar() {
    var u = V.util; var v = u.vista();
    var y = typeof window !== 'undefined' ? window.scrollY : 0;
    v.innerHTML = vistaHTML(est.datos, { tab: est.tab, horizonte: est.horizonte, solo: est.solo, visibles: est.visibles, graf: est.graf, filtro: est.filtro, texto: est.texto, visiblesPagos: est.visP, abiertos: est.abiertos });
    G.activar(v);
    if (y && typeof window !== 'undefined') window.scrollTo(0, y);
    var buscar = document.getElementById('apSbBuscar');
    if (buscar) buscar.addEventListener('input', function (e) { est.texto = e.target.value; est.visP = INI_PAGOS; pintarPagos(); });
    v.onclick = function (ev) {
      var vt = ev.target.closest('[data-sb-v]');
      if (vt) { est.tab = vt.getAttribute('data-sb-v'); est.visibles = INI_VENCEN; pintarVenc(); return; }
      var h = ev.target.closest('[data-sb-h]');
      if (h) { est.horizonte = Number(h.getAttribute('data-sb-h')); est.visibles = INI_VENCEN; pintarVenc(); return; }
      var so = ev.target.closest('[data-sb-solo]');
      if (so) { est.solo = so.getAttribute('data-sb-solo') === '1'; est.visibles = INI_VENCEN; pintarVenc(); return; }
      var g = ev.target.closest('[data-sb-graf]');
      if (g) { est.graf = g.getAttribute('data-sb-graf'); pintarMonto(); return; }
      var det = ev.target.closest('[data-sb-detalle]') || (!ev.target.closest('a, button, input, select, label') ? ev.target.closest('.ap-sb--fallido[data-pago]') : null);
      if (det) {
        var idp = det.getAttribute('data-sb-detalle') || det.getAttribute('data-pago');
        var fila = ((est.datos && est.datos.pagos) || []).filter(function (x) { return x.id === idp; })[0];
        if (fila && conMotivo(fila)) { est.abiertos[idp] = !est.abiertos[idp]; pintarPagos(); }
        return;
      }
      var f = ev.target.closest('[data-sb-filtro]');
      if (f) { est.filtro = f.getAttribute('data-sb-filtro'); est.visP = INI_PAGOS; pintarFiltros(); pintarPagos(); return; }
      u.acciones(ev, {
        recargar: function () { cargar(true); },
        sincronizar: function (b) { sincronizar(b); },
        'venc-mas': function () { est.visibles += PASO_VENCEN; pintarVenc(); },
        'venc-menos': function () { est.visibles = INI_VENCEN; pintarVenc(); },
        'pagos-mas': function () { est.visP += PASO_PAGOS; pintarPagos(); },
        'pagos-menos': function () { est.visP = INI_PAGOS; pintarPagos(); }
      });
    };
  }

  return {
    INI_VENCEN: INI_VENCEN, PASO_VENCEN: PASO_VENCEN, INI_PAGOS: INI_PAGOS, PASO_PAGOS: PASO_PAGOS,
    dinero: dinero, resumenPagos: resumenPagos, montosElegidos: montosElegidos, dineroPorMes: dineroPorMes, clasificarVencimientos: clasificarVencimientos, cuando: cuando,
    filaVencimiento: filaVencimiento, vencimientosHTML: vencimientosHTML, cifrasHTML: cifrasHTML, graficaMontoHTML: graficaMontoHTML, graficaMesesHTML: graficaMesesHTML,
    filaPago: filaPago, motivoLineaHTML: motivoLineaHTML, detalleRechazoHTML: detalleRechazoHTML, agruparRechazos: agruparRechazos, fraseRechazos: fraseRechazos, graficaRechazosHTML: graficaRechazosHTML,
    ultimoRechazoDe: ultimoRechazoDe, fichaMotivoHTML: fichaMotivoHTML, resumenSincronizacion: resumenSincronizacion, rechazosTop: rechazosTop, SIN_MOTIVO: SIN_MOTIVO, CATEGORIAS: CATEGORIAS, filtrarPagos: filtrarPagos, conteos: conteos, pagosListaHTML: pagosListaHTML, pagosCardHTML: pagosCardHTML, vistaHTML: vistaHTML,
    suscripciones: cargar
  };
});
