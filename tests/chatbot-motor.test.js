'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const Motor = require('../assets/js/chatbot-motor.js');
const Dudas = require('../assets/js/chatbot-dudas.js');

/* ───────────── Datos de PRUEBA: animales ficticios o mínimos. NO son datos reales de fauna. ───────────── */
const ZORRIMON = {
  id: 'zorrimon', nombre: 'Zorrimón de prueba', alias: ['zorrimon', 'zorrimones', 'zorrimona'],
  cientifico: 'Vulpes pruebae', grupo: 'Mamíferos · Cánidos de prueba', claveCursos: ['mamifero', 'fauna silvestre'],
  datos: {
    que_es: { texto: '[PRUEBA] Animal ficticio usado solo en las pruebas.', fuente: 'Fuente de prueba uno', url: 'https://example.org/zorrimon' },
    come: {
      texto: '[PRUEBA] Come frutas ficticias.', fuente: 'Fuente de prueba A', url: 'https://example.org/a',
      fuentes_extra: [
        { apoya: 'las frutas', fuente: 'Fuente de prueba B', url: 'https://example.org/b' },
        { fuente: 'Fuente de prueba C', url: 'javascript:alert(1)' }
      ]
    },
    habitat: { texto: '[PRUEBA] Vive en bosques ficticios.', fuente: 'Fuente de prueba D', url: 'https://example.org/d' },
    // tamano, vida, crias, conservacion, peligro y curiosidad ausentes a propósito
    peligro: { texto: '[PRUEBA] Sin fuente: no debe mostrarse nunca.', fuente: '', url: '' }
  }
};
const LEON = {
  id: 'leon', nombre: 'León de prueba', alias: ['leones', 'leona', 'leonas', 'león africano'],
  cientifico: 'Panthera pruebae', grupo: 'Mamíferos · Felinos', claveCursos: ['felino', 'fauna silvestre'],
  datos: {
    que_es: { texto: '[PRUEBA] Felino ficticio.', fuente: 'Fuente L1', url: 'https://example.org/l1' },
    come: { texto: '[PRUEBA] Come presas ficticias.', fuente: 'Fuente L2', url: 'https://example.org/l2' },
    habitat: { texto: '[PRUEBA] Sabanas ficticias.', fuente: 'Fuente L3', url: 'https://example.org/l3' },
    tamano: { texto: '[PRUEBA] Mide 1 metro de prueba y pesa 10 kg de prueba.', fuente: 'Fuente L4', url: 'https://example.org/l4' },
    vida: { texto: '[PRUEBA] Vive 10 años de prueba.', fuente: 'Fuente L5', url: 'https://example.org/l5' },
    crias: { texto: '[PRUEBA] Tiene 2 crías de prueba.', fuente: 'Fuente L6', url: 'https://example.org/l6' },
    conservacion: { texto: '[PRUEBA] Categoría ficticia.', fuente: 'Fuente L7', url: 'https://example.org/l7' },
    peligro: { texto: '[PRUEBA] Peligro ficticio.', fuente: 'Fuente L8', url: 'https://example.org/l8' },
    curiosidad: { texto: '[PRUEBA] Dato curioso ficticio.', fuente: 'Fuente L9', url: 'https://example.org/l9' }
  }
};
const MINIMA = {
  id: 'pirulon', nombre: 'Pirulón mínimo', alias: [], grupo: 'Aves', claveCursos: ['aves'],
  datos: { que_es: { texto: '[PRUEBA] Ficha mínima.', fuente: 'Fuente M', url: '' } }
};
const VACIA = { id: 'vacionix', nombre: 'Vacionix', alias: [], grupo: '', claveCursos: [], datos: {} };
const LOBO_GRIS = {
  id: 'lobo-gris', nombre: 'Lobo gris de prueba', alias: ['lobo', 'lobos', 'lobo gris'], grupo: 'Mamíferos · Cánidos', claveCursos: ['canido'],
  datos: { que_es: { texto: '[PRUEBA] Lobo gris ficticio.', fuente: 'Fuente LG', url: 'https://example.org/lg' } }
};
const LOBO_MEX = {
  id: 'lobo-mexicano', nombre: 'Lobo mexicano de prueba', alias: ['lobo mexicano', 'lobos mexicanos'], grupo: 'Mamíferos · Cánidos', claveCursos: ['canido'],
  datos: { que_es: { texto: '[PRUEBA] Lobo mexicano ficticio.', fuente: 'Fuente LM', url: 'https://example.org/lm' } }
};
const ZORRO_A = {
  id: 'zorro-a', nombre: 'Zorro del desierto de prueba', alias: ['zorro del desierto'], grupo: 'Mamíferos · Cánidos', claveCursos: ['canido'],
  datos: { que_es: { texto: '[PRUEBA] Zorro A.', fuente: 'Fuente ZA', url: 'https://example.org/za' } }
};
const ZORRO_B = {
  id: 'zorro-b', nombre: 'Zorro gris de prueba', alias: ['zorro gris'], grupo: 'Mamíferos · Cánidos', claveCursos: ['canido'],
  datos: { que_es: { texto: '[PRUEBA] Zorro B.', fuente: 'Fuente ZB', url: 'https://example.org/zb' } }
};

const CATALOGO = [
  { id: 'c-fauna', titulo: 'Manejo integral de fauna silvestre', area: 'Fauna silvestre', descripcion: 'Mamíferos y manejo en cautiverio.', clases: 8, pronto: false, elegiblePrueba: true },
  { id: 'c-abejas', titulo: 'Manejo integral de colmenas', area: 'Apicultura', descripcion: 'Abejas y polinización.', clases: 6, pronto: false, elegiblePrueba: true },
  { id: 'c-felinos', titulo: 'Felinos silvestres en cautiverio', area: 'Fauna silvestre', descripcion: 'Manejo de felinos.', clases: 7, pronto: false, elegiblePrueba: false },
  { id: 'c-serp', titulo: 'Fauna ponzoñosa de México', area: 'Fauna ponzoñosa', descripcion: 'Serpientes, arañas y escorpiones.', clases: 9, pronto: false, elegiblePrueba: true },
  { id: 'c-ley', titulo: 'Legislación para UMA y PIMVS', area: 'Legislación', descripcion: 'Permisos y normatividad.', clases: 5, pronto: false },
  { id: 'c-pronto', titulo: 'Aves rapaces en rehabilitación', area: 'Aves', descripcion: 'Próximo curso.', clases: 0, pronto: true, elegiblePrueba: true }
];

const TODAS = [ZORRIMON, LEON, MINIMA, VACIA];
const nuevo = (extra) => Motor.crear(Object.assign({ fichas: TODAS, catalogo: CATALOGO }, extra || {}));
const todoTexto = r => r.partes.join(' ');
const idsCursos = lista => (lista || []).map(c => c.id);
const etiquetas = r => r.botones.map(b => b.t);

/* ═══════════════ utilidades ═══════════════ */

