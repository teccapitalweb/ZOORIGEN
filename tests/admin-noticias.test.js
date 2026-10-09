'use strict';
// Panel admin: validaciones de los formularios de noticias, datos curiosos y avisos
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../assets/js/admin-noticias.js');

const buenaNoticia = () => ({ titulo: 'Semarnat actualiza criterios para UMA', resumen: 'Primera idea importante\nSegunda idea importante', categoria: 'normativa', fuente: 'Equipo Zoorigen', imagen: '', link: 'https://www.gob.mx/semarnat', plantilla: 'naranja', avisar: true });

test('noticia válida: se limpian espacios y líneas vacías, y se respeta la plantilla', () => {
  const r = A.validarNoticia(Object.assign(buenaNoticia(), { resumen: '  Primera idea importante  \n\n   \nSegunda idea importante\r\n' }));
  assert.equal(r.ok, true);
  assert.equal(r.datos.resumen, 'Primera idea importante\nSegunda idea importante');
  assert.equal(r.datos.plantilla, 'naranja');
  assert.equal(r.datos.avisar, true);
});

test('noticia: errores claros para título, resumen, categoría, enlaces y fuente', () => {
  const caso = (cambio, texto) => { const r = A.validarNoticia(Object.assign(buenaNoticia(), cambio)); assert.equal(r.ok, false); assert.match(r.error, texto); };
  caso({ titulo: 'Corto' }, /título/i);
  caso({ titulo: 'x'.repeat(141) }, /título/i);
  caso({ resumen: 'poco' }, /esencial/i);
  caso({ resumen: 'y'.repeat(1501) }, /esencial/i);
  caso({ categoria: 'inventada' }, /categoría/i);
  caso({ link: 'http://inseguro.com' }, /https/);
  caso({ link: 'javascript:alert(1)' }, /https/);
  caso({ imagen: 'data:image/png;base64,AAAA' }, /https/);
  caso({ fuente: 'f'.repeat(61) }, /fuente/i);
});

test('noticia: sin fuente usa Equipo Zoorigen; plantilla desconocida cae en verde; avisar solo si es true', () => {
  const r = A.validarNoticia(Object.assign(buenaNoticia(), { fuente: '', plantilla: 'rosa', avisar: 'si' }));
  assert.equal(r.datos.fuente, 'Equipo Zoorigen');
  assert.equal(r.datos.plantilla, 'verde');
  assert.equal(r.datos.avisar, false);
  assert.equal(A.validarNoticia(null).ok, false);
});

test('dato curioso: 20 a 300 letras, tema válido y fuente corta', () => {
  const ok = A.validarDato({ texto: 'Los pulpos tienen tres corazones y sangre azul.', tema: 'Biología', fuente: 'Smithsonian', enviarYa: true });
  assert.equal(ok.ok, true);
  assert.equal(ok.datos.enviarYa, true);
  assert.equal(A.validarDato({ texto: 'muy corto' }).ok, false);
  assert.match(A.validarDato({ texto: 'z'.repeat(301) }).error, /301/);
  assert.equal(A.validarDato({ texto: 'Un dato suficientemente largo para pasar.', tema: 'Inventado' }).datos.tema, 'General');
  assert.equal(A.validarDato({ texto: 'Un dato suficientemente largo para pasar.', fuente: 'f'.repeat(81) }).ok, false);
});

test('aviso: título y descripción obligatorios; tipo y enlace solo de la lista', () => {
  const ok = A.validarAviso({ tipo: 'curso', titulo: 'Nuevo curso disponible', descripcion: 'Ya puedes verlo en Cursos', enlace: 'biblioteca' });
  assert.equal(ok.ok, true);
  assert.equal(ok.datos.tipo, 'curso');
  assert.equal(ok.datos.enlace, 'biblioteca');
  const raro = A.validarAviso({ tipo: 'logro', titulo: 'Hola', descripcion: 'Texto', enlace: 'https://malo.com' });
  assert.equal(raro.datos.tipo, 'general');
  assert.equal(raro.datos.enlace, '');
  assert.equal(A.validarAviso({ titulo: 'ab', descripcion: 'Texto largo' }).ok, false);
  assert.equal(A.validarAviso({ titulo: 'Titulo', descripcion: 'a' }).ok, false);
});

test('https(): vacío es válido (opcional); lo inseguro devuelve null', () => {
  assert.equal(A.https(''), '');
  assert.equal(A.https('https://es.mongabay.com/x'), 'https://es.mongabay.com/x');
  for (const m of ['http://x.com', 'https://', 'https://x.com/a b', 'ftp://x.com', 'https://x.com/"']) assert.equal(A.https(m), null, m);
});

test('la sección del admin usa el módulo nuevo y ya no escribe noticias directo en Firestore', () => {
  const h = fs.readFileSync(path.resolve(__dirname, '../pages/admin-club.html'), 'utf8');
  assert.ok(h.includes('ZOO_ADMIN_NOTICIAS.montar'));
  assert.ok(h.includes('Noticias y avisos'));
  assert.ok(!/db\.collection\('noticias'\)\.(add|doc)/.test(h), 'el administrador ya no escribe en la colección vieja');
});
