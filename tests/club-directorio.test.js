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

test('paraServidor: el correo de contacto viaja con el nombre del contrato (email) y no se cuelan campos de más', () => {
  const D = require('../assets/js/club-directorio.js');
  const v = D.validarTarjeta({ nombre: 'Ana Pérez', profesion: 'Bióloga', sector: 'Conservación', ciudad: 'Mérida', bio: 'Hola', whatsapp: '55 1234 5678', correo: 'ana@correo.com', linkedin: 'linkedin.com/in/ana' });
  assert.equal(v.ok, true);
  const cuerpo = D.paraServidor(v.valor);
  assert.deepEqual(Object.keys(cuerpo).sort(),
    ['bio', 'cedula', 'cedulaVisible', 'ciudad', 'contacto', 'estado', 'institucion', 'nombre', 'profesion', 'publicado', 'sector']);
  assert.equal(cuerpo.contacto.email, 'ana@correo.com');
  assert.equal('correo' in cuerpo.contacto, false);
  assert.deepEqual(D.paraServidor({ nombre: 'Ana', profesion: 'x', sector: 'Otro', ciudad: 'y', bio: '', contacto: {} }).contacto, {});
});

/* ───────────── privada hasta publicar, sello verificado, campos opcionales (igual que Alintec Food) ───────────── */

test('privada por defecto: sin pedirlo, la tarjeta se manda con publicado false; solo publicado true la publica', () => {
  const v = D.validarTarjeta(buena());
  assert.equal(D.paraServidor(v.valor).publicado, false);
  assert.equal(D.paraServidor(v.valor, {}).publicado, false);
  assert.equal(D.paraServidor(v.valor, { publicado: 'si' }).publicado, false, 'solo el booleano true cuenta');
  assert.equal(D.paraServidor(v.valor, { publicado: true }).publicado, true);
});

test('normalizarTarjeta trae publicado y verificado solo si son true; el sello no se inventa', () => {
  const t = D.normalizarTarjeta({ uid: 'u', nombre: 'Ana', publicado: true, verificado: true });
  assert.equal(t.publicado, true);
  assert.equal(t.verificado, true);
  for (const raro of ['true', 1, {}, null, undefined]) {
    const x = D.normalizarTarjeta({ uid: 'u', nombre: 'Ana', publicado: raro, verificado: raro });
    assert.equal(x.publicado, false);
    assert.equal(x.verificado, false);
  }
  assert.doesNotMatch(D.renderTarjeta(D.normalizarTarjeta({ uid: 'u', nombre: 'Ana' })), /zd-sello/);
  assert.match(D.renderTarjeta(t), /zd-sello[^>]*aria-label="Miembro verificado de Zoorigen"/);
});

test('campos opcionales: institución, estado profesional, cédula (con "mostrar"), sitio web e Instagram', () => {
  const r = D.validarTarjeta(buena({ institucion: ' UMA  El Pedregal ', estado: 'empleo', cedula: '12345678', cedulaVisible: true, web: 'tusitio.com', instagram: '@mi_usuario' }));
  assert.equal(r.ok, true);
  assert.equal(r.valor.institucion, 'UMA El Pedregal');
  assert.equal(r.valor.estado, 'empleo');
  assert.equal(r.valor.cedula, '12345678');
  assert.equal(r.valor.cedulaVisible, true);
  assert.equal(r.valor.contacto.web, 'https://tusitio.com/');
  assert.equal(r.valor.contacto.instagram, 'mi_usuario');
  const cuerpo = D.paraServidor(r.valor, { publicado: true });
  assert.deepEqual(cuerpo.contacto, { web: 'https://tusitio.com/', instagram: 'mi_usuario' });
  assert.equal(cuerpo.cedulaVisible, true);
  // sin cédula no hay nada que "mostrar"
  assert.equal(D.validarTarjeta(buena({ cedulaVisible: true })).valor.cedulaVisible, false);
  // errores
  assert.ok(D.validarTarjeta(buena({ estado: 'jubilado' })).errores.estado);
  assert.ok(D.validarTarjeta(buena({ cedula: 'ab' })).errores.cedula);
  assert.ok(D.validarTarjeta(buena({ cedula: '12 34 56' })).errores.cedula);
  assert.ok(D.validarTarjeta(buena({ institucion: 'x'.repeat(81) })).errores.institucion);
  assert.ok(D.validarTarjeta(buena({ web: 'javascript:alert(1)' })).errores.web);
  assert.ok(D.validarTarjeta(buena({ web: 'localhost' })).errores.web);
  assert.ok(D.validarTarjeta(buena({ instagram: 'con espacios' })).errores.instagram);
});

test('la tarjeta dibuja institución, estado y cédula; la cédula oculta solo la ve su dueña o dueño', () => {
  const base = { uid: 'u1', nombre: 'Ana López', profesion: 'Bióloga', institucion: 'UMA El Pedregal', sector: 'Biología', ciudad: 'Xalapa', estado: 'proyectos', cedula: '12345678' };
  const publica = D.renderTarjeta(D.normalizarTarjeta(Object.assign({ cedulaVisible: true }, base)));
  assert.match(publica, /UMA El Pedregal/);
  assert.match(publica, /Disponible para proyectos/);
  assert.match(publica, /Cédula profesional 12345678/);
  const oculta = D.normalizarTarjeta(Object.assign({ cedulaVisible: false }, base));
  assert.doesNotMatch(D.renderTarjeta(oculta), /12345678/);
  assert.match(D.renderTarjeta(oculta, { esMia: true }), /Cédula profesional 12345678 \(solo tú la ves\)/);
  const html = D.renderTarjeta(D.normalizarTarjeta(Object.assign({ contacto: { web: 'https://tusitio.com/', instagram: 'mi_usuario' } }, base)));
  assert.match(html, /href="https:\/\/tusitio\.com\/" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /href="https:\/\/instagram\.com\/mi_usuario"/);
});

