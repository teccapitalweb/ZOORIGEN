/* ============================================================ */
/* LIBRO DE REGISTRO DE EJEMPLARES · parte pura (probada en Node) */
/*                                                                */
/* Aquí vive todo lo que NO necesita navegador: formatear fechas, */
/* agrupar por especie, filtrar, armar la bitácora, validar los   */
/* formularios, escribir el borrador del informe anual y exportar */
/* a CSV. La página (pages/club-inventario.html) solo toma los    */
/* datos del servidor y dibuja lo que esta parte devuelve.        */
/*                                                                */
/* IMPORTANTE: esta herramienta NO decide nada legal. Solo ordena */
/* los datos que la persona escribe. Los únicos valores "legales" */
/* son los plazos de referencia del Reglamento de la LGVS, Art.   */
/* 50, escritos tal cual en PLAZOS_REFERENCIA.                    */
/*                                                                */
/* REGLA: ningún dato del usuario llega a innerHTML sin pasar por */
/* esc(). Se prueba en tests/registro-ejemplares-ui.test.js.      */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_REGISTRO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LIMITE_TEXTO = 300;
  var LIMITE_NOTAS = 1000;
  var MAX_EJEMPLARES = 500;
  var MAX_EVENTOS = 5000;

  var TIPOS_EVENTO = ['baja', 'muerte', 'traslado', 'nota'];
  var TIPOS_INGRESO = ['alta', 'nacimiento'];
  var SEXOS = ['macho', 'hembra', 'indeterminado'];
  var ESTADOS = ['activo', 'baja', 'muerte', 'traslado'];

  var ETIQUETAS_TIPO = {
    alta: 'Ingreso (alta)', nacimiento: 'Nacimiento', baja: 'Baja', muerte: 'Muerte', traslado: 'Traslado', nota: 'Nota'
  };
  var ETIQUETAS_ESTADO = { activo: 'Activo', baja: 'Baja', muerte: 'Muerte', traslado: 'Trasladado' };
  var ETIQUETAS_SEXO = { macho: 'Macho', hembra: 'Hembra', indeterminado: 'Indeterminado' };
  var ICONOS_TIPO = { alta: 'plus', nacimiento: 'egg', baja: 'minus', muerte: 'skull', traslado: 'arrow-right', nota: 'pencil' };

  var TIPOS_UNIDAD = [
    { id: '', label: 'No especificado' },
    { id: 'extensiva', label: 'UMA extensiva (vida libre)' },
    { id: 'intensiva', label: 'UMA intensiva (confinamiento)' },
    { id: 'pimvs', label: 'PIMVS (predio o instalación que maneja vida silvestre fuera de su hábitat)' }
  ];

  /* Los plazos de referencia, tal como los da el Reglamento de la LGVS, Art. 50. No se calculan ni se avisan. */
  var FUENTE_PLAZOS = 'Reglamento de la Ley General de Vida Silvestre, Art. 50';
  var PLAZOS_REFERENCIA = [
    { t: 'Informe anual de actividades de la UMA', d: 'de abril a junio.' },
    { t: 'Contingencias o emergencias', d: 'dentro de los 3 días hábiles siguientes a que ocurran.' },
    { t: 'Fugas o enfermedades', d: 'dentro de 5 días naturales.' }
  ];
  var AVISO_PLAZOS = 'Confirma el plazo y el formato vigentes con tu delegación de SEMARNAT antes de presentar.';

  var TEXTOS = {
    apoyo: 'Material de apoyo. Esta herramienta ordena los datos que tú escribes: no es un formato oficial, no decide nada legal y no sustituye al responsable técnico ni a la autoridad. Confirma siempre el formato y los plazos vigentes con tu delegación de SEMARNAT.',
    vacioInventario: 'Todavía no has registrado ejemplares. Empieza con uno: la especie, su marca (arete, microchip, anillo) y de dónde llegó o cuándo nació.',
    vacioFiltro: 'Ningún ejemplar coincide con tu búsqueda. Prueba con otra palabra o cambia el filtro.',
    vacioBitacora: 'La bitácora se llena sola: cada ingreso, nacimiento, baja, muerte, traslado o nota que registres aparece aquí.',
    vacioBitacoraFiltro: 'Ningún evento coincide con tu búsqueda. Prueba con otra palabra o quita el filtro.',
    vacioInforme: 'En este año no hay ejemplares ni movimientos. Cambia el año o registra tus ejemplares en la pestaña Inventario.',
    error: 'No pudimos cargar tu libro de registro. Revisa tu conexión e inténtalo de nuevo.',
    errorInforme: 'No pudimos armar el informe. Revisa tu conexión e inténtalo de nuevo.',
    nota: 'Tus datos se guardan en tu cuenta del Club y solo tú puedes verlos.'
  };

  /* ───────────────────────── Básicos ───────────────────────── */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"'`]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c];
    });
  }
  function ico(nombre, clase) {
    return '<svg class="zi' + (clase ? ' ' + esc(clase) : '') + '" aria-hidden="true"><use href="#zi-' + esc(nombre) + '"/></svg>';
  }
  function sinAcentos(t) {
    return String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function texto(v) { return typeof v === 'string' ? v : ''; }
  function entero(v) { var n = Number(v); return isFinite(n) && n >= 0 ? Math.floor(n) : 0; }
  function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
  function padIzq(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }

  /* ───────────────────────── Fechas ───────────────────────── */
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // 'AAAA-MM-DD' real (rechaza 2026-02-30 y cualquier otro formato), desde 1900
  function fechaValida(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-').map(Number);
    if (p[0] < 1900) return false;
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
  }
  // Sin pasar por Date local: así la fecha nunca se corre un día por la zona horaria
  function formatearFecha(s, estilo) {
    if (!fechaValida(s)) return '';
    var p = s.split('-');
    var mes = MESES[Number(p[1]) - 1];
    if (estilo === 'larga') return Number(p[2]) + ' de ' + mes + ' de ' + p[0];
    return Number(p[2]) + ' ' + mes.slice(0, 3) + ' ' + p[0];
  }
  // 'AAAA-MM-DD' del día de la computadora (solo si el servidor no mandó "hoy")
  function fechaLocalIso(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, dia = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dia < 10 ? '0' : '') + dia;
  }

  /* ───────────────────────── Etiquetas ───────────────────────── */
  function etiquetaTipo(t) { return ETIQUETAS_TIPO[t] || 'Evento'; }
  function etiquetaEstado(e) { return ETIQUETAS_ESTADO[e] || ETIQUETAS_ESTADO.activo; }
  function etiquetaSexo(s) { return ETIQUETAS_SEXO[s] || ETIQUETAS_SEXO.indeterminado; }
  function etiquetaTipoUnidad(id) {
    for (var i = 0; i < TIPOS_UNIDAD.length; i++) if (TIPOS_UNIDAD[i].id === id) return TIPOS_UNIDAD[i].label;
    return TIPOS_UNIDAD[0].label;
  }

  /* ───────────────────────── Respuestas del servidor ───────────────────────── */
  function ejemplarSeguro(e) {
    e = e && typeof e === 'object' ? e : {};
    return {
      id: texto(e.id), nombreComun: texto(e.nombreComun), nombreCientifico: texto(e.nombreCientifico), nombre: texto(e.nombre),
      marca: texto(e.marca), sexo: SEXOS.indexOf(e.sexo) >= 0 ? e.sexo : 'indeterminado', origen: texto(e.origen),
      tipoIngreso: TIPOS_INGRESO.indexOf(e.tipoIngreso) >= 0 ? e.tipoIngreso : 'alta',
      fechaIngreso: fechaValida(e.fechaIngreso) ? e.fechaIngreso : '', notas: texto(e.notas),
      estado: ESTADOS.indexOf(e.estado) >= 0 ? e.estado : 'activo',
      fechaSalida: fechaValida(e.fechaSalida) ? e.fechaSalida : '',
      creado: texto(e.creado)
    };
  }
  function eventoSeguro(e) {
    e = e && typeof e === 'object' ? e : {};
    return {
      id: texto(e.id), ejemplarId: texto(e.ejemplarId), tipo: TIPOS_EVENTO.indexOf(e.tipo) >= 0 ? e.tipo : 'nota',
      fecha: fechaValida(e.fecha) ? e.fecha : '', causa: texto(e.causa), destino: texto(e.destino), notas: texto(e.notas), creado: texto(e.creado)
    };
  }
  // GET /api/registro -> { hoy, ejemplares, eventos, resumen, limites } con la forma garantizada
  function normalizarRespuesta(r) {
    r = r && typeof r === 'object' ? r : {};
    var lim = r.limites && typeof r.limites === 'object' ? r.limites : {};
    var resumen = r.resumen && typeof r.resumen === 'object' ? r.resumen : {};
    return {
      hoy: fechaValida(r.hoy) ? r.hoy : fechaLocalIso(),
      ejemplares: (Array.isArray(r.ejemplares) ? r.ejemplares : []).map(ejemplarSeguro).filter(function (e) { return e.id; }),
      eventos: (Array.isArray(r.eventos) ? r.eventos : []).map(eventoSeguro).filter(function (e) { return e.id && e.ejemplarId; }),
      resumen: { activos: entero(resumen.activos), registrados: entero(resumen.registrados) },
      limites: { maxEjemplares: entero(lim.maxEjemplares) || MAX_EJEMPLARES, maxEventos: entero(lim.maxEventos) || MAX_EVENTOS }
    };
  }

  var CONTADORES = ['existenciasInicio', 'altas', 'nacimientos', 'bajas', 'muertes', 'traslados', 'existenciasFin'];
  function filaInforme(f) {
    f = f && typeof f === 'object' ? f : {};
    var o = { especie: texto(f.especie), nombreCientifico: texto(f.nombreCientifico) };
    CONTADORES.forEach(function (k) { o[k] = entero(f[k]); });
    return o;
  }
  // GET /api/registro/informe?anio= -> informe con la forma garantizada
  function normalizarInforme(r) {
    r = r && typeof r === 'object' ? r : {};
    return {
      anio: entero(r.anio), desde: texto(r.desde), hasta: texto(r.hasta), enCurso: r.enCurso === true,
      corte: fechaValida(r.corte) ? r.corte : '',
      porEspecie: (Array.isArray(r.porEspecie) ? r.porEspecie : []).map(filaInforme),
      total: filaInforme(Object.assign({ especie: 'TOTAL' }, r.total)),
      movimientos: (Array.isArray(r.movimientos) ? r.movimientos : []).map(function (m) {
        m = m && typeof m === 'object' ? m : {};
        return {
          fecha: fechaValida(m.fecha) ? m.fecha : '',
          tipo: ETIQUETAS_TIPO[m.tipo] ? m.tipo : 'nota',
          ejemplarId: texto(m.ejemplarId), especie: texto(m.especie), nombreCientifico: texto(m.nombreCientifico),
          marca: texto(m.marca), sexo: SEXOS.indexOf(m.sexo) >= 0 ? m.sexo : 'indeterminado',
          origen: texto(m.origen), causa: texto(m.causa), destino: texto(m.destino)
        };
      })
    };
  }
  function informeVacio(inf) {
    return !inf.porEspecie.length && !inf.movimientos.length;
  }

  /* ───────────────────────── Agrupar y filtrar ───────────────────────── */
  function claveEspecie(nombre) { return sinAcentos(nombre); }

  function nombreVisible(e) {
    return e.marca || e.nombre || 'Sin marca';
  }
  function porEjemplar(a, b) {
    var sa = a.estado === 'activo' ? 0 : 1, sb = b.estado === 'activo' ? 0 : 1;
    if (sa !== sb) return sa - sb;
    var c = nombreVisible(a).localeCompare(nombreVisible(b), 'es', { numeric: true });
    if (c) return c;
    return a.fechaIngreso < b.fechaIngreso ? -1 : a.fechaIngreso > b.fechaIngreso ? 1 : 0;
  }

  // [{ clave, especie, nombreCientifico, ejemplares, total, activos, bajas, muertes, traslados }] por nombre
  function agruparPorEspecie(ejemplares) {
    var mapa = {};
    var orden = [];
    (ejemplares || []).forEach(function (e) {
      var clave = claveEspecie(e.nombreComun) || '(sin nombre)';
      if (!mapa[clave]) {
        mapa[clave] = { clave: clave, especie: e.nombreComun || '(sin nombre)', nombreCientifico: '', ejemplares: [], total: 0, activos: 0, bajas: 0, muertes: 0, traslados: 0 };
        orden.push(clave);
      }
      var g = mapa[clave];
      if (!g.nombreCientifico && e.nombreCientifico) g.nombreCientifico = e.nombreCientifico;
      g.ejemplares.push(e);
      g.total++;
      if (e.estado === 'activo') g.activos++;
      else if (e.estado === 'baja') g.bajas++;
      else if (e.estado === 'muerte') g.muertes++;
      else if (e.estado === 'traslado') g.traslados++;
    });
    var grupos = orden.map(function (k) { return mapa[k]; });
    grupos.forEach(function (g) { g.ejemplares.sort(porEjemplar); });
    grupos.sort(function (a, b) { return a.especie.localeCompare(b.especie, 'es') || (a.clave < b.clave ? -1 : 1); });
    return grupos;
  }

  // estado: 'activo' (por omisión) | 'todos' | 'baja' | 'muerte' | 'traslado'; q: texto libre sin importar acentos
  function filtrarEjemplares(ejemplares, filtro) {
    var f = filtro || {};
    var estado = f.estado || 'activo';
    var q = sinAcentos(f.q);
    return (ejemplares || []).filter(function (e) {
      if (estado !== 'todos' && e.estado !== estado) return false;
      if (!q) return true;
      return [e.nombreComun, e.nombreCientifico, e.nombre, e.marca, e.origen, etiquetaSexo(e.sexo), etiquetaEstado(e.estado)]
        .some(function (v) { return sinAcentos(v).indexOf(q) !== -1; });
    });
  }

  // Cuántos hay de cada estado (para los números de la cabecera y del filtro)
  function contarPorEstado(ejemplares) {
    var c = { activo: 0, baja: 0, muerte: 0, traslado: 0, todos: 0 };
    (ejemplares || []).forEach(function (e) { c.todos++; if (c[e.estado] !== undefined) c[e.estado]++; });
    return c;
  }

  function especiesConocidas(ejemplares) {
    var vistas = {};
    var lista = [];
    (ejemplares || []).forEach(function (e) {
      var k = claveEspecie(e.nombreComun);
      if (k && !vistas[k]) { vistas[k] = true; lista.push({ nombreComun: e.nombreComun, nombreCientifico: e.nombreCientifico }); }
    });
    return lista.sort(function (a, b) { return a.nombreComun.localeCompare(b.nombreComun, 'es'); });
  }

  /* ───────────────────────── Bitácora ───────────────────────── */
  // Une el ingreso de cada ejemplar (alta o nacimiento) con sus eventos, del más reciente al más antiguo.
  function detalleEntrada(x) {
    var partes = [];
    if (x.tipo === 'alta' || x.tipo === 'nacimiento') {
      if (x.origen) partes.push('Origen: ' + x.origen + '.');
    } else {
      if (x.causa) partes.push((x.tipo === 'baja' ? 'Motivo: ' : x.tipo === 'traslado' ? 'Motivo: ' : 'Causa: ') + x.causa + '.');
      if (x.destino) partes.push('Destino: ' + x.destino + '.');
    }
    if (x.notas) partes.push(x.notas);
    return partes.join(' ');
  }
  function construirBitacora(ejemplares, eventos) {
    var porId = {};
    var entradas = [];
    (ejemplares || []).forEach(function (e) {
      porId[e.id] = e;
      entradas.push({
        id: 'ing-' + e.id, clase: 'ingreso', tipo: e.tipoIngreso, fecha: e.fechaIngreso, creado: e.creado, ejemplarId: e.id,
        especie: e.nombreComun, nombreCientifico: e.nombreCientifico, marca: e.marca, nombre: e.nombre,
        origen: e.origen, causa: '', destino: '', notas: '', borrable: false
      });
    });
    (eventos || []).forEach(function (v) {
      var e = porId[v.ejemplarId];
      if (!e) return;
      entradas.push({
        id: v.id, clase: 'evento', tipo: v.tipo, fecha: v.fecha, creado: v.creado, ejemplarId: e.id,
        especie: e.nombreComun, nombreCientifico: e.nombreCientifico, marca: e.marca, nombre: e.nombre,
        origen: '', causa: v.causa, destino: v.destino, notas: v.notas, borrable: true
      });
    });
    entradas.forEach(function (x) { x.detalle = detalleEntrada(x); });
    entradas.sort(function (a, b) {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
      if (a.creado !== b.creado) return a.creado < b.creado ? 1 : -1;
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    });
    return entradas;
  }
  // tipo: 'todos' | 'alta' | 'nacimiento' | 'baja' | 'muerte' | 'traslado' | 'nota'; ejemplarId; anio; q
  function filtrarBitacora(entradas, filtro) {
    var f = filtro || {};
    var q = sinAcentos(f.q);
    var tipo = f.tipo && f.tipo !== 'todos' ? f.tipo : '';
    var anio = f.anio ? String(f.anio) : '';
    return (entradas || []).filter(function (x) {
      if (tipo && x.tipo !== tipo) return false;
      if (f.ejemplarId && x.ejemplarId !== f.ejemplarId) return false;
      if (anio && String(x.fecha).slice(0, 4) !== anio) return false;
      if (!q) return true;
      return [x.especie, x.nombreCientifico, x.nombre, x.marca, x.detalle, etiquetaTipo(x.tipo)]
        .some(function (v) { return sinAcentos(v).indexOf(q) !== -1; });
    });
  }
  // Años con datos (del más reciente al más antiguo); siempre incluye el año actual
  function aniosDisponibles(ejemplares, eventos, hoy) {
    var actual = Number(String(hoy || fechaLocalIso()).slice(0, 4));
    var min = actual;
    function ver(f) { if (fechaValida(f)) { var a = Number(f.slice(0, 4)); if (a < min) min = a; } }
    (ejemplares || []).forEach(function (e) { ver(e.fechaIngreso); });
    (eventos || []).forEach(function (v) { ver(v.fecha); });
    var lista = [];
    for (var a = actual; a >= min; a--) lista.push(a);
    return lista;
  }

  /* ───────────────────────── Validar formularios ───────────────────────── */
  // Caracteres de control, invisibles y de dirección de texto (salvo el salto de línea)
  var CONTROL = new RegExp('[\\u0000-\\u0008\\u000B-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u2028-\\u202E\\u2066-\\u2069\\uFEFF]', 'g');
  function limpiar(v, saltos) {
    var t = String(v == null ? '' : v).normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROL, '');
    if (saltos) t = t.split('\n').map(function (l) { return l.replace(/[ \t]+/g, ' ').trim(); }).join('\n').replace(/\n{3,}/g, '\n\n');
    else t = t.replace(/\s+/g, ' ');
    return t.trim();
  }
  function revisarTexto(errores, valor, campo, etiqueta, opc) {
    var max = opc.max || LIMITE_TEXTO;
    var t = limpiar(valor, opc.saltos);
    if (opc.requerido && !t) { errores[campo] = etiqueta + ' es obligatorio.'; return ''; }
    if (t.length > max) { errores[campo] = etiqueta + ' no puede pasar de ' + max + ' caracteres.'; return t; }
    return t;
  }
  function revisarFecha(errores, valor, campo, etiqueta, hoy, minimo) {
    var f = String(valor == null ? '' : valor).trim();
    if (f === '') { errores[campo] = 'Elige ' + etiqueta.toLowerCase() + ' en el calendario.'; return f; }
    if (!fechaValida(f)) { errores[campo] = etiqueta + ' no es válida. Escríbela como AAAA-MM-DD (por ejemplo 2026-03-15).'; return f; }
    if (hoy && f > hoy) { errores[campo] = etiqueta + ' no puede ser futura.'; return f; }
    if (minimo && f < minimo) { errores[campo] = etiqueta + ' no puede ser anterior al ingreso del ejemplar (' + formatearFecha(minimo) + ').'; return f; }
    return f;
  }
  function hayErrores(o) { for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) return true; return false; }

  // c = { nombreComun, nombreCientifico, nombre, marca, sexo, tipoIngreso, fechaIngreso, origen, notas }
  function validarEjemplarForm(c, opc) {
    c = c || {};
    var hoy = (opc && opc.hoy) || fechaLocalIso();
    var errores = {};
    var v = {};
    v.nombreComun = revisarTexto(errores, c.nombreComun, 'nombreComun', 'La especie (nombre común)', { requerido: true });
    v.nombreCientifico = revisarTexto(errores, c.nombreCientifico, 'nombreCientifico', 'El nombre científico', {});
    v.nombre = revisarTexto(errores, c.nombre, 'nombre', 'El nombre o apodo', {});
    v.marca = revisarTexto(errores, c.marca, 'marca', 'La marca', {});
    v.origen = revisarTexto(errores, c.origen, 'origen', 'El origen', { requerido: true });
    v.notas = revisarTexto(errores, c.notas, 'notas', 'Las notas', { max: LIMITE_NOTAS, saltos: true });
    v.sexo = SEXOS.indexOf(c.sexo) >= 0 ? c.sexo : 'indeterminado';
    if (TIPOS_INGRESO.indexOf(c.tipoIngreso) < 0) { errores.tipoIngreso = 'Elige si es un ingreso o un nacimiento.'; v.tipoIngreso = ''; }
    else v.tipoIngreso = c.tipoIngreso;
    v.fechaIngreso = revisarFecha(errores, c.fechaIngreso, 'fechaIngreso', 'La fecha de ingreso', hoy);
    return { ok: !hayErrores(errores), errores: errores, valor: v };
  }

  // c = { tipo, fecha, causa, destino, notas }; opc = { hoy, ejemplar: { fechaIngreso } }
  function validarEventoForm(c, opc) {
    c = c || {};
    opc = opc || {};
    var hoy = opc.hoy || fechaLocalIso();
    var errores = {};
    var v = { tipo: c.tipo, fecha: '', causa: '', destino: '', notas: '' };
    if (TIPOS_EVENTO.indexOf(c.tipo) < 0) { errores.tipo = 'Elige el tipo de evento.'; return { ok: false, errores: errores, valor: v }; }
    v.fecha = revisarFecha(errores, c.fecha, 'fecha', 'La fecha', hoy, opc.ejemplar && opc.ejemplar.fechaIngreso);
    var causa = revisarTexto(errores, c.causa, 'causa', c.tipo === 'baja' ? 'El motivo de la baja' : 'La causa o motivo', { requerido: c.tipo === 'baja' });
    var destino = revisarTexto(errores, c.destino, 'destino', 'El destino', { requerido: c.tipo === 'traslado' });
    v.notas = revisarTexto(errores, c.notas, 'notas', 'Las notas', { max: LIMITE_NOTAS, saltos: true, requerido: c.tipo === 'nota' });
    // Cada tipo manda solo lo suyo (igual que el servidor)
    if (c.tipo === 'baja') { v.causa = causa; v.destino = destino; }
    if (c.tipo === 'muerte') { v.causa = causa; }
    if (c.tipo === 'traslado') { v.destino = destino; v.causa = causa; }
    return { ok: !hayErrores(errores), errores: errores, valor: v };
  }

  // Qué campos del formulario de evento se muestran según el tipo
  function camposEvento(tipo) {
    if (tipo === 'baja') return { causa: true, destino: true, causaObligatoria: true, destinoObligatorio: false };
    if (tipo === 'muerte') return { causa: true, destino: false, causaObligatoria: false, destinoObligatorio: false };
    if (tipo === 'traslado') return { causa: true, destino: true, causaObligatoria: false, destinoObligatorio: true };
    return { causa: false, destino: false, causaObligatoria: false, destinoObligatorio: false };
  }

  /* ───────────────────────── Datos de la unidad (se escriben en el navegador) ───────────────────────── */
  var CAMPOS_UNIDAD = [
    { id: 'nombre', etiqueta: 'Nombre o razón social', requerido: true },
    { id: 'registro', etiqueta: 'Registro SEMARNAT', requerido: true },
    { id: 'ubicacion', etiqueta: 'Ubicación', requerido: true },
    { id: 'responsable', etiqueta: 'Responsable técnico', requerido: true },
    { id: 'cedula', etiqueta: 'Cédula profesional', requerido: true }
  ];
  function unidadLimpia(u) {
    u = u && typeof u === 'object' ? u : {};
    var o = { tipo: '', observaciones: '' };
    CAMPOS_UNIDAD.forEach(function (c) { o[c.id] = limpiar(u[c.id]).slice(0, LIMITE_TEXTO); });
    var tipo = limpiar(u.tipo);
    o.tipo = TIPOS_UNIDAD.some(function (t) { return t.id === tipo; }) ? tipo : '';
    o.observaciones = limpiar(u.observaciones, true).slice(0, LIMITE_NOTAS);
    return o;
  }

  /* ───────────────────────── Recordatorio de abril a junio ───────────────────────── */
  function recordatorioInforme(hoy) {
    var mes = Number(String(hoy || fechaLocalIso()).slice(5, 7));
    var enPeriodo = mes >= 4 && mes <= 6;
    return {
      enPeriodo: enPeriodo,
      texto: enPeriodo
        ? 'Estás en abril a junio, el periodo de referencia para presentar el informe anual. Revisa tus datos y confirma el formato y el medio con tu delegación de SEMARNAT.'
        : 'El informe anual de actividades de las UMA se presenta de abril a junio. Mantén tu libro al día para tener los datos listos cuando llegue el periodo.',
      aparte: 'Las contingencias (3 días hábiles) y las fugas o enfermedades (5 días naturales) tienen plazos propios: esta herramienta no los calcula ni los avisa.'
    };
  }

  /* ───────────────────────── Borrador del informe anual ───────────────────────── */
  var LINEA = '════════════════════════════════════════════════════════';
  var SUBLINEA = '────────────────────────────────────────────────────────';
  var COLS = [
    ['existenciasInicio', 'Ene 1'], ['altas', 'Altas'], ['nacimientos', 'Nac.'], ['bajas', 'Bajas'],
    ['muertes', 'Muer.'], ['traslados', 'Tras.'], ['existenciasFin', 'Dic 31']
  ];
  var ANCHO_NOMBRE = 24;

  function filaTexto(nombre, fila) {
    var nums = COLS.map(function (c) { return padIzq(fila[c[0]], 6); }).join(' ');
    return pad(nombre, ANCHO_NOMBRE) + ' ' + nums;
  }
  function tablaTexto(informe) {
    var cab = pad('Especie', ANCHO_NOMBRE) + ' ' + COLS.map(function (c) { return padIzq(c[1], 6); }).join(' ');
    var lineas = [cab, SUBLINEA];
    informe.porEspecie.forEach(function (f) {
      var nombre = f.especie || '(sin nombre)';
      if (nombre.length > ANCHO_NOMBRE) {
        lineas.push(nombre);
        lineas.push(filaTexto('', f));
      } else {
        lineas.push(filaTexto(nombre, f));
      }
      if (f.nombreCientifico) lineas.push('  (' + f.nombreCientifico + ')');
    });
    lineas.push(SUBLINEA);
    lineas.push(filaTexto('TOTAL', informe.total));
    return lineas.join('\n');
  }
  function movimientoTexto(m) {
    var partes = [formatearFecha(m.fecha) || m.fecha, etiquetaTipo(m.tipo).toUpperCase(), m.especie || '(sin nombre)'];
    var linea = '• ' + partes.join(' · ');
    var extra = [];
    if (m.nombreCientifico) extra.push(m.nombreCientifico);
    if (m.marca) extra.push('marca ' + m.marca);
    if (m.origen) extra.push('origen: ' + m.origen);
    if (m.causa) extra.push((m.tipo === 'muerte' ? 'causa: ' : 'motivo: ') + m.causa);
    if (m.destino) extra.push('destino: ' + m.destino);
    return extra.length ? linea + '\n    ' + extra.join(' · ') : linea;
  }

  // Devuelve { texto, faltantes } (faltantes = datos de la unidad que quedaron como [PENDIENTE]).
  function construirBorrador(informe, unidad, opc) {
    var inf = informe;
    var u = unidadLimpia(unidad);
    var hoy = (opc && opc.hoy) || fechaLocalIso();
    var faltantes = [];
    function dato(c) {
      if (u[c.id]) return u[c.id];
      faltantes.push(c.etiqueta);
      return '[PENDIENTE: ' + c.etiqueta + ']';
    }
    var datos = {};
    CAMPOS_UNIDAD.forEach(function (c) { datos[c.id] = dato(c); });

    var L = [];
    L.push(LINEA);
    L.push('BORRADOR · no es el formato oficial');
    L.push('INFORME ANUAL DE ACTIVIDADES · INVENTARIO DE EJEMPLARES');
    L.push(LINEA);
    L.push('Documento de apoyo: ordena los datos de tu libro de registro.');
    L.push('No es el formato oficial de SEMARNAT y no decide nada legal.');
    L.push('');
    L.push('AÑO QUE SE REPORTA:   ' + inf.anio);
    L.push('FECHA DE ELABORACIÓN: ' + (formatearFecha(hoy, 'larga') || hoy));
    if (inf.enCurso) {
      L.push('');
      L.push('Nota: el año ' + inf.anio + ' todavía no termina. Las existencias "al 31 de diciembre"');
      L.push('son las de la fecha de corte (' + (formatearFecha(inf.corte, 'larga') || inf.corte) + ').');
    }
    L.push('');
    L.push('─── I. DATOS DE LA UNIDAD ───');
    L.push('Nombre o razón social:  ' + datos.nombre);
    L.push('Tipo:                   ' + etiquetaTipoUnidad(u.tipo));
    L.push('Registro SEMARNAT:      ' + datos.registro);
    L.push('Ubicación:              ' + datos.ubicacion);
    L.push('Responsable técnico:    ' + datos.responsable);
    L.push('Cédula profesional:     ' + datos.cedula);
    L.push('');
    L.push('─── II. INVENTARIO POR ESPECIE (ejemplares) ───');
    if (informeVacio(inf)) {
      L.push('Sin ejemplares ni movimientos registrados en este año.');
    } else {
      L.push(tablaTexto(inf));
      L.push('');
      L.push('Ene 1 = existencias al 1 de enero · Dic 31 = existencias al 31 de diciembre.');
      L.push('Control: Ene 1 + Altas + Nacimientos - Bajas - Muertes - Traslados = Dic 31.');
    }
    L.push('');
    L.push('─── III. MOVIMIENTOS DE INVENTARIO DEL AÑO ───');
    L.push('Ingresos, nacimientos, bajas, muertes y traslados que registraste.');
    if (!inf.movimientos.length) {
      L.push('Sin movimientos en este año.');
    } else {
      inf.movimientos.forEach(function (m) { L.push(movimientoTexto(m)); });
    }
    L.push('');
    L.push('─── IV. OBSERVACIONES ───');
    L.push(u.observaciones || 'Sin observaciones adicionales.');
    L.push('');
    L.push(LINEA);
    L.push('DECLARACIÓN');
    L.push('Bajo protesta de decir verdad, manifiesto que los datos de este');
    L.push('documento son verdaderos.');
    L.push('');
    L.push('_______________________________________________________');
    L.push(datos.responsable);
    L.push('Responsable técnico · Cédula profesional: ' + datos.cedula);
    L.push('');
    L.push('PLAZOS DE REFERENCIA (' + FUENTE_PLAZOS + ')');
    PLAZOS_REFERENCIA.forEach(function (p) { L.push('• ' + p.t + ': ' + p.d); });
    L.push(AVISO_PLAZOS);
    L.push(LINEA);
    return { texto: L.join('\n'), faltantes: faltantes };
  }

  /* ───────────────────────── CSV ───────────────────────── */
  // Excel y Calc ejecutan una celda que empieza con = + - @ (inyección de fórmulas): se les antepone una comilla.
  function celdaCsv(v) {
    var s = String(v == null ? '' : v);
    if (/^[\s\u0000-\u001f]*[=+\-@]/.test(s)) s = "'" + s;
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function filaCsv(celdas) { return celdas.map(celdaCsv).join(','); }
  // BOM al inicio para que Excel lea bien los acentos; saltos de línea CRLF
  function armarCsv(filas) { return String.fromCharCode(0xFEFF) + filas.map(filaCsv).join('\r\n') + '\r\n'; }

  function csvResumen(informe) {
    var filas = [['Año', 'Especie', 'Nombre científico', 'Existencias al 1 de enero', 'Altas', 'Nacimientos', 'Bajas', 'Muertes', 'Traslados', 'Existencias al 31 de diciembre']];
    function f(esp, cient, fila) { return [informe.anio, esp, cient].concat(CONTADORES.map(function (k) { return fila[k]; })); }
    informe.porEspecie.forEach(function (e) { filas.push(f(e.especie, e.nombreCientifico, e)); });
    filas.push(f('TOTAL', '', informe.total));
    return armarCsv(filas);
  }
  function csvMovimientos(informe) {
    var filas = [['Fecha', 'Movimiento', 'Especie', 'Nombre científico', 'Marca', 'Sexo', 'Origen', 'Causa o motivo', 'Destino']];
    informe.movimientos.forEach(function (m) {
      filas.push([m.fecha, etiquetaTipo(m.tipo), m.especie, m.nombreCientifico, m.marca, etiquetaSexo(m.sexo), m.origen, m.causa, m.destino]);
    });
    return armarCsv(filas);
  }
  function csvInventario(ejemplares) {
    var filas = [['Especie', 'Nombre científico', 'Nombre o apodo', 'Marca', 'Sexo', 'Estado', 'Tipo de ingreso', 'Fecha de ingreso', 'Origen', 'Fecha de salida', 'Notas']];
    agruparPorEspecie(ejemplares).forEach(function (g) {
      g.ejemplares.forEach(function (e) {
        filas.push([e.nombreComun, e.nombreCientifico, e.nombre, e.marca, etiquetaSexo(e.sexo), etiquetaEstado(e.estado),
          etiquetaTipo(e.tipoIngreso), e.fechaIngreso, e.origen, e.fechaSalida, e.notas]);
      });
    });
    return armarCsv(filas);
  }
  function nombreArchivo(que, anio, extension) {
    var base = 'zoorigen-libro-registro-' + que + (anio ? '-' + anio : '');
    return base + '.' + extension;
  }

  /* ───────────────────────── HTML (todo pasa por esc) ───────────────────────── */
  function chipEstado(estado) {
    var e = ESTADOS.indexOf(estado) >= 0 ? estado : 'activo';
    return '<span class="reg-chip reg-chip--' + e + '">' + esc(etiquetaEstado(e)) + '</span>';
  }
  function chipTipo(tipo) {
    return '<span class="reg-chip reg-chip--' + esc(tipo) + '">' + ico(ICONOS_TIPO[tipo] || 'pencil') + ' ' + esc(etiquetaTipo(tipo)) + '</span>';
  }

  function cuentaGrupo(g) {
    var p = [plural(g.activos, 'activo', 'activos')];
    if (g.bajas) p.push(plural(g.bajas, 'baja', 'bajas'));
    if (g.muertes) p.push(plural(g.muertes, 'muerte', 'muertes'));
    if (g.traslados) p.push(plural(g.traslados, 'traslado', 'traslados'));
    return p.join(' · ');
  }

  // Inventario agrupado por especie. Tabla en pantallas grandes; en el celular cada fila se vuelve tarjeta (CSS).
  function htmlInventario(ejemplares) {
    return agruparPorEspecie(ejemplares).map(function (g) {
      var filas = g.ejemplares.map(function (e) {
        var principal = e.marca || e.nombre || 'Sin marca';
        var secundario = e.marca && e.nombre ? e.nombre : '';
        var salida = e.estado !== 'activo' && e.fechaSalida ? '<small>' + esc(formatearFecha(e.fechaSalida)) + '</small>' : '';
        var id = esc(e.id);
        return '<tr data-id="' + id + '">' +
          '<td data-label="Ejemplar"><strong>' + esc(principal) + '</strong>' + (secundario ? '<small>' + esc(secundario) + '</small>' : '') + '</td>' +
          '<td data-label="Sexo">' + esc(etiquetaSexo(e.sexo)) + '</td>' +
          '<td data-label="Origen">' + esc(e.origen || '—') + '</td>' +
          '<td data-label="Ingreso">' + esc(formatearFecha(e.fechaIngreso) || '—') + '<small>' + esc(etiquetaTipo(e.tipoIngreso)) + '</small></td>' +
          '<td data-label="Estado">' + chipEstado(e.estado) + salida + '</td>' +
          '<td class="reg-acciones">' +
            '<button type="button" class="reg-btn" data-accion="ficha" data-id="' + id + '">' + ico('eye') + ' Ver ficha</button>' +
            (e.estado === 'activo' ? '<button type="button" class="reg-btn" data-accion="evento" data-id="' + id + '">' + ico('plus') + ' Evento</button>' : '') +
          '</td></tr>';
      }).join('');
      return '<section class="reg-grupo" data-clave="' + esc(g.clave) + '">' +
        '<header class="reg-grupo__cab"><h3>' + esc(g.especie) + '</h3>' +
        (g.nombreCientifico ? '<em>' + esc(g.nombreCientifico) + '</em>' : '') +
        '<span class="reg-grupo__cuenta">' + esc(cuentaGrupo(g)) + '</span></header>' +
        '<div class="reg-tabla-caja"><div class="tool-table-wrap reg-tabla-wrap"><table class="tool-table reg-tabla reg-tabla--inv">' +
        '<thead><tr><th>Ejemplar</th><th>Sexo</th><th>Origen</th><th>Ingreso</th><th>Estado</th><th><span class="reg-solo-lector">Acciones</span></th></tr></thead>' +
        '<tbody>' + filas + '</tbody></table></div></div></section>';
    }).join('');
  }

  function htmlBitacora(entradas) {
    return '<ol class="reg-bitacora">' + (entradas || []).map(function (x) {
      var nombre = x.marca || x.nombre || '';
      var quien = esc(x.especie || '(sin nombre)') + (nombre ? ' <span class="reg-bitacora__marca">· ' + esc(nombre) + '</span>' : '');
      var id = esc(x.ejemplarId);
      return '<li class="reg-evento reg-evento--' + esc(x.tipo) + '">' +
        '<div class="reg-evento__fecha">' + esc(formatearFecha(x.fecha) || '—') + '</div>' +
        '<div class="reg-evento__cuerpo">' +
          '<div class="reg-evento__titulo">' + chipTipo(x.tipo) + ' <strong>' + quien + '</strong></div>' +
          (x.detalle ? '<p class="reg-evento__detalle">' + esc(x.detalle) + '</p>' : '') +
        '</div>' +
        '<div class="reg-evento__acciones">' +
          '<button type="button" class="reg-btn" data-accion="ficha" data-id="' + id + '">' + ico('eye') + ' Ficha</button>' +
          (x.borrable ? '<button type="button" class="reg-btn reg-btn--peligro" data-accion="borrar-evento" data-id="' + esc(x.id) + '">' + ico('trash-2') + ' Deshacer</button>' : '') +
        '</div></li>';
    }).join('') + '</ol>';
  }

  function htmlResumenInforme(informe) {
    var cab = '<tr><th>Especie</th>' + COLS.map(function (c) {
      var titulo = { existenciasInicio: 'Existencias al 1 de enero', existenciasFin: 'Existencias al 31 de diciembre' }[c[0]] || c[1];
      var corto = { altas: 'Altas', nacimientos: 'Nacimientos', bajas: 'Bajas', muertes: 'Muertes', traslados: 'Traslados', existenciasInicio: '1 de enero', existenciasFin: '31 de dic.' }[c[0]];
      return '<th class="reg-num" title="' + esc(titulo) + '">' + esc(corto) + '</th>';
    }).join('') + '</tr>';
    function fila(nombre, cient, f, total) {
      return '<tr' + (total ? ' class="reg-total"' : '') + '><td data-label="Especie"><strong>' + esc(nombre) + '</strong>' + (cient ? '<small>' + esc(cient) + '</small>' : '') + '</td>' +
        COLS.map(function (c) {
          var nombreCol = { existenciasInicio: 'Al 1 de enero', altas: 'Altas', nacimientos: 'Nacimientos', bajas: 'Bajas', muertes: 'Muertes', traslados: 'Traslados', existenciasFin: 'Al 31 de dic.' }[c[0]];
          return '<td class="reg-num" data-label="' + esc(nombreCol) + '">' + esc(f[c[0]]) + '</td>';
        }).join('') + '</tr>';
    }
    var filas = informe.porEspecie.map(function (f) { return fila(f.especie || '(sin nombre)', f.nombreCientifico, f, false); }).join('');
    return '<div class="reg-tabla-caja"><div class="tool-table-wrap reg-tabla-wrap"><table class="tool-table reg-tabla reg-tabla--informe"><thead>' + cab + '</thead><tbody>' +
      filas + fila('TOTAL', '', informe.total, true) + '</tbody></table></div></div>';
  }

  function htmlMovimientos(informe) {
    if (!informe.movimientos.length) return '';
    return '<div class="reg-tabla-caja"><div class="tool-table-wrap reg-tabla-wrap"><table class="tool-table reg-tabla reg-tabla--mov">' +
      '<thead><tr><th>Fecha</th><th>Movimiento</th><th>Especie</th><th>Marca</th><th>Detalle</th></tr></thead><tbody>' +
      informe.movimientos.map(function (m) {
        var detalle = [m.origen ? 'Origen: ' + m.origen : '', m.causa ? (m.tipo === 'muerte' ? 'Causa: ' : 'Motivo: ') + m.causa : '', m.destino ? 'Destino: ' + m.destino : ''].filter(Boolean).join(' · ');
        return '<tr><td data-label="Fecha">' + esc(formatearFecha(m.fecha) || '—') + '</td>' +
          '<td data-label="Movimiento">' + chipTipo(m.tipo) + '</td>' +
          '<td data-label="Especie">' + esc(m.especie || '(sin nombre)') + '</td>' +
          '<td data-label="Marca">' + esc(m.marca || '—') + '</td>' +
          '<td data-label="Detalle">' + esc(detalle || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function htmlError(mensaje) {
    return '<div class="reg-vacio reg-vacio--error" role="alert">' + ico('triangle-alert') +
      '<p>' + esc(mensaje || TEXTOS.error) + '</p>' +
      '<button type="button" class="tool-btn-calc" data-reintentar>' + ico('refresh-cw') + ' Reintentar</button></div>';
  }
  function htmlVacio(mensaje, boton) {
    return '<div class="reg-vacio">' + ico('folder') + '<p>' + esc(mensaje) + '</p>' +
      (boton ? '<button type="button" class="tool-btn-calc" data-accion="' + esc(boton.accion) + '">' + ico('plus') + ' ' + esc(boton.texto) + '</button>' : '') + '</div>';
  }

  return {
    LIMITE_TEXTO: LIMITE_TEXTO, LIMITE_NOTAS: LIMITE_NOTAS, MAX_EJEMPLARES: MAX_EJEMPLARES, MAX_EVENTOS: MAX_EVENTOS,
    TIPOS_EVENTO: TIPOS_EVENTO, TIPOS_INGRESO: TIPOS_INGRESO, SEXOS: SEXOS, ESTADOS: ESTADOS,
    ETIQUETAS_TIPO: ETIQUETAS_TIPO, ETIQUETAS_ESTADO: ETIQUETAS_ESTADO, ETIQUETAS_SEXO: ETIQUETAS_SEXO, ICONOS_TIPO: ICONOS_TIPO,
    TIPOS_UNIDAD: TIPOS_UNIDAD, CAMPOS_UNIDAD: CAMPOS_UNIDAD, PLAZOS_REFERENCIA: PLAZOS_REFERENCIA, FUENTE_PLAZOS: FUENTE_PLAZOS,
    AVISO_PLAZOS: AVISO_PLAZOS, TEXTOS: TEXTOS,
    esc: esc, ico: ico, sinAcentos: sinAcentos,
    fechaValida: fechaValida, formatearFecha: formatearFecha, fechaLocalIso: fechaLocalIso,
    etiquetaTipo: etiquetaTipo, etiquetaEstado: etiquetaEstado, etiquetaSexo: etiquetaSexo, etiquetaTipoUnidad: etiquetaTipoUnidad,
    normalizarRespuesta: normalizarRespuesta, normalizarInforme: normalizarInforme, informeVacio: informeVacio,
    claveEspecie: claveEspecie, agruparPorEspecie: agruparPorEspecie, filtrarEjemplares: filtrarEjemplares,
    contarPorEstado: contarPorEstado, especiesConocidas: especiesConocidas,
    construirBitacora: construirBitacora, filtrarBitacora: filtrarBitacora, aniosDisponibles: aniosDisponibles,
    validarEjemplarForm: validarEjemplarForm, validarEventoForm: validarEventoForm, camposEvento: camposEvento,
    unidadLimpia: unidadLimpia, recordatorioInforme: recordatorioInforme,
    construirBorrador: construirBorrador,
    csvResumen: csvResumen, csvMovimientos: csvMovimientos, csvInventario: csvInventario, celdaCsv: celdaCsv, nombreArchivo: nombreArchivo,
    htmlInventario: htmlInventario, htmlBitacora: htmlBitacora, htmlResumenInforme: htmlResumenInforme, htmlMovimientos: htmlMovimientos,
    htmlError: htmlError, htmlVacio: htmlVacio, chipEstado: chipEstado, chipTipo: chipTipo
  };
});
