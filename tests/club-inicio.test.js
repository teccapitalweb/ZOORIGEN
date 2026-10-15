'use strict';
// Inicio: qué tarjeta de curso se muestra ("Continúa tu curso" / "Próximo desbloqueo")
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../assets/js/club-inicio.js');

const curso = (id, extra) => Object.assign({ id, title: 'Curso ' + id, area: 'Fauna', duration: '2 h', createdAt: '2026-01-0' + id + 'T00:00:00Z', lecciones: [{ titulo: 'a' }, { titulo: 'b' }, { titulo: 'c' }, { titulo: 'd' }] }, extra || {});

test('sin cursos', () => {
  assert.equal(I.elegirHero({ cursos: [] }).tipo, 'sin-cursos');
  assert.equal(I.elegirHero({}).tipo, 'sin-cursos');
});

test('miembro nuevo (día 0): se muestra algo coherente y nunca se rompe', () => {
  const h = I.elegirHero({ cursos: [curso('1'), curso('2')], dias: 0, progreso: {} });
  assert.ok(['continuar', 'proximo'].includes(h.tipo));
});

test('con muchos días como miembro hay cursos abiertos: se continúa el que ya empezó', () => {
  const cursos = [curso('1'), curso('2'), curso('3')];
  const h = I.elegirHero({ cursos, dias: 400, progreso: { 2: { completedLessons: [0, 1], isCompleted: false } } });
  assert.equal(h.tipo, 'continuar');
  assert.equal(h.curso.id, '2');
  assert.equal(h.hechas, 2);
  assert.equal(h.total, 4);
});

test('si nada ha empezado, se ofrece el primero abierto', () => {
  const h = I.elegirHero({ cursos: [curso('1'), curso('2')], dias: 400, progreso: {} });
  assert.equal(h.tipo, 'continuar');
  assert.equal(h.hechas, 0);
});

test('todo terminado y nada por abrir → terminado', () => {
  const cursos = [curso('1'), curso('2')];
  const hecho = { 1: { completedLessons: [0, 1, 2, 3], isCompleted: true }, 2: { completedLessons: [0, 1, 2, 3], isCompleted: true } };
  assert.equal(I.elegirHero({ cursos, dias: 400, progreso: hecho }).tipo, 'terminado');
});

test('un curso adelantado con premio cuenta como abierto', () => {
  const cursos = [curso('1'), curso('2'), curso('3')];
  const terminado1 = { 1: { completedLessons: [0, 1, 2, 3], isCompleted: true } };
  const sin = I.elegirHero({ cursos, dias: 0, progreso: terminado1 });
  assert.equal(sin.tipo, 'proximo');            // el 2 y el 3 aún no abren
  const con = I.elegirHero({ cursos, dias: 0, adelantados: ['3'], progreso: terminado1 });
  assert.equal(con.tipo, 'continuar');
  assert.equal(con.curso.id, '3');
});

test('resumen: cursos abiertos, clases hechas y total', () => {
  const cursos = [curso('1'), curso('2'), curso('3')];
  const h = I.elegirHero({ cursos, dias: 400, progreso: { 1: { completedLessons: [0, 1, 2, 3], isCompleted: true }, 2: { completedLessons: [0], isCompleted: false } } });
  assert.equal(h.resumen.cursosTotal, 3);
  assert.equal(h.resumen.cursosAbiertos, 3);
  assert.equal(h.resumen.clasesTotal, 12);
  assert.equal(h.resumen.clasesHechas, 5);
  assert.equal(I.elegirHero({ cursos: [] }).resumen.cursosTotal, 0);
});

test('el widget escapa textos y solo acepta imágenes seguras', () => {
  const html = I.widgetHTML({ tipo: 'continuar', curso: curso('1', { title: '<img src=x onerror=1>', image: 'javascript:alert(1)' }), hechas: 1, total: 4, resumen: { cursosAbiertos: 1, cursosTotal: 3, clasesHechas: 1, clasesTotal: 12 } });
  assert.ok(!/<img src=x/.test(html));
  assert.ok(!/javascript:/.test(html));
  assert.match(html, /1 de 4 clases · 25%/);
  assert.match(html, /Continúa tu curso./);
  assert.match(html, /Tu siguiente meta/);
  assert.equal(I.imagenSegura('https://x.com/a.jpg'), 'https://x.com/a.jpg');
  assert.equal(I.imagenSegura('assets/img/cursos/a.jpg'), '../assets/img/cursos/a.jpg');
  assert.equal(I.imagenSegura('https://drive.google.com/file/d/1/view'), '');
  assert.equal(I.imagenSegura('http://x.com/a.jpg'), '');
  assert.equal(I.textoDias(0), 'hoy');
  assert.equal(I.textoDias(1), 'mañana');
});

