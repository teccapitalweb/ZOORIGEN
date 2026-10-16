/* ============================================================ */
/* DUDAS FRECUENTES DE LA GUÍA ZOORIGEN                          */
/*                                                                */
/* Cada respuesta repite lo que YA dicen el sitio y el panel.     */
/* Debajo de cada tema va el archivo donde se verificó.           */
/* Si un dato no está en el sitio, la respuesta NO lo afirma.     */
/*                                                                */
/* PRECIOS: el sitio no publica un documento de configuración con */
/* precios que se pueda leer sin iniciar sesión (los montos están */
/* dentro de pages/club-suscripcion.html, que pide cuenta). Por   */
/* eso aquí no se afirma ninguna cantidad; solo si quien llama    */
/* entrega `ctx.precios = { mes, ano }` leídos en vivo.           */
/*                                                                */
/* UMD: se prueba en Node (tests/chatbot-motor.test.js).          */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_CHATBOT_DUDAS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WHATSAPP = '5212361113237';     // index.html (botón flotante y tarjeta de contacto)
  var CORREO = 'zooorigen@gmail.com'; // index.html (tal como aparece en el sitio)

  var SALTO_PAGINAS = 'pages/';
  var URL_VERIFICAR = SALTO_PAGINAS + 'verificar.html';

  function dinero(n) { return '$' + Number(n).toLocaleString('es-MX'); }
  function precios(ctx) {
    var p = ctx && ctx.precios;
    return p && p.mes > 0 && p.ano > 0 ? p : null;
  }
  var PRECIOS_AL_CREAR = 'Los precios vigentes se ven al crear tu cuenta gratuita, en la sección **Suscripción** de tu panel.';

  /* Orden = prioridad: la primera que coincide gana.
     `debil: true` = palabras que también aparecen al buscar un curso (nivel, video, guías…):
     si la persona pide un curso, esas no cuentan como duda. */
  var LISTA = [
    {
      id: 'reembolso', tema: 'cuenta-pagos', boton: '¿Hay reembolsos?',
      patron: /reembols|devoluc|me regresan|devuelven|devolver (mi )?dinero/,
      texto: function () {
        return [
          'No encontré una política de reembolsos publicada en el sitio, así que prefiero no afirmarte nada al respecto.',
          'Si tienes una situación con un pago, escríbele al equipo por WhatsApp.'
        ];
      },
      botones: [{ t: 'Hablar con un asesor', accion: { tipo: 'asesor' } }]
      // Verificado: se buscó "reembolso/devolución" en index.html, pages/*.html y assets/js: no aparece.
    },
    {
      id: 'cancelar', tema: 'cuenta-pagos', boton: '¿Puedo cancelar?',
      patron: /cancel|dar de baja|darme de baja|dejar de pagar|no renovar|ya no quiero (pagar|seguir)/,
      texto: function () {
        return [
          'Sí. En la sección **Suscripción** de tu panel hay un botón para cancelar tu membresía.',
          'Mantienes el acceso hasta el final del periodo que ya pagaste. Si cambias de opinión antes de que venza, puedes reanudarla desde la misma sección.'
        ];
      }
      // Verificado: pages/club-suscripcion.html (zona de cancelar: "mantienes el acceso hasta el final del período pagado";
      // botón "Reanudar mi membresía" si está cancelada con acceso vigente).
    },
    {
      id: 'contrasena', tema: 'cuenta', boton: 'Olvidé mi contraseña',
      patron: /contrasena|olvide mi|recuperar (mi )?cuenta|restablecer|no puedo entrar|no me deja entrar/,
      texto: function () {
        return [
          'En la pantalla de **iniciar sesión** toca **«¿Olvidaste tu contraseña?»**, escribe tu correo y te llega un enlace para crear una nueva.',
          'Revisa también la carpeta de spam.'
        ];
      },
      botones: [{ t: 'Ir a iniciar sesión', href: SALTO_PAGINAS + 'club-login.html' }]
      // Verificado: pages/club-login.html (enlace "¿Olvidaste tu contraseña?" y mensaje "Revisa tu bandeja de entrada y la carpeta de spam").
    },
    {
      id: 'certOficial', tema: 'certificados', boton: '¿Es un título oficial?',
      patron: /certificad.*(oficial|titulo|valid|\bsep\b|curricul|reconoc|cedula)|(oficial|titulo|\bsep\b|curricul|cedula).*certificad|(constancia|diploma).*(oficial|valid|titulo)/,
      texto: function () {
        return [
          'El certificado es una **constancia emitida por Zoorigen** para respaldar tu formación, con un folio que se puede verificar en la página de verificación.',
          'No es un título ni una cédula de una institución educativa oficial. Si lo necesitas para un trámite ante una autoridad, confírmalo antes con ella.'
        ];
      },
      botones: [{ t: 'Verificar un certificado', href: URL_VERIFICAR }]
      // Verificado: index.html ("Cada curso incluye constancia para respaldar tu formación", "Certificado con folio y QR"),
      // pages/verificar.html ("Emitido oficialmente por Zoorigen"). La frase "no es un título ni una cédula" NO está escrita
      // en el sitio: se deduce de que es una constancia propia de Zoorigen; queda para confirmación del dueño.
    },
    {
      id: 'verificar', tema: 'certificados', boton: '¿Cómo verifico un certificado?',
      patron: /(verific|comprob|autentic|validar|revisar|consultar).*certificad|certificad.*(verific|folio|autentic|falso|real|qr)|\bfolio\b|\bqr\b/,
      texto: function () {
        return [
          'Cada certificado trae un **folio** (por ejemplo, con el formato ZOO-2026-1A2B3C4D).',
          'Escríbelo en la **página de verificación de certificados** de Zoorigen y te muestra si es auténtico, a nombre de quién está y qué curso completó.'
        ];
      },
      botones: [{ t: 'Verificar un certificado', href: URL_VERIFICAR }]
      // Verificado: pages/verificar.html (campo de folio con ejemplo ZOO-2026-1A2B3C4D; muestra otorgado a, curso, folio, fecha).
    },
    {
      id: 'certNombre', tema: 'certificados', boton: '¿Qué nombre aparece?',
      patron: /nombre.*certificad|certificad.*nombre/,
      texto: function () {
        return [
          'Aparece el nombre que confirmas en tu cuenta. Escríbelo completo y bien escrito (nombre y apellidos), porque es el que sale en tus certificados de Zoorigen.'
        ];
      }
      // Verificado: assets/js/club-onboarding.js (TEXTOS.nombre: "Este es el nombre que aparecerá en tus certificados de Zoorigen...").
    },
    {
      id: 'certificado', tema: 'certificados', boton: '¿Dan certificado?',
      patron: /certific|constancia|diploma|acredit/,
      texto: function () {
        return [
          'Sí. Al terminar un curso obtienes un **certificado con folio** que cualquiera puede verificar, y la portada indica que también lleva código QR.',
          'Tus certificados quedan en la sección **Mis certificados** de tu panel.'
        ];
      },
      botones: [{ t: 'Verificar un certificado', href: URL_VERIFICAR }]
      // Verificado: index.html ("Certificado con folio y QR"), assets/js/club-onboarding.js ("Al terminar un curso obtienes un
      // certificado con un folio que cualquiera puede verificar"), assets/js/club-shell.js (menú "Mis certificados").
    },
    {
      id: 'precio', tema: 'cuenta-pagos', boton: '¿Cuánto cuesta?',
      patron: /precio|cuesta|costo|mensualidad|tarifa|cuanto (cuesta|cobran|es|se paga|pago|tengo que pagar|vale|sale)|que precio/,
      texto: function (ctx) {
        var p = precios(ctx);
        if (p) return ['La membresía cuesta **' + dinero(p.mes) + ' al mes** o **' + dinero(p.ano) + ' al año**. Cancelas cuando quieras.'];
        return [
          'Hay dos planes: **mensual** y **anual**. ' + PRECIOS_AL_CREAR,
          'Crear la cuenta es gratis y no pide tarjeta.'
        ];
      },
      botones: [{ t: '¿Mensual o anual?', accion: { tipo: 'duda', id: 'planes' } }]
      // Verificado: pages/club-suscripcion.html ("Elige tu plan": VIP Mensual y VIP Anual) y pages/club-registro.html
      // ("No necesitas tarjeta"). No hay documento público de precios: no se afirma ninguna cantidad.
    },
    {
      id: 'pago', tema: 'cuenta-pagos', boton: '¿Cómo puedo pagar?',
      patron: /como pag|formas? de pago|metodos? de pago|pagar|tarjeta|stripe|oxxo|paypal|transferencia|deposito|efectivo|debito|credito/,
      texto: function () {
        return [
          'El pago de la membresía es con **tarjeta**, en un pago seguro procesado por **Stripe**. Tu membresía se activa automáticamente al completar el pago.',
          'Si ya pagaste y no se activa, en la sección **Suscripción** hay un botón para verificar tu pago, y puedes escribirle al equipo.'
        ];
      },
      botones: [{ t: 'Hablar con un asesor', accion: { tipo: 'asesor' } }]
      // Verificado: pages/club-suscripcion.html ("Pago seguro procesado por Stripe · Tu membresía se activa automáticamente al
      // completar el pago", botón "Verificar mi pago") y zoorigen-webhook/server.js (payment_method_types: ['card']).
      // Facturas: no hay información en el sitio; esa pregunta cae en "no sé" y se registra para el equipo.
    },
    {
      id: 'planes', tema: 'cuenta-pagos', boton: '¿Mensual o anual?',
      patron: /mensual|anual|\bplanes?\b|por mes|por ano|al mes|al ano|suscripcion/,
      texto: function (ctx) {
        var p = precios(ctx);
        var partes = [
          'Hay dos planes: **VIP Mensual** (cancelas cuando quieras) y **VIP Anual** (el recomendado; pagas una vez al año y ahorras frente a pagar cada mes).'
        ];
        partes.push(p
          ? 'Mensual: **' + dinero(p.mes) + '**. Anual: **' + dinero(p.ano) + '**.'
          : PRECIOS_AL_CREAR);
        return partes;
      }
      // Verificado: pages/club-suscripcion.html (sub-plan "VIP Mensual / Cancela cuando quieras", "VIP Anual / Recomendado / Ahorras ... al año").
    },
    {
      id: 'descuento', tema: 'cuenta-pagos', boton: '¿Hay descuentos?',
      patron: /descuento|promocion|promo\b|oferta|cupon|beca/,
      texto: function () {
        return [
          'La portada anuncia un **20% de descuento en capacitaciones** como beneficio de la membresía del Club VIP.',
          'Para saber cómo aplicarlo a un curso o capacitación en particular, escríbele al equipo.'
        ];
      },
      botones: [{ t: 'Hablar con un asesor', accion: { tipo: 'asesor' } }]
      // Verificado: index.html (sección Club VIP: "20% de descuento en cursos", "Canal exclusivo y 20% de descuento en capacitaciones").
    },
    {
      id: 'invitar', tema: 'cuenta', boton: '¿Cómo invito amigos?',
      patron: /invit|referid|recomendar a|amigos|codigo de invitacion|adelant/,
      texto: function () {
        return [
          'En **Invitar amigos** de tu panel tienes tu enlace de invitación. Cuando 4 amigos se registren con él y confirmen su correo, eliges un curso y lo abres antes de su fecha.'
        ];
      }
      // Verificado: pages/club-dashboard.html ("Invita a 4 amigos y adelanta un curso: ... se registren con él y confirmen su correo...")
      // y assets/js/club-logros-ui.js ("Cada premio abre un curso antes de su fecha").
    },
    {
      id: 'prueba', tema: 'cursos', boton: '¿Cómo funciona la prueba gratuita?',
      patron: /gratis|gratuit|prueba|sin costo|sin pagar|\bfree\b|\bdemo\b|probar/,
      texto: function () {
        return [
          'Al crear tu cuenta gratuita eliges **un curso** de tu interés como prueba gratuita. Puedes ver **todas sus clases menos la última** sin costo.',
          '**Solo puedes elegir uno y después no se puede cambiar**, así que escoge el que más te interese. La prueba es para cuentas que todavía no han tenido membresía.'
        ];
      },
      botones: [{ t: 'Crear mi cuenta gratis', href: SALTO_PAGINAS + 'club-registro.html' }]
      // Verificado: assets/js/club-acceso.js (esClaseGratis: todas las clases del curso elegido menos la última),
      // pages/club-biblioteca.html ("Solo puedes elegir uno y después no se puede cambiar"),
      // assets/js/club-onboarding.js (pruebaPosible: solo quien nunca ha tenido membresía), pages/club-registro.html (sin tarjeta).
    },
    {
      id: 'desbloqueo', tema: 'cursos', boton: '¿Cómo se desbloquean los cursos?',
      patron: /desbloque|cada 8|ocho dias|cuando se abren|cuando abren|ruta vip|uno por uno|todos (los )?cursos (a la vez|juntos)/,
      texto: function () {
        return [
          'Con la membresía, los cursos se abren poco a poco: **1 curso nuevo cada 8 días**.',
          'Si hiciste una prueba gratuita, el conteo empieza cuando terminas tu curso de prueba con tu membresía activa: el siguiente curso se abre 8 días después y los demás cada 8 días. En tu panel ves cuántos días faltan para cada curso.'
        ];
      }
      // Verificado: assets/js/club-acceso.js (DIAS_POR_CURSO = 8, desbloqueoCurso) y pages/club-biblioteca.html
      // (banner "Tu ruta VIP: 1 curso nuevo cada 8 días", "Termina tu curso de prueba para empezar tu ruta VIP").
    },
    {
      id: 'enVivo', tema: 'cursos', boton: '¿Hay clases en vivo?',
      patron: /en vivo|webinar|masterclass|sesion(es)?\b|\bmeet\b|transmis|\bzoom\b/,
      texto: function () {
        return [
          'Sí. Los **Webinars en vivo** son masterclasses con especialistas invitados, transmitidas por Google Meet.',
          'Se abren con membresía activa. Los cursos, en cambio, se estudian en línea a tu ritmo.'
        ];
      }
      // Verificado: pages/club-sesiones.html ("Masterclasses exclusivas con especialistas invitados · Transmitidas por Google Meet"),
      // index.html ("Participa en encuentros en vivo y resuelve tus dudas").
    },
    {
      id: 'formato', tema: 'cursos', boton: '¿Los cursos son en línea?',
      patron: /grabad|en linea|online|presencial|modalidad|como son (las )?clases|como funcionan (los )?cursos/,
      texto: function () {
        return [
          'La modalidad es **online**: estudias en línea, a tu ritmo, desde tu celular, tablet o computadora.',
          'Con la membresía también hay webinars en vivo con especialistas.'
        ];
      }
      // Verificado: index.html ("Modalidad online", "Acceso cómodo desde celular, tablet o computadora"),
      // pages/club-login.html ("Aprende a tu ritmo"), pages/club-sesiones.html (webinars en vivo).
    },
    {
      id: 'libros', tema: 'retos', boton: '¿Hay libros?', debil: true,
      patron: /\blibros?\b|lectura|leer en linea/,
      texto: function () {
        return [
          'Sí. En **PDFs y materiales** hay libros que se leen dentro del club y **se desbloquean al superar retos**.',
          'También hay guías y plantillas, presentaciones y documentos oficiales. Se abren con membresía activa.'
        ];
      }
      // Verificado: assets/js/club-materiales.js (encabezado: "Libros (se leen aquí, se desbloquean con retos), guías y plantillas
      // en PDF, presentaciones, documentos oficiales") y pages/club-pdfs.html (solo VIP).
    },
    {
      id: 'material', tema: 'cursos', boton: '¿Hay material descargable?', debil: true,
      patron: /material|\bpdfs?\b|descarg|\bguias?\b|plantilla|presentacion/,
      texto: function () {
        return [
          'En **PDFs y materiales** hay libros, guías y plantillas, presentaciones y enlaces a documentos oficiales (leyes y normas).',
          'Esa sección se abre con membresía activa.'
        ];
      }
      // Verificado: assets/js/club-materiales.js (OFICIALES, PESTANAS), pages/club-pdfs.html (solo VIP).
    },
    {
      id: 'retos', tema: 'retos', boton: '¿Qué son los retos?', debil: true,
      patron: /\bretos?\b|logros?|\bxp\b|\bniveles?\b|premios?|\bpuntos\b|insignia|gamific|\bjuegos?\b/,
      texto: function () {
        return [
          'En la **Zona de retos** practicas con retos cortos y subes de nivel.',
          'Al subir de nivel o al invitar amigos que de verdad se unan ganas premios: cada premio abre un curso antes de su fecha. Los libros del club también se desbloquean con retos.'
        ];
      }
      // Verificado: pages/club-retos.html ("Practica, supera retos cortos y sube de nivel"), assets/js/club-logros-ui.js
      // (premios), assets/js/club-materiales.js (libros se desbloquean con retos).
    },
    {
      id: 'nom059', tema: 'legislacion', boton: '¿Qué es la NOM-059?',
      patron: /nom ?-? ?059|\bnom\b|especies? en riesgo/,
      texto: function () {
        return [
          'La **NOM-059-SEMARNAT-2010** es la norma oficial que enlista las especies nativas de México en riesgo. Las clasifica en categorías: P (en peligro de extinción), E (probablemente extinta en libertad), A (amenazada) y Pr (sujeta a protección especial).',
          'En **Herramientas legales** hay una consulta de especies de la NOM-059; esa sección se abre con membresía activa.'
        ];
      },
      botones: [{ t: 'Ver la norma en el DOF', href: 'https://dof.gob.mx/normasOficiales/4254/semarnat/semarnat.htm' }],
      fuentes: [{ nombre: 'NOM-059-SEMARNAT-2010, Diario Oficial de la Federación', url: 'https://dof.gob.mx/normasOficiales/4254/semarnat/semarnat.htm' }]
      // Verificado: pages/club-legal.html (categorías P, E, A, Pr; "NOM-059-SEMARNAT-2010, publicada en el DOF el 30-dic-2010")
      // y assets/js/club-materiales.js (OFICIALES: enlace al DOF).
    },
    {
      id: 'lgvs', tema: 'legislacion', boton: '¿Qué es la LGVS?',
      patron: /ley general de vida silvestre|\blgvs\b|ley de vida silvestre/,
      texto: function () {
        return [
          'La **Ley General de Vida Silvestre (LGVS)** regula la conservación y el aprovechamiento sustentable de la vida silvestre y su hábitat en México.',
          'El texto vigente está en el sitio de la Cámara de Diputados; en **Herramientas legales** (con membresía activa) hay un resumen de artículos clave y listas de revisión.'
        ];
      },
      botones: [{ t: 'Ver el texto oficial', href: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGVS.pdf' }],
      fuentes: [{ nombre: 'Ley General de Vida Silvestre, Cámara de Diputados', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGVS.pdf' }]
      // Verificado: assets/js/club-retos-datos.js (pregunta q03 y su explicación), assets/js/club-materiales.js (OFICIALES).
    },
    {
      id: 'cites', tema: 'legislacion', boton: '¿Qué es CITES?',
      patron: /\bcites\b/,
      texto: function () {
        return [
          'La **Convención CITES** (Comercio Internacional de Especies Amenazadas de Fauna y Flora Silvestres) es un acuerdo internacional de 1973. México es parte desde 1991.',
          'Busca que el comercio internacional de animales y plantas silvestres no amenace su supervivencia. En México, los trámites se hacen ante SEMARNAT.'
        ];
      },
      botones: [{ t: 'Sitio oficial de CITES', href: 'https://cites.org/esp' }],
      fuentes: [{ nombre: 'Convención CITES', url: 'https://cites.org/esp' }]
      // Verificado: pages/club-legal.html (CITES_CONTENT.general) y assets/js/club-materiales.js (OFICIALES).
    },
    {
      id: 'herramientas', tema: 'retos', boton: '¿Qué herramientas incluye?', debil: true,
      patron: /herramienta|calculadora|dosis|farmacolog|infusion|dilucion|hemograma|protocolo|libro de registro|bitacora|inventario|informe anual/,
      texto: function () {
        return [
          'En **Herramientas pro** del panel hay cinco herramientas, repartidas en cuatro secciones:',
          '**Referencia clínica:** constantes fisiológicas de referencia de 50 especies, con su fuente, y la escala de condición corporal (BCS).',
          '**Infusiones y diluciones:** infusión continua, diluciones, conversiones de unidades y duración y tasa.',
          '**Libro de registro:** inventario de ejemplares, bitácora de eventos e informe anual (borrador).',
          '**Herramientas legales:** consulta de la NOM-059, borradores de informes UMA/PIMVS, derechos de la Ley Federal de Derechos 2026, CITES, marco legal y listas de revisión.',
          'Se abren con membresía activa y son material de apoyo: no sustituyen el criterio del médico veterinario responsable ni la asesoría de un especialista.'
        ];
      }
      // Verificado: pages/club-herramientas.html (Referencia clínica: constantes y BCS), club-infusiones.html, club-inventario.html, club-legal.html (títulos y secciones;
      // cada página pide membresía activa) y assets/js/club-shell.js (grupo "Herramientas pro").
    },
    {
      id: 'app', tema: 'cuenta', boton: '¿Cómo instalo la app?',
      patron: /\binstal|\bapp\b|aplicacion|\bpwa\b|pantalla de inicio/,
      texto: function () {
        return [
          'Entra a tu panel y toca **«Instalar app»** en el menú. Te muestra los pasos según tu teléfono o navegador.',
          'Si no aparece, abre el menú de tu navegador y elige **Instalar Zoorigen** o **Agregar a pantalla de inicio**.'
        ];
      }
      // Verificado: assets/js/club-shell.js (enlace "Instalar app" y textos del cuadro de instalación).
    },
    {
      id: 'celular', tema: 'cursos', boton: '¿Los veo en el celular?',
      patron: /celular|\bmovil|tablet|computadora|dispositivo|laptop|android|iphone|telefono/,
      texto: function () {
        return [
          'Sí. Puedes entrar desde el navegador de tu **celular, tablet o computadora** con tu misma cuenta.',
          'También puedes instalar Zoorigen como app desde tu panel.'
        ];
      },
      botones: [{ t: '¿Cómo instalo la app?', accion: { tipo: 'duda', id: 'app' } }]
      // Verificado: index.html ("Acceso cómodo desde celular, tablet o computadora"), assets/js/club-shell.js (Instalar app).
    },
    {
      id: 'crear', tema: 'cuenta', boton: '¿Cómo creo mi cuenta?',
      patron: /registr|\bcre(ar|o|arme|e)\b.*\bcuenta|abrir (una |mi )?cuenta|hacer(me)? (una |mi )?cuenta|inscrib|darme de alta|\bsign ?up\b|necesito tarjeta/,
      texto: function () {
        return [
          'Creas tu cuenta con tu **nombre completo, correo, número de WhatsApp y una contraseña** (mínimo 6 caracteres), o con tu cuenta de Google.',
          'Es gratis y no pide tarjeta. Si usas correo, te llega un mensaje para confirmar tu dirección (revisa también el spam).'
        ];
      },
      botones: [{ t: 'Crear mi cuenta gratis', href: SALTO_PAGINAS + 'club-registro.html' }, { t: 'Ya tengo cuenta', href: SALTO_PAGINAS + 'club-login.html' }]
      // Verificado: pages/club-registro.html (campos del formulario, "Crear cuenta con Google", "No necesitas tarjeta",
      // mensaje del correo de confirmación; campo de contraseña con minlength 6).
    },
    {
      id: 'comunidad', tema: 'cuenta', boton: '¿Hay comunidad o foro?',
      patron: /\bforo\b|directorio|comunidad|\bcanal\b|grupo de whatsapp/,
      texto: function () {
        return [
          'Dentro del club hay **Foro VIP**, **Directorio VIP** y un **Canal de WhatsApp** con novedades, avisos de webinars y cursos nuevos.',
          'El canal es para miembros con membresía activa.'
        ];
      }
      // Verificado: assets/js/club-shell.js (grupo "Comunidad") y pages/club-canal.html ("El canal es para miembros con membresía activa").
    },
    {
      id: 'ubicacion', tema: 'zoorigen', boton: '¿Dónde están?',
      patron: /donde (estan|se ubican|queda|son|se encuentran)|ubicacion|direccion|tehuacan|puebla|oficinas?|\bmapa\b/,
      texto: function () {
        return [
          'Los cursos son en línea, así que los tomas desde donde estés.',
          'En la página de verificación de certificados, Zoorigen aparece como parte de **Tec Capital Group, en Tehuacán, Puebla**. Para otra información de ubicación, escríbele al equipo.'
        ];
      },
      botones: [{ t: 'Hablar con un asesor', accion: { tipo: 'asesor' } }]
      // Verificado: pages/verificar.html ("Zoorigen · Tec Capital Group · Tehuacán, Puebla"). index.html no publica dirección.
    },
    {
      id: 'empresas', tema: 'zoorigen', boton: '¿Capacitan a empresas?',
      patron: /empresa|institucion|organizacion|mi equipo|mi personal|capacitar a mi/,
      texto: function () {
        return [
          'La portada indica que Zoorigen comparte capacitación con instituciones, empresas y organizaciones.',
          'Para saber cómo sería para tu equipo, escríbele al equipo por WhatsApp.'
        ];
      },
      botones: [{ t: 'Hablar con un asesor', accion: { tipo: 'asesor' } }]
      // Verificado: index.html (sección "Empresas y organizaciones que han confiado en nosotros").
    },
    {
      id: 'contacto', tema: 'zoorigen', boton: '¿Cómo los contacto?',
      patron: /contacto|asesor|\bhumano\b|whatsapp|llamar|llamada|hablar con|correo|email|numero de|facebook|redes sociales/,
      texto: function () {
        return [
          'Puedes escribirle al equipo por **WhatsApp (+52 1 236 111 3237)**, al correo **' + CORREO + '** o por Facebook.',
          'La portada indica que responden en horario hábil.'
        ];
      },
      botones: [{ t: 'Abrir WhatsApp', wa: true }]
      // Verificado: index.html (barra superior, tarjetas de contacto y "Respuesta en horario hábil").
    },
    {
      id: 'quienes', tema: 'zoorigen', boton: '¿Qué es Zoorigen?',
      patron: /(que es|quienes son|quien es|acerca de|sobre|conocer) zoorigen|^zoorigen$/,
      texto: function () {
        return [
          '**Zoorigen** ofrece capacitación científica en fauna silvestre, apicultura, biodiversidad, manejo animal e investigación aplicada, en modalidad online.',
          'Tiene cursos, un Club VIP con membresía, certificados con folio verificable y herramientas profesionales.'
        ];
      }
      // Verificado: index.html (meta description y secciones "Quiénes somos", "Club VIP").
    },
    {
      id: 'incluye', tema: 'cuenta-pagos', boton: '¿Qué incluye la membresía?',
      patron: /membres|incluye|\bclub\b|\bvip\b|beneficios|que ofrece|que obtengo|en que consiste|que gano/,
      texto: function (ctx) {
        var p = precios(ctx);
        var partes = [
          '**La membresía del Club VIP incluye:**',
          'Cursos completos para aprender a tu ritmo, con seguimiento de tu progreso y certificados con folio verificable.',
          'Webinars en vivo con especialistas, y PDFs, libros, guías y herramientas profesionales (clínicas, de infusiones, libro de registro y legales).',
          'Comunidad (foro, directorio y canal de WhatsApp) y 20% de descuento en capacitaciones.'
        ];
        partes.push(p ? 'Cuesta **' + dinero(p.mes) + ' al mes** o **' + dinero(p.ano) + ' al año**.' : PRECIOS_AL_CREAR);
        return partes;
      },
      botones: [{ t: '¿Mensual o anual?', accion: { tipo: 'duda', id: 'planes' } }]
      // Verificado: index.html (sección Club VIP: cursos completos, sesiones con especialistas, recursos científicos,
      // progreso y certificados, comunidad y 20% de descuento), assets/js/club-shell.js (menú del panel).
    }
  ];

  /* Temas para navegar por botones (orden de aparición). */
  var TEMAS = [
    { id: 'cuenta-pagos', titulo: 'Membresía y pagos', preguntas: ['incluye', 'precio', 'planes', 'pago', 'cancelar', 'descuento', 'reembolso'] },
    { id: 'cursos', titulo: 'Cursos y prueba gratuita', preguntas: ['prueba', 'desbloqueo', 'formato', 'enVivo', 'material', 'celular'] },
    { id: 'retos', titulo: 'Retos y herramientas', preguntas: ['retos', 'libros', 'herramientas'] },
    { id: 'certificados', titulo: 'Certificados', preguntas: ['certificado', 'verificar', 'certOficial', 'certNombre'] },
    { id: 'legislacion', titulo: 'Legislación', preguntas: ['nom059', 'lgvs', 'cites'] },
    { id: 'cuenta', titulo: 'Mi cuenta', preguntas: ['crear', 'contrasena', 'app', 'invitar', 'comunidad'] },
    { id: 'zoorigen', titulo: 'Zoorigen y contacto', preguntas: ['quienes', 'ubicacion', 'empresas', 'contacto'] }
  ];

  var PORID = {};
  LISTA.forEach(function (d) { PORID[d.id] = d; });

  return {
    LISTA: LISTA,
    TEMAS: TEMAS,
    PORID: PORID,
    WHATSAPP: WHATSAPP,
    CORREO: CORREO,
    SALTO_PAGINAS: SALTO_PAGINAS
  };
});
