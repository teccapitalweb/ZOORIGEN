/* ============================================================ */
/* ZONA DE RETOS · Club VIP Zoorigen                              */
/*                                                                */
/* Retos cortos para practicar lo aprendido y ganar XP:           */
/*   quiz relámpago, detective de campo, ordena el procedimiento, */
/*   flashcards y modo historia.                                  */
/*                                                                */
/* - La parte de arriba es lógica pura (sin pantalla) y se prueba */
/*   en Node: tests/club-retos.test.js                            */
/* - La parte de abajo (iniciar) solo corre en el navegador.      */
/* - El nivel y el XP los calcula SIEMPRE el servidor; aquí solo  */
/*   se pintan. El contenido está en club-retos-datos.js.         */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./club-retos-datos.js'), null);
  else root.ZOO_RETOS = factory(root.ZOO_RETOS_DATOS, root.ZOO_ICONOS || null);
})(typeof self !== 'undefined' ? self : this, function (DATOS, ICONOS) {
  'use strict';

  /* ───────────────────────── Constantes ───────────────────────── */

  const SERVIDOR = 'https://zoorigen-webhook-production.up.railway.app';
  const HISTORIA_KEY = 'zoorigen:historia:v1';
  const FLASH_KEY = 'zoorigen:retos:ultima-flashcard';
  const DIA_MS = 86400000;
  const ZONA_MX_MS = 6 * 3600 * 1000;      // México: UTC-6
  const APRUEBA = 0.6;
  const TARJETAS_POR_REPASO = 8;
  const MIN_ZONA = 0.02, MAX_ZONA = 0.4;

  const NIVELES = [
    { id: 1, nombre: 'Aprendiz', desde: 0, hasta: 300 },
    { id: 2, nombre: 'Técnico', desde: 300, hasta: 1200 },
    { id: 3, nombre: 'Profesional', desde: 1200, hasta: 2500 },
    { id: 4, nombre: 'Líder', desde: 2500, hasta: 4500 },
    { id: 5, nombre: 'Maestro', desde: 4500, hasta: 99999 }
  ];

  // Orden fijo: el reto del día rota entre estos cuatro.
  const TIPOS = [
    { id: 'quiz', titulo: 'Quiz relámpago', desc: 'Preguntas cortas de tres opciones sobre manejo, bioseguridad y legislación. Cada reto se abre al superar el anterior.',
      icono: 'zap', color: '#C75402', texto: 'var(--rz-naranja-txt)', tiempo: 'Un minuto por reto', imagen: 'assets/img/retos/reto-quiz-relampago.jpg', camino: true },
    { id: 'detective', titulo: 'Detective de campo', desc: 'Observa la escena y toca los tres errores de seguridad antes de que sea tarde.',
      icono: 'search', color: '#037BC9', texto: 'var(--rz-azul-txt)', tiempo: 'Tres minutos por escena', imagen: 'assets/img/retos/reto-detective-campo.jpg', camino: true },
    { id: 'orden', titulo: 'Ordena el procedimiento', desc: 'Coloca cada paso en el orden correcto y refuerza los protocolos de campo.',
      icono: 'list-checks', color: '#95A303', texto: 'var(--rz-verde-txt)', tiempo: 'Dos minutos por reto', imagen: 'assets/img/retos/reto-ordena-procedimiento.jpg', camino: true },
    { id: 'flashcards', titulo: 'Flashcards', desc: 'Repasa conceptos, normas y herramientas con ocho tarjetas al azar. No da XP.',
      icono: 'layers', color: '#C75402', texto: 'var(--rz-naranja-txt)', tiempo: 'Tres minutos', imagen: 'assets/img/retos/reto-flashcards.jpg', camino: false }
  ];
  const IDS = TIPOS.map(t => t.id);
  const CAMINOS = ['quiz', 'detective', 'orden'];
  const NOMBRE_MODO = { quiz: 'Quiz relámpago', detective: 'Detective de campo', orden: 'Ordena el procedimiento' };

  /* ───────────────────────── Utilidades ───────────────────────── */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const entero = (v, min, max) => {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  };
  const fmt = n => (Number(n) || 0).toLocaleString('es-MX');

  // Fisher-Yates. rng permite pruebas repetibles.
  function barajar(lista, rng) {
    const r = typeof rng === 'function' ? rng : Math.random;
    const a = Array.isArray(lista) ? lista.slice() : [];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ───────────────────────── Nivel ───────────────────────── */

  function nivelPorXp(xp) {
    const n = Math.max(0, Number(xp) || 0);
    let actual = NIVELES[0];
    NIVELES.forEach(v => { if (n >= v.desde) actual = v; });
    return actual;
  }

  function xpTotal(estado) {
    const e = estado || {};
    if (typeof e.xp === 'number') return Math.max(0, e.xp);
    if (e.xp && typeof e.xp === 'object' && Number.isFinite(Number(e.xp.total))) return Math.max(0, Number(e.xp.total));
    if (e.nivel && Number.isFinite(Number(e.nivel.xp))) return Math.max(0, Number(e.nivel.xp));
    return 0;
  }

  // Datos listos para pintar la barra "Nivel N de 5 · nombre".
  function resumenNivel(estado) {
    const xp = xpTotal(estado);
    const n = estado && estado.nivel && Number.isFinite(Number(estado.nivel.id)) ? estado.nivel : nivelPorXp(xp);
    const id = entero(n.id, 1, NIVELES.length);
    const base = NIVELES[id - 1];
    const desde = Number.isFinite(Number(n.desde)) ? Number(n.desde) : base.desde;
    const hasta = Number.isFinite(Number(n.hasta)) ? Number(n.hasta) : base.hasta;
    const maximo = id >= NIVELES.length;
    const pct = maximo ? 100 : Math.max(0, Math.min(100, Math.round((xp - desde) / Math.max(1, hasta - desde) * 100)));
    const faltan = maximo ? 0 : (Number.isFinite(Number(n.faltan)) ? Math.max(0, Number(n.faltan)) : Math.max(0, hasta - xp));
    return {
      id, nombre: String(n.nombre || base.nombre), xp, desde, hasta, pct, faltan, maximo,
      siguiente: maximo ? null : NIVELES[id].nombre
    };
  }

  /* ───────────────────────── Estado del servidor ───────────────────────── */

  // Limpia la respuesta de GET /api/retos para que la pantalla nunca reciba datos raros.
  function normalizarEstado(r) {
    const d = r && typeof r === 'object' ? r : {};
    const camino = d.camino && typeof d.camino === 'object' ? d.camino : {};
    const totales = d.totales && typeof d.totales === 'object' ? d.totales : {};
    const out = {
      membresia: d.membresia === true,
      nivel: d.nivel && typeof d.nivel === 'object' ? d.nivel : null,
      xp: d.xp,
      superados: entero(d.superados, 0, 100000),
      porReto: d.porReto && typeof d.porReto === 'object' ? d.porReto : {},
      camino: {}, totales: {},
      retosHoy: Array.isArray(d.retosHoy) ? d.retosHoy.filter(x => IDS.indexOf(x) >= 0) : []
    };
    CAMINOS.forEach(m => { out.camino[m] = entero(camino[m], 0, 1000); out.totales[m] = entero(totales[m], 0, 1000); });
    return out;
  }

  /* ───────────────────────── Reto del día ───────────────────────── */

  // Rota entre los cuatro tipos con la fecha de México. `disponibles` evita proponer un reto que hoy no se puede jugar.
  function retoDelDia(ahoraMs, disponibles) {
    const ahora = Number.isFinite(Number(ahoraMs)) ? Number(ahoraMs) : Date.now();
    const dia = Math.floor((ahora - ZONA_MX_MS) / DIA_MS);
    const base = ((dia % IDS.length) + IDS.length) % IDS.length;
    const ok = Array.isArray(disponibles) && disponibles.length ? disponibles : IDS;
    for (let k = 0; k < IDS.length; k++) {
      const id = IDS[(base + k) % IDS.length];
      if (ok.indexOf(id) >= 0) return id;
    }
    return IDS[base];
  }

  /* ───────────────────────── Camino (quiz, detective, orden) ───────────────────────── */

  // 'hecho' = ya superado (se puede repasar), 'siguiente' = el que toca, 'bloqueado' = todavía no.
  function estadoNodo(indice, hechos) {
    const h = Math.max(0, Number(hechos) || 0);
    return indice < h ? 'hecho' : indice === h ? 'siguiente' : 'bloqueado';
  }
  function apruebaCamino(puntaje, total) {
    const p = Number(puntaje), t = Number(total);
    return t > 0 && p >= 0 && p / t >= APRUEBA;
  }

  /* ───────────────────────── Quiz y orden ───────────────────────── */

  // Devuelve las opciones barajadas: [{ t, ok }]
  function barajarOpciones(item, rng) {
    const base = (item && item.a || []).map((t, n) => ({ t, ok: n === item.ok }));
    return barajar(base, rng);
  }

  function barajarOrden(pasos, rng) {
    const orig = Array.isArray(pasos) ? pasos.slice() : [];
    if (orig.length < 2) return orig;
    for (let k = 0; k < 20; k++) {
      const m = barajar(orig, rng);
      if (m.some((p, i) => p !== orig[i])) return m;
    }
    return orig.slice(1).concat(orig[0]);   // por si el azar insiste: nunca se entrega ya resuelto
  }
  function moverPaso(orden, indice, direccion) {
    const a = Array.isArray(orden) ? orden.slice() : [];
    const j = indice + (direccion < 0 ? -1 : 1);
    if (!Number.isInteger(indice) || indice < 0 || indice >= a.length || j < 0 || j >= a.length) return a;
    const t = a[indice]; a[indice] = a[j]; a[j] = t;
    return a;
  }
  function aciertosOrden(orden, pasos) {
    return (orden || []).reduce((n, p, i) => n + (p === (pasos || [])[i] ? 1 : 0), 0);
  }
  function ordenCorrecto(orden, pasos) {
    return Array.isArray(orden) && Array.isArray(pasos) && orden.length === pasos.length && aciertosOrden(orden, pasos) === pasos.length;
  }

  /* ───────────────────────── Detective ───────────────────────── */

  function limpiarZonas(zonas) {
    return (Array.isArray(zonas) ? zonas : []).filter(z => z && [z.x, z.y, z.r].every(v => typeof v === 'number' && Number.isFinite(v)) &&
      z.x >= 0 && z.x <= 1 && z.y >= 0 && z.y <= 1 && z.r >= MIN_ZONA && z.r <= MAX_ZONA);
  }
  // Una escena solo se muestra con imagen y sus 3 zonas, y activada a propósito.
  function escenaActiva(e) {
    return !!(e && e.activo === true && typeof e.imagen === 'string' && e.imagen.trim() &&
      Array.isArray(e.riesgos) && e.riesgos.length === 3 && limpiarZonas(e.zonas).length === 3 && e.zonas.length === 3);
  }
  function escenasActivas(lista) { return (Array.isArray(lista) ? lista : []).filter(escenaActiva); }
  function escenasPendientes(lista) { return (Array.isArray(lista) ? lista : []).length - escenasActivas(lista).length; }

  // x e y van de 0 a 1 sobre la imagen. r es una fracción del ANCHO; aspecto = ancho / alto.
  function tocaZona(zona, x, y, aspecto) {
    if (!zona) return false;
    const asp = Number(aspecto) > 0 ? Number(aspecto) : 1;
    const dx = x - zona.x, dy = (y - zona.y) / asp;
    return Math.hypot(dx, dy) <= zona.r;
  }
  // Índice de la zona (aún no encontrada) más cercana al toque, o -1.
  function buscarZona(zonas, encontradas, x, y, aspecto) {
    const ya = encontradas instanceof Set ? encontradas : new Set(encontradas || []);
    const asp = Number(aspecto) > 0 ? Number(aspecto) : 1;
    let mejor = -1, mejorD = Infinity;
    (zonas || []).forEach((z, i) => {
      if (ya.has(i) || !tocaZona(z, x, y, asp)) return;
      const d = Math.hypot(x - z.x, (y - z.y) / asp);
      if (d < mejorD) { mejorD = d; mejor = i; }
    });
    return mejor;
  }
  // Cada 3 toques fallidos se pierde un punto; nunca baja de 1.
  function puntajeDetective(fallos, total) {
    const t = total || 3;
    return Math.max(1, t - Math.floor(Math.max(0, Number(fallos) || 0) / 3));
  }

  /* ───────────────────────── Modo historia ───────────────────────── */

  // 4 aciertos = 3 estrellas, 3 = 2, 2 = 1.
  function estrellasHistoria(aciertos) {
    const n = Number(aciertos) || 0;
    return n >= 4 ? 3 : n >= 3 ? 2 : n >= 2 ? 1 : 0;
  }
  function leerHistoria(texto) {
    let o = {};
    try { o = JSON.parse(texto || '{}') || {}; } catch (e) { o = {}; }
    const out = {};
    Object.keys(o).forEach(k => { if (/^\d+$/.test(k)) out[k] = entero(o[k], 0, 4); });
    return out;
  }
  function historiaAbierta(mundoId, progreso) {
    const p = progreso || {};
    return Number(mundoId) === 1 || (Number(p[Number(mundoId) - 1]) || 0) >= 3;
  }
  // Guarda solo si mejora el mejor resultado de ese mundo. No modifica el objeto original.
  function historiaGuardar(progreso, mundoId, aciertos) {
    const p = Object.assign({}, progreso || {});
    const a = entero(aciertos, 0, 4);
    if (!p[mundoId] || a > p[mundoId]) p[mundoId] = a;
    return p;
  }

  /* ───────────────────────── Flashcards ───────────────────────── */

  // n tarjetas al azar; la primera nunca es la última que se vio en el repaso anterior.
  function tarjetasFlash(pool, n, rng, ultimaFront) {
    let c = barajar(pool, rng);
    if (c.length > 1 && c[0] && c[0].front === ultimaFront) c.push(c.shift());
    return c.slice(0, n || TARJETAS_POR_REPASO);
  }

  /* ───────────────────────── Revisión del contenido ───────────────────────── */

  const reEmoji = /[\p{Extended_Pictographic}\u{1F000}-\u{1FFFF}]/u;
  function tieneEmoji(t) { return reEmoji.test(String(t == null ? '' : t)); }

  // Devuelve la lista de problemas del contenido (vacía = todo en regla).
  function revisarContenido(d) {
    const p = [];
    const vacio = t => typeof t !== 'string' || !t.trim();
    const dup = (lista, f) => { const v = lista.map(f); return v.filter((x, i) => v.indexOf(x) !== i); };
    const texto = (donde, t) => { if (vacio(t)) p.push(donde + ': texto vacío'); else if (tieneEmoji(t)) p.push(donde + ': tiene emoji'); };
    const tresOpciones = (donde, it) => {
      if (!Array.isArray(it.a) || it.a.length !== 3) { p.push(donde + ': necesita 3 opciones'); return; }
      it.a.forEach((o, i) => texto(donde + ' opción ' + (i + 1), o));
      if (new Set(it.a.map(o => String(o).trim().toLowerCase())).size !== 3) p.push(donde + ': opciones repetidas');
      if (![0, 1, 2].includes(it.ok)) p.push(donde + ': la respuesta correcta no es 0, 1 o 2');
    };
    const ids = [];

    if (!d) return ['sin datos'];
    if (!Array.isArray(d.quiz) || d.quiz.length !== 22) p.push('quiz: deben ser 22 preguntas');
    (d.quiz || []).forEach((q, i) => { const w = 'quiz ' + (i + 1); ids.push(q.id); texto(w + ' pregunta', q.q); texto(w + ' explicación', q.why); tresOpciones(w, q); });
    dup(d.quiz || [], q => q.q).forEach(x => p.push('quiz: pregunta repetida: ' + x));

    if (!Array.isArray(d.orden) || d.orden.length !== 18) p.push('orden: deben ser 18 secuencias');
    (d.orden || []).forEach((o, i) => {
      const w = 'orden ' + (i + 1); ids.push(o.id); texto(w + ' título', o.titulo);
      if (!Array.isArray(o.pasos) || o.pasos.length < 4 || o.pasos.length > 6) p.push(w + ': debe tener de 4 a 6 pasos');
      (o.pasos || []).forEach((s, k) => texto(w + ' paso ' + (k + 1), s));
      if (new Set(o.pasos || []).size !== (o.pasos || []).length) p.push(w + ': pasos repetidos');
    });
    dup(d.orden || [], o => o.titulo).forEach(x => p.push('orden: título repetido: ' + x));

    if (!Array.isArray(d.flashcards) || d.flashcards.length !== 40) p.push('flashcards: deben ser 40');
    (d.flashcards || []).forEach((f, i) => { ids.push(f.id); texto('flashcard ' + (i + 1) + ' frente', f.front); texto('flashcard ' + (i + 1) + ' reverso', f.back); });
    dup(d.flashcards || [], f => String(f.front).toLowerCase()).forEach(x => p.push('flashcards: concepto repetido: ' + x));

    if (!Array.isArray(d.historia) || d.historia.length !== 6) p.push('historia: deben ser 6 mundos');
    (d.historia || []).forEach((m, i) => {
      const w = 'mundo ' + (i + 1);
      if (m.id !== i + 1) p.push(w + ': id fuera de orden');
      texto(w + ' nombre', m.nombre); texto(w + ' descripción', m.descripcion); texto(w + ' intro', m.intro);
      if (!/^assets\/img\/retos\/historia-[a-z-]+\.jpg$/.test(String(m.imagen))) p.push(w + ': imagen con ruta inesperada');
      if (!Array.isArray(m.casos) || m.casos.length !== 4) p.push(w + ': deben ser 4 casos');
      (m.casos || []).forEach((c, k) => { const ww = w + ' caso ' + (k + 1); texto(ww + ' escena', c.escena); texto(ww + ' explicación', c.why); tresOpciones(ww, c); });
    });
    const escenas = [];
    (d.historia || []).forEach(m => (m.casos || []).forEach(c => escenas.push(c.escena)));
    dup(escenas.map(e => ({ e })), x => x.e).forEach(x => p.push('historia: escena repetida: ' + x));

    if (!Array.isArray(d.detective) || d.detective.length !== 13) p.push('detective: deben ser 13 escenas');
    (d.detective || []).forEach((e, i) => {
      const w = 'detective ' + (i + 1); ids.push(e.id); texto(w + ' título', e.titulo);
      if (!/^assets\/img\/retos\/detective-[a-z-]+\.webp$/.test(String(e.imagen))) p.push(w + ': imagen con ruta inesperada');
      if (!Array.isArray(e.riesgos) || e.riesgos.length !== 3) p.push(w + ': deben ser 3 riesgos');
      (e.riesgos || []).forEach((r, k) => texto(w + ' riesgo ' + (k + 1), r));
      if (e.activo !== true && e.activo !== false) p.push(w + ': activo debe ser true o false');
      if (e.activo === true && !escenaActiva(e)) p.push(w + ': activa sin 3 zonas válidas');
    });

    dup(ids.map(id => ({ id })), x => x.id).forEach(x => p.push('id repetido: ' + x));
    ids.forEach(id => { if (vacio(id)) p.push('hay un reactivo sin id'); });
    return p;
  }

  /* ============================================================ */
  /*                 PANTALLA (solo navegador)                    */
  /* ============================================================ */

  // Íconos Lucide (ISC) que no trae el catálogo del panel admin; el resto sale de ZOO_ICONOS.
  const EXTRA = {
    'zap': '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    'star': '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    'map': '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
    'crown': '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>'
  };
  function ic(nombre, tam, clase) {
    const t = tam || 18;
    if (EXTRA[nombre]) {
      return '<svg class="zi' + (clase ? ' ' + clase : '') + '" width="' + t + '" height="' + t + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + EXTRA[nombre] + '</svg>';
    }
    return ICONOS && ICONOS.existe(nombre) ? ICONOS.svg(nombre, { size: t, clase: clase }) : '';
  }

  const MASCOTAS = { jira: 'assets/img/mascotas/mascota-jira.png', buho: 'assets/img/mascotas/mascota-buho.png', jaguarito: 'assets/img/mascotas/mascota-jaguarito.png' };

  function iniciar(opts) {
    const o = opts || {};
    const doc = document;
    const app = typeof o.contenedor === 'string' ? doc.querySelector(o.contenedor) : o.contenedor;
    if (!app) return null;
    const datos = o.datos || DATOS;
    const base = o.base == null ? '../' : o.base;                 // las rutas de imágenes de los datos salen de la raíz del sitio
    const servidor = o.servidor == null ? SERVIDOR : o.servidor;
    const irSuscripcion = o.irSuscripcion || (() => { window.location.href = 'club-suscripcion.html'; });
    const sesionMiembro = !!o.miembro;
    const reducir = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const img = ruta => (/^(https?:|\/|data:)/.test(ruta) ? ruta : base + ruta);

    const estado = { cargado: false, error: false, membresia: sesionMiembro, nivel: null, xp: 0, superados: 0, camino: { quiz: 0, detective: 0, orden: 0 }, totales: {}, retosHoy: [], porReto: {} };
    let nivelAnterior = null;

    /* ── Red ── */
    async function pedir(ruta, metodo, cuerpo) {
      const user = window.firebase && window.firebase.auth().currentUser;
      if (!user) { const e = new Error('Sin sesión'); e.status = 401; throw e; }
      const token = await user.getIdToken();
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), 15000) : null;
      try {
        const res = await fetch(servidor + ruta, {
          method: metodo || 'GET', cache: 'no-store', signal: ctl ? ctl.signal : undefined,
          headers: Object.assign({ Authorization: 'Bearer ' + token }, cuerpo ? { 'Content-Type': 'application/json' } : {}),
          body: cuerpo ? JSON.stringify(cuerpo) : undefined
        });
        let data = null;
        try { data = await res.json(); } catch (e) { data = null; }
        if (!res.ok) { const e = new Error((data && data.error) || 'No se pudo completar la acción'); e.status = res.status; e.codigo = data && data.codigo; throw e; }
        return data || {};
      } finally { if (t) clearTimeout(t); }
    }

    function aplicarEstado(r) {
      const n = normalizarEstado(r);
      estado.membresia = n.membresia; estado.nivel = n.nivel; estado.xp = n.xp; estado.superados = n.superados;
      estado.camino = n.camino; estado.totales = n.totales; estado.retosHoy = n.retosHoy; estado.porReto = n.porReto;
      estado.cargado = true; estado.error = false;
    }
    async function cargarEstado() {
      try { aplicarEstado(await pedir('/api/retos')); }
      catch (e) { estado.error = true; if (!estado.cargado) estado.membresia = sesionMiembro; }
      return !estado.error;
    }
    const esMiembro = () => (estado.cargado ? estado.membresia : sesionMiembro);

    /* ── Esqueleto ── */
    app.innerHTML =
      '<div id="rzAviso" class="rz-aviso-zona" aria-live="polite"></div>' +
      '<div id="rzHero"></div>' +
      '<div class="rz-atajos"><div id="rzHistoria"></div><div id="rzDia"></div></div>' +
      '<h2 class="rz-h2">Elige tu reto</h2><div id="rzTarjetas" class="rz-grid"></div>' +
      '<section id="rzEscenario" class="rz-escenario" aria-live="polite" tabindex="-1" hidden></section>' +
      '<section id="rzRanking" class="rz-ranking" aria-live="polite" aria-busy="true"></section>';
    const q = id => app.querySelector('#' + id);
    const stage = q('rzEscenario');

    const toasts = doc.createElement('div');
    toasts.className = 'rz-toasts'; toasts.setAttribute('role', 'status'); toasts.setAttribute('aria-live', 'polite');
    doc.body.appendChild(toasts);

    // Si una imagen no carga, se oculta y se ve el gradiente de marca del contenedor.
    app.addEventListener('error', ev => {
      const t = ev.target;
      if (t && t.tagName === 'IMG') { t.classList.add('rz-img-rota'); if (t.parentElement) t.parentElement.classList.add('sin-imagen'); }
    }, true);

    function toast(titulo, texto, tipo) {
      const el = doc.createElement('div');
      el.className = 'rz-toast rz-toast--' + (tipo || 'ok');
      el.innerHTML = '<span class="rz-toast__ic">' + ic(tipo === 'error' ? 'circle-alert' : tipo === 'info' ? 'info' : 'award', 20) + '</span><div><strong>' + esc(titulo) + '</strong>' + (texto ? '<span>' + esc(texto) + '</span>' : '') + '</div>';
      toasts.appendChild(el);
      setTimeout(() => { el.classList.add('is-saliendo'); setTimeout(() => el.remove(), 400); }, 5200);
    }

    /* ── Hero de nivel ── */
    function pintarHero() {
      const r = resumenNivel(estado);
      const nota = r.maximo ? 'Llegaste al nivel más alto. Felicidades.'
        : 'Te faltan ' + fmt(r.faltan) + ' XP para ser ' + r.siguiente + '. Cada reto superado suma.';
      q('rzHero').innerHTML =
        '<section class="rz-hero" aria-labelledby="rzNivelTitulo">' +
          '<div class="rz-hero__insignia" aria-hidden="true">' + ic('crown', 30) + '<b>' + r.id + '</b></div>' +
          '<div class="rz-hero__cuerpo">' +
            '<span class="rz-eyebrow">Tu nivel en el club</span>' +
            '<h2 id="rzNivelTitulo">Nivel ' + r.id + ' de 5 · ' + esc(r.nombre) + '</h2>' +
            '<div class="rz-barra" role="progressbar" aria-label="Avance hacia el siguiente nivel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + r.pct + '"><div style="width:' + r.pct + '%"></div></div>' +
            '<div class="rz-hero__datos"><span><strong>' + fmt(r.xp) + '</strong> XP' + (r.maximo ? ' · nivel máximo' : ' de ' + fmt(r.hasta)) + '</span><span>' + (estado.superados ? fmt(estado.superados) + ' retos superados' : '') + '</span></div>' +
            '<p class="rz-hero__nota">' + nota + '</p>' +
          '</div>' +
          '<div class="rz-hero__mascota"><img src="' + esc(img(MASCOTAS.jira)) + '" alt="" loading="lazy"></div>' +
        '</section>';
    }

    function pintarAviso() {
      const a = q('rzAviso');
      if (!esMiembro()) {
        a.innerHTML = '<div class="rz-aviso"><span class="rz-aviso__ic">' + ic('shield-check', 22) + '</span><div><strong>Solo para miembros</strong><span>Puedes ver cómo son los retos y tu nivel, pero para jugar y ganar XP necesitas una membresía activa.</span></div><button type="button" class="rz-btn" data-accion="suscribir">Suscribirme</button></div>';
      } else if (estado.error) {
        a.innerHTML = '<div class="rz-aviso rz-aviso--error"><span class="rz-aviso__ic">' + ic('circle-alert', 22) + '</span><div><strong>No pudimos cargar tu avance</strong><span>Revisa tu conexión. Puedes seguir con el modo historia y las flashcards mientras tanto.</span></div><button type="button" class="rz-btn rz-btn--sec" data-accion="reintentar">Reintentar</button></div>';
      } else a.innerHTML = '';
    }

    /* ── Tarjetas, reto del día e historia ── */
    function detectivesActivos() { return escenasActivas(datos.detective); }
    function totalModo(m) { return m === 'quiz' ? datos.quiz.length : m === 'orden' ? datos.orden.length : detectivesActivos().length; }
    function disponibles() { return IDS.filter(id => id !== 'detective' || detectivesActivos().length > 0); }

    function pintarTarjetas() {
      const miembro = esMiembro();
      const pendientes = escenasPendientes(datos.detective);
      q('rzTarjetas').innerHTML = TIPOS.map((t, n) => {
        const pronto = t.id === 'detective' && detectivesActivos().length === 0;
        const hecho = estado.retosHoy.indexOf(t.id) >= 0;
        let meta;
        if (pronto) meta = 'Muy pronto · ' + pendientes + ' escenas por llegar';
        else if (t.camino && estado.cargado) meta = Math.min(estado.camino[t.id] || 0, totalModo(t.id)) + ' de ' + totalModo(t.id) + ' superados' + (t.id === 'detective' && pendientes ? ' · ' + pendientes + ' por llegar' : '');
        else meta = t.tiempo;
        return '<button type="button" class="rz-card' + (miembro ? '' : ' is-previa') + (pronto ? ' is-pronto' : '') + '" data-reto="' + t.id + '" style="--rz-acc:' + t.color + ';--rz-acc-txt:' + t.texto + '"' + (pronto ? ' aria-disabled="true"' : '') + '>' +
          '<span class="rz-card__tile"><span class="rz-card__icono">' + ic(t.icono, 54) + '</span><img src="' + esc(img(t.imagen)) + '" alt="" loading="lazy">' +
            '<span class="rz-card__mision">Misión ' + String(n + 1).padStart(2, '0') + '</span>' +
            (hecho ? '<span class="rz-card__hecho">' + ic('circle-check', 14) + 'Hecho hoy</span>' : '') +
          '</span>' +
          '<span class="rz-card__cuerpo"><strong class="rz-card__titulo">' + esc(t.titulo) + '</strong><span class="rz-card__desc">' + esc(t.desc) + '</span>' +
          '<span class="rz-card__meta">' + esc(miembro ? meta : 'Solo miembros · ' + t.tiempo) + '</span></span>' +
          '<span class="rz-card__ir" aria-hidden="true">' + ic('arrow-right', 18) + '</span></button>';
      }).join('');
    }

    function pintarDia() {
      const id = retoDelDia(Date.now(), disponibles());
      const t = TIPOS.find(x => x.id === id);
      const hecho = estado.retosHoy.indexOf(id) >= 0;
      q('rzDia').innerHTML =
        '<button type="button" class="rz-dia" data-reto="' + id + '"><span class="rz-dia__ic">' + ic('calendar', 22) + '</span>' +
        '<span class="rz-dia__txt"><strong>Reto del día</strong><small>' + esc(t.titulo) + (id === 'flashcards' ? ' · repaso libre' : hecho ? ' · ya cobraste los XP de hoy' : ' · hasta 10 XP') + '</small></span>' +
        '<span class="rz-dia__ir" aria-hidden="true">' + ic('arrow-right', 18) + '</span></button>';
    }

    function pintarBannerHistoria() {
      const miembro = esMiembro();
      q('rzHistoria').innerHTML =
        '<button type="button" class="rz-historia' + (miembro ? '' : ' is-previa') + '" data-reto="historia">' +
          '<span class="rz-historia__txt"><span class="rz-eyebrow">Modo historia</span><strong>Recorre seis mundos de la fauna de México</strong>' +
          '<small>Toma decisiones en cada caso. Con 3 aciertos de 4 abres el siguiente mundo.</small>' +
          '<span class="rz-historia__btn">' + (miembro ? 'Abrir el mapa' : 'Solo miembros') + ic('arrow-right', 16) + '</span></span>' +
          '<span class="rz-historia__img"><img src="' + esc(img(MASCOTAS.jaguarito)) + '" alt="" loading="lazy"></span></button>';
    }

    /* ── Escenario ── */
    function abrirEscenario(html) {
      stage.hidden = false; stage.innerHTML = html;
      const h = stage.querySelector('[data-foco]');
      if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
      stage.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
    }
    function cerrarEscenario() {
      stage.hidden = true; stage.innerHTML = '';
      pintarTarjetas();
      const t = q('rzTarjetas'); t.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'nearest' });
    }
    function cabecera(etiqueta, titulo, extra, chip) {
      return '<div class="rz-panel__head"><div><div class="rz-eyebrow">' + esc(etiqueta) + '</div><h2 data-foco>' + esc(titulo) + '</h2>' + (extra ? '<p>' + extra + '</p>' : '') + '</div>' +
        '<div class="rz-panel__lado">' + (chip ? '<span class="rz-chip">' + chip + '</span>' : '') +
        '<button type="button" class="rz-cerrar" data-accion="cerrar" aria-label="Cerrar y volver a los retos">' + ic('x', 18) + '</button></div></div>';
    }

    function verBloqueado() {
      abrirEscenario('<div class="rz-panel">' + cabecera('Solo para miembros', 'Activa tu membresía para jugar', 'Con la membresía vigente puedes resolver los retos, ganar XP, subir de nivel y ganar premios.') +
        '<div class="rz-acciones"><button type="button" class="rz-btn" data-accion="suscribir">Suscribirme</button></div></div>');
    }

    /* ── Recompensas ── */
    function avisarRecompensa(r, contexto, esCamino) {
      if (!r) return;
      if (r.xpGanado > 0) toast('+' + r.xpGanado + ' XP', contexto || 'Reto superado');
      else if (r.aprobado) toast('Reto superado', esCamino ? 'Sigue con el siguiente del camino.' : 'Hoy ya cobraste los XP de este reto. Vuelve mañana.', 'info');
      (r.insigniasNuevas || []).forEach(n => toast('Nueva insignia', n && n.nombre ? n.nombre : 'Insignia nueva'));
      // Si este reto abrió un libro, el servidor lo dice en librosNuevos (ids) y manda el resumen en libros.
      const abiertos = Array.isArray(r.librosNuevos) ? r.librosNuevos : [];
      if (abiertos.length) {
        const lista = Array.isArray(r.libros) ? r.libros : [];
        const titulo = id => { const l = lista.find(x => x && x.id === id); return l && l.titulo ? '«' + l.titulo + '»' : 'un libro'; };
        toast(abiertos.length === 1 ? '¡Desbloqueaste un libro!' : '¡Desbloqueaste libros!', 'Ya puedes leer ' + abiertos.map(titulo).join(' y ') + ' en PDFs y materiales.');
      }
    }
    // Avisa si el servidor ya te subió de nivel (el nivel se recalcula allá, aquí solo se compara).
    function revisarSubida() {
      const r = resumenNivel(estado);
      if (nivelAnterior && r.id > nivelAnterior) toast('Subiste de nivel', 'Ahora eres ' + r.nombre + '.');
      nivelAnterior = r.id;
    }
    // Historia y flashcards. Devuelve la respuesta o null si falló la red.
    async function enviarResultado(retoId, puntaje, total) {
      try {
        const r = await pedir('/api/retos/resultado', 'POST', { retoId, puntaje, total });
        if (r.nivel) { estado.nivel = r.nivel; }
        if (r.xp != null) estado.xp = r.xp;
        if (r.xpGanado > 0 && estado.retosHoy.indexOf(retoId) < 0) estado.retosHoy.push(retoId);
        avisarRecompensa(r, retoId === 'historia' ? 'Capítulo superado' : 'Reto superado', false);
        revisarSubida();
        pintarHero(); pintarDia(); pintarTarjetas();
        return r;
      } catch (e) {
        if (e.codigo === 'membresia-requerida' || e.status === 403) toast('Solo para miembros', 'Activa tu membresía para sumar XP.', 'error');
        else toast('No se guardó el resultado', 'Revisa tu conexión. Tu avance de este reto no se perdió en pantalla.', 'error');
        return null;
      }
    }
    // Quiz, detective y orden. Lanza el error para que la pantalla deje reintentar.
    async function enviarCamino(modo, indice, puntaje, total) {
      const r = await pedir('/api/retos/camino', 'POST', { modo, indice, puntaje, total });
      if (r.camino && typeof r.camino === 'object') CAMINOS.forEach(m => { if (Number.isFinite(Number(r.camino[m]))) estado.camino[m] = entero(r.camino[m], 0, 1000); });
      if (r.aceptado === false) toast('Este reto ya estaba superado', 'Puedes seguir con el siguiente.', 'info');
      else avisarRecompensa(r, 'Reto del camino superado', true);
      cargarEstado().then(() => { revisarSubida(); pintarHero(); pintarDia(); pintarTarjetas(); });   // el nivel lo recalcula el servidor
      return r;
    }
    function errorEnvio(e) {
      if (e && (e.codigo === 'membresia-requerida' || e.status === 403)) toast('Solo para miembros', 'Activa tu membresía para sumar XP.', 'error');
      else toast('No se pudo guardar tu avance', 'Revisa tu conexión y vuelve a intentarlo.', 'error');
    }

    /* ── Camino ── */
    async function abrirCamino(modo) {
      if (!estado.cargado || estado.error) {
        abrirEscenario('<div class="rz-panel"><p class="rz-cargando">Cargando tu avance...</p></div>');
        const ok = await cargarEstado();
        pintarAviso();
        if (!ok) {
          toast('No pudimos cargar tu avance', 'Revisa tu conexión e inténtalo otra vez.', 'error');
          stage.hidden = true; stage.innerHTML = '';
          return;
        }
        pintarHero(); pintarTarjetas();
        if (!esMiembro()) { verBloqueado(); return; }
      }
      verCamino(modo);
    }

    function itemsDe(modo) { return modo === 'quiz' ? datos.quiz : modo === 'orden' ? datos.orden : detectivesActivos(); }
    function metaDe(modo, it) {
      if (modo === 'quiz') return { titulo: it.q, sub: it.tema };
      if (modo === 'orden') return { titulo: it.titulo, sub: it.pasos.length + ' pasos' };
      return { titulo: it.titulo, sub: 'Escena de campo' };
    }

    function verCamino(modo) {
      const items = itemsDe(modo);
      const hechos = Math.min(estado.camino[modo] || 0, items.length);
      const pct = items.length ? Math.round(hechos / items.length * 100) : 0;
      const pend = modo === 'detective' ? escenasPendientes(datos.detective) : 0;
      const nodos = items.map((it, i) => {
        const st = estadoNodo(i, hechos);
        const m = metaDe(modo, it);
        const num = st === 'bloqueado' ? ic('lock', 16) : st === 'hecho' ? ic('check', 16) : (i + 1);
        const titulo = st === 'bloqueado' ? 'Reto ' + (i + 1) : m.titulo;
        const sub = st === 'bloqueado' ? 'Se revela al desbloquearlo' : m.sub;
        const etiqueta = st === 'hecho' ? 'Resuelto' : st === 'siguiente' ? 'Siguiente' : 'Bloqueado';
        return '<li class="rz-nodo is-' + st + '"><span class="rz-nodo__punto">' + num + '</span>' +
          '<button type="button" class="rz-nodo__card" data-nodo="' + i + '"' + (st === 'bloqueado' ? ' aria-disabled="true"' : '') + '>' +
          '<span class="rz-nodo__txt"><strong>' + esc(titulo) + '</strong><small>' + esc(sub) + '</small></span><span class="rz-etiqueta rz-etiqueta--' + st + '">' + etiqueta + '</span></button></li>';
      }).join('');
      const fin = hechos >= items.length && items.length > 0;
      abrirEscenario('<div class="rz-panel">' + cabecera(NOMBRE_MODO[modo], 'Tu camino', 'Resuelve cada reto para desbloquear el siguiente. Puedes repasar los que ya superaste, sin XP.', hechos + ' de ' + items.length) +
        '<div class="rz-barra rz-barra--fina" role="progressbar" aria-label="Avance del camino" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div style="width:' + pct + '%"></div></div>' +
        (pend ? '<p class="rz-nota">' + ic('info', 16) + ' Faltan por llegar ' + pend + ' escenas del detective. Se agregan poco a poco.</p>' : '') +
        (fin ? '<p class="rz-nota rz-nota--ok">' + ic('trophy', 16) + ' Completaste todo el camino disponible. Puedes repasar cualquier reto.</p>' : '') +
        '<ol class="rz-camino">' + nodos + '</ol></div>');
      stage.querySelectorAll('[data-nodo]').forEach(b => b.addEventListener('click', () => {
        const i = Number(b.dataset.nodo);
        const h = Math.min(estado.camino[modo] || 0, items.length);
        if (i > h) { toast('Reto bloqueado', 'Supera el reto anterior para abrir este.', 'info'); return; }
        const repaso = i < h;
        if (modo === 'quiz') abrirQuiz(i, repaso); else if (modo === 'orden') abrirOrden(i, repaso); else abrirDetective(i, repaso);
      }));
    }

    /* ── Quiz ── */
    function abrirQuiz(indice, repaso) {
      const it = datos.quiz[indice];
      const ops = barajarOpciones(it);
      let bloqueado = false;
      abrirEscenario('<div class="rz-panel">' + cabecera('Quiz relámpago · reto ' + (indice + 1) + (repaso ? ' · repaso' : ''), it.q, '', repaso ? 'Sin XP' : 'Hasta 10 XP') +
        '<div class="rz-opciones" role="group" aria-label="Opciones">' + ops.map((op, n) => '<button type="button" class="rz-op" data-op="' + n + '"><span class="rz-op__letra">' + String.fromCharCode(65 + n) + '</span><span>' + esc(op.t) + '</span></button>').join('') + '</div>' +
        '<div class="rz-feedback" id="rzFb" hidden></div></div>');
      stage.querySelectorAll('[data-op]').forEach(b => b.addEventListener('click', () => {
        if (bloqueado) return; bloqueado = true;
        const n = Number(b.dataset.op), ok = ops[n].ok;
        stage.querySelectorAll('[data-op]').forEach((el, k) => { el.disabled = true; el.classList.toggle('is-correcta', ops[k].ok); el.classList.toggle('is-mala', k === n && !ok); });
        const fb = q2('#rzFb'); fb.hidden = false; fb.className = 'rz-feedback ' + (ok ? 'is-ok' : 'is-mal');
        fb.innerHTML = '<strong>' + (ok ? 'Correcto' : 'Revisa esta idea') + '</strong><span>' + esc(it.why) + '</span><button type="button" class="rz-btn" id="rzSig">' + (ok && !repaso ? 'Continuar' : 'Volver al camino') + '</button>';
        const btn = fb.querySelector('#rzSig'); btn.focus();
        btn.addEventListener('click', async () => {
          if (ok && !repaso) {
            btn.disabled = true;
            try { await enviarCamino('quiz', indice, 1, 1); } catch (e) { errorEnvio(e); btn.disabled = false; return; }
          }
          verCamino('quiz');
        });
      }));
    }
    const q2 = sel => stage.querySelector(sel);

    /* ── Orden ── */
    function abrirOrden(indice, repaso) {
      const it = datos.orden[indice];
      let lista = barajarOrden(it.pasos);
      let enviando = false;
      function pintar(foco) {
        (foco ? abrirEscenarioSinScroll : abrirEscenario)('<div class="rz-panel">' + cabecera('Ordena el procedimiento · reto ' + (indice + 1) + (repaso ? ' · repaso' : ''), it.titulo, 'Usa las flechas para colocar los pasos en el orden correcto.', repaso ? 'Sin XP' : 'Hasta 10 XP') +
          '<ol class="rz-orden">' + lista.map((s, i) => '<li class="rz-orden__item"><span class="rz-orden__n">' + (i + 1) + '</span><span class="rz-orden__txt">' + esc(s) + '</span>' +
            '<span class="rz-orden__mover"><button type="button" data-mover="-1" data-i="' + i + '" aria-label="Subir el paso ' + (i + 1) + '"' + (i === 0 ? ' disabled' : '') + '>' + ic('arrow-up', 18) + '</button>' +
            '<button type="button" data-mover="1" data-i="' + i + '" aria-label="Bajar el paso ' + (i + 1) + '"' + (i === lista.length - 1 ? ' disabled' : '') + '>' + ic('arrow-down', 18) + '</button></span></li>').join('') + '</ol>' +
          '<div class="rz-acciones"><button type="button" class="rz-btn" id="rzComprobar">Comprobar orden</button></div>' +
          '<div class="rz-feedback" id="rzFb" hidden role="status"></div></div>');
        stage.querySelectorAll('[data-mover]').forEach(b => b.addEventListener('click', () => {
          const i = Number(b.dataset.i), d = Number(b.dataset.mover);
          lista = moverPaso(lista, i, d);
          const nuevo = i + d;
          pintar({ i: nuevo, d });
        }));
        if (foco) {
          // El foco sigue al paso que se movió (si ya no puede ir más lejos, se queda en la otra flecha).
          let b = stage.querySelector('[data-i="' + foco.i + '"][data-mover="' + foco.d + '"]:not([disabled])') || stage.querySelector('[data-i="' + foco.i + '"]:not([disabled])');
          if (b) b.focus();
        }
        q2('#rzComprobar').addEventListener('click', async ev => {
          if (enviando) return;
          const bien = aciertosOrden(lista, it.pasos), fb = q2('#rzFb');
          fb.hidden = false;
          if (!ordenCorrecto(lista, it.pasos)) {
            fb.className = 'rz-feedback is-mal';
            fb.innerHTML = '<strong>' + bien + ' de ' + it.pasos.length + ' pasos están en su lugar.</strong><span>Vuelve a intentarlo: puedes mover los pasos cuantas veces necesites.</span>';
            return;
          }
          fb.className = 'rz-feedback is-ok';
          fb.innerHTML = '<strong>Orden correcto</strong><span>Así se hace en campo: cada paso prepara al siguiente.</span><button type="button" class="rz-btn" id="rzSig">' + (repaso ? 'Volver al camino' : 'Continuar') + '</button>';
          ev.currentTarget.disabled = true;
          stage.querySelectorAll('[data-mover]').forEach(x => { x.disabled = true; });
          const btn = fb.querySelector('#rzSig'); btn.focus();
          btn.addEventListener('click', async () => {
            if (!repaso) {
              enviando = true; btn.disabled = true;
              try { await enviarCamino('orden', indice, it.pasos.length, it.pasos.length); } catch (e) { errorEnvio(e); btn.disabled = false; enviando = false; return; }
            }
            verCamino('orden');
          });
        });
      }
      pintar(null);
    }
    // Para mover pasos no se hace scroll ni se roba el foco al título.
    function abrirEscenarioSinScroll(html) { stage.hidden = false; stage.innerHTML = html; }

    /* ── Detective ── */
    function abrirDetective(indice, repaso) {
      const esc3 = detectivesActivos()[indice];
      const zonas = limpiarZonas(esc3.zonas);
      const encontradas = new Set();
      let fallos = 0, terminado = false, mira = { x: 0.5, y: 0.5 };
      abrirEscenario('<div class="rz-panel">' + cabecera('Detective de campo · reto ' + (indice + 1) + (repaso ? ' · repaso' : ''), 'Encuentra tres errores en la escena', esc3.titulo + '. Toca el lugar de la imagen donde ves un error o un riesgo. Con teclado: flechas para mover la mira y Enter para inspeccionar.', '<span id="rzCuenta">0/3</span>') +
        '<div class="rz-escena" id="rzEscena" tabindex="0" role="application" aria-label="Escena: ' + esc(esc3.titulo) + '. Toca la imagen para inspeccionar.">' +
          '<img src="' + esc(img(esc3.imagen)) + '" alt="" draggable="false"><span class="rz-mira" id="rzMira" hidden></span></div>' +
        '<div class="rz-detalle" id="rzDetalle" role="status"><span class="rz-detalle__ic">' + ic('info', 18) + '</span><span>Los hallazgos aparecerán aquí cuando los encuentres.</span></div>' +
        '<ul class="rz-riesgos">' + esc3.riesgos.map((r, i) => '<li id="rzR' + i + '"><span class="rz-riesgos__n">' + (i + 1) + '</span><span><strong>Hallazgo pendiente</strong><small>Busca una condición insegura</small></span></li>').join('') + '</ul>' +
        '<div class="rz-acciones" id="rzFinD" hidden></div></div>');
      const escena = q2('#rzEscena'), detalle = q2('#rzDetalle'), miraEl = q2('#rzMira');
      // La escena toma la proporción real de la imagen: así las zonas (0 a 1) caen donde se dibujaron.
      const foto = escena.querySelector('img');
      const ajustar = () => { if (foto.naturalWidth > 0 && foto.naturalHeight > 0) escena.style.aspectRatio = foto.naturalWidth + ' / ' + foto.naturalHeight; };
      if (foto.complete) ajustar(); else foto.addEventListener('load', ajustar);

      function marca(x, y, tipo) {
        const m = doc.createElement('span');
        m.className = 'rz-marca rz-marca--' + tipo;
        m.style.left = (x * 100) + '%'; m.style.top = (y * 100) + '%';
        m.innerHTML = ic(tipo === 'ok' ? 'check' : 'x', 16);
        escena.appendChild(m);
        if (tipo === 'mal') setTimeout(() => m.remove(), 900);
        return m;
      }
      function inspeccionar(x, y) {
        if (terminado) return;
        const r = escena.getBoundingClientRect();
        const i = buscarZona(zonas, encontradas, x, y, r.width / Math.max(1, r.height));
        if (i < 0) {
          fallos++; marca(x, y, 'mal');
          detalle.className = 'rz-detalle is-mal';
          detalle.innerHTML = '<span class="rz-detalle__ic">' + ic('circle-x', 18) + '</span><span><strong>Ahí no hay un error.</strong> Revisa el equipo de protección, los animales, los recintos y los objetos fuera de lugar.</span>';
          return;
        }
        encontradas.add(i);
        const z = zonas[i];
        marca(z.x, z.y, 'ok');
        const li = q2('#rzR' + i); li.classList.add('is-hallado');
        li.innerHTML = '<span class="rz-riesgos__n">' + ic('check', 14) + '</span><span><strong>Hallazgo ' + (i + 1) + '</strong><small>' + esc(esc3.riesgos[i]) + '</small></span>';
        detalle.className = 'rz-detalle is-ok';
        detalle.innerHTML = '<span class="rz-detalle__ic">' + ic('circle-check', 18) + '</span><span><strong>Hallazgo correcto.</strong> ' + esc(esc3.riesgos[i]) + '</span>';
        q2('#rzCuenta').textContent = encontradas.size + '/3';
        if (encontradas.size === 3) terminar();
      }
      function terminar() {
        terminado = true; miraEl.hidden = true;
        const puntaje = puntajeDetective(fallos, 3);
        const aprueba = apruebaCamino(puntaje, 3);
        const fin = q2('#rzFinD'); fin.hidden = false;
        const resumen = '<p class="rz-resumen">Encontraste los 3 errores con ' + fallos + ' toque' + (fallos === 1 ? '' : 's') + ' fallido' + (fallos === 1 ? '' : 's') + '. Puntaje: <strong>' + puntaje + ' de 3</strong>.' +
          (aprueba ? '' : ' Necesitas al menos 2 de 3 para superar la escena: inténtalo otra vez con más calma.') + '</p>';
        fin.innerHTML = resumen + (aprueba ? '<button type="button" class="rz-btn" id="rzSigD">' + (repaso ? 'Volver al camino' : 'Continuar') + '</button>'
          : '<button type="button" class="rz-btn" id="rzRepetirD">Intentar de nuevo</button><button type="button" class="rz-btn rz-btn--sec" id="rzCaminoD">Volver al camino</button>');
        const sig = q2('#rzSigD');
        if (sig) {
          sig.focus();
          sig.addEventListener('click', async () => {
            if (!repaso) { sig.disabled = true; try { await enviarCamino('detective', indice, puntaje, 3); } catch (e) { errorEnvio(e); sig.disabled = false; return; } }
            verCamino('detective');
          });
        } else {
          q2('#rzRepetirD').addEventListener('click', () => abrirDetective(indice, repaso));
          q2('#rzCaminoD').addEventListener('click', () => verCamino('detective'));
        }
      }
      escena.addEventListener('click', ev => {
        const r = escena.getBoundingClientRect();
        if (!r.width || !r.height) return;
        inspeccionar(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)));
      });
      function ponerMira() { miraEl.hidden = terminado; miraEl.style.left = (mira.x * 100) + '%'; miraEl.style.top = (mira.y * 100) + '%'; }
      escena.addEventListener('focus', ponerMira);
      escena.addEventListener('blur', () => { miraEl.hidden = true; });
      escena.addEventListener('keydown', ev => {
        const paso = ev.shiftKey ? 0.12 : 0.04;
        const mapa = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] };
        if (mapa[ev.key]) { ev.preventDefault(); mira.x = Math.max(0, Math.min(1, mira.x + mapa[ev.key][0])); mira.y = Math.max(0, Math.min(1, mira.y + mapa[ev.key][1])); ponerMira(); }
        else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); inspeccionar(mira.x, mira.y); }
      });
    }

    /* ── Flashcards ── */
    function abrirFlashcards() {
      let ultima = '';
      try { ultima = localStorage.getItem(FLASH_KEY) || ''; } catch (e) { /* sin almacenamiento */ }
      const cartas = tarjetasFlash(datos.flashcards, TARJETAS_POR_REPASO, null, ultima);
      try { localStorage.setItem(FLASH_KEY, cartas[0].front); } catch (e) { /* sin almacenamiento */ }
      let i = 0, sabidas = 0, volteada = false;
      function pintar() {
        const c = cartas[i];
        abrirEscenarioSinScroll('<div class="rz-panel">' + cabecera('Flashcards · ' + (i + 1) + ' de ' + cartas.length, 'Repaso rápido', 'Solo repaso: no da XP.', sabidas + ' dominadas') +
          '<button type="button" class="rz-flash' + (volteada ? ' is-volteada' : '') + '" id="rzFlash" aria-label="' + (volteada ? 'Definición de ' + esc(c.front) + '. Toca para volver al concepto.' : 'Concepto: ' + esc(c.front) + '. Toca para ver la definición.') + '">' +
            '<span class="rz-flash__tag">' + (volteada ? 'Definición' : 'Concepto · toca para revelar') + '</span>' +
            (volteada ? '<span class="rz-flash__term">' + esc(c.front) + '</span>' : '') +
            '<strong class="' + (volteada ? 'rz-flash__back' : '') + '">' + esc(volteada ? c.back : c.front) + '</strong></button>' +
          '<div class="rz-acciones"' + (volteada ? '' : ' hidden') + '><button type="button" class="rz-btn rz-btn--sec" data-sabia="0">Repasar después</button><button type="button" class="rz-btn" data-sabia="1">La sabía</button></div></div>');
        q2('#rzFlash').addEventListener('click', () => { volteada = !volteada; pintar(); q2('#rzFlash').focus(); });
        stage.querySelectorAll('[data-sabia]').forEach(b => b.addEventListener('click', () => {
          sabidas += Number(b.dataset.sabia); i++; volteada = false;
          if (i < cartas.length) { pintar(); q2('#rzFlash').focus(); } else terminar();
        }));
      }
      function terminar() {
        abrirEscenario('<div class="rz-panel rz-resultado"><span class="rz-resultado__ic">' + ic('layers', 34) + '</span><div>' + cabecera('Repaso terminado', 'Flashcards', 'Marcaste <strong>' + sabidas + ' de ' + cartas.length + '</strong> como dominadas. Este modo es solo para reforzar: no otorga XP.') +
          '<div class="rz-acciones"><button type="button" class="rz-btn" id="rzOtras">Repasar otras</button><button type="button" class="rz-btn rz-btn--sec" data-accion="cerrar">Volver a los retos</button></div></div></div>');
        q2('#rzOtras').addEventListener('click', abrirFlashcards);
        if (esMiembro()) enviarResultado('flashcards', sabidas, cartas.length);
      }
      abrirEscenario('');
      pintar();
      stage.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
    }

    /* ── Modo historia ── */
    function estrellas(n) {
      const e = estrellasHistoria(n);
      let s = '';
      for (let k = 0; k < 3; k++) s += '<span class="' + (k < e ? 'on' : 'off') + '">' + ic('star', 18) + '</span>';
      return '<span class="rz-estrellas" role="img" aria-label="' + e + ' de 3 estrellas">' + s + '</span>';
    }
    function leerProgreso() { let t = ''; try { t = localStorage.getItem(HISTORIA_KEY) || ''; } catch (e) { /* sin almacenamiento */ } return leerHistoria(t); }
    function guardarProgreso(mundo, aciertos) {
      const p = historiaGuardar(leerProgreso(), mundo, aciertos);
      try { localStorage.setItem(HISTORIA_KEY, JSON.stringify(p)); } catch (e) { /* sin almacenamiento */ }
      return p;
    }

    function historiaMapa() {
      const prog = leerProgreso();
      abrirEscenario('<div class="rz-panel">' + cabecera('Modo historia', 'Mapa de mundos', 'Acompaña a Jaguarito por seis mundos. Elige la mejor decisión en cada caso: con 3 aciertos de 4 abres el siguiente mundo.') +
        '<ol class="rz-mundos">' + datos.historia.map(m => {
          const abierto = historiaAbierta(m.id, prog);
          return '<li class="rz-mundo' + (abierto ? '' : ' is-cerrado') + '" style="--rz-acc:' + esc(m.color) + '">' +
            '<span class="rz-mundo__img"><img src="' + esc(img(m.imagen)) + '" alt="" loading="lazy"><span class="rz-mundo__n">' + m.id + '</span></span>' +
            '<span class="rz-mundo__cuerpo"><span class="rz-eyebrow">Mundo ' + m.id + '</span><strong>' + esc(m.nombre) + '</strong><small>' + esc(m.descripcion) + '</small>' +
            '<span class="rz-mundo__pie">' + estrellas(prog[m.id] || 0) +
            (abierto ? '<button type="button" class="rz-btn rz-btn--chico" data-mundo="' + m.id + '">' + (prog[m.id] ? 'Jugar otra vez' : 'Jugar') + '</button>'
              : '<span class="rz-cerrado">' + ic('lock', 14) + 'Acierta 3 de 4 en el mundo ' + (m.id - 1) + '</span>') + '</span></span></li>';
        }).join('') + '</ol></div>');
      stage.querySelectorAll('[data-mundo]').forEach(b => b.addEventListener('click', () => historiaJugar(datos.historia.find(m => m.id === Number(b.dataset.mundo)))));
    }

    function historiaJugar(m) {
      const casos = barajar(m.casos).map(c => ({ escena: c.escena, why: c.why, ops: barajarOpciones(c) }));
      let i = 0, aciertos = 0, bloqueado = false;
      function pintar() {
        const c = casos[i];
        abrirEscenario('<div class="rz-panel">' + cabecera('Mundo ' + m.id + ' · caso ' + (i + 1) + ' de ' + casos.length, m.nombre, '', aciertos + ' aciertos') +
          '<div class="rz-escena-h" style="--rz-acc:' + esc(m.color) + '"><img class="rz-escena-h__fondo" src="' + esc(img(m.imagen)) + '" alt="" loading="lazy">' +
          '<div class="rz-guia"><span class="rz-guia__av" data-ini="J"><img src="' + esc(img(MASCOTAS.jaguarito)) + '" alt="" loading="lazy"></span><div class="rz-burbuja"><strong>Jaguarito</strong><p>' + (i === 0 ? esc(m.intro) + ' ' : '') + esc(c.escena) + '</p></div></div></div>' +
          '<div class="rz-opciones" role="group" aria-label="Opciones">' + c.ops.map((op, n) => '<button type="button" class="rz-op" data-op="' + n + '"><span class="rz-op__letra">' + String.fromCharCode(65 + n) + '</span><span>' + esc(op.t) + '</span></button>').join('') + '</div>' +
          '<div class="rz-feedback" id="rzFb" hidden></div></div>');
        bloqueado = false;
        stage.querySelectorAll('[data-op]').forEach(b => b.addEventListener('click', () => {
          if (bloqueado) return; bloqueado = true;
          const n = Number(b.dataset.op), ok = c.ops[n].ok; if (ok) aciertos++;
          const chip = stage.querySelector('.rz-chip'); if (chip) chip.textContent = aciertos + (aciertos === 1 ? ' acierto' : ' aciertos');
          stage.querySelectorAll('[data-op]').forEach((el, k) => { el.disabled = true; el.classList.toggle('is-correcta', c.ops[k].ok); el.classList.toggle('is-mala', k === n && !ok); });
          const fb = q2('#rzFb'); fb.hidden = false; fb.className = 'rz-feedback ' + (ok ? 'is-ok' : 'is-mal');
          fb.innerHTML = '<strong>' + (ok ? 'Buena decisión' : 'Piénsalo de nuevo') + '</strong><span>' + esc(c.why) + '</span><button type="button" class="rz-btn" id="rzSig">' + (i === casos.length - 1 ? 'Ver resultado' : 'Siguiente caso') + '</button>';
          const btn = fb.querySelector('#rzSig'); btn.focus();
          btn.addEventListener('click', () => { i++; if (i < casos.length) pintar(); else terminar(); });
        }));
      }
      function terminar() {
        guardarProgreso(m.id, aciertos);
        if (esMiembro()) enviarResultado('historia', aciertos, casos.length);
        const supera = aciertos >= 3, sig = datos.historia.find(x => x.id === m.id + 1);
        abrirEscenario('<div class="rz-panel rz-resultado"><span class="rz-resultado__ic">' + ic(supera ? 'trophy' : 'circle-check', 34) + '</span><div>' +
          cabecera('Mundo ' + m.id + (supera ? ' superado' : ' terminado'), m.nombre, 'Acertaste <strong>' + aciertos + ' de ' + casos.length + '</strong>. ' + (supera ? (sig ? 'Muy bien. Ya puedes entrar al mundo ' + sig.id + '.' : 'Terminaste la historia. Ya conoces los seis mundos.') : 'Necesitas 3 aciertos para abrir el siguiente mundo. Repasa las explicaciones y vuelve a intentarlo.')) +
          estrellas(aciertos) +
          '<div class="rz-acciones"><button type="button" class="rz-btn" id="rzMapa">Ver el mapa</button>' + (supera && sig ? '<button type="button" class="rz-btn rz-btn--azul" id="rzSigM">Ir al mundo ' + sig.id + '</button>' : '') +
          '<button type="button" class="rz-btn rz-btn--sec" id="rzRep">Repetir este mundo</button></div></div></div>');
        q2('#rzMapa').addEventListener('click', historiaMapa);
        q2('#rzRep').addEventListener('click', () => historiaJugar(m));
        const s = q2('#rzSigM'); if (s) s.addEventListener('click', () => historiaJugar(sig));
      }
      pintar();
    }

    /* ── Clasificación ── */
    function nombreNivel(n) {
      if (n && typeof n === 'object') return String(n.nombre || '');
      if (typeof n === 'number') return (NIVELES[n - 1] || {}).nombre || '';
      return String(n || '');
    }
    const iniciales = nombre => String(nombre || 'M').trim().split(/\s+/).slice(0, 2).map(x => (x[0] || '').toUpperCase()).join('');

    async function pintarRanking() {
      const el = q('rzRanking');
      const cabeza = '<div class="rz-ranking__head"><div><span class="rz-eyebrow">Avance verificado</span><h2>Clasificación del club</h2><p>El XP proviene de retos, logros y actividad validados por el servidor.</p></div></div>';
      if (!esMiembro()) {
        el.innerHTML = cabeza + '<div class="rz-vacio">' + ic('trophy', 28) + '<strong>La clasificación es para miembros</strong><span>Activa tu membresía para ver a los mejores del club y tu posición.</span></div>';
        el.setAttribute('aria-busy', 'false'); return;
      }
      el.innerHTML = cabeza + '<div class="rz-cargando" aria-hidden="true"><span></span><span></span><span></span></div>';
      try {
        const d = await pedir('/api/retos/clasificacion');
        const top = Array.isArray(d.top) ? d.top : [];
        if (!top.length) {
          el.innerHTML = cabeza + '<div class="rz-vacio">' + ic('trophy', 28) + '<strong>La clasificación comienza contigo</strong><span>Supera tu primer reto para estrenar el tablero.</span></div>';
        } else {
          const yoPos = d.yo ? Number(d.yo.posicion) : null;
          const fila = f => '<li class="rz-fila' + (f.posicion === yoPos ? ' es-yo' : '') + '"><b class="rz-fila__pos">' + esc(f.posicion) + '</b><span class="rz-av">' + esc(iniciales(f.nombre)) + '</span>' +
            '<span class="rz-fila__nom"><strong>' + esc(f.nombre) + (f.posicion === yoPos ? ' <em>Tú</em>' : '') + '</strong><small>' + esc(nombreNivel(f.nivel)) + '</small></span><span class="rz-fila__xp">' + fmt(f.xp) + ' XP</span></li>';
          // El primero va al centro del podio: orden visual 2, 1, 3.
          const podio = top.filter(f => f.posicion <= 3).sort((a, b) => [2, 1, 3].indexOf(a.posicion) - [2, 1, 3].indexOf(b.posicion));
          const resto = top.filter(f => f.posicion > 3);
          const yoFuera = d.yo && !top.some(f => f.posicion === yoPos);
          el.innerHTML = cabeza +
            '<div class="rz-podio">' + podio.map(f => '<article class="rz-podio__c' + (f.posicion === yoPos ? ' es-yo' : '') + '" data-pos="' + f.posicion + '"><span class="rz-podio__pos">' + (f.posicion === 1 ? ic('crown', 20) : '#' + f.posicion) + '</span><span class="rz-av rz-av--grande">' + esc(iniciales(f.nombre)) + '</span><strong>' + esc(f.nombre) + '</strong><small>' + esc(nombreNivel(f.nivel)) + '</small><b>' + fmt(f.xp) + ' XP</b></article>').join('') + '</div>' +
            (resto.length ? '<ol class="rz-filas" start="4">' + resto.map(fila).join('') + '</ol>' : '') +
            (yoFuera ? '<p class="rz-tuposicion">Tu posición: <strong>#' + esc(d.yo.posicion) + '</strong> con ' + fmt(d.yo.xp) + ' XP</p>' : '');
        }
        el.setAttribute('aria-busy', 'false');
      } catch (e) {
        el.innerHTML = cabeza + '<div class="rz-vacio">' + ic('circle-alert', 28) + '<strong>No pudimos cargar la clasificación</strong><button type="button" class="rz-btn rz-btn--sec" data-accion="reintentar-ranking">Reintentar</button></div>';
        el.setAttribute('aria-busy', 'false');
      }
    }

    /* ── Eventos generales ── */
    const lanzar = {
      quiz: () => abrirCamino('quiz'),
      detective: () => {
        if (!detectivesActivos().length) { toast('Muy pronto', 'Las escenas del detective están por llegar (' + escenasPendientes(datos.detective) + ' en preparación).', 'info'); return; }
        abrirCamino('detective');
      },
      orden: () => abrirCamino('orden'),
      flashcards: () => abrirFlashcards(),
      historia: () => historiaMapa()
    };
    app.addEventListener('click', ev => {
      const reto = ev.target.closest('[data-reto]');
      if (reto && app.contains(reto)) {
        if (!esMiembro()) { verBloqueado(); return; }
        if (lanzar[reto.dataset.reto]) lanzar[reto.dataset.reto]();
        return;
      }
      const acc = ev.target.closest('[data-accion]');
      if (!acc) return;
      const a = acc.dataset.accion;
      if (a === 'suscribir') irSuscripcion();
      else if (a === 'cerrar') cerrarEscenario();
      else if (a === 'reintentar') { acc.disabled = true; cargarEstado().then(() => { pintarTodo(); pintarRanking(); }); }
      else if (a === 'reintentar-ranking') pintarRanking();
    });

    function pintarTodo() { pintarAviso(); pintarHero(); pintarBannerHistoria(); pintarDia(); pintarTarjetas(); }

    /* ── Arranque ── */
    pintarTodo();
    cargarEstado().then(() => {
      nivelAnterior = resumenNivel(estado).id;
      pintarTodo(); pintarRanking();
    });

    return { estado, recargar: () => cargarEstado().then(pintarTodo), toast };
  }

  return {
    SERVIDOR, HISTORIA_KEY, NIVELES, TIPOS, IDS, DATOS,
    esc, barajar, nivelPorXp, xpTotal, resumenNivel, normalizarEstado,
    retoDelDia, estadoNodo, apruebaCamino,
    barajarOpciones, barajarOrden, moverPaso, aciertosOrden, ordenCorrecto,
    limpiarZonas, escenaActiva, escenasActivas, escenasPendientes, tocaZona, buscarZona, puntajeDetective,
    estrellasHistoria, leerHistoria, historiaAbierta, historiaGuardar,
    tarjetasFlash, tieneEmoji, revisarContenido,
    iniciar
  };
});