test('la lista separa "Miembros verificados" y "Comunidad" solo si hay de las dos, y la propia va primero', () => {
  const T = (uid, extra) => D.normalizarTarjeta(Object.assign({ uid: uid, nombre: 'Persona ' + uid, sector: 'Biología' }, extra));
  const solas = D.renderLista([T('a', { verificado: true }), T('b', { verificado: true })], { miUid: 'b' });
  assert.doesNotMatch(solas, /zd-grupo/, 'con un solo grupo no hay encabezados');
  assert.ok(solas.indexOf('data-uid="b"') < solas.indexOf('data-uid="a"'), 'la propia primero');
  const mezcla = D.renderLista([T('a'), T('b', { verificado: true })], { miUid: 'x' });
  assert.match(mezcla, /Miembros verificados/);
  assert.match(mezcla, /Comunidad Zoorigen/);
  assert.ok(mezcla.indexOf('Miembros verificados') < mezcla.indexOf('data-uid="b"') && mezcla.indexOf('data-uid="b"') < mezcla.indexOf('Comunidad Zoorigen'));
});

test('panel "Mi tarjeta": sin tarjeta invita a crearla; privada ofrece Publicar; publicada ofrece Dejar de publicar', () => {
  const sin = D.renderMiTarjeta(null);
  assert.match(sin, /Privada · solo tú la ves/);
  assert.match(sin, /data-mia="editar"[^>]*>[^<]*<svg[\s\S]*?Crear mi tarjeta/);
  assert.doesNotMatch(sin, /data-mia="publicar"|data-mia="despublicar"/);
  const privada = D.renderMiTarjeta(D.normalizarTarjeta({ uid: 'u', nombre: 'Ana', sector: 'Biología', publicado: false }));
  assert.match(privada, /Privada · solo tú la ves/);
  assert.match(privada, /Nadie la ve hasta que tú decidas publicarla/);
  assert.match(privada, /data-mia="publicar"/);
  const publicada = D.renderMiTarjeta(D.normalizarTarjeta({ uid: 'u', nombre: 'Ana', sector: 'Biología', publicado: true }));
  assert.match(publicada, /Publicada · visible para los miembros/);
  assert.match(publicada, /data-mia="despublicar"/);
  assert.doesNotMatch(D.renderMiTarjeta(D.normalizarTarjeta({ uid: 'u', nombre: '<b>x</b>', sector: 'Otro' })), /<b>x<\/b>/);
});

test('valorDeTarjeta: publicar o dejar de publicar desde el panel conserva todos los datos de la tarjeta', () => {
  const mia = D.normalizarTarjeta({ uid: 'u', nombre: 'Ana', profesion: 'Bióloga', institucion: 'UMA', sector: 'Biología', ciudad: 'Xalapa', bio: 'Hola',
    estado: 'empleo', cedula: '12345678', cedulaVisible: true, contacto: { whatsapp: '5512345678', email: 'ana@x.com', web: 'https://x.com/', instagram: 'ana' } });
  const cuerpo = D.paraServidor(D.valorDeTarjeta(mia), { publicado: true });
  assert.deepEqual(cuerpo, {
    nombre: 'Ana', profesion: 'Bióloga', institucion: 'UMA', sector: 'Biología', ciudad: 'Xalapa', bio: 'Hola', estado: 'empleo', cedula: '12345678',
    cedulaVisible: true, publicado: true, contacto: { whatsapp: '5512345678', email: 'ana@x.com', web: 'https://x.com/', instagram: 'ana' }
  });
});

test('la vista previa avisa que los perfiles reales y su contacto son solo para miembros', () => {
  const html = D.renderVistaPrevia(D.tarjetasDeEjemplo([]));
  assert.match(html, /class="zd-aviso"/);
  assert.match(html, /Vista previa: los perfiles reales y sus datos de contacto solo los ven los miembros\./);
  assert.doesNotMatch(html, /zd-sello|Miembros verificados/, 'los ejemplos no llevan sello');
});

test('la página: panel "Mi tarjeta", publicar/dejar de publicar, eliminar y nada de contacto a quien no es miembro', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'club-directorio.html'), 'utf8');
  assert.match(html, /id="zdMia"/);
  assert.match(html, /id="zdSeccionTitulo"[^>]*>Miembros del directorio</);
  for (const frase of ['Guardar sin publicar', 'Dejar de publicar', 'Publicar', 'Eliminar tarjeta', 'Mostrar mi cédula en el directorio',
    'Mientras no la publiques, solo tú la ves', 'solo lo ven los miembros']) assert.ok(html.includes(frase), 'falta: ' + frase);
  // la tarjeta se manda siempre con la bandera de publicación explícita
  assert.match(html, /paraServidor\(r\.valor, \{ publicado: publicar \}\)/);
  // sin membresía no se pinta el panel ni se piden tarjetas reales
  assert.match(html, /panelMia\.hidden = true;\s*\$\('zdSeccionTitulo'\)\.hidden = true;/);
});
