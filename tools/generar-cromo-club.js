#!/usr/bin/env node
'use strict';
/* ============================================================ */
/* ZOORIGEN · GENERADOR DEL "CROMO" DEL CLUB                     */
/*                                                               */
/* Escribe en el HTML de cada página, ya hecho, lo que antes     */
/* pintaba el JavaScript después de cargar Firebase:             */
/*   - script mínimo de tema como primer hijo de <head>          */
/*   - tipografías autoalojadas (preload + fuentes.css)          */
/*   - barra lateral, barra superior y barra inferior (las      */
/*     mismas funciones de assets/js/club-shell.js)             */
/*   - decisión temprana de "administrador": quien administra   */
/*     no ve el Club de miembro, va al panel (salvo "Ver como   */
/*     usuario"); sin parpadeo porque se decide en el <head>    */
/*   - tarjeta de título del apartado (ZOO_SECCION.html con el   */
/*     mismo cfg que la página le pasa a montar())               */
/* Así, al cambiar de apartado el primer pintado ya trae la      */
/* estructura completa y el navegador no tiene nada que          */
/* acomodar después.                                             */
/*                                                               */
/* Es idempotente: volver a correrlo no cambia nada si ya está   */
/* al día. Uso:                                                  */
/*   node tools/generar-cromo-club.js            (escribe)       */
/*   node tools/generar-cromo-club.js --check    (solo revisa)   */
/* tests/club-cromo.test.js comprueba que las páginas coinciden.  */
/* ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const VERSION_FUENTES = '20261109-cromo';

/* Páginas con barra lateral (panel completo) y su apartado de menú cuando no se puede leer del código. */
const OTRAS_CABECERA = ['club-login.html', 'club-gracias.html', 'verificar-correo.html', 'admin-club.html'];

/* ───── Entorno de Node para ejecutar el marcado puro de club-shell.js, club-seccion.js y club-inicio.js ───── */
function prepararEntorno() {
  if (prepararEntorno.listo) return prepararEntorno.api;
  const club = fs.readFileSync(path.join(RAIZ, 'assets/js/club.js'), 'utf8');
  const tabla = /const ZOORIGEN_ICONS = (\{[\s\S]*?\n\});/.exec(club);
  const fn = /function zooIcon\(name, size\) \{[\s\S]*?\n\}/.exec(club);
  if (!tabla || !fn) throw new Error('No encuentro ZOORIGEN_ICONS / zooIcon en club.js');
  const shell = require(path.join(RAIZ, 'assets/js/club-shell.js'));
  const ICONOS = Function('return ' + tabla[1])();
  Object.keys(shell.ICONOS_EXTRA).forEach((k) => { if (!ICONOS[k]) ICONOS[k] = shell.ICONOS_EXTRA[k]; });
  global.ZOORIGEN_ICONS = ICONOS;
  global.zooIcon = Function('ZOORIGEN_ICONS', fn[0] + '\nreturn zooIcon;')(ICONOS);
  global.ZOO_CONFIG = require(path.join(RAIZ, 'assets/js/club-config.js'));
  prepararEntorno.api = {
    shell,
    seccion: require(path.join(RAIZ, 'assets/js/club-seccion.js')),
    inicio: require(path.join(RAIZ, 'assets/js/club-inicio.js')),
    iconosSprite: require(path.join(RAIZ, 'assets/js/herramientas-iconos.js')).ICONOS
  };
  prepararEntorno.listo = true;
  return prepararEntorno.api;
}

