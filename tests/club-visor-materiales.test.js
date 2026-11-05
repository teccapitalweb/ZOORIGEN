'use strict';
// Visor en ventana de PDFs, materiales (Excel, PowerPoint) y libros: el archivo se VE primero y ahí se decide si se descarga.
// Y el canje con créditos: confirmación antes de gastar y tarjeta con el resultado y el saldo restante después.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../assets/js/club-materiales.js');
const CR = require('../assets/js/club-creditos.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const excel = { id: 'inventario-botiquin-caducidad', titulo: 'Inventario de botiquín', tipo: 'excel', formato: 'excel' };
const ppt = { id: 'ppt-x', titulo: 'Presentación <b>X</b>', tipo: 'powerpoint', formato: 'powerpoint' };
const pdf = { id: 'guia-x', titulo: 'Guía de campo', tipo: 'guia', formato: 'pdf' };

test('ventana de un Excel: título, etiqueta del tipo, Descargar y cerrar arriba; abajo el texto informativo y "Descargar Excel"', () => {
  const h = M.visorHTML(excel, { fuente: 'catalogo' });
  assert.match(h, /<strong id="mvTitulo">Inventario de botiquín<\/strong>/);
  assert.match(h, /<span class="mt-visor__fmt">Excel<\/span>/);
  assert.match(h, /id="mvDescargar"(?![^>]*disabled)[^>]*>[\s\S]*<span>Descargar<\/span>/, 'Descargar en la cabecera, ya usable');
  assert.match(h, /id="mvX" aria-label="Cerrar"/);
  assert.match(h, /Este archivo es de tipo Excel y se abre en tu programa\. Descárgalo para usarlo y editarlo\./);
  assert.match(h, /id="mvDescargar2">[\s\S]*<span>Descargar Excel<\/span>/);
  assert.equal(/<iframe/.test(h), false, 'Excel no se incrusta');
  assert.match(h, /id="mvEstado" role="status" aria-live="polite"/);
  assert.equal(M.textoSinVista(excel), 'Este archivo es de tipo Excel y se abre en tu programa. Descárgalo para usarlo y editarlo.');
});

test('ventana de PowerPoint: mismo texto con su nombre, título escapado y sin iframe', () => {
  const h = M.visorHTML(ppt, { fuente: 'catalogo' });
  assert.match(h, /Este archivo es de tipo PowerPoint y se abre en tu programa/);
  assert.match(h, /<span>Descargar PowerPoint<\/span>/);
  assert.match(h, /Presentación &lt;b&gt;X&lt;\/b&gt;/);
  assert.equal(/<b>X<\/b>/.test(h), false);
  assert.equal(/<iframe/.test(h), false);
});

test('ventana de un PDF: cargando (Descargar apagado), lector incrustado, abrir aparte en pantallas chicas y error', () => {
  const cargando = M.visorHTML(pdf, { fuente: 'catalogo', vista: 'cargando' });
  assert.match(cargando, /Preparando el documento/);
  assert.match(cargando, /id="mvDescargar" disabled/);
  assert.match(cargando, /<span class="mt-visor__fmt">PDF<\/span>/);
  const lector = M.visorHTML(pdf, { fuente: 'catalogo', vista: 'pdf', url: 'blob:https://www.zoorigen.com/abc-123' });
  assert.match(lector, /<iframe title="Guía de campo" src="blob:https:\/\/www\.zoorigen\.com\/abc-123#navpanes=0"/);
  assert.match(lector, /id="mvAbrir"[^>]*href="blob:https:\/\/www\.zoorigen\.com\/abc-123"/, 'abrir en pestaña nueva');
  assert.match(lector, /id="mvAbrir" target="_blank" rel="noopener"/);
  assert.equal(/id="mvDescargar"[^>]*disabled/.test(lector), false, 'con el documento listo se puede descargar');
  const chico = M.visorHTML(pdf, { fuente: 'catalogo', vista: 'abrir', url: 'blob:https://x/y' });
  assert.match(chico, /<span>Abrir PDF<\/span>/);
  assert.equal(/<iframe/.test(chico), false);
  const mal = M.visorHTML(pdf, { fuente: 'catalogo', vista: 'error', mensaje: 'Aún no abre <img src=x>' });
  assert.match(mal, /No se pudo abrir/);
  assert.equal(/<img/.test(mal), false, 'el mensaje se escapa');
  assert.match(mal, /id="mvDescargar" disabled/);
});

test('ventana de un PDF de Drive: vista previa de Drive incrustada y sin el sufijo del lector local', () => {
  const h = M.visorHTML({ id: 'd1', titulo: 'PDF de Drive' }, { fuente: 'drive', vista: 'pdf', url: 'https://drive.google.com/file/d/ABCDEFGHIJKLMN/preview' });
  assert.match(h, /<iframe title="PDF de Drive" src="https:\/\/drive\.google\.com\/file\/d\/ABCDEFGHIJKLMN\/preview" allow="autoplay">/);
  assert.equal(/#navpanes/.test(h), false);
});

test('el botón de la tarjeta ya no descarga: dice "Ver" y abre la ventana; Excel y PowerPoint se descargan solo desde dentro', () => {
  const t = M.materialCardHTML({ ...excel, area: 'Salud', desbloqueado: true, soloMiembros: false, paginas: 3 }, {});
  assert.match(t, /data-ver="inventario-botiquin-caducidad"/);
  assert.match(t, /<span>Ver<\/span>/);
  assert.equal(/Descargar|data-descargar/.test(t), false);
  const js = leer('assets/js/club-materiales.js');
  // al pulsar Ver / la fila se abre la ventana (no se descarga directo)
  assert.match(js, /function verDoc\(id\)[\s\S]*abrirVisorMaterial\(club, m, 'catalogo'\)/);
  assert.match(js, /var ver = t\.closest && t\.closest\('\[data-ver\]'\)/);
  assert.equal(/data-descargar/.test(js), false);
  // el canje de un Excel ya no pide "pulsar Descargar": ofrece verlo en la ventana
  assert.equal(/pulsa Descargar/.test(js), false);
});

test('seguridad: no se debilita el control de acceso ni se exponen URLs permanentes (blob temporal con el token, liberado al cerrar)', () => {
  const js = leer('assets/js/club-materiales.js');
  const visor = js.slice(js.indexOf('function abrirVisorMaterial'), js.indexOf('  function montar('));
  assert.match(visor, /club\.apiBlob\('\/api\/materiales\/' \+ encodeURIComponent\(m\.id\) \+ '\/archivo'\)/, 'el PDF sale del mismo endpoint con token del servidor');
  assert.match(visor, /club\.apiFetch\('\/api\/materiales\/drive\//, 'Drive: el enlace lo entrega el servidor solo a quien cumple la regla');
  assert.equal(/https?:\/\/[^'"]*\/api\/materiales/.test(js), false, 'ninguna URL permanente del servidor puesta en iframe, enlace o ventana');
  assert.equal(/window\.open\([^)]*api\//.test(js), false);
  assert.match(js, /URL\.revokeObjectURL\(v\.url\)/, 'la URL temporal se libera al cerrar');
  // el servidor sigue sirviendo el archivo con Cache-Control privado y sin tocar sus reglas
  const srv = path.join(RAIZ, '..', 'zoorigen-webhook', 'services', 'rutas-materiales.js');
  if (fs.existsSync(srv)) assert.match(fs.readFileSync(srv, 'utf8'), /'Cache-Control': 'private, no-store'/);
});

test('teclado y accesibilidad: role dialog + aria-modal + título enlazado, Esc cierra, Tab da la vuelta dentro y el foco regresa a quien abrió', () => {
  const js = leer('assets/js/club-materiales.js');
  assert.match(js, /nodo\.setAttribute\('role', 'dialog'\); nodo\.setAttribute\('aria-modal', 'true'\); nodo\.setAttribute\('aria-labelledby', 'mvTitulo'\)/);
  assert.match(js, /if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); cerrarVisorMaterial\(\)/);
  assert.match(js, /if \(e\.key !== 'Tab'\) return;/);
  assert.match(js, /e\.shiftKey && document\.activeElement === p/);
  assert.match(js, /v\.previo\.focus\(\{ preventScroll: true \}\)/);
  assert.match(js, /document\.body\.classList\.add\('mt-noscroll'\)/, 'la página de atrás no se desplaza');
  assert.match(js, /e\.target === nodo\) cerrarVisorMaterial/, 'tocar fuera también cierra');
  // el lector de PDF solo se incrusta si el navegador lo soporta y la pantalla es grande
  assert.match(js, /window\.innerWidth >= 760 && navigator\.pdfViewerEnabled !== false/);
});

test('estilos: pantalla completa en celular con botones grandes, colores sólidos, sin emojis', () => {
  const css = leer('assets/css/club-materiales.css');
  const visor = css.slice(css.indexOf('.mt-visor {'), css.indexOf('.mt-visor__estado.is-mal'));
  assert.ok(visor.length > 1500);
  assert.equal(/gradient/.test(visor), false);
  assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(visor), false);
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.mt-visor \{ padding: 0; \}\s*\.mt-visor__ventana \{ width: 100%; height: 100vh; height: 100dvh; border-radius: 0/);
  assert.match(css, /\.mt-visor__btn \{ min-height: 44px/);
  assert.match(css, /\.mt-visor__grande \{ width: 100%; min-height: 56px/);
  for (const m of visor.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])) >= 12, m[0]);
});

test('libros: se leen en su lector dentro de la página (sin descarga directa); el canje de un libro termina en la misma tarjeta con "Leer ahora"', () => {
  const js = leer('assets/js/club-materiales.js');
  assert.equal(/function abrirLibro[\s\S]{0,900}(a\.download|createObjectURL|descargarMaterial)/.test(js), false, 'abrir un libro no descarga nada');
  assert.match(js, /accion = esLibro \? 'leer'/);
  const h = CR.resultadoCanjeHTML('Libro de ley', 100, 200, { libro: true, accion: 'leer' });
  assert.match(h, /Libro desbloqueado/);
  assert.match(h, />Leer ahora</);
});

test('canje con créditos: confirmación antes de gastar y tarjeta de resultado con el saldo que queda (y "Abrir/Ver ahora")', () => {
  const h = CR.resultadoCanjeHTML('Inventario de botiquín', 100, 200, { accion: 'ver' });
  assert.match(h, /role="alertdialog" aria-modal="true"/);
  assert.match(h, /<h2 id="zcr-conf-t">Material desbloqueado<\/h2>/);
  assert.match(h, /Inventario de botiquín/);
  assert.match(h, /Se descontaron 100 créditos\. Te quedan 200 créditos\./);
  assert.match(h, />Ver ahora</);
  assert.match(h, />Ahora no</);
  assert.match(CR.resultadoCanjeHTML('X', 100, 1, {}), /Te queda 1 crédito\./);
  assert.match(CR.resultadoCanjeHTML('X', 100, 0, {}), /Te quedan 0 créditos\./);
  assert.match(CR.resultadoCanjeHTML('X', 100, 1200, {}), /Te quedan 1,200 créditos\./);
  assert.match(CR.resultadoCanjeHTML('X', 100, 50, {}), />Abrir ahora</);
  assert.equal(/<b>|<img/.test(CR.resultadoCanjeHTML('<b>X</b>', 100, 50, {})), false, 'el título se escapa');
  assert.equal(typeof CR.confirmarCanje, 'function');
  assert.equal(typeof CR.resultadoCanje, 'function');
  // el flujo de la pantalla: 1) confirmar (antes de gastar) 2) POST de canje 3) tarjeta de resultado con el saldo del servidor 4) abrir solo si lo pide
  const js = leer('assets/js/club-materiales.js');
  const i1 = js.indexOf('m.confirmarCanje(item.titulo'), i2 = js.indexOf("'/api/creditos/canjear'"), i3 = js.indexOf('m.resultadoCanje(item.titulo');
  assert.ok(i1 > 0 && i2 > i1 && i3 > i2, 'orden: confirmar → canjear → resultado');
  assert.match(js, /r && Number\.isInteger\(r\.saldo\) \? r\.saldo/, 'el saldo que queda es el que responde el servidor');
  assert.match(js, /if \(!abrirYa\) return;/);
  assert.equal(/toast\(\(esLibro \? 'Libro desbloqueado/.test(js), false, 'ya no es solo un aviso flotante');
});

test('la tarjeta de confirmación y la de resultado tienen foco atrapado, Esc y foco de regreso (mismo diálogo)', () => {
  const js = leer('assets/js/club-creditos.js');
  const d = js.slice(js.indexOf('function abrirDialogo'), js.indexOf('function confirmarCanje'));
  assert.match(d, /ev\.key === 'Escape'/);
  assert.match(d, /ev\.key !== 'Tab'/);
  assert.match(d, /previo\.focus/);
  assert.match(js, /function resultadoCanje\(titulo, costo, saldo, opc\) \{\s*return abrirDialogo\(resultadoCanjeHTML/);
  const css = leer('assets/css/club-creditos.css');
  assert.match(css, /\.zcr-res__ic/);
  assert.equal(/gradient/.test(css.slice(css.indexOf('.zcr-res__ic'), css.indexOf('.zcr-res__ic') + 600)), false);
});

test('las páginas cargan el visor y los créditos con la misma versión', () => {
  const pdfs = leer('pages/club-pdfs.html');
  for (const a of ['club-materiales.js', 'club-materiales.css', 'club-creditos.js', 'club-creditos.css']) assert.match(pdfs, new RegExp(a.replace('.', '\\.') + '\\?v=[\\w-]+'), a);
  const biblioteca = leer('pages/club-biblioteca.html');
  assert.match(biblioteca, /club-materiales\.js\?v=/);
});
