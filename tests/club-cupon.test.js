'use strict';
// Barra verde del cupón de pago en todas las páginas del Club, bloque en Suscripción, casilla al crear la cuenta, interruptor en Mi perfil y aviso de privacidad.
// Ejecutar: node --test tests/club-cupon.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const C = require(path.join(RAIZ, 'assets', 'js', 'club-cupon.js'));
const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html'));
const delPanel = paginas.filter(f => /club-avisos\.js\?v=/.test(leer('pages/' + f)));

const respuesta = (extra = {}) => ({ ok: true, cupon: { codigo: 'ZOO100-ABC234', monto: 100, precioMes: 199, precioFinal: 99, venceMs: 0, restanteMs: 5 * 3600000 + 12 * 60000 + 33000, ...extra } });

test('textos de la barra: título, precio final y reloj HH:MM:SS', () => {
  const c = C.normalizar(respuesta(), 1000, 'uid1');
  assert.deepEqual([c.uid, c.codigo, c.monto, c.precioFinal, c.venceLocal], ['uid1', 'ZOO100-ABC234', 100, 99, 1000 + 5 * 3600000 + 12 * 60000 + 33000]);
  assert.deepEqual(C.textos(c), { titulo: 'Tienes un cupón de $100 para tu primer mes', sub: 'Pagas solo $99 en el plan mensual' });
  assert.equal(C.relojTexto(5 * 3600000 + 12 * 60000 + 33000), '05:12:33');
  assert.equal(C.relojTexto(0), '00:00:00'); assert.equal(C.relojTexto(-5000), '00:00:00'); assert.equal(C.relojTexto(24 * 3600000), '24:00:00');
  assert.equal(C.relojTexto(59999), '00:00:59');
  assert.equal(C.restanteHablado(5 * 3600000 + 12 * 60000), '5 horas y 12 minutos');
  assert.equal(C.restanteHablado(60000), '1 minuto');
  assert.equal(C.restanteHablado(3600000), '1 hora');
});

test('la respuesta del servidor se valida: sin cupón, vencido o raro no se pinta nada', () => {
  assert.equal(C.normalizar({ ok: true, cupon: null }, 1, 'u'), null);
  assert.equal(C.normalizar(null, 1, 'u'), null);
  assert.equal(C.normalizar(respuesta({ restanteMs: 0 }), 1, 'u'), null);
  assert.equal(C.normalizar(respuesta({ codigo: '<script>' }), 1, 'u'), null);
  assert.equal(C.normalizar(respuesta({ monto: 0 }), 1, 'u'), null);
  assert.ok(C.normalizar(respuesta({ precioFinal: undefined }), 1, 'u').precioFinal === 99, 'si falta el precio final se calcula');
  const c = C.normalizar(respuesta(), 1000, 'u');
  assert.equal(C.vigente(c, 2000), true); assert.equal(C.vigente(c, c.venceLocal), false); assert.equal(C.vigente(null), false);
});

