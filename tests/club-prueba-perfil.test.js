'use strict';
// Tarjetas "como Alintec": abanico de la prueba gratuita (bienvenida, Cursos, aviso, confirmación) y ventana
// "Completa tu perfil profesional" (reemplaza la del nombre). Lógica pura y marcado; el dibujo real se ve en Chrome.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const A = require('../assets/js/club-prueba-arte.js');
const O = require('../assets/js/club-onboarding.js');
const P = require('../assets/js/club-portadas.js');

/* ── abanico ── */
test('abanico: siempre tres portadas reales y distintas, con la pastilla "Gratis"', () => {
  const u = A.portadas({ base: '../' });
  assert.equal(u.length, 3);
  assert.equal(new Set(u).size, 3);
  for (const x of u) {
    assert.match(x, /assets\/img\/cursos\/portadas\/curso-[a-z-]+-4x3\.webp$/);
    const archivo = path.join(RAIZ, x.replace(/^\.\.\//, ''));
    assert.ok(fs.existsSync(archivo), 'existe ' + archivo);
  }
  const h = A.arteHTML(u);
  assert.equal((h.match(/zpg-cover zpg-cover--/g) || []).length, 3);
  assert.match(h, /<span class="zpg-badge">Gratis<\/span>/);
  assert.match(h, /aria-hidden="true"/);
});

test('abanico: usa primero las portadas de los cursos que se le pasan y completa con las de respaldo', () => {
  const cursos = [{ title: 'Mariposarios: manejo y conservación' }, { title: 'Curso sin portada conocida' }, { title: 'Aves rapaces en México' }];
  const u = A.portadas({ cursos, base: '../' });
  assert.match(u[0], /curso-mariposarios-4x3\.webp$/);
  assert.match(u[1], /curso-aves-rapaces-4x3\.webp$/);
  assert.equal(u.length, 3);
  assert.equal(new Set(u).size, 3);
});

test('abanico: las rutas peligrosas no entran al HTML', () => {
  const h = A.arteHTML(['javascript:alert(1)', "x'\"onerror=1", '../a b(c).webp']);
  assert.doesNotMatch(h, /javascript:/);
  assert.doesNotMatch(h, /["']onerror/, 'las comillas quedan codificadas dentro del url()');
  assert.doesNotMatch(h, /x'/);
  assert.match(h, /a%20b%28c%29\.webp/);
  assert.equal((h.match(/zpg-cover zpg-cover--/g) || []).length, 3);
});

test('las portadas de respaldo están todas en el catálogo de ZOO_PORTADAS', () => {
  for (const k of A.PREFERIDAS) assert.ok(P.todas().includes(k), k);
});

/* ── estilos: color sólido, responsivo, sin degradados ── */
test('club-prueba.css: sin degradados, tamaño con clamp() y sin animación con movimiento reducido', () => {
  const css = leer('assets/css/club-prueba.css');
  assert.doesNotMatch(css, /gradient\(/);
  assert.match(css, /--zpg-w: clamp\(/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /[\u{1F300}-\u{1FAFF}☀-➿]/u, 'sin emojis');
});

/* ── Cursos: la tarjeta de selección solo mientras la prueba está pendiente ── */
test('Cursos: la nota "Tu prueba gratuita: ... Ver planes" ya no existe y la tarjeta solo sale pendiente', () => {
  const html = leer('pages/club-biblioteca.html');
  assert.doesNotMatch(html, /Tu prueba gratuita: <strong>/);
  const i = html.indexOf("else if (modo === 'prueba')");
  assert.ok(i > 0);
  const trozo = html.slice(i, i + 700);
  assert.match(trozo, /aviso\.innerHTML = '';/, 'al elegir, la nota queda vacía');
  assert.match(html, /bannerPruebaHTML\(pref \? \{ id: pref\.id, titulo: pref\.title \} : null, portadasAbanico\(\)\)/);
  // la marca del <head> hace que el hueco nazca con su alto (o sin él si ya eligió)
  assert.match(html, /\/\*zs-prueba\*\//);
  const css = leer('assets/css/club-shell.css');
  assert.match(css, /html\[data-prueba="elegida"\] #unlockInfo:empty \{ min-height: 0; \}/);
  assert.match(css, /html\[data-prueba="pendiente"\] #unlockInfo:empty \{ min-height: 141px/);
  // el abanico y la confirmación se arman con los constructores nuevos
  assert.match(html, /ZOO_CURSOS_UI\.avisoPruebaHTML\(/);
  assert.match(html, /ZOO_CURSOS_UI\.confirmarPruebaHTML\(curso\.title, img\)/);
  assert.match(html, /club-prueba-arte\.js\?v=/);
  assert.match(html, /club-prueba\.css\?v=/);
});

test('Cursos: la lógica de la prueba (POST /api/prueba-gratuita, una sola vez) sigue igual', () => {
  const html = leer('pages/club-biblioteca.html');
  assert.match(html, /llamarPrueba\('POST', \{ cursoId \}\)/);
  assert.match(html, /Solo puedes elegir|confirmarPruebaHTML/);
  assert.match(html, /if \(!tieneMembresiaActiva\(\) && window\.__zooPrueba\.elegible\) \{ avisoSeleccionaPrueba\(courseId\); return; \}/);
});

/* ── Bienvenida de la prueba ── */
test('bienvenida de la prueba: textos de alintec ("usuario nuevo", "Lo eliges en Mis cursos") y abanico', () => {
  const T = O.TEXTOS.pruebaNuevo;
  assert.equal(T.titulo, 'Tu prueba gratuita');
  assert.equal(T.kicker, 'Una función para usuarios nuevos');
  assert.equal(T.texto, 'Al ser un usuario nuevo, te damos a elegir un curso de tu interés como prueba gratuita.');
  assert.equal(T.detalle, 'Lo eliges en Mis cursos.');
  assert.equal(T.elegir, 'Elegir mi curso');
  const js = leer('assets/js/club-onboarding.js');
  assert.match(js, /arteDePrueba\(ctx\)/);
  assert.match(leer('pages/club-dashboard.html'), /club-prueba-arte\.js\?v=/);
  assert.match(leer('pages/club-dashboard.html'), /club-prueba\.css\?v=/);
});

/* ── Perfil profesional ── */
test('perfil: seis campos (nombre completo, puesto, institución, ciudad, WhatsApp, correo)', () => {
  assert.deepEqual(O.PERFIL_CAMPOS.map(c => c.id), ['nombre', 'profesion', 'institucion', 'ciudad', 'whatsapp', 'email']);
  assert.equal(O.PERFIL_CAMPOS.find(c => c.id === 'nombre').max, O.NOMBRE_MAX);
  assert.match(O.TEXTOS.perfil.ayudaNombre, /Este es el nombre que aparecerá en tus certificados/);
  assert.equal(O.TEXTOS.perfil.guardar, 'Guardar mi perfil');
  assert.equal(O.TEXTOS.perfil.nota, 'Nadie ve tus datos hasta que tú decidas publicarlos en el Directorio.');
  assert.equal(O.TEXTOS.perfil.titulo, 'Completa tu perfil profesional');
});

test('perfil: la barra de avance cuenta campos llenos (33% con 2 de 6)', () => {
  assert.equal(O.avancePerfil({}).pct, 0);
  const a = O.avancePerfil({ nombre: 'Ana Pérez', ciudad: 'Mérida' });
  assert.equal(a.pct, 33);
  assert.equal(a.texto, '33% completo');
  assert.equal(a.completo, false);
  const t = O.avancePerfil({ nombre: 'a', profesion: 'b', institucion: 'c', ciudad: 'd', whatsapp: 'e', email: 'f' });
  assert.equal(t.pct, 100);
  assert.equal(t.texto, '¡Perfil completo!');
  assert.equal(O.avancePerfil({ nombre: '   ' }).llenos, 0, 'solo espacios no cuenta');
});

test('perfil: el nombre sigue las reglas de siempre (nombre y al menos un apellido, solo letras)', () => {
  const v = valores => O.validarPerfil(Object.assign({ nombre: 'Mariana Torres' }, valores));
  assert.equal(v({}).ok, true);
  assert.equal(v({ nombre: 'Mariana' }).ok, false);
  assert.equal(v({ nombre: 'Mariana' }).campo, 'nombre');
  assert.equal(v({ nombre: 'Ana 2 Pérez' }).ok, false);
  assert.equal(v({ nombre: 'x'.repeat(50) + ' Pérez' }).ok, false);
  assert.equal(v({ nombre: 'mariana torres ramírez' }).valores.nombre, 'Mariana Torres Ramírez', 'capitaliza lo que viene todo en minúsculas');
  assert.equal(O.validarNombre('mariana torres').ok, true, 'las reglas puras no cambiaron');
});

test('perfil: WhatsApp y correo son opcionales pero, si vienen, deben tener forma válida', () => {
  const v = valores => O.validarPerfil(Object.assign({ nombre: 'Mariana Torres' }, valores));
  assert.equal(v({ whatsapp: '52 55 1234 5678' }).ok, true);
  assert.equal(v({ whatsapp: '123' }).campo, 'whatsapp');
  assert.equal(v({ whatsapp: 'abcdefghij' }).ok, false);
  assert.equal(v({ email: 'mari@correo.com' }).ok, true);
  assert.equal(v({ email: 'mari@' }).campo, 'email');
  assert.equal(v({ email: '' }).ok, true);
});

test('perfil: la ficha del Directorio solo se crea si hay datos más allá del nombre (como alintec)', () => {
  const inicial = { nombre: 'Ana Pérez', whatsapp: '5512345678' };
  assert.equal(O.hayExtrasPerfil({ nombre: 'Ana Pérez López', whatsapp: '5512345678' }, inicial), false, 'solo cambió el nombre');
  assert.equal(O.hayExtrasPerfil({ nombre: 'Ana Pérez', whatsapp: '5512345678', ciudad: 'Mérida' }, inicial), true);
  assert.equal(O.hayExtrasPerfil({ nombre: 'Ana Pérez', whatsapp: '' }, inicial), true, 'borrar un dato precargado también es un cambio');
  assert.equal(O.hayExtrasPerfil({ nombre: 'Ana Pérez', whatsapp: ' 5512345678 ' }, inicial), false, 'los espacios no cuentan');
});

test('perfil: iniciales para el avatar (sin foto: Zoorigen no tiene dónde guardarla)', () => {
  assert.equal(O.inicialesDe('mariana torres'), 'MT');
  assert.equal(O.inicialesDe('Ana'), 'A');
  assert.equal(O.inicialesDe('  '), '?');
  const js = leer('assets/js/club-onboarding.js');
  assert.doesNotMatch(js, /type="file"|Subir foto|toDataURL|FileReader/, 'no hay carga de foto ni base64');
});

test('perfil: guarda en miembros.nombreCertificado como hoy y la ficha en POST /api/perfil-profesional', async () => {
  const escrituras = [];
  const g = await O.guardarNombreCertificado({ nombre: 'mariana torres', escribirRemoto: o => { escrituras.push(o); return Promise.resolve(); } });
  assert.deepEqual(escrituras, [{ nombreCertificado: 'Mariana Torres' }]);
  assert.equal(g.ok, true);
  const llamadas = [];
  const r = await O.guardarFichaPerfil({
    valores: { nombre: 'Mariana Torres', profesion: ' Bióloga ', institucion: 'UMA', ciudad: 'Mérida', whatsapp: '5512345678', email: '', extra: 'no' },
    apiFetch: (ruta, op) => { llamadas.push([ruta, op]); return Promise.resolve({ ok: true }); }
  });
  assert.equal(r.ok, true);
  assert.equal(llamadas[0][0], '/api/perfil-profesional');
  assert.equal(llamadas[0][1].method, 'POST');
  assert.deepEqual(llamadas[0][1].body, { nombre: 'Mariana Torres', profesion: 'Bióloga', institucion: 'UMA', ciudad: 'Mérida', whatsapp: '5512345678', email: '' });
  const falla = await O.guardarFichaPerfil({ valores: { nombre: 'Ana Pérez' }, apiFetch: () => Promise.reject(new Error('sin red')) });
  assert.equal(falla.ok, false);
  assert.equal((await O.guardarFichaPerfil({ valores: {} })).ok, false, 'sin apiFetch no inventa nada');
});

test('perfil: ocupa el lugar de la ventana del nombre en la cola (mismo paso, mismas marcas y orden)', () => {
  const js = leer('assets/js/club-onboarding.js');
  assert.match(js, /nombre: function \(\) \{ return mostrarPerfil\(ctx\)\.then\(function \(r\) \{ return almacen\.marcar\('nombreVisto'\)/);
  assert.match(js, /var TIPO = \{ bienvenida: 'bienvenida', nombre: 'nombre'/);
  const plan = O.planificar({ session: { createdAt: new Date(), planStatus: 'free' }, marcas: {}, ahora: new Date(), estado: { elegible: true } });
  assert.deepEqual(plan.pasos, ['bienvenida', 'nombre', 'premio', 'tour', 'prueba']);
});

test('perfil: estilos en color sólido, sin degradados, con tamaños que bajan en celular', () => {
  const css = leer('assets/css/club-onboarding.css');
  const i = css.indexOf('Completa tu perfil profesional');
  assert.ok(i > 0);
  const bloque = css.slice(i);
  assert.doesNotMatch(bloque, /gradient\(/);
  assert.match(bloque, /\.zpf-portada \{[^}]*background: var\(--zoo-solid/);
  assert.match(bloque, /clamp\(/);
  assert.match(bloque, /@media \(max-width: 480px\)/);
});

test('el servidor expone el perfil para cuentas sin membresía (ficha privada) y el sitio lo llama con el apiFetch del Club', () => {
  const js = leer('assets/js/club-onboarding.js');
  assert.match(js, /f\('\/api\/perfil-profesional'\)/);
  assert.match(js, /'\/api\/perfil-profesional', \{ method: 'POST', body: cuerpo \}/);
});
