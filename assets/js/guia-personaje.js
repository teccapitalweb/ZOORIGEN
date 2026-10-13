/* ============================================================ */
/* JAGUARITO · personaje guía de la portada                      */
/*                                                                */
/* Datos y lógica pura (sin DOM) que comparten la encuesta        */
/* (encuesta-landing.js) y la Guía Zoorigen (chatbot-landing.js): */
/* qué imagen corresponde a cada expresión del motor de la        */
/* encuesta, qué imágenes conviene precargar y en qué orden, y la */
/* secuencia del saludo. Se prueba en Node (tests/guia-personaje).*/
/*                                                                */
/* Las imágenes son WebP con transparencia (assets/img/guia/).    */
/* Los PNG originales de esa carpeta NO se usan en el sitio.      */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_GUIA = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CARPETA = 'assets/img/guia/';

  // Expresión del motor (encuesta-motor.js) -> imagen del busto (640x640).
  var IMAGENES_EXPR = {
    neutral: CARPETA + 'guia-bienvenida.webp',
    thinking: CARPETA + 'guia-pensando.webp',
    confused: CARPETA + 'guia-confundido.webp',
    concerned: CARPETA + 'guia-preocupado.webp',
    surprised: CARPETA + 'guia-sorprendido.webp',
    happy: CARPETA + 'guia-feliz.webp',
    excited: CARPETA + 'guia-emocionado.webp'
  };

  var EXPRESIONES = ['neutral', 'thinking', 'confused', 'concerned', 'surprised', 'happy', 'excited'];

  // Cuadros auxiliares de la animación (mismo busto, otra pose).
  var CUADROS = {
    saludo1: CARPETA + 'guia-saludo-1.webp',
    saludo2: CARPETA + 'guia-saludo-2.webp',
    parpadeo: CARPETA + 'guia-parpadeo.webp'
  };

  // Solo cara y sombrero, para círculos pequeños.
  var AVATAR = CARPETA + 'guia-avatar.webp';        // 256x256
  var AVATAR_CHICO = CARPETA + 'guia-avatar-128.webp'; // 128x128

  // El parpadeo y el saludo parten de la pose de bienvenida: solo ahí se usan.
  var EXPR_BASE = 'neutral';

  function esExpresion(expr) {
    return Object.prototype.hasOwnProperty.call(IMAGENES_EXPR, expr);
  }

  // Imagen para una expresión; si no existe, la de bienvenida.
  function imagenExpresion(expr, mapa) {
    var m = mapa && typeof mapa === 'object' ? mapa : IMAGENES_EXPR;
    if (typeof expr === 'string' && Object.prototype.hasOwnProperty.call(m, expr) && m[expr]) return m[expr];
    return m[EXPR_BASE] || IMAGENES_EXPR[EXPR_BASE];
  }

  // Expresión que realmente se muestra (la pedida si existe; si no, 'neutral').
  function expresionEfectiva(expr) {
    return esExpresion(expr) ? expr : EXPR_BASE;
  }

  // Orden de precarga: primero lo que se ve al llegar, luego lo que más sale en las
  // primeras respuestas (feliz, pensando, sorprendido) y al final lo menos frecuente.
  var ORDEN_PRECARGA = ['neutral', 'saludo1', 'saludo2', 'happy', 'thinking', 'surprised', 'concerned', 'confused', 'excited', 'parpadeo'];

  function rutaDeClave(clave, mapa) {
    if (Object.prototype.hasOwnProperty.call(CUADROS, clave)) return CUADROS[clave];
    return imagenExpresion(clave, mapa);
  }

  // Lista (sin repetidos) de rutas a precargar, en orden. `mapa` opcional sustituye el de expresiones.
  function rutasPrecarga(mapa) {
    var vistas = {};
    var salida = [];
    ORDEN_PRECARGA.forEach(function (clave) {
      var r = rutaDeClave(clave, mapa);
      if (r && !vistas[r]) { vistas[r] = true; salida.push(r); }
    });
    return salida;
  }

  // Todas las imágenes que el sitio puede pedir de esta carpeta (para pruebas y revisiones).
  function todasLasRutas() {
    var vistas = {};
    var salida = [];
    [IMAGENES_EXPR, CUADROS].forEach(function (grupo) {
      Object.keys(grupo).forEach(function (k) { if (!vistas[grupo[k]]) { vistas[grupo[k]] = true; salida.push(grupo[k]); } });
    });
    [AVATAR, AVATAR_CHICO].forEach(function (r) { if (!vistas[r]) { vistas[r] = true; salida.push(r); } });
    return salida;
  }

  // Saludo: el saludo-1 y el saludo-2 se alternan (la patita se menea) y al final regresa a la
  // pose de bienvenida. Cada cuadro: { clave, ruta, ms }. El último ('neutral') dura 0: es el reposo.
  var MS_CUADRO_SALUDO = 230;
  function secuenciaSaludo(vueltas, ms) {
    var n = Math.max(1, Math.min(4, Math.floor(Number(vueltas)) || 2));
    var dur = Math.max(80, Math.min(600, Math.floor(Number(ms)) || MS_CUADRO_SALUDO));
    var cuadros = [];
    for (var i = 0; i < n; i++) {
      cuadros.push({ clave: 'saludo1', ruta: CUADROS.saludo1, ms: dur });
      cuadros.push({ clave: 'saludo2', ruta: CUADROS.saludo2, ms: dur });
    }
    cuadros.push({ clave: EXPR_BASE, ruta: IMAGENES_EXPR[EXPR_BASE], ms: 0 });
    return cuadros;
  }

  function duracionSaludo(vueltas, ms) {
    return secuenciaSaludo(vueltas, ms).reduce(function (t, c) { return t + c.ms; }, 0);
  }

  // Parpadeo ocasional: espera entre parpadeos (ms). `azar` es un número en [0,1).
  var PARPADEO_MIN_MS = 3200;
  var PARPADEO_MAX_MS = 7000;
  var PARPADEO_DURA_MS = 140;
  function esperaParpadeo(azar) {
    var a = Number(azar);
    if (!isFinite(a) || a < 0) a = 0;
    if (a > 0.9999) a = 0.9999;
    return Math.round(PARPADEO_MIN_MS + a * (PARPADEO_MAX_MS - PARPADEO_MIN_MS));
  }

  // ¿Puede parpadear ahora? Solo en la pose de bienvenida, sin saludo en curso, con la guía a la
  // vista, con la pestaña visible y sin "reducir movimiento".
  function puedeParpadear(estado) {
    var e = estado || {};
    return !!e.visible && !!e.pestanaVisible && !e.reducido && !e.saludando && e.expresion === EXPR_BASE;
  }

  // ¿Puede saludar ahora? Mismas reglas; en la encuesta además solo en la primera pregunta.
  function puedeSaludar(estado) {
    var e = estado || {};
    return !!e.visible && !!e.pestanaVisible && !e.reducido && !e.saludando && e.expresion === EXPR_BASE;
  }

  return {
    CARPETA: CARPETA,
    IMAGENES_EXPR: IMAGENES_EXPR,
    EXPRESIONES: EXPRESIONES,
    CUADROS: CUADROS,
    AVATAR: AVATAR,
    AVATAR_CHICO: AVATAR_CHICO,
    EXPR_BASE: EXPR_BASE,
    ORDEN_PRECARGA: ORDEN_PRECARGA,
    MS_CUADRO_SALUDO: MS_CUADRO_SALUDO,
    PARPADEO_DURA_MS: PARPADEO_DURA_MS,
    esExpresion: esExpresion,
    imagenExpresion: imagenExpresion,
    expresionEfectiva: expresionEfectiva,
    rutasPrecarga: rutasPrecarga,
    todasLasRutas: todasLasRutas,
    secuenciaSaludo: secuenciaSaludo,
    duracionSaludo: duracionSaludo,
    esperaParpadeo: esperaParpadeo,
    puedeParpadear: puedeParpadear,
    puedeSaludar: puedeSaludar
  };
}));
