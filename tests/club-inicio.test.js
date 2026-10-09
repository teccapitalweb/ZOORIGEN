'use strict';
// Inicio: qué tarjeta de curso se muestra ("Continúa tu curso" / "Próximo desbloqueo")
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../assets/js/club-inicio.js');

const curso = (id, extra) => Object.assign({ id, title: 'Curso ' + id, area: 'Fauna', duration: '2 h', createdAt: '2026-01-0' + id + 'T00:00:00Z', lecciones: [{ titulo: 'a' }, { titulo: 'b' }, { titulo: 'c' }, { titulo: 'd' }] }, extra || {});

test('sin cursos', () => {
  assert.equal(I.elegirHero({ cursos: [] }).tipo, 'sin-cursos');
  assert.equal(I.elegirHero({}).tipo, 'sin-cursos');
});

test('miembro nuevo (día 0): se muestra algo coherente y nunca se rompe', () => {
  const h = I.elegirHero({ cursos: [curso('1'), curso('2')], dias: 0, progreso: {} });
  assert.ok(['continuar', 'proximo'].includes(h.tipo));
});

test('con muchos días como miembro hay cursos abiertos: se continúa el que ya empezó', () => {
  const cursos = [curso('1'), curso('2'), curso('3')];
  const h = I.elegirHero({ cursos, dias: 400, progreso: { 2: { completedLessons: [0, 1], isCompleted: false } } });
  assert.equal(h.tipo, 'continuar');
  assert.equal(h.curso.id, '2');
  assert.equal(h.hechas, 2);
  assert.equal(h.total, 4);
});

test('si nada ha empezado, se ofrece el primero abierto', () => {
  const h = I.elegirHero({ cursos: [curso('1'), curso('2')], dias: 400, progreso: {} });
  assert.equal(h.tipo, 'continuar');
  assert.equal(h.hechas, 0);
});

test('todo terminado y nada por abrir → terminado', () => {
  const cursos = [curso('1'), curso('2')];
  const hecho = { 1: { completedLessons: [0, 1, 2, 3], isCompleted: true }, 2: { completedLessons: [0, 1, 2, 3], isCompleted: true } };
  assert.equal(I.elegirHero({ cursos, dias: 400, progreso: hecho }).tipo, 'terminado');
});

test('un curso adelantado con premio cuenta como abierto', () => {
  const cursos = [curso('1'), curso('2'), curso('3')];
  const terminado1 = { 1: { completedLessons: [0, 1, 2, 3], isCompleted: true } };
  const sin = I.elegirHero({ cursos, dias: 0, progreso: terminado1 });
  assert.equal(sin.tipo, 'proximo');            // el 2 y el 3 aún no abren
  const con = I.elegirHero({ cursos, dias: 0, adelantados: ['3'], progreso: terminado1 });
  assert.equal(con.tipo, 'continuar');
  assert.equal(con.curso.id, '3');
});

test('el HTML escapa textos y solo acepta imágenes seguras', () => {
  const html = I.heroHTML({ tipo: 'continuar', curso: curso('1', { title: '<img src=x onerror=1>', image: 'javascript:alert(1)' }), hechas: 1, total: 4 });
  assert.ok(!/<img src=x/.test(html));
  assert.ok(!/javascript:/.test(html));
  assert.match(html, /1 de 4 clases · 25%/);
  assert.equal(I.imagenSegura('https://x.com/a.jpg'), 'https://x.com/a.jpg');
  assert.equal(I.imagenSegura('assets/img/cursos/a.jpg'), '../assets/img/cursos/a.jpg');
  assert.equal(I.imagenSegura('https://drive.google.com/file/d/1/view'), '');
  assert.equal(I.imagenSegura('http://x.com/a.jpg'), '');
  assert.match(I.heroHTML({ tipo: 'proximo', curso: curso('1'), diasFalta: 3 }, { ahora: new Date('2026-10-09T12:00:00') }), /en 3 días[\s\S]*12 oct/);
  assert.equal(I.textoDias(0), 'hoy');
  assert.equal(I.textoDias(1), 'mañana');
});