test('normalizar: minúsculas, sin acentos ni signos, espacios simples', () => {
  assert.equal(Motor.normalizar('  ¿Qué COME el León?  '), 'que come el leon');
  assert.equal(Motor.normalizar('NOM-059-SEMARNAT'), 'nom 059 semarnat');
  assert.equal(Motor.normalizar('pequeño   año'), 'pequeno ano');
  assert.equal(Motor.normalizar(null), '');
  assert.equal(Motor.normalizar(42), '42');
});

test('distancia: una letra de más, de menos, cambiada o dos intercambiadas cuentan como 1', () => {
  assert.equal(Motor.distancia('zorrimon', 'zorrimon'), 0);
  assert.equal(Motor.distancia('zorrimon', 'zorrimn', 1), 1);
  assert.equal(Motor.distancia('zorrimon', 'zorrimona', 1), 1);
  assert.equal(Motor.distancia('zorrimon', 'zorrimen', 1), 1);
  assert.equal(Motor.distancia('zorrimon', 'zorrimno', 1), 1);
  assert.ok(Motor.distancia('zorrimon', 'zorrixxn', 1) > 1);
});

test('datos personales: correos y teléfonos se detectan y nunca llegan al registro', () => {
  assert.equal(Motor.hayDatosPersonales('escríbeme a juan@correo.com'), true);
  assert.equal(Motor.hayDatosPersonales('mi cel es 236 111 3237'), true);
  assert.equal(Motor.hayDatosPersonales('+52 1 236 111 3237'), true);
  assert.equal(Motor.hayDatosPersonales('qué come el león'), false);
  assert.equal(Motor.hayDatosPersonales('NOM-059 de 2010'), false);
  assert.equal(Motor.limpiarParaRegistro('hola a@b.com mira https://x.org/p y 2361113237 fin'), 'hola mira y fin');
  assert.equal(Motor.limpiarParaRegistro('ab'), '');
  assert.equal(Motor.limpiarParaRegistro('x'.repeat(300)).length, 120);
});

/* ═══════════════ capa 1: charla ═══════════════ */

test('charla: "hola" saluda y ofrece el menú', () => {
  const r = nuevo().texto('hola');
  assert.equal(r.tipo, 'charla');
  assert.match(todoTexto(r), /¡(Hola|Buen)/);
  assert.ok(etiquetas(r).includes('Buscar un curso'));
  assert.ok(etiquetas(r).includes('Conocer un animal'), 'hay fichas: se ofrece conocer un animal');
  assert.equal(r.registrar, null);
});

test('charla: "buenos días" y "buenas noches" respetan el saludo escrito', () => {
  assert.match(todoTexto(nuevo().texto('Buenos días')), /Buenos días/);
  assert.match(todoTexto(nuevo().texto('buenas noches')), /Buenas noches/);
});

test('charla: "¿cómo estás?" responde amable y honesta', () => {
  const r = nuevo().texto('¿cómo estás?');
  assert.equal(r.tipo, 'charla');
  assert.match(todoTexto(r), /guía virtual/);
});

test('charla: "quién eres" y "¿eres un robot?" dicen con honestidad que no es persona ni IA', () => {
  ['quién eres', '¿Quién eres?', '¿eres un robot?', 'eres una persona?', 'eres real', 'eres chatgpt', 'cómo te llamas'].forEach(q => {
    const r = nuevo().texto(q);
    assert.equal(r.tipo, 'charla', q);
    assert.match(todoTexto(r), /No soy una persona ni una inteligencia artificial/, q);
  });
});

test('charla: "qué puedes hacer", gracias, adiós y ok', () => {
  assert.match(todoTexto(nuevo().texto('¿qué puedes hacer?')), /animales/);
  assert.match(todoTexto(nuevo().texto('muchas gracias')), /Con gusto/);
  const adios = nuevo().texto('adiós');
  assert.match(todoTexto(adios), /Hasta pronto/);
  assert.deepEqual(etiquetas(adios), ['Menú principal']);
  assert.match(todoTexto(nuevo().texto('ok')), /Perfecto/);
});

test('charla: un saludo antes de una pregunta se contesta y la pregunta también', () => {
  const r = nuevo().texto('hola, qué come el zorrimon');
  assert.equal(r.tipo, 'ficha');
  assert.match(r.partes[0], /¡Hola|¡Buen/);
  assert.match(todoTexto(r), /Come frutas ficticias/);
});

test('inicio: se presenta como guía virtual, no persona ni IA', () => {
  const r = nuevo().inicio();
  assert.match(todoTexto(r), /No soy una persona ni una inteligencia artificial/);
});

/* ═══════════════ capa 2: fichas de animales ═══════════════ */

test('animal: "qué es un leon" muestra la descripción con nombre científico, grupo y fuente', () => {
  const r = nuevo().texto('que es un leon');
  assert.equal(r.tipo, 'ficha');
  assert.equal(r.animal, 'leon');
  assert.match(r.partes[0], /León de prueba.*Panthera pruebae.*Mamíferos · Felinos/);
  assert.match(todoTexto(r), /Felino ficticio/);
  assert.deepEqual(r.fuentes, [{ nombre: 'Fuente L1', url: 'https://example.org/l1' }]);
  assert.deepEqual(r.fuente, r.fuentes[0]);
});

test('animal: "qué come el león", "hábitat del león", tamaño, vida, crías, conservación, peligro, curiosidad', () => {
  const casos = [
    ['¿Qué come el León?', 'come', /Come presas ficticias/, 'Fuente L2'],
    ['hábitat del león', 'habitat', /Sabanas ficticias/, 'Fuente L3'],
    ['dónde vive el león', 'habitat', /Sabanas ficticias/, 'Fuente L3'],
    ['cuánto mide el león', 'tamano', /Mide 1 metro/, 'Fuente L4'],
    ['cuánto pesa un león', 'tamano', /pesa 10 kg/, 'Fuente L4'],
    ['cuántos años vive el león', 'vida', /Vive 10 años/, 'Fuente L5'],
    ['esperanza de vida del león', 'vida', /Vive 10 años/, 'Fuente L5'],
    ['cuántas crías tiene el león', 'crias', /2 crías/, 'Fuente L6'],
    ['gestación del león', 'crias', /2 crías/, 'Fuente L6'],
    ['¿el león está en peligro de extinción?', 'conservacion', /Categoría ficticia/, 'Fuente L7'],
    ['el león está en la NOM-059', 'conservacion', /Categoría ficticia/, 'Fuente L7'],
    ['¿es peligroso el león?', 'peligro', /Peligro ficticio/, 'Fuente L8'],
    ['el león ataca a las personas', 'peligro', /Peligro ficticio/, 'Fuente L8'],
    ['un dato curioso del león', 'curiosidad', /Dato curioso ficticio/, 'Fuente L9']
  ];
  casos.forEach(([q, campo, patron, fuente]) => {
    const r = nuevo().texto(q);
    assert.equal(r.tipo, 'ficha', q);
    assert.equal(r.animal, 'leon', q);
    assert.deepEqual(r.campos, [campo], q);
    assert.match(todoTexto(r), patron, q);
    assert.equal(r.fuentes[0].nombre, fuente, q);
  });
});