test('la barra: código en caja con Copiar, reloj, «Usar mi cupón», accesible y sin emojis ni degradados', () => {
  const c = C.normalizar(respuesta(), 1000, 'u');
  const h = C.barraHTML(c, 1000);
  assert.match(h, /id="zooCuponBarra" role="region" aria-label="Cupón de descuento para tu primer mes"/);
  assert.match(h, /Tienes un cupón de \$100 para tu primer mes/); assert.match(h, /Pagas solo \$99 en el plan mensual/);
  assert.match(h, /<code class="zcu-caja" id="zcCodigo">ZOO100-ABC234<\/code>/);
  assert.match(h, /data-zc="copiar"[^>]*aria-label="Copiar el código ZOO100-ABC234"[\s\S]*?<span>Copiar<\/span>/);
  assert.match(h, /Vence en <time id="zcReloj" data-vence="\d+">05:12:33<\/time>/);
  assert.match(h, /href="club-suscripcion\.html" data-zc="usar"><span>Usar mi cupón<\/span>/);
  assert.match(h, /id="zcAviso" role="status" aria-live="polite"/, 'aviso discreto para «Copiado»');
  assert.match(h, /role="timer" aria-live="off"/, 'el reloj no se anuncia cada segundo');
  assert.doesNotMatch(h, /gradient|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  // El código se escapa aunque nunca debería traer símbolos
  assert.doesNotMatch(C.barraHTML({ ...c, codigo: 'AB"><img>' }, 1000), /<img>/);
});

test('cuándo preguntar al servidor: no a miembros ni administradores, y no más seguido que cada 45 s', () => {
  assert.equal(C.debeConsultar({ plan: 'free' }), true);
  assert.equal(C.debeConsultar({ plan: '' }), true);
  assert.equal(C.debeConsultar({ plan: 'expired' }), true);
  assert.equal(C.debeConsultar({ plan: 'active' }), false);
  assert.equal(C.debeConsultar({ plan: 'cancelled_active' }), false);
  assert.equal(C.debeConsultar({ plan: 'free', admin: true }), false);
  assert.equal(C.debeConsultar({ plan: 'free', ahora: 100000, ultimaConsultaMs: 90000 }), false);
  assert.equal(C.debeConsultar({ plan: 'free', ahora: 200000, ultimaConsultaMs: 90000 }), true);
  assert.equal(C.puedeMostrarRecordado({ plan: 'active' }), false);
  assert.equal(C.puedeMostrarRecordado({ plan: 'free', admin: true }), false);
  assert.equal(C.puedeMostrarRecordado({ plan: 'free' }), true);
  assert.equal(C.CADA_MS, 5 * 60 * 1000);
});

test('alto reservado: usa el medido la última vez y, si no, una estimación', () => {
  assert.equal(C.altoEstimado(390, null), 112); assert.equal(C.altoEstimado(1440, null), 60);
  assert.equal(C.altoEstimado(390, { hm: 118 }), 118); assert.equal(C.altoEstimado(1440, { hd: 64 }), 64);
  assert.equal(C.altoEstimado(1440, { hm: 118 }), 60);
});

test('bloque de Suscripción: dice el precio completo, que sale solo con el plan mensual y que no aplica al anual', () => {
  const h = C.bloqueSuscripcionHTML(C.normalizar(respuesta({ monto: 50, precioFinal: 149, codigo: 'ZOO50-AAAAAA' }), 1, 'u'));
  assert.match(h, /Tu cupón de \$50 está activo/); assert.match(h, /ZOO50-AAAAAA/);
  assert.match(h, /Tu primer mes: <strong>\$149<\/strong> en lugar de \$199/); assert.match(h, /Desde el segundo mes: \$199, y puedes cancelar cuando quieras/);
  assert.match(h, /no aplica al plan anual/);
  const pago = C.pagoMensualConCupon(C.normalizar(respuesta(), 1, 'u'));
  assert.match(pago.monto, /^MXN 99[.,]00$/); assert.equal(pago.cada, 'el primer mes');
  assert.match(C.pagoMensualConCupon(C.normalizar(respuesta(), 1, 'u')).detalle, /Desde el segundo mes MXN 199[.,]00/);
  assert.match(leer('pages/club-suscripcion.html'), /ZOO_CUPON\.pagoMensualConCupon\(cup\)/);
  const sus = leer('pages/club-suscripcion.html');
  assert.match(sus, /ZOO_CUPON\.montarEnSuscripcion\(content\)/);
});

test('preferencia: textos del interruptor de Mi perfil y de la baja', () => {
  assert.match(C.textoPreferencia({ recibe: true, baja: false }), /^Activado/);
  assert.match(C.textoPreferencia({ recibe: false, baja: false }), /^Desactivado/);
  assert.match(C.textoPreferencia({ recibe: false, baja: true }), /Te diste de baja desde un correo/);
  const js = leer('assets/js/club-cupon.js');
  assert.match(js, /\/api\/recordatorios\/preferencia/); assert.match(js, /\/api\/recordatorios\/mi-cupon/);
});

test('todas las páginas de miembros cargan la barra: hoja ANTES de club-responsivo, módulo y reserva de alto desde el <head>', () => {
  assert.equal(delPanel.length, 18);
  for (const f of delPanel) {
    const h = leer('pages/' + f);
    assert.match(h, /assets\/css\/club-cupon\.css\?v=[\w.-]+/, f);
    assert.ok(h.indexOf('club-cupon.css') < h.lastIndexOf('club-responsivo.css'), f + ': club-responsivo.css debe ir al final');
    assert.match(h, /assets\/js\/club-cupon\.js\?v=[\w.-]+/, f);
    assert.ok(h.indexOf('club-cupon.js') > h.indexOf('club-avisos.js'), f);
    assert.match(h, /<script>\/\*zs-cupon\*\//, f + ': reserva de alto');
    assert.ok(h.indexOf('<meta charset') < 1024, f + ': meta charset en los primeros 1024 bytes');
  }
  const versiones = new Set(delPanel.flatMap(f => [...leer('pages/' + f).matchAll(/club-cupon\.(?:css|js)\?v=([\w.-]+)/g)].map(m => m[1])));
  assert.equal(versiones.size, 1, 'una sola versión de la barra');
});

test('la reserva del <head> solo actúa con un cupón recordado y vigente, y no para miembros ni administradores', () => {
  const html = leer('pages/club-dashboard.html');
  const script = /<script>\/\*zs-cupon\*\/([\s\S]*?)<\/script>/.exec(html)[1];
  function correr(almacen, ancho = 1440) {
    const raiz = { clases: '', props: {} };
    const doc = { documentElement: { get className() { return raiz.clases; }, set className(v) { raiz.clases = v; }, style: { setProperty: (k, v) => { raiz.props[k] = v; } } } };
    const ls = { getItem: k => (k in almacen ? almacen[k] : null) };
    new Function('localStorage', 'innerWidth', 'document', script)(ls, ancho, doc);
    return raiz;
  }
  const vigente = JSON.stringify({ venceLocal: Date.now() + 60000, hm: 120, hd: 64 });
  assert.match(correr({ zoo_cupon: vigente, zoo_plan: 'free' }).clases, /zoo-cupon/);
  assert.equal(correr({ zoo_cupon: vigente, zoo_plan: 'free' }, 1440).props['--fomo-h'], '64px');
  assert.equal(correr({ zoo_cupon: vigente, zoo_plan: 'free' }, 390).props['--fomo-h'], '120px');
  assert.equal(correr({ zoo_cupon: JSON.stringify({ venceLocal: Date.now() - 1 }), zoo_plan: 'free' }).clases, '', 'vencido: nada');
  assert.equal(correr({ zoo_plan: 'free' }).clases, '', 'sin cupón recordado: nada');
  assert.equal(correr({ zoo_cupon: vigente, zoo_plan: 'active' }).clases, '', 'miembro: nada');
  assert.equal(correr({ zoo_cupon: vigente, zoo_plan: 'free', zoo_admin: '1' }).clases, '', 'administrador: nada');
  assert.equal(correr({ zoo_cupon: 'basura{' }).clases, '', 'dato dañado: nada y sin error');
});

test('CSS de la barra: color sólido, --fomo-h empuja barra lateral, barra superior y cuerpo; letra de 12 px o más; 40 px táctiles; modo noche; sin movimiento si se pide', () => {
  const css = leer('assets/css/club-cupon.css');
  assert.doesNotMatch(css, /gradient\(/);
  assert.match(css, /html\.zoo-cupon body \{ padding-top: var\(--fomo-h/);
  assert.match(css, /html\.zoo-cupon \.zs-topbar \{ top: var\(--fomo-h/);
  assert.match(css, /html\.zoo-cupon \.club-sidebar \{ top: var\(--fomo-h[^}]*height: calc\(100vh - var\(--fomo-h/);
  assert.match(css, /\.zcu-barra \{\s*position: fixed; top: 0; left: 0; right: 0; z-index: 75/);
  assert.match(css, /border: 2px dashed/);
  assert.match(css, /\.zcu-copiar, \.zcu-cta \{[^}]*min-height: 40px/);
  assert.match(css, /\.zcu-caja \{[^}]*min-height: 40px/);
  assert.match(css, /html\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /:focus-visible/);
  for (const m of css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)) {
    const px = m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
    assert.ok(px >= 12, 'letra menor a 12 px: ' + m[0]);
  }
});

test('contraste AA de los pares de color de la barra (día y noche)', () => {
  const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const fondo of ['#1F5F3A', '#17492C']) {
    assert.ok(ratio('#FFFFFF', fondo) >= 4.5, 'texto blanco sobre ' + fondo);
    assert.ok(ratio('#E3EFE6', fondo) >= 4.5, 'subtítulo sobre ' + fondo);
    assert.ok(ratio('#F3C65A', fondo) >= 3, 'borde punteado sobre ' + fondo);
  }
  assert.ok(ratio('#FFFFFF', '#2B7248') >= 4.5, 'código sobre su caja'); assert.ok(ratio('#FFFFFF', '#20613B') >= 4.5);
  assert.ok(ratio('#1F5F3A', '#FFFFFF') >= 4.5, 'Copiar'); assert.ok(ratio('#16241B', '#E8A317') >= 4.5, 'Usar mi cupón');
});

test('crear cuenta: el registro queda como antes (sin preguntas sobre promociones), acepta Términos y Aviso con enlaces y no guarda ninguna preferencia', () => {
  const h = leer('pages/club-login.html');
  assert.doesNotMatch(h, /reg-no-promos|promosFila|noPromos|guardarNoPromos|zoo_no_promos|No deseo recibir/, 'la casilla y su código ya no existen');
  assert.doesNotMatch(h, /api\/recordatorios|recordatoriosPago/, 'el registro no llama a las rutas de recordatorios');
  assert.match(h, /Acepto los <a href="\.\.\/terminos-y-condiciones\.html"[^>]*>Términos y condiciones<\/a> y el <a href="\.\.\/aviso-de-privacidad\.html"[^>]*>Aviso de privacidad<\/a> de Zoorigen/);
  assert.match(h, /id="reg-terminos"/);
  const js = leer('assets/js/club-cupon.js');
  assert.doesNotMatch(js, /zoo_no_promos|reintentarPendiente|origen === 'registro'/, 'el módulo ya no reintenta ninguna preferencia del registro');
  assert.match(js, /\/api\/recordatorios\/preferencia/, 'la ruta sigue sirviendo al interruptor de Mi perfil');
});

test('Mi perfil: interruptor «Recibir promociones por correo» accesible (role switch), con estado y enlace al aviso', () => {
  const h = leer('pages/club-perfil.html');
  assert.match(h, /id="promosSw" role="switch" aria-checked="true" aria-labelledby="promosEtq"/);
  assert.match(h, /Recibir promociones por correo/);
  assert.match(h, /id="promosEstado" role="status" aria-live="polite"/);
  assert.match(h, /aviso-de-privacidad\.html#promociones/);
  assert.match(leer('assets/css/club-cupon.css'), /\.zp-sw \{[^}]*height: 40px/);
});

test('aviso de privacidad: finalidad secundaria clara, cómo negarse, plazos, versión y marca de revisión legal', () => {
  const h = leer('aviso-de-privacidad.html');
  assert.match(h, /borrador: revisar con abogado/);
  assert.match(h, /<h3 id="promociones">Recordatorios y promociones por correo<\/h3>/);
  assert.match(h, /finalidad <strong>secundaria<\/strong>/);
  assert.match(h, /negarte no te quita ningún servicio ni acceso/);
  assert.match(h, /hasta 7 correos por vuelta[\s\S]*pausa de 4 días[\s\S]*máximo de 3 vueltas/);
  assert.match(h, /entre las 8:00 y las 22:00/);
  for (const m of ['enlace «No quiero recibir recordatorios ni promociones»', 'Mi perfil', 'zooorigen@gmail.com', 'Cómo decir que no, en cualquier momento']) assert.ok(h.includes(m), m);
  assert.doesNotMatch(h, /casilla «No deseo recibir/, 'ya no hay casilla al crear la cuenta');
  assert.match(h, /\(1\) usa el enlace[\s\S]*\(2\) apaga «Recibir promociones por correo»[\s\S]*\(3\) escríbenos a/, 'los tres mecanismos');
  assert.match(h, /Cuentas creadas antes del 22 de octubre de 2026/);
  assert.match(h, /<span>Versión 1\.1<\/span><span>Última actualización: 23 de octubre de 2026<\/span>/);
  assert.match(h, /Secretaría Anticorrupción y Buen Gobierno/);
  assert.match(leer('terminos-y-condiciones.html'), /<span>Versión 1\.1<\/span>/);
  assert.match(leer('assets/js/club.js'), /TERMINOS_VERSION: '1\.1'/);
});

test('el módulo busca ZOORIGEN_CLUB por su nombre (es una constante global, no una propiedad de window) y ningún otro CSS usa sus clases', () => {
  const js = leer('assets/js/club-cupon.js');
  assert.match(js, /typeof ZOORIGEN_CLUB !== 'undefined' \? ZOORIGEN_CLUB : root\.ZOORIGEN_CLUB/);
  for (const f of fs.readdirSync(path.join(RAIZ, 'assets', 'css')).filter(x => x.endsWith('.css') && x !== 'club-cupon.css')) {
    assert.doesNotMatch(leer('assets/css/' + f), /\.zcu-|\.zp-(sw|pref)/, f + ' usa clases de la barra del cupón');
  }
  const clases = new Set([...leer('assets/css/club-cupon.css').matchAll(/.(zcu-[a-z_-]+|zp-[a-z_-]+)/g)].map(m => m[1]));
  assert.ok(clases.size > 15);
});
