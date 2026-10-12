/* ============================================================ */
/* PREGUNTAS DE CLASE · Club VIP Zoorigen                        */
/*                                                                */
/* Cada clase puede traer preguntas cerradas (verdadero/falso u   */
/* opción múltiple) que se responden al terminarla, ANTES del     */
/* juego. Se guardan dentro de la clase como                      */
/*   lecciones[i].preguntas = [{ pregunta, tipo, opciones?,       */
/*                               correcta }]                      */
/* (mismo formato que usa alintecfood).                           */
/*                                                                */
/* - Es práctica: equivocarse no frena y no afecta el certificado.*/
/* - Con la opción `validar` las respuestas se mandan al servidor  */
/*   (POST /api/cursos/:id/quiz) y la pantalla pinta lo que el     */
/*   servidor responde; sin ella se califica en el navegador.      */
/* - La lógica no toca la pantalla y se prueba en Node:           */
/*   tests/club-quiz.test.js                                      */
/* - La pantalla solo corre en el navegador y usa la ventana de   */
/*   club-juegos.js (ZOO_JUEGOS).                                 */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(null);
  else root.ZOO_QUIZ = factory(root.ZOO_JUEGOS || null);
})(typeof self !== 'undefined' ? self : this, function (juegos) {
  'use strict';

  const REGLAS = { maxPreguntas: 15, textoMax: 300, opcionMax: 160, opcionesMin: 2, opcionesMax: 6 };
  const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

  /* ───────────────────────── Lógica ───────────────────────── */

  const texto = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

  // Revisa UNA pregunta capturada en el panel.
  //   { ok:true,  pregunta }  → lista para guardar
  //   { ok:false, vacia:true } → fila totalmente vacía (se descarta sin avisar)
  //   { ok:false, error }      → incompleta (hay que avisar al admin)
  function validarPregunta(p) {
    const q = p && typeof p === 'object' ? p : {};
    const enunciado = texto(q.pregunta, REGLAS.textoMax);
    const esMultiple = q.tipo === 'multiple';
    const crudas = esMultiple && Array.isArray(q.opciones) ? q.opciones.slice(0, REGLAS.opcionesMax) : [];
    const opcionesLlenas = crudas.filter(o => texto(o, REGLAS.opcionMax));
    if (!enunciado && !opcionesLlenas.length) return { ok: false, vacia: true };
    if (!enunciado) return { ok: false, error: 'escribe el texto de la pregunta' };

    if (!esMultiple) {
      return { ok: true, pregunta: { pregunta: enunciado, tipo: 'vof', correcta: Number(q.correcta) === 1 ? 1 : 0 } };
    }
    if (opcionesLlenas.length < REGLAS.opcionesMin) return { ok: false, error: `necesita al menos ${REGLAS.opcionesMin} opciones con texto` };
    const idx = Number(q.correcta);
    if (!Number.isInteger(idx) || idx < 0 || idx >= crudas.length) return { ok: false, error: 'marca cuál es la respuesta correcta' };
    if (!texto(crudas[idx], REGLAS.opcionMax)) return { ok: false, error: 'la opción marcada como correcta está vacía' };
    // Al quitar opciones vacías, el número de la correcta se recalcula (si no, apuntaría a otra opción).
    const opciones = [];
    let correcta = 0;
    crudas.forEach((o, i) => {
      const t = texto(o, REGLAS.opcionMax);
      if (!t) return;
      if (i === idx) correcta = opciones.length;
      opciones.push(t);
    });
    return { ok: true, pregunta: { pregunta: enunciado, tipo: 'multiple', opciones, correcta } };
  }

  // Limpia la lista completa de una clase. Devuelve { preguntas, errores:[{indice, mensaje}] }.
  function limpiarPreguntas(lista) {
    const preguntas = [], errores = [];
    (Array.isArray(lista) ? lista : []).forEach((p, i) => {
      if (preguntas.length >= REGLAS.maxPreguntas) return;
      const r = validarPregunta(p);
      if (r.ok) preguntas.push(r.pregunta);
      else if (!r.vacia) errores.push({ indice: i, mensaje: `Pregunta ${i + 1}: ${r.error}` });
    });
    return { preguntas, errores };
  }

  // Preguntas válidas de una clase tal como están guardadas (para mostrarlas al miembro).
  function preguntasDeClase(leccion) {
    const crudas = leccion && Array.isArray(leccion.preguntas) ? leccion.preguntas : [];
    return limpiarPreguntas(crudas).preguntas;
  }

  // Califica. respuestas[i] = número de la opción elegida (o null).
  function calificar(preguntas, respuestas) {
    const lista = Array.isArray(preguntas) ? preguntas : [];
    const resp = Array.isArray(respuestas) ? respuestas : [];
    const detalle = lista.map((p, i) => {
      const elegida = Number.isInteger(resp[i]) ? resp[i] : null;
      return { elegida, correcta: p.correcta, acertada: elegida !== null && elegida === p.correcta };
    });
    return { total: lista.length, correctas: detalle.filter(d => d.acertada).length, detalle };
  }

  // Convierte la respuesta del servidor ({ correctas, total, detalle:[{ correcta, acertada }] }) en la nota
  // que dibuja la pantalla. Lanza un Error si no corresponde a las preguntas que se están mostrando.
  function notaDelServidor(preguntas, respuestas, resp) {
    const lista = Array.isArray(preguntas) ? preguntas : [];
    const detalleServidor = resp && Array.isArray(resp.detalle) ? resp.detalle : null;
    if (!detalleServidor || detalleServidor.length !== lista.length) {
      const e = new Error('Las preguntas de esta clase no coinciden con las del servidor. Recarga la página e inténtalo de nuevo.');
      e.mensajeUsuario = e.message;
      throw e;
    }
    const resp2 = Array.isArray(respuestas) ? respuestas : [];
    const detalle = lista.map((p, i) => {
      const s = detalleServidor[i] || {};
      const elegida = Number.isInteger(resp2[i]) ? resp2[i] : null;
      const correcta = Number.isInteger(s.correcta) ? s.correcta : null;
      return { elegida, correcta, acertada: s.acertada === true };
    });
    return { total: lista.length, correctas: detalle.filter(d => d.acertada).length, detalle };
  }

  // Opciones que se muestran de una pregunta
  const opcionesDe = p => p.tipo === 'multiple' ? p.opciones : ['Verdadero', 'Falso'];

  /* ───────────────────────── Pantalla (solo navegador) ───────────────────────── */

  const el = (etiqueta, clase, txt) => {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (txt != null) e.textContent = txt;
    return e;
  };

  /**
   * Abre las preguntas de una clase.
   *   subtitulo   texto bajo el título (nombre de la clase)
   *   alTerminar() se llama al pulsar "Continuar"
   *   alCerrar()   se llama si se cierra con la X
   *   obligatorio  true: sin X ni Esc; hay que terminar para continuar
   *   validar(respuestas) Promise<{ correctas, total, detalle }>  (opcional) el servidor califica; si falla
   *                se muestra el error (e.mensajeUsuario) y se puede reintentar
   * Devuelve { cerrar() } o null si no hay preguntas válidas (en ese caso llama a alTerminar).
   */
  function abrir(preguntasCrudas, opciones) {
    const o = opciones || {};
    const preguntas = limpiarPreguntas(preguntasCrudas).preguntas;
    const saltar = () => { if (typeof o.alTerminar === 'function') o.alTerminar(); return null; };
    if (!preguntas.length || typeof document === 'undefined' || !juegos || !juegos.crearVentana) return saltar();

    // obligatorio: sin botón de cerrar; hay que contestar y pulsar "Continuar" (como en alintecfood)
    const ventana = juegos.crearVentana('Antes de seguir', o.subtitulo || '', o.obligatorio === true, o.alCerrar);
    const respuestas = new Array(preguntas.length).fill(null);
    let comprobado = false;
    let enviando = false;

    const resumen = el('div', 'qz-resumen', '0 de ' + preguntas.length + ' respondidas');
    const barra = el('div', 'jg-progress');
    const pista = el('div', 'jg-progress__track');
    const llenado = el('div', 'jg-progress__fill');
    pista.appendChild(llenado); barra.appendChild(pista);
    ventana.cuerpo.appendChild(barra);

    const tarjetas = preguntas.map((p, i) => {
      const tarjeta = el('div', 'qz-card');
      const cab = el('div', 'qz-eyebrow');
      cab.appendChild(el('span', 'qz-num', String(i + 1)));
      cab.appendChild(el('span', null, `Pregunta ${i + 1} de ${preguntas.length}`));
      const veredicto = el('span', 'qz-veredicto'); veredicto.hidden = true;
      cab.appendChild(veredicto);
      tarjeta.appendChild(cab);
      tarjeta.appendChild(el('p', 'qz-texto', p.pregunta));
      const lista = el('div', 'qz-opciones');
      lista.setAttribute('role', 'radiogroup');
      lista.setAttribute('aria-label', `Pregunta ${i + 1}`);
      const botones = opcionesDe(p).map((txt, oi) => {
        const b = el('button', 'qz-op'); b.type = 'button';
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
        b.appendChild(el('span', 'qz-op__letra', p.tipo === 'multiple' ? LETRAS[oi] : (oi === 0 ? 'V' : 'F')));
        b.appendChild(el('span', 'qz-op__txt', txt));
        b.addEventListener('click', () => {
          if (comprobado || enviando) return;
          respuestas[i] = oi;
          botones.forEach((x, k) => { x.classList.toggle('is-sel', k === oi); x.setAttribute('aria-checked', String(k === oi)); });
          const hechas = respuestas.filter(r => r !== null).length;
          resumen.textContent = `${hechas} de ${preguntas.length} respondidas`;
          llenado.style.width = Math.round((hechas / preguntas.length) * 100) + '%';
          comprobar.disabled = hechas < preguntas.length;
        });
        lista.appendChild(b);
        return b;
      });
      tarjeta.appendChild(lista);
      ventana.cuerpo.appendChild(tarjeta);
      return { tarjeta, botones, veredicto };
    });
    ventana.cuerpo.appendChild(resumen);
    const errorValidar = el('p', 'qz-error');
    errorValidar.hidden = true;
    errorValidar.setAttribute('role', 'alert');
    ventana.cuerpo.appendChild(errorValidar);

    const comprobar = juegos.botonContinuar('Comprobar respuestas');
    const seguir = juegos.botonContinuar('Continuar');
    seguir.hidden = true; seguir.disabled = false;
    ventana.pie.appendChild(comprobar);
    ventana.pie.appendChild(seguir);

    comprobar.addEventListener('click', async () => {
      if (comprobar.disabled || comprobado || enviando) return;
      let nota;
      if (typeof o.validar === 'function') {
        // El servidor es quien califica y registra que la clase se contestó.
        const textoBoton = comprobar.textContent;
        enviando = true;
        comprobar.disabled = true;
        comprobar.textContent = 'Comprobando…';
        errorValidar.hidden = true;
        try {
          nota = notaDelServidor(preguntas, respuestas, await o.validar(respuestas.slice()));
        } catch (e) {
          enviando = false;
          comprobar.textContent = textoBoton;
          comprobar.disabled = false;
          errorValidar.textContent = (e && (e.mensajeUsuario || e.message)) || 'No se pudieron comprobar tus respuestas. Inténtalo de nuevo.';
          errorValidar.hidden = false;
          if (errorValidar.scrollIntoView) errorValidar.scrollIntoView({ block: 'center' });
          return;
        }
        enviando = false;
      } else {
        nota = calificar(preguntas, respuestas);
      }
      comprobado = true;
      nota.detalle.forEach((d, i) => {
        const t = tarjetas[i];
        t.tarjeta.classList.add(d.acertada ? 'is-ok' : 'is-mal');
        t.botones.forEach((b, k) => {
          b.disabled = true;
          b.classList.remove('is-sel');
          if (k === d.correcta) b.classList.add('is-correcta');
          else if (k === d.elegida) b.classList.add('is-incorrecta');
        });
        t.veredicto.hidden = false;
        t.veredicto.textContent = d.acertada ? 'Correcta' : 'Incorrecta';
        t.veredicto.className = 'qz-veredicto ' + (d.acertada ? 'qz-veredicto--ok' : 'qz-veredicto--mal');
      });
      resumen.textContent = `Acertaste ${nota.correctas} de ${nota.total}`;
      resumen.classList.add('is-final');
      comprobar.hidden = true;
      seguir.hidden = false;
      seguir.focus();
      const primera = ventana.cuerpo.querySelector('.qz-card.is-mal');
      if (primera && primera.scrollIntoView) primera.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    seguir.addEventListener('click', () => {
      ventana.cerrar();
      if (typeof o.alTerminar === 'function') o.alTerminar();
    });
    return { cerrar: () => ventana.cerrar() };
  }

  return { REGLAS, validarPregunta, limpiarPreguntas, preguntasDeClase, calificar, notaDelServidor, opcionesDe, abrir };
});
