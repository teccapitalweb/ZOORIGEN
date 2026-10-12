/* ============================================================ */
/* ENCUESTA DE LA PORTADA · PANTALLA                             */
/*                                                                */
/* Sección fija justo debajo del hero (#inicio), no flotante.     */
/* Una pregunta a la vez, botón "Anterior", progreso guardado en  */
/* el navegador (se retoma donde se quedó), reintentos si falla   */
/* la red y copia parcial si la persona se va a la mitad.         */
/*                                                                */
/* La lógica (árbol de preguntas, puntuación de cursos, textos y   */
/* validación del WhatsApp) está en encuesta-motor.js y se prueba  */
/* en Node. Este archivo solo dibuja y guarda.                     */
/*                                                                */
/* Envío: POST {servidor}/api/encuesta. NO escribe en Firestore.  */
/* El personaje y sus imágenes son opcionales: si no hay imágenes  */
/* (window.ZOO_ENCUESTA_IMAGENES) solo se muestra el recuadro de   */
/* texto con la reacción.                                         */
/*                                                                */
/* Traspaso: al aceptar un curso se guarda localStorage            */
/* `zoo_curso_pref` = { id, titulo, t } y se lleva a              */
/* pages/club-registro.html?curso=<id> o club-login.html?curso=.  */
/* ============================================================ */
(function () {
  'use strict';

  var M = window.ZOO_ENCUESTA;
  if (!M) { try { console.warn('[encuesta] falta assets/js/encuesta-motor.js'); } catch (e) { /* sin consola */ } return; }

  // Sube este número para que TODAS las personas vuelvan a ver la encuesta (el avance guardado deja de aplicar).
  var EDICION = 1;
  var PROG_KEY = 'zoo_encuesta_prog_e' + EDICION;  // { respuestas, paso, parcialN, guardado }
  var PEND_KEY = 'zoo_encuesta_pend_e' + EDICION;  // envíos que el servidor aún no confirmó
  var SID_KEY = 'zoo_encuesta_sid';
  var BASE_DEFECTO = 'https://zoorigen-webhook-production.up.railway.app';

  var respuestas = {};
  var paso = 0;
  var ocupado = false;          // evita clics mientras corre la transición
  var tk = 0;                   // sube en cada pantalla: cancela esperas de una pantalla anterior
  var finalizada = false;       // la persona ya terminó y salió de la encuesta
  var guardadoPrincipal = null; // envío de las respuestas completas de esta vuelta
  var enVuelo = {};
  var catalogoP = null;

  var reducido = false;
  try { reducido = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reducido = false; }

  /* ───────────────────────── Utilidades ───────────────────────── */

  function el(id) { return document.getElementById(id); }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function nodo(tag, cls, texto) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto != null) n.textContent = texto;
    return n;
  }
  function boton(cls, texto, onClick) {
    var b = nodo('button', cls, texto);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  // Íconos de trazo (Lucide, licencia ISC). La portada no carga el sprite del Club, así que van aquí.
  var ICONOS = {
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    'gift': '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
    'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
    'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>'
  };
  function icono(nombre, tam) {
    var s = tam || 18;
    var tpl = document.createElement('template');
    tpl.innerHTML = '<svg class="zenc-ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONOS[nombre] || '') + '</svg>';
    return tpl.content.firstChild;
  }
  function conIcono(cls, nombreIcono, texto, alFinal) {
    var b = nodo('button', cls);
    b.type = 'button';
    var t = nodo('span', 'zenc-btn__t', texto);
    if (alFinal) { b.append(t, icono(nombreIcono)); } else { b.append(icono(nombreIcono), t); }
    return b;
  }

  function baseApi() {
    try { if (window.ZOO_CATALOGO && typeof window.ZOO_CATALOGO.baseApi === 'function') return window.ZOO_CATALOGO.baseApi(); } catch (e) { /* usa el valor por defecto */ }
    try { if (typeof WEBHOOK_SERVER_URL !== 'undefined' && WEBHOOK_SERVER_URL) return String(WEBHOOK_SERVER_URL).replace(/\/+$/, ''); } catch (e) { /* sin variable */ }
    return BASE_DEFECTO;
  }

  /* ───────────────────────── Almacenamiento ───────────────────────── */

  function sesionId() {
    try {
      var sid = localStorage.getItem(SID_KEY);
      if (!sid) {
        sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'sid-' + Date.now() + '-' + Math.random().toString(16).slice(2);
        localStorage.setItem(SID_KEY, sid);
      }
      return String(sid).slice(0, 100);
    } catch (e) { return 'sid-' + Date.now(); }
  }

  function leerProgreso() {
    try { var p = JSON.parse(localStorage.getItem(PROG_KEY) || 'null'); return p && typeof p === 'object' ? p : {}; } catch (e) { return {}; }
  }
  function guardarProgreso(extra) {
    try { localStorage.setItem(PROG_KEY, JSON.stringify(Object.assign({}, leerProgreso(), { respuestas: respuestas, paso: paso }, extra || {}))); } catch (e) { /* sin almacenamiento */ }
  }
  function borrarProgreso() { try { localStorage.removeItem(PROG_KEY); } catch (e) { /* sin almacenamiento */ } }

  function leerPendientes() {
    try { return M.sanearPendientes(JSON.parse(localStorage.getItem(PEND_KEY) || '[]')); } catch (e) { return []; }
  }
  function escribirPendientes(lista) {
    try { if (lista.length) localStorage.setItem(PEND_KEY, JSON.stringify(lista)); else localStorage.removeItem(PEND_KEY); } catch (e) { /* sin almacenamiento */ }
  }

  function guardarPreferencia(curso) {
    var pref = M.construirPreferencia(curso, Date.now());
    if (!pref) return;
    try { localStorage.setItem(M.PREF_KEY, JSON.stringify(pref)); } catch (e) { /* sin almacenamiento */ }
  }

  /* ───────────────────────── Envío al servidor ───────────────────────── */

  // Devuelve { ok, status } (status 0 = sin red). Nunca lanza.
  function postEncuesta(cuerpo, keepalive) {
    var opciones = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), cache: 'no-store' };
    if (keepalive) opciones.keepalive = true;
    try {
      return fetch(baseApi() + '/api/encuesta', opciones).then(
        function (r) { return { ok: r.ok, status: r.status }; },
        function () { return { ok: false, status: 0 }; }
      );
    } catch (e) { return Promise.resolve({ ok: false, status: 0 }); }
  }

  function enviarPendiente(item) {
    if (enVuelo[item.id]) return Promise.resolve(false);
    enVuelo[item.id] = true;
    var cuerpo = M.construirCuerpo({ sessionId: item.sid, respuestas: item.respuestas, completada: item.completada, contacto: item.contacto });
    return postEncuesta(cuerpo, false).then(function (r) {
      delete enVuelo[item.id];
      // Confirmado, o un rechazo que no mejora reintentando: sale de la cola.
      if (r.ok || !M.esReintentable(r.status)) escribirPendientes(leerPendientes().filter(function (x) { return x.id !== item.id; }));
      else { try { console.warn('[encuesta] no se pudo guardar; se reintentará (' + r.status + ')'); } catch (e) { /* sin consola */ } }
      return r.ok;
    });
  }

  function enviarNuevo(contacto) {
    var item = { id: Date.now() + '-' + Math.random().toString(16).slice(2, 8), sid: sesionId(), respuestas: Object.assign({}, respuestas), contacto: contacto || null, completada: true, t: Date.now() };
    escribirPendientes(leerPendientes().concat([item]));
    return enviarPendiente(item);
  }

  function reintentarPendientes() { leerPendientes().forEach(enviarPendiente); }

  // Guarda lo respondido. Espera como máximo 3 s para no dejar colgada a la persona; si no alcanzó
  // a confirmarse, el envío sigue en curso (o queda pendiente y se reintenta solo).
  function guardarRespuesta(contacto) {
    var promesa;
    if (contacto) {
      promesa = enviarNuevo(contacto);
    } else {
      if (leerProgreso().guardado) return Promise.resolve(true);
      if (!guardadoPrincipal) {
        guardadoPrincipal = enviarNuevo(null).then(function (ok) {
          if (ok && !finalizada) guardarProgreso({ guardado: true });
          else if (!ok) guardadoPrincipal = null; // falló: el siguiente intento vuelve a mandarlo
          return ok;
        });
      }
      promesa = guardadoPrincipal;
    }
    return Promise.race([promesa, esperar(3000).then(function () { return false; })]);
  }

  // La persona terminó (eligió un curso, entró a su cuenta o pulsó "Seguir viendo"): se asegura el
  // guardado y se borra su avance, así que al actualizar la página la encuesta vuelve a empezar.
  function finalizarEncuesta() {
    var p = M.estaCompleta(respuestas) ? guardarRespuesta(null) : Promise.resolve(false);
    return p.then(function () {
      finalizada = true;
      borrarProgreso();
    });
  }

  // Si se va a media encuesta se manda una copia parcial (el panel la reemplaza por la completa si luego
  // termina). Mejor esfuerzo: al salir de la página el navegador puede cortar la petición.
  function guardarParcialSiHaceFalta() {
    if (finalizada || guardadoPrincipal || leerProgreso().guardado) return;
    var n = Object.keys(respuestas).length;
    if (n === 0 || n === (leerProgreso().parcialN || 0)) return;
    guardarProgreso({ parcialN: n });
    // Si por alguna razón ya estaba completa pero sin confirmar, se manda como completa.
    postEncuesta(M.construirCuerpo({ sessionId: sesionId(), respuestas: respuestas, completada: M.estaCompleta(respuestas) }), true);
  }

  /* ───────────────────────── Personaje (opcional) ───────────────────────── */

  var imagenes = (window.ZOO_ENCUESTA_IMAGENES && typeof window.ZOO_ENCUESTA_IMAGENES === 'object') ? window.ZOO_ENCUESTA_IMAGENES : {};
  var imagenesRotas = {};

  function ponerReaccion(m) {
    var seccion = el('encuesta');
    if (!seccion) return;
    el('zenc-nota-t').textContent = m.titulo || '';
    el('zenc-nota-c').textContent = m.texto || '';
    var cara = el('zenc-cara');
    var src = m.expr && imagenes[m.expr] && !imagenesRotas[m.expr] ? imagenes[m.expr] : (imagenes.neutral && !imagenesRotas.neutral ? imagenes.neutral : '');
    if (src) {
      var url = new URL(src, document.baseURI).href;
      cara.style.setProperty('--zenc-cara', "url('" + url + "')");
      cara.hidden = false;
      seccion.classList.add('zenc--con-cara');
      var sonda = new Image();
      sonda.onerror = function () { imagenesRotas[m.expr || 'neutral'] = true; cara.hidden = true; seccion.classList.remove('zenc--con-cara'); };
      sonda.src = url;
    } else {
      cara.hidden = true;
      seccion.classList.remove('zenc--con-cara');
    }
  }

  /* ───────────────────────── Estructura ───────────────────────── */

  function construirUI() {
    var sec = document.createElement('section');
    sec.id = 'encuesta';
    sec.className = 'zenc';
    sec.setAttribute('aria-labelledby', 'zenc-q');
    sec.innerHTML =
      '<div class="zenc__inner">' +
        '<aside class="zenc__guia" id="zenc-guia" aria-label="Guía de la encuesta">' +
          '<div class="zenc__nota" id="zenc-nota" role="status" aria-live="polite">' +
            '<strong id="zenc-nota-t"></strong><span id="zenc-nota-c"></span>' +
          '</div>' +
          '<div class="zenc__cara" id="zenc-cara" aria-hidden="true" hidden></div>' +
        '</aside>' +
        '<div class="zenc__tarjeta" id="zenc-tarjeta">' +
          '<div class="zenc__top">' +
            '<p class="zenc__paso" id="zenc-paso"></p>' +
            '<div class="zenc__acciones" id="zenc-acciones"></div>' +
          '</div>' +
          '<div class="zenc__progreso" id="zenc-progreso" aria-hidden="true"><i id="zenc-barra"></i></div>' +
          '<h2 class="zenc__q" id="zenc-q" tabindex="-1"></h2>' +
          '<div class="zenc__cuerpo" id="zenc-cuerpo"></div>' +
        '</div>' +
      '</div>';
    var hero = document.getElementById('inicio');
    if (hero && hero.parentNode) hero.parentNode.insertBefore(sec, hero.nextSibling);
    else { var main = document.querySelector('main'); if (main) main.insertBefore(sec, main.firstChild); else document.body.insertBefore(sec, document.body.firstChild); }
    return sec;
  }

  function ponerTitulo(partes, grande) {
    var q = el('zenc-q');
    if (!q) return;
    q.classList.toggle('is-resultado', !!grande);
    q.textContent = '';
    [].concat(partes).forEach(function (p) { q.append(p); });
  }

  function ponerPaso(texto, avance) {
    el('zenc-paso').textContent = texto;
    var barra = el('zenc-barra');
    if (barra) barra.style.width = Math.max(0, Math.min(100, Math.round((avance || 0) * 100))) + '%';
  }

  // Botones de la parte alta: "Anterior" (si hay a dónde volver) y "Empezar de nuevo".
  function actualizarAcciones(opciones) {
    var o = opciones || {};
    var caja = el('zenc-acciones');
    if (!caja) return;
    caja.textContent = '';
    if (o.ocultar) return;
    if (paso > 0) {
      caja.appendChild(conIcono('zenc-linkbtn', 'arrow-left', 'Anterior', false)).addEventListener('click', atras);
      caja.appendChild(conIcono('zenc-linkbtn', 'rotate-ccw', 'Empezar de nuevo', false)).addEventListener('click', reiniciar);
    }
  }

  function enfocarPregunta() {
    var q = el('zenc-q');
    if (q && typeof q.focus === 'function') { try { q.focus({ preventScroll: true }); } catch (e) { /* navegador sin opciones */ } }
  }

  /* ───────────────────────── Preguntas ───────────────────────── */

  // conservarNota: tras responder se mantiene la reacción a esa respuesta mientras se ve la pregunta siguiente.
  function render(desdeUsuario, conservarNota) {
    if (!el('zenc-tarjeta')) return;
    var pasos = M.obtenerPasos(respuestas);
    var def = pasos[paso];
    if (!def) { renderResultado(); return; }
    tk++;
    var total = M.totalPasos(respuestas);
    ponerPaso('Pregunta ' + (paso + 1) + ' de ' + total, paso / total);
    ponerTitulo(def.q);
    actualizarAcciones();
    var cuerpo = el('zenc-cuerpo');
    cuerpo.textContent = '';
    cuerpo.className = 'zenc__cuerpo zenc__opciones';
    cuerpo.removeAttribute('aria-busy');
    var grupo = nodo('div', 'zenc__opciones-lista');
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-labelledby', 'zenc-q');
    def.opts.forEach(function (opt) {
      var b = boton('zenc-opt' + (respuestas[def.clave] === opt ? ' is-selected' : ''), opt, function () { elegir(def.clave, opt, b); });
      if (respuestas[def.clave] === opt) b.setAttribute('aria-pressed', 'true');
      grupo.appendChild(b);
    });
    cuerpo.appendChild(grupo);
    if (!conservarNota) ponerReaccion(M.mensajePregunta(def, paso === 0 && Object.keys(respuestas).length === 0));
    if (desdeUsuario) enfocarPregunta();
  }

  function elegir(clave, opt, b) {
    if (ocupado) return;
    ocupado = true;
    respuestas = M.aplicarRespuesta(respuestas, clave, opt);
    guardadoPrincipal = null;
    guardarProgreso({ guardado: false });
    var grupo = el('zenc-cuerpo');
    if (grupo) grupo.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
    if (b) b.classList.add('is-selected');
    ponerReaccion(M.reaccion(clave, opt));
    avanzar(1, reducido ? 120 : 420);
  }

  function atras() {
    if (ocupado || paso <= 0) return;
    ocupado = true;
    avanzar(-1, 0);
  }

  function avanzar(delta, ms) {
    var tarjeta = el('zenc-tarjeta');
    var cambia = function () {
      var maximo = M.obtenerPasos(respuestas).length;
      paso = Math.max(0, Math.min(maximo, paso + delta));
      guardarProgreso();
      ocupado = false;
      render(true, delta > 0);
      if (tarjeta && !reducido) { tarjeta.classList.add('is-entrando'); setTimeout(function () { tarjeta.classList.remove('is-entrando'); }, 220); }
    };
    if (ms > 0) setTimeout(cambia, ms); else cambia();
  }

  function reiniciar() {
    if (ocupado) return;
    respuestas = {};
    paso = 0;
    guardadoPrincipal = null;
    borrarProgreso();
    render(true);
  }

  /* ───────────────────────── Resultado ───────────────────────── */

  // Catálogo real de cursos (ZOO_CATALOGO). Si no carga en 5 s, el resultado se muestra sin la lista.
  function cargarCatalogo() {
    if (catalogoP) return catalogoP;
    catalogoP = new Promise(function (resolver) {
      var C = window.ZOO_CATALOGO;
      if (!C || typeof C.cargar !== 'function') { resolver(null); return; }
      var cerrado = false;
      var fin = function (v) { if (!cerrado) { cerrado = true; resolver(v); } };
      setTimeout(function () { fin(null); }, 5000);
      C.cargar().then(function (l) { fin(Array.isArray(l) && l.length ? l : null); }, function () { fin(null); });
    });
    return catalogoP;
  }

  function renderResultado() {
    var cuerpo = el('zenc-cuerpo');
    if (!cuerpo) return;
    var mio = ++tk;
    actualizarAcciones();
    ponerPaso('Un momento', 1);
    ponerTitulo('Preparando tu resultado...');
    ponerReaccion({ expr: 'thinking', titulo: 'Analizando tus respuestas.', texto: 'Armo tu resultado y los cursos que más te pueden servir.' });
    cuerpo.className = 'zenc__cuerpo';
    cuerpo.textContent = '';
    cuerpo.setAttribute('aria-busy', 'true');
    var espera = nodo('div', 'zenc__espera');
    espera.setAttribute('aria-hidden', 'true');
    espera.append(nodo('i'), nodo('i'), nodo('i'));
    cuerpo.appendChild(espera);
    guardarRespuesta(null); // las respuestas ya están completas: se guardan sin esperar
    Promise.all([cargarCatalogo(), esperar(reducido ? 200 : 1100)]).then(function (par) {
      if (mio !== tk || !el('zenc-tarjeta')) return;
      pintarResultado(par[0], null);
    });
  }

  function pintarResultado(catalogo, aviso) {
    var cuerpo = el('zenc-cuerpo');
    if (!cuerpo) return;
    tk++;
    cuerpo.removeAttribute('aria-busy');
    cuerpo.className = 'zenc__cuerpo';
    var texto = M.textoResultado(respuestas);
    var recomendados = catalogo ? M.recomendarCursos(catalogo, respuestas, 3) : [];
    ponerPaso('Tu resultado', 1);
    if (texto.tema) {
      ponerTitulo([texto.titulo.antes, nodo('span', 'zenc-resalta', texto.titulo.resalta), texto.titulo.despues], true);
    } else {
      ponerTitulo(texto.titulo.antes, true);
    }
    ponerReaccion({ expr: 'excited', titulo: '¡Tu resultado está listo!', texto: 'Elige un curso y empieza tu prueba gratuita.' });
    actualizarAcciones();

    var res = nodo('div', 'zenc__res');
    var lead = nodo('p', 'zenc__lead');
    lead.append('Destacas por ', nodo('b', null, texto.fortaleza), '. ' + texto.halagos);
    res.appendChild(lead);

    var promo = nodo('div', 'zenc-promo');
    var titular = nodo('p', 'zenc-promo__t');
    titular.append(M.PRUEBA.antes, nodo('mark', null, M.PRUEBA.resalta), M.PRUEBA.despues);
    var etiqueta = nodo('span', 'zenc-promo__tag');
    etiqueta.append(icono('gift', 16), document.createTextNode(M.PRUEBA.etiqueta));
    promo.append(etiqueta, titular, nodo('p', 'zenc-promo__s', M.PRUEBA.detalle));
    res.appendChild(promo);

    if (aviso) res.appendChild(nodo('p', 'zenc__ok', aviso));
    res.appendChild(nodo('p', 'zenc__hint', texto.cierre + (texto.nota ? ' ' + texto.nota : '')));

    var hayElegible = recomendados.some(function (rec) { return rec.elegible; });
    if (recomendados.length) {
      var lista = nodo('div', 'zenc__cursos');
      recomendados.forEach(function (rec) { lista.appendChild(filaCurso(rec, function () { confirmarCurso(rec, catalogo, aviso); })); });
      res.appendChild(lista);
    }
    if (!hayElegible) {
      var crear = conIcono('zenc-btn zenc-btn--principal', 'user-plus', 'Crear mi cuenta gratis', false);
      crear.addEventListener('click', function () { irAAuth('registro', null); });
      res.appendChild(crear);
    }

    var pie = nodo('div', 'zenc__pie');
    var ya = boton('zenc-link', 'Ya tengo cuenta', function () { irAAuth('login', null); });
    var asesor = boton('zenc-link', 'Prefiero que un asesor me escriba', function () { renderContacto(catalogo); });
    var seguir = boton('zenc-link', 'Seguir viendo', function () { finalizarEncuesta().then(cerrarSeccion); });
    pie.append(ya, asesor, seguir);
    res.appendChild(pie);
    cuerpo.textContent = '';
    cuerpo.appendChild(res);
    enfocarPregunta();
  }

  // Curso elegible: botón que lleva a "¿Lo quieres como tu prueba gratuita?". Curso que el servidor no
  // permite como prueba: solo informa ("Parte de la membresía"), sin pregunta ni botón.
  function filaCurso(rec, alElegir) {
    var c = rec.curso;
    var info = nodo('span', 'zenc-curso__info');
    info.append(nodo('b', null, c.titulo), nodo('small', null, rec.razon ? 'Te serviría para reforzar ' + rec.razon : (c.area || '')));
    if (!rec.elegible) {
      var fijo = nodo('div', 'zenc-curso zenc-curso--membresia');
      fijo.append(info, nodo('span', 'zenc-curso__go', 'Parte de la membresía'));
      return fijo;
    }
    var fila = nodo('button', 'zenc-curso');
    fila.type = 'button';
    fila.append(info, nodo('span', 'zenc-curso__go', 'Elegir'), icono('chevron-right', 18));
    fila.addEventListener('click', alElegir);
    return fila;
  }

  // "¿Lo quieres como tu prueba gratuita?": la elección real se confirma ya dentro de la cuenta.
  function confirmarCurso(rec, catalogo, aviso) {
    var cuerpo = el('zenc-cuerpo');
    if (!cuerpo) return;
    tk++;
    var c = rec.curso;
    ponerPaso('Último paso', 1);
    ponerTitulo('¿Lo quieres como tu prueba gratuita?', true);
    ponerReaccion({ expr: 'happy', titulo: '¡Buena elección!', texto: 'Crea tu cuenta y confirma tu prueba gratuita.' });
    actualizarAcciones({ ocultar: true });
    var res = nodo('div', 'zenc__res');
    var sel = nodo('div', 'zenc-sel');
    var info = nodo('span', 'zenc-sel__info');
    info.append(nodo('span', 'zenc-sel__tag', 'Tu prueba gratuita'), nodo('b', null, c.titulo), nodo('small', null, rec.razon ? 'Para reforzar ' + rec.razon : (c.area || '')));
    sel.appendChild(info);
    res.appendChild(sel);
    res.appendChild(nodo('p', 'zenc__lead', 'Crea tu cuenta gratis y elige este curso como tu prueba: verás todas sus clases menos la última, sin costo. Solo puedes elegir un curso y después no se puede cambiar; lo confirmas dentro de tu cuenta.'));
    var crear = conIcono('zenc-btn zenc-btn--principal', 'user-plus', 'Crear mi cuenta gratis', false);
    crear.addEventListener('click', function () { irAAuth('registro', c); });
    var ya = conIcono('zenc-btn zenc-btn--sec', 'log-in', 'Ya tengo cuenta', false);
    ya.addEventListener('click', function () { irAAuth('login', c); });
    var otro = conIcono('zenc-linkbtn', 'arrow-left', 'Elegir otro curso', false);
    otro.addEventListener('click', function () { pintarResultado(catalogo, aviso); });
    res.append(crear, ya, otro);
    cuerpo.textContent = '';
    cuerpo.appendChild(res);
    enfocarPregunta();
  }

  // Guarda la preferencia (si hay curso), asegura el guardado de la encuesta y lleva a la cuenta.
  function irAAuth(donde, curso) {
    if (curso) guardarPreferencia(curso);
    var cuerpo = el('zenc-cuerpo');
    if (cuerpo) cuerpo.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    var id = curso ? curso.id : '';
    var url = donde === 'login' ? M.urlLogin(id) : M.urlRegistro(id);
    finalizarEncuesta().then(function () { window.location.href = url; });
  }

  /* ───────────────────────── WhatsApp (opcional) ───────────────────────── */

  function renderContacto(catalogo) {
    var cuerpo = el('zenc-cuerpo');
    if (!cuerpo) return;
    tk++;
    ponerPaso('Un asesor te escribe', 1);
    ponerTitulo('¿A qué WhatsApp te escribimos?');
    ponerReaccion({ expr: 'excited', titulo: 'Con gusto te ayudamos.', texto: 'Es opcional. Tu número solo se usa para que un asesor te escriba con información de cursos.' });
    actualizarAcciones({ ocultar: true });
    cuerpo.className = 'zenc__cuerpo';
    cuerpo.textContent = '';

    var fila = nodo('div', 'zenc-tel');
    var pais = document.createElement('select');
    pais.className = 'zenc-pais';
    pais.id = 'zenc-pais';
    pais.setAttribute('aria-label', 'País de tu WhatsApp');
    M.PAISES.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.cod;
      o.textContent = p.nombre + (p.pref ? ' +' + p.pref : '');
      pais.appendChild(o);
    });
    var entrada = document.createElement('input');
    entrada.className = 'zenc-input';
    entrada.id = 'zenc-numero';
    entrada.type = 'tel';
    entrada.inputMode = 'tel';
    entrada.autocomplete = 'tel';
    entrada.setAttribute('aria-label', 'Tu número de WhatsApp');
    fila.append(pais, entrada);

    var error = nodo('p', 'zenc__error');
    error.id = 'zenc-error';
    error.setAttribute('role', 'alert');
    error.hidden = true;

    var consent = document.createElement('label');
    consent.className = 'zenc-consent';
    var acepto = document.createElement('input');
    acepto.type = 'checkbox';
    acepto.id = 'zenc-acepto';
    var txt = nodo('span');
    var enlace = nodo('a', null, 'Aviso de privacidad');
    enlace.href = 'index.html#privacidad';
    enlace.target = '_blank';
    enlace.rel = 'noopener';
    txt.append('Acepto el ', enlace, ' y que un asesor me escriba por WhatsApp con información de cursos.');
    consent.append(acepto, txt);

    var enviar = nodo('button', 'zenc-btn zenc-btn--principal');
    enviar.type = 'button';
    enviar.id = 'zenc-enviar';
    enviar.append(icono('message-circle'), nodo('span', 'zenc-btn__t', 'Guardar mi WhatsApp'));
    var volver = boton('zenc-btn zenc-btn--sec', 'Volver a mis cursos', function () { pintarResultado(catalogo, null); });
    volver.id = 'zenc-volver';
    cuerpo.append(fila, error, consent, enviar, volver);

    var AYUDA = {
      MX: 'Escribe tu WhatsApp de México con 10 dígitos y lada (por ejemplo 55 1234 5678).',
      OT: 'Escríbelo completo con el código de tu país (por ejemplo +49 151 2345 6789).',
      otro: 'Escríbelo completo, sin el código del país.'
    };
    var PLACEHOLDER = { MX: '10 dígitos con lada', OT: 'Con código de país (+...)' };
    var avisar = function (t, marcarCasilla) {
      error.textContent = t;
      error.hidden = false;
      consent.classList.toggle('is-error', !!marcarCasilla);
    };
    var limpiar = function () { error.hidden = true; consent.classList.remove('is-error'); };
    var idioma = '';
    try { idioma = navigator.language || ''; } catch (e) { idioma = ''; }
    pais.value = M.paisPorDefecto(idioma);
    var ponerPlaceholder = function () { entrada.placeholder = PLACEHOLDER[pais.value] || 'Tu número'; };
    ponerPlaceholder();
    pais.addEventListener('change', function () { ponerPlaceholder(); limpiar(); });
    entrada.addEventListener('input', limpiar);
    acepto.addEventListener('change', limpiar);

    var guardar = function () {
      if (enviar.disabled) return;
      var crudo = entrada.value.trim();
      if (!crudo) { avisar('Escribe tu número, o vuelve a tus cursos si prefieres no dejarlo.', false); entrada.focus(); return; }
      var numero = M.normalizarWhatsapp(pais.value, crudo);
      if (!numero) { avisar('Ese número no parece válido. ' + (AYUDA[pais.value] || AYUDA.otro), false); entrada.focus(); return; }
      if (!acepto.checked) { avisar('Marca la casilla para que un asesor pueda escribirte.', true); return; }
      enviar.disabled = true;
      volver.disabled = true;
      enviar.querySelector('.zenc-btn__t').textContent = 'Guardando...';
      guardarRespuesta(numero).then(function (ok) {
        pintarResultado(catalogo, ok
          ? 'Listo: guardamos tu WhatsApp para que un asesor te escriba. Mientras, puedes elegir tu curso.'
          : 'Guardamos tu WhatsApp; se enviará en cuanto haya conexión. Mientras, puedes elegir tu curso.');
      });
    };
    enviar.addEventListener('click', guardar);
    entrada.addEventListener('keydown', function (e) { if (e.key === 'Enter') guardar(); });
    enfocarPregunta();
  }

  function cerrarSeccion() {
    var sec = el('encuesta');
    if (sec && sec.parentNode) sec.parentNode.removeChild(sec);
  }

  /* ───────────────────────── Arranque ───────────────────────── */

  function iniciar() {
    if (el('encuesta')) return;
    // Limpia el estado de ediciones anteriores.
    try {
      Object.keys(localStorage).filter(function (k) { return /^zoo_encuesta_(prog|pend)_e/.test(k) && !k.endsWith('_e' + EDICION); })
        .forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* sin almacenamiento */ }
    setTimeout(reintentarPendientes, 1500); // envíos que no se confirmaron en una visita anterior
    window.addEventListener('online', reintentarPendientes);

    var prog = leerProgreso();
    respuestas = M.sanearRespuestas(prog.respuestas);
    var n = Object.keys(respuestas).length;
    paso = n ? M.pasoParaRetomar(respuestas, prog.paso) : 0;

    construirUI();
    render(false);
    if (n && paso > 0) {
      ponerReaccion({ expr: 'happy', titulo: 'Retomamos donde te quedaste.', texto: 'Puedes volver a la pregunta anterior o empezar de nuevo.' });
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') guardarParcialSiHaceFalta();
    });
    window.addEventListener('pagehide', guardarParcialSiHaceFalta);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') iniciar();
  else document.addEventListener('DOMContentLoaded', iniciar);
})();