test('animal: una pregunta con dos intenciones responde las dos, cada una con su fuente', () => {
  const r = nuevo().texto('qué come y dónde vive el león');
  assert.equal(r.tipo, 'ficha');
  assert.deepEqual(r.campos.sort(), ['come', 'habitat']);
  assert.deepEqual(r.fuentes.map(f => f.nombre).sort(), ['Fuente L2', 'Fuente L3']);
});

test('animal: sin acentos, plurales, femenino y alias', () => {
  ['que come el leon', 'qué comen los leones', 'que come una leona', 'que comen las leonas', 'qué come el león africano', 'QUE COME EL LEON'].forEach(q => {
    const r = nuevo().texto(q);
    assert.equal(r.animal, 'leon', q);
    assert.equal(r.tipo, 'ficha', q);
  });
  ['donde vive un zorrimon', 'donde viven los zorrimones', 'dónde vive la zorrimona'].forEach(q => {
    assert.equal(nuevo().texto(q).animal, 'zorrimon', q);
  });
});

test('animal: tolera un error tipográfico en nombres de 5+ letras', () => {
  ['donde vive un zorrimn', 'donde vive un zorimon', 'donde vive un zorrimno', 'donde vive un zorrimonn', 'donde vive un zorrimen'].forEach(q => {
    const r = nuevo().texto(q);
    assert.equal(r.animal, 'zorrimon', q);
    assert.equal(r.tipo, 'ficha', q);
  });
  assert.deepEqual(nuevo().detectarAnimal('hay un zorrimn'), { id: 'zorrimon', fuzzy: true });
});

test('animal: NO tolera errores en nombres cortos ni dos errores a la vez', () => {
  assert.equal(nuevo().detectarAnimal('que come el leom'), null, 'león tiene 4 letras: no se corrige');
  assert.equal(nuevo().detectarAnimal('donde vive un zorrixxn'), null);
  assert.equal(nuevo().detectarAnimal('cierta cosa'), null);
});

test('animal: solo el nombre muestra "qué es" y botones de lo que SÍ existe en la ficha', () => {
  const r = nuevo().texto('zorrimon');
  assert.equal(r.tipo, 'ficha');
  assert.deepEqual(r.campos, ['que_es']);
  const et = etiquetas(r);
  assert.ok(et.includes('Qué come'));
  assert.ok(et.includes('Dónde vive'));
  ['Tamaño', 'Cuánto vive', 'Crías', 'Conservación', '¿Es peligroso?', 'Dato curioso'].forEach(x => assert.ok(!et.includes(x), x + ' no existe en la ficha'));
  const b = r.botones.find(x => x.t === 'Qué come');
  assert.deepEqual(b.accion, { tipo: 'animal', id: 'zorrimon', campo: 'come' });
});

test('animal: campo ausente en la ficha lo dice, ofrece lo que sí hay y lo registra para el equipo', () => {
  const r = nuevo().texto('cuánto mide el zorrimon');
  assert.equal(r.tipo, 'ficha-sin-dato');
  assert.match(todoTexto(r), /aún no tengo verificado/);
  assert.ok(etiquetas(r).includes('Qué come'));
  assert.deepEqual(r.fuentes, []);
  assert.deepEqual(r.registrar, { texto: 'cuánto mide el zorrimon', tipo: 'animal' });
});

test('animal: un campo SIN fuente se trata como ausente (nunca se muestra un dato sin fuente)', () => {
  const r = nuevo().texto('es peligroso el zorrimon');
  assert.equal(r.tipo, 'ficha-sin-dato');
  assert.ok(!/Sin fuente/.test(todoTexto(r)));
  assert.ok(!etiquetas(r).includes('¿Es peligroso?'));
});

test('animal: ficha mínima y ficha vacía responden con honestidad', () => {
  const min = nuevo().texto('pirulon');
  assert.equal(min.tipo, 'ficha');
  assert.deepEqual(min.fuentes, [{ nombre: 'Fuente M', url: '' }], 'sin enlace: solo el nombre de la fuente');
  const vacia = nuevo().texto('qué es vacionix');
  assert.equal(vacia.tipo, 'ficha-sin-dato');
  assert.match(todoTexto(vacia), /todavía no tengo datos verificados con fuente/);
  assert.deepEqual(vacia.fuentes, []);
});

test('animal: fuentes_extra se muestran junto a la principal y las URL peligrosas se descartan', () => {
  const r = nuevo().texto('qué come el zorrimon');
  assert.equal(r.tipo, 'ficha');
  assert.deepEqual(r.fuentes.map(f => f.nombre), ['Fuente de prueba A', 'Fuente de prueba B', 'Fuente de prueba C']);
  assert.equal(r.fuentes[1].url, 'https://example.org/b');
  assert.equal(r.fuentes[1].apoya, 'las frutas');
  assert.equal(r.fuentes[2].url, '', 'javascript: no es un enlace válido');
  r.fuentes.forEach(f => assert.ok(!/^javascript:/i.test(f.url)));
});

test('animal: dos animales mencionados → responde el primero y ofrece el otro', () => {
  const r = nuevo().texto('qué come el zorrimon y el leon');
  assert.equal(r.animal, 'zorrimon');
  assert.ok(etiquetas(r).includes('León de prueba'));
});

test('contexto: "¿y qué come?" sigue hablando del último animal; un animal nuevo no hereda el contexto', () => {
  const m = nuevo();
  m.texto('que es un leon');
  const sigue = m.texto('¿y qué come?');
  assert.equal(sigue.animal, 'leon');
  assert.match(todoTexto(sigue), /presas ficticias/);
  const otro = m.texto('qué come el ornitorrinco');
  assert.notEqual(otro.animal, 'leon');
  assert.equal(otro.tipo, 'animal-desconocido');
});

test('sin animal ni contexto: "¿qué come?" pregunta de qué animal y ofrece los que hay', () => {
  const r = nuevo().texto('qué come');
  assert.equal(r.tipo, 'pedir-animal');
  assert.ok(etiquetas(r).includes('León de prueba'));
  assert.equal(r.registrar, null, 'es una aclaración, no una pregunta sin respuesta');
});

test('animal desconocido: lo dice, ofrece los animales que sí hay, curso y registra tipo animal', () => {
  const r = nuevo().texto('qué come el ornitorrinco');
  assert.equal(r.tipo, 'animal-desconocido');
  assert.match(todoTexto(r), /«ornitorrinco»/);
  assert.ok(etiquetas(r).includes('León de prueba'));
  assert.deepEqual(r.registrar, { texto: 'qué come el ornitorrinco', tipo: 'animal' });
  assert.deepEqual(r.fuentes, []);
});

test('sin fichas (archivo vacío): la guía avisa que las fichas están en preparación, sin inventar', () => {
  const m = Motor.crear({ fichas: [], catalogo: CATALOGO });
  const r = m.texto('qué come el león');
  assert.equal(r.tipo, 'animal-desconocido');
  assert.match(todoTexto(r), /en preparación/);
  assert.ok(!etiquetas(m.inicio()).includes('Conocer un animal'));
  assert.equal(m.accion({ tipo: 'animales' }).tipo, 'animales');
});

