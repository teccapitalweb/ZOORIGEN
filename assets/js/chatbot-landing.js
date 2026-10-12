/* ============================================================ */
/* GUÍA ZOORIGEN · pantalla de la portada                        */
/*                                                                */
/* Burbuja flotante + panel de conversación. TODA la lógica vive  */
/* en chatbot-motor.js (se prueba en Node); aquí solo se dibuja:  */
/* globos, "escribiendo…", botones, tarjetas de curso, fuentes y  */
/* la confirmación de la prueba gratuita.                         */
/*                                                                */
/* No es inteligencia artificial y lo dice. No pide datos         */
/* personales. Las preguntas sin respuesta se mandan (sin datos   */
/* personales, sin bloquear nada) a POST /api/chatbot/sin-respuesta */
/* para que el equipo mejore la guía.                             */
/* Prueba gratuita: al aceptar un curso se guarda               */
/*   localStorage zoo_curso_pref = { id, titulo, t }              */
/* y se ofrece ir a pages/club-registro.html?curso=<id> o a       */
/* pages/club-login.html?curso=<id>. Nunca se elige solo.         */
/* ============================================================ */
(function () {
  'use strict';
  if (window.__zooGuia) return;
  if (!window.ZOO_CHATBOT || !window.ZOO_CHATBOT_DUDAS) return;
  window.__zooGuia = true;

  var PREF_KEY = 'zoo_curso_pref';
  var VISTO_KEY = 'zoo_guia_visto';
  var LOTE_CURSOS = 3;
  var ESPERA_MS = 380;
  var ESPERA_CATALOGO_MS = 3500;
  var BASE_DEFECTO = 'https://zoorigen-webhook-production.up.railway.app';

  var ls = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  };
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* --- iconos Lucide en línea (trazo) --- */
  var ICONOS = {
    paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
    reiniciar: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    minimizar: '<path d="M5 12h14"/>',
    enviar: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    curso: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    fuente: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
  };
  function icono(nombre, tam) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', String(tam || 20));
    s.setAttribute('height', String(tam || 20));
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    s.innerHTML = ICONOS[nombre] || '';
    return s;
  }

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  /* --- motor y catálogo --- */
  var motor = window.ZOO_CHATBOT.crear({
    fichas: (window.ZOO_FICHAS && Array.isArray(window.ZOO_FICHAS.FICHAS)) ? window.ZOO_FICHAS.FICHAS : [],
    rutaPaginas: 'pages/'
  });

  var catalogoListo = null; // promesa que nunca rechaza
  function cargarCatalogo() {
    if (!window.ZOO_CATALOGO || typeof window.ZOO_CATALOGO.cargar !== 'function') return Promise.resolve(false);
    if (!catalogoListo || catalogoListo.__fallo) {
      var p = window.ZOO_CATALOGO.cargar().then(function (lista) {
        motor.setCatalogo(lista);
        return true;
      }, function () { p.__fallo = true; return false; });
      catalogoListo = p;
    }
    return catalogoListo;
  }
  // Espera el catálogo un rato corto; si no llega, la guía sigue sin él (sin ofertas de cursos).
  function conCatalogo() {
    if (motor.tieneCatalogo()) return Promise.resolve();
    return Promise.race([cargarCatalogo(), esperar(ESPERA_CATALOGO_MS)]).then(function () {});
  }

  function baseApi() {
    try { if (window.ZOO_CATALOGO && window.ZOO_CATALOGO.baseApi) return window.ZOO_CATALOGO.baseApi(); } catch (e) { /* defecto */ }
    return BASE_DEFECTO;
  }

  var yaRegistradas = {};
  // Fire-and-forget: nunca bloquea ni muestra error.
  function registrarSinRespuesta(reg) {
    try {
      if (!reg || !reg.texto || yaRegistradas[reg.texto]) return;
      yaRegistradas[reg.texto] = true;
      var f = window.fetch;
      if (typeof f !== 'function') return;
      var p = f(baseApi() + '/api/chatbot/sin-respuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: reg.texto, tipo: reg.tipo === 'animal' ? 'animal' : 'otro' }),
        keepalive: true
      });
      if (p && typeof p.catch === 'function') p.catch(function () { /* sin red: no pasa nada */ });
    } catch (e) { /* nunca falla hacia la persona */ }
  }

  /* --- interfaz --- */
  var lanzador, panel, cuerpo, campo, punto;
  var sesion = 0;     // sube con "Empezar de nuevo" para cancelar lo que estaba a medias
  var iniciado = false;
  var ocupado = false;

  function negritas(txt) {
    var p = el('p');
    String(txt).split(/(\*\*[^*]+\*\*)/).forEach(function (t) {
      if (/^\*\*[^*]+\*\*$/.test(t)) p.appendChild(el('strong', null, t.slice(2, -2)));
      else if (t) p.appendChild(document.createTextNode(t));
    });
    return p;
  }

  function abajo() {
    requestAnimationFrame(function () { cuerpo.scrollTop = cuerpo.scrollHeight; });
  }

  function yo(txt) {
    cuerpo.appendChild(el('div', 'zg-me', txt));
    abajo();
  }

  function escribiendo() {
    var w = el('div', 'zg-wait');
    w.setAttribute('role', 'status');
    w.appendChild(el('span', 'zg-sr', 'Escribiendo'));
    w.append(el('i'), el('i'), el('i'));
    cuerpo.appendChild(w);
    abajo();
    return w;
  }

  function enlaceFuente(f) {
    if (f.url) {
      var a = el('a', null, f.nombre);
      a.href = f.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      if (f.apoya) a.title = 'Apoya: ' + f.apoya;
      return a;
    }
    return el('span', null, f.nombre);
  }

  function globo(resp) {
    var g = el('div', 'zg-bot');
    resp.partes.forEach(function (t) { g.appendChild(negritas(t)); });
    var fuentes = resp.fuentes || [];
    if (fuentes.length) {
      var pf = el('p', 'zg-fuente');
      pf.appendChild(el('b', null, fuentes.length > 1 ? 'Fuentes: ' : 'Fuente: '));
      fuentes.forEach(function (f, i) {
        if (i) pf.appendChild(document.createTextNode(', '));
        pf.appendChild(enlaceFuente(f));
      });
      g.appendChild(pf);
    }
    if (resp.aviso) g.appendChild(el('p', 'zg-aviso', resp.aviso));
    return g;
  }

  function tarjetaCurso(c, tk) {
    var b = el('button', 'zg-curso' + (c.pronto ? ' is-soon' : ''));
    b.type = 'button';
    var th = el('span', 'zg-curso__ico');
    th.appendChild(icono('curso', 22));
    var tx = el('span', 'zg-curso__txt');
    var sub = c.area + (c.clases ? ' · ' + c.clases + (c.clases === 1 ? ' clase' : ' clases') : '');
    tx.append(el('b', null, c.titulo), el('small', null, sub));
    var etiqueta = c.pronto ? 'Próximamente' : (c.elegiblePrueba === false ? 'Ver el curso' : 'Elegir');
    b.append(th, tx, el('span', 'zg-curso__go', etiqueta));
    if (c.pronto) {
      b.disabled = true;
    } else {
      b.addEventListener('click', function () {
        if (tk !== sesion || ocupado) return;
        yo(c.titulo);
        responder(function () { return motor.accion({ tipo: 'curso', id: c.id }); });
      });
    }
    return b;
  }

  function mostrarCursos(lista, tk, siguientes) {
    var pos = 0;
    var rec = function () {
      if (tk !== sesion) return;
      lista.slice(pos, pos + LOTE_CURSOS).forEach(function (c) { cuerpo.appendChild(tarjetaCurso(c, tk)); });
      pos += LOTE_CURSOS;
      abajo();
      if (pos < lista.length) {
        var mas = el('div', 'zg-chips');
        var bm = el('button', 'zg-chip', 'Ver más cursos');
        bm.type = 'button';
        bm.addEventListener('click', function () { mas.remove(); rec(); });
        mas.appendChild(bm);
        cuerpo.appendChild(mas);
      } else if (siguientes) {
        siguientes();
      }
    };
    rec();
  }

  function urlExterna(u) { return /^https?:\/\//i.test(u); }

  function chips(botones, tk) {
    if (!botones || !botones.length) return;
    var grupo = el('div', 'zg-chips');
    botones.forEach(function (o) {
      if (o.wa || o.href) {
        var a = el('a', 'zg-chip' + (o.wa ? ' is-wa' : '') + (o.main ? ' is-main' : ''), o.t);
        a.href = o.wa ? motor.enlaceWhatsApp() : o.href;
        if (o.wa || urlExterna(o.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        if (o.href && o.href.charAt(0) === '#') a.addEventListener('click', function () { cerrar(true); });
        grupo.appendChild(a);
        return;
      }
      var b = el('button', 'zg-chip' + (o.main ? ' is-main' : ''), o.t);
      b.type = 'button';
      b.addEventListener('click', function () {
        if (tk !== sesion || ocupado) return;
        grupo.classList.add('is-used');
        yo(o.t);
        responder(function () { return motor.accion(o.accion); });
      });
      grupo.appendChild(b);
    });
    cuerpo.appendChild(grupo);
    abajo();
  }

  // Dibuja una respuesta completa del motor: globo, cursos, oferta final y botones.
  async function pintar(resp, tk) {
    var espera = escribiendo();
    await esperar(ESPERA_MS);
    espera.remove();
    if (tk !== sesion) return;

    cuerpo.appendChild(globo(resp));
    abajo();
    if (resp.registrar) registrarSinRespuesta(resp.registrar);
    if (resp.preferencia) {
      ls.set(PREF_KEY, JSON.stringify({ id: resp.preferencia.id, titulo: resp.preferencia.titulo, t: Date.now() }));
    }

    var cierre = function () {
      if (tk !== sesion) return;
      if (resp.oferta && resp.oferta.cursos && resp.oferta.cursos.length) {
        var of = el('div', 'zg-oferta');
        of.setAttribute('role', 'group');
        of.setAttribute('aria-label', 'Cursos relacionados');
        of.appendChild(el('p', 'zg-oferta__frase', resp.oferta.frase));
        resp.oferta.cursos.forEach(function (c) { of.appendChild(tarjetaCurso(c, tk)); });
        cuerpo.appendChild(of);
        abajo();
      }
      chips(resp.botones, tk);
    };

    if (resp.cursos && resp.cursos.length) mostrarCursos(resp.cursos, tk, cierre);
    else cierre();
  }

  // Ejecuta (tras asegurar el catálogo) la función que produce la respuesta y la dibuja.
  async function responder(producir) {
    var tk = sesion;
    ocupado = true;
    try {
      await conCatalogo();
      if (tk !== sesion) return;
      var resp = producir();
      await pintar(resp, tk);
    } catch (e) {
      if (tk === sesion) {
        cuerpo.appendChild(globo({ partes: ['Algo salió mal por mi lado. Intenta de nuevo o escríbele al equipo por WhatsApp.'], fuentes: [] }));
      }
    } finally {
      ocupado = false;
    }
  }

  function escribio(q) {
    if (ocupado) return;
    yo(q);
    responder(function () { return motor.texto(q); });
  }

  function empezarDeNuevo() {
    sesion++;
    ocupado = false;
    motor.reiniciar();
    cuerpo.textContent = '';
    cuerpo.appendChild(el('div', 'zg-lbl', 'Guía Zoorigen · guía virtual'));
    responder(function () { return motor.inicio(); });
  }

  /* --- construcción --- */
  function enfocables() {
    return Array.prototype.slice.call(panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])'))
      .filter(function (n) { return n.offsetParent !== null; });
  }
  function esMovil() { return window.matchMedia && window.matchMedia('(max-width: 560px)').matches; }

  function colocar() {
    // Se apila justo arriba del botón flotante de WhatsApp de la portada (sin taparlo).
    var wa = document.querySelector('.floating-whatsapp');
    var abajoPx = 154;
    if (wa) {
      var r = wa.getBoundingClientRect();
      if (r.height > 0) abajoPx = Math.round(window.innerHeight - r.top + 12);
    }
    lanzador.style.setProperty('--zg-abajo', abajoPx + 'px');
  }

  function construir() {
    lanzador = el('button', 'zg-launcher');
    lanzador.type = 'button';
    lanzador.id = 'zg-launcher';
    lanzador.setAttribute('aria-label', 'Abrir la Guía Zoorigen, una guía virtual');
    lanzador.setAttribute('aria-expanded', 'false');
    lanzador.setAttribute('aria-controls', 'zg-panel');
    var ico = el('span', 'zg-launcher__ico');
    ico.appendChild(icono('paw', 26));
    punto = el('span', 'zg-launcher__dot');
    punto.setAttribute('aria-hidden', 'true');
    punto.hidden = !!ls.get(VISTO_KEY);
    ico.appendChild(punto);
    lanzador.append(el('span', 'zg-launcher__txt', 'Guía Zoorigen'), ico);
    lanzador.addEventListener('click', abrir);
    document.body.appendChild(lanzador);
    colocar();
    window.addEventListener('resize', colocar);
    window.addEventListener('load', colocar);

    panel = el('div', 'zg-panel');
    panel.id = 'zg-panel';
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Guía Zoorigen, guía virtual');

    var hd = el('div', 'zg-hd');
    var av = el('span', 'zg-av');
    av.appendChild(icono('paw', 24));
    var tt = el('div', 'zg-tt');
    tt.append(el('small', null, 'Zoorigen'), el('b', null, 'Guía Zoorigen'), el('span', null, 'Guía virtual, no es una persona'));
    var bReiniciar = el('button', 'zg-ic');
    bReiniciar.type = 'button';
    bReiniciar.title = 'Empezar de nuevo';
    bReiniciar.setAttribute('aria-label', 'Empezar de nuevo');
    bReiniciar.appendChild(icono('reiniciar', 18));
    bReiniciar.addEventListener('click', empezarDeNuevo);
    var bCerrar = el('button', 'zg-ic');
    bCerrar.type = 'button';
    bCerrar.title = 'Minimizar';
    bCerrar.setAttribute('aria-label', 'Minimizar la guía');
    bCerrar.appendChild(icono('minimizar', 18));
    bCerrar.addEventListener('click', function () { cerrar(true); });
    hd.append(av, tt, bReiniciar, bCerrar);

    var nota = el('div', 'zg-note');
    nota.append(el('b', null, 'Respuestas guiadas. No hay una persona conectada.'), document.createTextNode(' No escribas datos personales.'));

    cuerpo = el('div', 'zg-bd');
    cuerpo.setAttribute('role', 'log');
    cuerpo.setAttribute('aria-live', 'polite');
    cuerpo.setAttribute('aria-label', 'Conversación con la guía');
    cuerpo.tabIndex = 0;

    var pie = el('div', 'zg-ft');
    var form = el('form', 'zg-inp');
    form.setAttribute('autocomplete', 'off');
    campo = el('input');
    campo.type = 'text';
    campo.maxLength = 120;
    campo.placeholder = 'Escribe tu pregunta…';
    campo.setAttribute('aria-label', 'Escribe tu pregunta');
    campo.autocomplete = 'off';
    var enviar = el('button');
    enviar.type = 'submit';
    enviar.setAttribute('aria-label', 'Enviar pregunta');
    enviar.appendChild(icono('enviar', 20));
    form.append(campo, enviar);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = campo.value.replace(/\s+/g, ' ').trim();
      if (!q) return;
      campo.value = '';
      escribio(q);
    });
    var enlaces = el('div', 'zg-lk');
    var bAsesor = el('button', null, 'Hablar con un asesor');
    bAsesor.type = 'button';
    bAsesor.addEventListener('click', function () {
      if (ocupado) return;
      yo('Hablar con un asesor');
      responder(function () { return motor.accion({ tipo: 'asesor' }); });
    });
    var bNuevo = el('button', null, 'Empezar de nuevo');
    bNuevo.type = 'button';
    bNuevo.addEventListener('click', empezarDeNuevo);
    enlaces.append(bAsesor, bNuevo);
    pie.append(form, enlaces);

    panel.append(hd, nota, cuerpo, pie);
    document.body.appendChild(panel);

    document.addEventListener('keydown', function (e) {
      if (panel.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); cerrar(true); return; }
      if (e.key === 'Tab' && esMovil()) {
        var lista = enfocables();
        if (!lista.length) return;
        var primero = lista[0], ultimo = lista[lista.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    });
  }

  function abrir() {
    colocar();
    panel.hidden = false;
    lanzador.hidden = true;
    lanzador.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-modal', esMovil() ? 'true' : 'false');
    punto.hidden = true;
    ls.set(VISTO_KEY, '1');
    if (!iniciado) {
      iniciado = true;
      cuerpo.appendChild(el('div', 'zg-lbl', 'Guía Zoorigen · guía virtual'));
      responder(function () { return motor.inicio(); });
      cargarCatalogo();
    }
    if (!esMovil()) campo.focus(); else panel.focus({ preventScroll: true });
    abajo();
  }

  function cerrar(devolverFoco) {
    panel.hidden = true;
    lanzador.hidden = false;
    lanzador.setAttribute('aria-expanded', 'false');
    colocar();
    if (devolverFoco) lanzador.focus({ preventScroll: true });
  }

  function iniciar() { construir(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
