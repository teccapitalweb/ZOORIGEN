'use strict';

// Con créditos se puede escoger UN solo libro por cuenta (los demás materiales no tienen límite). El servidor lo hace cumplir; aquí se explica:
// nota en cada libro cerrado, confirmación específica, «Ya canjeaste tu libro con créditos» con el botón desactivado, ayuda de la pastilla,
// línea en la felicitación y marca «Libro» en el historial del panel. Ejecutar: node --test tests/club-creditos-libro.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const C = require('../assets/js/club-creditos.js');
const A = require('../assets/js/admin-creditos.js');
const item = { clave: 'libro:ley-fauna-mx', costo: 100, desbloqueado: false, titulo: 'Fauna silvestre y ley en México' };
const SIN_EMOJI = h => !/[\p{Extended_Pictographic}\u{FE0F}]/u.test(h);

test('libro cerrado y canjeable: «Canjeable con créditos: puedes escoger UN solo libro», «o canjéalo por 100 créditos» y el botón Canjear', () => {
  const h = C.canjeHTML(item, 200, 100, { alternativa: true, libro: true });
  assert.match(h, /Canjeable con créditos: puedes escoger UN solo libro/);
  assert.match(h, /o canjéalo por 100 créditos/);
  assert.match(h, /data-canjear="libro:ley-fauna-mx"/);
  assert.match(h, />Canjear</);
  assert.ok(SIN_EMOJI(h));
  // un PDF o un Excel no lleva la nota: no tienen límite
  assert.doesNotMatch(C.canjeHTML({ clave: 'pdf:x', costo: 100 }, 200, 100, { alternativa: true }), /UN solo libro/);
});

test('sin saldo suficiente el libro sigue diciendo que se puede escoger UNO, y el botón dice «Te faltan créditos»', () => {
  const h = C.canjeHTML(item, 40, 100, { alternativa: true, libro: true });
  assert.match(h, /puedes escoger UN solo libro/);
  assert.match(h, /Te faltan créditos/);
});

test('después de canjear UN libro, los demás dicen «Ya canjeaste tu libro con créditos» y el botón queda desactivado (sin data-canjear)', () => {
  const h = C.canjeHTML(item, 500, 100, { alternativa: true, libro: true, yaCanjeoLibro: true });
  assert.match(h, /Ya canjeaste tu libro con créditos/);
  assert.match(h, /<button type="button" class="zcr-btn is-falta" disabled aria-disabled="true"/);
  assert.doesNotMatch(h, /data-canjear/);
  assert.doesNotMatch(h, /puedes escoger UN solo libro/);
  assert.ok(SIN_EMOJI(h));
  // el libro que sí canjeó dice Desbloqueado
  assert.match(C.canjeHTML({ clave: 'libro:ley-fauna-mx', desbloqueado: true }, 0, 100, { alternativa: true, libro: true, yaCanjeoLibro: false }), /Desbloqueado/);
});

test('textos del libro: confirmación exacta con el nombre y botones «Mejor no» / «Sí, canjear este libro»', () => {
  const T = C.TEXTOS;
  assert.equal(T.libroConfirmarTexto('«Fauna silvestre y ley en México»', 100),
    'Solo puedes canjear UN libro con créditos y no se puede cambiar. Se descontarán 100 créditos y el libro «Fauna silvestre y ley en México» quedará desbloqueado para ti. ¿Quieres este libro?');
  assert.equal(T.libroConfirmarSi, 'Sí, canjear este libro');
  assert.equal(T.libroUno, 'Canjeable con créditos: puedes escoger UN solo libro');
  assert.equal(T.libroYa, 'Ya canjeaste tu libro con créditos');
  const js = leer('assets/js/club-creditos.js');
  assert.match(js, /function confirmarCanje\(titulo, costo, opc\)/);
  assert.match(js, /data-no>Mejor no<\/button>/);
  assert.match(js, /esc\(libro \? TEXTOS\.libroConfirmarSi : 'Canjear'\)/);
  assert.match(js, /TEXTOS\.libroConfirmarTexto\('«' \+ titulo \+ '»', costo \|\| COSTO\)/);
});