test('esperando: "Espera tu próximo curso", cuenta regresiva y "Mientras esperas"', () => {
  const html = I.widgetHTML({ tipo: 'proximo', curso: curso('1'), diasFalta: 3, resumen: { cursosAbiertos: 0, cursosTotal: 2, clasesHechas: 0, clasesTotal: 8 } }, { ahora: new Date('2026-10-09T12:00:00') });
  assert.match(html, /Espera tu próximo curso./);
  assert.match(html, /Próximo desbloqueo/);
  assert.match(html, /Se abre en/);
  assert.match(html, /3 días · lunes, 12 de octubre/);
  assert.match(html, /Ver todos los cursos/);
  assert.match(html, /Mientras esperas/);
  assert.match(html, /Cuando se abra/);
});

test('los cuatro accesos: Cursos, Clases, PDFs y Pro con sus números', () => {
  const k = I.kpisDe({ resumen: { cursosAbiertos: 2, cursosTotal: 5, clasesHechas: 7, clasesTotal: 20 } }, { pdfsAbiertos: 4, pdfsTotal: 9 });
  assert.deepEqual(k.map(x => x.etiqueta), ['Cursos', 'Clases', 'PDFs', 'Pro']);
  assert.deepEqual(k.map(x => x.valor), ['2/5', '7/20', '4/9', '5']);
  assert.equal(I.kpisDe({}, {})[2].valor, '—', 'sin dato de PDFs no inventa números');
  for (const x of k) assert.match(x.href, /^club-[a-z]+.html$/);
});

test('saludo: hora, fecha larga y nombre escapado', () => {
  assert.equal(I.saludoHora(8), 'Buenos días');
  assert.equal(I.saludoHora(15), 'Buenas tardes');
  assert.equal(I.saludoHora(21), 'Buenas noches');
  assert.equal(I.fechaLarga(new Date('2026-10-09T12:00:00')), 'viernes 9 de octubre de 2026');
  const s = I.saludoHTML('<b>Ana</b>', new Date('2026-10-09T09:00:00'));
  assert.ok(!/<b>Ana/.test(s));
  assert.match(s, /Buenos días/);
});

test('foto del curso: la suya si es segura; si no, una foto propia del sitio según su área', () => {
  assert.equal(I.fotoDelCurso({ image: 'https://x.com/a.jpg' }), 'https://x.com/a.jpg');
  assert.match(I.fotoDelCurso({ area: 'Apicultura' }), /apicultura-polinizacion/);
  assert.match(I.fotoDelCurso({ area: 'Etología' }), /etologia/);
  assert.match(I.fotoDelCurso({ area: 'Cosa rara' }), /fauna-silvestre-conservacion/);
  assert.match(I.fotoDelCurso({ image: 'javascript:1', area: 'Manejo en cautiverio' }), /manejo-fauna-cautiverio/);
});

test('columna derecha: clases en vivo, comunidad, descuento, actividad y presencia', () => {
  assert.match(I.vivoHTML(null), /Próximamente/);
  assert.match(I.vivoHTML({ title: '<b>Tema</b>', date: '2026-10-20', speaker: 'Dra. Ana' }), /&lt;b&gt;Tema/);
  assert.match(I.comunidadHTML(), /club-canal.html/);
  assert.match(I.descuentoHTML('https://wa.me/1?text=x'), /20%/);
  const act = I.actividadHTML({ cursosHechos: 2, cursosTotal: 8, certificados: 2, retos: 7, logros: 3, logrosTotal: 20 });
  assert.ok(act.includes('2/8') && act.includes('3/20'));
  assert.ok(!/NaN|undefined/.test(I.actividadHTML({})), 'sin datos no inventa ni rompe');
  assert.match(I.presenciaHTML(false), /Crear mi tarjeta/);
  assert.match(I.presenciaHTML(true), /100%/);
  assert.equal(I.textoApertura(0), 'hoy');
  assert.equal(I.textoApertura(1), '1 día');
});