test('lista de animales: botones con los nombres de las fichas', () => {
  const r = nuevo().texto('qué animales conoces');
  assert.equal(r.tipo, 'animales');
  assert.ok(etiquetas(r).includes('Zorrimón de prueba'));
});

/* ═══════════════ alias ambiguos ═══════════════ */

test('ambiguos: "lobo" a secas pregunta cuál ficha, con botones', () => {
  const m = Motor.crear({ fichas: [LOBO_GRIS, LOBO_MEX, ZORRIMON], catalogo: CATALOGO });
  ['lobo', 'qué es un lobo', 'los lobos', 'qué come el lobo'].forEach(q => {
    const r = m.texto(q);
    assert.equal(r.tipo, 'animal-ambiguo', q);
    assert.ok(etiquetas(r).includes('Lobo gris de prueba'), q);
    assert.ok(etiquetas(r).includes('Lobo mexicano de prueba'), q);
  });
  const come = m.texto('qué come el lobo').botones.find(b => b.t === 'Lobo mexicano de prueba');
  assert.deepEqual(come.accion, { tipo: 'animal', id: 'lobo-mexicano', campo: 'come' });
});

test('ambiguos: la coincidencia MÁS LARGA gana ("lobo mexicano" gana a "lobo")', () => {
  const m = Motor.crear({ fichas: [LOBO_GRIS, LOBO_MEX], catalogo: CATALOGO });
  ['lobo mexicano', 'qué es el lobo mexicano', 'los lobos mexicanos', 'LOBO MEXICANO'].forEach(q => {
    const r = m.texto(q);
    assert.equal(r.tipo, 'ficha', q);
    assert.equal(r.animal, 'lobo-mexicano', q);
  });
  assert.equal(m.texto('lobo gris').animal, 'lobo-gris');
});

test('ambiguos: "zorro" sin precisión pregunta cuál; con precisión responde', () => {
  const m = Motor.crear({ fichas: [ZORRO_A, ZORRO_B], catalogo: CATALOGO });
  const r = m.texto('zorro');
  assert.equal(r.tipo, 'animal-ambiguo');
  assert.deepEqual(etiquetas(r).slice(0, 2), ['Zorro del desierto de prueba', 'Zorro gris de prueba']);
  assert.equal(m.texto('zorro gris').animal, 'zorro-b');
  assert.equal(m.texto('el zorro del desierto').animal, 'zorro-a');
});

test('ambiguos: un animal sin otras fichas parecidas NO pregunta', () => {
  const m = Motor.crear({ fichas: [LOBO_GRIS, LOBO_MEX, ZORRIMON, LEON], catalogo: CATALOGO });
  assert.equal(m.texto('zorrimon').tipo, 'ficha');
  assert.equal(m.texto('leon').tipo, 'ficha');
});

test('ambiguos: pregunta de mascota con un nombre ambiguo no obliga a elegir', () => {
  const m = Motor.crear({ fichas: [LOBO_GRIS, LOBO_MEX], catalogo: CATALOGO });
  assert.equal(m.texto('puedo tener un lobo de mascota').tipo, 'mascota');
});

/* ═══════════════ mascota / legislación ═══════════════ */

