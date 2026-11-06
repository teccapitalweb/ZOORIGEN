/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · HISTORIAL DE MOVIMIENTOS             */
/* Qué administrador hizo QUÉ y CUÁNDO (bitácora de auditoría).   */
/* Va en Configuración. Datos: GET /api/admin/historial           */
/*   ?limite=10&cursor=…&administrador=correo&tipo=cursos         */
/* Se ven los 10 más recientes; «Ver más» trae 20 más con el       */
/* cursor del servidor (sin leer todo de golpe) y «Ver menos»      */
/* regresa a los primeros 10. Los constructores son puros y se     */
/* prueban en tests/admin-historial.test.js.                       */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'), require('./admin-iconos.js'));
  else root.ZOO_ADMIN_HISTORIAL = factory(root.ZOO_ADMIN_PANEL, root.ZOO_ICONOS);
})(typeof self !== 'undefined' ? self : this, function (P, I) {
  'use strict';

  var esc = P.esc;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };
  var INICIAL = 10;          // lo que se ve al abrir y al pulsar «Ver menos»
  var PASO = 20;             // lo que trae cada «Ver más»
  var MIN = 60000, HORA = 3600000;

  // Un ícono Lucide por categoría (el ícono acompaña al texto; nunca va solo)
  var ICONO_TIPO = { cursos: 'graduation-cap', miembros: 'users', creditos: 'gift', contenido: 'newspaper', configuracion: 'settings', moderacion: 'shield-check', pagos: 'credit-card' };

  /* «hace un momento» · «hace 12 min» · «hace 3 h» · «ayer» · «hace 5 días» · «hace 2 meses» */
  function hace(iso, ahora) {
    var t = Date.parse(iso);
    if (isNaN(t)) return '';
    var d = (ahora === undefined ? Date.now() : ahora) - t;
    if (d < 0) d = 0;
    if (d < MIN) return 'hace un momento';
    if (d < HORA) return 'hace ' + Math.floor(d / MIN) + ' min';
    if (d < 24 * HORA) return 'hace ' + Math.floor(d / HORA) + ' h';
    return P.relativo(iso, ahora);
  }

  function nombreDe(item) {
    var p = (item && item.por) || {};
    return p.nombre || String(p.correo || '').split('@')[0] || 'Administración';
  }

  /* Una fila: avatar del administrador, quién, la frase de lo que hizo, sobre quién o qué, el tipo, y cuándo (hora de México + «hace N») */
  function filaHTML(item, ahora) {
    var nombre = nombreDe(item);
    var frase = item.resumen || 'Hizo un cambio';
    var destino = item.destino && item.destino.nombre && frase.indexOf(item.destino.nombre) === -1 ? '<span class="ap-hm__destino">Sobre: ' + esc(item.destino.nombre) + '</span>' : '';
    var tipo = item.tipoTexto ? '<span class="ap-hm__tipo ap-hm__tipo--' + esc(item.tipo) + '">' + ico(ICONO_TIPO[item.tipo] || 'settings', { size: 14 }) + '<span>' + esc(item.tipoTexto) + '</span></span>' : '';
    return '<li class="ap-hm" data-hm-id="' + esc(item.id) + '">' +
      '<span class="ap-hm__av"><span class="ap-avatar ap-avatar--activo" aria-hidden="true">' + esc(P.iniciales(nombre)) + '</span></span>' +
      '<div class="ap-hm__txt"><p class="ap-hm__frase"><strong>' + esc(nombre) + '</strong> <span class="ap-hm__que">' + esc(frase) + '</span></p>' + destino +
      '<span class="ap-hm__correo ap-correo">' + esc((item.por && item.por.correo) || '') + '</span></div>' +
      '<div class="ap-hm__meta">' + tipo + '<time datetime="' + esc(item.en || '') + '"><strong>' + esc(P.fmtFechaHora(item.en)) + '</strong><span>' + esc(hace(item.en, ahora)) + '</span></time></div></li>';
  }

  function listaHTML(items, ahora) {
    return '<ul class="ap-hm-lista" aria-label="Movimientos de la administración, el más reciente primero">' + items.map(function (i) { return filaHTML(i, ahora); }).join('') + '</ul>';
  }

  function opciones(lista, actual, todos) {
    return '<option value=""' + (!actual ? ' selected' : '') + '>' + esc(todos) + '</option>' + lista.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === actual ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');
  }

  function filtrosHTML(est) {
    var admins = (est.administradores || []).map(function (a) { return [a.correo, a.nombre || a.correo]; });
    var tipos = (est.tipos || []).map(function (t) { return [t.id, t.texto]; });
    return '<div class="ap-hm-filtros">' +
      '<label class="ap-hm-filtro"><span>Administrador</span><select id="apHmAdmin" data-hm-filtro="administrador">' + opciones(admins, est.administrador, 'Todos los administradores') + '</select></label>' +
      '<label class="ap-hm-filtro"><span>Tipo</span><select id="apHmTipo" data-hm-filtro="tipo">' + opciones(tipos, est.tipo, 'Todos los tipos') + '</select></label></div>';
  }

  function pieHTML(est) {
    var n = est.items.length;
    var botones = '';
    if (est.siguiente) botones += '<button type="button" class="ap-btn ap-btn--suave ap-btn--chico" data-hm-accion="mas"' + (est.cargandoMas ? ' disabled' : '') + '>' + ico('plus', { size: 16 }) + '<span>' + (est.cargandoMas ? 'Cargando…' : 'Ver más') + '</span></button>';
    if (n > INICIAL) botones += '<button type="button" class="ap-btn ap-btn--suave ap-btn--chico" data-hm-accion="menos">' + ico('minus', { size: 16 }) + '<span>Ver menos</span></button>';
    return '<p class="ap-pie-tabla" role="status">' + (n === 1 ? 'Mostrando 1 movimiento' : 'Mostrando ' + P.fmtNum(n) + ' movimientos') + (est.siguiente ? '' : ' · es todo lo que hay') + '</p>' +
      (botones ? '<div class="ap-hm-mas">' + botones + '</div>' : '') +
      '<p class="ap-sb__ayuda ap-hm-nota">Las horas son de la Ciudad de México. Se guardan los últimos ' + esc(String(est.retencionMeses || 12)) + ' meses. El historial no guarda contraseñas, tarjetas, teléfonos ni mensajes.</p>';
  }

  function cuerpoHTML(est, ahora) {
    if (est.error) {
      return '<div class="ap-aviso ap-aviso--error" role="alert">' + ico('triangle-alert', { size: 20 }) + '<div><p><strong>No pudimos cargar el historial.</strong> ' + esc(est.error) + '</p>' +
        '<p><button type="button" class="ap-btn ap-btn--suave ap-btn--chico" data-hm-accion="reintentar">' + ico('refresh-cw', { size: 16 }) + '<span>Intentar de nuevo</span></button></p></div></div>';
    }
    if (est.cargando) {
      return '<div class="ap-esqueleto" role="status" aria-live="polite"><span class="sr-only">Cargando el historial</span><div class="ap-esqueleto__fila"></div><div class="ap-esqueleto__fila"></div><div class="ap-esqueleto__fila"></div></div>';
    }
    if (!est.items.length) {
      var filtrado = est.administrador || est.tipo;
      return '<div class="zs-vacio ap-vacio">' + ico(filtrado ? 'search-x' : 'history', { size: 28 }) + '<strong>' + (filtrado ? 'No hay movimientos con ese filtro' : 'Todavía no hay movimientos') + '</strong><span>' +
        (filtrado ? 'Prueba con otro administrador o tipo, o quita los filtros.' : 'Cuando alguien de la administración cree un curso, regale una membresía o cambie un ajuste, aparecerá aquí con su nombre y la hora.') + '</span></div>';
    }
    return listaHTML(est.items, ahora) + pieHTML(est);
  }

  /* La tarjeta completa (mismo estilo que las demás de Configuración) */
  function tarjetaHTML(est, ahora) {
    var e = est || { items: [] };
    return '<section class="ap-card ap-cfg ap-hm-card" id="apCfgMovimientos"><header class="ap-card__cab ap-cfg__cab"><div class="ap-cfg__tit"><h2>Historial de movimientos</h2>' +
      '<p>Qué administrador hizo qué y cuándo: cursos, membresías, créditos, ajustes y más. Lo más reciente primero.</p></div>' +
      '<div class="ap-cfg__acc"><button type="button" class="ap-btn ap-btn--suave ap-btn--chico" data-hm-accion="actualizar">' + ico('refresh-cw', { size: 16 }) + '<span>Actualizar</span></button></div></header>' +
      '<div class="ap-card__cuerpo"><div id="apHmFiltros">' + filtrosHTML(e) + '</div><div id="apHmCuerpo" aria-live="polite">' + cuerpoHTML(e, ahora) + '</div></div></section>';
  }

  /* ───────── Controlador: se monta sobre la tarjeta ya dibujada ───────── */
  function mensajeDe(e) {
    if (e && (e.status === 401 || e.status === 403)) return 'Tu cuenta no tiene permiso para ver el historial. Inicia sesión de nuevo con una cuenta de administración.';
    if (e && e.status === 0) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
    return (e && e.message) || 'Inténtalo de nuevo en un momento.';
  }

  function montar(tarjeta, api) {
    if (!tarjeta || !api) return null;
    var est = { items: [], siguiente: null, primeraSiguiente: null, administrador: '', tipo: '', administradores: [], tipos: [], retencionMeses: 12, cargando: true, cargandoMas: false, error: '' };
    var corrida = 0;

    function pintar(conFiltros) {
      var c = tarjeta.querySelector('#apHmCuerpo'); if (c) c.innerHTML = cuerpoHTML(est);
      if (conFiltros) { var f = tarjeta.querySelector('#apHmFiltros'); if (f) f.innerHTML = filtrosHTML(est); }
    }
    function ruta(limite, cursor) {
      return '/api/admin/historial?limite=' + limite + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '') +
        (est.administrador ? '&administrador=' + encodeURIComponent(est.administrador) : '') + (est.tipo ? '&tipo=' + encodeURIComponent(est.tipo) : '');
    }
    async function cargar() {
      var mi = ++corrida;
      est.cargando = true; est.error = ''; est.items = []; est.siguiente = null; pintar(false);
      try {
        var r = await api(ruta(INICIAL, null));
        if (mi !== corrida) return;
        est.items = r.items || []; est.siguiente = r.siguiente || null; est.primeraSiguiente = est.siguiente;
        est.administradores = r.administradores || est.administradores; est.tipos = r.tipos || est.tipos; est.retencionMeses = r.retencionMeses || 12;
      } catch (e) { if (mi !== corrida) return; est.error = mensajeDe(e); }
      est.cargando = false; pintar(true);
    }
    async function verMas() {
      if (!est.siguiente || est.cargandoMas) return;
      var mi = ++corrida;
      est.cargandoMas = true; pintar(false);
      try {
        var r = await api(ruta(PASO, est.siguiente));
        if (mi !== corrida) return;
        var vistos = {}; est.items.forEach(function (i) { vistos[i.id] = true; });
        est.items = est.items.concat((r.items || []).filter(function (i) { return !vistos[i.id]; }));
        est.siguiente = r.siguiente || null;
      } catch (e) { if (mi !== corrida) return; est.error = mensajeDe(e); }
      est.cargandoMas = false; pintar(false);
    }
    function verMenos() {
      est.items = est.items.slice(0, INICIAL);
      est.siguiente = est.items.length >= INICIAL ? est.primeraSiguiente : null;
      pintar(false);
      var c = tarjeta.querySelector('#apHmCuerpo'); if (c && c.scrollIntoView) { try { c.scrollIntoView({ block: 'nearest' }); } catch (e) { /* sin desplazamiento */ } }
    }

    tarjeta.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-hm-accion]') : null;
      if (!b || !tarjeta.contains(b)) return;
      var a = b.getAttribute('data-hm-accion');
      if (a === 'mas') verMas(); else if (a === 'menos') verMenos(); else if (a === 'actualizar' || a === 'reintentar') cargar();
    });
    tarjeta.addEventListener('change', function (ev) {
      var s = ev.target.closest ? ev.target.closest('[data-hm-filtro]') : null;
      if (!s) return;
      est[s.getAttribute('data-hm-filtro')] = s.value;
      cargar();
    });
    cargar();
    return { recargar: cargar, estado: function () { return est; } };
  }

  return { INICIAL: INICIAL, PASO: PASO, ICONO_TIPO: ICONO_TIPO, hace: hace, filaHTML: filaHTML, listaHTML: listaHTML, filtrosHTML: filtrosHTML, pieHTML: pieHTML, cuerpoHTML: cuerpoHTML, tarjetaHTML: tarjetaHTML, montar: montar };
});