test('cuenta regresiva con horas: menos de un día muestra horas; después, días', () => {
  assert.equal(I.textoApertura(1, 19 * 3600000 - 1000), '19 horas');
  assert.equal(I.textoApertura(1, 30 * 60000), 'menos de 1 hora');
  assert.equal(I.textoApertura(1, 3600000 + 1), '2 horas');
  assert.equal(I.textoApertura(1, 24 * 3600000), '1 día');
  assert.equal(I.textoApertura(3, 2.2 * 86400000), '3 días');
  assert.equal(I.textoApertura(3, null), '3 días', 'sin hora exacta se queda con los días de siempre');
  const ahora = Date.UTC(2026, 9, 9, 12, 0, 0);
  const desde = ahora - 24 * 86400000 + 5 * 3600000;       // el cuarto curso (24 días de espera) se abre dentro de 5 horas
  const cursos = [curso('1'), curso('2'), curso('3'), curso('4')];
  const h = I.elegirHero({ cursos, dias: Math.floor((ahora - desde) / 86400000), desdeMs: desde, ahoraMs: ahora, progreso: { 1: { completedLessons: [0, 1, 2, 3], isCompleted: true }, 2: { completedLessons: [0, 1, 2, 3], isCompleted: true }, 3: { completedLessons: [0, 1, 2, 3], isCompleted: true } } });
  assert.equal(h.tipo, 'proximo');
  assert.equal(Math.round(h.msFalta / 3600000), 5, 'faltan las horas exactas (no días enteros)');
  const html = I.widgetHTML(h, { ahora: new Date(ahora) });
  assert.match(html, /5 horas/);
});

/* ───── Rediseño del Inicio: tarjeta de saludo con Jaguarito, conteo animado e invitación ───── */
test('conteo ascendente: sube de 0 al valor en 600 ms, con curva suave y sin pasarse', () => {
  assert.equal(I.DURACION_CONTEO, 600);
  assert.equal(I.valorConteo(0, 15, 0), 0);
  assert.equal(I.valorConteo(0, 15, 600), 15);
  assert.equal(I.valorConteo(0, 15, 5000), 15, 'no pasa de la meta');
  const medio = I.valorConteo(0, 100, 300);
  assert.ok(medio > 50 && medio < 100, 'sale rápido y frena al llegar: ' + medio);
  assert.equal(I.valorConteo(10, 4, 600), 4, 'también baja si el dato baja');
  assert.equal(I.valorConteo('x', 7, 600), 7);
  assert.equal(I.valorConteo(0, 'x', 100), 0);
  let anterior = -1;
  for (let ms = 0; ms <= 600; ms += 50) { const v = I.valorConteo(0, 61, ms); assert.ok(v >= anterior); anterior = v; }
  assert.equal(I.esConteo('15'), true);
  assert.equal(I.esConteo(0), true);
  for (const mal of ['—', '', null, undefined, -1, 1.5, true, 'abc']) assert.equal(I.esConteo(mal), false, String(mal));
});

test('cifras del saludo: cursos, clases, en progreso, completados y la racha solo si se conoce', () => {
  const c = I.cifrasDelHero({ cursos: 15, clases: 61, enProgreso: 2, completados: 2, racha: 6 });
  assert.deepEqual(c.map(x => x.clave), ['cursos', 'clases', 'enProgreso', 'completados', 'racha']);
  assert.deepEqual(c.map(x => x.valor), ['15', '61', '2', '2', '6']);
  assert.equal(c[4].rotulo, 'días seguidos');
  assert.equal(I.cifrasDelHero({ cursos: 1, clases: 1, enProgreso: 1, completados: 1, racha: 1 }).map(x => x.rotulo).join('|'), 'curso|clase|en progreso|completado|día seguido');
  const sin = I.cifrasDelHero({ cursos: 3 });
  assert.equal(sin.length, 4, 'sin racha conocida (no miembro) no hay quinta cifra');
  assert.equal(sin[1].valor, '—', 'lo que falta no se inventa');
  const pendiente = I.cifrasDelHero({ conRacha: true });
  assert.equal(pendiente.length, 5);
  assert.equal(pendiente[4].valor, '—');
  assert.equal(I.cifrasDelHero({ racha: 0 })[4].valor, '0', 'una racha de cero es un dato real');
});

