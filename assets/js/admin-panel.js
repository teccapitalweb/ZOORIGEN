/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · ayudas puras                        */
/* Secciones, formatos, insignias de estado, filtros de miembros */
/* (las gráficas están en admin-graficas.js).                    */
/* No toca la red ni el DOM: se prueba en                        */
/* tests/admin-panel-estructura.test.js                          */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-iconos.js'));
  else root.ZOO_ADMIN_PANEL = factory(root.ZOO_ICONOS);
})(typeof self !== 'undefined' ? self : this, function (iconos) {
  'use strict';

  var ico = function (nombre, opciones) { return iconos && iconos.svg ? iconos.svg(nombre, opciones) : ''; };

  /* ── Secciones del panel ──
     origen: 'servidor' = endpoint propio de la administración · 'club' = módulo anterior que lee Firestore o sus rutas. zoo = clave de color del apartado (club-seccion.css). */
  var SECCIONES = [
    { id: 'resumen', grupo: 'Panel', titulo: 'Resumen', icono: 'chart-column', zoo: 'inicio', origen: 'servidor' },
    { id: 'miembros', grupo: 'Panel', titulo: 'Miembros', icono: 'users', zoo: 'directorio', origen: 'servidor' },
    { id: 'suscripciones', grupo: 'Panel', titulo: 'Suscripciones y pagos', icono: 'credit-card', zoo: 'suscripcion', origen: 'servidor' },
    { id: 'cursos', grupo: 'Contenido', titulo: 'Cursos', icono: 'book-open', zoo: 'cursos', origen: 'club' },
    { id: 'certificados', grupo: 'Contenido', titulo: 'Certificados', icono: 'award', zoo: 'certificados', origen: 'club' },
    { id: 'videos', grupo: 'Contenido', titulo: 'Videos', icono: 'clapperboard', zoo: 'videos', origen: 'club' },
    { id: 'pdfs', grupo: 'Contenido', titulo: 'PDFs', icono: 'file-text', zoo: 'pdfs', origen: 'club' },
    { id: 'sesiones', grupo: 'Contenido', titulo: 'Sesiones', icono: 'radio', zoo: 'sesiones', origen: 'club' },
    { id: 'noticias', grupo: 'Contenido', titulo: 'Noticias y avisos', icono: 'newspaper', zoo: 'logros', origen: 'club' },
    { id: 'retos', grupo: 'Comunidad', titulo: 'Retos y XP', icono: 'target', zoo: 'retos', origen: 'servidor' },
    { id: 'comunidad', grupo: 'Comunidad', titulo: 'Foro y directorio', icono: 'message-square', zoo: 'foro', origen: 'servidor' },
    { id: 'referidos', grupo: 'Comunidad', titulo: 'Referidos', icono: 'gift', zoo: 'referidos', origen: 'servidor' },
    { id: 'metricas', grupo: 'Marketing', titulo: 'Métricas', icono: 'chart-line', zoo: 'videos', origen: 'servidor' },
    { id: 'pruebas', grupo: 'Marketing', titulo: 'Pruebas gratuitas', icono: 'flask-conical', zoo: 'registro', origen: 'servidor' },
    { id: 'encuesta', grupo: 'Marketing', titulo: 'Encuesta', icono: 'list-checks', zoo: 'canal', origen: 'servidor' },
    { id: 'configuracion', grupo: 'Sistema', titulo: 'Configuración', icono: 'settings', zoo: 'perfil', origen: 'servidor' },
    { id: 'avance', grupo: 'Sistema', titulo: 'Avance de miembros', icono: 'graduation-cap', zoo: 'certificados', origen: 'servidor' },
    { id: 'estado', grupo: 'Sistema', titulo: 'Estado del sistema', icono: 'activity', zoo: 'pdfs', origen: 'servidor' }
  ];

  var IDS = SECCIONES.map(function (s) { return s.id; });
  function seccion(id) { return SECCIONES.filter(function (s) { return s.id === id; })[0] || null; }
  function seccionDeHash(hash) {
    var m = /^#\/?([a-z-]+)/.exec(String(hash || ''));
    return m && IDS.indexOf(m[1]) !== -1 ? m[1] : 'resumen';
  }

  /* ── Texto ── */
  function esc(valor) {
    return String(valor == null ? '' : valor).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function aFecha(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  // "15 oct 2026" (zona de México, UTC-6, como el resto del Club)
  function fmtFecha(iso) {
    var d = aFecha(iso);
    if (!d) return '—';
    var m = new Date(d.getTime() - 6 * 3600 * 1000);
    return m.getUTCDate() + ' ' + MESES[m.getUTCMonth()] + ' ' + m.getUTCFullYear();
  }

  // "oct 2026" a partir de "2026-10"
  function fmtMes(clave) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(clave || ''));
    return m ? MESES[Number(m[2]) - 1] + ' ' + m[1] : '—';
  }

  function fmtNum(n) {
    var v = Number(n);
    return isFinite(v) ? v.toLocaleString('es-MX') : '—';
  }

  function fmtMxn(n) {
    var v = Number(n);
    return isFinite(v) ? '$' + Math.round(v).toLocaleString('es-MX') + ' MXN' : '—';
  }

  // "en 8 días", "hace 4 meses"
  function relativo(iso, ahora) {
    var d = aFecha(iso);
    if (!d) return '';
    var dias = Math.round((d.getTime() - (ahora || Date.now())) / 86400000);
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'mañana';
    if (dias === -1) return 'ayer';
    var n = Math.abs(dias);
    var lapso = n < 60 ? n + ' días' : n < 700 ? Math.round(n / 30) + ' meses' : Math.round(n / 365) + ' años';
    return dias > 0 ? 'en ' + lapso : 'hace ' + lapso;
  }

  function duracion(segundos) {
    var s = Math.max(0, Math.round(Number(segundos) || 0));
    if (s < 90) return s + ' s';
    var m = Math.round(s / 60);
    if (m < 90) return m + ' min';
    var h = Math.floor(m / 60);
    if (h < 48) return h + ' h ' + (m % 60) + ' min';
    return Math.floor(h / 24) + ' días ' + (h % 24) + ' h';
  }

  function iniciales(nombre) {
    var partes = String(nombre || '').trim().split(/\s+/).filter(function (p) { return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/.test(p); });
    if (!partes.length) return '?';
    return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
  }

  /* ── Insignias de estado (color + ícono + texto: nunca solo color) ── */
  var ESTADOS = {
    'activo': { texto: 'Activo', icono: 'circle-check', tono: 'ok' },
    'cancelado-vigente': { texto: 'Cancelado, con acceso', icono: 'hourglass', tono: 'aviso' },
    'pago-pendiente': { texto: 'Pago pendiente', icono: 'triangle-alert', tono: 'error' },
    'vencido': { texto: 'Vencido', icono: 'circle-x', tono: 'apagado' },
    'sin-plan': { texto: 'Sin membresía', icono: 'circle-dashed', tono: 'neutro' }
  };
  var ORIGENES = { stripe: 'Stripe', manual: 'Manual', regalo: 'Regalo', heredado: 'Heredado', otro: 'Otro', ninguno: '—' };

  function insignia(estado) {
    var e = ESTADOS[estado] || ESTADOS['sin-plan'];
    return '<span class="ap-badge ap-badge--' + e.tono + '">' + ico(e.icono, { size: 14 }) + '<span>' + esc(e.texto) + '</span></span>';
  }
  function etiquetaEstado(estado) { return (ESTADOS[estado] || ESTADOS['sin-plan']).texto; }

  /* ── Miembros: filtros, orden y búsqueda ── */
  var FILTROS = [
    { id: 'todos', texto: 'Todos', pasa: function () { return true; } },
    { id: 'activo', texto: 'Activos', pasa: function (m) { return m.estado === 'activo'; } },
    { id: 'cancelado-vigente', texto: 'Cancelados con acceso', pasa: function (m) { return m.estado === 'cancelado-vigente'; } },
    { id: 'pago-pendiente', texto: 'Pago pendiente', pasa: function (m) { return m.estado === 'pago-pendiente'; } },
    { id: 'vencido', texto: 'Vencidos', pasa: function (m) { return m.estado === 'vencido'; } },
    { id: 'sin-plan', texto: 'Sin membresía', pasa: function (m) { return m.estado === 'sin-plan'; } }
  ];

  function quitarAcentos(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  function contarPorFiltro(lista) {
    var r = {};
    FILTROS.forEach(function (f) { r[f.id] = 0; });
    lista.forEach(function (m) { FILTROS.forEach(function (f) { if (f.pasa(m)) r[f.id] += 1; }); });
    return r;
  }

  function filtrarMiembros(lista, opciones) {
    var o = opciones || {};
    var f = FILTROS.filter(function (x) { return x.id === o.filtro; })[0] || FILTROS[0];
    var q = quitarAcentos(o.texto).trim();
    return lista.filter(function (m) {
      if (!f.pasa(m)) return false;
      if (!q) return true;
      return quitarAcentos(m.nombre).indexOf(q) !== -1 || quitarAcentos(m.correo).indexOf(q) !== -1;
    });
  }

  var ORDENES = [
    { id: 'vence', texto: 'Vencimiento más cercano' },
    { id: 'registro', texto: 'Registro más reciente' },
    { id: 'nombre', texto: 'Nombre (A a Z)' }
  ];

  function ordenarMiembros(lista, orden) {
    var ms = function (iso) { var d = aFecha(iso); return d ? d.getTime() : null; };
    var copia = lista.slice();
    if (orden === 'nombre') {
      return copia.sort(function (a, b) { return String(a.nombre || a.correo).localeCompare(String(b.nombre || b.correo), 'es'); });
    }
    if (orden === 'registro') {
      return copia.sort(function (a, b) { return (ms(b.registro) || 0) - (ms(a.registro) || 0); });
    }
    // Vencimiento: primero quien tiene acceso y vence antes; después el resto, lo más reciente primero
    return copia.sort(function (a, b) {
      if (a.conAcceso !== b.conAcceso) return a.conAcceso ? -1 : 1;
      var va = ms(a.vence); var vb = ms(b.vence);
      if (a.conAcceso) return (va === null ? Infinity : va) - (vb === null ? Infinity : vb);
      return (vb || 0) - (va || 0);
    });
  }

  /* ── Avance de miembros: lo que dice el ensayo del servidor (GET /api/admin/progreso-legado) ──
     El avance del sitio anterior (courseProgress) se importa solo, una vez, cuando la persona entra. Estas ayudas solo
     traducen el veredicto del servidor a insignias, botones y frases en lenguaje llano. */
  function estadoAvance(f) {
    var v = f && f.veredicto;
    if (v === 'ya-importado') {
      if (f.clasesFaltantes > 0) return { id: 'faltan', tono: 'aviso', icono: 'triangle-alert', texto: 'Importado, faltan clases', accion: 'reparar' };
      if (f.clasesPerdidas > 0) return { id: 'importado-con-bajas', tono: 'aviso', icono: 'info', texto: 'Importado; algunas clases ya no existen', accion: null };
      return { id: 'importado', tono: 'ok', icono: 'circle-check', texto: 'Importado y verificado', accion: null };
    }
    if (v === 'completo') return { id: 'completo', tono: 'info', icono: 'download', texto: 'Completo, por importar', accion: 'importar' };
    if (v === 'parcial') return { id: 'parcial', tono: 'aviso', icono: 'triangle-alert', texto: 'Parcial', accion: 'importar' };
    if (v === 'no-elegible') return { id: 'no-elegible', tono: 'error', icono: 'lock', texto: 'No elegible', accion: 'forzar' };
    return { id: 'sin-avance', tono: 'neutro', icono: 'circle-dashed', texto: 'Sin avance anterior', accion: null };
  }

  function insigniaAvance(f) {
    var e = estadoAvance(f);
    return '<span class="ap-badge ap-badge--' + e.tono + '">' + ico(e.icono, { size: 14 }) + '<span>' + esc(e.texto) + '</span></span>';
  }

  var MOTIVOS_NO_ELEGIBLE = {
    'sin-corte': 'La importación automática está apagada (falta la fecha de corte en el servidor).',
    'sin-fecha-cuenta': 'No se pudo leer la fecha en que se creó la cuenta.',
    'cuenta-posterior': 'La cuenta se creó después de la fecha de corte.'
  };
  function textoMotivoNoElegible(m) { return MOTIVOS_NO_ELEGIBLE[m] || 'La cuenta no cumple la regla de fecha.'; }

  var TEXTOS_CURSO_AVANCE = {
    'ok': 'Todo se conserva',
    'listo-para-certificado': 'Terminó el curso sin certificado: queda la última clase para que el servidor lo emita',
    'fuera-de-rango': 'Algunas clases ya no existen en el curso',
    'curso-eliminado': 'El curso ya no existe',
    'sin-clases': 'El curso ya no tiene clases',
    'id-invalido': 'Identificador de curso no válido',
    'excede-limite': 'Hay más cursos de los que se importan',
    'datos-invalidos': 'Dato ilegible en el sitio anterior'
  };
  function textoEstadoCurso(estado) { return TEXTOS_CURSO_AVANCE[estado] || 'Sin revisar'; }

  // Dos líneas bajo la insignia: qué pasa con esta persona (en lenguaje llano)
  function detalleAvance(f) {
    var e = estadoAvance(f);
    var partes = [];
    if (e.id === 'no-elegible') partes.push(textoMotivoNoElegible(f.motivoNoElegible));
    if (e.id === 'faltan') partes.push('Faltan ' + fmtNum(f.clasesFaltantes) + ' clases por guardar.');
    if (f.clasesPerdidas > 0) partes.push(fmtNum(f.clasesPerdidas) + (f.clasesPerdidas === 1 ? ' clase ya no existe en el curso.' : ' clases ya no existen en el curso.'));
    if (f.listosParaCertificado > 0) partes.push(fmtNum(f.listosParaCertificado) + (f.listosParaCertificado === 1 ? ' curso espera su certificado.' : ' cursos esperan su certificado.'));
    if (f.formatoInvalido) partes.push('El dato anterior no se puede leer.');
    return partes.join(' ');
  }

  // Frase de arriba de la tabla. resumen = el que entrega el servidor.
  function resumenAvance(r) {
    var x = r || {};
    var n = x.conAvanceViejo || 0;
    if (!n) {
      return { tono: 'neutro', icono: 'circle-dashed', titulo: 'Ningún miembro tiene avance del sitio anterior por importar',
        detalle: 'Cuando alguien tenga cursos empezados en el sitio anterior, aparecerá aquí.' };
    }
    var ver = x.verificados || 0;
    var rev = x.requierenRevision || 0;
    var titulo = fmtNum(ver) + ' de ' + fmtNum(n) + (n === 1 ? ' miembro con avance verificado' : ' miembros con avance verificado');
    var detalle = [];
    if (rev === 0) detalle.push('Nadie perdería nada de lo que llevaba en el sitio anterior.');
    else detalle.push(fmtNum(rev) + (rev === 1 ? ' necesita tu revisión' : ' necesitan tu revisión') + ': está marcado en amarillo o rojo en la tabla.');
    if (x.completos > 0) detalle.push(fmtNum(x.completos) + (x.completos === 1 ? ' se importará solo cuando entre al sitio; si prefieres, impórtalo ahora desde la tabla.' : ' se importarán solos cuando entren al sitio; si prefieres, impórtalos ahora desde la tabla.'));
    if (x.clasesViejas > 0) {
      var linea = 'Clases del sitio anterior: ' + fmtNum(x.clasesViejas) + '. Se conservan ' + fmtNum(x.clasesImportables) + '.';
      if (x.clasesPerdidas > 0) linea += ' ' + fmtNum(x.clasesPerdidas) + ' ya no existen en su curso.';
      detalle.push(linea);
    }
    return { tono: rev === 0 ? 'ok' : 'aviso', icono: rev === 0 ? 'circle-check' : 'triangle-alert', titulo: titulo, detalle: detalle.join(' ') };
  }

  /* ── Métricas: series por día, agrupación, comparación con el periodo anterior y rangos rápidos ──
     Todo es puro (sin red ni DOM) y se prueba en tests/admin-metricas.test.js. Las claves de día son AAAA-MM-DD en hora de México. */
  function sumarDiasClave(clave, n) {
    var p = String(clave).split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
  }
  function lunesDe(clave) {
    var p = String(clave).split('-').map(Number);
    var dow = (new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay() + 6) % 7;
    return sumarDiasClave(clave, -dow);
  }
  function diaCorto(clave) { var p = String(clave).split('-').map(Number); return p[2] + ' ' + MESES[p[1] - 1]; }
  function mesCorto(clave) { var p = String(clave).split('-').map(Number); return MESES[p[1] - 1] + ' ' + String(p[0]).slice(2); }

  // serie: [{ dia, n }] → [{ clave, etiqueta, valor }] por día, por semana (lunes a domingo) o por mes.
  function agruparSerie(serie, modo) {
    var lista = Array.isArray(serie) ? serie : [];
    if (modo !== 'semana' && modo !== 'mes') return lista.map(function (d) { return { clave: d.dia, etiqueta: diaCorto(d.dia), valor: Number(d.n) || 0 }; });
    var orden = []; var mapa = {};
    lista.forEach(function (d) {
      var clave = modo === 'semana' ? lunesDe(d.dia) : String(d.dia).slice(0, 7);
      if (!mapa[clave]) { mapa[clave] = { clave: clave, etiqueta: modo === 'semana' ? diaCorto(clave) : mesCorto(clave + '-01'), valor: 0 }; orden.push(clave); }
      mapa[clave].valor += Number(d.n) || 0;
    });
    return orden.map(function (c) { return mapa[c]; });
  }

  function sumaSerie(serie) { return (Array.isArray(serie) ? serie : []).reduce(function (t, d) { return t + (Number(d.n != null ? d.n : d.valor) || 0); }, 0); }

  // Compara con el periodo anterior de igual largo. Devuelve { tono, icono, texto }.
  function variacion(actual, anterior) {
    var a = Number(actual) || 0; var b = Number(anterior) || 0;
    if (a === 0 && b === 0) return { tono: 'neutro', icono: 'minus', texto: 'Sin cambios (0 en ambos periodos)' };
    if (b === 0) return { tono: 'ok', icono: 'trending-up', texto: 'Antes eran 0' };
    if (a === b) return { tono: 'neutro', icono: 'minus', texto: 'Igual que el periodo anterior (' + fmtNum(b) + ')' };
    var pct = Math.round(((a - b) / b) * 100);
    return a > b
      ? { tono: 'ok', icono: 'trending-up', texto: '+' + pct + ' % frente a ' + fmtNum(b) + ' del periodo anterior' }
      : { tono: 'aviso', icono: 'trending-down', texto: pct + ' % frente a ' + fmtNum(b) + ' del periodo anterior' };
  }

  // Rangos rápidos del selector. hoy = clave AAAA-MM-DD de hoy (México).
  var RANGOS = [
    { id: '7', texto: '7 días', dias: 7 }, { id: '30', texto: '30 días', dias: 30 }, { id: '90', texto: '90 días', dias: 90 },
    { id: '180', texto: '6 meses', dias: 180 }, { id: '365', texto: '12 meses', dias: 365 }, { id: 'todo', texto: 'Todo', dias: null }
  ];
  function rangoRapido(id, hoy) {
    var r = RANGOS.filter(function (x) { return x.id === id; })[0] || RANGOS[1];
    if (r.dias === null) return { desde: 'todo', hasta: hoy };
    return { desde: sumarDiasClave(hoy, -(r.dias - 1)), hasta: hoy };
  }

  function fmtPct(n) { return n === null || n === undefined || !isFinite(Number(n)) ? '—' : Math.round(Number(n)) + ' %'; }

  /* ── CSV (exportar listas): comillas dobles escapadas y protección contra fórmulas de hoja de cálculo ── */
  function celdaCsv(v) {
    var t = String(v == null ? '' : v).replace(/\r?\n/g, ' ');
    if (/^[=+\-@\t]/.test(t)) t = "'" + t;
    return /[",;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  function aCsv(columnas, filas) {
    var cab = columnas.map(function (c) { return celdaCsv(c.titulo); }).join(',');
    var cuerpo = filas.map(function (f) { return columnas.map(function (c) { return celdaCsv(f[c.clave]); }).join(','); });
    return [cab].concat(cuerpo).join('\r\n');
  }

  /* ── Tarjeta de título de sección (la misma del Club: zs-seccion, color sólido del apartado) ── */
  function tarjetaTitulo(c) {
    var cifras = (c.cifras || []).map(function (x) {
      return '<div class="zs-cifra"><span class="zs-cifra__v">' + esc(x.valor) + '</span><span class="zs-cifra__r">' + esc(x.rotulo) + '</span></div>';
    }).join('');
    var acciones = (c.acciones || []).map(function (a) {
      return '<button type="button" class="zs-seccion__btn' + (a.oro ? ' zs-seccion__btn--oro' : '') + '" data-accion="' + esc(a.id) + '">' + ico(a.icono || 'refresh-cw', { size: 18 }) + esc(a.texto) + '</button>';
    }).join('');
    return '<header class="zs-seccion ap-titulo" id="apTitulo">' +
      '<div class="zs-seccion__cuerpo"><div class="zs-seccion__texto">' +
      '<span class="zs-seccion__pildora">' + ico(c.icono || 'shield-check', { size: 16 }) + esc(c.eyebrow || 'Panel de administración') + '</span>' +
      '<h1 class="zs-seccion__titulo">' + esc(c.titulo) + (c.acento ? ' <span class="zs-acento">' + esc(c.acento) + '</span>' : '') + '</h1>' +
      (c.sub ? '<p class="zs-seccion__sub">' + esc(c.sub) + '</p>' : '') +
      '</div>' + (acciones ? '<div class="zs-seccion__lado">' + acciones + '</div>' : '') + '</div>' +
      (cifras ? '<div class="zs-seccion__cifras">' + cifras + '</div>' : '') +
      '</header>';
  }

  // Bloque "Próximamente" con el diseño completo y, a la vista, qué falta en el servidor (nada inventado).
  function bloqueProntoHTML(c) {
    var faltan = (c.faltan || []).map(function (f) { return '<li><code>' + esc(f) + '</code></li>'; }).join('');
    return '<section class="zs-pronto ap-pronto" aria-label="Próximamente">' +
      '<span class="zs-pronto__ico">' + ico(c.icono || 'hourglass', { size: 28 }) + '</span>' +
      '<span class="zs-pronto__chip">Próximamente</span>' +
      '<h2 class="zs-pronto__titulo">' + esc(c.titulo) + '</h2>' +
      '<p class="zs-pronto__texto">' + esc(c.texto) + '</p>' +
      (faltan ? '<div class="ap-pronto__faltan"><strong>Lo que falta en el servidor</strong><ul>' + faltan + '</ul></div>' : '') +
      '</section>';
  }

  return {
    SECCIONES: SECCIONES, IDS: IDS, FILTROS: FILTROS, ORDENES: ORDENES, ESTADOS: ESTADOS, ORIGENES: ORIGENES,
    seccion: seccion, seccionDeHash: seccionDeHash,
    esc: esc, aFecha: aFecha, fmtFecha: fmtFecha, fmtMes: fmtMes, fmtNum: fmtNum, fmtMxn: fmtMxn, relativo: relativo,
    duracion: duracion, iniciales: iniciales, insignia: insignia, etiquetaEstado: etiquetaEstado,
    contarPorFiltro: contarPorFiltro, filtrarMiembros: filtrarMiembros, ordenarMiembros: ordenarMiembros,
    sumarDiasClave: sumarDiasClave, lunesDe: lunesDe, diaCorto: diaCorto, mesCorto: mesCorto, agruparSerie: agruparSerie, sumaSerie: sumaSerie,
    variacion: variacion, RANGOS: RANGOS, rangoRapido: rangoRapido, fmtPct: fmtPct,
    celdaCsv: celdaCsv, aCsv: aCsv,
    tarjetaTitulo: tarjetaTitulo, bloqueProntoHTML: bloqueProntoHTML,
    estadoAvance: estadoAvance, insigniaAvance: insigniaAvance, detalleAvance: detalleAvance, resumenAvance: resumenAvance,
    textoEstadoCurso: textoEstadoCurso, textoMotivoNoElegible: textoMotivoNoElegible
  };
});
