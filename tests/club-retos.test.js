'use strict';

// Lógica de la zona de retos (sin pantalla) y contenido. Ejecutar: node --test tests/club-retos.test.js

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const raiz = path.join(__dirname, '..');
const R = require(path.join(raiz, 'assets', 'js', 'club-retos.js'));
const D = require(path.join(raiz, 'assets', 'js', 'club-retos-datos.js'));

function semilla(s) {
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MX = (iso) => Date.parse(iso);   // las fechas de prueba se dan en UTC

/* ───────── contenido ───────── */

test('cantidades de contenido: al menos 15 de cada tipo (hoy 67 quiz / 59 orden / 55 flashcards / 80 detective / 6x4 historia)', () => {
  assert.equal(D.quiz.length, 67);
  assert.equal(D.orden.length, 59);
  assert.equal(D.flashcards.length, 55);
  assert.equal(D.historia.length, 6);
  D.historia.forEach(m => assert.equal(m.casos.length, 4));
  assert.equal(D.detective.length, 80);
  for (const tipo of ['quiz', 'orden', 'flashcards', 'detective']) assert.ok(D[tipo].length >= 15, tipo + ' debe tener al menos 15');
});

test('el camino (quiz + detective + orden) supera ampliamente los 15 retos que abren el primer curso', () => {
  const camino = D.quiz.length + D.detective.length + D.orden.length;
  assert.ok(camino >= 60, 'camino: ' + camino);
  for (const m of ['quiz', 'detective', 'orden']) assert.ok(D[m].length >= 4, 'el mínimo de 4 por tipo debe poder cumplirse: ' + m);
});

test('revisarContenido() no encuentra problemas', () => {
  assert.deepEqual(R.revisarContenido(D), []);
});

test('revisarContenido() sí detecta contenido roto', () => {
  const malo = JSON.parse(JSON.stringify(D));
  malo.quiz[0].a = ['uno', 'dos'];
  malo.quiz[1].ok = 3;
  malo.quiz[2].q = malo.quiz[3].q;
  malo.orden[0].pasos = ['a', 'b', 'c'];
  malo.flashcards[0].back = '   ';
  malo.historia[0].casos.pop();
  malo.detective[0].zonas = [];
  malo.detective[0].pistas.pop();       // activa con 5 pistas
  malo.detective[1].riesgos[0] = 'Otro texto';   // riesgos que no coinciden con las pistas
  malo.quiz[4].why = 'Muy bien \u{1F600}';
  const p = R.revisarContenido(malo);
  ['3 opciones', 'no es 0, 1 o 2', 'pregunta repetida', '4 a 6 pasos', 'texto vacío', '4 casos', 'activa sin zonas válidas', 'no coinciden', 'emoji'].forEach(t => {
    assert.ok(p.some(x => x.includes(t)), 'debería avisar: ' + t + ' en ' + JSON.stringify(p));
  });
});

test('quiz e historia: 3 opciones distintas, una sola correcta, textos con contenido', () => {
  const casos = D.quiz.concat(...D.historia.map(m => m.casos));
  assert.equal(casos.length, 67 + 24);
  casos.forEach(c => {
    assert.equal(c.a.length, 3);
    assert.equal(new Set(c.a).size, 3);
    assert.ok(Number.isInteger(c.ok) && c.ok >= 0 && c.ok <= 2);
    c.a.forEach(t => assert.ok(t.trim().length > 3));
    assert.ok((c.why || '').trim().length > 20);
    // una sola marcada como correcta tras barajar
    const ops = R.barajarOpciones(c, semilla(3));
    assert.equal(ops.filter(o => o.ok).length, 1);
    assert.equal(ops.find(o => o.ok).t, c.a[c.ok]);
  });
});

test('la respuesta correcta no cae siempre en la misma posición', () => {
  const cuenta = [0, 0, 0];
  D.quiz.forEach(q => cuenta[q.ok]++);
  cuenta.forEach(n => assert.ok(n >= 4, 'posiciones: ' + cuenta));
  const h = [0, 0, 0];
  D.historia.forEach(m => m.casos.forEach(c => h[c.ok]++));
  h.forEach(n => assert.ok(n >= 3, 'posiciones historia: ' + h));
});

test('sin duplicados: preguntas, conceptos, secuencias, escenas e ids', () => {
  const unico = (lista) => assert.equal(new Set(lista).size, lista.length);
  unico(D.quiz.map(q => q.q));
  unico(D.orden.map(o => o.titulo));
  unico(D.flashcards.map(f => f.front.toLowerCase()));
  unico(D.historia.map(m => m.nombre));
  unico([].concat(...D.historia.map(m => m.casos.map(c => c.escena))));
  unico(D.detective.map(e => e.id));
  unico([].concat(D.quiz, D.orden, D.flashcards, D.detective).map(x => x.id));
});

test('orden: de 4 a 6 pasos, sin repetir dentro de la secuencia', () => {
  D.orden.forEach(o => {
    assert.ok(o.pasos.length >= 4 && o.pasos.length <= 6, o.titulo);
    assert.equal(new Set(o.pasos).size, o.pasos.length, o.titulo);
    o.pasos.forEach(p => assert.ok(p.trim().length > 3));
  });
});

test('historia: mundos con nombre, descripción, fondo y color', () => {
  D.historia.forEach((m, i) => {
    assert.equal(m.id, i + 1);
    assert.ok(m.nombre && m.descripcion && m.intro);
    assert.match(m.imagen, /^assets\/img\/retos\/historia-[a-z-]+\.jpg$/);
    assert.match(m.color, /^#[0-9A-Fa-f]{6}$/);
  });
  assert.deepEqual(D.historia.map(m => m.imagen.split('/').pop()),
    ['historia-selva.jpg', 'historia-humedal.jpg', 'historia-arrecife.jpg', 'historia-desierto.jpg', 'historia-bosque-niebla.jpg', 'historia-centro-rescate.jpg']);
});

test('detective: 80 escenas jugables, todas con imagen webp definida Y respaldo de texto (escena y 6 pistas), 3 riesgos; una escena inactiva no se juega ni cuenta', () => {
  D.detective.forEach(e => {
    assert.match(e.imagen, /^assets\/img\/retos\/detective-[a-z0-9-]+\.webp$/);
    assert.equal(e.riesgos.length, 3);
    e.riesgos.forEach(r => assert.ok(r.trim().length > 10));
    assert.ok(fs.existsSync(path.join(raiz, e.imagen)), 'imagen existente: ' + e.id);
    assert.ok(Array.isArray(e.zonas));
    assert.equal(typeof e.activo, 'boolean');
    // Sin imagen (o con ella) la escena se resuelve con su descripción y sus pistas: no hay hueco ni error
    assert.equal(R.escenaConPistas(e), true, 'respaldo de texto: ' + e.id);
    assert.equal(R.escenaActiva(e), e.activo, 'jugable solo si está activa: ' + e.id);
    assert.ok(e.escena.length > 60 && e.consigna.length > 20);
    assert.equal(e.pistas.length, 6);
    assert.equal(e.pistas.filter(x => x.ok).length, 3);
    assert.deepEqual(e.pistas.filter(x => x.ok).map(x => x.why), e.riesgos);
  });
  assert.equal(R.escenasActivas(D.detective).length, 80);
  assert.equal(R.escenasPendientes(D.detective), 0);
  // Las huellas de mapache (35) se regeneraron y se activaron; siguen AL FINAL de la lista, así que las posiciones guardadas de las demás no se movieron.
  assert.equal(D.detective[D.detective.length - 1].id, 'campo-nuevo-huellas-mapache');
  assert.equal(D.detective.every(e => e.activo === true), true);
  // los 17 nombres de imagen adicionales siguen assets/img/retos/detective-<tema>-<n>.webp
  assert.equal(D.detective.filter(e => /-\d\.webp$/.test(e.imagen)).length, 17);
});

test('detective con pistas: el puntaje es cuántas de las 3 correctas se marcaron; se baraja sin perder pistas', () => {
  const e = D.detective[13];
  const buenas = e.pistas.map((x, i) => (x.ok ? i : -1)).filter(i => i >= 0);
  assert.equal(R.puntajePistas(e.pistas, new Set(buenas)), 3);
  assert.equal(R.puntajePistas(e.pistas, new Set([buenas[0], buenas[1], e.pistas.findIndex(x => !x.ok)])), 2);
  assert.equal(R.puntajePistas(e.pistas, []), 0);
  assert.equal(R.apruebaCamino(R.puntajePistas(e.pistas, new Set([buenas[0], buenas[1]])), 3), true);
  const b = R.pistasBarajadas(e);
  assert.deepEqual(b.map(x => x.t).sort(), e.pistas.map(x => x.t).sort());
});

test('ningún texto del contenido ni de la pantalla lleva emoji', () => {
  [path.join('assets', 'js', 'club-retos-datos.js'), path.join('assets', 'js', 'club-retos.js'),
    path.join('assets', 'css', 'club-retos.css'), path.join('pages', 'club-retos.html')].forEach(f => {
    const t = fs.readFileSync(path.join(raiz, f), 'utf8');
    // El ícono de menú del encabezado (trigrama) es el que usan todas las páginas del club.
    const sin = t.replace(/☰/g, '');
    assert.equal(R.tieneEmoji(sin), false, f);
  });
  assert.equal(R.tieneEmoji('hola'), false);
  assert.equal(R.tieneEmoji('hola \u{1F43E}'), true);
});

/* ───────── detective ───────── */

const escenaPrueba = () => ({ id: 'x', titulo: 'x', imagen: 'assets/img/retos/detective-x.webp', activo: true,
  zonas: [{ x: 0.2, y: 0.3, r: 0.06 }, { x: 0.5, y: 0.6, r: 0.06 }, { x: 0.8, y: 0.2, r: 0.06 }], riesgos: ['a', 'b', 'c'] });

test('escenaActiva(): exige activo, imagen, 3 riesgos y 3 zonas válidas', () => {
  assert.equal(R.escenaActiva(escenaPrueba()), true);
  const sinActivo = escenaPrueba(); sinActivo.activo = false;
  assert.equal(R.escenaActiva(sinActivo), false);
  const sinImagen = escenaPrueba(); sinImagen.imagen = '';
  assert.equal(R.escenaActiva(sinImagen), false);
  const dosZonas = escenaPrueba(); dosZonas.zonas.pop();
  assert.equal(R.escenaActiva(dosZonas), false);
  const zonaMala = escenaPrueba(); zonaMala.zonas[1] = { x: 1.4, y: 0.5, r: 0.06 };
  assert.equal(R.escenaActiva(zonaMala), false);
  const radioMalo = escenaPrueba(); radioMalo.zonas[0].r = 0;
  assert.equal(R.escenaActiva(radioMalo), false);
  const dosRiesgos = escenaPrueba(); dosRiesgos.riesgos = ['a', 'b'];
  assert.equal(R.escenaActiva(dosRiesgos), false);
  assert.equal(R.escenaActiva(null), false);
  assert.equal(R.escenasPendientes([escenaPrueba(), sinActivo, dosZonas]), 2);
});

test('tocaZona(): radio en fracción del ancho, con la proporción de la imagen', () => {
  const z = { x: 0.5, y: 0.5, r: 0.1 };
  assert.equal(R.tocaZona(z, 0.5, 0.5, 16 / 9), true);
  assert.equal(R.tocaZona(z, 0.59, 0.5, 16 / 9), true);
  assert.equal(R.tocaZona(z, 0.62, 0.5, 16 / 9), false);
  // En vertical, 0.1 del ancho equivale a 0.1 * 16/9 del alto: el círculo es redondo en pantalla.
  assert.equal(R.tocaZona(z, 0.5, 0.5 + 0.1 * 16 / 9 - 0.01, 16 / 9), true);
  assert.equal(R.tocaZona(z, 0.5, 0.5 + 0.1 * 16 / 9 + 0.02, 16 / 9), false);
  assert.equal(R.tocaZona(null, 0.5, 0.5, 1), false);
});

test('buscarZona(): elige la más cercana y no repite las ya encontradas', () => {
  const zonas = [{ x: 0.5, y: 0.5, r: 0.15 }, { x: 0.58, y: 0.5, r: 0.15 }];
  assert.equal(R.buscarZona(zonas, new Set(), 0.57, 0.5, 1), 1);
  assert.equal(R.buscarZona(zonas, new Set(), 0.51, 0.5, 1), 0);
  assert.equal(R.buscarZona(zonas, new Set([1]), 0.57, 0.5, 1), 0);
  assert.equal(R.buscarZona(zonas, new Set([0, 1]), 0.5, 0.5, 1), -1);
  assert.equal(R.buscarZona(zonas, new Set(), 0.05, 0.05, 1), -1);
});

test('puntajeDetective(): max(1, 3 - floor(fallos/3))', () => {
  assert.equal(R.puntajeDetective(0), 3);
  assert.equal(R.puntajeDetective(2), 3);
  assert.equal(R.puntajeDetective(3), 2);
  assert.equal(R.puntajeDetective(5), 2);
  assert.equal(R.puntajeDetective(6), 1);
  assert.equal(R.puntajeDetective(9), 1);
  assert.equal(R.puntajeDetective(40), 1);
  assert.equal(R.puntajeDetective(-4), 3);
  assert.equal(R.puntajeDetective(NaN), 3);
});

test('el detective se envía si el puntaje llega al 60 % (2 de 3 o más)', () => {
  assert.equal(R.apruebaCamino(R.puntajeDetective(0), 3), true);
  assert.equal(R.apruebaCamino(R.puntajeDetective(4), 3), true);
  assert.equal(R.apruebaCamino(R.puntajeDetective(6), 3), false);
  assert.equal(R.apruebaCamino(3, 5), true);    // 60 % exacto
  assert.equal(R.apruebaCamino(2, 5), false);
  assert.equal(R.apruebaCamino(1, 0), false);
});

/* ───────── orden ───────── */

test('barajarOrden(): nunca entrega la secuencia ya resuelta', () => {
  D.orden.forEach((o, i) => {
    for (let s = 1; s <= 8; s++) {
      const m = R.barajarOrden(o.pasos, semilla(i * 100 + s));
      assert.equal(R.ordenCorrecto(m, o.pasos), false, o.titulo);
      assert.deepEqual(m.slice().sort(), o.pasos.slice().sort());
    }
  });
  // con un azar que siempre devuelve lo mismo, igual se desordena
  assert.equal(R.ordenCorrecto(R.barajarOrden(['a', 'b', 'c', 'd'], () => 0.999), ['a', 'b', 'c', 'd']), false);
});

test('moverPaso(): sube y baja un lugar, sin salirse de la lista ni cambiar la original', () => {
  const o = ['a', 'b', 'c', 'd'];
  assert.deepEqual(R.moverPaso(o, 1, -1), ['b', 'a', 'c', 'd']);
  assert.deepEqual(R.moverPaso(o, 1, 1), ['a', 'c', 'b', 'd']);
  assert.deepEqual(R.moverPaso(o, 0, -1), o);
  assert.deepEqual(R.moverPaso(o, 3, 1), o);
  assert.deepEqual(R.moverPaso(o, 9, 1), o);
  assert.deepEqual(o, ['a', 'b', 'c', 'd']);
});

test('aciertosOrden() / ordenCorrecto(): cuenta pasos en su lugar', () => {
  const p = ['a', 'b', 'c', 'd'];
  assert.equal(R.aciertosOrden(['a', 'b', 'c', 'd'], p), 4);
  assert.equal(R.aciertosOrden(['b', 'a', 'c', 'd'], p), 2);
  assert.equal(R.aciertosOrden(['d', 'c', 'b', 'a'], p), 0);
  assert.equal(R.ordenCorrecto(['a', 'b', 'c', 'd'], p), true);
  assert.equal(R.ordenCorrecto(['a', 'b', 'c'], p), false);
  assert.equal(R.ordenCorrecto(null, p), false);
});

/* ───────── historia ───────── */

test('estrellasHistoria(): 4 aciertos 3 estrellas, 3 aciertos 2, 2 aciertos 1', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(R.estrellasHistoria), [0, 0, 1, 2, 3]);
  assert.equal(R.estrellasHistoria(undefined), 0);
});

