/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · CRÉDITOS                            */
/* El administrador regala 100 créditos a mano; con 100 créditos */
/* la persona canjea UN material de «PDFs y materiales» que no   */
/* sea de ningún curso. Aquí se ve:                              */
/*   1. cifras: regalados, canjeados y pendientes de canjear     */
/*   2. la lista de cuentas (la más reciente primero) con el     */
/*      botón «Regalar 100 créditos» al costado de cada una      */
/*   3. el historial de regalos (Pendiente / Canjeado + material)*/
/*   4. la gráfica de materiales más canjeados                   */
/* Datos: GET /api/admin/creditos/{miembros,historial,metricas}  */
/* y POST /api/admin/creditos/regalar. Todo lo calcula el        */
/* servidor; aquí solo se dibuja. Los constructores de HTML son  */
/* puros y se prueban en tests/admin-creditos.test.js.           */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'), require('./admin-iconos.js'), null, require('./admin-graficas.js'));
  else root.ZOO_ADMIN_CREDITOS = factory(root.ZOO_ADMIN_PANEL, root.ZOO_ICONOS, root.ZOO_ADMIN_VISTAS, root.ZOO_ADMIN_GRAFICAS);
})(typeof self !== 'undefined' ? self : this, function (P, I, V, G) {
  'use strict';

  var esc = P.esc;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };
  var num = P.fmtNum;
  var REGALO = 100;

  function card(titulo, cuerpo, nota, id) {
    return '<section class="ap-card"' + (id ? ' id="' + esc(id) + '"' : '') + '><header class="ap-card__cab"><h2>' + esc(titulo) + '</h2>' + (nota ? '<p>' + esc(nota) + '</p>' : '') +
      '</header><div class="ap-card__cuerpo">' + cuerpo + '</div></section>';
  }
  function vacio(titulo, texto, icono) {
    return '<div class="zs-vacio ap-vacio">' + ico(icono || 'search-x', { size: 28 }) + '<strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></div>';
  }
  function plural(n, uno, varios) { return num(n) + ' ' + (n === 1 ? uno : varios); }

  /* ───────────────────────── Cifras de arriba ───────────────────────── */
  function cifras(m) {
    var d = m || {};
    return [
      { valor: num(d.regalados || 0), rotulo: 'créditos regalados' },
      { valor: num(d.canjeados || 0), rotulo: 'créditos canjeados' },
      { valor: num(d.pendientes || 0), rotulo: 'pendientes de canjear' }
    ];
  }

  /* ───────────────────────── Cuentas con el botón de regalar ───────────────────────── */
  function filtrarMiembros(lista, texto) {
    var q = P.sinAcentos(String(texto || '')).trim();
    if (!q) return lista;
    return lista.filter(function (m) { return P.sinAcentos((m.nombre || '') + ' ' + (m.correo || '')).indexOf(q) !== -1; });
  }

  function filaMiembro(m) {
    var registro = m.registro
      ? '<span class="ap-mi__linea ap-mi__reg">' + ico('clock', { size: 14 }) + '<span>Se registró ' + esc(P.fmtFechaHora(m.registro)) + '</span></span>'
      : '<span class="ap-mi__linea ap-mi__reg ap-mi__reg--nd">' + ico('clock', { size: 14 }) + '<span>Fecha de registro no disponible</span></span>';
    var saldo = '<span class="ap-cr__saldo' + (m.saldo > 0 ? ' ap-cr__saldo--hay' : '') + '">' + ico('wallet', { size: 16 }) + '<strong>' + num(m.saldo || 0) + '</strong><span>créditos</span></span>';
    var ultimo = m.ultimoRegalo ? '<span class="ap-mi__origen">Último regalo ' + esc(P.fmtFecha(m.ultimoRegalo)) + '</span>' : '';
    return '<li class="ap-mi ap-cr ap-mi--' + esc(m.estado) + '" data-uid="' + esc(m.uid) + '">' +
      '<span class="ap-mi__av"><span class="ap-avatar ap-avatar--' + esc(m.estado) + '" aria-hidden="true">' + esc(P.iniciales(m.nombre || m.correo)) + '</span></span>' +
      '<div class="ap-mi__txt"><strong class="ap-cr__nombre">' + esc(m.nombre || 'Sin nombre') + '</strong>' +
      '<span class="ap-mi__linea ap-mi__correo">' + ico('mail', { size: 14 }) + '<span class="ap-correo">' + esc(m.correo || 'Sin correo') + '</span></span>' + registro + '</div>' +
      '<div class="ap-mi__estado"><span class="ap-mi__insignias">' + P.insigniasMiembro(m) + '</span>' + saldo + ultimo + '</div>' +
      '<div class="ap-cr__accion"><button type="button" class="ap-btn ap-btn--primario ap-btn--chico" data-accion="regalar" data-uid="' + esc(m.uid) + '">' + ico('gift', { size: 16 }) + 'Regalar ' + REGALO + ' créditos</button></div></li>';
  }

  function listaMiembrosHTML(lista, visibles, texto) {
    if (!lista.length) return vacio(texto ? 'Nadie coincide con esa búsqueda' : 'Todavía no hay cuentas', texto ? 'Prueba con otro nombre o correo.' : 'Cuando alguien cree su cuenta aparecerá aquí.', 'users');
    var mostrar = lista.slice(0, visibles);
    return '<ul class="ap-mi-lista ap-cr-lista" aria-label="Cuentas, de la más reciente a la más antigua">' + mostrar.map(filaMiembro).join('') + '</ul>' +
      '<p class="ap-pie-tabla" role="status">Mostrando ' + num(mostrar.length) + ' de ' + num(lista.length) + '</p>' +
      (lista.length > mostrar.length ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="mas-miembros">Mostrar ' + Math.min(25, lista.length - mostrar.length) + ' más</button>' : '');
  }

  function textoConfirmacion(nombre) {
    return 'Vas a regalar ' + REGALO + ' créditos a <strong>' + esc(nombre || 'esta persona') + '</strong>. Alcanzan para canjear 1 material.';
  }

  /* ───────────────────────── Historial de regalos ───────────────────────── */
  var FILTROS = [['todos', 'Todos'], ['pendientes', 'Pendientes'], ['canjeados', 'Canjeados']];

  function filaRegalo(r) {
    var canjeado = r.estado === 'canjeado' && r.canje;
    var estado = canjeado
      ? '<span class="ap-badge ap-badge--ok">' + ico('circle-check', { size: 14 }) + '<span>Canjeado</span></span>'
      : '<span class="ap-badge ap-badge--aviso">' + ico('hourglass', { size: 14 }) + '<span>Pendiente de canjear</span></span>';
    var detalle = canjeado
      ? '<span class="ap-hr__mat">' + ico('file-text', { size: 14 }) + '<span>' + esc(r.canje.titulo || 'Material') + '</span></span><span class="ap-hr__fecha">Canjeado ' + esc(P.fmtFechaHora(r.canje.en)) + '</span>'
      : '<span class="ap-hr__fecha">Todavía no lo canjea</span>';
    return '<li class="ap-hr" data-id="' + esc(r.id) + '">' +
      '<div class="ap-hr__quien"><strong>' + esc(r.nombre || 'Sin nombre') + '</strong><span class="ap-mi__linea">' + ico('mail', { size: 14 }) + '<span class="ap-correo">' + esc(r.correo || 'Sin correo') + '</span></span></div>' +
      '<div class="ap-hr__cuando"><span>Regalado ' + esc(P.fmtFechaHora(r.en)) + '</span><span class="ap-hr__admin">Por ' + esc(r.regaladoPor || 'administración') + '</span></div>' +
      '<div class="ap-hr__estado">' + estado + detalle + '</div></li>';
  }

  function historialHTML(h, ui) {
    var u = ui || {};
    var datos = h || { regalos: [], totales: { todos: 0, pendientes: 0, canjeados: 0 }, total: 0 };
    var t = datos.totales || { todos: 0, pendientes: 0, canjeados: 0 };
    var filtro = FILTROS.some(function (f) { return f[0] === u.filtro; }) ? u.filtro : 'todos';
    var chips = '<div class="zs-chips" role="group" aria-label="Filtrar regalos">' + FILTROS.map(function (f) {
      return '<button type="button" class="zs-chip" data-filtro-regalo="' + f[0] + '" aria-pressed="' + (f[0] === filtro) + '">' + esc(f[1]) + ' · ' + num(t[f[0]] || 0) + '</button>';
    }).join('') + '</div>';
    var buscar = '<label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar por persona o material</span>' +
      '<input type="search" id="apCrBuscarHistorial" placeholder="Buscar persona o material" autocomplete="off" value="' + esc(u.texto || '') + '"></label>';
    var lista = (datos.regalos || []).length
      ? '<ul class="ap-hr-lista" aria-label="Historial de regalos, del más reciente al más antiguo">' + datos.regalos.map(filaRegalo).join('') + '</ul>' +
        '<p class="ap-pie-tabla" role="status">Mostrando ' + num(datos.regalos.length) + ' de ' + num(datos.total) + '</p>' + (datos.hayMas ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="mas-regalos">Mostrar más</button>' : '')
      : vacio(t.todos ? 'Ningún regalo coincide' : 'Todavía no has regalado créditos', t.todos ? 'Cambia el filtro o la búsqueda.' : 'Cuando regales créditos aparecerán aquí, con su estado: pendiente o canjeado.', 'gift');
    return '<div class="ap-controles">' + chips + '<div class="ap-controles__der">' + buscar + '</div></div><div id="apCrHistorialLista">' + lista + '</div>';
  }

  /* ───────────────────────── Gráfica: materiales más canjeados ───────────────────────── */
  function fraseGrafica(m) {
    var lista = (m && m.materiales) || [];
    var total = lista.reduce(function (t, x) { return t + x.canjes; }, 0);
    if (!total) return '';
    var a = lista[0];
    var texto = 'El material más canjeado es «' + a.titulo + '»: ' + plural(a.canjes, 'canje', 'canjes') + ' de ' + plural(total, 'en total', 'en total') + ' (' + Math.round(a.canjes / total * 100) + ' %).';
    if (lista[1] && lista[1].canjes === a.canjes) texto = 'Hay empate arriba: «' + a.titulo + '» y «' + lista[1].titulo + '» tienen ' + plural(a.canjes, 'canje', 'canjes') + ' cada uno, de ' + num(total) + ' en total.';
    return texto;
  }

  function graficaHTML(m) {
    var lista = (m && m.materiales) || [];
    var cuerpo = G.ranking({
      titulo: 'Materiales más canjeados', unidad: 'canjes', color: 1, maximo: 8,
      filas: lista.map(function (x) { return { etiqueta: x.titulo, valor: x.canjes }; }),
      vacio: { titulo: 'Aún nadie ha canjeado créditos', texto: 'Cuando alguien canjee sus créditos verás aquí qué materiales prefieren.' }
    });
    var frase = fraseGrafica(m);
    return cuerpo + (frase ? '<p class="ap-frase" role="note"><strong>Cómo leerlo:</strong> ' + esc(frase) + '</p>' : '');
  }

  /* ───────────────────────── Pantalla completa ───────────────────────── */
  // d = { miembros, historial, metricas } · ui = { texto, visibles, filtro, textoHistorial }
  function vistaHTML(d, ui) {
    var u = ui || {};
    var data = d || {};
    var m = data.metricas || {};
    var lista = filtrarMiembros((data.miembros && data.miembros.miembros) || [], u.texto);
    var titulo = P.tarjetaTitulo({
      icono: 'wallet', eyebrow: 'Panel de administración', titulo: 'Regala', acento: 'créditos.',
      sub: 'Regala ' + REGALO + ' créditos a quien quieras. Con ' + REGALO + ' créditos la persona canjea 1 material de «PDFs y materiales» que no sea de ningún curso; si le regalas otros ' + REGALO + ', puede canjear otro.',
      cifras: cifras(m), acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    });
    var controles = '<div class="ap-controles"><div class="ap-controles__der ap-controles__der--solo"><label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar por nombre o correo</span>' +
      '<input type="search" id="apCrBuscar" placeholder="Buscar por nombre o correo" autocomplete="off" value="' + esc(u.texto || '') + '"></label></div></div>';
    return titulo +
      card('Cuentas', controles + '<div id="apCrMiembros">' + listaMiembrosHTML(lista, u.visibles || 25, u.texto) + '</div>', 'De la cuenta más reciente a la más antigua. Cada regalo es de ' + REGALO + ' créditos y requiere que la persona haya confirmado su correo.') +
      card('Historial de regalos', historialHTML(data.historial, { filtro: u.filtro, texto: u.textoHistorial }), 'A quién se le regaló, quién lo regaló y si ya lo canjeó.', 'apCrHistorial') +
      card('Materiales más canjeados', graficaHTML(m), 'Cuántas veces se canjeó cada material.', 'apCrGrafica') +
      (data.miembros && data.miembros.truncado ? '<div class="ap-aviso ap-aviso--info" role="note">' + ico('info', { size: 20 }) + '<div><p>Se muestran las primeras 5,000 cuentas.</p></div></div>' : '');
  }

  /* ───────────────────────── Controlador (solo en el navegador) ───────────────────────── */
  var est = { datos: null, texto: '', visibles: 25, filtro: 'todos', textoHistorial: '', pagina: 1, ocupado: false };

  function nuevaClave() {
    var a = '';
    try { var b = new Uint8Array(12); (root.crypto || {}).getRandomValues(b); a = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); } catch (e) { a = ''; }
    return 'r' + (a || (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)));
  }

  async function cargar(forzar) {
    var u = V.util; var ctx = u.contexto(); var mi = u.nuevoContador();
    u.vista().innerHTML = u.cargando('Créditos');
    var rutaHist = '/api/admin/creditos/historial?estado=' + est.filtro + '&q=' + encodeURIComponent(est.textoHistorial || '') + '&pagina=1' + (forzar ? '&refrescar=1' : '');
    var r;
    try {
      r = await Promise.all([ctx.api('/api/admin/creditos/miembros' + (forzar ? '?refrescar=1' : '')), ctx.api(rutaHist), ctx.api('/api/admin/creditos/metricas')]);
    } catch (e) {
      if (mi !== u.contadorActual()) return;
      u.vista().innerHTML = u.errorHTML('Créditos', e, 'recargar');
      u.vista().onclick = function (ev) { u.acciones(ev, { recargar: function () { cargar(true); } }); };
      return;
    }
    if (mi !== u.contadorActual()) return;
    est.datos = { miembros: r[0], historial: r[1], metricas: r[2] }; est.pagina = 1;
    pintar();
  }

  function pintarMiembros() {
    var cont = document.getElementById('apCrMiembros');
    if (!cont) return;
    cont.innerHTML = listaMiembrosHTML(filtrarMiembros(est.datos.miembros.miembros, est.texto), est.visibles, est.texto);
  }

  async function recargarHistorial(agregar) {
    var ctx = V.util.contexto();
    var pagina = agregar ? est.pagina + 1 : 1;
    var h = await ctx.api('/api/admin/creditos/historial?estado=' + est.filtro + '&q=' + encodeURIComponent(est.textoHistorial || '') + '&pagina=' + pagina);
    if (agregar && est.datos.historial) { h.regalos = est.datos.historial.regalos.concat(h.regalos); }
    est.datos.historial = h; est.pagina = pagina;
    var cont = document.getElementById('apCrHistorial');
    if (cont) cont.querySelector('.ap-card__cuerpo').innerHTML = historialHTML(h, { filtro: est.filtro, texto: est.textoHistorial });
    var campo = document.getElementById('apCrBuscarHistorial');
    if (campo && document.activeElement !== campo && est.textoHistorial) { /* el campo se vuelve a pintar con su valor */ }
  }

  async function regalar(uid, boton) {
    var u = V.util; var ctx = u.contexto();
    var m = est.datos.miembros.miembros.filter(function (x) { return x.uid === uid; })[0];
    if (!m || est.ocupado) return;
    var si = await V.confirmar({ titulo: 'Regalar ' + REGALO + ' créditos', texto: textoConfirmacion(m.nombre || m.correo), aceptar: 'Sí, regalar ' + REGALO, cancelar: 'Mejor no', peligro: false });
    if (!si) return;
    est.ocupado = true;
    var botones = document.querySelectorAll('.ap-cr__accion button');
    botones.forEach(function (b) { b.disabled = true; });
    if (boton) boton.lastChild.textContent = 'Regalando…';
    try {
      var r = await ctx.api('/api/admin/creditos/regalar', { method: 'POST', body: { uid: uid, clave: nuevaClave() } });
      ctx.toast('Listo: regalaste ' + REGALO + ' créditos a ' + (m.nombre || m.correo || 'la persona') + '. Ahora tiene ' + num(r.saldo) + '.');
      est.ocupado = false;
      await cargar(true);
    } catch (e) {
      est.ocupado = false;
      botones.forEach(function (b) { b.disabled = false; });
      if (boton) boton.lastChild.textContent = 'Regalar ' + REGALO + ' créditos';
      ctx.toast((e && e.message) || 'No se pudieron regalar los créditos.', true);
    }
  }

  function pintar() {
    var u = V.util; var v = u.vista();
    var y = typeof window !== 'undefined' ? window.scrollY : 0;
    v.innerHTML = vistaHTML(est.datos, est);
    G.activar(v);
    if (y && typeof window !== 'undefined') window.scrollTo(0, y);
    var buscar = document.getElementById('apCrBuscar');
    if (buscar) buscar.addEventListener('input', function (e) { est.texto = e.target.value; est.visibles = 25; pintarMiembros(); });
    var bh = document.getElementById('apCrBuscarHistorial');
    var espera = null;
    v.oninput = function (e) {
      if (!e.target || e.target.id !== 'apCrBuscarHistorial') return;
      est.textoHistorial = e.target.value;
      clearTimeout(espera);
      espera = setTimeout(function () { recargarHistorial(false).then(function () { var c = document.getElementById('apCrBuscarHistorial'); if (c) { c.focus(); try { c.setSelectionRange(c.value.length, c.value.length); } catch (x) { /* nada */ } } }).catch(function (er) { u.contexto().toast((er && er.message) || 'No se pudo buscar.', true); }); }, 280);
    };
    void bh;
    v.onclick = function (ev) {
      var f = ev.target.closest('[data-filtro-regalo]');
      if (f) { est.filtro = f.dataset.filtroRegalo; recargarHistorial(false).catch(function (er) { u.contexto().toast((er && er.message) || 'No se pudo filtrar.', true); }); return; }
      u.acciones(ev, {
        recargar: function () { cargar(true); },
        'mas-miembros': function () { est.visibles += 25; pintarMiembros(); },
        'mas-regalos': function () { recargarHistorial(true).catch(function (er) { u.contexto().toast((er && er.message) || 'No se pudo cargar más.', true); }); },
        regalar: function (b) { regalar(b.dataset.uid, b); }
      });
    };
  }

  return {
    REGALO: REGALO, cifras: cifras, filtrarMiembros: filtrarMiembros, filaMiembro: filaMiembro, listaMiembrosHTML: listaMiembrosHTML, textoConfirmacion: textoConfirmacion,
    filaRegalo: filaRegalo, historialHTML: historialHTML, fraseGrafica: fraseGrafica, graficaHTML: graficaHTML, vistaHTML: vistaHTML, creditos: cargar, FILTROS: FILTROS
  };
});
