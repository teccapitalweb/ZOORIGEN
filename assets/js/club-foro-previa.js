/* ============================================================ */
/* FORO VIP · VISTA PREVIA PARA QUIEN NO ES MIEMBRO              */
/*                                                                */
/* Publicaciones de EJEMPLO (inventadas, sin personas reales) para */
/* que quien no es miembro vea cómo se ve el foro sin consultar   */
/* Firestore. Toda la parte de dibujo es pura y se prueba en Node */
/* (tests/vista-previa-comunidad.test.js).                        */
/*                                                                */
/* REGLA: nada de lo que se dibuja aquí es una conversación real. */
/* Cada publicación lleva la etiqueta "Ejemplo".                  */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_FORO_PREVIA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORIAS = {
    casos: 'Casos clínicos',
    manejo: 'Manejo',
    identificacion: 'Identificación',
    legal: 'Legal & UMAs',
    empleo: 'Empleo',
    consulta: 'Consulta'
  };

  var TEXTOS = {
    aviso: 'Vista previa con publicaciones de ejemplo. Las conversaciones reales son solo para miembros.',
    paywallTitulo: 'Las conversaciones reales son para miembros',
    paywallTexto: 'Con tu membresía lees las discusiones de la comunidad, publicas tus dudas, comentas y reaccionas.',
    paywallBoton: 'Hazte miembro',
    composerMarcador: 'Comparte un caso, una pregunta o una experiencia...',
    composerBoton: 'Publicar',
    etiqueta: 'Ejemplo'
  };

  /* Publicaciones ficticias. El tiempo es un texto fijo ("Hace 2 h"), no una fecha real. */
  var EJEMPLOS = Object.freeze([
    Object.freeze({
      id: 'ejemplo-1', categoria: 'manejo', autor: 'Estudiante de Biología', hace: 'Hace 2 h',
      titulo: 'Encontramos una cría de zorrillo sola, ¿qué hacemos primero?',
      contenido: 'La encontramos en una bodega, sin la madre cerca. La pusimos en una caja con una cobija. ¿Qué conviene hacer en las primeras horas y a quién pedir ayuda?',
      reacciones: 12, respuestas: 3,
      respuestasEjemplo: Object.freeze([
        Object.freeze({ autor: 'Médica veterinaria · Centro de rescate', texto: 'Mantenla abrigada, en silencio y sin darle de comer ni de beber hasta que la revise un veterinario. Avisa cuanto antes a un centro de rescate.' }),
        Object.freeze({ autor: 'Técnico de UMA', texto: 'Evita manipularla de más. Si puedes, anota dónde y a qué hora la encontraron.' })
      ])
    }),
    Object.freeze({
      id: 'ejemplo-2', categoria: 'identificacion', autor: 'Médica veterinaria · Centro de rescate', hace: 'Ayer',
      titulo: '¿Cómo distinguir una coral verdadera de una falsa coral?',
      contenido: 'Quiero armar una guía rápida para el personal de campo. ¿Qué rasgos usan ustedes para diferenciarlas sin acercarse al animal?',
      reacciones: 9, respuestas: 4,
      respuestasEjemplo: Object.freeze([
        Object.freeze({ autor: 'Educadora ambiental', texto: 'El orden de los anillos ayuda, pero ningún rasgo es infalible. Ante la duda, trátala siempre como peligrosa y no la manipules.' })
      ])
    }),
    Object.freeze({
      id: 'ejemplo-3', categoria: 'legal', autor: 'Técnico de UMA', hace: 'Hace 3 días',
      titulo: '¿Cómo documentan la legal procedencia de un ejemplar?',
      contenido: 'Estamos ordenando el expediente de nuestra UMA. ¿Cómo organizan los documentos de cada ejemplar para tenerlos listos en una inspección?',
      reacciones: 15, respuestas: 5,
      respuestasEjemplo: Object.freeze([
        Object.freeze({ autor: 'Médica veterinaria · Centro de rescate', texto: 'Llevamos una carpeta por ejemplar con su procedencia, sus movimientos y su identificación. Confirma con la autoridad qué formato te piden.' })
      ])
    }),
    Object.freeze({
      id: 'ejemplo-4', categoria: 'consulta', autor: 'Educadora ambiental', hace: 'Hace 5 días',
      titulo: 'Dudas sobre el registro de una UMA: ¿por dónde empiezo?',
      contenido: 'Una comunidad quiere registrar una UMA de aprovechamiento no extractivo. ¿Cuáles son los primeros pasos y quién puede ayudarles con el plan de manejo?',
      reacciones: 7, respuestas: 0,
      respuestasEjemplo: Object.freeze([])
    })
  ]);

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function inicial(nombre) { return String(nombre || 'U').trim().charAt(0).toUpperCase() || 'U'; }
  function icono(nombre) { return '<svg class="zi" aria-hidden="true"><use href="#zi-' + nombre + '"/></svg>'; }

  /* Publicaciones de una categoría ('all' o vacío = todas). */
  function filtrar(posts, categoria) {
    var lista = Array.isArray(posts) ? posts : [];
    if (!categoria || categoria === 'all') return lista.slice();
    return lista.filter(function (p) { return p.categoria === categoria; });
  }

  /* Etiqueta de categoría. o.etiquetaCategoria(cat) puede devolver HTML con icono; por omisión es texto plano. */
  function etiquetaCat(cat, o) {
    if (o && typeof o.etiquetaCategoria === 'function') return o.etiquetaCategoria(cat);
    return esc(CATEGORIAS[cat] || cat);
  }

  /* Misma estructura y clases que una publicación real (foro-post), con la etiqueta "Ejemplo". */
  function renderPost(p, o) {
    var vistas = p.respuestasEjemplo || [];
    var restantes = (p.respuestas || 0) - vistas.length;
    return '<div class="foro-post foro-post--ejemplo" id="post-' + esc(p.id) + '" data-ejemplo="1">' +
      '<div class="foro-post__top" data-accion="abrir">' +
        '<div class="foro-post__avatar">' + esc(inicial(p.autor)) + '</div>' +
        '<div class="foro-post__body">' +
          '<div class="foro-post__meta">' +
            '<span class="foro-post__cat">' + etiquetaCat(p.categoria, o) + '</span>' +
            '<span class="pw-ejemplo">' + esc(TEXTOS.etiqueta) + '</span>' +
            '<span class="foro-post__author">' + esc(p.autor) + '</span>' +
            '<span class="foro-post__time">· ' + esc(p.hace) + '</span>' +
          '</div>' +
          '<h3 class="foro-post__title">' + esc(p.titulo) + '</h3>' +
          '<p class="foro-post__preview">' + esc(p.contenido) + '</p>' +
        '</div>' +
      '</div>' +
      (vistas.length ? '<div class="foro-post__replies">' + vistas.map(function (r) {
        return '<div class="foro-reply-preview">' +
          '<div class="foro-reply-preview__avatar">' + esc(inicial(r.autor)) + '</div>' +
          '<div class="foro-reply-preview__body">' +
            '<div class="foro-reply-preview__author">' + esc(r.autor) + '</div>' +
            '<div class="foro-reply-preview__text">' + esc(r.texto) + '</div>' +
          '</div></div>';
      }).join('') + (restantes > 0 ? '<a class="foro-post__view-more" role="button" tabindex="0" data-accion="abrir">Ver ' + restantes + ' respuesta(s) más</a>' : '') + '</div>' : '') +
      '<div class="foro-post__actions">' +
        '<button type="button" class="foro-action" data-accion="reaccionar"><span class="foro-action__icon">' + icono('heart') + '</span><span>' + (Number(p.reacciones) || 0) + '</span></button>' +
        '<button type="button" class="foro-action" data-accion="comentar"><span class="foro-action__icon">' + icono('message-circle') + '</span><span>' + (Number(p.respuestas) || 0) + ' respuestas</span></button>' +
        '<button type="button" class="foro-action" data-accion="compartir"><span class="foro-action__icon">' + icono('link') + '</span><span>Compartir</span></button>' +
      '</div>' +
    '</div>';
  }

  function renderLista(posts, o) {
    return (Array.isArray(posts) ? posts : []).map(function (p) { return renderPost(p, o); }).join('');
  }

  /* Caja para escribir, SOLO LECTURA: la persona la ve y al tocarla recibe el aviso de membresía. */
  function renderComposer(nombre) {
    return '<div class="foro-composer" id="foroComposer">' +
      '<div class="foro-post__avatar" aria-hidden="true">' + esc(inicial(nombre)) + '</div>' +
      '<div class="foro-composer__campo">' +
        '<label for="foroComposerTexto" class="foro-composer__lbl">Escribe tu discusión</label>' +
        '<textarea id="foroComposerTexto" readonly rows="2" placeholder="' + esc(TEXTOS.composerMarcador) + '" data-accion="publicar"></textarea>' +
        '<div class="foro-composer__pie"><button type="button" class="foro-btn-submit" data-accion="publicar">' + esc(TEXTOS.composerBoton) + '</button></div>' +
      '</div></div>';
  }

  /* Nombre de la acción que se muestra en el aviso de membresía. */
  var ACCIONES = {
    abrir: 'Abrir una discusión',
    reaccionar: 'Reaccionar',
    comentar: 'Comentar',
    compartir: 'Compartir una discusión',
    publicar: 'Publicar en el foro',
    filtrar: 'Filtrar el foro por categoría'
  };
  function nombreAccion(clave) { return ACCIONES[clave] || 'Usar el foro'; }

  return {
    CATEGORIAS: CATEGORIAS, TEXTOS: TEXTOS, EJEMPLOS: EJEMPLOS, ACCIONES: ACCIONES,
    esc: esc, inicial: inicial, filtrar: filtrar, renderPost: renderPost, renderLista: renderLista,
    renderComposer: renderComposer, nombreAccion: nombreAccion
  };
});
