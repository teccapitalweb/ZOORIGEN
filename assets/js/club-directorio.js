/* ============================================================ */
/* DIRECTORIO VIP · Club VIP Zoorigen                            */
/*                                                                */
/* Lógica del directorio de profesionales (sin tocar el           */
/* navegador): validar la tarjeta propia, normalizar lo que manda */
/* el servidor, buscar/filtrar y dibujar las tarjetas.            */
/* Se prueba en Node: tests/club-directorio.test.js               */
/*                                                                */
/* REGLA: ningún dato de una tarjeta llega a innerHTML sin pasar  */
/* por esc(); los enlaces de contacto se arman aquí y solo        */
/* pueden ser https (WhatsApp, LinkedIn) o mailto.                */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./club-iconos-comunidad.js'));
  else root.ZOO_DIRECTORIO = factory(root.ZOO_ICONOS_COM);
})(typeof self !== 'undefined' ? self : this, function (ICONOS) {
  'use strict';

  var SECTORES = ['Veterinaria', 'Biología', 'Conservación', 'Zoológicos/UMA', 'Investigación', 'Educación', 'Consultoría', 'Otro'];
  var LIMITES = { nombre: 60, profesion: 80, institucion: 80, ciudad: 60, bio: 280, cedula: 20, correo: 120, linkedin: 200, web: 200, instagram: 30 };
  // Estado profesional opcional: igual que en el Directorio de Alintec Food.
  var ESTADOS = { proyectos: 'Disponible para proyectos', empleo: 'Busco empleo' };
  var MIN_TEXTO = 2;
  var COLORES = 5;

  var TEXTOS = {
    titulo: 'Directorio VIP',
    subtitulo: 'Conoce a otras personas de la comunidad que trabajan con fauna silvestre. Crea tu tarjeta para que te encuentren y contacta a quien quieras.',
    vacioBusqueda: 'Nadie coincide con tu búsqueda. Prueba con otra palabra o quita el filtro.',
    vacioDirectorio: 'Todavía no hay tarjetas en el directorio. Sé la primera persona en crear la tuya.',
    error: 'No pudimos cargar el directorio. Revisa tu conexión e inténtalo de nuevo.',
    vistaPrevia: 'Con tu membresía ves los perfiles reales, buscas por sector y contactas a otros miembros.',
    vistaPreviaTitulo: 'Conoce a los profesionales de la comunidad',
    avisoVistaPrevia: 'Vista previa: los perfiles reales y sus datos de contacto solo los ven los miembros.',
    miPrivada: 'Privada · solo tú la ves',
    miPublicada: 'Publicada · visible para los miembros',
    miTextoSin: 'Crea tu tarjeta profesional para que otros miembros te encuentren. Mientras no la publiques, solo tú la ves.',
    miTextoPrivada: 'Esta es tu tarjeta profesional. Nadie la ve hasta que tú decidas publicarla. Al editarla eliges tus datos y si quieres publicarla.',
    miTextoPublicada: 'Los miembros del club ya pueden ver tu tarjeta y contactarte. Al editarla puedes cambiar tus datos o dejar de publicarla.'
  };

  /* Tarjetas FICTICIAS de la vista previa (quien no es miembro). Son las mismas que manda el servidor
     (zoorigen-webhook/services/directorio.js EJEMPLOS); el sitio las trae para que la vista previa
     no dependa del servidor. Sin datos de contacto y con sectores de la lista (SECTORES). */
  var EJEMPLOS = [
    { uid: 'ejemplo-1', nombre: 'Mariana Ejemplo', profesion: 'Bióloga de campo (tarjeta de ejemplo)', institucion: 'Instituto de ejemplo', sector: 'Conservación', ciudad: 'Ciudad de México',
      bio: 'Tarjeta ficticia para que veas cómo se ve el directorio. Con tu membresía ves los perfiles reales de la comunidad.' },
    { uid: 'ejemplo-2', nombre: 'Ricardo Muestra', profesion: 'Médico veterinario de fauna silvestre (tarjeta de ejemplo)', institucion: 'Clínica veterinaria de ejemplo', sector: 'Veterinaria', ciudad: 'Guadalajara',
      bio: 'Tarjeta ficticia. Aquí aparecería la presentación de una persona de la comunidad.' },
    { uid: 'ejemplo-3', nombre: 'Valeria Demo', profesion: 'Educadora ambiental (tarjeta de ejemplo)', institucion: 'Centro de educación ambiental de ejemplo', sector: 'Educación', ciudad: 'Mérida',
      bio: 'Tarjeta ficticia. Con la membresía puedes crear la tuya y conocer a otras personas del sector.' },
    { uid: 'ejemplo-4', nombre: 'Camila Modelo', profesion: 'Responsable de una UMA (tarjeta de ejemplo)', institucion: 'UMA de ejemplo', sector: 'Zoológicos/UMA', ciudad: 'Xalapa',
      bio: 'Tarjeta ficticia. Así se vería la presentación de alguien que trabaja en una UMA o en un zoológico.' },
    { uid: 'ejemplo-5', nombre: 'Andrés Prueba', profesion: 'Investigador en ecología de fauna (tarjeta de ejemplo)', institucion: 'Universidad de ejemplo', sector: 'Investigación', ciudad: 'Morelia',
      bio: 'Tarjeta ficticia. Aquí una persona de la comunidad contaría en qué línea de investigación trabaja.' },
    { uid: 'ejemplo-6', nombre: 'Lucía Muestra', profesion: 'Zoóloga (tarjeta de ejemplo)', institucion: 'Museo de historia natural de ejemplo', sector: 'Biología', ciudad: 'Monterrey',
      bio: 'Tarjeta ficticia. Con tu membresía buscas por sector o por ciudad y contactas a quien quieras.' }
  ];

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function limpio(v, max) {
    if (v == null) return '';
    var t = String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) : t;
  }
  function sinAcentos(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function icono(nombre, tam) { return ICONOS ? ICONOS.svg(nombre, { size: tam || 16 }) : ''; }

  /* ───────────────────────── Contactos ───────────────────────── */

  // Deja solo los dígitos de un teléfono; devuelve '' si no parece un número (10 a 15 dígitos).
  function telefonoLimpio(v) {
    var d = String(v == null ? '' : v).replace(/[^\d]/g, '');
    return d.length >= 10 && d.length <= 15 ? d : '';
  }
  function enlaceWhatsApp(v) {
    var d = telefonoLimpio(v);
    if (!d) return '';
    if (d.length === 10) d = '52' + d;   // número mexicano sin lada de país
    return 'https://wa.me/' + d;
  }
  function correoValido(v) {
    var c = String(v == null ? '' : v).trim().toLowerCase();
    return c.length <= LIMITES.correo && /^[a-z0-9._%+\-]+@[a-z0-9\-]+(\.[a-z0-9\-]+)*\.[a-z]{2,}$/.test(c) ? c : '';
  }
  // Acepta "linkedin.com/in/ana", "www.linkedin.com/in/ana" o la dirección completa. Solo dominios de LinkedIn, siempre https.
  function linkedinLimpio(v) {
    var t = String(v == null ? '' : v).trim();
    if (!t || t.length > LIMITES.linkedin) return '';
    if (!/^[a-z][a-z0-9+.\-]*:\/\//i.test(t)) t = 'https://' + t.replace(/^\/+/, '');
    var u;
    try { u = new URL(t); } catch (e) { return ''; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    var h = u.hostname.toLowerCase();
    if (h !== 'linkedin.com' && h.slice(-13) !== '.linkedin.com') return '';
    if (u.username || u.password) return '';
    return 'https://' + h + u.pathname.replace(/\/+$/, '') + (u.search || '');
  }

  // Sitio web: acepta "tusitio.com" o la dirección completa. Solo http(s), sin usuario ni contraseña, con un punto en el dominio.
  function webLimpia(v) {
    var t = String(v == null ? '' : v).trim();
    if (!t || t.length > LIMITES.web || /[\s<>"'`\\]/.test(t)) return '';
    if (!/^[a-z][a-z0-9+.\-]*:/i.test(t)) t = 'https://' + t.replace(/^\/+/, '');
    var u;
    try { u = new URL(t); } catch (e) { return ''; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    if (u.username || u.password || u.hostname.indexOf('.') < 0) return '';
    var h = u.href;
    return h.length > LIMITES.web ? '' : h;
  }
  // Instagram: "@usuario", "usuario" o "instagram.com/usuario". Devuelve solo el usuario.
  function instagramLimpio(v) {
    var t = String(v == null ? '' : v).trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^instagram\.com\//i, '').replace(/\/+$/, '').replace(/^@+/, '');
    return /^[A-Za-z0-9._]{1,30}$/.test(t) ? t : '';
  }
  var CEDULA = /^[A-Za-z0-9\-]{4,20}$/;

  /* ───────────────────────── Validar "Mi tarjeta" ───────────────────────── */

  // entrada: lo que se escribió en el formulario. Devuelve { ok, valor, errores:{campo:mensaje} }.
  function validarTarjeta(entrada) {
    var e = entrada || {};
    var errores = {};
    var nombre = limpio(e.nombre, 200);
    var profesion = limpio(e.profesion, 200);
    var ciudad = limpio(e.ciudad, 200);
    var sector = limpio(e.sector, 60);
    var institucion = limpio(e.institucion, 200);
    var estado = limpio(e.estado, 20);
    var cedula = limpio(e.cedula, 60);
    var bio = String(e.bio == null ? '' : e.bio).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').trim();

    if (nombre.length < MIN_TEXTO) errores.nombre = 'Escribe el nombre con el que quieres aparecer.';
    else if (nombre.length > LIMITES.nombre) errores.nombre = 'El nombre puede tener hasta ' + LIMITES.nombre + ' caracteres.';
    if (profesion.length < MIN_TEXTO) errores.profesion = 'Escribe tu profesión u ocupación.';
    else if (profesion.length > LIMITES.profesion) errores.profesion = 'La profesión puede tener hasta ' + LIMITES.profesion + ' caracteres.';
    if (SECTORES.indexOf(sector) < 0) errores.sector = 'Elige un sector de la lista.';
    if (ciudad.length < MIN_TEXTO) errores.ciudad = 'Escribe tu ciudad o estado.';
    else if (ciudad.length > LIMITES.ciudad) errores.ciudad = 'La ciudad puede tener hasta ' + LIMITES.ciudad + ' caracteres.';
    if (institucion.length > LIMITES.institucion) errores.institucion = 'La institución puede tener hasta ' + LIMITES.institucion + ' caracteres.';
    if (estado && !Object.prototype.hasOwnProperty.call(ESTADOS, estado)) errores.estado = 'Elige una opción de la lista.';
    if (cedula && !CEDULA.test(cedula)) errores.cedula = 'La cédula debe tener de 4 a 20 letras o números, sin espacios.';
    if (bio.length > LIMITES.bio) errores.bio = 'La presentación puede tener hasta ' + LIMITES.bio + ' caracteres (llevas ' + bio.length + ').';

    var contacto = {};
    var wa = String(e.whatsapp == null ? '' : e.whatsapp).trim();
    if (wa) { var tel = telefonoLimpio(wa); if (tel) contacto.whatsapp = tel; else errores.whatsapp = 'Escribe un número de 10 a 15 dígitos, por ejemplo 5512345678.'; }
    var co = String(e.correo == null ? '' : e.correo).trim();
    if (co) { var mail = correoValido(co); if (mail) contacto.correo = mail; else errores.correo = 'Escribe un correo válido, por ejemplo nombre@dominio.com.'; }
    var li = String(e.linkedin == null ? '' : e.linkedin).trim();
    if (li) { var url = linkedinLimpio(li); if (url) contacto.linkedin = url; else errores.linkedin = 'Escribe la dirección de tu perfil de LinkedIn, por ejemplo linkedin.com/in/tu-nombre.'; }

    var we = String(e.web == null ? '' : e.web).trim();
    if (we) { var sitio = webLimpia(we); if (sitio) contacto.web = sitio; else errores.web = 'Escribe la dirección de tu sitio, por ejemplo tusitio.com.'; }
    var ig = String(e.instagram == null ? '' : e.instagram).trim();
    if (ig) { var usuario = instagramLimpio(ig); if (usuario) contacto.instagram = usuario; else errores.instagram = 'Escribe tu usuario de Instagram, por ejemplo @tu_usuario.'; }

    var ok = Object.keys(errores).length === 0;
    return {
      ok: ok, errores: errores,
      valor: ok ? {
        nombre: nombre, profesion: profesion, institucion: institucion, sector: sector, ciudad: ciudad, bio: bio,
        estado: estado, cedula: cedula, cedulaVisible: !!cedula && e.cedulaVisible === true, contacto: contacto
      } : null
    };
  }

  /* ───────────────────────── Normalizar lo que manda el servidor ───────────────────────── */

  function normalizarTarjeta(t) {
    if (!t || typeof t !== 'object') return null;
    var nombre = limpio(t.nombre, LIMITES.nombre);
    if (!nombre) return null;
    var c = t.contacto && typeof t.contacto === 'object' ? t.contacto : {};
    var sector = limpio(t.sector, 60);
    return {
      uid: limpio(t.uid, 128),
      nombre: nombre,
      profesion: limpio(t.profesion, LIMITES.profesion),
      institucion: limpio(t.institucion, LIMITES.institucion),
      sector: SECTORES.indexOf(sector) >= 0 ? sector : 'Otro',
      estado: Object.prototype.hasOwnProperty.call(ESTADOS, t.estado) ? t.estado : '',
      cedula: limpio(t.cedula, LIMITES.cedula),
      cedulaVisible: t.cedulaVisible === true,
      publicado: t.publicado === true,
      verificado: t.verificado === true,
      ciudad: limpio(t.ciudad, LIMITES.ciudad),
      bio: String(t.bio == null ? '' : t.bio).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, LIMITES.bio).trim(),
      contacto: {
        whatsapp: telefonoLimpio(c.whatsapp), correo: correoValido(c.correo != null ? c.correo : c.email), linkedin: linkedinLimpio(c.linkedin),
        web: webLimpia(c.web), instagram: instagramLimpio(c.instagram)
      },
      actualizado: t.actualizado || null
    };
  }

  // Lo que se manda al servidor: el contrato llama `email` al correo de contacto (el formulario le dice `correo`).
  // opciones.publicado: true la publica; sin él (o false) la tarjeta queda PRIVADA, solo la ve su dueña o dueño.
  function paraServidor(valor, opciones) {
    var c = (valor && valor.contacto) || {};
    var contacto = {};
    if (c.whatsapp) contacto.whatsapp = c.whatsapp;
    if (c.correo) contacto.email = c.correo;
    if (c.linkedin) contacto.linkedin = c.linkedin;
    if (c.web) contacto.web = c.web;
    if (c.instagram) contacto.instagram = c.instagram;
    return {
      nombre: valor.nombre, profesion: valor.profesion, institucion: valor.institucion || '', sector: valor.sector, ciudad: valor.ciudad, bio: valor.bio,
      estado: valor.estado || '', cedula: valor.cedula || '', cedulaVisible: !!valor.cedula && valor.cedulaVisible === true,
      publicado: !!(opciones && opciones.publicado === true), contacto: contacto
    };
  }

  // De la tarjeta propia (ya normalizada) a un "valor" listo para paraServidor: sirve para publicar o
  // dejar de publicar sin abrir el formulario.
  function valorDeTarjeta(t) {
    var c = (t && t.contacto) || {};
    return {
      nombre: t.nombre, profesion: t.profesion || '', institucion: t.institucion || '', sector: t.sector, ciudad: t.ciudad || '', bio: t.bio || '',
      estado: t.estado || '', cedula: t.cedula || '', cedulaVisible: t.cedulaVisible === true,
      contacto: { whatsapp: c.whatsapp || '', correo: c.correo || '', linkedin: c.linkedin || '', web: c.web || '', instagram: c.instagram || '' }
    };
  }

  function normalizarRespuesta(resp) {
    var r = resp && typeof resp === 'object' ? resp : {};
    return {
      membresia: r.membresia === true,
      tarjetas: (Array.isArray(r.tarjetas) ? r.tarjetas : []).map(normalizarTarjeta).filter(Boolean).slice(0, 300),
      mia: normalizarTarjeta(r.mia)
    };
  }

  /* Tarjetas de ejemplo para la vista previa. Se usan las del servidor solo si trae al menos tantas como
     las propias (así una versión vieja del servidor, con 3 y sectores que no existen, no se nota);
     en cualquier otro caso (sin respuesta, vacía o corta) el sitio pinta las suyas. Nunca llevan contacto. */
  function tarjetasDeEjemplo(tarjetasServidor) {
    var propias = EJEMPLOS.map(normalizarTarjeta).filter(Boolean);
    var delServidor = (Array.isArray(tarjetasServidor) ? tarjetasServidor : []).map(normalizarTarjeta).filter(Boolean);
    var usar = delServidor.length >= propias.length ? delServidor.slice(0, 12) : propias;
    return usar.map(function (t) {
      t.contacto = { whatsapp: '', correo: '', linkedin: '' };
      t.verificado = false; t.cedula = ''; t.publicado = false;
      return t;
    });
  }

  /* ───────────────────────── Buscar y filtrar ───────────────────────── */

  // sector: uno de SECTORES, o '' / 'Todos' para no filtrar. q: texto libre (sin importar mayúsculas ni acentos).
  function filtrar(tarjetas, opciones) {
    var o = opciones || {};
    var sector = o.sector && o.sector !== 'Todos' ? o.sector : '';
    var q = sinAcentos(o.q).trim();
    return (tarjetas || []).filter(function (t) {
      if (sector && t.sector !== sector) return false;
      if (!q) return true;
      return sinAcentos([t.nombre, t.profesion, t.institucion, t.ciudad, t.sector, t.bio].join(' ')).indexOf(q) >= 0;
    });
  }

  function iniciales(nombre) {
    var partes = String(nombre || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return partes.map(function (p) { return p.charAt(0).toUpperCase(); }).join('') || '?';
  }
  function colorIndice(clave) {
    var h = 0, s = String(clave || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % COLORES;
  }

  /* ───────────────────────── Dibujo (devuelven HTML ya escapado) ───────────────────────── */

  // Instagram no está en el módulo de íconos compartido (otra persona lo edita): se dibuja aquí, con el mismo trazo Lucide.
  function iconoInstagram(tam) {
    return '<svg class="zi" width="' + tam + '" height="' + tam + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>';
  }

  function renderContactos(t) {
    var c = t.contacto || {};
    var out = [];
    var wa = enlaceWhatsApp(c.whatsapp);
    if (wa) out.push('<a class="zd-contacto zd-contacto--wa" href="' + esc(wa) + '" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de ' + esc(t.nombre) + '" title="WhatsApp">' + icono('message-circle', 18) + '</a>');
    if (c.correo) out.push('<a class="zd-contacto" href="mailto:' + esc(c.correo) + '" aria-label="Correo de ' + esc(t.nombre) + '" title="Correo: ' + esc(c.correo) + '">' + icono('mail', 18) + '</a>');
    if (c.linkedin) out.push('<a class="zd-contacto" href="' + esc(c.linkedin) + '" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn de ' + esc(t.nombre) + '" title="LinkedIn">' + icono('linkedin', 18) + '</a>');
    var web = webLimpia(c.web);
    if (web) out.push('<a class="zd-contacto" href="' + esc(web) + '" target="_blank" rel="noopener noreferrer" aria-label="Sitio web de ' + esc(t.nombre) + '" title="Sitio web">' + icono('link', 18) + '</a>');
    var ig = instagramLimpio(c.instagram);
    if (ig) out.push('<a class="zd-contacto" href="https://instagram.com/' + esc(encodeURIComponent(ig)) + '" target="_blank" rel="noopener noreferrer" aria-label="Instagram de ' + esc(t.nombre) + '" title="Instagram">' + iconoInstagram(18) + '</a>');
    return out.length ? '<div class="zd-contactos">' + out.join('') + '</div>' : '<div class="zd-sincontacto">Sin datos de contacto</div>';
  }

  // opciones: { esMia, sinContacto, pistas }
  //  · pistas: textos en gris para una tarjeta aún sin llenar (la tarjeta propia antes de crearla)
  function renderTarjeta(t, opciones) {
    var o = opciones || {};
    var pistas = o.pistas === true;
    var nombre = t.nombre || (pistas ? 'Tu nombre' : '');
    var estado = Object.prototype.hasOwnProperty.call(ESTADOS, t.estado) ? t.estado : '';
    var sello = t.verificado === true && !pistas
      ? '<span class="zd-sello" role="img" aria-label="Miembro verificado de Zoorigen" title="Miembro verificado de Zoorigen">' + icono('shield-check', 14) + '</span>' : '';
    var cedula = t.cedula && (t.cedulaVisible === true || o.esMia)
      ? '<div class="zd-tarjeta__linea">' + icono('award', 15) + '<span>Cédula profesional ' + esc(t.cedula) + (t.cedulaVisible === true ? '' : ' (solo tú la ves)') + '</span></div>' : '';
    return '<article class="zd-tarjeta' + (o.esMia ? ' zd-tarjeta--mia' : '') + (t.verificado === true && !pistas ? ' zd-tarjeta--verificada' : '') + '"' + (t.uid ? ' data-uid="' + esc(t.uid) + '"' : '') + '>' +
      (o.esMia ? '<span class="zd-tarjeta__etiqueta">Tu tarjeta</span>' : '') +
      '<div class="zd-tarjeta__cab"><div class="zd-avatar-caja"><div class="zd-avatar zd-avatar--' + colorIndice(t.uid || t.nombre) + '" aria-hidden="true">' + esc(iniciales(nombre)) + '</div>' + sello + '</div>' +
      '<div style="min-width:0"><h3 class="zd-tarjeta__nombre' + (t.nombre ? '' : ' zd-vacio') + '">' + esc(nombre) + '</h3>' +
        (t.profesion ? '<div class="zd-tarjeta__prof">' + esc(t.profesion) + '</div>' : (pistas ? '<div class="zd-tarjeta__prof zd-vacio">Tu profesión u ocupación</div>' : '')) + '</div></div>' +
      (t.institucion ? '<div class="zd-tarjeta__linea">' + icono('briefcase', 15) + '<span>' + esc(t.institucion) + '</span></div>'
        : (pistas ? '<div class="zd-tarjeta__linea zd-vacio">' + icono('briefcase', 15) + '<span>Tu institución, UMA o empresa</span></div>' : '')) +
      (t.ciudad ? '<div class="zd-tarjeta__linea">' + icono('map-pin', 15) + '<span>' + esc(t.ciudad) + '</span></div>'
        : (pistas ? '<div class="zd-tarjeta__linea zd-vacio">' + icono('map-pin', 15) + '<span>Tu ciudad o estado</span></div>' : '')) +
      cedula +
      (estado ? '<span class="zd-estado zd-estado--' + (estado === 'proyectos' ? 'ok' : 'info') + '"><i aria-hidden="true"></i>' + esc(ESTADOS[estado]) + '</span>' : '') +
      (t.sector ? '<span class="zd-sector">' + esc(t.sector) + '</span>' : '') +
      (t.bio ? '<p class="zd-tarjeta__bio">' + esc(t.bio) + '</p>' : '') +
      (o.sinContacto ? '' : (pistas && !hayContacto(t) ? '<div class="zd-sincontacto zd-vacio">Aquí irán tus datos de contacto</div>' : renderContactos(t))) + '</article>';
  }

  function hayContacto(t) {
    var c = (t && t.contacto) || {};
    return !!(c.whatsapp || c.correo || c.linkedin || c.web || c.instagram);
  }

  // Encabezado de grupo dentro de la rejilla (ocupa todo el ancho)
  function renderGrupo(titulo, n, verificado) {
    return '<div class="zd-grupo' + (verificado ? ' zd-grupo--verificado' : '') + '"><span>' + (verificado ? icono('shield-check', 16) : '') + esc(titulo) + '</span><small>' + n + '</small></div>';
  }

  // Lista de tarjetas. Si hay verificadas Y de la comunidad se separan en dos grupos (como en Alintec Food);
  // la propia va primero dentro de su grupo.
  function renderLista(tarjetas, opciones) {
    var o = opciones || {};
    if (!tarjetas.length) {
      return '<div class="zc-vacio">' + icono('search', 30) + '<p>' + esc(o.filtrando ? TEXTOS.vacioBusqueda : TEXTOS.vacioDirectorio) + '</p></div>';
    }
    var propiaPrimero = function (a, b) { return (b.uid === o.miUid ? 1 : 0) - (a.uid === o.miUid ? 1 : 0); };
    var verificadas = tarjetas.filter(function (t) { return t.verificado === true; }).sort(propiaPrimero);
    var resto = tarjetas.filter(function (t) { return t.verificado !== true; }).sort(propiaPrimero);
    var dibujar = function (t) { return renderTarjeta(t, { esMia: !!o.miUid && t.uid === o.miUid, sinContacto: o.sinContacto }); };
    var html = '';
    if (verificadas.length) html += (resto.length ? renderGrupo('Miembros verificados', verificadas.length, true) : '') + verificadas.map(dibujar).join('');
    if (resto.length) html += (verificadas.length ? renderGrupo('Comunidad Zoorigen', resto.length, false) : '') + resto.map(dibujar).join('');
    return '<div class="zd-grid">' + html + '</div>';
  }

  /* Panel "Mi tarjeta" (solo miembros): la tarjeta propia, si está privada o publicada y qué se puede hacer.
     mia: tarjeta propia normalizada o null. Devuelve HTML ya escapado. Los botones llevan data-mia="editar|publicar|despublicar". */
  function renderMiTarjeta(mia) {
    var existe = !!mia;
    var pub = existe && mia.publicado === true;
    var tarjeta = existe
      ? renderTarjeta(mia, { esMia: false })
      : renderTarjeta({ nombre: '', profesion: '', institucion: '', ciudad: '', sector: '', bio: '', contacto: {} }, { pistas: true });
    var estado = pub ? TEXTOS.miPublicada : TEXTOS.miPrivada;
    var texto = !existe ? TEXTOS.miTextoSin : (pub ? TEXTOS.miTextoPublicada : TEXTOS.miTextoPrivada);
    var botones = '<button type="button" class="zc-btn zc-btn--suave" data-mia="editar">' + icono('pencil', 16) + (existe ? 'Editar' : 'Crear mi tarjeta') + '</button>' +
      (existe ? '<button type="button" class="zc-btn ' + (pub ? 'zc-btn--suave' : 'zc-btn--primario') + '" data-mia="' + (pub ? 'despublicar' : 'publicar') + '">' + icono(pub ? 'lock' : 'users', 16) + (pub ? 'Dejar de publicar' : 'Publicar') + '</button>' : '');
    return '<section class="zd-mia" aria-label="Mi tarjeta">' +
      '<div class="zd-mia__tarjeta">' + tarjeta + '</div>' +
      '<div class="zd-mia__info"><span class="zd-mia__estado' + (pub ? ' is-pub' : '') + '">' + icono(pub ? 'users' : 'lock', 14) + esc(estado) + '</span>' +
      '<p>' + esc(texto) + '</p><div class="zd-mia__acc">' + botones + '</div></div></section>';
  }

  function renderChips(activo) {
    return ['Todos'].concat(SECTORES).map(function (s) {
      var on = s === (activo || 'Todos');
      return '<button type="button" class="zd-chip' + (on ? ' is-activo' : '') + '" data-sector="' + esc(s) + '" aria-pressed="' + on + '">' + esc(s) + '</button>';
    }).join('');
  }

  /* Vista previa para quien no es miembro: grilla de tarjetas de ejemplo difuminada y caja central con el
     llamado a la membresía. Las tarjetas no llevan contacto. Devuelve HTML ya escapado. */
  function renderVistaPrevia(tarjetas) {
    return '<div class="zd-aviso" role="note">' + icono('lock', 16) + '<span>' + esc(TEXTOS.avisoVistaPrevia) + '</span></div>' +
      '<div class="zd-vista">' +
      '<div class="zd-vista__rejilla" aria-hidden="true">' + renderLista(tarjetas || [], { sinContacto: true }) + '</div>' +
      '<div class="zd-vista__cta"><div class="zd-vista__caja" role="note">' +
        icono('crown', 30) +
        '<strong>' + esc(TEXTOS.vistaPreviaTitulo) + '</strong>' +
        '<p>' + esc(TEXTOS.vistaPrevia) + '</p>' +
        '<a class="zc-btn zc-btn--primario" href="club-suscripcion.html">Suscribirme</a>' +
      '</div></div></div>';
  }

  function renderError(mensaje) {
    return '<div class="zc-error" role="alert">' + icono('triangle-alert', 28) + '<p>' + esc(mensaje || TEXTOS.error) + '</p>' +
      '<button type="button" class="zc-btn zc-btn--suave" data-reintentar>' + icono('refresh-cw', 15) + 'Reintentar</button></div>';
  }

  return {
    SECTORES: SECTORES, ESTADOS: ESTADOS, LIMITES: LIMITES, TEXTOS: TEXTOS, EJEMPLOS: EJEMPLOS,
    tarjetasDeEjemplo: tarjetasDeEjemplo, renderVistaPrevia: renderVistaPrevia,
    esc: esc, telefonoLimpio: telefonoLimpio, enlaceWhatsApp: enlaceWhatsApp, correoValido: correoValido, paraServidor: paraServidor, valorDeTarjeta: valorDeTarjeta, linkedinLimpio: linkedinLimpio, webLimpia: webLimpia, instagramLimpio: instagramLimpio,
    validarTarjeta: validarTarjeta, normalizarTarjeta: normalizarTarjeta, normalizarRespuesta: normalizarRespuesta,
    filtrar: filtrar, iniciales: iniciales, colorIndice: colorIndice,
    renderTarjeta: renderTarjeta, renderLista: renderLista, renderChips: renderChips, renderContactos: renderContactos, renderMiTarjeta: renderMiTarjeta, hayContacto: hayContacto, renderError: renderError
  };
});
