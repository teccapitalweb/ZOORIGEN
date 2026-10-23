/* ============================================================ */
/* CLUB · BARRA DEL CUPÓN DE PAGO                                */
/* Cuando una cuenta que nunca ha pagado recibe por correo un    */
/* cupón (de $50 o $100 en su primer mes del plan mensual), este */
/* módulo pone una barra verde FIJA arriba de todas las páginas  */
/* del Club con: el título, el precio final, el código (con      */
/* «Copiar»), la cuenta regresiva y «Usar mi cupón».             */
/*                                                               */
/* Nada existe si no hay cupón vigente: la barra no se dibuja,   */
/* no reserva espacio y no pide nada al servidor a quien ya es   */
/* miembro o administra. Para que la página no salte, el estado  */
/* del cupón se recuerda en este navegador (zoo_cupon) y un      */
/* script mínimo del <head> reserva el alto desde el primer      */
/* cuadro; el servidor (GET /api/recordatorios/mi-cupon) confirma */
/* cada 5 minutos y al volver a la pestaña.                      */
/*                                                               */
/* También guarda la preferencia «Recibir promociones por       */
/* correo» (interruptor de Mi perfil). */
/* Las funciones puras se prueban en tests/club-cupon.test.js.   */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.ZOO_CUPON = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var CLAVE = 'zoo_cupon';             // lo recordado en este navegador: { uid, codigo, monto, precioMes, precioFinal, venceLocal, hm, hd }
  var CLAVE_REVISION = 'zoo_cupon_chk'; // cuándo se consultó al servidor por última vez (sessionStorage)
  var CADA_MS = 5 * 60 * 1000;         // el servidor confirma cada 5 minutos
  var MINIMO_ENTRE_CONSULTAS_MS = 45 * 1000;
  var ALTO_MOVIL = 112, ALTO_ESCRITORIO = 60;   // alto estimado antes de medir la barra real
  var PLANES_CON_ACCESO = ['active', 'cancelled_active'];

  var ICONOS = {
    ticket: '<path d="M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M9 9h.01"/><path d="m15 9-6 6"/><path d="M15 15h.01"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
  };
  function ico(n) { return '<svg class="zcu-i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONOS[n] + '</svg>'; }

  /* ───────────────────────── Funciones puras ───────────────────────── */
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pesos(n) { return '$' + Number(n || 0).toLocaleString('es-MX'); }

  /* 3725000 ms -> «01:02:05» (nunca negativo) */
  function relojTexto(ms) {
    var s = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    function d(n) { return (n < 10 ? '0' : '') + n; }
    return d(h) + ':' + d(m) + ':' + d(x);
  }
  /* «Vence en 5 horas y 12 minutos», para lectores de pantalla (el reloj de la barra no se anuncia cada segundo) */
  function restanteHablado(ms) {
    var min = Math.max(0, Math.ceil((Number(ms) || 0) / 60000));
    var h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + (m === 1 ? ' minuto' : ' minutos');
    return h + (h === 1 ? ' hora' : ' horas') + (m ? ' y ' + m + (m === 1 ? ' minuto' : ' minutos') : '');
  }

  /* Lo que responde el servidor -> lo que se recuerda. Se usa el tiempo RESTANTE que dice el servidor (no el reloj del aparato). */
  function normalizar(respuesta, ahora, uid) {
    var c = respuesta && respuesta.cupon;
    if (!c || typeof c !== 'object') return null;
    var codigo = String(c.codigo || '');
    var monto = Number(c.monto), precioMes = Number(c.precioMes), precioFinal = Number(c.precioFinal), restante = Number(c.restanteMs);
    if (!/^[A-Za-z0-9-]{4,30}$/.test(codigo) || !(monto > 0) || !(precioMes > 0) || !(restante > 0)) return null;
    return { uid: String(uid || ''), codigo: codigo, monto: monto, precioMes: precioMes, precioFinal: isFinite(precioFinal) ? precioFinal : Math.max(0, precioMes - monto), venceLocal: (ahora || Date.now()) + restante };
  }
  function vigente(c, ahora) { return Boolean(c && c.codigo && Number(c.venceLocal) > (ahora || Date.now())); }

  /* Los dos textos de la barra */
  function textos(c) {
    return {
      titulo: 'Tienes un cupón de ' + pesos(c.monto) + ' para tu primer mes',
      sub: 'Pagas solo ' + pesos(c.precioFinal) + ' en el plan mensual'
    };
  }

  /* ¿Hay que preguntarle algo al servidor? No a quien ya es miembro ni a quien administra; y no más seguido que cada 45 s. */
  function debeConsultar(o) {
    var d = o || {};
    if (d.admin) return false;
    if (d.plan && PLANES_CON_ACCESO.indexOf(d.plan) !== -1) return false;
    if (d.ultimaConsultaMs && (d.ahora || Date.now()) - d.ultimaConsultaMs < (d.minimoMs || MINIMO_ENTRE_CONSULTAS_MS)) return false;
    return true;
  }
  /* Mostrar lo recordado sin esperar al servidor solo si no es miembro ni administrador */
  function puedeMostrarRecordado(o) {
    var d = o || {};
    return !d.admin && !(d.plan && PLANES_CON_ACCESO.indexOf(d.plan) !== -1);
  }

  function altoEstimado(ancho, recordado) {
    var r = recordado || {};
    if (ancho < 640) return Math.round(Number(r.hm) > 0 ? r.hm : ALTO_MOVIL);
    return Math.round(Number(r.hd) > 0 ? r.hd : ALTO_ESCRITORIO);
  }

  /* La barra. «data-vence» lo usa el reloj; el texto inicial ya trae la hora para que no parpadee. */
  function barraHTML(c, ahora) {
    var t = textos(c);
    var restante = c.venceLocal - (ahora || Date.now());
    return '<div class="zcu-barra" id="zooCuponBarra" role="region" aria-label="Cupón de descuento para tu primer mes">' +
      '<div class="zcu-barra__in">' +
      '<div class="zcu-texto">' + ico('ticket') + '<div class="zcu-texto__tt"><strong class="zcu-titulo">' + esc(t.titulo) + '</strong><span class="zcu-sub">' + esc(t.sub) + '</span></div></div>' +
      '<div class="zcu-codigo">' +
      '<code class="zcu-caja" id="zcCodigo">' + esc(c.codigo) + '</code>' +
      '<button type="button" class="zcu-copiar" id="zcCopiar" data-zc="copiar" aria-label="Copiar el código ' + esc(c.codigo) + '">' + ico('copy') + '<span>Copiar</span></button>' +
      '</div>' +
      '<div class="zcu-reloj" role="timer" aria-live="off">' + ico('clock') + '<span>Vence en <time id="zcReloj" data-vence="' + esc(c.venceLocal) + '">' + esc(relojTexto(restante)) + '</time></span></div>' +
      '<a class="zcu-cta" id="zcUsar" href="club-suscripcion.html" data-zc="usar"><span>Usar mi cupón</span>' + ico('arrow') + '</a>' +
      '</div>' +
      '<span class="sr-only" id="zcAviso" role="status" aria-live="polite"></span>' +
      '</div>';
  }

  /* El encabezado del formulario de pago mensual cuando hay cupón: el primer mes con el descuento y, claro, el precio desde el segundo mes */
  function pagoMensualConCupon(c) {
    var f = function (n) { return 'MXN ' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    return { monto: f(c.precioFinal), cada: 'el primer mes', detalle: 'Desde el segundo mes ' + f(c.precioMes) + ' · Cancela cuando quieras · Cupón ' + c.codigo + ' aplicado' };
  }

  /* Bloque de la página «Suscripción»: lo mismo, dicho con calma y con el precio completo (transparencia) */
  function bloqueSuscripcionHTML(c) {
    return '<section class="zcu-bloque" id="zooCuponBloque" aria-label="Tu cupón">' +
      '<div class="zcu-bloque__ico">' + ico('ticket') + '</div>' +
      '<div class="zcu-bloque__txt"><h2 class="zcu-bloque__tt">Tu cupón de ' + esc(pesos(c.monto)) + ' está activo</h2>' +
      '<p>Elige el plan <strong>mensual</strong> y tu código <code>' + esc(c.codigo) + '</code> se aplica solo. Tu primer mes: <strong>' + esc(pesos(c.precioFinal)) + '</strong> en lugar de ' + esc(pesos(c.precioMes)) +
      '. Desde el segundo mes: ' + esc(pesos(c.precioMes)) + ', y puedes cancelar cuando quieras. El cupón no aplica al plan anual.</p></div></section>';
  }

  /* ───────────────────────── Navegador ───────────────────────── */
  var vivo = { cupon: null, timer: null, ro: null, revisando: false, iniciado: false, esperaAviso: null };

  function almacen() { try { return root.localStorage; } catch (e) { return null; } }
  function sesion() { try { return root.sessionStorage; } catch (e) { return null; } }
  function leerRecordado() {
    var a = almacen(); if (!a) return null;
    try { var c = JSON.parse(a.getItem(CLAVE) || 'null'); return c && typeof c === 'object' ? c : null; } catch (e) { return null; }
  }
  function guardarRecordado(c) { var a = almacen(); if (!a) return; try { a.setItem(CLAVE, JSON.stringify(c)); } catch (e) { /* sin almacenamiento */ } }
  function borrarRecordado() { var a = almacen(); if (a) { try { a.removeItem(CLAVE); } catch (e) { /* nada */ } } var s = sesion(); if (s) { try { s.removeItem(CLAVE_REVISION); } catch (e) { /* nada */ } } }
  function plan() { try { return root.document.documentElement.getAttribute('data-plan') || (almacen() && almacen().getItem('zoo_plan')) || ''; } catch (e) { return ''; } }
  function esAdmin() { try { return almacen() && almacen().getItem('zoo_admin') === '1'; } catch (e) { return false; } }

  function avisar(texto) {
    var el = root.document.getElementById('zcAviso'); if (!el) return;
    el.textContent = '';
    clearTimeout(vivo.esperaAviso);
    vivo.esperaAviso = setTimeout(function () { el.textContent = texto; }, 30);
  }

  function medir() {
    var doc = root.document, barra = doc.getElementById('zooCuponBarra');
    if (!barra) return;
    var h = Math.ceil(barra.getBoundingClientRect().height);
    if (h > 0) {
      doc.documentElement.style.setProperty('--fomo-h', h + 'px');
      var r = leerRecordado();
      if (r && vigente(r)) { if (root.innerWidth < 640) r.hm = h; else r.hd = h; guardarRecordado(r); }
    }
  }

  function quitar() {
    var doc = root.document;
    clearInterval(vivo.timer); vivo.timer = null;
    if (vivo.ro) { try { vivo.ro.disconnect(); } catch (e) { /* nada */ } vivo.ro = null; }
    var barra = doc.getElementById('zooCuponBarra'); if (barra) barra.remove();
    doc.documentElement.classList.remove('zoo-cupon');
    doc.documentElement.style.removeProperty('--fomo-h');
    var bloque = doc.getElementById('zooCuponBloque'); if (bloque) bloque.remove();
    vivo.cupon = null;
    try { doc.dispatchEvent(new root.CustomEvent('zoo:cupon', { detail: null })); } catch (e) { /* nada */ }
  }
  function limpiar() { borrarRecordado(); quitar(); }

  function latido() {
    var c = vivo.cupon, doc = root.document;
    if (!c) return;
    var restante = c.venceLocal - Date.now();
    if (restante <= 0) { limpiar(); return; }       // al llegar a 0 la barra desaparece
    var t = doc.getElementById('zcReloj'); if (t) t.textContent = relojTexto(restante);
  }

  function pintar(c) {
    var doc = root.document;
    if (!doc || !doc.body) return;
    var existente = doc.getElementById('zooCuponBarra');
    var mismo = vivo.cupon && vivo.cupon.codigo === c.codigo;
    vivo.cupon = c;
    if (existente && mismo) { var t = doc.getElementById('zcReloj'); if (t) t.dataset.vence = String(c.venceLocal); latido(); return; }
    if (existente) existente.remove();
    doc.documentElement.classList.add('zoo-cupon');
    doc.body.insertAdjacentHTML('afterbegin', barraHTML(c));
    medir();
    if (root.ResizeObserver) { vivo.ro = new root.ResizeObserver(medir); vivo.ro.observe(doc.getElementById('zooCuponBarra')); }
    else root.addEventListener('resize', medir);
    clearInterval(vivo.timer); vivo.timer = setInterval(latido, 1000);
    try { doc.dispatchEvent(new root.CustomEvent('zoo:cupon', { detail: c })); } catch (e) { /* nada */ }
  }

  function copiar(texto) {
    if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) return root.navigator.clipboard.writeText(texto);
    return new Promise(function (resolver, rechazar) {
      try {
        var ta = root.document.createElement('textarea'); ta.value = texto; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        root.document.body.appendChild(ta); ta.select();
        var ok = root.document.execCommand('copy'); ta.remove();
        if (ok) resolver(); else rechazar(new Error('copiar'));
      } catch (e) { rechazar(e); }
    });
  }

  function alHacerClic(ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('[data-zc]') : null;
    if (!b || !vivo.cupon) return;
    var doc = root.document;
    if (b.dataset.zc === 'copiar') {
      copiar(vivo.cupon.codigo).then(function () {
        b.innerHTML = ico('check') + '<span>Copiado</span>'; b.classList.add('is-copiado');
        avisar('Código copiado');
        setTimeout(function () { b.innerHTML = ico('copy') + '<span>Copiar</span>'; b.classList.remove('is-copiado'); }, 2200);
      }).catch(function () {
        // Sin permiso para copiar: se selecciona el código para que se copie con el teclado
        var caja = doc.getElementById('zcCodigo');
        try { var r = doc.createRange(); r.selectNodeContents(caja); var s = root.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* nada */ }
        avisar('Selecciona el código y cópialo');
      });
    } else if (b.dataset.zc === 'usar') {
      // Ya en la página de suscripción: se elige el plan mensual (ahí el cupón se aplica solo) en lugar de recargar
      var mensual = doc.querySelector('.sub-plan[data-plan="mensual"]');
      if (mensual) { ev.preventDefault(); mensual.click(); var destino = doc.querySelector('.sub-pago') || mensual; try { destino.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { destino.scrollIntoView(); } }
    }
  }

  function api(ruta, op) {
    // ZOORIGEN_CLUB es una constante global de club.js (no una propiedad de window): se busca por su nombre
    var club = typeof ZOORIGEN_CLUB !== 'undefined' ? ZOORIGEN_CLUB : root.ZOORIGEN_CLUB;
    if (club && typeof club.apiFetch === 'function') return club.apiFetch(ruta, op);
    return Promise.reject(Object.assign(new Error('sin servidor'), { status: 0 }));
  }

  /* Pregunta al servidor si esta cuenta tiene cupón (solo si corresponde) y deja la barra al día */
  function sincronizar(forzar) {
    if (vivo.revisando) return Promise.resolve();
    var s = sesion();
    var ultima = 0; try { ultima = Number(s && s.getItem(CLAVE_REVISION)) || 0; } catch (e) { ultima = 0; }
    if (!puedeMostrarRecordado({ plan: plan(), admin: esAdmin() })) { limpiar(); return Promise.resolve(); }
    if (!forzar && !debeConsultar({ plan: plan(), admin: esAdmin(), ultimaConsultaMs: ultima, ahora: Date.now() })) return Promise.resolve();
    vivo.revisando = true;
    var user = null; try { user = root.firebase && root.firebase.auth().currentUser; } catch (e) { user = null; }
    return api('/api/recordatorios/mi-cupon').then(function (r) {
      try { if (s) s.setItem(CLAVE_REVISION, String(Date.now())); } catch (e) { /* nada */ }
      var c = normalizar(r, Date.now(), user && user.uid);
      if (c) { guardarRecordado(c); pintar(c); } else limpiar();
    }).catch(function (e) {
      if (e && (e.status === 401 || e.status === 403)) limpiar();     // sin sesión: nada que mostrar; si solo falló la red, se deja lo que ya había
    }).then(function () { vivo.revisando = false; }, function () { vivo.revisando = false; });
  }

  function iniciar() {
    if (vivo.iniciado || !root.document) return;
    vivo.iniciado = true;
    var doc = root.document;
    doc.addEventListener('click', alHacerClic);
    montarPerfil();
    // 1) Lo recordado se pinta de inmediato (sin esperar a Firebase ni al servidor) si no es miembro ni administrador
    var r = leerRecordado();
    if (r && vigente(r) && puedeMostrarRecordado({ plan: plan(), admin: esAdmin() })) pintar(r); else if (r) borrarRecordado();
    // 2) El servidor confirma cuando Firebase ya conoce la sesión
    try {
      root.firebase.auth().onAuthStateChanged(function (user) {
        if (!user) { limpiar(); return; }
        var rec = leerRecordado();
        if (rec && rec.uid && rec.uid !== user.uid) limpiar();          // otra cuenta usó este navegador antes
        sincronizar(true);
      });
    } catch (e) { /* sin Firebase: solo lo recordado */ }
    setInterval(function () { sincronizar(false); }, CADA_MS);
    doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible') sincronizar(false); });
  }

  /* ───────────────────────── Preferencia «Recibir promociones por correo» ───────────────────────── */
  function leerPreferencia() { return api('/api/recordatorios/preferencia').then(function (r) { return { recibe: r.recibe !== false, baja: r.baja === true }; }); }
  function guardarPreferencia(recibe) { return api('/api/recordatorios/preferencia', { method: 'POST', body: { recibe: Boolean(recibe), origen: 'perfil' } }); }

  /* Mi perfil: interruptor «Recibir promociones por correo». Quien se dio de baja desde un correo no puede volver a activarlo (la baja es para siempre). */
  function textoPreferencia(p) {
    if (p && p.baja) return 'Te diste de baja desde un correo: ya no recibirás promociones ni recordatorios.';
    return p && p.recibe ? 'Activado: puedes recibir recordatorios y códigos de descuento por correo.' : 'Desactivado: no recibirás promociones ni recordatorios por correo.';
  }
  function montarPerfil() {
    var doc = root.document, sw = doc && doc.getElementById('promosSw');
    if (!sw) return;
    var estado = doc.getElementById('promosEstado'), actual = null;
    function pintarSw(p) {
      actual = p; sw.disabled = Boolean(p.baja);
      sw.setAttribute('aria-checked', p.recibe ? 'true' : 'false'); sw.classList.toggle('is-on', Boolean(p.recibe));
      estado.textContent = textoPreferencia(p);
    }
    function cargar() {
      sw.disabled = true;
      leerPreferencia().then(pintarSw).catch(function () { estado.textContent = 'No pudimos leer tu preferencia. Recarga la página en un momento.'; });
    }
    sw.addEventListener('click', function () {
      if (!actual || actual.baja) return;
      var quiere = !actual.recibe; sw.disabled = true;
      guardarPreferencia(quiere).then(function (r) { pintarSw({ recibe: r.recibe !== false, baja: r.baja === true }); sincronizar(true); })
        .catch(function () { estado.textContent = 'No se pudo guardar. Inténtalo de nuevo.'; sw.disabled = false; });
    });
    try { root.firebase.auth().onAuthStateChanged(function (user) { if (user) cargar(); }); } catch (e) { /* sin Firebase */ }
  }

  /* Página «Suscripción»: pone el bloque del cupón arriba de «Elige tu plan», ahora o cuando llegue el cupón */
  function montarEnSuscripcion(contenedor) {
    if (!root.document) return;
    vivo.contenedorSub = contenedor || root.document;
    function poner(c) {
      var doc = root.document;
      var viejo = doc.getElementById('zooCuponBloque'); if (viejo) viejo.remove();
      if (!c || !vigente(c)) return;
      var titulo = vivo.contenedorSub.querySelector('.sub-titulo');
      if (titulo) titulo.insertAdjacentHTML('beforebegin', bloqueSuscripcionHTML(c));
    }
    poner(vivo.cupon);
    if (!vivo.escuchaSub) { vivo.escuchaSub = true; root.document.addEventListener('zoo:cupon', function (e) { poner(e.detail); }); }
  }

  if (typeof document !== 'undefined' && root === (typeof window !== 'undefined' ? window : null)) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  }

  return {
    CLAVE: CLAVE, CADA_MS: CADA_MS, ALTO_MOVIL: ALTO_MOVIL, ALTO_ESCRITORIO: ALTO_ESCRITORIO,
    esc: esc, pesos: pesos, relojTexto: relojTexto, restanteHablado: restanteHablado, normalizar: normalizar, vigente: vigente, textos: textos,
    debeConsultar: debeConsultar, puedeMostrarRecordado: puedeMostrarRecordado, altoEstimado: altoEstimado, barraHTML: barraHTML, bloqueSuscripcionHTML: bloqueSuscripcionHTML, pagoMensualConCupon: pagoMensualConCupon,
    actual: function () { return vivo.cupon; }, iniciar: iniciar, sincronizar: sincronizar, leerPreferencia: leerPreferencia, guardarPreferencia: guardarPreferencia, textoPreferencia: textoPreferencia, montarPerfil: montarPerfil, montarEnSuscripcion: montarEnSuscripcion
  };
});
