/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · MÉTRICAS DE VISITAS                  */
/* Cuánta gente visita Zoorigen, desde dónde llega y de qué red   */
/* social salen los miembros. Conteo anónimo y sin cookies.       */
/*   GET /api/admin/visitas/metricas?dias=N   agregados por día   */
/*   GET /api/admin/visitas/registro?periodo= visitas una por una */
/* El servidor guarda día a día; aquí se calculan los periodos    */
/* (semana, 30 días, 90 días, 12 meses, todo), la comparación con */
/* el periodo anterior, el mapa de calor y el CSV. Las gráficas   */
/* son SVG/HTML propios (admin-graficas.js), de colores sólidos.  */
/* Los constructores son puros y se prueban en                    */
/* tests/admin-visitas.test.js.                                   */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'), require('./admin-iconos.js'), null, require('./admin-graficas.js'));
  else root.ZOO_ADMIN_VISITAS = factory(root.ZOO_ADMIN_PANEL, root.ZOO_ICONOS, root.ZOO_ADMIN_VISTAS, root.ZOO_ADMIN_GRAFICAS);
})(typeof self !== 'undefined' ? self : this, function (P, I, V, G) {
  'use strict';

  var esc = P.esc;
  var num = P.fmtNum;
  var ico = function (n, o) { return I && I.svg ? I.svg(n, o) : ''; };

  var DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var DIAS_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var RANGOS = [['semana', 'Semana'], ['30', '30 días'], ['90', '90 días'], ['365', '12 meses'], ['todo', 'Todo']];
  var FILTROS_LOG = [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['7', '7 días'], ['30', '30 días']];
  var MAX_SEMANAS_ATRAS = 51;

  var NOMBRE_PAGINA = { landing: 'Página principal', acceso: 'Inicio de sesión', panel: 'Panel de miembros', legal: 'Avisos legales' };
  var NOMBRE_FUENTE = {
    directo: 'Directo', interno: 'Dentro del sitio', google: 'Google', bing: 'Bing', duckduckgo: 'DuckDuckGo', yahoo: 'Yahoo', facebook: 'Facebook', instagram: 'Instagram',
    meta: 'Meta sin identificar', whatsapp: 'WhatsApp', linkedin: 'LinkedIn', x: 'X (Twitter)', youtube: 'YouTube', tiktok: 'TikTok', correo: 'Correo electrónico', otros: 'Otros sitios'
  };
  // Cada origen tiene su color sólido (--zg-9 … --zg-24 en admin-club.css; el mismo orden que aquí). Los tres primeros colores son los de la marca.
  var FUENTES = Object.keys(NOMBRE_FUENTE);
  var COLOR_FUENTE = {};
  FUENTES.forEach(function (k, i) { COLOR_FUENTE[k] = 9 + i; });
  var HEX_FUENTE = {   // solo para la letra del banner (mismos tonos que las clases zg-c9…zg-c24 en modo claro)
    directo: '#8794A8', interno: '#B6C0CE', google: '#4285F4', bing: '#00809D', duckduckgo: '#DE5833', yahoo: '#8D6E63', facebook: '#1877F2', instagram: '#E1306C',
    meta: '#7FA3C7', whatsapp: '#25A55A', linkedin: '#0A66C2', x: '#64748B', youtube: '#E02020', tiktok: '#14B8A6', correo: '#E08A00', otros: '#9B958E'
  };
  var REDES = ['facebook', 'instagram', 'meta', 'whatsapp', 'tiktok', 'youtube', 'linkedin', 'x'];
  var NOMBRE_DISP = { movil: 'Teléfono', tablet: 'Tableta', computadora: 'Computadora' };
  var COLOR_DISP = { movil: 1, tablet: 3, computadora: 2 };
  var COLOR_KPI = [1, 2, 3, 25];   // verde, azul, ámbar y morado

  /* ───────────────────────── Fechas (claves AAAA-MM-DD en hora de México) ───────────────────────── */

  function aUtc(clave) { var p = String(clave).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function sumarDias(clave, n) { return new Date(aUtc(clave) + n * 86400000).toISOString().slice(0, 10); }
  function dow(clave) { return (new Date(aUtc(clave)).getUTCDay() + 6) % 7; }   // lunes = 0
  function lunesDe(clave) { return sumarDias(clave, -dow(clave)); }
  function listaEntre(desde, hasta) { var o = []; for (var c = desde; c <= hasta; c = sumarDias(c, 1)) o.push(c); return o; }
  function diaCorto(clave) { var p = clave.split('-'); return +p[2] + ' ' + MESES[+p[1] - 1]; }
  function mesCorto(clave) { var p = clave.split('-'); return MESES[+p[1] - 1] + ' ' + p[0].slice(2); }
  // «3:24 p. m. · 29 oct» en hora de México
  function horaDia(iso) {
    var d = P.aFecha ? P.aFecha(iso) : new Date(iso);
    if (!d || isNaN(d.getTime())) return '—';
    try {
      var h = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', hour: 'numeric', minute: '2-digit', hour12: true }).format(d).replace(/[\u202f\u00a0]/g, ' ').replace(/\s*([ap])\.?\s?m\.?/i, function (m, x) { return ' ' + x.toLowerCase() + '. m.'; });
      var f = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short' }).format(d).replace('.', '');
      return h + ' · ' + f;
    } catch (e) { return P.fmtFechaHora(iso); }
  }
  function hora12(h) { return (h % 12 || 12) + (h < 12 ? ' a. m.' : ' p. m.'); }

  var VACIO = { dia: '', total: 0, unicos: 0, miembros: 0, dispositivos: {}, paises: {}, paginas: {}, fuentes: {}, horas: {} };
  var suma = function (a, f) { return a.reduce(function (t, x) { return t + (Number(f(x)) || 0); }, 0); };

  /* ───────────────────────── Periodos ───────────────────────── */

  // ui = { rango, semana }. Devuelve { claves, prev, titulo, subtitulo, agrupar, etiquetaSemana }
  function rangoActual(datos, ui) {
    var hoy = datos.hoy;
    var rango = ui && ui.rango || 'semana';
    var semana = Math.max(0, Math.min(MAX_SEMANAS_ATRAS, (ui && ui.semana) || 0));
    var inicioDatos = datos.dias.length ? datos.dias[0].dia : hoy;
    if (rango === 'semana') {
      var lunes = sumarDias(lunesDe(hoy), -7 * semana);
      var domingo = sumarDias(lunes, 6);
      var fin = semana === 0 && domingo > hoy ? hoy : domingo;
      var claves = listaEntre(lunes, fin);
      return {
        rango: rango, claves: claves, prev: claves.map(function (c) { return sumarDias(c, -7); }), agrupar: 'semana', semana: semana,
        titulo: diaCorto(lunes) + ' – ' + diaCorto(domingo), subtitulo: semana === 0 ? 'ESTA SEMANA' : semana === 1 ? 'HACE 1 SEMANA' : 'HACE ' + semana + ' SEMANAS',
        semanaCompleta: listaEntre(lunes, domingo)
      };
    }
    if (rango === 'todo') {
      var primero = null;
      for (var i = 0; i < datos.dias.length; i++) if (datos.dias[i].total > 0) { primero = datos.dias[i].dia; break; }
      var desdeT = primero || sumarDias(hoy, -29);
      return { rango: rango, claves: listaEntre(desdeT, hoy), prev: [], agrupar: 'mes', titulo: 'Todo el historial', subtitulo: '' };
    }
    var n = rango === '30' ? 30 : rango === '90' ? 90 : 365;
    var cl = listaEntre(sumarDias(hoy, -(n - 1)), hoy);
    void inicioDatos;
    return {
      rango: rango, claves: cl, prev: cl.map(function (c) { return sumarDias(c, -n); }), agrupar: n === 365 ? 'mes' : 'dia',
      titulo: n === 365 ? 'Últimos 12 meses' : 'Últimos ' + n + ' días', subtitulo: ''
    };
  }

  // Lo que se muestra: «▲ +12% vs periodo anterior», «▼ 65% …», «= igual que antes», «▲ nuevo»
  function delta(ahora, antes, hayPrev) {
    if (!hayPrev) return { clase: '', texto: '' };
    if (!antes && !ahora) return { clase: 'eq', texto: 'sin cambio' };
    if (!antes) return { clase: 'up', texto: 'nuevo' };
    var pct = Math.round((ahora - antes) / antes * 100);
    if (pct === 0) return { clase: 'eq', texto: 'igual que antes' };
    return { clase: pct > 0 ? 'up' : 'down', texto: (pct > 0 ? '+' : '') + pct + '% vs periodo anterior' };
  }

  function diaDeCuenta(creada, zona) {
    if (!creada) return '';
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: zona || 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(creada)); } catch (e) { return ''; }
  }

  /* ───────────────────────── Modelo: todo lo que se dibuja, calculado ───────────────────────── */

  function construir(datos, ui) {
    var mapa = {};
    datos.dias.forEach(function (d) { mapa[d.dia] = d; });
    var dato = function (c) { return mapa[c] || VACIO; };
    var r = rangoActual(datos, ui);
    var claves = r.claves, prev = r.prev;
    var dp = prev.map(dato), da = claves.map(dato);
    var hayPrev = prev.length > 0 && (suma(dp, function (d) { return d.total; }) + suma(dp, function (d) { return d.unicos; })) > 0;

    var cuentas = (datos.origenes || []).map(function (o) { return { uid: o.uid, origen: o.origen, vip: o.vip === true, dia: diaDeCuenta(o.creada, datos.zona) }; }).filter(function (o) { return o.dia; });
    var nuevas = cuentas.filter(function (o) { return claves.indexOf(o.dia) !== -1; });
    // «Cuentas nuevas» cuenta a TODAS las personas que se registraron (el servidor las suma por día en «altas»); la lista con origen solo sirve para saber por dónde llegaron.
    var altas = datos.altas || null;
    var altasDe = function (lista) { return altas ? suma(lista, function (c) { return (altas[c] || { n: 0 }).n; }) : cuentas.filter(function (o) { return lista.indexOf(o.dia) !== -1; }).length; };
    var altasVipDe = function (lista) { return altas ? suma(lista, function (c) { return (altas[c] || { vip: 0 }).vip; }) : cuentas.filter(function (o) { return o.vip && lista.indexOf(o.dia) !== -1; }).length; };
    var nuevasN = altasDe(claves), nuevasVipN = altasVipDe(claves), nuevasPrevN = altasDe(prev);

    var total = suma(da, function (d) { return d.total; });
    var unicos = suma(da, function (d) { return d.unicos; });
    var totalPrev = suma(dp, function (d) { return d.total; });
    var unicosPrev = suma(dp, function (d) { return d.unicos; });

    // Mapa día × hora (hora de México: el servidor ya guarda la hora local) y promedio por día de la semana
    var calor = DIAS.map(function () { return Array.apply(null, Array(24)).map(function () { return 0; }); });
    var porSemSuma = [0, 0, 0, 0, 0, 0, 0], porSemDias = [0, 0, 0, 0, 0, 0, 0];
    claves.forEach(function (c) {
      var w = dow(c), d = dato(c);
      porSemSuma[w] += d.total; porSemDias[w] += 1;
      for (var h = 0; h < 24; h++) calor[w][h] += Number(d.horas[('0' + h).slice(-2)]) || 0;
    });
    var porHora = Array.apply(null, Array(24)).map(function (_, h) { return calor.reduce(function (t, f) { return t + f[h]; }, 0); });
    var maxHora = Math.max.apply(null, porHora);
    var horaPico = maxHora > 0 ? porHora.indexOf(maxHora) : -1;
    var porSemana = porSemSuma.map(function (s, i) { return porSemDias[i] ? Math.round(s / porSemDias[i] * 10) / 10 : 0; });
    var mejorDia = Math.max.apply(null, porSemana) > 0 ? porSemana.indexOf(Math.max.apply(null, porSemana)) : -1;

    var sumaClave = function (campo, k) { return suma(da, function (d) { return (d[campo] || {})[k]; }); };
    var fuentes = FUENTES.map(function (k) { return { k: k, n: sumaClave('fuentes', k) }; }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; });
    var dispositivos = Object.keys(NOMBRE_DISP).map(function (k) { return { k: k, n: sumaClave('dispositivos', k) }; });
    var paginas = Object.keys(NOMBRE_PAGINA).map(function (k) { return { k: k, n: sumaClave('paginas', k) }; }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; });
    var paisesMapa = {};
    da.forEach(function (d) { Object.keys(d.paises || {}).forEach(function (k) { paisesMapa[k] = (paisesMapa[k] || 0) + (Number(d.paises[k]) || 0); }); });
    var paises = Object.keys(paisesMapa).map(function (k) { return { k: k, n: paisesMapa[k] }; }).sort(function (a, b) { return b.n - a.n; });

    // Redes sociales: cuántas personas llegaron de cada una (todas) y a lo largo del tiempo (las 5 más fuertes)
    var sociales = REDES.map(function (k) { return { k: k, n: sumaClave('fuentes', k) }; }).filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return (a.k === 'meta') - (b.k === 'meta') || b.n - a.n; });
    var identificadas = sociales.filter(function (x) { return x.k !== 'meta'; });
    var totalSocial = suma(sociales, function (x) { return x.n; });
    var grupos = agrupar(claves, r.agrupar === 'mes' ? 'mes' : 'dia');
    var serieRedes = sociales.slice(0, 5).map(function (x) {
      return { k: x.k, valores: grupos.map(function (g) { return suma(g.claves, function (c) { return (dato(c).fuentes || {})[x.k]; }); }) };
    });

    // De dónde vienen los miembros (cuentas creadas en el periodo, por origen)
    var porOrigen = {};
    nuevas.forEach(function (o) { var k = o.origen || 'directo'; porOrigen[k] = porOrigen[k] || { k: k, n: 0, vip: 0 }; porOrigen[k].n += 1; if (o.vip) porOrigen[k].vip += 1; });
    var atribucion = Object.keys(porOrigen).map(function (k) { return porOrigen[k]; }).sort(function (a, b) { return b.n - a.n; });

    // Quiénes entraron al panel (miembros con sesión) y visitantes anónimos
    var origenDe = {};
    (datos.origenes || []).forEach(function (o) { origenDe[o.uid] = o; });
    var miembros = (datos.miembros || []).map(function (m) {
      var enRango = suma(claves, function (c) { return (m.dias || {})[c]; });
      return { uid: m.uid, nombre: m.nombre, email: m.email, ultima: m.ultima, enRango: enRango, origen: origenDe[m.uid] ? origenDe[m.uid].origen : '', vip: origenDe[m.uid] ? origenDe[m.uid].vip === true : false };
    }).filter(function (m) { return m.enRango > 0; }).sort(function (a, b) { return b.enRango - a.enRango; });
    var anonimos = Math.max(0, unicos - miembros.length);

    return {
      r: r, claves: claves, hayPrev: hayPrev, dato: dato,
      kpis: {
        total: total, unicos: unicos, nuevas: nuevasN, nuevasVip: nuevasVipN,
        promedio: Math.round(total / Math.max(1, claves.length)), horaPico: horaPico,
        dTotal: delta(total, totalPrev, hayPrev), dUnicos: delta(unicos, unicosPrev, hayPrev),
        dNuevas: delta(nuevasN, nuevasPrevN, hayPrev && nuevasPrevN > 0), dPromedio: delta(total / Math.max(1, claves.length), totalPrev / Math.max(1, prev.length), hayPrev),
        spark: {
          total: grupos.map(function (g) { return suma(g.claves, function (c) { return dato(c).total; }); }),
          unicos: grupos.map(function (g) { return suma(g.claves, function (c) { return dato(c).unicos; }); }),
          nuevas: grupos.map(function (g) { return altasDe(g.claves); }),
          promedio: grupos.map(function (g) { return suma(g.claves, function (c) { return dato(c).total; }); })
        }
      },
      grupos: grupos, calor: calor, porSemana: porSemana, mejorDia: mejorDia, fuentes: fuentes, dispositivos: dispositivos, paginas: paginas, paises: paises,
      sociales: sociales, identificadas: identificadas, totalSocial: totalSocial, serieRedes: serieRedes, atribucion: atribucion, cuentasNuevas: nuevas.length,
      miembros: miembros, anonimos: anonimos, sinOrigen: datos.sinOrigen || 0,
      hayAlgo: datos.dias.some(function (d) { return d.total > 0; }) || (datos.miembros || []).length > 0 || cuentas.length > 0,
      porDia: claves.map(function (c) { return { dia: c, d: dato(c) }; }), prevTotales: prev.map(function (c) { return dato(c).total; }), prevUnicos: prev.map(function (c) { return dato(c).unicos; })
    };
  }

  // Agrupa los días: cada día (semana, 30, 90) o cada mes (12 meses y todo)
  function agrupar(claves, modo) {
    if (modo !== 'mes') return claves.map(function (c) { return { etiqueta: diaCorto(c), titulo: diaCorto(c), claves: [c] }; });
    var orden = [], por = {};
    claves.forEach(function (c) {
      var m = c.slice(0, 7);
      if (!por[m]) { por[m] = { etiqueta: mesCorto(c), titulo: mesCorto(c), claves: [] }; orden.push(m); }
      por[m].claves.push(c);
    });
    return orden.map(function (m) { return por[m]; });
  }

  /* ───────────────────────── HTML ───────────────────────── */

  function card(titulo, cuerpo, nota, clase, extra) {
    return '<section class="ap-card vz-card' + (clase ? ' ' + clase : '') + '"' + (extra || '') + '><header class="ap-card__cab"><h2>' + esc(titulo) + '</h2>' + (nota ? '<p>' + nota + '</p>' : '') + '</header><div class="ap-card__cuerpo">' + cuerpo + '</div></section>';
  }
  function vacio(titulo, texto, icono) {
    return '<div class="zs-vacio ap-vacio">' + ico(icono || 'search-x', { size: 28 }) + '<strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></div>';
  }
  function chip(d) { return d.texto ? '<span class="vz-d vz-d--' + d.clase + '">' + (d.clase === 'up' ? '▲ ' : d.clase === 'down' ? '▼ ' : '') + esc(d.texto) + '</span>' : ''; }

  function kpiHTML(o) {
    return '<article class="vz-kpi vz-kpi--' + o.i + '"><p class="vz-kpi__rot">' + esc(o.rotulo) + '</p><p class="vz-kpi__val">' + esc(o.valor) + '</p>' +
      '<p class="vz-kpi__sub">' + esc(o.sub) + '</p>' + (o.delta ? chip(o.delta) : '') + '<div class="vz-kpi__spark">' + o.spark + '</div></article>';
  }

  function paisNombre(codigo) {
    if (codigo === 'ZZ') return 'No identificado';
    try { return new Intl.DisplayNames(['es'], { type: 'region' }).of(codigo) || codigo; } catch (e) { return codigo; }
  }
  function paisRotulo(codigo) { return codigo === 'MX' ? 'México' : paisNombre(codigo); }

  function pildoraEstado(datos) {
    var e = datos.estado || {};
    if (datos.activo === false) return '<span class="vz-estado vz-estado--apagado"><i></i>El contador está apagado · se enciende en Configuración</span>';
    if (e.errores && !e.ultimoOk) return '<span class="vz-estado vz-estado--error" title="' + esc((e.ultimoError && e.ultimoError.mensaje) || '') + '"><i></i>El contador tuvo errores</span>';
    var ultima = datos.ultimaVisita || e.ultimoOk;
    if (ultima) return '<span class="vz-estado vz-estado--ok"><i></i>Contador activo · última visita ' + esc(P.fmtFechaHora(ultima)) + '</span>';
    return '<span class="vz-estado"><i></i>Contador activo · esperando la primera visita</span>';
  }

  function controlesHTML(m, ui) {
    var r = m.r;
    var flechas = r.rango === 'semana'
      ? '<div class="vz-semana"><button type="button" class="vz-flecha" data-accion="vz-semana-ant" aria-label="Semana anterior"' + (r.semana >= MAX_SEMANAS_ATRAS ? ' disabled' : '') + '>' + ico('chevron-left', { size: 18 }) + '</button>' +
        '<div class="vz-semana__t"><strong>' + esc(r.titulo) + '</strong><span>' + esc(r.subtitulo) + '</span></div>' +
        '<button type="button" class="vz-flecha" data-accion="vz-semana-sig" aria-label="Semana siguiente"' + (r.semana <= 0 ? ' disabled' : '') + '>' + ico('chevron-right', { size: 18 }) + '</button></div>'
      : '<div class="vz-semana vz-semana--solo"><div class="vz-semana__t"><strong>' + esc(r.titulo) + '</strong></div></div>';
    return '<div class="vz-barra"><div class="vz-seg" role="group" aria-label="Periodo">' + RANGOS.map(function (x) {
      return '<button type="button" data-accion="vz-rango" data-rango="' + x[0] + '" aria-pressed="' + (ui.rango === x[0]) + '"' + (ui.cargando ? ' disabled' : '') + '>' + esc(x[1]) + '</button>';
    }).join('') + '</div><div class="vz-barra__fila">' + flechas +
      '<button type="button" class="ap-btn ap-btn--suave vz-csv" data-accion="vz-csv">' + ico('download', { size: 16 }) + 'Descargar historial (CSV)</button></div></div>';
  }

  function kpisHTML(m) {
    var k = m.kpis;
    var sp = function (valores, color) { return G.sparkline(valores, { color: color }); };
    return '<div class="vz-kpis">' + [
      kpiHTML({ i: 1, rotulo: 'Visitas', valor: num(k.total), sub: 'Páginas vistas', delta: k.dTotal, spark: sp(k.spark.total, COLOR_KPI[0]) }),
      kpiHTML({ i: 2, rotulo: 'Personas distintas', valor: num(k.unicos), sub: 'Visitantes únicos por día, sumados', delta: k.dUnicos, spark: sp(k.spark.unicos, COLOR_KPI[1]) }),
      kpiHTML({ i: 3, rotulo: 'Cuentas nuevas', valor: num(k.nuevas), sub: k.nuevasVip ? num(k.nuevasVip) + ' ya son miembros con plan' : 'Personas que crearon su cuenta', delta: k.dNuevas, spark: sp(k.spark.nuevas, COLOR_KPI[2]) }),
      kpiHTML({ i: 4, rotulo: 'Promedio por día', valor: num(k.promedio), sub: k.horaPico >= 0 ? 'Hora pico: ' + hora12(k.horaPico) : 'Aún sin visitas', delta: k.dPromedio, spark: sp(k.spark.promedio, COLOR_KPI[3]) })
    ].join('') + '</div>';
  }

  function principalHTML(m) {
    var r = m.r;
    var titulo = r.rango === 'semana' ? 'Visitas por día de la semana' : r.agrupar === 'mes' ? 'Visitas por mes' : 'Visitas día a día';
    var sub = r.rango === 'semana' ? 'De lunes a domingo; los días que aún no pasan quedan vacíos.' : m.hayPrev && r.agrupar !== 'mes' ? 'La línea punteada es el periodo anterior, para comparar.' : 'Evolución del periodo seleccionado.';
    var etiquetas, titulos, vis, uni, ant = null;
    if (r.rango === 'semana') {
      etiquetas = DIAS; titulos = DIAS_LARGO;
      vis = r.semanaCompleta.map(function (c) { return m.dato(c).total; });
      uni = r.semanaCompleta.map(function (c) { return m.dato(c).unicos; });
      if (m.hayPrev) ant = r.semanaCompleta.map(function (c) { return m.dato(sumarDias(c, -7)).total; });
    } else {
      etiquetas = m.grupos.map(function (g) { return g.etiqueta; }); titulos = m.grupos.map(function (g) { return g.titulo; });
      vis = m.kpis.spark.total; uni = m.kpis.spark.unicos;
      if (m.hayPrev && r.agrupar !== 'mes') ant = m.prevTotales;
    }
    var series = [{ nombre: 'Visitas', valores: vis, color: 1 }, { nombre: 'Personas distintas', valores: uni, color: 2 }];
    if (ant) series.push({ nombre: 'Periodo anterior', valores: ant, color: 8, punteada: true });
    var graf = G.serie({
      titulo: titulo, tipo: r.rango === 'semana' || r.agrupar === 'mes' ? 'barras' : 'area', unidad: 'visitas', alto: 300, etiquetas: etiquetas, titulos: titulos, series: series,
      vacio: { titulo: 'Sin visitas en este periodo', texto: 'Cuando entre gente al sitio verás aquí cómo se reparte.' }
    });
    return card(titulo, graf, esc(sub), 'vz-principal');
  }

  function barrasHex(filas, vacioTexto, titulo) {
    return G.barrasH({
      titulo: titulo, porcentaje: false,
      filas: filas.map(function (f) { return { etiqueta: f.etiqueta, valor: f.valor, color: f.color, nota: f.nota }; }),
      vacio: { titulo: 'Sin datos en este periodo', texto: vacioTexto || 'Cuando haya visitas aparecerán aquí.' }
    });
  }

  function atribucionHTML(m) {
    var a = m.atribucion;
    var sin = m.sinOrigen;
    var sub = 'Cuentas creadas en este periodo, según la red social o el enlace por el que llegaron' + (sin ? ' · ' + num(sin) + (sin === 1 ? ' cuenta anterior' : ' cuentas anteriores') + ' al contador no tienen origen.' : '.');
    if (!a.length) {
      return card('¿De dónde vienen tus miembros?', vacio('Aún no hay cuentas con origen en este periodo', 'Desde que se enciende el contador, cada cuenta nueva guarda por dónde llegó (Google, Instagram, Facebook, WhatsApp…). Cuando alguien se registre lo verás aquí.', 'users'), esc(sub), 'vz-card--destacada');
    }
    var g = a[0], pct = Math.round(g.n / Math.max(1, m.cuentasNuevas) * 100);
    var max = Math.max.apply(null, a.map(function (x) { return x.n; }));
    var banner = '<div class="vz-ganador"><span class="vz-ganador__ini" style="background:' + (HEX_FUENTE[g.k] || '#64748B') + '">' + esc((NOMBRE_FUENTE[g.k] || g.k).charAt(0)) + '</span><p><strong>' + esc(NOMBRE_FUENTE[g.k] || g.k) +
      '</strong> es de donde más miembros llegaron: <strong>' + num(g.n) + '</strong> de ' + num(m.cuentasNuevas) + ' cuentas nuevas (' + pct + '%)' + (g.vip ? ', y <strong>' + num(g.vip) + '</strong> ya tienen plan' : '') + '.</p></div>';
    var barras = '<ul class="vz-origen">' + a.map(function (x) {
      return '<li><span class="vz-origen__t">' + esc(NOMBRE_FUENTE[x.k] || x.k) + '</span><span class="vz-origen__b"><i class="zg-c' + (COLOR_FUENTE[x.k] || 8) + '" style="width:' + Math.max(3, Math.round(x.n / max * 100)) + '%"></i>' +
        '<b class="zg-c' + (COLOR_FUENTE[x.k] || 8) + '" style="width:' + Math.round(x.vip / max * 100) + '%"></b></span><span class="vz-origen__n">' + num(x.n) + '</span></li>';
    }).join('') + '</ul><p class="vz-leyenda"><span><i class="vz-sw vz-sw--cuentas"></i>Cuentas creadas</span><span><i class="vz-sw vz-sw--vip"></i>Ya tienen plan</span></p>';
    var tabla = '<div class="ap-tabla-zona"><div class="ap-tabla-envoltura"><table class="ap-tabla ap-tabla--simple"><thead><tr><th scope="col">Origen</th><th scope="col" class="ap-col-num">Cuentas</th><th scope="col" class="ap-col-num">Con plan</th><th scope="col" class="ap-col-num">Conversión</th></tr></thead><tbody>' +
      a.map(function (x) {
        return '<tr><td data-label="Origen"><span class="vz-punto zg-c' + (COLOR_FUENTE[x.k] || 8) + '"></span>' + esc(NOMBRE_FUENTE[x.k] || x.k) + '</td><td class="ap-col-num">' + num(x.n) + '</td><td class="ap-col-num">' + num(x.vip) + '</td><td class="ap-col-num"><span class="vz-conv">' + Math.round(x.vip / x.n * 100) + '%</span></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    return card('¿De dónde vienen tus miembros?', banner + barras + tabla, esc(sub), 'vz-card--destacada');
  }

  function redesHTML(m) {
    var vacioRedes = vacio('Todavía nadie ha llegado desde una red social', 'Aquí verás cuántas personas llegan desde cada una. Comparte tus enlaces con ?utm_source=facebook o ?utm_source=instagram para medirlo con exactitud.', 'globe');
    var sub1 = m.sociales.length
      ? '<strong>' + num(m.totalSocial) + '</strong> de ' + num(m.kpis.unicos) + ' personas (' + Math.round(m.totalSocial / Math.max(1, m.kpis.unicos) * 100) + '%) llegaron desde una red social' + (m.identificadas.length ? '. La más fuerte: <strong>' + esc(NOMBRE_FUENTE[m.identificadas[0].k]) + '</strong>.' : '.')
      : 'Personas que llegaron desde Facebook, Instagram, WhatsApp, TikTok y más.';
    var meta = m.sociales.filter(function (x) { return x.k === 'meta'; })[0];
    var cuerpo1 = m.sociales.length
      ? barrasHex(m.sociales.map(function (x) { return { etiqueta: NOMBRE_FUENTE[x.k], valor: x.n, color: COLOR_FUENTE[x.k] }; }), '', 'Personas por red social') +
        (meta ? '<p class="vz-nota">Meta sin identificar (' + num(meta.n) + '): llegaron desde un enlace de Facebook o de Instagram, pero el navegador no dice de cuál, así que no se pueden repartir. Para que cada una cuente por separado, agrega a tus anuncios de Meta: <code>?utm_source={{site_source_name}}</code>.</p>' : '')
      : vacioRedes;
    var sub2 = m.r.agrupar === 'mes' ? 'Cuántas personas llegaron de cada red mes a mes.' : 'Cuántas personas llegaron de cada red día a día.';
    var cuerpo2 = m.serieRedes.length
      ? G.serie({
        titulo: 'Redes sociales a lo largo del tiempo', tipo: 'barras', unidad: 'personas', alto: 240,
        etiquetas: m.r.rango === 'semana' ? m.grupos.map(function (g, i) { return DIAS[dow(m.r.claves[i])]; }) : m.grupos.map(function (g) { return g.etiqueta; }),
        titulos: m.grupos.map(function (g) { return g.titulo; }),
        series: m.serieRedes.map(function (s) { return { nombre: NOMBRE_FUENTE[s.k], valores: s.valores, color: COLOR_FUENTE[s.k] }; }),
        vacio: { titulo: 'Sin redes en este periodo', texto: 'Cuando alguien llegue desde una red social aparecerá aquí.' }
      })
      : vacioRedes;
    return '<div class="ap-columnas">' + card('Redes sociales · ¿cuánta gente llega de cada una?', cuerpo1, sub1) + card('Redes sociales a lo largo del tiempo', cuerpo2, esc(sub2)) + '</div>';
  }

  function semanaHTML(m) {
    var graf = G.serie({
      titulo: '¿Qué día entra más gente?', tipo: 'barras', formato: 'dec', entero: false, unidad: 'visitas por día en promedio', alto: 250, etiquetas: DIAS, titulos: DIAS_LARGO,
      series: [{ nombre: 'Visitas por día', valores: m.porSemana, color: 1 }],
      vacio: { titulo: 'Sin visitas en este periodo', texto: 'Aquí verás qué día de la semana entra más gente.' }
    });
    var calor = G.mapaCalor({
      titulo: 'Mapa de calor · día y hora', unidad: 'visitas',
      filas: DIAS.map(function (n, i) { return { etiqueta: n, valores: m.calor[i] }; }),
      columnas: Array.apply(null, Array(24)).map(function (_, h) { return h + 'h'; }), mostrarCada: 6,
      vacio: { titulo: 'Sin visitas en este periodo', texto: 'Cuando entre gente verás a qué hora llega.' }
    });
    return '<div class="ap-columnas">' +
      card('¿Qué día entra más gente?', graf, 'Promedio de visitas por día de la semana en el periodo.' + (m.mejorDia >= 0 ? ' El más fuerte: <strong>' + DIAS[m.mejorDia] + '</strong>.' : '')) +
      card('Mapa de calor · día y hora', calor, 'Cuándo entra la gente (hora de México). Más oscuro = más visitas.') + '</div>';
  }

  function trioHTML(m) {
    var fuera = m.paises.filter(function (p) { return p.k !== 'MX' && p.k !== 'ZZ'; }).reduce(function (t, p) { return t + p.n; }, 0);
    var subPaises = !m.paises.length ? 'Aún sin visitas.' : fuera ? 'Hubo <strong>' + num(fuera) + '</strong> ' + (fuera === 1 ? 'persona' : 'personas') + ' de fuera de México.' : 'Por ahora todas las visitas identificadas son de México.';
    var paises = G.barrasH({
      titulo: 'Países', porcentaje: false,
      filas: m.paises.slice(0, 8).map(function (p, i) { return { etiqueta: paisRotulo(p.k), valor: p.n, color: p.k === 'MX' ? 1 : p.k === 'ZZ' ? 8 : 2 + (i % 2) * 2 }; }),
      vacio: { titulo: 'Aún sin visitas', texto: 'Cuando entre gente verás de qué países.' }
    });
    var disp = G.anillo({
      titulo: 'Dispositivos', centro: { valor: num(suma(m.dispositivos, function (x) { return x.n; })), rotulo: 'PERSONAS' },
      partes: m.dispositivos.map(function (x) { return { etiqueta: NOMBRE_DISP[x.k], valor: x.n, color: COLOR_DISP[x.k] }; }),
      vacio: { titulo: 'Sin datos en este periodo', texto: 'Cuando entre gente verás desde qué aparato.' }
    });
    var llegan = G.anillo({
      titulo: 'Cómo llegan al sitio', centro: { valor: num(suma(m.fuentes, function (x) { return x.n; })), rotulo: 'PERSONAS' },
      partes: m.fuentes.map(function (x) { return { etiqueta: NOMBRE_FUENTE[x.k], valor: x.n, color: COLOR_FUENTE[x.k] }; }),
      vacio: { titulo: 'Sin datos en este periodo', texto: 'Cuando entre gente verás por dónde llegó.' }
    });
    return '<div class="ap-columnas vz-trio">' + card('Países', paises, subPaises) + card('Dispositivos', disp, 'Desde qué aparato entra la gente.') +
      card('Cómo llegan al sitio', llegan, 'Por dónde entró cada persona en su primera visita del día.') + '</div>';
  }

  function iniciales(nombre, email) { return String(nombre || email || '?').trim().slice(0, 2).toUpperCase(); }
  function quienesHTML(m) {
    var lista = m.miembros.slice(0, 15);
    var sub = 'Miembros con sesión iniciada en el periodo' + (m.anonimos ? '. Además hubo <strong>' + num(m.anonimos) + '</strong> ' + (m.anonimos === 1 ? 'visitante anónimo que no se identifica' : 'visitantes anónimos que no se identifican') + '.' : '.');
    var cuerpo = lista.length ? '<ul class="vz-quienes">' + lista.map(function (x) {
      return '<li><span class="vz-av" aria-hidden="true">' + esc(iniciales(x.nombre, x.email)) + '</span><div class="vz-q__t"><strong>' + esc(x.nombre || 'Sin nombre') + '</strong><span>' + esc(x.email) + '</span>' +
        (x.origen ? '<em class="vz-tag">' + esc(NOMBRE_FUENTE[x.origen] || x.origen) + '</em>' : '') + (x.vip ? '<em class="vz-tag vz-tag--vip">Con plan</em>' : '') + '</div>' +
        '<div class="vz-q__n"><strong>' + num(x.enRango) + (x.enRango === 1 ? ' visita' : ' visitas') + '</strong><span>' + esc(P.fmtFechaHora(x.ultima)) + '</span></div></li>';
    }).join('') + '</ul>' : vacio('Ningún miembro entró al panel en este periodo.', 'Cuando alguien inicie sesión y use el club aparecerá aquí.', 'users');
    return card('Quiénes entraron al panel', cuerpo, sub);
  }

  function paginasHTML(m) {
    var max = m.paginas.length ? m.paginas[0].n : 1;
    var cuerpo = m.paginas.length ? '<ul class="vz-paginas">' + m.paginas.map(function (p) {
      return '<li><span class="vz-paginas__t">' + esc(NOMBRE_PAGINA[p.k]) + '</span><strong>' + num(p.n) + '</strong><span class="vz-paginas__b"><i style="width:' + Math.round(p.n / max * 100) + '%"></i></span></li>';
    }).join('') + '</ul>' : vacio('Sin datos en este periodo', 'Cuando entre gente verás qué páginas ve.', 'search-x');
    return card('Páginas más vistas', cuerpo, 'Dónde entra la gente.');
  }

  // Detalle de «de dónde viene» de una visita
  function pistaTexto(p) {
    var t = [];
    if (p.ref) t.push('viene de ' + p.ref);
    if (p.utm) t.push('etiqueta ' + p.utm);
    if (p.app) t.push('app de ' + (NOMBRE_FUENTE[p.app] || p.app));
    if (p.fbclid) t.push('enlace con marca de Meta');
    if (p.igshid) t.push('enlace compartido desde Instagram');
    return t.length ? t.join(' · ') : 'sin pistas del origen';
  }
  function filaVisitaHTML(v) {
    var disp = NOMBRE_DISP[v.dispositivo] || 'Computadora';
    return '<li class="vz-fila"><span class="vz-fila__h">' + esc(horaDia(v.t)) + '</span>' +
      '<div class="vz-fila__o"><strong><i class="vz-punto zg-c' + (COLOR_FUENTE[v.fuente] || 8) + '"></i>' + esc(NOMBRE_FUENTE[v.fuente] || v.fuente) + '</strong><small>' + esc(pistaTexto(v.pistas || {})) + '</small></div>' +
      '<div class="vz-fila__p"><strong>' + esc(paisRotulo(v.pais)) + '</strong> · ' + esc(disp) + (v.nuevo ? ' · primera del día' : '') + '<small>' + esc(NOMBRE_PAGINA[v.pagina] || '') + '</small></div></li>';
  }
  function registroHTML(ui, m) {
    var reg = ui.registro;
    var filtros = '<div class="vz-seg vz-seg--chico" role="group" aria-label="Periodo de la lista">' + FILTROS_LOG.map(function (x) {
      return '<button type="button" data-accion="vz-log" data-periodo="' + x[0] + '" aria-pressed="' + (ui.periodoLog === x[0]) + '">' + esc(x[1]) + '</button>';
    }).join('') + '</div>';
    var cuerpo;
    if (ui.errorRegistro) cuerpo = '<p class="vz-error">No se pudo cargar el registro: ' + esc(ui.errorRegistro) + '</p>';
    else if (!reg) cuerpo = '<p class="vz-cargando">Cargando visitas…</p>';
    else if (!reg.items.length) cuerpo = vacio('Sin visitas registradas en este periodo.', 'Cada visita se guarda sola, sin datos personales.', 'search-x');
    else {
      var visibles = reg.items.slice(0, ui.logVisibles || 10);
      var restan = reg.items.length - visibles.length;
      cuerpo = '<ul class="vz-filas">' + visibles.map(filaVisitaHTML).join('') + '</ul>' +
        (restan > 0 ? '<button type="button" class="ap-btn ap-btn--suave ap-mas" data-accion="vz-log-mas">Ver más (' + num(restan) + ' restantes)</button>' : '');
    }
    var resumen = reg ? '<strong>' + num(reg.total) + '</strong> visitas · <strong>' + num(m && m.logPersonas !== undefined ? m.logPersonas : reg.personas || 0) + '</strong> personas en este periodo' : 'Cada visita se guarda sola, sin datos personales.';
    return '<section class="ap-card vz-card vz-log"><header class="ap-card__cab vz-log__cab"><div><h2>Visitas por periodo</h2><p>' + resumen + '</p></div>' + filtros + '</header><div class="ap-card__cuerpo">' + cuerpo +
      '<p class="vz-pie">Se guarda cada visita sola, sin datos personales' + (ui.actualizado ? ' · actualizado ' + esc(ui.actualizado) : '') + ' <button type="button" class="ap-enlace" data-accion="vz-log-act">' + (ui.actualizandoLog ? 'Actualizando…' : 'Actualizar') + '</button></p></div></section>';
  }

  function paginaHTML(datos, ui) {
    var m = construir(datos, ui);
    // Personas del periodo del registro (de los agregados diarios)
    var reg = ui.registro;
    if (reg) {
      var claves = reg.desde && reg.hasta ? listaEntre(reg.desde, reg.hasta) : [];
      var mapa = {};
      datos.dias.forEach(function (d) { mapa[d.dia] = d; });
      m.logPersonas = suma(claves, function (c) { return (mapa[c] || VACIO).unicos; });
    }
    var cab = '<header class="vz-intro"><p class="vz-hero__sub">Cuánta gente visita Zoorigen, desde dónde llega y de qué red social salen tus miembros. Conteo anónimo y sin cookies; todo se guarda día a día para que consultes el historial.</p>' + pildoraEstado(datos) + '</header>';
    var barra = '<section class="vz-controles" aria-label="Periodo de las métricas">' + controlesHTML(m, ui) + '</section>';
    if (!m.hayAlgo) {
      return cab + barra + '<div class="ap-card vz-card">' + vacio('Todavía no hay visitas registradas', datos.activo === false
        ? 'El contador está apagado. Enciéndelo en Configuración (Contador de visitas) y, en cuanto entre la primera persona al sitio, verás aquí las gráficas; el historial se irá guardando solo, día tras día.'
        : 'El contador ya está encendido. En cuanto entre la primera persona al sitio verás aquí las gráficas, y el historial se irá guardando solo, día tras día.', 'globe') + '</div>';
    }
    return cab + barra + kpisHTML(m) + principalHTML(m) + registroHTML(ui, m) + atribucionHTML(m) + redesHTML(m) + semanaHTML(m) + trioHTML(m) +
      '<div class="ap-columnas">' + paginasHTML(m) + quienesHTML(m) + '</div>';
  }

  /* ───────────────────────── CSV ───────────────────────── */

  function csvHistorial(datos) {
    var cuentas = (datos.origenes || []).map(function (o) { return diaDeCuenta(o.creada, datos.zona); });
    var cab = ['fecha', 'visitas', 'personas_distintas', 'miembros_que_entraron', 'telefono', 'tableta', 'computadora'].concat(FUENTES.map(function (k) { return 'origen_' + k; })).concat(['paises', 'cuentas_nuevas']);
    var filas = [cab];
    datos.dias.forEach(function (d) {
      var f = [d.dia, d.total, d.unicos, d.miembros, d.dispositivos.movil || 0, d.dispositivos.tablet || 0, d.dispositivos.computadora || 0]
        .concat(FUENTES.map(function (k) { return (d.fuentes || {})[k] || 0; }))
        .concat([Object.keys(d.paises || {}).map(function (k) { return k + ':' + d.paises[k]; }).join('|'), cuentas.filter(function (c) { return c === d.dia; }).length]);
      filas.push(f);
    });
    return '﻿' + filas.map(function (f) { return f.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
  }

  /* ───────────────────────── Pantalla (red y eventos) ───────────────────────── */

  var estado = { datos: null, ui: null, pidio730: false };
  function uiInicial() { return { rango: 'semana', semana: 0, periodoLog: 'hoy', logVisibles: 10, registro: null, errorRegistro: '', actualizado: '', cargando: false, actualizandoLog: false }; }

  function pintar() {
    var u = V.util;
    var cont = u.vista();
    cont.innerHTML = paginaHTML(estado.datos, estado.ui);
    if (G && G.activar) G.activar(cont);
  }

  async function cargarRegistro() {
    var u = V.util; var ctx = u.contexto(); var ui = estado.ui;
    ui.actualizandoLog = true; ui.errorRegistro = '';
    try {
      ui.registro = await ctx.api('/api/admin/visitas/registro?periodo=' + encodeURIComponent(ui.periodoLog));
      ui.actualizado = new Date().toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' });
    } catch (e) { ui.errorRegistro = (e && e.message) || 'intenta de nuevo'; }
    ui.actualizandoLog = false;
    if (estado.datos && u.contadorActual() === estado.mi) pintar();
  }

  async function cargarDatos(dias, forzar) {
    var ctx = V.util.contexto();
    return ctx.api('/api/admin/visitas/metricas?dias=' + dias + (forzar ? '&refrescar=1' : ''));
  }

  function descargarCsv() {
    var texto = csvHistorial(estado.datos).replace(/^﻿/, '');
    var blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'historial-visitas-zoorigen-' + estado.datos.hoy + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  var temporizador = null;
  async function visitas(forzar) {
    var u = V.util; var mi = u.nuevoContador(); estado.mi = mi;
    clearInterval(temporizador);
    u.vista().innerHTML = u.cargando('Visitas');
    estado.ui = estado.ui || uiInicial();
    estado.pidio730 = false;
    try { estado.datos = await cargarDatos(190, forzar); } catch (e) {
      if (mi !== u.contadorActual()) return;
      u.vista().innerHTML = u.errorHTML('Visitas', e, 'vz-recargar');
      u.vista().onclick = function (ev) { u.acciones(ev, { 'vz-recargar': function () { visitas(true); } }); };
      return;
    }
    if (mi !== u.contadorActual()) return;
    pintar();
    cargarRegistro();
    // «Hoy» se refresca solo cada minuto mientras la pestaña está visible (1 lectura); los demás periodos solo al pulsar Actualizar
    temporizador = setInterval(function () {
      if (u.contadorActual() !== mi) { clearInterval(temporizador); return; }
      if (!document.hidden && estado.ui.periodoLog === 'hoy') cargarRegistro();
    }, 60000);
    u.vista().onclick = function (ev) {
      u.acciones(ev, {
        'vz-rango': async function (b) {
          var ui = estado.ui; ui.rango = b.dataset.rango; ui.semana = 0;
          if ((ui.rango === '365' || ui.rango === 'todo') && !estado.pidio730) {
            estado.pidio730 = true; ui.cargando = true; pintar();
            try { var d = await cargarDatos(730, false); estado.datos = d; } catch (e) { u.contexto().toast((e && e.message) || 'No se pudieron cargar 12 meses.', true); }
            ui.cargando = false;
          }
          pintar();
        },
        'vz-semana-ant': function () { estado.ui.semana = Math.min(MAX_SEMANAS_ATRAS, estado.ui.semana + 1); pintar(); },
        'vz-semana-sig': function () { estado.ui.semana = Math.max(0, estado.ui.semana - 1); pintar(); },
        'vz-csv': function () { descargarCsv(); },
        'vz-log': function (b) { estado.ui.periodoLog = b.dataset.periodo; estado.ui.logVisibles = 10; estado.ui.registro = null; pintar(); cargarRegistro(); },
        'vz-log-mas': function () { estado.ui.logVisibles += 20; pintar(); },
        'vz-log-act': function () { estado.ui.actualizandoLog = true; pintar(); cargarRegistro(); }
      });
    };
  }

  /* ───────────────────────── Pantalla «Métricas»: pestañas Visitas | Negocio ───────────────────────── */

  var PESTANAS = [['visitas', 'Visitas', 'globe'], ['negocio', 'Negocio', 'chart-line']];

  function cabeceraHTML(sel) {
    return '<header class="vz-hero"><p class="vz-eyebrow">Marketing</p><h1>Métricas</h1>' +
      '<p class="vz-hero__sub">Todo lo que mide Zoorigen en un solo lugar: <strong>Visitas</strong> (quién entra al sitio, desde dónde llega y de qué red salen tus miembros) y <strong>Negocio</strong> (altas, pruebas gratuitas, membresías, ingresos y retención).</p>' +
      '<div class="vz-pestanas" role="tablist" aria-label="Tipo de métricas">' + PESTANAS.map(function (p) {
        return '<button type="button" role="tab" class="vz-pestana" id="vzTab-' + p[0] + '" data-accion="vz-pestana" data-pestana="' + p[0] + '" aria-selected="' + (sel === p[0]) + '" aria-controls="vzCuerpo">' + ico(p[2], { size: 16 }) + esc(p[1]) + '</button>';
      }).join('') + '</div></header>' +
      '<div id="vzCuerpo" role="tabpanel" aria-labelledby="vzTab-' + sel + '"></div>';
  }

  var pestana = 'visitas';
  function metricas(forzar, cual) {
    var u = V.util; var ctx = u.contexto();
    if (cual) pestana = cual === 'negocio' ? 'negocio' : 'visitas';
    var cont = ctx.contenedor();
    cont.innerHTML = cabeceraHTML(pestana);
    cont.onclick = function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-accion="vz-pestana"]') : null;
      if (b && cont.contains(b) && b.dataset.pestana !== pestana) metricas(false, b.dataset.pestana);
    };
    if (pestana === 'negocio') return window.ZOO_ADMIN_MARKETING.metricas(forzar);
    return visitas(forzar);
  }

  return {
    metricas: metricas, cabeceraHTML: cabeceraHTML, PESTANAS: PESTANAS,
    RANGOS: RANGOS, DIAS: DIAS, NOMBRE_FUENTE: NOMBRE_FUENTE, NOMBRE_PAGINA: NOMBRE_PAGINA, NOMBRE_DISP: NOMBRE_DISP, COLOR_FUENTE: COLOR_FUENTE, FUENTES: FUENTES, REDES: REDES,
    sumarDias: sumarDias, dow: dow, lunesDe: lunesDe, rangoActual: rangoActual, delta: delta, construir: construir, agrupar: agrupar,
    paginaHTML: paginaHTML, kpisHTML: kpisHTML, controlesHTML: controlesHTML, registroHTML: registroHTML, filaVisitaHTML: filaVisitaHTML, pistaTexto: pistaTexto,
    atribucionHTML: atribucionHTML, redesHTML: redesHTML, quienesHTML: quienesHTML, trioHTML: trioHTML, semanaHTML: semanaHTML, pildoraEstado: pildoraEstado,
    csvHistorial: csvHistorial, uiInicial: uiInicial, visitas: visitas
  };
});
