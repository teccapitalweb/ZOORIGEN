'use strict';

// Encuesta de la portada: motor puro. Ejecutar: node --test tests/encuesta-motor.test.js

const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require(path.join(__dirname, '..', 'assets', 'js', 'encuesta-motor.js'));

const RAIZ = path.join(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const claves = r => M.obtenerPasos(r).map(p => p.clave);

// Recorre un camino completo contestando siempre la opción `idx` de cada pregunta (o la indicada).
function recorrer(elige = {}) {
  let r = {};
  for (let guardia = 0; guardia < 20; guardia++) {
    const paso = M.obtenerPasos(r).find(p => r[p.clave] === undefined);
    if (!paso) break;
    const valor = elige[paso.clave] || paso.opts[0];
    const nuevo = M.aplicarRespuesta(r, paso.clave, valor);
    assert.equal(nuevo[paso.clave], valor, 'no se aceptó ' + paso.clave + '=' + valor);
    r = nuevo;
  }
  return r;
}

/* ───────────────────────── Preguntas y ramas exactas ───────────────────────── */

test('preguntas comunes: texto y opciones exactos de la especificación', () => {
  const c = M.COMUNES;
  assert.equal(c.meta.q, '¿Qué quieres lograr este año?');
  assert.deepEqual(c.meta.opts, ['Aprender desde cero sobre fauna silvestre', 'Especializarme en mi profesión', 'Cumplir trámites y normatividad', 'Certificarme y destacar en mi currículum']);
  assert.equal(c.p1.q, '¿Tú eres...?');
  assert.deepEqual(c.p1.opts, ['Estudiante', 'Médico veterinario', 'Personal de UMA o zoológico', 'Consultor ambiental', 'Amante de la fauna']);
  assert.equal(c.origen.q, '¿Cómo nos conociste?');
  assert.deepEqual(c.origen.opts, ['Redes sociales', 'Recomendación', 'Buscador', 'Otro']);
  assert.equal(c.grupo.q, '¿Qué fauna te interesa más?');
  assert.deepEqual(c.grupo.opts, ['Mamíferos y felinos', 'Aves y rapaces', 'Reptiles y fauna ponzoñosa', 'Insectos y polinizadores', 'Vida marina', 'Fauna en general']);
  assert.equal(c.tamano.q, '¿Cuántas personas trabajan contigo?');
  assert.deepEqual(c.tamano.opts, ['Solo yo', '2 a 10', '11 a 50', 'Más de 50']);
  assert.equal(c.experiencia.q, '¿Ya tomaste cursos en línea?');
  assert.deepEqual(c.experiencia.opts, ['Sí, me gustan', 'Prefiero presencial', 'Es mi primera vez']);
  assert.equal(c.urgencia.q, '¿Cuándo te gustaría empezar?');
  assert.deepEqual(c.urgencia.opts, ['Lo antes posible', 'En el próximo mes', 'Solo estoy explorando']);
  assert.equal(c.freno.q, '¿Qué te detiene hoy?');
  assert.deepEqual(c.freno.opts, ['Precio', 'Tiempo', 'No estoy seguro', 'Nada, listo']);
});

test('retos (p2) y profundización (p2b) exactos por perfil: 5 retos y 15 profundizaciones', () => {
  const esperado = {
    'Estudiante': ['¿Tu meta es?', { 'Complementar mi carrera': ['¿Qué área?', ['Medicina zoológica', 'Manejo y bienestar', 'Conservación']], 'Trabajar en campo': ['¿Qué te falta?', ['Técnicas de campo', 'Manejo seguro', 'Legislación y permisos']], 'Elegir mi especialidad': ['¿Qué te llama más?', ['Clínica de fauna', 'Investigación', 'Gestión ambiental']] }],
    'Médico veterinario': ['¿Tu reto hoy?', { 'Atender fauna silvestre': ['¿Con qué grupo?', ['Mamíferos', 'Aves', 'Reptiles y exóticos']], 'Normatividad': ['¿Qué necesitas?', ['Registro y UMA', 'Traslados y CITES', 'Bitácoras de ejemplares']], 'Bienestar en cautiverio': ['¿Dónde?', ['Zoológico', 'Centro de rescate', 'Clínica propia']] }],
    'Personal de UMA o zoológico': ['¿Qué buscas?', { 'Cumplir normas': ['¿Cuál?', ['Informe anual', 'Registro de ejemplares', 'Permisos de traslado']], 'Mejorar el manejo': ['¿En qué?', ['Bioseguridad y cuarentena', 'Enriquecimiento', 'Manejo seguro']], 'Capacitar a mi equipo': ['¿Qué nivel?', ['Principiante', 'Intermedio', 'Avanzado']] }],
    'Consultor ambiental': ['¿Tu enfoque?', { 'Rescate y reubicación': ['¿Dónde?', ['En obra', 'En campo abierto', 'En centro de acopio']], 'Impacto ambiental': ['¿En qué etapa?', ['Diagnóstico', 'Mitigación', 'Seguimiento']], 'Monitoreo': ['¿Qué método?', ['Fototrampeo', 'Aves bioindicadoras', 'Vectores y zoonosis']] }],
    'Amante de la fauna': ['¿Qué te mueve?', { 'Conocer animales': ['¿Cuáles?', ['Felinos', 'Aves', 'Reptiles', 'Insectos']], 'Ayudar a la fauna': ['¿Cómo?', ['Rescate', 'Conservación', 'Legislación básica']], 'Trabajar con fauna algún día': ['¿Por dónde empezar?', ['Campo', 'Clínica', 'Normatividad']] }]
  };
  assert.deepEqual(Object.keys(M.RETOS), Object.keys(esperado));
  let n = 0;
  for (const [perfil, [q, ramas]] of Object.entries(esperado)) {
    assert.equal(M.RETOS[perfil].q, q, perfil);
    assert.deepEqual(M.RETOS[perfil].opts, Object.keys(ramas), perfil);
    for (const [reto, [q2, opts]] of Object.entries(ramas)) {
      const def = M.PROFUNDIZACION[perfil][reto];
      assert.equal(def.q, q2, perfil + ' / ' + reto);
      assert.deepEqual(def.opts, opts, perfil + ' / ' + reto);
      n++;
    }
  }
  assert.equal(n, 15);
});

test('ninguna opción pasa de 80 caracteres (límite del servidor) ni usa emojis', () => {
  const todas = [];
  Object.values(M.COMUNES).forEach(d => todas.push(...d.opts));
  Object.values(M.RETOS).forEach(d => todas.push(...d.opts));
  Object.values(M.PROFUNDIZACION).forEach(p => Object.values(p).forEach(d => todas.push(...d.opts)));
  todas.forEach(o => { assert.ok(o.length >= 1 && o.length <= 80, o); assert.ok(!/\p{Extended_Pictographic}/u.test(o), o); });
});

test('CLAVES son exactamente las del contrato del servidor', () => {
  assert.deepEqual(M.CLAVES, ['meta', 'p1', 'origen', 'grupo', 'p2', 'p2b', 'tamano', 'experiencia', 'urgencia', 'freno']);
});

/* ───────────────────────── Árbol en vivo ───────────────────────── */

test('obtenerPasos: sin respuestas solo existen las preguntas comunes', () => {
  assert.deepEqual(claves({}), ['meta', 'p1', 'origen', 'grupo', 'experiencia', 'urgencia', 'freno']);
  assert.deepEqual(claves(null), ['meta', 'p1', 'origen', 'grupo', 'experiencia', 'urgencia', 'freno']);
});

test('obtenerPasos: cada perfil sigue su propio camino (5 perfiles, 1 camino cada uno)', () => {
  const casos = [
    ['Estudiante', 'Trabajar en campo', 'Manejo seguro', false],
    ['Médico veterinario', 'Normatividad', 'Traslados y CITES', false],
    ['Personal de UMA o zoológico', 'Capacitar a mi equipo', 'Intermedio', true],
    ['Consultor ambiental', 'Monitoreo', 'Fototrampeo', true],
    ['Amante de la fauna', 'Ayudar a la fauna', 'Legislación básica', false]
  ];
  for (const [p1, p2, p2b, conTamano] of casos) {
    const r = recorrer({ p1, p2, p2b });
    assert.equal(r.p1, p1);
    assert.equal(r.p2, p2);
    assert.equal(r.p2b, p2b);
    assert.equal(r.tamano !== undefined, conTamano, p1 + ' tamano');
    const k = claves(r);
    assert.deepEqual(k, conTamano
      ? ['meta', 'p1', 'origen', 'grupo', 'p2', 'p2b', 'tamano', 'experiencia', 'urgencia', 'freno']
      : ['meta', 'p1', 'origen', 'grupo', 'p2', 'p2b', 'experiencia', 'urgencia', 'freno']);
    assert.ok(M.estaCompleta(r));
    assert.equal(M.totalPasos(r), k.length);
  }
});

test('el reto y la profundización cambian con el perfil y con la respuesta anterior', () => {
  const a = M.obtenerPasos({ p1: 'Estudiante', p2: 'Trabajar en campo' });
  assert.equal(a.find(p => p.clave === 'p2').q, '¿Tu meta es?');
  assert.deepEqual(a.find(p => p.clave === 'p2b').opts, ['Técnicas de campo', 'Manejo seguro', 'Legislación y permisos']);
  const b = M.obtenerPasos({ p1: 'Consultor ambiental', p2: 'Impacto ambiental' });
  assert.equal(b.find(p => p.clave === 'p2').q, '¿Tu enfoque?');
  assert.deepEqual(b.find(p => p.clave === 'p2b').opts, ['Diagnóstico', 'Mitigación', 'Seguimiento']);
});

test('tamano solo para personal de UMA o zoológico y consultor ambiental', () => {
  for (const p of M.PERFILES) {
    const tiene = claves({ p1: p, p2: M.RETOS[p].opts[0] }).includes('tamano');
    assert.equal(tiene, p === 'Personal de UMA o zoológico' || p === 'Consultor ambiental', p);
  }
});

test('un perfil o reto inventado no abre pasos nuevos', () => {
  assert.deepEqual(claves({ p1: 'Astronauta' }), ['meta', 'p1', 'origen', 'grupo', 'experiencia', 'urgencia', 'freno']);
  assert.deepEqual(claves({ p1: 'Estudiante', p2: 'Nada' }), ['meta', 'p1', 'origen', 'grupo', 'p2', 'experiencia', 'urgencia', 'freno']);
});

/* ───────────────────────── Dependencias ───────────────────────── */

test('cambiar p1 borra p2, p2b y tamano; cambiar p2 borra p2b; lo demás se conserva', () => {
  let r = recorrer({ p1: 'Personal de UMA o zoológico', p2: 'Cumplir normas', p2b: 'Informe anual', tamano: '2 a 10', origen: 'Buscador' });
  assert.equal(r.tamano, '2 a 10');
  const igual = M.aplicarRespuesta(r, 'p1', 'Personal de UMA o zoológico');
  assert.deepEqual(igual, r, 'repetir la misma respuesta no borra nada');
  const otroReto = M.aplicarRespuesta(r, 'p2', 'Mejorar el manejo');
  assert.equal(otroReto.p2b, undefined);
  assert.equal(otroReto.tamano, '2 a 10');
  const otroPerfil = M.aplicarRespuesta(r, 'p1', 'Estudiante');
  assert.equal(otroPerfil.p1, 'Estudiante');
  assert.equal(otroPerfil.p2, undefined);
  assert.equal(otroPerfil.p2b, undefined);
  assert.equal(otroPerfil.tamano, undefined);
  assert.equal(otroPerfil.origen, 'Buscador');
  assert.equal(otroPerfil.meta, r.meta);
  assert.ok(!M.estaCompleta(otroPerfil));
});

test('aplicarRespuesta no modifica el objeto recibido y rechaza opciones que no existen', () => {
  const r = Object.freeze({ meta: 'Cumplir trámites y normatividad' });
  const n = M.aplicarRespuesta(r, 'p1', 'Estudiante');
  assert.equal(n.p1, 'Estudiante');
  assert.equal(r.p1, undefined);
  assert.equal(M.aplicarRespuesta(r, 'p1', 'Astronauta').p1, undefined);
  assert.equal(M.aplicarRespuesta(r, 'inventada', 'x').inventada, undefined);
  assert.equal(M.aplicarRespuesta(r, 'p2', 'Normatividad').p2, undefined, 'p2 no existe sin perfil');
});

test('sanearRespuestas descarta claves ajenas, opciones inválidas y respuestas sin su antecedente', () => {
  const s = M.sanearRespuestas({ meta: 'Especializarme en mi profesión', p1: 'Estudiante', p2: 'Normatividad', p2b: 'Informe anual', tamano: 'Solo yo', origen: 'Otro', xyz: 'hack', freno: '<script>' });
  assert.deepEqual(s, { meta: 'Especializarme en mi profesión', p1: 'Estudiante', origen: 'Otro' });
  assert.deepEqual(M.sanearRespuestas(null), {});
  assert.deepEqual(M.sanearRespuestas('texto'), {});
  assert.deepEqual(M.sanearRespuestas({ p1: 123 }), {});
});

/* ───────────────────────── Retomar progreso ───────────────────────── */

test('primerPasoPendiente / pasoParaRetomar: no se salta preguntas sin contestar', () => {
  const r = { meta: 'Especializarme en mi profesión', p1: 'Médico veterinario' };
  assert.equal(M.primerPasoPendiente(r), 2);
  assert.equal(M.pasoParaRetomar(r, 2), 2);
  assert.equal(M.pasoParaRetomar(r, 1), 1, 'si había vuelto a una anterior, vuelve ahí');
  assert.equal(M.pasoParaRetomar(r, 9), 2, 'nunca más allá de la primera sin contestar');
  assert.equal(M.pasoParaRetomar(r, 'x'), 2);
  assert.equal(M.pasoParaRetomar({}, -3), 0);
  const completa = recorrer();
  assert.equal(M.primerPasoPendiente(completa), M.obtenerPasos(completa).length);
});

/* ───────────────────────── Abandono ───────────────────────── */

test('ultimaRespondida y etiquetaAbandono siguen el orden del flujo', () => {
  assert.equal(M.ultimaRespondida({}), null);
  assert.equal(M.etiquetaAbandono({}), null);
  assert.equal(M.ultimaRespondida({ meta: 'a', p1: 'b', origen: 'c' }), 'origen');
  assert.equal(M.etiquetaAbandono({ meta: 'a', p1: 'b', origen: 'c' }), 'Cómo nos conocieron');
  assert.equal(M.ultimaRespondida({ meta: 'a', p1: 'b', urgencia: 'z', grupo: 'g' }), 'urgencia');
  Object.keys(M.ETIQUETAS_PREGUNTA).forEach(k => assert.ok(M.CLAVES.includes(k), k));
  M.CLAVES.forEach(k => assert.ok(M.ETIQUETAS_PREGUNTA[k], 'falta etiqueta de ' + k));
});

/* ───────────────────────── WhatsApp ───────────────────────── */

test('normalizarWhatsapp México: 10 dígitos con lada, acepta +52 y 521', () => {
  assert.equal(M.normalizarWhatsapp('MX', '55 1234 5678'), '525512345678');
  assert.equal(M.normalizarWhatsapp('MX', '+52 55 1234 5678'), '525512345678');
  assert.equal(M.normalizarWhatsapp('MX', '521 55 1234 5678'), '525512345678');
  assert.equal(M.normalizarWhatsapp('MX', '(236) 111-3237'), '522361113237');
  assert.equal(M.normalizarWhatsapp('MX', '0155123456'), null, 'lada no puede empezar en 0 ni en 1');
  assert.equal(M.normalizarWhatsapp('MX', '55123'), null);
  assert.equal(M.normalizarWhatsapp('MX', '5555555555'), null, 'todos iguales');
  assert.equal(M.normalizarWhatsapp('MX', '2121212121'), null, 'patrón repetido');
  assert.equal(M.normalizarWhatsapp('MX', '1234567890'), null, 'secuencia');
  assert.equal(M.normalizarWhatsapp('MX', ''), null);
  assert.equal(M.normalizarWhatsapp('MX', null), null);
  assert.equal(M.normalizarWhatsapp(undefined, '55 1234 5678'), '525512345678', 'sin país usa México');
});

test('normalizarWhatsapp otros países: quita el código si lo escribieron y valida 8 a 15 dígitos', () => {
  assert.equal(M.normalizarWhatsapp('CO', '300 123 4567'), '573001234567');
  assert.equal(M.normalizarWhatsapp('CO', '+57 300 123 4567'), '573001234567');
  assert.equal(M.normalizarWhatsapp('ES', '612 345 678'), '34612345678');
  assert.equal(M.normalizarWhatsapp('US', '415 555 2671'), '14155552671');
  assert.equal(M.normalizarWhatsapp('OT', '+49 151 2345 6789'), '4915123456789');
  assert.equal(M.normalizarWhatsapp('OT', '0151 2345 6789'), null, 'empieza en 0');
  assert.equal(M.normalizarWhatsapp('OT', '1234567'), null, 'menos de 8 dígitos');
  assert.equal(M.normalizarWhatsapp('OT', '1'.repeat(16)), null, 'más de 15');
  assert.equal(M.normalizarWhatsapp('CO', '123'), null);
  // el resultado siempre cumple lo que exige el servidor: solo dígitos, 8 a 15
  for (const [c, n] of [['MX', '5512345678'], ['CO', '3001234567'], ['ES', '612345678'], ['OT', '4915123456789'], ['AR', '11 2345 6789']]) {
    const v = M.normalizarWhatsapp(c, n);
    assert.match(v, /^\d{8,15}$/, c);
  }
});

test('paisPorDefecto: solo con idioma español y país conocido; si no, México', () => {
  assert.equal(M.paisPorDefecto('es-CO'), 'CO');
  assert.equal(M.paisPorDefecto('es-MX'), 'MX');
  assert.equal(M.paisPorDefecto('es-ES'), 'ES');
  assert.equal(M.paisPorDefecto('en-US'), 'MX');
  assert.equal(M.paisPorDefecto('es'), 'MX');
  assert.equal(M.paisPorDefecto('es-419'), 'MX');
  assert.equal(M.paisPorDefecto('es-ZZ'), 'MX');
  assert.equal(M.paisPorDefecto(''), 'MX');
  assert.equal(M.paisPorDefecto(undefined), 'MX');
});

/* ───────────────────────── Envío ───────────────────────── */

test('construirCuerpo: solo claves permitidas, textos de 1 a 80, contacto con aviso', () => {
  const r = recorrer();
  r.freno = ' Nada,   listo '; // espacios de más
  const sucio = Object.assign({}, r, { intruso: 'x', origen: 'a'.repeat(81), grupo: '' });
  const c = M.construirCuerpo({ sessionId: 's'.repeat(150), respuestas: sucio, completada: true });
  assert.equal(c.sessionId.length, 100);
  assert.equal(c.completada, true);
  assert.equal(c.contacto, undefined);
  assert.equal(c.respuestas.intruso, undefined);
  assert.equal(c.respuestas.origen, undefined);
  assert.equal(c.respuestas.grupo, undefined);
  assert.equal(c.respuestas.freno, 'Nada, listo');
  Object.keys(c.respuestas).forEach(k => assert.ok(M.CLAVES.includes(k)));

  const con = M.construirCuerpo({ sessionId: 'abc', respuestas: r, completada: true, contacto: '+52 55 1234 5678' });
  assert.deepEqual(con.contacto, { numero: '525512345678', avisoAceptado: true, avisoVersion: M.AVISO_VERSION });
  assert.ok(M.AVISO_VERSION.length > 0 && M.AVISO_VERSION.length <= 40);
  assert.equal(M.construirCuerpo({ sessionId: 'a', respuestas: r }).completada, false, 'por defecto es parcial');
});

test('esReintentable: red caída, límite y fallos del servidor sí; rechazos 4xx no', () => {
  for (const s of [0, 408, 429, 500, 502, 503]) assert.equal(M.esReintentable(s), true, String(s));
  for (const s of [200, 400, 401, 403, 404, 413]) assert.equal(M.esReintentable(s), false, String(s));
});

test('sanearPendientes: forma válida, vigencia de 14 días y máximo de 8', () => {
  const ahora = Date.UTC(2026, 9, 12);
  const ok = { id: 'a', sid: 's1', respuestas: { meta: 'Especializarme en mi profesión' }, contacto: '525512345678', completada: true, t: ahora - 1000 };
  const lista = M.sanearPendientes([
    ok,
    { id: 'b', sid: 's1', respuestas: { meta: 'x' }, t: ahora - 15 * 86400000 },      // vieja
    { id: 'c', sid: 's1', respuestas: {}, t: ahora },                                 // sin respuestas
    { sid: 's1', respuestas: { meta: 'x' } },                                         // sin id
    null, 'x', 5,
    { id: 'd', sid: 's2', respuestas: { meta: 'x', hack: 'y' }, contacto: '12', t: ahora }
  ], ahora);
  assert.equal(lista.length, 2);
  assert.equal(lista[0].contacto, '525512345678');
  assert.equal(lista[1].contacto, null, 'un número inválido se descarta, no el envío');
  assert.equal(lista[1].respuestas.hack, undefined);
  const muchos = Array.from({ length: 20 }, (_, i) => ({ id: 'i' + i, sid: 's', respuestas: { meta: 'x' }, t: ahora }));
  assert.equal(M.sanearPendientes(muchos, ahora).length, 8);
  assert.deepEqual(M.sanearPendientes('no es lista', ahora), []);
});

/* ───────────────────────── Reacciones y resultado ───────────────────────── */

test('toda respuesta tiene una reacción con texto (la encuesta funciona sin imágenes)', () => {
  const todas = [];
  Object.entries(M.COMUNES).forEach(([k, d]) => d.opts.forEach(o => todas.push([k, o])));
  Object.values(M.RETOS).forEach(d => d.opts.forEach(o => todas.push(['p2', o])));
  Object.values(M.PROFUNDIZACION).forEach(p => Object.values(p).forEach(d => d.opts.forEach(o => todas.push(['p2b', o]))));
  for (const [k, o] of todas) {
    const x = M.reaccion(k, o);
    assert.ok(x.titulo && x.texto && x.expr, k + ' / ' + o);
    assert.ok(M.MENSAJES_EXPR[x.expr], 'expresión desconocida: ' + x.expr);
  }
  assert.match(M.mensajePregunta({ clave: 'meta' }, true).texto, /no una persona/);
});

test('textoResultado: habla de actitud (nunca de nivel) y cambia con urgencia y freno', () => {
  const base = recorrer({ p1: 'Estudiante', grupo: 'Aves y rapaces', urgencia: 'Lo antes posible', freno: 'Precio' });
  const t = M.textoResultado(base);
  assert.equal(t.fortaleza, 'tus ganas de crecer');
  assert.equal(t.tema, 'aves y rapaces');
  assert.equal(t.titulo.resalta, 'aves y rapaces');
  assert.equal(t.caliente, true);
  assert.match(t.halagos, /Decidir empezar ya/);
  assert.match(t.halagos, /prueba gratuita/);
  assert.match(t.cierre, /empieza hoy/);
  assert.match(t.nota, /no tiene costo/);

  const otro = M.textoResultado(recorrer({ p1: 'Médico veterinario', urgencia: 'Solo estoy explorando', freno: 'Tiempo' }));
  assert.notEqual(otro.fortaleza, t.fortaleza);
  assert.equal(otro.caliente, false);
  assert.match(otro.cierre, /sin compromiso/);
  assert.match(otro.nota, /a tu ritmo/);

  const equipo = M.textoResultado(recorrer({ p1: 'Personal de UMA o zoológico', tamano: 'Más de 50' }));
  assert.match(equipo.halagos, /equipo grande/);

  // jamás menciona "nivel" ni evalúa conocimientos, en ninguna combinación
  for (const p1 of M.PERFILES) for (const u of M.COMUNES.urgencia.opts) for (const f of M.COMUNES.freno.opts) for (const e of M.COMUNES.experiencia.opts) {
    const x = M.textoResultado(recorrer({ p1, urgencia: u, freno: f, experiencia: e }));
    const todo = [x.fortaleza, x.halagos, x.cierre, x.nota, x.titulo.antes, x.titulo.despues].join(' ');
    assert.ok(!/\bnivel\b|principiante|avanzad|experto|sabes poco|aprobad/i.test(todo), todo);
    assert.ok(!/\p{Extended_Pictographic}/u.test(todo));
  }
  // sin datos no se rompe
  const vacio = M.textoResultado({});
  assert.ok(vacio.fortaleza && vacio.halagos && vacio.cierre);
  assert.equal(vacio.tema, null);
});

test('la prueba gratuita se describe como en el Club: un curso, todas sus clases menos la última', () => {
  assert.match(M.PRUEBA.detalle, /menos la última/);
});

/* ───────────────────────── Cursos recomendados ───────────────────────── */

const CATALOGO = [
  { id: 'c1', titulo: 'Manejo integral de colmenas', area: 'Apicultura y polinización', descripcion: 'Revisión y manejo de colmenas.', clases: 5, pronto: false, elegiblePrueba: true },
  { id: 'c2', titulo: 'Fototrampeo y monitoreo de mamíferos', area: 'Investigación científica y monitoreo', descripcion: 'Cámaras trampa.', clases: 6, pronto: false, elegiblePrueba: true },
  { id: 'c3', titulo: 'Fauna ponzoñosa de México', area: 'Fauna ponzoñosa y toxicología', descripcion: 'Serpientes y arácnidos.', clases: 4, pronto: false, elegiblePrueba: true },
  { id: 'c4', titulo: 'Manejo integral de UMAs y fauna silvestre', area: 'Fauna silvestre y conservación', descripcion: 'Registro y operación de UMAs.', clases: 7, pronto: false, elegiblePrueba: true },
  { id: 'c5', titulo: 'Curso futuro', area: 'General', descripcion: '', clases: 3, pronto: true, elegiblePrueba: true },
  { id: 'c6', titulo: 'Zooingeniería de hábitats y exhibiciones', area: 'Manejo de fauna en cautiverio y exhibición', descripcion: '', clases: 3, pronto: false, elegiblePrueba: true }
];

test('recomendarCursos: el grupo de fauna manda y siempre hay hasta 3 resultados', () => {
  const r = M.recomendarCursos(CATALOGO, { grupo: 'Insectos y polinizadores' });
  assert.equal(r.length, 3);
  assert.equal(r[0].curso.id, 'c1');
  assert.match(r[0].razon, /insectos y polinizadores/);
  assert.ok(r[0].puntos > r[1].puntos);
  assert.equal(M.recomendarCursos(CATALOGO, { grupo: 'Reptiles y fauna ponzoñosa' })[0].curso.id, 'c3');
  assert.equal(M.recomendarCursos(CATALOGO, { grupo: 'Mamíferos y felinos' })[0].curso.id, 'c2');
});

test('recomendarCursos: p2b pesa más que p2 y mueve la recomendación; la meta normativa suma', () => {
  const r = M.recomendarCursos(CATALOGO, { p1: 'Personal de UMA o zoológico', p2: 'Cumplir normas', p2b: 'Registro de ejemplares', meta: 'Cumplir trámites y normatividad' });
  assert.equal(r[0].curso.id, 'c4');
  const c = M.recomendarCursos(CATALOGO, { p1: 'Consultor ambiental', p2: 'Monitoreo', p2b: 'Fototrampeo' });
  assert.equal(c[0].curso.id, 'c2');
  assert.match(c[0].razon, /fototrampeo/);
});

test('recomendarCursos: sin coincidencias devuelve los primeros 3 disponibles; excluye "próximamente"', () => {
  const r = M.recomendarCursos(CATALOGO, {});
  assert.deepEqual(r.map(x => x.curso.id), ['c1', 'c2', 'c3']);
  assert.ok(r.every(x => x.razon === null && x.puntos === 0));
  const sinPronto = M.recomendarCursos(CATALOGO, { grupo: 'Fauna en general' });
  assert.ok(!sinPronto.some(x => x.curso.id === 'c5'));
  assert.deepEqual(M.recomendarCursos([], {}), []);
  assert.deepEqual(M.recomendarCursos(null, {}), []);
  assert.equal(M.recomendarCursos(CATALOGO, {}, 1).length, 1);
});

test('recomendarCursos: prefiere cursos de 2 o más clases (la prueba necesita al menos 2)', () => {
  const lista = [{ id: 'a', titulo: 'Aves rapaces', area: 'x', clases: 1 }, { id: 'b', titulo: 'Aves del bosque', area: 'x', clases: 3 }];
  const r = M.recomendarCursos(lista, { grupo: 'Aves y rapaces' });
  assert.deepEqual(r.map(x => x.curso.id), ['b']);
  // si ninguno llega a 2 clases, igual se ofrecen
  assert.equal(M.recomendarCursos([lista[0]], {}).length, 1);
});

test('recomendarCursos: solo ofrece como prueba los elegiblePrueba; los demás van al final como "Parte de la membresía"', () => {
  const cat = [
    { id: 'n1', titulo: 'Colmenas avanzadas', area: 'Apicultura', clases: 5, elegiblePrueba: false },
    { id: 'e1', titulo: 'Sanidad apícola', area: 'Apicultura', clases: 4, elegiblePrueba: true },
    { id: 'e2', titulo: 'Rescate de fauna silvestre', area: 'Fauna silvestre', clases: 4, elegiblePrueba: true },
    { id: 'e3', titulo: 'Etología de fauna silvestre', area: 'Etología', clases: 4, elegiblePrueba: true }
  ];
  const r = M.recomendarCursos(cat, { grupo: 'Insectos y polinizadores' });
  assert.deepEqual(r.map(x => x.curso.id), ['e1', 'e2', 'e3'], 'con 3 elegibles, el no elegible queda fuera aunque puntúe más');
  assert.ok(r.every(x => x.elegible === true));
  // si faltan elegibles, se completa con los no elegibles, marcados
  const r2 = M.recomendarCursos(cat.slice(0, 2), { grupo: 'Insectos y polinizadores' });
  assert.deepEqual(r2.map(x => [x.curso.id, x.elegible]), [['e1', true], ['n1', false]]);
  // si el servidor no manda el dato, se asume elegible
  assert.equal(M.recomendarCursos([{ id: 'x', titulo: 'Aves', area: 'a', clases: 3 }], {})[0].elegible, true);
});

/* ───────────────────────── Traspaso ───────────────────────── */

test('construirPreferencia y rutas: el formato que lee el Club', () => {
  const p = M.construirPreferencia({ id: 'c1', titulo: '  Manejo   integral  ' }, 1760000000000);
  assert.deepEqual(p, { id: 'c1', titulo: 'Manejo integral', t: 1760000000000 });
  assert.equal(M.construirPreferencia({ id: '' }), null);
  assert.equal(M.construirPreferencia(null), null);
  assert.equal(M.PREF_KEY, 'zoo_curso_pref');
  assert.equal(M.urlRegistro('c 1/x'), 'pages/club-registro.html?curso=c%201%2Fx');
  assert.equal(M.urlLogin('abc'), 'pages/club-login.html?curso=abc');
  assert.equal(M.urlRegistro(''), 'pages/club-registro.html');
});

/* ───────────────────────── Archivos ───────────────────────── */

test('sin emojis en el motor, la pantalla ni los estilos de la encuesta', () => {
  for (const f of ['assets/js/encuesta-motor.js', 'assets/js/encuesta-landing.js', 'assets/css/encuesta.css']) {
    const mal = leer(f).split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /[\p{Extended_Pictographic}️]/u.test(l));
    assert.deepEqual(mal.map(([n, l]) => `${f}:${n} ${l.trim().slice(0, 60)}`), []);
  }
});

test('la pantalla envía a POST /api/encuesta y NO escribe en Firestore', () => {
  const js = leer('assets/js/encuesta-landing.js');
  assert.match(js, /\/api\/encuesta/);
  assert.ok(!/firebasejs|getFirestore|addDoc|initializeApp|firebase.firestore/i.test(js), 'la portada no debe usar Firebase');
  assert.match(js, /visibilitychange/);
  assert.match(js, /online/);
  assert.match(js, /EDICION/);
  assert.match(js, /zoo_curso_pref|M\.PREF_KEY/);
});

test('encuesta.css es responsivo y respeta prefers-reduced-motion', () => {
  const css = leer('assets/css/encuesta.css');
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /#1F5F3A/i);
  assert.match(css, /#E8A317/i);
});
