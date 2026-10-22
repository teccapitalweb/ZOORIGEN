/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · CONFIGURACIÓN (piezas puras)        */
/* Las cuatro tarjetas de Configuración, en el orden de Alintec: */
/*   1. Precios de la membresía VIP   (solo lectura)             */
/*   2. Contacto                      (WhatsApp, Instagram, correo)*/
/*   3. Estado de servicios           (semáforo + reporte)       */
/*   4. Historial del servidor        (caídas, reinicios, errores)*/
/* Todo sale de GET /api/admin/precios, /contacto, /servicios y  */
/* /servidor/historial. Nunca recibe ni muestra claves ni ids    */
/* completos de Stripe. Se prueba en tests/admin-servidor.test.js*/
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'), require('./admin-iconos.js'));
  else root.ZOO_ADMIN_SERVIDOR = factory(root.ZOO_ADMIN_PANEL, root.ZOO_ICONOS);
})(typeof self !== 'undefined' ? self : this, function (P, I) {
  'use strict';

  var esc = P.esc;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };
  var num = P.fmtNum;

  /* ── Nunca se muestra un id de Stripe completo: solo los últimos 4 caracteres ── */
  function acortarIds(texto) {
    return String(texto == null ? '' : texto).replace(/\b(sub|cus|in|pi|ch|evt|price|prod|cs|ii|il|si|seti|pm|card|src|re)_([A-Za-z0-9…]{4,})/g, function (m, p, id) {
      return p + '_…' + id.replace(/…/g, '').slice(-4);
    });
  }

  /* ───────────────────────── Errores del servidor, en español claro ─────────────────────────
     Cada grupo de errores trae un mensaje técnico (la parte «ejemplo»). Aquí se traduce a: qué pasó, qué significa y qué hacer.
     Los avisos «No se encontró miembro…» y «Checkout sin firebaseUID…» vienen del aviso automático de Stripe (webhook). La cuenta de Stripe
     es COMPARTIDA con otras marcas (AgroClub, GlobalVet…), así que Stripe también manda avisos que no son de Zoorigen: son ruido. */
  var NOTA_STRIPE_COMPARTIDA = 'La cuenta de Stripe se comparte con otras marcas (AgroClub, GlobalVet y más). Stripe manda al servidor los avisos de todas, ' +
    'aunque no sean de Zoorigen. Desde esta versión el servidor reconoce de quién es cada aviso por su precio: los de otras marcas se ignoran solos y ya no se cuentan como error.';

  var PLANTILLAS = [
    {
      clave: 'suscripcion-sin-miembro', patron: /No se encontr[oó] miembro para la suscripci[oó]n/i,
      titulo: 'Stripe avisó de una suscripción que no está ligada a ningún miembro',
      alta: { significa: 'El aviso es de un precio de Zoorigen, pero ninguna cuenta tiene guardada esa suscripción. Puede ser un pago real que no se pudo asignar a una persona.', hacer: 'Busca a la persona en Miembros (por su correo) y revisa si su pago aparece en Stripe. Si pagó y no tiene acceso, actívale la membresía desde su ficha.' },
      revisar: { significa: 'No se pudo saber de qué marca es el aviso (puede ser de Zoorigen o de otra marca de la cuenta compartida) y ninguna cuenta tiene esa suscripción.', hacer: 'Casi siempre no hay que hacer nada. Si se repite seguido o coincide con un pago de Zoorigen, revisa Stripe y la ficha de la persona.' }
    },
    {
      clave: 'pago-fallido-sin-miembro', patron: /No se encontr[oó] miembro para el pago fallido/i,
      titulo: 'Stripe avisó de un pago fallido que no está ligado a ningún miembro',
      alta: { significa: 'Un cobro de Zoorigen falló, pero ninguna cuenta tiene guardada esa suscripción, así que no se pudo marcar el pago pendiente.', hacer: 'Busca a la persona en Miembros y en Stripe. Si su cobro falló, avísale que actualice su tarjeta; el acceso se ajusta con el siguiente aviso.' },
      revisar: { significa: 'No se pudo saber de qué marca es este cobro fallido y ninguna cuenta de Zoorigen lo tiene guardado.', hacer: 'Normalmente es de otra marca y no requiere nada. Si se repite, revisa en Stripe de quién es la suscripción.' }
    },
    {
      clave: 'cancelacion-sin-miembro', patron: /No se encontr[oó] miembro para cancelar/i,
      titulo: 'Stripe avisó de una cancelación que no está ligada a ningún miembro',
      alta: { significa: 'Se canceló una suscripción de Zoorigen que ninguna cuenta tiene guardada, así que no se pudo cerrar su membresía.', hacer: 'Busca a la persona en Miembros. Si sigue con acceso y ya canceló en Stripe, ciérrale la membresía desde su ficha.' },
      revisar: { significa: 'Se canceló una suscripción y no se pudo saber de qué marca es; ninguna cuenta de Zoorigen la tiene guardada.', hacer: 'Casi siempre es de otra marca y no requiere nada. Si se repite, revisa Stripe.' }
    },
    {
      clave: 'checkout-sin-uid', patron: /Checkout sin firebaseUID|sin firebaseUID o subscriptionId/i,
      titulo: 'Una compra terminó en Stripe sin traer la cuenta de quien pagó',
      alta: { significa: 'Alguien pagó un precio de Zoorigen, pero la compra no trae el identificador de su cuenta, así que no se activó su membresía sola.', hacer: 'Revisa en Stripe quién pagó (correo del cliente), búscalo en Miembros y actívale la membresía desde su ficha. Es un caso real: atiéndelo pronto.' },
      revisar: { significa: 'Terminó una compra sin la cuenta de quien pagó y no se pudo saber de qué marca es.', hacer: 'Si la compra es de otra marca, no requiere nada. Si es de Zoorigen, actívale la membresía a esa persona desde su ficha.' }
    },
    {
      clave: 'suscripcion-sin-uid', patron: /No se encontr[oó] el UID de Firebase para la suscripci[oó]n/i,
      titulo: 'Una suscripción de Zoorigen no trae la cuenta ligada',
      alta: { significa: 'La suscripción existe en Stripe, pero no dice a qué cuenta del Club pertenece.', hacer: 'Búscala en Stripe por el correo del cliente y actívale la membresía a esa persona desde su ficha.' },
      revisar: { significa: 'Una suscripción llegó sin cuenta ligada y no se pudo saber de qué marca es.', hacer: 'Casi siempre no requiere nada. Si se repite, revisa Stripe.' }
    }
  ];

  var NIVELES = {
    alta: { texto: 'Alta prioridad', tono: 'error', icono: 'triangle-alert', orden: 0 },
    error: { texto: 'Error del servidor', tono: 'aviso', icono: 'circle-alert', orden: 1 },
    revisar: { texto: 'Por revisar', tono: 'info', icono: 'eye', orden: 2 }
  };

  function nivelDe(e) { return NIVELES[e && e.nivel] ? e.nivel : 'error'; }

  // Un grupo de errores de la bitácora → texto para personas (nunca el mensaje técnico completo ni ids de Stripe)
  function traducirError(e) {
    var base = e || {};
    var nivel = nivelDe(base);
    var mensaje = acortarIds(base.ejemplo || base.mensaje || '');
    var plantilla = null;
    for (var i = 0; i < PLANTILLAS.length; i++) { if (PLANTILLAS[i].patron.test(mensaje)) { plantilla = PLANTILLAS[i]; break; } }
    var desdeStripe = Boolean(plantilla);
    var texto;
    if (plantilla) {
      var t = nivel === 'revisar' ? plantilla.revisar : plantilla.alta;
      texto = { titulo: plantilla.titulo, significa: t.significa, hacer: t.hacer };
    } else {
      texto = {
        titulo: 'Error interno del servidor',
        significa: 'El servidor tuvo un problema que no reconocemos todavía. Si nadie reportó fallas, puede haberse resuelto solo.',
        hacer: 'Si se repite o alguien reporta que algo no funciona, pulsa «Copiar reporte» y envíalo al equipo técnico junto con el mensaje de abajo.'
      };
    }
    var idMatch = /\b(?:sub|cus|in|pi|ch)_…[A-Za-z0-9]{4}\b/.exec(mensaje);
    return {
      clave: String(base.clave || plantilla && plantilla.clave || ''), nivel: nivel, nivelTexto: NIVELES[nivel].texto, tono: NIVELES[nivel].tono, icono: NIVELES[nivel].icono,
      titulo: texto.titulo, significa: texto.significa, hacer: texto.hacer, desdeStripe: desdeStripe, referencia: idMatch ? idMatch[0] : '',
      cuenta: Number(base.cuenta) || 0, primeraVez: base.primeraVez || null, ultimaVez: base.ultimaVez || null,
      mensaje: mensaje.replace(/^\[ALTA PRIORIDAD\]\s*/i, '').replace(/^Aviso de Stripe por revisar:\s*/i, '')
    };
  }

  // Primero lo más urgente; dentro de cada nivel, lo más reciente
  function ordenarErrores(lista) {
    return (Array.isArray(lista) ? lista : []).map(traducirError).sort(function (a, b) {
      var oa = NIVELES[a.nivel].orden; var ob = NIVELES[b.nivel].orden;
      if (oa !== ob) return oa - ob;
      return String(b.ultimaVez || '') < String(a.ultimaVez || '') ? -1 : 1;
    });
  }

  /* ───────────────────────── Piezas pequeñas ───────────────────────── */
  function kpi(o) {
    return '<article class="ap-kpi ap-tono-' + esc(o.tono || 'neutro') + '"><span class="ap-kpi__ico">' + ico(o.icono, { size: 20 }) + '</span><div class="ap-kpi__txt">' +
      '<p class="ap-kpi__rot">' + esc(o.rotulo) + '</p><p class="ap-kpi__val">' + esc(o.valor) + '</p>' +
      (o.nota ? '<p class="ap-kpi__nota">' + esc(o.nota) + '</p>' : '') + '</div></article>';
  }
  function vacio(titulo, texto, icono) {
    return '<div class="zs-vacio ap-vacio">' + ico(icono || 'circle-check', { size: 28 }) + '<strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></div>';
  }
  function tarjeta(id, titulo, nota, cuerpo, acciones) {
    return '<section class="ap-card ap-cfg" id="' + esc(id) + '"><header class="ap-card__cab ap-cfg__cab"><div class="ap-cfg__tit"><h2>' + esc(titulo) + '</h2>' + (nota ? '<p>' + esc(nota) + '</p>' : '') + '</div>' +
      (acciones ? '<div class="ap-cfg__acc">' + acciones + '</div>' : '') + '</header><div class="ap-card__cuerpo">' + cuerpo + '</div></section>';
  }
  function boton(accion, icono, texto, clase, extra) {
    return '<button type="button" class="ap-btn ap-btn--' + (clase || 'suave') + (extra && extra.chico ? ' ap-btn--chico' : '') + '" data-accion="' + esc(accion) + '"' + (extra && extra.attr ? ' ' + extra.attr : '') + '>' + ico(icono, { size: 16 }) + esc(texto) + '</button>';
  }
  function hace(iso) { return iso ? P.fmtFecha(iso) + ' · ' + P.relativo(iso) : '—'; }
  function insignia(tono, icono, texto) { return '<span class="ap-badge ap-badge--' + tono + '">' + ico(icono, { size: 14 }) + '<span>' + esc(texto) + '</span></span>'; }

  /* ═════════════ 1. PRECIOS DE LA MEMBRESÍA VIP (solo lectura) ═════════════ */
  function dinero(monto, moneda) {
    var m = Number(monto);
    if (!isFinite(m)) return '—';
    return '$' + m.toLocaleString('es-MX', { minimumFractionDigits: m % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' ' + String(moneda || 'mxn').toUpperCase();
  }
  var NOMBRE_PLAN = { mensual: 'Plan mensual', anual: 'Plan anual' };

  function preciosHTML(d) {
    if (!d || !Array.isArray(d.planes) || !d.planes.length) return vacio('No se pudieron leer los precios', 'Pulsa «Actualizar» para intentarlo de nuevo.', 'circle-alert');
    var planes = d.planes.map(function (p) {
      var origen = p.origen === 'stripe' ? insignia('ok', 'badge-check', 'Leído de Stripe') : insignia('neutro', 'info', 'Precio de lista');
      var activo = p.activo === false ? insignia('aviso', 'triangle-alert', 'Precio archivado en Stripe') : '';
      return '<li class="ap-precio"><span class="ap-ico-tile ap-tono-info" aria-hidden="true">' + ico(p.plan === 'anual' ? 'calendar-days' : 'calendar-clock', { size: 18 }) + '</span>' +
        '<div class="ap-precio__txt"><strong>' + esc(NOMBRE_PLAN[p.plan] || p.plan) + '</strong><span>Se cobra ' + esc(p.cobro || '') + (p.idCorto ? ' · precio ' + esc(p.idCorto) : '') + '</span></div>' +
        '<div class="ap-precio__monto"><strong>' + esc(dinero(p.monto, p.moneda)) + '</strong><span class="ap-precio__ins">' + origen + activo + '</span></div></li>';
    }).join('');
    var modo = d.modo === 'real' ? insignia('ok', 'circle-check', 'Stripe en modo real') : d.modo === 'prueba' ? insignia('aviso', 'triangle-alert', 'Stripe en modo de prueba') : insignia('neutro', 'info', 'Sin conexión con Stripe');
    return '<ul class="ap-precios">' + planes + '</ul>' +
      '<p class="ap-precios__estado">' + insignia('info', 'lock', 'Solo lectura') + ' ' + modo + '</p>' +
      '<div class="ap-aviso ap-aviso--info ap-aviso--chico" role="note">' + ico('info', { size: 20 }) + '<div><strong>Por qué no se editan desde aquí</strong>' +
      '<p>Estos son los precios que se cobran hoy. La cuenta de Stripe se comparte con otras marcas y un precio no se puede cambiar sin crear uno nuevo, así que por seguridad el cambio se hace en Stripe y lo aplica el equipo técnico. ' +
      'Un cambio de precio solo afectaría a las suscripciones nuevas; las que ya están activas conservan el precio con el que se contrataron.</p></div></div>';
  }

  /* ═════════════ 2. CONTACTO ═════════════ */
  function contactoHTML(d) {
    var c = (d && d.contacto) || {};
    var por = (d && d.porDefecto) || {};
    var campo = function (id, etiqueta, valor, ayuda, tipo, auto) {
      return '<div class="ap-campo"><label for="' + id + '">' + esc(etiqueta) + '</label><input type="' + (tipo || 'text') + '" id="' + id + '" value="' + esc(valor || '') + '" autocomplete="' + (auto || 'off') + '" maxlength="120">' +
        '<small class="ap-campo__ayuda">' + esc(ayuda) + '</small></div>';
    };
    return '<form class="ap-form-contacto" id="apContactoForm" novalidate>' +
      campo('apCtWhatsapp', 'WhatsApp', c.whatsapp, 'Con código de país, por ejemplo ' + (por.whatsapp || '+52 1 236 111 3237') + '.', 'tel', 'off') +
      campo('apCtInstagram', 'Instagram', c.instagram, 'La dirección completa o solo el usuario, por ejemplo @zoorigen.mexico1.', 'text', 'off') +
      campo('apCtCorreo', 'Correo de contacto', c.correo, 'Es el correo que se muestra en la ayuda del Club.', 'email', 'off') +
      '<p class="ap-error" id="apContactoError" role="alert" hidden></p>' +
      '<div class="ap-acciones-lote">' + boton('guardar-contacto', 'check', 'Guardar contacto', 'primario') +
      boton('restablecer-contacto', 'rotate-ccw', 'Volver a los datos de siempre', 'suave') +
      '<span class="ap-cfg__estado" role="status">' + (c.personalizado ? insignia('ok', 'circle-check', 'Datos guardados desde el panel') : insignia('neutro', 'info', 'Se usan los datos de siempre')) + '</span></div>' +
      '</form>' +
      '<p class="ap-nota">Estos datos los usa el Club en sus enlaces de ayuda (canal, descuento, gracias, verificar correo, perfil y ayuda). ' +
      'La portada no cambia. Si el servidor no responde, el Club conserva los datos de siempre.' + (c.actualizado ? ' Última vez guardado: ' + esc(hace(c.actualizado)) + '.' : '') + '</p>';
  }

  /* ═════════════ 3. ESTADO DE SERVICIOS ═════════════ */
  var TONO = { ok: 'ok', aviso: 'aviso', error: 'error' };
  var ETIQUETA = { ok: 'En orden', aviso: 'Revisar', error: 'Falta algo' };
  var ROTULO_RESUMEN = { ok: 'Todo en orden', aviso: 'Hay avisos por revisar', error: 'Hay algo que corregir' };
  var ICONO_SERVICIO = { servidor: 'server', base: 'layers', stripe: 'credit-card', avisos: 'bell', pagos: 'scale', correo: 'mail', videos: 'clapperboard', certificados: 'award' };

  function nivelGeneral(lista) {
    if (lista.some(function (x) { return x.nivel === 'error'; })) return 'error';
    if (lista.some(function (x) { return x.nivel === 'aviso'; })) return 'aviso';
    return 'ok';
  }

  function serviciosHTML(s) {
    var lista = s && Array.isArray(s.comprobaciones) ? s.comprobaciones : [];
    if (!lista.length) return vacio('No se pudo revisar el estado', 'Pulsa «Revisar ahora» para intentarlo de nuevo.', 'circle-alert');
    var nivel = nivelGeneral(lista);
    var buenos = lista.filter(function (x) { return x.nivel === 'ok'; }).length;
    return '<p class="ap-semaforos__resumen">' + insignia(TONO[nivel], nivel === 'ok' ? 'circle-check' : 'triangle-alert', ROTULO_RESUMEN[nivel]) +
      '<span class="ap-semaforos__cuenta">' + buenos + ' de ' + lista.length + ' en orden · revisado ' + esc(P.relativo(s.generado)) + '</span></p>' +
      '<ul class="ap-semaforos">' + lista.map(function (x) {
        var casos = x.casos && x.casos.length ? '<small class="ap-semaforos__casos">Revisa: ' + x.casos.map(function (c) { return esc(c.nombre) + ' (' + esc(c.motivo) + ')'; }).join('; ') + '</small>' : '';
        return '<li class="ap-semaforos__fila"><span class="ap-semaforo ap-tono-' + TONO[x.nivel] + '" aria-hidden="true"></span>' +
          '<span class="ap-semaforos__ico" aria-hidden="true">' + ico(ICONO_SERVICIO[x.clave] || 'activity', { size: 18 }) + '</span>' +
          '<span class="ap-semaforos__txt"><strong>' + esc(x.nombre) + '</strong><small>' + esc(x.detalle) + '</small>' + casos + '</span>' +
          '<span class="ap-badge ap-badge--' + TONO[x.nivel] + '"><span>' + esc(ETIQUETA[x.nivel]) + '</span></span></li>';
      }).join('') + '</ul>';
  }

  // Texto para pegar en un mensaje al pedir ayuda: sin claves, sin ids completos de Stripe y sin datos personales
  function reporteServicios(s, ahoraIso) {
    var lista = s && Array.isArray(s.comprobaciones) ? s.comprobaciones : [];
    var lineas = ['Estado de servicios · Zoorigen' + (ahoraIso ? ' · ' + P.fmtFecha(ahoraIso) : ''), lista.length ? ROTULO_RESUMEN[nivelGeneral(lista)] : 'No se pudo revisar', ''];
    lista.forEach(function (x) { lineas.push('[' + ETIQUETA[x.nivel].toUpperCase() + '] ' + x.nombre + ': ' + acortarIds(x.detalle)); });
    return lineas.join('\n');
  }

  /* ═════════════ 4. HISTORIAL DEL SERVIDOR ═════════════ */
  var DIAS = [7, 30, 90];
  var MOTIVO_REINICIO = {
    'primer-arranque': { texto: 'Primer arranque registrado', tono: 'neutro', icono: 'door-open' },
    publicacion: { texto: 'Publicación o mantenimiento (normal)', tono: 'ok', icono: 'rocket' },
    inesperado: { texto: 'Reinicio inesperado', tono: 'aviso', icono: 'triangle-alert' }
  };

  function filtrarHistorial(h, modo) {
    var todo = modo === 'todo';
    var eventos = (h.eventos || []).filter(function (e) { return todo || e.normal === false; });
    var errores = ordenarErrores(h.errores || []);
    return { eventos: eventos, errores: errores, ignorados: todo ? (h.stripeIgnorados || []) : [] };
  }

  function filaReinicio(e) {
    var m = MOTIVO_REINICIO[e.motivo] || (e.normal === false ? MOTIVO_REINICIO.inesperado : MOTIVO_REINICIO.publicacion);
    var caida = e.caida && e.duracionSeg ? ' · Estuvo sin servicio unos ' + P.duracion(e.duracionSeg) : (e.normal === false && e.duracionSeg ? ' · Tardó ' + P.duracion(e.duracionSeg) + ' en volver' : '');
    return '<li><span class="ap-linea-tiempo__ico ap-linea-tiempo__ico--' + (e.normal === false ? 'error' : 'ok') + '">' + ico(m.icono, { size: 16 }) + '</span><div>' +
      '<p><strong>' + esc(e.caida && e.normal === false ? 'Caída del servidor' : m.texto) + '</strong>' + esc(caida) + '</p>' +
      '<time datetime="' + esc(e.en || '') + '">' + esc(hace(e.en)) + (e.version ? ' · versión ' + esc(e.version) : '') + '</time></div></li>';
  }

  function incidenteHTML(x) {
    var vece = x.cuenta === 1 ? '1 vez' : num(x.cuenta) + ' veces';
    return '<li class="ap-incidente ap-incidente--' + x.tono + '"><div class="ap-incidente__cab"><span class="ap-ico-tile ap-tono-' + x.tono + '" aria-hidden="true">' + ico(x.icono, { size: 18 }) + '</span>' +
      '<div class="ap-incidente__tit"><strong>' + esc(x.titulo) + '</strong><span>' + insignia(x.tono, x.icono, x.nivelTexto) + ' <span class="ap-incidente__cuenta">' + esc(vece) + ' · la última ' + esc(hace(x.ultimaVez)) + '</span></span></div></div>' +
      '<dl class="ap-incidente__txt"><div><dt>Qué significa</dt><dd>' + esc(x.significa) + '</dd></div><div><dt>Qué hacer</dt><dd>' + esc(x.hacer) + '</dd></div></dl>' +
      '<p class="ap-incidente__tec"><span>Mensaje del servidor</span> <code>' + esc(x.mensaje) + '</code></p></li>';
  }

  function historialHTML(h, ui) {
    var u = ui || {};
    var modo = u.modo === 'todo' ? 'todo' : 'problemas';
    if (!h || h.disponible === false) return vacio('El historial no está disponible', 'El servidor todavía no guarda su bitácora. Aparecerá cuando se publique la versión nueva del servidor.', 'circle-alert');
    var r = h.resumen || {};
    var dias = h.dias || 30;
    var f = filtrarHistorial(h, modo);
    var kpis = '<div class="ap-kpis">' + [
      kpi({ icono: 'clock', rotulo: 'Encendido ininterrumpido', valor: P.duracion(h.segundosActivo), tono: 'ok', nota: 'Desde ' + P.fmtFecha(h.arranque) }),
      kpi({ icono: 'cloud-off', rotulo: 'Caídas en ' + dias + ' días', valor: num(r.caidas || 0), tono: r.caidas ? 'error' : 'ok', nota: r.caidas ? 'Más de 10 minutos sin servicio' : 'Sin caídas' }),
      kpi({ icono: 'rotate-ccw', rotulo: 'Reinicios inesperados', valor: num(r.reiniciosInesperados || 0), tono: r.reiniciosInesperados ? 'aviso' : 'ok', nota: num(r.reinicios || 0) + ' arranques en total' }),
      kpi({ icono: 'wrench', rotulo: 'Errores internos', valor: num(r.erroresInternos || 0), tono: r.erroresInternos ? 'aviso' : 'ok', nota: r.erroresDistintos ? num(r.erroresDistintos) + (r.erroresDistintos === 1 ? ' tipo distinto' : ' tipos distintos') : 'Ninguno' })
    ].join('') + '</div>';

    var controles = '<div class="ap-controles"><div class="zs-chips" role="group" aria-label="Qué mostrar del historial">' +
      '<button type="button" class="zs-chip" data-historial-modo="problemas" aria-pressed="' + (modo === 'problemas') + '">Solo problemas</button>' +
      '<button type="button" class="zs-chip" data-historial-modo="todo" aria-pressed="' + (modo === 'todo') + '">Todo</button></div>' +
      '<label class="ap-orden"><span class="sr-only">Periodo</span><select id="apHistorialDias">' + DIAS.map(function (d) { return '<option value="' + d + '"' + (d === dias ? ' selected' : '') + '>Últimos ' + d + ' días</option>'; }).join('') + '</select></label></div>';

    var reinicios = f.eventos.length
      ? '<ol class="ap-linea-tiempo">' + f.eventos.slice(0, modo === 'todo' ? 30 : 15).map(filaReinicio).join('') + '</ol>'
      : vacio('Sin reinicios inesperados', modo === 'todo' ? 'El servidor no se ha reiniciado en este periodo.' : 'Las publicaciones normales no se muestran aquí; pulsa «Todo» para verlas.', 'circle-check');
    var marcar = r.reiniciosInesperados ? '<div class="ap-acciones-lote">' + boton('marcar-normales', 'check-check', 'Marcarlos como publicaciones normales', 'suave') +
      '<span class="ap-nota ap-nota--en-linea">Úsalo cuando ya sabes que esos reinicios fueron por publicar cambios. Quedan registrados, pero dejan de contar como problema.</span></div>' : '';

    var errores = f.errores.length
      ? '<ul class="ap-incidentes">' + f.errores.map(incidenteHTML).join('') + '</ul>'
      : vacio('Sin errores en el servidor', 'Si algo falla, aparecerá aquí agrupado, con cuántas veces pasó y qué hacer.', 'circle-check');

    var ig = r.stripeIgnorados || 0;
    var ignorados = modo === 'todo' ? (f.ignorados.length
      ? '<h3 class="ap-subtitulo">Avisos de Stripe de otras marcas (ignorados)</h3><ul class="ap-ignorados">' + f.ignorados.slice(0, 14).map(function (d) {
        var tipos = Object.keys(d.tipos || {}).sort().map(function (k) { return k + ' (' + num(d.tipos[k]) + ')'; }).join(', ');
        return '<li><strong>' + esc(P.fmtFecha(d.dia)) + '</strong><span>' + esc(num(d.cuenta)) + (d.cuenta === 1 ? ' aviso' : ' avisos') + '</span><small>' + esc(tipos) + '</small></li>';
      }).join('') + '</ul>'
      : '<h3 class="ap-subtitulo">Avisos de Stripe de otras marcas (ignorados)</h3><p class="ap-nada">Ninguno en este periodo.</p>') : '';

    var nota = '<div class="ap-aviso ap-aviso--info ap-aviso--chico" role="note">' + ico('info', { size: 20 }) + '<div><strong>Por qué aparecen avisos de Stripe</strong><p>' + esc(NOTA_STRIPE_COMPARTIDA) +
      (ig ? ' En estos ' + dias + ' días se ignoraron ' + num(ig) + (ig === 1 ? ' aviso' : ' avisos') + ' de otras marcas.' : '') + '</p></div></div>';

    return kpis + controles +
      '<h3 class="ap-subtitulo">Reinicios del servidor</h3>' + reinicios + marcar +
      '<h3 class="ap-subtitulo">Errores del servidor, agrupados</h3>' + errores + nota + ignorados;
  }

  // Texto para pegar en un mensaje al pedir ayuda (sin ids de Stripe completos, sin correos)
  function reporteHistorial(h, ahoraIso) {
    if (!h || h.disponible === false) return 'Historial del servidor · no disponible';
    var r = h.resumen || {};
    var l = ['Historial del servidor · Zoorigen' + (ahoraIso ? ' · ' + P.fmtFecha(ahoraIso) : ''), 'Periodo: últimos ' + (h.dias || 30) + ' días',
      'Encendido ininterrumpido: ' + P.duracion(h.segundosActivo) + ' (desde ' + P.fmtFecha(h.arranque) + ')',
      'Caídas: ' + (r.caidas || 0) + ' · Reinicios inesperados: ' + (r.reiniciosInesperados || 0) + ' de ' + (r.reinicios || 0) + ' arranques',
      'Errores internos: ' + (r.erroresInternos || 0) + ' (' + (r.erroresDistintos || 0) + ' tipos) · Por revisar: ' + (r.porRevisar || 0) + ' · Avisos de otras marcas ignorados: ' + (r.stripeIgnorados || 0)];
    var errores = ordenarErrores(h.errores || []);
    if (errores.length) {
      l.push('', 'Errores agrupados:');
      errores.forEach(function (x) { l.push('- [' + x.nivelTexto + '] ' + x.titulo + ' · ' + x.cuenta + (x.cuenta === 1 ? ' vez' : ' veces') + ' · última ' + P.fmtFecha(x.ultimaVez) + ' · ' + x.mensaje); });
    }
    return l.join('\n');
  }

  /* ═════════════ Miembros: lista en CSV (antes vivía en Configuración) ═════════════ */
  function csvMiembros(lista) {
    return P.aCsv([
      { titulo: 'nombre', clave: 'nombre' }, { titulo: 'correo', clave: 'correo' }, { titulo: 'estado', clave: 'estado' }, { titulo: 'plan', clave: 'plan' },
      { titulo: 'origen_del_acceso', clave: 'origen' }, { titulo: 'registro', clave: 'registro' }, { titulo: 'vence', clave: 'vence' }, { titulo: 'ultimo_pago', clave: 'ultimoPago' }
    ], (lista || []).map(function (m) {
      return { nombre: m.nombre, correo: m.correo, estado: P.etiquetaEstado(m.estado), plan: m.planTipo || '', origen: (P.ORIGENES && P.ORIGENES[m.origen]) || m.origen || '',
        registro: m.registro ? m.registro.slice(0, 10) : '', vence: m.vence ? m.vence.slice(0, 10) : '', ultimoPago: m.ultimoPago ? m.ultimoPago.slice(0, 10) : '' };
    }));
  }

  /* ═════════════ Armado de la sección ═════════════ */
  // Una función por tarjeta (el panel vuelve a pintar solo la que cambia). null = esa lectura falló.
  var falla = function (texto) { return '<div class="ap-aviso ap-aviso--error" role="alert">' + ico('circle-alert', { size: 20 }) + '<div><p>' + esc(texto) + '</p></div></div>'; };
  function tarjetaPrecios(d) {
    return tarjeta('apCfgPrecios', 'Precios de la membresía VIP', 'Lo que se cobra hoy por cada plan.', d ? preciosHTML(d) : falla('No se pudieron leer los precios.'),
      boton('actualizar-precios', 'refresh-cw', 'Actualizar', 'suave', { chico: true }));
  }
  function tarjetaContacto(d) {
    return tarjeta('apCfgContacto', 'Contacto', 'WhatsApp, Instagram y correo que ve el Club.', d ? contactoHTML(d) : falla('No se pudo leer el contacto.'));
  }
  function tarjetaServicios(d) {
    return tarjeta('apCfgServicios', 'Estado de servicios', 'Un semáforo con lo que revisa el servidor. Revisar no cobra ni envía nada.', d ? serviciosHTML(d) : falla('No se pudo revisar el estado de los servicios.'),
      boton('revisar-servicios', 'refresh-cw', 'Revisar ahora', 'suave', { chico: true }) + boton('copiar-servicios', 'copy', 'Copiar reporte', 'suave', { chico: true }));
  }
  function tarjetaHistorial(d, ui) {
    return tarjeta('apCfgHistorial', 'Historial del servidor', 'Caídas, reinicios y errores guardados (se conservan 90 días).', d ? historialHTML(d, ui) : falla('No se pudo leer el historial del servidor.'),
      boton('actualizar-historial', 'refresh-cw', 'Actualizar', 'suave', { chico: true }) + boton('copiar-historial', 'copy', 'Copiar reporte', 'suave', { chico: true }));
  }
  // datos = { precios, contacto, servicios, historial } · ui = { modo }
  function tarjetasHTML(datos, ui) {
    var d = datos || {};
    return tarjetaPrecios(d.precios) + tarjetaContacto(d.contacto) + tarjetaServicios(d.servicios) + tarjetaHistorial(d.historial, ui);
  }

  return {
    acortarIds: acortarIds, traducirError: traducirError, ordenarErrores: ordenarErrores, PLANTILLAS: PLANTILLAS, NOTA_STRIPE_COMPARTIDA: NOTA_STRIPE_COMPARTIDA,
    preciosHTML: preciosHTML, dinero: dinero, contactoHTML: contactoHTML, serviciosHTML: serviciosHTML, nivelGeneral: nivelGeneral, reporteServicios: reporteServicios,
    historialHTML: historialHTML, filtrarHistorial: filtrarHistorial, reporteHistorial: reporteHistorial, csvMiembros: csvMiembros, tarjetasHTML: tarjetasHTML, tarjetaPrecios: tarjetaPrecios, tarjetaContacto: tarjetaContacto, tarjetaServicios: tarjetaServicios, tarjetaHistorial: tarjetaHistorial, DIAS: DIAS
  };
});
