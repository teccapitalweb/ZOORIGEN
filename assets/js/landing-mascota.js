/* ============================================================ */
/* PORTADA · JAGUARITO SE ASOMA                                   */
/* Cuando la persona se detiene en un apartado, el personaje guía */
/* (el mismo del botón "Tu guía Zoorigen") se asoma por el borde  */
/* superior de UNA tarjeta: primero la manita, luego la cabeza y  */
/* la manita, y vuelve a ocultarse (~3.6 s).                      */
/*                                                                */
/* Imagen: assets/img/guia/guia-saludo-1.webp (ya existente).     */
/* Secciones elegibles: las que tienen data-mascota="<selector de */
/* sus tarjetas>" en index.html (hoy: pasos, beneficios, estudio  */
/* a la práctica y cursos). Para quitar una, borra el atributo;   */
/* para agregar otra, ponlo en su <section>.                      */
/*                                                                */
/* Reglas: máximo 4 apariciones por visita, 8 s de enfriamiento,  */
/* una vez por sección, solo con pausa de ~1.2 s sin scroll ni    */
/* movimiento y la sección visible al 50 % o más. No aparece con  */
/* "reducir movimiento", con la pestaña oculta, con el chatbot o  */
/* un modal abiertos. Solo transform y opacity.                   */
/* ============================================================ */
(function () {
  'use strict';
  if (!window.matchMedia || !document.querySelector) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // prefiero que no aparezca
  if (typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return;

  var IMG = 'assets/img/guia/guia-saludo-1.webp';
  var MAX_POR_VISITA = 4;
  var ENFRIAMIENTO = 8000;     // ms entre apariciones
  var PAUSA = 1200;            // ms sin actividad para considerar que se detuvo
  var DURACION = 3600;         // ms de la animación completa
  var VISIBLE_MIN = 0.5;       // fracción visible de la sección

  var usadas = [];
  var total = 0;
  var ultima = -1e9;
  var temporizador = 0;
  var activa = null;

  function secciones() { return Array.prototype.slice.call(document.querySelectorAll('[data-mascota]')); }
  function chatbotAbierto() { return !!document.querySelector('.zg-panel:not([hidden])'); }
  function modalAbierto() { return !!document.querySelector('#courseModal.is-open, #lightbox.is-open'); }
  function bloqueado() {
    return document.hidden || !!activa || chatbotAbierto() || modalAbierto() || (performance.now() - ultima < ENFRIAMIENTO);
  }

  function actividad() {
    if (total >= MAX_POR_VISITA) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(revisar, PAUSA);
  }

  function medidas() {
    var chico = window.innerWidth < 560;
    return { ancho: chico ? 52 : 72, alto: chico ? 28 : 36 };
  }

  // ¿La ventana donde se asoma toca algún texto de la sección? (se mide el texto real, no la caja del bloque)
  function chocaConTexto(seccion, ventana) {
    var nodos = seccion.querySelectorAll('h1,h2,h3,h4,p,li,a,button,strong,small,span,label,blockquote');
    var rango = document.createRange();
    for (var i = 0; i < nodos.length; i++) {
      var n = nodos[i];
      if (n.closest('.zs-mascota')) continue;
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType !== 3 || !c.nodeValue.trim()) continue;
        rango.selectNodeContents(c);
        var rs = rango.getClientRects();
        for (var k = 0; k < rs.length; k++) {
          var q = rs[k];
          if (q.width && q.height && q.left < ventana.right && q.right > ventana.left && q.top < ventana.bottom && q.bottom > ventana.top) return true;
        }
      }
    }
    return false;
  }

  function revisar() {
    if (total >= MAX_POR_VISITA) return;
    if (bloqueado()) { temporizador = setTimeout(revisar, PAUSA); return; }
    var vh = window.innerHeight, vw = window.innerWidth;
    var m = medidas();
    var candidatas = [];
    secciones().forEach(function (s) {
      if (usadas.indexOf(s) >= 0) return;
      var r = s.getBoundingClientRect();
      var visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visible <= 0) return;
      var ratio = visible / Math.min(r.height, vh);
      if (ratio >= VISIBLE_MIN) candidatas.push({ s: s, ratio: ratio });
    });
    candidatas.sort(function (a, b) { return b.ratio - a.ratio; });
    for (var i = 0; i < candidatas.length; i++) {
      var s = candidatas[i].s;
      var tarjetas = Array.prototype.slice.call(s.querySelectorAll(s.getAttribute('data-mascota'))).filter(function (t) {
        var r = t.getBoundingClientRect();
        // completa en pantalla, con sitio arriba para asomarse sin pisar el menú fijo
        if (!(r.width > 40 && r.height > 40 && r.top >= 90 && r.bottom <= vh && r.left >= 0 && r.right <= vw)) return false;
        var izq = r.right - m.ancho - 14;
        return !chocaConTexto(s, { left: izq, right: izq + m.ancho, top: r.top - m.alto, bottom: r.top });
      });
      if (!tarjetas.length) continue;
      // solo la fila superior de la sección (arriba no hay otra tarjeta ni texto que tapar)
      var tope = Math.min.apply(null, tarjetas.map(function (t) { return t.getBoundingClientRect().top; }));
      var fila = tarjetas.filter(function (t) { return t.getBoundingClientRect().top <= tope + 4; });
      var elegida = fila[Math.floor(Math.random() * fila.length)];
      mostrar(elegida, s, m);
      return;
    }
    // Nada elegible por ahora: se vuelve a intentar con la siguiente pausa
  }

  function mostrar(tarjeta, seccion, m) {
    var r = tarjeta.getBoundingClientRect();
    var caja = document.createElement('div');
    caja.className = 'zs-mascota';
    caja.setAttribute('aria-hidden', 'true');
    caja.style.width = m.ancho + 'px';
    caja.style.height = m.alto + 'px';
    // Sobre el borde superior de la tarjeta, hacia la derecha (el texto principal queda a la izquierda)
    caja.style.left = Math.round(r.right + window.scrollX - m.ancho - 14) + 'px';
    caja.style.top = Math.round(r.top + window.scrollY - m.alto) + 'px';
    var img = document.createElement('img');
    img.src = IMG;
    img.alt = '';
    img.width = m.ancho; img.height = m.ancho;
    img.draggable = false;
    img.style.width = m.ancho + 'px';
    img.style.willChange = 'transform';
    caja.appendChild(img);

    // Primer tiempo: SOLO la manita (recorte de la misma imagen, en el mismo sitio que ocupa la mano cuando el personaje
    // ya está asomado). Segundo tiempo: la cabeza y la manita suben y la manita sola se funde con la figura completa.
    var S = m.ancho;
    var cx = Math.round(S * 0.04), cy = Math.round(S * 0.30), cw = Math.round(S * 0.28), ch = Math.round(S * 0.24);
    var mano = document.createElement('div');
    mano.setAttribute('aria-hidden', 'true');
    mano.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden;' +
      'left:' + cx + 'px;top:' + cy + 'px;width:' + cw + 'px;height:' + ch + 'px;' +
      'background:url(' + IMG + ') no-repeat;background-size:' + S + 'px ' + S + 'px;background-position:-' + cx + 'px -' + cy + 'px;' +
      'transform-origin:50% 100%;';
    caja.appendChild(mano);
    document.body.appendChild(caja);

    var oculto = m.alto + 6;
    var bajaMano = m.alto - cy + 4;
    mano.animate([
      { offset: 0, easing: 'ease-in-out',    transform: 'translateY(' + bajaMano + 'px) rotate(0deg)', opacity: 1 },
      { offset: 0.14, easing: 'ease-in-out', transform: 'translateY(0px) rotate(-6deg)', opacity: 1 },
      { offset: 0.22, easing: 'ease-in-out', transform: 'translateY(0px) rotate(12deg)', opacity: 1 },
      { offset: 0.30, easing: 'ease-in-out', transform: 'translateY(0px) rotate(-10deg)', opacity: 1 },
      { offset: 0.38, easing: 'ease-in-out', transform: 'translateY(0px) rotate(8deg)', opacity: 1 },
      { offset: 0.46, easing: 'ease-in-out', transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
      { offset: 0.60, easing: 'ease-in-out', transform: 'translateY(0px) rotate(0deg)', opacity: 0 },
      { offset: 1, easing: 'ease-in-out',    transform: 'translateY(0px) rotate(0deg)', opacity: 0 }
    ], { duration: DURACION, easing: 'linear', fill: 'both' });

    var anim = img.animate([
      { offset: 0, easing: 'ease-in-out',    transform: 'translateY(' + oculto + 'px)', transformOrigin: '50% 100%' },
      { offset: 0.40, easing: 'ease-in-out', transform: 'translateY(' + oculto + 'px)', transformOrigin: '50% 100%' },
      { offset: 0.58, easing: 'ease-in-out', transform: 'translateY(0px) rotate(0deg)', transformOrigin: '50% 100%' },
      { offset: 0.80, easing: 'ease-in-out', transform: 'translateY(0px) rotate(0deg)', transformOrigin: '50% 100%' },
      { offset: 1, easing: 'ease-in-out',    transform: 'translateY(' + oculto + 'px)', transformOrigin: '50% 100%' }
    ], { duration: DURACION, easing: 'linear', fill: 'both' });

    activa = { caja: caja, anim: anim };
    total++;
    usadas.push(seccion);

    function terminar() {
      if (!activa || activa.caja !== caja) return;
      activa = null;
      ultima = performance.now();
      if (caja.parentNode) caja.parentNode.removeChild(caja);
      actividad();
    }
    anim.onfinish = terminar;
    anim.oncancel = terminar;
    // Un toque o clic en la mascota abre la guía (el chatbot)
    img.addEventListener('click', function () {
      var lanzador = document.querySelector('.zg-launcher');
      anim.cancel();
      if (lanzador) lanzador.click();
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && activa) activa.anim.cancel();
  });
  ['scroll', 'pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, actividad, { passive: true });
  });
  // Si la persona llega y no hace nada, también cuenta como pausa
  window.addEventListener('load', actividad);
  actividad();
})();
