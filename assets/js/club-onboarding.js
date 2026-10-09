/* ============================================================ */
/* SECUENCIA DE BIENVENIDA · Club VIP Zoorigen                   */
/*                                                                */
/* Miembro nuevo : bienvenida con confeti -> nombre del           */
/*                 certificado -> premio de bienvenida (+100 XP)  */
/*                 -> recorrido guiado -> prueba gratuita.        */
/* Miembro antiguo que nunca ha pagado: UNA tarjeta de            */
/*                 "¡Bienvenido de nuevo!" con la prueba gratuita.*/
/* Admins: nunca se les muestra nada.                             */
/*                                                                */
/* - La lógica (arriba) no toca la pantalla y se prueba en Node:  */
/*   tests/club-onboarding.test.js                                */
/* - Las pantallas (abajo) solo corren en el navegador.           */
/* - Marcas de "ya visto": miembros/{uid}.onboardingZoo (con      */
/*   respaldo en localStorage), así nada se repite y se puede     */
/*   reanudar si el usuario cierra la pestaña a la mitad.         */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_ONBOARDING = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────────────────────── Constantes ───────────────────────── */

  var MARCAS = ['bienvenidaVista', 'nombreVisto', 'premioVisto', 'tourVisto', 'pruebaIntroVista', 'retornoVisto'];
  var RUTA_PREMIO_BIENVENIDA = '/api/premios/bienvenida';
  var NOMBRE_MIN = 3;
  var NOMBRE_MAX = 38;
  var NOMBRE_AVISO = 32;          // desde aquí se avisa que se acerca al límite
  var DIAS_CUENTA_NUEVA = 3;
  var DIAS_MAX_CON_WELCOME = 30;  // ?welcome=1 solo cuenta en cuentas de menos de 30 días
  var PREFIJO_LOCAL = 'zoo_onb_v1_';
  var URL_ELEGIR_CURSO = 'club-biblioteca.html?elegir=1';
  var URL_PRUEBA_DEFECTO = 'https://zoorigen-webhook-production.up.railway.app/api/prueba-gratuita';
  var PARTICULAS = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'van', 'von', 'da', 'di', 'le', 'du', 'dos', 'das'];

  /* ───────────────────────── Textos (sin emojis) ───────────────────────── */

  var TEXTOS = {
    bienvenida: {
      kicker: '¡Cuenta creada!',
      titulo: 'Bienvenido a <em>Zoorigen</em>',
      saltar: 'Saltar',
      siguiente: 'Siguiente',
      ultimo: 'Continuar'
    },
    nombre: {
      titulo: '¿Cómo quieres que aparezca tu nombre?',
      texto: 'Este es el nombre que aparecerá en tus certificados de Zoorigen. Escríbelo completo y bien escrito (nombre y apellidos).',
      ejemplo: 'Ej. Mariana Torres Ramírez',
      guardar: 'Guardar y continuar',
      omitir: 'Lo dejo así por ahora',
      pie: 'Solo lo usaremos para tus certificados.',
      errorGuardar: 'No pudimos guardar tu nombre. Revisa tu conexión e inténtalo de nuevo.',
      guardado: 'Nombre guardado'
    },
    pruebaNuevo: {
      titulo: 'Tu prueba gratuita',
      texto: 'Al ser miembro nuevo, te damos a elegir un curso de tu interés como prueba gratuita.',
      detalle: 'Es nuestro regalo para que conozcas cómo aprendes con Zoorigen.',
      elegir: 'Elegir mi curso',
      luego: 'Más tarde'
    },
    retorno: {
      titulo: '¡Bienvenido de nuevo!',
      texto: 'Te queremos dar como premio una prueba gratuita del curso de tu elección.',
      pasos: [
        'Elige un curso que te interese.',
        'Confirma tu elección.',
        'Empieza a aprender hoy mismo, a tu ritmo.'
      ],
      elegir: 'Elegir mi curso',
      luego: 'Más tarde'
    },
    tour: {
      marca: 'Recorrido guiado',
      omitir: 'Omitir',
      anterior: 'Anterior',
      siguiente: 'Siguiente',
      finalizar: 'Finalizar',
      paso: 'Paso {n} de {total}',
      repetir: 'Repetir el recorrido guiado'
    }
  };

  /* ───────────────────────── Utilidades puras ───────────────────────── */

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // Acepta Date, texto ISO, Timestamp de Firestore ({seconds}) o algo con toDate().
  function aFecha(v) {
    if (v == null || v === '') return null;
    var d = null;
    if (v instanceof Date) d = v;
    else if (typeof v === 'object' && typeof v.toDate === 'function') { try { d = v.toDate(); } catch (e) { d = null; } }
    else if (typeof v === 'object' && Number.isFinite(v.seconds)) d = new Date(v.seconds * 1000);
    else if (typeof v === 'object' && Number.isFinite(v._seconds)) d = new Date(v._seconds * 1000);
    else if (typeof v === 'string' || typeof v === 'number') d = new Date(v);
    return d && !isNaN(d.getTime()) ? d : null;
  }

  function esAdmin(session) { return !!session && session.role === 'admin'; }

  function tienePlanActivo(session) {
    if (!session) return false;
    if (session.planStatus === 'active' || session.planStatus === 'cancelled_active') return true;
    var vence = aFecha(session.planVence);
    return session.planActivo === true && !!vence && vence.getTime() > Date.now();
  }

  // Alguna vez tuvo (o tiene) una suscripción: ya no es "nunca ha pagado".
  function haPagadoAlgunaVez(session) {
    if (!session) return false;
    return !!(session.ultimoPago || session.planInicio || session.planTipo || session.stripeSubscriptionId || session.planVence);
  }

  // El servidor es quien decide; esto es un seguro extra del lado del navegador.
  function pruebaPosible(session) {
    return !!session && !esAdmin(session) && !tienePlanActivo(session) && !haPagadoAlgunaVez(session);
  }

  function tieneNombreCertificado(session) {
    return !!(session && typeof session.nombreCertificado === 'string' && validarNombre(session.nombreCertificado).ok);
  }

  /* ───────────────────────── Nombre del certificado ───────────────────────── */

  function limpiarNombre(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); }

  function letras(t) { return String(t).replace(/[^\p{L}]/gu, ''); }

  // Si viene todo en minúsculas o todo en MAYÚSCULAS lo deja con mayúscula inicial en cada palabra.
  function capitalizarNombre(t) {
    var v = limpiarNombre(t);
    if (!v || (v !== v.toLowerCase() && v !== v.toUpperCase())) return v;
    var bajo = v.toLocaleLowerCase('es-MX');
    return bajo.split(' ').map(function (palabra, i) {
      if (i > 0 && PARTICULAS.indexOf(palabra) !== -1) return palabra;
      return palabra.replace(/(^|[-'’.])(\p{L})/gu, function (m, pre, l) { return pre + l.toLocaleUpperCase('es-MX'); });
    }).join(' ');
  }

  function validarNombre(texto) {
    var v = limpiarNombre(texto);
    if (v.length < NOMBRE_MIN) return { ok: false, codigo: 'corto', valor: v, error: 'Escribe tu nombre y al menos un apellido.' };
    if (v.length > NOMBRE_MAX) return { ok: false, codigo: 'largo', valor: v, error: 'Usa máximo ' + NOMBRE_MAX + ' caracteres. Con nombre y uno o dos apellidos basta.' };
    if (!/^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u.test(v)) return { ok: false, codigo: 'caracteres', valor: v, error: 'Usa solo letras, sin números ni símbolos.' };
    var partes = v.split(' ');
    var apellidos = partes.slice(1).filter(function (p) { return PARTICULAS.indexOf(p.toLowerCase()) === -1 && letras(p).length >= 2; });
    if (letras(partes[0]).length < 2 || !apellidos.length) return { ok: false, codigo: 'apellido', valor: v, error: 'Escribe tu nombre y al menos un apellido.' };
    return { ok: true, codigo: 'ok', valor: capitalizarNombre(v), error: '' };
  }

  // Aviso en vivo mientras escribe (no bloquea).
  function avisoLongitud(texto) {
    var n = limpiarNombre(texto).length;
    if (n >= NOMBRE_MAX - 4) return 'Es el máximo que se ve bien en el certificado. Usa nombre y uno o dos apellidos.';
    if (n >= NOMBRE_AVISO) return 'Procura que no sea más largo para que luzca bien.';
    return '';
  }

  // Nombre que se propone en el campo: solo si ya parece un nombre completo real.
  function sugerirNombre(session) {
    if (!session) return '';
    var candidatos = [session.nombreCertificado, session.name];
    var local = String(session.email || '').split('@')[0].toLowerCase();
    for (var i = 0; i < candidatos.length; i++) {
      var c = limpiarNombre(candidatos[i]);
      if (!c || c.toLowerCase() === local) continue;
      var r = validarNombre(c);
      if (r.ok) return r.valor;
    }
    return '';
  }

  function primerNombre(session) {
    var n = limpiarNombre(session && (session.name || (session.email ? String(session.email).split('@')[0] : '')));
    var p = n.split(' ')[0] || '';
    return p ? p.charAt(0).toLocaleUpperCase('es-MX') + p.slice(1) : '';
  }

  /* ───────────────────────── Marcas de "ya visto" ───────────────────────── */

  function normalizarMarcas(obj) {
    var r = {};
    if (!obj || typeof obj !== 'object') return r;
    MARCAS.forEach(function (k) {
      var v = obj[k];
      if (!v) return;
      var d = aFecha(v);
      r[k] = d ? d.toISOString() : '1';
    });
    return r;
  }

  function fusionarMarcas(a, b) {
    var r = {};
    [a, b].forEach(function (o) {
      var n = normalizarMarcas(o);
      Object.keys(n).forEach(function (k) { if (!r[k]) r[k] = n[k]; });
    });
    return r;
  }

  function hayMarcas(marcas) { return Object.keys(normalizarMarcas(marcas)).length > 0; }

  // leerRemoto(): Promise<datos del miembro>   escribirRemoto(obj): Promise
  function crearAlmacen(o) {
    o = o || {};
    var uid = String(o.uid || '');
    var ls = o.ls || null;
    var ahora = typeof o.ahora === 'function' ? o.ahora : function () { return new Date(); };
    var clave = PREFIJO_LOCAL + uid;
    var marcas = {};

    function leerLocal() {
      try { return normalizarMarcas(JSON.parse(ls.getItem(clave) || '{}')); } catch (e) { return {}; }
    }
    function guardarLocal() { try { ls.setItem(clave, JSON.stringify(marcas)); } catch (e) { /* sin almacenamiento local */ } }

    marcas = ls ? leerLocal() : {};

    return {
      clave: clave,
      marcas: function () { return Object.assign({}, marcas); },
      vista: function (id) { return !!marcas[id]; },
      cargar: function () {
        if (typeof o.leerRemoto !== 'function') return Promise.resolve({ remotoOk: false, datos: {} });
        return Promise.resolve().then(o.leerRemoto).then(function (datos) {
          datos = datos || {};
          marcas = fusionarMarcas(marcas, datos.onboardingZoo);
          if (ls) guardarLocal();
          return { remotoOk: true, datos: datos };
        }).catch(function () { return { remotoOk: false, datos: {} }; });
      },
      marcar: function (id) {
        if (MARCAS.indexOf(id) === -1) return Promise.resolve(false);
        if (marcas[id]) return Promise.resolve(true);
        var iso = ahora().toISOString();
        marcas[id] = iso;
        if (ls) guardarLocal();
        if (typeof o.escribirRemoto !== 'function') return Promise.resolve(false);
        var carga = {}; carga[id] = iso;
        return Promise.resolve().then(function () { return o.escribirRemoto({ onboardingZoo: carga }); })
          .then(function () { return true; }, function () { return false; });
      }
    };
  }

  // Guarda miembros/{uid}.nombreCertificado (el cliente puede: las reglas lo permiten).
  function guardarNombreCertificado(o) {
    var r = validarNombre(o && o.nombre);
    if (!r.ok) return Promise.resolve({ ok: false, error: r.error, codigo: r.codigo });
    if (!o || typeof o.escribirRemoto !== 'function') return Promise.resolve({ ok: false, error: TEXTOS.nombre.errorGuardar, codigo: 'sin-destino' });
    return Promise.resolve().then(function () { return o.escribirRemoto({ nombreCertificado: r.valor }); })
      .then(function () { return { ok: true, valor: r.valor }; },
        function () { return { ok: false, error: TEXTOS.nombre.errorGuardar, codigo: 'red' }; });
  }

  /* ───────────────────────── Estado de la prueba gratuita ───────────────────────── */

  function normalizarEstadoPrueba(json) {
    if (!json || typeof json !== 'object') return null;
    var elegida = json.elegida;
    if (elegida && typeof elegida !== 'object') elegida = { cursoId: String(elegida) };
    return {
      elegible: json.elegible === true,
      elegida: elegida || null,
      motivo: typeof json.motivo === 'string' ? json.motivo : '',
      cursosElegibles: Array.isArray(json.cursosElegibles) ? json.cursosElegibles : []
    };
  }

  function conLimite(promesa, ms) {
    var t;
    var limite = new Promise(function (_, rechazar) { t = setTimeout(function () { rechazar(new Error('tiempo-agotado')); }, ms); });
    return Promise.race([promesa, limite]).then(function (v) { clearTimeout(t); return v; }, function (e) { clearTimeout(t); throw e; });
  }

  function urlPruebaDefecto() {
    try { if (typeof WEBHOOK_SERVER_URL === 'string' && WEBHOOK_SERVER_URL) return WEBHOOK_SERVER_URL.replace(/\/+$/, '') + '/api/prueba-gratuita'; } catch (e) { /* sin configuración */ }
    return URL_PRUEBA_DEFECTO;
  }

  // GET /api/prueba-gratuita con el ID token. Si algo falla (red, tiempo, respuesta rara) devuelve null
  // y entonces NO se muestran las tarjetas de prueba.
  function pedirEstadoPrueba(o) {
    o = o || {};
    var f = o.fetchFn || (typeof fetch === 'function' ? fetch : null);
    var ms = o.timeoutMs > 0 ? o.timeoutMs : 4000;
    var url = o.url || urlPruebaDefecto();
    if (!f || typeof o.getToken !== 'function') return Promise.resolve(null);
    var ctl = (typeof AbortController === 'function') ? new AbortController() : null;
    return conLimite(Promise.resolve().then(o.getToken), ms).then(function (token) {
      if (!token) return null;
      var opciones = { method: 'GET', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } };
      if (ctl) opciones.signal = ctl.signal;
      return conLimite(Promise.resolve(f(url, opciones)), ms).then(function (resp) {
        if (!resp || !resp.ok) return null;
        return conLimite(Promise.resolve(resp.json()), ms).then(normalizarEstadoPrueba);
      });
    }).catch(function () { if (ctl) { try { ctl.abort(); } catch (e) { /* ya terminó */ } } return null; });
  }

  // ¿Se le puede ofrecer la prueba? Solo si el servidor dice elegible:true, no ha elegido y no tiene plan.
  function puedeVerPrueba(estado, session) {
    return !!(estado && estado.elegible === true && !estado.elegida && pruebaPosible(session));
  }

  /* ───────────────────────── Quién ve qué ───────────────────────── */

  function edadEnDias(session, ahora) {
    var d = aFecha(session && session.createdAt);
    if (!d) return null;
    return (ahora.getTime() - d.getTime()) / 86400000;
  }

  function esCuentaNueva(createdAt, ahora, dias) {
    var d = aFecha(createdAt);
    if (!d) return false;
    return (ahora.getTime() - d.getTime()) < (dias || DIAS_CUENTA_NUEVA) * 86400000;
  }

  // 'admin' | 'nuevo' | 'retorno' | 'ninguno'
  function clasificar(o) {
    o = o || {};
    var session = o.session;
    var ahora = o.ahora instanceof Date ? o.ahora : new Date();
    if (!session) return 'ninguno';
    if (esAdmin(session)) return 'admin';
    var marcas = normalizarMarcas(o.marcas);
    var edad = edadEnDias(session, ahora);
    var nueva = esCuentaNueva(session.createdAt, ahora, DIAS_CUENTA_NUEVA) ||
      (!!o.welcome && (edad === null || edad <= DIAS_MAX_CON_WELCOME));
    if (nueva) return 'nuevo';
    if (!marcas.pruebaIntroVista && !marcas.retornoVisto && puedeVerPrueba(o.estado, session)) return 'retorno';
    return 'ninguno';
  }

  // Devuelve { tipo, pasos }. estado === undefined significa "aún no lo sé": la prueba queda como posible
  // y se decide al llegar a ese paso. estado === null significa "el servidor no respondió": sin prueba.
  function planificar(o) {
    o = o || {};
    var session = o.session;
    var marcas = normalizarMarcas(o.marcas);
    var tipo = clasificar(o);
    var pasos = [];
    if (tipo === 'nuevo') {
      // Con plan activo ya sale el modal de bienvenida VIP de club.js: no se duplica.
      if (!tienePlanActivo(session) && !marcas.bienvenidaVista) pasos.push('bienvenida');
      if (!marcas.nombreVisto && !tieneNombreCertificado(session)) pasos.push('nombre');
      // Premio de bienvenida (+100 XP): después del nombre y antes del recorrido. Si el servidor dice que ya se
      // reclamó (o la cuenta no aplica), la tarjeta no sale y la secuencia sigue.
      if (!marcas.premioVisto) pasos.push('premio');
      if (!marcas.tourVisto) pasos.push('tour');
      var hayPrueba = o.estado === undefined ? pruebaPosible(session) : puedeVerPrueba(o.estado, session);
      if (!marcas.pruebaIntroVista && hayPrueba) pasos.push('prueba');
    } else if (tipo === 'retorno') {
      pasos.push('retorno');
    }
    return { tipo: tipo, pasos: pasos };
  }

  // Pide el premio de bienvenida al servidor. pedir(ruta, metodo, cuerpo, ms) → Promise<{ok,status,datos}>.
  // Devuelve { estado, datos }:
  //   'nuevo'     → se acaba de dar el premio: hay que mostrar la tarjeta
  //   'ya'        → ya lo había reclamado: sin tarjeta, se marca como visto
  //   'no-aplica' → 400/403 (cuenta no nueva, admin…): sin tarjeta, se marca como visto
  //   'error'     → sin red / servidor caído / respuesta rara: sin tarjeta y NO se marca (se reintenta otro día)
  function reclamarPremioBienvenida(o) {
    o = o || {};
    if (typeof o.pedir !== 'function') return Promise.resolve({ estado: 'error', datos: null });
    return conLimite(Promise.resolve().then(function () { return o.pedir(RUTA_PREMIO_BIENVENIDA, 'POST', {}, o.timeoutMs || 8000); }), (o.timeoutMs || 8000) + 1000).then(function (r) {
      if (!r) return { estado: 'error', datos: null };
      if (r.status === 400 || r.status === 403) return { estado: 'no-aplica', datos: r.datos || null };
      if (!r.ok || !r.datos || typeof r.datos !== 'object' || r.datos.ok === false) return { estado: 'error', datos: null };
      if (r.datos.yaReclamado === true) return { estado: 'ya', datos: r.datos };
      return { estado: 'nuevo', datos: r.datos };
    }).catch(function () { return { estado: 'error', datos: null }; });
  }

  // Ejecuta las pantallas una a una. esperarLibre() devuelve false si no se pudo (entonces se corta y
  // se reanuda en la próxima visita); un paso que falla no traba a los demás; {detener:true} corta.
  function ejecutarSecuencia(pasos, mostrar, o) {
    o = o || {};
    var resultados = [];
    var i = 0;
    function siguiente() {
      if (i >= pasos.length || (o.cancelado && o.cancelado())) return Promise.resolve(resultados);
      var id = pasos[i++];
      return Promise.resolve().then(function () { return o.esperarLibre ? o.esperarLibre() : true; }).then(function (libre) {
        if (libre === false) { resultados.push({ id: id, estado: 'cancelado' }); i = pasos.length; return null; }
        var fn = mostrar && mostrar[id];
        if (typeof fn !== 'function') { resultados.push({ id: id, estado: 'omitido' }); return null; }
        return Promise.resolve().then(fn).then(function (r) {
          resultados.push({ id: id, estado: 'hecho', resultado: r });
          if (r && r.detener) i = pasos.length;
        }, function (e) {
          resultados.push({ id: id, estado: 'error', error: String((e && e.message) || e) });
        });
      }).then(function () { return o.pausa ? o.pausa() : null; }).then(siguiente);
    }
    return siguiente();
  }

  /* ───────────────────────── Contenido de las pantallas ───────────────────────── */

  // Diapositivas de la bienvenida. Si no hay prueba disponible, esa diapositiva se cambia por otra
  // para no prometer algo que no se va a ver.
  function diapositivas(o) {
    o = o || {};
    var nombre = limpiarNombre(o.nombre);
    var lista = [{
      tipo: 'portada', icono: 'badge-check', color: 'naranja', confeti: true,
      kicker: TEXTOS.bienvenida.kicker,
      titulo: TEXTOS.bienvenida.titulo,
      texto: (nombre ? nombre + ', ya' : 'Ya') + ' eres parte de la comunidad de fauna silvestre. Esto es lo que puedes hacer desde hoy:'
    }];
    if (o.incluirPrueba) {
      lista.push({ tipo: 'beneficio', icono: 'gift', color: 'naranja', titulo: 'Tu prueba gratuita', texto: 'Elige un curso de tu interés y empieza a aprender sin costo.' });
    } else {
      lista.push({ tipo: 'beneficio', icono: 'gamepad-2', color: 'naranja', titulo: 'Aprende a tu ritmo', texto: 'Cada clase trae video, preguntas y un juego al final para repasar lo aprendido.' });
    }
    lista.push(
      { tipo: 'beneficio', icono: 'graduation-cap', color: 'azul', titulo: 'Cursos de especialistas', texto: 'Fauna silvestre, apicultura, etología y más, con clases hechas por quienes trabajan en el campo.' },
      { tipo: 'beneficio', icono: 'award', color: 'verde', titulo: 'Certificados con folio verificable', texto: 'Al terminar un curso obtienes un certificado con un folio que cualquiera puede verificar.' },
      { tipo: 'beneficio', icono: 'radio', color: 'azul', titulo: 'Comunidad y sesiones en vivo', texto: 'Webinars con especialistas y una comunidad que comparte tu pasión por la fauna.' }
    );
    return lista;
  }

  // Pasos del recorrido sobre el menú lateral REAL de club.js (renderSidebar) y la cabecera del panel.
  function pasosTour(o) {
    o = o || {};
    var activo = !!o.planActivo;
    function enlace(archivo) {
      return ['#sidebar a[href="' + archivo + '"]', '.club-sidebar a[href$="' + archivo + '"]'];
    }
    return [
      { id: 'biblioteca', selectores: enlace('club-biblioteca.html'), menu: true,
        titulo: 'Tu biblioteca de cursos', texto: 'Aquí empiezas a aprender. Cada clase trae video, preguntas y un juego al final para repasar.' },
      { id: 'sesiones', selectores: enlace('club-sesiones.html'), menu: true,
        titulo: 'Webinars en vivo', texto: 'Consulta las fechas de las próximas sesiones en vivo con especialistas.' },
      { id: 'certificados', selectores: enlace('club-certificados.html'), menu: true,
        titulo: 'Mis certificados', texto: 'Al terminar un curso, tu certificado aparece aquí con un folio que cualquiera puede verificar.' },
      { id: 'logros', selectores: enlace('club-logros.html'), menu: true,
        titulo: 'Mis logros', texto: 'Gana logros y recompensas conforme avanzas en tus cursos.' },
      { id: 'foro', selectores: enlace('club-foro.html'), menu: true,
        titulo: 'Foro VIP', texto: 'La comunidad donde se comparten dudas y experiencias. Se abre con la membresía.' },
      { id: 'perfil', selectores: enlace('club-perfil.html'), menu: true,
        titulo: 'Mi perfil', texto: 'Revisa y actualiza tus datos personales.' },
      { id: 'suscripcion', selectores: enlace('club-suscripcion.html'), menu: true,
        titulo: 'Suscripción', texto: activo ? 'Aquí consultas el estado de tu plan y tus fechas.' : 'Aquí ves tu plan y puedes activar la membresía cuando quieras.' },
      { id: 'repetir', selectores: ['[data-tour-restart]'], menu: false,
        titulo: 'Repite esta guía', texto: 'Cuando quieras volver a ver este recorrido, toca este botón.' }
    ];
  }

  // Geometría del recorrido: hueco iluminado, sombras alrededor y posición de la tarjeta.
  function calcularLayoutTour(o) {
    var rect = o.rect, vw = o.vw, vh = o.vh, d = o.dialogo, movil = !!o.movil;
    var pad = 7, gap = 17;
    var left = clamp(rect.left - pad, 6, vw - 12);
    var top = clamp(rect.top - pad, 6, vh - 12);
    var right = clamp(rect.right + pad, 12, vw - 6);
    var bottom = clamp(rect.bottom + pad, 12, vh - 6);
    var width = Math.max(6, right - left);
    var height = Math.max(6, bottom - top);
    var dl, dt;
    if (movil) {
      dl = 12;
      dt = rect.top > vh / 2 ? 12 : Math.max(12, vh - d.height - 12);
    } else if (right + gap + d.width <= vw - 12) {
      dl = right + gap; dt = clamp(top, 12, Math.max(12, vh - d.height - 12));
    } else if (left - gap - d.width >= 12) {
      dl = left - gap - d.width; dt = clamp(top, 12, Math.max(12, vh - d.height - 12));
    } else if (bottom + gap + d.height <= vh - 12) {
      dl = clamp((left + right - d.width) / 2, 12, vw - d.width - 12); dt = bottom + gap;
    } else {
      dl = clamp((left + right - d.width) / 2, 12, vw - d.width - 12); dt = Math.max(12, top - gap - d.height);
    }
    return {
      hueco: { left: left, top: top, width: width, height: height },
      sombras: {
        arriba: { left: 0, top: 0, width: vw, height: top },
        izquierda: { left: 0, top: top, width: left, height: height },
        derecha: { left: right, top: top, width: Math.max(0, vw - right), height: height },
        abajo: { left: 0, top: bottom, width: vw, height: Math.max(0, vh - bottom) }
      },
      dialogo: { left: Math.round(dl), top: Math.round(dt) }
    };
  }

  /* ============================================================ */
  /* PANTALLAS (solo navegador)                                    */
  /* ============================================================ */

  var estado = { iniciado: false, bloqueos: 0, tourActivo: null, contexto: null };

  function pausa(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function reducirMovimiento() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function ico(nombre, tam) {
    try { return (window.ZOO_ICONOS && window.ZOO_ICONOS.svg(nombre, { size: tam || 24, trazo: 1.8 })) || ''; } catch (e) { return ''; }
  }
  function visible(el) {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    var st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity || 1) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }
  // Solo se revisa a lo ancho: el menú móvil cerrado vive fuera de la pantalla (a la izquierda). Lo que
  // quede abajo, dentro del menú o de la página, se acerca con scrollIntoView al mostrar el paso.
  function enPantalla(el) {
    var r = el.getBoundingClientRect();
    return r.right > 0 && r.left < window.innerWidth;
  }

  // Centra el elemento SOLO dentro de su contenedor con scroll más cercano (por ejemplo el menú lateral),
  // sin mover la página entera; si no hay contenedor, mueve la página. Sin animación: así el recuadro
  // de luz cae justo donde queda el elemento.
  function acercarElemento(el) {
    var re = el.getBoundingClientRect();
    var p = el.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      var oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) {
        var rp = p.getBoundingClientRect();
        if (re.top < rp.top + 8 || re.bottom > rp.bottom - 8) p.scrollTop += (re.top + re.height / 2) - (rp.top + rp.height / 2);
        return;
      }
      p = p.parentElement;
    }
    if (re.top < 10 || re.bottom > window.innerHeight - 10) window.scrollBy(0, re.top + re.height / 2 - window.innerHeight / 2);
  }

  // Modales de otras partes del panel (bienvenida VIP, aviso de webinar, etc.): hay que esperar a que cierren.
  var SELECTOR_AJENO = '#zoo-welcome-modal,.zoo-welcome-box,#zooWelcomeExplore,.webinar-popup-box,.webinar-popup-bg,' +
    '[role="dialog"],[aria-modal="true"],.course-detail-modal,#zoo-pay-waiting';
  function hayModalAjeno() {
    return Array.prototype.some.call(document.querySelectorAll(SELECTOR_AJENO), function (el) {
      return !el.closest('.zob,.zob-tour') && visible(el);
    });
  }

  // Espera a que no haya otro modal (dos revisiones seguidas) y la pestaña esté a la vista.
  function esperarLibre(maxMs) {
    var limite = maxMs > 0 ? maxMs : 120000;
    var t0 = Date.now();
    var quietos = 0;
    function vuelta() {
      if (Date.now() - t0 > limite) return Promise.resolve(false);
      if (document.visibilityState !== 'hidden' && !hayModalAjeno()) { quietos++; if (quietos >= 2) return Promise.resolve(true); }
      else quietos = 0;
      return pausa(350).then(vuelta);
    }
    return vuelta();
  }

  // Un miembro con plan activo que aún no ha visto los avisos VIP de club.js (modal de bienvenida y guía)
  // los va a ver en breve: se les da hasta 5 s para aparecer y luego esperarLibre() aguarda a que cierren.
  function esperarAvisosVip(session, uid, ls) {
    if (!tienePlanActivo(session)) return Promise.resolve();
    function visto(k) { try { return !!(ls && ls.getItem(k + uid)); } catch (e) { return false; } }
    if (visto('zoo_welcome_shown_') && visto('zoo_onboard_done_')) return Promise.resolve();
    var t0 = Date.now();
    function vuelta() {
      if (hayModalAjeno() || Date.now() - t0 > 5000) return Promise.resolve();
      return pausa(250).then(vuelta);
    }
    return vuelta();
  }

  var SELECTOR_ENFOCABLE = 'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

  // Ventana modal accesible: foco atrapado, Esc opcional, aria, devuelve el foco al cerrar.
  function abrirModal(cfg) {
    var previo = document.activeElement;
    var el = document.createElement('div');
    el.className = 'zob ' + (cfg.clase || '');
    if (cfg.id) el.id = cfg.id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    if (cfg.titulo) el.setAttribute('aria-labelledby', cfg.titulo);
    if (cfg.desc) el.setAttribute('aria-describedby', cfg.desc);
    el.innerHTML = cfg.html;
    document.body.appendChild(el);
    estado.bloqueos++;
    document.documentElement.classList.add('zob-lock');
    var cerrado = false;

    function enfocables() {
      return Array.prototype.filter.call(el.querySelectorAll(SELECTOR_ENFOCABLE), visible);
    }
    function alTeclear(ev) {
      if (cerrado) return;
      if (ev.key === 'Escape' && typeof cfg.onEsc === 'function') {
        ev.preventDefault(); ev.stopPropagation(); cfg.onEsc(); return;
      }
      if (ev.key !== 'Tab') return;
      var lista = enfocables();
      if (!lista.length) { ev.preventDefault(); return; }
      var primero = lista[0], ultimo = lista[lista.length - 1];
      var activo = document.activeElement;
      if (!el.contains(activo)) { ev.preventDefault(); primero.focus(); }
      else if (ev.shiftKey && activo === primero) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && activo === ultimo) { ev.preventDefault(); primero.focus(); }
    }
    function alEnfocarFuera(ev) {
      if (!cerrado && !el.contains(ev.target) && !ev.target.closest('.zob,.zob-tour')) {
        var lista = enfocables(); if (lista.length) lista[0].focus();
      }
    }
    document.addEventListener('keydown', alTeclear, true);
    document.addEventListener('focusin', alEnfocarFuera, true);

    var enfoque = cfg.enfoque ? el.querySelector(cfg.enfoque) : null;
    setTimeout(function () {
      if (cerrado) return;
      var destino = enfoque || enfocables()[0];
      if (destino) destino.focus({ preventScroll: true });
    }, 60);

    function cerrar() {
      if (cerrado) return;
      cerrado = true;
      document.removeEventListener('keydown', alTeclear, true);
      document.removeEventListener('focusin', alEnfocarFuera, true);
      function quitar() {
        el.remove();
        estado.bloqueos = Math.max(0, estado.bloqueos - 1);
        if (!estado.bloqueos) document.documentElement.classList.remove('zob-lock');
        if (previo && previo.isConnected && typeof previo.focus === 'function') { try { previo.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
      }
      if (reducirMovimiento()) quitar();
      else { el.classList.add('zob--saliendo'); setTimeout(quitar, 220); }
    }
    return { el: el, cerrar: cerrar, estaCerrado: function () { return cerrado; } };
  }

  function aviso(texto) {
    var t = document.createElement('div');
    t.className = 'zob zob-toast';
    t.setAttribute('role', 'status');
    t.textContent = texto;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('zob--saliendo'); setTimeout(function () { t.remove(); }, 260); }, 2600);
  }

  /* ── 1) Bienvenida con confeti y diapositivas ── */
  function mostrarBienvenida(ctx) {
    return new Promise(function (resolver) {
      var slides = diapositivas({ nombre: primerNombre(ctx.session), incluirPrueba: ctx.incluirPrueba });
      var total = slides.length;
      var autoMs = ctx.autoAvanceMs > 0 && !reducirMovimiento() ? ctx.autoAvanceMs : 0;
      var cur = -1, timer = null, termino = false;

      var puntos = slides.map(function (_, i) {
        return '<button type="button" class="zob-splash__dot" data-i="' + i + '" aria-label="Ir a la diapositiva ' + (i + 1) + ' de ' + total + '"></button>';
      }).join('');
      var modal = abrirModal({
        clase: 'zob-splash', titulo: 'zob-splash-titulo', desc: 'zob-splash-texto', enfoque: '[data-zob-sig]',
        onEsc: function () { terminar('saltar'); },
        html:
          '<div class="zob__fondo"></div>' +
          '<div class="zob__caja zob-splash__caja">' +
            '<div class="zob-splash__barra" aria-hidden="true"><span class="zob-splash__avance"></span></div>' +
            '<button type="button" class="zob__cerrar" data-zob-cerrar aria-label="Cerrar la bienvenida">' + ico('x', 18) + '</button>' +
            '<div class="zob-splash__confeti" aria-hidden="true"></div>' +
            '<div class="zob-splash__escena" aria-live="polite"></div>' +
            '<div class="zob-splash__nav">' +
              '<button type="button" class="zob-btn zob-btn--texto" data-zob-saltar>' + esc(TEXTOS.bienvenida.saltar) + '</button>' +
              '<div class="zob-splash__puntos" role="group" aria-label="Diapositivas">' + puntos + '</div>' +
              '<button type="button" class="zob-btn zob-btn--primario" data-zob-sig></button>' +
            '</div>' +
          '</div>'
      });
      var el = modal.el;
      var escena = el.querySelector('.zob-splash__escena');
      var avance = el.querySelector('.zob-splash__avance');
      var confeti = el.querySelector('.zob-splash__confeti');
      var botonSig = el.querySelector('[data-zob-sig]');
      var dots = Array.prototype.slice.call(el.querySelectorAll('.zob-splash__dot'));

      function lanzarConfeti() {
        if (reducirMovimiento()) { confeti.innerHTML = ''; return; }
        var colores = ['#C75402', '#037BC9', '#95A303', '#F2B134', '#E5E7E0'];
        var bits = '';
        for (var i = 0; i < 40; i++) {
          bits += '<span class="zob-splash__bit" style="--x:' + Math.round(Math.random() * 100) + '%;--d:' + (Math.random() * 0.9).toFixed(2) +
            's;--t:' + (2.4 + Math.random() * 1.6).toFixed(2) + 's;--r:' + Math.round(Math.random() * 720 - 360) + 'deg;--c:' + colores[i % colores.length] + '"></span>';
        }
        confeti.innerHTML = bits;
      }
      function pintar(i) {
        var s = slides[i];
        var cuerpo;
        if (s.tipo === 'portada') {
          cuerpo =
            '<img class="zob-splash__logo" src="../assets/img/logo/logo.jpg" alt="Zoorigen" width="84" height="84">' +
            '<p class="zob__kicker">' + esc(s.kicker) + '</p>' +
            '<h2 class="zob__titulo zob-splash__titulo" id="zob-splash-titulo">' + s.titulo + '</h2>' +
            '<p class="zob__texto" id="zob-splash-texto">' + esc(s.texto) + '</p>';
        } else {
          cuerpo =
            '<div class="zob__icono zob__icono--' + s.color + '">' + ico(s.icono, 34) + '</div>' +
            '<h2 class="zob__titulo zob-splash__titulo" id="zob-splash-titulo">' + esc(s.titulo) + '</h2>' +
            '<p class="zob__texto" id="zob-splash-texto">' + esc(s.texto) + '</p>';
        }
        escena.innerHTML = '<div class="zob-splash__slide">' + cuerpo + '</div>';
        if (s.confeti) lanzarConfeti(); else confeti.innerHTML = '';
        dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
        avance.style.width = (((i + 1) / total) * 100) + '%';
        botonSig.textContent = i >= total - 1 ? TEXTOS.bienvenida.ultimo : TEXTOS.bienvenida.siguiente;
      }
      function programar() {
        clearTimeout(timer);
        if (!autoMs || cur >= total - 1 || termino) return;
        timer = setTimeout(function () { ir(cur + 1); }, autoMs);
      }
      function detenerAuto() { autoMs = 0; clearTimeout(timer); }
      function ir(i) {
        if (termino) return;
        if (i > total - 1) { terminar('fin'); return; }
        cur = Math.max(0, i);
        pintar(cur);
        programar();
      }
      function terminar(como) {
        if (termino) return;
        termino = true;
        clearTimeout(timer);
        modal.cerrar();
        resolver({ como: como });
      }

      botonSig.addEventListener('click', function () { detenerAuto(); ir(cur + 1); });
      el.querySelector('[data-zob-saltar]').addEventListener('click', function () { terminar('saltar'); });
      el.querySelector('[data-zob-cerrar]').addEventListener('click', function () { terminar('saltar'); });
      dots.forEach(function (d) { d.addEventListener('click', function () { detenerAuto(); ir(parseInt(d.getAttribute('data-i'), 10)); }); });
      el.addEventListener('pointerenter', function () { clearTimeout(timer); });
      el.addEventListener('pointerleave', programar);
      // Quien navega con teclado (o toca la pantalla) lleva su propio ritmo: se apaga el avance automático.
      el.addEventListener('keydown', detenerAuto);
      el.addEventListener('touchstart', detenerAuto, { passive: true });
      ir(0);
    });
  }

  /* ── 2) Nombre del certificado ── */
  function mostrarNombre(ctx) {
    return new Promise(function (resolver) {
      var T = TEXTOS.nombre;
      var terminado = false;
      var modal = abrirModal({
        clase: 'zob-tarjeta', titulo: 'zob-nombre-titulo', desc: 'zob-nombre-texto', enfoque: '#zob-nombre-campo',
        onEsc: function () { omitir(); },
        html:
          '<div class="zob__fondo"></div>' +
          '<div class="zob__caja zob-tarjeta__caja">' +
            '<div class="zob__icono zob__icono--verde">' + ico('award', 32) + '</div>' +
            '<h2 class="zob__titulo" id="zob-nombre-titulo">' + esc(T.titulo) + '</h2>' +
            '<p class="zob__texto" id="zob-nombre-texto">' + esc(T.texto) + '</p>' +
            '<form class="zob-nombre__form" novalidate>' +
              '<label class="zob-sr" for="zob-nombre-campo">Nombre completo para tus certificados</label>' +
              '<input id="zob-nombre-campo" class="zob-campo" type="text" autocomplete="name" maxlength="' + NOMBRE_MAX + '" ' +
                'placeholder="' + esc(T.ejemplo) + '" value="' + esc(sugerirNombre(ctx.session)) + '" aria-describedby="zob-nombre-ayuda">' +
              '<div class="zob-nombre__ayuda" id="zob-nombre-ayuda" role="alert" aria-live="polite"></div>' +
              '<button type="submit" class="zob-btn zob-btn--primario zob-btn--ancho" data-zob-guardar>' + esc(T.guardar) + '</button>' +
              '<button type="button" class="zob-btn zob-btn--suave zob-btn--ancho" data-zob-omitir>' + esc(T.omitir) + '</button>' +
            '</form>' +
            '<p class="zob__pie">' + esc(T.pie) + '</p>' +
          '</div>'
      });
      var el = modal.el;
      var campo = el.querySelector('#zob-nombre-campo');
      var ayuda = el.querySelector('#zob-nombre-ayuda');
      var botonGuardar = el.querySelector('[data-zob-guardar]');
      var form = el.querySelector('form');

      function error(texto) {
        ayuda.textContent = texto || '';
        ayuda.classList.toggle('is-error', !!texto);
        if (texto) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
      }
      function omitir() {
        if (terminado) return;
        terminado = true; modal.cerrar(); resolver({ como: 'omitir' });
      }
      campo.addEventListener('input', function () {
        campo.removeAttribute('aria-invalid');
        ayuda.classList.remove('is-error');
        ayuda.textContent = avisoLongitud(campo.value);
      });
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (terminado || botonGuardar.disabled) return;
        var r = validarNombre(campo.value);
        if (!r.ok) { error(r.error); campo.focus(); return; }
        error('');
        botonGuardar.disabled = true; botonGuardar.textContent = 'Guardando...';
        guardarNombreCertificado({ nombre: r.valor, escribirRemoto: ctx.escribirRemoto }).then(function (g) {
          if (!g.ok) {
            botonGuardar.disabled = false; botonGuardar.textContent = T.guardar;
            error(g.error); campo.focus();
            return;
          }
          ctx.session.nombreCertificado = g.valor;
          terminado = true; modal.cerrar();
          aviso(T.guardado + ': ' + g.valor);
          resolver({ como: 'guardado', nombre: g.valor });
        });
      });
      el.querySelector('[data-zob-omitir]').addEventListener('click', omitir);
    });
  }

  /* ── 2b) Premio de bienvenida +100 XP (tarjeta hermana de "Curso completado") ── */
  // Si falta el módulo de la tarjeta o el de premios, ni siquiera se pide el premio (no se reclama algo que no se ve).
  function mostrarPremioBienvenida(ctx) {
    var tarjetas = ctx.tarjetas || (typeof window !== 'undefined' ? window.ZOO_CURSO_PREMIO : null);
    var pedir = ctx.pedirPremios || (typeof window !== 'undefined' && window.ZOO_PREMIOS ? window.ZOO_PREMIOS.pedir : null);
    if (!tarjetas || typeof tarjetas.mostrarBienvenida !== 'function' || typeof pedir !== 'function') return Promise.resolve({ como: 'sin-modulo', sinMarcar: true });
    return reclamarPremioBienvenida({ pedir: pedir }).then(function (r) {
      if (r.estado === 'error') return { como: 'error', sinMarcar: true };
      if (r.estado !== 'nuevo') return { como: r.estado };
      var info = tarjetas.calcularBienvenida ? tarjetas.calcularBienvenida(r.datos) : null;
      if (!info) return { como: 'sin-datos' };
      return Promise.resolve(tarjetas.mostrarBienvenida(info, { sinMembresia: !tienePlanActivo(ctx.session) })).then(function (v) {
        return { como: 'visto', cierre: v && v.como };
      });
    }).catch(function () { return { como: 'error', sinMarcar: true }; });
  }

  /* ── 4) Tarjetas de la prueba gratuita (miembro nuevo / miembro que vuelve) ── */
  function irAElegirCurso() { window.location.href = URL_ELEGIR_CURSO; }

  function mostrarTarjetaPrueba(ctx, modo) {
    return new Promise(function (resolver) {
      var retorno = modo === 'retorno';
      var T = retorno ? TEXTOS.retorno : TEXTOS.pruebaNuevo;
      var cuerpo = retorno
        ? '<p class="zob__texto" id="zob-prueba-texto">' + esc(T.texto) + '</p>' +
          '<ol class="zob-prueba__pasos">' + T.pasos.map(function (p, i) {
            return '<li><span class="zob-prueba__num" aria-hidden="true">' + (i + 1) + '</span><span>' + esc(p) + '</span></li>';
          }).join('') + '</ol>'
        : '<p class="zob__texto" id="zob-prueba-texto">' + esc(T.texto) + '</p>' +
          '<p class="zob__nota">' + esc(T.detalle) + '</p>';
      var terminado = false;
      var modal = abrirModal({
        clase: 'zob-tarjeta zob-prueba' + (retorno ? ' zob-prueba--retorno' : ''), titulo: 'zob-prueba-titulo', desc: 'zob-prueba-texto', enfoque: '[data-zob-elegir]',
        onEsc: function () { luego(); },
        html:
          '<div class="zob__fondo"></div>' +
          '<div class="zob__caja zob-tarjeta__caja">' +
            (retorno ? '<div class="zob-prueba__brillo" aria-hidden="true"></div>' : '') +
            '<div class="zob__icono zob__icono--naranja' + (retorno ? ' zob__icono--grande' : '') + '">' + ico('gift', retorno ? 40 : 32) + '</div>' +
            '<h2 class="zob__titulo" id="zob-prueba-titulo">' + esc(T.titulo) + '</h2>' +
            cuerpo +
            '<div class="zob-prueba__acciones">' +
              '<button type="button" class="zob-btn zob-btn--primario zob-btn--ancho" data-zob-elegir>' + esc(T.elegir) + '</button>' +
              '<button type="button" class="zob-btn zob-btn--suave zob-btn--ancho" data-zob-luego>' + esc(T.luego) + '</button>' +
            '</div>' +
          '</div>'
      });
      function luego() {
        if (terminado) return;
        terminado = true; modal.cerrar(); resolver({ como: 'luego' });
      }
      modal.el.querySelector('[data-zob-luego]').addEventListener('click', luego);
      modal.el.querySelector('[data-zob-elegir]').addEventListener('click', function () {
        if (terminado) return;
        terminado = true;
        // La marca se guarda antes de salir de la página (con un tope por si la red tarda).
        ctx.marcarYEsperar(retorno ? 'retornoVisto' : 'pruebaIntroVista').then(function () {
          modal.cerrar();
          resolver({ como: 'elegir', detener: true });
          if (typeof ctx.irAElegir === 'function') ctx.irAElegir(); else irAElegirCurso();
        });
      });
    });
  }

  /* ── 3) Recorrido con foco (MembershipTour de alintecfood, como módulo independiente) ── */
  function ZooTour(config) {
    this.config = config || {};
    this.pasos = this.config.pasos || [];
    this.activo = false;
    this.indice = -1;
    this.ancla = null;
    this.raiz = null;
    this.suspendido = false;
    this.fin = null;
    this.alAjustar = this.reposicionar.bind(this);
    this.alRedimensionar = this.redimensionar.bind(this);
    this.alTeclear = this.teclear.bind(this);
  }

  ZooTour.prototype.esMovil = function () {
    return window.matchMedia('(max-width:' + (this.config.puntoMovil || 900) + 'px)').matches;
  };

  ZooTour.prototype.construir = function () {
    if (this.raiz) return;
    var T = TEXTOS.tour;
    var raiz = document.createElement('div');
    raiz.className = 'zob-tour';
    raiz.setAttribute('aria-hidden', 'true');
    raiz.innerHTML =
      '<div class="zob-tour__sombra" data-sombra="arriba"></div><div class="zob-tour__sombra" data-sombra="izquierda"></div>' +
      '<div class="zob-tour__sombra" data-sombra="derecha"></div><div class="zob-tour__sombra" data-sombra="abajo"></div>' +
      '<div class="zob-tour__hueco" aria-hidden="true"></div><div class="zob-tour__guardia" aria-hidden="true"></div>' +
      '<section class="zob-tour__dialogo" role="dialog" aria-modal="true" aria-labelledby="zob-tour-titulo" aria-describedby="zob-tour-texto" tabindex="-1">' +
        '<div class="zob-tour__cabeza"><div class="zob-tour__marca"><span class="zob-tour__punto"></span><span>' + esc(T.marca) + '</span></div>' +
        '<button type="button" class="zob-tour__omitir" data-tour-omitir>' + esc(T.omitir) + '</button></div>' +
        '<div class="zob-tour__progreso"><div class="zob-tour__pista"><div class="zob-tour__barra"></div></div><span class="zob-tour__cuenta"></span></div>' +
        '<h2 class="zob-tour__titulo" id="zob-tour-titulo"></h2>' +
        '<p class="zob-tour__texto" id="zob-tour-texto"></p>' +
        '<div class="zob-tour__acciones"><button type="button" class="zob-tour__boton zob-tour__boton--atras" data-tour-atras>' + esc(T.anterior) + '</button>' +
        '<button type="button" class="zob-tour__boton zob-tour__boton--sig" data-tour-sig>' + esc(T.siguiente) + '</button></div>' +
      '</section>';
    document.body.appendChild(raiz);
    this.raiz = raiz;
    this.dialogo = raiz.querySelector('.zob-tour__dialogo');
    this.hueco = raiz.querySelector('.zob-tour__hueco');
    this.guardia = raiz.querySelector('.zob-tour__guardia');
    this.titulo = raiz.querySelector('.zob-tour__titulo');
    this.texto = raiz.querySelector('.zob-tour__texto');
    this.cuenta = raiz.querySelector('.zob-tour__cuenta');
    this.barra = raiz.querySelector('.zob-tour__barra');
    this.botonAtras = raiz.querySelector('[data-tour-atras]');
    this.botonSig = raiz.querySelector('[data-tour-sig]');
    raiz.querySelector('[data-tour-omitir]').addEventListener('click', this.terminar.bind(this, true));
    this.botonAtras.addEventListener('click', this.anterior.bind(this));
    this.botonSig.addEventListener('click', this.siguiente.bind(this));
  };

  ZooTour.prototype.fijarMenu = function (abrir) {
    if (!this.esMovil()) return Promise.resolve();
    var barra = document.getElementById('sidebar');
    if (!barra) return Promise.resolve();
    var abierto = barra.classList.contains('is-open');
    if (abrir && !abierto) {
      if (typeof window.__zooOpenSidebar === 'function') window.__zooOpenSidebar();
      else { barra.classList.add('is-open'); document.body.classList.add('sidebar-open'); }
      return pausa(reducirMovimiento() ? 60 : 340);
    }
    if (!abrir && abierto) {
      if (typeof window.__zooCloseSidebar === 'function') window.__zooCloseSidebar();
      else { barra.classList.remove('is-open'); document.body.classList.remove('sidebar-open'); }
      return pausa(80);
    }
    return Promise.resolve();
  };

  ZooTour.prototype.buscarAncla = function (paso) {
    var hallada = null;
    (paso.selectores || []).some(function (sel) {
      return Array.prototype.some.call(document.querySelectorAll(sel), function (el) {
        if (!visible(el) || !enPantalla(el)) return false;
        hallada = el; return true;
      });
    });
    return hallada;
  };

  ZooTour.prototype.iniciar = function () {
    var self = this;
    return new Promise(function (resolver) {
      if (self.activo || !self.pasos.length) { resolver({ como: 'omitido' }); return; }
      self.fin = resolver;
      self.construir();
      self.activo = true;
      self.suspendido = false;
      self.foco = document.activeElement;
      self.scrollPagina = window.pageYOffset || 0;
      var menu = document.getElementById('sidebar');
      self.scrollMenu = menu ? menu.scrollTop : 0;
      self.raiz.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('zob-tour-abierto');
      window.addEventListener('resize', self.alRedimensionar, { passive: true });
      window.addEventListener('scroll', self.alAjustar, { passive: true, capture: true });
      document.addEventListener('keydown', self.alTeclear, true);
      clearInterval(self.vigilante);
      self.vigilante = setInterval(self.revisarBloqueos.bind(self), 400);
      self.mostrar(0, 1);
    });
  };

  // Si otro modal aparece mientras corre el recorrido, se oculta y se reanuda al cerrarse.
  ZooTour.prototype.revisarBloqueos = function () {
    if (!this.activo) { clearInterval(this.vigilante); return; }
    var bloqueado = hayModalAjeno();
    if (bloqueado && !this.suspendido) {
      this.suspendido = true;
      this.raiz.style.display = 'none';
      this.raiz.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('zob-tour-abierto');
    } else if (!bloqueado && this.suspendido) {
      this.suspendido = false;
      this.raiz.style.display = '';
      this.raiz.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('zob-tour-abierto');
      this.mostrar(Math.max(0, this.indice), 1);
    }
  };

  ZooTour.prototype.mostrar = function (indice, direccion) {
    var self = this;
    if (!this.activo || this.suspendido) return Promise.resolve();
    var token = (this.token = (this.token || 0) + 1);
    function buscar(i) {
      if (i < 0 || i >= self.pasos.length) return Promise.resolve({ i: i, ancla: null });
      return self.fijarMenu(!!self.pasos[i].menu).then(function () {
        var ancla = self.buscarAncla(self.pasos[i]);
        return ancla ? { i: i, ancla: ancla } : buscar(i + direccion);
      });
    }
    return buscar(indice).then(function (r) {
      if (token !== self.token || !self.activo) return;
      if (!r.ancla) { self.terminar(true); return; }
      self.indice = r.i;
      self.ancla = r.ancla;
      acercarElemento(r.ancla);
      return Promise.resolve().then(function () {
        if (token !== self.token || !self.activo) return;
        var paso = self.pasos[self.indice];
        var T = TEXTOS.tour;
        self.titulo.textContent = paso.titulo;
        self.texto.textContent = paso.texto;
        self.cuenta.textContent = T.paso.replace('{n}', self.indice + 1).replace('{total}', self.pasos.length);
        self.barra.style.width = (((self.indice + 1) / self.pasos.length) * 100) + '%';
        self.botonAtras.disabled = self.indice === 0;
        self.botonSig.textContent = self.indice === self.pasos.length - 1 ? T.finalizar : T.siguiente;
        self.reposicionar();
        self.botonSig.focus({ preventScroll: true });
      });
    });
  };

  ZooTour.prototype.siguiente = function () {
    if (this.indice >= this.pasos.length - 1) this.terminar(true); else this.mostrar(this.indice + 1, 1);
  };
  ZooTour.prototype.anterior = function () { if (this.indice > 0) this.mostrar(this.indice - 1, -1); };

  ZooTour.prototype.reposicionar = function () {
    if (!this.activo || !this.ancla || !visible(this.ancla)) return;
    this.dialogo.style.left = '12px'; this.dialogo.style.top = '12px';
    var dr = this.dialogo.getBoundingClientRect();
    var lay = calcularLayoutTour({
      rect: this.ancla.getBoundingClientRect(), vw: window.innerWidth, vh: window.innerHeight,
      dialogo: { width: dr.width, height: dr.height }, movil: this.esMovil()
    });
    function poner(el, g) { el.style.left = g.left + 'px'; el.style.top = g.top + 'px'; el.style.width = g.width + 'px'; el.style.height = g.height + 'px'; }
    // Las sombras de la derecha y de abajo llegan al borde con CSS (right/bottom: 0), así no dependen
    // del alto exacto de la ventana (barras del navegador que aparecen o se esconden).
    Array.prototype.forEach.call(this.raiz.querySelectorAll('[data-sombra]'), function (el) {
      var nombre = el.getAttribute('data-sombra');
      var g = lay.sombras[nombre];
      el.style.left = g.left + 'px'; el.style.top = g.top + 'px';
      if (nombre === 'arriba') el.style.height = g.height + 'px';
      else if (nombre === 'izquierda') { el.style.width = g.width + 'px'; el.style.height = g.height + 'px'; }
      else if (nombre === 'derecha') el.style.height = g.height + 'px';
    });
    poner(this.hueco, lay.hueco);
    poner(this.guardia, lay.hueco);
    this.dialogo.style.left = lay.dialogo.left + 'px';
    this.dialogo.style.top = lay.dialogo.top + 'px';
  };

  ZooTour.prototype.redimensionar = function () {
    var self = this;
    clearTimeout(this.tRedim);
    this.tRedim = setTimeout(function () { if (self.activo) self.mostrar(self.indice < 0 ? 0 : self.indice, 1); }, 140);
  };

  ZooTour.prototype.teclear = function (ev) {
    if (!this.activo || this.suspendido) return;
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.terminar(true); return; }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); this.siguiente(); return; }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); this.anterior(); return; }
    if (ev.key !== 'Tab') return;
    var lista = Array.prototype.filter.call(this.dialogo.querySelectorAll('button:not([disabled])'), visible);
    if (!lista.length) { ev.preventDefault(); this.dialogo.focus(); return; }
    var primero = lista[0], ultimo = lista[lista.length - 1];
    if (!this.dialogo.contains(document.activeElement)) { ev.preventDefault(); primero.focus(); }
    else if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
  };

  ZooTour.prototype.terminar = function (completo) {
    var self = this;
    if (!this.activo) return Promise.resolve();
    this.activo = false;
    this.suspendido = false;
    this.token = (this.token || 0) + 1;
    clearInterval(this.vigilante);
    this.raiz.style.display = '';
    this.raiz.setAttribute('aria-hidden', 'true');
    this.ancla = null;
    document.documentElement.classList.remove('zob-tour-abierto');
    window.removeEventListener('resize', this.alRedimensionar);
    window.removeEventListener('scroll', this.alAjustar, true);
    document.removeEventListener('keydown', this.alTeclear, true);
    return this.fijarMenu(false).then(function () {
      try {
        var menu = document.getElementById('sidebar');
        if (menu) menu.scrollTop = self.scrollMenu || 0;
        window.scrollTo(0, self.scrollPagina || 0);
      } catch (e) { /* sin scroll */ }
      if (self.foco && self.foco.isConnected && typeof self.foco.focus === 'function') { try { self.foco.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
      if (self.raiz) { self.raiz.remove(); self.raiz = null; }
      var cb = self.fin; self.fin = null;
      if (cb) cb({ como: completo ? 'fin' : 'omitido' });
    });
  };

  function correrRecorrido(ctx) {
    if (estado.tourActivo && estado.tourActivo.activo) return Promise.resolve({ como: 'en-curso' });
    var tour = new ZooTour({ pasos: pasosTour({ planActivo: tienePlanActivo(ctx.session) }), puntoMovil: 900 });
    estado.tourActivo = tour;
    return tour.iniciar();
  }

  /* ── Botón para repetir la guía ── */
  function instalarBotonRepetir(ctx) {
    var cont = document.querySelector('.dashboard-header-actions');
    if (!cont || cont.querySelector('[data-tour-restart]')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'zob-repetir';
    b.setAttribute('data-tour-restart', '');
    b.setAttribute('aria-label', TEXTOS.tour.repetir);
    b.title = TEXTOS.tour.repetir;
    b.innerHTML = ico('circle-help', 18);
    var guia = document.getElementById('guideBtn');
    if (guia && guia.parentNode === cont) cont.insertBefore(b, guia.nextSibling); else cont.insertBefore(b, cont.firstChild);
    b.addEventListener('click', function () {
      if (estado.tourActivo && estado.tourActivo.activo) return;
      if (hayModalAjeno() || document.querySelector('.zob')) return;
      correrRecorrido(ctx);
    });
  }

  /* ── Orquestador ── */
  function leerParametroWelcome() {
    try { return new URLSearchParams(window.location.search).has('welcome'); } catch (e) { return false; }
  }
  function limpiarParametroWelcome() {
    try {
      var u = new URL(window.location.href);
      if (u.searchParams.has('welcome')) { u.searchParams.delete('welcome'); window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash); }
    } catch (e) { /* sin historial */ }
  }

  function resolverEstadoPrueba(o, session) {
    var origen = o.estadoPrueba;
    if (origen !== undefined) {
      return Promise.resolve().then(function () { return typeof origen === 'function' ? origen() : origen; })
        .then(function (v) { return v ? normalizarEstadoPrueba(v) : null; }, function () { return null; });
    }
    return pedirEstadoPrueba({
      timeoutMs: o.timeoutPruebaMs || 4000,
      url: o.urlPrueba,
      fetchFn: o.fetchFn,
      getToken: function () {
        var a = o.auth || window.auth || (window.firebase && window.firebase.auth && window.firebase.auth());
        var u = a && a.currentUser;
        return u ? u.getIdToken() : null;
      }
    });
  }

  // iniciar({ session, uid, estadoPrueba, db, welcome, ... })
  //   estadoPrueba: objeto del servidor, promesa, función, o undefined (entonces lo pide solo).
  function iniciar(o) {
    o = o || {};
    var session = o.session;
    if (!session || esAdmin(session)) return Promise.resolve({ tipo: session ? 'admin' : 'ninguno', pasos: [], resultados: [] });
    if (estado.iniciado && !o.forzarReinicio) return Promise.resolve({ tipo: 'ninguno', pasos: [], resultados: [], yaIniciado: true });
    estado.iniciado = true;

    var uid = String(o.uid || session.uid || '');
    if (!uid) return Promise.resolve({ tipo: 'ninguno', pasos: [], resultados: [] });
    var base = o.db || window.db;
    var ref = base && base.collection ? base.collection('miembros').doc(uid) : null;
    var welcome = o.welcome !== undefined ? !!o.welcome : leerParametroWelcome();
    var ahora = o.ahora instanceof Date ? o.ahora : new Date();
    var ls = null;
    try { ls = o.almacenamiento || window.localStorage; } catch (e) { ls = null; }

    var almacen = crearAlmacen({
      uid: uid, ls: ls, ahora: function () { return new Date(); },
      leerRemoto: ref ? function () { return ref.get().then(function (d) { return d && d.exists ? d.data() : {}; }); } : null,
      escribirRemoto: ref ? function (obj) { return ref.set(obj, { merge: true }); } : null
    });
    var ctx = {
      session: session,
      autoAvanceMs: o.autoAvanceMs !== undefined ? o.autoAvanceMs : 7000,
      incluirPrueba: false,
      escribirRemoto: ref ? function (obj) { return ref.set(obj, { merge: true }); } : null,
      marcarYEsperar: function (id) {
        return conLimite(almacen.marcar(id), 1500).catch(function () { return false; });
      },
      irAElegir: o.irAElegir,
      pedirPremios: o.pedirPremios,   // pruebas: sustituye a ZOO_PREMIOS.pedir
      tarjetas: o.tarjetas            // pruebas: sustituye a ZOO_CURSO_PREMIO
    };
    estado.contexto = ctx;
    instalarBotonRepetir(ctx);

    return almacen.cargar().then(function (carga) {
      if (carga.datos && typeof carga.datos.nombreCertificado === 'string' && !session.nombreCertificado) session.nombreCertificado = carga.datos.nombreCertificado;
      var marcas = almacen.marcas();
      var tipoPrevio = clasificar({ session: session, marcas: marcas, welcome: welcome, ahora: ahora, estado: undefined });
      // Un miembro antiguo solo entra si pudimos leer sus marcas (si no, no arriesgamos a repetir la tarjeta).
      var estadoP = null;
      if (tipoPrevio === 'nuevo' && pruebaPosible(session) && !marcas.pruebaIntroVista) {
        // El miembro nuevo no espera de más: si el servidor tarda, esta vez no se le ofrece la prueba
        // (queda pendiente y se le ofrece en su próxima visita).
        estadoP = conLimite(resolverEstadoPrueba(o, session), o.esperaPruebaNuevoMs || 2500).catch(function () { return null; });
      } else if (tipoPrevio !== 'nuevo' && carga.remotoOk && pruebaPosible(session) && !marcas.pruebaIntroVista && !marcas.retornoVisto) {
        estadoP = resolverEstadoPrueba(o, session);
      }
      return Promise.resolve(estadoP).then(function (est) {
        var plan = planificar({ session: session, marcas: marcas, welcome: welcome, ahora: ahora, estado: est === undefined ? null : est });
        if (plan.tipo === 'retorno' && !carga.remotoOk) plan = { tipo: 'ninguno', pasos: [] };
        if (!plan.pasos.length) return { tipo: plan.tipo, pasos: [], resultados: [] };
        ctx.incluirPrueba = plan.pasos.indexOf('prueba') !== -1;
        limpiarParametroWelcome();
        var inicioMs = o.inicioMs !== undefined ? o.inicioMs : (tienePlanActivo(session) ? 2600 : 900);

        var mostrar = {
          bienvenida: function () { return mostrarBienvenida(ctx).then(function (r) { return almacen.marcar('bienvenidaVista').then(function () { return r; }); }); },
          nombre: function () { return mostrarNombre(ctx).then(function (r) { return almacen.marcar('nombreVisto').then(function () { return r; }); }); },
          premio: function () {
            return mostrarPremioBienvenida(ctx).then(function (r) { return (r && r.sinMarcar ? Promise.resolve() : almacen.marcar('premioVisto')).then(function () { return r; }); });
          },
          tour: function () { return correrRecorrido(ctx).then(function (r) { return (r && r.como === 'en-curso' ? Promise.resolve() : almacen.marcar('tourVisto')).then(function () { return r; }); }); },
          prueba: function () {
            return mostrarTarjetaPrueba(ctx, 'nuevo').then(function (r) { return almacen.marcar('pruebaIntroVista').then(function () { return r; }); });
          },
          retorno: function () {
            return mostrarTarjetaPrueba(ctx, 'retorno').then(function (r) { return almacen.marcar('retornoVisto').then(function () { return r; }); });
          }
        };
        return pausa(inicioMs).then(function () { return esperarAvisosVip(session, uid, ls); }).then(function () {
          return ejecutarSecuencia(plan.pasos, mostrar, {
            esperarLibre: function () { return esperarLibre(o.esperaMaxMs); },
            pausa: function () { return pausa(o.entrePasosMs !== undefined ? o.entrePasosMs : 350); }
          });
        }).then(function (resultados) { return { tipo: plan.tipo, pasos: plan.pasos, resultados: resultados }; });
      });
    }).catch(function (e) {
      try { console.warn('[onboarding] no se pudo iniciar:', e); } catch (_) { /* sin consola */ }
      return { tipo: 'ninguno', pasos: [], resultados: [], error: String((e && e.message) || e) };
    });
  }

  function repetirRecorrido() {
    if (!estado.contexto) return Promise.resolve({ como: 'sin-contexto' });
    return correrRecorrido(estado.contexto);
  }

  return {
    MARCAS: MARCAS, TEXTOS: TEXTOS, NOMBRE_MIN: NOMBRE_MIN, NOMBRE_MAX: NOMBRE_MAX, URL_ELEGIR_CURSO: URL_ELEGIR_CURSO,
    // lógica pura
    aFecha: aFecha, esAdmin: esAdmin, tienePlanActivo: tienePlanActivo, haPagadoAlgunaVez: haPagadoAlgunaVez, pruebaPosible: pruebaPosible,
    validarNombre: validarNombre, capitalizarNombre: capitalizarNombre, avisoLongitud: avisoLongitud, sugerirNombre: sugerirNombre, primerNombre: primerNombre,
    normalizarMarcas: normalizarMarcas, fusionarMarcas: fusionarMarcas, hayMarcas: hayMarcas, crearAlmacen: crearAlmacen,
    guardarNombreCertificado: guardarNombreCertificado,
    normalizarEstadoPrueba: normalizarEstadoPrueba, pedirEstadoPrueba: pedirEstadoPrueba, puedeVerPrueba: puedeVerPrueba,
    esCuentaNueva: esCuentaNueva, clasificar: clasificar, planificar: planificar, ejecutarSecuencia: ejecutarSecuencia,
    reclamarPremioBienvenida: reclamarPremioBienvenida, mostrarPremioBienvenida: mostrarPremioBienvenida, RUTA_PREMIO_BIENVENIDA: RUTA_PREMIO_BIENVENIDA,
    diapositivas: diapositivas, pasosTour: pasosTour, calcularLayoutTour: calcularLayoutTour,
    // pantallas
    iniciar: iniciar, repetirRecorrido: repetirRecorrido
  };
});