test('historia: el mundo siguiente se abre con 3 o más aciertos', () => {
  assert.equal(R.historiaAbierta(1, {}), true);
  assert.equal(R.historiaAbierta(2, {}), false);
  assert.equal(R.historiaAbierta(2, { 1: 2 }), false);
  assert.equal(R.historiaAbierta(2, { 1: 3 }), true);
  assert.equal(R.historiaAbierta(3, { 1: 4, 2: 2 }), false);
  assert.equal(R.historiaAbierta(6, { 5: 4 }), true);
});

test('historiaGuardar(): solo mejora el resultado y no toca el objeto original', () => {
  const a = {};
  const b = R.historiaGuardar(a, 1, 3);
  assert.deepEqual(a, {});
  assert.deepEqual(b, { 1: 3 });
  assert.deepEqual(R.historiaGuardar(b, 1, 2), { 1: 3 });
  assert.deepEqual(R.historiaGuardar(b, 1, 4), { 1: 4 });
  assert.deepEqual(R.historiaGuardar(b, 2, 0), { 1: 3, 2: 0 });
});

test('leerHistoria(): tolera datos dañados en el almacenamiento', () => {
  assert.deepEqual(R.leerHistoria('{"1":4,"2":3}'), { 1: 4, 2: 3 });
  assert.deepEqual(R.leerHistoria('esto no es json'), {});
  assert.deepEqual(R.leerHistoria(''), {});
  assert.deepEqual(R.leerHistoria('null'), {});
  assert.deepEqual(R.leerHistoria('{"1":99,"x":3,"2":-5}'), { 1: 4, 2: 0 });
  assert.equal(R.HISTORIA_KEY, 'zoorigen:historia:v1');
});