test('la pantalla manda la confirmación de libro, bloquea otro libro y actualiza al instante el libro canjeado', () => {
  const js = leer('assets/js/club-materiales.js');
  assert.match(js, /m\.confirmarCanje\(item\.titulo, c\.costo, \{ libro: esLibro \}\)/);
  assert.match(js, /if \(esLibro && c\.libroCanjeado && 'libro:' \+ c\.libroCanjeado !== clave\) \{ toast\('Ya canjeaste tu libro con créditos\./);
  assert.match(js, /if \(estado\.creditos && esLibro\) estado\.creditos\.libroCanjeado = clave\.slice\(6\);/);
  assert.match(js, /opc\.libro = true; opc\.yaCanjeoLibro = !!c\.libroCanjeado && c\.libroCanjeado !== id;/);
  // el libro canjeado sale del servidor (libroCanjeadoId) y, si el servidor es anterior, de lo desbloqueado
  assert.match(js, /typeof r\.libroCanjeadoId === 'string' \? r\.libroCanjeadoId : ''/);
  assert.match(js, /if \(\/\^libro:\/\.test\(k\) && porClave\[k\]\.desbloqueado\) libroYa = k\.slice\(6\)/);
});

test('un servidor anterior (sin libros ni libroCanjeadoId) no rompe nada: la nota se ve y el 409 del servidor se muestra tal cual', () => {
  const js = leer('assets/js/club-materiales.js');
  const i = js.indexOf("club.apiFetch('/api/creditos/canjear'");
  assert.match(js.slice(i, i + 2600), /toast\(err && err\.message \? err\.message : 'No se pudo canjear\. Inténtalo de nuevo\.', true\);\s*if \(err && \(err\.status === 409 \|\| err\.status === 402\)\) return cargar\(\);/);
  // la parte pura funciona sin ningún dato nuevo
  assert.doesNotThrow(() => C.canjeHTML(item, 100, 100, {}));
  assert.doesNotThrow(() => C.canjeHTML(item, 100, 100));
});

test('la pastilla «Tus créditos» y su ayuda mencionan «Con créditos puedes escoger un libro»', () => {
  assert.match(C.AYUDA, /Con créditos puedes escoger un libro\./);
  assert.match(C.pastillaHTML(100), /Con créditos puedes escoger un libro\./);
  assert.match(C.AYUDA, /100 créditos = 1 material/);
});

test('la felicitación agrega «Recuerda: con créditos puedes escoger un solo libro»', () => {
  for (const n of [100, 300, 250]) {
    const h = C.tarjetaHTML({ ok: true, avisoPendiente: n });
    assert.match(h, /id="zcr-libro">Recuerda: con créditos puedes escoger un solo libro</);
    assert.match(h, /Felicidades, has ganado/);
  }
  assert.ok(SIN_EMOJI(C.tarjetaHTML({ avisoPendiente: 100 })));
});

test('panel: en el historial de canjes se indica cuando el canje fue un libro', () => {
  const fila = canjes => A.filaRegalo({ id: 'r', uid: 'a', nombre: 'Ana', correo: 'a@x.test', cantidad: 300, en: '2026-10-20T16:00:00Z', regaladoPor: 'admin@x.test', estado: 'parcial', materialesTotal: 3, materialesCanjeados: canjes.length, canjes });
  const h = fila([{ titulo: 'Fauna silvestre y ley en México', esLibro: true, en: '2026-10-21T10:00:00Z' }, { titulo: 'Inventario de botiquín', esLibro: false, en: '2026-10-22T10:00:00Z' }]);
  assert.match(h, /Fauna silvestre y ley en México<\/span><span class="ap-hr__libro">Libro<\/span>/);
  assert.equal((h.match(/ap-hr__libro/g) || []).length, 1, 'solo el libro lleva la marca');
  assert.match(h, /Inventario de botiquín<\/span><\/span>/);
  assert.ok(SIN_EMOJI(h));
});

test('estilos nuevos: sin degradados, letra mínima de 12 px y botón desactivado sin cursor de acción', () => {
  for (const [rel, desde] of [['assets/css/club-creditos.css', 'Libros: con créditos se puede escoger UN solo libro'], ['assets/css/admin-club.css', '.ap-hr__libro']]) {
    const css = leer(rel); const b = css.slice(css.indexOf(desde));
    assert.ok(b.length > 60, rel);
    assert.doesNotMatch(b, /gradient/i);
    for (const m of b.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])) >= 12, rel + ' ' + m[0]);
  }
  assert.match(leer('assets/css/club-creditos.css'), /\.zcr-btn\[disabled\] \{ cursor: not-allowed;/);
});
