'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Q = require('../assets/js/club-quiz.js');

test('verdadero/falso: se guarda con correcta 0 (Verdadero) o 1 (Falso)', () => {
  assert.deepEqual(Q.validarPregunta({ pregunta: '  La   abeja reina pone huevos  ', tipo: 'vof', correcta: 0 }).pregunta,
    { pregunta: 'La abeja reina pone huevos', tipo: 'vof', correcta: 0 });
  assert.equal(Q.validarPregunta({ pregunta: 'x', tipo: 'vof', correcta: 1 }).pregunta.correcta, 1);
  assert.equal(Q.validarPregunta({ pregunta: 'x', tipo: 'vof', correcta: 7 }).pregunta.correcta, 0, 'un valor raro se vuelve 0');
  assert.equal(Q.validarPregunta({ pregunta: 'x' }).pregunta.tipo, 'vof', 'sin tipo se toma verdadero/falso');
});

test('opción múltiple: mínimo 2 opciones con texto y una correcta marcada', () => {
  const ok = Q.validarPregunta({ pregunta: '¿Qué produce polen?', tipo: 'multiple', opciones: ['Flor', 'Roca'], correcta: 0 });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.pregunta.opciones, ['Flor', 'Roca']);
  assert.match(Q.validarPregunta({ pregunta: 'x', tipo: 'multiple', opciones: ['solo una', ''], correcta: 0 }).error, /al menos 2/);
  assert.match(Q.validarPregunta({ pregunta: 'x', tipo: 'multiple', opciones: ['a', 'b'], correcta: 5 }).error, /correcta/);
  assert.match(Q.validarPregunta({ pregunta: 'x', tipo: 'multiple', opciones: ['a', 'b'] }).error, /correcta/, 'sin correcta marcada');
  assert.match(Q.validarPregunta({ pregunta: 'x', tipo: 'multiple', opciones: ['a', '', 'c'], correcta: 1 }).error, /vacía/);
});

test('al quitar opciones vacías la respuesta correcta sigue apuntando a la MISMA opción', () => {
  const r = Q.validarPregunta({ pregunta: '¿Cuál?', tipo: 'multiple', opciones: ['A', '', 'C', 'D'], correcta: 3 });
  assert.deepEqual(r.pregunta.opciones, ['A', 'C', 'D']);
  assert.equal(r.pregunta.opciones[r.pregunta.correcta], 'D');
});

test('una fila totalmente vacía se descarta sin avisar; sin texto pero con opciones sí avisa', () => {
  assert.equal(Q.validarPregunta({ pregunta: '  ', tipo: 'vof' }).vacia, true);
  assert.equal(Q.validarPregunta(null).vacia, true);
  assert.equal(Q.validarPregunta({ pregunta: '', tipo: 'multiple', opciones: ['a', 'b'], correcta: 0 }).error, 'escribe el texto de la pregunta');
});

test('limpiarPreguntas: numera los errores y respeta el tope', () => {
  const r = Q.limpiarPreguntas([
    { pregunta: 'ok', tipo: 'vof', correcta: 0 },
    { pregunta: '', tipo: 'vof' },
    { pregunta: 'x', tipo: 'multiple', opciones: ['a'], correcta: 0 }
  ]);
  assert.equal(r.preguntas.length, 1);
  assert.deepEqual(r.errores.map(e => e.mensaje), ['Pregunta 3: necesita al menos 2 opciones con texto']);
  const muchas = Array.from({ length: 40 }, (_, i) => ({ pregunta: 'p' + i, tipo: 'vof', correcta: 0 }));
  assert.equal(Q.limpiarPreguntas(muchas).preguntas.length, Q.REGLAS.maxPreguntas);
  assert.deepEqual(Q.limpiarPreguntas('no es lista'), { preguntas: [], errores: [] });
});

test('textos largos se recortan y el HTML no se interpreta (se muestra como texto)', () => {
  const r = Q.validarPregunta({ pregunta: '<img src=x onerror=alert(1)>' + 'a'.repeat(500), tipo: 'vof', correcta: 0 });
  assert.equal(r.pregunta.pregunta.length, Q.REGLAS.textoMax);
  // La pantalla usa textContent (nunca innerHTML) para estos textos:
  const fuente = fs.readFileSync(require.resolve('../assets/js/club-quiz.js'), 'utf8');
  assert.equal(/innerHTML/.test(fuente), false, 'club-quiz.js no debe usar innerHTML');
});

test('calificar: cuenta aciertos, marca la correcta y trata lo no respondido como fallo', () => {
  const preguntas = [
    { pregunta: 'a', tipo: 'vof', correcta: 1 },
    { pregunta: 'b', tipo: 'multiple', opciones: ['x', 'y', 'z'], correcta: 2 },
    { pregunta: 'c', tipo: 'vof', correcta: 0 }
  ];
  const n = Q.calificar(preguntas, [1, 0, null]);
  assert.equal(n.total, 3);
  assert.equal(n.correctas, 1);
  assert.deepEqual(n.detalle.map(d => d.acertada), [true, false, false]);
  assert.equal(n.detalle[1].correcta, 2);
  assert.deepEqual(Q.calificar(preguntas, undefined).correctas, 0);
  assert.equal(Q.calificar(null, null).total, 0);
});

test('preguntasDeClase solo devuelve preguntas válidas (datos dañados no rompen la clase)', () => {
  assert.deepEqual(Q.preguntasDeClase({}), []);
  assert.deepEqual(Q.preguntasDeClase({ preguntas: 'basura' }), []);
  assert.equal(Q.preguntasDeClase({ preguntas: [{ pregunta: 'ok' }, { tipo: 'multiple', pregunta: 'mal', opciones: ['a'] }, 5, null] }).length, 1);
});

test('opcionesDe: verdadero/falso fijo; múltiple usa las propias', () => {
  assert.deepEqual(Q.opcionesDe({ tipo: 'vof' }), ['Verdadero', 'Falso']);
  assert.deepEqual(Q.opcionesDe({ tipo: 'multiple', opciones: ['a', 'b'] }), ['a', 'b']);
});

test('abrir(): sin navegador o sin preguntas válidas no revienta y deja continuar', () => {
  let n = 0;
  assert.equal(Q.abrir([], { alTerminar: () => n++ }), null);
  assert.equal(Q.abrir([{ pregunta: 'x', tipo: 'vof' }], { alTerminar: () => n++ }), null, 'en Node no hay pantalla');
  assert.equal(n, 2);
});
