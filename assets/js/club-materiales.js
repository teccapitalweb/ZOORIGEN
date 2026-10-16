/* ============================================================ */
/* CLUB VIP ZOORIGEN · PDFs Y MATERIALES                         */
/* Libros (se leen aquí, se desbloquean con retos), guías y       */
/* plantillas en PDF, presentaciones, documentos oficiales y      */
/* materiales sueltos de Drive. Lo que cuenta como "desbloqueado" */
/* lo decide SIEMPRE el servidor; aquí solo se dibuja.            */
/* La parte pura se prueba en Node.                               */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_MATERIALES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Documentos oficiales: enlaces a las fuentes originales (textos de ley y normas), sin copiarlos. */
  var OFICIALES = [
    { id: 'lgvs', titulo: 'Ley General de Vida Silvestre', detalle: 'Texto vigente · Cámara de Diputados', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGVS.pdf', tipo: 'Ley' },
    { id: 'reg-lgvs', titulo: 'Reglamento de la Ley General de Vida Silvestre', detalle: 'Texto vigente · Cámara de Diputados', url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LGVS.pdf', tipo: 'Reglamento' },
    { id: 'nom-059', titulo: 'NOM-059-SEMARNAT-2010', detalle: 'Protección ambiental, especies nativas en riesgo · Diario Oficial', url: 'https://dof.gob.mx/normasOficiales/4254/semarnat/semarnat.htm', tipo: 'Norma oficial' },
    { id: 'lgeepa', titulo: 'Ley General del Equilibrio Ecológico y la Protección al Ambiente', detalle: 'Texto vigente · Cámara de Diputados', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGEEPA.pdf', tipo: 'Ley' },
    { id: 'cpf', titulo: 'Código Penal Federal', detalle: 'Delitos contra la biodiversidad · Cámara de Diputados', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CPF.pdf', tipo: 'Código' },
    { id: 'cites', titulo: 'Convención CITES', detalle: 'Sitio oficial de la Convención', url: 'https://cites.org/esp', tipo: 'Tratado' },
    { id: 'uicn', titulo: 'Lista Roja de la UICN', detalle: 'Estado de conservación de las especies', url: 'https://www.iucnredlist.org', tipo: 'Consulta' },
    { id: 'conabio', titulo: 'CONABIO · Biodiversidad Mexicana', detalle: 'Información oficial sobre la biodiversidad de México', url: 'https://www.biodiversidad.gob.mx', tipo: 'Consulta' }
  ];

  /* Fotos propias del sitio por tema (para las portadas de los PDF). */
  var FOTOS = [
    [/apic|abeja|polin|miel|colmena/i, '../assets/img/areas/apicultura-polinizacion.jpg'],
    [/bienestar|etolog|comport/i, '../assets/img/areas/etologia-manejo-animal.jpg'],
    [/manejo|bioseg|cautiv|ejemplar|registro/i, '../assets/img/areas/manejo-fauna-cautiverio-exhibicion.jpg'],
    [/ponzo|venen|toxic/i, '../assets/img/areas/fauna-ponzonosa-toxicologia.jpg'],
    [/investig|monitor|ciencia/i, '../assets/img/areas/investigacion-cientifica-monitoreo.jpg']
  ];
  var FOTO_GENERAL = '../assets/img/areas/fauna-silvestre-conservacion.webp';

  /* Portada propia de cada libro y material (900x1230). Si un id no está aquí, el libro usa su ícono sobre color
     y el material la foto de su tema. */
  var CARPETA_PORTADAS = '../assets/img/materiales/';
  var PORTADAS = {
    'ley-fauna-mx': 'libro-ley-fauna-mx.jpg',
    'bienestar-cautiverio': 'libro-bienestar-cautiverio.jpg',
    'conservacion-mx': 'libro-conservacion-mx.jpg',
    'checklist-bioseguridad': 'material-checklist-bioseguridad.jpg',
    'ficha-registro-ejemplar': 'material-ficha-registro-ejemplar.jpg',
    'fauna-herida': 'material-fauna-herida.jpg',
    'calendario-colmenas': 'material-calendario-colmenas.jpg',
    'glosario-vida-silvestre': 'material-glosario-vida-silvestre.jpg',
    'marco-normativo-uno': 'material-marco-normativo.jpg',
    'intro-nom-059': 'material-intro-nom-059.jpg',
    'bienestar-cinco-dominios': 'material-bienestar-cinco-dominios.jpg',
    'polinizadores-abejas': 'material-polinizadores-abejas.jpg'
  };
  function portadaDe(id) {
    var clave = String(id == null ? '' : id);
    return Object.prototype.hasOwnProperty.call(PORTADAS, clave) ? CARPETA_PORTADAS + PORTADAS[clave] : '';
  }

  var TIPOS = {
    guia: { nombre: 'Guía', color: '#2F7A4F' },
    plantilla: { nombre: 'Plantilla', color: '#C75402' },
    checklist: { nombre: 'Checklist', color: '#0F9D58' },
    glosario: { nombre: 'Glosario', color: '#B35470' },
    infografia: { nombre: 'Infografía', color: '#2AA4D5' },
    presentacion: { nombre: 'Presentación', color: '#D4A017' }
  };

  var PESTANAS = [['todo', 'Todo'], ['guardados', 'Guardados'], ['libros', 'Libros'], ['guias', 'Guías y plantillas'], ['presentaciones', 'Presentaciones'], ['cursos', 'De tus cursos'], ['oficiales', 'Documentos oficiales'], ['mas', 'Más materiales']];

  /* ───── funciones puras ───── */
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function normalizar(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function colorSeguro(c, d) { return /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? String(c) : d; }
  function entero(v, d) { var n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : d; }
  function urlHttps(u) {
    var s = String(u == null ? '' : u).trim();
    if (!/^https:\/\//i.test(s) || /[\s<>"'`\\]/.test(s) || s.length > 2000) return '';
    try { return new URL(s).hostname ? s : ''; } catch (e) { return ''; }
  }

  /* El próximo libro por abrir (el de menor umbral que aún falta) y cuánto falta. null si no hay libros. */
  function siguienteMeta(libros, superados) {
    var s = entero(superados, 0);
    var lista = (Array.isArray(libros) ? libros : []).filter(function (l) { return l && entero(l.requiereRetos, 0) > 0; })
      .sort(function (a, b) { return a.requiereRetos - b.requiereRetos; });
    if (!lista.length) return null;
    var pendiente = lista.filter(function (l) { return s < l.requiereRetos; })[0];
    if (!pendiente) return { todosAbiertos: true, superados: s, total: lista.length };
    return { todosAbiertos: false, libro: pendiente, requiere: pendiente.requiereRetos, superados: s, faltan: pendiente.requiereRetos - s, porcentaje: Math.min(100, Math.round(s * 100 / pendiente.requiereRetos)) };
  }

  /* Texto corto para algo bloqueado. */
  function textoBloqueo(item) {
    if (!item || item.desbloqueado) return '';
    if (item.soloMiembros) return 'Solo para miembros';
    var f = entero(item.faltan, 0);
    if (!f && item.requiereRetos) f = entero(item.requiereRetos, 0);
    return f === 1 ? 'Supera 1 reto más' : (f ? 'Supera ' + f + ' retos más' : 'Bloqueado');
  }

  /* Aviso al tocar algo bloqueado. */
  function mensajeBloqueo(item) {
    var t = item && item.titulo ? '«' + item.titulo + '» ' : '';
    if (item && item.soloMiembros) return t + 'es solo para miembros.';
    var f = entero(item && item.faltan, 0);
    return t + 'se desbloquea al superar ' + (f === 1 ? '1 reto más' : (f ? f + ' retos más' : 'más retos')) + '.';
  }

  /* ───── vista previa para quien no es miembro ─────
     El servidor manda el catálogo completo (solo metadatos) con soloMiembros:true; aquí se dibuja igual que a un
     miembro pero cada tarjeta lleva el candado "Solo miembros" y abrir, leer, descargar o guardar pide membresía.
     Eso es EXPERIENCIA: el contenido de verdad lo protege el servidor (403 membresia-requerida). */
  var RUTA_PLANES = 'club-suscripcion.html';

  function esVistaPrevia(item) { return !!item && item.soloMiembros === true; }
  function hayVistaPrevia(libros, materiales) {
    return (Array.isArray(libros) ? libros : []).concat(Array.isArray(materiales) ? materiales : []).some(esVistaPrevia);
  }

  /* Catálogo mínimo de respaldo (solo títulos, tipo y área; las portadas salen de PORTADAS). Se usa SOLO para quien
     no es miembro cuando el servidor no responde, para no dejar la pantalla en blanco. No lleva ningún contenido. */
  var RESPALDO_LIBROS = [
    { id: 'ley-fauna-mx', titulo: 'Fauna silvestre y ley en México', subtitulo: 'Guía de bolsillo para profesionales y estudiantes', categoria: 'Normatividad', color: '#1F5F3A', icono: 'scale', requiereRetos: 5, paginasTotal: 17 },
    { id: 'bienestar-cautiverio', titulo: 'Bienestar animal en cautiverio', subtitulo: 'Cinco dominios, enriquecimiento y manejo cotidiano', categoria: 'Bienestar animal', color: '#C75402', icono: 'heartpulse', requiereRetos: 15, paginasTotal: 17 },
    { id: 'conservacion-mx', titulo: 'Conservación de la vida silvestre en México', subtitulo: 'Especies, amenazas y herramientas', categoria: 'Conservación', color: '#2F7A4F', icono: 'leaf', requiereRetos: 30, paginasTotal: 17 }
  ];
  var RESPALDO_MATERIALES = [
    { id: 'checklist-bioseguridad', titulo: 'Checklist de bioseguridad para unidades de manejo de fauna', tipo: 'checklist', area: 'Sanidad y manejo de fauna silvestre', paginas: 3 },
    { id: 'ficha-registro-ejemplar', titulo: 'Ficha de registro de ejemplar', tipo: 'plantilla', area: 'Registro y trazabilidad de fauna silvestre', paginas: 2 },
    { id: 'fauna-herida', titulo: 'Qué hacer si encuentras fauna silvestre herida', tipo: 'guia', area: 'Rescate y atención de fauna silvestre', paginas: 3 },
    { id: 'calendario-colmenas', titulo: 'Calendario anual de manejo de colmenas', tipo: 'guia', area: 'Apicultura y polinizadores', paginas: 3 },
    { id: 'glosario-vida-silvestre', titulo: 'Glosario de vida silvestre y normatividad', tipo: 'glosario', area: 'Normatividad y conceptos de vida silvestre', paginas: 7 },
    { id: 'marco-normativo-uno', titulo: 'Marco normativo de la vida silvestre en una página', tipo: 'infografia', area: 'Normatividad y cumplimiento', paginas: 2 },
    { id: 'intro-nom-059', titulo: 'Introducción a la NOM-059-SEMARNAT-2010', tipo: 'presentacion', area: 'Normatividad y conservación de fauna silvestre', paginas: 10 },
    { id: 'bienestar-cinco-dominios', titulo: 'Bienestar animal: los cinco dominios', tipo: 'presentacion', area: 'Bienestar animal y manejo de fauna', paginas: 10 },
    { id: 'polinizadores-abejas', titulo: 'Polinizadores: por qué importan las abejas', tipo: 'presentacion', area: 'Biodiversidad y apicultura', paginas: 10 }
  ];
  function respaldoLibros() {
    return RESPALDO_LIBROS.map(function (l) {
      return { id: l.id, titulo: l.titulo, subtitulo: l.subtitulo, autor: 'Equipo Zoorigen', categoria: l.categoria, color: l.color, icono: l.icono, resumen: '', paginasTotal: l.paginasTotal, requiereRetos: l.requiereRetos, desbloqueado: false, faltan: l.requiereRetos, soloMiembros: true };
    });
  }
  function respaldoMateriales() {
    return RESPALDO_MATERIALES.map(function (m) {
      return { id: m.id, titulo: m.titulo, tipo: m.tipo, area: m.area, descripcion: '', paginas: m.paginas, acceso: 'miembros', requiereRetos: 0, desbloqueado: false, faltan: 0, soloMiembros: true };
    });
  }

  /* Contadores del encabezado. Con membresía: abiertos/total y retos. Sin membresía: cuántos hay para explorar. */
  function resumenCatalogo(libros, materiales, previa, superados) {
    var l = Array.isArray(libros) ? libros : [], m = Array.isArray(materiales) ? materiales : [];
    if (previa) return [{ valor: String(l.length), etiqueta: 'Libros' }, { valor: String(m.length), etiqueta: 'Materiales' }, { valor: String(OFICIALES.length), etiqueta: 'Documentos oficiales' }];
    return [
      { valor: l.filter(function (x) { return x && x.desbloqueado; }).length + '/' + l.length, etiqueta: 'Libros' },
      { valor: m.filter(function (x) { return x && x.desbloqueado; }).length + '/' + m.length, etiqueta: 'Materiales' },
      { valor: String(entero(superados, 0)), etiqueta: 'Retos superados' }
    ];
  }

  /* Texto de la ventana al intentar abrir un libro o un material sin membresía. */
  function textoPaywallRecurso(item, esLibro) {
    var t = item && item.titulo ? '«' + item.titulo + '» ' : 'Este contenido ';
    return {
      titulo: 'Contenido exclusivo para miembros',
      texto: t + (esLibro
        ? 'es parte de la membresía. Hazte miembro para leerlo aquí mismo; los libros se desbloquean con retos.'
        : 'es parte de la membresía. Hazte miembro para abrirlo y descargarlo.')
    };
  }

  var CANDADO_PW = '<svg class="pw-ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  function chipMiembrosHTML(texto) { return '<span class="pw-chip mt-chip">' + CANDADO_PW + esc(texto || 'Solo miembros') + '</span>'; }

  /* Aviso de arriba (texto con HTML propio y fijo; nada del servidor entra aquí). */
  function textoAvisoPrevia() {
    return '<strong>Vista previa de PDFs y materiales.</strong> Puedes recorrer todo el catálogo, buscar y cambiar de pestaña. ' +
      'Abrir, leer, descargar o guardar un material se activa con tu membresía.';
  }

  /* Franja de la sección de libros para quien no es miembro (en lugar del avance de retos). */
  function bannerVistaPreviaHTML(libros, hrefPlanes) {
    var href = esc(hrefPlanes || RUTA_PLANES);
    var umbrales = (Array.isArray(libros) ? libros : []).map(function (l) { return l ? entero(l.requiereRetos, 0) : 0; }).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; });
    var detalle = umbrales.length
      ? 'Tu primer libro se abre al superar ' + (umbrales[0] === 1 ? '1 reto' : umbrales[0] + ' retos') + ' y los demás, con más retos. Los retos se juegan desde el Club.'
      : 'Los libros se leen aquí mismo, dentro de la plataforma.';
    return '<div class="mt-banner mt-banner--previa"><div class="mt-banner__txt"><strong>Con tu membresía se desbloquean con retos</strong>' +
      '<span>' + esc(detalle) + '</span></div>' +
      '<a class="mt-btn" href="' + href + '">Ver planes</a></div>';
  }

  /* Qué materiales (no libros) entran en cada pestaña. */
  function esGuia(m) { return m && m.tipo !== 'presentacion'; }
  function filtrarMateriales(lista, opc) {
    opc = opc || {};
    var q = normalizar(opc.texto), g = opc.guardados || [];
    return (Array.isArray(lista) ? lista : []).filter(function (m) {
      if (!m) return false;
      if (opc.pestana === 'guias' && !esGuia(m)) return false;
      if (opc.pestana === 'presentaciones' && m.tipo !== 'presentacion') return false;
      if (opc.pestana === 'guardados' && g.indexOf('doc:' + m.id) === -1) return false;
      if (q && normalizar([m.titulo, m.area, m.descripcion, (TIPOS[m.tipo] || {}).nombre].join(' ')).indexOf(q) === -1) return false;
      return true;
    });
  }
  function filtrarLibros(lista, opc) {
    opc = opc || {};
    var q = normalizar(opc.texto), g = opc.guardados || [];
    return (Array.isArray(lista) ? lista : []).filter(function (l) {
      if (!l) return false;
      if (opc.pestana === 'guardados' && g.indexOf('libro:' + l.id) === -1) return false;
      if (q && normalizar([l.titulo, l.subtitulo, l.categoria, l.resumen].join(' ')).indexOf(q) === -1) return false;
      return true;
    });
  }

  /* ---- guardados y avance de lectura (en este navegador, por cuenta) ---- */
  function claveGuardados(uid) { return 'zoo_materiales_guardados_' + String(uid || 'anon'); }
  function claveLectura(uid, id) { return 'zoo_lector_' + String(uid || 'anon') + '_' + String(id || ''); }
  function leerGuardados(alm, uid) {
    try { var v = JSON.parse(alm.getItem(claveGuardados(uid)) || '[]'); return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && /^(libro|doc):[a-z0-9-]{1,60}$/.test(x); }).slice(0, 200) : []; } catch (e) { return []; }
  }
  function alternarGuardado(alm, uid, clave) {
    var lista = leerGuardados(alm, uid);
    var i = lista.indexOf(clave);
    if (i === -1) lista.push(clave); else lista.splice(i, 1);
    try { alm.setItem(claveGuardados(uid), JSON.stringify(lista)); } catch (e) { /* sin almacenamiento */ }
    return lista;
  }
  function leerPagina(alm, uid, id, total) {
    try { var n = parseInt(alm.getItem(claveLectura(uid, id)), 10); return Number.isFinite(n) && n >= 0 && n < total ? n : 0; } catch (e) { return 0; }
  }
  function guardarPagina(alm, uid, id, n) { try { alm.setItem(claveLectura(uid, id), String(entero(n, 0))); } catch (e) { /* nada */ } }

  /* Páginas que se muestran a la vez: 2 en pantalla ancha, 1 en celular (el índice siempre es de la página izquierda). */
  function vistaPaginas(total, indice, ancho, modo) {
    var ancha = ancho >= 900 && total > 1;
    var doble = ancha && modo !== 'una';   // en pantallas angostas siempre es una página
    var i = Math.max(0, Math.min(entero(indice, 0), Math.max(0, total - 1)));
    if (doble && i % 2 === 1) i -= 1;
    var paso = doble ? 2 : 1;
    var paginas = doble ? [i, i + 1].filter(function (p) { return p < total; }) : [i];
    return { indice: i, paginas: paginas, doble: doble, anterior: i > 0 ? Math.max(0, i - paso) : null, siguiente: (i + paso) < total ? i + paso : null };
  }

  /* ───── HTML ───── */
  var ICONOS_PATH = {
    scale: '<path d="M12 3v18"/><path d="M9 21h6"/><path d="M5 6h14"/><path d="M5 6l-2 6a3 3 0 0 0 6 0l-2 -6"/><path d="M19 6l-2 6a3 3 0 0 0 6 0l-2 -6"/>',
    heartpulse: '<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/><path d="M3.5 12h3l1.5 -3l2 6l1 -3h2.5"/>',
    leaf: '<path d="M5 21c.5 -4.5 2.5 -8 7 -10"/><path d="M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3z"/>',
    book: '<path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6v13"/><path d="M12 6v13"/><path d="M21 6v13"/>'
  };
  function iconoSVG(nombre, tam) {
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONOS_PATH[nombre] || ICONOS_PATH.book) + '</svg>';
  }
  var FOLDER = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2"/></svg>';
  var CANDADO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var MARCADOR = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10a1 1 0 0 1 1 1v15l-6 -4l-6 4v-15a1 1 0 0 1 1 -1z"/></svg>';

  function pinHTML(clave, guardado) {
    return '<button type="button" class="mt-pin' + (guardado ? ' is-on' : '') + '" data-guardar="' + esc(clave) + '" aria-pressed="' + (guardado ? 'true' : 'false') + '" aria-label="' + (guardado ? 'Quitar de guardados' : 'Guardar') + '" title="' + (guardado ? 'Quitar de guardados' : 'Guardar') + '">' + MARCADOR + '</button>';
  }

  function libroCardHTML(l, ctx) {
    ctx = ctx || {};
    var color = colorSeguro(l.color, '#1F5F3A');
    var abierto = !!l.desbloqueado;
    var previa = !abierto && esVistaPrevia(l);
    var pag = ctx.pagina || 0, tot = entero(l.paginasTotal, 0);
    var barra;
    if (previa) {
      barra = '<div class="mt-previa">' + chipMiembrosHTML('Solo miembros') + (tot ? '<span class="mt-previa__pag">' + tot + ' páginas</span>' : '') + '</div>';
    } else if (abierto) {
      var pct = tot ? Math.round((pag + (pag > 0 ? 1 : 0)) * 100 / tot) : 0;
      barra = '<div class="mt-prog"><i style="width:' + Math.min(100, pct) + '%"></i></div><div class="mt-prog__txt">' + (pag > 0 ? 'Página ' + (pag + 1) + ' de ' + tot : (tot ? tot + ' páginas' : 'Libro')) + '</div>';
    } else {
      var req = entero(l.requiereRetos, 0), hechos = Math.max(0, req - entero(l.faltan, req));
      barra = '<div class="mt-prog mt-prog--bloq"><i style="width:' + (req ? Math.min(100, Math.round(hechos * 100 / req)) : 0) + '%"></i></div><div class="mt-prog__txt">' + esc(textoBloqueo(l)) + '</div>';
    }
    return '<article class="mt-libro' + (abierto ? '' : (previa ? ' is-previa' : ' is-bloq')) + '" data-libro="' + esc(l.id) + '" tabindex="0" role="button" aria-label="' + esc(l.titulo) + (abierto ? '' : (previa ? ' (solo miembros)' : ' (bloqueado)')) + '">' +
      '<div class="mt-libro__top" style="--mt-c:' + esc(color) + '">' +
        fotoLibroHTML(l) +
        '<span class="mt-libro__lomo"></span>' +
        (portadaDe(l.id) ? '' : '<span class="mt-libro__icono">' + iconoSVG(l.icono, 54) + '</span>') +
        '<div class="mt-libro__sobre"><small>' + esc(l.categoria || 'Libro') + '</small><strong>' + esc(l.titulo) + '</strong>' + (l.subtitulo ? '<em>' + esc(l.subtitulo) + '</em>' : '') + '</div>' +
        '<span class="mt-libro__ed">Edición Zoorigen</span>' +
        (abierto ? '' : '<span class="mt-libro__lock" aria-hidden="true">' + CANDADO + '</span>') +
        pinHTML('libro:' + l.id, !!ctx.guardado) +
      '</div>' +
      '<h3 class="mt-libro__t">' + esc(l.titulo) + '</h3><div class="mt-libro__a">' + esc(l.autor || 'Equipo Zoorigen') + '</div>' + barra +
    '</article>';
  }

  function libroDestacadoHTML(l) {
    if (!l) return '';
    var color = colorSeguro(l.color, '#1F5F3A'), abierto = !!l.desbloqueado, previa = !abierto && esVistaPrevia(l);
    return '<section class="mt-dest" data-libro="' + esc(l.id) + '" style="--mt-c:' + esc(color) + '">' +
      '<div class="mt-dest__portada"><div class="mt-libro__top mt-dest__libro" style="--mt-c:' + esc(color) + '">' + fotoLibroHTML(l) + '<span class="mt-libro__lomo"></span>' + (portadaDe(l.id) ? '' : '<span class="mt-libro__icono">' + iconoSVG(l.icono, 72) + '</span>') +
        '<div class="mt-libro__sobre"><small>' + esc(l.categoria || 'Libro') + '</small><strong>' + esc(l.titulo) + '</strong></div></div></div>' +
      '<div class="mt-dest__info"><div class="mt-etq">' + (abierto || previa ? 'Libro destacado' : 'Próximo libro por desbloquear') + '</div>' +
        '<h2>' + esc(l.titulo) + '</h2><div class="mt-dest__autor">' + esc(l.subtitulo || '') + (l.subtitulo ? ' · ' : '') + esc(l.autor || 'Equipo Zoorigen') + '</div>' +
        '<p>' + esc(l.resumen || '') + '</p>' +
        '<div class="mt-dest__acc"><button type="button" class="mt-btn" data-abrir-libro="' + esc(l.id) + '">' + (abierto || previa ? 'Leer ahora' : esc(textoBloqueo(l)) ) + '</button>' +
        (previa ? chipMiembrosHTML('Solo miembros') : '') +
        '<span class="mt-dest__meta">Libro · ' + entero(l.paginasTotal, 0) + ' páginas</span></div></div></section>';
  }

  function bannerRetosHTML(meta, hrefRetos) {
    if (!meta) return '';
    var href = esc(hrefRetos || 'club-retos.html');
    if (meta.todosAbiertos) return '<div class="mt-banner mt-banner--ok"><div><strong>Desbloqueaste todos los libros</strong><span>Llevas ' + meta.superados + ' retos superados. ¡Gracias por seguir aprendiendo!</span></div></div>';
    return '<div class="mt-banner"><div class="mt-banner__txt"><strong>«' + esc(meta.libro.titulo) + '» · llevas ' + meta.superados + ' de ' + meta.requiere + ' retos</strong>' +
      '<span>Supera ' + (meta.faltan === 1 ? '1 reto más' : meta.faltan + ' retos más') + ' para abrir tu siguiente libro.</span>' +
      '<div class="mt-prog mt-prog--banner"><i style="width:' + meta.porcentaje + '%"></i></div></div>' +
      '<a class="mt-btn mt-btn--suave" href="' + href + '">Ir a los retos</a></div>';
  }

  function fotoLibroHTML(l) {
    var src = portadaDe(l && l.id);
    return src ? '<img class="mt-libro__foto" src="' + esc(src) + '" alt="" width="168" height="237" loading="lazy" decoding="async">' : '';
  }

  function fotoDeMaterial(m) {
    var propia = portadaDe(m && m.id);
    if (propia) return propia;
    var area = String((m && (m.area || '')) + ' ' + (m && m.titulo || ''));
    for (var i = 0; i < FOTOS.length; i++) if (FOTOS[i][0].test(area)) return FOTOS[i][1];
    return FOTO_GENERAL;
  }

  function materialCardHTML(m, ctx) {
    ctx = ctx || {};
    var t = TIPOS[m.tipo] || { nombre: 'Material', color: '#2F7A4F' };
    var abierto = !!m.desbloqueado;
    var previa = !abierto && esVistaPrevia(m);
    var req = entero(m.requiereRetos, 0), hechos = Math.max(0, req - entero(m.faltan, req));
    var bloqueo = req > 0 ? condicionTexto(m) : textoBloqueo(m);
    var etiq = abierto ? '' : (previa ? '<div class="mt-previa">' + chipMiembrosHTML('Solo miembros') + '</div>' : '<span class="mt-doc__lock">' + CANDADO + esc(bloqueo) + '</span>' +
      (req > 0 ? '<div class="mt-prog mt-prog--bloq" role="img" aria-label="' + hechos + ' de ' + req + ' retos"><i style="width:' + Math.min(100, Math.round(hechos * 100 / req)) + '%"></i></div>' : ''));
    var pags = m.paginas ? entero(m.paginas, 0) + (entero(m.paginas, 0) === 1 ? ' página' : ' páginas') : '';
    return '<article class="mt-doc' + (abierto ? '' : (previa ? ' is-previa' : ' is-bloq')) + '" data-doc="' + esc(m.id) + '" tabindex="0" role="button" aria-label="' + esc(m.titulo) + (abierto ? '' : (previa ? ' (solo miembros)' : ' (bloqueado)')) + '">' +
      '<div class="mt-doc__portada" style="--mt-c:' + esc(t.color) + '"><img class="mt-doc__foto" src="' + esc(fotoDeMaterial(m)) + '" alt="" width="300" height="411" loading="lazy" decoding="async">' +
        '<span class="mt-doc__marca">ZOO<b>RIGEN</b></span><span class="mt-doc__pdf">PDF</span>' + pinHTML('doc:' + m.id, !!ctx.guardado) +
        (abierto ? '' : '<span class="mt-doc__candado" aria-hidden="true">' + CANDADO + '</span>') +
        '<div class="mt-doc__tarjeta"><small>' + esc(m.area || t.nombre) + '</small><strong>' + esc(m.titulo) + '</strong><em>' + esc(t.nombre) + (pags ? ' · ' + pags : '') + '</em></div></div>' +
      '<div class="mt-doc__pie"><span class="mt-doc__chip">PDF</span><span class="mt-doc__sub">' + esc(m.tipo === 'presentacion' ? 'Presentación' : 'Material de apoyo') + '</span></div>' +
      '<div class="mt-doc__area">' + FOLDER + esc(m.area || '') + '</div>' + etiq + '</article>';
  }

  /* ───── materiales de curso, por retos y para miembros: la condición, clara, y la fila con candado y avance ─────
     El servidor manda en cada material: desbloqueado, soloMiembros, faltan, requiereRetos y, si va ligado a un curso,
     condicion ('clase' | 'curso'), cursoId, clase (1 = primera) y cursoTitulo. Aquí solo se redacta; quien decide es el servidor. */
  function reglaTexto(item) {
    if (!item) return '';
    var c = item.condicion || '';
    var clase = entero(item.clase, 0);
    if (c === 'clase' || (item.cursoId && clase > 0)) {
      return 'Se desbloquea al terminar la clase ' + (clase || 1) + (item.cursoTitulo ? ' de «' + item.cursoTitulo + '»' : ' del curso');
    }
    var req = entero(item.requiereRetos, 0);
    if (req > 0) return 'Resuelve ' + (req === 1 ? '1 reto' : req + ' retos') + ' para abrirlo';
    if (item.cursoId) return 'Material del curso' + (item.cursoTitulo ? ' «' + item.cursoTitulo + '»' : '');
    return 'Disponible con tu membresía';
  }
  function condicionTexto(item) {
    if (!item || item.desbloqueado) return '';
    if (item.soloMiembros) return 'Solo para miembros';
    if (item.pendiente) return 'Disponible muy pronto';
    return reglaTexto(item);
  }
  /* Lo que se lee en un material ya abierto */
  function textoAbierto(item) {
    if (!item) return '';
    var c = item.condicion || '', clase = entero(item.clase, 0);
    if (c === 'clase' || (item.cursoId && clase > 0)) return 'Desbloqueado: terminaste la clase ' + (clase || 1);
    if (item.cursoId) return 'Material del curso';
    if (entero(item.requiereRetos, 0) > 0) return 'Desbloqueado con tus retos';
    return 'Disponible con tu membresía';
  }

  var ICO_ARCHIVO = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>';
  var ICO_OK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  /* Fila de un material (de curso o suelto): título, condición con candado y, si pide retos, su avance. */
  function filaMaterialHTML(m, ctx) {
    ctx = ctx || {};
    var fuente = m && m.fuente === 'drive' ? 'drive' : 'catalogo';
    var abierto = !!m.desbloqueado, previa = !abierto && esVistaPrevia(m);
    var texto = abierto ? textoAbierto(m) : (previa ? reglaTexto(m) : condicionTexto(m));
    var meta = [m.area, entero(m.paginas, 0) ? entero(m.paginas, 0) + (entero(m.paginas, 0) === 1 ? ' página' : ' páginas') : ''].filter(Boolean).map(esc).join(' · ');
    var req = entero(m.requiereRetos, 0), progreso = '';
    if (!abierto && !previa && !m.pendiente && !m.cursoId && req > 0) {
      var hechos = Math.max(0, req - entero(m.faltan, req));
      progreso = '<div class="mt-prog mt-prog--bloq mt-fila__prog" role="img" aria-label="' + hechos + ' de ' + req + ' retos"><i style="width:' + Math.min(100, Math.round(hechos * 100 / req)) + '%"></i></div>' +
        '<span class="mt-fila__cuenta">' + hechos + ' de ' + req + ' retos</span>';
    }
    return '<article class="mt-fila' + (abierto ? ' is-abierto' : (previa ? ' is-previa' : ' is-bloq')) + '" data-fila="' + fuente + ':' + esc(m.id) + '" tabindex="0" role="button" aria-label="' +
      esc(m.titulo) + (abierto ? '' : (previa ? ' (solo miembros)' : ' (bloqueado)')) + '">' +
      '<span class="mt-fila__ico">' + ICO_ARCHIVO + '</span>' +
      '<div class="mt-fila__cuerpo"><strong>' + esc(m.titulo) + '</strong>' + (meta ? '<small>' + meta + '</small>' : '') +
        '<span class="mt-fila__cond' + (abierto ? ' is-ok' : '') + '">' + (abierto ? ICO_OK : CANDADO) + '<span>' + esc(texto) + '</span></span>' + progreso + '</div>' +
      '<span class="mt-fila__acc">' + (abierto ? '<span class="mt-fila__abrir">Abrir</span>' : (previa ? chipMiembrosHTML('Solo miembros') : '')) + '</span></article>';
  }

  /* Agrupa por curso (en el orden en que aparecen); dentro de cada curso, por clase y luego por título. */
  function agruparPorCurso(items) {
    var mapa = Object.create(null), orden = [];
    (Array.isArray(items) ? items : []).forEach(function (m) {
      if (!m || typeof m.cursoId !== 'string' || !m.cursoId) return;
      if (!mapa[m.cursoId]) { mapa[m.cursoId] = { cursoId: m.cursoId, titulo: '', items: [] }; orden.push(m.cursoId); }
      if (!mapa[m.cursoId].titulo && m.cursoTitulo) mapa[m.cursoId].titulo = m.cursoTitulo;
      mapa[m.cursoId].items.push(m);
    });
    return orden.map(function (k) {
      var g = mapa[k];
      g.items.sort(function (a, b) { return ((entero(a.clase, 0) || 999) - (entero(b.clase, 0) || 999)) || String(a.titulo).localeCompare(String(b.titulo), 'es'); });
      g.abiertos = g.items.filter(function (x) { return x.desbloqueado; }).length;
      if (!g.titulo) g.titulo = 'Curso';
      return g;
    });
  }

  /* "Materiales de tus cursos": un bloque por curso con sus filas y la liga para ir al curso. */
  function seccionCursosHTML(grupos, hrefCursos) {
    var base = esc(hrefCursos || 'club-biblioteca.html');
    if (!grupos || !grupos.length) return '';
    return '<p class="mt-nota">Estos materiales se abren al terminar la clase que indica cada uno: en el curso, marca la clase como vista y el material se desbloquea.</p>' +
      grupos.map(function (g) {
        return '<div class="mt-curso"><div class="mt-curso__cab"><h3>' + esc(g.titulo) + '</h3><span>' + g.abiertos + ' de ' + g.items.length + ' abiertos</span>' +
          '<a class="mt-link" href="' + base + '?curso=' + encodeURIComponent(g.cursoId) + '">Ir al curso</a></div>' +
          '<div class="mt-filas">' + g.items.map(function (m) { return filaMaterialHTML(m, {}); }).join('') + '</div></div>';
      }).join('');
  }

  /* Bloque "Material de este curso" del detalle de un curso (club-biblioteca.html): las filas con su estado. */
  function seccionDetalleCursoHTML(lista) {
    var items = (Array.isArray(lista) ? lista : []).filter(Boolean);
    if (!items.length) return '';
    var abiertos = items.filter(function (x) { return x.desbloqueado; }).length;
    return '<div class="zc-sec zc-sec--material"><h3>MATERIAL DE ESTE CURSO</h3><span>' + abiertos + '/' + items.length + ' abiertos</span></div>' +
      '<div class="mt-filas mt-filas--curso">' + items.map(function (m) { return filaMaterialHTML(m, {}); }).join('') + '</div>';
  }

  /* Los materiales sueltos (sin curso) también se ven como filas; los de curso, en su bloque. */
  function esDeCurso(m) { return !!(m && typeof m.cursoId === 'string' && m.cursoId); }

  function oficialesHTML() {
    return '<div class="mt-oficiales">' + OFICIALES.map(function (o) {
      return '<a class="mt-ofi" href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer"><span class="mt-ofi__tipo">' + esc(o.tipo) + '</span><strong>' + esc(o.titulo) + '</strong><small>' + esc(o.detalle) + '</small><span class="mt-ofi__ir">Abrir fuente oficial <svg class="zi" aria-hidden="true"><use href="#zi-arrow-up-right"/></svg></span></a>';
    }).join('') + '</div><p class="mt-nota">Estos documentos son textos oficiales. Se abren en el sitio de la autoridad que los publica, así siempre ves la versión vigente.</p>';
  }

  /* Una página del libro. */
  function paginaHTML(p, numero, total, tituloLibro) {
    p = p || {};
    var parrafos = (Array.isArray(p.parrafos) ? p.parrafos : []).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
    var lista = Array.isArray(p.lista) && p.lista.length ? '<ul>' + p.lista.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
    return '<div class="rdr-hoja" lang="es"><div class="rdr-hoja__cab"><span>' + esc(String(tituloLibro || '').toUpperCase()) + '</span><span>' + (numero + 1) + '</span></div>' +
      '<h3>' + esc(p.titulo || '') + '</h3><div class="rdr-texto">' + parrafos + lista + '</div></div>';
  }

  var API = {
    OFICIALES: OFICIALES, TIPOS: TIPOS, PESTANAS: PESTANAS,
    fotoDeMaterial: function (m) { return fotoDeMaterial(m); }, portadaDe: portadaDe, PORTADAS: PORTADAS, esc: esc, normalizar: normalizar, urlHttps: urlHttps, siguienteMeta: siguienteMeta, textoBloqueo: textoBloqueo, mensajeBloqueo: mensajeBloqueo,
    filtrarMateriales: filtrarMateriales, filtrarLibros: filtrarLibros,
    leerGuardados: leerGuardados, alternarGuardado: alternarGuardado, leerPagina: leerPagina, guardarPagina: guardarPagina, claveGuardados: claveGuardados, claveLectura: claveLectura,
    vistaPaginas: vistaPaginas, libroCardHTML: libroCardHTML, libroDestacadoHTML: libroDestacadoHTML, bannerRetosHTML: bannerRetosHTML,
    materialCardHTML: materialCardHTML, oficialesHTML: oficialesHTML, paginaHTML: paginaHTML,
    condicionTexto: condicionTexto, reglaTexto: reglaTexto, textoAbierto: textoAbierto, filaMaterialHTML: filaMaterialHTML, agruparPorCurso: agruparPorCurso,
    seccionCursosHTML: seccionCursosHTML, seccionDetalleCursoHTML: seccionDetalleCursoHTML, esDeCurso: esDeCurso,
    esVistaPrevia: esVistaPrevia, hayVistaPrevia: hayVistaPrevia, respaldoLibros: respaldoLibros, respaldoMateriales: respaldoMateriales,
    resumenCatalogo: resumenCatalogo, textoPaywallRecurso: textoPaywallRecurso, chipMiembrosHTML: chipMiembrosHTML,
    textoAvisoPrevia: textoAvisoPrevia, bannerVistaPreviaHTML: bannerVistaPreviaHTML, RUTA_PLANES: RUTA_PLANES
  };

  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* VISOR DE UN MATERIAL (lo usan esta pantalla y el detalle de un curso) */
  /* ============================================================ */
  /* El archivo o el enlace los entrega SOLO el servidor, y solo a quien cumple la regla del material:
       · material del catálogo de archivos → GET /api/materiales/:id/archivo (el PDF; aquí se muestra con una URL de blob)
       · PDF de Drive del panel → GET /api/materiales/drive/:id/enlace (la dirección de Drive; se muestra su vista previa). */
  var visorActivo = null;
  var DRIVE_URL = /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{10,200}\/(view|preview)$/;
  function cerrarVisorMaterial() {
    if (!visorActivo) return;
    if (visorActivo.url) URL.revokeObjectURL(visorActivo.url);
    visorActivo.nodo.remove(); document.body.classList.remove('mt-noscroll'); visorActivo = null;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarVisorMaterial(); });

  /* club: ZOORIGEN_CLUB (apiFetch / apiBlob) · m: el resumen que mandó el servidor · fuente: 'catalogo' | 'drive' */
  function abrirVisorMaterial(club, m, fuente) {
    cerrarVisorMaterial();
    var esDrive = fuente === 'drive';
    var nodo = document.createElement('div'); nodo.className = 'mt-visor'; nodo.setAttribute('role', 'dialog'); nodo.setAttribute('aria-modal', 'true'); nodo.setAttribute('aria-label', m.titulo);
    nodo.innerHTML = '<div class="mt-visor__ventana"><div class="mt-visor__cab"><strong>' + esc(m.titulo) + '</strong><div class="mt-visor__acc"><a class="mt-icono" id="mvDescargar" hidden title="Descargar PDF" aria-label="Descargar PDF"><svg class="zi" aria-hidden="true"><use href="#zi-download"/></svg></a><a class="mt-icono" id="mvAbrir" hidden target="_blank" rel="noopener noreferrer" title="Abrir en otra pestaña" aria-label="Abrir en otra pestaña"><svg class="zi" aria-hidden="true"><use href="#zi-arrow-up-right"/></svg></a><button type="button" class="mt-icono" id="mvX" aria-label="Cerrar"><svg class="zi" aria-hidden="true"><use href="#zi-x"/></svg></button></div></div>' +
      '<div class="mt-visor__cuerpo" id="mvCuerpo"><div class="mt-vacio">Preparando el documento…</div></div></div>';
    document.body.appendChild(nodo); document.body.classList.add('mt-noscroll');
    visorActivo = { nodo: nodo, url: '' };
    nodo.querySelector('#mvX').onclick = cerrarVisorMaterial;
    nodo.addEventListener('click', function (e) { if (e.target === nodo) cerrarVisorMaterial(); });
    var pedir = esDrive
      ? Promise.resolve().then(function () { return club.apiFetch('/api/materiales/drive/' + encodeURIComponent(m.id) + '/enlace'); })
      : Promise.resolve().then(function () { return club.apiBlob('/api/materiales/' + encodeURIComponent(m.id) + '/archivo'); });
    return pedir.then(function (r) {
      if (!visorActivo || visorActivo.nodo !== nodo) return;
      var cuerpo = nodo.querySelector('#mvCuerpo'), ab = nodo.querySelector('#mvAbrir');
      if (esDrive) {
        var vista = r && DRIVE_URL.test(String(r.vista || '')) ? r.vista : '', ver = r && DRIVE_URL.test(String(r.url || '')) ? r.url : '';
        if (!vista) throw new Error('El enlace del material no es válido.');
        cuerpo.innerHTML = '<iframe title="' + esc(m.titulo) + '" src="' + esc(vista) + '" allow="autoplay"></iframe>';
        if (ver) { ab.href = ver; ab.hidden = false; }
        return;
      }
      visorActivo.url = URL.createObjectURL(r);
      var d = nodo.querySelector('#mvDescargar'); d.href = visorActivo.url; d.download = m.id + '.pdf'; d.hidden = false; ab.href = visorActivo.url; ab.hidden = false;
      var chico = window.innerWidth < 760;
      cuerpo.innerHTML = chico
        ? '<div class="mt-vacio"><strong>Tu documento está listo</strong><span>En el celular es mejor abrirlo o descargarlo.</span><a class="mt-btn" href="' + esc(visorActivo.url) + '" target="_blank" rel="noopener">Abrir PDF</a></div>'
        : '<iframe title="' + esc(m.titulo) + '" src="' + esc(visorActivo.url) + '#navpanes=0"></iframe>';
    }).catch(function (e) {
      if (!visorActivo || visorActivo.nodo !== nodo) return;
      nodo.querySelector('#mvCuerpo').innerHTML = '<div class="mt-vacio"><strong>No se pudo abrir</strong><span>' + esc(e && e.message ? e.message : 'Inténtalo de nuevo.') + '</span></div>';
    });
  }

  /* ============================================================ */
  /* PANTALLA                                                      */
  /* ============================================================ */
  function montar(o) {
    var sesion = o.sesion, club = o.club, cont = o.contenedor;
    var uid = sesion.uid;
    var alm = (function () { try { return window.localStorage; } catch (e) { return null; } })() || { getItem: function () { return null; }, setItem: function () {} };
    var estado = { libros: [], materiales: [], superados: 0, pestana: 'todo', texto: '', drive: [], errorServidor: '', cargando: true, previa: false };
    var hrefPlanes = o.hrefPlanes || RUTA_PLANES;
    var PW = function () { return (typeof window !== 'undefined' && window.ZOO_PAYWALL && typeof window.ZOO_PAYWALL === 'object') ? window.ZOO_PAYWALL : null; };
    /* ¿La sesión parece de miembro? Solo para decidir qué pedir al cargar; lo que se muestra lo decide el servidor. */
    function creeMiembro() {
      var pw = PW();
      if (pw && typeof pw.miembro === 'function') return !!pw.miembro();
      try { return sesion.role === 'admin' || !!(club && typeof club.hasActiveMembership === 'function' && club.hasActiveMembership(sesion)); } catch (e) { return false; }
    }
    estado.previa = !creeMiembro();

    function toast(msg, malo) {
      var t = document.getElementById('mtToast');
      if (!t) { t = document.createElement('div'); t.id = 'mtToast'; t.className = 'mt-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
      t.textContent = msg; t.classList.toggle('is-mal', !!malo); t.classList.add('is-on');
      clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('is-on'); }, 4200);
    }
    function guardados() { return leerGuardados(alm, uid); }

    function pintar() {
      var g = guardados(), p = estado.pestana, q = estado.texto;
      var libros = filtrarLibros(estado.libros, { pestana: p, texto: q, guardados: g });
      /* Los materiales ligados a un curso van en su propio bloque ("De tus cursos"); aquí, los sueltos. Los PDF de Drive del panel
         (estado.drive) vienen del servidor SIN enlace: el enlace se pide al abrir. */
      var docs = filtrarMateriales(estado.materiales.filter(function (m) { return !esDeCurso(m); }), { pestana: p, texto: q, guardados: g });
      var nq = normalizar(q);
      var coincide = function (m) { return !nq || normalizar([m.titulo, m.area, m.cursoTitulo].join(' ')).indexOf(nq) !== -1; };
      var deCurso = estado.materiales.filter(esDeCurso).concat(estado.drive.filter(esDeCurso));
      var gruposCurso = agruparPorCurso(deCurso.filter(coincide));
      var sueltosDrive = estado.drive.filter(function (m) { return !esDeCurso(m); }).filter(coincide);
      var meta = siguienteMeta(estado.libros, estado.superados);
      var verLibros = p === 'todo' || p === 'libros' || p === 'guardados';
      var verDocs = p === 'todo' || p === 'guias' || p === 'presentaciones' || p === 'guardados';
      var previa = !!estado.previa;
      var html = '';

      if (previa) {
        var pw = PW();
        html += pw && typeof pw.avisoVistaPreviaHTML === 'function' ? pw.avisoVistaPreviaHTML(textoAvisoPrevia()) : '<div class="pw-aviso" role="note"><span>' + textoAvisoPrevia() + '</span></div>';
      }
      var subtitulo = previa
        ? 'Explora los libros, guías y plantillas del Club. Con tu membresía los abres, los descargas y los guardas; los libros se desbloquean con tus retos.'
        : 'Libros que se desbloquean con tus retos, guías y plantillas para descargar, presentaciones y los textos oficiales de la normatividad.';
      var cifras = resumenCatalogo(estado.libros, estado.materiales.concat(estado.drive), previa, estado.superados);
      var SEC = typeof window !== 'undefined' ? window.ZOO_SECCION : null;
      if (SEC && typeof SEC.html === 'function') {
        html += SEC.html({
          id: 'zsSeccionPdfs', seccion: 'pdfs', icono: 'files', eyebrow: 'Biblioteca del Club',
          titulo: 'PDFs y materiales,', acento: 'para llevar contigo.', sub: subtitulo,
          cifras: cifras.map(function (k, i) { return { clave: 'mt' + i, valor: k.valor, rotulo: k.etiqueta }; })
        });
      } else {
        html += '<section class="mt-hero"><div><div class="mt-etq">Biblioteca del Club</div><h1>PDFs y materiales</h1><p>' + esc(subtitulo) + '</p></div>' +
          '<div class="mt-hero__kpis">' + cifras.map(function (k) {
            return '<div><strong>' + esc(k.valor) + '</strong><span>' + esc(k.etiqueta) + '</span></div>'; }).join('') + '</div></section>';
      }

      html += '<div class="mt-barra"><div class="mt-tabs" role="tablist">' + PESTANAS.filter(function (t) { return (t[0] !== 'mas' || estado.drive.some(function (m) { return !esDeCurso(m); })) && (t[0] !== 'cursos' || deCurso.length); }).map(function (t) {
        return '<button type="button" role="tab" class="mt-tab' + (p === t[0] ? ' is-active' : '') + '" data-pestana="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
        '<div class="mt-buscar"><input type="search" id="mtBuscar" placeholder="Buscar…" value="' + esc(q) + '" aria-label="Buscar"></div></div>';

      if (estado.errorServidor && (verLibros || verDocs)) {
        html += '<div class="mt-aviso">' + esc(estado.errorServidor) + ' <button type="button" class="mt-link" id="mtReintentar">Reintentar</button></div>';
      }

      if (previa && p === 'guardados' && !libros.length && !docs.length) {
        html += '<section class="mt-bloque"><div class="mt-vacio"><strong>Tus guardados aparecerán aquí</strong>' +
          '<span>Guardar libros y materiales es una función de membresía.</span><a class="mt-btn" href="' + esc(hrefPlanes) + '">Ver planes</a></div></section>';
        verLibros = false; verDocs = false;
      }

      if (verLibros) {
        html += '<section class="mt-bloque"><div class="mt-bloque__t"><h2>Libros</h2></div>';
        if (p === 'todo' || p === 'libros') html += previa ? bannerVistaPreviaHTML(estado.libros, hrefPlanes) : bannerRetosHTML(meta, o.hrefRetos);
        if (libros.length) {
          var dest = meta && !meta.todosAbiertos ? libros.filter(function (l) { return l.id === meta.libro.id; })[0] : (libros.filter(function (l) { return l.desbloqueado; })[0] || libros[0]);
          if ((p === 'todo' || p === 'libros') && !q) html += libroDestacadoHTML(dest || libros[0]);
          html += '<div class="mt-estante">' + libros.map(function (l) { return libroCardHTML(l, { guardado: g.indexOf('libro:' + l.id) !== -1, pagina: leerPagina(alm, uid, l.id, entero(l.paginasTotal, 0)) }); }).join('') + '</div>';
        } else {
          html += '<div class="mt-vacio">' + (estado.libros.length ? 'No hay libros con ese filtro.' : (estado.cargando ? 'Cargando…' : 'Todavía no hay libros publicados.')) + '</div>';
        }
        html += '</section>';
      }
      if (verDocs) {
        html += '<section class="mt-bloque"><div class="mt-bloque__t"><h2>' + (p === 'presentaciones' ? 'Presentaciones' : 'Guías, plantillas y presentaciones') + '</h2></div>';
        html += docs.length ? '<div class="mt-grid">' + docs.map(function (m) { return materialCardHTML(m, { guardado: g.indexOf('doc:' + m.id) !== -1 }); }).join('') + '</div>'
          : '<div class="mt-vacio">' + (estado.materiales.length ? 'No hay materiales con ese filtro.' : (estado.cargando ? 'Cargando…' : 'Todavía no hay materiales publicados.')) + '</div>';
        html += '</section>';
      }
      if ((p === 'todo' || p === 'cursos') && deCurso.length) {
        html += '<section class="mt-bloque"><div class="mt-bloque__t"><h2>Materiales de tus cursos</h2></div>' +
          (gruposCurso.length ? seccionCursosHTML(gruposCurso, o.hrefCursos) : '<div class="mt-vacio">No hay materiales con ese filtro.</div>') + '</section>';
      }
      if (p === 'todo' || p === 'oficiales') html += '<section class="mt-bloque"><div class="mt-bloque__t"><h2>Documentos oficiales</h2></div>' + oficialesHTML() + '</section>';
      if ((p === 'todo' || p === 'mas') && sueltosDrive.length) html += '<section class="mt-bloque"><div class="mt-bloque__t"><h2>Más materiales</h2></div><div class="mt-filas">' + sueltosDrive.map(function (m) { return filaMaterialHTML(m, {}); }).join('') + '</div></section>';
      cont.innerHTML = html;
    }

    /* Quien no es miembro NO abre, lee ni descarga: ventana con "Ver planes" / "Seguir explorando".
       Nada de esto llama al servidor de contenido (/api/libros/:id, /api/materiales/:id/archivo). */
    function pedirMembresiaRecurso(item, esLibro) {
      var pw = PW();
      if (pw && typeof pw.modalPaywall === 'function' && pw.modalPaywall(textoPaywallRecurso(item, esLibro)) === false) return;
      toast(mensajeBloqueo(item), true);   // sin el módulo, o el módulo cree que es miembro y el servidor no
    }
    function pedirMembresiaFuncion(nombre) {
      var pw = PW();
      if (pw && typeof pw.requiereMembresia === 'function' && pw.requiereMembresia(nombre) === false) return;
      toast('Esta función es para miembros. Activa tu membresía para usarla.', true);
    }

    /* ───── lector de libros ───── */
    var lector = null;
    function abrirLibro(id) {
      var meta = estado.libros.filter(function (l) { return l.id === id; })[0];
      if (!meta) return;
      if (esVistaPrevia(meta)) { pedirMembresiaRecurso(meta, true); return; }
      if (!meta.desbloqueado) { toast(mensajeBloqueo(meta), true); return; }
      toast('Abriendo libro…');
      club.apiFetch('/api/libros/' + encodeURIComponent(id)).then(function (r) {
        var libro = r && r.libro; if (!libro || !Array.isArray(libro.paginas) || !libro.paginas.length) throw new Error('El libro no tiene páginas.');
        mostrarLector(libro);
      }).catch(function (e) { toast(e && e.message ? e.message : 'No se pudo abrir el libro.', true); });
    }
    function cerrarLector() {
      if (!lector) return;
      document.removeEventListener('keydown', lector.teclas); window.removeEventListener('resize', lector.redim);
      clearTimeout(lector.t1); clearTimeout(lector.t2);
      lector.nodo.remove(); document.body.classList.remove('mt-noscroll'); lector = null; pintar();
    }
    function mostrarLector(libro) {
      cerrarLector();
      var tt = document.getElementById('mtToast'); if (tt) tt.classList.remove('is-on');
      var total = libro.paginas.length, guardada = leerPagina(alm, uid, libro.id, total), indice = guardada;
      var modo = '';
      try { modo = alm.getItem('zoo_lector_modo') || ''; } catch (e) { modo = ''; }
      var reducir = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      var nodo = document.createElement('div'); nodo.className = 'rdr'; nodo.setAttribute('role', 'dialog'); nodo.setAttribute('aria-modal', 'true'); nodo.setAttribute('aria-label', libro.titulo);
      nodo.innerHTML = '<div class="rdr-cab"><button type="button" class="rdr-volver" id="rdrX">← PDFs y materiales</button>' +
        '<div class="rdr-cab__t"><strong>' + esc(libro.titulo) + '</strong><small>' + esc(String(libro.categoria || '').toUpperCase()) + '</small></div>' +
        '<div class="rdr-cab__acc"><button type="button" class="rdr-modo" id="rdrModo"></button><button type="button" class="rdr-x" id="rdrX2" aria-label="Cerrar libro"><svg class="zi" aria-hidden="true"><use href="#zi-x"/></svg></button></div></div>' +
        '<div class="rdr-continuar" id="rdrCont" hidden></div>' +
        '<div class="rdr-cuerpo"><button type="button" class="rdr-nav" id="rdrAnt" aria-label="Página anterior">←</button>' +
        '<div class="rdr-escena"><div class="rdr-libro" id="rdrLibro" tabindex="0"></div></div>' +
        '<button type="button" class="rdr-nav" id="rdrSig" aria-label="Página siguiente">→</button></div>' +
        '<div class="rdr-pie"><label class="rdr-ir">Ir a <select id="rdrIr" aria-label="Ir a la página"></select></label><div class="rdr-barra" id="rdrBarra" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div><span id="rdrTxt"></span></div>';
      document.body.appendChild(nodo); document.body.classList.add('mt-noscroll');
      var escena = nodo.querySelector('#rdrLibro'), sel = nodo.querySelector('#rdrIr'), ocupado = false;
      sel.innerHTML = libro.paginas.map(function (p, i) { return '<option value="' + i + '">' + (i + 1) + '. ' + esc(String(p.titulo || '').slice(0, 40)) + '</option>'; }).join('');
      var hoja = function (n) { return paginaHTML(libro.paginas[n], n, total, libro.titulo); };
      var papel = '<div class="rdr-hoja rdr-hoja--vacia"></div>';

      function pintarModo(v) { var b = nodo.querySelector('#rdrModo'); b.textContent = v.doble ? 'Una página' : 'Dos páginas'; b.setAttribute('aria-pressed', v.doble ? 'true' : 'false'); }
      function poner(v) {
        indice = v.indice; guardarPagina(alm, uid, libro.id, indice);
        escena.className = 'rdr-libro' + (v.doble ? ' rdr-libro--doble' : '');
        escena.innerHTML = v.paginas.map(hoja).join('');
        var ult = v.paginas[v.paginas.length - 1], pct = Math.round((ult + 1) * 100 / total);
        nodo.querySelector('#rdrBarra i').style.width = pct + '%'; nodo.querySelector('#rdrBarra').setAttribute('aria-valuenow', String(pct));
        nodo.querySelector('#rdrTxt').textContent = (v.doble && v.paginas.length > 1 ? 'Páginas ' + (v.paginas[0] + 1) + '–' + (ult + 1) : 'Página ' + (v.paginas[0] + 1)) + ' de ' + total;
        nodo.querySelector('#rdrAnt').disabled = v.anterior === null; nodo.querySelector('#rdrSig').disabled = v.siguiente === null;
        sel.value = String(v.indice); pintarModo(v); nodo._v = v;
        Array.prototype.forEach.call(escena.querySelectorAll('.rdr-hoja'), function (h) { h.scrollTop = 0; });
      }
      function ver(i) { poner(vistaPaginas(total, i, window.innerWidth, modo)); }

      /* Pasar la página: una hoja gira sobre el lomo y deja ver la página nueva. */
      function girar(destino, haciaAdelante) {
        var v = nodo._v, nuevo = vistaPaginas(total, destino, window.innerWidth, modo);
        if (ocupado || nuevo.indice === v.indice) return;
        if (reducir) return poner(nuevo);
        ocupado = true;
        var doble = v.doble;
        var viejoIzq = v.paginas[0], viejoDer = v.paginas[1], nuevoIzq = nuevo.paginas[0], nuevoDer = nuevo.paginas[1];
        var frente, dorso, base;
        if (doble) {
          if (haciaAdelante) { frente = hoja(viejoDer !== undefined ? viejoDer : viejoIzq); dorso = nuevoIzq !== undefined ? hoja(nuevoIzq) : papel; base = hoja(viejoIzq) + (nuevoDer !== undefined ? hoja(nuevoDer) : papel); }
          else { frente = hoja(viejoIzq); dorso = nuevoDer !== undefined ? hoja(nuevoDer) : papel; base = (nuevoIzq !== undefined ? hoja(nuevoIzq) : papel) + (viejoDer !== undefined ? hoja(viejoDer) : papel); }
        } else {
          frente = hoja(viejoIzq); dorso = papel; base = hoja(nuevoIzq);
        }
        escena.innerHTML = base;
        var hojaGiro = document.createElement('div');
        hojaGiro.className = 'rdr-giro ' + (doble ? (haciaAdelante ? 'rdr-giro--der' : 'rdr-giro--izq') : (haciaAdelante ? 'rdr-giro--uno' : 'rdr-giro--uno-atras'));
        hojaGiro.innerHTML = '<div class="rdr-giro__cara rdr-giro__frente">' + frente + '</div><div class="rdr-giro__cara rdr-giro__dorso">' + dorso + '</div>';
        escena.appendChild(hojaGiro);
        void hojaGiro.offsetWidth;
        hojaGiro.classList.add('is-girando');
        lector.t1 = setTimeout(function () { poner(nuevo); ocupado = false; }, 720);
      }
      function siguiente() { var v = nodo._v; if (v.siguiente !== null) girar(v.siguiente, true); }
      function anterior() { var v = nodo._v; if (v.anterior !== null) girar(v.anterior, false); }

      nodo.querySelector('#rdrSig').onclick = siguiente;
      nodo.querySelector('#rdrAnt').onclick = anterior;
      sel.onchange = function () { var d = parseInt(sel.value, 10) || 0; if (!ocupado) girar(d, d > indice); };
      nodo.querySelector('#rdrX').onclick = cerrarLector; nodo.querySelector('#rdrX2').onclick = cerrarLector;
      nodo.querySelector('#rdrModo').onclick = function () {
        modo = nodo._v.doble ? 'una' : 'dos'; try { alm.setItem('zoo_lector_modo', modo); } catch (e) { /* nada */ }
        ver(indice);
      };
      var teclas = function (e) {
        if (e.key === 'Escape') cerrarLector();
        else if (e.key === 'ArrowRight' || e.key === 'PageDown') siguiente();
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') anterior();
      };
      var redim = function () { if (!ocupado) ver(indice); };
      document.addEventListener('keydown', teclas); window.addEventListener('resize', redim);
      lector = { nodo: nodo, teclas: teclas, redim: redim, t1: 0, t2: 0 };
      /* gestos: deslizar el dedo para pasar de página */
      var x0 = null;
      escena.addEventListener('touchstart', function (e) { x0 = e.touches && e.touches[0] ? e.touches[0].clientX : null; }, { passive: true });
      escena.addEventListener('touchend', function (e) {
        if (x0 === null || !e.changedTouches || !e.changedTouches[0]) return;
        var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 60) { if (dx < 0) siguiente(); else anterior(); }
      }, { passive: true });
      ver(indice);
      if (guardada > 0) {
        var c = nodo.querySelector('#rdrCont'); c.hidden = false;
        c.innerHTML = '<span>Continúas desde la página ' + (nodo._v.indice + 1) + '</span><button type="button" id="rdrInicio">Ir al inicio</button>';
        nodo.querySelector('#rdrInicio').onclick = function () { c.hidden = true; girar(0, false); };
        lector.t2 = setTimeout(function () { c.hidden = true; }, 7000);
      }
      var fo = nodo.querySelector('#rdrLibro'); if (fo) fo.focus();
    }

    /* ───── visor de PDF ───── */
    function abrirDoc(id) {
      var m = estado.materiales.filter(function (x) { return x.id === id; })[0];
      if (!m) return;
      if (esVistaPrevia(m)) { pedirMembresiaRecurso(m, false); return; }
      if (!m.desbloqueado) { toast(mensajeBloqueo(m), true); return; }
      abrirVisorMaterial(club, m, 'catalogo');
    }
    /* Una fila (material de curso o suelto de Drive): el servidor decide si abre */
    function abrirFila(fuente, id) {
      var lista = fuente === 'drive' ? estado.drive : estado.materiales;
      var m = lista.filter(function (x) { return x.id === id; })[0];
      if (!m) return;
      if (esVistaPrevia(m)) { pedirMembresiaRecurso(m, false); return; }
      if (!m.desbloqueado) { toast('«' + m.titulo + '»: ' + condicionTexto(m) + '.', true); return; }
      abrirVisorMaterial(club, m, fuente === 'drive' ? 'drive' : 'catalogo');
    }

    /* ───── eventos de la página ───── */
    cont.addEventListener('click', function (e) {
      var t = e.target;
      var pin = t.closest && t.closest('[data-guardar]');
      if (pin) {
        e.stopPropagation();
        if (estado.previa) { pedirMembresiaFuncion('Guardar en tus favoritos'); return; }
        alternarGuardado(alm, uid, pin.getAttribute('data-guardar')); pintar(); return;
      }
      var tab = t.closest && t.closest('[data-pestana]');
      if (tab) { estado.pestana = tab.getAttribute('data-pestana'); pintar(); return; }
      if (t.closest && t.closest('#mtReintentar')) { cargar(); return; }
      var ab = t.closest && t.closest('[data-abrir-libro]');
      if (ab) { abrirLibro(ab.getAttribute('data-abrir-libro')); return; }
      var libro = t.closest && t.closest('[data-libro]');
      if (libro) { abrirLibro(libro.getAttribute('data-libro')); return; }
      var doc = t.closest && t.closest('[data-doc]');
      if (doc) { abrirDoc(doc.getAttribute('data-doc')); return; }
      var fila = t.closest && t.closest('[data-fila]');
      if (fila) { var par = String(fila.getAttribute('data-fila')); abrirFila(par.slice(0, par.indexOf(':')), par.slice(par.indexOf(':') + 1)); }
    });
    cont.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var libro = e.target.closest && e.target.closest('.mt-libro[data-libro]'), doc = e.target.closest && e.target.closest('.mt-doc[data-doc]'), fila = e.target.closest && e.target.closest('.mt-fila[data-fila]');
      if (libro) { e.preventDefault(); abrirLibro(libro.getAttribute('data-libro')); } else if (doc) { e.preventDefault(); abrirDoc(doc.getAttribute('data-doc')); }
      else if (fila) { e.preventDefault(); var par = String(fila.getAttribute('data-fila')); abrirFila(par.slice(0, par.indexOf(':')), par.slice(par.indexOf(':') + 1)); }
    });
    cont.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'mtBuscar') { estado.texto = e.target.value; var pos = e.target.selectionStart; pintar(); var n = document.getElementById('mtBuscar'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* nada */ } } }
    });

    function cargar() {
      estado.cargando = true; estado.errorServidor = ''; pintar();
      var libros = Promise.resolve().then(function () { return club.apiFetch('/api/libros'); });
      var mats = Promise.resolve().then(function () { return club.apiFetch('/api/materiales'); });
      /* Los PDF de Drive que carga el administrador (con su curso y clase, si los tienen) también vienen del servidor, SIN enlace:
         el enlace se pide al abrir y solo se entrega a quien cumple la regla. Si el servidor todavía no los ofrece, se omiten. */
      var drive = Promise.resolve().then(function () { return club.apiFetch('/api/materiales/drive'); })
        .then(function (r) { return r && Array.isArray(r.materiales) ? r.materiales.map(function (m) { return Object.assign({}, m, { fuente: 'drive' }); }) : []; })
        .catch(function () { return []; });
      return Promise.all([libros.then(function (r) { return { ok: true, r: r }; }, function (e) { return { ok: false, e: e }; }),
        mats.then(function (r) { return { ok: true, r: r }; }, function (e) { return { ok: false, e: e }; })]).then(function (res) {
        var a = res[0], b = res[1];
        if (a.ok) { estado.libros = Array.isArray(a.r.libros) ? a.r.libros : []; estado.superados = entero(a.r.superados, 0); }
        if (b.ok) { estado.materiales = Array.isArray(b.r.materiales) ? b.r.materiales : []; if (!a.ok) estado.superados = entero(b.r.superados, 0); }
        var previa = hayVistaPrevia(estado.libros, estado.materiales);
        var usoRespaldo = false;
        /* Sin membresía y sin respuesta del servidor: catálogo mínimo local (nunca la pantalla en blanco). */
        if (!creeMiembro() || previa) {
          if (!a.ok) { estado.libros = respaldoLibros(); usoRespaldo = true; }
          if (!b.ok) { estado.materiales = respaldoMateriales(); usoRespaldo = true; }
          if (usoRespaldo) previa = true;
        }
        estado.previa = previa;
        estado.errorServidor = usoRespaldo ? 'No se pudo actualizar el catálogo; te mostramos una versión resumida.'
          : ((!a.ok || !b.ok) ? ((a.e || b.e) && (a.e || b.e).message || 'No se pudieron cargar los libros y materiales.') : '');
        return drive.then(function (d) {
          estado.drive = d;
          estado.cargando = false; pintar();
        });
      });
    }

    pintar();
    return cargar().then(function () { return { recargar: cargar, abrirLibro: abrirLibro, estado: estado }; });
  }

  API.montar = montar;
  API.abrirMaterial = abrirVisorMaterial;
  return API;
});
