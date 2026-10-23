/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · CRÉDITOS                            */
/* El administrador regala créditos a mano (100, 200, 300, 400 u */
/* otra cantidad de 1 a 1,000); cada 100 créditos la persona     */
/* canjea UN material de «PDFs y materiales» que no sea de ningún */
/* curso. Aquí se ve:                                            */
/*   1. cifras: regalados, canjeados y pendientes de canjear     */
/*   2. la lista de cuentas (la más reciente primero) con el     */
/*      botón «Regalar créditos» al costado de cada una          */
/*   3. el historial de regalos (Pendiente / Canjeados 1 de 3 /  */
/*      Canjeado + materiales)                                   */
/*   4. la gráfica de materiales más canjeados                   */
/*   5. los cupones: la administración crea una clave (los      */
/*      créditos que entrega, fecha límite y máximo de personas   */
/*      opcionales), la comparte por el canal de WhatsApp y ve    */
/*      cuántas personas la canjearon; puede pausarla            */
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
  var REGALO = 100;               // lo que se propone al abrir la ventana
  var COSTO = 100;                // créditos por material (lo fija el servidor)
  var MAX_REGALO = 1000;          // máximo por regalo
  var OPCIONES = [100, 200, 300, 400];

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
      '<div class="ap-cr__accion"><button type="button" class="ap-btn ap-btn--primario ap-btn--chico" data-accion="regalar" data-uid="' + esc(m.uid) + '">' + ico('gift', { size: 16 }) + 'Regalar créditos</button></div></li>';
  }

  function listaMiembrosHTML(lista, visibles, texto) {
    if (!lista.length) return vacio(texto ? 'Nadie coincide con esa búsqueda' : 'Todavía no hay cuentas', texto ? 'Prueba con otro nombre o correo.' : 'Cuando alguien cree su cuenta aparecerá aquí.', 'users');
    var mostrar = lista.slice(0, visibles);
    return '<ul class="ap-mi-lista ap-cr-lista" aria-label="Cuentas, de la más reciente a la más antigua">' + mostrar.map(filaMiembro).join('') + '</ul>' +
      '<p class="ap-pie-tabla" role="status">Mostrando ' + num(mostrar.length) + ' de ' + num(lista.length) + '</p>' +
      (lista.length > mostrar.length ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="mas-miembros">Mostrar ' + Math.min(25, lista.length - mostrar.length) + ' más</button>' : '');
  }

  /* ───────────────────────── Cantidad a regalar ───────────────────────── */
  /* Lo que se escribe en «Otra cantidad»: solo dígitos, un entero de 1 a 1,000 (nada de decimales, signos, letras ni notación científica). */
  function analizarCantidad(texto) {
    var t = String(texto == null ? '' : texto).trim();
    if (!t) return { ok: false, cantidad: 0, error: 'Escribe cuántos créditos quieres regalar.' };
    if (!/^[0-9]+$/.test(t)) return { ok: false, cantidad: 0, error: 'Escribe solo un número entero, sin puntos, comas ni letras.' };
    var n = parseInt(t, 10);
    if (n < 1) return { ok: false, cantidad: 0, error: 'La cantidad debe ser de al menos 1 crédito.' };
    if (n > MAX_REGALO) return { ok: false, cantidad: 0, error: 'El máximo por regalo es de ' + num(MAX_REGALO) + ' créditos.' };
    return { ok: true, cantidad: n, error: '' };
  }

  /* Cuántos materiales alcanzan y cuánto sobra (cada material cuesta 100) */
  function alcance(cantidad) {
    var n = Math.floor(Number(cantidad) || 0);
    return { materiales: Math.floor(n / COSTO), sobra: n % COSTO };
  }

  /* «Alcanzan para canjear 3 materiales.» · «2 materiales y sobran 50 créditos de saldo.» · «Todavía no alcanzan para un material…» */
  function fraseAlcance(cantidad) {
    var a = alcance(cantidad);
    if (!a.materiales) return 'Todavía no alcanzan para canjear un material (cada uno cuesta ' + COSTO + '), pero quedan como saldo.';
    var m = a.materiales + (a.materiales === 1 ? ' material' : ' materiales');
    if (!a.sobra) return 'Alcanzan para canjear ' + m + '.';
    return 'Alcanzan para canjear ' + m + ' y ' + (a.sobra === 1 ? 'sobra 1 crédito' : 'sobran ' + a.sobra + ' créditos') + ' de saldo.';
  }

  function textoCreditos(n) { return num(n) + (n === 1 ? ' crédito' : ' créditos'); }

  function textoConfirmacion(nombre, cantidad) {
    var c = cantidad === undefined ? REGALO : cantidad;
    return 'Vas a regalar ' + textoCreditos(c) + ' a <strong>' + esc(nombre || 'esta persona') + '</strong>. ' + fraseAlcance(c);
  }

  /* El cuerpo de la ventana de regalar: 100, 200, 300, 400 y «Otra cantidad» con un campo numérico, y la frase que se actualiza al elegir */
  function regaloCuerpoHTML(nombre, cantidad) {
    var c = cantidad === undefined ? REGALO : cantidad;
    var opciones = OPCIONES.map(function (n) {
      return '<button type="button" class="ap-cr-op" data-cantidad="' + n + '" aria-pressed="' + (n === c) + '">' + num(n) + '</button>';
    }).join('') + '<button type="button" class="ap-cr-op ap-cr-op--otra" data-otra="1" aria-pressed="false">Otra cantidad</button>';
    return '<p class="ap-modal__texto">¿Cuántos créditos quieres regalar a <strong>' + esc(nombre || 'esta persona') + '</strong>?</p>' +
      '<div class="ap-cr-opciones" role="group" aria-label="Cantidad de créditos a regalar">' + opciones + '</div>' +
      '<div class="ap-campo ap-cr-otra" id="apCrOtra" hidden><label for="apCrOtraCampo">Escribe la cantidad (de 1 a ' + num(MAX_REGALO) + ')</label>' +
      '<input type="text" id="apCrOtraCampo" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="Por ejemplo, 250" aria-describedby="apCrOtraError"></div>' +
      '<p class="ap-error" id="apCrOtraError" role="alert" hidden></p>' +
      '<p class="ap-modal__texto ap-cr-frase" id="apCrFrase" aria-live="polite">' + textoConfirmacion(nombre, c) + '</p>';
  }

  /* Texto del botón de aceptar */
  function textoAceptar(cantidad) { return 'Sí, regalar ' + num(cantidad); }

  /* ───────────────────────── Historial de regalos ───────────────────────── */
  var FILTROS = [['todos', 'Todos'], ['pendientes', 'Pendientes'], ['canjeados', 'Canjeados']];

  /* Estado de un regalo: Pendiente de canjear · Canjeados 1 de 3 · Canjeado */
  function estadoRegalo(r) {
    var total = Number(r.materialesTotal) || 0, hechos = Number(r.materialesCanjeados) || 0;
    if (r.estado === 'canjeado') return { clase: 'ok', icono: 'circle-check', texto: total > 1 ? 'Canjeados ' + hechos + ' de ' + total : 'Canjeado' };
    if (r.estado === 'parcial') return { clase: 'aviso', icono: 'hourglass', texto: total ? 'Canjeados ' + hechos + ' de ' + total : 'Canjeado en parte' };
    return { clase: 'aviso', icono: 'hourglass', texto: 'Pendiente de canjear' };
  }
  function listaCanjes(r) {
    var lista = Array.isArray(r.canjes) && r.canjes.length ? r.canjes : (r.canje ? [r.canje] : []);
    return lista.map(function (c) {
      return '<span class="ap-hr__mat">' + ico(c.esLibro ? 'book-open' : 'file-text', { size: 14 }) + '<span>' + esc(c.titulo || 'Material') + '</span>' + (c.esLibro ? '<span class="ap-hr__libro">Libro</span>' : '') + '</span><span class="ap-hr__fecha">Canjeado ' + esc(P.fmtFechaHora(c.en)) + '</span>';
    }).join('');
  }

  function filaRegalo(r) {
    var e = estadoRegalo(r);
    var materiales = listaCanjes(r);
    var detalle = materiales || '<span class="ap-hr__fecha">Todavía no lo canjea</span>';
    var pendiente = r.estado === 'parcial' && Number(r.materialesTotal) > Number(r.materialesCanjeados)
      ? '<span class="ap-hr__fecha">Faltan ' + (Number(r.materialesTotal) - Number(r.materialesCanjeados)) + ' por canjear</span>' : '';
    var estado = '<span class="ap-badge ap-badge--' + e.clase + '">' + ico(e.icono, { size: 14 }) + '<span>' + esc(e.texto) + '</span></span>';
    var cantidad = Number(r.cantidad) > 0 ? '<span class="ap-hr__cant">' + ico('wallet', { size: 14 }) + '<strong>' + esc(textoCreditos(Number(r.cantidad))) + '</strong></span>' : '';
    return '<li class="ap-hr" data-id="' + esc(r.id) + '">' +
      '<div class="ap-hr__quien"><strong>' + esc(r.nombre || 'Sin nombre') + '</strong><span class="ap-mi__linea">' + ico('mail', { size: 14 }) + '<span class="ap-correo">' + esc(r.correo || 'Sin correo') + '</span></span></div>' +
      '<div class="ap-hr__cuando">' + cantidad + '<span>Regalado ' + esc(P.fmtFechaHora(r.en)) + '</span><span class="ap-hr__admin">' + (r.origen === 'cupon' ? 'Cupón ' + esc(r.cupon || '') : 'Por ' + esc(r.regaladoPor || 'administración')) + '</span></div>' +
      '<div class="ap-hr__estado">' + estado + detalle + pendiente + '</div></li>';
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

  /* ───────────────────────── Cupones de créditos ───────────────────────── */
  var ESTADOS_CUPON = {
    activo: { texto: 'Activo', clase: 'ok' }, pausado: { texto: 'Pausado', clase: 'neutro' },
    vencido: { texto: 'Vencido', clase: 'aviso' }, agotado: { texto: 'Agotado', clase: 'info' }
  };
  var ENLACE_CANJE = 'https://www.zoorigen.com/pages/club-pdfs.html';

  function fechaHoraCupon(iso) { return iso ? P.fmtFechaHora(iso) : ''; }

  /* El mensaje listo para pegar en el canal de WhatsApp (lleva la clave, los créditos y, si los hay, el límite y la fecha) */
  function mensajeCupon(c) {
    var x = c || {};
    var lineas = ['Cupón de créditos Zoorigen', '',
      'Clave: ' + (x.clave || ''), 'Te da ' + num(x.creditos || 0) + (x.creditos === 1 ? ' crédito' : ' créditos') + ' para canjear materiales (100 créditos = 1 material).', '',
      'Cómo usarla: entra a PDFs y materiales, escribe la clave en «¿Tienes un código?» y toca Canjear.', ENLACE_CANJE];
    var extra = [];
    if (x.maxPersonas) extra.push('Solo para las primeras ' + num(x.maxPersonas) + ' personas');
    if (x.vence) extra.push('Vence el ' + P.fmtFechaHora(x.vence));
    if (extra.length) lineas.push('', extra.join(' · ').replace(/\.$/, '') + '.');
    return lineas.join('\n');
  }

  function formularioCuponHTML() {
    return '<form class="ap-cp-form" id="apCpForm" autocomplete="off" novalidate>' +
      '<label class="ap-cp-campo"><span>Clave (vacía = al azar)</span><input type="text" id="apCpClave" maxlength="24" placeholder="Ej.: CANAL100" autocapitalize="characters" spellcheck="false" aria-describedby="apCpAyuda"></label>' +
      '<label class="ap-cp-campo"><span>Créditos</span><input type="number" id="apCpCreditos" min="1" max="' + MAX_REGALO + '" step="1" value="100" inputmode="numeric"></label>' +
      '<label class="ap-cp-campo"><span>Vence el (opcional)</span><input type="datetime-local" id="apCpVence"></label>' +
      '<label class="ap-cp-campo"><span>Máximo de personas</span><input type="number" id="apCpMax" min="1" max="100000" step="1" placeholder="Sin límite" inputmode="numeric"></label>' +
      '<button type="submit" class="ap-btn ap-btn--primario ap-cp-crear" data-accion="cupon-crear">' + ico('plus', { size: 18 }) + 'Crear cupón</button></form>' +
      '<p class="ap-cp-ayuda" id="apCpAyuda">La clave no distingue mayúsculas de minúsculas (de 4 a 24 letras o números). Cada persona puede canjearla una sola vez. Sin fecha ni máximo, sirve hasta que la pauses.</p>' +
      '<p class="ap-error" id="apCpError" role="alert" hidden></p>';
  }

  function filaCuponHTML(c) {
    var e = ESTADOS_CUPON[c.estado] || ESTADOS_CUPON.activo;
    var cuenta = c.maxPersonas ? num(c.canjes) + ' de ' + num(c.maxPersonas) : num(c.canjes);
    var canjes = '<strong>' + cuenta + '</strong><span>' + (c.maxPersonas ? 'canjes' : (c.canjes === 1 ? 'canje' : 'canjes')) + ' · ' + num(c.creditosEntregados) + ' créditos entregados</span>';
    var vence = c.vence
      ? '<strong>' + (c.estado === 'vencido' ? 'Venció' : 'Vence') + '</strong><span>' + esc(fechaHoraCupon(c.vence)) + '</span>'
      : '<strong>Sin fecha límite</strong><span>Hasta que lo pauses</span>';
    var pausa = c.estadoGuardado === 'pausado'
      ? '<button type="button" class="ap-btn ap-btn--suave ap-btn--chico" data-accion="cupon-estado" data-clave="' + esc(c.clave) + '" data-a="activo">Reactivar</button>'
      : '<button type="button" class="ap-btn ap-btn--suave ap-btn--chico" data-accion="cupon-estado" data-clave="' + esc(c.clave) + '" data-a="pausado">Pausar</button>';
    return '<li class="ap-cp" data-clave="' + esc(c.clave) + '">' +
      '<div class="ap-cp__clave"><code>' + esc(c.clave) + '</code><span>' + num(c.creditos) + (c.creditos === 1 ? ' crédito' : ' créditos') + '</span></div>' +
      '<span class="ap-badge ap-badge--' + e.clase + '"><span>' + esc(e.texto) + '</span></span>' +
      '<div class="ap-cp__dato">' + canjes + '</div><div class="ap-cp__dato">' + vence + '</div>' +
      '<div class="ap-cp__acciones"><button type="button" class="ap-btn ap-btn--suave ap-btn--chico" data-accion="cupon-copiar" data-clave="' + esc(c.clave) + '">' + ico('copy', { size: 16 }) + 'Copiar mensaje</button>' +
      '<button type="button" class="ap-btn ap-btn--suave ap-btn--chico" data-accion="cupon-quien" data-clave="' + esc(c.clave) + '">Ver quién</button>' + pausa + '</div></li>';
  }

  function cuponesHTML(d) {
    var form = formularioCuponHTML();
    if (!d) return form + vacio('No se pudieron cargar los cupones', 'Si acabas de actualizar el servidor, espera un momento y pulsa Actualizar.', 'triangle-alert');
    var lista = Array.isArray(d.cupones) ? d.cupones : [];
    if (!lista.length) return form + vacio('Todavía no has creado cupones', 'Crea uno, comparte la clave en el canal de WhatsApp y aquí verás cuántas personas lo canjean.', 'gift');
    return form + '<ul class="ap-cp-lista" aria-label="Cupones, del más reciente al más antiguo">' + lista.map(filaCuponHTML).join('') + '</ul>';
  }

  /* «Ver quién»: nombre, correo, créditos y fecha de cada persona que canjeó el cupón */
  function quienHTML(canjes) {
    var lista = Array.isArray(canjes) ? canjes : [];
    if (!lista.length) return '<p class="ap-modal__texto">Todavía nadie ha canjeado este cupón.</p>';
    return '<ul class="ap-cp-quien">' + lista.map(function (x) {
      return '<li><strong>' + esc(x.nombre || 'Sin nombre') + '</strong><span class="ap-correo">' + esc(x.correo || '') + '</span><span>' + esc(fechaHoraCupon(x.en)) + ' · ' + num(x.creditos) + ' créditos</span></li>';
    }).join('') + '</ul>';
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
      sub: 'Regala 100, 200, 300, 400 u otra cantidad de créditos a quien quieras. Cada 100 créditos la persona canjea 1 material de «PDFs y materiales» que no sea de ningún curso.',
      cifras: cifras(m), acciones: [{ id: 'recargar', texto: 'Actualizar', icono: 'refresh-cw' }]
    });
    var controles = '<div class="ap-controles"><div class="ap-controles__der ap-controles__der--solo"><label class="ap-buscar">' + ico('search', { size: 18 }) + '<span class="sr-only">Buscar por nombre o correo</span>' +
      '<input type="search" id="apCrBuscar" placeholder="Buscar por nombre o correo" autocomplete="off" value="' + esc(u.texto || '') + '"></label></div></div>';
    return titulo +
      card('Cupones', cuponesHTML(data.cupones), 'Crea una clave, compártela en el canal de WhatsApp y cada persona la canjea una sola vez en «¿Tienes un código?».', 'apCrCupones') +
      card('Cuentas', controles + '<div id="apCrMiembros">' + listaMiembrosHTML(lista, u.visibles || 25, u.texto) + '</div>', 'De la cuenta más reciente a la más antigua. Eliges cuántos créditos regalar (de 1 a ' + num(MAX_REGALO) + ' por regalo, hasta ' + num(MAX_REGALO) + ' por cuenta al día) y la persona debe haber confirmado su correo.') +
      card('Historial de regalos', historialHTML(data.historial, { filtro: u.filtro, texto: u.textoHistorial }), 'A quién se le regaló, cuánto, quién lo regaló y cuántos materiales ya canjeó.', 'apCrHistorial') +
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
      r = await Promise.all([ctx.api('/api/admin/creditos/miembros' + (forzar ? '?refrescar=1' : '')), ctx.api(rutaHist), ctx.api('/api/admin/creditos/metricas'),
        ctx.api('/api/admin/creditos/cupones').catch(function () { return null; })]);   // un servidor anterior no tiene cupones: el resto sigue igual
    } catch (e) {
      if (mi !== u.contadorActual()) return;
      u.vista().innerHTML = u.errorHTML('Créditos', e, 'recargar');
      u.vista().onclick = function (ev) { u.acciones(ev, { recargar: function () { cargar(true); } }); };
      return;
    }
    if (mi !== u.contadorActual()) return;
    est.datos = { miembros: r[0], historial: r[1], metricas: r[2], cupones: r[3] }; est.pagina = 1;
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

  /* Ventana de regalar: elige 100, 200, 300, 400 u «Otra cantidad»; la frase y el botón se actualizan al instante. Devuelve la cantidad o null. */
  function pedirCantidad(nombre) {
    var estadoVentana = { cantidad: REGALO, otra: false };
    return V.modal({
      titulo: 'Regalar créditos', cuerpo: regaloCuerpoHTML(nombre, REGALO),
      botones: [{ id: 'no', texto: 'Mejor no', tipo: 'suave' }, { id: 'si', texto: textoAceptar(REGALO), tipo: 'primario' }],
      alAbrir: function (caja) {
        var si = caja.querySelector('[data-modal="si"]'), frase = caja.querySelector('#apCrFrase'), bloque = caja.querySelector('#apCrOtra');
        var campo = caja.querySelector('#apCrOtraCampo'), error = caja.querySelector('#apCrOtraError');
        function marcar(boton) {
          Array.prototype.forEach.call(caja.querySelectorAll('.ap-cr-op'), function (b) { b.setAttribute('aria-pressed', b === boton ? 'true' : 'false'); });
        }
        function mostrar() {
          if (!estadoVentana.otra) { error.hidden = true; si.disabled = false; si.textContent = textoAceptar(estadoVentana.cantidad); frase.innerHTML = textoConfirmacion(nombre, estadoVentana.cantidad); return; }
          var a = analizarCantidad(campo.value);
          if (a.ok) { estadoVentana.cantidad = a.cantidad; error.hidden = true; si.disabled = false; si.textContent = textoAceptar(a.cantidad); frase.innerHTML = textoConfirmacion(nombre, a.cantidad); }
          else { si.disabled = true; si.textContent = 'Sí, regalar'; frase.textContent = 'Elige cuántos créditos regalar.'; error.textContent = campo.value.trim() ? a.error : ''; error.hidden = !campo.value.trim(); }
        }
        caja.addEventListener('click', function (ev) {
          var op = ev.target.closest('.ap-cr-op'); if (!op) return;
          if (op.dataset.otra) { estadoVentana.otra = true; bloque.hidden = false; marcar(op); campo.focus(); mostrar(); return; }
          estadoVentana.otra = false; estadoVentana.cantidad = parseInt(op.dataset.cantidad, 10); bloque.hidden = true; marcar(op); mostrar();
        });
        campo.addEventListener('input', mostrar);
        campo.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); if (!si.disabled) si.click(); } });
        caja._estado = estadoVentana;
        mostrar();
      },
      alElegir: function (id, caja, cerrar) {
        if (id !== 'si') return cerrar(null);
        var e = caja._estado;
        if (e.otra) { var a = analizarCantidad(caja.querySelector('#apCrOtraCampo').value); if (!a.ok) return undefined; return cerrar(a.cantidad); }
        return cerrar(e.cantidad);
      }
    });
  }

  async function regalar(uid, boton) {
    var u = V.util; var ctx = u.contexto();
    var m = est.datos.miembros.miembros.filter(function (x) { return x.uid === uid; })[0];
    if (!m || est.ocupado) return;
    var cantidad = await pedirCantidad(m.nombre || m.correo);
    if (!cantidad) return;
    est.ocupado = true;
    var botones = document.querySelectorAll('.ap-cr__accion button');
    botones.forEach(function (b) { b.disabled = true; });
    if (boton) boton.lastChild.textContent = 'Regalando…';
    try {
      var r = await ctx.api('/api/admin/creditos/regalar', { method: 'POST', body: { uid: uid, cantidad: cantidad, clave: nuevaClave() } });
      ctx.toast('Listo: regalaste ' + textoCreditos(r.cantidad || cantidad) + ' a ' + (m.nombre || m.correo || 'la persona') + '. Ahora tiene ' + num(r.saldo) + '.');
      est.ocupado = false;
      await cargar(true);
    } catch (e) {
      est.ocupado = false;
      botones.forEach(function (b) { b.disabled = false; });
      if (boton) boton.lastChild.textContent = 'Regalar créditos';
      ctx.toast((e && e.message) || 'No se pudieron regalar los créditos.', true);
    }
  }


  /* ───── Cupones: crear, copiar el mensaje, ver quién y pausar ───── */
  function cuponAISO(valor) {
    if (!valor) return null;
    var d = new Date(valor);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  async function crearCupon() {
    var u = V.util; var ctx = u.contexto();
    var error = document.getElementById('apCpError'); var boton = document.querySelector('[data-accion="cupon-crear"]');
    function falla(txt) { if (error) { error.textContent = txt; error.hidden = false; } }
    if (error) error.hidden = true;
    var clave = (document.getElementById('apCpClave').value || '').trim();
    var cantTexto = (document.getElementById('apCpCreditos').value || '').trim();
    var maxTexto = (document.getElementById('apCpMax').value || '').trim();
    if (!/^[0-9]+$/.test(cantTexto) || +cantTexto < 1 || +cantTexto > MAX_REGALO) return falla('Escribe cuántos créditos entrega: un número entero de 1 a ' + num(MAX_REGALO) + '.');
    if (maxTexto && (!/^[0-9]+$/.test(maxTexto) || +maxTexto < 1)) return falla('El máximo de personas debe ser un número entero, o déjalo vacío para no poner límite.');
    var vence = cuponAISO(document.getElementById('apCpVence').value);
    if (vence === undefined) return falla('La fecha límite no es válida.');
    if (vence && Date.parse(vence) <= Date.now()) return falla('La fecha y hora límite deben ser futuras.');
    if (est.ocupado) return undefined;
    est.ocupado = true; if (boton) { boton.disabled = true; }
    try {
      var r = await ctx.api('/api/admin/creditos/cupones', { method: 'POST', body: { clave: clave, creditos: +cantTexto, vence: vence, maxPersonas: maxTexto ? +maxTexto : null } });
      est.ocupado = false;
      ctx.toast('Cupón ' + r.cupon.clave + ' creado. Pulsa «Copiar mensaje» para compartirlo en el canal.');
      await cargar(true);
    } catch (e) {
      est.ocupado = false; if (boton) boton.disabled = false;
      falla((e && e.message) || 'No se pudo crear el cupón.');
    }
    return undefined;
  }
  async function copiarCupon(clave) {
    var ctx = V.util.contexto();
    var c = ((est.datos.cupones && est.datos.cupones.cupones) || []).filter(function (x) { return x.clave === clave; })[0];
    if (!c) return;
    try { await navigator.clipboard.writeText(mensajeCupon(c)); ctx.toast('Mensaje copiado. Pégalo en el canal de WhatsApp.'); } catch (e) { ctx.toast('No se pudo copiar el mensaje.', true); }
  }
  async function quienCupon(clave) {
    var ctx = V.util.contexto();
    var r;
    try { r = await ctx.api('/api/admin/creditos/cupones/canjes?clave=' + encodeURIComponent(clave)); } catch (e) { ctx.toast((e && e.message) || 'No se pudo cargar quién canjeó el cupón.', true); return; }
    V.modal({ titulo: 'Quién canjeó ' + clave + ' (' + num(r.total || 0) + ')', cuerpo: quienHTML(r.canjes), botones: [{ id: 'cerrar', texto: 'Cerrar', tipo: 'primario' }] });
  }
  async function estadoCupon(clave, nuevo) {
    var ctx = V.util.contexto();
    if (est.ocupado) return;
    est.ocupado = true;
    try {
      await ctx.api('/api/admin/creditos/cupones/estado', { method: 'POST', body: { clave: clave, estado: nuevo } });
      est.ocupado = false;
      ctx.toast(nuevo === 'pausado' ? 'Cupón ' + clave + ' pausado: nadie más podrá canjearlo.' : 'Cupón ' + clave + ' reactivado.');
      await cargar(true);
    } catch (e) { est.ocupado = false; ctx.toast((e && e.message) || 'No se pudo cambiar el cupón.', true); }
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
    v.onsubmit = function (ev) { if (ev.target && ev.target.id === 'apCpForm') { ev.preventDefault(); crearCupon(); } };
    v.onclick = function (ev) {
      var f = ev.target.closest('[data-filtro-regalo]');
      if (f) { est.filtro = f.dataset.filtroRegalo; recargarHistorial(false).catch(function (er) { u.contexto().toast((er && er.message) || 'No se pudo filtrar.', true); }); return; }
      u.acciones(ev, {
        recargar: function () { cargar(true); },
        'mas-miembros': function () { est.visibles += 25; pintarMiembros(); },
        'mas-regalos': function () { recargarHistorial(true).catch(function (er) { u.contexto().toast((er && er.message) || 'No se pudo cargar más.', true); }); },
        regalar: function (b) { regalar(b.dataset.uid, b); },
        'cupon-copiar': function (b) { copiarCupon(b.dataset.clave); },
        'cupon-quien': function (b) { quienCupon(b.dataset.clave); },
        'cupon-estado': function (b) { estadoCupon(b.dataset.clave, b.dataset.a); }
      });
    };
  }

  return {
    REGALO: REGALO, COSTO: COSTO, MAX_REGALO: MAX_REGALO, OPCIONES: OPCIONES, analizarCantidad: analizarCantidad, alcance: alcance, fraseAlcance: fraseAlcance, regaloCuerpoHTML: regaloCuerpoHTML, textoAceptar: textoAceptar, estadoRegalo: estadoRegalo, textoCreditos: textoCreditos, cifras: cifras, filtrarMiembros: filtrarMiembros, filaMiembro: filaMiembro, listaMiembrosHTML: listaMiembrosHTML, textoConfirmacion: textoConfirmacion,
    mensajeCupon: mensajeCupon, formularioCuponHTML: formularioCuponHTML, filaCuponHTML: filaCuponHTML, cuponesHTML: cuponesHTML, quienHTML: quienHTML, ESTADOS_CUPON: ESTADOS_CUPON,
    filaRegalo: filaRegalo, historialHTML: historialHTML, fraseGrafica: fraseGrafica, graficaHTML: graficaHTML, vistaHTML: vistaHTML, creditos: cargar, FILTROS: FILTROS
  };
});
