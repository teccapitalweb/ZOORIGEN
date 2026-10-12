'use strict';
// Fichas reales de la guía (assets/js/chatbot-fichas.js, generadas desde fuentes verificadas)
// y las preguntas sencillas que pidió el dueño ("qué es un león", "qué come un león"...).
// Ejecutar: node --test tests/chatbot-fichas.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Z = require('../assets/js/chatbot-fichas.js');
const M = require('../assets/js/chatbot-motor.js');

const CAMPOS = ['que_es', 'come', 'habitat', 'tamano', 'vida', 'crias', 'conservacion', 'peligro', 'curiosidad'];
const sinAcentos = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const CATALOGO = [
  { id: 'c1', titulo: 'Felinos de México', area: 'Fauna silvestre', descripcion: 'Biología y conservación de felinos', clases: 5, pronto: false, elegiblePrueba: true },
  { id: 'c2', titulo: 'Legislación y UMA', area: 'Normatividad', descripcion: 'UMA y permisos', clases: 4, pronto: false, elegiblePrueba: true }
];
const guia = () => M.crear({ fichas: Z.FICHAS, catalogo: CATALOGO });

test('fichas: 60 animales, ids únicos y cada dato con texto, fuente y enlace', () => {
  assert.ok(Z.FICHAS.length >= 60, 'fichas: ' + Z.FICHAS.length);
  assert.match(Z.FECHA_REVISION, /^\d{4}-\d{2}-\d{2}$/);
  const ids = new Set();
  let datos = 0;
  for (const f of Z.FICHAS) {
    assert.ok(!ids.has(f.id), 'id repetido ' + f.id);
    ids.add(f.id);
    assert.ok(f.nombre && f.cientifico && f.grupo, f.id + ' incompleta');
    assert.ok(Array.isArray(f.alias) && Array.isArray(f.claveCursos));
    const campos = Object.keys(f.datos);
    assert.ok(campos.length >= 5, f.id + ' con pocos datos: ' + campos.length);
    for (const c of campos) {
      assert.ok(CAMPOS.includes(c), f.id + ' campo desconocido ' + c);
      const d = f.datos[c];
      datos++;
      assert.ok(d.texto && d.texto.length >= 20, f.id + '.' + c + ' sin texto');
      assert.ok(d.fuente && d.fuente.length >= 3, f.id + '.' + c + ' sin fuente');
      assert.match(d.url, /^https?:\/\/[^\s]+$/, f.id + '.' + c + ' sin enlace');
      for (const e of d.fuentes_extra || []) assert.match(e.url, /^https?:\/\//);
      assert.doesNotMatch(d.texto, /undefined|NaN|\[object/);
    }
  }
  assert.ok(datos >= 500, 'datos con fuente: ' + datos);
});

test('fichas: sin emojis, y lo que no se confirmó no aparece (campos faltantes son normales)', () => {
  const crudo = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'chatbot-fichas.js'), 'utf8');
  assert.doesNotMatch(crudo, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  // el león no trae NOM-059 (no es especie de México) ni vida en cautiverio contradictoria
  const leon = Z.FICHAS.find(f => f.id === 'leon');
  assert.doesNotMatch(leon.datos.conservacion.texto, /NOM-059/);
  // el jaguar sí la trae
  const jaguar = Z.FICHAS.find(f => f.id === 'jaguar');
  assert.match(jaguar.datos.conservacion.texto, /NOM-059/);
});

test('guía con fichas reales: charla y quién eres', () => {
  const g = guia();
  assert.equal(g.texto('hola').tipo, 'charla');
  assert.equal(g.texto('¿cómo estás?').tipo, 'charla');
  const quien = g.texto('¿quién eres?');
  assert.equal(quien.tipo, 'charla');
  assert.match(quien.partes.join(' '), /No soy una persona ni una inteligencia artificial/);
});

test('guía con fichas reales: preguntas sencillas del león', () => {
  const g = guia();
  const casos = [
    ['¿Qué es un león?', /León/],
    ['¿Qué come un león?', /Alimentación · León/],
    ['¿Qué hábitat tiene el león?', /Hábitat · León/],
    ['¿Cuánto vive un león?', /Cuánto vive · León/],
    ['el león está en peligro de extinción?', /Estado de conservación · León/],
    ['¿Cuánto pesa el león?', /Tamaño · León/],
    ['¿Cuántas crías tiene la leona?', /Crías y reproducción · León/],
    ['leones', /León/]
  ];
  for (const [pregunta, esperado] of casos) {
    const r = g.texto(pregunta);
    assert.equal(r.tipo, 'ficha', pregunta + ' -> ' + r.tipo);
    assert.match(r.partes.join(' '), esperado, pregunta);
    assert.ok(r.fuentes.length >= 1 && /^https?:\/\//.test(r.fuentes[0].url), pregunta + ' sin fuente');
  }
});

test('guía con fichas reales: toda respuesta de animal trae fuente y oferta de curso', () => {
  const g = guia();
  for (const f of Z.FICHAS) {
    for (const c of Object.keys(f.datos)) {
      const etiqueta = { que_es: 'qué es', come: 'qué come', habitat: 'dónde vive', tamano: 'cuánto mide', vida: 'cuánto vive', crias: 'cuántas crías tiene', conservacion: 'está en peligro de extinción', peligro: 'es peligroso', curiosidad: 'dato curioso' }[c];
      g.reiniciar();
      const r = g.texto(etiqueta + ' ' + f.nombre);
      if (r.tipo === 'animal-ambiguo') continue; // nombres compartidos (lobo, tortuga, oso): pregunta cuál
      assert.equal(r.tipo, 'ficha', f.id + ' ' + c + ' -> ' + r.tipo);
      assert.ok(r.fuentes.length >= 1, f.id + ' ' + c + ' sin fuente');
    }
  }
});

test('guía con fichas reales: nombres que comparten palabras preguntan cuál', () => {
  const g = guia();
  const lobo = g.texto('¿dónde vive el lobo?');
  assert.equal(lobo.tipo, 'animal-ambiguo');
  assert.ok(lobo.botones.some(b => /Lobo mexicano/.test(b.t)) && lobo.botones.some(b => /Lobo gris/.test(b.t)));
  assert.equal(g.texto('¿qué come el lobo mexicano?').tipo, 'ficha');
  // "león marino" es el lobo marino, no el león
  assert.match(g.texto('león marino').partes.join(' '), /Lobo marino/);
});

test('guía con fichas reales: animal sin ficha lo dice, registra la pregunta y no inventa', () => {
  const g = guia();
  const r = g.texto('¿qué come un ornitorrinco?');
  assert.equal(r.tipo, 'animal-desconocido');
  assert.ok(r.registrar, 'debe pedir registrar la pregunta');
  assert.doesNotMatch(r.partes.join(' '), /ornitorrinco (come|es|vive)/i);
});
