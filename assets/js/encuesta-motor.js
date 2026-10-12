/* ============================================================ */
/* ENCUESTA DE LA PORTADA · MOTOR (lógica pura)                  */
/*                                                                */
/* Todo lo que no toca la pantalla vive aquí para probarlo en     */
/* Node (tests/encuesta-motor.test.js). La pantalla es            */
/* assets/js/encuesta-landing.js y el panel admin lee estas       */
/* mismas claves y etiquetas (assets/js/admin-encuesta.js).       */
/*                                                                */
/* Árbol de preguntas (claves exactas del contrato del servidor): */
/*   meta · p1 · origen · grupo · p2 · p2b · tamano · experiencia */
/*   · urgencia · freno                                           */
/* p2 depende de p1, p2b de p1+p2 y tamano solo existe para       */
/* "Personal de UMA o zoológico" y "Consultor ambiental".         */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_ENCUESTA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────────────────────── Constantes ───────────────────────── */

  // Claves que el servidor acepta en `respuestas` (mismo orden en que se preguntan).
  var CLAVES = ['meta', 'p1', 'origen', 'grupo', 'p2', 'p2b', 'tamano', 'experiencia', 'urgencia', 'freno'];
  var URGENTE = 'Lo antes posible';
  var AVISO_VERSION = 'zoo-aviso-2026-10';
  var PREF_KEY = 'zoo_curso_pref';
  var MAX_VALOR = 80;

  var PERFILES = ['Estudiante', 'Médico veterinario', 'Personal de UMA o zoológico', 'Consultor ambiental', 'Amante de la fauna'];
  var PERFILES_EMPRESA = ['Personal de UMA o zoológico', 'Consultor ambiental'];

  var COMUNES = {
    meta: {
      q: '¿Qué quieres lograr este año?',
      opts: ['Aprender desde cero sobre fauna silvestre', 'Especializarme en mi profesión', 'Cumplir trámites y normatividad', 'Certificarme y destacar en mi currículum']
    },
    p1: { q: '¿Tú eres...?', opts: PERFILES },
    origen: { q: '¿Cómo nos conociste?', opts: ['Redes sociales', 'Recomendación', 'Buscador', 'Otro'] },
    grupo: {
      q: '¿Qué fauna te interesa más?',
      opts: ['Mamíferos y felinos', 'Aves y rapaces', 'Reptiles y fauna ponzoñosa', 'Insectos y polinizadores', 'Vida marina', 'Fauna en general']
    },
    tamano: { q: '¿Cuántas personas trabajan contigo?', opts: ['Solo yo', '2 a 10', '11 a 50', 'Más de 50'] },
    experiencia: { q: '¿Ya tomaste cursos en línea?', opts: ['Sí, me gustan', 'Prefiero presencial', 'Es mi primera vez'] },
    urgencia: { q: '¿Cuándo te gustaría empezar?', opts: [URGENTE, 'En el próximo mes', 'Solo estoy explorando'] },
    freno: { q: '¿Qué te detiene hoy?', opts: ['Precio', 'Tiempo', 'No estoy seguro', 'Nada, listo'] }
  };

  // Primer nivel de reto: distinto por perfil.
  var RETOS = {
    'Estudiante': { q: '¿Tu meta es?', opts: ['Complementar mi carrera', 'Trabajar en campo', 'Elegir mi especialidad'] },
    'Médico veterinario': { q: '¿Tu reto hoy?', opts: ['Atender fauna silvestre', 'Normatividad', 'Bienestar en cautiverio'] },
    'Personal de UMA o zoológico': { q: '¿Qué buscas?', opts: ['Cumplir normas', 'Mejorar el manejo', 'Capacitar a mi equipo'] },
    'Consultor ambiental': { q: '¿Tu enfoque?', opts: ['Rescate y reubicación', 'Impacto ambiental', 'Monitoreo'] },
    'Amante de la fauna': { q: '¿Qué te mueve?', opts: ['Conocer animales', 'Ayudar a la fauna', 'Trabajar con fauna algún día'] }
  };

  // Segundo nivel: depende del perfil y del reto (15 preguntas distintas: es un árbol real).
  var PROFUNDIZACION = {
    'Estudiante': {
      'Complementar mi carrera': { q: '¿Qué área?', opts: ['Medicina zoológica', 'Manejo y bienestar', 'Conservación'] },
      'Trabajar en campo': { q: '¿Qué te falta?', opts: ['Técnicas de campo', 'Manejo seguro', 'Legislación y permisos'] },
      'Elegir mi especialidad': { q: '¿Qué te llama más?', opts: ['Clínica de fauna', 'Investigación', 'Gestión ambiental'] }
    },
    'Médico veterinario': {
      'Atender fauna silvestre': { q: '¿Con qué grupo?', opts: ['Mamíferos', 'Aves', 'Reptiles y exóticos'] },
      'Normatividad': { q: '¿Qué necesitas?', opts: ['Registro y UMA', 'Traslados y CITES', 'Bitácoras de ejemplares'] },
      'Bienestar en cautiverio': { q: '¿Dónde?', opts: ['Zoológico', 'Centro de rescate', 'Clínica propia'] }
    },
    'Personal de UMA o zoológico': {
      'Cumplir normas': { q: '¿Cuál?', opts: ['Informe anual', 'Registro de ejemplares', 'Permisos de traslado'] },
      'Mejorar el manejo': { q: '¿En qué?', opts: ['Bioseguridad y cuarentena', 'Enriquecimiento', 'Manejo seguro'] },
      'Capacitar a mi equipo': { q: '¿Qué nivel?', opts: ['Principiante', 'Intermedio', 'Avanzado'] }
    },
    'Consultor ambiental': {
      'Rescate y reubicación': { q: '¿Dónde?', opts: ['En obra', 'En campo abierto', 'En centro de acopio'] },
      'Impacto ambiental': { q: '¿En qué etapa?', opts: ['Diagnóstico', 'Mitigación', 'Seguimiento'] },
      'Monitoreo': { q: '¿Qué método?', opts: ['Fototrampeo', 'Aves bioindicadoras', 'Vectores y zoonosis'] }
    },
    'Amante de la fauna': {
      'Conocer animales': { q: '¿Cuáles?', opts: ['Felinos', 'Aves', 'Reptiles', 'Insectos'] },
      'Ayudar a la fauna': { q: '¿Cómo?', opts: ['Rescate', 'Conservación', 'Legislación básica'] },
      'Trabajar con fauna algún día': { q: '¿Por dónde empezar?', opts: ['Campo', 'Clínica', 'Normatividad'] }
    }
  };

  // Si cambia una respuesta de la que otras dependen, esas dependientes se borran.
  var DEPENDENCIAS = { p1: ['p2', 'p2b', 'tamano'], p2: ['p2b'] };

  // Nombre corto de cada pregunta (panel admin: abandono por pregunta).
  var ETIQUETAS_PREGUNTA = {
    meta: 'Qué quieren lograr',
    p1: 'Perfil',
    origen: 'Cómo nos conocieron',
    grupo: 'Fauna que les interesa',
    p2: 'Reto principal',
    p2b: 'Profundización del reto',
    tamano: 'Tamaño del equipo',
    experiencia: 'Cursos en línea',
    urgencia: 'Cuándo empezar',
    freno: 'Qué los detiene'
  };

  /* ───────────────────────── Árbol de pasos ───────────────────────── */

  function esTexto(v) { return typeof v === 'string' && v.length > 0; }
  function incluye(lista, v) { return lista.indexOf(v) !== -1; }
  function copia(o) { var r = {}; Object.keys(o || {}).forEach(function (k) { r[k] = o[k]; }); return r; }

  // Lista de pasos EN VIVO según lo ya respondido: p2, p2b y tamano solo existen cuando la
  // respuesta de la que dependen es válida. Cada paso: { clave, q, opts }.
  function obtenerPasos(respuestas) {
    var r = respuestas || {};
    var pasos = [];
    var agrega = function (clave, def) { pasos.push({ clave: clave, q: def.q, opts: def.opts.slice() }); };
    agrega('meta', COMUNES.meta);
    agrega('p1', COMUNES.p1);
    agrega('origen', COMUNES.origen);
    agrega('grupo', COMUNES.grupo);
    var p1 = r.p1;
    if (esTexto(p1) && RETOS[p1]) {
      agrega('p2', RETOS[p1]);
      var p2 = r.p2;
      if (esTexto(p2) && PROFUNDIZACION[p1] && PROFUNDIZACION[p1][p2]) agrega('p2b', PROFUNDIZACION[p1][p2]);
      if (incluye(PERFILES_EMPRESA, p1)) agrega('tamano', COMUNES.tamano);
    }
    agrega('experiencia', COMUNES.experiencia);
    agrega('urgencia', COMUNES.urgencia);
    agrega('freno', COMUNES.freno);
    return pasos;
  }

  // Cuántas preguntas tendrá el camino completo de esta persona (para "Pregunta 3 de 9").
  // Antes de saber el perfil se cuenta el camino más corto con reto y profundización (9);
  // las personas de UMA o consultoría tienen una más (tamaño del equipo).
  function totalPasos(respuestas) {
    var r = respuestas || {};
    return 9 + (esTexto(r.p1) && incluye(PERFILES_EMPRESA, r.p1) ? 1 : 0);
  }

  // Deja solo respuestas coherentes con el árbol: claves permitidas, valores que son una opción
  // real de su pregunta y, si una respuesta de la que dependen falta o no cuadra, se descartan.
  function sanearRespuestas(crudo) {
    var origen = crudo && typeof crudo === 'object' ? crudo : {};
    var r = {};
    CLAVES.forEach(function (clave) {
      var paso = obtenerPasos(r).filter(function (p) { return p.clave === clave; })[0];
      if (!paso) return;
      var v = origen[clave];
      if (esTexto(v) && incluye(paso.opts, v)) r[clave] = v;
    });
    return r;
  }

  // Aplica una respuesta: valida que sea opción del paso y borra las dependientes si cambió.
  // Devuelve un objeto NUEVO (no modifica el recibido).
  function aplicarRespuesta(respuestas, clave, valor) {
    var r = sanearRespuestas(respuestas);
    var paso = obtenerPasos(r).filter(function (p) { return p.clave === clave; })[0];
    if (!paso || !incluye(paso.opts, valor)) return r;
    if (r[clave] !== undefined && r[clave] !== valor) {
      (DEPENDENCIAS[clave] || []).forEach(function (k) { delete r[k]; });
    }
    r[clave] = valor;
    return sanearRespuestas(r);
  }

  // Índice del primer paso sin contestar (= pasos.length cuando ya terminó).
  function primerPasoPendiente(respuestas) {
    var r = sanearRespuestas(respuestas);
    var pasos = obtenerPasos(r);
    for (var i = 0; i < pasos.length; i++) if (r[pasos[i].clave] === undefined) return i;
    return pasos.length;
  }

  function estaCompleta(respuestas) {
    var r = sanearRespuestas(respuestas);
    return primerPasoPendiente(r) >= obtenerPasos(r).length;
  }

  // Paso al que se vuelve al retomar: el guardado, sin pasarse del primer pendiente.
  function pasoParaRetomar(respuestas, pasoGuardado) {
    var tope = primerPasoPendiente(respuestas);
    var n = Math.floor(Number(pasoGuardado));
    if (!isFinite(n) || n < 0) n = tope;
    return Math.min(n, tope);
  }

  // Última pregunta que contestó según el orden del flujo (clave) o null.
  function ultimaRespondida(respuestas) {
    var r = respuestas && typeof respuestas === 'object' ? respuestas : {};
    for (var i = CLAVES.length - 1; i >= 0; i--) if (esTexto(r[CLAVES[i]])) return CLAVES[i];
    return null;
  }

  function etiquetaAbandono(respuestas) {
    var k = ultimaRespondida(respuestas);
    return k ? ETIQUETAS_PREGUNTA[k] : null;
  }

  // Respuestas listas para enviar: solo claves permitidas y textos de 1 a 80 caracteres.
  function limpiarParaEnvio(respuestas) {
    var r = respuestas && typeof respuestas === 'object' ? respuestas : {};
    var salida = {};
    CLAVES.forEach(function (k) {
      var v = r[k];
      if (typeof v !== 'string') return;
      v = v.replace(/\s+/g, ' ').trim();
      if (v.length >= 1 && v.length <= MAX_VALOR) salida[k] = v;
    });
    return salida;
  }

  /* ───────────────────────── WhatsApp ───────────────────────── */

  var PAISES = [
    { cod: 'MX', nombre: 'México', pref: '52' },
    { cod: 'CO', nombre: 'Colombia', pref: '57' },
    { cod: 'AR', nombre: 'Argentina', pref: '54' },
    { cod: 'CL', nombre: 'Chile', pref: '56' },
    { cod: 'PE', nombre: 'Perú', pref: '51' },
    { cod: 'EC', nombre: 'Ecuador', pref: '593' },
    { cod: 'GT', nombre: 'Guatemala', pref: '502' },
    { cod: 'CR', nombre: 'Costa Rica', pref: '506' },
    { cod: 'PA', nombre: 'Panamá', pref: '507' },
    { cod: 'DO', nombre: 'Rep. Dominicana', pref: '1' },
    { cod: 'US', nombre: 'Estados Unidos', pref: '1' },
    { cod: 'ES', nombre: 'España', pref: '34' },
    { cod: 'OT', nombre: 'Otro país', pref: '' }
  ];

  // País que se preselecciona según el idioma del navegador (es-CO -> Colombia). Solo si el idioma
  // es español: un navegador en inglés no indica de dónde es la persona. Sin dato, México.
  function paisPorDefecto(idioma) {
    var m = /^es[-_]([A-Za-z]{2})\b/.exec(String(idioma || ''));
    var reg = m ? m[1].toUpperCase() : '';
    for (var i = 0; i < PAISES.length; i++) if (PAISES[i].cod === reg && reg !== 'OT') return reg;
    return 'MX';
  }

  // Números que casi seguro son inventados: todos iguales, patrones repetidos (1212121212) o
  // secuencias (1234567890). No puede comprobar que el número exista (eso solo se logra mandando un
  // código), pero descarta lo obvio.
  function esNumeroFalso(d) {
    d = String(d || '');
    if (d.length < 6) return true;
    for (var p = 1; p <= 5; p++) {
      if (d.length % p === 0) {
        var base = d.slice(0, p), rep = '';
        for (var i = 0; i < d.length / p; i++) rep += base;
        if (rep === d) return true;
      }
    }
    var subida = true, bajada = true;
    for (var j = 1; j < d.length; j++) {
      var dif = (Number(d[j]) - Number(d[j - 1]) + 10) % 10;
      if (dif !== 1) subida = false;
      if (dif !== 9) bajada = false;
    }
    return subida || bajada;
  }

  // Devuelve el número listo para guardar (código de país + número, solo dígitos) o null.
  function normalizarWhatsapp(codPais, crudo) {
    var d = String(crudo == null ? '' : crudo).replace(/\D/g, '');
    var pais = null;
    for (var i = 0; i < PAISES.length; i++) if (PAISES[i].cod === codPais) pais = PAISES[i];
    if (!pais) pais = PAISES[0];
    if (pais.cod === 'MX') {
      // México: 10 dígitos; acepta +52 o 521. La lada no puede empezar en 0 ni en 1.
      if (d.length === 13 && d.indexOf('521') === 0) d = d.slice(3);
      else if (d.length === 12 && d.indexOf('52') === 0) d = d.slice(2);
      if (d.length !== 10 || !/^[2-9]/.test(d) || esNumeroFalso(d)) return null;
      return '52' + d;
    }
    if (pais.cod === 'OT') {
      // Otro país: número completo con su código, de 8 a 15 dígitos (estándar internacional).
      if (d.length < 8 || d.length > 15 || d.charAt(0) === '0' || esNumeroFalso(d)) return null;
      return d;
    }
    // Resto: si escribieron también el código del país se quita; el número nacional tiene 7 a 11 dígitos.
    if (d.indexOf(pais.pref) === 0 && d.length >= pais.pref.length + 8) d = d.slice(pais.pref.length);
    if (d.length < 7 || d.length > 11 || d.charAt(0) === '0' || esNumeroFalso(d)) return null;
    var total = pais.pref + d;
    return total.length >= 8 && total.length <= 15 ? total : null;
  }

  /* ───────────────────────── Envío ───────────────────────── */

  // Cuerpo de POST /api/encuesta. `contacto` es el número ya normalizado (o null).
  function construirCuerpo(o) {
    var x = o || {};
    var cuerpo = {
      sessionId: String(x.sessionId || '').slice(0, 100),
      respuestas: limpiarParaEnvio(x.respuestas),
      completada: x.completada === true
    };
    if (x.contacto) {
      cuerpo.contacto = { numero: String(x.contacto).replace(/\D/g, ''), avisoAceptado: true, avisoVersion: x.avisoVersion || AVISO_VERSION };
    }
    return cuerpo;
  }

  // ¿Vale la pena reintentar con este código? (red caída, límite de solicitudes o fallo del servidor).
  // Un 400 o similar no mejora solo: se descarta para no reintentar sin fin.
  function esReintentable(status) {
    return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
  }

  var PEND_MAX = 8;
  var PEND_VIGENCIA_MS = 14 * 86400000;

  // Lista de pendientes tal como quedó en localStorage: solo elementos con forma válida, recientes y acotados.
  function sanearPendientes(lista, ahora) {
    var ts = Number.isFinite(ahora) ? ahora : Date.now();
    var salida = [];
    (Array.isArray(lista) ? lista : []).forEach(function (it) {
      if (!it || typeof it !== 'object' || !esTexto(it.id) || !esTexto(it.sid)) return;
      var t = Number(it.t);
      if (Number.isFinite(t) && ts - t > PEND_VIGENCIA_MS) return;
      var resp = limpiarParaEnvio(it.respuestas);
      if (!Object.keys(resp).length) return;
      var num = it.contacto ? String(it.contacto).replace(/\D/g, '') : '';
      if (num && (num.length < 8 || num.length > 15)) num = '';
      salida.push({ id: String(it.id).slice(0, 60), sid: String(it.sid).slice(0, 100), respuestas: resp, contacto: num || null, completada: it.completada !== false, t: Number.isFinite(t) ? t : ts });
    });
    return salida.slice(-PEND_MAX);
  }

  /* ───────────────────────── Reacciones del guía (texto) ───────────────────────── */

  // `expr` es el nombre de la expresión del personaje (la imagen es opcional y llega en la fase
  // de diseño); el texto siempre existe, así que la encuesta funciona sin imágenes.
  var MENSAJES_EXPR = {
    neutral: { titulo: 'Estoy aquí para ayudarte.', texto: 'Elige la opción que mejor te represente. No hay respuestas incorrectas.' },
    thinking: { titulo: 'Pensemos juntos.', texto: 'Esta respuesta me ayuda a entender mejor lo que necesitas.' },
    confused: { titulo: 'No pasa nada si aún dudas.', texto: 'Elige la opción más cercana; podremos afinarla después.' },
    concerned: { titulo: 'Entiendo esa dificultad.', texto: 'Buscaremos una alternativa práctica para ayudarte a avanzar.' },
    surprised: { titulo: '¡Esto es importante!', texto: 'Tu respuesta cambia la prioridad de la recomendación.' },
    happy: { titulo: '¡Buena elección!', texto: 'Ya puedo personalizar mejor tu recomendación.' },
    excited: { titulo: '¡Estamos listos!', texto: 'Tengo una recomendación preparada para ti.' }
  };

  var MENSAJE_INICIO = { expr: 'neutral', titulo: '¡Hola! Te ayudo a empezar.', texto: 'Son preguntas rápidas: toma menos de un minuto. Es una guía programada, no una persona.' };

  var REACCIONES = {
    origen: {
      'Redes sociales': { expr: 'happy', titulo: '¡Qué gusto encontrarte!', texto: 'Seguiremos compartiendo contenido útil también por ahí.' },
      'Recomendación': { expr: 'happy', titulo: '¡Gracias por la confianza!', texto: 'Nos alegra que alguien te haya recomendado Zoorigen.' },
      'Buscador': { expr: 'thinking', titulo: 'Llegaste al lugar indicado.', texto: 'Te ayudo a encontrar una ruta acorde con lo que buscabas.' },
      'Otro': { expr: 'neutral', titulo: 'Gracias por contármelo.', texto: 'Sigamos para conocer mejor lo que necesitas.' }
    },
    experiencia: {
      'Sí, me gustan': { expr: 'happy', titulo: '¡Perfecto!', texto: 'Podrás empezar a tu ritmo desde el primer día.' },
      'Prefiero presencial': { expr: 'concerned', titulo: 'Entiendo tu preferencia.', texto: 'Te mostraremos una experiencia en línea clara y práctica.' },
      'Es mi primera vez': { expr: 'surprised', titulo: '¡Bienvenido a esta experiencia!', texto: 'Te guiamos paso a paso para que empezar sea sencillo.' }
    },
    urgencia: {
      'Lo antes posible': { expr: 'surprised', titulo: 'Vamos a priorizarlo.', texto: 'Buscaremos cómo puedas comenzar cuanto antes.' },
      'En el próximo mes': { expr: 'thinking', titulo: 'Podemos planearlo bien.', texto: 'Tendrás tiempo de elegir con calma.' },
      'Solo estoy explorando': { expr: 'neutral', titulo: 'Explora con calma.', texto: 'Sin presión: mira las opciones y decide cuando quieras.' }
    },
    freno: {
      'Precio': { expr: 'concerned', titulo: 'El presupuesto importa.', texto: 'Por eso puedes conocer un curso con la prueba gratuita antes de decidir.' },
      'Tiempo': { expr: 'concerned', titulo: 'Sé que el tiempo es limitado.', texto: 'Los cursos son en línea y avanzas a tu ritmo.' },
      'No estoy seguro': { expr: 'confused', titulo: 'Es normal tener dudas.', texto: 'Con tus respuestas puedo darte una recomendación más clara.' },
      'Nada, listo': { expr: 'happy', titulo: '¡Entonces avancemos!', texto: 'Ya casi tengo lista una ruta para ti.' }
    }
  };

  // Reacción a una respuesta: { expr, titulo, texto }.
  function reaccion(clave, opcion) {
    var esp = REACCIONES[clave] && REACCIONES[clave][opcion];
    if (esp) return esp;
    var o = String(opcion || '');
    if (clave === 'meta') return { expr: 'happy', titulo: '¡Buen objetivo!', texto: 'Veamos cómo ayudarte a lograrlo.' };
    if (clave === 'p1') return { expr: 'happy', titulo: 'Perfecto, ya te ubico.', texto: 'Adapto las siguientes preguntas a tu perfil: ' + o.toLowerCase() + '.' };
    if (clave === 'grupo') return { expr: 'happy', titulo: 'Buena elección.', texto: 'Tomaré en cuenta ' + o.toLowerCase() + ' para recomendarte cursos.' };
    if (clave === 'tamano') return { expr: o === 'Más de 50' ? 'surprised' : 'thinking', titulo: 'Gracias, esto cambia la escala.', texto: 'Lo considero en tu recomendación.' };
    if (clave === 'p2' || clave === 'p2b') return { expr: 'thinking', titulo: 'Ya entiendo mejor tu reto.', texto: 'Tomaré en cuenta «' + o + '» para afinar tu recomendación.' };
    return { expr: 'happy', titulo: 'Respuesta guardada.', texto: 'Sigamos para completar tu recomendación.' };
  }

  // Mensaje que acompaña a una pregunta mientras no ha elegido.
  function mensajePregunta(paso, esPrimera) {
    if (esPrimera) return MENSAJE_INICIO;
    var expr = paso && (paso.clave === 'urgencia') ? 'surprised' : (paso && /^(p2|p2b|grupo|freno)$/.test(paso.clave) ? 'thinking' : 'neutral');
    var m = MENSAJES_EXPR[expr];
    return { expr: expr, titulo: m.titulo, texto: m.texto };
  }

  /* ───────────────────────── Resultado ───────────────────────── */

  var FORTALEZA_PERFIL = {
    'Estudiante': 'tus ganas de crecer',
    'Médico veterinario': 'tu vocación por cuidar a los animales',
    'Personal de UMA o zoológico': 'tu compromiso con el manejo responsable de la fauna',
    'Consultor ambiental': 'tu mirada de consultor ambiental',
    'Amante de la fauna': 'tu pasión por la fauna'
  };

  var TEMA_GRUPO = {
    'Mamíferos y felinos': 'mamíferos y felinos',
    'Aves y rapaces': 'aves y rapaces',
    'Reptiles y fauna ponzoñosa': 'reptiles y fauna ponzoñosa',
    'Insectos y polinizadores': 'insectos y polinizadores',
    'Vida marina': 'vida marina',
    'Fauna en general': 'fauna silvestre'
  };

  // Halagos: hablan de su actitud y de su momento, nunca de lo que "sabe" ni de su nivel.
  var HALAGO_EXPERIENCIA = {
    'Sí, me gustan': 'Te gusta aprender en línea, así que empezar es sencillo.',
    'Prefiero presencial': 'Valoras el trato cercano, y por eso te acompañamos paso a paso.',
    'Es mi primera vez': 'Es tu primera vez en línea y ya diste el paso: eso no lo hace cualquiera.'
  };
  var HALAGO_EQUIPO = 'Coordinar a un equipo grande exige compromiso, y se nota que te importa.';
  var HALAGO_URGENCIA = {
    'Lo antes posible': 'Decidir empezar ya habla de alguien que va en serio.',
    'En el próximo mes': 'Planear con calma es lo que hacen quienes llegan lejos.',
    'Solo estoy explorando': 'Explorar con curiosidad es el primer paso de quienes terminan destacando.'
  };
  var HALAGO_FRENO = {
    'Nada, listo': 'Y sin nada que te detenga, estás listo para dar el siguiente paso.',
    'Precio': 'Cuidas cada decisión, y por eso empiezas con una prueba gratuita antes de decidir.',
    'Tiempo': 'Y aun con poco tiempo piensas en crecer: eso se llama constancia.',
    'No estoy seguro': 'Y pensarlo bien antes de elegir es de quien se toma en serio su aprendizaje.'
  };
  // Cierre según la urgencia (qué hacer ahora).
  var CIERRE_URGENCIA = {
    'Lo antes posible': 'Elige un curso y empieza hoy tu prueba gratuita.',
    'En el próximo mes': 'Elige con calma el curso que más te llame; tu prueba gratuita te espera.',
    'Solo estoy explorando': 'Mira las opciones sin compromiso; cuando quieras, eliges tu curso de prueba.'
  };
  // Nota breve según el freno principal.
  var NOTA_FRENO = {
    'Precio': 'La prueba gratuita no tiene costo y no necesitas tarjeta.',
    'Tiempo': 'Avanzas a tu ritmo, sin horarios fijos.',
    'No estoy seguro': 'Tu prueba es de un solo curso: así conoces cómo aprendes con Zoorigen antes de decidir.',
    'Nada, listo': ''
  };

  // Textos del resultado. `titulo` va en partes para resaltar el tema.
  function textoResultado(respuestas) {
    var r = sanearRespuestas(respuestas);
    var fortaleza = FORTALEZA_PERFIL[r.p1] || 'tus ganas de aprender';
    var tema = TEMA_GRUPO[r.grupo] || null;
    var primera = r.tamano === 'Más de 50' ? HALAGO_EQUIPO : HALAGO_EXPERIENCIA[r.experiencia];
    var frases = [primera, HALAGO_URGENCIA[r.urgencia], HALAGO_FRENO[r.freno]].filter(Boolean);
    return {
      fortaleza: fortaleza,
      tema: tema,
      titulo: tema ? { antes: '¡Vas por muy buen camino en ', resalta: tema, despues: '!' } : { antes: '¡Estás listo para dar el siguiente paso!', resalta: '', despues: '' },
      halagos: frases.join(' ') || 'Tienes todo para empezar.',
      cierre: CIERRE_URGENCIA[r.urgencia] || 'Elige el curso que más te llame y empieza tu prueba gratuita.',
      nota: NOTA_FRENO[r.freno] || '',
      caliente: r.urgencia === URGENTE
    };
  }

  var PRUEBA = {
    etiqueta: 'GRATIS',
    antes: 'Comienza tu ',
    resalta: 'prueba gratuita',
    despues: ' con lo que buscas',
    detalle: 'Eliges un curso y ves todas sus clases menos la última, sin costo · Sin tarjeta · A tu ritmo'
  };

  /* ───────────────────────── Cursos recomendados ───────────────────────── */

  function sinAcentos(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // Palabras clave (sin acentos) por grupo de fauna y por respuesta de reto / profundización.
  var CLAVES_GRUPO = {
    'Mamíferos y felinos': /mamifer|felin|jaguar|puma|ocelote|\bleon|tigre|primate|murcielag|roedor|venado|carnivor|canid|\bfoca|nutria/,
    'Aves y rapaces': /\baves?\b|ornitolog|rapaz|rapaces|aguila|halcon|buho|colibri|guacamaya|\bloros?\b|plumas/,
    'Reptiles y fauna ponzoñosa': /reptil|serpient|vibora|ponzo|veneno|venen|tortug|lagart|cocodril|iguana|aracnid|escorpion|tarantul|herpet/,
    'Insectos y polinizadores': /insect|polin|abeja|apicol|apicult|colmena|mariposa|mariposario|entomolog|avispa|escarabaj/,
    'Vida marina': /marin|tiburon|raya|oceano|cetace|delfin|ballena|arrecife|acuatic|costero/,
    'Fauna en general': /fauna|silvestre|biodiversidad|vida silvestre|conservacion/
  };
  // Áreas del catálogo (normalizadas) que coinciden con un grupo: dan un punto extra.
  var AREAS_GRUPO = {
    'Reptiles y fauna ponzoñosa': ['fauna ponzonosa', 'fauna ponzonosa y toxicologia'],
    'Insectos y polinizadores': ['apicultura', 'apicultura y polinizacion'],
    'Fauna en general': ['fauna silvestre', 'fauna silvestre y conservacion', 'conservacion']
  };

  var RE_NORMA = /legisl|normativ|\bnom\b|\buma|\bumas\b|pimvs|cites|permiso|tramite|registro|lgvs|semarnat|profepa|bitacora|informe/;
  var RE_CLINICA = /clinic|medic|veterinar|salud|anestesi|ultrason|primeros auxilios|enfermedad|zoonosis/;
  var RE_MANEJO = /manejo|bienestar|enriquec|etolog|cautiverio|exhibicion|conducta|comportamiento/;
  var RE_CAMPO = /campo|fototramp|monitoreo|captura|muestreo|telemetr|rescate|observacion/;
  var RE_CONSERVA = /conservacion|biodiversidad|restaur|rescate|monitoreo|ecolog/;
  var RE_INVEST = /investig|cientific|metodolog|monitoreo|ultrason|forense/;
  var RE_AMBIENTAL = /ambient|impacto|conservacion|monitoreo|rescate|biodiversidad/;
  var RE_SANIDAD = /bioseguridad|cuarentena|sanidad|sanitari|zoonosis|higien|vector/;

  var CLAVES_TEMA = {
    'Medicina zoológica': { re: RE_CLINICA, razon: 'medicina zoológica' },
    'Manejo y bienestar': { re: RE_MANEJO, razon: 'manejo y bienestar' },
    'Conservación': { re: RE_CONSERVA, razon: 'conservación' },
    'Técnicas de campo': { re: RE_CAMPO, razon: 'técnicas de campo' },
    'Manejo seguro': { re: /manejo|captura|contenci|seguridad|inmoviliz|picadura|primer/, razon: 'manejo seguro' },
    'Legislación y permisos': { re: RE_NORMA, razon: 'legislación y permisos' },
    'Clínica de fauna': { re: RE_CLINICA, razon: 'clínica de fauna' },
    'Investigación': { re: RE_INVEST, razon: 'investigación' },
    'Gestión ambiental': { re: RE_AMBIENTAL, razon: 'gestión ambiental' },
    'Atender fauna silvestre': { re: /fauna silvestre|rescate|rehabilit|silvestre/, razon: 'atención de fauna silvestre' },
    'Normatividad': { re: RE_NORMA, razon: 'normatividad' },
    'Bienestar en cautiverio': { re: /cautiverio|bienestar|exhibicion|enriquec|zooingenieria/, razon: 'bienestar en cautiverio' },
    'Cumplir normas': { re: RE_NORMA, razon: 'cumplimiento de normas' },
    'Mejorar el manejo': { re: RE_MANEJO, razon: 'manejo' },
    'Capacitar a mi equipo': { re: /manejo|capacit|buenas practicas|integral/, razon: 'capacitación de tu equipo' },
    'Rescate y reubicación': { re: /rescate|reubic|translocac|rehabilit/, razon: 'rescate y reubicación' },
    'Impacto ambiental': { re: RE_AMBIENTAL, razon: 'impacto ambiental' },
    'Monitoreo': { re: /monitoreo|fototramp|muestreo|observacion|censo/, razon: 'monitoreo' },
    'Registro y UMA': { re: /\buma|\bumas\b|registro|pimvs|legisl|normativ/, razon: 'registro y UMA' },
    'Traslados y CITES': { re: /cites|traslado|permiso|legisl|normativ|transporte/, razon: 'traslados y CITES' },
    'Bitácoras de ejemplares': { re: /bitacora|registro|\buma|\bumas\b|inventario|ejemplar/, razon: 'bitácoras de ejemplares' },
    'Informe anual': { re: /informe|\buma|\bumas\b|pimvs|normativ/, razon: 'informe anual' },
    'Registro de ejemplares': { re: /registro|\buma|\bumas\b|ejemplar|bitacora/, razon: 'registro de ejemplares' },
    'Permisos de traslado': { re: /permiso|traslado|cites|legisl|normativ/, razon: 'permisos de traslado' },
    'Bioseguridad y cuarentena': { re: RE_SANIDAD, razon: 'bioseguridad' },
    'Enriquecimiento': { re: /enriquec|bienestar|etolog|comportamiento/, razon: 'enriquecimiento' },
    'Fototrampeo': { re: /fototramp|camara trampa|monitoreo/, razon: 'fototrampeo' },
    'Aves bioindicadoras': { re: /\baves?\b|bioindic|ornitolog/, razon: 'aves bioindicadoras' },
    'Vectores y zoonosis': { re: /vector|zoonosis|plaga|salud publica/, razon: 'vectores y zoonosis' },
    'Rescate': { re: /rescate|rehabilit/, razon: 'rescate' },
    'Legislación básica': { re: RE_NORMA, razon: 'legislación básica' },
    'Campo': { re: RE_CAMPO, razon: 'trabajo de campo' },
    'Clínica': { re: RE_CLINICA, razon: 'clínica' }
  };
  // Áreas (normalizadas) que respaldan un tema: punto extra si el área del curso coincide.
  var AREAS_TEMA = {
    'Manejo y bienestar': ['manejo de fauna en cautiverio y exhibicion', 'manejo en cautiverio', 'etologia y manejo animal', 'etologia'],
    'Bienestar en cautiverio': ['manejo de fauna en cautiverio y exhibicion', 'manejo en cautiverio'],
    'Conservación': ['fauna silvestre y conservacion', 'conservacion'],
    'Investigación': ['investigacion cientifica y monitoreo', 'investigacion'],
    'Monitoreo': ['investigacion cientifica y monitoreo', 'investigacion'],
    'Fototrampeo': ['investigacion cientifica y monitoreo', 'investigacion'],
    'Vectores y zoonosis': ['fauna ponzonosa y toxicologia', 'fauna ponzonosa']
  };
  var CLAVES_META_NORMA = RE_NORMA;
  var CLAVES_PERFIL = {
    'Médico veterinario': /veterinar|clinic|medic|salud|ultrason|primeros auxilios/,
    'Personal de UMA o zoológico': /\buma|\bumas\b|manejo|cautiverio|exhibicion|legisl|normativ/,
    'Consultor ambiental': /ambient|monitoreo|rescate|impacto|fototramp|conservacion/
  };

  function textoCurso(c) {
    return sinAcentos([c && c.titulo, c && c.area, c && c.descripcion].filter(Boolean).join(' '));
  }

  // Elige hasta `max` cursos del catálogo. Puntúa por grupo de fauna (+5 por texto, +2 si el área
  // coincide), profundización p2b (+6), reto p2 (+3), meta normativa (+2) y perfil (+1).
  // Entran los cursos que no son "próximamente"; los de 2 clases o más van primero (la prueba
  // gratuita necesita al menos 2). Si ninguno puntúa, se devuelven los primeros disponibles.
  // Solo se ofrecen como prueba gratuita los cursos con elegiblePrueba !== false (el servidor lo decide):
  // primero van los elegibles (por puntos) y, si faltan para llegar a `max`, se completa con los que no
  // lo son, marcados `elegible: false` (la pantalla los muestra como "Parte de la membresía", sin la
  // pregunta de prueba gratuita).
  // Cada resultado: { curso, razon, puntos, elegible }.
  function recomendarCursos(catalogo, respuestas, max) {
    var tope = max > 0 ? max : 3;
    var r = sanearRespuestas(respuestas);
    var lista = (Array.isArray(catalogo) ? catalogo : []).filter(function (c) {
      return c && c.id && c.titulo && !c.pronto && !c.proximamente;
    });
    var aptos = lista.filter(function (c) { return Number(c.clases) >= 2; });
    if (aptos.length) lista = aptos;
    var reGrupo = CLAVES_GRUPO[r.grupo] || null;
    var areasGrupo = AREAS_GRUPO[r.grupo] || [];
    var puntuados = lista.map(function (c, i) {
      var t = textoCurso(c);
      var area = sinAcentos(c.area);
      var pts = 0, razon = null;
      if (reGrupo && reGrupo.test(t)) { pts += 5; razon = razon || TEMA_GRUPO[r.grupo]; }
      if (areasGrupo.indexOf(area) !== -1) pts += 2;
      [['p2b', 6], ['p2', 3]].forEach(function (par) {
        var def = CLAVES_TEMA[r[par[0]]];
        if (!def) return;
        if (def.re.test(t)) { pts += par[1]; razon = razon || def.razon; }
        if ((AREAS_TEMA[r[par[0]]] || []).indexOf(area) !== -1) pts += 2;
      });
      if (r.meta === 'Cumplir trámites y normatividad' && CLAVES_META_NORMA.test(t)) { pts += 2; razon = razon || 'trámites y normatividad'; }
      if (CLAVES_PERFIL[r.p1] && CLAVES_PERFIL[r.p1].test(t)) pts += 1;
      return { curso: c, razon: razon, puntos: pts, i: i };
    });
    puntuados.sort(function (a, b) { return b.puntos - a.puntos || a.i - b.i; });
    var elegibles = puntuados.filter(function (p) { return p.curso.elegiblePrueba !== false; });
    var resto = puntuados.filter(function (p) { return p.curso.elegiblePrueba === false; });
    return elegibles.concat(resto).slice(0, tope).map(function (p) {
      return { curso: p.curso, razon: p.puntos > 0 ? p.razon : null, puntos: p.puntos, elegible: p.curso.elegiblePrueba !== false };
    });
  }

  /* ───────────────────────── Traspaso a la prueba gratuita ───────────────────────── */

  // Preferencia que lee el Club: localStorage `zoo_curso_pref` = { id, titulo, t }.
  function construirPreferencia(curso, ahora) {
    var c = curso || {};
    var id = String(c.id == null ? '' : c.id).trim().slice(0, 80);
    if (!id) return null;
    return { id: id, titulo: String(c.titulo == null ? '' : c.titulo).replace(/\s+/g, ' ').trim().slice(0, 160), t: Number.isFinite(ahora) ? ahora : Date.now() };
  }

  // Rutas desde la portada (raíz del sitio) a crear cuenta / iniciar sesión, con el curso elegido.
  function urlRegistro(cursoId) { return 'pages/club-registro.html' + (cursoId ? '?curso=' + encodeURIComponent(cursoId) : ''); }
  function urlLogin(cursoId) { return 'pages/club-login.html' + (cursoId ? '?curso=' + encodeURIComponent(cursoId) : ''); }

  return {
    CLAVES: CLAVES, URGENTE: URGENTE, AVISO_VERSION: AVISO_VERSION, PREF_KEY: PREF_KEY, MAX_VALOR: MAX_VALOR,
    PERFILES: PERFILES, PERFILES_EMPRESA: PERFILES_EMPRESA, COMUNES: COMUNES, RETOS: RETOS, PROFUNDIZACION: PROFUNDIZACION,
    DEPENDENCIAS: DEPENDENCIAS, ETIQUETAS_PREGUNTA: ETIQUETAS_PREGUNTA, PAISES: PAISES, PRUEBA: PRUEBA,
    MENSAJES_EXPR: MENSAJES_EXPR, MENSAJE_INICIO: MENSAJE_INICIO,
    obtenerPasos: obtenerPasos, totalPasos: totalPasos, sanearRespuestas: sanearRespuestas, aplicarRespuesta: aplicarRespuesta,
    primerPasoPendiente: primerPasoPendiente, estaCompleta: estaCompleta, pasoParaRetomar: pasoParaRetomar,
    ultimaRespondida: ultimaRespondida, etiquetaAbandono: etiquetaAbandono, limpiarParaEnvio: limpiarParaEnvio,
    paisPorDefecto: paisPorDefecto, esNumeroFalso: esNumeroFalso, normalizarWhatsapp: normalizarWhatsapp,
    construirCuerpo: construirCuerpo, esReintentable: esReintentable, sanearPendientes: sanearPendientes,
    reaccion: reaccion, mensajePregunta: mensajePregunta, textoResultado: textoResultado,
    recomendarCursos: recomendarCursos, construirPreferencia: construirPreferencia, urlRegistro: urlRegistro, urlLogin: urlLogin
  };
});
