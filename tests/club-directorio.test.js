'use strict';

// Directorio VIP (assets/js/club-directorio.js): validar la tarjeta, normalizar, filtrar y dibujar.
// Ejecutar: node --test tests/club-directorio.test.js

const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require(path.join(__dirname, '..', 'assets', 'js', 'club-directorio.js'));

const buena = (extra) => Object.assign({ nombre: 'Ana López', profesion: 'Bióloga de campo', sector: 'Biología', ciudad: 'Xalapa, Veracruz', bio: '', whatsapp: '', correo: '', linkedin: '' }, extra);

/* ───────────── sectores ───────────── */

test('los sectores son los ocho acordados', () => {
  assert.deepEqual(D.SECTORES, ['Veterinaria', 'Biología', 'Conservación', 'Zoológicos/UMA', 'Investigación', 'Educación', 'Consultoría', 'Otro']);
  const chips = D.renderChips('Biología');
  assert.match(chips, /data-sector="Todos"/);
  assert.match(chips, /data-sector="Zoológicos\/UMA"/);
  assert.match(chips, /is-activo" data-sector="Biología" aria-pressed="true"/);
});

/* ───────────── validar "Mi tarjeta" ───────────── */

test('una tarjeta mínima válida se acepta y limpia espacios', () => {
  const r = D.validarTarjeta(buena({ nombre: '  Ana   López  ' }));
  assert.equal(r.ok, true);
  assert.equal(r.valor.nombre, 'Ana López');
  assert.deepEqual(Object.keys(r.valor.contacto), [], 'el contacto es opcional');
  assert.equal(r.valor.bio, '');
});

test('faltan campos obligatorios: nombre, profesión, sector y ciudad', () => {
  const r = D.validarTarjeta({});
  assert.equal(r.ok, false);
  assert.equal(r.valor, null);
  assert.deepEqual(Object.keys(r.errores).sort(), ['ciudad', 'nombre', 'profesion', 'sector']);
  assert.equal(D.validarTarjeta(buena({ sector: 'Astronomía' })).errores.sector, 'Elige un sector de la lista.');
});

test('los límites de longitud se respetan (nombre 60, profesión 80, ciudad 60, bio 280)', () => {
  assert.ok(D.validarTarjeta(buena({ nombre: 'a'.repeat(61) })).errores.nombre);
  assert.ok(D.validarTarjeta(buena({ nombre: 'a'.repeat(60) })).ok);
  assert.ok(D.validarTarjeta(buena({ profesion: 'a'.repeat(81) })).errores.profesion);
  assert.ok(D.validarTarjeta(buena({ ciudad: 'a'.repeat(61) })).errores.ciudad);
  assert.ok(D.validarTarjeta(buena({ bio: 'a'.repeat(281) })).errores.bio);
  assert.equal(D.validarTarjeta(buena({ bio: 'a'.repeat(280) })).ok, true);
  assert.ok(D.validarTarjeta(buena({ nombre: 'A' })).errores.nombre, 'mínimo 2 caracteres');
});

test('WhatsApp: acepta formatos con espacios y guiones; rechaza lo que no es un número', () => {
  assert.equal(D.validarTarjeta(buena({ whatsapp: '55 1234-5678' })).valor.contacto.whatsapp, '5512345678');
  assert.equal(D.validarTarjeta(buena({ whatsapp: '+52 (55) 1234 5678' })).valor.contacto.whatsapp, '525512345678');
  assert.ok(D.validarTarjeta(buena({ whatsapp: '12345' })).errores.whatsapp);
  assert.ok(D.validarTarjeta(buena({ whatsapp: 'llámame' })).errores.whatsapp);
  assert.equal(D.enlaceWhatsApp('5512345678'), 'https://wa.me/525512345678');
  assert.equal(D.enlaceWhatsApp('525512345678'), 'https://wa.me/525512345678');
  assert.equal(D.enlaceWhatsApp('abc'), '');
});

test('correo: se pasa a minúsculas y se rechaza si no es un correo', () => {
  assert.equal(D.validarTarjeta(buena({ correo: ' ANA@Example.COM ' })).valor.contacto.correo, 'ana@example.com');
  for (const mal of ['ana', 'ana@', '@x.com', 'ana@x', 'a b@x.com', 'javascript:alert(1)']) {
    assert.ok(D.validarTarjeta(buena({ correo: mal })).errores.correo, mal);
  }
});

test('LinkedIn: solo dominios de LinkedIn y siempre https', () => {
  const ok = (v) => D.validarTarjeta(buena({ linkedin: v })).valor.contacto.linkedin;
  assert.equal(ok('linkedin.com/in/ana'), 'https://linkedin.com/in/ana');
  assert.equal(ok('https://www.linkedin.com/in/ana-lopez/'), 'https://www.linkedin.com/in/ana-lopez');
  assert.equal(ok('http://mx.linkedin.com/in/ana'), 'https://mx.linkedin.com/in/ana');
  for (const mal of ['http://evil.com/x', 'https://linkedin.com.evil.com/in/a', 'javascript:alert(1)', 'https://user:pw@linkedin.com/in/a', 'ftp://linkedin.com/x', 'notlinkedin.com/in/a']) {
    assert.ok(D.validarTarjeta(buena({ linkedin: mal })).errores.linkedin, mal);
  }
});

test('la bio conserva saltos de línea pero no caracteres de control', () => {
  const r = D.validarTarjeta(buena({ bio: 'Hola\r\nmundo\u0007!' }));
  assert.equal(r.valor.bio, 'Hola\nmundo!');
});

/* ───────────── normalizar la respuesta ───────────── */

test('normalizarRespuesta maneja membresía, tarjetas y la tarjeta propia', () => {
  const r = D.normalizarRespuesta({ membresia: true, tarjetas: [
    { uid: 'u1', nombre: 'Ana', profesion: 'Bióloga', sector: 'Biología', ciudad: 'Xalapa', bio: 'Hola', contacto: { whatsapp: '5512345678', email: 'ANA@x.com', linkedin: 'https://evil.com' } },
    { uid: 'u2', nombre: '', sector: 'Veterinaria' },
    null
  ], mia: { uid: 'u1', nombre: 'Ana', sector: 'Otro' } });
  assert.equal(r.membresia, true);
  assert.equal(r.tarjetas.length, 1, 'sin nombre o nulas no se muestran');
  assert.equal(r.tarjetas[0].contacto.correo, 'ana@x.com');
  assert.equal(r.tarjetas[0].contacto.linkedin, '', 'un enlace que no es de LinkedIn se descarta');
  assert.equal(r.mia.uid, 'u1');
  assert.equal(D.normalizarTarjeta({ nombre: 'X', sector: 'Inventado' }).sector, 'Otro');
});

test('normalizarRespuesta resiste respuestas raras y sin membresía no da permisos', () => {
  for (const mala of [null, undefined, 3, 'x', [], { tarjetas: 'no' }, { membresia: 'true' }]) {
    const r = D.normalizarRespuesta(mala);
    assert.equal(r.membresia, false);
    assert.deepEqual(r.tarjetas, []);
    assert.equal(r.mia, null);
  }
});

/* ───────────── buscar y filtrar ───────────── */

const TARJETAS = [
  { uid: '1', nombre: 'Mariana Torres', profesion: 'Médica veterinaria', sector: 'Veterinaria', ciudad: 'Ciudad de México', bio: 'Fauna silvestre' },
  { uid: '2', nombre: 'Rodrigo Hernández', profesion: 'Biólogo', sector: 'Conservación', ciudad: 'Oaxaca', bio: 'Felinos' },
  { uid: '3', nombre: 'Elena', profesion: 'Gestora', sector: 'Zoológicos/UMA', ciudad: 'Mérida', bio: '' }
];

test('filtrar por sector y por texto (sin importar mayúsculas ni acentos)', () => {
  assert.equal(D.filtrar(TARJETAS, {}).length, 3);
  assert.equal(D.filtrar(TARJETAS, { sector: 'Todos' }).length, 3);
  assert.deepEqual(D.filtrar(TARJETAS, { sector: 'Conservación' }).map(t => t.uid), ['2']);
  assert.deepEqual(D.filtrar(TARJETAS, { q: 'merida' }).map(t => t.uid), ['3']);
  assert.deepEqual(D.filtrar(TARJETAS, { q: 'HERNANDEZ' }).map(t => t.uid), ['2']);
  assert.deepEqual(D.filtrar(TARJETAS, { q: 'felinos', sector: 'Conservación' }).map(t => t.uid), ['2']);
  assert.deepEqual(D.filtrar(TARJETAS, { q: 'felinos', sector: 'Veterinaria' }), []);
  assert.deepEqual(D.filtrar(null, { q: 'x' }), []);
});

test('iniciales y color del avatar son estables', () => {
  assert.equal(D.iniciales('mariana torres ramírez'), 'MT');
  assert.equal(D.iniciales('Elena'), 'E');
  assert.equal(D.iniciales(''), '?');
  assert.equal(D.colorIndice('u1'), D.colorIndice('u1'));
  assert.ok(D.colorIndice('cualquiera') >= 0 && D.colorIndice('cualquiera') < 5);
});

/* ───────────── dibujo ───────────── */

test('la tarjeta muestra nombre, profesión, ciudad, sector y contactos con enlaces seguros', () => {
  const t = D.normalizarTarjeta({ uid: 'u1', nombre: 'Ana López', profesion: 'Bióloga', sector: 'Biología', ciudad: 'Xalapa', bio: 'Anfibios',
    contacto: { whatsapp: '5512345678', correo: 'ana@x.com', linkedin: 'https://www.linkedin.com/in/ana' } });
  const html = D.renderTarjeta(t, { esMia: true });
  assert.match(html, /Tu tarjeta/);
  assert.match(html, /Ana López/);
  assert.match(html, /Bióloga/);
  assert.match(html, /Xalapa/);
  assert.match(html, /Biología/);
  assert.match(html, /href="https:\/\/wa\.me\/525512345678" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /href="mailto:ana@x\.com"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/ana" target="_blank" rel="noopener noreferrer"/);
  assert.match(D.renderTarjeta(D.normalizarTarjeta({ nombre: 'Sin contacto' })), /Sin datos de contacto/);
  assert.doesNotMatch(D.renderTarjeta(t, { sinContacto: true }), /wa\.me|mailto/, 'la vista previa no muestra contactos');
});

test('todo texto de una tarjeta se escapa: nada de HTML ni scripts', () => {
  // Aunque algo pase por normalizarTarjeta, el dibujo escapa por su cuenta.
  const crudo = { uid: '"><script>1</script>', nombre: '<img src=x onerror=alert(1)>', profesion: '<b>x</b>', sector: 'Otro', ciudad: '"><svg onload=alert(2)>', bio: '<script>alert(3)</script>',
    contacto: { whatsapp: '', correo: '', linkedin: '' } };
  const html = D.renderTarjeta(crudo);
  assert.doesNotMatch(html, /<img|<script|<b>|<svg onload/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;script&gt;alert\(3\)&lt;\/script&gt;/);
  assert.doesNotMatch(D.renderLista([crudo], { miUid: 'x' }), /<script>|<img/);
});

test('lista vacía: mensajes distintos con o sin filtro; error con Reintentar', () => {
  assert.match(D.renderLista([], { filtrando: true }), /Nadie coincide con tu búsqueda/);
  assert.match(D.renderLista([], { filtrando: false }), /Sé la primera persona en crear la tuya/);
  assert.match(D.renderError(), /No pudimos cargar el directorio/);
  assert.match(D.renderError('x'), /data-reintentar/);
  const lista = D.renderLista(TARJETAS.map(D.normalizarTarjeta), { miUid: '2' });
  assert.equal((lista.match(/zd-tarjeta--mia/g) || []).length, 1);
});
