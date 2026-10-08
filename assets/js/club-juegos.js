/* ============================================================ */
/* JUEGOS DINÁMICOS DE CLASE · Club VIP Zoorigen                 */
/*                                                                */
/* Cada clase puede tener un juego al final: sopa de letras,      */
/* memorama, rompecabezas o ahorcado. Se guarda dentro de la      */
/* clase como  lecciones[i].juego = { tipo, datos }.              */
/*                                                                */
/* - Es práctica: no guarda puntaje ni afecta el certificado.     */
/* - La lógica (arriba) no toca la pantalla y se prueba en Node:  */
/*   tests/club-juegos.test.js                                    */
/* - La pantalla (abajo) solo corre en el navegador.              */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_JUEGOS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────────────────────── Catálogo y límites ───────────────────────── */

  const TIPOS = {
    sopa_letras: 'Sopa de letras',
    memorama: 'Memorama',
    rompecabezas: 'Rompecabezas',
    ahorcado: 'Ahorcado'
  };

  // Mínimos para guardar un juego (si no se cumplen, el juego es inválido) y topes
  // para que un dato mal capturado no rompa la pantalla.
  const REGLAS = {
    sopa: { min: 3, max: 10, letrasMin: 2, letrasMax: 14 },
    memorama: { min: 3, max: 10, terminoMax: 80, definicionMax: 200 },
    ahorcado: { min: 1, max: 20, letrasMin: 3, letrasMax: 16, pistaMax: 140, errores: 6 },
    rompecabezas: { dificultades: ['3', '4', '5'] },
    tope: 30
  };

  /* ───────────────────────── Utilidades ───────────────────────── */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // Letras mayúsculas sin acentos, conservando la Ñ ("Murciélago" -> "MURCIELAGO", "Niño" -> "NIÑO").
  function limpiarLetras(valor) {
    return String(valor == null ? '' : valor)
      .toUpperCase().replace(/Ñ/g, '\u0001')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\u0001/g, 'Ñ').replace(/[^A-ZÑ]/g, '');
  }

  function recortar(valor, max) {
    return String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim().slice(0, max);
  }

  // Solo direcciones http(s), rutas del propio sitio e imágenes incrustadas: nunca "javascript:".
  function urlImagenSegura(valor) {
    const u = String(valor == null ? '' : valor).trim();
    if (!u || u.length > 2000) return null;
    if (/^https?:\/\/[^\s"'<>]+$/i.test(u)) return u;
    if (/^(\.\.\/|\.\/|\/)?assets\/[A-Za-z0-9_\-./%]+$/.test(u) && !u.includes('..', 3)) return u;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(u)) return u;
    return null;
  }

  // Mezcla Fisher–Yates (la de sort(() => Math.random() - .5) sale sesgada).
  function barajar(lista, rng) {
    const r = rng || Math.random;
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ───────────────────────── Validación de datos ───────────────────────── */

  // Devuelve { tipo, datos } limpio o null si el juego no es válido.
  // Se usa al guardar en el panel admin y otra vez antes de mostrarlo al alumno.
  function limpiarJuego(juego) {
    if (!juego || typeof juego !== 'object') return null;
    const tipo = juego.tipo;
    if (typeof tipo !== 'string' || !Object.prototype.hasOwnProperty.call(TIPOS, tipo)) return null;
    const d = juego.datos && typeof juego.datos === 'object' ? juego.datos : {};

    if (tipo === 'sopa_letras') {
      const R = REGLAS.sopa;
      const palabras = (Array.isArray(d.palabras) ? d.palabras : [])
        .slice(0, REGLAS.tope).map(limpiarLetras)
        .filter(w => w.length >= R.letrasMin && w.length <= R.letrasMax);
      const unicas = Array.from(new Set(palabras));
      return unicas.length >= R.min ? { tipo, datos: { palabras: unicas } } : null;
    }

    if (tipo === 'memorama') {
      const R = REGLAS.memorama;
      const pares = (Array.isArray(d.pares) ? d.pares : []).slice(0, REGLAS.tope)
        .map(p => ({ termino: recortar(p && p.termino, R.terminoMax), definicion: recortar(p && p.definicion, R.definicionMax) }))
        .filter(p => p.termino && p.definicion);
      return pares.length >= R.min ? { tipo, datos: { pares } } : null;
    }

    if (tipo === 'rompecabezas') {
      const dif = String(d.dificultad == null ? '3' : d.dificultad);
      return { tipo, datos: { dificultad: REGLAS.rompecabezas.dificultades.includes(dif) ? dif : '3', imagenUrl: urlImagenSegura(d.imagenUrl) } };
    }

    // ahorcado
    const R = REGLAS.ahorcado;
    const palabras = (Array.isArray(d.palabras) ? d.palabras : []).slice(0, REGLAS.tope)
      .map(p => ({ palabra: limpiarLetras(p && p.palabra), pista: recortar(p && p.pista, R.pistaMax) }))
      .filter(p => p.palabra.length >= R.letrasMin && p.palabra.length <= R.letrasMax);
    return palabras.length >= R.min ? { tipo, datos: { palabras: palabras.slice(0, R.max) } } : null;
  }

  /* ───────────────────────── Sopa de letras ───────────────────────── */

  const DIRECCIONES = [[0, 1], [1, 0], [1, 1], [-1, 1]];
  const ABECEDARIO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

  function generarSopa(palabras, rng) {
    const r = rng || Math.random;
    const R = REGLAS.sopa;
    const words = (palabras || []).map(limpiarLetras)
      .filter(w => w.length >= R.letrasMin && w.length <= R.letrasMax)
      .sort((a, b) => b.length - a.length);
    const maxLen = Math.max(8, ...words.map(w => w.length));
    const size = Math.max(10, Math.min(15, maxLen + 2));
    const grid = Array.from({ length: size }, () => Array(size).fill(null));
    const placed = [];

    words.forEach(word => {
      for (let intento = 0; intento < 300; intento++) {
        const dir = DIRECCIONES[Math.floor(r() * DIRECCIONES.length)];
        const row0 = Math.floor(r() * size);
        const col0 = Math.floor(r() * size);
        const endRow = row0 + dir[0] * (word.length - 1);
        const endCol = col0 + dir[1] * (word.length - 1);
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
        let cabe = true;
        for (let i = 0; i < word.length; i++) {
          const actual = grid[row0 + dir[0] * i][col0 + dir[1] * i];
          if (actual && actual !== word[i]) { cabe = false; break; }
        }
        if (!cabe) continue;
        for (let i = 0; i < word.length; i++) grid[row0 + dir[0] * i][col0 + dir[1] * i] = word[i];
        placed.push({ word, row0, col0, dir });
        break;
      }
    });

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) if (!grid[i][j]) grid[i][j] = ABECEDARIO[Math.floor(r() * ABECEDARIO.length)];
    }
    return { grid, size, placed };
  }

  // Celdas en línea recta entre dos puntos (horizontal, vertical o diagonal; ajusta a la dirección dominante).
  function lineaEntre(a, b, size) {
    const dr = b.r - a.r, dc = b.c - a.c;
    const adr = Math.abs(dr), adc = Math.abs(dc);
    let sr = Math.sign(dr), sc = Math.sign(dc), largo;
    if (adr === 0 && adc === 0) return [{ r: a.r, c: a.c }];
    if (adr === 0) largo = adc + 1;
    else if (adc === 0) largo = adr + 1;
    else if (adr === adc) largo = adr + 1;
    else if (adc > adr) { sr = 0; largo = adc + 1; }
    else { sc = 0; largo = adr + 1; }
    const celdas = [];
    for (let i = 0; i < largo; i++) {
      const r = a.r + sr * i, c = a.c + sc * i;
      if (r < 0 || r >= size || c < 0 || c >= size) break;
      celdas.push({ r, c });
    }
    return celdas;
  }

  // ¿La selección forma una palabra pendiente (en un sentido o en el otro)? Devuelve esa palabra o null.
  function buscarCoincidencia(grid, celdas, placed, encontradas) {
    if (!celdas || celdas.length < 2) return null;
    const texto = celdas.map(({ r, c }) => grid[r][c]).join('');
    const reves = texto.split('').reverse().join('');
    return placed.find(p => !encontradas.has(p.word) && (p.word === texto || p.word === reves)) || null;
  }

  /* ───────────────────────── Memorama ───────────────────────── */

  function crearCartas(pares, rng) {
    const cartas = [];
    pares.forEach((p, i) => {
      cartas.push({ texto: p.termino, tipo: 'termino', parId: i });
      cartas.push({ texto: p.definicion, tipo: 'definicion', parId: i });
    });
    return barajar(cartas, rng);
  }

  // Un par válido es término + definición del MISMO par (dos términos iguales no cuentan).
  function sonPar(a, b) {
    return !!a && !!b && a.parId === b.parId && a.tipo !== b.tipo;
  }

  /* ───────────────────────── Rompecabezas ───────────────────────── */

  // slots[posición] = id de pieza. Nunca devuelve el rompecabezas ya armado.
  function barajarSlots(total, rng) {
    const base = Array.from({ length: total }, (_, i) => i);
    if (total < 2) return base;
    let slots = base, intentos = 0;
    do { slots = barajar(base, rng); intentos++; } while (slots.every((v, i) => v === i) && intentos < 50);
    if (slots.every((v, i) => v === i)) [slots[0], slots[1]] = [slots[1], slots[0]];
    return slots;
  }

  // piezas: [{ slot, pieza }]
  function puzzleResuelto(piezas) {
    return piezas.length > 0 && piezas.every(p => Number(p.slot) === Number(p.pieza));
  }

  /* ───────────────────────── Ahorcado ───────────────────────── */

  function nuevaPartidaAhorcado(lista, rng, anterior) {
    const r = rng || Math.random;
    const otras = lista.length > 1 ? lista.filter(p => p !== anterior) : lista;
    const elegido = otras[Math.floor(r() * otras.length)];
    const palabra = elegido.palabra;
    const unicas = Array.from(new Set(palabra.split('')));
    // 1-2 letras de apoyo para no empezar de cero; nunca se regala la palabra completa.
    let nPistas = Math.max(1, Math.min(2, Math.floor(unicas.length * 0.25)));
    if (unicas.length <= nPistas) nPistas = 0;
    const apoyo = barajar(unicas, r).slice(0, nPistas);
    return { elegido, palabra, errores: 0, adivinadas: new Set(apoyo), usadas: new Set(apoyo), apoyo };
  }

  function ganoAhorcado(est) { return est.palabra.split('').every(ch => est.adivinadas.has(ch)); }
  function perdioAhorcado(est) { return est.errores >= REGLAS.ahorcado.errores; }

  function jugarLetra(est, letra) {
    if (est.usadas.has(letra) || ganoAhorcado(est) || perdioAhorcado(est)) return est;
    est.usadas.add(letra);
    if (est.palabra.includes(letra)) est.adivinadas.add(letra); else est.errores++;
    return est;
  }

  /* ============================================================ */
  /* PANTALLA (solo navegador)                                    */
  /* ============================================================ */

  const NS = 'http://www.w3.org/2000/svg';
  const PALETA = ['#B34A02', '#036CB0', '#5F6F00', '#6B4BCF', '#B3261E', '#08777A', '#8A5A00', '#C2410C', '#2457B8', '#4A5800'];
  let abiertos = 0;

  function el(etiqueta, clase, texto) {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }

  const ICONO_OK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function crearVentana(titulo, subtitulo, obligatorio, alCerrar) {
    const ov = el('div', 'jg-overlay');
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    const caja = el('div', 'jg-box');
    caja.tabIndex = -1;
    const cab = el('div', 'jg-head');
    const textos = el('div', 'jg-head__txt');
    const h = el('h3', 'jg-title', titulo);
    h.id = 'jg-t-' + Math.random().toString(36).slice(2, 8);
    ov.setAttribute('aria-labelledby', h.id);
    textos.appendChild(h);
    if (subtitulo) textos.appendChild(el('p', 'jg-subtitle', subtitulo));
    cab.appendChild(textos);
    const cuerpo = el('div', 'jg-body');
    const pie = el('div', 'jg-foot');
    caja.appendChild(cab); caja.appendChild(cuerpo); caja.appendChild(pie);
    ov.appendChild(caja);
    document.body.appendChild(ov);
    abiertos++;
    document.body.classList.add('jg-abierto');

    const ctl = {
      cuerpo, pie,
      cerrar() {
        if (!ov.parentNode) return;
        ov.remove();
        document.removeEventListener('keydown', teclas, true);
        abiertos = Math.max(0, abiertos - 1);
        if (!abiertos) document.body.classList.remove('jg-abierto');
        if (typeof alCerrar === 'function') alCerrar();
      }
    };
    function teclas(ev) { if (ev.key === 'Escape' && !obligatorio) { ev.stopPropagation(); ctl.cerrar(); } }
    document.addEventListener('keydown', teclas, true);
    if (!obligatorio) {
      const x = el('button', 'jg-close'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
      x.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      x.addEventListener('click', () => ctl.cerrar());
      cab.appendChild(x);
    }
    caja.focus();
    return ctl;
  }

  function barraProgreso(total) {
    const w = el('div', 'jg-progress');
    const pista = el('div', 'jg-progress__track');
    const llenado = el('div', 'jg-progress__fill');
    pista.appendChild(llenado);
    const txt = el('div', 'jg-progress__txt', '0 / ' + total);
    w.appendChild(pista); w.appendChild(txt);
    return { nodo: w, actualizar(n) { txt.textContent = n + ' / ' + total; llenado.style.width = Math.round((n / total) * 100) + '%'; } };
  }

  function mensajeVictoria(cuerpo, texto) {
    const w = el('div', 'jg-win');
    w.setAttribute('role', 'status');
    w.innerHTML = ICONO_OK;
    w.appendChild(document.createTextNode(' ' + texto));
    cuerpo.appendChild(w);
    return w;
  }

  function botonContinuar(texto) {
    const b = el('button', 'jg-continuar', texto || 'Continuar');
    b.type = 'button';
    b.disabled = true;
    return b;
  }

  /* ── Sopa de letras ── */
  function pantallaSopa(juego, ctx, ventana, cont) {
    const palabras = juego.datos.palabras.slice(0, REGLAS.sopa.max);
    const { grid, size, placed } = generarSopa(palabras, ctx.rng);
    if (!placed.length) return false;
    const encontradas = new Set();
    const { cuerpo, pie } = ventana;

    const guia = el('p', 'jg-lead');
    guia.innerHTML = 'Encuentra las <b></b> palabras escondidas en el tablero.';
    guia.querySelector('b').textContent = placed.length;
    const prog = barraProgreso(placed.length);
    const envoltura = el('div', 'sp-wrap');
    const tablero = el('div', 'sp-board');
    tablero.style.gridTemplateColumns = 'repeat(' + size + ', 1fr)';
    const mapa = {};
    grid.forEach((fila, r) => fila.forEach((ch, c) => {
      const celda = el('div', 'sp-cell', ch);
      celda.dataset.r = r; celda.dataset.c = c;
      mapa[r + ',' + c] = celda;
      tablero.appendChild(celda);
    }));
    const lado = el('div', 'sp-side');
    lado.appendChild(el('div', 'sp-side__title', 'Palabras a encontrar'));
    const chips = {};
    placed.forEach(p => {
      const chip = el('div', 'sp-chip');
      chip.appendChild(el('span', 'sp-chip__dot'));
      chip.appendChild(document.createTextNode(p.word));
      chips[p.word] = chip;
      lado.appendChild(chip);
    });
    const ayuda = el('p', 'sp-help');
    ayuda.innerHTML = '<b>Arrastra</b> desde la primera hasta la última letra, o <b>toca</b> la primera letra y luego la última.';
    lado.appendChild(ayuda);
    envoltura.appendChild(tablero); envoltura.appendChild(lado);
    cuerpo.appendChild(guia); cuerpo.appendChild(prog.nodo); cuerpo.appendChild(envoltura);

    let inicio = null, arrastrando = false, ruta = [], abajo = null;
    const pintar = celdas => {
      tablero.querySelectorAll('.sp-cell.is-path').forEach(e => e.classList.remove('is-path'));
      celdas.forEach(({ r, c }) => { const e = mapa[r + ',' + c]; if (e && !e.dataset.found) e.classList.add('is-path'); });
      ruta = celdas;
    };
    const limpiar = () => pintar([]);
    const celdaEn = ev => {
      const e = document.elementFromPoint(ev.clientX, ev.clientY);
      return e && e.classList && e.classList.contains('sp-cell') ? { r: +e.dataset.r, c: +e.dataset.c } : null;
    };
    function validar(celdas) {
      const hallada = buscarCoincidencia(grid, celdas, placed, encontradas);
      if (hallada) {
        encontradas.add(hallada.word);
        const color = PALETA[(encontradas.size - 1) % PALETA.length];
        celdas.forEach(({ r, c }) => {
          const e = mapa[r + ',' + c];
          e.classList.remove('is-path'); e.classList.add('is-found'); e.dataset.found = '1'; e.style.background = color;
        });
        const chip = chips[hallada.word];
        chip.classList.add('is-found');
        chip.querySelector('.sp-chip__dot').style.background = color;
        prog.actualizar(encontradas.size);
        if (encontradas.size === placed.length) { cont.habilitar(); mensajeVictoria(cuerpo, '¡Encontraste todas las palabras!'); }
      }
      limpiar();
    }
    tablero.addEventListener('pointerdown', ev => {
      const cel = celdaEn(ev); if (!cel) return;
      ev.preventDefault(); arrastrando = false;
      try { tablero.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ }
      abajo = cel; pintar([cel]);
    });
    tablero.addEventListener('pointermove', ev => {
      if (!abajo) return;
      const cel = celdaEn(ev); if (!cel) return;
      if (cel.r !== abajo.r || cel.c !== abajo.c) arrastrando = true;
      if (arrastrando) pintar(lineaEntre(abajo, cel, size));
    });
    tablero.addEventListener('pointerup', ev => {
      if (!abajo) return;
      const a = abajo; abajo = null;
      const cel = celdaEn(ev) || (ruta.length ? ruta[ruta.length - 1] : null);
      if (arrastrando) { validar(cel ? lineaEntre(a, cel, size) : ruta); inicio = null; arrastrando = false; return; }
      if (!inicio) { inicio = a; pintar([a]); }
      else if (inicio.r === a.r && inicio.c === a.c) { inicio = null; limpiar(); }
      else { validar(lineaEntre(inicio, a, size)); inicio = null; }
    });
    tablero.addEventListener('pointercancel', () => { abajo = null; arrastrando = false; inicio = null; limpiar(); });

    pie.appendChild(cont.boton);
    if (ctx.pruebas) { ctx.pruebas.colocadas = placed; ctx.pruebas.tablero = tablero; }
    if (ctx.pruebas) ctx.pruebas.resolver = () => {
      placed.forEach(p => {
        const fin = { r: p.row0 + p.dir[0] * (p.word.length - 1), c: p.col0 + p.dir[1] * (p.word.length - 1) };
        validar(lineaEntre({ r: p.row0, c: p.col0 }, fin, size));
      });
    };
    return true;
  }

  /* ── Memorama ── */
  function pantallaMemorama(juego, ctx, ventana, cont) {
    const pares = juego.datos.pares.slice(0, REGLAS.memorama.max);
    const cartas = crearCartas(pares, ctx.rng);
    const { cuerpo, pie } = ventana;
    const guia = el('p', 'jg-lead');
    guia.innerHTML = 'Voltea las tarjetas y empareja cada <b>término</b> con su <b>definición</b>.';
    const prog = barraProgreso(pares.length);
    const rejilla = el('div', 'mm-grid');
    const nodos = cartas.map((c, i) => {
      const carta = el('button', 'mm-card'); carta.type = 'button';
      carta.setAttribute('aria-label', 'Tarjeta ' + (i + 1));
      const interior = el('div', 'mm-inner');
      const frente = el('div', 'mm-face mm-front');
      const dorso = el('div', 'mm-face mm-back');
      dorso.appendChild(el('span', 'mm-back__tag ' + (c.tipo === 'termino' ? 'mm-back__tag--t' : 'mm-back__tag--d'), c.tipo === 'termino' ? 'Término' : 'Definición'));
      dorso.appendChild(el('span', 'mm-back__txt', c.texto));
      interior.appendChild(frente); interior.appendChild(dorso); carta.appendChild(interior);
      rejilla.appendChild(carta);
      return carta;
    });
    cuerpo.appendChild(guia); cuerpo.appendChild(prog.nodo); cuerpo.appendChild(rejilla);

    let volteadas = [], bloqueado = false;
    const hechos = new Set();
    const espera = ctx.rapido ? 20 : 2000;
    nodos.forEach((nodo, idx) => nodo.addEventListener('click', () => {
      if (bloqueado || nodo.classList.contains('is-up') || nodo.classList.contains('is-matched')) return;
      nodo.classList.add('is-up'); volteadas.push(idx);
      if (volteadas.length < 2) return;
      bloqueado = true;
      const [i1, i2] = volteadas;
      if (sonPar(cartas[i1], cartas[i2])) {
        setTimeout(() => {
          nodos[i1].classList.add('is-matched'); nodos[i2].classList.add('is-matched');
          hechos.add(cartas[i1].parId); prog.actualizar(hechos.size);
          if (hechos.size === pares.length) { cont.habilitar(); mensajeVictoria(cuerpo, '¡Completaste todos los pares!'); }
          volteadas = []; bloqueado = false;
        }, ctx.rapido ? 10 : 500);
      } else {
        setTimeout(() => { nodos[i1].classList.add('is-wrong'); nodos[i2].classList.add('is-wrong'); }, ctx.rapido ? 5 : 350);
        setTimeout(() => {
          [nodos[i1], nodos[i2]].forEach(n => n.classList.remove('is-up', 'is-wrong'));
          volteadas = []; bloqueado = false;
        }, espera);
      }
    }));
    pie.appendChild(cont.boton);
    if (ctx.pruebas) ctx.pruebas.resolver = () => {
      cartas.forEach((c, i) => { if (!nodos[i].classList.contains('is-matched')) nodos[i].classList.add('is-matched'); });
      pares.forEach((_, i) => hechos.add(i)); prog.actualizar(pares.length);
      cont.habilitar(); mensajeVictoria(cuerpo, '¡Completaste todos los pares!');
    };
    return true;
  }

  /* ── Rompecabezas (piezas tipo jigsaw) ── */
  function pantallaRompecabezas(juego, ctx, ventana, cont) {
    const n = parseInt(juego.datos.dificultad, 10) || 3;
    const img = urlImagenSegura(juego.datos.imagenUrl) || urlImagenSegura(ctx.portada) || urlImagenSegura(ctx.imagenPorDefecto);
    if (!img) return false;
    const { cuerpo, pie } = ventana;
    const ancho = Math.min(400, Math.max(240, (window.innerWidth || 400) - 96));
    const CS = ancho / n, K = CS * 0.24, total = n * n;
    const r = ctx.rng || Math.random;
    const TH = Array.from({ length: n + 1 }, () => Array.from({ length: n }, () => (r() < 0.5 ? 1 : -1)));
    const TV = Array.from({ length: n }, () => Array.from({ length: n + 1 }, () => (r() < 0.5 ? 1 : -1)));

    function lado(x0, y0, x1, y1, signo, horizontal) {
      if (signo === 0) return 'L ' + x1 + ' ' + y1 + ' ';
      const t = CS * 0.19;
      if (horizontal) {
        const dir = Math.sign(x1 - x0), mx = (x0 + x1) / 2;
        return 'L ' + (mx - dir * t) + ' ' + y0 + ' ' +
          'C ' + (mx - dir * t) + ' ' + (y0 + signo * t * 0.3) + ', ' + (mx - dir * t * 1.3) + ' ' + (y0 + signo * t * 1.7) + ', ' + mx + ' ' + (y0 + signo * t * 1.7) + ' ' +
          'C ' + (mx + dir * t * 1.3) + ' ' + (y0 + signo * t * 1.7) + ', ' + (mx + dir * t) + ' ' + (y0 + signo * t * 0.3) + ', ' + (mx + dir * t) + ' ' + y0 + ' ' +
          'L ' + x1 + ' ' + y1 + ' ';
      }
      const dir = Math.sign(y1 - y0), my = (y0 + y1) / 2;
      return 'L ' + x0 + ' ' + (my - dir * t) + ' ' +
        'C ' + (x0 + signo * t * 0.3) + ' ' + (my - dir * t) + ', ' + (x0 + signo * t * 1.7) + ' ' + (my - dir * t * 1.3) + ', ' + (x0 + signo * t * 1.7) + ' ' + my + ' ' +
        'C ' + (x0 + signo * t * 1.7) + ' ' + (my + dir * t * 1.3) + ', ' + (x0 + signo * t * 0.3) + ' ' + (my + dir * t) + ', ' + x0 + ' ' + (my + dir * t) + ' ' +
        'L ' + x1 + ' ' + y1 + ' ';
    }
    function trazo(fila, col) {
      const x0 = K, y0 = K, x1 = K + CS, y1 = K + CS;
      return 'M ' + x0 + ' ' + y0 + ' ' +
        lado(x0, y0, x1, y0, fila === 0 ? 0 : TH[fila][col], true) +
        lado(x1, y0, x1, y1, col === n - 1 ? 0 : TV[fila][col + 1], false) +
        lado(x1, y1, x0, y1, fila === n - 1 ? 0 : TH[fila + 1][col], true) +
        lado(x0, y1, x0, y0, col === 0 ? 0 : TV[fila][col], false) + 'Z';
    }

    const slots = barajarSlots(total, r);
    const uid = Math.random().toString(36).slice(2, 8);
    const guia = el('p', 'jg-lead', 'Arma la imagen colocando cada pieza en su lugar.');
    const caparazon = el('div', 'pz-shell');
    const barra = el('div', 'pz-toolbar');
    const refTxt = el('div');
    refTxt.appendChild(el('div', 'sp-side__title', 'Imagen de referencia'));
    refTxt.appendChild(el('div', 'pz-refhint', 'Intercambia piezas hasta reconstruirla'));
    const ref = el('img', 'pz-reference'); ref.src = img; ref.alt = 'Referencia del rompecabezas';
    const contador = el('span', 'pz-moves', '0 movimientos');
    barra.appendChild(refTxt); barra.appendChild(ref); barra.appendChild(contador);
    const tablero = el('div', 'pz-board');
    tablero.style.width = ancho + 'px'; tablero.style.height = ancho + 'px';
    tablero.style.backgroundSize = CS + 'px ' + CS + 'px';
    const tam = CS + 2 * K;

    slots.forEach((piezaId, slot) => {
      const pf = Math.floor(piezaId / n), pc = piezaId % n;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'pz-piece');
      svg.dataset.slot = slot; svg.dataset.piece = piezaId;
      svg.setAttribute('width', tam); svg.setAttribute('height', tam);
      svg.setAttribute('viewBox', '0 0 ' + tam + ' ' + tam);
      svg.style.left = ((slot % n) * CS - K) + 'px';
      svg.style.top = (Math.floor(slot / n) * CS - K) + 'px';
      const defs = document.createElementNS(NS, 'defs');
      const clip = document.createElementNS(NS, 'clipPath'); clip.setAttribute('id', 'pzclip-' + uid + '-' + piezaId);
      const pClip = document.createElementNS(NS, 'path'); pClip.setAttribute('d', trazo(pf, pc)); clip.appendChild(pClip); defs.appendChild(clip);
      const g = document.createElementNS(NS, 'g'); g.setAttribute('clip-path', 'url(#pzclip-' + uid + '-' + piezaId + ')');
      const im = document.createElementNS(NS, 'image');
      im.setAttribute('href', img);
      im.setAttribute('x', K - pc * CS); im.setAttribute('y', K - pf * CS);
      im.setAttribute('width', n * CS); im.setAttribute('height', n * CS);
      im.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      g.appendChild(im);
      const borde = document.createElementNS(NS, 'path'); borde.setAttribute('d', trazo(pf, pc)); borde.setAttribute('fill', 'none'); borde.setAttribute('stroke', 'rgba(255,255,255,.92)'); borde.setAttribute('stroke-width', '1.8');
      const sombra = document.createElementNS(NS, 'path'); sombra.setAttribute('d', trazo(pf, pc)); sombra.setAttribute('fill', 'none'); sombra.setAttribute('stroke', 'rgba(16,47,53,.25)'); sombra.setAttribute('stroke-width', '.65'); sombra.setAttribute('transform', 'translate(0 1.2)');
      svg.appendChild(defs); svg.appendChild(g); svg.appendChild(borde); svg.appendChild(sombra);
      tablero.appendChild(svg);
    });
    caparazon.appendChild(barra); caparazon.appendChild(tablero);
    const ayuda = el('p', 'pz-help');
    ayuda.innerHTML = '<b>Arrastra</b> una pieza sobre otra para intercambiarlas, o <b>toca</b> una y luego la otra.';
    cuerpo.appendChild(guia); cuerpo.appendChild(caparazon); cuerpo.appendChild(ayuda);

    let terminado = false, movimientos = 0, seleccionada = null, arrastre = null, movio = false, offX = 0, offY = 0;
    const piezas = () => Array.from(tablero.querySelectorAll('.pz-piece'));
    const posDe = slot => ({ x: (slot % n) * CS - K, y: Math.floor(slot / n) * CS - K });
    function moverA(pieza, slot) {
      pieza.dataset.slot = slot;
      const p = posDe(slot);
      pieza.style.left = p.x + 'px'; pieza.style.top = p.y + 'px';
      pieza.classList.toggle('is-correct', slot === +pieza.dataset.piece);
    }
    function revisar() {
      if (!puzzleResuelto(piezas().map(p => ({ slot: p.dataset.slot, pieza: p.dataset.piece })))) return;
      terminado = true;
      piezas().forEach(p => p.classList.add('is-locked'));
      cont.habilitar();
      mensajeVictoria(cuerpo, '¡Rompecabezas completado en ' + movimientos + ' movimiento' + (movimientos === 1 ? '' : 's') + '!');
    }
    function intercambiar(a, b) {
      const sa = +a.dataset.slot, sb = +b.dataset.slot;
      moverA(a, sb); moverA(b, sa);
      movimientos++;
      contador.textContent = movimientos + ' movimiento' + (movimientos === 1 ? '' : 's');
      setTimeout(revisar, ctx.rapido ? 10 : 380);
    }
    tablero.addEventListener('pointerdown', ev => {
      if (terminado) return;
      const pieza = ev.target.closest && ev.target.closest('.pz-piece'); if (!pieza) return;
      ev.preventDefault();
      arrastre = pieza; movio = false;
      const caja = pieza.getBoundingClientRect(); offX = ev.clientX - caja.left; offY = ev.clientY - caja.top;
      try { tablero.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ }
    });
    tablero.addEventListener('pointermove', ev => {
      if (!arrastre || terminado) return;
      const caja = tablero.getBoundingClientRect();
      const nx = ev.clientX - caja.left - offX, ny = ev.clientY - caja.top - offY;
      if (!movio) {
        const p0 = posDe(+arrastre.dataset.slot);
        if (Math.hypot(nx - p0.x, ny - p0.y) < 7) return;
        movio = true; arrastre.classList.add('is-drag');
      }
      arrastre.style.left = nx + 'px'; arrastre.style.top = ny + 'px';
    });
    tablero.addEventListener('pointerup', ev => {
      if (!arrastre || terminado) { arrastre = null; return; }
      const pieza = arrastre; arrastre = null;
      if (movio) {
        pieza.classList.remove('is-drag');
        pieza.style.visibility = 'hidden';
        const debajo = document.elementFromPoint(ev.clientX, ev.clientY);
        pieza.style.visibility = '';
        const destino = debajo && debajo.closest ? debajo.closest('.pz-piece') : null;
        if (destino && destino !== pieza) intercambiar(pieza, destino); else moverA(pieza, +pieza.dataset.slot);
        if (seleccionada) { seleccionada.classList.remove('is-sel'); seleccionada = null; }
        return;
      }
      if (!seleccionada) { seleccionada = pieza; pieza.classList.add('is-sel'); }
      else if (seleccionada === pieza) { pieza.classList.remove('is-sel'); seleccionada = null; }
      else { seleccionada.classList.remove('is-sel'); intercambiar(seleccionada, pieza); seleccionada = null; }
    });
    tablero.addEventListener('pointercancel', () => {
      if (arrastre) { arrastre.classList.remove('is-drag'); moverA(arrastre, +arrastre.dataset.slot); arrastre = null; }
    });
    piezas().forEach(p => p.classList.toggle('is-correct', +p.dataset.slot === +p.dataset.piece));
    pie.appendChild(cont.boton);
    if (ctx.pruebas) ctx.pruebas.resolver = () => { piezas().forEach(p => moverA(p, +p.dataset.piece)); revisar(); };
    return true;
  }

  /* ── Ahorcado ── */
  function figuraAhorcado(errores) {
    const partes = [
      '<line x1="14" y1="150" x2="100" y2="150"/><line x1="34" y1="150" x2="34" y2="14"/><line x1="34" y1="14" x2="92" y2="14"/><line x1="92" y1="14" x2="92" y2="32"/>',
      '<circle cx="92" cy="46" r="14" fill="none"/>',
      '<line x1="92" y1="60" x2="92" y2="100"/>',
      '<line x1="92" y1="70" x2="74" y2="88"/>',
      '<line x1="92" y1="70" x2="110" y2="88"/>',
      '<line x1="92" y1="100" x2="76" y2="130"/>',
      '<line x1="92" y1="100" x2="108" y2="130"/>'
    ];
    const color = errores >= REGLAS.ahorcado.errores ? '#D1352B' : 'currentColor';
    return '<svg viewBox="0 0 120 160" width="120" height="150" style="color:' + color + ';overflow:visible" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" fill="none" aria-hidden="true">' +
      partes.slice(0, 1 + Math.min(errores, 6)).join('') + '</svg>';
  }

  function pantallaAhorcado(juego, ctx, ventana, cont) {
    const lista = juego.datos.palabras;
    if (!lista || !lista.length) return false;
    const { cuerpo, pie } = ventana;
    let est = nuevaPartidaAhorcado(lista, ctx.rng, null);
    const reintentar = el('button', 'jg-ghost', 'Intentar de nuevo'); reintentar.type = 'button'; reintentar.style.display = 'none';
    pie.appendChild(reintentar); pie.appendChild(cont.boton);

    function dibujar() {
      cuerpo.textContent = '';
      cuerpo.appendChild(el('p', 'jg-lead', 'Adivina la palabra letra por letra antes de quedarte sin intentos. Las letras en verde son de apoyo.'));
      if (est.elegido.pista) { const h = el('div', 'jg-hint'); h.appendChild(el('span', null, est.elegido.pista)); cuerpo.appendChild(h); }
      const escena = el('div', 'ah-stage'); escena.innerHTML = figuraAhorcado(est.errores); cuerpo.appendChild(escena);
      cuerpo.appendChild(el('div', 'ah-word', est.palabra.split('').map(ch => (est.adivinadas.has(ch) ? ch : '_')).join(' ')));
      cuerpo.appendChild(el('div', 'ah-vidas', 'Intentos restantes: ' + (REGLAS.ahorcado.errores - est.errores)));
      const teclado = el('div', 'ah-keys');
      ABECEDARIO.split('').forEach(l => {
        const usada = est.usadas.has(l);
        let clase = 'ah-key';
        if (usada) clase += est.apoyo.includes(l) ? ' is-hint' : (est.adivinadas.has(l) ? ' is-ok' : ' is-bad');
        const b = el('button', clase, l); b.type = 'button'; b.dataset.letra = l; b.disabled = usada;
        b.setAttribute('aria-label', 'Letra ' + l);
        b.addEventListener('click', () => elegir(l));
        teclado.appendChild(b);
      });
      cuerpo.appendChild(teclado);
      const res = el('div'); res.id = 'ah-resultado'; cuerpo.appendChild(res);
      if (ganoAhorcado(est) || perdioAhorcado(est)) fin(res);
    }
    function fin(res) {
      const gano = ganoAhorcado(est);
      const w = el('div', 'jg-win' + (gano ? '' : ' is-lose'));
      w.setAttribute('role', 'status');
      if (gano) { w.innerHTML = ICONO_OK; w.appendChild(document.createTextNode(' ¡Bien hecho!')); }
      else w.textContent = 'La palabra era: ' + est.palabra;
      res.appendChild(w);
      cuerpo.querySelectorAll('[data-letra]').forEach(b => { b.disabled = true; });
      cont.habilitar();
      reintentar.style.display = gano ? 'none' : '';
    }
    function elegir(l) { jugarLetra(est, l); dibujar(); }
    reintentar.addEventListener('click', () => {
      est = nuevaPartidaAhorcado(lista, ctx.rng, est.elegido);
      reintentar.style.display = 'none'; cont.deshabilitar(); dibujar();
    });
    dibujar();
    if (ctx.pruebas) {
      ctx.pruebas.resolver = () => { est.palabra.split('').forEach(l => jugarLetra(est, l)); dibujar(); };
      ctx.pruebas.perder = () => { 'XQZWKJ'.split('').filter(l => !est.palabra.includes(l)).forEach(l => jugarLetra(est, l)); dibujar(); };
      ctx.pruebas.estado = () => est;
    }
    return true;
  }

  /* ── Despachador ── */
  const PANTALLAS = { sopa_letras: pantallaSopa, memorama: pantallaMemorama, rompecabezas: pantallaRompecabezas, ahorcado: pantallaAhorcado };

  /**
   * Abre el juego de una clase.
   * @param {object} juego   { tipo, datos } (se vuelve a validar aquí)
   * @param {object} opciones
   *   titulo, subtitulo   textos de la ventana
   *   portada             imagen del curso (para el rompecabezas)
   *   imagenPorDefecto    imagen de respaldo
   *   obligatorio         true: sin botón de cerrar; hay que terminar para continuar
   *   textoContinuar      texto del botón final
   *   alTerminar()        se llama al pulsar "Continuar"
   *   alCerrar()          se llama si el alumno cierra sin terminar (solo si no es obligatorio)
   * Devuelve { cerrar() } o null si el juego no es válido (en ese caso llama a alTerminar).
   */
  function abrir(juego, opciones) {
    const o = opciones || {};
    const limpio = limpiarJuego(juego);
    const saltar = () => { if (typeof o.alTerminar === 'function') o.alTerminar(); return null; };
    if (!limpio || typeof document === 'undefined') return saltar();

    const ventana = crearVentana(TIPOS[limpio.tipo], o.subtitulo || o.titulo || '', o.obligatorio !== false, o.alCerrar);
    const boton = botonContinuar(o.textoContinuar || 'Continuar');
    let terminado = false;
    const cont = {
      boton,
      habilitar() { terminado = true; boton.disabled = false; boton.focus(); },
      deshabilitar() { terminado = false; boton.disabled = true; }
    };
    boton.addEventListener('click', () => {
      if (!terminado) return;
      ventana.cerrar();
      if (typeof o.alTerminar === 'function') o.alTerminar();
    });
    const ctx = { rng: o.rng, portada: o.portada, imagenPorDefecto: o.imagenPorDefecto, rapido: !!o.rapido, pruebas: o.pruebas || null };
    let ok = false;
    try { ok = PANTALLAS[limpio.tipo](limpio, ctx, ventana, cont); }
    catch (e) { if (typeof console !== 'undefined') console.error('[juego]', e); ok = false; }
    if (!ok) { ventana.cerrar(); return saltar(); }
    return { cerrar: () => ventana.cerrar() };
  }

  return {
    TIPOS, REGLAS, esc, limpiarLetras, urlImagenSegura, barajar, limpiarJuego,
    generarSopa, lineaEntre, buscarCoincidencia,
    crearCartas, sonPar,
    barajarSlots, puzzleResuelto,
    nuevaPartidaAhorcado, jugarLetra, ganoAhorcado, perdioAhorcado,
    abrir
  };
});