/* ───────── reto del día ───────── */

test('retoDelDia(): rota entre los 4 tipos con floor((ahora - 6 h) / 1 día) % 4', () => {
  assert.deepEqual(R.IDS, ['quiz', 'detective', 'orden', 'flashcards']);
  const base = (dia) => dia * 86400000 + 6 * 3600000 + 1000;   // un segundo después de medianoche en México
  const dia0 = Math.floor((Date.now() - 6 * 3600000) / 86400000);
  const secuencia = [0, 1, 2, 3, 4, 5].map(k => R.retoDelDia(base(dia0 + k)));
  const esperado = [0, 1, 2, 3, 4, 5].map(k => R.IDS[(dia0 + k) % 4]);
  assert.deepEqual(secuencia, esperado);
  assert.equal(new Set(secuencia.slice(0, 4)).size, 4);
});

test('retoDelDia(): cambia a las 6:00 UTC (medianoche de México), no a las 0:00 UTC', () => {
  const antes = R.retoDelDia(Date.UTC(2026, 9, 10, 5, 59, 59));
  const despues = R.retoDelDia(Date.UTC(2026, 9, 10, 6, 0, 0));
  const mismoDia = R.retoDelDia(Date.UTC(2026, 9, 10, 0, 0, 0));
  assert.equal(antes, mismoDia);
  assert.notEqual(antes, despues);
  const dia = Math.floor((Date.UTC(2026, 9, 10, 6) - 6 * 3600000) / 86400000);
  assert.equal(despues, R.IDS[dia % 4]);
});

