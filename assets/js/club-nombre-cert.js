/* ============================================================ */
/* NOMBRE EN EL CERTIFICADO · Club VIP Zoorigen                   */
/*                                                                */
/* Al emitirse el PRIMER certificado de una cuenta, el servidor   */
/* responde confirmarNombre: true. Aquí se le pregunta a la       */
/* persona "¿Este es el nombre que quieres en tu certificado?":   */
/*   - Sí, es correcto -> POST /api/certificados/nombre           */
/*   - No, corregirlo  -> escribe su nombre completo y se guarda  */
/* El servidor deja el nombre en el certificado y en el perfil.   */
/* Se pregunta una sola vez por cuenta; el nombre no entra en la  */
/* firma, así que el certificado y su verificación siguen igual.  */
/*                                                                */
/* Quien ya tiene certificados anteriores (los que escribía el    */
/* navegador) NO es obligado: pendiente() solo propone los        */
/* certificados nuevos del servidor (origen "backend").           */
/*                                                                */
/* Las reglas (validarNombre, pendiente) no tocan la pantalla y   */
/* se prueban en Node: tests/club-nombre-cert.test.js             */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_NOMBRE_CERT = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RUTA = '/api/certificados/nombre';
  var NOMBRE_MIN = 3;
  var NOMBRE_MAX = 38;
  var PARTICULAS = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'van', 'von', 'da', 'di', 'le', 'du', 'dos', 'das'];

  var TEXTOS = {
    titulo: '¿Este es el nombre que quieres en tu certificado?',
    descripcion: 'Revisa que esté completo y bien escrito. Es el nombre que se imprime en tu certificado y que aparece cuando alguien lo verifica con su folio.',
    pie: 'Una vez confirmado, el nombre de tu certificado ya no se puede cambiar. Tus certificados siguientes usarán el nombre de tu perfil de ese momento. Si más adelante necesitas un cambio, escríbenos desde el botón de ayuda.',
    si: 'Sí, es correcto',
    no: 'No, corregirlo',
    despues: 'Decidir más tarde',
    tituloEscribir: 'Escribe tu nombre completo',
    descripcionEscribir: 'Con nombre y apellidos, como quieres que aparezca en tu certificado.',
    descripcionObligado: 'Necesitamos tu nombre completo, con nombre y apellidos, para tu certificado.',
    placeholder: 'Nombre y apellidos',
    guardar: 'Guardar y continuar',
    volver: 'Volver',
    guardando: 'Guardando...',
    errorRed: 'No pudimos guardar tu nombre. Revisa tu conexión e inténtalo de nuevo.',
    avisoLargo: 'Procura que no sea más largo para que luzca bien en el certificado.'
  };

  /* ───────────────────────── Reglas del nombre (iguales a las del servidor) ───────────────────────── */

  function limpiar(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); }
  function letras(t) { return String(t).replace(/[^\p{L}]/gu, ''); }

  // Todo en minúsculas o todo en MAYÚSCULAS queda con mayúscula inicial en cada palabra (partículas en minúscula).
  function capitalizar(t) {
    var v = limpiar(t);
    if (!v || (v !== v.toLowerCase() && v !== v.toUpperCase())) return v;
    return v.toLocaleLowerCase('es-MX').split(' ').map(function (palabra, i) {
      if (i > 0 && PARTICULAS.indexOf(palabra) !== -1) return palabra;
      return palabra.replace(/(^|[-'’.])(\p{L})/gu, function (m, pre, l) { return pre + l.toLocaleUpperCase('es-MX'); });
    }).join(' ');
  }

  // -> { ok, valor, error }
  function validarNombre(texto) {
    var v = limpiar(texto);
    if (v.length < NOMBRE_MIN) return { ok: false, valor: v, error: 'Escribe tu nombre y al menos un apellido.' };
    if (v.length > NOMBRE_MAX) return { ok: false, valor: v, error: 'Usa máximo ' + NOMBRE_MAX + ' caracteres. Con nombre y uno o dos apellidos basta.' };
    if (!/^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u.test(v)) return { ok: false, valor: v, error: 'Usa solo letras, sin números ni símbolos.' };
    var partes = v.split(' ');
    var apellidos = partes.slice(1).filter(function (p) { return PARTICULAS.indexOf(p.toLowerCase()) === -1 && letras(p).length >= 2; });
    if (letras(partes[0]).length < 2 || !apellidos.length) return { ok: false, valor: v, error: 'Escribe tu nombre y al menos un apellido.' };
    return { ok: true, valor: capitalizar(v), error: '' };
  }

  // ¿El nombre que ya tiene el perfil sirve para ofrecerlo tal cual? (no es un correo, no es una sola palabra, no trae números)
  function nombreOfrecible(nombre, correo) {
    var v = limpiar(nombre);
    if (!v) return false;
    var local = String(correo || '').split('@')[0].toLowerCase();
    if (local && v.toLowerCase() === local) return false;
    return validarNombre(v).ok;
  }

  /* ───────────────────────── ¿Qué certificado hay que confirmar? ───────────────────────── */

  // docs: certificados de la persona tal como están en Firestore (certificados donde memberUid == uid).
  // Devuelve el certificado nuevo sin confirmar, o null. No pregunta si:
  //  - hay certificados anteriores (sin origen "backend" ni "admin"): son los que escribía el navegador, no se tocan;
  //  - todos los nuevos ya están confirmados.
  function pendiente(docs) {
    var lista = (Array.isArray(docs) ? docs : []).filter(function (d) { return d && typeof d === 'object'; });
    var anteriores = lista.some(function (d) { return d.origen !== 'backend' && d.origen !== 'admin'; });
    if (anteriores) return null;
    var nuevos = lista.filter(function (d) { return d.origen === 'backend' && d.verificado === true && d.nombreConfirmado !== true; });
    if (!nuevos.length) return null;
    nuevos.sort(function (a, b) { return String(a.issuedAt || a.emitido || '') < String(b.issuedAt || b.emitido || '') ? -1 : 1; });
    return nuevos[0];
  }

  /* ───────────────────────── Envío al servidor ───────────────────────── */

  // deps.apiFetch(ruta, { method, body }) -> Promise<json>; lanza Error con .status. Nunca rechaza:
  //   { ok:true, nombre, corregido }  |  { ok:false, yaConfirmado:true }  |  { ok:false, error }
  function enviar(deps, folio, nombre) {
    return Promise.resolve().then(function () {
      return deps.apiFetch(RUTA, { method: 'POST', body: { folio: String(folio || ''), nombre: String(nombre || '') } });
    }).then(function (r) {
      if (!r || r.ok !== true) return { ok: false, error: TEXTOS.errorRed };
      return { ok: true, nombre: String(r.nombre || nombre), corregido: r.corregido === true };
    }, function (e) {
      var st = e && e.status;
      if (st === 409) return { ok: false, yaConfirmado: true };
      if (st === 400 && e.message) return { ok: false, error: e.message };
      return { ok: false, error: st === 0 || !st ? TEXTOS.errorRed : (e.message || TEXTOS.errorRed) };
    });
  }

  /* ───────────────────────── Pantalla (solo navegador) ───────────────────────── */

  var CSS = '' +
    '.znc{position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,10,8,.78)}' +
    '.znc__caja{position:relative;width:100%;max-width:440px;max-height:92vh;overflow-y:auto;padding:26px 22px 20px;text-align:center;' +
      'color:var(--zoo-text,#fff);background:var(--zoo-bg-card,#14301f);border:1px solid var(--zoo-border-strong,rgba(255,255,255,.18));border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.45)}' +
    '.znc__ico{display:inline-grid;place-items:center;width:52px;height:52px;margin:0 0 12px;border-radius:50%;color:#1f1d17;background:var(--zoo-amber,#E8A317)}' +
    '.znc__ico svg{width:26px;height:26px}' +
    '.znc__titulo{margin:0 0 8px;font:800 1.2rem/1.3 var(--zoo-font-display,inherit);color:var(--zoo-text,#fff)}' +
    '.znc__desc{margin:0 0 14px;font-size:.9rem;line-height:1.55;color:var(--zoo-text-muted,rgba(255,255,255,.78))}' +
    '.znc__curso{margin:-6px 0 12px;font:700 .78rem var(--zoo-font-body,inherit);letter-spacing:.06em;text-transform:uppercase;color:var(--zoo-amber,#E8A317)}' +
    '.znc__nombre{margin:2px 0 16px;padding:12px 14px;font:800 1.35rem/1.25 var(--zoo-font-display,inherit);overflow-wrap:anywhere;' +
      'color:var(--zoo-text,#fff);background:var(--zoo-bg-card-2,rgba(255,255,255,.07));border:1px solid var(--zoo-border,rgba(255,255,255,.14));border-radius:14px}' +
    '.znc__campo{width:100%;box-sizing:border-box;padding:13px 14px;font:600 1rem var(--zoo-font-body,inherit);text-align:center;outline:none;' +
      'color:var(--zoo-text,#fff);background:var(--zoo-bg-card-2,rgba(255,255,255,.07));border:1.5px solid var(--zoo-border-strong,rgba(255,255,255,.25));border-radius:12px}' +
    '.znc__campo:focus{border-color:var(--zoo-amber,#E8A317)}' +
    '.znc__aviso{min-height:0;margin:6px 0 2px;font-size:.84rem;line-height:1.4;color:var(--zoo-orange,#D55A28)}' +
    '.znc__aviso--suave{color:var(--zoo-text-muted,rgba(255,255,255,.7))}' +
    '.znc__btn{display:block;width:100%;margin:10px 0 0;padding:13px 16px;font:700 .95rem var(--zoo-font-body,inherit);cursor:pointer;border-radius:999px;' +
      'color:var(--zoo-text,#fff);background:transparent;border:1px solid var(--zoo-border-strong,rgba(255,255,255,.3))}' +
    '.znc__btn:hover{background:rgba(127,127,127,.14)}' +
    '.znc__btn--main{color:#1f1d17;background:var(--zoo-amber,#E8A317);border-color:var(--zoo-amber,#E8A317)}' +
    '.znc__btn--main:hover{background:var(--zoo-amber,#E8A317);filter:brightness(1.06)}' +
    '.znc__btn--texto{padding:8px;font-size:.84rem;font-weight:600;border:0;color:var(--zoo-text-muted,rgba(255,255,255,.7));text-decoration:underline}' +
    '.znc__btn:disabled{opacity:.6;cursor:wait}' +
    '.znc__pie{margin:14px 0 0;font-size:.76rem;line-height:1.5;color:var(--zoo-text-dim,rgba(255,255,255,.55))}';

  var ICONO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // opc: { folio, nombre, curso, correo, apiFetch?, alConfirmar?(nombre) }
  // -> Promise<{ confirmado: boolean, nombre?: string, motivo?: 'despues'|'ya-confirmado' }>. Nunca rechaza.
  function preguntar(opc) {
    var o = opc || {};
    return new Promise(function (resolver) {
      try {
        if (typeof document === 'undefined' || !o.folio) { resolver({ confirmado: false, motivo: 'despues' }); return; }
        if (document.getElementById('zncModal')) { resolver({ confirmado: false, motivo: 'despues' }); return; }
        var api = o.apiFetch || (typeof ZOORIGEN_CLUB !== 'undefined' && ZOORIGEN_CLUB.apiFetch ? function (r, p) { return ZOORIGEN_CLUB.apiFetch(r, p); } : null);
        if (!api) { resolver({ confirmado: false, motivo: 'despues' }); return; }
        var deps = { apiFetch: api };

        if (!document.getElementById('zncCss')) {
          var st = document.createElement('style'); st.id = 'zncCss'; st.textContent = CSS; document.head.appendChild(st);
        }
        var actual = limpiar(o.nombre);
        var ofrecible = nombreOfrecible(actual, o.correo);
        if (ofrecible) actual = validarNombre(actual).valor;   // lo que se ve es lo que se guarda
        var previo = document.activeElement;
        var ov = document.createElement('div');
        ov.id = 'zncModal'; ov.className = 'znc';
        ov.innerHTML = '<div class="znc__caja" role="dialog" aria-modal="true" aria-labelledby="zncTitulo" aria-describedby="zncDesc">' +
          '<span class="znc__ico">' + ICONO + '</span>' +
          '<h2 class="znc__titulo" id="zncTitulo"></h2>' +
          (o.curso ? '<p class="znc__curso">' + esc(o.curso) + '</p>' : '') +
          '<p class="znc__desc" id="zncDesc"></p>' +
          '<div id="zncCuerpo"></div>' +
          '<p class="znc__pie">' + esc(TEXTOS.pie) + '</p></div>';
        document.body.appendChild(ov);
        var $ = function (id) { return ov.querySelector('#' + id); };
        var cuerpo = $('zncCuerpo');
        var enviando = false;
        var terminado = false;

        function cerrar(resultado) {
          if (terminado) return;
          terminado = true;
          document.removeEventListener('keydown', tecla, true);
          try { ov.remove(); } catch (e) { /* ya no está */ }
          if (previo && previo.isConnected && typeof previo.focus === 'function') { try { previo.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
          resolver(resultado);
        }
        function tecla(ev) {
          if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); if (!enviando) cerrar({ confirmado: false, motivo: 'despues' }); }
        }
        document.addEventListener('keydown', tecla, true);

        function bloquear(si) { cuerpo.querySelectorAll('button,input').forEach(function (n) { n.disabled = si; }); }

        function guardar(nombre, aviso) {
          if (enviando) return;
          enviando = true; bloquear(true);
          aviso.textContent = TEXTOS.guardando; aviso.className = 'znc__aviso znc__aviso--suave';
          enviar(deps, o.folio, nombre).then(function (r) {
            enviando = false;
            if (r.ok) {
              try { if (typeof o.alConfirmar === 'function') o.alConfirmar(r.nombre); } catch (e) { /* el certificado no depende de esto */ }
              cerrar({ confirmado: true, nombre: r.nombre, corregido: r.corregido });
              return;
            }
            if (r.yaConfirmado) { cerrar({ confirmado: false, motivo: 'ya-confirmado' }); return; }
            bloquear(false);
            aviso.textContent = r.error || TEXTOS.errorRed; aviso.className = 'znc__aviso';
          });
        }

        function pasoPreguntar() {
          $('zncTitulo').textContent = TEXTOS.titulo;
          $('zncDesc').textContent = TEXTOS.descripcion;
          cuerpo.innerHTML = '<div class="znc__nombre" id="zncNombre"></div><div class="znc__aviso" id="zncAviso" aria-live="polite"></div>' +
            '<button type="button" class="znc__btn znc__btn--main" id="zncSi"></button>' +
            '<button type="button" class="znc__btn" id="zncNo"></button>' +
            '<button type="button" class="znc__btn znc__btn--texto" id="zncDespues"></button>';
          $('zncNombre').textContent = actual;
          $('zncSi').textContent = TEXTOS.si; $('zncNo').textContent = TEXTOS.no; $('zncDespues').textContent = TEXTOS.despues;
          $('zncSi').addEventListener('click', function () { guardar(validarNombre(actual).valor, $('zncAviso')); });
          $('zncNo').addEventListener('click', function () { pasoEscribir(false); });
          $('zncDespues').addEventListener('click', function () { if (!enviando) cerrar({ confirmado: false, motivo: 'despues' }); });
          setTimeout(function () { var b = $('zncSi'); if (b) b.focus({ preventScroll: true }); }, 60);
        }

        function pasoEscribir(obligado) {
          $('zncTitulo').textContent = TEXTOS.tituloEscribir;
          $('zncDesc').textContent = obligado ? TEXTOS.descripcionObligado : TEXTOS.descripcionEscribir;
          cuerpo.innerHTML = '<label class="znc__sr" for="zncCampo" style="position:absolute;left:-9999px">' + esc(TEXTOS.tituloEscribir) + '</label>' +
            '<input class="znc__campo" id="zncCampo" type="text" autocomplete="name" maxlength="' + NOMBRE_MAX + '" placeholder="' + esc(TEXTOS.placeholder) + '">' +
            '<div class="znc__aviso" id="zncAviso" aria-live="polite"></div>' +
            '<button type="button" class="znc__btn znc__btn--main" id="zncGuardar"></button>' +
            (ofrecible ? '<button type="button" class="znc__btn" id="zncVolver"></button>' : '<button type="button" class="znc__btn znc__btn--texto" id="zncDespues"></button>');
          $('zncGuardar').textContent = TEXTOS.guardar;
          var campo = $('zncCampo'), aviso = $('zncAviso');
          campo.addEventListener('input', function () {
            var n = limpiar(campo.value).length;
            aviso.textContent = n >= NOMBRE_MAX - 6 ? TEXTOS.avisoLargo : ''; aviso.className = 'znc__aviso znc__aviso--suave';
          });
          function intentar() {
            var r = validarNombre(campo.value);
            if (!r.ok) { aviso.textContent = r.error; aviso.className = 'znc__aviso'; campo.focus(); return; }
            guardar(r.valor, aviso);
          }
          $('zncGuardar').addEventListener('click', intentar);
          campo.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); intentar(); } });
          var volver = $('zncVolver'); if (volver) { volver.textContent = TEXTOS.volver; volver.addEventListener('click', pasoPreguntar); }
          var despues = $('zncDespues'); if (despues) { despues.textContent = TEXTOS.despues; despues.addEventListener('click', function () { if (!enviando) cerrar({ confirmado: false, motivo: 'despues' }); }); }
          setTimeout(function () { try { campo.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }, 60);
        }

        if (ofrecible) pasoPreguntar(); else pasoEscribir(true);
      } catch (e) {
        try { console.warn('[nombre-cert]', e); } catch (_) { /* sin consola */ }
        resolver({ confirmado: false, motivo: 'despues' });
      }
    });
  }

  return {
    RUTA: RUTA, TEXTOS: TEXTOS, NOMBRE_MIN: NOMBRE_MIN, NOMBRE_MAX: NOMBRE_MAX,
    validarNombre: validarNombre, capitalizar: capitalizar, nombreOfrecible: nombreOfrecible,
    pendiente: pendiente, enviar: enviar, preguntar: preguntar
  };
});
