'use strict';

// Portadas de los cursos: jerarquía única (propia fijada por el administrador > título > imagen que ya traía > por defecto),
// imagen por defecto de la marca, formulario del administrador con vista previa y pantallas del Club.
// Ejecutar: node --test tests/admin-portadas-cursos.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const PO = require(path.join(RAIZ, 'assets', 'js', 'club-portadas.js'));
const CU = require(path.join(RAIZ, 'assets', 'js', 'admin-cursos.js'));

const QUINCE = [
  'Monitoreo y Conservación de Felinos Silvestres en México', 'Monitoreo y Conservación de Aves como Bioindicadoras', 'Manejo y Rehabilitación de Aves Rapaces en Cautiverio',
  'FOTOTRAMPEO Y ANÁLISIS DE DATOS PARA EL MONITOREO DE MAMÍFEROS SILVESTRES', 'Mariposarios Manejo, Conservación y Educación Ambiental', 'Introducción a la Entomología Forense y Biodiversidad de Artrópodos',
  'Etología Aplicada en Fauna Silvestre bajo Cuidado Humano', 'Fauna Ponzoñosa de México Identificación y Primeros Auxilios', 'Biología, Ecología y Conservación de Tiburones y Rayas',
  'Entrenamiento Básico Canino Obediencia y Comportamiento', 'Legislación y Manejo de Fauna Silvestre en UMAs y Zoológicos', 'Manifiesto de Impacto Ambiental Elaboración, Evaluación y Gestión',
  'Vigilancia y control de vectores en Zoonosis y salud pública', 'Ultrasonografía y Diagnóstico por Imagen en Mamíferos Silvestres y Exóticos', 'Rescate y Reubicación de Fauna Silvestre en Proyectos de Impacto Ambiental'
];

test('la portada por defecto existe, es vectorial, de colores sólidos y sin texto', () => {
  const svg = leer('assets/img/cursos/portadas/curso-por-defecto.svg');
  assert.match(svg, /^<svg /);
  assert.doesNotMatch(svg, /gradient|<text|<image|<script|<foreignObject/i);
  assert.match(svg, /<path /);
  assert.match(svg, /#1F5F3A/i);
  assert.ok(svg.length < 3000);
});

test('los 15 cursos reales siguen con su portada por título (nada cambia)', () => {
  for (const t of QUINCE) {
    const antes = PO.paraCurso({ title: t }, '../');
    assert.match(antes, /curso-[a-z-]+\.webp$/, t);
    assert.equal(PO.resolver({ title: t }, '../'), antes, t);
    assert.equal(PO.resolver({ title: t, image: 'https://x.com/volante.jpg' }, '../'), antes, 'un volante antiguo no gana a la portada por título: ' + t);
    assert.equal(PO.origenDe({ title: t }), 'titulo');
  }
});

test('jerarquía: propia fijada > título > imagen que ya traía > por defecto', () => {
  const propia = { title: 'Fototrampeo avanzado', image: 'https://x.com/mia.jpg', portadaPropia: true };
  assert.equal(PO.resolver(propia, '../'), 'https://x.com/mia.jpg');
  assert.equal(PO.origenDe(propia), 'propia');
  assert.match(PO.resolver({ title: 'Fototrampeo avanzado' }, '../'), /curso-fototrampeo\.webp$/);
  // curso nuevo sin portada propia y sin coincidencia de título: la imagen que traía, si es segura
  assert.equal(PO.resolver({ title: 'Curso nuevo', image: 'https://x.com/a.jpg' }, '../'), 'https://x.com/a.jpg');
  assert.equal(PO.origenDe({ title: 'Curso nuevo', image: 'https://x.com/a.jpg' }), 'propia');
  // sin nada: por defecto
  assert.equal(PO.resolver({ title: 'Curso nuevo' }, '../'), '../assets/img/cursos/portadas/curso-por-defecto.svg');
  assert.equal(PO.resolver({}, '../'), '../assets/img/cursos/portadas/curso-por-defecto.svg');
  assert.equal(PO.resolver(null, '../'), '../assets/img/cursos/portadas/curso-por-defecto.svg');
  assert.equal(PO.origenDe({ title: 'Curso nuevo' }), 'defecto');
  // portada fijada pero sin imagen utilizable: por defecto (no la de título)
  assert.match(PO.resolver({ title: 'Fototrampeo', portadaPropia: true, image: '' }, '../'), /curso-por-defecto\.svg$/);
});

test('la imagen propia solo acepta https o rutas del sitio: nada de javascript:, data: ni Drive sin convertir', () => {
  for (const mala of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'http://x.com/a.jpg', 'https://drive.google.com/file/d/abc/view', '//x.com/a.jpg', '../../etc/passwd', 'https://x.com/a b.jpg', 'https://x.com/a".jpg', '']) {
    assert.equal(PO.imagenPropia(mala, '../'), '', JSON.stringify(mala));
    assert.match(PO.resolver({ title: 'Curso nuevo', image: mala }, '../'), /curso-por-defecto\.svg$/);
  }
  assert.equal(PO.imagenPropia('https://x.com/a.jpg', '../'), 'https://x.com/a.jpg');
  assert.equal(PO.imagenPropia('assets/img/cursos/mi-curso.jpg', '../'), '../assets/img/cursos/mi-curso.jpg');
  assert.equal(PO.imagenPropia('../assets/img/cursos/mi-curso.jpg', '../'), '../assets/img/cursos/mi-curso.jpg');
});

