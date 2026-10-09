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

test('resumen: cursos abiertos, clases hechas y total', () => {
  const cursos = [curso('1'), curso('2'), curso('3')];
  const h = I.elegirHero({ cursos, dias: 400, progreso: { 1: { completedLessons: [0, 1, 2, 3], isCompleted: true }, 2: { completedLessons: [0], isCompleted: false } } });
  assert.equal(h.resumen.cursosTotal, 3);
  assert.equal(h.resumen.cursosAbiertos, 3);
  assert.equal(h.resumen.clasesTotal, 12);
  assert.equal(h.resumen.clasesHechas, 5);
  assert.equal(I.elegirHero({ cursos: [] }).resumen.cursosTotal, 0);
});

test('el widget escapa textos y solo acepta imágenes seguras', () => {
  const html = I.widgetHTML({ tipo: 'continuar', curso: curso('1', { title: '<img src=x onerror=1>', image: 'javascript:alert(1)' }), hechas: 1, total: 4, resumen: { cursosAbiertos: 1, cursosTotal: 3, clasesHechas: 1, clasesTotal: 12 } });
  assert.ok(!/<img src=x/.test(html));
  assert.ok(!/javascript:/.test(html));
  assert.match(html, /1 de 4 clases · 25%/);
  assert.match(html, /Continúa tu curso./);
  assert.match(html, /Tu siguiente meta/);
  assert.equal(I.imagenSegura('https://x.com/a.jpg'), 'https://x.com/a.jpg');
  assert.equal(I.imagenSegura('assets/img/cursos/a.jpg'), '../assets/img/cursos/a.jpg');
  assert.equal(I.imagenSegura('https://drive.google.com/file/d/1/view'), '');
  assert.equal(I.imagenSegura('http://x.com/a.jpg'), '');
  assert.equal(I.textoDias(0), 'hoy');
  assert.equal(I.textoDias(1), 'mañana');
});

test('esperando: "Espera tu próximo curso", cuenta regresiva y "Mientras esperas"', () => {
  const html = I.widgetHTML({ tipo: 'proximo', curso: curso('1'), diasFalta: 3, resumen: { cursosAbiertos: 0, cursosTotal: 2, clasesHechas: 0, clasesTotal: 8 } }, { ahora: new Date('2026-10-09T12:00:00') });
  assert.match(html, /Espera tu próximo curso./);
  assert.match(html, /Próximo desbloqueo/);
  assert.match(html, /en 3 días/);
  assert.match(html, /12 oct/);
  assert.match(html, /Mientras esperas/);
  assert.match(html, /Cuando se abra/);
});

test('los cuatro accesos: Cursos, Clases, PDFs y Pro con sus números', () => {
  const k = I.kpisDe({ resumen: { cursosAbiertos: 2, cursosTotal: 5, clasesHechas: 7, clasesTotal: 20 } }, { pdfsAbiertos: 4, pdfsTotal: 9 });
  assert.deepEqual(k.map(x => x.etiqueta), ['Cursos', 'Clases', 'PDFs', 'Pro']);
  assert.deepEqual(k.map(x => x.valor), ['2/5', '7/20', '4/9', '13']);
  assert.equal(I.kpisDe({}, {})[2].valor, '—', 'sin dato de PDFs no inventa números');
  for (const x of k) assert.match(x.href, /^club-[a-z]+.html$/);
});

test('saludo: hora, fecha larga y nombre escapado', () => {
  assert.equal(I.saludoHora(8), 'Buenos días');
  assert.equal(I.saludoHora(15), 'Buenas tardes');
  assert.equal(I.saludoHora(21), 'Buenas noches');
  assert.equal(I.fechaLarga(new Date('2026-10-09T12:00:00')), 'viernes 9 de octubre de 2026');
  const s = I.saludoHTML('<b>Ana</b>', new Date('2026-10-09T09:00:00'));
  assert.ok(!/<b>Ana/.test(s));
  assert.match(s, /Buenos días/);
});

test('foto del curso: la suya si es segura; si no, una foto propia del sitio según su área', () => {
  assert.equal(I.fotoDelCurso({ image: 'https://x.com/a.jpg' }), 'https://x.com/a.jpg');
  assert.match(I.fotoDelCurso({ area: 'Apicultura' }), /apicultura-polinizacion/);
  assert.match(I.fotoDelCurso({ area: 'Etología' }), /etologia/);
  assert.match(I.fotoDelCurso({ area: 'Cosa rara' }), /fauna-silvestre-conservacion/);
  assert.match(I.fotoDelCurso({ image: 'javascript:1', area: 'Manejo en cautiverio' }), /manejo-fauna-cautiverio/);
});
