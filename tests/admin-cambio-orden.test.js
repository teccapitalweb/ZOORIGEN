'use strict';

// Panel de administración · Retos · «Cambio de orden de cursos»: lista de quién lo usó (con buscador y orden), embudo, cambios por día,
// cursos más elegidos, estado vacío y error. Se dibuja con un navegador falso mínimo y datos como los que manda GET /api/admin/cambios-orden.
// Ejecutar: node --test tests/admin-cambio-orden.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const I = require(path.join(RAIZ, 'assets', 'js', 'admin-iconos.js'));
const F = require(path.join(RAIZ, 'assets', 'js', 'admin-filas.js'));
const G = require(path.join(RAIZ, 'assets', 'js', 'admin-graficas.js'));
const vistasJs = leer('assets/js/admin-vistas.js');
const css = leer('assets/css/admin-club.css');
const html = leer('pages/admin-club.html');

function cargarVistas() {
  const contenedor = { innerHTML: '', onclick: null, oninput: null, onchange: null };
  const elementos = {};
  const el = id => (elementos[id] = elementos[id] || { id, innerHTML: '', value: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, classList: { toggle() {}, add() {}, remove() {} } });
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.self = sandbox;
  sandbox.ZOO_ADMIN_PANEL = P; sandbox.ZOO_ICONOS = I; sandbox.ZOO_ADMIN_FILAS = F; sandbox.ZOO_ADMIN_GRAFICAS = G;
  sandbox.document = { createElement: () => ({}), body: {}, querySelector: () => null, getElementById: el, addEventListener() {}, removeEventListener() {} };
  vm.createContext(sandbox);
  vm.runInContext(vistasJs, sandbox);
  return { V: sandbox.ZOO_ADMIN_VISTAS, contenedor, el, elementos };
}

const ahora = Date.now();
const iso = dias => new Date(ahora - dias * 86400000).toISOString();
const diaMx = dias => new Date(ahora - dias * 86400000 - 6 * 3600000).toISOString().slice(0, 10);

function cambios(extra = {}) {
  const lista = [
    { id: 'a', uid: 'elena', nombre: 'Elena <b>Mora</b>', correo: 'e****@example.com', n: 1, cursoId: 'c4', curso: 'Manejo de aves rapaces', anteriorCursoId: 'c2', anterior: 'Primeros auxilios en fauna', deLugar: 3, aLugar: 1, en: iso(6), retos: { quiz: 21, detective: 8, orden: 9, total: 38 } },
    { id: 'b', uid: 'felipe', nombre: 'Felipe Núñez', correo: 'f****@example.com', n: 1, cursoId: 'c4', curso: 'Manejo de aves rapaces', anteriorCursoId: 'c2', anterior: 'Primeros auxilios en fauna', deLugar: 3, aLugar: 1, en: iso(1), retos: { quiz: 22, detective: 14, orden: 14, total: 50 } },
    { id: 'c', uid: 'gabriela', nombre: 'Gabriela Pino', correo: 'g****@example.com', n: 1, cursoId: 'c5', curso: 'Bienestar animal', anteriorCursoId: '', anterior: '', deLugar: 4, aLugar: 1, en: iso(3), retos: null }
  ];
  return {
    ok: true, maximo: 1, tramos: [{ n: 1, total: 35, porTipo: 8 }], total: 3, resumen: { cambios: 3, personas: 3 },
    embudo: [
      { id: 'activos', nombre: 'Miembros activos', personas: 12 }, { id: 'conRetos', nombre: 'Con al menos 1 reto nuevo', personas: 9 },
      { id: 'alcanzaron', nombre: 'Llegaron a 35 retos (pueden cambiar)', personas: 6 }, { id: 'usaron', nombre: 'Ya usaron el cambio', personas: 3 },
      { id: 'disponibles', nombre: 'Lo tienen disponible y no lo han usado', personas: 3 }
    ],
    puedenSinUsar: [{ uid: 'diego', nombre: 'Diego Paz', correo: 'd****@example.com', retos: 35, usados: 0 }],
    porDia: Array.from({ length: 30 }, (_, i) => ({ dia: diaMx(29 - i), cambios: [29 - i === 6 ? 1 : 0, 29 - i === 3 ? 1 : 0, 29 - i === 1 ? 1 : 0].reduce((a, b) => a + b, 0) })),
    cursos: [{ cursoId: 'c4', curso: 'Manejo de aves rapaces', veces: 2 }, { cursoId: 'c5', curso: 'Bienestar animal', veces: 1 }],
    cambios: lista, ...extra
  };
}
const retosBase = () => ({ ok: true, totales: { conActividad: 2, retosSuperados: 10, xpTotal: 100, xpPromedio: 50 } });
const usuarios = () => ({ ok: true, total: 1, conRetos: 1, usuarios: [{ uid: 'elena', nombre: 'Elena', esMiembro: true, membresia: 'activa', admin: false, xp: 5, xpTotal: 9, nivel: { id: 1, nombre: 'Aprendiz' }, superados: 4, dias: 2, ultimaVez: iso(1), porReto: { quiz: { veces: 1, superados: 1, perfectos: 0 } }, cambioOrden: { usados: 1, maximo: 1, contados: 38 } }], graficas: { porTipo: [], niveles: [], porDia: [], eventosEnDias: 0, historialDesde: null } });
const historial = () => ({ ok: true, pagina: 1, paginas: 1, limite: 25, totales: { eventos: 0, personas: 0, xp: 0 }, historialDesde: null, eventos: [] });

