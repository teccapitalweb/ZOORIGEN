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

  var TIPOS = {
    guia: { nombre: 'Guía', color: '#2F7A4F' },
    plantilla: { nombre: 'Plantilla', color: '#C75402' },
    checklist: { nombre: 'Checklist', color: '#0F9D58' },
    glosario: { nombre: 'Glosario', color: '#8B7FBA' },
    infografia: { nombre: 'Infografía', color: '#2AA4D5' },
    presentacion: { nombre: 'Presentación', color: '#D4A017' }
  };

  var PESTANAS = [['todo', 'Todo'], ['guardados', 'Guardados'], ['libros', 'Libros'], ['guias', 'Guías y plantillas'], ['presentaciones', 'Presentaciones'], ['oficiales', 'Documentos oficiales'], ['mas', 'Más materiales']];

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
  function vistaPaginas(total, indice, ancho) {
    var doble = ancho >= 1000 && total > 1;
    var i = Math.max(0, Math.min(entero(indice, 0), Math.max(0, total - 1)));
    if (doble && i % 2 === 1) i -= 1;
    var paginas = doble ? [i, i + 1].filter(function (p) { return p < total; }) : [i];
    return { indice: i, paginas: paginas, doble: doble, anterior: i > 0 ? Math.max(0, i - (doble ? 2 : 1)) : null, siguiente: (i + (doble ? 2 : 1)) < total ? i + (doble ? 2 : 1) : null };
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
  var CANDADO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var MARCADOR = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10a1 1 0 0 1 1 1v15l-6 -4l-6 4v-15a1 1 0 0 1 1 -1z"/></svg>';

  function pinHTML(clave, guardado) {
    return '<button type="button" class="mt-pin' + (guardado ? ' is-on' : '') + '" data-guardar="' + esc(clave) + '" aria-pressed="' + (guardado ? 'true' : 'false') + '" aria-label="' + (guardado ? 'Quitar de guardados' : 'Guardar') + '" title="' + (guardado ? 'Quitar de guardados' : 'Guardar') + '">' + MARCADOR + '</button>';
  }

  function libroCardHTML(l, ctx) {
    ctx = ctx || {};
    var color = colorSeguro(l.color, '#1F5F3A');
    var abierto = !!l.desbloqueado;
    var pag = ctx.pagina || 0, tot = entero(l.paginasTotal, 0);
    var barra;
    if (abierto) {
      var pct = tot ? Math.round((pag + (pag > 0 ? 1 : 0)) * 100 / tot) : 0;
      barra = '<div class="mt-prog"><i style="width:' + Math.min(100, pct) + '%"></i></div><div class="mt-prog__txt">' + (pag > 0 ? 'Página ' + (pag + 1) + ' de ' + tot : (tot ? tot + ' páginas' : 'Libro')) + '</div>';
    } else {
      var req = entero(l.requiereRetos, 0), hechos = Math.max(0, req - entero(l.faltan, req));
      barra = '<div class="mt-prog mt-prog--bloq"><i style="width:' + (req ? Math.min(100, Math.round(hechos * 100 / req)) : 0) + '%"></i></div><div class="mt-prog__txt">' + esc(textoBloqueo(l)) + '</div>';
    }
    return '<article class="mt-libro' + (abierto ? '' : ' is-bloq') + '" data-libro="' + esc(l.id) + '" tabindex="0" role="button" aria-label="' + esc(l.titulo) + (abierto ? '' : ' (bloqueado)') + '">' +
      '<div class="mt-libro__top" style="--mt-c:' + esc(color) + '">' +
        '<span class="mt-libro__lomo"></span>' +
        '<span class="mt-libro__icono">' + iconoSVG(l.icono, 54) + '</span>' +
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
    var color = colorSeguro(l.color, '#1F5F3A'), abierto = !!l.desbloqueado;
    return '<section class="mt-dest" data-libro="' + esc(l.id) + '" style="--mt-c:' + esc(color) + '">' +
      '<div class="mt-dest__portada"><div class="mt-libro__top mt-dest__libro" style="--mt-c:' + esc(color) + '"><span class="mt-libro__lomo"></span><span class="mt-libro__icono">' + iconoSVG(l.icono, 72) + '</span>' +
        '<div class="mt-libro__sobre"><small>' + esc(l.categoria || 'Libro') + '</small><strong>' + esc(l.titulo) + '</strong></div></div></div>' +
      '<div class="mt-dest__info"><div class="mt-etq">' + (abierto ? 'Libro destacado' : 'Próximo libro por desbloquear') + '</div>' +
        '<h2>' + esc(l.titulo) + '</h2><div class="mt-dest__autor">' + esc(l.subtitulo || '') + (l.subtitulo ? ' · ' : '') + esc(l.autor || 'Equipo Zoorigen') + '</div>' +
        '<p>' + esc(l.resumen || '') + '</p>' +
        '<div class="mt-dest__acc"><button type="button" class="mt-btn" data-abrir-libro="' + esc(l.id) + '">' + (abierto ? 'Leer ahora' : esc(textoBloqueo(l)) ) + '</button>' +
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

  function materialCardHTML(m, ctx) {
    ctx = ctx || {};
    var t = TIPOS[m.tipo] || { nombre: 'Material', color: '#2F7A4F' };
    var abierto = !!m.desbloqueado;
    var etiq = abierto ? '' : '<span class="mt-doc__lock">' + CANDADO + esc(textoBloqueo(m)) + '</span>';
    return '<article class="mt-doc' + (abierto ? '' : ' is-bloq') + '" data-doc="' + esc(m.id) + '" tabindex="0" role="button" aria-label="' + esc(m.titulo) + (abierto ? '' : ' (bloqueado)') + '">' +
      '<div class="mt-doc__portada" style="--mt-c:' + esc(t.color) + '"><span class="mt-doc__tipo">' + esc(t.nombre) + '</span><span class="mt-doc__pdf">PDF</span>' +
        '<strong>' + esc(m.titulo) + '</strong><span class="mt-doc__sello">ZOORIGEN</span>' + pinHTML('doc:' + m.id, !!ctx.guardado) + '</div>' +
      '<div class="mt-doc__info"><div class="mt-doc__area">' + esc(m.area || '') + (m.paginas ? ' · ' + entero(m.paginas, 0) + (entero(m.paginas, 0) === 1 ? ' página' : ' páginas') : '') + '</div>' +
        '<p>' + esc(m.descripcion || '') + '</p>' + etiq + '</div></article>';
  }

  function oficialesHTML() {
    return '<div class="mt-oficiales">' + OFICIALES.map(function (o) {
      return '<a class="mt-ofi" href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer"><span class="mt-ofi__tipo">' + esc(o.tipo) + '</span><strong>' + esc(o.titulo) + '</strong><small>' + esc(o.detalle) + '</small><span class="mt-ofi__ir">Abrir fuente oficial ↗</span></a>';
    }).join('') + '</div><p class="mt-nota">Estos documentos son textos oficiales. Se abren en el sitio de la autoridad que los publica, así siempre ves la versión vigente.</p>';
  }

  function driveHTML(lista) {
    return '<div class="mt-oficiales">' + lista.map(function (p) {
      var id = String(p.driveId || '').replace(/[^A-Za-z0-9_-]/g, '');
      var url = id ? 'https://drive.google.com/file/d/' + id + '/view' : urlHttps(p.url);
      return (url ? '<a class="mt-ofi" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' : '<div class="mt-ofi">') +
        '<span class="mt-ofi__tipo">' + esc(p.category || p.area || 'Material') + '</span><strong>' + esc(p.title || 'Material') + '</strong><small>' + (p.pages ? esc(p.pages) + ' páginas' : 'Material de apoyo') + '</small>' +
        (url ? '<span class="mt-ofi__ir">Abrir ↗</span></a>' : '<span class="mt-ofi__ir">Sin enlace</span></div>');
    }).join('') + '</div>';
  }

  /* Una página del libro. */
  function paginaHTML(p, numero, total) {
    p = p || {};
    var parrafos = (Array.isArray(p.parrafos) ? p.parrafos : []).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
    var lista = Array.isArray(p.lista) && p.lista.length ? '<ul>' + p.lista.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
    return '<div class="rdr-hoja"><h3>' + esc(p.titulo || '') + '</h3><div class="rdr-texto">' + parrafos + lista + '</div><div class="rdr-num">' + (numero + 1) + ' / ' + total + '</div></div>';
  }

  var API = {
    OFICIALES: OFICIALES, TIPOS: TIPOS, PESTANAS: PESTANAS,
    esc: esc, normalizar: normalizar, urlHttps: urlHttps, siguienteMeta: siguienteMeta, textoBloqueo: textoBloqueo, mensajeBloqueo: mensajeBloqueo,
    filtrarMateriales: filtrarMateriales, filtrarLibros: filtrarLibros,
    leerGuardados: leerGuardados, alternarGuardado: alternarGuardado, leerPagina: leerPagina, guardarPagina: guardarPagina, claveGuardados: claveGuardados, claveLectura: claveLectura,
    vistaPaginas: vistaPaginas, libroCardHTML: libroCardHTML, libroDestacadoHTML: libroDestacadoHTML, bannerRetosHTML: bannerRetosHTML,
    materialCardHTML: materialCardHTML, oficialesHTML: oficialesHTML, driveHTML: driveHTML, paginaHTML: paginaHTML
  };

  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* PANTALLA                                                      */
  /* ============================================================ */
  function montar(o) {
    var sesion = o.sesion, club = o.club, cont = o.contenedor;
    var uid = sesion.uid;
    var alm = (function () { try { return window.localStorage; } catch (e) { return null; } })() || { getItem: function () { return null; }, setItem: function () {} };
    var estado = { libros: [], materiales: [], superados: 0, pestana: 'todo', texto: '', drive: [], errorServidor: '', cargando: true };

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
      var docs = filtrarMateriales(estado.materiales, { pestana: p, texto: q, guardados: g });
      var meta = siguienteMeta(estado.libros, estado.superados);
      var verLibros = p === 'todo' || p === 'libros' || p === 'guardados';
      var verDocs = p === 'todo' || p === 'guias' || p === 'presentaciones' || p === 'guardados';
      var html = '';

      html += '<section class="mt-hero"><div><div class="mt-etq">Biblioteca del Club</div><h1>PDFs y materiales</h1>' +
        '<p>Libros que se desbloquean con tus retos, guías y plantillas para descargar, presentaciones y los textos oficiales de la normatividad.</p></div>' +
        '<div class="mt-hero__kpis"><div><strong>' + estado.libros.filter(function (l) { return l.desbloqueado; }).length + '/' + estado.libros.length + '</strong><span>Libros</span></div>' +
        '<div><strong>' + estado.materiales.filter(function (m) { return m.desbloqueado; }).length + '/' + estado.materiales.length + '</strong><span>Materiales</span></div>' +
        '<div><strong>' + entero(estado.superados, 0) + '</strong><span>Retos superados</span></div></div></section>';

      html += '<div class="mt-barra"><div class="mt-tabs" role="tablist">' + PESTANAS.filter(function (t) { return t[0] !== 'mas' || estado.drive.length; }).map(function (t) {
        return '<button type="button" role="tab" class="mt-tab' + (p === t[0] ? ' is-active' : '') + '" data-pestana="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
        '<div class="mt-buscar"><input type="search" id="mtBuscar" placeholder="Buscar…" value="' + esc(q) + '" aria-label="Buscar"></div></div>';

      if (estado.errorServidor && (verLibros || verDocs)) {
        html += '<div class="mt-aviso">' + esc(estado.errorServidor) + ' <button type="button" class="mt-link" id="mtReintentar">Reintentar</button></div>';
      }

      if (verLibros) {
        html += '<section class="mt-bloque"><div class="mt-bloque__t"><h2>Libros</h2></div>';
        if (p === 'todo' || p === 'libros') html += bannerRetosHTML(meta, o.hrefRetos);
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
      if (p === 'todo' || p === 'oficiales') html += '<section class="mt-bloque"><div class="mt-bloque__t"><h2>Documentos oficiales</h2></div>' + oficialesHTML() + '</section>';
      if ((p === 'todo' || p === 'mas') && estado.drive.length) html += '<section class="mt-bloque"><div class="mt-bloque__t"><h2>Más materiales</h2></div>' + driveHTML(estado.drive) + '</section>';
      cont.innerHTML = html;
    }

    /* ───── lector de libros ───── */
    var lector = null;
    function abrirLibro(id) {
      var meta = estado.libros.filter(function (l) { return l.id === id; })[0];
      if (!meta) return;
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
      lector.nodo.remove(); document.body.classList.remove('mt-noscroll'); lector = null; pintar();
    }
    function mostrarLector(libro) {
      cerrarLector();
      var total = libro.paginas.length, indice = leerPagina(alm, uid, libro.id, total);
      var tt = document.getElementById('mtToast'); if (tt) tt.classList.remove('is-on');
      var nodo = document.createElement('div'); nodo.className = 'rdr'; nodo.setAttribute('role', 'dialog'); nodo.setAttribute('aria-modal', 'true'); nodo.setAttribute('aria-label', libro.titulo);
      nodo.innerHTML = '<div class="rdr-cab"><div class="rdr-cab__t"><strong>' + esc(libro.titulo) + '</strong><small>' + esc(libro.subtitulo || '') + '</small></div>' +
        '<div class="rdr-cab__acc"><label class="rdr-ir">Ir a <select id="rdrIr" aria-label="Ir a la página"></select></label><button type="button" class="rdr-x" id="rdrX" aria-label="Cerrar libro">✕</button></div></div>' +
        '<div class="rdr-cuerpo"><button type="button" class="rdr-nav rdr-nav--ant" id="rdrAnt" aria-label="Página anterior">‹</button><div class="rdr-libro" id="rdrLibro" tabindex="0"></div><button type="button" class="rdr-nav rdr-nav--sig" id="rdrSig" aria-label="Página siguiente">›</button></div>' +
        '<div class="rdr-pie"><div class="rdr-barra" id="rdrBarra" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div><span id="rdrTxt"></span></div>';
      document.body.appendChild(nodo); document.body.classList.add('mt-noscroll');
      var sel = nodo.querySelector('#rdrIr');
      sel.innerHTML = libro.paginas.map(function (p, i) { return '<option value="' + i + '">' + (i + 1) + '. ' + esc(String(p.titulo || '').slice(0, 40)) + '</option>'; }).join('');
      function ver(i) {
        var v = vistaPaginas(total, i, window.innerWidth); indice = v.indice; guardarPagina(alm, uid, libro.id, indice);
        nodo.querySelector('#rdrLibro').innerHTML = v.paginas.map(function (n) { return paginaHTML(libro.paginas[n], n, total); }).join('');
        nodo.querySelector('#rdrLibro').className = 'rdr-libro' + (v.doble ? ' rdr-libro--doble' : '');
        var ult = v.paginas[v.paginas.length - 1], pct = Math.round((ult + 1) * 100 / total);
        nodo.querySelector('#rdrBarra i').style.width = pct + '%'; nodo.querySelector('#rdrBarra').setAttribute('aria-valuenow', String(pct));
        nodo.querySelector('#rdrTxt').textContent = (v.doble && v.paginas.length > 1 ? 'Páginas ' + (v.paginas[0] + 1) + '–' + (ult + 1) : 'Página ' + (v.paginas[0] + 1)) + ' de ' + total;
        nodo.querySelector('#rdrAnt').disabled = v.anterior === null; nodo.querySelector('#rdrSig').disabled = v.siguiente === null;
        sel.value = String(v.indice); nodo.querySelector('#rdrLibro').scrollTop = 0; nodo._v = v;
      }
      nodo.querySelector('#rdrAnt').onclick = function () { if (nodo._v.anterior !== null) ver(nodo._v.anterior); };
      nodo.querySelector('#rdrSig').onclick = function () { if (nodo._v.siguiente !== null) ver(nodo._v.siguiente); };
      sel.onchange = function () { ver(parseInt(sel.value, 10) || 0); };
      nodo.querySelector('#rdrX').onclick = cerrarLector;
      var teclas = function (e) {
        if (e.key === 'Escape') cerrarLector();
        else if (e.key === 'ArrowRight' || e.key === 'PageDown') { if (nodo._v.siguiente !== null) ver(nodo._v.siguiente); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { if (nodo._v.anterior !== null) ver(nodo._v.anterior); }
      };
      var redim = function () { ver(indice); };
      document.addEventListener('keydown', teclas); window.addEventListener('resize', redim);
      lector = { nodo: nodo, teclas: teclas, redim: redim };
      ver(indice);
      var f = nodo.querySelector('#rdrLibro'); if (f) f.focus();
    }

    /* ───── visor de PDF ───── */
    var visor = null;
    function cerrarVisor() { if (!visor) return; if (visor.url) URL.revokeObjectURL(visor.url); visor.nodo.remove(); document.body.classList.remove('mt-noscroll'); visor = null; }
    function abrirDoc(id) {
      var m = estado.materiales.filter(function (x) { return x.id === id; })[0];
      if (!m) return;
      if (!m.desbloqueado) { toast(mensajeBloqueo(m), true); return; }
      cerrarVisor();
      var nodo = document.createElement('div'); nodo.className = 'mt-visor'; nodo.setAttribute('role', 'dialog'); nodo.setAttribute('aria-modal', 'true'); nodo.setAttribute('aria-label', m.titulo);
      nodo.innerHTML = '<div class="mt-visor__cab"><strong>' + esc(m.titulo) + '</strong><div class="mt-visor__acc"><a class="mt-btn mt-btn--suave" id="mvDescargar" hidden>Descargar PDF</a><button type="button" class="rdr-x" id="mvX" aria-label="Cerrar">✕</button></div></div>' +
        '<div class="mt-visor__cuerpo" id="mvCuerpo"><div class="mt-vacio">Preparando el documento…</div></div>';
      document.body.appendChild(nodo); document.body.classList.add('mt-noscroll');
      visor = { nodo: nodo, url: '' };
      nodo.querySelector('#mvX').onclick = cerrarVisor;
      nodo.addEventListener('click', function (e) { if (e.target === nodo) cerrarVisor(); });
      Promise.resolve().then(function () { return club.apiBlob('/api/materiales/' + encodeURIComponent(id) + '/archivo'); }).then(function (blob) {
        if (!visor || visor.nodo !== nodo) return;
        visor.url = URL.createObjectURL(blob);
        var d = nodo.querySelector('#mvDescargar'); d.href = visor.url; d.download = id + '.pdf'; d.hidden = false;
        var chico = window.innerWidth < 760;
        nodo.querySelector('#mvCuerpo').innerHTML = chico
          ? '<div class="mt-vacio"><strong>Tu documento está listo</strong><span>En el celular es mejor abrirlo o descargarlo.</span><a class="mt-btn" href="' + esc(visor.url) + '" target="_blank" rel="noopener">Abrir PDF</a></div>'
          : '<iframe title="' + esc(m.titulo) + '" src="' + esc(visor.url) + '"></iframe>';
      }).catch(function (e) {
        if (!visor || visor.nodo !== nodo) return;
        nodo.querySelector('#mvCuerpo').innerHTML = '<div class="mt-vacio"><strong>No se pudo abrir</strong><span>' + esc(e && e.message ? e.message : 'Inténtalo de nuevo.') + '</span></div>';
      });
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarVisor(); });

    /* ───── eventos de la página ───── */
    cont.addEventListener('click', function (e) {
      var t = e.target;
      var pin = t.closest && t.closest('[data-guardar]');
      if (pin) { e.stopPropagation(); alternarGuardado(alm, uid, pin.getAttribute('data-guardar')); pintar(); return; }
      var tab = t.closest && t.closest('[data-pestana]');
      if (tab) { estado.pestana = tab.getAttribute('data-pestana'); pintar(); return; }
      if (t.closest && t.closest('#mtReintentar')) { cargar(); return; }
      var ab = t.closest && t.closest('[data-abrir-libro]');
      if (ab) { abrirLibro(ab.getAttribute('data-abrir-libro')); return; }
      var libro = t.closest && t.closest('[data-libro]');
      if (libro) { abrirLibro(libro.getAttribute('data-libro')); return; }
      var doc = t.closest && t.closest('[data-doc]');
      if (doc) abrirDoc(doc.getAttribute('data-doc'));
    });
    cont.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var libro = e.target.closest && e.target.closest('.mt-libro[data-libro]'), doc = e.target.closest && e.target.closest('.mt-doc[data-doc]');
      if (libro) { e.preventDefault(); abrirLibro(libro.getAttribute('data-libro')); } else if (doc) { e.preventDefault(); abrirDoc(doc.getAttribute('data-doc')); }
    });
    cont.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'mtBuscar') { estado.texto = e.target.value; var pos = e.target.selectionStart; pintar(); var n = document.getElementById('mtBuscar'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* nada */ } } }
    });

    function cargar() {
      estado.cargando = true; estado.errorServidor = ''; pintar();
      var libros = Promise.resolve().then(function () { return club.apiFetch('/api/libros'); });
      var mats = Promise.resolve().then(function () { return club.apiFetch('/api/materiales'); });
      var drive = Promise.resolve().then(function () { return club.getPdfs(); }).then(function (l) { return Array.isArray(l) ? l : []; }).catch(function () { return []; });
      return Promise.all([libros.then(function (r) { return { ok: true, r: r }; }, function (e) { return { ok: false, e: e }; }),
        mats.then(function (r) { return { ok: true, r: r }; }, function (e) { return { ok: false, e: e }; }), drive]).then(function (res) {
        var a = res[0], b = res[1];
        if (a.ok) { estado.libros = Array.isArray(a.r.libros) ? a.r.libros : []; estado.superados = entero(a.r.superados, 0); }
        if (b.ok) { estado.materiales = Array.isArray(b.r.materiales) ? b.r.materiales : []; if (!a.ok) estado.superados = entero(b.r.superados, 0); }
        estado.drive = res[2];
        estado.errorServidor = (!a.ok || !b.ok) ? ((a.e || b.e) && (a.e || b.e).message || 'No se pudieron cargar los libros y materiales.') : '';
        estado.cargando = false; pintar();
      });
    }

    pintar();
    return cargar().then(function () { return { recargar: cargar, abrirLibro: abrirLibro, estado: estado }; });
  }

  API.montar = montar;
  return API;
});
