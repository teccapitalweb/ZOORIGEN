'use strict';

// Sección «Créditos» del panel: cifras, cuentas con el botón de regalar, historial de regalos y gráfica de materiales más canjeados.
// Ejecutar: node --test tests/admin-creditos.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const A = require(path.join(RAIZ, 'assets', 'js', 'admin-creditos.js'));

const cuenta = (uid, nombre, extra) => Object.assign({ uid, nombre, correo: uid + '@x.test', registro: '2026-10-10T15:30:00Z', estado: 'sin-plan', conAcceso: false, planTipo: null, saldo: 0, regalados: 0, canjeados: 0, ultimoRegalo: null }, extra);
const regalo = (id, extra) => Object.assign({ id, uid: 'a', nombre: 'Ana Pérez', correo: 'ana@x.test', cantidad: 100, en: '2026-10-20T16:00:00Z', regaladoPor: 'admin@x.test', estado: 'pendiente', canje: null }, extra);
const datos = () => ({
  miembros: { ok: true, truncado: false, miembros: [cuenta('a', 'Ana Pérez', { saldo: 100, ultimoRegalo: '2026-10-20T16:00:00Z', estado: 'activo', planTipo: 'mensual', conAcceso: true }), cuenta('b', 'Beto <b>'), cuenta('c', 'Cecilia Núñez')] },
  historial: {
    total: 2, hayMas: false, totales: { todos: 2, pendientes: 1, canjeados: 1 },
    regalos: [regalo('r1'), regalo('r2', { uid: 'b', nombre: 'Beto', estado: 'canjeado', canje: { materialId: 'pdf:guia-1', titulo: 'Guía de bioseguridad completa', en: '2026-10-21T10:00:00Z' } })]
  },
  metricas: { regalados: 200, canjeados: 100, pendientes: 100, regalos: 2, canjes: 1, materiales: [{ clave: 'pdf:guia-1', titulo: 'Guía de bioseguridad completa', canjes: 1 }] }
});

test('la sección existe en el menú (Comunidad), con ícono y se dibuja desde renderSection', () => {
  const s = P.seccion('creditos');
  assert.ok(s); assert.equal(s.grupo, 'Comunidad'); assert.equal(s.titulo, 'Créditos');
  const html = leer('pages/admin-club.html');
  assert.match(html, /data-sec="creditos"><svg class="zi"/);
  assert.match(html, /sec === 'creditos'\) window\.ZOO_ADMIN_CREDITOS\.creditos\(\)/);
  assert.ok(html.indexOf('admin-creditos.js') > html.indexOf('admin-vistas.js'), 'después de las vistas (usa sus ventanas)');
  assert.ok(html.indexOf('admin-creditos.js') > html.indexOf('admin-graficas.js'));
});

test('arriba, tres cifras reales: créditos regalados, canjeados y pendientes de canjear', () => {
  assert.deepEqual(A.cifras({ regalados: 300, canjeados: 100, pendientes: 200 }).map(c => c.rotulo), ['créditos regalados', 'créditos canjeados', 'pendientes de canjear']);
  assert.deepEqual(A.cifras({ regalados: 300, canjeados: 100, pendientes: 200 }).map(c => c.valor), ['300', '100', '200']);
  assert.deepEqual(A.cifras(null).map(c => c.valor), ['0', '0', '0'], 'sin datos, ceros: nada inventado');
  const h = A.vistaHTML(datos());
  for (const t of ['créditos regalados', 'créditos canjeados', 'pendientes de canjear']) assert.ok(h.includes(t), t);
  assert.match(h, /zs-seccion/);
});

test('cuentas: nombre, correo y fecha de registro en renglones separados, estado, saldo y el botón «Regalar créditos» al costado', () => {
  const h = A.filaMiembro(datos().miembros.miembros[0]);
  assert.match(h, /class="ap-cr__nombre">Ana Pérez</);
  assert.match(h, /ap-mi__linea ap-mi__correo[^>]*>.*a@x\.test/s);
  assert.match(h, /ap-mi__linea ap-mi__reg[^>]*>.*Se registró/s);
  assert.ok(h.indexOf('a@x.test') < h.indexOf('Se registró'), 'el correo y la fecha no comparten renglón');
  assert.match(h, /<strong>100<\/strong><span>créditos<\/span>/);
  assert.match(h, /data-accion="regalar" data-uid="a"[^>]*>.*Regalar créditos</s);
  assert.doesNotMatch(h, /Regalar 100/);
  assert.match(h, /Último regalo/);
  assert.match(h, /Mensual|Activo/);
});

