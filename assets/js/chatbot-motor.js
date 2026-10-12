/* ============================================================ */
/* MOTOR DE LA GUÍA ZOORIGEN                                     */
/*                                                                */
/* No es inteligencia artificial: palabras clave + fichas de      */
/* animales con fuente + dudas del sitio + catálogo de cursos.    */
/* Este archivo NO toca la pantalla: recibe lo que escribe la     */
/* persona (o el botón que tocó) y devuelve DATOS:                */
/*   { tipo, partes:[texto con **negritas**], fuentes:[{nombre,   */
/*     url}], fuente, botones:[...], cursos:[...], oferta:{...},  */
/*     registrar:{texto,tipo}|null, animal, preferencia }         */
/* La pantalla (chatbot-landing.js) solo dibuja esos datos.       */
/* Se prueba en Node: tests/chatbot-motor.test.js                 */
/*                                                                */
/* Capas, en orden:                                               */
/*   0 datos personales (no se procesan ni se registran)          */
/*   1 charla: identidad, saludo, ¿cómo estás?, gracias, adiós     */
/*   2 fichas de animales (ZOO_FICHAS) por nombre/alias, con 1    */
/*     error tipográfico tolerado en nombres de 5+ letras         */
/*   3 dudas de membresía, pagos, certificados, cuenta (dudas.js) */
/*   4 cursos del catálogo real (ZOO_CATALOGO), con sinónimos     */
/*   5 "no sé": lo dice, ofrece caminos y pide registrar la       */
/*     pregunta para el equipo                                    */
/* OFERTA AL FINAL: toda respuesta informativa termina con 1 a 3  */
/* cursos reales relacionados (si el catálogo cargó).             */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./chatbot-dudas.js'));
  else root.ZOO_CHATBOT = factory(root.ZOO_CHATBOT_DUDAS || null);
})(typeof self !== 'undefined' ? self : this, function (DUDAS) {
  'use strict';

  var WHATSAPP = (DUDAS && DUDAS.WHATSAPP) || '5212361113237';
  var RUTA_PAGINAS = (DUDAS && DUDAS.SALTO_PAGINAS) || 'pages/';
  var MAX_ENTRADA = 200;
  var LOTE_ANIMALES = 8;

  /* ───────────────────────── utilidades ───────────────────────── */

  function normalizar(s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function tokensDe(n) { return n ? n.split(' ') : []; }
  function texto(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 600); }

  // Distancia de edición con transposición de letras vecinas ("leon" vs "loen" = 1).
  function distancia(a, b, tope) {
    if (a === b) return 0;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > (tope == null ? 2 : tope)) return (tope == null ? 2 : tope) + 1;
    var d = [], i, j, c;
    for (i = 0; i <= la; i++) { d[i] = [i]; }
    for (j = 0; j <= lb; j++) { d[0][j] = j; }
    for (i = 1; i <= la; i++) {
      for (j = 1; j <= lb; j++) {
        c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[la][lb];
  }

  function urlSegura(u) {
    var t = texto(u, 400);
    return /^https?:\/\/[^\s]+$/i.test(t) ? t : '';
  }

  function capitalizar(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

  var STOP = {};
  ('de la el los las un una unos unas y o en a al del por para con sin que es son se me mi mis tu tus su sus lo le les ' +
   'como cual cuales cuando donde quien quienes cuanto cuanta cuantos cuantas muy mas menos hay tiene tienen ser esta estas este esto ' +
   'eso ese esos esas estan estoy puede pueden puedo quiero quisiera necesito busco saber conocer informacion info sobre acerca algo ' +
   'favor hola gracias dime dame hablame cuentame explicame curso cursos clase clases tema temas ver ya si no pero tambien tan solo ' +
   'hacer algun alguna alguno unos todo todos toda todas otro otra otros otras ese esa soy eres es fue era va ' +
   'quieres puedes podria podrias pueda hablar buenas buenos dias tardes noches buen dura duracion durar dure tarda tardan horas tiempo cuantas').split(' ')
    .forEach(function (w) { STOP[w] = true; });

  // Palabras de las preguntas sobre un animal (no cuentan como tema de un curso).
  var PALABRAS_CAMPO = {};
  ('come comen comer comia alimenta alimentan alimentacion dieta comida habitat vive viven vivir habita habitan mide miden pesa pesan peso ' +
   'tamano crias cria hijos bebes gestacion reproduce reproducen peligro peligroso peligrosa extincion mascota mascotas tener tenerlo tenerla ' +
   'legal ilegal curioso curiosidad dato datos anos vida esperanza grande largo ataca muerde venenoso animal animales ejemplar ejemplares especie especies').split(' ')
    .forEach(function (w) { PALABRAS_CAMPO[w] = true; });

  // Palabras comunes del español que nunca deben tomarse como "animal mal escrito".
  var COMUNES = {};
  ('cierta ciertas cierto ciertos vendo vender vendes venden tengo tener tienen tiene viven vivir vives comer comes comen cuando cuanto ' +
   'cuantos cuales puede pueden puedes donde quien hacer hacen pasa sobre entre porque curso cursos clase clases nombre mundo lista listo ' +
   'quiero quiere quieres pueda puedo estan estar estoy estamos animal animales ejemplar ejemplares fauna silvestre planta plantas ' +
   'precio precios cuesta costo gratis prueba cuenta correo membresia pagar pagos planes mensual anual').split(' ')
    .forEach(function (w) { COMUNES[w] = true; });

  /* ───────────────────────── datos personales ───────────────────────── */

  var RE_CORREO = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  var RE_URL = /(https?:\/\/\S+|www\.\S+)/gi;
  var RE_TEL = /\+?\d[\d\s().-]{5,}\d/g;

  function digitos(s) { return String(s).replace(/\D/g, ''); }

  function hayDatosPersonales(crudo) {
    if (RE_CORREO.test(crudo)) return true;
    var m = String(crudo).match(RE_TEL);
    return !!(m && m.some(function (x) { return digitos(x).length >= 7; }));
  }

  // Texto que se manda al servidor para que el equipo lo revise: sin correos, teléfonos ni enlaces.
  function limpiarParaRegistro(crudo) {
    var t = String(crudo == null ? '' : crudo)
      .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, ' ')
      .replace(RE_URL, ' ')
      .replace(RE_TEL, function (x) { return digitos(x).length >= 7 ? ' ' : x; })
      .replace(/\s+/g, ' ').trim().slice(0, 120);
    return t.length >= 3 ? t : '';
  }

  /* ───────────────────────── charla ───────────────────────── */

  var SOCIAL = {
    identidad: /\b(quien eres|quien es usted|que eres|como te llamas|cual es tu nombre|con quien hablo|hablo con (un|una)|eres (un |una )?(robot|bot|humano|humana|persona|ia|inteligencia artificial|real|chatgpt|programa|maquina)|eres de verdad|quien te (creo|hizo))\b/,
    saludo: /(^|\b)(hola|holi|holis|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|saludos|que onda)\b|^que tal$/,
    estado: /(como estas|como esta usted|como te va|como andas|que tal estas|que tal tu|como te sientes)/,
    gracias: /(gracias|te agradezco|muy amable)/,
    adios: /(adios|hasta luego|hasta pronto|nos vemos|\bbye\b|\bchao\b|\bchau\b|me voy|que descanses)/,
    ayuda: /(\bayuda\b|ayudame|auxilio|que puedes hacer|que sabes hacer|que haces|para que sirves|como funcionas|\bmenu\b|\bopciones\b|en que me puedes ayudar)/,
    ok: /^(ok|okey|okay|vale|listo|perfecto|entendido|claro|sale|de acuerdo|esta bien|muy bien|genial|excelente)$/
  };
  var SOCIAL_QUITAR = Object.keys(SOCIAL).map(function (k) { return new RegExp(SOCIAL[k].source, 'g'); });

  function banderasSociales(n) {
    var f = {};
    Object.keys(SOCIAL).forEach(function (k) { f[k] = SOCIAL[k].test(n); });
    f.alguna = Object.keys(SOCIAL).some(function (k) { return f[k]; });
    return f;
  }

  // Palabras con contenido que quedan cuando se quitan los saludos y cortesías.
  function restoSinSocial(n) {
    var t = n;
    SOCIAL_QUITAR.forEach(function (re) { t = t.replace(re, ' '); });
    return tokensDe(t.replace(/\s+/g, ' ').trim()).filter(function (w) { return w.length >= 3 && !STOP[w]; });
  }

  function saludoSegunHora(n, ahora) {
    if (/(buenos dias|buen dia)/.test(n)) return '¡Buenos días!';
    if (/buenas tardes/.test(n)) return '¡Buenas tardes!';
    if (/buenas noches/.test(n)) return '¡Buenas noches!';
    var h = (ahora instanceof Date ? ahora : new Date()).getHours();
    return h < 12 ? '¡Hola, buenos días!' : (h < 19 ? '¡Hola, buenas tardes!' : '¡Hola, buenas noches!');
  }

  var TXT_IDENTIDAD = 'Soy la **Guía Zoorigen**, una guía virtual. **No soy una persona ni una inteligencia artificial**: respondo con botones, palabras clave, fichas de animales con su fuente y el catálogo de cursos. Si prefieres hablar con una persona, te paso con el equipo por WhatsApp.';
  var TXT_AYUDA = 'Puedo contarte datos de **animales** con su fuente, ayudarte a **buscar un curso**, explicarte cómo funciona la **prueba gratuita**, resolver dudas sobre la **membresía**, los pagos o los certificados, y pasarte con el equipo por WhatsApp.';

  /* ───────────────────────── intención sobre un animal ───────────────────────── */

  var CAMPOS = ['que_es', 'come', 'habitat', 'tamano', 'vida', 'crias', 'conservacion', 'peligro', 'curiosidad'];
  var ETIQUETAS = {
    que_es: 'Qué es', come: 'Qué come', habitat: 'Dónde vive', tamano: 'Tamaño', vida: 'Cuánto vive',
    crias: 'Crías', conservacion: 'Conservación', peligro: '¿Es peligroso?', curiosidad: 'Dato curioso'
  };
  var ENCABEZADOS = {
    que_es: 'Qué es', come: 'Alimentación', habitat: 'Hábitat', tamano: 'Tamaño', vida: 'Cuánto vive',
    crias: 'Crías y reproducción', conservacion: 'Estado de conservación', peligro: 'Peligro para las personas', curiosidad: 'Dato curioso'
  };

  // `re` = con un animal mencionado (o en conversación); `fuerte` = vale incluso sin nombrar el animal.
  var PATRONES = [
    { id: 'mascota',
      re: /\bmascotas?\b|\b(tener|tenerl[oa]s?|comprar|adoptar|criar|poseer)\b.*\b(en casa|legal|permitido)\b|\b(es legal|esta permitido|se puede|puedo|podria|podemos)\b.*\b(tener|tenerl[oa]s?|comprar|adoptar|criar|poseer)\b|\bes legal tenerl[oa]/,
      fuerte: /\bmascotas?\b|\b(tener|comprar|adoptar|criar|poseer)\b.*\b(animal|animales|fauna silvestre|animal silvestre|exotic[oa]s?)\b/ },
    { id: 'conservacion',
      re: /\ben peligro\b|peligro de extincion|extincion|extint[oa]|amenazad[oa]|\bnom ?-? ?059\b|\buicn\b|\biucn\b|lista roja|vulnerable|categoria de (riesgo|conservacion)|estado de conservacion|protegid[oa]|\bcites\b|conservacion|cuantos quedan|poblacion/,
      fuerte: /peligro de extincion|\buicn\b|\biucn\b|lista roja/ },
    { id: 'peligro',
      re: /\bpeligros[oa]s?\b|\bataca(n|r)?\b|\bmuerde(n)?\b|\bmorder\b|agresiv|venenos[oa]s?|envenen|mortal|letal|toxic[oa]|\bdana(r|n)?\b|danin[oa]|lastim|\bes seguro\b|peligro para (las |los )?(personas|humanos|el hombre|nosotros)|puede matar|\bataque/,
      fuerte: /\bes peligros[oa]\b|\bpuede atacar|\bmuerde\b|\bes venenos[oa]\b/ },
    { id: 'vida',
      re: /\bcuanto (vive|viven|tiempo vive|tiempo viven|dura)\b|esperanza de vida|longevidad|\banos? de vida|cuantos anos|\bvida (media|util)|\bedad (maxima|que alcanza)|\bvive(n)? .*\banos\b|\bcuanto tiempo\b|\banos\b/,
      fuerte: /\bcuanto (vive|viven|tiempo vive|tiempo viven)\b|esperanza de vida|longevidad|\bcuantos anos (vive|viven|puede vivir)\b/ },
    { id: 'tamano',
      re: /\bmide(n)?\b|\bpesa(n)?\b|\bpeso\b|\btamano\b|que tan (grande|largo|alto|pesado)|\bcuan grande\b|\blongitud\b|\baltura\b|\bmedidas?\b|\bgrande es\b|\bdimension/,
      fuerte: /\bcuanto (mide|miden|pesa|pesan)\b|que tan grande/ },
    { id: 'come',
      re: /\bcome(n)?\b|\bcomer\b|\bcomia(n)?\b|\balimenta(n)?\b|alimentacion|\bdieta\b|\bcomida\b|se nutre|\bpresas?\b|herbivor|carnivor|omnivor|insectivor|frugivor/,
      fuerte: /\bque (come|comen|comia)\b|\bde que se alimenta(n)?\b|\bse alimenta(n)?\b|\bdieta\b|\bque le gusta comer\b|\bcomo se alimenta/ },
    { id: 'habitat',
      re: /\bhabitat\b|\bdonde (vive|viven|habita|habitan|se encuentra|se encuentran|hay|esta|estan|se les encuentra|podemos encontrar|se puede encontrar)|distribucion|\bvive(n)? en\b|\bhabita(n)?\b|territorio|ecosistema|\ben que (pais|paises|lugar|lugares|zona|parte|region|estado|estados)\b|rango geografico/,
      fuerte: /\bdonde (vive|viven|habita|habitan|se encuentra|se encuentran)\b|\bhabitat\b|\ben que (paises|lugares|estados)\b/ },
    { id: 'crias',
      re: /\bcrias?\b|\bhijos?\b|\bbebes?\b|gestacion|embarazo|se reproduce(n)?|reproduccion|reproducir|apareamiento|camadas?|\bhuevos?\b|\bponen\b|\bnacen\b|\bnace\b|\bparto\b|\bcachorros?\b|\bcrian\b/,
      fuerte: /\bcuantas? crias|\bcuantos (hijos|bebes|cachorros)|gestacion|\bse reproduce(n)?\b/ },
    { id: 'curiosidad',
      re: /dato curioso|curiosidad(es)?|dato interesante|datos? (curiosos|interesantes|divertidos)|sabias que|algo interesante|algo curioso|cuentame algo|dime algo|dato divertido|\bdato\b/,
      fuerte: /dato curioso|datos? curiosos|curiosidad(es)?|dato interesante|dato divertido/ },
    { id: 'que_es',
      re: /\bque (es|son|era)\b|\bquien (es|son)\b|\bquienes son\b|\bhablame\b|\bcuentame\b|\bdime\b|\binformacion\b|\binfo\b|\bexplicame\b|\bdescripcion\b|\bdescribe\b|caracteristicas|\bque sabes\b|\bsabes de\b|\bconocer\b|\bsobre (el|la|los|las)\b/,
      fuerte: null }
  ];

  function detectarCampos(n, soloFuertes) {
    var hallados = [];
    PATRONES.forEach(function (p) {
      var re = soloFuertes ? p.fuerte : p.re;
      if (re && re.test(n)) hallados.push(p.id);
    });
    // "qué es" solo vale si no hay una pregunta más concreta ("qué es el hábitat del león").
    if (hallados.length > 1) hallados = hallados.filter(function (c) { return c !== 'que_es'; });
    return hallados.slice(0, 3);
  }

  var RE_QUIERE_CURSO = /\b(curso|cursos|clase|clases|capacitacion|capacitarme|capacitar|diplomado|taller|aprender|estudiar|inscribirme|inscribir|certificarme)\b/;
  var RE_LISTA_ANIMALES = /(que|cuales) animales|animales (disponibles|conoces|tienes|hay|puedes)|lista de animales|fichas? de animales|\bfichas\b|conocer (a )?un animal|\banimales?\b$/;

  /* ───────────────────────── búsqueda de cursos ───────────────────────── */

  function stem(t) { return t.length > 5 ? t.slice(0, 5) : t; }

  // Palabras de la gente → raíces (5 letras) que sí aparecen en los títulos de los cursos.
  var SINONIMOS = {
    abeja: ['apicu', 'poliniz', 'colme', 'miel'], colme: ['apicu', 'abeja', 'poliniz'], miel: ['apicu', 'abeja'],
    apicu: ['abeja', 'colme', 'poliniz'], poliniz: ['abeja', 'apicu'],
    serpi: ['ofidi', 'ponzo', 'venen', 'vibor'], vibor: ['serpi', 'ofidi', 'ponzo'], ofidi: ['serpi', 'ponzo'],
    venen: ['ponzo', 'toxic', 'serpi'], ponzo: ['venen', 'serpi', 'aracn', 'escor'], escor: ['alacr', 'ponzo', 'aracn'], alacr: ['escor', 'ponzo'],
    arana: ['aracn', 'taran'], taran: ['aracn', 'arana'], aracn: ['arana', 'taran'],
    tortu: ['marin', 'quelo'], quelo: ['tortu'],
    tibur: ['raya', 'elasm'], raya: ['tibur'],
    felin: ['jagua', 'puma', 'gato', 'tigre', 'mamif'], jagua: ['felin', 'mamif'], puma: ['felin', 'mamif'], leon: ['felin', 'mamif'], tigre: ['felin', 'mamif'],
    mamif: ['felin', 'fauna'], rapac: ['aves', 'ave'], aves: ['rapac', 'ornit'], ornit: ['aves'],
    murci: ['quiro', 'mamif'], quiro: ['murci'], roedo: ['murci', 'mamif'],
    camar: ['fotot', 'tramp'], tramp: ['fotot', 'camar'], fotot: ['camar', 'tramp'],
    uma: ['uma', 'unida', 'manej'], unida: ['uma'],
    rescat: ['rehab', 'fauna'], rehab: ['rescat'],
    ley: ['legis', 'norma', 'normat'], leyes: ['legis', 'norma', 'normat'], legis: ['ley', 'norma', 'normat'], norma: ['legis', 'normat', 'ley'], normat: ['legis', 'norma', 'ley'],
    permi: ['legis', 'normat', 'tramit'], tramit: ['legis', 'permi', 'normat'],
    perro: ['canin'], canin: ['perro'],
    veter: ['clini', 'medic'], clini: ['veter', 'medic'], medic: ['veter', 'clini'],
    insec: ['entom'], entom: ['insec'], marip: ['lepid', 'maripo'], repti: ['herpe'], herpe: ['repti']
  };

  function hayPalabra(haystack, raiz) {
    return (' ' + haystack).indexOf(' ' + raiz) !== -1;
  }

  function terminosPregunta(n) {
    var vistos = {}, salida = [];
    tokensDe(n).forEach(function (t) {
      if (t.length < 3 || STOP[t] || PALABRAS_CAMPO[t] || vistos[t]) return;
      vistos[t] = true;
      salida.push(t);
    });
    return salida;
  }

  // Expande raíces con sinónimos. peso: importancia de la raíz original.
  function expandir(raices, peso) {
    var mapa = {};
    raices.forEach(function (r) {
      if (!mapa[r] || mapa[r] < peso) mapa[r] = peso;
      (SINONIMOS[r] || []).forEach(function (s) { if (!mapa[s] || mapa[s] < peso * 0.7) mapa[s] = peso * 0.7; });
    });
    return Object.keys(mapa).map(function (r) { return { raiz: r, peso: mapa[r] }; });
  }

  function puntosCurso(c, pesos) {
    var p = 0;
    pesos.forEach(function (t) {
      if (hayPalabra(c._n.tit, t.raiz)) p += 3 * t.peso;
      else if (hayPalabra(c._n.area, t.raiz)) p += 2 * t.peso;
      else if (hayPalabra(c._n.desc, t.raiz)) p += 1 * t.peso;
    });
    return p;
  }

  function resumenCurso(c) {
    return { id: c.id, titulo: c.titulo, area: c.area, descripcion: c.descripcion, clases: c.clases, pronto: !!c.pronto, elegiblePrueba: c.elegiblePrueba !== false };
  }

  /* ───────────────────────── fichas: índice de nombres ───────────────────────── */

  function plurales(w) {
    var s = {};
    s[w] = true;
    if (/[aeiou]$/.test(w)) s[w + 's'] = true;
    else if (/z$/.test(w)) s[w.slice(0, -1) + 'ces'] = true;
    else { s[w + 'es'] = true; s[w + 's'] = true; }
    if (/ces$/.test(w)) s[w.slice(0, -3) + 'z'] = true;
    if (/es$/.test(w) && w.length > 4) { s[w.slice(0, -2)] = true; s[w.slice(0, -1)] = true; }
    else if (/s$/.test(w) && w.length > 3) s[w.slice(0, -1)] = true;
    return Object.keys(s);
  }
  function generos(w) {
    var s = {};
    s[w] = true;
    if (/o$/.test(w)) s[w.slice(0, -1) + 'a'] = true;
    else if (/a$/.test(w)) s[w.slice(0, -1) + 'o'] = true;
    else if (/(on|or)$/.test(w)) s[w + 'a'] = true;
    else if (/(ona|ora)$/.test(w)) s[w.slice(0, -1)] = true;
    return Object.keys(s);
  }
  function variantesPalabra(w) {
    var s = {};
    generos(w).forEach(function (g) { plurales(g).forEach(function (p) { s[p] = true; }); });
    return Object.keys(s);
  }
  // Variantes de una frase (cada palabra con su plural/género), con tope para no crecer sin control.
  function variantesFrase(tokens) {
    var combos = [[]];
    tokens.slice(0, 4).forEach(function (w, i) {
      var vs = i === 0 || i === tokens.length - 1 ? variantesPalabra(w) : [w];
      var sig = [];
      combos.forEach(function (c) { vs.forEach(function (v) { if (sig.length < 60) sig.push(c.concat([v])); }); });
      combos = sig;
    });
    return combos;
  }

  function contieneSecuencia(tokens, parte) {
    if (!parte.length || parte.length > tokens.length) return false;
    for (var i = 0; i + parte.length <= tokens.length; i++) {
      var ok = true;
      for (var j = 0; j < parte.length; j++) { if (tokens[i + j] !== parte[j]) { ok = false; break; } }
      if (ok) return true;
    }
    return false;
  }

  // Fuente principal y, si las hay, fuentes extra de un campo de la ficha.
  function fuentesDeCampo(d) {
    var lista = [{ nombre: texto(d.fuente, 200), url: urlSegura(d.url) }];
    if (Array.isArray(d.fuentes_extra)) {
      d.fuentes_extra.slice(0, 6).forEach(function (x) {
        if (!x || typeof x !== 'object' || !texto(x.fuente)) return;
        var f = { nombre: texto(x.fuente, 200), url: urlSegura(x.url) };
        if (texto(x.apoya)) f.apoya = texto(x.apoya, 160);
        lista.push(f);
      });
    }
    return lista;
  }

  function campoValido(d) {
    return !!(d && typeof d === 'object' && texto(d.texto) && texto(d.fuente));
  }

  function normalizarFicha(f) {
    if (!f || typeof f !== 'object') return null;
    var id = texto(f.id, 60);
    var nombre = texto(f.nombre, 80);
    if (!id || !nombre) return null;
    return {
      id: id,
      nombre: nombre,
      alias: Array.isArray(f.alias) ? f.alias.map(function (a) { return texto(a, 80); }).filter(Boolean) : [],
      cientifico: texto(f.cientifico, 120),
      grupo: texto(f.grupo, 120),
      claveCursos: Array.isArray(f.claveCursos) ? f.claveCursos.map(function (a) { return texto(a, 60); }).filter(Boolean) : [],
      datos: f.datos && typeof f.datos === 'object' ? f.datos : {}
    };
  }

  function camposDe(ficha) {
    return CAMPOS.filter(function (c) { return campoValido(ficha.datos[c]); });
  }

  /* ───────────────────────── el motor ───────────────────────── */

  function crear(opciones) {
    var o = opciones || {};
    var fichas = [];
    var indice = null;   // { porPrimera: {tok:[{ficha,tokens}]}, unicas:[{w,ficha}] }
    var catalogo = null; // cursos normalizados con _n
    var precios = o.precios && o.precios.mes > 0 && o.precios.ano > 0 ? { mes: Number(o.precios.mes), ano: Number(o.precios.ano) } : null;
    var whatsapp = texto(o.whatsapp, 20) || WHATSAPP;
    var rutaPaginas = o.rutaPaginas != null ? String(o.rutaPaginas) : RUTA_PAGINAS;
    var ahora = typeof o.ahora === 'function' ? o.ahora : function () { return new Date(); };
    var ctx = { animal: null };

    /* --- datos de entrada --- */
    function setFichas(lista) {
      fichas = (Array.isArray(lista) ? lista : []).map(normalizarFicha).filter(Boolean);
      construirIndice();
    }
    function setCatalogo(lista) {
      if (!Array.isArray(lista)) { catalogo = null; return; }
      catalogo = lista.filter(function (c) { return c && c.id && c.titulo; }).map(function (c) {
        var base = {
          id: String(c.id), titulo: texto(c.titulo, 160), area: texto(c.area, 80) || 'General',
          descripcion: texto(c.descripcion != null ? c.descripcion : c.desc, 400),
          clases: Number(c.clases) || 0, pronto: c.pronto === true || c.proximamente === true,
          elegiblePrueba: c.elegiblePrueba !== false
        };
        base._n = { tit: normalizar(base.titulo), area: normalizar(base.area), desc: normalizar(base.descripcion) };
        return base;
      });
      if (!catalogo.length) catalogo = null;
    }
    function setPrecios(p) {
      precios = p && p.mes > 0 && p.ano > 0 ? { mes: Number(p.mes), ano: Number(p.ano) } : null;
    }

    function construirIndice() {
      var porPrimera = {}, unicas = [], vistos = {}, todas = [], cabezas = {};
      fichas.forEach(function (f) {
        [f.nombre].concat(f.alias, [f.id]).forEach(function (nom) {
          var base = tokensDe(normalizar(nom));
          if (!base.length) return;
          variantesFrase(base).forEach(function (frase) {
            var clave = f.id + '|' + frase.join(' ');
            if (vistos[clave]) return;
            vistos[clave] = true;
            var entrada = { ficha: f, tokens: frase };
            todas.push(entrada);
            (porPrimera[frase[0]] = porPrimera[frase[0]] || []).push(entrada);
            if (frase.length === 1 && frase[0].length >= 5) unicas.push({ w: frase[0], ficha: f });
            if (frase.length > 1) { var cab = (cabezas[frase[0]] = cabezas[frase[0]] || {}); cab[f.id] = true; }
          });
        });
      });
      indice = { porPrimera: porPrimera, unicas: unicas, todas: todas, cabezas: cabezas };
    }

    function fichaPorId(id) {
      for (var i = 0; i < fichas.length; i++) if (fichas[i].id === id) return fichas[i];
      return null;
    }

    function disponibles() { return (catalogo || []).filter(function (c) { return !c.pronto; }); }
    function areas() {
      var cuenta = {}, orden = [];
      disponibles().forEach(function (c) {
        if (!(c.area in cuenta)) { cuenta[c.area] = 0; orden.push(c.area); }
        cuenta[c.area]++;
      });
      return orden.sort(function (a, b) { return cuenta[b] - cuenta[a] || a.localeCompare(b, 'es'); });
    }

    /* --- detección de animal --- */
    function detectarAnimal(n) {
      if (!indice || !fichas.length) return null;
      var T = tokensDe(n);
      var mejor = null;
      var otros = {};
      var i, k, e, lista, ok;
      for (i = 0; i < T.length; i++) {
        lista = indice.porPrimera[T[i]];
        if (!lista) continue;
        for (k = 0; k < lista.length; k++) {
          e = lista[k];
          ok = true;
          for (var j = 1; j < e.tokens.length; j++) { if (T[i + j] !== e.tokens[j]) { ok = false; break; } }
          if (!ok) continue;
          var cand = { ficha: e.ficha, inicio: i, largo: e.tokens.length, fuzzy: false };
          if (!mejor || cand.largo > mejor.largo || (cand.largo === mejor.largo && cand.inicio < mejor.inicio)) {
            if (mejor && mejor.ficha.id !== cand.ficha.id) otros[mejor.ficha.id] = mejor.ficha;
            mejor = cand;
          } else if (mejor.ficha.id !== cand.ficha.id) otros[cand.ficha.id] = cand.ficha;
        }
      }
      if (!mejor) {
        // Un error tipográfico (una letra de más, de menos, cambiada o dos intercambiadas) en nombres de 5+ letras.
        var mejorD = 2;
        for (i = 0; i < T.length; i++) {
          var t = T[i];
          if (t.length < 5 || COMUNES[t] || STOP[t] || PALABRAS_CAMPO[t]) continue;
          for (k = 0; k < indice.unicas.length; k++) {
            var u = indice.unicas[k];
            if (u.w.charAt(0) !== t.charAt(0)) continue;
            if (Math.abs(u.w.length - t.length) > 1) continue;
            var d = distancia(t, u.w, 1);
            if (d === 1 && d < mejorD) {
              mejorD = d;
              mejor = { ficha: u.ficha, inicio: i, largo: 1, fuzzy: true };
            } else if (d === 1 && mejor && mejor.ficha.id !== u.ficha.id && mejor.inicio !== i) {
              otros[u.ficha.id] = u.ficha;
            }
          }
          if (mejor) break;
        }
      }
      if (!mejor) {
        // Solo la primera palabra de un nombre compuesto ("lobo", "zorro", "oso"): no se adivina cuál ficha es.
        for (i = 0; i < T.length; i++) {
          var cab = indice.cabezas[T[i]];
          if (!cab || T[i].length < 4 || STOP[T[i]] || COMUNES[T[i]] || PALABRAS_CAMPO[T[i]]) continue;
          var posibles = fichas.filter(function (f) { return cab[f.id]; });
          if (posibles.length) {
            return { ficha: posibles[0], inicio: i, largo: 1, fuzzy: false, otros: [], tokens: T, ambiguas: posibles, parcial: true };
          }
        }
        return null;
      }
      delete otros[mejor.ficha.id];
      mejor.otros = Object.keys(otros).map(function (id) { return otros[id]; });
      mejor.tokens = T;
      mejor.ambiguas = [];
      if (!mejor.fuzzy) {
        // Si lo escrito es solo una parte del nombre de otra ficha ("lobo" y "lobo mexicano"), hay que preguntar cuál.
        var P = T.slice(mejor.inicio, mejor.inicio + mejor.largo);
        var set = {};
        set[mejor.ficha.id] = true;
        indice.todas.forEach(function (e) {
          if (set[e.ficha.id] || !contieneSecuencia(e.tokens, P)) return;
          set[e.ficha.id] = true;
        });
        if (Object.keys(set).length > 1) {
          mejor.ambiguas = fichas.filter(function (f) { return set[f.id]; });
        }
      }
      return mejor;
    }

    function restoTrasAnimal(hallazgo) {
      var T = hallazgo.tokens.slice();
      T.splice(hallazgo.inicio, hallazgo.largo);
      return T.filter(function (w) { return w.length >= 2 && !STOP[w]; });
    }

    /* --- construcción de respuestas --- */
    function R(tipo, partes, extra) {
      var r = {
        tipo: tipo, partes: partes || [], fuentes: [], fuente: null, botones: [], cursos: null,
        oferta: null, registrar: null, animal: null, aviso: null, preferencia: null
      };
      Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
      r.fuente = r.fuentes.length ? r.fuentes[0] : null;
      return r;
    }
    function quitarRepetidas(fs) {
      var vistos = {}, salida = [];
      fs.forEach(function (f) {
        var k = f.nombre + '|' + f.url;
        if (!vistos[k]) { vistos[k] = true; salida.push(f); }
      });
      return salida;
    }

    function enlaceWhatsApp() {
      return 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent('Hola, vengo del sitio de Zoorigen y quisiera información de los cursos.');
    }

    function botonesMenu() {
      var b = [];
      if (fichas.length) b.push({ t: 'Conocer un animal', accion: { tipo: 'animales' } });
      b.push({ t: 'Buscar un curso', accion: { tipo: 'cursos' } });
      b.push({ t: 'Cómo funciona la prueba gratuita', accion: { tipo: 'duda', id: 'prueba' } });
      b.push({ t: 'Conocer la membresía', accion: { tipo: 'duda', id: 'incluye' } });
      b.push({ t: 'Resolver una duda', accion: { tipo: 'dudas' } });
      b.push({ t: 'Hablar con un asesor', accion: { tipo: 'asesor' } });
      return b;
    }
    var BTN_MENU = { t: 'Menú principal', accion: { tipo: 'menu' } };
    var BTN_ASESOR = { t: 'Hablar con un asesor', accion: { tipo: 'asesor' } };

    function menu(texto1) {
      return R('menu', [texto1 || '¿Qué más te gustaría hacer?'], { botones: botonesMenu() });
    }

    function inicio() {
      return R('inicio', [
        '¡Hola! Soy la **Guía Zoorigen**, una guía virtual. No soy una persona ni una inteligencia artificial: respondo con botones y palabras clave.',
        'Puedo contarte datos de animales con su fuente, ayudarte a encontrar un curso y resolver dudas de la membresía. ¿Qué te gustaría hacer?'
      ], { botones: botonesMenu() });
    }

    /* --- oferta al final --- */
    // spec: { claves:[], grupo:'', terminos:[], max, tema, nombre }
    function crearOferta(spec) {
      if (!catalogo) return null;
      var disp = disponibles();
      if (!disp.length) return null;
      var max = spec.max || 3;
      var pesos = [];
      var raicesBase = [];
      (spec.claves || []).forEach(function (cl) { raicesBase = raicesBase.concat(tokensDe(normalizar(cl)).filter(function (w) { return w.length >= 3 && !STOP[w]; }).map(stem)); });
      pesos = pesos.concat(expandir(raicesBase, 1.5));
      var gr = tokensDe(normalizar(spec.grupo || '')).filter(function (w) { return w.length >= 4 && !STOP[w]; }).map(stem);
      pesos = pesos.concat(expandir(gr, 1));
      var qs = (spec.terminos || []).map(function (t) { return stem(normalizar(t)); }).filter(Boolean);
      pesos = pesos.concat(expandir(qs, 1));

      var ranking = [];
      disp.forEach(function (c, i) {
        var p = puntosCurso(c, pesos);
        // la clave completa dentro del título pesa más que sus palabras sueltas
        (spec.claves || []).forEach(function (cl) {
          var frase = normalizar(cl);
          if (!frase) return;
          if (c._n.tit.indexOf(frase) !== -1) p += 6;
          else if (c._n.area.indexOf(frase) !== -1) p += 4;
          else if (c._n.desc.indexOf(frase) !== -1) p += 2;
        });
        if (p >= 2) ranking.push({ c: c, p: p, i: i });
      });
      ranking.sort(function (a, b) { return b.p - a.p || a.i - b.i; });
      var elegidos = ranking.slice(0, max).map(function (r) { return r.c; });
      var tema = spec.tema || '';
      var origen = elegidos.length ? 'relacionados' : 'general';
      if (!elegidos.length) {
        // Sin relación clara: se ofrecen los primeros del catálogo y el tema es su propia área.
        elegidos = disp.slice(0, Math.min(max, 2));
        tema = elegidos[0].area.toLowerCase();
      } else if (!tema) {
        tema = elegidos[0].area.toLowerCase();
      }
      var plural = elegidos.length > 1;
      return {
        tema: tema,
        origen: origen,
        frase: plural
          ? 'Estos cursos te darán más información sobre ' + tema + ':'
          : 'Este curso te dará más información sobre ' + tema + ':',
        cursos: elegidos.map(resumenCurso)
      };
    }

    // Une las partes comunes de toda respuesta informativa: oferta y botones de salida.
    function conOferta(r, spec) {
      r.oferta = crearOferta(spec || {});
      return r;
    }

    function temaDePalabras(crudo, n) {
      var originales = {};
      String(crudo).toLowerCase().split(/[^a-záéíóúüñ0-9]+/).forEach(function (w) { if (w) originales[normalizar(w)] = w; });
      var t = terminosPregunta(n).slice(0, 2).map(function (x) { return originales[x] || x; });
      return t.join(' y ');
    }

    /* --- fichas --- */
    function textoGrupo(ficha) {
      var partes = ficha.grupo.split('·').map(function (s) { return s.trim(); }).filter(Boolean);
      return partes.length ? partes[partes.length - 1].toLowerCase() : '';
    }

    function botonesCamposRestantes(ficha, excluir) {
      var ex = excluir || [];
      var b = camposDe(ficha).filter(function (c) { return ex.indexOf(c) === -1; })
        .map(function (c) { return { t: ETIQUETAS[c], accion: { tipo: 'animal', id: ficha.id, campo: c } }; });
      return b;
    }

    function botonesSalidaAnimal() {
      var b = [];
      if (fichas.length > 1) b.push({ t: 'Otro animal', accion: { tipo: 'animales' } });
      b.push({ t: 'Buscar un curso', accion: { tipo: 'cursos' } });
      b.push(BTN_MENU);
      return b;
    }

    function especOferta(ficha) {
      return { claves: ficha.claveCursos, grupo: ficha.grupo, terminos: [ficha.nombre], tema: textoGrupo(ficha) || ficha.nombre.toLowerCase(), max: 3 };
    }

    function respuestaFicha(ficha, campos, crudo, extras) {
      ctx.animal = ficha.id;
      var presentes = camposDe(ficha);
      var pedidos = campos && campos.length ? campos : ['que_es'];
      var mostrados = pedidos.filter(function (c) { return presentes.indexOf(c) !== -1; });
      var faltan = pedidos.filter(function (c) { return presentes.indexOf(c) === -1; });
      var otrosAnimales = (extras && extras.otros) || [];
      var botonesOtros = otrosAnimales.slice(0, 2).map(function (f) { return { t: f.nombre, accion: { tipo: 'animal', id: f.id, campo: 'que_es' } }; });

      if (!mostrados.length) {
        var disponiblesTxt = presentes.length;
        var etq = faltan.length === 1 && pedidos[0] !== 'que_es' ? ETIQUETAS[faltan[0]].toLowerCase() : '';
        var partes = [];
        if (pedidos[0] === 'que_es' && pedidos.length === 1) {
          partes.push(disponiblesTxt
            ? 'De **' + ficha.nombre + '** no tengo una descripción general verificada, pero sí otros datos con su fuente.'
            : 'De **' + ficha.nombre + '** todavía no tengo datos verificados con fuente, así que prefiero no decirte nada que no pueda respaldar.');
        } else {
          partes.push(disponiblesTxt
            ? 'De **' + ficha.nombre + '** aún no tengo verificado el dato que preguntas' + (etq ? ' («' + etq + '»)' : '') + '. Esto sí te lo puedo contar, con su fuente:'
            : 'De **' + ficha.nombre + '** todavía no tengo datos verificados con fuente, así que prefiero no decirte nada que no pueda respaldar.');
        }
        var r0 = R('ficha-sin-dato', partes, {
          animal: ficha.id,
          botones: botonesCamposRestantes(ficha, []).concat(botonesOtros, botonesSalidaAnimal()),
          registrar: registroDe(crudo, 'animal')
        });
        return conOferta(r0, especOferta(ficha));
      }

      var partesR = [];
      var fuentes = [];
      mostrados.forEach(function (c) {
        var d = ficha.datos[c];
        if (c === 'que_es') {
          partesR.push('**' + ficha.nombre + '**' + (ficha.cientifico ? ' (' + ficha.cientifico + ')' : '') + (ficha.grupo ? ' · ' + ficha.grupo : ''));
        } else {
          partesR.push('**' + ENCABEZADOS[c] + ' · ' + ficha.nombre + '**');
        }
        partesR.push(texto(d.texto, 700));
        fuentesDeCampo(d).forEach(function (fu) { fuentes.push(fu); });
      });
      if (faltan.length) {
        partesR.push('De ' + ficha.nombre + ' aún no tengo verificado: ' + faltan.map(function (c) { return ETIQUETAS[c].toLowerCase(); }).join(', ') + '.');
      }
      var botones = botonesCamposRestantes(ficha, mostrados).concat(botonesOtros, botonesSalidaAnimal());
      var r = R('ficha', partesR, {
        animal: ficha.id, campos: mostrados, fuentes: quitarRepetidas(fuentes), botones: botones,
        registrar: faltan.length ? registroDe(crudo, 'animal') : null
      });
      r.fuente = r.fuentes[0] || null;
      return conOferta(r, especOferta(ficha));
    }

    function respuestaMascota(ficha, crudo) {
      var partes = [
        '**Tener fauna silvestre no es como tener un perro o un gato.** La Ley General de Vida Silvestre (LGVS) trata la legal procedencia, el traslado y el registro de los ejemplares (artículos 50 a 54, entre otros), y quien tiene un ejemplar debe poder comprobar de dónde viene.',
        'Además, el Código Penal Federal (artículo 420) sanciona la posesión ilícita de ejemplares de especies endémicas, amenazadas, en peligro de extinción o sujetas a protección especial.',
        'Qué trámite o autorización corresponde depende de la especie y de su origen; eso no lo puedo decidir por ti. Consulta la ley vigente y confírmalo con la delegación de SEMARNAT de tu estado.'
      ];
      var fuentes = [{ nombre: 'Ley General de Vida Silvestre, Cámara de Diputados', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGVS.pdf' }];
      var botones = [];
      var spec = { claves: ['legislacion', 'normatividad'], terminos: ['legislacion', 'normatividad', 'permisos', 'vida silvestre'], tema: 'legislación de vida silvestre', max: 3 };
      if (ficha && campoValido(ficha.datos.conservacion)) {
        partes.splice(2, 0, 'Sobre **' + ficha.nombre + '**: ' + texto(ficha.datos.conservacion.texto, 500));
        fuentesDeCampo(ficha.datos.conservacion).forEach(function (fu) { fuentes.push(fu); });
        spec.claves = spec.claves.concat(ficha.claveCursos);
        ctx.animal = ficha.id;
      }
      botones.push({ t: 'Ver el texto de la ley', href: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGVS.pdf' });
      botones.push({ t: '¿Qué incluyen las herramientas legales?', accion: { tipo: 'duda', id: 'herramientas' } });
      if (ficha) botones.push({ t: 'Más de ' + ficha.nombre, accion: { tipo: 'animal', id: ficha.id, campo: 'que_es' } });
      botones.push(BTN_ASESOR, BTN_MENU);
      var r = R('mascota', partes, {
        animal: ficha ? ficha.id : null, fuentes: quitarRepetidas(fuentes), botones: botones,
        aviso: 'Información general y orientativa; no sustituye la asesoría de un especialista.'
      });
      return conOferta(r, spec);
    }

    function candidatoAnimal(crudo) {
      var toks = String(crudo).toLowerCase().split(/[^a-záéíóúüñ0-9]+/).filter(Boolean);
      var ART = { el: 1, la: 1, los: 1, las: 1, un: 1, una: 1, unos: 1, unas: 1, del: 1 };
      var ultimo = -1;
      toks.forEach(function (t, i) { if (ART[t]) ultimo = i; });
      var tras = (ultimo >= 0 ? toks.slice(ultimo + 1) : toks).filter(function (t) {
        var n = normalizar(t);
        return n.length >= 3 && !STOP[n] && !PALABRAS_CAMPO[n];
      });
      return tras.slice(0, 2).join(' ');
    }

    function animalesBotones() {
      return fichas.slice(0, LOTE_ANIMALES).map(function (f) { return { t: f.nombre, accion: { tipo: 'animal', id: f.id, campo: 'que_es' } }; });
    }

    function respuestaAnimalDesconocido(crudo, n, campo) {
      var cand = candidatoAnimal(crudo);
      var partes = [cand
        ? 'Todavía no tengo la ficha de «' + cand + '», y prefiero no inventarte datos.'
        : 'Todavía no tengo esa ficha, y prefiero no inventarte datos.'];
      var botones = [];
      if (fichas.length) {
        partes.push('Estos animales sí los tengo con datos verificados y su fuente:');
        botones = animalesBotones();
      } else {
        partes.push('Por ahora las fichas de animales están en preparación.');
      }
      botones.push({ t: 'Buscar un curso', accion: { tipo: 'cursos' } }, BTN_ASESOR);
      var tema = cand || temaDePalabras(crudo, n);
      var r = R('animal-desconocido', partes, { botones: botones, registrar: registroDe(crudo, 'animal') });
      return conOferta(r, { terminos: terminosPregunta(n), tema: tema, max: 3 });
    }

    function respuestaAmbigua(ambiguas, campo) {
      return R('animal-ambiguo', [ambiguas.length > 1 ? 'Tengo más de una ficha que puede ser la que buscas. ¿Cuál te interesa?' : 'Solo tengo una ficha con ese nombre completo. ¿Es esta la que buscas?'], {
        botones: ambiguas.map(function (f) { return { t: f.nombre, accion: { tipo: 'animal', id: f.id, campo: campo || 'que_es' } }; }).concat([BTN_MENU])
      });
    }

    function pedirAnimal(campo) {
      var partes = ['¿De qué animal te gustaría saberlo?'];
      var botones = [];
      if (fichas.length) {
        partes.push('Escribe su nombre o elige uno de los que tengo con datos verificados:');
        botones = animalesBotones();
      } else {
        partes.push('Por ahora las fichas de animales están en preparación; mientras tanto puedo ayudarte con cursos y dudas.');
      }
      botones.push(BTN_MENU);
      return R('pedir-animal', partes, { botones: botones });
    }

    function listaAnimales() {
      if (!fichas.length) {
        return R('animales', ['Por ahora las fichas de animales están en preparación. Cuando estén listas podrás preguntarme qué come, dónde vive o cómo es cada uno, siempre con su fuente.'],
          { botones: [{ t: 'Buscar un curso', accion: { tipo: 'cursos' } }, BTN_MENU] });
      }
      return R('animales', ['Elige un animal o escribe su nombre. Cada dato que te doy trae su fuente:'],
        { botones: animalesBotones().concat([BTN_MENU]) });
    }

    /* --- dudas --- */
    function botonesDudaComunes(extra) {
      return (extra || []).concat([{ t: 'Otra duda', accion: { tipo: 'dudas' } }, BTN_ASESOR, BTN_MENU]);
    }

    function respuestaDuda(d, crudo, n) {
      var partes = d.texto({ precios: precios }).slice();
      var extra = (d.botones || []).map(function (b) {
        var x = { t: b.t };
        if (b.accion) x.accion = b.accion;
        if (b.wa) x.wa = true;
        if (b.href) x.href = /^https?:/i.test(b.href) ? b.href : rutaPaginas.replace(/pages\/$/, '') + b.href;
        return x;
      });
      var fuentes = (d.fuentes || []).map(function (f) { return { nombre: f.nombre, url: f.url }; });
      var r = R('duda', partes, { botones: botonesDudaComunes(extra), fuentes: fuentes, duda: d.id });
      var spec = { terminos: terminosPregunta(n), max: 2 };
      if (d.tema === 'legislacion') { spec.claves = ['legislacion', 'normatividad', 'permisos']; spec.tema = 'legislación de vida silvestre'; }
      if (d.id === 'herramientas') { spec.claves = ['clinica', 'veterinaria']; spec.tema = 'medicina de fauna silvestre'; }
      return conOferta(r, spec);
    }

    function menuDudas() {
      var temas = (DUDAS && DUDAS.TEMAS) || [];
      return R('dudas', ['Claro. ¿Sobre qué tema es tu duda?'], {
        botones: temas.map(function (t) { return { t: t.titulo, accion: { tipo: 'tema', id: t.id } }; }).concat([BTN_MENU])
      });
    }
    function respuestaTema(id) {
      var temas = (DUDAS && DUDAS.TEMAS) || [];
      var tema = temas.filter(function (t) { return t.id === id; })[0];
      if (!tema) return menuDudas();
      var porId = (DUDAS && DUDAS.PORID) || {};
      return R('tema', ['Estas son las dudas más frecuentes de **' + tema.titulo.toLowerCase() + '**:'], {
        botones: tema.preguntas.filter(function (p) { return porId[p]; })
          .map(function (p) { return { t: porId[p].boton, accion: { tipo: 'duda', id: p } }; })
          .concat([{ t: 'Otro tema', accion: { tipo: 'dudas' } }])
      });
    }
    function buscarDuda(n, quiereCurso) {
      var lista = (DUDAS && DUDAS.LISTA) || [];
      for (var i = 0; i < lista.length; i++) {
        var d = lista[i];
        if (d.debil && quiereCurso) continue;
        if (d.patron.test(n)) return d;
      }
      return null;
    }

    /* --- cursos --- */
    function respuestaSinCatalogo(crudo) {
      return R('sin-catalogo', ['Ahora mismo no pude cargar el catálogo de cursos. Revisa tu conexión e inténtalo otra vez, o escríbele al equipo.'], {
        botones: [{ t: 'Intentar de nuevo', accion: { tipo: 'texto', texto: texto(crudo, 120) || '' } }, { t: 'Escribir por WhatsApp', wa: true }]
      });
    }

    function botonesAreas() {
      return areas().slice(0, 10).map(function (a) { return { t: a, accion: { tipo: 'area', area: a } }; });
    }

    function respuestaAreas() {
      if (!catalogo) return respuestaSinCatalogo('');
      var b = botonesAreas();
      if ((catalogo || []).some(function (c) { return c.pronto; })) b.push({ t: 'Ver próximos cursos', accion: { tipo: 'proximos' } });
      b.push(BTN_MENU);
      return R('areas', ['¡Genial! ¿De qué área te interesa aprender?', 'También puedes escribir una palabra abajo, por ejemplo «serpientes» o «apicultura».'], { botones: b });
    }

    function respuestaArea(area) {
      if (!catalogo) return respuestaSinCatalogo('');
      var lista = disponibles().filter(function (c) { return c.area === area; });
      if (!lista.length) return respuestaAreas();
      return R('cursos', ['Estos cursos de ' + area + ' te pueden interesar:'], {
        cursos: lista.map(resumenCurso),
        botones: [{ t: 'Otra área', accion: { tipo: 'cursos' } }, BTN_MENU]
      });
    }

    function respuestaProximos() {
      if (!catalogo) return respuestaSinCatalogo('');
      var lista = catalogo.filter(function (c) { return c.pronto; });
      if (!lista.length) {
        return R('cursos', ['Por ahora no hay cursos anunciados como próximos. Mientras tanto, puedes ver los que ya están disponibles.'],
          { botones: [{ t: 'Buscar un curso', accion: { tipo: 'cursos' } }, BTN_MENU] });
      }
      return R('cursos', ['Estos cursos llegan muy pronto:'], {
        cursos: lista.map(resumenCurso), botones: [{ t: 'Buscar un curso', accion: { tipo: 'cursos' } }, BTN_MENU]
      });
    }

    function buscarCursosTexto(crudo, n, extraRaices, soloTituloOArea) {
      var q = terminosPregunta(n).map(stem);
      var raices = (extraRaices || []).map(stem);
      var pesos = expandir(q, 1).concat(expandir(raices, 0.8));
      var res = [];
      if (pesos.length) {
        disponibles().forEach(function (c, i) {
          var p = puntosCurso(c, pesos);
          if (soloTituloOArea) {
            var enTitulo = pesos.some(function (t) { return hayPalabra(c._n.tit, t.raiz) || hayPalabra(c._n.area, t.raiz); });
            if (!enTitulo) return;
          }
          if (p > 0) res.push({ c: c, p: p, i: i });
        });
        res.sort(function (a, b) { return b.p - a.p || a.i - b.i; });
      }
      return res.map(function (r) { return r.c; });
    }

    function respuestaBusqueda(crudo, n, extraRaices, soloTituloOArea) {
      if (!catalogo) return respuestaSinCatalogo(crudo);
      var lista = buscarCursosTexto(crudo, n, extraRaices, soloTituloOArea);
      if (!lista.length) {
        var b = botonesAreas();
        b.push(BTN_ASESOR);
        return R('cursos-vacio', ['No encontré cursos con «' + texto(crudo, 60) + '». Prueba con otra palabra o elige un área:'], { botones: b, registrar: registroDe(crudo, 'otro') });
      }
      return R('cursos', [lista.length === 1 ? 'Encontré 1 curso para «' + texto(crudo, 60) + '»:' : 'Encontré ' + lista.length + ' cursos para «' + texto(crudo, 60) + '»:'], {
        cursos: lista.map(resumenCurso),
        botones: [{ t: 'Elegir por área', accion: { tipo: 'cursos' } }, BTN_MENU]
      });
    }

    function respuestaCurso(id) {
      var c = (catalogo || []).filter(function (x) { return x.id === id; })[0];
      if (!c) return R('curso-no-encontrado', ['Ya no encuentro ese curso en el catálogo. ¿Quieres ver otros?'], { botones: [{ t: 'Buscar un curso', accion: { tipo: 'cursos' } }, BTN_MENU] });
      if (c.pronto) {
        return R('curso-info', ['**' + c.titulo + '** llega próximamente. Todavía no se puede tomar.'], {
          botones: [{ t: 'Buscar un curso', accion: { tipo: 'cursos' } }, BTN_MENU], curso: resumenCurso(c)
        });
      }
      if (c.elegiblePrueba === false) {
        // El servidor dice que este curso no se puede elegir como prueba gratuita: no se hace la pregunta de la prueba.
        return R('curso-info', [
          '**' + c.titulo + '** no está disponible como prueba gratuita.',
          'Puedes ver de qué trata en la sección de cursos de la portada. Con la membresía los cursos se van abriendo poco a poco.'
        ], {
          curso: resumenCurso(c),
          botones: [
            { t: 'Ver los cursos en la portada', href: '#cursos', main: true },
            { t: 'Conocer la membresía', accion: { tipo: 'duda', id: 'incluye' } },
            { t: 'Elegir otro curso', accion: { tipo: 'cursos' } }
          ]
        });
      }
      return R('confirmar-curso', [
        'Elegiste **' + c.titulo + '**.',
        '¿Lo quieres como tu prueba gratuita? Si aceptas, te llevo a crear tu cuenta gratis y ahí, ya dentro, tú confirmas el curso. Si ya tienes cuenta, solo inicias sesión.'
      ], {
        curso: resumenCurso(c),
        botones: [
          { t: 'Aceptar', main: true, accion: { tipo: 'aceptar', id: c.id } },
          { t: 'Rechazar', accion: { tipo: 'rechazar', id: c.id } }
        ]
      });
    }

    function respuestaAceptar(id) {
      var c = (catalogo || []).filter(function (x) { return x.id === id; })[0];
      if (!c || c.pronto || c.elegiblePrueba === false) return respuestaCurso(id);
      var q = '?curso=' + encodeURIComponent(c.id);
      return R('curso-aceptado', [
        'Perfecto. Guardé tu preferencia: **' + c.titulo + '**.',
        'Al entrar a tu cuenta te lo mostraré destacado como tu posible prueba gratuita; la elección final la confirmas tú dentro de tu panel.'
      ], {
        curso: resumenCurso(c),
        preferencia: { id: c.id, titulo: c.titulo },
        botones: [
          { t: 'Crear mi cuenta', main: true, href: rutaPaginas + 'club-registro.html' + q },
          { t: 'Ya tengo cuenta', href: rutaPaginas + 'club-login.html' + q },
          { t: 'Seguir viendo', accion: { tipo: 'menu' } }
        ]
      });
    }

    function respuestaRechazar() {
      return R('curso-rechazado', ['Sin problema, no te llevo a ningún lado. ¿Quieres ver otro curso o volver al menú?'], {
        botones: [{ t: 'Elegir por área', accion: { tipo: 'cursos' } }, BTN_MENU]
      });
    }

    function respuestaAsesor() {
      return R('asesor', ['Con gusto. Una persona del equipo te atiende por WhatsApp; toca el botón y se abre la conversación.'], {
        botones: [{ t: 'Abrir WhatsApp', wa: true, main: true }, BTN_MENU]
      });
    }

    /* --- charla y "no sé" --- */
    function respuestaSocial(n, f) {
      var partes = [];
      if (f.saludo) partes.push(saludoSegunHora(n, ahora()));
      if (f.estado) partes.push('Muy bien, gracias por preguntar. Soy una guía virtual y estoy lista para ayudarte.');
      if (f.identidad) partes.push(TXT_IDENTIDAD);
      if (f.gracias) partes.push('¡Con gusto! Me alegra poder ayudarte.');
      if (f.adios) partes.push('¡Hasta pronto! Aquí estaré cuando me necesites.');
      if (f.ayuda) partes.push(TXT_AYUDA);
      if (f.ok && !partes.length) partes.push('¡Perfecto!');
      if (!f.adios) partes.push('¿En qué te puedo ayudar?');
      return R('charla', partes, { botones: f.adios ? [BTN_MENU] : botonesMenu() });
    }

    function registroDe(crudo, tipo) {
      var t = limpiarParaRegistro(crudo);
      return t ? { texto: t, tipo: tipo === 'animal' ? 'animal' : 'otro' } : null;
    }

    function respuestaNoSe(crudo, n, tipoRegistro) {
      var partes = ['Todavía no tengo una respuesta para eso, y prefiero no inventarte nada.',
        'Guardé tu pregunta, sin datos personales, para que el equipo la revise. Mientras tanto, puedo ayudarte con esto:'];
      var botones = [];
      if (fichas.length) botones.push({ t: 'Conocer un animal', accion: { tipo: 'animales' } });
      if (catalogo) botones = botones.concat(botonesAreas().slice(0, 4));
      else botones.push({ t: 'Buscar un curso', accion: { tipo: 'cursos' } });
      botones.push({ t: 'Resolver una duda', accion: { tipo: 'dudas' } }, BTN_ASESOR);
      var r = R('no-se', partes, { botones: botones, registrar: registroDe(crudo, tipoRegistro) });
      return conOferta(r, { terminos: terminosPregunta(n), max: 3, tema: temaDePalabras(crudo, n) });
    }

    function respuestaPrivacidad() {
      return R('privacidad', [
        'Por tu seguridad, **no escribas datos personales** aquí (correo, teléfono, domicilio). Esta guía no los necesita.',
        'Si quieres que una persona del equipo te contacte, usa el botón de WhatsApp.'
      ], { botones: [{ t: 'Hablar con un asesor', accion: { tipo: 'asesor' } }, BTN_MENU] });
    }

    /* --- entrada de texto --- */
    function pipelineTexto(crudo, n, banderas) {
      var quiereCurso = RE_QUIERE_CURSO.test(n);

      // 1) "¿Quién eres?" antes que nada
      if (SOCIAL.identidad.test(n)) return respuestaSocial(n, { identidad: true, saludo: banderas.saludo, estado: banderas.estado, gracias: false, adios: false, ayuda: false, ok: false });

      // 2) Fichas de animales
      var hallazgo = detectarAnimal(n);
      var campos = detectarCampos(n, false);
      var hayCampoConcreto = campos.some(function (c) { return c !== 'que_es'; });
      var sinMascota = campos.filter(function (c) { return c !== 'mascota'; });
      var pideMascota = campos.indexOf('mascota') !== -1;

      if (hallazgo) {
        var f = hallazgo.ficha;
        if (pideMascota) return respuestaMascota(hallazgo.ambiguas.length ? null : f, crudo);
        if (hallazgo.ambiguas.length && !(quiereCurso && !hayCampoConcreto)) return respuestaAmbigua(hallazgo.ambiguas, sinMascota[0] === 'que_es' ? 'que_es' : (sinMascota[0] || 'que_es'));
        if (quiereCurso && !hayCampoConcreto) {
          return respuestaBusqueda(crudo, n, f.claveCursos.concat([f.nombre]));
        }
        if (sinMascota.length) return respuestaFicha(f, sinMascota, crudo, hallazgo);
        var resto = restoTrasAnimal(hallazgo);
        if (!resto.length) return respuestaFicha(f, ['que_es'], crudo, hallazgo);
        var dd = buscarDuda(n, quiereCurso);
        if (dd) return respuestaDuda(dd, crudo, n);
        if (quiereCurso) return respuestaBusqueda(crudo, n, f.claveCursos.concat([f.nombre]));
        return respuestaFicha(f, ['que_es'], crudo, hallazgo);
      }

      // 2b) Sin animal nombrado
      if (pideMascota && !quiereCurso) {
        var fm = ctx.animal && tokensDe(n).length <= 8 ? fichaPorId(ctx.animal) : null;
        if (fm || PATRONES[0].fuerte.test(n)) return respuestaMascota(fm, crudo);
      }
      var fuertes = detectarCampos(n, true).filter(function (c) { return c !== 'mascota'; });
      if (fuertes.length && !quiereCurso) {
        // ¿Mencionó un animal que no tengo? (palabra después de un artículo). Si no nombró ninguno,
        // se entiende que sigue hablando del último animal de la conversación.
        var cand = candidatoAnimal(crudo);
        if (cand) return respuestaAnimalDesconocido(crudo, n, fuertes[0]);
        if (ctx.animal && tokensDe(n).length <= 8) {
          var fc = fichaPorId(ctx.animal);
          if (fc) return respuestaFicha(fc, fuertes, crudo, {});
        }
        return pedirAnimal(fuertes[0]);
      }

      // 3) Dudas de membresía, pagos, certificados, cuenta…
      var d = buscarDuda(n, quiereCurso);
      if (d) return respuestaDuda(d, crudo, n);

      // 4) Charla: saludos, gracias, despedidas…
      if (banderas.alguna && restoSinSocial(n).length <= 1) return respuestaSocial(n, banderas);

      // 5) Lista de animales
      if (RE_LISTA_ANIMALES.test(n)) return listaAnimales();

      // 6) Cursos
      var terminos = terminosPregunta(n);
      var esDefinicion = /\bque (es|son)\b|\bquien (es|son)\b|\bhablame\b|\bcuentame\b/.test(n);
      if (quiereCurso && !terminos.length) return respuestaAreas();
      if (catalogo && quiereCurso) return respuestaBusqueda(crudo, n, [], false);
      if (catalogo) {
        // Una pregunta de definición ("¿qué es un X?") solo lleva a cursos si X aparece en un título o área.
        var lista = buscarCursosTexto(crudo, n, [], esDefinicion && !quiereCurso);
        if (lista.length) return respuestaBusqueda(crudo, n, [], esDefinicion && !quiereCurso);
      } else if (terminos.length && quiereCurso) {
        return respuestaSinCatalogo(crudo);
      }

      // 7) No sé: lo dice y registra la pregunta
      var tipoReg = (hayCampoConcreto || esDefinicion) ? 'animal' : 'otro';
      return respuestaNoSe(crudo, n, tipoReg);
    }

    function texto1(entrada) {
      var crudo = String(entrada == null ? '' : entrada).replace(/\s+/g, ' ').trim().slice(0, MAX_ENTRADA);
      if (!crudo) return menu('Escribe tu pregunta o elige una opción:');
      if (hayDatosPersonales(crudo)) return respuestaPrivacidad();
      var n = normalizar(crudo);
      if (!n) return menu('No te entendí bien. Elige una opción o escribe de nuevo:');
      var banderas = banderasSociales(n);
      var r = pipelineTexto(crudo, n, banderas);
      // Un saludo dentro de una pregunta ("hola, qué come el león") se contesta primero.
      if (banderas.saludo && r.tipo !== 'charla') r.partes.unshift(saludoSegunHora(n, ahora()));
      return r;
    }

    /* --- entrada de botones --- */
    function accion(a) {
      var x = a && typeof a === 'object' ? a : {};
      switch (x.tipo) {
        case 'menu': return menu();
        case 'inicio': return inicio();
        case 'animales': return listaAnimales();
        case 'animal': {
          var f = fichaPorId(String(x.id || ''));
          if (!f) return listaAnimales();
          var c = CAMPOS.indexOf(x.campo) !== -1 ? x.campo : 'que_es';
          return respuestaFicha(f, [c], '', {});
        }
        case 'dudas': return menuDudas();
        case 'tema': return respuestaTema(String(x.id || ''));
        case 'duda': {
          var d = DUDAS && DUDAS.PORID ? DUDAS.PORID[String(x.id || '')] : null;
          return d ? respuestaDuda(d, '', '') : menuDudas();
        }
        case 'cursos': return respuestaAreas();
        case 'area': return respuestaArea(String(x.area || ''));
        case 'proximos': return respuestaProximos();
        case 'curso': return respuestaCurso(String(x.id || ''));
        case 'aceptar': return respuestaAceptar(String(x.id || ''));
        case 'rechazar': return respuestaRechazar();
        case 'asesor': return respuestaAsesor();
        case 'texto': return texto1(x.texto);
        default: return menu();
      }
    }

    function reiniciar() { ctx = { animal: null }; }

    return {
      texto: texto1,
      accion: accion,
      inicio: inicio,
      menu: menu,
      reiniciar: reiniciar,
      setFichas: setFichas,
      setCatalogo: setCatalogo,
      setPrecios: setPrecios,
      enlaceWhatsApp: enlaceWhatsApp,
      detectarAnimal: function (t) { var h = detectarAnimal(normalizar(t)); return h ? { id: h.ficha.id, fuzzy: h.fuzzy } : null; },
      tieneCatalogo: function () { return !!catalogo; },
      totalFichas: function () { return fichas.length; },
      contexto: function () { return { animal: ctx.animal }; }
    };
    // (setFichas/setCatalogo se llaman abajo con lo que entregó quien creó el motor)
  }

  function crearConDatos(opciones) {
    var m = crear(opciones);
    var o = opciones || {};
    m.setFichas(o.fichas || []);
    if (o.catalogo) m.setCatalogo(o.catalogo);
    return m;
  }

  return {
    crear: crearConDatos,
    normalizar: normalizar,
    distancia: distancia,
    limpiarParaRegistro: limpiarParaRegistro,
    hayDatosPersonales: hayDatosPersonales,
    CAMPOS: CAMPOS,
    ETIQUETAS: ETIQUETAS,
    WHATSAPP: WHATSAPP
  };
});
