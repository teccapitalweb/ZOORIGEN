'use strict';
// Certificados: el servidor los emite; el sitio solo los lee (API pública para verificar y ver, Firestore solo
// para listar los propios) y NUNCA los escribe desde el navegador.
// Ejecutar: node --test tests/club-certificado.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/js/club-certificado.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const quitarComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');

/* ───────── folio ───────── */

test('folio nuevo (ZOO-AAAA-XXXXXXXX) y anterior (ZOO-AAAA-NNNNN)', () => {
  assert.equal(C.tipoFolio('ZOO-2026-1A2B3C4D'), 'nuevo');
  assert.equal(C.tipoFolio('zoo-2026-1a2b3c4d'), 'nuevo', 'sin importar mayúsculas');
  assert.equal(C.tipoFolio('  ZOO-2026-1A2B3C4D '), 'nuevo', 'con espacios alrededor');
  assert.equal(C.tipoFolio('ZOO-2025-12345'), 'anterior');
  for (const malo of ['', null, undefined, 'ZOO-26-12345', 'ZOO-2026-1234', 'ZOO-2026-1A2B3C4', 'ZOO-2026-1A2B3C4DE', 'ZOO-2026-ZZZZZZZZ', 'ABC-2026-12345', 'ZOO-2026-12345-1', '../ZOO-2026-12345']) {
    assert.equal(C.tipoFolio(malo), null, String(malo));
    assert.equal(C.folioValido(malo), false);
  }
  assert.equal(C.folioValido('ZOO-2026-1A2B3C4D'), true);
});

test('normalizarFolio() y folioPlausible()', () => {
  assert.equal(C.normalizarFolio(' zoo-2026-1a2b3c4d\n'), 'ZOO-2026-1A2B3C4D');
  assert.equal(C.normalizarFolio(null), '');
  assert.equal(C.folioPlausible('ZOO-2026-1A2B3C4D'), true);
  assert.equal(C.folioPlausible('x'), false);
  assert.equal(C.folioPlausible('../../etc/passwd'), false);
  assert.equal(C.folioPlausible('ZOO-2026-1A2B3C4D?x=1'), false);
});

test('urlVerificacion() apunta a verificar.html con el folio codificado', () => {
  assert.equal(C.urlVerificacion('zoo-2026-1a2b3c4d'), 'https://www.zoorigen.com/pages/verificar.html?folio=ZOO-2026-1A2B3C4D');
  assert.ok(C.urlVerificacion('A&c=1').endsWith('?folio=A%26C%3D1'));
});

/* ───────── fechas y datos para dibujar ───────── */

test('fechaLarga() y fechaCorta(): en español y en hora de México', () => {
  assert.equal(C.fechaLarga('2026-10-12T15:00:00Z'), '12 de octubre de 2026');
  assert.equal(C.fechaCorta('2026-10-12T15:00:00Z'), '12 oct 2026');
  // 03:00 UTC del 12 es todavía el día 11 en la Ciudad de México
  assert.equal(C.fechaLarga('2026-10-12T03:00:00Z'), '11 de octubre de 2026');
  assert.equal(C.fechaLarga(''), '');
  assert.equal(C.fechaLarga('no es fecha'), '');
  assert.equal(C.fechaCorta(null), '');
});

test('vistaCertificado(): campos del servidor listos para dibujar', () => {
  const v = C.vistaCertificado({ folio: 'zoo-2026-1a2b3c4d', nombre: ' Ana  López ', curso: 'Manejo de colmenas', area: 'Apicultura', horas: 6, sesiones: 5, instructor: 'Dra. Pérez', emitido: '2026-10-12T15:00:00Z' });
  assert.equal(v.folio, 'ZOO-2026-1A2B3C4D');
  assert.equal(v.nombre, 'Ana López');
  assert.equal(v.curso, 'Manejo de colmenas');
  assert.equal(v.horas, '6 horas');
  assert.equal(v.sesionesTexto, '5 clases');
  assert.equal(v.duracionTexto, '6 horas · 5 clases');
  assert.equal(v.fechaTexto, '12 de octubre de 2026');
  assert.deepEqual(C.lineaDetalle(v), ['Apicultura', '5 clases', '6 horas', 'Instructor: Dra. Pérez', 'Modalidad en línea']);
});

