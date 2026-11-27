/* ============================================================ */
/* PANEL ADMIN · SOPORTE PRIVADO                                 */
/* Buzón 1-a-1 con cada miembro (endpoints /api/admin/soporte/*). */
/* Usa el mismo sistema de diseño del panel (.ap-card, .ap-btn,  */
/* .ap-badge, variables --c-*) para verse igual que el resto.    */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_ADMIN_SOPORTE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function fechaHora(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return '—';
    var fecha = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    var hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    return fecha + ' · ' + hora;
  }

  var API = { esc: esc, fechaHora: fechaHora };
  if (typeof document === 'undefined') return API;

  var $ = function (id) { return document.getElementById(id); };

  function inyectarEstilos() {
    if ($('spEstilos')) return;
    var s = document.createElement('style');
    s.id = 'spEstilos';
    s.textContent = '' +
      '.sp-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px;}' +
      '.sp-filtros{display:flex;gap:6px;}' +
      '.sp-lista{display:flex;flex-direction:column;}' +
      '.sp-fila{display:flex;gap:14px;align-items:center;padding:16px 20px;cursor:pointer;flex-wrap:wrap;}' +
      '.sp-fila:hover{background:var(--c-ghost-bg);}' +
      '.sp-fila+.sp-fila{border-top:1px solid var(--c-line-soft);}' +
      '.sp-fila__cuerpo{flex:1;min-width:200px;}' +
      '.sp-fila__nombre{font:700 .96rem/1.3 var(--zoo-font-display);color:var(--c-text);margin:0 0 3px;}' +
      '.sp-fila__meta{display:flex;flex-wrap:wrap;gap:6px 12px;color:var(--c-text-2);font-size:.84rem;}' +
      '.sp-lista-vacia{padding:28px 20px;text-align:center;color:var(--c-text-2);}' +
      '.sp-volver{display:inline-flex;align-items:center;gap:6px;margin-bottom:14px;}' +
      '.sp-hilo{display:flex;flex-direction:column;gap:10px;padding:20px;max-height:52vh;overflow-y:auto;}' +
      '.sp-msj{max-width:78%;padding:10px 14px;border-radius:14px;font-size:.92rem;line-height:1.45;white-space:pre-wrap;word-break:break-word;}' +
      '.sp-msj--miembro{align-self:flex-start;background:var(--c-ghost-bg);color:var(--c-text);border-bottom-left-radius:4px;}' +
      '.sp-msj--admin{align-self:flex-end;background:var(--c-info-bg);color:var(--c-info-ink);border-bottom-right-radius:4px;}' +
      '.sp-msj__meta{display:block;font-size:.75rem;opacity:.7;margin-top:4px;}' +
      '.sp-responder{display:flex;gap:10px;padding:16px 20px;border-top:1px solid var(--c-line-soft);align-items:flex-end;}' +
      '.sp-responder textarea{flex:1;min-height:44px;max-height:140px;resize:vertical;}';
    document.head.appendChild(s);
  }

  /* opciones: { contenedor, base, getToken():Promise<string>, toast(msg, esError), confirmar(msg):boolean } */
  function montar(o) {
    inyectarEstilos();
    var cont = o.contenedor;
    var filtro = 'todos'; // todos | abierto | cerrado
    var ticketAbierto = null; // { ticket, mensajes } cuando se ve el hilo de uno

    function api(ruta, op) {
      op = op || {};
      return Promise.resolve(o.getToken()).then(function (token) {
        var h = { Authorization: 'Bearer ' + token };
        if (op.body) h['Content-Type'] = 'application/json';
        return fetch(o.base + ruta, { method: op.method || 'GET', headers: h, body: op.body ? JSON.stringify(op.body) : undefined, cache: 'no-store' });
      }, function () { throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.'); }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!res.ok) throw new Error((data && data.error) || 'El servidor no pudo completar la acción (' + res.status + ').');
          return data;
        });
      }, function () { throw new Error('No hay conexión con el servidor.'); });
    }
    function aviso(msg, malo) { if (o.toast) o.toast(msg, !!malo); }
    function falla(e) { aviso(e && e.message ? e.message : 'Algo salió mal.', true); }

    function kpiHTML(icono, tono, valor, rotulo) {
      return '<div class="ap-kpi ap-tono-' + tono + '"><span class="ap-kpi__ico">' + (window.ZOO_ICONOS ? window.ZOO_ICONOS.svg(icono, { size: 20 }) : '') + '</span>' +
        '<div class="ap-kpi__txt"><p class="ap-kpi__rot">' + rotulo + '</p><p class="ap-kpi__val">' + valor + '</p></div></div>';
    }

    function filaHTML(t) {
      return '<div class="sp-fila" data-abrir="' + t.id + '">' +
        '<div class="sp-fila__cuerpo">' +
          '<p class="sp-fila__nombre">' + esc(t.nombre || 'Miembro') +
            (t.estado === 'cerrado' ? ' <span class="ap-badge">cerrado</span>' : ' <span class="ap-badge ap-tono-ok">en seguimiento</span>') +
            (t.ultimoAutor === 'miembro' ? ' <span class="ap-badge ap-tono-aviso">sin responder</span>' : '') + '</p>' +
          '<div class="sp-fila__meta"><span>' + esc(t.temaLabel) + '</span><span>' + esc(t.correo || '') + '</span><span>' + esc(fechaHora(t.actualizadoEn)) + '</span><span>' + t.mensajesCount + ' mensaje' + (t.mensajesCount === 1 ? '' : 's') + '</span></div>' +
        '</div></div>';
    }

    function mensajeHTML(m) {
      return '<div class="sp-msj sp-msj--' + m.autorTipo + '">' + esc(m.texto).replace(/\n/g, '<br>') +
        '<span class="sp-msj__meta">' + esc(m.autorNombre) + ' · ' + esc(fechaHora(m.creadoEn)) + '</span></div>';
    }

    function pintarLista(lista) {
      var abiertos = lista.filter(function (t) { return t.estado === 'abierto'; }).length;
      var sinResponder = lista.filter(function (t) { return t.estado === 'abierto' && t.ultimoAutor === 'miembro'; }).length;
      var visibles = filtro === 'todos' ? lista : lista.filter(function (t) { return t.estado === filtro; });
      cont.innerHTML =
        '<h1 class="ap-titulo">Soporte</h1><p class="ap-nota" style="margin:-8px 0 20px;">Mensajes privados de los miembros: membresía, cobros, acceso y cursos.</p>' +
        '<div class="ap-kpis">' +
          kpiHTML('message-circle', 'ok', abiertos, 'en seguimiento') +
          kpiHTML('circle-alert', 'aviso', sinResponder, 'sin responder') +
          kpiHTML('mail', 'info', lista.length, 'en total') +
        '</div>' +
        '<div class="sp-toolbar"><div class="sp-filtros">' +
          [['todos', 'Todos'], ['abierto', 'En seguimiento'], ['cerrado', 'Cerrados']].map(function (f) {
            return '<button type="button" class="ap-btn ap-btn--chico ' + (filtro === f[0] ? 'ap-btn--primario' : 'ap-btn--suave') + '" data-filtro="' + f[0] + '">' + f[1] + '</button>';
          }).join('') +
        '</div></div>' +
        '<div class="ap-fc-caja">' +
          (visibles.length === 0
            ? '<div class="sp-lista-vacia">No hay mensajes de soporte con ese filtro.</div>'
            : '<div class="sp-lista">' + visibles.map(filaHTML).join('') + '</div>') +
        '</div>';

      cont.querySelectorAll('[data-filtro]').forEach(function (b) { b.addEventListener('click', function () { filtro = b.dataset.filtro; pintarLista(lista); }); });
      cont.querySelectorAll('[data-abrir]').forEach(function (b) { b.addEventListener('click', function () { abrirTicket(b.dataset.abrir); }); });
    }

    function pintarDetalle() {
      var t = ticketAbierto.ticket;
      cont.innerHTML =
        '<button type="button" class="ap-btn ap-btn--chico ap-btn--suave sp-volver" id="spVolver">← Volver a la lista</button>' +
        '<div class="ap-fc-caja">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;padding:18px 20px 0;">' +
            '<div><p class="ap-titulo" style="font-size:1.15rem;margin:0;">' + esc(t.nombre || 'Miembro') + '</p>' +
              '<p class="ap-nota" style="margin:2px 0 0;">' + esc(t.correo || '') + ' · ' + esc(t.temaLabel) + '</p></div>' +
            '<div style="display:flex;gap:8px;">' +
              (t.estado === 'abierto'
                ? '<button class="ap-btn ap-btn--chico ap-btn--peligro-suave" id="spCerrar">Cerrar</button>'
                : '<button class="ap-btn ap-btn--chico ap-btn--suave" id="spReabrir">Reabrir</button>') +
            '</div>' +
          '</div>' +
          '<div class="sp-hilo" id="spHilo">' + ticketAbierto.mensajes.map(mensajeHTML).join('') + '</div>' +
          '<div class="sp-responder"><textarea id="spTexto" placeholder="Escribe tu respuesta…"></textarea>' +
            '<button class="ap-btn ap-btn--primario" id="spEnviar">Enviar</button></div>' +
        '</div>';
      var hilo = $('spHilo'); hilo.scrollTop = hilo.scrollHeight;
      $('spVolver').addEventListener('click', function () { ticketAbierto = null; cargar(); });
      var btnCerrar = $('spCerrar'); if (btnCerrar) btnCerrar.addEventListener('click', function () {
        if (o.confirmar && !o.confirmar('¿Cerrar este mensaje de soporte?')) return;
        api('/api/admin/soporte/tickets/' + encodeURIComponent(t.id) + '/cerrar', { method: 'POST', body: {} }).then(function () { aviso('Cerrado'); abrirTicket(t.id); }, falla);
      });
      var btnReabrir = $('spReabrir'); if (btnReabrir) btnReabrir.addEventListener('click', function () {
        api('/api/admin/soporte/tickets/' + encodeURIComponent(t.id) + '/reabrir', { method: 'POST', body: {} }).then(function () { aviso('Reabierto'); abrirTicket(t.id); }, falla);
      });
      $('spEnviar').addEventListener('click', function () {
        var texto = $('spTexto').value.trim();
        if (!texto) { aviso('Escribe un mensaje.', true); return; }
        var btn = $('spEnviar'); btn.disabled = true;
        api('/api/admin/soporte/tickets/' + encodeURIComponent(t.id) + '/mensajes', { method: 'POST', body: { texto: texto } })
          .then(function () { abrirTicket(t.id); }, function (e) { falla(e); btn.disabled = false; });
      });
    }

    function abrirTicket(id) {
      cont.innerHTML = '<h1 class="ap-titulo">Soporte</h1><p class="ap-nota">Cargando…</p>';
      api('/api/admin/soporte/tickets/' + encodeURIComponent(id)).then(function (r) {
        ticketAbierto = r; pintarDetalle();
      }, function (e) { falla(e); cargar(); });
    }

    function cargar() {
      return api('/api/admin/soporte/tickets').then(function (r) { pintarLista(r.tickets || []); }, function (e) {
        cont.innerHTML = '<h1 class="ap-titulo">Soporte</h1><div class="error-msg show">' + esc(e.message) + '</div>';
      });
    }

    return cargar();
  }

  API.montar = montar;
  return API;
});