test('retoDelDia(): no propone un reto que hoy no se puede jugar', () => {
  const sinDetective = ['quiz', 'orden', 'flashcards'];
  for (let k = 0; k < 12; k++) {
    const id = R.retoDelDia(Date.UTC(2026, 9, 1 + k, 12), sinDetective);
    assert.ok(sinDetective.includes(id));
  }
  assert.equal(R.retoDelDia(NaN) !== undefined, true);
});

/* ───────── camino y nivel ───────── */

test('estadoNodo(): ningún reto del camino está bloqueado; solo hecho, recomendado o pendiente', () => {
  // Lista de retos superados, en cualquier orden (el miembro elige cuál resolver)
  assert.deepEqual([0, 1, 2, 3, 4].map(i => R.estadoNodo(i, [3, 0], 5)), ['hecho', 'recomendado', 'pendiente', 'hecho', 'pendiente']);
  assert.deepEqual([0, 1, 2].map(i => R.estadoNodo(i, [], 3)), ['recomendado', 'pendiente', 'pendiente']);
  assert.deepEqual([0, 1].map(i => R.estadoNodo(i, [0, 1], 2)), ['hecho', 'hecho']);
  // Compatibilidad: un número son los primeros N
  assert.deepEqual([0, 1, 2, 3].map(i => R.estadoNodo(i, 2)), ['hecho', 'hecho', 'recomendado', 'pendiente']);
  assert.equal(R.estadoNodo(0, 0), 'recomendado');
  assert.equal(R.estadoNodo(0, undefined), 'recomendado');
  for (let n = 0; n < 6; n++) assert.notEqual(R.estadoNodo(n, [], 6), 'bloqueado');
  assert.equal(R.primerPendiente([0, 1, 3], 5), 2);
  assert.equal(R.primerPendiente([0, 1], 2), -1);
});

