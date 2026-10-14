'use strict';
// Portadas nuevas de los 15 cursos y personajes de cada apartado (tarjeta de título con decoración).
// Ejecutar: node --test tests/club-portadas-personajes.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require('../assets/js/club-portadas.js');
const S = require('../assets/js/club-seccion.js');

const TITULOS = [
  ['Biología, Ecología y Conservación de Tiburones y Rayas', 'curso-tiburones-rayas'],
  ['Entrenamiento Básico Canino Obediencia y Comportamiento', 'curso-entrenamiento-canino'],
  ['Etología Aplicada en Fauna Silvestre bajo Cuidado Humano', 'curso-etologia-cautiverio'],
  ['Fauna Ponzoñosa de México Identificación y Primeros Auxilios', 'curso-fauna-ponzonosa'],
  ['FOTOTRAMPEO Y ANÁLISIS DE DATOS PARA EL MONITOREO DE MAMÍFEROS SILVESTRES', 'curso-fototrampeo'],
  ['Introducción a la Entomología Forense y Biodiversidad de Artrópodos', 'curso-entomologia-forense'],
  ['Legislación y Manejo de Fauna Silvestre en UMAs y Zoológicos', 'curso-legislacion-uma'],
  ['Manejo y Rehabilitación de Aves Rapaces en Cautiverio', 'curso-aves-rapaces'],
  ['Manifiesto de Impacto Ambiental Elaboración, Evaluación y Gestión', 'curso-impacto-ambiental'],
  ['Mariposarios Manejo, Conservación y Educación Ambiental', 'curso-mariposarios'],
  ['Monitoreo y Conservación de Aves como Bioindicadoras', 'curso-aves-bioindicadoras'],
  ['Monitoreo y Conservación de Felinos Silvestres en México', 'curso-felinos-mexico'],
  ['Rescate y Reubicación de Fauna Silvestre en Proyectos de Impacto Ambiental', 'curso-rescate-reubicacion'],
  ['Ultrasonografía y Diagnóstico por Imagen en Mamíferos Silvestres y Exóticos', 'curso-ultrasonografia'],
  ['Vigilancia y control de vectores en Zoonosis y salud pública', 'curso-vectores-zoonosis']
];

test('portadas: cada uno de los 15 cursos reales recibe su portada y el archivo existe (16:9 y 4:3, WebP ligero)', () => {
  const vistos = new Set();
  for (const [titulo, clave] of TITULOS) {
    assert.equal(P.claveDe({ title: titulo }), clave, titulo);
    vistos.add(clave);
    const ruta = P.paraCurso({ title: titulo }, '../');
    assert.equal(ruta, '../assets/img/cursos/portadas/' + clave + '.webp');
    for (const variante of ['', '-4x3']) {
      const f = path.join(RAIZ, 'assets', 'img', 'cursos', 'portadas', clave + variante + '.webp');
      assert.ok(fs.existsSync(f), 'falta ' + clave + variante);
      assert.ok(fs.statSync(f).size < 150 * 1024, clave + variante + ' pesa demasiado');
    }
  }
  assert.equal(vistos.size, 15, 'una portada distinta por curso');
});

test('portadas: el título más específico gana y lo desconocido conserva su imagen', () => {
  // "Impacto Ambiental" aparece en dos cursos: el de rescate debe usar su propia portada
  assert.equal(P.claveDe({ title: 'Rescate y reubicación de fauna en proyectos de impacto ambiental' }), 'curso-rescate-reubicacion');
  assert.equal(P.claveDe({ title: 'Curso nuevo de nutrición animal' }), '');
  assert.equal(P.paraCurso({ title: 'Curso nuevo de nutrición animal', image: 'https://x.test/a.jpg' }, '../'), '');
  assert.equal(P.paraCurso(null), '');
  assert.equal(P.paraCurso({ title: 'Mariposarios', portadaPropia: true }, '../'), '', 'el admin puede fijar una portada propia');
  assert.match(P.paraCurso({ title: 'Mariposarios' }, '../', '4x3'), /curso-mariposarios-4x3\.webp$/);
});

