/* ============================================================ */
/* PANEL ADMIN · CLASES EN VIVO (webinars)                       */
/* Todo pasa por el servidor (endpoints /api/admin/webinars...). */
/* El navegador NUNCA ve meetUrl ni bunnyVideoId salvo en el      */
/* propio formulario de edición (que el admin sí puede ver).     */
/* Usa el mismo sistema de diseño del panel (.ap-card, .ap-btn,  */
/* .ap-badge, variables --c-*) para verse igual que el resto.    */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_ADMIN_WEBINARS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function fechaHora(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return '—';
    var fecha = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    var hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' });
    return fecha + ' · ' + hora + ' hrs (CDMX)';
  }

  // Valor para <input type="datetime-local"> a partir de un ISO (hora LOCAL del navegador de quien administra).
  function isoAInputLocal(iso) {
    var d = iso ? new Date(iso) : new Date(Date.now() + 3600000);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function inputLocalAIso(valor) {
    var d = new Date(valor);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Los mismos 5 pasos que guarda el servidor en webinarsAuto/{id}.paso (services/webinars.js),
  // en el orden en que de verdad ocurren.
  var PASOS_AUTO = [
    { clave: 'programada', titulo: 'Clase programada', texto: function (s) { return 'Para el ' + fechaHora(s.inicioISO) + '.'; } },
    { clave: 'grabacion-encontrada', titulo: 'Grabación encontrada', texto: function (s) { return s.automatizacionMensaje || 'Se encontró el archivo en Drive.'; } },
    { clave: 'subiendo-bunny', titulo: 'Pasando el video a Bunny', texto: function () { return 'A la colección «clases en vivo».'; } },
    { clave: 'procesando-bunny', titulo: 'Procesando en Bunny', texto: function () { return 'Bunny prepara el video para reproducirlo.'; } },
    { clave: 'lista', titulo: 'Lista', texto: function () { return 'Cuando Bunny termine, se enlaza sola con la clase.'; } }
  ];
  var ocultosAutomatizacion = Object.create(null); // "Quitar de la lista": solo visual, se reinicia al recargar la página.

  var API = { esc: esc, fechaHora: fechaHora };
  if (typeof document === 'undefined') return API;

  var $ = function (id) { return document.getElementById(id); };

  // Estilos propios del módulo (el "stepper" de 5 pasos no existe en el sistema del panel):
  // se inyectan una sola vez, con las mismas variables --c-* del tema para que combine en claro y oscuro.
  function inyectarEstilos() {
    if ($('wbEstilos')) return;
    var s = document.createElement('style');
    s.id = 'wbEstilos';
    s.textContent = '' +
      '.wb-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px;}' +
      '.wb-buscador{flex:1;min-width:220px;}' +
      '.wb-filtros{display:flex;gap:6px;}' +
      '.wb-lista{display:flex;flex-direction:column;gap:12px;}' +
      '.wb-clase{display:flex;gap:16px;padding:18px 20px;align-items:flex-start;flex-wrap:wrap;}' +
      '.wb-clase+.wb-clase{border-top:1px solid var(--c-line-soft);}' +
      '.wb-clase__cuerpo{flex:1;min-width:220px;}' +
      '.wb-clase__titulo{font:700 1rem/1.3 var(--zoo-font-display);color:var(--c-text);margin:0 0 4px;}' +
      '.wb-clase__meta{display:flex;flex-wrap:wrap;gap:6px 14px;color:var(--c-text-2);font-size:.86rem;margin-bottom:6px;}' +
      '.wb-clase__acciones{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}' +
      '.wb-seccion-titulo{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:28px 0 6px;}' +
      '.wb-seccion-titulo h2{margin:0;font:700 1.05rem/1.3 var(--zoo-font-display);color:var(--c-text);}' +
      '.wb-auto-tarjeta{display:flex;gap:18px;padding:20px;align-items:flex-start;flex-wrap:wrap;}' +
      '.wb-auto-thumb{flex:none;width:64px;height:64px;border-radius:14px;display:grid;place-items:center;background:var(--c-ghost-bg);color:var(--c-ghost-ink);border:1px solid var(--c-ghost-line);}' +
      '.wb-auto-thumb svg{width:28px;height:28px;}' +
      '.wb-auto-cuerpo{flex:1;min-width:240px;}' +
      '.wb-auto-cab{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px;}' +
      '.wb-auto-cab strong{font:700 1.05rem/1.3 var(--zoo-font-display);color:var(--c-text);}' +
      '.wb-pasos{list-style:none;margin:0 0 16px;padding:0;}' +
      '.wb-paso{position:relative;display:flex;gap:14px;padding-bottom:18px;}' +
      '.wb-paso:last-child{padding-bottom:0;}' +
      '.wb-paso::before{content:"";position:absolute;left:13px;top:28px;bottom:0;width:2px;background:var(--c-line);}' +
      '.wb-paso:last-child::before{display:none;}' +
      '.wb-paso__ico{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:.85rem;font-weight:700;z-index:1;background:var(--c-surface);}' +
      '.wb-paso__txt strong{display:block;font-size:.92rem;color:var(--c-text);margin-bottom:2px;}' +
      '.wb-paso__txt span{display:block;font-size:.82rem;color:var(--c-text-2);line-height:1.4;}' +
      '.wb-paso--hecho .wb-paso__ico{border:2px solid var(--c-ok-line);color:var(--c-ok-ink);background:var(--c-ok-bg);}' +
      '.wb-paso--curso .wb-paso__ico{border:2px solid var(--c-info-line);color:var(--c-info-ink);background:var(--c-info-bg);}' +
      '.wb-paso--error .wb-paso__ico{border:2px solid var(--c-bad-line);color:var(--c-bad-ink);background:var(--c-bad-bg);}' +
      '.wb-paso--pendiente .wb-paso__ico{border:2px solid var(--c-line-strong);color:var(--c-text-3);}' +
      '.wb-paso--pendiente .wb-paso__txt strong{color:var(--c-text-3);}' +
      '.wb-paso--error .wb-paso__txt span.wb-error{color:var(--c-bad-ink);font-weight:600;}' +
      '.wb-lista-vacia{padding:24px 20px;text-align:center;color:var(--c-text-2);}';
    document.head.appendChild(s);
  }

  /* opciones: { contenedor, base, getToken():Promise<string>, toast(msg, esError), confirmar(msg):boolean } */
  function montar(o) {
    inyectarEstilos();
    var cont = o.contenedor;
    var filtro = 'todos'; // todos | proximos | pasados
    var busqueda = '';

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

    function filtrar(lista) {
      var ahora = Date.now();
      return lista.filter(function (s) {
        if (busqueda && (s.titulo + ' ' + s.instructor).toLowerCase().indexOf(busqueda.toLowerCase()) === -1) return false;
        var t = new Date(s.inicioISO).getTime();
        if (filtro === 'proximos') return t >= ahora;
        if (filtro === 'pasados') return t < ahora;
        return true;
      });
    }

    function iconoVideo() {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1-4 0v-13a1 1 0 0 0-1-1h-10a1 1 0 0 0-1 1v12a3 3 0 0 0 3 3h11"/><path d="M8 8l4 0"/><path d="M8 12l4 0"/><path d="M8 16l4 0"/></svg>';
    }
    function iconoPlay() { return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'; }
    function iconoOk() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M5 12l5 5L20 7"/></svg>'; }
    function iconoAlerta() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>'; }

    function pintar(lista, legadoPendiente) {
      var proximas = lista.filter(function (s) { return new Date(s.inicioISO).getTime() >= Date.now(); }).length;
      var conGrabacion = lista.filter(function (s) { return s.tieneGrabacion; }).length;
      var visibles = filtrar(lista);
      cont.innerHTML =
        '<h1 class="ap-titulo">Clases en vivo</h1><p class="ap-nota" style="margin:-8px 0 20px;">Programa las transmisiones en vivo que verán los miembros VIP.</p>' +
        '<div class="ap-kpis">' +
          kpiHTML('radio', 'ok', proximas, 'próxima' + (proximas === 1 ? '' : 's')) +
          kpiHTML('calendar', 'info', lista.length, 'en total') +
          kpiHTML('video', 'neutro', conGrabacion, 'con grabación') +
        '</div>' +
        '<div class="wb-toolbar">' +
          '<button class="ap-btn ap-btn--primario" id="wbNueva">+ Nueva clase en vivo</button>' +
          '<button class="ap-btn ap-btn--suave" id="wbNuevaPrueba">+ Agregar clase de prueba</button>' +
          (legadoPendiente > 0 ? '<button class="ap-btn ap-btn--peligro-suave" id="wbProteger">Proteger enlaces de clases anteriores (' + legadoPendiente + ')</button>' : '') +
        '</div>' +
        '<div class="wb-toolbar">' +
          '<input class="wb-buscador" id="wbBuscar" placeholder="Buscar por título o instructor…" value="' + esc(busqueda) + '">' +
          '<div class="wb-filtros">' +
            [['todos', 'Todos'], ['proximos', 'Próximos'], ['pasados', 'Pasados']].map(function (f) {
              return '<button type="button" class="ap-btn ap-btn--chico ' + (filtro === f[0] ? 'ap-btn--primario' : 'ap-btn--suave') + '" data-filtro="' + f[0] + '">' + f[1] + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="ap-fc-caja">' +
          (visibles.length === 0
            ? '<div class="wb-lista-vacia">No hay clases que mostrar con ese filtro.</div>'
            : '<div class="wb-lista">' + visibles.map(filaHTML).join('') + '</div>') +
        '</div>' +
        seccionAutomatizacionHTML(lista);

      $('wbNueva').addEventListener('click', function () { formWebinar(); });
      $('wbNuevaPrueba').addEventListener('click', function () { formWebinar({ esPrueba: true }); });
      var btnProteger = $('wbProteger');
      if (btnProteger) btnProteger.addEventListener('click', function () {
        if (o.confirmar && !o.confirmar('¿Proteger los enlaces de las clases anteriores? Se moverán a una parte que solo lee el servidor.')) return;
        api('/api/admin/webinars/proteger-enlaces', { method: 'POST', body: {} }).then(function (r) { aviso('Protegidas ' + r.migradas + ' clase(s)'); cargar(); }, falla);
      });
      $('wbBuscar').addEventListener('input', function (e) { busqueda = e.target.value; pintar(lista, legadoPendiente); });
      cont.querySelectorAll('[data-filtro]').forEach(function (b) { b.addEventListener('click', function () { filtro = b.dataset.filtro; pintar(lista, legadoPendiente); }); });
      cont.querySelectorAll('[data-editar]').forEach(function (b) { b.addEventListener('click', function () { formWebinar(lista.find(function (s) { return s.id === b.dataset.editar; })); }); });
      cont.querySelectorAll('[data-eliminar]').forEach(function (b) { b.addEventListener('click', function () {
        if (o.confirmar && !o.confirmar('¿Eliminar esta clase? Si tenía Meet automático, también se borra de Calendar.')) return;
        api('/api/admin/webinars/' + encodeURIComponent(b.dataset.eliminar) + (b.dataset.prueba === '1' ? '?prueba=1' : ''), { method: 'DELETE' }).then(function () { aviso('Eliminada'); cargar(); }, falla);
      }); });
      cont.querySelectorAll('[data-reintentar]').forEach(function (b) { b.addEventListener('click', function () {
        b.disabled = true; b.textContent = 'Buscando…';
        api('/api/admin/webinars/' + encodeURIComponent(b.dataset.reintentar) + '/reintentar-grabacion' + (b.dataset.prueba === '1' ? '?prueba=1' : ''), { method: 'POST', body: {} })
          .then(function () { cargar(); }, falla);
      }); });
      cont.querySelectorAll('[data-video-manual]').forEach(function (b) { b.addEventListener('click', function () { formVideoManual(b.dataset.videoManual, b.dataset.prueba === '1'); }); });
      var btnActualizarAuto = $('wbActualizarAuto');
      if (btnActualizarAuto) btnActualizarAuto.addEventListener('click', function () { cargar(); });
      cont.querySelectorAll('[data-quitar]').forEach(function (b) { b.addEventListener('click', function () {
        ocultosAutomatizacion[b.dataset.quitar] = true;
        pintar(lista, legadoPendiente);
      }); });
    }

    function kpiHTML(icono, tono, valor, rotulo) {
      return '<div class="ap-kpi ap-tono-' + tono + '"><span class="ap-kpi__ico">' + (window.ZOO_ICONOS ? window.ZOO_ICONOS.svg(icono, { size: 20 }) : '') + '</span>' +
        '<div class="ap-kpi__txt"><p class="ap-kpi__rot">' + rotulo + '</p><p class="ap-kpi__val">' + valor + '</p></div></div>';
    }

    function filaHTML(s) {
      var es = s.esPrueba;
      return '<div class="wb-clase">' +
        '<div class="wb-clase__cuerpo">' +
          '<p class="wb-clase__titulo">' + esc(s.titulo) + (es ? ' <span class="ap-badge ap-tono-aviso">clase de prueba</span>' : '') +
            (s.tieneGrabacion ? ' <span class="ap-badge ap-tono-ok">grabación disponible</span>' : '') + '</p>' +
          '<div class="wb-clase__meta">' +
            '<span>' + esc(s.instructor) + '</span><span>' + esc(fechaHora(s.inicioISO)) + '</span><span>' + esc(s.duracionMin) + ' min</span>' +
          '</div>' +
        '</div>' +
        '<div class="wb-clase__acciones">' +
          '<button class="ap-btn ap-btn--chico ap-btn--suave" data-editar="' + s.id + '">Editar</button>' +
          (!s.tieneGrabacion ? '<button class="ap-btn ap-btn--chico ap-btn--suave" data-reintentar="' + s.id + '" data-prueba="' + (es ? '1' : '0') + '">Buscar grabación</button>' : '') +
          (!s.tieneGrabacion ? '<button class="ap-btn ap-btn--chico ap-btn--suave" data-video-manual="' + s.id + '" data-prueba="' + (es ? '1' : '0') + '">Fijar video a mano</button>' : '') +
          '<button class="ap-btn ap-btn--chico ap-btn--peligro-suave" data-eliminar="' + s.id + '" data-prueba="' + (es ? '1' : '0') + '">Eliminar</button>' +
        '</div></div>';
    }

    // «Grabaciones automáticas (Meet → Drive → Bunny)»: una tarjeta por clase SIN grabación todavía
    // (solo las que tienen Meet automático: una con enlace manual no tiene nada que rastrear en Drive),
    // y una tarjeta simplificada «YA DISPONIBLE» para las que ya terminaron.
    function seccionAutomatizacionHTML(lista) {
      var pendientes = lista.filter(function (s) { return s.meetAutomatico && !s.videoManual && !ocultosAutomatizacion[s.id]; });
      if (!pendientes.length) return '';
      return '' +
        '<div class="wb-seccion-titulo"><h2>Grabaciones automáticas (Meet → Drive → Bunny)</h2>' +
          '<button class="ap-btn ap-btn--chico ap-btn--suave" id="wbActualizarAuto">Actualizar</button>' +
        '</div>' +
        '<p class="ap-nota">Las clases creadas con «Crear la reunión de Google Meet automáticamente». Al terminar la clase, el servidor busca la grabación en el Drive de la cuenta conectada, la sube a la colección «clases en vivo» de Bunny y la enlaza con la clase. Puede tardar unos minutos. Un video que pongas a mano nunca se reemplaza.</p>' +
        pendientes.map(tarjetaAutomatizacionHTML).join('');
    }

    function tarjetaAutomatizacionHTML(s) {
      if (s.tieneGrabacion || s.automatizacion === 'lista') {
        return '<div class="ap-card"><div class="wb-auto-tarjeta">' +
          '<span class="wb-auto-thumb">' + iconoPlay() + '</span>' +
          '<div class="wb-auto-cuerpo">' +
            '<div class="wb-auto-cab"><span class="ap-badge ap-tono-ok">' + iconoOk() + ' CLASE YA DISPONIBLE</span></div>' +
            '<p class="wb-clase__titulo">' + esc(s.titulo) + (s.esPrueba ? ' <span class="ap-badge ap-tono-aviso">clase de prueba</span>' : '') + '</p>' +
            '<div class="wb-clase__meta"><span>Google Meet</span><span>' + esc(fechaHora(s.inicioISO)) + '</span><span>' + esc(s.instructor) + '</span></div>' +
            '<p class="ap-nota">Ya aparece en Grabaciones.' + (s.esPrueba ? ' Mírala en «Ver como usuario» (clase de prueba: solo la ve la cuenta de superadministración).' : '') + '</p>' +
            '<div class="wb-clase__acciones">' +
              '<button class="ap-btn ap-btn--chico ap-btn--suave" data-editar="' + s.id + '">Editar</button>' +
              '<button class="ap-btn ap-btn--chico ap-btn--peligro-suave" data-eliminar="' + s.id + '" data-prueba="' + (s.esPrueba ? '1' : '0') + '">Eliminar</button>' +
            '</div>' +
          '</div></div></div>';
      }
      var errorEnPaso = s.automatizacion === 'error';
      // El «paso» guardado es el que el servidor está haciendo ahora mismo (o acaba de empezar), no uno
      // ya terminado — salvo 'programada', que ya está completo en cuanto la clase existe.
      var indiceActual = PASOS_AUTO.findIndex(function (p) { return p.clave === (errorEnPaso ? 'programada' : s.automatizacion); });
      if (indiceActual < 0) indiceActual = 0;
      return '<div class="ap-card"><div class="wb-auto-tarjeta">' +
        '<span class="wb-auto-thumb">' + iconoVideo() + '</span>' +
        '<div class="wb-auto-cuerpo">' +
          '<div class="wb-auto-cab"><strong>' + esc(s.titulo) + '</strong><span class="ap-badge ap-tono-info">Google Meet</span>' + (s.esPrueba ? '<span class="ap-badge ap-tono-aviso">clase de prueba</span>' : '') + '</div>' +
          '<ul class="wb-pasos">' +
            PASOS_AUTO.map(function (p, i) {
              var estado = i < indiceActual ? 'hecho' : (i === indiceActual ? (errorEnPaso ? 'error' : 'curso') : 'pendiente');
              if (p.clave === 'programada') estado = 'hecho'; // completo en cuanto la clase existe, nunca "en curso"
              var ico = estado === 'hecho' ? iconoOk() : estado === 'error' ? iconoAlerta() : estado === 'curso' ? '…' : '';
              return '<li class="wb-paso wb-paso--' + estado + '"><span class="wb-paso__ico">' + ico + '</span>' +
                '<span class="wb-paso__txt"><strong>' + p.titulo + '</strong><span>' + esc(p.texto(s)) + '</span>' +
                (estado === 'error' ? '<span class="wb-error">' + esc(s.automatizacionMensaje || 'Error desconocido') + '</span>' : '') +
                '</span></li>';
            }).join('') +
          '</ul>' +
          '<div class="wb-clase__acciones">' +
            '<button class="ap-btn ap-btn--chico ap-btn--primario" data-reintentar="' + s.id + '" data-prueba="' + (s.esPrueba ? '1' : '0') + '">Buscar ahora</button>' +
            '<button class="ap-btn ap-btn--chico ap-btn--suave" data-quitar="' + s.id + '">Quitar de la lista</button>' +
          '</div>' +
        '</div></div></div>';
    }

    function formWebinar(data) {
      data = data || {};
      var tituloModal = data.id ? 'Editar clase' : (data.esPrueba ? 'Nueva clase de prueba' : 'Nueva clase en vivo');
      o.openModal('\
        <h3>' + tituloModal + '</h3>' + (data.esPrueba && !data.id ? '<p class="hint">Solo la ves tú. No se publica ni avisa a los miembros.</p>' : '') + '\
        <div class="field"><label>Título de la clase *</label><input type="text" id="wf_titulo" value="' + esc(data.titulo || '') + '" placeholder="Ej. Interpretación de bioquímica hemática"></div>\
        <div class="field"><label>Descripción</label><textarea id="wf_descripcion" rows="3">' + esc(data.descripcion || '') + '</textarea></div>\
        <div class="field"><label>Instructor *</label><input type="text" id="wf_instructor" value="' + esc(data.instructor || '') + '" placeholder="Ej. Dra. María López"></div>\
        <div class="field"><label>Duración (minutos)</label><input type="number" id="wf_duracion" min="15" max="240" value="' + (data.duracionMin || 60) + '"></div>\
        <div class="field"><label>Fecha y hora de la clase * <small>(tu hora local)</small></label><input type="datetime-local" id="wf_inicio" value="' + isoAInputLocal(data.inicioISO) + '"></div>\
        <label class="an-check"><input type="checkbox" id="wf_meet"' + (data.meetUrl ? '' : ' checked') + (data.id && data.meetUrl ? ' disabled' : '') + '> Crear la reunión de Google Meet automáticamente</label>\
        <div class="field" id="wf_wrap_manual" style="display:' + (data.meetUrl && !data.id ? 'block' : (data.id ? 'block' : 'none')) + ';"><label>Enlace de la reunión <small>(si no marcas la casilla de arriba)</small></label><input type="text" id="wf_manual" value="' + esc(data.meetUrl || '') + '" placeholder="https://meet.google.com/xxx-xxxx-xxx"></div>\
        <div class="modal-actions">\
          <button class="btn-cancel" onclick="ZOO_ADMIN_WEBINARS._cerrar()">Cancelar</button>\
          <button class="btn-save" id="wf_guardar">' + (data.id ? 'Guardar' : 'Crear') + '</button>\
        </div>');
      var meetChk = $('wf_meet'), wrapManual = $('wf_wrap_manual');
      meetChk.addEventListener('change', function () { wrapManual.style.display = meetChk.checked ? 'none' : 'block'; });
      $('wf_guardar').addEventListener('click', function () {
        var cuerpo = {
          titulo: $('wf_titulo').value.trim(), descripcion: $('wf_descripcion').value.trim(), instructor: $('wf_instructor').value.trim(),
          duracionMin: Number($('wf_duracion').value), inicioISO: inputLocalAIso($('wf_inicio').value),
          crearMeet: meetChk.checked, meetManual: $('wf_manual').value.trim(), esPrueba: data.esPrueba === true
        };
        if (!cuerpo.titulo || !cuerpo.instructor || !cuerpo.inicioISO) { aviso('Falta el título, el instructor o la fecha.', true); return; }
        $('wf_guardar').disabled = true;
        var ruta = data.id ? '/api/admin/webinars/' + encodeURIComponent(data.id) : '/api/admin/webinars';
        api(ruta, { method: data.id ? 'PUT' : 'POST', body: cuerpo }).then(function () {
          aviso(data.id ? 'Clase actualizada' : 'Clase creada'); o.closeModal(); cargar();
        }, function (e) { falla(e); var b = $('wf_guardar'); if (b) b.disabled = false; });
      });
    }

    function formVideoManual(id, esPrueba) {
      o.openModal('\
        <h3>Fijar video de Bunny a mano</h3>\
        <p class="hint">Úsalo si ya subiste la grabación tú mismo a Bunny Stream. La automatización nunca la va a pisar.</p>\
        <div class="field"><label>Id del video en Bunny (GUID) *</label><input type="text" id="wf_video_id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></div>\
        <div class="modal-actions"><button class="btn-cancel" onclick="ZOO_ADMIN_WEBINARS._cerrar()">Cancelar</button><button class="btn-save" id="wf_guardar_video">Fijar</button></div>');
      $('wf_guardar_video').addEventListener('click', function () {
        var bunnyVideoId = $('wf_video_id').value.trim();
        if (!bunnyVideoId) { aviso('Escribe el id del video.', true); return; }
        api('/api/admin/webinars/' + encodeURIComponent(id) + '/video-manual', { method: 'POST', body: { bunnyVideoId: bunnyVideoId, esPrueba: !!esPrueba } })
          .then(function () { aviso('Video fijado'); o.closeModal(); cargar(); }, falla);
      });
    }

    function cargar() {
      return Promise.all([api('/api/admin/webinars'), api('/api/admin/webinars/legado-pendiente').catch(function () { return { total: 0 }; })])
        .then(function (r) { pintar(r[0].sesiones || [], r[1].total || 0); }, function (e) {
          cont.innerHTML = '<h1>Clases en vivo</h1><div class="error-msg show">' + esc(e.message) + '</div>';
        });
    }

    API._cerrar = o.closeModal;
    return cargar();
  }

  API.montar = montar;
  return API;
});