test('normalizarEstado(): la lista de retos superados se limpia y, sin lista, son los primeros N', () => {
  const con = R.normalizarEstado({ camino: { quiz: 2 }, caminoHechos: { quiz: [7, 7, 1, -3, 'x', 2.5], detective: 'no', orden: [4] } });
  assert.deepEqual(con.caminoHechos.quiz, [1, 7]);
  assert.deepEqual(con.caminoHechos.detective, []);
  assert.deepEqual(con.caminoHechos.orden, [4]);
  const viejo = R.normalizarEstado({ camino: { quiz: 3, detective: 0, orden: 1 } });
  assert.deepEqual(viejo.caminoHechos, { quiz: [0, 1, 2], detective: [], orden: [0] });
  assert.deepEqual(R.normalizarEstado(null).caminoHechos, { quiz: [], detective: [], orden: [] });
});

test('el camino ya no tiene candados ni textos de "bloqueado" en el sitio', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const js = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'club-retos.js'), 'utf8');
  const ini = js.indexOf('function verCamino(modo)');
  const fin = js.indexOf('/* ── Quiz ── */');
  assert.ok(ini > 0 && fin > ini, 'no se encontró verCamino');
  const bloque = js.slice(ini, fin);
  for (const mal of ["ic('lock'", 'Bloqueado', 'Se revela al desbloquearlo', 'Reto bloqueado', 'desbloquear el siguiente', "'bloqueado'"]) {
    assert.equal(bloque.includes(mal), false, 'verCamino todavía dice: ' + mal);
  }
  assert.ok(bloque.includes('Recomendado') && bloque.includes('Por resolver') && bloque.includes('Resuelto'));
  assert.ok(bloque.includes('lista.indexOf(i) >= 0'), 'repasar solo lo ya superado, abrir todo lo demás');
  // El estilo ya no define el estado bloqueado
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'css', 'club-retos.css'), 'utf8');
  assert.equal(/is-bloqueado|etiqueta--bloqueado|is-siguiente/.test(css), false);
});

