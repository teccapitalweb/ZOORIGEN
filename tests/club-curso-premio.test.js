'use strict';
// Tarjetas de premio: "Curso completado" (+XP por curso) y "Premio de bienvenida" (+100 XP).
// Lógica pura, textos, HTML y el flujo con servidor y ventana falsos. Ejecutar: node --test tests/club-curso-premio.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/js/club-curso-premio.js');
const P = require('../assets/js/club-premios.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const EMOJI = /\p{Extended_Pictographic}/u;
const NIVELES = [
  { id: 1, nombre: 'Aprendiz', desde: 0, hasta: 300 }, { id: 2, nombre: 'Técnico', desde: 300, hasta: 1200 },
  { id: 3, nombre: 'Profesional', desde: 1200, hasta: 2500 }, { id: 4, nombre: 'Líder', desde: 2500, hasta: 4500 },
  { id: 5, nombre: 'Maestro', desde: 4500, hasta: 99999 }
];
const nivelDe = xp => { const n = NIVELES.filter(x => xp >= x.desde).pop(); return { id: n.id, nombre: n.nombre, xp, desde: n.desde, hasta: n.hasta, faltan: n.id >= 5 ? 0 : n.hasta - xp }; };

// Respuesta de GET /api/premios en la que el curso número n (id "c<n>") acaba de terminarse y el XP total es `total`.
function respuesta(n, total, extra) {
  const lista = [];
  for (let i = 1; i <= n; i++) lista.push({ courseId: 'c' + i, n: i, xp: C.xpPorCurso(i), fecha: '2026-10-' + String(Math.min(i, 28)).padStart(2, '0') });
  return Object.assign({
    ok: true, membresia: true, niveles: NIVELES, nivel: nivelDe(total),
    xp: { total, logros: 0, retos: 0, referidos: 0, cursos: total, bienvenida: 0 },
    cursos: { terminados: n, lista }, logros: [], premios: [], disponibles: 0
  }, extra || {});
}
const calc = (n, total, extra, opc) => C.calcularCurso(P.normalizar(respuesta(n, total, extra)), Object.assign({ courseId: 'c' + n, titulo: 'Introducción a la inocuidad alimentaria' }, opc || {}));
const sinTags = h => h.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();

/* ───────────── fórmula y bloque de 10 ───────────── */

test('xpPorCurso: 20, 30 … 100 y 180 al décimo, y el ciclo se repite', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(C.xpPorCurso), [20, 30, 40, 50, 60, 70, 80, 90, 100, 180]);
  assert.deepEqual([11, 12, 19, 20, 21, 30].map(C.xpPorCurso), [20, 30, 100, 180, 20, 180]);
});

test('posición dentro del bloque: ((n-1) % 10) + 1', () => {
  assert.deepEqual([1, 5, 9, 10, 11, 15, 20, 21].map(C.posicionEnBloque), [1, 5, 9, 10, 1, 5, 10, 1]);
  assert.equal(C.posicionEnBloque(0), 1);
  assert.equal(C.posicionEnBloque('x'), 1);
});

/* ───────────── curso completado: datos ───────────── */

test('curso 1: +20 XP, 1 de 10 casillas, Aprendiz 170 XP, faltan 130 y sin subida de nivel', () => {
  const i = calc(1, 170);
  assert.equal(i.tipo, 'curso');
  assert.deepEqual([i.n, i.xp, i.bloque, i.especial], [1, 20, 1, false]);
  assert.equal(i.casillas.length, 10);
  assert.deepEqual(i.casillas.filter(c => c.hecha).map(c => c.num), [1]);
  assert.equal(i.casillas[9].estrella, true);
  assert.equal(i.casillas.filter(c => c.estrella).length, 1);
  assert.deepEqual([i.nivel.nombre, i.nivel.xp, i.nivel.faltan, i.nivel.pct, i.nivel.maximo], ['Aprendiz', 170, 130, 57, false]);
  assert.equal(i.nivel.siguiente, 'Técnico');
  assert.equal(i.subio, null);
});