test('vistaCertificado(): tolera datos ausentes y horas como texto', () => {
  const v = C.vistaCertificado({});
  assert.equal(v.nombre, '');
  assert.equal(v.duracionTexto, '');
  assert.deepEqual(C.lineaDetalle(v), ['Modalidad en línea']);
  assert.equal(C.vistaCertificado({ horas: '6 h', sesiones: 1 }).duracionTexto, '6 h · 1 clase');
  assert.equal(C.vistaCertificado({ horas: 1 }).horas, '1 hora');
  assert.equal(C.vistaCertificado(null).folio, '');
});

/* ───────── consulta pública ───────── */

function respuesta(status, cuerpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => { if (cuerpo === undefined) throw new Error('sin cuerpo'); return cuerpo; } };
}
const CERT = { folio: 'ZOO-2026-1A2B3C4D', nombre: 'Ana López', curso: 'Manejo de colmenas', area: 'Apicultura', horas: 6, sesiones: 5, instructor: 'Dra. Pérez', emitido: '2026-10-12T15:00:00Z' };

test('consultar(): GET público a /api/certificados/:folio, sin token ni credenciales', async () => {
  const pedidos = [];
  const r = await C.consultar('zoo-2026-1a2b3c4d', {
    base: 'https://servidor.example/',
    fetch: async (url, op) => { pedidos.push({ url, op }); return respuesta(200, { valido: true, certificado: CERT }); }
  });
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0].url, 'https://servidor.example/api/certificados/ZOO-2026-1A2B3C4D');
  assert.equal(pedidos[0].op.method, 'GET');
  assert.equal(pedidos[0].op.headers, undefined, 'sin Authorization ni cabeceras');
  assert.equal(pedidos[0].op.credentials, undefined);
  assert.equal(r.ok, true);
  assert.equal(r.certificado.curso, 'Manejo de colmenas');
  assert.equal(r.certificado.fechaTexto, '12 de octubre de 2026');
});

test('consultar(): 400, 404, 429, red y error del servidor dan estados y mensajes claros', async () => {
  const caso = async (status, cuerpo, esperado) => {
    const r = await C.consultar('ZOO-2026-1A2B3C4D', { fetch: async () => respuesta(status, cuerpo) });
    assert.equal(r.ok, false);
    assert.equal(r.estado, esperado, 'estado para ' + status);
    assert.ok(r.titulo.length > 5 && r.detalle.length > 20);
    return r;
  };
  await caso(400, { error: 'folio inválido' }, 'formato');
  const nf = await caso(404, { error: 'no encontrado' }, 'no-encontrado');
  assert.match(nf.titulo, /no encontrado/i);
  const lim = await caso(429, { error: 'demasiadas' }, 'limite');
  assert.match(lim.detalle, /minuto/);
  await caso(500, {}, 'error');
  await caso(200, { valido: false }, 'no-encontrado');
  await caso(200, undefined, 'no-encontrado');
  const red = await C.consultar('ZOO-2026-1A2B3C4D', { fetch: async () => { throw new TypeError('Failed to fetch'); } });
  assert.equal(red.estado, 'red');
  assert.match(red.detalle, /internet/);
});

test('consultar(): sin folio o con folio imposible no llama al servidor', async () => {
  let n = 0;
  const f = async () => { n++; return respuesta(200, { valido: true, certificado: CERT }); };
  assert.equal((await C.consultar('', { fetch: f })).estado, 'falta-folio');
  assert.equal((await C.consultar(null, { fetch: f })).estado, 'falta-folio');
  assert.equal((await C.consultar('../../x', { fetch: f })).estado, 'formato');
  assert.equal(n, 0);
});

test('consultar(): corta la espera si el servidor no contesta', async () => {
  const r = await C.consultar('ZOO-2026-1A2B3C4D', {
    esperaMs: 30,
    fetch: (url, op) => new Promise((_, rechazar) => { op.signal.addEventListener('abort', () => rechazar(new Error('abortado'))); })
  });
  assert.equal(r.estado, 'red');
});

/* ───────── "Mis certificados" ───────── */

test('estadoVerificacion(): solo verificado === true cuenta como verificado', () => {
  assert.equal(C.estadoVerificacion({ verificado: true }), 'verificado');
  for (const d of [{}, { verificado: false }, { verificado: 'true' }, { verificado: 1 }, null, undefined]) assert.equal(C.estadoVerificacion(d), 'en-validacion');
  assert.equal(C.ETIQUETAS_VERIFICACION['en-validacion'], 'En validación');
});