async function abrir(respCambios) {
  const { V, contenedor, el, elementos } = cargarVistas();
  const llamadas = [];
  V.iniciar({
    api: async ruta => {
      llamadas.push(ruta);
      if (ruta.startsWith('/api/admin/cambios-orden')) { if (respCambios instanceof Error) throw respCambios; return respCambios; }
      if (ruta.startsWith('/api/admin/retos/usuarios')) return usuarios();
      if (ruta.startsWith('/api/admin/retos/historial')) return historial();
      return retosBase();
    },
    toast() {}, contenedor: () => contenedor
  });
  await V.retos();
  await new Promise(r => setTimeout(r, 20));
  return { contenedor, el, elementos, llamadas };
}

test('Retos pide GET /api/admin/cambios-orden y deja un lugar propio para la sección, entre las gráficas y el historial', async () => {
  const { contenedor, llamadas } = await abrir(cambios());
  assert.ok(llamadas.includes('/api/admin/cambios-orden'));
  const h = contenedor.innerHTML;
  assert.ok(h.indexOf('id="apCOContenedor"') > h.indexOf('Retos superados por día'), 'después de las gráficas de retos');
  assert.ok(h.indexOf('id="apCOContenedor"') < h.indexOf('Historial de retos resueltos'), 'antes del historial');
});

test('la lista muestra nombre, correo enmascarado, fecha y hora, retos por tipo, curso nuevo y curso que iba primero, y escapa el texto', async () => {
  const { elementos } = await abrir(cambios());
  const sec = elementos.apCOContenedor.innerHTML;
  const lista = elementos.apCOLista.innerHTML;
  assert.match(sec, /Cambio de orden de cursos/);
  assert.match(sec, /Cada miembro tiene <strong>1 cambio<\/strong>/);
  assert.match(sec, /35 retos nuevos<\/strong> \(mínimo 8 de cada tipo\)/);
  assert.doesNotMatch(sec, /55 retos|segundo cambio|2 cambios/);
  // lista
  assert.match(lista, /Felipe Núñez/);
  assert.match(lista, /f\*{4}@example\.com/);
  assert.match(lista, /Quiz 22<\/span><span>Detective 14<\/span><span>Ordena 14/);
  assert.match(lista, /50 retos nuevos/);
  assert.match(lista, /<strong>Manejo de aves rapaces<\/strong>/);
  assert.match(lista, /Antes iba primero: Primeros auxilios en fauna/);
  assert.match(lista, /Estaba en el lugar 3 de los cursos cerrados y pasó al 1/);
  assert.match(lista, /Sin dato/, 'un registro viejo sin retos ni curso anterior no rompe la tabla');
  assert.doesNotMatch(lista, /<b>Mora<\/b>/);
  assert.match(lista, /Elena &lt;b&gt;Mora&lt;\/b&gt;/);
  // más reciente primero: Felipe (hace 1 día), Gabriela (3) y Elena (6)
  assert.ok(lista.indexOf('Felipe') < lista.indexOf('Gabriela') && lista.indexOf('Gabriela') < lista.indexOf('Elena'));
  assert.match(lista, /Mostrando 3 de 3/);
});

test('buscador y orden de la lista: por nombre, correo o curso; más antiguo primero; por nombre', async () => {
  const { contenedor, elementos } = await abrir(cambios());
  const dibujar = () => elementos.apCOLista.innerHTML;
  const dentro = { id: 'apCOQ', value: 'bienestar' };
  contenedor.oninput({ target: dentro });
  assert.match(dibujar(), /Gabriela/);
  assert.doesNotMatch(dibujar(), /Felipe|Elena/);
  contenedor.oninput({ target: { id: 'apCOQ', value: 'núñez' } });
  assert.match(dibujar(), /Felipe/);
  assert.doesNotMatch(dibujar(), /Gabriela/);
  contenedor.oninput({ target: { id: 'apCOQ', value: 'zzz' } });
  assert.match(dibujar(), /Nadie coincide con esa búsqueda/);
  contenedor.oninput({ target: { id: 'apCOQ', value: '' } });
  contenedor.onchange({ target: { id: 'apCOOrden', value: 'antiguo' } });
  assert.ok(dibujar().indexOf('Elena') < dibujar().indexOf('Gabriela') && dibujar().indexOf('Gabriela') < dibujar().indexOf('Felipe'));
  contenedor.onchange({ target: { id: 'apCOOrden', value: 'nombre' } });
  assert.ok(dibujar().indexOf('Elena') < dibujar().indexOf('Felipe') && dibujar().indexOf('Felipe') < dibujar().indexOf('Gabriela'));
});

