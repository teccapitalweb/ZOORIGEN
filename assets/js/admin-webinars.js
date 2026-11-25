/* ============================================================ */
/* PANEL ADMIN · CLASES EN VIVO (webinars)                       */
/* Todo pasa por el servidor (endpoints /api/admin/webinars...). */
/* El navegador NUNCA ve meetUrl ni bunnyVideoId salvo en el      */
/* propio formulario de edición (que el admin sí puede ver).     */
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

  var PASOS = {
    programada: 'Programada', 'grabacion-encontrada': 'Grabación encontrada', 'subiendo-bunny': 'Subiendo a Bunny…',
    'procesando-bunny': 'Procesando en Bunny…', lista: '✓ Grabación disponible', error: 'Error en la automatización'
  };

  var API = { esc: esc, fechaHora: fechaHora };
  if (typeof document === 'undefined') return API;

  var $ = function (id) { return document.getElementById(id); };

  /* opciones: { contenedor, base, getToken():Promise<string>, toast(msg, esError), confirmar(msg):boolean } */
  function montar(o) {
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

    function pintar(lista, legadoPendiente) {
      var proximas = lista.filter(function (s) { return new Date(s.inicioISO).getTime() >= Date.now(); }).length;
      var conGrabacion = lista.filter(function (s) { return s.tieneGrabacion; }).length;
      var visibles = filtrar(lista);
      cont.innerHTML =
        '<h1>Clases en vivo</h1><p class="sub">Programa las transmisiones en vivo que verán los miembros VIP.</p>' +
        '<div class="content-toolbar" style="flex-wrap:wrap;gap:10px;">' +
          '<button class="btn-add" id="wbNueva">+ Nueva clase en vivo</button>' +
          '<button class="btn-add" id="wbNuevaPrueba" style="background:#6b7280;">+ Agregar clase de prueba</button>' +
          (legadoPendiente > 0 ? '<button class="btn-cancel" id="wbProteger">Proteger enlaces de clases anteriores (' + legadoPendiente + ')</button>' : '') +
        '</div>' +
        '<div class="content-toolbar" style="gap:8px;">' +
          '<strong style="color:#fff;">' + proximas + ' próxima' + (proximas === 1 ? '' : 's') + ' · ' + lista.length + ' en total · ' + conGrabacion + ' con grabación</strong>' +
        '</div>' +
        '<div class="content-toolbar" style="gap:8px;">' +
          '<input id="wbBuscar" placeholder="Buscar por título o instructor…" value="' + esc(busqueda) + '" style="flex:1;min-width:200px;padding:8px 10px;border-radius:8px;">' +
          [['todos', 'Todos'], ['proximos', 'Próximos'], ['pasados', 'Pasados']].map(function (f) {
            return '<button type="button" class="btn-cancel" data-filtro="' + f[0] + '"' + (filtro === f[0] ? ' style="background:#2F7A4F;color:#fff;"' : '') + '>' + f[1] + '</button>';
          }).join('') +
        '</div>' +
        (visibles.length === 0 ? '<div class="no-data">No hay clases que mostrar con ese filtro.</div>' : visibles.map(filaHTML).join(''));

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
        api('/api/admin/webinars/' + encodeURIComponent(b.dataset.reintentar) + (b.dataset.prueba === '1' ? '?prueba=1' : '') + '/reintentar-grabacion', { method: 'POST', body: {} })
          .then(function () { cargar(); }, falla);
      }); });
      cont.querySelectorAll('[data-video-manual]').forEach(function (b) { b.addEventListener('click', function () { formVideoManual(b.dataset.videoManual, b.dataset.prueba === '1'); }); });
    }

    function filaHTML(s) {
      var es = s.esPrueba;
      return '<div class="admin-row" style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;margin-bottom:8px;flex-wrap:wrap;">' +
        '<div style="min-width:220px;">' +
          '<strong>' + esc(s.titulo) + '</strong>' + (es ? ' <span class="hint" style="color:#E8A317;">· clase de prueba</span>' : '') + '<br>' +
          '<span class="hint">' + esc(s.instructor) + ' · ' + esc(fechaHora(s.inicioISO)) + ' · ' + esc(s.duracionMin) + ' min</span><br>' +
          '<span class="hint">' + (PASOS[s.automatizacion] || s.automatizacion) + (s.tieneGrabacion ? ' ✅' : '') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<button class="btn-cancel" data-editar="' + s.id + '">Editar</button>' +
          (!s.tieneGrabacion ? '<button class="btn-cancel" data-reintentar="' + s.id + '" data-prueba="' + (es ? '1' : '0') + '">Buscar grabación</button>' : '') +
          (!s.tieneGrabacion ? '<button class="btn-cancel" data-video-manual="' + s.id + '" data-prueba="' + (es ? '1' : '0') + '">Fijar video a mano</button>' : '') +
          '<button class="btn-cancel" data-eliminar="' + s.id + '" data-prueba="' + (es ? '1' : '0') + '" style="color:#e05252;">Eliminar</button>' +
        '</div></div>';
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