test('botón principal: "Continuar mi curso" / "Empezar mi curso" o "Ver cursos"', () => {
  assert.equal(I.botonHero({ tipo: 'continuar', hechas: 2, total: 4 }).etiqueta, 'Continuar mi curso');
  assert.equal(I.botonHero({ tipo: 'continuar', hechas: 0, total: 4 }).etiqueta, 'Empezar mi curso');
  for (const h of [{ tipo: 'proximo' }, { tipo: 'terminado' }, { tipo: 'sin-cursos' }, null]) assert.equal(I.botonHero(h).etiqueta, 'Ver cursos');
  assert.equal(I.botonHero(null).href, 'club-biblioteca.html');
});

test('frase de Jaguarito según el estado (sin cursos, en progreso, terminó, esperando)', () => {
  const m = (hero, racha) => I.mensajeGuia({ hero, racha });
  assert.equal(m({ tipo: 'continuar', hechas: 1, total: 4 }, 0).texto, 'Tu siguiente clase te espera.');
  assert.match(m({ tipo: 'continuar', hechas: 1, total: 4 }, 6).texto, /Llevas 6 días seguidos/);
  assert.match(m({ tipo: 'continuar', hechas: 3, total: 4 }, 0).texto, /Te falta una clase/);
  assert.match(m({ tipo: 'continuar', hechas: 0, total: 4 }, 0).texto, /primer curso/);
  assert.match(m({ tipo: 'proximo' }, 0).texto, /próximo curso/);
  assert.match(m({ tipo: 'terminado' }, 0).texto, /Terminaste/);
  assert.match(m({ tipo: 'sin-cursos' }, 0).texto, /Pronto habrá cursos/);
  assert.match(m(null, null).texto, /avance de hoy/);
  const guia = require('../assets/js/guia-personaje.js');
  for (const hero of [null, { tipo: 'continuar', hechas: 0, total: 3 }, { tipo: 'continuar', hechas: 1, total: 3 }, { tipo: 'proximo' }, { tipo: 'terminado' }, { tipo: 'sin-cursos' }]) {
    const r = m(hero, 5);
    assert.ok(guia.esExpresion(r.expresion), 'la expresión existe en el mapa de Jaguarito: ' + r.expresion);
    assert.ok(r.texto.length > 10 && r.texto.length < 90, 'frase corta');
  }
});