test('el embudo trae los cinco pasos con su número y una nota que explica cada uno; los cambios por día y los cursos más elegidos tienen su gráfica', async () => {
  const { elementos } = await abrir(cambios());
  const sec = elementos.apCOContenedor.innerHTML;
  for (const t of ['Miembros activos', 'Con al menos 1 reto nuevo', 'Llegaron a 35 retos (pueden cambiar)', 'Ya usaron el cambio', 'Lo tienen disponible y no lo han usado']) assert.ok(sec.includes(t), t);
  assert.match(sec, /Membresía vigente, sin contar cuentas de administración/);
  assert.match(sec, /Ya cumple los retos y todavía no lo usa/);
  assert.match(sec, /<strong>12<\/strong>/);
  assert.match(sec, /Cambios por día/);
  assert.match(sec, /Últimos 30 días, hora de México/);
  assert.match(sec, /Cursos más elegidos/);
  assert.match(sec, /Manejo de aves rapaces/);
  assert.match(sec, /Pueden cambiar y no lo han hecho/);
  assert.match(sec, /Diego Paz/);
  assert.match(sec, /Ya lo usaron/);
});

test('sin cambios todavía: estado vacío claro y sin romper el resto', async () => {
  const vacio = cambios({ total: 0, cambios: [], cursos: [], puedenSinUsar: [], resumen: { cambios: 0, personas: 0 }, porDia: cambios().porDia.map(d => ({ ...d, cambios: 0 })) });
  const { elementos } = await abrir(vacio);
  assert.match(elementos.apCOLista.innerHTML, /Todavía nadie ha usado el cambio de orden/);
  assert.match(elementos.apCOContenedor.innerHTML, /Todavía nadie ha usado el cambio de orden/);
  assert.match(elementos.apCOContenedor.innerHTML, /Nadie está esperando/);
});

test('si el servidor falla, solo esa sección muestra el error con «Reintentar» (el resto de Retos se ve)', async () => {
  const e = new Error('boom'); e.status = 500;
  const { contenedor, elementos } = await abrir(e);
  assert.match(elementos.apCOContenedor.innerHTML, /Reintentar/);
  assert.match(elementos.apCOContenedor.innerHTML, /data-accion="recargar-co"/);
  assert.match(contenedor.innerHTML, /Historial de retos resueltos/);
});

test('la tabla «Todas las personas» dice «N de M» con el máximo que manda el servidor (no «de 2» escrito a fuego)', async () => {
  const { elementos } = await abrir(cambios());
  assert.match(elementos.apRUsuarios.innerHTML, /1 de 1/);
  assert.doesNotMatch(leer('assets/js/admin-vistas.js'), /' de 2'/);
});

test('modo de 2 cambios: la misma sección habla de 2 cambios sin tocar el código', async () => {
  const { elementos } = await abrir(cambios({ maximo: 2, tramos: [{ n: 1, total: 35, porTipo: 8 }, { n: 2, total: 55, porTipo: 14 }] }));
  assert.match(elementos.apCOContenedor.innerHTML, /Cada miembro tiene <strong>2 cambios<\/strong>/);
});

test('estilos y versiones: iconos Lucide del panel, colores sólidos, sin emojis, y los archivos del panel suben juntos', () => {
  const bloque = css.slice(css.indexOf('Retos > Cambio de orden de cursos'));
  assert.ok(bloque.length > 200);
  assert.doesNotMatch(bloque, /gradient/i);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(bloque));
  const codigo = vistasJs.slice(vistasJs.indexOf('Cambio de orden de cursos (dentro de Retos)'), vistasJs.indexOf('function nombreReto'));
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(codigo));
  for (const n of ['calendar-clock', 'users', 'history', 'info', 'search', 'search-x']) assert.ok(I.existe(n), n);
  const v = html.match(/admin-club\.css\?v=([\w-]+)/)[1];
  assert.equal(html.match(/admin-vistas\.js\?v=([\w-]+)/)[1], v);
  assert.equal(html.match(/admin-panel\.js\?v=([\w-]+)/)[1], v);
});

test('en celular la lista sigue compacta: el contenedor esconde las columnas de fecha y retos y su resumen sale bajo el nombre', async () => {
  const { elementos } = await abrir(cambios());
  const lista = elementos.apCOLista.innerHTML;
  assert.match(lista, /<th scope="col" class="ap-col-2">Fecha y hora<\/th><th scope="col" class="ap-col-2">Retos al cambiar<\/th>/);
  assert.match(lista, /ap-sub ap-solo-estrecho">[^<]*· 50 retos nuevos \(Quiz 22, Detective 14, Ordena 14\)/);
  assert.match(css, /\.ap-solo-estrecho \{ display: none; \}/);
  assert.match(css, /@container tabla \(max-width: 899px\) \{\s*\.ap-solo-estrecho \{ display: block; \}/);
  assert.doesNotMatch(css.slice(css.indexOf('ap-solo-estrecho')), /attr\(data-label\)/, 'sin pasar a tarjetas grandes');
});
