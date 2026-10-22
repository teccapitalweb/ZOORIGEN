'use strict';

// Sección "Encuesta" del panel admin: agregación pura. Ejecutar: node --test tests/admin-encuesta.test.js

const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require(path.join(__dirname, '..', 'assets', 'js', 'admin-encuesta.js'));
const M = require(path.join(__dirname, '..', 'assets', 'js', 'encuesta-motor.js'));

const RAIZ = path.join(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const AHORA = Date.UTC(2026, 9, 12, 15);
const iso = h => new Date(AHORA - h * 3600000).toISOString();

const COMPLETA = {
  meta: 'Especializarme en mi profesión', p1: 'Médico veterinario', origen: 'Redes sociales', grupo: 'Aves y rapaces',
  p2: 'Normatividad', p2b: 'Registro y UMA', experiencia: 'Sí, me gustan', urgencia: 'Lo antes posible', freno: 'Precio'
};
const doc = (sessionId, extra = {}) => Object.assign({ sessionId, respuestas: COMPLETA, completada: true, creado: iso(5) }, extra);

/* ───────────────────────── consolidar ───────────────────────── */

test('consolidar: una sola copia por sesión; la completa gana a la parcial', () => {
  const s = A.consolidar([
    doc('a', { completada: false, respuestas: { meta: COMPLETA.meta }, creado: iso(9) }),
    doc('a', { creado: iso(8) }),
    doc('b', { completada: false, respuestas: { meta: COMPLETA.meta, p1: 'Estudiante' } })
  ]);
  assert.equal(s.length, 2);
  const a = s.find(x => x.sessionId === 'a');
  assert.equal(a.completada, true);
  assert.equal(a.copias, 2);
  assert.equal(a.respuestas.freno, 'Precio');
  assert.equal(s.find(x => x.sessionId === 'b').completada, false);
});

test('consolidar: entre completas gana la más reciente; el WhatsApp de otra copia se conserva', () => {
  const s = A.consolidar([
    doc('a', { respuestas: Object.assign({}, COMPLETA, { freno: 'Tiempo' }), creado: iso(30) }),
    doc('a', { respuestas: Object.assign({}, COMPLETA, { freno: 'Nada, listo' }), creado: iso(10) }),
    doc('a', { contacto: '525512345678', avisoAceptado: true, avisoVersion: 'zoo-aviso-2026-10', creado: iso(20) })
  ]);
  assert.equal(s.length, 1);
  assert.equal(s[0].respuestas.freno, 'Nada, listo');
  assert.equal(s[0].numero, '525512345678');
  assert.equal(s[0].avisoAceptado, true);
  assert.equal(s[0].avisoVersion, 'zoo-aviso-2026-10');
});

test('contactoDe: cadena de dígitos del servidor, o la forma { numero, avisoAceptado } anterior', () => {
  assert.deepEqual(A.contactoDe({ contacto: '525512345678', avisoAceptado: true, avisoVersion: 'v1' }), { numero: '525512345678', avisoAceptado: true, avisoVersion: 'v1' });
  assert.deepEqual(A.contactoDe({ contacto: { numero: '573001234567', avisoAceptado: true, avisoVersion: 'v2' } }), { numero: '573001234567', avisoAceptado: true, avisoVersion: 'v2' });
  assert.equal(A.contactoDe({ contacto: '12' }).numero, '', 'número fuera de 8 a 15 dígitos');
  assert.equal(A.contactoDe({}).numero, '');
  assert.equal(A.contactoDe({ contacto: '525512345678' }).avisoAceptado, false);
  assert.equal(A.contactoDe(null).numero, '');
});

test('consolidar tolera basura: documentos no objeto, sin sessionId, sin respuestas, fechas raras', () => {
  const s = A.consolidar([null, 'x', 5, { respuestas: null }, { sessionId: 'z', respuestas: { meta: 5, p1: '' }, creado: 'no es fecha' }, { respuestas: { meta: 'a' } }]);
  assert.equal(s.length, 3);
  assert.deepEqual(s.find(x => x.sessionId === 'z').respuestas, {});
  assert.deepEqual(A.consolidar(null), []);
  assert.deepEqual(A.consolidar({}), []);
});

/* ───────────────────────── calcular ───────────────────────── */

function muestra() {
  return [
    doc('s1'),
    doc('s2', { respuestas: Object.assign({}, COMPLETA, { p1: 'Estudiante', p2: 'Trabajar en campo', p2b: 'Manejo seguro', origen: 'Buscador', urgencia: 'En el próximo mes', freno: 'Tiempo' }), contacto: '525512345678', avisoAceptado: true, avisoVersion: 'zoo-aviso-2026-10' }),
    doc('s3', { respuestas: Object.assign({}, COMPLETA, { p1: 'Consultor ambiental', p2: 'Monitoreo', p2b: 'Fototrampeo', tamano: '2 a 10', urgencia: 'Lo antes posible' }), contacto: '573001234567', avisoAceptado: true, avisoVersion: 'zoo-aviso-2026-10', creado: iso(1) }),
    doc('s4', { completada: false, respuestas: { meta: COMPLETA.meta, p1: 'Estudiante', origen: 'Otro' } }),
    doc('s5', { completada: false, respuestas: { meta: COMPLETA.meta } }),
    doc('s6', { completada: false, respuestas: { meta: COMPLETA.meta, p1: 'Amante de la fauna', origen: 'Redes sociales', grupo: 'Vida marina' } }),
    doc('s7', { completada: false, respuestas: Object.assign({}, COMPLETA, { freno: undefined }), contacto: '5555555555' }),
    doc('s1', { completada: false, respuestas: { meta: COMPLETA.meta } }) // copia parcial de s1: no cuenta aparte
  ];
}

test('calcular: totales, completas y porcentaje (una persona por sesión)', () => {
  const r = A.calcular(muestra());
  assert.equal(r.total, 7);
  assert.equal(r.completas, 3);
  assert.equal(r.parciales, 4);
  assert.equal(r.pctCompletas, 43);
  assert.equal(r.conWhatsapp, 3);
  assert.equal(r.conAviso, 2);
});

test('calcular: distribuciones por perfil, origen, grupo, urgencia, freno y tamaño', () => {
  const D = A.calcular(muestra()).distribuciones;
  assert.equal(D.p1.base, 6);
  assert.deepEqual(D.p1.items.map(i => [i.valor, i.n]), [['Estudiante', 2], ['Médico veterinario', 2], ['Amante de la fauna', 1], ['Consultor ambiental', 1]].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  assert.equal(D.origen.items.find(i => i.valor === 'Redes sociales').n, 4);
  assert.equal(D.grupo.items.find(i => i.valor === 'Aves y rapaces').n, 4);
  assert.equal(D.grupo.items.find(i => i.valor === 'Vida marina').n, 1);
  assert.equal(D.urgencia.items.find(i => i.valor === 'Lo antes posible').n, 3);
  assert.equal(D.urgencia.items.find(i => i.valor === 'En el próximo mes').n, 1);
  assert.equal(D.freno.base, 3);
  assert.deepEqual(D.tamano.items, [{ valor: '2 a 10', n: 1, pct: 100 }]);
  assert.equal(D.p1.etiqueta, 'Perfil');
  assert.equal(D.p1.items[0].pct, 33);
});

test('calcular: abandono por pregunta cuenta la última que contestaron quienes NO terminaron', () => {
  const r = A.calcular(muestra());
  const por = Object.fromEntries(r.abandono.map(a => [a.clave, a]));
  assert.equal(por.meta.n, 1, 's5 se fue después de la primera');
  assert.equal(por.origen.n, 1, 's4');
  assert.equal(por.grupo.n, 1, 's6 llegó hasta la fauna de interés');
  assert.equal(por.urgencia.n, 1, 's7 contestó hasta urgencia');
  assert.equal(por.freno.n, 0);
  assert.equal(por.p1.n, 0);
  assert.equal(r.abandono.reduce((s, a) => s + a.n, 0), r.parciales);
  assert.deepEqual(r.abandono.map(a => a.clave), M.CLAVES, 'mismo orden del flujo');
  assert.equal(por.origen.respondieron, 6);
  assert.equal(por.origen.pct, 17);
  assert.equal(r.sinRespuestas, 0);
});

test('calcular: sesión parcial sin ninguna respuesta se cuenta aparte', () => {
  const r = A.calcular([doc('x', { completada: false, respuestas: {} }), doc('y')]);
  assert.equal(r.total, 2);
  assert.equal(r.sinRespuestas, 1);
  assert.equal(r.abandono.reduce((s, a) => s + a.n, 0), 0);
});

test('calcular: leads calientes (urgencia "Lo antes posible") y su WhatsApp con consentimiento', () => {
  const r = A.calcular(muestra());
  assert.equal(r.calientes, 3); // s1, s3 y s7 (urgencia dicha aunque no terminó)
  assert.equal(r.calientesConWhatsapp, 2); // s3 y s7
  const [primero, segundo, tercero] = r.leads;
  assert.equal(r.leads.length, 3);
  assert.equal(primero.caliente, true);
  assert.equal(segundo.caliente, true);
  assert.equal(tercero.caliente, false, 'los calientes van primero');
  assert.equal(primero.numero, '573001234567', 'entre calientes, el más reciente primero');
  assert.equal(primero.wa, 'https://wa.me/573001234567');
  assert.equal(primero.avisoAceptado, true);
  assert.equal(primero.avisoVersion, 'zoo-aviso-2026-10');
  const sinAviso = r.leads.find(l => l.numero === '5555555555');
  assert.equal(sinAviso.avisoAceptado, false);
  assert.equal(sinAviso.dudoso, true, 'todos los dígitos iguales');
  assert.equal(r.leads.find(l => l.numero === '525512345678').dudoso, false);
});

test('calcular: retos por perfil', () => {
  const r = A.calcular(muestra());
  assert.ok(r.retos.length >= 3);
  assert.deepEqual(r.retos[0], { perfil: 'Médico veterinario', reto: 'Normatividad', n: 2 });
});

test('calcular con datos vacíos o malos no se rompe', () => {
  for (const x of [[], null, undefined, 'x', [{}, null]]) {
    const r = A.calcular(x);
    assert.ok(Number.isFinite(r.total));
    assert.equal(r.pctCompletas, 0);
    assert.deepEqual(r.leads, []);
  }
});

test('numeroDudoso: México con lada válida, patrones y largo', () => {
  assert.equal(A.numeroDudoso('525512345678'), false);
    assert.equal(A.numeroDudoso('5255555555555'), true, '52 con más dígitos de los que tiene México');
  assert.equal(A.numeroDudoso('521234567890'), true, 'lada que empieza en 1');
  assert.equal(A.numeroDudoso('573001234567'), false);
  assert.equal(A.numeroDudoso('1234567890'), true, 'secuencia');
  assert.equal(A.numeroDudoso(''), true);
});

/* ───────────────────────── preguntas sin respuesta ───────────────────────── */

test('calcularPreguntas: ordena por veces y luego por la más reciente', () => {
  const p = A.calcularPreguntas([
    { texto: 'cuanto cuesta un jaguar', veces: 3, ultimaVez: iso(48), tipo: 'otro' },
    { texto: 'que come el ajolote', veces: 12, ultimaVez: iso(2), tipo: 'animal' },
    { texto: 'puedo tener un mapache', veces: 3, ultimaVez: iso(1), tipo: 'otro' },
    { texto: '', veces: 99 },
    null,
    { ejemplo: 'dato raro', veces: 'mucho', tipo: 'xx' }
  ]);
  assert.deepEqual(p.items.map(x => x.texto), ['que come el ajolote', 'puedo tener un mapache', 'cuanto cuesta un jaguar', 'dato raro']);
  assert.equal(p.items[0].tipo, 'animal');
  assert.equal(p.items[3].veces, 1);
  assert.equal(p.items[3].tipo, 'otro');
  assert.equal(p.totalVeces, 12 + 3 + 3 + 1);
  assert.deepEqual(A.calcularPreguntas(null).items, []);
});

/* ───────────────────────── carga ───────────────────────── */

test('cargar: pide las dos rutas con su límite; cada mitad falla por separado', async () => {
  const llamadas = [];
  const api = async ruta => {
    llamadas.push(ruta);
    if (ruta.startsWith('/api/admin/encuesta')) return { docs: [doc('a')] };
    const e = new Error('no existe'); e.status = 404; throw e;
  };
  const r = await A.cargar(api);
  assert.deepEqual(llamadas, ['/api/admin/encuesta?limite=1000', '/api/admin/chatbot/sin-respuesta?limite=200']);
  assert.equal(r.encuesta.ok, true);
  assert.equal(r.encuesta.docs.length, 1);
  assert.equal(r.preguntas.ok, false);
  assert.match(r.preguntas.error, /webhook-chatbot/);
  const r2 = await A.cargar(async ruta => ({ preguntas: [{ texto: 'x', veces: 1 }] }), { limiteEncuesta: 5000, limitePreguntas: 50 });
  assert.equal(r2.preguntas.preguntas.length, 1);
  assert.deepEqual(r2.encuesta.docs, [], 'respuesta sin docs = lista vacía');
  const r3 = await A.cargar(async () => { const e = new Error('x'); e.status = 403; throw e; });
  assert.match(r3.encuesta.error, /permiso de administrador/);
});

test('cargar limita la consulta a 2000 documentos', async () => {
  let ruta = '';
  await A.cargar(async r => { ruta = ruta || r; return {}; }, { limiteEncuesta: 99999 });
  assert.equal(ruta, '/api/admin/encuesta?limite=2000');
});

/* ───────────────────────── HTML ───────────────────────── */

test('vistaHTML: todo texto de visitantes sale escapado (nunca HTML en el panel)', () => {
  const malo = '<img src=x onerror="window.__XSS=1">';
  const estado = {
    encuesta: { ok: true, docs: [
      { sessionId: 'z', completada: true, respuestas: { p1: malo, urgencia: 'Lo antes posible', origen: '"><script>alert(1)</script>' }, contacto: '525512345678', avisoAceptado: true, avisoVersion: malo, creado: iso(1) }
    ] },
    preguntas: { ok: true, preguntas: [{ texto: malo, veces: 4, tipo: 'otro', ultimaVez: iso(1) }] }
  };
  const html = A.vistaHTML(estado);
  assert.ok(!html.includes('<img src=x'), 'quedó HTML sin escapar');
  assert.ok(!html.includes('<script>alert'), 'quedó un script sin escapar');
  assert.match(html, /&lt;img src=x/);
  assert.match(html, /wa\.me\/525512345678/);
  assert.match(html, /Aviso aceptado/);
});

test('vistaHTML: muestra KPIs, secciones y mensajes de error sin romperse', () => {
  const ok = A.vistaHTML({ encuesta: { ok: true, docs: muestra() }, preguntas: { ok: true, preguntas: [{ texto: 'hola', veces: 2, tipo: 'otro' }] } });
  for (const t of ['Personas que respondieron', 'Terminaron la encuesta', 'Leads calientes', 'Perfil de quién responde', 'Cómo nos conocieron',
    'Fauna que les interesa', 'Cuándo quieren empezar', 'Qué los detiene hoy', 'Tamaño del equipo', 'Dónde se quedan quienes no terminan',
    'Personas que pidieron que un asesor las escriba', 'Preguntas que la guía no supo contestar', 'data-accion="recargar"']) {
    assert.ok(ok.includes(t), 'falta: ' + t);
  }
  const vacio = A.vistaHTML({ encuesta: { ok: true, docs: [] }, preguntas: { ok: true, preguntas: [] } });
  assert.match(vacio, /Todavía nadie responde la encuesta/);
  assert.match(vacio, /Nadie ha dejado su WhatsApp/);
  assert.match(vacio, /no ha tenido preguntas sin respuesta/);
  const error = A.vistaHTML({ encuesta: { ok: false, error: 'Sin conexión' }, preguntas: { ok: false, error: 'Sin conexión' } });
  assert.match(error, /No se pudieron cargar las respuestas/);
  assert.match(error, /Sin conexión/);
  assert.ok(!/\p{Extended_Pictographic}/u.test(ok + vacio + error));
  assert.doesNotThrow(() => A.vistaHTML(undefined));
});

/* ───────────────────────── Las 11 gráficas ───────────────────────── */

const TITULOS_11 = ['Perfil de quién responde', 'Cómo nos conocieron', 'Qué quieren lograr este año', 'Fauna que les interesa', 'Cuándo quieren empezar',
  'Qué los detiene hoy', 'Tamaño del equipo', 'Experiencia con cursos en línea', 'Reto principal por perfil', 'Dónde se quedan quienes no terminan', 'Resumen por rama del flujo'];

function muestraCompleta() {
  const base = { meta: 'Cumplir trámites y normatividad', grupo: 'Mamíferos y felinos', origen: 'Recomendación', experiencia: 'Es mi primera vez', urgencia: 'En el próximo mes', freno: 'Tiempo', tamano: 'Solo yo' };
  return [
    doc('c1', { respuestas: Object.assign({}, base, { p1: 'Estudiante', p2: 'Trabajar en campo', p2b: 'Manejo seguro' }) }),
    doc('c2', { respuestas: Object.assign({}, base, { p1: 'Estudiante', p2: 'Trabajar en campo', p2b: 'Manejo seguro', origen: 'Redes sociales' }) }),
    doc('c3', { respuestas: Object.assign({}, base, { p1: 'Estudiante', p2: 'Complementar mi carrera', p2b: 'Conservación', origen: 'Redes sociales', meta: 'Especializarme en mi profesión' }) }),
    doc('c4', { respuestas: Object.assign({}, base, { p1: 'Consultor ambiental', p2: 'Monitoreo', p2b: 'Fototrampeo', tamano: '2 a 10', urgencia: 'Lo antes posible', freno: 'Precio' }) }),
    doc('c5', { completada: false, respuestas: { meta: base.meta, p1: 'Estudiante', origen: 'Buscador' } }),
    doc('c6', { completada: false, respuestas: { meta: base.meta } })
  ];
}

test('graficasHTML: las 11 gráficas, cada una con su frase «Cómo leerlo» armada con los datos', () => {
  const h = A.graficasHTML(A.calcular(muestraCompleta()));
  for (const t of TITULOS_11) assert.ok(h.includes('<h2>' + t + '</h2>'), 'falta la gráfica: ' + t);
  assert.equal((h.match(/class="ap-card enc-g/g) || []).length, 11);
  assert.equal((h.match(/Cómo leerlo:/g) || []).length, 11, 'una frase de lectura por gráfica');
  // tres donas (perfil, tamaño del equipo y cursos en línea), dos de columnas, barras horizontales, apiladas y tabla de ramas
  assert.equal((h.match(/class="zg zg-anillo"/g) || []).length, 3);
  assert.equal((h.match(/zg zg--barras/g) || []).length, 2);
  assert.ok(h.includes('zg-ap__lista') && h.includes('ap-tabla--ramas') && h.includes('zg-bh__lista'));
  // las frases dicen cosas ciertas de ESTOS datos
  assert.match(h, /De cada 10 personas que contestaron, 8 son «Estudiante»/);
  assert.match(h, /Lo que más buscan es «Cumplir trámites y normatividad»/);
  assert.match(h, /Entre «Estudiante» \(el perfil con más respuestas, 3 personas\), el reto más elegido es «Trabajar en campo» con 2 de 3/);
  assert.match(h, /La encuesta se pierde más en «[^»]+»/);
  assert.match(h, /La rama es el perfil que la persona elige al principio\. «Estudiante» es la que más empieza/);
  // valores visibles (no solo color ni tooltip) y mini barras en la tabla de ramas
  assert.match(h, /ap-mini__b ap-mini__b--ok/);
  assert.match(h, /zg-anillo__leyenda/);
  assert.ok(!/gradient\(/i.test(h) && !/[\p{Extended_Pictographic}\u{FE0F}]/u.test(h));
});

test('graficasHTML: sin respuestas muestra un solo estado vacío amable, no once gráficas vacías', () => {
  const h = A.graficasHTML(A.calcular([]));
  assert.match(h, /Todavía nadie responde la encuesta/);
  assert.equal((h.match(/class="ap-card/g) || []).length, 0);
  assert.equal((h.match(/Cómo leerlo/g) || []).length, 0);
});

test('graficasHTML: con respuestas a medias, lo que no se ha contestado queda en estado vacío y nada se rompe', () => {
  const parcial = [doc('p1', { completada: false, respuestas: { p1: 'Estudiante', origen: 'Buscador' } }), doc('p2', { completada: false, respuestas: { p1: 'Médico veterinario' } })];
  let h;
  assert.doesNotThrow(() => { h = A.graficasHTML(A.calcular(parcial)); });
  for (const t of TITULOS_11) assert.ok(h.includes('<h2>' + t + '</h2>'), 'falta ' + t);
  assert.ok((h.match(/Aún no hay respuestas/g) || []).length >= 5, 'las preguntas sin respuesta muestran su vacío');
  assert.match(h, /Aún no hay retos elegidos/);
});

test('fraseTop y fraseDeCada10: empates, una sola respuesta y menos de 1 de cada 10', () => {
  const d = (items) => ({ base: items.reduce((t, x) => t + x[1], 0), items: items.map(([valor, n], i, a) => ({ valor, n, pct: Math.round(n / a.reduce((t, x) => t + x[1], 0) * 100) })) });
  assert.match(A.fraseTop(d([['Precio', 3], ['Tiempo', 3]])), /empate entre «Precio» y «Tiempo»: 3 personas cada una/);
  assert.equal(A.fraseTop(d([['Precio', 1]])), 'Lo más común es «Precio»: 1 persona (100 %).');
  assert.match(A.fraseTop(d([['A', 5], ['B', 2]]), 'La mayoría llegó por'), /^La mayoría llegó por «A»: 5 personas de 7 \(71 %\)\. Le sigue «B» con 29 %\.$/);
  assert.match(A.fraseDeCada10(d([['A', 1], ['B', 30]]).items[0] ? { base: 31, items: [{ valor: 'A', n: 1, pct: 3 }] } : null), /menos de 1 es «A»|menos de 1 son «A»/);
  assert.equal(A.fraseTop({ base: 0, items: [] }), '');
});

test('apiladas: una barra por perfil con partes de color sólido y leyenda con cantidades y porcentajes', () => {
  const h = require(path.join(RAIZ, 'assets', 'js', 'admin-graficas.js')).apiladas({
    filas: [{ etiqueta: 'Estudiante', segmentos: [{ etiqueta: 'Trabajar en campo', valor: 2 }, { etiqueta: 'Complementar mi carrera', valor: 1 }] }, { etiqueta: 'Vacía', segmentos: [] }]
  });
  assert.match(h, /zg-ap__barra/);
  assert.match(h, /Trabajar en campo<\/span><strong>2<\/strong><span class="zg-ap__p">67 %/);
  assert.ok(!h.includes('Vacía'), 'las filas sin datos no se dibujan');
  assert.match(h, /<table>/);
});

/* ───────────────────────── Archivos ───────────────────────── */

test('admin-club.html carga la sección, el motor y los estilos, y llama a las dos rutas por apiFetch', () => {
  const html = leer('pages/admin-club.html');
  assert.match(html, /data-sec="encuesta"/);
  assert.match(html, /encuesta-motor\.js/);
  assert.match(html, /admin-encuesta\.js/);
  assert.match(html, /admin-encuesta\.css/);
  assert.match(html, /sec === 'encuesta'\) loadEncuesta\(\)/);
  assert.match(html, /ZOORIGEN_CLUB\.apiFetch\(ruta, op\)/);
  assert.ok(html.indexOf('encuesta-motor.js') < html.indexOf('admin-encuesta.js'), 'el motor va antes');
  const js = leer('assets/js/admin-encuesta.js');
  assert.match(js, /\/api\/admin\/encuesta\?limite=/);
  assert.match(js, /\/api\/admin\/chatbot\/sin-respuesta\?limite=/);
  assert.ok(!/\bdb\.collection|getDocs/.test(js), 'no lee Firestore directo');
});

test('sin emojis en el módulo ni en los estilos del admin de la encuesta', () => {
  for (const f of ['assets/js/admin-encuesta.js', 'assets/css/admin-encuesta.css']) {
    assert.ok(!/[\p{Extended_Pictographic}️]/u.test(leer(f)), 'emoji en ' + f);
  }
});

test('FIRESTORE-REGLAS-v6: encuestasProspectos y chatbotSinRespuesta, lectura solo admin y escritura denegada', () => {
  const t = leer('FIRESTORE-REGLAS-v6.txt');
  for (const col of ['encuestasProspectos/{docId}', 'chatbotSinRespuesta/{clave}']) {
    const i = t.indexOf('match /' + col + ' {');
    assert.ok(i > 0, 'falta ' + col);
    const bloque = t.slice(i, i + 200);
    assert.match(bloque, /allow read: if isAdmin\(\);/);
    assert.match(bloque, /allow write: if false;/);
  }
  assert.ok(t.indexOf('encuestasProspectos/{docId}') < t.indexOf('match /{document=**}'), 'antes de la regla comodín');
  assert.match(t, /NO publicar|NO estan\s+publicadas|NO PUBLICAR/i);
});
