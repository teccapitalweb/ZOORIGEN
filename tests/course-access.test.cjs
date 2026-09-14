const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const library = fs.readFileSync(path.join(base, 'pages/club-biblioteca.html'), 'utf8');
const accessSource = library.slice(library.indexOf('    let previewPolicy = null;'), library.indexOf('    function mostrarPaywallCurso()'));

for (const count of [0, 1, 2, 8]) {
  test(`frontend: curso de ${count} clases, última premium y otros cursos bloqueados`, () => {
    const context = vm.createContext({ window: { __zooSession: { role: 'member', active: false } }, ZOORIGEN_CLUB: { hasActiveMembership(session) { return session.active; } } });
    vm.runInContext(accessSource, context);
    const freeVideoIds = Array.from({ length: Math.max(0, count - 1) }, (_, i) => 'video-' + i);
    vm.runInContext(`initialCourseId = 'initial'; previewPolicy = ${JSON.stringify({ freeVideoIds })};`, context);
    for (let i = 0; i < count; i++) {
      assert.equal(vm.runInContext(`esClaseGratis({videoId: 'video-${i}'}, 'initial')`, context), i < count - 1);
      assert.equal(vm.runInContext(`esClaseGratis({videoId: 'video-${i}'}, 'other')`, context), false);
    }
    assert.equal(vm.runInContext(`esClaseGratis({videoId: 'unknown'}, 'initial')`, context), false);
    assert.equal(vm.runInContext('tieneMembresiaActiva()', context), false);
    vm.runInContext('window.__zooSession.active = true', context);
    assert.equal(vm.runInContext('tieneMembresiaActiva()', context), true);
    vm.runInContext("window.__zooSession = {role:'admin', active:false}", context);
    assert.equal(vm.runInContext('tieneMembresiaActiva()', context), true);
    vm.runInContext('previewPolicy = null', context);
    assert.equal(vm.runInContext("esClaseGratis({videoId:'video-0'}, 'initial')", context), false);
  });
}

test('scripts de todas las páginas y archivos compartidos compilan', () => {
  for (const file of fs.readdirSync(path.join(base,'pages')).filter(file => file.startsWith('club-') && file.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(base,'pages',file),'utf8');
    let index = 0;
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/type=["']application\//i.test(match[1]) || !match[2].trim()) continue;
      new vm.Script(match[2], { filename: file + ':' + (++index) });
    }
  }
  for (const file of ['club.js','membership-tour.js']) new vm.Script(fs.readFileSync(path.join(base,'assets/js',file),'utf8'), { filename:file });
});

test('registro explica excepción y precios quedan en suscripción', () => {
  const signup = fs.readFileSync(path.join(base,'pages/club-registro.html'),'utf8');
  assert.match(signup, /última clase.*membresía/);
  for (const file of ['club-login.html','club-registro.html','club-dashboard.html','club-perfil.html','club-referidos.html']) {
    const html = fs.readFileSync(path.join(base,'pages',file),'utf8');
    assert.doesNotMatch(html, /\$\s*(?:199|1,899)\b/);
  }
  assert.match(fs.readFileSync(path.join(base,'pages/club-suscripcion.html'),'utf8'), /\$199/);
});