test('saludoHTML: tarjeta única con Jaguarito, frase, botón, cifras escalonadas y decoración sin texto ni emojis', () => {
  const h = I.saludoHTML('Ana', new Date('2026-10-13T15:00:00'), { cursos: 15, clases: 61, enProgreso: 2, completados: 2, racha: 6 },
    { hero: { tipo: 'continuar', hechas: 1, total: 4 } });
  assert.match(h, /class="zs-seccion zs-inicio"/);
  assert.match(h, /Buenas tardes,/);
  assert.match(h, /Martes 13 de octubre de 2026/);
  assert.match(h, /assets\/img\/guia\/guia-[a-z]+\.webp/);
  assert.match(h, /id="zsInicioMensaje"[^>]*>Llevas 6 días seguidos/);
  assert.match(h, /id="zsInicioCta"[^>]*>[\s\S]*Continuar mi curso/);
  assert.equal((h.match(/style="--i:\d"/g) || []).length, 5, 'cada cifra lleva su índice de entrada');
  assert.match(h, /data-cifra="racha"[^>]*>6</);
  assert.match(h, /zs-inicio__decor" aria-hidden="true"/);
  assert.doesNotMatch(h, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  assert.doesNotMatch(h, /<script|onerror|javascript:/i);
  const nombreSucio = I.saludoHTML('<img src=x onerror=1>', new Date('2026-10-13T09:00:00'), {});
  assert.doesNotMatch(nombreSucio, /<img src=x/);
});

test('invitación: huellas llenas 0..4, aviso de lo que falta y premio listo', () => {
  const e = (r) => I.estadoInvitados(r);
  assert.deepEqual(e({ validos: 0 }).huellas, [false, false, false, false]);
  assert.deepEqual(e({ validos: 2, pendientes: 1, puntosTotales: 30 }).huellas, [true, true, false, false]);
  assert.equal(e({ validos: 2, pendientes: 1, puntosTotales: 30 }).aviso, 'Te faltan 2 para tu premio');
  assert.equal(e({ validos: 3 }).aviso, 'Te falta 1 para tu premio');
  assert.equal(e({ validos: 3 }).llenas, 3);
  assert.equal(e({ validos: 9 }).llenas, 4, 'no pasa de la meta');
  assert.equal(e({ validos: 4 }).aviso, 'Ya ganaste tu premio de invitados');
  assert.equal(e({ validos: 4, premios: [{ ganado: true, usado: false }] }).aviso, 'Tienes un premio listo para canjear');
  assert.equal(e({ validos: 1, premios: [{ ganado: true, usado: true }] }).aviso, 'Ya ganaste tu premio de invitados');
  const raro = e({ validos: -3, pendientes: 'x', puntosTotales: null });
  assert.deepEqual([raro.validos, raro.pendientes, raro.puntos, raro.llenas], [0, 0, 0, 0]);
  assert.equal(e(null).huellas.length, 4);
  assert.equal(I.estadoInvitados({ validos: 1 }, 6).huellas.length, 6, 'la meta se puede cambiar');
});

test('invitaHTML: boleto con código, copiar, huellas, tres cifras, WhatsApp y enlace a invitados', () => {
  const est = I.estadoInvitados({ validos: 2, pendientes: 1, puntosTotales: 0 });
  const h = I.invitaHTML({ codigo: 'ZOO-VIP8K2', estado: est });
  assert.match(h, /Invita a 4 amigos y adelanta un curso/);
  assert.match(h, /id="dashRefCode">ZOO-VIP8K2</);
  assert.match(h, /data-copiar/);
  assert.equal((h.match(/inv__huella is-llena/g) || []).length, 2);
  assert.equal((h.match(/class="inv__huella[ "]/g) || []).length, 4);
  assert.match(h, /aria-label="2 de 4 amigos confirmados"/);
  assert.match(h, /Te faltan 2 para tu premio/);
  for (const r of ['confirmados', 'por confirmar', 'puntos']) assert.ok(h.includes('<dt>' + r + '</dt>'), r);
  for (const tono of ['ok', 'pen', 'pts']) assert.match(h, new RegExp('class="inv__cifra inv__cifra--' + tono + '"'), 'cifra ' + tono);
  assert.match(h, /data-compartir[\s\S]*Compartir por WhatsApp/);
  assert.match(h, /href="club-referidos\.html">Ver mis invitados/);
  assert.match(I.invitaHTML({ codigo: 'ZOO-A', error: true }), /No pudimos cargar tus invitados ahora/);
  assert.match(I.invitaHTML({ codigo: 'ZOO-A' }), /Cargando tus invitados/);
  assert.doesNotMatch(I.invitaHTML({ codigo: '"><img src=x onerror=1>' }), /<img src=x/);
});

test('compartir por WhatsApp: mismo texto y enlace de registro con el código', () => {
  assert.equal(I.urlRegistroConCodigo('ZOO-VIP8K2'), 'https://www.zoorigen.com/pages/club-registro.html?ref=ZOO-VIP8K2');
  const t = I.mensajeCompartir('ZOO-VIP8K2');
  assert.match(t, /Únete con mi código ZOO-VIP8K2/);
  assert.ok(t.includes('club-registro.html?ref=ZOO-VIP8K2'));
  assert.ok(I.urlWhatsapp('ZOO-VIP8K2').startsWith('https://wa.me/?text='));
});

test('presencia: una tarjeta privada no se anuncia como activa; la publicada sí', () => {
  const privada = I.presenciaHTML(true, false);
  assert.match(privada, /Tu tarjeta es privada/);
  assert.match(privada, /Solo tú la ves/);
  assert.match(privada, /Ver mi tarjeta/);
  assert.doesNotMatch(privada, /está activa/);
  assert.match(I.presenciaHTML(true, true), /Tu tarjeta profesional está activa/);
  assert.match(I.presenciaHTML(true), /está activa/, 'sin dato se trata como publicada (compatibilidad)');
  assert.match(I.presenciaHTML(false, false), /Crea tu tarjeta profesional/, 'sin tarjeta, la bandera no importa');
});

test('prueba gratuita sin elegir: Inicio no impone ningún curso, solo invita a elegir el suyo', () => {
  const h = { tipo: 'elegir-prueba', resumen: { cursosAbiertos: 0, cursosTotal: 3, clasesHechas: 0, clasesTotal: 12 } };
  const html = I.widgetHTML(h, { ahora: new Date('2026-10-09T12:00:00') });
  assert.match(html, /Elige tu curso de prueba\./);
  assert.match(html, /Aún no eliges tu curso/);
  assert.match(html, /href="club-biblioteca\.html\?elegir=1"/);
  assert.match(html, /Elegir mi curso/);
  assert.equal(/Empezar mi curso|Seguir aprendiendo|Se abre en/.test(html), false, 'no le pone un curso ni una cuenta regresiva');
  assert.equal(/\p{Extended_Pictographic}/u.test(html), false);
  assert.deepEqual(I.botonHero(h), { href: 'club-biblioteca.html?elegir=1', etiqueta: 'Elegir mi curso' });
  assert.match(I.mensajeGuia({ hero: h, racha: 0 }).texto, /Elige tu curso de prueba/);
  const m = I.pasosDe(h);
  assert.equal(m.titulo, 'Tu prueba gratuita te espera');
  assert.equal(m.pasos.length, 3);
});

test('Inicio: sin membresía consulta la prueba gratuita antes de poner un curso en la tarjeta', () => {
  const fs2 = require('node:fs');
  const path2 = require('node:path');
  const dash = fs2.readFileSync(path2.join(__dirname, '..', 'pages', 'club-dashboard.html'), 'utf8');
  const ini = dash.indexOf('const pintarTarjetaCursos = async () => {');
  const fin = dash.indexOf('pintarTarjetaCursos();', ini);
  assert.ok(ini > 0 && fin > ini);
  const bloque = dash.slice(ini, fin);
  assert.ok(bloque.includes("apiFetch('/api/prueba-gratuita')"));
  assert.ok(bloque.includes("tipo: 'elegir-prueba'"));
  assert.ok(bloque.includes('est.elegida'));
});

test('Mi perfil: plan real (mensual o anual), "Tu actividad" con datos reales y sin el precio fijo para todos', () => {
  const fs2 = require('node:fs');
  const path2 = require('node:path');
  const pag = fs2.readFileSync(path2.join(__dirname, '..', 'pages', 'club-perfil.html'), 'utf8');
  assert.equal(pag.includes('Miembro VIP · $199 MXN/mes</div>'), false, 'el plan ya no es un texto fijo');
  assert.ok(pag.includes("session.planTipo === 'anual' ? 'VIP Anual"));
  for (const id of ['actCursos', 'actCerts', 'actClases', 'actUltimo']) assert.ok(pag.includes('id="' + id + '"'), id);
  assert.ok(pag.includes('lastSignInTime'), 'el último inicio de sesión sale de la cuenta');
  assert.ok(pag.includes("db.collection('certificados').where('memberUid', '==', session.uid)"));
  assert.ok(pag.includes('nombreCertificado: newName'), 'editar el nombre cambia el de los certificados nuevos');
  assert.ok(/assets\/js\/club-progreso\.js\?v=[\w.-]+/.test(pag) && /assets\/js\/club-certificado\.js\?v=[\w.-]+/.test(pag));
});

test('Canal: botones de Facebook e Instagram de Zoorigen con sus direcciones exactas, sin degradados ni emojis', () => {
  const fs2 = require('node:fs');
  const path2 = require('node:path');
  const pag = fs2.readFileSync(path2.join(__dirname, '..', 'pages', 'club-canal.html'), 'utf8');
  assert.ok(pag.includes('href="https://www.facebook.com/p/Zoorigen-61579624231627/"'));
  assert.ok(pag.includes('href="https://www.instagram.com/zoorigen.mexico1/"'));
  assert.equal(pag.includes('profile.php?id='), false, 'ya no queda el enlace anterior de Facebook');
  for (const m of pag.matchAll(/<a class="zk-redes__btn[^>]*>/g)) {
    assert.match(m[0], /target="_blank"/);
    assert.match(m[0], /rel="noopener noreferrer"/);
  }
  const ini = pag.indexOf('zk-redes');
  assert.ok(ini > 0);
  const bloque = pag.slice(ini, pag.indexOf('zkBloqueo', ini));
  assert.equal(/gradient/i.test(bloque), false);
  assert.equal(/\p{Extended_Pictographic}/u.test(bloque), false);
});
