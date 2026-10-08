/* ============================================================ */
/* PANEL ADMIN · CURSOS                                          */
/* Estadísticas, filtros, tarjetas, editor de clases con juegos  */
/* y limpieza de datos al guardar. Sin Firebase ni pantalla      */
/* real: se prueba en tests/admin-cursos.test.js                 */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'), require('./club-juegos.js'), require('./club-quiz.js'));
  else root.ZOO_ADMIN_CURSOS = factory(root.ZOO_ICONOS, root.ZOO_JUEGOS, root.ZOO_QUIZ);
})(typeof self !== 'undefined' ? self : this, function (iconos, juegos, quiz) {
  'use strict';

  const ico = (nombre, opciones) => (iconos && iconos.svg ? iconos.svg(nombre, opciones) : '');

  // Todo texto que escribe un administrador o un miembro se escapa antes de llegar a innerHTML.
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  const AREAS = ['Fauna silvestre', 'Fauna ponzoñosa', 'Apicultura', 'Etología', 'Investigación', 'Manejo en cautiverio', 'Conservación'];
  const NIVELES = ['Básico', 'Intermedio', 'Avanzado'];

  // Colores de área (todos permiten texto blanco con buen contraste).
  const COLOR_AREA = {
    'Fauna silvestre': '#1F7A4C', 'Fauna ponzoñosa': '#B3261E', 'Apicultura': '#9A5200', 'Etología': '#6445C8',
    'Investigación': '#05609F', 'Manejo en cautiverio': '#08777A', 'Conservación': '#4A5800'
  };
  const COLOR_DEFECTO = '#8A3F02';
  const colorArea = area => (Object.prototype.hasOwnProperty.call(COLOR_AREA, area) ? COLOR_AREA[area] : COLOR_DEFECTO);

  /* ───────────────────────── Datos del curso ───────────────────────── */

  // "6 h", "90 min", "1 h 30 min", "2.5 horas", "6" (solo número = horas). Devuelve horas o null.
  function parseHoras(valor) {
    const t = String(valor == null ? '' : valor).toLowerCase().replace(',', '.');
    if (!t.trim() || /-\s*\d/.test(t)) return null;   // vacío o con números negativos
    let horas = 0, hallado = false;
    const h = t.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hora|horas)\b/);
    if (h) { horas += parseFloat(h[1]); hallado = true; }
    const m = t.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minuto|minutos)\b/);
    if (m) { horas += parseFloat(m[1]) / 60; hallado = true; }
    if (!hallado) { const solo = t.match(/^\s*(\d+(?:\.\d+)?)\s*$/); if (solo) { horas = parseFloat(solo[1]); hallado = true; } }
    return hallado && isFinite(horas) && horas >= 0 && horas <= 1000 ? Math.round(horas * 100) / 100 : null;
  }

  function leccionesDe(c) {
    if (Array.isArray(c && c.lecciones) && c.lecciones.length) return c.lecciones;
    if (c && c.driveId) return [{ titulo: c.title, driveId: c.driveId, duration: c.duration }];
    return [];
  }
  const contarClases = c => leccionesDe(c).length || Number(c && c.totalClases) || 0;
  const contarPreguntas = c => leccionesDe(c).reduce((n, l) => n + (l && quiz ? quiz.preguntasDeClase(l).length : 0), 0);
  const contarJuegos = c => leccionesDe(c).filter(l => l && juegos && juegos.limpiarJuego(l.juego)).length;

  function resumenCursos(cursos) {
    const r = { total: cursos.length, clases: 0, horas: 0, conJuego: 0, juegos: 0 };
    for (const c of cursos) {
      r.clases += contarClases(c);
      const h = parseHoras(c.duration);
      if (h) r.horas += h;
      const j = contarJuegos(c);
      if (j) { r.conJuego++; r.juegos += j; }
    }
    r.horas = Math.round(r.horas * 10) / 10;
    r.promedioClases = r.total ? Math.round((r.clases / r.total) * 10) / 10 : 0;
    return r;
  }

  const fechaMs = v => { const t = v && typeof v.toDate === 'function' ? v.toDate().getTime() : new Date(v || 0).getTime(); return Number.isNaN(t) ? 0 : t; };

  function ordenarCursos(lista, orden) {
    const porTitulo = (a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'es', { sensitivity: 'base' });
    const copia = [...lista];
    if (orden === 'az') return copia.sort(porTitulo);
    if (orden === 'clases') return copia.sort((a, b) => contarClases(b) - contarClases(a) || porTitulo(a, b));
    return copia.sort((a, b) => fechaMs(b.createdAt) - fechaMs(a.createdAt) || porTitulo(a, b)); // recientes
  }

  function filtrarCursos(cursos, { texto = '', area = 'todas', orden = 'recientes' } = {}) {
    const q = String(texto).trim().toLowerCase();
    const sin = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const qn = sin(q);
    const lista = cursos.filter(c => {
      if (area !== 'todas' && c.area !== area) return false;
      if (!qn) return true;
      return [c.title, c.area, c.tag, c.description, c.level].some(v => sin(v).includes(qn));
    });
    return ordenarCursos(lista, orden);
  }

  function areasConConteo(cursos) {
    const m = new Map();
    for (const c of cursos) { const a = c.area || 'Sin área'; m.set(a, (m.get(a) || 0) + 1); }
    return [...m.entries()].map(([area, cuenta]) => ({ area, cuenta })).sort((a, b) => b.cuenta - a.cuenta || a.area.localeCompare(b.area, 'es'));
  }

  // Imagen de portada: http(s), ruta del propio sitio o imagen incrustada. Nunca "javascript:".
  function urlPortada(valor) {
    const u = String(valor == null ? '' : valor).trim();
    if (!u || u.length > 2000) return null;
    if (/^https?:\/\/[^\s"'<>()]+$/i.test(u)) return u;
    if (/^[\w./%\-]+$/.test(u) && !/(^|\/)\.\.\/\.\./.test(u)) return u;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(u)) return u;
    return null;
  }

  /* ───────────────────────── Tarjetas y filtros (HTML) ───────────────────────── */

  function kpisHTML(r) {
    return `
      <div class="admin-stats cols-4">
        <div class="stat-box total"><div class="stat-box__label">Cursos</div><div class="stat-box__value">${r.total}</div><div class="stat-box__note">en el catálogo</div></div>
        <div class="stat-box green"><div class="stat-box__label">Clases</div><div class="stat-box__value">${r.clases}</div><div class="stat-box__note">${String(r.promedioClases).replace('.', ',')} por curso en promedio</div></div>
        <div class="stat-box amber"><div class="stat-box__label">Horas de contenido</div><div class="stat-box__value">${String(r.horas).replace('.', ',')}h</div><div class="stat-box__note">según la duración de cada curso</div></div>
        <div class="stat-box review"><div class="stat-box__label">Con juegos</div><div class="stat-box__value">${r.conJuego}<span class="stat-box__of"> / ${r.total}</span></div><div class="stat-box__note">${r.juegos} juego${r.juegos === 1 ? '' : 's'} en total</div></div>
      </div>`;
  }

  function chipsAreasHTML(areas, total, actual) {
    const chip = (valor, nombre, cuenta) => `<button type="button" class="cc-chip${actual === valor ? ' is-active' : ''}" data-area="${esc(valor)}" aria-pressed="${actual === valor}">${esc(nombre)} <span class="cc-chip__n">${cuenta}</span></button>`;
    return chip('todas', 'Todas las áreas', total) + areas.map(a => chip(a.area, a.area, a.cuenta)).join('');
  }

  function ordenHTML(actual) {
    const o = [['recientes', 'Recientes', 'clock'], ['az', 'A–Z', 'arrow-down-a-z'], ['clases', 'Más clases', 'clapperboard']];
    return o.map(([id, nombre, icono]) => `<button type="button" class="zoo-chip${actual === id ? ' is-active' : ''}" data-orden="${id}" aria-pressed="${actual === id}">${ico(icono, { size: 14 })}${esc(nombre)}</button>`).join('');
  }

  function vistaHTML(actual) {
    return [['grid', 'layout-grid', 'Cuadrícula'], ['lista', 'list', 'Lista']].map(([id, icono, nombre]) =>
      `<button type="button" class="cc-vista${actual === id ? ' is-active' : ''}" data-vista="${id}" aria-label="Vista en ${nombre.toLowerCase()}" aria-pressed="${actual === id}">${ico(icono, { size: 16 })}</button>`).join('');
  }

  function metaHTML(c) {
    const clases = contarClases(c), j = contarJuegos(c);
    const partes = [`<span class="cc-m">${ico('clapperboard', { size: 14 })}${clases} clase${clases === 1 ? '' : 's'}</span>`];
    if (c.duration) partes.push(`<span class="cc-m">${ico('clock', { size: 14 })}${esc(c.duration)}</span>`);
    if (j) partes.push(`<span class="cc-m cc-m--juego">${ico('gamepad-2', { size: 14 })}${j} juego${j === 1 ? '' : 's'}</span>`);
    const p = contarPreguntas(c);
    if (p) partes.push(`<span class="cc-m cc-m--preg">${ico('circle-help', { size: 14 })}${p} pregunta${p === 1 ? '' : 's'}</span>`);
    if (c.cursoMuestraGratis === true) partes.push(`<span class="cc-m cc-m--gratis">${ico('gift', { size: 14 })}Muestra gratis</span>`);
    if (c.disponibleSiempre === true) partes.push(`<span class="cc-m cc-m--gratis">${ico('calendar-clock', { size: 14 })}Siempre disponible</span>`);
    if (c.instructor) partes.push(`<span class="cc-m">${ico('user', { size: 14 })}${esc(c.instructor)}</span>`);
    return partes.join('');
  }

  function medioHTML(c) {
    const color = colorArea(c.area);
    const img = urlPortada(c.image);
    const fondo = img ? `background-image:url('${esc(img)}');` : '';
    return `<div class="cc-media${img ? '' : ' is-vacio'}" style="--cc:${color};${fondo}">
        ${img ? '' : `<span class="cc-media__ico">${ico('graduation-cap', { size: 34 })}</span>`}
        <span class="cc-tag cc-tag--area">${esc(c.area || 'Sin área')}</span>
        ${c.level ? `<span class="cc-tag cc-tag--nivel">${esc(c.level)}</span>` : ''}
        ${c.tag ? `<span class="cc-ribbon">${esc(c.tag)}</span>` : ''}
      </div>`;
  }

  function accionesHTML(c) {
    return `<div class="cc-acciones">
        <button type="button" class="cc-icono" data-accion="editar" data-id="${esc(c.id)}" aria-label="Editar ${esc(c.title)}" title="Editar">${ico('pencil', { size: 16 })}</button>
        <button type="button" class="cc-icono cc-icono--peligro" data-accion="eliminar" data-id="${esc(c.id)}" aria-label="Eliminar ${esc(c.title)}" title="Eliminar">${ico('trash-2', { size: 16 })}</button>
      </div>`;
  }

  function tarjetaGridHTML(c) {
    return `<article class="cc-card" data-id="${esc(c.id)}">
      ${medioHTML(c)}
      <div class="cc-body">
        <h3 class="cc-title">${esc(c.title || 'Sin título')}</h3>
        ${c.description ? `<p class="cc-desc">${esc(c.description)}</p>` : ''}
        <div class="cc-meta">${metaHTML(c)}</div>
        <div class="cc-foot">${c.videoProvider === 'bunny' ? `<span class="cc-prov">${ico('badge-check', { size: 13 })}Videos Bunny</span>` : '<span></span>'}${accionesHTML(c)}</div>
      </div>
    </article>`;
  }

  function tarjetaListaHTML(c) {
    return `<article class="cc-fila" data-id="${esc(c.id)}">
      ${medioHTML(c).replace('cc-media', 'cc-media cc-media--mini')}
      <div class="cc-fila__info">
        <h3 class="cc-title">${esc(c.title || 'Sin título')}</h3>
        <div class="cc-meta">${metaHTML(c)}${c.videoProvider === 'bunny' ? `<span class="cc-prov">${ico('badge-check', { size: 13 })}Bunny</span>` : ''}</div>
      </div>
      ${accionesHTML(c)}
    </article>`;
  }

  function listaHTML(cursos, vista) {
    if (!cursos.length) return `<div class="no-data cc-vacio">${ico('search-x', { size: 28 })}<p>No hay cursos que coincidan con la búsqueda.</p></div>`;
    return vista === 'lista'
      ? `<div class="cc-lista">${cursos.map(tarjetaListaHTML).join('')}</div>`
      : `<div class="cc-grid">${cursos.map(tarjetaGridHTML).join('')}</div>`;
  }

  /* ───────────────────────── Editor de clases y juegos ───────────────────────── */

  const FILAS_MINIMAS = { sopa_letras: 3, memorama: 3, ahorcado: 1 };
  const FILAS_MAXIMAS = 20;

  const leccionVacia = () => ({ titulo: '', driveId: '', duration: '' });

  function nuevoJuego(tipo) {
    switch (tipo) {
      case 'sopa_letras': return { tipo, datos: { palabras: ['', '', ''] } };
      case 'memorama': return { tipo, datos: { pares: [{ termino: '', definicion: '' }, { termino: '', definicion: '' }, { termino: '', definicion: '' }] } };
      case 'rompecabezas': return { tipo, datos: { dificultad: '3', imagenUrl: '' } };
      case 'ahorcado': return { tipo, datos: { palabras: [{ palabra: '', pista: '' }] } };
      default: return { tipo: '', datos: {} };
    }
  }

  // Agrega una fila vacía a la lista del juego (palabras o pares). Devuelve true si la agregó.
  function agregarFila(juego) {
    const d = juego && juego.datos;
    if (!d) return false;
    const lista = juego.tipo === 'memorama' ? d.pares : (juego.tipo === 'sopa_letras' || juego.tipo === 'ahorcado') ? d.palabras : null;
    if (!Array.isArray(lista) || lista.length >= FILAS_MAXIMAS) return false;
    lista.push(juego.tipo === 'memorama' ? { termino: '', definicion: '' } : juego.tipo === 'ahorcado' ? { palabra: '', pista: '' } : '');
    return true;
  }

  // Quita una fila respetando el mínimo de cada tipo. Devuelve true si la quitó.
  function quitarFila(juego, idx) {
    const d = juego && juego.datos;
    if (!d) return false;
    const lista = juego.tipo === 'memorama' ? d.pares : (juego.tipo === 'sopa_letras' || juego.tipo === 'ahorcado') ? d.palabras : null;
    const minimo = FILAS_MINIMAS[juego.tipo] || 1;
    if (!Array.isArray(lista) || lista.length <= minimo || !Number.isInteger(idx) || idx < 0 || idx >= lista.length) return false;
    lista.splice(idx, 1);
    return true;
  }

  // Escribe un valor en una clase usando una ruta permitida (lista blanca): evita escribir donde no toca.
  const RUTAS_PERMITIDAS = [
    /^(titulo|driveId|duration)$/,
    /^juego\.datos\.(dificultad|imagenUrl)$/,
    /^juego\.datos\.palabras\.\d{1,2}$/,
    /^juego\.datos\.palabras\.\d{1,2}\.(palabra|pista)$/,
    /^juego\.datos\.pares\.\d{1,2}\.(termino|definicion)$/,
    /^preguntas\.\d{1,2}\.pregunta$/,
    /^preguntas\.\d{1,2}\.opciones\.\d$/,
    /^preguntas\.\d{1,2}\.correcta$/
  ];
  function asignarRuta(leccion, ruta, valor) {
    if (!leccion || typeof ruta !== 'string' || !RUTAS_PERMITIDAS.some(r => r.test(ruta))) return false;
    const partes = ruta.split('.');
    let nodo = leccion;
    for (let i = 0; i < partes.length - 1; i++) {
      const k = partes[i];
      if (nodo == null || typeof nodo !== 'object' || !Object.prototype.hasOwnProperty.call(nodo, k)) return false;
      nodo = nodo[k];
    }
    const ultimo = partes[partes.length - 1];
    if (nodo == null || typeof nodo !== 'object') return false;
    if (Array.isArray(nodo) && !(Number(ultimo) < nodo.length)) return false;
    if (ultimo === 'correcta') { const n = parseInt(valor, 10); nodo[ultimo] = Number.isInteger(n) && n >= 0 ? n : 0; return true; }
    nodo[ultimo] = String(valor == null ? '' : valor).slice(0, 2000);
    return true;
  }

  /* ── Fuente del video: ID de Bunny, enlace de Bunny, enlace de Drive o ID de Drive ── */
  const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const BIBLIOTECA_BUNNY = '731751';
  // Devuelve { vacio:true } | { videoId } (Bunny) | { driveId } | { error }
  function normalizarFuente(entrada) {
    const t = String(entrada == null ? '' : entrada).trim();
    if (!t) return { vacio: true };
    if (RE_UUID.test(t)) return { videoId: t.toLowerCase() };
    const b = t.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-f-]{36})(?![0-9a-f-])/i);
    if (b) {
      if (b[1] !== BIBLIOTECA_BUNNY) return { error: 'ese video es de otra biblioteca de Bunny, no de la de Zoorigen' };
      if (RE_UUID.test(b[2])) return { videoId: b[2].toLowerCase() };
    }
    if (/^https?:\/\//i.test(t)) {
      let host = '';
      try { host = new URL(t).hostname.toLowerCase(); } catch (e) { host = ''; }
      if (host === 'drive.google.com' || host === 'docs.google.com') {
        const m = t.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || t.match(/[?&]id=([A-Za-z0-9_-]+)/) || t.match(/\/d\/([A-Za-z0-9_-]+)/);
        if (m) return { driveId: m[1] };
      }
      return { error: 'solo se aceptan enlaces de Google Drive o de Bunny' };
    }
    if (/^[A-Za-z0-9_-]{6,}$/.test(t)) return { driveId: t };
    return { error: 'pega el ID del video de Bunny o el enlace de Google Drive' };
  }

  /* ── Preguntas de la clase (verdadero/falso u opción múltiple) ── */
  const MAX_PREGUNTAS = quiz && quiz.REGLAS ? quiz.REGLAS.maxPreguntas : 15;
  const MAX_OPCIONES = quiz && quiz.REGLAS ? quiz.REGLAS.opcionesMax : 6;
  const nuevaPregunta = () => ({ pregunta: '', tipo: 'vof', opciones: [], correcta: 0 });

  function agregarPregunta(leccion) {
    if (!leccion || typeof leccion !== 'object') return false;
    if (!Array.isArray(leccion.preguntas)) leccion.preguntas = [];
    if (leccion.preguntas.length >= MAX_PREGUNTAS) return false;
    leccion.preguntas.push(nuevaPregunta());
    return true;
  }
  function quitarPregunta(leccion, i) {
    const lista = leccion && leccion.preguntas;
    if (!Array.isArray(lista) || !Number.isInteger(i) || i < 0 || i >= lista.length) return false;
    lista.splice(i, 1);
    return true;
  }
  function cambiarTipoPregunta(p, tipo) {
    if (!p || typeof p !== 'object') return false;
    if (tipo === 'multiple') { p.tipo = 'multiple'; p.opciones = ['', '']; }
    else { p.tipo = 'vof'; p.opciones = []; }
    p.correcta = 0;
    return true;
  }
  function agregarOpcion(p) {
    if (!p || p.tipo !== 'multiple' || !Array.isArray(p.opciones) || p.opciones.length >= MAX_OPCIONES) return false;
    p.opciones.push('');
    return true;
  }
  // Quita una opción (mínimo 2) y deja la respuesta correcta apuntando a la misma opción.
  function quitarOpcion(p, i) {
    if (!p || p.tipo !== 'multiple' || !Array.isArray(p.opciones) || p.opciones.length <= 2 || !Number.isInteger(i) || i < 0 || i >= p.opciones.length) return false;
    p.opciones.splice(i, 1);
    if (i < p.correcta) p.correcta--;
    else if (i === p.correcta) p.correcta = 0;
    return true;
  }

  function moverLeccion(lista, i, delta) {
    const j = i + delta;
    if (!Number.isInteger(i) || i < 0 || i >= lista.length || j < 0 || j >= lista.length) return false;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    return true;
  }

  // Al guardar: normaliza el video, valida preguntas y juego, y conserva el resto de campos.
  // Una clase sin video se descarta. Devuelve { lecciones, errores:[{clase, mensaje}] }.
  function limpiarLecciones(lecciones) {
    const salida = [], errores = [];
    (Array.isArray(lecciones) ? lecciones : []).forEach((l, i) => {
      if (!l || typeof l !== 'object') return;
      const clase = { ...l };
      if (!l.videoId) {
        const f = normalizarFuente(l.driveId);
        if (f.vacio) return;
        if (f.error) { errores.push({ clase: i + 1, mensaje: `Clase ${i + 1}: ${f.error}` }); return; }
        if (f.videoId) { clase.videoId = f.videoId; clase.provider = 'bunny'; delete clase.driveId; }
        else clase.driveId = f.driveId;
      }
      if (typeof clase.titulo === 'string') clase.titulo = clase.titulo.trim();
      if (typeof clase.duration === 'string') clase.duration = clase.duration.trim();
      if (l.gratis === true) clase.gratis = true; else delete clase.gratis;
      delete clase.preguntas;
      const q = quiz ? quiz.limpiarPreguntas(l.preguntas) : { preguntas: [], errores: [] };
      q.errores.forEach(e => errores.push({ clase: i + 1, mensaje: `Clase ${i + 1}: ${e.mensaje.charAt(0).toLowerCase()}${e.mensaje.slice(1)}` }));
      if (q.preguntas.length) clase.preguntas = q.preguntas;
      delete clase.juego;
      if (l.juego && l.juego.tipo) {
        const limpio = juegos ? juegos.limpiarJuego(l.juego) : null;
        if (!limpio) errores.push({ clase: i + 1, mensaje: `Clase ${i + 1}: el juego está incompleto` });
        else clase.juego = limpio;
      }
      salida.push(clase);
    });
    return { lecciones: salida, errores };
  }

  // Sincronización con Bunny: reemplaza videos por posición pero CONSERVA todo lo demás (títulos, juegos…).
  function migrarLecciones(anteriores, nuevas) {
    const previas = Array.isArray(anteriores) ? anteriores : [];
    return nuevas.map((lesson, index) => {
      const anterior = previas[index] || {};
      const migrada = { ...anterior, titulo: anterior.titulo || lesson.titulo || `Clase ${index + 1}`, provider: 'bunny', videoId: lesson.videoId };
      if (anterior.driveId) migrada.driveIdAnterior = anterior.driveId;
      delete migrada.driveId;
      return migrada;
    });
  }

  /* ── HTML del editor ── */

  function inputHTML(ruta, valor, ph, extra) {
    return `<input type="text" class="ce-input" data-ruta="${esc(ruta)}" value="${esc(valor)}" placeholder="${esc(ph)}" maxlength="${(extra && extra.max) || 300}" autocomplete="off">`;
  }
  function filaBtnQuitar(idx, deshabilitado) {
    return `<button type="button" class="ce-mini" data-accion="fila-quitar" data-fila="${idx}" aria-label="Quitar fila ${idx + 1}"${deshabilitado ? ' disabled' : ''}>${ico('x', { size: 14 })}</button>`;
  }

  function camposJuegoHTML(juego) {
    const d = juego.datos || {};
    const min = FILAS_MINIMAS[juego.tipo] || 1;
    if (juego.tipo === 'sopa_letras') {
      const filas = (d.palabras || []).map((p, i) => `<div class="ce-fila">${inputHTML(`juego.datos.palabras.${i}`, p, `Palabra ${i + 1}`, { max: 30 })}${filaBtnQuitar(i, d.palabras.length <= min)}</div>`).join('');
      return `<p class="ce-ayuda">Mínimo 3 palabras de 2 a 14 letras. Se muestran en mayúsculas y sin acentos.</p>${filas}
        <button type="button" class="ce-mas" data-accion="fila-agregar">${ico('plus', { size: 14 })}Agregar palabra</button>`;
    }
    if (juego.tipo === 'memorama') {
      const filas = (d.pares || []).map((p, i) => `<div class="ce-fila ce-fila--doble">${inputHTML(`juego.datos.pares.${i}.termino`, p.termino, 'Término', { max: 80 })}${inputHTML(`juego.datos.pares.${i}.definicion`, p.definicion, 'Definición', { max: 200 })}${filaBtnQuitar(i, d.pares.length <= min)}</div>`).join('');
      return `<p class="ce-ayuda">Mínimo 3 pares. El alumno empareja cada término con su definición.</p>${filas}
        <button type="button" class="ce-mas" data-accion="fila-agregar">${ico('plus', { size: 14 })}Agregar par</button>`;
    }
    if (juego.tipo === 'rompecabezas') {
      const dif = String(d.dificultad || '3');
      return `<div class="ce-grid2">
          <label class="ce-campo"><span>Dificultad</span><select class="ce-input" data-ruta="juego.datos.dificultad">
            ${[['3', '3 × 3 · Fácil'], ['4', '4 × 4 · Medio'], ['5', '5 × 5 · Difícil']].map(([v, t]) => `<option value="${v}"${dif === v ? ' selected' : ''}>${t}</option>`).join('')}
          </select></label>
          <label class="ce-campo"><span>Imagen (opcional)</span>${inputHTML('juego.datos.imagenUrl', d.imagenUrl, 'https://…', { max: 500 })}</label>
        </div>
        <p class="ce-ayuda">Si dejas la imagen vacía se usa la portada del curso.</p>`;
    }
    if (juego.tipo === 'ahorcado') {
      const filas = (d.palabras || []).map((p, i) => `<div class="ce-fila ce-fila--doble">${inputHTML(`juego.datos.palabras.${i}.palabra`, p.palabra, 'Palabra', { max: 30 })}${inputHTML(`juego.datos.palabras.${i}.pista`, p.pista, 'Pista (opcional)', { max: 140 })}${filaBtnQuitar(i, d.palabras.length <= min)}</div>`).join('');
      return `<p class="ce-ayuda">Palabras de 3 a 16 letras, sin espacios. Se muestran en mayúsculas y sin acentos.</p>${filas}
        <button type="button" class="ce-mas" data-accion="fila-agregar">${ico('plus', { size: 14 })}Agregar palabra</button>`;
    }
    return '<p class="ce-ayuda">Elige el tipo de juego para ver sus campos.</p>';
  }

  function zonaJuegoHTML(juego) {
    if (!juego) {
      return `<button type="button" class="ce-juego-btn" data-accion="juego-agregar">${ico('gamepad-2', { size: 16 })}Agregar juego dinámico <small>aparece al terminar la clase</small></button>`;
    }
    const tipos = (juegos && juegos.TIPOS) || {};
    return `<div class="ce-juego">
        <div class="ce-juego__cab"><strong>${ico('gamepad-2', { size: 16 })}Juego de esta clase</strong>
          <button type="button" class="ce-quitar" data-accion="juego-quitar">${ico('trash-2', { size: 14 })}Quitar juego</button></div>
        <label class="ce-campo"><span>Tipo de juego</span><select class="ce-input" data-accion="juego-tipo">
          <option value=""${!juego.tipo ? ' selected' : ''}>Elige un tipo…</option>
          ${Object.keys(tipos).map(k => `<option value="${esc(k)}"${juego.tipo === k ? ' selected' : ''}>${esc(tipos[k])}</option>`).join('')}
        </select></label>
        <div class="ce-juego__campos">${camposJuegoHTML(juego)}</div>
      </div>`;
  }

  function preguntaHTML(p, qi) {
    const multiple = p.tipo === 'multiple';
    const opciones = multiple ? (Array.isArray(p.opciones) ? p.opciones : ['', '']) : [];
    const correcta = Number.isInteger(p.correcta) ? p.correcta : 0;
    const cuerpo = multiple
      ? `<div class="ce-opciones">${opciones.map((op, oi) => `<div class="ce-opcion">
            <input type="radio" class="ce-radio" name="corr-${qi}" data-ruta="preguntas.${qi}.correcta" value="${oi}"${correcta === oi ? ' checked' : ''} aria-label="Marcar la opción ${oi + 1} como correcta">
            ${inputHTML(`preguntas.${qi}.opciones.${oi}`, op, `Opción ${oi + 1}`, { max: 160 })}
            <button type="button" class="ce-mini" data-accion="opcion-quitar" data-o="${oi}" aria-label="Quitar la opción ${oi + 1}"${opciones.length <= 2 ? ' disabled' : ''}>${ico('x', { size: 14 })}</button>
          </div>`).join('')}
          <button type="button" class="ce-mas" data-accion="opcion-agregar"${opciones.length >= MAX_OPCIONES ? ' disabled' : ''}>${ico('plus', { size: 14 })}Agregar opción</button>
          <small class="ce-ayuda">Marca con el círculo la respuesta correcta.</small></div>`
      : `<div class="ce-vof">
          <label><input type="radio" class="ce-radio" name="corr-${qi}" data-ruta="preguntas.${qi}.correcta" value="0"${correcta === 0 ? ' checked' : ''}> Verdadero es lo correcto</label>
          <label><input type="radio" class="ce-radio" name="corr-${qi}" data-ruta="preguntas.${qi}.correcta" value="1"${correcta === 1 ? ' checked' : ''}> Falso es lo correcto</label></div>`;
    return `<div class="ce-preg" data-q="${qi}">
        <div class="ce-preg__cab"><span class="ce-preg__num">Pregunta ${qi + 1}</span>
          <select class="ce-input ce-preg__tipo" data-accion="pregunta-tipo" aria-label="Tipo de la pregunta ${qi + 1}">
            <option value="vof"${multiple ? '' : ' selected'}>Verdadero / Falso</option>
            <option value="multiple"${multiple ? ' selected' : ''}>Opción múltiple</option>
          </select>
          <button type="button" class="ce-mini ce-mini--peligro" data-accion="pregunta-quitar" aria-label="Quitar la pregunta ${qi + 1}">${ico('trash-2', { size: 14 })}</button></div>
        <textarea class="ce-input" data-ruta="preguntas.${qi}.pregunta" rows="2" maxlength="300" placeholder="Escribe la pregunta">${esc(p.pregunta)}</textarea>
        ${cuerpo}
      </div>`;
  }

  function preguntasZonaHTML(l) {
    const lista = Array.isArray(l.preguntas) ? l.preguntas : [];
    const lleno = lista.length >= MAX_PREGUNTAS;
    return `${lista.map(preguntaHTML).join('')}
      <button type="button" class="ce-juego-btn ce-preg-btn" data-accion="pregunta-agregar"${lleno ? ' disabled' : ''}>${ico('circle-help', { size: 16 })}Agregar pregunta <small>se responde al terminar la clase, antes del juego</small></button>`;
  }

  function leccionHTML(l, i, total) {
    const fuente = l.videoId
      ? `<div class="ce-fuente">${ico('badge-check', { size: 15 })}Video Bunny vinculado <code>${esc(l.videoId)}</code></div>`
      : inputHTML('driveId', l.driveId, 'ID del video de Bunny, o enlace/ID de Google Drive', { max: 400 });
    return `<div class="ce-clase" data-lec="${i}">
        <div class="ce-clase__cab">
          <span class="ce-badge">Clase ${i + 1}</span>
          <div class="ce-clase__mov">
            <button type="button" class="ce-mini" data-accion="lec-subir" aria-label="Subir clase ${i + 1}"${i === 0 ? ' disabled' : ''}>${ico('arrow-up', { size: 14 })}</button>
            <button type="button" class="ce-mini" data-accion="lec-bajar" aria-label="Bajar clase ${i + 1}"${i === total - 1 ? ' disabled' : ''}>${ico('arrow-down', { size: 14 })}</button>
            <button type="button" class="ce-mini ce-mini--peligro" data-accion="lec-quitar" aria-label="Quitar clase ${i + 1}"${total <= 1 ? ' disabled' : ''}>${ico('trash-2', { size: 14 })}</button>
          </div>
        </div>
        ${inputHTML('titulo', l.titulo, 'Título de la clase', { max: 160 })}
        ${fuente}
        ${inputHTML('duration', l.duration, 'Duración (ej. 25 min)', { max: 40 })}
        <label class="ce-gratis"><input type="checkbox" data-accion="gratis"${l.gratis === true ? ' checked' : ''}><span>${ico('gift', { size: 15 })}Clase gratis <small>la ven quienes no tienen membresía (solo si el curso está marcado con clases gratis de muestra)</small></span></label>
        <div class="ce-preg-zona">${preguntasZonaHTML(l)}</div>
        <div class="ce-juego-zona">${zonaJuegoHTML(l.juego)}</div>
      </div>`;
  }

  function leccionesHTML(lecciones) {
    return lecciones.map((l, i) => leccionHTML(l, i, lecciones.length)).join('');
  }

  function modalCursoHTML(data, areas, niveles) {
    const d = data || {};
    const lista = [...(areas && areas.length ? areas : AREAS)];
    // Si el curso trae un área que no está en la lista, se conserva (si no, al guardar cambiaría sin avisar).
    if (d.area && !lista.includes(d.area)) lista.push(d.area);
    const nivs = [...(niveles && niveles.length ? niveles : NIVELES)];
    if (d.level && !nivs.includes(d.level)) nivs.push(d.level);
    const editando = !!d.id;
    return `
      <div class="ce-head">
        <span class="ce-head__ico">${ico('graduation-cap', { size: 24 })}</span>
        <div><h3>${editando ? 'Editar' : 'Nuevo'} curso</h3><p>${editando ? esc(d.title || '') : 'Completa los datos y agrega las clases'}</p></div>
        <button type="button" class="ce-head__x" onclick="closeM()" aria-label="Cerrar">${ico('x', { size: 18 })}</button>
      </div>
      <div class="ce-form">
        <label class="ce-campo ce-campo--full"><span>Título del curso *</span><input type="text" class="ce-input" id="f_title" value="${esc(d.title)}" placeholder="Ej. Fototrampeo de jaguares" maxlength="140"></label>
        <label class="ce-campo ce-campo--full"><span>Descripción</span><textarea class="ce-input" id="f_desc" placeholder="Breve descripción" maxlength="600">${esc(d.description)}</textarea></label>
        <label class="ce-campo"><span>Área *</span><select class="ce-input" id="f_area">${lista.map(a => `<option${d.area === a ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
        <label class="ce-campo"><span>Nivel</span><select class="ce-input" id="f_level">${nivs.map(n => `<option value="${esc(n)}"${d.level === n ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <label class="ce-campo ce-campo--full"><span>Instructor (opcional)</span><input type="text" class="ce-input" id="f_instructor" value="${esc(d.instructor)}" placeholder="Ej. Dra. Ana Martínez" maxlength="120"></label>
        <label class="ce-campo"><span>Duración total</span><input type="text" class="ce-input" id="f_duration" value="${esc(d.duration)}" placeholder="Ej. 6 h" maxlength="40"></label>
        <label class="ce-campo"><span>Etiqueta destacada (opcional)</span><input type="text" class="ce-input" id="f_tag" value="${esc(d.tag)}" placeholder="Ej. Nuevo, Popular" maxlength="30"></label>
        <label class="ce-campo ce-campo--full"><span>URL de portada (opcional)</span><input type="text" class="ce-input" id="f_image" value="${esc(d.image)}" placeholder="Pega un enlace a la imagen" maxlength="500">
          <small class="ce-ayuda">Medida ideal: 800×450 px horizontal · JPG de menos de 300 KB. Puedes subirla a <code>assets/img/</code> del sitio.</small></label>
        <fieldset class="ce-campo ce-campo--full ce-disp">
          <legend>Disponibilidad para los miembros</legend>
          <label class="ce-opt"><input type="radio" name="f_disp" value="progresivo"${d.disponibleSiempre === true ? '' : ' checked'}>
            <span><strong>Desbloqueo progresivo (cada 8 días)</strong><small>El curso aparece según su orden en la lista: el primero el día 0, el segundo el día 8, y así.</small></span></label>
          <label class="ce-opt"><input type="radio" name="f_disp" value="siempre"${d.disponibleSiempre === true ? ' checked' : ''}>
            <span><strong>Disponible desde el primer día</strong><small>Se ve de inmediato y no cuenta en el turno de los demás cursos.</small></span></label>
        </fieldset>
        <label class="ce-campo ce-campo--full ce-muestra"><input type="checkbox" id="f_muestra"${d.cursoMuestraGratis === true ? ' checked' : ''}>
          <span><strong>Este curso tiene clases gratis de muestra</strong><small>Quien no tenga membresía podrá ver las clases que marques como gratis. Solo un curso puede tenerlo. Las demás clases piden membresía.</small></span></label>
        <div class="ce-campo ce-campo--full">
          <span>Clases del curso</span>
          <small class="ce-ayuda">Para una clase nueva pega el ID del video de Bunny (o un enlace de Google Drive). Cada clase puede llevar preguntas y cerrar con un juego.</small>
          <div id="leccionesContainer" class="ce-clases"></div>
          <button type="button" class="ce-agregar" onclick="agregarLeccion()">${ico('plus', { size: 16 })}Agregar otra clase</button>
        </div>
      </div>
      <div class="ce-pie">
        <button type="button" class="btn-cancel" onclick="closeM()">Cancelar</button>
        <button type="button" class="btn-save" onclick="saveCurso('${esc(d.id || '')}')">${ico('check', { size: 16 })}${editando ? 'Guardar cambios' : 'Crear curso'}</button>
      </div>`;
  }

  return {
    AREAS, NIVELES, esc, colorArea, parseHoras, leccionesDe, contarClases, contarJuegos, contarPreguntas, resumenCursos,
    ordenarCursos, filtrarCursos, areasConConteo, urlPortada,
    kpisHTML, chipsAreasHTML, ordenHTML, vistaHTML, tarjetaGridHTML, tarjetaListaHTML, listaHTML,
    FILAS_MINIMAS, leccionVacia, nuevoJuego, agregarFila, quitarFila, asignarRuta, moverLeccion,
    limpiarLecciones, migrarLecciones, normalizarFuente,
    nuevaPregunta, agregarPregunta, quitarPregunta, cambiarTipoPregunta, agregarOpcion, quitarOpcion,
    preguntaHTML, preguntasZonaHTML, leccionHTML, leccionesHTML, zonaJuegoHTML, camposJuegoHTML, modalCursoHTML
  };
});