test('propiosParaMostrar(): uno por curso (gana el verificado), del más reciente al más antiguo', () => {
  const lista = [
    { folio: 'A', courseId: '1', issuedAt: '2026-09-01T00:00:00Z' },
    { folio: 'B', courseId: '1', issuedAt: '2026-08-01T00:00:00Z', verificado: true },
    { folio: 'C', courseId: '2', issuedAt: '2026-10-01T00:00:00Z' },
    { folio: 'D', courseId: '2', issuedAt: '2026-10-05T00:00:00Z' },
    { folio: 'E', courseId: '3', issuedAt: '2026-07-01T00:00:00Z', verificado: true },
    null, 'x'
  ];
  assert.deepEqual(C.propiosParaMostrar(lista).map(c => c.folio), ['D', 'B', 'E']);
  assert.deepEqual(C.propiosParaMostrar(null), []);
});

/* ───────── páginas ───────── */

test('verificar.html y ver-certificado.html leen SOLO de la API pública (sin Firestore ni Firebase)', () => {
  for (const rel of ['pages/verificar.html', 'pages/ver-certificado.html']) {
    const html = leer(rel);
    assert.match(html, /assets\/js\/club-certificado\.js\?v=[\w.-]+/, rel + ' carga el módulo');
    assert.match(html, /ZOO_CERT\.consultar\(/, rel + ' consulta la API pública');
    assert.equal(/collection\(|firebase|firestore/i.test(quitarComentarios(html)), false, rel + ' no usa Firebase/Firestore');
  }
  const modulo = leer('assets/js/club-certificado.js');
  assert.match(modulo, /'\/api\/certificados\/' \+ encodeURIComponent\(folio\)/);
});

test('verificar.html: ejemplo con el folio nuevo y estados de carga, no encontrado y límite de consultas', () => {
  const html = leer('pages/verificar.html');
  assert.ok(html.includes('ZOO-2026-1A2B3C4D'));
  assert.equal(html.includes('ZOO-2026-12345'), false);
  assert.match(html, /id="loading"/);
  assert.match(html, /id="errTitulo"/);
  assert.match(html, /ZOO_CERT\.mensajeEstado\(estado\)/);
  for (const e of ['formato', 'no-encontrado', 'limite', 'red', 'error']) assert.ok(C.MENSAJES[e], e);
  assert.match(C.MENSAJES.limite.titulo, /Demasiadas consultas/);
});

test('ver-certificado.html: QR y enlaces de compartir usan la URL de verificación del folio', () => {
  const html = leer('pages/ver-certificado.html');
  assert.match(html, /const verifyUrl = ZOO_CERT\.urlVerificacion\(c\.folio\)/);
  assert.match(html, /create-qr-code\/\?size=200x200&data=' \+ encodeURIComponent\(verifyUrl\)/);
  assert.match(html, /function compartirWhatsApp\(\)[\s\S]*ZOO_CERT\.urlVerificacion\(c\.folio\)/);
  assert.match(html, /function compartirLinkedIn\(\)[\s\S]*ZOO_CERT\.urlVerificacion\(c\.folio\)/);
  // mismos campos que manda el servidor
  for (const campo of ['c.nombre', 'c.curso', 'c.fechaTexto']) assert.ok(html.includes(campo), campo);
});

test('club-certificados.html: lista los propios por Firestore y distingue "En validación" de verificados', () => {
  const html = leer('pages/club-certificados.html');
  assert.match(html, /collection\('certificados'\)\.where\('memberUid', '==', session\.uid\)\.get\(\)/);
  assert.match(html, /ZOO_CERT\.estadoVerificacion\(c\)/);
  assert.match(html, /ZOO_CERT\.propiosParaMostrar\(/);
  assert.match(html, /ver-certificado\.html\?folio=/);
  assert.ok(html.includes('folio único y verificación QR'));
  assert.equal(/\.(set|add|update|delete)\(/.test(quitarComentarios(html)), false, 'solo lectura');
});

/* ───────── el sitio ya no escribe certificados ───────── */

function archivosDelSitio() {
  const muertos = /^(admin|club-extra|especies-data|stripe-config)\.js$/;
  const salida = [];
  for (const dir of ['pages', 'assets/js']) {
    for (const f of fs.readdirSync(path.join(RAIZ, dir))) {
      if (/\.(html|js)$/.test(f) && !muertos.test(f)) salida.push(dir + '/' + f);
    }
  }
  salida.push('index.html', 'data.js', 'script.js');
  return salida.filter(r => fs.existsSync(path.join(RAIZ, r)));
}

test('ningún archivo del sitio crea, edita ni borra documentos de certificados desde el navegador', () => {
  const escritura = /collection\(\s*['"]certificados['"]\s*\)[\s\S]{0,200}?\.(set|add|update|delete)\(/;
  for (const rel of archivosDelSitio()) {
    const t = quitarComentarios(leer(rel));
    assert.equal(escritura.test(t), false, rel + ' escribe en la colección certificados');
    assert.equal(/Math\.random\(\)[^\n]{0,80}ZOO-|`ZOO-\$\{/.test(t), false, rel + ' inventa folios');
  }
});

test('diagnostico.html ya no pide permisos de escritura de certificados ni crea folios de prueba', () => {
  const html = quitarComentarios(leer('pages/diagnostico.html'));
  assert.equal(/\.(set|add|delete)\(/.test(html), false);
  assert.equal(/testCreateCert|ZOO-TEST/.test(html), false);
  assert.match(html, /\/api\/cursos\/progreso/);
});

test('el panel admin emite certificados por la API del servidor (POST /api/admin/certificados)', () => {
  const html = leer('pages/admin-club.html');
  assert.match(html, /ZOORIGEN_CLUB\.apiFetch\('\/api\/admin\/certificados', \{ method: 'POST', body: r\.cuerpo \}\)/);
  assert.match(html, /CERTS\.cuerpoEmision\(/);
});

test('club.js sigue exponiendo "Mis certificados" en el menú del club', () => {
  assert.match(leer('assets/js/club.js'), /id: 'certificados', label: 'Mis certificados', icon: 'certificate', href: 'club-certificados\.html'/);
  assert.match(leer('assets/js/club-shell.js'), /id: 'certificados', label: 'Mis certificados'/);
});

/* ───────── reglas de Firestore v6 ───────── */

test('FIRESTORE-REGLAS-v6: aviso de no publicar antes del servidor, certificados cerrados y courseProgress protegido', () => {
  const v6 = leer('FIRESTORE-REGLAS-v6.txt');
  const v5 = leer('FIRESTORE-REGLAS-v5.txt');
  assert.match(v6.slice(0, 1200), /NO PUBLICAR HASTA QUE EL SERVIDOR CON \/api\/cursos\/progreso Y \/api\/certificados/);
  assert.match(v6, /service cloud\.firestore/);
  // certificados: sin lectura pública y escritura solo admin
  const bloque = v6.slice(v6.indexOf('match /certificados/{certId}'), v6.indexOf('match /{document=**}'));
  assert.equal(/allow get: if true/.test(bloque), false, 'el get ya no es público');
  assert.match(bloque, /allow get, list: if isAdmin\(\)/);
  assert.match(bloque, /resource\.data\.get\('memberUid', ''\) == request\.auth\.uid/);
  assert.match(bloque, /allow create, update, delete: if isAdmin\(\);/);
  assert.equal(/isActiveVIP\(\)/.test(bloque), false, 'ningún miembro escribe certificados');
  // miembros: el titular no escribe el avance
  const miembros = v6.slice(v6.indexOf('match /miembros/{uid}'), v6.indexOf('match /usuarios/{uid}'));
  assert.equal((miembros.match(/'courseProgress', 'progresoLegadoImportado'/g) || []).length, 2, 'en create y en update');
  assert.match(miembros, /affectedKeys\(\)\.hasAny\(\[/);
  // lo demás de v5 sigue igual: mismas colecciones
  // (v6 solo agrega las colecciones de la encuesta de la portada y la guía virtual)
  const NUEVAS = ['encuestasProspectos', 'chatbotSinRespuesta'];
  const colecciones = t => [...t.matchAll(/match \/([\w{}]+)\/\{(\w+)\}/g)].map(m => m[1]).filter(c => !NUEVAS.includes(c)).join();
  assert.equal(colecciones(v6), colecciones(v5));
  assert.equal(v6.includes('FIRESTORE-REGLAS-v5.txt'), false);
});

/* ───────── certificado con DOS firmas (Zoorigen + IPCIL Latinoamericano) y la fecha en el pie ───────── */

test('ver-certificado.html: dos firmas (Erick a la izquierda, IPCIL a la derecha) y el QR en el centro', () => {
  const html = leer('pages/ver-certificado.html');
  const fila = html.slice(html.indexOf('class="cert-footer'), html.indexOf('id="certPie"'));
  assert.ok(fila.length > 200, 'se encontró la fila inferior');
  const iErick = fila.indexOf('Erick de Jesús Salas Rojas'), iQr = fila.indexOf('id="qrCode"'), iIpcil = fila.indexOf('id="firmaIpcil"');
  assert.ok(iErick >= 0 && iQr > iErick && iIpcil > iQr, 'orden: Erick, QR, IPCIL');
  assert.match(fila, /Director General · Zoorigen México/);
  assert.match(fila, /Escanea para verificar/);
  assert.match(fila, /src="\.\.\/assets\/img\/cert\/firma-ipcil\.png"[^>]*alt="Firma de la Coordinación de Certificación de IPCIL Latinoamericano"/);
  assert.match(fila, /Coordinación de Certificación/);
  assert.match(fila, /IPCIL Latinoamericano/);
  // la firma de Erick sigue donde estaba (una sola imagen de firma de Zoorigen) y la de IPCIL es otra imagen distinta
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets/img/cert/firma-ipcil.png')), 'existe el archivo de la firma');
});

test('ver-certificado.html: la firma de IPCIL es un PNG con transparencia, ligero y de buen tamaño', () => {
  const png = fs.readFileSync(path.join(RAIZ, 'assets/img/cert/firma-ipcil.png'));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png[25], 6, 'color con canal alfa (fondo transparente)');
  assert.ok(png.length < 120 * 1024, 'pesa poco: ' + png.length);
  assert.ok(png.readUInt32BE(16) >= 300, 'ancho suficiente para imprimir');
});

test('ver-certificado.html: la fecha ya no va como columna; pasa a un pie fino con folio, sitio, fecha y lugar', () => {
  const html = leer('pages/ver-certificado.html');
  assert.equal(html.includes('Fecha de expedición'), false, 'ya no hay columna de fecha');
  assert.equal(html.includes('id="certDate"'), false);
  assert.match(html, /<div class="cert-pie" id="certPie">/);
  const js = html.slice(html.indexOf("getElementById('certPie')"));
  for (const parte of ["'Folio: ' + c.folio", "'zoorigen.com'", "'Emitido el ' + c.fechaTexto", "'Tehuacán, Puebla, México'", "'Certificado emitido digitalmente por Zoorigen México'"]) {
    assert.ok(js.includes(parte), parte);
  }
  // la fecha sale del dato real del certificado y se pone como texto (sin innerHTML)
  assert.match(js, /\.textContent = \[/);
  // el pie es chico y gris, dentro del marco
  const css = html.slice(html.indexOf('.cert-pie {'), html.indexOf('.cert-pie {') + 500);
  assert.match(css, /font-size: \.66rem/);
  assert.match(css, /color: #6b7a72/);
});

test('ver-certificado.html: el QR y el folio oficial siguen en el certificado', () => {
  const html = leer('pages/ver-certificado.html');
  assert.match(html, /id="qrCode"/);
  assert.match(html, /id="folioDisplay"/);
  assert.match(html, /const verifyUrl = ZOO_CERT\.urlVerificacion\(c\.folio\)/);
});

test('ver-certificado.html: nombre largo y curso de dos líneas se ajustan para no encimarse con las firmas ni con el pie', () => {
  const html = leer('pages/ver-certificado.html');
  assert.match(html, /function ajustarCertificado\(\)/);
  assert.match(html, /inner\.scrollHeight > inner\.clientHeight/);
  assert.match(html, /ajustarCertificado\(\);[\s\S]*document\.fonts\.ready\.then\(ajustarCertificado\)/);
});

test('certificado ANTERIOR (folio viejo, respuesta anterior:true): se dibuja con el diseño nuevo, con la fecha en el pie', async () => {
  const r = await C.consultar('ZOO-2025-48213', {
    base: 'https://servidor.example',
    fetch: async () => respuesta(200, {
      valido: true, anterior: true,
      certificado: { folio: 'ZOO-2025-48213', nombre: 'Ana Pérez', curso: 'Biología de tiburones', area: 'Fauna silvestre', horas: 6, sesiones: 3, instructor: 'Equipo Zoorigen', emitido: '2025-03-04T15:00:00.000Z' }
    })
  });
  assert.equal(r.ok, true);
  assert.equal(r.certificado.folio, 'ZOO-2025-48213');
  assert.equal(r.certificado.fechaTexto, '4 de marzo de 2025', 'el pie recibe la fecha real del certificado viejo');
  // la plantilla es la misma para firmados y anteriores: no hay otra versión del diseño ni distinción por folio
  const html = leer('pages/ver-certificado.html');
  assert.equal(/c\.anterior|\.anterior\b/.test(quitarComentarios(html)), false, 'la plantilla no cambia según el tipo de certificado');
  assert.ok(html.includes("c.fechaTexto ? 'Emitido el ' + c.fechaTexto : ''"), 'sin fecha el pie no inventa una');
});
