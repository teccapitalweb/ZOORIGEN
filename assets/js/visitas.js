/* ============================================================ */
/* Contador anónimo de visitas · Zoorigen                         */
/* SIN cookies y sin guardar nada que identifique a la persona.   */
/*  · Cuenta una visita por página y por pestaña cada 30 minutos  */
/*    (sessionStorage; recargar no la infla).                     */
/*  · No cuenta si activas «No rastrear» (DNT) ni el «Control     */
/*    global de privacidad» (GPC).                                */
/*  · Solo cuenta en zoorigen.com (y en localhost para pruebas,   */
/*    contra el servidor local, nunca contra producción).         */
/*  · En el panel de miembros solo cuenta con sesión iniciada y   */
/*    manda el token para que el servidor sepa que es miembro     */
/*    (solo lo ve el administrador).                              */
/*  · El «origen del primer contacto» (de qué enlace llegaste)    */
/*    se recuerda solo mientras dura la pestaña (sessionStorage); */
/*    así, al crear tu cuenta, se sabe qué canal la trajo. Para   */
/*    recordarlo más tiempo habría que cambiar PERSISTIR_ORIGEN   */
/*    (y avisarlo en el aviso de privacidad).                     */
/*  · Nunca manda IP ni navegador: el servidor los usa solo en    */
/*    memoria para el país, el aparato y no contar dos veces.     */
/* El servidor decide si cuenta (interruptor «Contador de        */
/* visitas» en Configuración del panel de administración).        */
/* ============================================================ */
(function () {
  'use strict';
  var PAGINAS = ['landing', 'acceso', 'panel', 'legal'];
  var etiqueta = document.currentScript && document.currentScript.getAttribute('data-pagina');
  if (PAGINAS.indexOf(etiqueta) === -1) return;
  var pagina = etiqueta;

  // Solo el dominio oficial (y localhost para pruebas): github.io, previsualizaciones y copias no cuentan
  var host = location.hostname;
  var local = host === 'localhost' || host === '127.0.0.1';
  if (!local && host !== 'zoorigen.com' && host !== 'www.zoorigen.com') return;

  // «No rastrear» y «Control global de privacidad»
  try {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  } catch (e) { /* sin acceso: se sigue */ }

  var PERSISTIR_ORIGEN = false;     // false: el origen solo vive en la pestaña. true: también se guarda en localStorage (requiere aviso de privacidad)
  var API = local ? location.origin : 'https://zoorigen-webhook-production.up.railway.app';
  var URL_API = API + '/api/metricas/visita';
  var CLAVE_ORIGEN = 'zoorigen_origen_v1';
  var VENTANA_MS = 30 * 60 * 1000;
  var params = new URLSearchParams(location.search);

  function yaContada() {
    try { var antes = Number(sessionStorage.getItem('zoorigen_vis_' + pagina) || 0); return antes && Date.now() - antes < VENTANA_MS; } catch (e) { return false; }
  }
  function marcar() { try { sessionStorage.setItem('zoorigen_vis_' + pagina, String(Date.now())); } catch (e) { /* sin almacenamiento */ } }

  /* ── Origen del primer contacto (para saber qué canal trajo cada cuenta nueva) ── */
  function leerOrigen() {
    var t = null;
    try { t = sessionStorage.getItem(CLAVE_ORIGEN) || (PERSISTIR_ORIGEN ? localStorage.getItem(CLAVE_ORIGEN) : null); } catch (e) { t = null; }
    if (!t) return null;
    try { var o = JSON.parse(t); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
  }
  function guardarOrigen(o) {
    var texto = JSON.stringify(o);
    try { sessionStorage.setItem(CLAVE_ORIGEN, texto); } catch (e) { /* sin almacenamiento */ }
    if (PERSISTIR_ORIGEN) { try { localStorage.setItem(CLAVE_ORIGEN, texto); } catch (e) { /* sin almacenamiento */ } }
  }
  function capturarOrigen() {
    if (leerOrigen()) return;                       // el primer contacto no se pisa
    var ref = document.referrer || '';
    var utm = (params.get('utm_source') || '').slice(0, 40);
    var interno = false;
    try { interno = !!ref && /(^|\.)zoorigen\.com$/i.test(new URL(ref).hostname); } catch (e) { interno = false; }
    if (interno && !utm) return;                    // venir de otra página del propio sitio no es un origen
    guardarOrigen({ ref: ref.slice(0, 300), utm: utm, ua: (navigator.userAgent || '').slice(0, 300), t: Date.now(), fb: params.has('fbclid'), ig: params.has('igshid') || params.has('igsh') });
  }

  /* ── Envío ── */
  function enviar(token) {
    if (yaContada()) return;
    marcar();
    var cabeceras = { 'Content-Type': 'application/json' };
    if (token) cabeceras.Authorization = 'Bearer ' + token;
    var cuerpo = { pagina: pagina, ref: document.referrer || '', utm: params.get('utm_source') || '' };
    if (params.has('fbclid')) cuerpo.fbclid = true;
    if (params.has('igshid') || params.has('igsh')) cuerpo.igshid = true;
    if (token) { var origen = leerOrigen(); if (origen) cuerpo.origen = origen; }   // el origen solo viaja con sesión
    try { fetch(URL_API, { method: 'POST', headers: cabeceras, body: JSON.stringify(cuerpo), keepalive: true, credentials: 'omit' }).catch(function () { /* la visita nunca interrumpe la página */ }); } catch (e) { /* nunca estorba */ }
  }

  if (pagina !== 'panel') capturarOrigen();

  if (pagina !== 'panel') { enviar(null); return; }

  // Panel de miembros: se espera la sesión (hasta ~12 s); sin sesión no se cuenta
  var intentos = 0;
  var espera = setInterval(function () {
    intentos += 1;
    var usuario = null;
    try { usuario = window.firebase && window.firebase.auth && window.firebase.auth().currentUser; } catch (e) { usuario = null; }
    if (usuario && typeof usuario.getIdToken === 'function') {
      clearInterval(espera);
      usuario.getIdToken().then(enviar, function () { enviar(null); });
    } else if (intentos >= 24) clearInterval(espera);
  }, 500);
})();
