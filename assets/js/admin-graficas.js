/* ============================================================ */
/* PANEL DE ADMINISTRACIÓN · GRÁFICAS                            */
/* SVG y HTML propios (sin librerías ni CDN): líneas con relleno */
/* sólido suave, barras agrupadas, anillos con leyenda, barras   */
/* horizontales, sparklines, mapa de calor y embudo.             */
/* Todo es color SÓLIDO (sin degradados), con eje legible,       */
/* tooltip al pasar o tocar, descripción textual y una tabla     */
/* alternativa oculta para lectores de pantalla.                 */
/* Los constructores devuelven HTML (se prueban en               */
/* tests/admin-graficas.test.js); activar(raiz) añade los        */
/* tooltips y es lo único que toca el DOM.                       */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./admin-panel.js'));
  else root.ZOO_ADMIN_GRAFICAS = factory(root.ZOO_ADMIN_PANEL);
})(typeof self !== 'undefined' ? self : this, function (P) {
  'use strict';

  var esc = P.esc;
  var CIRC = 2 * Math.PI * 48;   // circunferencia del anillo (radio 48 en un lienzo de 120)
  var contador = 0;
  var COLORES = 8;               // --zg-1 … --zg-8 (admin-club.css, distintos entre sí y con contraste en día y noche)

  function id(prefijo) { contador += 1; return prefijo + contador; }
  function color(n) { var c = Math.round(Number(n) || 1); return c < 1 || c > COLORES ? ((Math.abs(c) - 1) % COLORES) + 1 : c; }
  function aNum(v) { var n = Number(v); return isFinite(n) && n > 0 ? n : 0; }
  function suma(arr) { return arr.reduce(function (t, v) { return t + aNum(v); }, 0); }
  function redondear(n, d) { var k = Math.pow(10, d || 0); return Math.round(n * k) / k; }

  /* Formatos de valor: num (1,234) · mxn ($1,234) · pct (12 %) · dec (1,5) */
  function formatear(valor, fmt) {
    var v = Number(valor);
    if (!isFinite(v)) return '—';
    if (fmt === 'mxn') return '$' + Math.round(v).toLocaleString('es-MX');
    if (fmt === 'pct') return Math.round(v) + ' %';
    if (fmt === 'dec') return (Math.round(v * 10) / 10).toLocaleString('es-MX');
    return Math.round(v).toLocaleString('es-MX');
  }
  /* Etiqueta corta del eje (5,2 mil · $1,2 mil) para que quepa en la columna del eje vertical. */
  function abreviar(valor, fmt) {
    var v = Number(valor);
    if (!isFinite(v)) return '—';
    var pre = fmt === 'mxn' ? '$' : '';
    if (fmt === 'pct') return Math.round(v) + ' %';
    if (Math.abs(v) >= 1000000) return pre + redondear(v / 1000000, 1).toLocaleString('es-MX') + ' M';
    if (Math.abs(v) >= 10000) return pre + redondear(v / 1000, 0).toLocaleString('es-MX') + ' mil';
    return pre + (fmt === 'dec' ? redondear(v, 1) : Math.round(v)).toLocaleString('es-MX');
  }

  /* Tope «redondo» del eje vertical y sus marcas. entero = true evita decimales (cuentas de personas, pagos...). */
  function escalaY(max, opciones) {
    var o = opciones || {};
    var m = aNum(max);
    if (!m) m = 1;
    var intervalos = o.intervalos || 4;
    var crudo = m / intervalos;
    var pot = Math.pow(10, Math.floor(Math.log10(crudo)));
    var paso = pot;
    var candidatos = o.entero !== false && pot < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
    for (var i = 0; i < candidatos.length; i++) { paso = candidatos[i] * pot; if (paso * intervalos >= m) break; }
    if (o.entero !== false && paso < 1) paso = 1;
    var n = Math.max(1, Math.ceil(m / paso - 1e-9));
    if (n > intervalos + 1) { paso *= 2; n = Math.ceil(m / paso - 1e-9); }
    var ticks = [];
    for (var k = 0; k <= n; k++) ticks.push(redondear(k * paso, 6));
    return { max: ticks[ticks.length - 1], ticks: ticks, paso: paso };
  }

  /* Qué etiquetas del eje horizontal se muestran: todas si son pocas; si no, unas 6 repartidas (siempre la primera y la última). */
  function indicesEtiquetas(n, maximo) {
    var tope = maximo || 6;
    var lista = [];
    if (n <= 0) return lista;
    if (n <= 8) { for (var i = 0; i < n; i++) lista.push(i); return lista; }
    var paso = Math.ceil((n - 1) / (tope - 1));
    for (var j = 0; j < n; j += paso) lista.push(j);
    if (lista[lista.length - 1] !== n - 1) {
      // la última siempre; si queda pegada a la anterior, se quita la anterior
      if (n - 1 - lista[lista.length - 1] < paso * 0.6) lista.pop();
      lista.push(n - 1);
    }
    return lista;
  }

  function estadoVacio(v) {
    var o = v || {};
    return '<div class="zs-vacio ap-vacio zg-vacio"><strong>' + esc(o.titulo || 'Todavía no hay datos') + '</strong><span>' + esc(o.texto || 'Cuando haya actividad en este periodo aparecerá aquí.') + '</span></div>';
  }

  /* ───────────────────────── Sparkline (mini gráfica de las tarjetas de cifras) ───────────────────────── */
  function sparkline(valores, o) {
    var op = o || {};
    var v = (Array.isArray(valores) ? valores : []).map(aNum);
    if (v.length < 2 || !suma(v)) return '';
    var max = Math.max.apply(null, v);
    var pts = v.map(function (x, i) { return [redondear(i / (v.length - 1) * 100, 2), redondear(94 - (x / max) * 84, 2)]; });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
    return '<svg class="zg-spark zg-c' + color(op.color) + '" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<path class="zg-spark__area" d="' + d + ' L100 100 L0 100 Z"/><path class="zg-spark__trazo" d="' + d + '"/></svg>';
  }

  /* ───────────────────────── Tabla alternativa (solo para lectores de pantalla) ───────────────────────── */
  function tablaAlterna(titulo, columnas, filas, fmt) {
    return '<div class="sr-only"><table><caption>' + esc(titulo) + '</caption><thead><tr>' +
      columnas.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      filas.map(function (f) {
        return '<tr><th scope="row">' + esc(f[0]) + '</th>' + f.slice(1).map(function (x) { return '<td>' + esc(typeof x === 'number' ? formatear(x, fmt) : x) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ───────────────────────── Serie temporal: barras agrupadas, línea o área ─────────────────────────
     o.etiquetas  etiquetas cortas del eje (una por punto)       o.titulos  etiquetas largas del tooltip (opcional)
     o.series     [{ nombre, valores:[...], color:1..8, punteada?, sinArea? }]
     o.tipo       'barras' | 'area' | 'lineas'                    o.formato  'num' | 'mxn' | 'pct' | 'dec'
     o.titulo     nombre de la gráfica (accesible)                o.unidad   texto del pie («cuentas nuevas»)
     o.alto       alto del área de dibujo en px (por defecto 220) o.vacio    { titulo, texto } si todo es cero
     o.leyenda    true/false (por defecto: solo si hay más de una serie) */
  function serie(o) {
    var op = o || {};
    var etiquetas = Array.isArray(op.etiquetas) ? op.etiquetas.map(String) : [];
    var n = etiquetas.length;
    var series = (Array.isArray(op.series) ? op.series : []).map(function (s, i) {
      var vals = etiquetas.map(function (_, k) { return aNum((s.valores || [])[k]); });
      return { nombre: String(s.nombre || ''), valores: vals, color: color(s.color || i + 1), punteada: s.punteada === true, sinArea: s.sinArea === true };
    });
    var fmt = op.formato || 'num';
    var titulo = op.titulo || 'Gráfica';
    var principales = series.filter(function (s) { return !s.punteada; });
    var totalPrincipal = principales.reduce(function (t, s) { return t + suma(s.valores); }, 0);
    if (!n || !series.length || !totalPrincipal) return estadoVacio(op.vacio);

    var tipo = op.tipo === 'lineas' || op.tipo === 'area' ? op.tipo : 'barras';
    var titulos = Array.isArray(op.titulos) && op.titulos.length === n ? op.titulos.map(String) : etiquetas;
    var maxDato = Math.max.apply(null, series.reduce(function (a, s) { return a.concat(s.valores); }, [1]));
    var esc_ = escalaY(maxDato, { entero: op.entero !== false && fmt !== 'dec' });
    var tope = esc_.max;
    var uid = id('zg-');
    var altoPx = op.alto || 220;

    // Etiquetas del eje vertical y líneas guía (HTML: el texto no se encoge con la pantalla)
    var yEtq = esc_.ticks.map(function (t) { return '<span style="bottom:' + redondear(t / tope * 100, 2) + '%">' + esc(abreviar(t, fmt)) + '</span>'; }).join('');
    var guias = esc_.ticks.map(function (t, i) { return i === 0 ? '' : '<span class="zg__lin" style="bottom:' + redondear(t / tope * 100, 2) + '%"></span>'; }).join('');
    var anchoY = Math.max.apply(null, esc_.ticks.map(function (t) { return abreviar(t, fmt).length; })) + 1;

    // Eje horizontal
    var visibles = indicesEtiquetas(n, op.maxEtiquetas || 6);
    var todas = n <= 8;
    var xEtq = visibles.map(function (i) {
      var izq = redondear((i + 0.5) / n * 100, 2);
      var clase = todas ? '' : (i === 0 ? ' class="zg__x--ini"' : i === n - 1 ? ' class="zg__x--fin"' : '');
      return '<li' + clase + ' style="left:' + izq + '%">' + esc(etiquetas[i]) + '</li>';
    }).join('');

    var cuerpo;
    if (tipo === 'barras') {
      var k = principales.length;
      cuerpo = '<div class="zg__cols" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' + etiquetas.map(function (_, i) {
        return '<div class="zg__col" data-i="' + i + '">' + principales.map(function (s) {
          var h = redondear(s.valores[i] / tope * 100, 2);
          return '<i class="zg__bar zg-c' + s.color + '" style="height:' + h + '%' + (s.valores[i] > 0 && h < 1.5 ? ';min-height:2px' : '') + '"></i>';
        }).join('') + '</div>';
      }).join('') + '</div>';
      // Las series punteadas (periodo anterior) en barras se dibujan como una raya sobre la columna
      var marcas = series.filter(function (s) { return s.punteada; }).map(function (s) {
        return s.valores.map(function (v, i) { return v > 0 ? '<span class="zg__marca zg-c' + s.color + '" style="left:' + redondear(i / n * 100, 2) + '%;width:' + redondear(100 / n, 2) + '%;bottom:' + redondear(v / tope * 100, 2) + '%"></span>' : ''; }).join('');
      }).join('');
      cuerpo += marcas;
      void k;
    } else {
      var caminos = series.map(function (s) {
        var pts = s.valores.map(function (v, i) { return [redondear((i + 0.5) / n * 100, 3), redondear(100 - v / tope * 100, 3)]; });
        var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
        var area = tipo === 'area' && !s.punteada && !s.sinArea ? '<path class="zg__area zg-c' + s.color + '" d="' + d + ' L' + pts[n - 1][0] + ' 100 L' + pts[0][0] + ' 100 Z"/>' : '';
        return area + '<path class="zg__trazo' + (s.punteada ? ' zg__trazo--punteada' : '') + ' zg-c' + s.color + '" d="' + d + '"/>';
      }).join('');
      cuerpo = '<svg class="zg__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + caminos + '</svg>' +
        // con pocos puntos se marcan siempre; con muchos solo al pasar
        (n <= 14 ? series.map(function (s) {
          return s.punteada ? '' : s.valores.map(function (v, i) { return '<span class="zg__punto zg-c' + s.color + '" style="left:' + redondear((i + 0.5) / n * 100, 2) + '%;bottom:' + redondear(v / tope * 100, 2) + '%"></span>'; }).join('');
        }).join('') : '') +
        '<span class="zg__dots" aria-hidden="true">' + series.map(function (s, i) { return s.punteada ? '' : '<span class="zg__dot zg-c' + s.color + '" data-s="' + i + '" hidden></span>'; }).join('') + '</span>';
    }

    // Texto para lectores de pantalla y pie visible
    var pico = { i: 0, v: -1 };
    var totales = principales.map(function (s) { return suma(s.valores); });
    var base = principales[0];
    base.valores.forEach(function (v, i) { if (v > pico.v) pico = { i: i, v: v }; });
    var partes = principales.map(function (s, j) { return s.nombre + ': total ' + formatear(totales[j], fmt); });
    var resumen = titulo + '. ' + partes.join('; ') + '. El valor más alto de «' + base.nombre + '» fue ' + formatear(pico.v, fmt) + ' (' + titulos[pico.i] + ').';

    var leyenda = (op.leyenda === false || (series.length < 2 && op.leyenda !== true)) ? '' :
      '<ul class="zg__leyenda">' + series.map(function (s) {
        return '<li><span class="zg__sw zg-c' + s.color + (s.punteada ? ' zg__sw--punteada' : '') + '" aria-hidden="true"></span>' + esc(s.nombre) + '</li>';
      }).join('') + '</ul>';

    var datos = { e: titulos, m: tope, f: fmt, t: tipo, s: series.map(function (s) { return { n: s.nombre, c: s.color, v: s.valores, p: s.punteada ? 1 : 0 }; }) };
    var pie = '<figcaption class="zg__pie">' + principales.map(function (s, j) {
      return '<span><strong>' + esc(formatear(totales[j], fmt)) + '</strong> ' + esc(principales.length > 1 ? s.nombre.toLowerCase() : (op.unidad || 'en total')) + '</span>';
    }).join('') + (pico.v > 0 ? '<span>Más alto: <strong>' + esc(formatear(pico.v, fmt)) + '</strong> (' + esc(titulos[pico.i]) + ')</span>' : '') + '</figcaption>';

    return '<figure class="zg zg--' + tipo + (n > 40 ? ' zg--densa' : '') + '" id="' + uid + '" data-zg="' + esc(JSON.stringify(datos)) + '" role="group" aria-label="' + esc(titulo) + '">' +
      leyenda +
      '<div class="zg__marco" style="--zg-yw:' + anchoY + 'ch;--zg-alto:' + altoPx + 'px">' +
      '<div class="zg__y" aria-hidden="true">' + yEtq + '</div>' +
      '<div class="zg__plot" tabindex="0" role="img" aria-label="' + esc(resumen) + '">' + guias + cuerpo +
      '<span class="zg__guia" hidden></span><div class="zg__tip" hidden></div></div>' +
      '<ol class="zg__x" aria-hidden="true">' + xEtq + '</ol></div>' +
      pie +
      tablaAlterna(titulo, ['Periodo'].concat(series.map(function (s) { return s.nombre || 'Valor'; })), titulos.map(function (t, i) { return [t].concat(series.map(function (s) { return s.valores[i]; })); }), fmt) +
      '</figure>';
  }

  /* ───────────────────────── Anillo (donut) con leyenda ─────────────────────────
     o.partes [{ etiqueta, valor, color }] · o.centro { valor, rotulo } (por defecto el total) · o.formato · o.titulo */
  function anillo(o) {
    var op = o || {};
    var partes = (Array.isArray(op.partes) ? op.partes : []).map(function (p, i) { return { etiqueta: String(p.etiqueta || ''), valor: aNum(p.valor), color: color(p.color || i + 1) }; });
    var total = suma(partes.map(function (p) { return p.valor; }));
    var fmt = op.formato || 'num';
    var titulo = op.titulo || 'Reparto';
    if (!partes.length || !total) return estadoVacio(op.vacio);
    var activas = partes.filter(function (p) { return p.valor > 0; });
    var hueco = activas.length > 1 ? 3 : 0;
    var acum = 0;
    var segs = partes.map(function (p, i) {
      if (p.valor <= 0) return '';
      var largo = p.valor / total * CIRC;
      var dibujo = Math.max(1, largo - hueco);
      var s = '<circle class="zg-anillo__seg zg-c' + p.color + '" data-i="' + i + '" cx="60" cy="60" r="48" fill="none" stroke-width="15" stroke-dasharray="' + redondear(dibujo, 2) + ' ' + redondear(CIRC - dibujo, 2) + '" stroke-dashoffset="' + redondear(-acum, 2) + '" transform="rotate(-90 60 60)"/>';
      acum += largo;
      return s;
    }).join('');
    var centro = op.centro || { valor: formatear(total, fmt), rotulo: 'en total' };
    var resumen = titulo + ': ' + partes.map(function (p) { return p.etiqueta + ' ' + formatear(p.valor, fmt) + ' (' + Math.round(p.valor / total * 100) + ' %)'; }).join('; ') + '.';
    var datos = { p: partes.map(function (p) { return { e: p.etiqueta, v: p.valor, c: p.color }; }), t: total, f: fmt, c: centro };
    var leyenda = '<ul class="zg-anillo__leyenda">' + partes.map(function (p, i) {
      return '<li tabindex="0" data-i="' + i + '"><span class="zg__sw zg-c' + p.color + '" aria-hidden="true"></span><span class="zg-anillo__txt">' + esc(p.etiqueta) + '</span><strong>' + esc(formatear(p.valor, fmt)) + '</strong><span class="zg-anillo__pct">' + Math.round(p.valor / total * 100) + ' %</span></li>';
    }).join('') + '</ul>';
    return '<figure class="zg zg-anillo" data-zg-anillo="' + esc(JSON.stringify(datos)) + '" role="group" aria-label="' + esc(titulo) + '">' +
      '<div class="zg-anillo__fila"><div class="zg-anillo__graf" role="img" aria-label="' + esc(resumen) + '">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle class="zg-anillo__pista" cx="60" cy="60" r="48" fill="none" stroke-width="15"/>' + segs + '</svg>' +
      '<div class="zg-anillo__centro" aria-hidden="true"><strong>' + esc(centro.valor) + '</strong><span>' + esc(centro.rotulo) + '</span></div></div>' +
      leyenda + '</div>' +
      tablaAlterna(titulo, ['Parte', 'Valor', 'Porcentaje'], partes.map(function (p) { return [p.etiqueta, p.valor, Math.round(p.valor / total * 100) + ' %']; }), fmt) +
      '</figure>';
  }

  /* ───────────────────────── Barras horizontales con valores ─────────────────────────
     o.filas [{ etiqueta, valor, nota, color }] · o.formato · o.color (por defecto 1) · o.titulo · o.total (para mostrar %) */
  function barrasH(o) {
    var op = o || {};
    var filas = Array.isArray(op.filas) ? op.filas : [];
    var fmt = op.formato || 'num';
    var titulo = op.titulo || 'Ranking';
    if (!filas.length || !suma(filas.map(function (f) { return f.valor; }))) return estadoVacio(op.vacio);
    var max = Math.max.apply(null, filas.map(function (f) { return aNum(f.valor); }).concat([1]));
    var total = op.total ? aNum(op.total) : suma(filas.map(function (f) { return f.valor; }));
    return '<figure class="zg zg-bh" role="group" aria-label="' + esc(titulo) + '"><ol class="zg-bh__lista">' + filas.map(function (f, i) {
      var v = aNum(f.valor);
      var ancho = v > 0 ? Math.max(2, redondear(v / max * 100, 1)) : 0;
      var c = color(f.color || op.color || (op.variado ? i + 1 : 1));
      var pct = op.porcentaje === false ? '' : '<span class="zg-bh__pct">' + Math.round(v / (total || 1) * 100) + ' %</span>';
      return '<li><span class="zg-bh__t">' + esc(f.etiqueta) + (f.nota ? '<small>' + esc(f.nota) + '</small>' : '') + '</span>' +
        '<span class="zg-bh__n"><strong>' + esc(formatear(v, fmt)) + '</strong>' + pct + '</span>' +
        '<span class="zg-bh__b" aria-hidden="true"><i class="zg-c' + c + '" style="width:' + ancho + '%"></i></span></li>';
    }).join('') + '</ol>' +
      tablaAlterna(titulo, ['Elemento', 'Valor'], filas.map(function (f) { return [f.etiqueta, aNum(f.valor)]; }), fmt) + '</figure>';
  }

  /* ───────────────────────── Mapa de calor (día × hora, etc.) ─────────────────────────
     o.filas [{ etiqueta, valores:[...] }] · o.columnas [etiquetas] · o.mostrarCada (cada cuántas columnas se rotula) · o.unidad */
  function nivelCalor(v, max) {
    if (!(v > 0) || !(max > 0)) return 0;
    var r = v / max;
    return r <= 0.2 ? 1 : r <= 0.4 ? 2 : r <= 0.6 ? 3 : r <= 0.8 ? 4 : 5;
  }
  function mapaCalor(o) {
    var op = o || {};
    var filas = Array.isArray(op.filas) ? op.filas : [];
    var cols = Array.isArray(op.columnas) ? op.columnas : [];
    var titulo = op.titulo || 'Mapa de calor';
    var max = 0;
    filas.forEach(function (f) { (f.valores || []).forEach(function (v) { if (aNum(v) > max) max = aNum(v); }); });
    if (!filas.length || !cols.length || !max) return estadoVacio(op.vacio);
    var cada = op.mostrarCada || 3;
    var unidad = op.unidad || 'eventos';
    var pico = { f: 0, c: 0, v: -1 };
    var celdas = filas.map(function (f, fi) {
      return '<span class="zg-hm__f">' + esc(f.etiqueta) + '</span>' + cols.map(function (c, ci) {
        var v = aNum((f.valores || [])[ci]);
        if (v > pico.v) pico = { f: fi, c: ci, v: v };
        var texto = f.etiqueta + ' ' + c + ' · ' + formatear(v, 'num') + ' ' + unidad;
        return '<i class="zg-hm__c zg-hm--' + nivelCalor(v, max) + '" data-tip="' + esc(texto) + '"></i>';
      }).join('');
    }).join('');
    var rotulos = '<span class="zg-hm__f"></span>' + cols.map(function (c, ci) { return '<span class="zg-hm__h">' + (ci % cada === 0 ? esc(c) : '') + '</span>'; }).join('');
    var resumen = titulo + '. El momento con más actividad es ' + filas[pico.f].etiqueta + ' a las ' + cols[pico.c] + ' con ' + formatear(pico.v, 'num') + ' ' + unidad + '.';
    return '<figure class="zg zg-hm" data-zg-calor role="group" aria-label="' + esc(titulo) + '">' +
      '<div class="zg-hm__rejilla" style="--zg-cols:' + cols.length + '" role="img" aria-label="' + esc(resumen) + '">' + celdas + rotulos + '</div>' +
      '<div class="zg-hm__escala" aria-hidden="true"><span>Menos</span>' + [0, 1, 2, 3, 4, 5].map(function (n) { return '<i class="zg-hm__c zg-hm--' + n + '"></i>'; }).join('') + '<span>Más</span></div>' +
      '<div class="zg__tip" hidden></div>' +
      tablaAlterna(titulo, [''].concat(cols), filas.map(function (f) { return [f.etiqueta].concat(cols.map(function (_, ci) { return aNum((f.valores || [])[ci]); })); }), 'num') + '</figure>';
  }

  /* ───────────────────────── Ranking de barras horizontales (cursos más elegidos, completados...) ─────────────────────────
     o.filas [{ etiqueta, valor }] (se ordenan de mayor a menor) · o.maximo (cuántas se ven; el resto, con «Ver todos»)
     o.total (para el porcentaje; por defecto la suma de las filas) · o.unidad («personas») · o.color · o.titulo · o.vacio
     Cada fila: lugar, nombre COMPLETO (con salto de línea, sin recortar), barra de color sólido y, al final, valor y porcentaje. */
  function porcentajeTexto(v, total) {
    if (!(v > 0) || !(total > 0)) return '0 %';
    var p = Math.round(v / total * 100);
    return (p === 0 ? '<1' : p) + ' %';
  }
  function ranking(o) {
    var op = o || {};
    var filas = (Array.isArray(op.filas) ? op.filas : []).map(function (f) { return { etiqueta: String(f.etiqueta || ''), valor: aNum(f.valor) }; })
      .filter(function (f) { return f.valor > 0; });
    var titulo = op.titulo || 'Ranking';
    if (!filas.length) return estadoVacio(op.vacio);
    filas.sort(function (a, b) { return b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta, 'es'); });
    var maximo = op.maximo > 0 ? Math.round(op.maximo) : 8;
    var max = filas[0].valor;
    var total = op.total ? aNum(op.total) : suma(filas.map(function (f) { return f.valor; }));
    var unidad = op.unidad || '';
    var c = color(op.color || 1);
    var lista = filas.map(function (f, i) {
      var ancho = Math.max(2, redondear(f.valor / max * 100, 1));
      return '<li class="zg-rk__fila"' + (i >= maximo ? ' hidden data-zg-extra' : '') + '><span class="zg-rk__n" aria-hidden="true">' + (i + 1) + '</span>' +
        '<div class="zg-rk__c"><span class="zg-rk__t"><span class="sr-only">Lugar ' + (i + 1) + ': </span>' + esc(f.etiqueta) + '</span>' +
        '<div class="zg-rk__linea"><span class="zg-rk__b" aria-hidden="true"><i class="zg-c' + c + '" style="width:' + ancho + '%"></i></span>' +
        '<span class="zg-rk__v"><strong>' + esc(formatear(f.valor, 'num')) + '</strong>' + (unidad ? '<span class="sr-only"> ' + esc(unidad) + ',</span>' : '') +
        '<small>' + esc(porcentajeTexto(f.valor, total)) + '</small></span></div></div></li>';
    }).join('');
    var resumen = 'En primer lugar: ' + filas[0].etiqueta + ', con ' + formatear(filas[0].valor, 'num') + (unidad ? ' ' + unidad : '') + ' (' + porcentajeTexto(filas[0].valor, total) + ' del total de ' + formatear(total, 'num') + ').';
    return '<figure class="zg zg-rk" role="group" aria-label="' + esc(titulo) + '"><p class="sr-only">' + esc(resumen) + '</p>' +
      '<ol class="zg-rk__lista">' + lista + '</ol>' +
      (filas.length > maximo ? '<button type="button" class="ap-btn ap-btn--suave zg-rk__todos" data-zg-todos aria-expanded="false" data-total="' + filas.length + '" data-maximo="' + maximo + '">Ver todos (' + filas.length + ')</button>' : '') +
      '<p class="zg-rk__escala">Cada barra se compara con el primer lugar; el porcentaje es la parte del total (' + esc(formatear(total, 'num')) + (unidad ? ' ' + esc(unidad) : '') + ').</p></figure>';
  }

  /* ───────────────────────── Embudo de pasos ─────────────────────────
     o.etapas [{ etiqueta, valor, frase }] (frase: cómo se dice en plural en la oración final, «eligen su prueba»)
     o.unidad («cuentas nuevas») · o.titulo · o.vacio
     Barras decrecientes con el número absoluto, el porcentaje frente al paso anterior y frente al total, y una frase de interpretación. */
  function fraseEmbudo(etapas, unidad) {
    var lista = Array.isArray(etapas) ? etapas : [];
    var primero = lista.length ? aNum(lista[0].valor) : 0;
    if (!primero || lista.length < 2) return '';
    var u = unidad || 'personas';
    var partes = lista.slice(1).map(function (e) {
      var n = aNum(e.valor) / primero * 10;
      // Número, no palabra, para que concuerde siempre: «0 terminan», «0,3 terminan», «4 eligen»
      var texto = n === 0 ? '0' : n < 1 ? String(Math.round(n * 10) / 10).replace('.', ',') : String(Math.round(n));
      if (texto === '0' && n > 0) texto = '0,1';
      return texto + ' ' + String(e.frase || e.etiqueta).toLowerCase();
    });
    var cola = partes.length > 1 ? partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1] : partes[0];
    return 'De cada 10 ' + u + ', ' + cola + '.';
  }
  function embudo(o) {
    var op = o || {};
    var etapas = Array.isArray(op.etapas) ? op.etapas : [];
    var titulo = op.titulo || 'Embudo';
    if (!etapas.length || !aNum(etapas[0].valor)) return estadoVacio(op.vacio);
    var primero = aNum(etapas[0].valor);
    var pasos = etapas.map(function (e, i) {
      var v = aNum(e.valor);
      var previo = i ? aNum(etapas[i - 1].valor) : 0;
      var deTotal = Math.round(v / primero * 100);
      var dePrevio = i && previo ? Math.round(v / previo * 100) : null;
      var ancho = v > 0 ? Math.max(3, redondear(v / primero * 100, 1)) : 0;
      return '<li class="zg-fn__paso">' +
        (i ? '<div class="zg-fn__conv">' + (dePrevio === null ? '' : '<strong>' + dePrevio + ' %</strong> pasa al siguiente paso') + '</div>' : '') +
        '<div class="zg-fn__cab"><span class="zg-fn__t"><b aria-hidden="true">' + (i + 1) + '</b>' + esc(e.etiqueta) + '</span>' +
        '<span class="zg-fn__n"><strong>' + esc(formatear(v, 'num')) + '</strong><small>' + (i === 0 ? 'punto de partida' : deTotal + ' % del total') + '</small></span></div>' +
        '<span class="zg-fn__b" aria-hidden="true"><i class="zg-c' + color(i + 1) + '" style="width:' + ancho + '%"></i></span>' +
        (e.nota ? '<p class="zg-fn__nota">' + esc(e.nota) + '</p>' : '') + '</li>';
    }).join('');
    var frase = fraseEmbudo(etapas, op.unidad || 'personas');
    return '<figure class="zg zg-fn" role="group" aria-label="' + esc(titulo) + '"><ol class="zg-fn__lista">' + pasos + '</ol>' +
      (frase ? '<p class="zg-fn__frase" role="note"><strong>Cómo leerlo:</strong> ' + esc(frase) + '</p>' : '') +
      tablaAlterna(titulo, ['Paso', 'Personas', 'Del total', 'Del paso anterior'], etapas.map(function (e, i) {
        var previo = i ? aNum(etapas[i - 1].valor) : 0;
        return [e.etiqueta, aNum(e.valor), Math.round(aNum(e.valor) / primero * 100) + ' %', i && previo ? Math.round(aNum(e.valor) / previo * 100) + ' %' : '—'];
      }), 'num') + '</figure>';
  }

  /* ───────────────────────── Barras apiladas (una barra por grupo, partida en sus partes) ─────────────────────────
     o.filas [{ etiqueta, segmentos:[{ etiqueta, valor }] }] · o.unidad («personas») · o.titulo · o.vacio
     Cada barra mide el 100 % de ese grupo y muestra cómo se reparte (color sólido por posición). Debajo, la leyenda de la fila con
     cada parte, su cantidad y su porcentaje: los valores nunca dependen del color ni de un tooltip. */
  function apiladas(o) {
    var op = o || {};
    var filas = (Array.isArray(op.filas) ? op.filas : []).map(function (f) {
      var segs = (Array.isArray(f.segmentos) ? f.segmentos : []).map(function (s) { return { etiqueta: String(s.etiqueta || ''), valor: aNum(s.valor) }; }).filter(function (s) { return s.valor > 0; });
      segs.sort(function (a, b) { return b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta, 'es'); });
      return { etiqueta: String(f.etiqueta || ''), segmentos: segs, total: suma(segs.map(function (s) { return s.valor; })) };
    }).filter(function (f) { return f.total > 0; });
    var titulo = op.titulo || 'Reparto por grupo';
    var unidad = op.unidad || 'personas';
    if (!filas.length) return estadoVacio(op.vacio);
    filas.sort(function (a, b) { return b.total - a.total || a.etiqueta.localeCompare(b.etiqueta, 'es'); });
    var lista = filas.map(function (f) {
      var barra = f.segmentos.map(function (s, i) {
        var p = s.valor / f.total * 100;
        return '<i class="zg-c' + color(i + 1) + '" style="width:' + redondear(p, 2) + '%" title="' + esc(s.etiqueta + ': ' + formatear(s.valor, 'num') + ' (' + Math.round(p) + ' %)') + '"></i>';
      }).join('');
      var ley = f.segmentos.map(function (s, i) {
        return '<li><span class="zg__sw zg-c' + color(i + 1) + '" aria-hidden="true"></span><span class="zg-ap__t">' + esc(s.etiqueta) + '</span><strong>' + esc(formatear(s.valor, 'num')) + '</strong><span class="zg-ap__p">' + Math.round(s.valor / f.total * 100) + ' %</span></li>';
      }).join('');
      return '<li class="zg-ap__fila"><div class="zg-ap__cab"><strong>' + esc(f.etiqueta) + '</strong><span>' + esc(formatear(f.total, 'num')) + ' ' + esc(unidad) + '</span></div>' +
        '<div class="zg-ap__barra" aria-hidden="true">' + barra + '</div><ul class="zg-ap__ley">' + ley + '</ul></li>';
    }).join('');
    var resumen = titulo + ': ' + filas.map(function (f) { return f.etiqueta + ', ' + f.segmentos.map(function (s) { return s.etiqueta + ' ' + formatear(s.valor, 'num'); }).join(', '); }).join('; ') + '.';
    return '<figure class="zg zg-ap" role="group" aria-label="' + esc(titulo) + '"><p class="sr-only">' + esc(resumen) + '</p><ol class="zg-ap__lista">' + lista + '</ol>' +
      tablaAlterna(titulo, ['Grupo', 'Parte', 'Valor'], filas.reduce(function (t, f) { return t.concat(f.segmentos.map(function (s) { return [f.etiqueta, s.etiqueta, s.valor]; })); }, []), 'num') + '</figure>';
  }

  /* ───────────────────────── Comportamiento en el navegador (tooltips) ───────────────────────── */
  var abiertas = [];
  var oyente = false;
  function leerDatos(el, atributo) { try { return JSON.parse(el.getAttribute(atributo)); } catch (e) { return null; } }

  function filaTip(color_, nombre, valor) {
    return '<li><span class="zg__sw zg-c' + color_ + '" aria-hidden="true"></span><span>' + esc(nombre) + '</span><b>' + esc(valor) + '</b></li>';
  }

  function activarSerie(fig) {
    var d = leerDatos(fig, 'data-zg');
    var plot = fig.querySelector('.zg__plot');
    if (!d || !plot) return;
    var n = d.e.length;
    var tip = plot.querySelector('.zg__tip');
    var guia = plot.querySelector('.zg__guia');
    var puntos = plot.querySelectorAll('.zg__dot');
    var columnas = plot.querySelectorAll('.zg__col');
    var actual = -1;
    function mostrar(i) {
      i = Math.max(0, Math.min(n - 1, i));
      actual = i;
      var x = (i + 0.5) / n * 100;
      guia.hidden = false; guia.style.left = x + '%';
      columnas.forEach(function (c, k) { c.classList.toggle('is-sel', k === i); });
      puntos.forEach(function (p) {
        var s = d.s[Number(p.getAttribute('data-s'))];
        if (!s) return;
        p.hidden = false; p.style.left = x + '%'; p.style.bottom = (s.v[i] / d.m * 100) + '%';
      });
      tip.innerHTML = '<strong>' + esc(d.e[i]) + '</strong><ul>' + d.s.map(function (s) { return filaTip(s.c, s.n, formatear(s.v[i], d.f)); }).join('') + '</ul>';
      tip.hidden = false;
      tip.classList.toggle('zg__tip--izq', x > 55);
      tip.style.left = x + '%';
    }
    function ocultar() {
      actual = -1;
      guia.hidden = true; tip.hidden = true;
      puntos.forEach(function (p) { p.hidden = true; });
      columnas.forEach(function (c) { c.classList.remove('is-sel'); });
    }
    function indiceDe(ev) {
      var r = plot.getBoundingClientRect();
      return Math.floor((ev.clientX - r.left) / Math.max(1, r.width) * n);
    }
    plot.addEventListener('pointermove', function (ev) { mostrar(indiceDe(ev)); });
    plot.addEventListener('pointerdown', function (ev) { mostrar(indiceDe(ev)); });
    plot.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') ocultar(); });
    plot.addEventListener('focus', function () { if (actual < 0) mostrar(n - 1); });
    plot.addEventListener('blur', ocultar);
    plot.addEventListener('keydown', function (ev) {
      var k = ev.key;
      if (k === 'ArrowRight') { ev.preventDefault(); mostrar((actual < 0 ? -1 : actual) + 1); }
      else if (k === 'ArrowLeft') { ev.preventDefault(); mostrar((actual < 0 ? n : actual) - 1); }
      else if (k === 'Home') { ev.preventDefault(); mostrar(0); }
      else if (k === 'End') { ev.preventDefault(); mostrar(n - 1); }
      else if (k === 'Escape') ocultar();
    });
    // Al tocar fuera (en pantallas táctiles) se cierra: un solo oyente para todas las gráficas
    abiertas.push({ fig: fig, abierta: function () { return actual >= 0; }, ocultar: ocultar });
    if (!oyente && typeof document !== 'undefined') {
      oyente = true;
      document.addEventListener('pointerdown', function (ev) {
        for (var q = abiertas.length - 1; q >= 0; q--) {
          var a = abiertas[q];
          if (!document.contains(a.fig)) { abiertas.splice(q, 1); continue; }
          if (a.abierta() && !a.fig.contains(ev.target)) a.ocultar();
        }
      });
    }
  }

  function activarAnillo(fig) {
    var d = leerDatos(fig, 'data-zg-anillo');
    if (!d) return;
    var segs = fig.querySelectorAll('.zg-anillo__seg');
    var filas = fig.querySelectorAll('.zg-anillo__leyenda li');
    var cValor = fig.querySelector('.zg-anillo__centro strong');
    var cRotulo = fig.querySelector('.zg-anillo__centro span');
    function resaltar(i) {
      var p = d.p[i];
      fig.classList.add('zg--resalte');
      segs.forEach(function (s) { s.classList.toggle('is-sel', Number(s.getAttribute('data-i')) === i); });
      filas.forEach(function (f) { f.classList.toggle('is-sel', Number(f.getAttribute('data-i')) === i); });
      cValor.textContent = formatear(p.v, d.f);
      cRotulo.textContent = p.e + ' · ' + Math.round(p.v / d.t * 100) + ' %';
    }
    function limpiar() {
      fig.classList.remove('zg--resalte');
      segs.forEach(function (s) { s.classList.remove('is-sel'); });
      filas.forEach(function (f) { f.classList.remove('is-sel'); });
      cValor.textContent = d.c.valor; cRotulo.textContent = d.c.rotulo;
    }
    [].concat([].slice.call(segs), [].slice.call(filas)).forEach(function (el) {
      var i = Number(el.getAttribute('data-i'));
      el.addEventListener('pointerenter', function () { resaltar(i); });
      el.addEventListener('pointerleave', limpiar);
      el.addEventListener('focus', function () { resaltar(i); });
      el.addEventListener('blur', limpiar);
      el.addEventListener('pointerdown', function () { resaltar(i); });
    });
  }

  function activarCalor(fig) {
    var tip = fig.querySelector('.zg__tip');
    var rej = fig.querySelector('.zg-hm__rejilla');
    if (!tip || !rej) return;
    function ver(ev) {
      var c = ev.target.closest ? ev.target.closest('.zg-hm__c[data-tip]') : null;
      if (!c) { tip.hidden = true; return; }
      var r = c.getBoundingClientRect(); var f = fig.getBoundingClientRect();
      tip.textContent = c.getAttribute('data-tip');
      tip.hidden = false;
      tip.style.left = Math.max(8, Math.min(f.width - 8, r.left - f.left + r.width / 2)) + 'px';
      tip.style.top = (r.top - f.top - 6) + 'px';
    }
    rej.addEventListener('pointermove', ver);
    rej.addEventListener('pointerdown', ver);
    rej.addEventListener('pointerleave', function () { tip.hidden = true; });
  }

  // En pantallas angostas las etiquetas del eje horizontal se pisan: se ocultan las que chocan con la anterior (la última siempre se queda)
  function ajustarEtiquetas(fig) {
    var items = [].slice.call(fig.querySelectorAll('.zg__x li'));
    if (items.length < 2) return;
    items.forEach(function (li) { li.style.visibility = ''; });
    var previo = null;
    items.forEach(function (li, i) {
      var r = li.getBoundingClientRect();
      if (!r.width) return;
      if (previo && r.left < previo.right + 8) {
        if (i === items.length - 1) { previo.li.style.visibility = 'hidden'; previo = { li: li, right: r.right }; }
        else li.style.visibility = 'hidden';
        return;
      }
      previo = { li: li, right: r.right };
    });
  }
  var porAjustar = [];
  var oyenteTamano = false;
  function ajustarTodas() {
    for (var q = porAjustar.length - 1; q >= 0; q--) {
      if (!document.contains(porAjustar[q])) { porAjustar.splice(q, 1); continue; }
      ajustarEtiquetas(porAjustar[q]);
    }
  }

  // Activa los tooltips de todas las gráficas dentro de raiz (se puede llamar varias veces: cada una se activa una sola vez).
  function activar(raiz) {
    if (!raiz || !raiz.querySelectorAll) return;
    raiz.querySelectorAll('[data-zg]').forEach(function (f) { if (!f.__zg) { f.__zg = true; activarSerie(f); porAjustar.push(f); ajustarEtiquetas(f); } });
    if (!oyenteTamano && typeof window !== 'undefined') {
      oyenteTamano = true;
      var espera = null;
      window.addEventListener('resize', function () { clearTimeout(espera); espera = setTimeout(ajustarTodas, 120); });
    }
    raiz.querySelectorAll('[data-zg-anillo]').forEach(function (f) { if (!f.__zg) { f.__zg = true; activarAnillo(f); } });
    raiz.querySelectorAll('[data-zg-calor]').forEach(function (f) { if (!f.__zg) { f.__zg = true; activarCalor(f); } });
  }

  // «Ver todos» / «Ver solo los primeros» de los rankings (un oyente para toda la página)
  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-zg-todos]') : null;
      if (!b) return;
      var fig = b.closest('.zg-rk');
      if (!fig) return;
      var abrir = b.getAttribute('aria-expanded') !== 'true';
      fig.querySelectorAll('[data-zg-extra]').forEach(function (li) { li.hidden = !abrir; });
      b.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      b.textContent = abrir ? 'Ver solo los ' + b.getAttribute('data-maximo') + ' primeros' : 'Ver todos (' + b.getAttribute('data-total') + ')';
    });
  }

  return {
    COLORES: COLORES, formatear: formatear, abreviar: abreviar, escalaY: escalaY, indicesEtiquetas: indicesEtiquetas, nivelCalor: nivelCalor,
    estadoVacio: estadoVacio, sparkline: sparkline, serie: serie, anillo: anillo, barrasH: barrasH, ranking: ranking, apiladas: apiladas, mapaCalor: mapaCalor, embudo: embudo, fraseEmbudo: fraseEmbudo, activar: activar
  };
});
