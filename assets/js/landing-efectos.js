/* ============================================================ */
/* PORTADA · EFECTOS Y MOVIMIENTO                                 */
/* Estilos: assets/css/landing-secciones.css (todo detrás de      */
/* .zs-js, clase que pone un script del <head>).                  */
/*                                                                */
/* - Un solo IntersectionObserver: revelado una sola vez, estado  */
/*   visible de los bloques con paralaje y línea de pasos.        */
/* - Un solo escuchador de puntero delegado (inclinación 3D).     */
/* - Un solo escuchador de scroll con requestAnimationFrame.      */
/* - Solo transform / translate / scale / opacity.                */
/* - Reducir movimiento: sin revelado, inclinación, paralaje ni   */
/*   conteos animados; el contenido queda visible y quieto.       */
/* - Pantallas táctiles: sin inclinación por puntero.             */
/* ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var reducir = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var conRaton = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  var unico = typeof window.IntersectionObserver === 'function';

  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function limitar(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------------------------------------------------------- */
  /* 1. Elementos que no son "movimiento": también con reducir   */
  /* ---------------------------------------------------------- */

  // Pastilla que se desliza entre los chips de filtro
  function iniciarPastilla() {
    var cont = $('.zs-chips');
    if (!cont) return;
    var past = $('.zs-pastilla', cont);
    if (!past) {
      past = doc.createElement('span');
      past.className = 'zs-pastilla';
      past.setAttribute('aria-hidden', 'true');
      cont.insertBefore(past, cont.firstChild);
    }
    var primera = true;
    function colocar() {
      var act = $('.zs-chip.is-active', cont);
      if (!act || !act.offsetWidth) return;
      if (primera) past.style.transition = 'none';
      past.style.width = act.offsetWidth + 'px';
      past.style.height = act.offsetHeight + 'px';
      past.style.transform = 'translate(' + act.offsetLeft + 'px,' + act.offsetTop + 'px)';
      if (primera) {
        void past.offsetWidth;
        past.style.transition = '';
        primera = false;
        cont.classList.add('zs-con-pastilla');
      }
      if (cont.scrollWidth > cont.clientWidth + 2) {
        var izq = act.offsetLeft - (cont.clientWidth - act.offsetWidth) / 2;
        try { cont.scrollTo({ left: Math.max(0, izq), behavior: reducir ? 'auto' : 'smooth' }); } catch (e) { cont.scrollLeft = Math.max(0, izq); }
      }
    }
    colocar();
    new MutationObserver(colocar).observe(cont, { subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', colocar);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { primera = false; colocar(); });
  }

  // Contador de resultados: cuenta de un número a otro (y avisa el valor final a lectores de pantalla)
  function iniciarConteo() {
    var el = $('#coursesCount');
    var sr = $('#coursesCountSr');
    if (!el) return;
    var escrito = el.textContent;
    var raf = 0;
    if (sr) sr.textContent = el.textContent;
    function numero(t) { var m = String(t).match(/^(\d+)([\s\S]*)$/); return m ? { n: parseInt(m[1], 10), resto: m[2] } : null; }
    new MutationObserver(function () {
      var t = el.textContent;
      if (t === escrito) return;
      var hasta = numero(t);
      var desde = numero(escrito);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (sr) sr.textContent = t;
      if (reducir || !hasta || !desde || hasta.n === desde.n) { escrito = t; return; }
      var t0 = performance.now(), dur = 520;
      (function paso(ahora) {
        var p = limitar((ahora - t0) / dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        escrito = p >= 1 ? t : Math.round(desde.n + (hasta.n - desde.n) * e) + hasta.resto;
        el.textContent = escrito;
        raf = p < 1 ? requestAnimationFrame(paso) : 0;
      })(t0);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }

  // Carrusel de cursos: barra de progreso, flechas en los extremos y regreso al inicio al filtrar
  function iniciarCarrusel() {
    var carril = $('#coursesGrid');
    var barra = $('#coursesProgress');
    if (!carril) return;
    var contBarra = barra ? barra.parentNode : null;
    var prev = $('.carousel-arrow--prev[data-target="coursesGrid"]');
    var next = $('.carousel-arrow--next[data-target="coursesGrid"]');
    var rafId = 0;
    function medir() {
      rafId = 0;
      var max = carril.scrollWidth - carril.clientWidth;
      var hay = max > 4;
      if (contBarra) contBarra.hidden = !hay;
      if (barra) barra.style.setProperty('--prog', hay ? String(limitar(0.08 + 0.92 * (carril.scrollLeft / max), 0, 1).toFixed(3)) : '1');
      if (prev) prev.classList.toggle('is-fin', !hay || carril.scrollLeft <= 2);
      if (next) next.classList.toggle('is-fin', !hay || carril.scrollLeft >= max - 2);
    }
    function pedir() { if (!rafId) rafId = requestAnimationFrame(medir); }
    carril.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    new MutationObserver(function () {
      try { carril.scrollTo({ left: 0, behavior: 'instant' }); } catch (e) { carril.scrollLeft = 0; }
      pedir();
    }).observe(carril, { childList: true });
    medir();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(pedir);
    window.addEventListener('load', pedir);
  }

  // Preguntas frecuentes: altura suave al abrir y cerrar (sin JS siguen funcionando con <details>)
  function iniciarAcordeon() {
    var lista = $$('.zs-faq details');
    lista.forEach(function (d) {
      var sum = $('summary', d);
      if (!sum || $('.zs-faq__cuerpo', d)) return;
      var cuerpo = doc.createElement('div');
      cuerpo.className = 'zs-faq__cuerpo';
      while (sum.nextSibling) cuerpo.appendChild(sum.nextSibling);
      d.appendChild(cuerpo);
      if (reducir || typeof cuerpo.animate !== 'function') return;
      sum.addEventListener('click', function (ev) {
        ev.preventDefault();
        if (d._anim) { d._anim.cancel(); d._anim = null; }
        var opciones;
        if (!d.open) {
          d.classList.remove('zs-cierra');
          d.open = true;
          var h = cuerpo.offsetHeight;
          opciones = { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' };
          d._anim = cuerpo.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], opciones);
          d._anim.onfinish = function () { d._anim = null; };
        } else {
          var alto = cuerpo.offsetHeight;
          d.classList.add('zs-cierra');
          d._anim = cuerpo.animate([{ height: alto + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 230, easing: 'ease-in' });
          d._anim.onfinish = function () { d.open = false; d.classList.remove('zs-cierra'); d._anim = null; };
        }
      });
    });
  }

  iniciarPastilla();
  iniciarConteo();
  iniciarCarrusel();
  iniciarAcordeon();

  /* ---------------------------------------------------------- */
  /* 2. Movimiento (no corre con "reducir movimiento")           */
  /* ---------------------------------------------------------- */
  if (reducir || !unico) return;

  var REVELAR = ['.zs-cifra', '.zs-head', '.zs-controles', '.zs-curso', '.zs-paso', '.zs-beneficio', '.zs-panel__texto', '.zs-ventana',
    '.zs-campo', '.zs-dudas__cab', '.zs-faq details', '.zs-contacto__texto', '.zs-canal', '.zs-marquee'];
  var INCLINAR = { '.zs-curso': 6, '.zs-cifra': 5, '.zs-paso': 5, '.zs-beneficio': 5, '.zs-campo': 5, '.zs-canal': 3, '.zs-ventana': 2.5 };
  var OBSERVAR = ['.zs-recursos', '.zs-campo', '.zs-pasos'];   // solo para paralaje y línea

  var visibles = new Set();
  var grupos = [];   // bloques con paralaje: { cont, hijos: [{el, f, max}] }

  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) {
      var el = en.target;
      if (en.isIntersecting) {
        visibles.add(el);
        if (!el.classList.contains('zs-visto')) {
          el.classList.add('zs-visto');
          if (el.hasAttribute('data-zs-r')) {
            var i = parseInt(el.style.getPropertyValue('--zs-i') || '0', 10) || 0;
            setTimeout(function () { el.removeAttribute('data-zs-r'); }, 650 + i * 70 + 120);
          }
        }
        pedirScroll();
      } else {
        visibles.delete(el);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  function marcar(el, i) {
    if (el.__zsMarcado) return;
    el.__zsMarcado = true;
    var r = el.getBoundingClientRect();
    var yaVisible = r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth;
    el.style.setProperty('--zs-i', String(Math.min(i, 5)));
    if (!yaVisible || el.classList.contains('zs-curso')) el.setAttribute('data-zs-r', '');
    io.observe(el);
  }
  function inclinable(el) {
    if (!conRaton || el.hasAttribute('data-zs-tilt')) return;
    for (var sel in INCLINAR) {
      if (el.matches(sel)) { el.setAttribute('data-zs-tilt', String(INCLINAR[sel])); return; }
    }
  }

  // Revelado escalonado de lo que ya está en la página
  var porPadre = new Map();
  REVELAR.forEach(function (sel) {
    $$(sel).forEach(function (el) {
      var n = porPadre.get(el.parentNode) || 0;
      porPadre.set(el.parentNode, n + 1);
      marcar(el, n);
      inclinable(el);
    });
  });
  OBSERVAR.forEach(function (sel) { $$(sel).forEach(function (el) { io.observe(el); }); });

  // Tarjetas de curso nuevas (al filtrar o buscar): fundido y traslado escalonado
  var carril = $('#coursesGrid');
  if (carril) {
    new MutationObserver(function (cambios) {
      var nuevos = [];
      cambios.forEach(function (c) { c.addedNodes.forEach(function (n) { if (n.nodeType === 1 && n.matches('.zs-curso')) nuevos.push(n); }); });
      nuevos.forEach(function (el, i) { marcar(el, i); inclinable(el); });
    }).observe(carril, { childList: true });
  }

  /* ---------- Inclinación 3D por puntero (un solo listener delegado) ---------- */
  if (conRaton) {
    var actual = null, ultimo = null, rafP = 0;
    var soltar = function (t) {
      if (!t) return;
      t.classList.remove('zs-tilt-activo');
      t.style.removeProperty('--rx'); t.style.removeProperty('--ry'); t.style.removeProperty('--px'); t.style.removeProperty('--py');
    };
    var pintar = function () {
      rafP = 0;
      if (!actual || !ultimo) return;
      var r = actual.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var nx = limitar((ultimo.x - r.left) / r.width, 0, 1);
      var ny = limitar((ultimo.y - r.top) / r.height, 0, 1);
      var max = parseFloat(actual.getAttribute('data-zs-tilt')) || 5;
      actual.style.setProperty('--ry', ((nx - 0.5) * 2 * max).toFixed(2) + 'deg');
      actual.style.setProperty('--rx', ((0.5 - ny) * 2 * max).toFixed(2) + 'deg');
      actual.style.setProperty('--px', ((0.5 - nx) * 14).toFixed(1) + 'px');
      actual.style.setProperty('--py', ((0.5 - ny) * 10).toFixed(1) + 'px');
    };
    doc.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      var t = e.target && e.target.closest ? e.target.closest('[data-zs-tilt]') : null;
      if (t !== actual) {
        soltar(actual);
        actual = t;
        if (t) t.classList.add('zs-tilt-activo');
      }
      if (!t) return;
      ultimo = { x: e.clientX, y: e.clientY };
      if (!rafP) rafP = requestAnimationFrame(pintar);
    }, { passive: true });
    doc.addEventListener('pointerout', function (e) {
      if (!e.relatedTarget) { soltar(actual); actual = null; }
    }, { passive: true });
    window.addEventListener('blur', function () { soltar(actual); actual = null; });
  }

  /* ---------- Paralaje por capas y línea de pasos (un solo listener de scroll) ---------- */
  function hijosDe(cont) {
    if (cont.matches('.zs-campo')) {
      var im = $('.zs-campo__img img', cont);
      return im ? [{ el: im, f: 0.05, max: 8 }] : [];
    }
    if (cont.matches('.zs-recursos')) {
      return $$('img', cont).map(function (im, i) { return { el: im, f: [0.1, 0.2, 0.12][i % 3], max: 12 }; });
    }
    return [];
  }
  $$('.zs-campo, .zs-recursos').forEach(function (c) { grupos.push({ cont: c, hijos: hijosDe(c) }); });

  var pasosEl = $('.zs-pasos');
  var rafS = 0;
  function actualizar() {
    rafS = 0;
    var alto = window.innerHeight;
    grupos.forEach(function (g) {
      if (!visibles.has(g.cont)) return;
      var r = g.cont.getBoundingClientRect();
      var d = r.top + r.height / 2 - alto / 2;
      g.hijos.forEach(function (h) {
        h.el.style.setProperty('--py', limitar(-d * h.f, -h.max, h.max).toFixed(1) + 'px');
      });
    });
    if (pasosEl && visibles.has(pasosEl)) {
      var rp = pasosEl.getBoundingClientRect();
      var p = limitar((alto * 0.85 - rp.top) / (alto * 0.55), 0, 1);
      pasosEl.style.setProperty('--prog', p.toFixed(3));
    }
  }
  function pedirScroll() { if (!rafS) rafS = requestAnimationFrame(actualizar); }
  window.addEventListener('scroll', pedirScroll, { passive: true });
  window.addEventListener('resize', pedirScroll);
  pedirScroll();
})();