/* ───────── administrador ───────── */

test('admin: vistaPortada muestra qué verán los miembros (propia, por título, por defecto o enlace inválido)', () => {
  assert.equal(CU.vistaPortada('https://x.com/a.jpg', { title: 'x' }).origen, 'propia');
  assert.equal(CU.vistaPortada('assets/img/a.jpg', { title: 'x' }).src, '../assets/img/a.jpg');
  const t = CU.vistaPortada('', { title: 'Fototrampeo de jaguares' });
  assert.equal(t.origen, 'titulo');
  assert.match(t.src, /curso-fototrampeo\.webp$/);
  const d = CU.vistaPortada('   ', { title: 'Curso nuevo' });
  assert.equal(d.origen, 'defecto');
  assert.match(d.src, /curso-por-defecto\.svg$/);
  const mala = CU.vistaPortada('javascript:alert(1)', { title: 'Curso nuevo' });
  assert.equal(mala.valido, false);
  assert.match(mala.texto, /no sirve/);
  assert.match(mala.src, /curso-por-defecto\.svg$/);
});

test('admin: cambiosPortada — sin tocar el campo no cambia nada; con enlace se fija; vacío vuelve a la automática', () => {
  // curso de siempre con portada por título: el campo se muestra vacío y, al guardar sin tocarlo, no se escribe nada
  const real = { id: 'a', title: QUINCE[0], image: 'https://viejo.com/volante.jpg' };
  assert.equal(CU.valorCampoPortada(real), '');
  assert.deepEqual(CU.cambiosPortada(real, '', CU.valorCampoPortada(real)), {});
  // curso con imagen propia (heredada): el campo la muestra y, sin tocarlo, tampoco cambia
  const propio = { id: 'b', title: 'Curso nuevo', image: 'https://x.com/a.jpg' };
  assert.equal(CU.valorCampoPortada(propio), 'https://x.com/a.jpg');
  assert.deepEqual(CU.cambiosPortada(propio, 'https://x.com/a.jpg', 'https://x.com/a.jpg'), {});
  // el administrador escribe una imagen: queda fijada y gana al título
  assert.deepEqual(CU.cambiosPortada(real, ' https://x.com/nueva.jpg ', ''), { image: 'https://x.com/nueva.jpg', portadaPropia: true });
  // el administrador la borra: vacío y sin portada propia
  assert.deepEqual(CU.cambiosPortada(propio, '', 'https://x.com/a.jpg'), { image: '', portadaPropia: false });
  // curso nuevo: sin imagen se guarda vacío (usa la portada por defecto); con imagen, fijada
  assert.deepEqual(CU.cambiosPortada(null, '', ''), { image: '', portadaPropia: false });
  assert.deepEqual(CU.cambiosPortada(null, 'assets/img/cursos/mi.jpg', ''), { image: 'assets/img/cursos/mi.jpg', portadaPropia: true });
});