test('curso 9: +100 XP y 9 casillas hechas; la estrella aún no', () => {
  const i = calc(9, 450);
  assert.deepEqual([i.n, i.xp, i.bloque, i.especial], [9, 100, 9, false]);
  assert.equal(i.casillas.filter(c => c.hecha).length, 9);
  assert.equal(i.casillas[9].hecha, false);
});

test('curso 10: premio especial +180 XP y el bloque completo con la estrella encendida', () => {
  const i = calc(10, 900);
  assert.deepEqual([i.n, i.xp, i.bloque, i.especial], [10, 180, 10, true]);
  assert.equal(i.casillas.every(c => c.hecha), true);
  assert.match(C.tituloCurso(i), /Premio especial por tu curso 10/);
  assert.match(C.textoCurso(i), /premio especial de <b>\+180 XP<\/b>/);
  assert.match(C.textoLlevas(i), /Llevas <b>10<\/b> de <b>10<\/b> cursos\. ¡Ya recibiste tu premio especial!/);
  assert.equal(calc(20, 3000).especial, true, 'el 20 también es especial');
  assert.equal(calc(20, 3000).xp, 180);
});

test('curso 11: empieza un bloque nuevo (1 de 10) y vuelve a pagar +20 XP', () => {
  const i = calc(11, 1000);
  assert.deepEqual([i.n, i.xp, i.bloque, i.especial], [11, 20, 1, false]);
  assert.deepEqual(i.casillas.filter(c => c.hecha).map(c => c.num), [1]);
  assert.match(C.textoLlevas(i), /Llevas <b>1<\/b> de <b>10<\/b> cursos/);
});

test('subida de nivel: si el XP de antes (total - xp del curso) estaba en un nivel menor', () => {
  assert.deepEqual(calc(2, 310).subio, { nombre: 'Técnico' }, 'el curso 2 vale 30: antes 280 (Aprendiz), ahora 310 (Técnico)');
  assert.deepEqual(calc(2, 329).subio, { nombre: 'Técnico' }, 'antes 299: todavía Aprendiz');
  assert.equal(calc(2, 330).subio, null, 'antes 300: ya era Técnico');
  assert.deepEqual(calc(1, 305).subio, { nombre: 'Técnico' }, 'antes 285 (Aprendiz)');
  assert.deepEqual(calc(10, 1300).subio, { nombre: 'Profesional' }, 'antes 1120 (Técnico), el premio especial hizo subir');
  assert.equal(calc(3, 150).subio, null);
  // sube dos niveles de golpe
  const doble = C.calcularCurso(P.normalizar(Object.assign(respuesta(10, 1300), { cursos: { terminados: 10, lista: [{ courseId: 'cx', n: 10, xp: 1200 }] } })), { courseId: 'cx' });
  assert.deepEqual(doble.subio, { nombre: 'Profesional' });
});

test('nivel máximo: sin "te faltan", barra llena', () => {
  const i = calc(7, 5200);
  assert.equal(i.nivel.maximo, true);
  assert.equal(i.nivel.pct, 100);
  assert.equal(i.nivel.faltan, 0);
  assert.equal(i.nivel.siguiente, null);
  const h = C.nivelHTML(i.nivel);
  assert.match(h, /Nivel Maestro · 5,200 XP/);
  assert.match(h, /nivel máximo/);
  assert.doesNotMatch(h, /Te faltan/);
});

test('los niveles salen del servidor: umbrales distintos cambian el cálculo', () => {
  const otros = [{ id: 1, nombre: 'Novato', desde: 0, hasta: 500 }, { id: 2, nombre: 'Aficionado', desde: 500, hasta: 2000 }, { id: 3, nombre: 'Experto', desde: 2000, hasta: 4000 }];
  const r = respuesta(1, 520, { niveles: otros, nivel: { id: 2, nombre: 'Aficionado', xp: 520, desde: 500, hasta: 2000, faltan: 1480 } });
  const i = C.calcularCurso(P.normalizar(r), { courseId: 'c1' });
  assert.deepEqual([i.nivel.nombre, i.nivel.faltan, i.nivel.siguiente], ['Aficionado', 1480, 'Experto']);
  assert.equal(i.subio, null, 'antes 500: ya era Aficionado');
  const sube = C.calcularCurso(P.normalizar(respuesta(1, 515, { niveles: otros, nivel: { id: 2, nombre: 'Aficionado', xp: 515, desde: 500, hasta: 2000, faltan: 1485 } })), { courseId: 'c1' });
  assert.deepEqual(sube.subio, { nombre: 'Aficionado' }, 'antes 495: todavía Novato');
});