/* ───── Utilidades ───── */
function cortarArgumentos(texto, desde) {
  // texto[desde] es el "(" de la llamada; devuelve lo que hay hasta su ")" respetando comillas y plantillas.
  let prof = 0, i = desde, comilla = '';
  for (; i < texto.length; i++) {
    const c = texto[i];
    if (comilla) {
      if (c === '\\') { i++; continue; }
      if (c === comilla) comilla = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { comilla = c; continue; }
    if (c === '(' || c === '[' || c === '{') prof++;
    else if (c === ')' || c === ']' || c === '}') { prof--; if (prof === 0) return texto.slice(desde + 1, i); }
  }
  throw new Error('Paréntesis sin cerrar');
}

/* El cfg que la página le pasa a ZOO_SECCION.montar('#zsSeccion', cfg). */
function extraerCfg(html) {
  const re = /ZOO_SECCION\.montar\(\s*'#zsSeccion'\s*,/g;
  const m = re.exec(html);
  if (!m) return null;
  const abre = html.indexOf('(', m.index);
  const args = cortarArgumentos(html, abre);
  const coma = args.indexOf(',');
  const expr = args.slice(coma + 1).trim();
  const enVivoPronto = global.ZOO_CONFIG && global.ZOO_CONFIG.clasesEnVivoPronto === true;
  // "pronto" es la variable que usa la página de Webinars (!!(window.ZOO_CONFIG && ZOO_CONFIG.clasesEnVivoPronto)).
  return Function('pronto', 'window', 'return (' + expr + ');')(enVivoPronto, { ZOO_CONFIG: global.ZOO_CONFIG });
}

/* Cambia <use href="#zi-x"/> por el trazo en línea: la tarjeta no depende del sprite que inyecta el JavaScript. */
function iconosEnLinea(html, ICONOS) {
  return html.replace(/<svg class="zi" aria-hidden="true"><use href="#zi-([\w-]+)"\/><\/svg>/g, (todo, nombre) => {
    const d = ICONOS[nombre];
    if (!d) return todo;
    return '<svg class="zi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  });
}

function scriptTema() {
  return '<script>/*zs-tema*/!function(d){var t,p,h=d.documentElement;try{t=localStorage.getItem("zoo_theme");p=localStorage.getItem("zoo_plan")}catch(e){}' +
    'h.setAttribute("data-theme",t==="dark"?"dark":"light");if(/^(active|cancelled_active|past_due|expired|free)$/.test(p))h.setAttribute("data-plan",p)}(document)</script>';
}

/* Solo en las páginas del Club de miembro. Quien administra el sitio NO ve lo mismo que un miembro: si este navegador ya sabe
   que la cuenta es administradora (localStorage "zoo_admin", lo escribe club.js tras confirmarlo con el servidor) la página
   se va al panel antes del primer pintado. "Ver como usuario" (?como=user) se recuerda solo en sessionStorage de la pestaña
   ("zoo_como_usuario"); ?como=admin lo quita. El servidor siempre decide los permisos reales: esto solo elige qué se muestra. */
function scriptAdmin() {
  return '<script>/*zs-admin*/!function(){try{var s=window.sessionStorage,h=document.documentElement,q=/[?&]como=(user|admin)(?:&|#|$)/.exec(location.search);' +
    'if(q){if(q[1]==="user")s.setItem("zoo_como_usuario","1");else s.removeItem("zoo_como_usuario")}' +
    'if(localStorage.getItem("zoo_admin")==="1"){if(s.getItem("zoo_como_usuario")==="1")h.setAttribute("data-como","user");' +
    'else{h.style.visibility="hidden";setTimeout(function(){h.style.visibility=""},4000);location.replace("admin-club.html")}}}catch(e){}}()</script>';
}

function bloqueFuentes(conPlayfair, imagenes) {
  return '  <!-- zs:fuentes -->\n' +
    '  <link rel="preload" href="../assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>\n' +
    '  <link rel="preload" href="../assets/fonts/outfit-latin.woff2" as="font" type="font/woff2" crossorigin>\n' +
    (conPlayfair ? '  <link rel="preload" href="../assets/fonts/playfair-latin.woff2" as="font" type="font/woff2" crossorigin>\n' : '') +
    '  <link rel="stylesheet" href="../assets/css/fuentes.css?v=' + VERSION_FUENTES + '">\n' +
    (imagenes || []).map((u) => '  <link rel="preload" href="' + u + '" as="image" type="image/webp" fetchpriority="high">\n').join('') +
    '  <!-- /zs:fuentes -->\n';
}

function scriptSaludo() {
  return '<script>/*zs-saludo*/!function(){try{var d=new Date(),h=d.getHours(),t=document.querySelector("#inicioSaludo .zs-seccion__titulo"),s=document.querySelector("#inicioSaludo .zs-seccion__sub"),' +
    'D=["domingo","lunes","martes","miércoles","jueves","viernes","sábado"],' +
    'M=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],' +
    'f=D[d.getDay()]+" "+d.getDate()+" de "+M[d.getMonth()]+" de "+d.getFullYear();f=f.charAt(0).toUpperCase()+f.slice(1);' +
    'if(t&&t.firstChild)t.firstChild.nodeValue=(h<12?"Buenos días":h<19?"Buenas tardes":"Buenas noches")+", ";' +
    'if(s)s.textContent=f+". Tu acceso a cursos, herramientas pro y la comunidad de fauna silvestre más activa de México."}catch(e){}}()</script>';
}

/* Id del menú con el que la página llama a renderSidebar (lo que el JavaScript marcará como activo). */
function menuDeLaPagina(html) {
  const m = /renderSidebar\(\s*(?:'([a-z]+)'|(MENU_ID))/.exec(html);
  if (!m) return '';
  if (m[1]) return m[1];
  const c = /const MENU_ID = '([a-z]+)'/.exec(html);
  return c ? c[1] : '';
}

/* ───── Transformación de una página ───── */
function procesar(html, archivo) {
  const E = prepararEntorno();
  const nombre = path.basename(archivo || '');
  const esPanel = /<aside class="club-sidebar" id="sidebar"/.test(html);
  const esCabecera = OTRAS_CABECERA.indexOf(nombre) !== -1;
  if (!esPanel && !esCabecera) return html;
  let h = html;

  /* 0) Tarjeta de título (cfg que la página le pasa a montar()) y sus imágenes */
  let tarjeta = '';
  if (nombre === 'club-dashboard.html') {
    tarjeta = E.inicio.saludoHTML('', new Date(2026, 0, 5, 10, 0), { conRacha: true }, {});
  } else if (nombre === 'club-pdfs.html') {
    tarjeta = E.seccion.html({
      id: 'zsSeccionPdfs', seccion: 'pdfs', icono: 'files', eyebrow: 'Biblioteca del Club',
      titulo: 'PDFs y materiales,', acento: 'para llevar contigo.',
      sub: 'Libros que se desbloquean con tus retos, guías y plantillas para descargar, presentaciones y los textos oficiales de la normatividad.',
      cifras: [{ clave: 'mt0', valor: '—', rotulo: 'Libros' }, { clave: 'mt1', valor: '—', rotulo: 'Materiales' }, { clave: 'mt2', valor: '—', rotulo: 'Retos superados' }]
    });
  } else {
    const cfg = extraerCfg(h);
    if (cfg) tarjeta = E.seccion.html(cfg);
  }
  const imagenes = [];
  if (esPanel && tarjeta) {
    const mp = /class="zs-personaje__img" src="([^"]+)"/.exec(tarjeta), mj = /class="zs-inicio__jaguar" src="([^"]+)"/.exec(tarjeta);
    if (mp) imagenes.push(mp[1]);
    if (mj) imagenes.push(mj[1]);
  }

  /* 1) Cabecera: tema primero, tipografías propias */
  h = h.replace(/<script>\/\*zs-tema\*\/[\s\S]*?<\/script>\s*/, '');
  h = h.replace(/<script>\/\*zs-admin\*\/[\s\S]*?<\/script>\s*/, '');
  h = h.replace(/<head>\s*/, () => '<head>\n' + scriptTema() + '\n  ');
  // La decisión de administrador va justo después de <meta charset> (que debe quedar en los primeros 1024 bytes) y antes de todo CSS.
  if (esPanel) h = h.replace(/(<meta charset="UTF-8">(?:<meta name="viewport"[^>]*>)?)/, (m) => m + '\n  ' + scriptAdmin());
  h = h.replace(/[ \t]*<link[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>[ \t]*\r?\n?/g, '');
  h = h.replace(/[ \t]*<!-- zs:fuentes -->[\s\S]*?<!-- \/zs:fuentes -->\r?\n?/, '');
  const conPlayfair = nombre === 'club-dashboard.html';
  const ancla = /[ \t]*<link rel="stylesheet"/.exec(h) || /[ \t]*<style/.exec(h);
  if (!ancla) throw new Error(nombre + ': no encuentro dónde poner las fuentes');
  h = h.slice(0, ancla.index) + bloqueFuentes(conPlayfair, imagenes) + h.slice(ancla.index);

  if (!esPanel) return h;

  /* 2) Barra lateral */
  const activo = menuDeLaPagina(h);
  if (!activo) throw new Error(nombre + ': no encuentro el id de menú (renderSidebar)');
  h = h.replace(/<aside class="club-sidebar" id="sidebar"[^>]*>[\s\S]*?<\/aside>/,
    () => '<aside class="club-sidebar" id="sidebar" data-zs-estatico>' + iconosEnLinea(E.shell.barraLateralHTML(activo), E.iconosSprite) + '</aside>');

  /* 3) Barra superior (primer hijo de <main class="club-main">) */
  h = h.replace(/\s*<header class="zs-topbar" id="zsTopbar">[\s\S]*?<\/header>/, '');
  h = h.replace(/\s*<div class="zs-aviso-reserva" id="zsAvisoReserva"[^>]*><\/div>/, '');
  h = h.replace(/(<main class="club-main"[^>]*>)/, (m) => m + '\n      <header class="zs-topbar" id="zsTopbar">' + E.shell.barraSuperiorHTML(null) + '</header>' +
    '\n      <div class="zs-aviso-reserva" id="zsAvisoReserva" aria-hidden="true"></div>');

  /* 4) Barra inferior del celular (fija; después del contenedor del panel). El Club ya no lleva botón flotante de WhatsApp. */
  h = h.replace(/\s*<!-- zs:flotantes -->[\s\S]*?<!-- \/zs:flotantes -->/, '');
  const flotantes = '\n  <!-- zs:flotantes -->\n  <nav class="zs-bottom" id="zsBottom" aria-label="Navegación principal">' + E.shell.barraInferiorHTML(activo) + '</nav>\n  <!-- /zs:flotantes -->';
  const cierre = /<\/main>\s*<\/div>/.exec(h);
  if (!cierre) throw new Error(nombre + ': no encuentro el cierre del panel');
  h = h.slice(0, cierre.index + cierre[0].length) + flotantes + h.slice(cierre.index + cierre[0].length);

  /* 5) Tarjeta de título (ya calculada arriba) */
  if (tarjeta) {
    tarjeta = iconosEnLinea(tarjeta, E.iconosSprite);
    if (nombre === 'club-dashboard.html') {
      h = h.replace(/\s*<script>\/\*zs-saludo\*\/[\s\S]*?<\/script>/, '');
      h = h.replace(/(<div id="inicioSaludo">)[\s\S]*?(<\/div>\s*<div id="resumeCard">)/, (m, a, b) => a + tarjeta + b);
      h = h.replace('<div id="resumeCard">', () => scriptSaludo() + '\n          <div id="resumeCard">');
    } else if (nombre === 'club-pdfs.html') {
      h = h.replace(/<div id="materiales">[\s\S]*?<div class="mt-vacio">/, () => '<div id="materiales">' + tarjeta + '<div class="mt-vacio">');
    } else {
      h = h.replace(/<div id="zsSeccion">(?:<header class="zs-seccion[^"]*"[\s\S]*?<\/header>)?<\/div>/, () => '<div id="zsSeccion">' + tarjeta + '</div>');
    }
  }
  return h;
}

function paginasDelPanel() {
  const dir = path.join(RAIZ, 'pages');
  return fs.readdirSync(dir).filter((f) => /^(club-[\w-]+|admin-club|verificar-correo)\.html$/.test(f)).map((f) => path.join(dir, f));
}

function main() {
  const solo = process.argv.includes('--check');
  let cambiadas = 0;
  for (const f of paginasDelPanel()) {
    const antes = fs.readFileSync(f, 'utf8');
    const despues = procesar(antes, f);
    if (antes !== despues) {
      cambiadas++;
      if (!solo) fs.writeFileSync(f, despues);
      console.log((solo ? 'desactualizada: ' : 'actualizada: ') + path.relative(RAIZ, f));
    }
  }
  console.log(cambiadas ? cambiadas + ' página(s) ' + (solo ? 'por actualizar' : 'actualizadas') : 'Todo al día.');
  if (solo && cambiadas) process.exitCode = 1;
}

module.exports = { procesar, extraerCfg, menuDeLaPagina, paginasDelPanel, VERSION_FUENTES, prepararEntorno };
if (require.main === module) main();
