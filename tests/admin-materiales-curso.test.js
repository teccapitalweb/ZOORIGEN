const {test}=require('node:test');const assert=require('node:assert/strict');const M=require('../assets/js/admin-materiales-curso');
test('materiales: Drive permite ID y enlaces oficiales, rechaza enlaces ajenos',()=>{
assert.equal(M.driveId('https://drive.google.com/file/d/abcdefghijklmnop/view'),'abcdefghijklmnop');
assert.equal(M.driveId('https://drive.google.com/open?id=abcdefghijklmnop'),'abcdefghijklmnop');
assert.equal(M.driveId('https://otro.test/file/d/abcdefghijklmnop'),'');
assert.equal(M.driveId('javascript:alert(1)'),'');});
test('materiales: la asociación sigue a la clase al reordenar y detecta clases eliminadas',()=>{
const a={titulo:'A'},b={titulo:'B'}, m={title:'Guía',driveId:'abcdefghijklmnop',claseRef:a};
assert.equal(M.validar([m],[b,a])[0].clase,2);assert.throws(()=>M.validar([m],[b]),/elige de nuevo/);
assert.equal(M.validar([{title:'General',driveId:'abcdefghijklmnop',clase:0}],[])[0].clase,0);
});
test('materiales: valida antes de preparar escrituras',()=>{
assert.throws(()=>M.validar([{title:'',driveId:'abcdefghijklmnop'}],[]),/título/);
assert.throws(()=>M.validar([{title:'PDF',driveId:'invalid'}],[]),/Drive/);
assert.throws(()=>M.validar([{title:'PDF',driveId:'abcdefghijklmnop',pages:-1}],[]),/páginas/);
});
const fs=require('node:fs'),vm=require('node:vm');
test('visitas: una petición anónima por carga; respeta DNT y GPC',()=>{
const script=fs.readFileSync('assets/js/visitas.js','utf8');for(const nav of [{doNotTrack:'1'},{globalPrivacyControl:true},{}]) {
let calls=[];const ctx={navigator:nav,window:{},fetch:(...args)=>{calls.push(args);return Promise.resolve();}};
vm.runInNewContext(script,ctx);vm.runInNewContext(script,ctx);
assert.equal(calls.length,Object.keys(nav).length?0:1);if(calls.length){assert.equal(calls[0][1].credentials,'omit');assert.equal(calls[0][1].body,'{"pagina":"portada"}');}}
});
test('encuesta: gráficas con personas consolidadas y tabla accesible',()=>{
const E=require('../assets/js/admin-encuesta');const h=E.vistaHTML({encuesta:{ok:true,docs:[{sessionId:'a',creado:'2026-10-19T12:00:00Z',completada:true,respuestas:{p1:'Estudiante'}},{sessionId:'a',creado:'2026-10-18T12:00:00Z',respuestas:{p1:'Estudiante'}}]},preguntas:{ok:true,preguntas:[]}});
assert.match(h,/data-zg-anillo/);assert.match(h,/data-zg=/);assert.match(h,/zg-anillo/); /* el perfil ahora es una dona (diseño de 11 gráficas) y la serie por fecha conserva data-zg */assert.match(h,/<caption>Estado de las encuestas<\/caption>/);
});