test('sin dato de ese curso (otro id, sin membresía, sin lista, respuesta rara): no hay tarjeta', () => {
  const ok = P.normalizar(respuesta(2, 100));
  assert.equal(C.calcularCurso(ok, { courseId: 'otro' }), null);
  assert.equal(C.calcularCurso(ok, {}), null);
  assert.equal(C.calcularCurso(P.normalizar(respuesta(2, 100, { membresia: false })), { courseId: 'c2' }), null);
  assert.equal(C.calcularCurso(null, { courseId: 'c2' }), null);
  assert.equal(C.calcularCurso({}, { courseId: 'c2' }), null);
  assert.equal(C.calcularCurso(P.normalizar({ ok: true, membresia: true }), { courseId: 'c2' }), null);
});

test('si el servidor manda xp 0 para el curso, se usa la fórmula fija como respaldo', () => {
  const r = respuesta(3, 90); r.cursos.lista[2].xp = 0;
  assert.equal(C.calcularCurso(P.normalizar(r), { courseId: 'c3' }).xp, 40);
});

/* ───────────── curso completado: HTML ───────────── */

test('la tarjeta del curso 1 trae todos los textos del diseño', () => {
  const h = C.cursoHTML(calc(1, 170));
  const t = sinTags(h);
  assert.match(t, /Curso completado/);
  assert.match(h, /<span class="zcp__xp-num">\+20<\/span><span class="zcp__xp-u">XP<\/span>/);
  assert.match(t, /¡Premio por tu curso!/);
  assert.match(t, /Completaste tu curso número 1 \( Introducción a la inocuidad alimentaria \) y ganaste XP para subir de nivel\. Sigue así: cada curso que termines suma más\./);
  assert.match(t, /Llevas 1 de 10 cursos\. ¡Al décimo te espera un premio especial!/);
  assert.match(t, /Nivel Aprendiz · 170 XP/);
  assert.match(t, /Te faltan 130 XP para el siguiente nivel/);
  assert.match(t, /Ver mi certificado →/);
  assert.equal((h.match(/<li class="zcp__casilla/g) || []).length, 10);
  assert.equal((h.match(/zcp__casilla is-hecha/g) || []).length, 1);
  assert.match(h, /zcp__casilla--estrella/);
  assert.match(h, /<svg[^>]*>[\s\S]*<\/svg><\/li><\/ol>/, 'la décima casilla lleva la estrella como SVG');
  assert.match(h, /style="width:57%"/);
  assert.match(h, /role="progressbar"[^>]*aria-valuenow="57"/);
  assert.match(h, /data-zcp-accion/);
  assert.match(h, /data-zcp-cerrar[^>]*aria-label="Cerrar"/);
  assert.match(h, /<svg/, 'trofeo como SVG');
  assert.doesNotMatch(h, /Subiste/);
});

test('con subida de nivel aparece el aviso "¡Subiste a Nivel …!"', () => {
  const h = C.cursoHTML(calc(1, 305));
  assert.match(sinTags(h), /¡Subiste a Nivel Técnico!/);
  assert.match(h, /class="zcp__subida" role="status"/);
});

test('la tarjeta del curso 10 es de premio especial (+180 XP)', () => {
  const t = sinTags(C.cursoHTML(calc(10, 900)));
  assert.match(t, /\+180 XP/);
  assert.match(t, /¡Premio especial por tu curso 10!/);
  assert.match(t, /cerraste tu bloque de 10 cursos/);
  assert.doesNotMatch(t, /Al décimo te espera/);
});

test('todo texto del curso se escapa (título con HTML no se ejecuta)', () => {
  const h = C.cursoHTML(calc(1, 100, null, { titulo: '<img src=x onerror=alert(1)>"' }));
  assert.doesNotMatch(h, /<img/);
  assert.match(h, /&lt;img src=x onerror=alert\(1\)&gt;&quot;/);
  const n = calc(1, 100, { niveles: [{ id: 1, nombre: '<b>X</b>', desde: 0, hasta: 300 }, { id: 2, nombre: 'Y', desde: 300, hasta: 900 }], nivel: { id: 1, nombre: '<b>X</b>', xp: 100, desde: 0, hasta: 300, faltan: 200 } });
  assert.doesNotMatch(C.cursoHTML(n), /<b>X/);
});

/* ───────────── bienvenida ───────────── */

test('calcularBienvenida: +100 XP con el nivel del servidor; ya reclamado o con error no hay tarjeta', () => {
  const i = C.calcularBienvenida({ ok: true, xp: 100, yaReclamado: false, xpTotal: 100, nivel: nivelDe(100) });
  assert.equal(i.tipo, 'bienvenida');
  assert.equal(i.xp, 100);
  assert.deepEqual([i.nivel.nombre, i.nivel.xp, i.nivel.faltan, i.nivel.pct], ['Aprendiz', 100, 200, 33]);
  assert.equal(C.calcularBienvenida({ ok: true, xp: 100, yaReclamado: true }), null);
  for (const mala of [null, undefined, 'x', [], { ok: false }, {}, { error: 'no' }]) assert.equal(C.calcularBienvenida(mala), null);
  const sinNivel = C.calcularBienvenida({ ok: true, xp: 100, xpTotal: 350 });
  assert.equal(sinNivel.nivel.nombre, 'Técnico', 'sin nivel del servidor se deduce con la tabla');
  assert.equal(C.calcularBienvenida({ ok: true, yaReclamado: false, xpTotal: 100 }).xp, 100, 'xp por defecto 100');
});

test('la tarjeta de bienvenida trae los textos pedidos y el botón Continuar', () => {
  const h = C.bienvenidaHTML(C.calcularBienvenida({ ok: true, xp: 100, xpTotal: 100, nivel: nivelDe(100) }));
  const t = sinTags(h);
  assert.match(h, /<span class="zcp__xp-num">\+100<\/span><span class="zcp__xp-u">XP<\/span>/);
  assert.match(t, /¡Premio de bienvenida!/);
  assert.match(t, /Por ser nuevo en Zoorigen ya empiezas a sumar para subir de nivel\./);
  assert.match(t, /Nivel Aprendiz · 100 XP/);
  assert.match(t, /Te faltan 200 XP para el siguiente nivel/);
  assert.match(t, /Continuar/);
  assert.doesNotMatch(t, /certificado|Llevas|Subiste/);
  assert.doesNotMatch(h, /zcp__nota/);
  assert.match(h, /<svg/, 'regalo como SVG');
  const sin = C.bienvenidaHTML(C.calcularBienvenida({ ok: true, xp: 100, xpTotal: 100, nivel: nivelDe(100) }), { sinMembresia: true });
  assert.match(sinTags(sin), /Tu XP queda guardado y ya lo ves en Retos y en Mis logros\. Para jugar y seguir sumando necesitas tu membresía\./);
});

/* ───────────── flujo: nunca bloquea el certificado ───────────── */

function flujo(pedir, abrir) {
  const llamadas = { pedir: [], abrir: [], cert: 0 };
  const f = C.crearFlujo({
    pedir: async (...a) => { llamadas.pedir.push(a); return pedir(...a); },
    abrir: async (info, opc) => { llamadas.abrir.push({ info, opc }); return abrir ? abrir(info, opc) : { como: 'accion' }; }
  });
  const cert = () => { llamadas.cert++; };
  return { f, llamadas, cert };
}

test('flujo: consulta GET /api/premios, arma la tarjeta y deja el certificado para el botón', async () => {
  const { f, llamadas, cert } = flujo(async () => ({ ok: true, status: 200, datos: respuesta(3, 190) }));
  const r = await f.mostrar({ courseId: 'c3', titulo: 'Curso 3', alVerCertificado: cert });
  assert.deepEqual(llamadas.pedir[0].slice(0, 3), ['/api/premios', 'GET', null]);
  assert.equal(llamadas.abrir.length, 1);
  assert.equal(llamadas.abrir[0].info.n, 3);
  assert.equal(llamadas.abrir[0].opc.alAccion, cert, 'la acción del botón es abrir el certificado');
  assert.equal(llamadas.cert, 0, 'el certificado no se abre solo: lo abre el botón');
  assert.deepEqual([r.tarjeta, r.abrio], [true, true]);
});

test('flujo: si la cierran sin pulsar el botón, avisa que no se abrió el certificado', async () => {
  for (const como of ['esc', 'fondo', 'x']) {
    const { f, cert } = flujo(async () => ({ ok: true, status: 200, datos: respuesta(1, 20) }), async () => ({ como }));
    const r = await f.mostrar({ courseId: 'c1', alVerCertificado: cert });
    assert.deepEqual([r.tarjeta, r.abrio, r.como], [true, false, como]);
  }
});

test('flujo: servidor caído, 401/403/500, respuesta rara o sin el curso -> NO bloquea: abre directo el certificado', async () => {
  const casos = {
    'sin red': async () => { throw new Error('sin red'); },
    'status 500': async () => ({ ok: false, status: 500, datos: { error: 'x' } }),
    'status 403': async () => ({ ok: false, status: 403, datos: {} }),
    'sin membresía': async () => ({ ok: true, status: 200, datos: respuesta(1, 20, { membresia: false }) }),
    'respuesta rara': async () => ({ ok: true, status: 200, datos: 'hola' }),
    'sin ese curso': async () => ({ ok: true, status: 200, datos: respuesta(1, 20) }),
    'nada': async () => null
  };
  for (const [nombre, pedir] of Object.entries(casos)) {
    const { f, llamadas, cert } = flujo(pedir);
    const r = await f.mostrar({ courseId: nombre === 'sin ese curso' ? 'zzz' : 'c1', alVerCertificado: cert });
    assert.equal(llamadas.abrir.length, 0, nombre + ': sin tarjeta');
    assert.equal(llamadas.cert, 1, nombre + ': el certificado se abre una vez');
    assert.deepEqual([r.tarjeta, r.abrio], [false, true], nombre);
  }
});

test('flujo: si dibujar la tarjeta falla, igual se abre el certificado y no se rechaza la promesa', async () => {
  const { f, llamadas, cert } = flujo(async () => ({ ok: true, status: 200, datos: respuesta(1, 20) }), async () => { throw new Error('sin DOM'); });
  const r = await f.mostrar({ courseId: 'c1', alVerCertificado: cert });
  assert.equal(llamadas.cert, 1);
  assert.equal(r.tarjeta, false);
  // y si hasta alVerCertificado truena, tampoco se rechaza
  const { f: g } = flujo(async () => { throw new Error('x'); });
  await assert.doesNotReject(() => g.mostrar({ courseId: 'c1', alVerCertificado: () => { throw new Error('popup bloqueado'); } }));
  await assert.doesNotReject(() => g.mostrar({}));
});

/* ───────────── integración en la biblioteca y archivos ───────────── */

test('biblioteca: la tarjeta solo sale cuando el servidor reporta un curso NUEVO completado y abre el folio que emitió el servidor', () => {
  const html = leer('pages/club-biblioteca.html').replace(/\r\n/g, '\n');
  assert.equal((html.match(/ZOO_CURSO_PREMIO\.mostrar\(/g) || []).length, 1);
  const iCel = html.indexOf('async function celebrarCursoCompletado');
  const cel = html.slice(iCel, html.indexOf('function terminarCurso'));
  assert.ok(iCel > 0 && cel.includes('ZOO_CURSO_PREMIO.mostrar('), 'la tarjeta vive en celebrarCursoCompletado');
  // solo se celebra con nuevoCompletado (un curso ya completado antes no vuelve a sacar la tarjeta)
  assert.match(html, /if \(r\.nuevoCompletado\) \{ await celebrarCursoCompletado\(courseId, r\); return; \}/);
  assert.equal((html.match(/celebrarCursoCompletado\(/g) || []).length, 2, 'una definición y una sola llamada');
  assert.match(cel, /const folio = r && r\.entrada && r\.entrada\.certificateFolio/, 'el folio es el del servidor');
  assert.match(cel, /alVerCertificado: abrirCertificado/);
  assert.match(cel, /courseId: String\(courseId\)/);
  assert.match(cel, /window\.open\('ver-certificado\.html\?folio=' \+ encodeURIComponent\(folio\), '_blank'\);\s*setTimeout\(\(\) => window\.location\.reload\(\), 800\)/, 'el botón abre el certificado y luego recarga');
  assert.match(cel, /res\.tarjeta && !res\.abrio\) window\.location\.reload\(\)/, 'si cierran sin abrirlo, solo se recarga');
  assert.match(cel, /else \{\s*setTimeout\(abrirCertificado, 300\)/, 'sin el módulo se abre el certificado directo');
  assert.equal(/Math\.random|ZOO-\$\{/.test(html), false, 'el navegador ya no inventa folios');
});

test('biblioteca: carga el CSS y el JS de la tarjeta, en orden y con la misma versión que las demás páginas', () => {
  const html = leer('pages/club-biblioteca.html');
  assert.match(html, /assets\/css\/club-curso-premio\.css\?v=\d+/);
  const pos = f => html.indexOf('assets/js/' + f);
  assert.ok(pos('admin-iconos.js') < pos('club-premios.js') && pos('club-premios.js') < pos('club-curso-premio.js'));
  const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html'));
  for (const archivo of ['club-curso-premio.js', 'club-curso-premio.css', 'club-premios.js']) {
    const vs = new Set();
    for (const f of paginas) for (const m of leer('pages/' + f).matchAll(new RegExp(archivo.replace('.', '\\.') + '\\?v=([\\w.-]+)', 'g'))) vs.add(m[1]);
    assert.equal(vs.size, 1, `${archivo}: versiones ${[...vs].join(', ')}`);
  }
});

test('sin emojis en la tarjeta (JS, CSS y HTML generado) y todos los íconos existen', () => {
  for (const f of ['assets/js/club-curso-premio.js', 'assets/css/club-curso-premio.css']) assert.ok(!EMOJI.test(leer(f)), 'emoji en ' + f);
  const I = require('../assets/js/admin-iconos.js');
  const html = C.cursoHTML(calc(10, 1300)) + C.bienvenidaHTML(C.calcularBienvenida({ ok: true, xpTotal: 100 }), { sinMembresia: true });
  assert.ok(!EMOJI.test(html));
  for (const n of [...leer('assets/js/club-curso-premio.js').matchAll(/icono\('([a-z0-9-]+)'/g)].map(m => m[1]).concat(['trophy', 'gift'])) assert.ok(I.existe(n), 'falta el ícono ' + n);
});

test('CSS: tema oscuro por defecto, tema claro, ajustes para celular y movimiento reducido', () => {
  const css = leer('assets/css/club-curso-premio.css');
  assert.match(css, /\[data-theme="light"\] \.zcp \{/);
  assert.match(css, /@media \(max-width: 420px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /zcp__casilla--estrella/);
  assert.doesNotMatch(css, /linear-gradient\(100deg/, 'el botón principal es de color sólido, sin degradado');
  assert.match(css, /\.zcp__btn \{[^}]*background: var\(--zoo-amber/, 'botón principal dorado sólido');
});

test('accesibilidad del código del navegador: role=dialog, aria-modal, foco atrapado, Esc, fondo y X', () => {
  const js = leer('assets/js/club-curso-premio.js');
  for (const s of ['role="dialog"', 'aria-modal="true"', 'aria-labelledby="zcp-titulo"', 'aria-describedby="zcp-desc"', "ev.key === 'Escape'", "ev.key !== 'Tab'", "cerrar('fondo')", "cerrar('x')", 'data-zcp-cerrar', 'previo.focus']) assert.ok(js.includes(s), s);
});
