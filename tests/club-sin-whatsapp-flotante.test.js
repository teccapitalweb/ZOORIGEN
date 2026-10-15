'use strict';
// El botón flotante de WhatsApp (#zsWa / .zs-wa y su menú) ya no existe en el Club ni en el panel de administración:
// solo queda en la página web pública. Los enlaces de WhatsApp DENTRO del contenido (canal, "Solicitar mi 20%", ayuda) siguen.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const PAGINAS = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html'));

test('ninguna página del Club, del panel ni de acceso contiene #zsWa, .zs-wa ni su menú', () => {
  const del_club = PAGINAS.filter(f => /^(club-.*|admin-club|verificar-correo|diagnostico)\.html$/.test(f));
  for (const f of ['club-dashboard.html', 'club-login.html', 'club-registro.html', 'club-gracias.html', 'verificar-correo.html', 'diagnostico.html', 'admin-club.html']) {
    assert.ok(del_club.includes(f), f + ' existe');
  }
  for (const f of del_club) {
    const h = leer('pages/' + f);
    assert.doesNotMatch(h, /id="zsWa"|id="zsWaBtn"|id="zsWaMenu"|class="zs-wa|zs-wa__/, f + ': sin botón flotante de WhatsApp');
    assert.doesNotMatch(h, /zsWa/, f + ': sin ninguna referencia a zsWa');
  }
});

test('el JavaScript y el CSS del Club ya no crean ni estilizan el botón flotante', () => {
  for (const rel of ['assets/js/club-shell.js', 'assets/js/club.js', 'assets/js/club-inicio.js', 'assets/js/club-paywall.js',
    'assets/css/club-shell.css', 'assets/css/club-responsivo.css', 'assets/css/club.css', 'assets/css/club-mobile.css', 'assets/css/club-inicio.css']) {
    assert.doesNotMatch(leer(rel), /zsWa|zs-wa|whatsappHTML|waMenuHTML|zsPulso/, rel);
  }
  const gen = leer('tools/generar-cromo-club.js');
  assert.doesNotMatch(gen, /whatsappHTML|zsWa/, 'el generador ya no escribe el marcado estático');
  assert.doesNotMatch(leer('sw.js'), /zs-wa|zsWa/);
});

test('la barra inferior del celular y el contenido conservan su espacio (barra + zona segura), sin reservar lugar para el botón', () => {
  const resp = leer('assets/css/club-responsivo.css');
  assert.match(resp, /body \.club-layout > \.club-main \{\s*padding: 0 var\(--zoo-gutter\) calc\(var\(--zs-bar-h, 64px\) \+ 40px \+ var\(--zoo-safe-b\)\) !important;/);
  assert.match(resp, /body \.club-layout > \.club-main \{ padding-bottom: calc\(var\(--zs-bar-h\) \+ 32px \+ var\(--zoo-safe-b\)\) !important; \}/);
  assert.doesNotMatch(resp, /\+ 104px|\+ 76px/, 'ya no se reservan 104 ni 76 px para el botón');
  const shell = leer('assets/css/club-shell.css');
  assert.match(shell, /\.club-sidebar \{ padding-bottom: 24px; \}/);
  assert.doesNotMatch(shell, /padding-bottom: 96px/);
});

test('los enlaces de WhatsApp dentro del contenido se conservan (canal, descuento, gracias, verificar correo)', () => {
  assert.match(leer('pages/club-canal.html'), /club-canal|canal/i);
  assert.match(leer('assets/js/club-inicio.js'), /Solicitar mi 20% por WhatsApp/);
  assert.match(leer('pages/club-gracias.html'), /wa\.me\/5212361113237/);
  assert.match(leer('pages/verificar-correo.html'), /Escríbenos por WhatsApp/);
  assert.match(leer('assets/js/club-shell.js'), /label: 'Canal de WhatsApp'/, 'el menú sigue llevando al canal');
});

test('la página web pública conserva su propio botón de WhatsApp (no se tocó)', () => {
  assert.match(leer('assets/css/landing-secciones.css'), /--zs-wa:/);
});