test('portadas: las páginas la cargan antes de usarla y no quedan volantes como portada', () => {
  const biblio = leer('pages/club-biblioteca.html');
  assert.ok(biblio.indexOf('club-portadas.js') > -1 && biblio.indexOf('club-portadas.js') < biblio.indexOf('const imagen = (window.ZOO_PORTADAS'), 'se carga antes de usarse');
  assert.match(biblio, /ZOO_PORTADAS\.paraCurso\(c, '\.\.\/'\)/);
  const dash = leer('pages/club-dashboard.html');
  assert.ok(dash.indexOf('club-portadas.js') > -1 && dash.indexOf('club-portadas.js') < dash.indexOf('club-inicio.js'));
  assert.match(leer('assets/js/club-inicio.js'), /ZOO_PORTADAS/);
});

/* ───────── Personajes de cada apartado ───────── */

const CLAVES = ['cursos', 'pdfs', 'herramientas', 'infusiones', 'legal', 'registro', 'sesiones', 'videos', 'foro', 'directorio', 'retos', 'logros', 'certificados', 'referidos', 'perfil', 'suscripcion', 'canal'];

test('personajes: los 17 apartados tienen personaje distinto, archivo WebP ligero, animación e íconos', () => {
  const D = S.DECORACION;
  assert.deepEqual(Object.keys(D).sort(), CLAVES.slice().sort());
  const personajes = new Set();
  const css = leer('assets/css/club-seccion.css');
  for (const k of CLAVES) {
    const d = D[k];
    assert.ok(!personajes.has(d.personaje), 'personaje repetido: ' + d.personaje);
    personajes.add(d.personaje);
    const f = path.join(RAIZ, 'assets', 'img', 'guia', 'secciones', d.personaje + '.webp');
    assert.ok(fs.existsSync(f), 'falta ' + d.personaje + '.webp');
    assert.ok(fs.statSync(f).size < 70 * 1024, d.personaje + ' pesa demasiado');
    assert.ok(S.ANIMACIONES.includes(d.animacion), k + ': animación desconocida ' + d.animacion);
    const kf = 'zsp' + d.animacion.charAt(0).toUpperCase() + d.animacion.slice(1);
    assert.ok(css.includes('@keyframes ' + kf), k + ': falta @keyframes ' + kf);
    assert.ok(S.ANIMACIONES_DECOR.includes(d.deco), k + ': deco desconocida');
    assert.ok(S.ACENTOS.includes(d.acento), k + ': acento desconocido');
    assert.ok(d.iconos.length >= 4 && d.iconos.every(i => S.trazo(i)), k + ': íconos sin trazo');
  }
  assert.equal(personajes.size, 17);
});

test('personajes: la tarjeta pinta decoración y personaje; sin la imagen conocida queda solo la decoración', () => {
  const con = S.html({ seccion: 'cursos', icono: 'library', eyebrow: 'Catálogo', titulo: 'Cursos', acento: 'a tu ritmo.', base: '../' });
  assert.match(con, /zs-seccion--con-personaje/);
  assert.match(con, /src="\.\.\/assets\/img\/guia\/secciones\/seccion-cursos\.webp"/);
  assert.match(con, /data-anim="asiente"/);
  assert.match(con, /class="zs-deco"/);
  const sin = S.html({ seccion: 'cursos', titulo: 'Cursos', decoracion: false });
  assert.doesNotMatch(sin, /zs-personaje/);
  assert.doesNotMatch(sin, /zs-deco/);
  assert.equal(S.debePintarPersonaje(S.DECORACION.cursos, ['seccion-cursos']), false);
  assert.equal(S.debePintarPersonaje(S.DECORACION.cursos, ['otro']), true);
  assert.equal(S.debePintarPersonaje(null, []), false);
  // alias de menú
  assert.equal(S.claveDeco('biblioteca'), 'cursos');
  assert.equal(S.claveDeco('inventario'), 'registro');
  assert.equal(S.claveDeco('inicio'), '', 'el Inicio conserva a Jaguarito');
});

test('personajes: se apagan con reducir movimiento y la tarjeta no usa degradados ni emojis', () => {
  const css = leer('assets/css/club-seccion.css');
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  const bloque = css.slice(css.indexOf('prefers-reduced-motion'));
  assert.match(bloque, /animation:\s*none/);
  assert.match(css, /\.is-pausa/);
  const js = leer('assets/js/club-seccion.js');
  assert.doesNotMatch(js + css, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  assert.match(js, /RUTA_PERSONAJES = 'assets\/img\/guia\/secciones\/'/);
});