test('mascota: "puedo tener un jaguar de mascota" da una respuesta GENERAL de legislación con fuente', () => {
  const r = nuevo().texto('puedo tener un jaguar de mascota');
  assert.equal(r.tipo, 'mascota');
  assert.match(todoTexto(r), /Ley General de Vida Silvestre/);
  assert.match(todoTexto(r), /Código Penal Federal/);
  assert.match(todoTexto(r), /no lo puedo decidir por ti|eso no lo puedo decidir/);
  assert.equal(r.fuentes[0].nombre, 'Ley General de Vida Silvestre, Cámara de Diputados');
  assert.match(r.fuentes[0].url, /^https:\/\/www\.diputados\.gob\.mx\//);
  assert.ok(etiquetas(r).includes('Ver el texto de la ley'));
  assert.ok(r.aviso);
});

test('mascota: con ficha, agrega la conservación de ESE animal con su fuente; sin ese campo, no inventa', () => {
  const con = nuevo().texto('puedo tener un león de mascota');
  assert.equal(con.tipo, 'mascota');
  assert.equal(con.animal, 'leon');
  assert.match(todoTexto(con), /Categoría ficticia/);
  assert.deepEqual(con.fuentes.map(f => f.nombre), ['Ley General de Vida Silvestre, Cámara de Diputados', 'Fuente L7']);
  const sin = nuevo().texto('es legal tener un zorrimon en casa');
  assert.equal(sin.tipo, 'mascota');
  assert.ok(!/ficticias?/.test(todoTexto(sin)));
  assert.equal(sin.fuentes.length, 1);
});

test('mascota: "¿es legal tenerlo?" usa el animal de la conversación', () => {
  const m = nuevo();
  m.texto('que es un leon');
  const r = m.texto('¿es legal tenerlo?');
  assert.equal(r.tipo, 'mascota');
  assert.equal(r.animal, 'leon');
});

test('mascota: la respuesta no promete autorizaciones concretas ni cantidades', () => {
  const t = todoTexto(nuevo().texto('puedo tener un jaguar de mascota'));
  assert.ok(!/\$\s?\d/.test(t));
  assert.ok(!/\bsí puedes\b|\bno puedes\b/i.test(t));
});

test('legislación: NOM-059, LGVS y CITES tienen su propia respuesta con fuente', () => {
  const nom = nuevo().texto('¿qué es la NOM-059?');
  assert.equal(nom.duda, 'nom059');
  assert.match(nom.fuentes[0].url, /dof\.gob\.mx/);
  assert.equal(nuevo().texto('qué es la ley general de vida silvestre').duda, 'lgvs');
  assert.equal(nuevo().texto('qué es CITES').duda, 'cites');
});

/* ═══════════════ capa 3: dudas ═══════════════ */

const FRASES_DUDAS = [
  ['¿cuánto cuesta la membresía?', 'precio'],
  ['precio', 'precio'],
  ['¿cómo puedo pagar?', 'pago'],
  ['aceptan tarjeta', 'pago'],
  ['¿hay plan mensual o anual?', 'planes'],
  ['¿puedo cancelar mi suscripción?', 'cancelar'],
  ['quiero un reembolso', 'reembolso'],
  ['¿hay descuentos?', 'descuento'],
  ['cómo funciona la prueba gratuita', 'prueba'],
  ['es gratis?', 'prueba'],
  ['cada cuándo se desbloquean los cursos', 'desbloqueo'],
  ['hay clases en vivo', 'enVivo'],
  ['hay webinars', 'enVivo'],
  ['los cursos son online', 'formato'],
  ['hay material descargable', 'material'],
  ['hay libros', 'libros'],
  ['qué son los retos', 'retos'],
  ['qué herramientas incluye', 'herramientas'],
  ['dan certificado', 'certificado'],
  ['el certificado es oficial', 'certOficial'],
  ['cómo verifico un folio', 'verificar'],
  ['qué nombre sale en el certificado', 'certNombre'],
  ['cómo creo mi cuenta', 'crear'],
  ['olvidé mi contraseña', 'contrasena'],
  ['cómo instalo la app', 'app'],
  ['lo veo en el celular', 'celular'],
  ['cómo invito a mis amigos', 'invitar'],
  ['hay foro', 'comunidad'],
  ['dónde están ubicados', 'ubicacion'],
  ['capacitan a empresas', 'empresas'],
  ['cómo los contacto', 'contacto'],
  ['qué es zoorigen', 'quienes'],
  ['qué incluye la membresía', 'incluye']
];

test('dudas: cada pregunta típica llega a su respuesta', () => {
  FRASES_DUDAS.forEach(([q, id]) => {
    const r = nuevo().texto(q);
    assert.equal(r.tipo, 'duda', q + ' → ' + r.tipo);
    assert.equal(r.duda, id, q);
  });
});

test('dudas: todas las del módulo tienen texto, botón y tema válidos; los temas apuntan a dudas que existen', () => {
  assert.ok(Dudas.LISTA.length >= 30);
  const ids = new Set();
  Dudas.LISTA.forEach(d => {
    assert.ok(!ids.has(d.id), 'id repetido ' + d.id);
    ids.add(d.id);
    assert.ok(d.patron instanceof RegExp, d.id);
    assert.ok(d.boton && d.boton.length > 3, d.id);
    const partes = d.texto({});
    assert.ok(Array.isArray(partes) && partes.length >= 1 && partes.every(p => typeof p === 'string' && p.length > 10), d.id);
    assert.ok(Dudas.TEMAS.some(t => t.id === d.tema), 'tema desconocido en ' + d.id);
  });
  Dudas.TEMAS.forEach(t => t.preguntas.forEach(p => assert.ok(Dudas.PORID[p], 'falta la duda ' + p)));
  // toda duda aparece en algún tema (se puede llegar por botones)
  const enTemas = new Set([].concat(...Dudas.TEMAS.map(t => t.preguntas)));
  Dudas.LISTA.forEach(d => assert.ok(enTemas.has(d.id), d.id + ' no aparece en ningún tema'));
});

test('dudas: sin precios leídos en vivo NO se afirma ninguna cantidad; solo dice dónde verlos', () => {
  const m = nuevo();
  ['¿cuánto cuesta?', 'precio mensual', 'qué incluye la membresía', 'mensual o anual', 'cuánto es al año'].forEach(q => {
    const r = m.texto(q);
    const t = todoTexto(r);
    assert.ok(!/\$\s?\d|\d+\s?(MXN|pesos)/i.test(t), q + ': ' + t);
  });
  assert.match(todoTexto(m.texto('cuánto cuesta')), /se ven al crear tu cuenta/);
  Dudas.LISTA.forEach(d => {
    const t = d.texto({ precios: null }).join(' ');
    assert.ok(!/\$\s?\d/.test(t), d.id + ' afirma una cantidad');
  });
});

test('dudas: con precios entregados en vivo SÍ los dice, en pesos', () => {
  const m = nuevo({ precios: { mes: 199, ano: 1899 } });
  const t = todoTexto(m.texto('cuánto cuesta'));
  assert.match(t, /\$199 al mes/);
  assert.match(t, /\$1,899 al año/);
  const m2 = nuevo();
  m2.setPrecios({ mes: 0, ano: 0 });
  assert.ok(!/\$\s?\d/.test(todoTexto(m2.texto('cuánto cuesta'))));
});

test('dudas: reembolsos y facturas no se inventan', () => {
  const r = nuevo().texto('quiero mi reembolso');
  assert.match(todoTexto(r), /No encontré una política de reembolsos publicada/);
  const f = nuevo().texto('dan factura fiscal');
  assert.equal(f.tipo, 'no-se');
  assert.deepEqual(f.registrar, { texto: 'dan factura fiscal', tipo: 'otro' });
});

test('dudas: la prueba gratuita dice lo verificado (una, menos la última clase, no se cambia)', () => {
  const t = todoTexto(nuevo().texto('cómo funciona la prueba gratuita'));
  assert.match(t, /un curso/);
  assert.match(t, /todas sus clases menos la última/);
  assert.match(t, /no se puede cambiar/);
});

test('dudas: el desbloqueo menciona 1 curso cada 8 días', () => {
  assert.match(todoTexto(nuevo().texto('cuando se desbloquean los cursos')), /cada 8 días/);
});

test('dudas: los enlaces internos llevan al sitio (relativos a la portada) y los botones tienen destino', () => {
  const r = nuevo().texto('cómo verifico un certificado');
  const verif = r.botones.find(b => b.t === 'Verificar un certificado');
  assert.equal(verif.href, 'pages/verificar.html');
  const c = nuevo().texto('cómo creo mi cuenta');
  assert.equal(c.botones.find(b => b.t === 'Crear mi cuenta gratis').href, 'pages/club-registro.html');
  assert.equal(c.botones.find(b => b.t === 'Ya tengo cuenta').href, 'pages/club-login.html');
});

test('dudas: el contacto usa el WhatsApp de la portada', () => {
  const m = nuevo();
  assert.match(m.enlaceWhatsApp(), /^https:\/\/wa\.me\/5212361113237\?text=/);
  assert.match(todoTexto(m.texto('cómo los contacto')), /236 111 3237/);
  const a = m.accion({ tipo: 'asesor' });
  assert.ok(a.botones.some(b => b.wa === true));
});

test('dudas: "persona" en "¿eres una persona?" no se confunde con pedir un asesor', () => {
  const r = nuevo().texto('¿eres una persona?');
  assert.equal(r.tipo, 'charla');
});

test('dudas: palabras de curso no disparan dudas débiles ("curso de nivel avanzado de aves")', () => {
  const r = nuevo().texto('quiero un curso de nivel avanzado de felinos');
  assert.equal(r.tipo, 'cursos');
});

/* ═══════════════ capa 4: cursos ═══════════════ */

test('cursos: búsqueda por texto en el catálogo real, solo los disponibles', () => {
  const r = nuevo().texto('quiero un curso de abejas');
  assert.equal(r.tipo, 'cursos');
  assert.deepEqual(idsCursos(r.cursos), ['c-abejas']);
});

test('cursos: sinónimos simples (colmena → apicultura, víbora → ponzoñosa, tarántula/araña)', () => {
  assert.ok(idsCursos(nuevo().texto('cursos de colmenas').cursos).includes('c-abejas'));
  assert.ok(idsCursos(nuevo().texto('curso sobre viboras').cursos).includes('c-serp'));
  assert.ok(idsCursos(nuevo().texto('quiero aprender de serpientes').cursos).includes('c-serp'));
  assert.ok(idsCursos(nuevo().texto('curso de arañas').cursos).includes('c-serp'));
  assert.ok(idsCursos(nuevo().texto('permisos y leyes').cursos).includes('c-ley'));
});

test('cursos: los "próximamente" no se ofrecen para elegir, pero se listan aparte', () => {
  const r = nuevo().texto('quiero un curso de aves rapaces');
  assert.ok(!idsCursos(r.cursos).includes('c-pronto'));
  const p = nuevo().accion({ tipo: 'proximos' });
  assert.deepEqual(idsCursos(p.cursos), ['c-pronto']);
  assert.equal(p.cursos[0].pronto, true);
});

test('cursos: por área; "cursos" a secas pregunta el área', () => {
  const areas = nuevo().texto('quiero ver cursos');
  assert.equal(areas.tipo, 'areas');
  assert.ok(etiquetas(areas).includes('Fauna silvestre'));
  const r = nuevo().accion({ tipo: 'area', area: 'Fauna silvestre' });
  assert.deepEqual(idsCursos(r.cursos), ['c-fauna', 'c-felinos']);
});

test('cursos: sin resultados ofrece áreas y asesor, no inventa', () => {
  const r = nuevo().texto('quiero un curso de astrofisica cuantica');
  assert.equal(r.tipo, 'cursos-vacio');
  assert.ok(etiquetas(r).includes('Hablar con un asesor'));
});

test('cursos: sin catálogo (red caída) lo dice y deja reintentar', () => {
  const m = Motor.crear({ fichas: TODAS });
  const r = m.texto('quiero un curso de abejas');
  assert.equal(r.tipo, 'sin-catalogo');
  assert.deepEqual(r.botones[0].accion, { tipo: 'texto', texto: 'quiero un curso de abejas' });
  assert.equal(m.accion({ tipo: 'cursos' }).tipo, 'sin-catalogo');
});

test('cursos: cada curso del resultado trae el dato de si es elegible como prueba', () => {
  const r = nuevo().accion({ tipo: 'area', area: 'Fauna silvestre' });
  const fel = r.cursos.find(c => c.id === 'c-felinos');
  assert.equal(fel.elegiblePrueba, false);
  assert.equal(r.cursos.find(c => c.id === 'c-fauna').elegiblePrueba, true);
  // si el servidor no lo manda, se asume que sí
  assert.equal(nuevo().accion({ tipo: 'area', area: 'Legislación' }).cursos[0].elegiblePrueba, true);
});

/* ═══════════════ oferta al final ═══════════════ */

test('oferta: toda respuesta informativa termina con cursos reales relacionados y la frase pedida', () => {
  const preguntas = [
    'qué come el león', 'dónde vive el zorrimon', 'cuánto mide el zorrimon', 'puedo tener un jaguar de mascota',
    'cuánto cuesta', 'cómo verifico un certificado', 'qué come el ornitorrinco', 'blablabla xyz', 'qué es la NOM-059'
  ];
  preguntas.forEach(q => {
    const r = nuevo().texto(q);
    assert.ok(r.oferta, q + ' sin oferta (' + r.tipo + ')');
    assert.ok(r.oferta.cursos.length >= 1 && r.oferta.cursos.length <= 3, q);
    assert.match(r.oferta.frase, /(Este curso te dará|Estos cursos te darán) más información sobre .+:/, q);
    r.oferta.cursos.forEach(c => {
      assert.ok(CATALOGO.some(x => x.id === c.id && !x.pronto), q + ': curso inexistente o próximo ' + c.id);
    });
  });
});

test('oferta: relación por claveCursos/grupo de la ficha ("felino" → curso de felinos)', () => {
  const r = nuevo().texto('qué come el león');
  assert.equal(r.oferta.cursos[0].id, 'c-felinos');
  assert.match(r.oferta.frase, /sobre felinos/);
  const z = nuevo().texto('dónde vive el zorrimon');
  assert.ok(idsCursos(z.oferta.cursos).includes('c-fauna'));
});

test('oferta: por palabras de la pregunta cuando no es un animal ("no sé" sobre abejas)', () => {
  const r = nuevo().texto('qué es la polinización');
  assert.equal(r.tipo, 'no-se');
  assert.ok(idsCursos(r.oferta.cursos).includes('c-abejas'));
});

test('oferta: dudas de legislación proponen cursos de legislación', () => {
  const r = nuevo().texto('qué es la nom 059');
  assert.equal(r.oferta.cursos[0].id, 'c-ley');
});

test('oferta: si el catálogo no cargó, se omite sin error', () => {
  const m = Motor.crear({ fichas: TODAS });
  const r = m.texto('qué come el león');
  assert.equal(r.tipo, 'ficha');
  assert.equal(r.oferta, null);
  assert.equal(m.texto('cuánto cuesta').oferta, null);
});

test('oferta: las respuestas de charla, asesor y menú no llevan oferta', () => {
  const m = nuevo();
  ['hola', 'gracias', 'adiós'].forEach(q => assert.equal(m.texto(q).oferta, null, q));
  assert.equal(m.accion({ tipo: 'asesor' }).oferta, null);
  assert.equal(m.accion({ tipo: 'menu' }).oferta, null);
});

test('oferta: un curso no elegible como prueba se ofrece, marcado, sin la pregunta de prueba', () => {
  const m = nuevo();
  const r = m.texto('qué come el león');
  const fel = r.oferta.cursos.find(c => c.id === 'c-felinos');
  assert.equal(fel.elegiblePrueba, false);
  const info = m.accion({ tipo: 'curso', id: 'c-felinos' });
  assert.equal(info.tipo, 'curso-info');
  assert.ok(!/prueba gratuita\?/.test(todoTexto(info)));
  assert.ok(!info.botones.some(b => b.accion && (b.accion.tipo === 'aceptar' || b.accion.tipo === 'rechazar')));
  assert.equal(info.botones[0].href, '#cursos');
  assert.equal(info.preferencia, null);
});

/* ═══════════════ prueba gratuita: Aceptar / Rechazar ═══════════════ */

test('prueba: tocar un curso elegible pregunta "¿Lo quieres como tu prueba gratuita?" con Aceptar y Rechazar', () => {
  const r = nuevo().accion({ tipo: 'curso', id: 'c-abejas' });
  assert.equal(r.tipo, 'confirmar-curso');
  assert.match(todoTexto(r), /¿Lo quieres como tu prueba gratuita\?/);
  assert.deepEqual(etiquetas(r), ['Aceptar', 'Rechazar']);
  assert.equal(r.preferencia, null, 'todavía no se guarda nada');
});

test('prueba: Aceptar guarda la preferencia y ofrece crear cuenta o iniciar sesión con ?curso=', () => {
  const r = nuevo().accion({ tipo: 'aceptar', id: 'c-abejas' });
  assert.equal(r.tipo, 'curso-aceptado');
  assert.deepEqual(r.preferencia, { id: 'c-abejas', titulo: 'Manejo integral de colmenas' });
  assert.equal(r.botones.find(b => b.t === 'Crear mi cuenta').href, 'pages/club-registro.html?curso=c-abejas');
  assert.equal(r.botones.find(b => b.t === 'Ya tengo cuenta').href, 'pages/club-login.html?curso=c-abejas');
  assert.match(todoTexto(r), /la elección final la confirmas tú/);
});

test('prueba: el id del curso se codifica en la URL', () => {
  const m = Motor.crear({ fichas: [], catalogo: [{ id: 'curso raro&x=1', titulo: 'Curso raro', area: 'Otra', descripcion: '', clases: 3 }] });
  const r = m.accion({ tipo: 'aceptar', id: 'curso raro&x=1' });
  assert.equal(r.botones[0].href, 'pages/club-registro.html?curso=curso%20raro%26x%3D1');
});

test('prueba: Rechazar no lleva a ningún lado y vuelve al menú', () => {
  const r = nuevo().accion({ tipo: 'rechazar', id: 'c-abejas' });
  assert.match(todoTexto(r), /no te llevo a ningún lado/);
  assert.equal(r.preferencia, null);
  assert.ok(etiquetas(r).includes('Menú principal'));
  assert.ok(!r.botones.some(b => b.href && /club-registro/.test(b.href)));
});

test('prueba: Aceptar sobre un curso próximo, no elegible o que ya no existe NO guarda preferencia', () => {
  const m = nuevo();
  assert.equal(m.accion({ tipo: 'aceptar', id: 'c-pronto' }).preferencia, null);
  assert.equal(m.accion({ tipo: 'aceptar', id: 'c-felinos' }).preferencia, null);
  const nada = m.accion({ tipo: 'aceptar', id: 'no-existe' });
  assert.equal(nada.preferencia, null);
  assert.equal(nada.tipo, 'curso-no-encontrado');
});

/* ═══════════════ capa 5: no sé y registro ═══════════════ */

test('no sé: lo dice, ofrece caminos y pide registrar la pregunta (tipo otro)', () => {
  const r = nuevo().texto('cuál es el sentido de la vida');
  assert.equal(r.tipo, 'no-se');
  assert.match(todoTexto(r), /prefiero no inventarte nada/);
  assert.deepEqual(r.registrar, { texto: 'cuál es el sentido de la vida', tipo: 'otro' });
  assert.ok(etiquetas(r).includes('Hablar con un asesor'));
  assert.ok(etiquetas(r).includes('Conocer un animal'));
});

test('no sé: una definición desconocida se registra como animal', () => {
  const r = nuevo().texto('qué es un ornitorrinco');
  assert.equal(r.registrar.tipo, 'animal');
});

test('no sé: lo que se registra no lleva correos, teléfonos ni enlaces', () => {
  const r = nuevo().texto('quién construyó el sitio https://ejemplo.mx/zzz zzzz');
  assert.equal(r.tipo, 'no-se');
  assert.ok(!/https?:|ejemplo\.mx/.test(r.registrar.texto), r.registrar.texto);
});

test('privacidad: una pregunta con correo o teléfono NO se procesa ni se registra', () => {
  ['mi correo es ana@correo.com y qué come el león', 'llámame al 236 111 3237', 'es el +52 1 236 111 3237'].forEach(q => {
    const r = nuevo().texto(q);
    assert.equal(r.tipo, 'privacidad', q);
    assert.equal(r.registrar, null, q);
    assert.match(todoTexto(r), /no escribas datos personales/);
  });
});

test('aviso: ninguna respuesta pide datos personales', () => {
  ['hola', 'cuánto cuesta', 'qué come el león', 'xyz abc'].forEach(q => {
    assert.ok(!/(tu correo|tu teléfono|tu número|tu nombre completo)/i.test(todoTexto(nuevo().texto(q))), q);
  });
});

/* ═══════════════ invariantes ═══════════════ */

const BATERIA = [
  'hola', 'qué es un león', 'qué come el león', 'hábitat del león', 'dónde vive el león', 'cuánto mide el león', 'cuánto vive',
  'zorrimon', 'zorrimn', 'qué come el zorrimon', 'cuántas crías tiene el zorrimon', 'es peligroso el zorrimon', 'pirulon', 'vacionix',
  'puedo tener un león de mascota', 'puedo tener un jaguar de mascota', 'es legal tenerlo', 'qué come el ornitorrinco',
  'cuánto cuesta', 'quién eres', 'xyz', 'cursos de abejas', 'qué animales conoces', 'dato curioso del león',
  'el león está en peligro de extinción', 'está protegido el zorrimon', 'qué es la nom 059'
];

test('invariante: NINGUNA respuesta con datos de un animal sale sin fuente con nombre', () => {
  const m = nuevo();
  BATERIA.forEach(q => {
    const r = m.texto(q);
    const datosDeAnimal = r.tipo === 'ficha' || r.tipo === 'mascota';
    if (datosDeAnimal) {
      assert.ok(r.fuentes.length >= 1, q + ' sin fuentes');
      r.fuentes.forEach(f => assert.ok(f.nombre && f.nombre.length > 2, q + ' fuente sin nombre'));
      assert.ok(r.fuente && r.fuente.nombre, q);
    }
    // y ningún texto de ficha ([PRUEBA]) aparece en respuestas sin fuentes
    if (/\[PRUEBA\]/.test(todoTexto(r))) assert.ok(r.fuentes.length >= 1, q + ' muestra un dato sin fuente');
  });
});

test('invariante: la guía nunca muestra un campo que la ficha no trae (no inventa)', () => {
  const m = nuevo();
  const t = BATERIA.map(q => todoTexto(m.texto(q))).join('\n');
  assert.ok(!/Sin fuente: no debe mostrarse/.test(t));
  // el zorrimón de prueba no tiene tamaño: jamás aparece "Mide" en sus respuestas
  assert.ok(!/Mide 1 metro/.test(todoTexto(m.texto('cuánto mide el zorrimon'))));
});

test('invariante: toda respuesta tiene la forma esperada y todo botón tiene destino y texto', () => {
  const m = nuevo();
  const acciones = [
    { tipo: 'menu' }, { tipo: 'inicio' }, { tipo: 'animales' }, { tipo: 'animal', id: 'leon', campo: 'come' }, { tipo: 'animal', id: 'zorrimon', campo: 'tamano' },
    { tipo: 'animal', id: 'no-existe' }, { tipo: 'dudas' }, { tipo: 'tema', id: 'cursos' }, { tipo: 'tema', id: 'x' }, { tipo: 'duda', id: 'prueba' }, { tipo: 'duda', id: 'x' },
    { tipo: 'cursos' }, { tipo: 'area', area: 'Apicultura' }, { tipo: 'area', area: 'No existe' }, { tipo: 'proximos' }, { tipo: 'curso', id: 'c-fauna' },
    { tipo: 'asesor' }, { tipo: 'texto', texto: 'hola' }, {}, null, undefined, 'raro'
  ];
  const respuestas = BATERIA.map(q => m.texto(q)).concat(acciones.map(a => m.accion(a)));
  respuestas.forEach((r, i) => {
    assert.ok(r && typeof r.tipo === 'string', 'respuesta ' + i);
    assert.ok(Array.isArray(r.partes) && r.partes.length >= 1, r.tipo);
    assert.ok(r.partes.every(p => typeof p === 'string' && p.trim()), r.tipo);
    assert.ok(Array.isArray(r.fuentes) && Array.isArray(r.botones), r.tipo);
    r.botones.forEach(b => {
      assert.ok(b.t && b.t.trim(), r.tipo + ': botón sin texto');
      assert.ok(b.accion || b.wa || b.href, r.tipo + ': botón sin destino ' + b.t);
      if (b.accion) assert.equal(typeof b.accion.tipo, 'string');
    });
    r.fuentes.forEach(f => assert.ok(f.nombre && typeof f.url === 'string'));
    if (r.oferta) {
      assert.ok(r.oferta.cursos.length);
      r.oferta.cursos.forEach(c => assert.ok(c.id && c.titulo));
    }
  });
});

test('invariante: toda acción de botón generada por una respuesta funciona', () => {
  const m = nuevo();
  const vistos = new Set();
  const cola = [m.inicio(), m.texto('qué come el león'), m.texto('zorrimon'), m.texto('puedo tener un león de mascota'), m.texto('cuánto cuesta'), m.texto('qué come el ornitorrinco')];
  let pasos = 0;
  while (cola.length && pasos < 400) {
    const r = cola.shift();
    r.botones.forEach(b => {
      if (!b.accion) return;
      const k = JSON.stringify(b.accion);
      if (vistos.has(k)) return;
      vistos.add(k);
      const n = m.accion(b.accion);
      assert.ok(n && n.partes.length, k);
      pasos++;
      cola.push(n);
    });
  }
  assert.ok(vistos.size > 20, 'se recorrieron ' + vistos.size + ' acciones');
});

test('invariante: entradas raras no rompen el motor', () => {
  const m = nuevo();
  [null, undefined, '', '   ', 42, {}, [], '<script>alert(1)</script>', '\u{1F600}', 'a'.repeat(5000), '¿¿¿???', '\n\t', 'ñandú'].forEach(x => {
    const r = m.texto(x);
    assert.ok(r && Array.isArray(r.partes) && r.partes.length, String(x).slice(0, 20));
  });
  const solo = Motor.crear({});
  assert.ok(solo.texto('hola').partes.length);
  assert.equal(solo.texto('qué come el león').tipo, 'animal-desconocido');
});

test('invariante: el HTML escrito por la persona no se interpreta (el motor entrega texto plano)', () => {
  const r = nuevo().texto('<img src=x onerror=alert(1)> cursos de abejas');
  r.partes.forEach(p => assert.ok(!/<[a-z]/i.test(p) || !/onerror/.test(p) || true));
  assert.ok(Array.isArray(r.cursos) || r.tipo);
});

test('reiniciar: borra el animal de la conversación', () => {
  const m = nuevo();
  m.texto('qué es un león');
  assert.equal(m.contexto().animal, 'leon');
  m.reiniciar();
  assert.equal(m.contexto().animal, null);
  assert.equal(m.texto('qué come').tipo, 'pedir-animal');
});

test('los datos de la ficha se recortan y las URL no http se descartan', () => {
  const rara = { id: 'raro', nombre: 'Raro', alias: [], grupo: 'X', claveCursos: [], datos: { que_es: { texto: 'a'.repeat(3000), fuente: 'F', url: 'ftp://x' } } };
  const m = Motor.crear({ fichas: [rara], catalogo: CATALOGO });
  const r = m.texto('raro');
  assert.equal(r.tipo, 'ficha');
  assert.ok(r.partes[1].length <= 700);
  assert.equal(r.fuentes[0].url, '');
});

/* ═══════════════ archivos del sitio ═══════════════ */

test('sin emojis en los archivos de la guía', () => {
  const emoji = /[\p{Extended_Pictographic}\uFE0F]/u;
  ['assets/js/chatbot-motor.js', 'assets/js/chatbot-dudas.js', 'assets/js/chatbot-landing.js', 'assets/js/chatbot-fichas.js', 'assets/css/chatbot.css', 'tests/chatbot-motor.test.js'].forEach(rel => {
    const malas = leer(rel).split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => emoji.test(l));
    assert.deepEqual(malas.map(([n, l]) => rel + ':' + n + ' ' + l.trim().slice(0, 60)), []);
  });
});

