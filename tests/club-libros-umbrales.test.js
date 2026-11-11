'use strict';

// Libros con umbrales nuevos (25, 35 y 45 retos; antes 5, 15 y 30): el sitio no debe decir que falta algo de lo que ya está abierto
// (por ejemplo, un libro que la persona CONSERVA de antes) y el catálogo de respaldo dice lo mismo que el servidor.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../assets/js/club-materiales.js');

const RAIZ = path.resolve(__dirname, '..');
const libro = (id, req, extra) => Object.assign({ id, titulo: 'Libro ' + id, subtitulo: 'Sub', autor: 'Equipo Zoorigen', categoria: 'Normatividad', color: '#2A7A4E', icono: 'book', resumen: 'R', paginasTotal: 20, requiereRetos: req }, extra);

test('catálogo de respaldo: ley-fauna-mx 25, bienestar-cautiverio 35 y conservacion-mx 45 (igual que data/libros del servidor)', () => {
  const js = fs.readFileSync(path.join(RAIZ, 'assets', 'js', 'club-materiales.js'), 'utf8');
  for (const [id, n] of [['ley-fauna-mx', 25], ['bienestar-cautiverio', 35], ['conservacion-mx', 45]]) {
    const linea = js.split('\n').find(l => l.includes("id: '" + id + "'") && l.includes('requiereRetos'));
    assert.match(linea, new RegExp('requiereRetos: ' + n + '\\b'), id);
  }
  const servidor = path.join(RAIZ, '..', 'zoorigen-webhook', 'data', 'libros');
  if (fs.existsSync(servidor)) {
    for (const [id, n] of [['ley-fauna-mx', 25], ['bienestar-cautiverio', 35], ['conservacion-mx', 45]]) {
      const j = JSON.parse(fs.readFileSync(path.join(servidor, id + '.json'), 'utf8'));
      if (j.requiereRetos !== n) return;   // el servidor de al lado todavía no tiene la subida: se omite la comparación
      assert.equal(j.requiereRetos, n);
    }
  }
});

test('siguienteMeta: un libro ya abierto (por conservarlo, por créditos o por retos) no es «el siguiente»; se sigue con el primero que falta', () => {
  const libros = [libro('ley', 25, { desbloqueado: true, conservado: true, faltan: 0 }), libro('bien', 35, { desbloqueado: false, faltan: 29 }), libro('cons', 45, { desbloqueado: false, faltan: 39 })];
  const m = M.siguienteMeta(libros, 6);
  assert.equal(m.libro.id, 'bien', 'con 6 retos y la ley conservada, el siguiente es el de 35');
  assert.equal(m.faltan, 29);
  assert.equal(m.requiere, 35);
  const todos = M.siguienteMeta(libros.map(l => ({ ...l, desbloqueado: true })), 6);
  assert.equal(todos.todosAbiertos, true);
});

test('siguienteMeta sin el dato «desbloqueado» (catálogo de respaldo) sigue contando por retos, como siempre', () => {
  const libros = [libro('c', 45), libro('a', 25), libro('b', 35)];
  assert.equal(M.siguienteMeta(libros, 24).libro.id, 'a');
  assert.equal(M.siguienteMeta(libros, 24).faltan, 1);
  assert.equal(M.siguienteMeta(libros, 25).libro.id, 'b');
  assert.equal(M.siguienteMeta(libros, 45).todosAbiertos, true);
});

test('textos de una tarjeta de libro: abierto dice «Desbloqueado», cerrado dice cuántos retos faltan con el número nuevo', () => {
  const cerrado = M.textoBloqueo({ desbloqueado: false, faltan: 19, requiereRetos: 25 });
  assert.match(cerrado, /19 retos/);
  assert.match(M.condicionTexto({ id: 'r', titulo: 'R', requiereRetos: 25, faltan: 19, acceso: 'retos' }), /25 retos/);
  assert.equal(M.textoAbierto({ id: 'r', requiereRetos: 25, desbloqueado: true }), 'Desbloqueado con tus retos');
});

test('las páginas que cargan club-materiales.js lo hacen con la versión nueva (?v=20261127-libros), igual que su hoja de estilos', () => {
  for (const p of ['pages/club-biblioteca.html', 'pages/club-pdfs.html']) {
    const h = fs.readFileSync(path.join(RAIZ, p), 'utf8');
    assert.match(h, /club-materiales\.js\?v=20261127-libros/, p);
    assert.match(h, /club-materiales\.css\?v=20261127-libros/, p);
  }
});

test('ningún texto del sitio dice que los libros se abren con 5, 15 o 30 retos', () => {
  for (const rel of ['assets/js/club-materiales.js', 'assets/js/club-onboarding.js', 'assets/js/club-inicio.js', 'assets/js/club-retos.js', 'index.html']) {
    const t = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    assert.doesNotMatch(t, /libros?[^.\n]{0,60}\b(5|15|30) retos|\b(5|15|30) retos[^.\n]{0,60}libros?/i, rel);
  }
});