test('resumenNivel(): usa el nivel del servidor y calcula barra y XP faltante', () => {
  const r = R.resumenNivel({ nivel: { id: 2, nombre: 'Técnico', desde: 300, hasta: 1200, faltan: 450 }, xp: 750 });
  assert.equal(r.id, 2);
  assert.equal(r.nombre, 'Técnico');
  assert.equal(r.pct, 50);
  assert.equal(r.faltan, 450);
  assert.equal(r.siguiente, 'Profesional');
  assert.equal(r.maximo, false);
});

test('resumenNivel(): sin datos del servidor es Aprendiz con 0 XP; Maestro es el nivel máximo', () => {
  const v = R.resumenNivel(null);
  assert.equal(v.id, 1); assert.equal(v.nombre, 'Aprendiz'); assert.equal(v.xp, 0); assert.equal(v.pct, 0); assert.equal(v.faltan, 300);
  const m = R.resumenNivel({ nivel: { id: 5, nombre: 'Maestro', desde: 4500, hasta: 99999 }, xp: 5200 });
  assert.equal(m.maximo, true); assert.equal(m.pct, 100); assert.equal(m.faltan, 0); assert.equal(m.siguiente, null);
  // xp como objeto { total } (la forma de /api/premios) y nivel calculado desde el XP
  const o = R.resumenNivel({ xp: { total: 1300, logros: 800, retos: 500 } });
  assert.equal(o.id, 3); assert.equal(o.xp, 1300);
  assert.equal(R.nivelPorXp(299).id, 1); assert.equal(R.nivelPorXp(300).id, 2); assert.equal(R.nivelPorXp(4500).id, 5);
});

test('normalizarEstado(): nunca deja pasar datos raros de la respuesta', () => {
  const e = R.normalizarEstado({ membresia: true, superados: '7', camino: { quiz: 3, detective: -2, orden: 'x' }, retosHoy: ['quiz', 'hackeo', 'orden'], totales: { quiz: 22 } });
  assert.equal(e.membresia, true);
  assert.equal(e.superados, 7);
  assert.deepEqual(e.camino, { quiz: 3, detective: 0, orden: 0 });
  assert.deepEqual(e.retosHoy, ['quiz', 'orden']);
  assert.equal(e.totales.quiz, 22);
  const vacio = R.normalizarEstado(null);
  assert.equal(vacio.membresia, false);
  assert.deepEqual(vacio.camino, { quiz: 0, detective: 0, orden: 0 });
});

/* ───────── flashcards ───────── */

test('tarjetasFlash(): 8 tarjetas distintas y la primera no repite la última vista', () => {
  for (let s = 1; s <= 30; s++) {
    const c = R.tarjetasFlash(D.flashcards, 8, semilla(s), D.flashcards[0].front);
    assert.equal(c.length, 8);
    assert.equal(new Set(c.map(x => x.front)).size, 8);
    assert.notEqual(c[0].front, D.flashcards[0].front);
  }
});

