'use strict';
// Noticias del sector: partes puras de club-noticias-ui.js (seguridad al mostrar texto externo, plantillas, fechas)
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../assets/js/club-noticias-ui.js');

test('urlSegura: solo https; todo lo demás se descarta', () => {
  assert.equal(N.urlSegura('https://es.mongabay.com/nota-1/'), 'https://es.mongabay.com/nota-1/');
  for (const mala of ['http://sitio.com', 'javascript:alert(1)', 'data:text/html,<b>x</b>', '//sitio.com', 'ftp://x.com', '', null, undefined,
    'https://x.com/a b', 'https://x.com/"onload="x', "https://x.com/'", 'https://', 'https://x.com/<script>'])
    assert.equal(N.urlSegura(mala), '', String(mala));
});

test('limpiar quita etiquetas y caracteres de control, y recorta sin partir palabras', () => {
  assert.equal(N.limpiar('<b>Hola</b>\n  <script>x</script> mundo'), 'Hola x mundo');
  const r = N.limpiar('palabra '.repeat(80), 100);
  assert.ok(r.length <= 101 && r.endsWith('…'));
  assert.ok(!/palabr…$/.test(r), 'no parte una palabra');
  assert.equal(N.limpiar(null), '');
});

test('el HTML de una hoja escapa todo el texto que viene de afuera', () => {
  const sucia = { id: 'a"><img src=x onerror=alert(1)>', titulo: '<img src=x onerror=alert(1)>Título', extracto: '"><script>alert(2)</script> texto', fuente: '<b>Medio</b>',
    link: 'javascript:alert(3)', imagen: 'http://malo.com/x.jpg', categoria: 'fauna', fecha: '2026-10-09T12:00:00Z' };
  for (const html of [N.hojaHTML(sucia, 0), N.lecturaHTML(sucia, 0)]) {
    assert.ok(!/<img src=x/i.test(html), 'no debe colarse una etiqueta ajena');
    assert.ok(!/<script/i.test(html), 'no debe colarse un script');
    assert.ok(!/href="javascript:/i.test(html), 'sin enlaces javascript:');
    assert.ok(!/src="http:\/\/malo/i.test(html), 'imagen http se descarta');
  }
  const lectura = N.lecturaHTML({ titulo: 'T', fuente: 'M', link: 'https://x.com/n', categoria: 'fauna' }, 0);
  assert.match(lectura, /href="https:\/\/x\.com\/n" target="_blank" rel="noopener noreferrer"/);
  assert.match(N.lecturaHTML({ titulo: 'T', fuente: 'M', link: 'http://x.com' }, 0), /Fuente: M/);
});

test('plantillas: la que elige el administrador, o se reparten verde, naranja y bicolor', () => {
  assert.equal(N.plantillaDe({ plantilla: 'bicolor' }, 0), 'bicolor');
  assert.equal(N.plantillaDe({ plantilla: 'rosa' }, 1), 'naranja');
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => N.plantillaDe({}, i)), ['verde', 'naranja', 'bicolor', 'verde', 'naranja', 'bicolor']);
});

test('fechas en español y tiempo relativo', () => {
  assert.equal(N.fechaLarga('2026-10-09T18:00:00'), 'viernes, 9 de octubre de 2026');
  assert.equal(N.fechaLarga('basura'), '');
  const ahora = new Date('2026-10-09T12:00:00');
  assert.equal(N.tiempoRelativo(new Date('2026-10-09T11:59:40'), ahora), 'hace un momento');
  assert.equal(N.tiempoRelativo(new Date('2026-10-09T11:30:00'), ahora), 'hace 30 min');
  assert.equal(N.tiempoRelativo(new Date('2026-10-09T09:00:00'), ahora), 'hace 3 h');
  assert.equal(N.tiempoRelativo(new Date('2026-10-08T09:00:00'), ahora), 'ayer');
  assert.equal(N.tiempoRelativo(new Date('2026-10-05T09:00:00'), ahora), 'hace 4 días');
  assert.equal(N.tiempoRelativo(new Date('2026-09-01T09:00:00'), ahora), '1 sep 2026');
});

test('categorías, filtro y chips; el respaldo de imagen es una ilustración sin texto', () => {
  const lista = [{ categoria: 'fauna' }, { categoria: 'normativa' }, { categoria: 'fauna' }];
  assert.equal(N.filtrar(lista, 'fauna').length, 2);
  assert.equal(N.filtrar(lista, 'todas').length, 3);
  assert.deepEqual(N.filtrar(null, 'fauna'), []);
  const chips = N.chipsHTML(lista, 'fauna');
  assert.match(chips, /data-cat="todas"/);
  assert.match(chips, /data-cat="fauna"/);
  assert.match(chips, /data-cat="normativa"/);
  assert.ok(!/data-cat="apicultura"/.test(chips), 'solo categorías que existen');
  for (const c of Object.keys(N.CATEGORIAS)) {
    const u = N.imagenRespaldo(c);
    assert.ok(u.startsWith('data:image/svg+xml'), c);
    assert.ok(!/<text/i.test(decodeURIComponent(u)), 'sin texto dentro de la imagen');
  }
  assert.equal(N.categoriaDe({ categoria: 'inventada' }).id, 'ciencia');
});

test('normalizar tolera datos incompletos', () => {
  const n = N.normalizar({}, 0);
  assert.equal(n.titulo, 'Noticia');
  assert.equal(n.fuente, 'Zoorigen');
  assert.equal(n.link, '');
  assert.deepEqual(n.resumen, []);
  const m = N.normalizar({ titulo: 'x', resumen: 'uno\n\ndos\n' + 'tres\n'.repeat(20) }, 0);
  assert.ok(m.resumen.length <= 8 && m.resumen[0] === 'uno');
});