test('cuentas: de la más reciente a la más antigua tal como las manda el servidor, búsqueda sin acentos y «mostrar más»', () => {
  const m = Array.from({ length: 30 }, (_, i) => cuenta('u' + i, 'Persona ' + i));
  const h = A.listaMiembrosHTML(m, 25, '');
  assert.equal((h.match(/class="ap-mi ap-cr/g) || []).length, 25);
  assert.match(h, /Mostrando 25 de 30/);
  assert.match(h, /data-accion="mas-miembros"[^>]*>Mostrar 5 más/);
  assert.ok(h.indexOf('Persona 0<') < h.indexOf('Persona 24<'), 'respeta el orden recibido');
  assert.deepEqual(A.filtrarMiembros([cuenta('a', 'Núñez Pérez'), cuenta('b', 'Otra')], 'NUNEZ').map(x => x.uid), ['a']);
  assert.match(A.listaMiembrosHTML([], 25, 'zzz'), /Nadie coincide con esa búsqueda/);
  assert.match(A.listaMiembrosHTML([], 25, ''), /Todavía no hay cuentas/);
});

test('texto de confirmación: «Vas a regalar 100 créditos a NOMBRE. Alcanzan para canjear 1 material.», con el nombre escapado', () => {
  assert.equal(A.textoConfirmacion('Ana Pérez'), 'Vas a regalar 100 créditos a <strong>Ana Pérez</strong>. Alcanzan para canjear 1 material.');
  assert.ok(!A.textoConfirmacion('<img src=x onerror=1>').includes('<img'));
  assert.equal(A.REGALO, 100);
});

test('el botón de regalar se bloquea mientras se procesa, pide la cantidad con confirmación, manda cantidad y clave de operación y avisa con un aviso', () => {
  const js = leer('assets/js/admin-creditos.js');
  assert.match(js, /V\.modal\(\{\s*titulo: 'Regalar créditos'/);
  assert.match(js, /var cantidad = await pedirCantidad\(/);
  assert.match(js, /est\.ocupado/);
  assert.match(js, /\.disabled = true/);
  assert.match(js, /'\/api\/admin\/creditos\/regalar', \{ method: 'POST', body: \{ uid: uid, cantidad: cantidad, clave: nuevaClave\(\) \}/);
  assert.match(js, /ctx\.toast\('Listo: regalaste '/);
  assert.match(js, /getRandomValues/);
  assert.doesNotMatch(js, /costo\s*:|precio\s*:/, 'el costo por material no se manda: lo fija el servidor');
});

test('historial de regalos: a quién, fecha, quién lo regaló y Pendiente o Canjeado con el material y la fecha de canje', () => {
  const h = A.historialHTML(datos().historial, { filtro: 'todos' });
  assert.match(h, /Ana Pérez/);
  assert.match(h, /Por admin@x\.test/);
  assert.match(h, /Pendiente de canjear/);
  assert.match(h, /Todavía no lo canjea/);
  assert.match(h, /Canjeado<\/span>/);
  assert.match(h, /Guía de bioseguridad completa/);
  assert.match(h, /Canjeado 21 oct 2026|Canjeado .*oct/);
  assert.match(h, /data-filtro-regalo="todos" aria-pressed="true">Todos · 2/);
  assert.match(h, /data-filtro-regalo="pendientes" aria-pressed="false">Pendientes · 1/);
  assert.match(h, /data-filtro-regalo="canjeados" aria-pressed="false">Canjeados · 1/);
  assert.match(h, /id="apCrBuscarHistorial"/);
  assert.match(A.historialHTML({ regalos: [], totales: { todos: 0, pendientes: 0, canjeados: 0 }, total: 0 }, {}), /Todavía no has regalado créditos/);
  assert.match(A.historialHTML({ regalos: [], totales: { todos: 3, pendientes: 1, canjeados: 2 }, total: 0 }, { filtro: 'pendientes' }), /Ningún regalo coincide/);
  assert.match(A.historialHTML({ regalos: [regalo('x')], totales: { todos: 40, pendientes: 40, canjeados: 0 }, total: 40, hayMas: true }, {}), /data-accion="mas-regalos"/);
  assert.match(A.historialHTML(null, {}), /Todavía no has regalado créditos/);
});

test('gráfica «Materiales más canjeados»: barras horizontales ordenadas, nombre completo, valor y porcentaje, con «Cómo leerlo» y vacío amable', () => {
  const m = { materiales: [{ clave: 'pdf:a', titulo: 'Material con un nombre bastante largo que no debe recortarse nunca', canjes: 3 }, { clave: 'pdf:b', titulo: 'Otro material', canjes: 1 }] };
  const h = A.graficaHTML(m);
  assert.match(h, /zg-rk/);
  assert.match(h, /Material con un nombre bastante largo que no debe recortarse nunca/);
  assert.match(h, /75 %/);
  assert.ok(h.indexOf('nombre bastante largo') < h.indexOf('Otro material'));
  assert.match(h, /Cómo leerlo:<\/strong> El material más canjeado es «Material con un nombre bastante largo que no debe recortarse nunca»: 3 canjes de 4 en total \(75 %\)/);
  assert.match(A.fraseGrafica({ materiales: [{ titulo: 'A', canjes: 2 }, { titulo: 'B', canjes: 2 }] }), /Hay empate arriba/);
  const vacio = A.graficaHTML({ materiales: [] });
  assert.match(vacio, /Aún nadie ha canjeado créditos/);
  assert.doesNotMatch(vacio, /Cómo leerlo/);
  assert.match(A.graficaHTML(null), /Aún nadie ha canjeado créditos/);
});

test('la vista completa: título, cuentas, historial y gráfica, y sin datos no se rompe ni inventa nada', () => {
  const h = A.vistaHTML(datos());
  assert.deepEqual([...h.matchAll(/<h2>([^<]+)<\/h2>/g)].map(x => x[1]), ['Cuentas', 'Historial de regalos', 'Materiales más canjeados']);
  assert.match(h, /Beto &lt;b&gt;/, 'texto de las cuentas escapado');
  assert.ok(!h.includes('Beto <b>'));
  assert.doesNotThrow(() => A.vistaHTML(undefined));
  const vacio = A.vistaHTML({ miembros: { miembros: [] }, historial: null, metricas: null });
  assert.match(vacio, /Todavía no hay cuentas/);
  assert.match(vacio, /Aún nadie ha canjeado créditos/);
});

test('el módulo solo habla con los endpoints de créditos del servidor y no lee Firestore directo', () => {
  const js = leer('assets/js/admin-creditos.js');
  for (const r of ['/api/admin/creditos/miembros', '/api/admin/creditos/historial', '/api/admin/creditos/metricas', '/api/admin/creditos/regalar']) assert.ok(js.includes(r), r);
  assert.ok(!/\bdb\.collection|getDocs|firebase\.firestore/.test(js));
});

test('Retos y XP ya no tiene el espacio reservado de créditos', () => {
  assert.doesNotMatch(leer('assets/js/admin-vistas.js'), /Créditos por retos|ap-reserva/);
});

test('sin degradados ni emojis en el módulo ni en los estilos nuevos, y letra mínima de 12 px', () => {
  const js = leer('assets/js/admin-creditos.js');
  assert.doesNotMatch(js, /gradient\(/i);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(js));
  const css = leer('assets/css/admin-club.css');
  const b = css.slice(css.indexOf('Créditos: cuentas con el botón'));
  assert.ok(b.length > 500);
  assert.doesNotMatch(b, /gradient/i);
  for (const m of b.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])) >= 12, m[0]);
});

/* ───────────────────────── Cantidad a regalar: 100, 200, 300, 400 u otra ───────────────────────── */

test('constantes: se propone 100, el máximo es 1,000, cada material cuesta 100 y las opciones son 100, 200, 300 y 400', () => {
  assert.equal(A.REGALO, 100); assert.equal(A.MAX_REGALO, 1000); assert.equal(A.COSTO, 100);
  assert.deepEqual(A.OPCIONES, [100, 200, 300, 400]);
});

test('frase de confirmación: singular y plural, y lo que sobra de saldo', () => {
  assert.equal(A.fraseAlcance(100), 'Alcanzan para canjear 1 material.');
  assert.equal(A.fraseAlcance(200), 'Alcanzan para canjear 2 materiales.');
  assert.equal(A.fraseAlcance(300), 'Alcanzan para canjear 3 materiales.');
  assert.equal(A.fraseAlcance(400), 'Alcanzan para canjear 4 materiales.');
  assert.equal(A.fraseAlcance(250), 'Alcanzan para canjear 2 materiales y sobran 50 créditos de saldo.');
  assert.equal(A.fraseAlcance(101), 'Alcanzan para canjear 1 material y sobra 1 crédito de saldo.');
  assert.equal(A.fraseAlcance(1000), 'Alcanzan para canjear 10 materiales.');
  assert.match(A.fraseAlcance(50), /Todavía no alcanzan para canjear un material/);
  assert.deepEqual(A.alcance(250), { materiales: 2, sobra: 50 });
  assert.equal(A.textoConfirmacion('Ana Pérez', 300), 'Vas a regalar 300 créditos a <strong>Ana Pérez</strong>. Alcanzan para canjear 3 materiales.');
  assert.equal(A.textoConfirmacion('Ana', 1), 'Vas a regalar 1 crédito a <strong>Ana</strong>. Todavía no alcanzan para canjear un material (cada uno cuesta 100), pero quedan como saldo.');
  assert.equal(A.textoConfirmacion('Ana', 1000), 'Vas a regalar 1,000 créditos a <strong>Ana</strong>. Alcanzan para canjear 10 materiales.');
  assert.ok(!A.textoConfirmacion('<img src=x onerror=1>', 300).includes('<img'));
});

test('«Otra cantidad»: solo enteros de 1 a 1,000; rechaza vacío, decimales, negativos, letras, notación científica y números enormes', () => {
  for (const [t, n] of [['1', 1], ['100', 100], [' 250 ', 250], ['1000', 1000], ['007', 7]]) assert.deepEqual([A.analizarCantidad(t).ok, A.analizarCantidad(t).cantidad], [true, n], t);
  for (const t of ['', '   ', '0', '00', '-5', '1.5', '1,5', '1e3', '1000.0', '1001', '99999', 'abc', '10 0', '+50', '١٢٣', null, undefined]) {
    const a = A.analizarCantidad(t);
    assert.equal(a.ok, false, String(t));
    assert.ok(a.error && a.error.length > 10, String(t) + ' debe explicar qué pasó');
    assert.equal(a.cantidad, 0);
  }
  assert.match(A.analizarCantidad('1001').error, /máximo.*1,000/);
  assert.match(A.analizarCantidad('1.5').error, /entero/);
  assert.match(A.analizarCantidad('').error, /Escribe cuántos/);
});

test('la ventana de regalar ofrece 100, 200, 300, 400 y «Otra cantidad» con un campo numérico; arranca en 100 con su frase', () => {
  const h = A.regaloCuerpoHTML('Ana Pérez');
  for (const n of [100, 200, 300, 400]) assert.match(h, new RegExp('data-cantidad="' + n + '" aria-pressed="' + (n === 100) + '">' + n + '<'));
  assert.match(h, /data-otra="1" aria-pressed="false">Otra cantidad</);
  assert.match(h, /id="apCrOtra" hidden/, 'el campo aparece solo al elegir «Otra cantidad»');
  assert.match(h, /inputmode="numeric"[^>]*pattern="\[0-9\]\*"/);
  assert.match(h, /id="apCrOtraError" role="alert" hidden/);
  assert.match(h, /id="apCrFrase" aria-live="polite">Vas a regalar 100 créditos a <strong>Ana Pérez<\/strong>\. Alcanzan para canjear 1 material\./);
  assert.match(A.regaloCuerpoHTML('Ana', 300), /data-cantidad="300" aria-pressed="true"/);
  assert.ok(!A.regaloCuerpoHTML('<script>x</script>').includes('<script>'));
  assert.equal(A.textoAceptar(300), 'Sí, regalar 300');
  assert.equal(A.textoAceptar(1000), 'Sí, regalar 1,000');
});

test('el controlador: la frase y el botón se actualizan al elegir, «Mejor no» cancela y la cantidad inválida no se envía', () => {
  const js = leer('assets/js/admin-creditos.js');
  assert.match(js, /texto: 'Mejor no'/);
  assert.match(js, /si\.textContent = textoAceptar\(/);
  assert.match(js, /frase\.innerHTML = textoConfirmacion\(nombre, /);
  assert.match(js, /si\.disabled = true/);
  assert.match(js, /if \(!a\.ok\) return undefined;/, 'con una cantidad inválida la ventana no se cierra');
  assert.match(js, /ev\.key === 'Enter'/);
  assert.doesNotMatch(js, /parseFloat|Number\(campo/, 'la cantidad se valida como texto de dígitos');
});

test('historial: cantidad regalada y estado Pendiente / Canjeados 1 de 3 / Canjeado, con la lista de materiales canjeados', () => {
  const base = { materialesTotal: 3, usados: 0, sobrante: 0, canjes: [] };
  const pend = A.filaRegalo(regalo('r', Object.assign({}, base, { cantidad: 300 })));
  assert.match(pend, /300 créditos/); assert.match(pend, /Pendiente de canjear/); assert.match(pend, /Todavía no lo canjea/);
  const dos = A.filaRegalo(regalo('r', Object.assign({}, base, { cantidad: 300, estado: 'parcial', materialesCanjeados: 1,
    canjes: [{ titulo: 'Inventario de botiquín', en: '2026-10-21T10:00:00Z' }] })));
  assert.match(dos, /Canjeados 1 de 3/); assert.match(dos, /Inventario de botiquín/); assert.match(dos, /Faltan 2 por canjear/);
  const todo = A.filaRegalo(regalo('r', Object.assign({}, base, { cantidad: 300, estado: 'canjeado', materialesCanjeados: 3,
    canjes: [{ titulo: 'Uno', en: '2026-10-21T10:00:00Z' }, { titulo: 'Dos', en: '2026-10-22T10:00:00Z' }, { titulo: 'Tres', en: '2026-10-23T10:00:00Z' }] })));
  assert.match(todo, /Canjeados 3 de 3/);
  for (const t of ['Uno', 'Dos', 'Tres']) assert.match(todo, new RegExp(t));
  assert.doesNotMatch(todo, /Faltan/);
  const uno = A.filaRegalo(regalo('r', { cantidad: 100, estado: 'canjeado', materialesTotal: 1, materialesCanjeados: 1, canje: { titulo: 'Guía', en: '2026-10-21T10:00:00Z' } }));
  assert.match(uno, /Canjeado<\/span>/, 'un regalo de un solo material dice solo Canjeado');
  assert.match(A.filaRegalo(regalo('v', { cantidad: undefined })), /Pendiente de canjear/, 'regalos viejos sin cantidad no rompen');
  assert.equal(A.estadoRegalo({ estado: 'parcial', materialesTotal: 0, materialesCanjeados: 0 }).texto, 'Canjeado en parte');
});

test('la ventana de regalar nueva no usa emojis ni degradados y su CSS cumple la letra mínima de 12 px', () => {
  const css = leer('assets/css/admin-club.css');
  const b = css.slice(css.indexOf('Créditos: ventana de regalar'));
  assert.ok(b.length > 300);
  assert.doesNotMatch(b, /gradient/i);
  for (const m of b.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])) >= 12, m[0]);
  assert.match(b, /min-height: 44px/, 'botones táctiles de 44 px');
});