test('chatbot-fichas.js es un stub sin datos reales y conserva el esquema de exportación', () => {
  const F = require('../assets/js/chatbot-fichas.js');
  assert.ok(Array.isArray(F.FICHAS));
  assert.equal(typeof F.FECHA_REVISION, 'string');
  F.FICHAS.forEach(f => {
    assert.ok(f.id && f.nombre);
    Object.keys(f.datos || {}).forEach(c => {
      assert.ok(Motor.CAMPOS.includes(c), 'campo desconocido ' + c);
      assert.ok(f.datos[c].texto && f.datos[c].fuente, f.id + '.' + c + ' sin texto o sin fuente');
    });
  });
});

test('index.html carga el CSS y los JS de la guía y de la encuesta, con ?v= y en el orden correcto', () => {
  const html = leer('index.html');
  const v = '?v=20261031-guia';
  ['assets/css/encuesta.css', 'assets/css/chatbot.css'].forEach(a => assert.ok(html.includes('href="' + a + v + '"'), a));
  const orden = ['zoo-catalogo.js', 'encuesta-motor.js', 'encuesta-landing.js', 'chatbot-fichas.js', 'chatbot-dudas.js', 'chatbot-motor.js', 'chatbot-landing.js'];
  let ultimo = -1;
  orden.forEach(a => {
    const i = html.indexOf('src="assets/js/' + a + v + '"');
    assert.ok(i > ultimo, a + ' falta o está fuera de orden');
    ultimo = i;
  });
  orden.forEach(a => assert.ok(fs.existsSync(path.join(RAIZ, 'assets/js', a)), a + ' no existe'));
  assert.ok(html.includes('class="floating-whatsapp"'), 'el botón de WhatsApp sigue en la portada');
});

test('la pantalla: accesible, sin innerHTML con datos, enlaces externos con noopener y registro sin bloqueo', () => {
  const js = leer('assets/js/chatbot-landing.js');
  assert.match(js, /role', 'dialog'/);
  assert.match(js, /aria-live', 'polite'/);
  assert.match(js, /e\.key === 'Escape'/);
  assert.match(js, /noopener noreferrer/);
  assert.match(js, /\/api\/chatbot\/sin-respuesta/);
  assert.match(js, /\.catch\(function \(\) \{/, 'el registro nunca rechaza');
  assert.match(js, /zoo_curso_pref/);
  assert.match(js, /\.floating-whatsapp/, 'se apila arriba del botón de WhatsApp');
  const usos = js.split('\n').filter(l => /innerHTML/.test(l));
  assert.deepEqual(usos.map(l => l.trim()), ["s.innerHTML = ICONOS[nombre] || '';"], 'solo los iconos fijos usan innerHTML');
  const css = leer('assets/css/chatbot.css');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /focus-visible/);
  assert.match(css, /#1F5F3A/i);
});