test('admin: errorPortada rechaza enlaces peligrosos y acepta vacío, https y rutas del sitio', () => {
  assert.equal(CU.errorPortada(''), '');
  assert.equal(CU.errorPortada('https://x.com/a.jpg'), '');
  assert.equal(CU.errorPortada('assets/img/a.jpg'), '');
  assert.match(CU.errorPortada('javascript:alert(1)'), /https:\/\//);
  assert.match(CU.errorPortada('http://x.com/a.jpg'), /https:\/\//);
});

test('admin: la lista y la cuadrícula siempre muestran portada (la de título o la por defecto), nunca el ícono vacío', () => {
  const sin = { id: 'n', title: 'Curso nuevo', area: 'Fauna silvestre' };
  const lista = CU.tarjetaListaHTML(sin);
  assert.match(lista, /ap-ico-miniatura ap-ico-miniatura--portada/);
  assert.match(lista, /curso-por-defecto\.svg/);
  assert.match(lista, /ap-fc--portada/);
  const grid = CU.tarjetaGridHTML(sin);
  assert.match(grid, /curso-por-defecto\.svg/);
  assert.doesNotMatch(grid, /is-vacio|cc-media__ico/);
  assert.match(grid, /data-portada="defecto"/);
  const real = CU.tarjetaListaHTML({ id: 'r', title: QUINCE[3], area: 'Investigación', image: 'https://viejo.com/v.jpg' });
  assert.match(real, /curso-fototrampeo\.webp/);
  assert.doesNotMatch(real, /viejo\.com/);
  const fijada = CU.tarjetaGridHTML({ id: 'p', title: QUINCE[3], area: 'x', image: 'https://x.com/mia.jpg', portadaPropia: true });
  assert.match(fijada, /x\.com\/mia\.jpg/);
  assert.match(fijada, /data-portada="propia"/);
});

test('admin: el formulario trae vista previa, estado, botón para quitar y la ayuda de medidas; el valor se escapa', () => {
  const h = CU.modalCursoHTML({ id: 'z', title: 'Curso', image: 'https://x.com/a.jpg"><script>1</script>', portadaPropia: true }, ['Fauna silvestre']);
  assert.match(h, /id="f_image_vista"/);
  assert.match(h, /id="f_image_estado"[^>]*aria-live="polite"/);
  assert.match(h, /id="f_image_auto"/);
  assert.match(h, /800×450/);
  assert.doesNotMatch(h, /<script>1/);
  const nuevo = CU.modalCursoHTML({}, ['Fauna silvestre']);
  assert.match(nuevo, /data-origen="defecto"/);
  assert.match(nuevo, /id="f_image_auto" hidden/);
  assert.match(nuevo, /portada por defecto de Zoorigen/);
});

test('admin-club.html carga club-portadas.js antes de admin-cursos.js y guarda la portada con la regla nueva', () => {
  const html = leer('pages/admin-club.html');
  assert.ok(html.indexOf('club-portadas.js') > 0 && html.indexOf('club-portadas.js') < html.indexOf('admin-cursos.js'));
  assert.match(html, /CURSOS\.cambiosPortada\(actual, campoImagen\.value, campoImagen\.dataset\.mostrado\)/);
  assert.match(html, /CURSOS\.errorPortada\(campoImagen\.value\)/);
  assert.doesNotMatch(html, /image: document\.getElementById\('f_image'\)\.value\.trim\(\)/);
  assert.match(html, /enlazarPortada\(\)/);
});

/* ───────── Club ───────── */

test('Club: Cursos, detalle, ventana de prueba, juego, Inicio y abanico terminan en la portada por defecto', () => {
  const bib = leer('pages/club-biblioteca.html');
  assert.equal((bib.match(/ZOO_PORTADAS\.defecto\('\.\.\/'\)/g) || []).length, 4, 'las cuatro pantallas de Cursos usan la portada por defecto al final');
  assert.match(leer('assets/js/club-inicio.js'), /ZOO_PORTADAS\.defecto\('\.\.\/'\)/);
  assert.match(leer('assets/js/club-prueba-arte.js'), /P\.propia\(c, base\)/);
});

test('Club: Inicio usa la portada por defecto cuando el curso no tiene portada propia ni por título', () => {
  const I = require(path.join(RAIZ, 'assets', 'js', 'club-inicio.js'));
  global.ZOO_PORTADAS = PO;
  try {
    assert.match(I.fotoDelCurso({ title: 'Curso nuevo', area: 'Etología' }), /curso-por-defecto\.svg$/);
    assert.match(I.fotoDelCurso({ title: QUINCE[3] }), /curso-fototrampeo\.webp$/);
    assert.equal(I.fotoDelCurso({ title: 'Curso nuevo', image: 'https://x.com/a.jpg' }), 'https://x.com/a.jpg');
  } finally { delete global.ZOO_PORTADAS; }
});

test('las versiones ?v= de los scripts cambiados son iguales en todas las páginas que los cargan', () => {
  for (const archivo of ['club-portadas.js', 'club-prueba-arte.js', 'club-inicio.js']) {
    const versiones = new Set();
    for (const f of fs.readdirSync(path.join(RAIZ, 'pages')).filter(x => x.endsWith('.html'))) {
      for (const m of leer('pages/' + f).matchAll(new RegExp('assets/js/' + archivo.replace('.', '\\.') + '\\?v=([\\w.-]+)', 'g'))) versiones.add(m[1]);
    }
    assert.equal(versiones.size, 1, archivo + ': ' + [...versiones].join(', '));
  }
});