test('barajar(): conserva los elementos y no cambia la lista original', () => {
  const l = [1, 2, 3, 4, 5, 6];
  const b = R.barajar(l, semilla(7));
  assert.deepEqual(b.slice().sort(), l);
  assert.deepEqual(l, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(R.barajar(null), []);
});

/* ───────── página ───────── */

test('la página usa el menú del club, los archivos de retos y cache-buster', () => {
  const h = fs.readFileSync(path.join(raiz, 'pages', 'club-retos.html'), 'utf8');
  assert.match(h, /renderSidebar\('retos', session\)/);
  assert.match(h, /club-retos\.css\?v=\d+/);
  assert.match(h, /club-retos-datos\.js\?v=\d+/);
  assert.match(h, /club-retos\.js\?v=\d+/);
  assert.match(h, /admin-iconos\.js\?v=\d+/);
  assert.ok(h.indexOf('club-retos-datos.js') < h.indexOf('club-retos.js?v'), 'los datos se cargan antes que la lógica');
});


test('detective visual: los 80 retos tienen tres zonas y cada centro encuentra su hallazgo', () => {
  for (const e of D.detective) {
    assert.equal(R.escenaConZonas(e), true, e.id);
    assert.equal(e.zonas.length, 3);
    for (const aspecto of [1600 / 1067, 360 / 240]) {
      const encontradas = new Set();
      e.zonas.forEach((z, i) => {
        assert.equal(R.buscarZona(e.zonas, encontradas, z.x, z.y, aspecto), i, e.id + ' hallazgo ' + i);
        encontradas.add(i);
      });
      assert.equal(encontradas.size, 3);
    }
  }
});

test('zonas rectangulares: límites válidos, aciertos dentro y fallos fuera sin depender del tamaño', () => {
  const z = { x: .5, y: .5, w: .2, h: .1 };
  assert.equal(R.limpiarZonas([z]).length, 1);
  assert.equal(R.limpiarZonas([{ ...z, w: 0 }, { ...z, h: NaN }, { ...z, x: .95 }, { ...z, y: .02 }]).length, 0);
  for (const aspecto of [1, 1.5, 2]) {
    assert.equal(R.tocaZona(z, .6, .55, aspecto), true);
    assert.equal(R.tocaZona(z, .61, .5, aspecto), false);
    assert.equal(R.tocaZona(z, .5, .56, aspecto), false);
  }
});

/* ───────── tercera tanda: quiz 48 a 67 y ordena 40 a 59 ───────── */

test('tercera tanda: ids consecutivos (q48 a q67, o40 a o59) y sin tocar los anteriores', () => {
  assert.deepEqual(D.quiz.slice(47).map(q => q.id), Array.from({ length: 20 }, (_, i) => 'q' + (48 + i)));
  assert.deepEqual(D.orden.slice(39).map(o => o.id), Array.from({ length: 20 }, (_, i) => 'o' + (40 + i)));
  // las posiciones guardadas del avance no cambian: los 47 y 39 originales siguen en su lugar
  assert.equal(D.quiz[0].id, 'q01');
  assert.equal(D.quiz[46].id, 'q47');
  assert.equal(D.orden[38].id, 'o39');
});

test('tercera tanda: la respuesta correcta se reparte pareja (0, 1 y 2) y las preguntas son completas', () => {
  const nuevas = D.quiz.slice(47);
  const cuenta = [0, 0, 0];
  nuevas.forEach(q => { cuenta[q.ok]++; assert.equal(q.a.length, 3); assert.ok(q.q.trim().endsWith('?') || q.q.trim().endsWith('…')); });
  cuenta.forEach(n => assert.ok(n >= 6 && n <= 8, 'posiciones de las 20 nuevas: ' + cuenta));
  const todas = [0, 0, 0];
  D.quiz.forEach(q => todas[q.ok]++);
  assert.ok(Math.max(...todas) - Math.min(...todas) <= 3, 'las 67 quedan parejas: ' + todas);
  assert.ok(new Set(nuevas.map(q => q.tema)).size >= 10, 'temas variados');
});

test('tercera tanda: ordena con 4 a 6 pasos cortos, y nada de dosis ni tratamientos en el contenido nuevo', () => {
  const nuevas = D.orden.slice(39);
  nuevas.forEach(o => {
    assert.ok(o.pasos.length >= 4 && o.pasos.length <= 6, o.id);
    o.pasos.forEach(p => assert.ok(p.length <= 100, o.id + ' paso largo: ' + p));
  });
  assert.ok(new Set(nuevas.map(o => o.tema)).size >= 10, 'temas variados');
  const texto = JSON.stringify([D.quiz.slice(47), nuevas]);
  assert.equal(/\b\d+\s?(mg|ml|mL|ug|µg|kg\/|UI)\b|dosis|inyect|suero|antiveneno|tratamiento/i.test(texto), false, 'sin dosis ni indicaciones clínicas');
  assert.equal(R.revisarContenido(D).length, 0);
});

/* ───────────── Imágenes nuevas: modo Historia (6 mundos) y Detective (20 escenas en estilo de ilustración) ───────────── */

function medidasJpg(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) { i += 1; continue; }
    const marca = buf[i + 1];
    if (marca >= 0xC0 && marca <= 0xCF && marca !== 0xC4 && marca !== 0xC8 && marca !== 0xCC) return { alto: buf.readUInt16BE(i + 5), ancho: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

test('historia: cada uno de los 6 mundos tiene su imagen JPG de 1600 x 686 y menos de 250 KB, en el orden de los mundos', () => {
  const esperado = ['selva', 'humedal', 'arrecife', 'desierto', 'bosque-niebla', 'centro-rescate'];
  D.historia.forEach((m, i) => {
    assert.equal(m.imagen, `assets/img/retos/historia-${esperado[i]}.jpg`, 'mundo ' + (i + 1));
    const archivo = path.join(raiz, m.imagen);
    assert.ok(fs.existsSync(archivo), m.imagen);
    const buf = fs.readFileSync(archivo);
    assert.deepEqual([buf[0], buf[1]], [0xFF, 0xD8], 'es un JPG');
    assert.ok(buf.length < 250 * 1024, `${m.imagen} pesa ${Math.round(buf.length / 1024)} KB`);
    assert.deepEqual(medidasJpg(buf), { ancho: 1600, alto: 686 }, m.imagen);
  });
  // El avance guardado por mundo no depende de la imagen: los ids 1 a 6 y los 4 casos de cada mundo no cambian
  assert.deepEqual(D.historia.map(m => m.id), [1, 2, 3, 4, 5, 6]);
});

test('detective nuevo: las 20 escenas 31 a 50 tienen su webp, sus 3 zonas y quedan al final del arreglo (las posiciones guardadas no se mueven)', () => {
  const nuevas = D.detective.slice(60);
  assert.equal(nuevas.length, 20);
  const numeros = nuevas.map(e => Number(e.imagen.match(/detective-nuevo-(\d\d)-/)[1]));
  assert.deepEqual(numeros, [31, 32, 33, 34, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 35]);
  nuevas.forEach(e => {
    const buf = fs.readFileSync(path.join(raiz, e.imagen));
    assert.equal(buf.toString('ascii', 0, 4) + buf.toString('ascii', 8, 12), 'RIFFWEBP', e.id);
    assert.ok(buf.length < 400 * 1024, `${e.imagen} pesa ${Math.round(buf.length / 1024)} KB`);
    assert.equal(e.zonas.length, 3, e.id);
    assert.equal(e.pistas.filter(p => p.ok).length, 3, e.id);
    assert.ok(!('ubicacionEnPrompt' in e), 'la guía de ubicación no forma parte del esquema final');
  });
  // Las 60 anteriores conservan su lugar
  assert.equal(D.detective[0].id, 'serpiente-rescate');
  assert.equal(D.detective[59].id, 'campo-nuevo-resguardo-equipo');
});

test('Retos: ninguna tarjeta sugiere un orden forzoso (todos los retos del camino están abiertos); solo el modo Historia avanza por mundos', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'club-retos.js'), 'utf8');
  assert.doesNotMatch(js, /Cada reto se abre al superar el anterior/);
  const tarjetas = js.slice(js.indexOf('const TIPOS = ['), js.indexOf('const IDS = TIPOS'));
  assert.match(tarjetas, /Elige el reto que quieras, en el orden que prefieras\./);
  assert.doesNotMatch(tarjetas, /se abre al superar|desbloque|el anterior/i);
  assert.match(js, /Elige el reto que quieras, en el orden que prefieras\. Cada uno da XP la primera vez/);
  assert.match(js, /con 3 aciertos de 4 abres el siguiente mundo/, 'la Historia sí avanza por mundos');
  const html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'club-retos.html'), 'utf8');
  assert.match(html, /club-retos\.js\?v=20261126-textos/);
});
