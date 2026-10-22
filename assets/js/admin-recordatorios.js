/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · RECORDATORIOS DE PAGO               */
/* Correos con cupones de Stripe para quien se registró y nunca  */
/* ha pagado. El servidor decide todo (quién, cuándo, cuántos);  */
/* aquí se ve y se controla:                                     */
/*   1. el interruptor (ARRANCA APAGADO) con ventana de          */
/*      confirmación que dice a cuántas personas les tocaría     */
/*   2. el «Ensayo»: quién recibiría qué correo ahora, sin enviar */
/*   3. los límites (tope diario y por corrida)                  */
/*   4. «¿Cómo funciona cada vuelta?» (los 7 correos)             */
/*   5. resultados de los cupones y gráficas con «Cómo leerlo»   */
/*   6. seguimiento de cuentas (pestañas, búsqueda, etapas)      */
/*   7. últimos correos enviados                                  */
/*   8. probar cada correo (siempre al correo de quien administra) */
/* Datos: GET /api/admin/recordatorios y /lista; POST /modo,     */
/* /limites, /ensayo y /prueba. Los constructores de HTML son    */
/* puros y se prueban en tests/admin-recordatorios.test.js.      */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'), require('./admin-iconos.js'), null, require('./admin-graficas.js'));
  else root.ZOO_ADMIN_RECORDATORIOS = factory(root.ZOO_ADMIN_PANEL, root.ZOO_ICONOS, root.ZOO_ADMIN_VISTAS, root.ZOO_ADMIN_GRAFICAS);
})(typeof self !== 'undefined' ? self : this, function (P, I, V, G) {
  'use strict';

  var esc = P.esc;
  var num = P.fmtNum;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };

  function card(titulo, cuerpo, nota, id) {
    return '<section class="ap-card"' + (id ? ' id="' + esc(id) + '"' : '') + '><header class="ap-card__cab"><h2>' + esc(titulo) + '</h2>' + (nota ? '<p>' + esc(nota) + '</p>' : '') +
      '</header><div class="ap-card__cuerpo">' + cuerpo + '</div></section>';
  }
  function vacio(titulo, texto, icono) {
    return '<div class="zs-vacio ap-vacio">' + ico(icono || 'search-x', { size: 28 }) + '<strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></div>';
  }
  function plural(n, uno, varios) { return num(n) + ' ' + (n === 1 ? uno : varios); }
  function iso(ms) { return ms ? new Date(ms).toISOString() : ''; }
  function pesos(n) { return '$' + num(n); }
  function horas(h) { return h % 24 === 0 && h >= 24 ? plural(h / 24, 'día', 'días') : plural(h, 'hora', 'horas'); }

  /* ───────────────────────── Estado general ───────────────────────── */
  function estadoGeneral(r) {
    var d = r || {};
    if (d.configurado === false) return { clase: 'error', icono: 'circle-alert', titulo: 'Falta configurar el correo', texto: 'El servidor no tiene todo lo necesario para enviar (la cuenta de correo o la llave de firmas de las bajas). Mientras tanto no se puede activar.' };
    if (d.modo !== 'activo') return { clase: 'apagado', icono: 'pause', titulo: 'Apagado', texto: 'No sale ningún correo. Usa «Ensayo» para ver a quién le tocaría y «Activar» cuando estés listo.' };
    if (!d.dentroDeHorario) return { clase: 'aviso', icono: 'clock', titulo: 'Activo, en pausa por horario', texto: 'Los correos salen entre las 8:00 y las 22:00 (hora de Ciudad de México). Fuera de ese horario se espera a que abra.' };
    if (!d.cupoCorrida) return { clase: 'aviso', icono: 'hourglass', titulo: 'Activo, tope de hoy alcanzado', texto: 'Ya se enviaron los ' + num(d.topeDiario || 0) + ' correos permitidos hoy. Mañana sigue.' };
    return { clase: 'ok', icono: 'send', titulo: 'Activo y enviando', texto: 'El servidor revisa cada 20 minutos a quién le toca y envía hasta ' + num(d.maxPorCorrida || 0) + ' correos por revisión.' };
  }
  function insigniaModo(r) {
    var activo = r && r.modo === 'activo';
    return '<span class="ap-badge ap-badge--' + (activo ? 'ok' : 'apagado') + ' rp-modo">' + ico(activo ? 'circle-check' : 'pause', { size: 14 }) + '<span>' + (activo ? 'ACTIVO' : 'APAGADO') + '</span></span>';
  }

  function cifras(r) {
    var d = r || {}; var g = d.estadisticas || {};
    var conCupon = g.convertidas || 0;
    return [
      { valor: num(d.enviadosHoy || 0), rotulo: 'enviados hoy' },
      { valor: num(d.faltanHoy || 0), rotulo: 'faltan hoy (tope)' },
      { valor: num(d.calificarian || 0), rotulo: 'personas en la serie' },
      { valor: num(conCupon), rotulo: 'pagaron con cupón' }
    ];
  }

  /* ───────────────────────── Tarjeta de control (interruptor, ensayo, límites) ───────────────────────── */
  function controlHTML(r) {
    var d = r || {}; var e = estadoGeneral(d); var activo = d.modo === 'activo';
    var boton = activo
      ? '<button type="button" class="ap-btn ap-btn--suave" data-accion="apagar">' + ico('pause', { size: 16 }) + 'Apagar</button>'
      : '<button type="button" class="ap-btn ap-btn--primario" data-accion="activar"' + (d.configurado === false ? ' disabled' : '') + '>' + ico('play', { size: 16 }) + 'Activar</button>';
    var proximo = d.primerEnvioMs ? '<p class="rp-dato">' + ico('clock', { size: 16 }) + '<span>Próximo envío: <strong>' + esc(P.fmtFechaHora(iso(d.primerEnvioMs))) + '</strong> · ' + plural(d.calificarian || 0, 'persona en la serie', 'personas en la serie') + '</span></p>' : '';
    return '<div class="rp-control">' +
      '<div class="rp-control__estado">' + insigniaModo(d) + '<div class="rp-control__txt"><strong>' + esc(e.titulo) + '</strong><p>' + esc(e.texto) + '</p></div></div>' +
      '<div class="rp-control__acciones">' + boton +
      '<button type="button" class="ap-btn ap-btn--suave" data-accion="ensayo">' + ico('flask-conical', { size: 16 }) + 'Ensayo</button>' +
      '<button type="button" class="ap-btn ap-btn--suave" data-accion="recargar">' + ico('refresh-cw', { size: 16 }) + 'Actualizar</button></div></div>' +
      proximo +
      '<form class="rp-limites" id="rpLimites" novalidate><div class="ap-campo"><label for="rpTope">Tope por día</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="rpTope" maxlength="3" value="' + esc(d.topeDiario || 60) + '" autocomplete="off"></div>' +
      '<div class="ap-campo"><label for="rpCorrida">Máximo por revisión</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="rpCorrida" maxlength="2" value="' + esc(d.maxPorCorrida || 25) + '" autocomplete="off"></div>' +
      '<button type="submit" class="ap-btn ap-btn--suave" data-accion="limites">' + ico('circle-check', { size: 16 }) + 'Guardar límites</button>' +
      '<p class="ap-error" id="rpLimitesError" role="alert" hidden></p></form>' +
      '<p class="rp-nota">Hoy van ' + num(d.enviadosHoy || 0) + ' de ' + num(d.topeDiario || 0) + ' envíos permitidos. El tope protege la reputación del correo: las cuentas nuevas conviene subirlas poco a poco.</p>';
  }

  /* Texto de «¿Cómo funciona cada vuelta?» según la serie que informa el servidor (nada escrito a mano) */
  function pasoTexto(p, i, serie) {
    var prev = i > 0 ? serie[i - 1] : null;
    var cuando;
    if (p.desde === 'registro') cuando = horas(p.esperaHoras) + ' después de registrarse';
    else if (p.desde === 'envio') cuando = horas(p.esperaHoras) + ' después del correo ' + (prev ? prev.paso : 1);
    else cuando = horas(p.esperaHoras) + ' después de que vence el cupón del correo ' + (prev ? prev.paso : 1);
    return '<li><span class="rp-paso__n">' + p.paso + '</span><span><strong>' + (p.monto ? 'Cupón de ' + pesos(p.monto) : 'Beneficios, sin cupón') + '</strong> · ' + esc(cuando) + '</span></li>';
  }
  function comoFuncionaHTML(r) {
    var d = r || {}; var serie = d.serie || [];
    if (!serie.length) return '';
    var v = d.vigenciaHoras || 24;
    return '<details class="rp-como"><summary>¿Cómo funciona cada vuelta?</summary><div class="rp-como__cuerpo">' +
      '<p>Cada persona tiene su propio reloj. En cada vuelta recibe ' + serie.length + ' correos; cada cupón vale ' + horas(v) + ' y sirve una sola vez, solo para el primer mes del plan mensual.</p>' +
      '<ol class="rp-pasos">' + serie.map(function (p, i) { return pasoTexto(p, i, serie); }).join('') + '</ol>' +
      '<p>Cuando vence el cupón del último correo, la persona descansa ' + plural(d.descansoDias || 4, 'día', 'días') + ' y la vuelta vuelve a empezar (el primer correo se repite con otra apertura). Máximo ' + plural(d.maxCiclos || 3, 'vuelta', 'vueltas') + ': el último correo de la última vuelta cierra la serie para siempre.</p>' +
      '<p>Todo sale entre 8:00 y 22:00, hora de Ciudad de México. Si alguien paga (con o sin cupón), se hace miembro o se da de baja, deja de recibir correos.</p></div></details>';
  }

  /* ───────────────────────── Resultados de los cupones ───────────────────────── */
  function porMonto(r) {
    var d = r || {}; var g = d.estadisticas || {}; var serie = d.serie || [];
    var montos = []; serie.forEach(function (p) { if (p.monto && montos.indexOf(p.monto) === -1) montos.push(p.monto); });
    montos.sort(function (a, b) { return a - b; });
    return montos.map(function (m) {
      var enviados = 0, pagaron = 0;
      serie.forEach(function (p) { if (p.monto === m) { enviados += (g.enviadosPaso && g.enviadosPaso['p' + p.paso]) || 0; pagaron += (g.pagosConCuponPaso && g.pagosConCuponPaso['p' + p.paso]) || 0; } });
      return { monto: m, enviados: enviados, pagaron: pagaron, tasa: enviados ? Math.round(pagaron / enviados * 1000) / 10 : 0 };
    });
  }
  function resultadosTiles(r) {
    var g = (r && r.estadisticas) || {}; var u = V ? V.util : null;
    var creados = 0; Object.keys(g.cuponesCreados || {}).forEach(function (k) { creados += g.cuponesCreados[k]; });
    var enviadosTotal = 0; Object.keys(g.enviadosPaso || {}).forEach(function (k) { enviadosTotal += g.enviadosPaso[k]; });
    var items = [
      { icono: 'mail', rotulo: 'Correos enviados', valor: num(enviadosTotal), tono: 'neutro' },
      { icono: 'send', rotulo: 'Cupones creados', valor: num(creados), tono: 'neutro' },
      { icono: 'circle-check', rotulo: 'Pagaron con cupón', valor: num(g.convertidas || 0), tono: 'ok' },
      { icono: 'wallet', rotulo: 'Pagaron sin cupón', valor: num(g.pagosSinCupon || 0), tono: 'neutro' },
      { icono: 'users', rotulo: 'Se dieron de baja', valor: num(g.bajas || 0), tono: 'aviso' }
    ];
    var kpi = u ? u.kpi : function (o) { return '<article class="ap-kpi"><div class="ap-kpi__txt"><p class="ap-kpi__rot">' + esc(o.rotulo) + '</p><p class="ap-kpi__val">' + esc(o.valor) + '</p></div></article>'; };
    return '<div class="ap-kpis rp-kpis">' + items.map(kpi).join('') + '</div>';
  }
  function fraseResultados(r) {
    var filas = porMonto(r);
    var enviados = filas.reduce(function (t, f) { return t + f.enviados; }, 0);
    if (!enviados) return '';
    var pagaron = filas.reduce(function (t, f) { return t + f.pagaron; }, 0);
    var partes = filas.map(function (f) { return 'con el cupón de ' + pesos(f.monto) + ' pagaron ' + num(f.pagaron) + ' de ' + plural(f.enviados, 'correo', 'correos') + (f.enviados ? ' (' + String(f.tasa).replace('.', ',') + ' %)' : ''); });
    return 'En total pagaron ' + plural(pagaron, 'persona', 'personas') + ' con un cupón: ' + partes.join('; ') + '. Una persona puede recibir varios correos, por eso hay más correos que pagos.';
  }
  function graficaMontos(r) {
    var filas = porMonto(r);
    var cuerpo = G.serie({
      tipo: 'barras', titulo: 'Correos enviados y pagos por monto de cupón', unidad: 'correos', formato: 'num', alto: 200,
      etiquetas: filas.map(function (f) { return pesos(f.monto); }), titulos: filas.map(function (f) { return 'Cupón de ' + pesos(f.monto); }),
      series: [{ nombre: 'Correos enviados', valores: filas.map(function (f) { return f.enviados; }), color: 1 }, { nombre: 'Pagaron con el cupón', valores: filas.map(function (f) { return f.pagaron; }), color: 3 }],
      vacio: { titulo: 'Todavía no se envían cupones', texto: 'Cuando se activen los recordatorios verás aquí cuántos correos salieron y cuántos terminaron en pago.' }
    });
    var frase = fraseResultados(r);
    return cuerpo + (frase ? '<p class="ap-frase" role="note"><strong>Cómo leerlo:</strong> ' + esc(frase) + '</p>' : '');
  }
  function graficaPasos(r) {
    var d = r || {}; var g = d.estadisticas || {}; var serie = d.serie || [];
    var filas = serie.filter(function (p) { return p.monto; }).map(function (p) { return { etiqueta: 'Correo ' + p.paso + ' · cupón de ' + pesos(p.monto), valor: (g.pagosConCuponPaso && g.pagosConCuponPaso['p' + p.paso]) || 0 }; });
    var cuerpo = G.barrasH({ titulo: 'Pagos con cupón por correo', filas: filas, vacio: { titulo: 'Aún nadie ha pagado con un cupón', texto: 'Aquí verás en qué correo de la serie decide pagar la gente.' } });
    var mejor = filas.slice().sort(function (a, b) { return b.valor - a.valor; })[0];
    var total = filas.reduce(function (t, f) { return t + f.valor; }, 0);
    var frase = total && mejor ? 'El correo que más pagos trae es «' + mejor.etiqueta + '»: ' + plural(mejor.valor, 'pago', 'pagos') + ' de ' + num(total) + ' con cupón.' : '';
    return cuerpo + (frase ? '<p class="ap-frase" role="note"><strong>Cómo leerlo:</strong> ' + esc(frase) + '</p>' : '');
  }
  function graficaTrasCorreo(r) {
    var g = (r && r.estadisticas) || {}; var t = g.pagosTrasCorreoPaso || {};
    var filas = [{ etiqueta: 'Antes de recibir un correo', valor: t.p0 || 0 }];
    ((r && r.serie) || []).forEach(function (p) { filas.push({ etiqueta: 'Después del correo ' + p.paso, valor: t['p' + p.paso] || 0 }); });
    var total = filas.reduce(function (s, f) { return s + f.valor; }, 0);
    var cuerpo = G.barrasH({ titulo: 'Personas que pagaron según el último correo recibido', filas: filas, vacio: { titulo: 'Aún no hay pagos de estas cuentas', texto: 'Cuando alguien de la lista pague, verás aquí cuál fue el último correo que había recibido.' } });
    var frase = total ? 'De ' + plural(total, 'persona que pagó', 'personas que pagaron') + ' (con o sin cupón), ' + num(filas[0].valor) + ' lo hicieron antes de recibir cualquier correo y ' + num(total - filas[0].valor) + ' después de recibir alguno.' : '';
    return cuerpo + (frase ? '<p class="ap-frase" role="note"><strong>Cómo leerlo:</strong> ' + esc(frase) + '</p>' : '');
  }

  /* ───────────────────────── Seguimiento de cuentas ───────────────────────── */
  var PESTANAS = [['todas', 'Todas'], ['listas-ahora', 'Listas ahora'], ['programadas', 'Programadas']];
  var ETAPAS = [['cupon-vigente', 'Cupón vigente'], ['enviado', 'Esperando siguiente'], ['descanso', 'En descanso'], ['convertida', 'Convertidas'], ['pago', 'Ya pagaron'], ['baja', 'Baja'], ['cerrada', 'Serie terminada'], ['sin-verificar', 'Sin verificar'], ['en-espera', 'En espera']];
  var CLASE_ETAPA = { 'cupon-vigente': 'ok', convertida: 'ok', pago: 'info', enviado: 'neutro', descanso: 'neutro', 'en-espera': 'neutro', baja: 'aviso', cerrada: 'apagado', 'sin-verificar': 'aviso', excluida: 'apagado' };

  /* Puntos de avance de la vuelta: 7 puntos, los enviados rellenos */
  function puntos(i, total) {
    var n = total || 7; var enviados = i.enviados > 0 ? i.paso : 0; var texto;
    if (!i.enviados) texto = 'Todavía no recibe su primer correo';
    else texto = 'Vuelta ' + i.ciclo + ' de 3, correo ' + enviados + ' de ' + n;
    var dots = ''; for (var k = 1; k <= n; k++) dots += '<span class="rp-punto' + (k <= enviados ? ' is-hecho' : '') + '"></span>';
    return '<span class="rp-puntos" role="img" aria-label="' + esc(texto) + '">' + dots + '</span>';
  }
  function filaCuenta(i, maxCiclos) {
    var clase = CLASE_ETAPA[i.etapa] || 'neutro';
    var vuelta = i.enviados ? '<span class="rp-vuelta">Vuelta ' + i.ciclo + ' de ' + (maxCiclos || 3) + '</span>' : '';
    var pill = i.enviados ? '<span class="rp-pill">Correo ' + i.paso + '</span>' : '';
    var cuando;
    if (i.cuponVenceMs) cuando = '<span class="rp-cuando">Cupón vence ' + esc(P.fmtFechaHora(iso(i.cuponVenceMs))) + '</span>';
    else if (i.proximoMs && i.vencida) cuando = '<span class="rp-cuando">En la próxima revisión<small>Vuelta ' + i.proximoCiclo + ' · correo ' + i.proximoPaso + '</small></span>';
    else if (i.proximoMs) cuando = '<span class="rp-cuando">' + esc(P.fmtFechaHora(iso(i.proximoMs))) + '<small>Vuelta ' + i.proximoCiclo + ' · correo ' + i.proximoPaso + '</small></span>';
    else cuando = '<span class="rp-cuando rp-cuando--nada">—</span>';
    return '<tr><td data-label="Cuenta"><strong>' + esc(i.nombre || 'Sin nombre') + '</strong><small class="ap-sub">' + esc(i.correo) + (i.cursoPrueba ? ' · prueba: ' + esc(i.cursoPrueba) : '') + '</small></td>' +
      '<td data-label="Etapa"><span class="ap-badge ap-badge--' + clase + '">' + esc(i.estado) + '</span></td>' +
      '<td data-label="Avance">' + puntos(i, 7) + vuelta + pill + '</td>' +
      '<td data-label="Cuándo sale">' + cuando + '</td></tr>';
  }
  function tablaHTML(l, maxCiclos) {
    var items = (l && l.items) || [];
    if (!items.length) return vacio('Nadie coincide', 'Cambia la pestaña, la etapa o la búsqueda.', 'search-x');
    return '<div class="ap-tabla-zona"><div class="ap-tabla-envoltura"><table class="ap-tabla ap-tabla--simple rp-tabla"><thead><tr><th scope="col">Cuenta</th><th scope="col">Etapa</th><th scope="col">Avance</th><th scope="col">Cuándo sale</th></tr></thead><tbody>' +
      items.map(function (i) { return filaCuenta(i, maxCiclos); }).join('') + '</tbody></table></div></div>' +
      '<p class="ap-pie-tabla" role="status">Mostrando ' + num(items.length) + ' de ' + num(l.total) + '</p>' + (l.hayMas ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="mas">Mostrar más</button>' : '');
  }
  function seguimientoHTML(l, ui, maxCiclos, conteo) {
    var u = ui || {};
    var etapa = u.etapa || 'todas';
    var tabs = '<div class="zs-chips rp-tabs" role="group" aria-label="Qué cuentas ver">' + PESTANAS.map(function (p) {
      return '<button type="button" class="zs-chip" data-etapa="' + p[0] + '" aria-pressed="' + (p[0] === etapa) + '">' + esc(p[1]) + '</button>';
    }).join('') + '</div>';
    var etapas = '<label class="rp-selector"><span class="sr-only">Filtrar por etapa</span><select id="rpEtapa" aria-label="Filtrar por etapa"><option value="">Todas las etapas</option>' + ETAPAS.map(function (e) {
      var n = conteo && conteo[e[0]] ? ' (' + num(conteo[e[0]]) + ')' : '';
      return '<option value="' + e[0] + '"' + (e[0] === etapa ? ' selected' : '') + '>' + esc(e[1]) + n + '</option>';
    }).join('') + '</select></label>';
    var buscar = '<label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar por nombre o correo</span><input type="search" id="rpBuscar" placeholder="Buscar por nombre o correo" autocomplete="off" value="' + esc(u.q || '') + '"></label>';
    return '<div class="ap-controles">' + tabs + '<div class="ap-controles__der">' + etapas + buscar + '</div></div><div id="rpTabla">' + tablaHTML(l, maxCiclos) + '</div>';
  }

  /* ───────────────────────── Últimos correos enviados ───────────────────────── */
  function recientesHTML(r) {
    var lista = (r && r.recientes) || [];
    if (!lista.length) return vacio('Todavía no se envía ningún correo', 'Cuando los recordatorios estén activos, los últimos envíos aparecerán aquí.', 'mail');
    return '<ul class="rp-recientes" aria-label="Últimos correos enviados">' + lista.map(function (x) {
      return '<li><span class="rp-reciente__quien"><strong>' + esc(x.nombre || 'Sin nombre') + '</strong><small class="ap-sub">' + esc(x.correo) + '</small></span>' +
        '<span class="rp-reciente__que"><span class="rp-pill">Vuelta ' + x.ciclo + ' · correo ' + x.paso + '</span>' + (x.monto ? '<span class="ap-badge ap-badge--ok">Cupón de ' + pesos(x.monto) + '</span>' : '<span class="ap-badge ap-badge--neutro">Sin cupón</span>') + '</span>' +
        '<span class="rp-reciente__cuando">' + esc(P.fmtFechaHora(iso(x.enviadoMs))) + '</span></li>';
    }).join('') + '</ul>';
  }

  /* ───────────────────────── Probar los correos ───────────────────────── */
  function pruebaHTML(r, correoAdmin) {
    var serie = (r && r.serie) || []; var max = (r && r.maxCiclos) || 3;
    var pasos = serie.map(function (p) { return '<option value="' + p.paso + '">Correo ' + p.paso + ' · ' + (p.monto ? 'cupón de ' + pesos(p.monto) : 'beneficios, sin cupón') + '</option>'; }).join('');
    var vueltas = ''; for (var v = 1; v <= max; v++) vueltas += '<option value="' + v + '">Vuelta ' + v + '</option>';
    return '<p class="rp-prueba__txt">Se manda <strong>solo a tu correo</strong>' + (correoAdmin ? ' (' + esc(correoAdmin) + ')' : '') + ', nunca a otra persona. Los correos de prueba llevan un cupón real de prueba que no cuenta en las estadísticas ni cierra ninguna serie.</p>' +
      '<div class="rp-prueba"><div class="ap-campo"><label for="rpPasoPrueba">Correo</label><select id="rpPasoPrueba">' + pasos + '</select></div>' +
      '<div class="ap-campo"><label for="rpCicloPrueba">Vuelta</label><select id="rpCicloPrueba">' + vueltas + '</select></div>' +
      '<button type="button" class="ap-btn ap-btn--primario" data-accion="prueba">' + ico('send', { size: 16 }) + 'Enviarme una prueba</button>' +
      '<button type="button" class="ap-btn ap-btn--suave" data-accion="prueba-todos">' + ico('mail', { size: 16 }) + 'Enviarme los ' + serie.length + '</button></div>';
  }

  /* ───────────────────────── Ventanas ───────────────────────── */
  function activarCuerpoHTML(r) {
    var d = r || {}; var n = d.calificarian || 0;
    var cuando = d.primerEnvioMs ? 'El primer envío sería <strong>' + esc(P.fmtFechaHora(iso(d.primerEnvioMs))) + '</strong> (hora de Ciudad de México).' : 'Por ahora nadie tiene un correo pendiente.';
    return '<p class="ap-modal__texto">Si lo activas, <strong>' + plural(n, 'persona', 'personas') + '</strong> ' + (n === 1 ? 'está' : 'están') + ' en la serie (cuentas que nunca han pagado, con el correo confirmado y sin baja). ' + cuando + '</p>' +
      '<ul class="rp-lista-modal"><li>Máximo ' + num(d.topeDiario || 60) + ' correos al día y ' + num(d.maxPorCorrida || 25) + ' por revisión.</li>' +
      '<li>Solo se envía entre las 8:00 y las 22:00, hora de Ciudad de México.</li>' +
      '<li>Cada correo lleva el enlace para darse de baja. Puedes apagarlo cuando quieras.</li></ul>' +
      '<p class="ap-modal__texto">Antes de activar, conviene hacer un «Ensayo» y mandarte los correos de prueba.</p>';
  }
  function ensayoCuerpoHTML(e) {
    var d = e || {};
    var rec = d.recibirian || [];
    var resumen = '<p class="ap-modal__texto">' + (d.dentroDeHorario ? 'Ahora mismo es horario de envío.' : 'Ahora es fuera de horario (8:00 a 22:00): se esperaría a que abra.') + ' Si estuviera activo, en la próxima revisión saldrían <strong>' + plural(rec.length, 'correo', 'correos') + '</strong>' +
      (d.restantes ? ' y quedarían ' + num(d.restantes) + ' para las siguientes revisiones' : '') + '. Hoy van ' + num(d.enviadosHoy || 0) + ' de ' + num(d.topeDiario || 0) + '. <strong>Esto es solo una simulación: no se envió nada.</strong></p>';
    if (!rec.length) return resumen;
    return resumen + '<ul class="rp-ensayo">' + rec.slice(0, 15).map(function (x) {
      return '<li><span><strong>' + esc(x.nombre || 'Sin nombre') + '</strong><small class="ap-sub">' + esc(x.correo) + '</small></span><span class="rp-pill">Vuelta ' + (x.ciclo || 1) + ' · correo ' + x.paso + (x.monto ? ' · ' + pesos(x.monto) : '') + '</span></li>';
    }).join('') + '</ul>' + (rec.length > 15 ? '<p class="rp-nota">Y ' + num(rec.length - 15) + ' más.</p>' : '');
  }

  /* ───────────────────────── Pantalla completa ───────────────────────── */
  function vistaHTML(d, ui) {
    var u = ui || {}; var r = (d && d.resumen) || {}; var l = (d && d.lista) || { items: [], total: 0 };
    var titulo = P.tarjetaTitulo({
      icono: 'mail', eyebrow: 'Panel de administración', titulo: 'Recordatorios', acento: 'de pago.',
      sub: 'Correos con cupones de $50 y $100 para quien se registró y nunca ha pagado. Nace apagado: tú decides cuándo empezar.',
      cifras: cifras(r), acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    });
    return titulo +
      card('Estado y control', controlHTML(r) + comoFuncionaHTML(r), '', 'rpControl') +
      card('Resultados de los cupones', resultadosTiles(r) + graficaMontos(r), 'Cuántos correos salieron y cuántos terminaron en pago.', 'rpResultados') +
      card('Pagos con cupón por correo', graficaPasos(r), 'En qué correo de la serie decide pagar la gente.', 'rpPasos') +
      card('Quién pagó y qué había recibido', graficaTrasCorreo(r), 'El último correo que tenía cada persona que pagó.', 'rpTras') +
      card('Seguimiento de cuentas', seguimientoHTML(l, u, r.maxCiclos, r.conteo), 'Cada cuenta con su avance en la vuelta y cuándo le toca el siguiente correo.', 'rpSeguimiento') +
      card('Últimos correos enviados', recientesHTML(r), 'Los 10 envíos más recientes.', 'rpRecientes') +
      card('Probar los correos', pruebaHTML(r, u.correoAdmin), 'Revisa cómo se ve cada correo antes de activar.', 'rpPrueba');
  }

  /* ───────────────────────── Controlador (solo en el navegador) ───────────────────────── */
  var est = { datos: null, q: '', etapa: 'todas', pagina: 1, ocupado: false, correoAdmin: '' };

  function correoDeQuienAdministra() {
    try { var u = root.firebase && root.firebase.auth().currentUser; return (u && u.email) || ''; } catch (e) { return ''; }
  }
  function rutaLista(pagina) {
    return '/api/admin/recordatorios/lista?etapa=' + encodeURIComponent(est.etapa) + '&q=' + encodeURIComponent(est.q) + '&pagina=' + (pagina || 1);
  }

  async function cargar() {
    var u = V.util; var ctx = u.contexto(); var mi = u.nuevoContador();
    u.vista().innerHTML = u.cargando('Recordatorios de pago');
    var r;
    try { r = await Promise.all([ctx.api('/api/admin/recordatorios'), ctx.api(rutaLista(1))]); }
    catch (e) {
      if (mi !== u.contadorActual()) return;
      u.vista().innerHTML = u.errorHTML('Recordatorios de pago', e, 'recargar');
      u.vista().onclick = function (ev) { u.acciones(ev, { recargar: cargar }); };
      return;
    }
    if (mi !== u.contadorActual()) return;
    est.datos = { resumen: r[0], lista: r[1] }; est.pagina = 1; est.correoAdmin = r[0].correoAdmin || correoDeQuienAdministra();
    pintar();
  }

  async function recargarLista(agregar) {
    var ctx = V.util.contexto();
    var pagina = agregar ? est.pagina + 1 : 1;
    var l = await ctx.api(rutaLista(pagina));
    if (agregar && est.datos.lista) l.items = est.datos.lista.items.concat(l.items);
    est.datos.lista = l; est.pagina = pagina;
    var cont = document.getElementById('rpTabla');
    if (cont) cont.innerHTML = tablaHTML(l, est.datos.resumen.maxCiclos);
    Array.prototype.forEach.call(document.querySelectorAll('[data-etapa]'), function (b) { b.setAttribute('aria-pressed', b.dataset.etapa === est.etapa ? 'true' : 'false'); });
    var sel = document.getElementById('rpEtapa'); if (sel) sel.value = ETAPAS.some(function (x) { return x[0] === est.etapa; }) ? est.etapa : '';
  }

  async function cambiarModo(activar) {
    var u = V.util; var ctx = u.contexto();
    if (est.ocupado) return;
    if (activar) {
      var fresco = est.datos.resumen;
      try { fresco = await ctx.api('/api/admin/recordatorios'); est.datos.resumen = fresco; } catch (e) { /* se usa lo último que se vio */ }
      var ok = await V.modal({
        titulo: 'Activar los recordatorios de pago', cuerpo: activarCuerpoHTML(fresco),
        botones: [{ id: 'no', texto: 'Mejor no', tipo: 'suave' }, { id: 'si', texto: 'Sí, activar', tipo: 'primario' }]
      });
      if (ok !== 'si') return;
    }
    est.ocupado = true;
    try {
      await ctx.api('/api/admin/recordatorios/modo', { method: 'POST', body: { modo: activar ? 'activo' : 'apagado', confirmo: true } });
      ctx.toast(activar ? 'Recordatorios activados. El servidor revisa cada 20 minutos.' : 'Recordatorios apagados. No saldrá ningún correo.');
    } catch (e) { ctx.toast((e && e.message) || 'No se pudo cambiar el interruptor.', true); }
    est.ocupado = false;
    await cargar();
  }

  async function ensayo(boton) {
    var ctx = V.util.contexto();
    if (est.ocupado) return;
    est.ocupado = true; if (boton) boton.disabled = true;
    try {
      var e = await ctx.api('/api/admin/recordatorios/ensayo', { method: 'POST', body: {} });
      await V.modal({ titulo: 'Ensayo: qué pasaría ahora', cuerpo: ensayoCuerpoHTML(e), ancho: 'ancho', botones: [{ id: 'cerrar', texto: 'Cerrar', tipo: 'primario' }] });
    } catch (er) { ctx.toast((er && er.message) || 'No se pudo hacer el ensayo.', true); }
    est.ocupado = false; if (boton) boton.disabled = false;
  }

  async function guardarLimites() {
    var ctx = V.util.contexto();
    var tope = document.getElementById('rpTope').value.trim(), corrida = document.getElementById('rpCorrida').value.trim();
    var error = document.getElementById('rpLimitesError');
    if (!/^[0-9]+$/.test(tope) || !/^[0-9]+$/.test(corrida) || +tope < 1 || +corrida < 1) { error.textContent = 'Escribe números enteros mayores que cero.'; error.hidden = false; return; }
    error.hidden = true;
    try {
      await ctx.api('/api/admin/recordatorios/limites', { method: 'POST', body: { topeDiario: +tope, maxPorCorrida: +corrida } });
      ctx.toast('Límites guardados.'); await cargar();
    } catch (e) { error.textContent = (e && e.message) || 'No se pudieron guardar los límites.'; error.hidden = false; }
  }

  async function probar(todos, boton) {
    var ctx = V.util.contexto();
    if (est.ocupado) return;
    var paso = todos ? 'todos' : parseInt(document.getElementById('rpPasoPrueba').value, 10);
    var ciclo = parseInt(document.getElementById('rpCicloPrueba').value, 10) || 1;
    est.ocupado = true; if (boton) boton.disabled = true;
    try {
      var r = await ctx.api('/api/admin/recordatorios/prueba', { method: 'POST', body: { paso: paso, ciclo: ciclo } });
      ctx.toast('Listo: te enviamos ' + plural((r.enviados || []).length, 'correo', 'correos') + ' de prueba a ' + (r.para || 'tu correo') + '.');
    } catch (e) { ctx.toast((e && e.message) || 'No se pudo enviar la prueba.', true); }
    est.ocupado = false; if (boton) boton.disabled = false;
  }

  function pintar() {
    var u = V.util; var v = u.vista();
    var y = typeof window !== 'undefined' ? window.scrollY : 0;
    v.innerHTML = vistaHTML(est.datos, est);
    G.activar(v);
    if (y && typeof window !== 'undefined') window.scrollTo(0, y);
    var espera = null;
    v.oninput = function (e) {
      if (!e.target || e.target.id !== 'rpBuscar') return;
      est.q = e.target.value;
      clearTimeout(espera);
      espera = setTimeout(function () { recargarLista(false).then(function () { var c = document.getElementById('rpBuscar'); if (c) { c.focus(); try { c.setSelectionRange(c.value.length, c.value.length); } catch (x) { /* nada */ } } }).catch(function (er) { u.contexto().toast((er && er.message) || 'No se pudo buscar.', true); }); }, 280);
    };
    v.onchange = function (e) {
      if (!e.target || e.target.id !== 'rpEtapa') return;
      est.etapa = e.target.value || 'todas';
      recargarLista(false).catch(function (er) { u.contexto().toast((er && er.message) || 'No se pudo filtrar.', true); });
    };
    v.onsubmit = function (e) { if (e.target && e.target.id === 'rpLimites') { e.preventDefault(); guardarLimites(); } };
    v.onclick = function (ev) {
      var t = ev.target.closest('[data-etapa]');
      if (t) { est.etapa = t.dataset.etapa; recargarLista(false).catch(function (er) { u.contexto().toast((er && er.message) || 'No se pudo filtrar.', true); }); return; }
      u.acciones(ev, {
        recargar: cargar,
        activar: function () { cambiarModo(true); },
        apagar: function () { cambiarModo(false); },
        ensayo: function (b) { ensayo(b); },
        mas: function () { recargarLista(true).catch(function (er) { u.contexto().toast((er && er.message) || 'No se pudo cargar más.', true); }); },
        prueba: function (b) { probar(false, b); },
        'prueba-todos': function (b) { probar(true, b); }
      });
    };
  }

  return {
    estadoGeneral: estadoGeneral, insigniaModo: insigniaModo, cifras: cifras, controlHTML: controlHTML, comoFuncionaHTML: comoFuncionaHTML, porMonto: porMonto,
    resultadosTiles: resultadosTiles, fraseResultados: fraseResultados, graficaMontos: graficaMontos, graficaPasos: graficaPasos, graficaTrasCorreo: graficaTrasCorreo,
    puntos: puntos, filaCuenta: filaCuenta, tablaHTML: tablaHTML, seguimientoHTML: seguimientoHTML, recientesHTML: recientesHTML, pruebaHTML: pruebaHTML,
    activarCuerpoHTML: activarCuerpoHTML, ensayoCuerpoHTML: ensayoCuerpoHTML, vistaHTML: vistaHTML, recordatorios: cargar, PESTANAS: PESTANAS, ETAPAS: ETAPAS
  };
});
