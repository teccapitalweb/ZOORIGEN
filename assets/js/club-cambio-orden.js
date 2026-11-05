/* ============================================================ */
/* CAMBIA EL ORDEN DE TU CALENDARIO · Cursos · Club VIP Zoorigen  */
/*                                                                */
/* Pinta el bloque "Cambia el orden de tu calendario" (avance de  */
/* retos nuevos, 2 cambios en total), abre la ventana para elegir */
/* un curso cerrado y manda la confirmación al servidor:          */
/*   GET  /api/calendario/cambio-orden                            */
/*   POST /api/calendario/cambiar-orden { cursoId, confirmar }    */
/* Todo lo decide el servidor (retos nuevos, variedad por tipo,   */
/* solo 2 cambios, solo cursos cerrados). Aquí no se calcula nada */
/* que no se pueda comprobar allá. Los constructores de HTML      */
/* viven en club-calendario.js (se prueban en Node).              */
/* ============================================================ */
(function (root) {
  'use strict';

  var CAL = root.ZOO_CALENDARIO;
  var doc = root.document;

  // opciones: { contenedor: elemento, apiFetch: fn(ruta, op), alCambiar: fn(respuesta), hrefRetos: 'club-retos.html', toast: fn(texto, esError),
  //             modo: 'linea' (Cursos: una línea corta con el botón Cambiar) | 'completo' (Logros: el bloque entero) | 'nada' (solo carga y ofrece la ventana),
  //             alVer: fn(cursoId) (el botón Cambiar de la línea: abre la página de ese curso) }
  function iniciar(opciones) {
    var o = opciones || {};
    var cont = o.contenedor;
    if (!CAL || !cont || typeof o.apiFetch !== 'function') return null;
    var estado = { co: null, ocupado: false, modal: null, retorno: null };

    function pintar() {
      var modo = o.modo || 'completo';
      if (modo === 'nada') return;
      cont.innerHTML = !estado.co ? '' : (modo === 'linea' ? CAL.cambioOrdenLineaHTML(estado.co) : CAL.cambioOrdenHTML(estado.co, { modo: 'cursos', hrefRetos: o.hrefRetos || 'club-retos.html' }));
    }

    function cargar() {
      return Promise.resolve().then(function () { return o.apiFetch('/api/calendario/cambio-orden'); }).then(function (resp) {
        estado.co = CAL.cambioOrden(resp);
        pintar();
        return estado.co;
      }).catch(function () { estado.co = null; pintar(); return null; });
    }

    function cerrar() {
      if (!estado.modal) return;
      estado.modal.remove();
      estado.modal = null;
      doc.removeEventListener('keydown', alTeclear, true);
      if (estado.retorno && typeof estado.retorno.focus === 'function') estado.retorno.focus();
      estado.retorno = null;
    }

    function alTeclear(ev) {
      if (!estado.modal) return;
      if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); return; }
      if (ev.key !== 'Tab') return;
      // El foco se queda dentro de la ventana
      var f = estado.modal.querySelectorAll('button:not([disabled]), input');
      if (!f.length) return;
      var primero = f[0], ultimo = f[f.length - 1];
      if (ev.shiftKey && doc.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && doc.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
    }

    function abrir(disparador) {
      if (!estado.co || !estado.co.disponible || estado.modal) return;
      var envoltura = doc.createElement('div');
      envoltura.className = 'zco-envoltura';
      envoltura.innerHTML = CAL.cambioOrdenModalHTML(estado.co);
      doc.body.appendChild(envoltura);
      estado.modal = envoltura;
      estado.retorno = disparador || null;
      doc.addEventListener('keydown', alTeclear, true);
      envoltura.addEventListener('change', function (ev) {
        if (ev.target && ev.target.name === 'zcoCurso') envoltura.querySelector('[data-zco="confirmar"]').disabled = false;
      });
      envoltura.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-zco]');
        if (!b) return;
        if (b.dataset.zco === 'cerrar') cerrar();
        else if (b.dataset.zco === 'confirmar') confirmar();
      });
      var dialogo = envoltura.querySelector('.zco-modal');
      if (dialogo) dialogo.focus();
    }

    function mostrarError(texto) {
      var e = estado.modal && estado.modal.querySelector('.zco-modal__err');
      if (!e) return;
      e.textContent = texto;
      e.hidden = !texto;
    }

    function confirmar() {
      if (estado.ocupado || !estado.modal) return;
      var marcado = estado.modal.querySelector('input[name="zcoCurso"]:checked');
      if (!marcado) { mostrarError('Elige un curso para continuar.'); return; }
      var boton = estado.modal.querySelector('[data-zco="confirmar"]');
      estado.ocupado = true;
      boton.disabled = true; boton.textContent = 'Guardando…';
      mostrarError('');
      Promise.resolve().then(function () {
        return o.apiFetch('/api/calendario/cambiar-orden', { method: 'POST', body: { cursoId: marcado.value, confirmar: true } });
      }).then(function (r) {
        estado.ocupado = false;
        estado.co = CAL.cambioOrden(r && r.cambioOrden) || estado.co;
        cerrar();
        pintar();
        var insignias = r && Array.isArray(r.insigniasNuevas) ? r.insigniasNuevas : [];
        var titulo = r && r.cambio && r.cambio.titulo ? '«' + r.cambio.titulo + '»' : 'Tu curso';
        if (typeof o.toast === 'function') o.toast(titulo + ' ahora es el siguiente en abrirse.' + (insignias.length ? ' Ganaste la insignia «' + insignias[0].nombre + '».' : ''), false);
        if (typeof o.alCambiar === 'function') o.alCambiar(r);
      }).catch(function (e) {
        estado.ocupado = false;
        boton.disabled = false; boton.textContent = 'Confirmar el cambio';
        mostrarError((e && e.message) || 'No se pudo hacer el cambio. Inténtalo de nuevo.');
        // Si el servidor cambió de opinión (otro cambio hecho, retos que ya no alcanzan), se refresca el bloque de atrás
        if (e && (e.status === 403 || e.status === 409)) cargar();
      });
    }

    cont.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-zco="elegir"]');
      if (b) { abrir(b); return; }
      var v = ev.target.closest('[data-zco="ver"]');
      if (v && typeof o.alVer === 'function') o.alVer(v.getAttribute('data-curso'), v);
    });

    // Si la página llegó con #cambiar-orden, el bloque se muestra una vez que carga
    function irAlBloque() {
      try { if (root.location.hash === '#cambiar-orden') { var t = cont.querySelector('#cambiar-orden'); if (t && t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } } catch (e) { /* sin hash */ }
    }

    return { cargar: cargar, pintar: pintar, abrir: abrir, cerrar: cerrar, irAlBloque: irAlBloque, estado: function () { return estado.co; } };
  }

  root.ZOO_CAMBIO_ORDEN = { iniciar: iniciar };
})(typeof self !== 'undefined' ? self : this);
