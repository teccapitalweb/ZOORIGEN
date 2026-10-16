/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · CONFIGURACIÓN (piezas puras)        */
/* Semáforo de servicios, calendario del servidor (solo lectura), */
/* versiones, enlaces útiles, respaldo recomendado y exportación  */
/* de miembros. Todo sale de endpoints que ya existen            */
/* (GET /api/admin/estado, /api/admin/calendario y miembros).    */
/* Nunca recibe ni muestra claves: solo si están definidas.      */
/* Se prueba en tests/admin-config.test.js                       */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'), require('./admin-iconos.js'));
  else root.ZOO_ADMIN_CONFIG = factory(root.ZOO_ADMIN_PANEL, root.ZOO_ICONOS);
})(typeof self !== 'undefined' ? self : this, function (P, I) {
  'use strict';

  var esc = P.esc;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };
  var TONO = { ok: 'ok', aviso: 'aviso', error: 'error' };
  var ETIQUETA = { ok: 'En orden', aviso: 'Revisar', error: 'Falta algo' };
  var ROTULO_RESUMEN = { ok: 'Todo en orden', aviso: 'Hay avisos por revisar', error: 'Hay algo que corregir' };

  /* ── Semáforo de servicios ──
     est = respuesta de GET /api/admin/estado · cal = respuesta de GET /api/admin/calendario (o null si no se pudo leer)
     Devuelve [{ clave, nombre, nivel: 'ok' | 'aviso' | 'error', detalle, icono }] */
  function servicios(est, cal) {
    if (!est || !est.servicios) return [];
    var s = est.servidor || {}; var sv = est.servicios;
    var lista = [];
    lista.push({ clave: 'servidor', nombre: 'Servidor', nivel: 'ok', icono: 'server', detalle: 'Activo hace ' + P.duracion(s.segundosActivo) + (s.node ? ' · Node ' + String(s.node).replace(/^v/, '') : '') });
    lista.push({ clave: 'base', nombre: 'Base de datos', nivel: sv.baseDeDatos && sv.baseDeDatos.ok ? 'ok' : 'error', icono: 'layers',
      detalle: sv.baseDeDatos && sv.baseDeDatos.ok ? 'Responde en ' + sv.baseDeDatos.ms + ' ms' : ((sv.baseDeDatos && sv.baseDeDatos.error) || 'No responde') });
    var st = sv.stripe || {};
    lista.push({ clave: 'stripe', nombre: 'Cobros (Stripe)', icono: 'credit-card',
      nivel: !st.configurado ? 'error' : st.modo === 'real' ? 'ok' : 'aviso',
      detalle: !st.configurado ? 'Falta STRIPE_SECRET_KEY' : st.modo === 'real' ? 'Modo real: cobra de verdad' : 'Modo de prueba: no cobra de verdad' });
    var vd = sv.videos || {};
    lista.push({ clave: 'videos', nombre: 'Videos (Bunny)', icono: 'clapperboard', nivel: vd.configurado ? 'ok' : 'error',
      detalle: !vd.configurado ? 'Falta BUNNY_TOKEN_AUTH_KEY' : vd.catalogoApi ? 'Reproducción y catálogo' : 'Reproducción (sin catálogo automático)' });
    var co = sv.correo || {};
    lista.push({ clave: 'correo', nombre: 'Correos (Resend)', icono: 'mail', nivel: co.configurado ? 'ok' : 'aviso', detalle: co.configurado ? 'Envío configurado' : 'Falta RESEND_API_KEY: no salen correos' });
    var ce = sv.certificados || {};
    lista.push({ clave: 'certificados', nombre: 'Certificados', icono: 'award', nivel: ce.configurado ? 'ok' : 'error', detalle: ce.configurado ? 'Firma configurada' : 'Falta CERTIFICATE_SIGNING_KEY' });
    var tn = sv.tareaNoticias || {};
    lista.push({ clave: 'noticias', nombre: 'Noticias automáticas', icono: 'newspaper', nivel: tn.activa ? 'ok' : 'aviso', detalle: tn.activa ? 'Tarea diaria activa' : 'Apagada (NOTICIAS_TAREA=off)' });
    if (cal && cal.ok !== false && cal.modo) {
      lista.push({ clave: 'calendario', nombre: 'Calendario de cursos', icono: 'calendar-clock', nivel: cal.modo === 'estricto' ? 'ok' : 'aviso',
        detalle: cal.modo === 'estricto' ? 'Modo estricto: el servidor bloquea los cursos aún cerrados' : 'Modo transición: solo anota, no bloquea' });
    }
    var criticas = (est.variables || []).filter(function (v) { return v.critica; });
    var faltan = criticas.filter(function (v) { return !v.definida; });
    if (criticas.length) {
      lista.push({ clave: 'variables', nombre: 'Variables críticas', icono: 'lock', nivel: faltan.length ? 'error' : 'ok',
        detalle: faltan.length ? 'Faltan: ' + faltan.map(function (v) { return v.nombre; }).join(', ') : (criticas.length) + ' de ' + criticas.length + ' definidas' });
    }
    return lista;
  }

  // El peor nivel de la lista
  function nivelGeneral(lista) {
    if (lista.some(function (x) { return x.nivel === 'error'; })) return 'error';
    if (lista.some(function (x) { return x.nivel === 'aviso'; })) return 'aviso';
    return 'ok';
  }

  function semaforoHTML(lista) {
    if (!lista.length) return '<p class="ap-nada">No se pudo leer el estado de los servicios. Ábrelo en «Estado del sistema».</p>';
    var nivel = nivelGeneral(lista);
    var buenos = lista.filter(function (x) { return x.nivel === 'ok'; }).length;
    return '<p class="ap-semaforos__resumen"><span class="ap-badge ap-badge--' + TONO[nivel] + '">' + ico(nivel === 'ok' ? 'circle-check' : 'triangle-alert', { size: 14 }) +
      '<span>' + esc(ROTULO_RESUMEN[nivel]) + '</span></span><span class="ap-semaforos__cuenta">' + buenos + ' de ' + lista.length + ' en orden</span></p>' +
      '<ul class="ap-semaforos">' + lista.map(function (x) {
        return '<li class="ap-semaforos__fila"><span class="ap-semaforo ap-tono-' + TONO[x.nivel] + '" aria-hidden="true"></span>' +
          '<span class="ap-semaforos__ico" aria-hidden="true">' + ico(x.icono, { size: 18 }) + '</span>' +
          '<span class="ap-semaforos__txt"><strong>' + esc(x.nombre) + '</strong><small>' + esc(x.detalle) + '</small></span>' +
          '<span class="ap-badge ap-badge--' + TONO[x.nivel] + '"><span>' + esc(ETIQUETA[x.nivel]) + '</span></span></li>';
      }).join('') + '</ul>';
  }

  // Texto para pegar en un mensaje cuando se pide ayuda (sin claves ni datos personales)
  function reporteTexto(lista, est, ahoraIso) {
    var s = (est && est.servidor) || {};
    var fecha = ahoraIso ? P.fmtFecha(ahoraIso) : '';
    var lineas = ['Estado de servicios · Zoorigen' + (fecha ? ' · ' + fecha : ''), ROTULO_RESUMEN[nivelGeneral(lista)], ''];
    lista.forEach(function (x) { lineas.push('[' + ETIQUETA[x.nivel].toUpperCase() + '] ' + x.nombre + ': ' + x.detalle); });
    lineas.push('');
    lineas.push('Servidor ' + (s.version || '—') + ' · publicación ' + (s.commit || 'sin dato') + ' · entorno ' + (s.entorno || '—'));
    return lineas.join('\n');
  }

  /* ── Calendario de cursos del servidor (solo lectura) ── */
  function calendarioHTML(cal) {
    if (!cal || !cal.modo) return '<p class="ap-nada">No se pudo leer el calendario del servidor. Inténtalo de nuevo con «Actualizar».</p>';
    var estricto = cal.modo === 'estricto';
    var fecha = cal.nuevoDesde ? P.fmtFecha(cal.nuevoDesde) : null;
    var dato = function (t, v) { return '<div class="ap-dato"><dt>' + esc(t) + '</dt><dd>' + v + '</dd></div>'; };
    return '<p class="ap-modal__texto"><span class="ap-badge ap-badge--' + (estricto ? 'ok' : 'aviso') + '">' + ico(estricto ? 'lock' : 'hourglass', { size: 14 }) + '<span>' + (estricto ? 'Modo estricto' : 'Modo transición') + '</span></span></p>' +
      '<p class="ap-nota">' + (estricto
        ? 'El servidor rechaza abrir un curso (o su video) antes de su fecha. Es lo definitivo.'
        : 'El servidor solo anota en su bitácora lo que habría rechazado y deja pasar a todos. Sirve para comprobar que el calendario del servidor coincide con lo que ven los miembros antes de volverlo estricto.') + '</p>' +
      '<dl class="ap-datos">' +
      dato('Fecha de activación', fecha ? esc(fecha) : 'Todavía no se fija (se fija sola con el primer uso)') +
      dato(estricto ? 'Rechazos desde el arranque' : 'Habría rechazado desde el arranque', esc(P.fmtNum(estricto ? cal.rechazos : cal.rechazosSimulados))) +
      dato('Último caso simulado', cal.ultimoSimulado ? esc(P.fmtFecha(cal.ultimoSimulado)) + ' · ' + esc(P.relativo(cal.ultimoSimulado)) : 'Ninguno') + '</dl>' +
      '<p class="ap-nota">La fecha de activación es desde cuándo quien empieza su plan cuenta sus cursos desde el inicio de ese plan; los miembros de antes conservan su calendario. Se cambian con las variables <code>CALENDARIO_MODO</code> y <code>CALENDARIO_NUEVO_DESDE</code> en Railway: este panel solo las muestra, por seguridad.</p>';
  }

  /* ── Versiones ── */
  function versionesHTML(est, versionPanel) {
    var s = (est && est.servidor) || {};
    var dato = function (t, v) { return '<div class="ap-dato"><dt>' + esc(t) + '</dt><dd>' + esc(v) + '</dd></div>'; };
    return '<dl class="ap-datos">' +
      dato('Servidor', s.version || '—') + dato('Publicación del servidor', s.commit || 'Sin dato') + dato('Entorno', s.entorno || '—') +
      dato('Node', s.node || '—') + dato('Servidor iniciado', s.iniciado ? P.fmtFecha(s.iniciado) + ' · ' + P.relativo(s.iniciado) : '—') +
      dato('Versión del panel (sitio)', versionPanel || '—') + '</dl>';
  }

  /* ── Enlaces útiles (se abren en otra pestaña; ninguno lleva claves) ── */
  var ENLACES = [
    { texto: 'Cobros y suscripciones', detalle: 'Stripe', href: 'https://dashboard.stripe.com/', icono: 'credit-card' },
    { texto: 'Base de datos y usuarios', detalle: 'Firebase', href: 'https://console.firebase.google.com/project/club-zoorigen', icono: 'layers' },
    { texto: 'Servidor y variables', detalle: 'Railway', href: 'https://railway.com/dashboard', icono: 'server' },
    { texto: 'Videos y colecciones', detalle: 'Bunny', href: 'https://dash.bunny.net/', icono: 'clapperboard' },
    { texto: 'Correos enviados', detalle: 'Resend', href: 'https://resend.com/emails', icono: 'mail' },
    { texto: 'Aviso de privacidad', detalle: 'Sitio', href: '../aviso-de-privacidad.html', icono: 'file-text', interno: true },
    { texto: 'Términos y condiciones', detalle: 'Sitio', href: '../terminos-y-condiciones.html', icono: 'file-text', interno: true },
    { texto: 'Verificar un certificado', detalle: 'Sitio', href: 'verificar.html', icono: 'award', interno: true }
  ];
  function enlacesHTML() {
    return '<ul class="ap-enlaces">' + ENLACES.map(function (e) {
      return '<li><a class="ap-enlace" href="' + esc(e.href) + '"' + (e.interno ? '' : ' target="_blank" rel="noopener noreferrer"') + '>' +
        '<span class="ap-enlace__ico" aria-hidden="true">' + ico(e.icono, { size: 18 }) + '</span><span class="ap-enlace__txt"><strong>' + esc(e.texto) + '</strong><small>' + esc(e.detalle) + '</small></span>' +
        ico(e.interno ? 'chevron-right' : 'external-link', { size: 16 }) + '</a></li>';
    }).join('') + '</ul>';
  }

  /* ── Respaldo recomendado ── */
  var RESPALDOS = [
    ['Cuentas, avance y certificados', 'Viven en Firebase (Firestore). Programa una exportación automática mensual desde la consola de Firebase y guarda la copia en un lugar aparte.'],
    ['Videos', 'Viven en Bunny. Conserva los originales en tu computadora o en otra nube: Bunny no es un respaldo de tus archivos fuente.'],
    ['Código del sitio y del servidor', 'Viven en GitHub. Cada publicación queda guardada; no hace falta copiar nada más.'],
    ['Claves y variables', 'Guárdalas en un gestor de contraseñas. Nunca en este panel ni en el código.']
  ];
  function respaldoHTML() {
    return '<ul class="ap-pasos">' + RESPALDOS.map(function (r, i) {
      return '<li><span class="ap-pasos__n">' + (i + 1) + '</span><div><strong>' + esc(r[0]) + '</strong><p>' + esc(r[1]) + '</p></div></li>';
    }).join('') + '</ul>';
  }

  /* ── Exportación de miembros (CSV) ──
     lista = miembros de GET /api/admin/miembros (ya recortados: sin teléfonos ni datos de pago). */
  function csvMiembros(lista) {
    var nombreEstado = function (e) { return P.etiquetaEstado(e); };
    return P.aCsv([
      { titulo: 'nombre', clave: 'nombre' }, { titulo: 'correo', clave: 'correo' }, { titulo: 'estado', clave: 'estado' }, { titulo: 'plan', clave: 'plan' },
      { titulo: 'origen_del_acceso', clave: 'origen' }, { titulo: 'registro', clave: 'registro' }, { titulo: 'vence', clave: 'vence' }, { titulo: 'ultimo_pago', clave: 'ultimoPago' }
    ], (lista || []).map(function (m) {
      return { nombre: m.nombre, correo: m.correo, estado: nombreEstado(m.estado), plan: m.planTipo || '', origen: (P.ORIGENES && P.ORIGENES[m.origen]) || m.origen || '',
        registro: m.registro ? m.registro.slice(0, 10) : '', vence: m.vence ? m.vence.slice(0, 10) : '', ultimoPago: m.ultimoPago ? m.ultimoPago.slice(0, 10) : '' };
    }));
  }

  function exportacionesHTML(totalMiembros) {
    return '<ul class="ap-enlaces">' +
      '<li><button type="button" class="ap-enlace ap-enlace--boton" data-accion="csv-miembros"><span class="ap-enlace__ico" aria-hidden="true">' + ico('download', { size: 18 }) + '</span>' +
      '<span class="ap-enlace__txt"><strong>Lista de miembros (CSV)</strong><small>Nombre, correo, estado y fechas' + (totalMiembros ? ' · ' + P.fmtNum(totalMiembros) + ' cuentas' : '') + '</small></span></button></li>' +
      '<li><a class="ap-enlace" href="#/metricas"><span class="ap-enlace__ico" aria-hidden="true">' + ico('chart-line', { size: 18 }) + '</span><span class="ap-enlace__txt"><strong>Historial de métricas (CSV)</strong><small>Se descarga desde Métricas, con el periodo que elijas</small></span>' + ico('chevron-right', { size: 16 }) + '</a></li>' +
      '<li><a class="ap-enlace" href="#/certificados"><span class="ap-enlace__ico" aria-hidden="true">' + ico('award', { size: 18 }) + '</span><span class="ap-enlace__txt"><strong>Certificados (CSV)</strong><small>Se descarga desde Certificados</small></span>' + ico('chevron-right', { size: 16 }) + '</a></li></ul>' +
      '<p class="ap-nota">Las listas llevan correos de personas: guárdalas en un lugar privado y bórralas cuando ya no las necesites.</p>';
  }

  return {
    servicios: servicios, nivelGeneral: nivelGeneral, semaforoHTML: semaforoHTML, reporteTexto: reporteTexto, calendarioHTML: calendarioHTML,
    versionesHTML: versionesHTML, enlacesHTML: enlacesHTML, ENLACES: ENLACES, respaldoHTML: respaldoHTML, RESPALDOS: RESPALDOS,
    csvMiembros: csvMiembros, exportacionesHTML: exportacionesHTML
  };
});
