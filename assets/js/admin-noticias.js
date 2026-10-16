/* ============================================================ */
/* PANEL ADMIN · NOTICIAS, DATOS CURIOSOS Y AVISOS               */
/* Todo pasa por el servidor (endpoints /api/admin/...), que      */
/* también valida. Aquí se validan los formularios antes de       */
/* enviar para dar mensajes claros. Parte pura probada en Node.   */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_ADMIN_NOTICIAS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORIAS = [
    ['fauna', 'Fauna silvestre'], ['conservacion', 'Conservación'], ['veterinaria', 'Veterinaria y medicina zoológica'],
    ['normativa', 'Normatividad ambiental'], ['apicultura', 'Apicultura'], ['ciencia', 'Ciencia y biodiversidad']
  ];
  var PLANTILLAS = [['verde', 'Cabecera verde'], ['naranja', 'Cabecera naranja'], ['bicolor', 'Cabecera carbón']];
  var TEMAS = ['Biodiversidad', 'Biología', 'Apicultura', 'Medicina zoológica', 'Normatividad', 'Conservación', 'General'];
  var TIPOS_AVISO = [['general', 'General'], ['sistema', 'Del sistema'], ['clase', 'Clase o webinar'], ['curso', 'Curso nuevo']];
  var ENLACES = [['', 'Sin enlace'], ['inicio', 'Inicio'], ['biblioteca', 'Cursos'], ['noticias', 'Noticias del sector'], ['pdfs', 'PDFs y materiales'], ['sesiones', 'Webinars en vivo'], ['retos', 'Retos'], ['logros', 'Mis logros']];

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function limpio(v) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim(); }
  function https(u) {
    var s = limpio(u);
    if (!s) return '';
    if (!/^https:\/\//i.test(s) || /[\s<>"'`\\]/.test(s) || s.length > 2000) return null;
    try { return new URL(s).hostname ? s : null; } catch (e) { return null; }
  }
  function idEn(lista, valor) { return lista.some(function (x) { return x[0] === valor; }); }

  /* ───── validaciones (devuelven { ok, error } o { ok, datos }) ───── */
  function validarNoticia(f) {
    f = f || {};
    var titulo = limpio(f.titulo), resumen = String(f.resumen == null ? '' : f.resumen).replace(/\r/g, '').split('\n').map(limpio).filter(Boolean).join('\n');
    if (titulo.length < 8 || titulo.length > 140) return { ok: false, error: 'El título debe tener entre 8 y 140 letras.' };
    if (resumen.length < 20 || resumen.length > 1500) return { ok: false, error: 'En "Lo esencial" escribe entre 20 y 1500 letras (una idea por línea).' };
    if (!idEn(CATEGORIAS, f.categoria)) return { ok: false, error: 'Elige una categoría.' };
    var imagen = https(f.imagen), link = https(f.link);
    if (imagen === null) return { ok: false, error: 'La imagen debe ser una dirección que empiece con https://' };
    if (link === null) return { ok: false, error: 'El enlace a la nota debe empezar con https://' };
    var fuente = limpio(f.fuente) || 'Equipo Zoorigen';
    if (fuente.length > 60) return { ok: false, error: 'La fuente es muy larga (máximo 60 letras).' };
    return { ok: true, datos: { titulo: titulo, resumen: resumen, categoria: f.categoria, fuente: fuente, imagen: imagen, link: link,
      plantilla: idEn(PLANTILLAS, f.plantilla) ? f.plantilla : 'verde', avisar: f.avisar === true } };
  }

  function validarDato(f) {
    f = f || {};
    var texto = limpio(f.texto);
    if (texto.length < 20 || texto.length > 300) return { ok: false, error: 'El dato debe tener entre 20 y 300 letras (ahora tiene ' + texto.length + ').' };
    var tema = TEMAS.indexOf(f.tema) !== -1 ? f.tema : 'General';
    var fuente = limpio(f.fuente);
    if (fuente.length > 80) return { ok: false, error: 'La fuente es muy larga (máximo 80 letras).' };
    return { ok: true, datos: { texto: texto, tema: tema, fuente: fuente, enviarYa: f.enviarYa === true } };
  }

  function validarAviso(f) {
    f = f || {};
    var titulo = limpio(f.titulo), descripcion = limpio(f.descripcion);
    if (titulo.length < 3 || titulo.length > 120) return { ok: false, error: 'El título debe tener entre 3 y 120 letras.' };
    if (descripcion.length < 3 || descripcion.length > 320) return { ok: false, error: 'La descripción debe tener entre 3 y 320 letras.' };
    return { ok: true, datos: { tipo: idEn(TIPOS_AVISO, f.tipo) ? f.tipo : 'general', titulo: titulo, descripcion: descripcion, enlace: idEn(ENLACES, f.enlace) ? f.enlace : '' } };
  }

  function origenTexto(o) { return o === 'admin' ? 'Publicada por el equipo' : 'Automática'; }

  var API = { CATEGORIAS: CATEGORIAS, PLANTILLAS: PLANTILLAS, TEMAS: TEMAS, TIPOS_AVISO: TIPOS_AVISO, ENLACES: ENLACES, esc: esc, https: https,
    validarNoticia: validarNoticia, validarDato: validarDato, validarAviso: validarAviso, origenTexto: origenTexto };

  if (typeof document === 'undefined') return API;

  /* ============================================================ */
  /* PANTALLA                                                      */
  /* ============================================================ */
  var $ = function (id) { return document.getElementById(id); };
  // Filas compactas con UN menú «…» (ZOO_ADMIN_FILAS). Cada acción lleva el mismo data-* que ya escuchan los clics de cada pestaña.
  function tileFila(icono, tono) { var I = window.ZOO_ICONOS; return '<span class="ap-ico-tile ap-tono-' + tono + '" aria-hidden="true">' + (I && I.svg ? I.svg(icono, { size: 18 }) : '') + '</span>'; }
  function listaFilas(filas, etiqueta) { return window.ZOO_ADMIN_FILAS.lista(filas, { etiqueta: etiqueta }); }
  function opciones(lista, actual) { return lista.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === actual ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); }
  function fecha(v) {
    var d = v ? new Date(v) : null;
    return d && !isNaN(d.getTime()) ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  }

  /* opciones: { contenedor, base, getToken():Promise<string>, toast(msg, esError), confirmar(msg):boolean } */
  function montar(o) {
    var cont = o.contenedor;
    var tab = 'noticias', plantilla = 'verde';

    function api(ruta, op) {
      op = op || {};
      return Promise.resolve(o.getToken()).then(function (token) {
        var h = { Authorization: 'Bearer ' + token };
        if (op.body) h['Content-Type'] = 'application/json';
        return fetch(o.base + ruta, { method: op.method || 'GET', headers: h, body: op.body ? JSON.stringify(op.body) : undefined, cache: 'no-store' });
      }, function () { throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.'); }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!res.ok) throw new Error((data && data.error) || 'El servidor no pudo completar la acción (' + res.status + ').');
          return data;
        });
      }, function () { throw new Error('No hay conexión con el servidor.'); });
    }
    function aviso(msg, malo) { if (o.toast) o.toast(msg, !!malo); }
    function falla(e) { aviso(e && e.message ? e.message : 'Algo salió mal.', true); }

    function pintarBase() {
      cont.innerHTML = '<h1>Noticias y avisos</h1><p class="sub">Noticias del sector, datos curiosos y avisos para la campana de los miembros</p>' +
        '<div class="an-tabs" role="tablist">' +
          [['noticias', 'Noticias'], ['datos', 'Datos curiosos'], ['avisos', 'Avisos a todos']].map(function (t) { return '<button type="button" role="tab" class="an-tab' + (tab === t[0] ? ' is-active' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
        '</div><div id="anCuerpo"><p>Cargando…</p></div>';
      cont.querySelector('.an-tabs').addEventListener('click', function (e) {
        var b = e.target.closest('.an-tab'); if (!b) return; tab = b.dataset.tab; pintarBase(); cargar();
      });
    }

    /* Cada pintura empieza con un contenedor limpio, para que los clics no se acumulen de una carga a otra. */
    function cuerpoNuevo() { var v = $('anCuerpo'); var l = v.cloneNode(false); v.parentNode.replaceChild(l, v); return l; }

    /* ───── Noticias ───── */
    function previaNoticia() {
      var p = $('anPrevia'); if (!p || !window.ZOO_NOTICIAS) return;
      var f = { titulo: $('anTitulo').value || 'Título de la noticia', resumen: $('anResumen').value, categoria: $('anCat').value, fuente: $('anFuente').value || 'Equipo Zoorigen',
        imagen: $('anImg').value, link: $('anLink').value, plantilla: plantilla, fecha: new Date().toISOString(), origen: 'admin' };
      p.innerHTML = window.ZOO_NOTICIAS.hojaHTML(f, 0, {});
      var h = p.querySelector('.hoja'); if (h) { h.style.pointerEvents = 'none'; h.removeAttribute('tabindex'); }
    }
    function pintarNoticias(lista) {
      var c = cuerpoNuevo();
      c.innerHTML =
        '<div class="an-grid">' +
          '<div class="an-card"><h3>Publicar una noticia</h3>' +
            '<div class="an-plantillas" id="anPlantillas">' + PLANTILLAS.map(function (p) { return '<button type="button" class="an-plantilla an-plantilla--' + p[0] + (p[0] === plantilla ? ' is-active' : '') + '" data-p="' + p[0] + '"><i></i><span>' + p[1] + '</span></button>'; }).join('') + '</div>' +
            '<div class="field"><label>Título *</label><input id="anTitulo" maxlength="140" placeholder="Qué pasó, en una frase"></div>' +
            '<div class="field"><label>Lo esencial * <small>(una idea por línea)</small></label><textarea id="anResumen" rows="5" maxlength="1500" placeholder="Primera idea&#10;Segunda idea"></textarea></div>' +
            '<div class="an-dos"><div class="field"><label>Categoría</label><select id="anCat">' + opciones(CATEGORIAS, 'fauna') + '</select></div>' +
            '<div class="field"><label>Fuente</label><input id="anFuente" maxlength="60" placeholder="Equipo Zoorigen"></div></div>' +
            '<div class="field"><label>Enlace a la nota original <small>(https, opcional)</small></label><input id="anLink" placeholder="https://"></div>' +
            '<div class="field"><label>Imagen <small>(https, opcional; si no hay, se usa una foto del sitio según la categoría)</small></label><input id="anImg" placeholder="https://"></div>' +
            '<label class="an-check"><input type="checkbox" id="anAvisar" checked> Avisar a todos en la campana</label>' +
            '<div class="modal-actions" style="justify-content:flex-start;gap:10px;"><button class="btn-save" id="anPublicar">Publicar</button><button class="btn-cancel" id="anSync" type="button">Buscar noticias ahora</button></div>' +
            '<div id="anSyncRes" class="an-nota"></div>' +
          '</div>' +
          '<div class="an-card"><h3>Así se verá</h3><div id="anPrevia" class="an-previa"></div><p class="an-nota">Las noticias automáticas llegan solas cada mañana. Las que publiques aquí no caducan.</p></div>' +
        '</div>' +
        '<h3 class="an-subtitulo">Noticias publicadas (' + lista.length + ')</h3>' +
        (lista.length ? listaFilas(lista.map(function (n) {
          var acc = [];
          if (n.link) acc.push({ t: 'Ver la nota original', i: 'external-link', h: n.link });
          acc.push({ t: 'Eliminar noticia', i: 'trash-2', d: { borrarNoticia: n.id }, p: true, sep: !!n.link });
          return window.ZOO_ADMIN_FILAS.fila({
            clase: 'ap-fc--meta2', avatar: tileFila('newspaper', 'info'), titulo: n.titulo,
            meta: esc(n.fuente || '—') + ' · ' + esc(n.categoriaNombre || n.categoria || '') + ' · ' + esc(fecha(n.fecha || n.creadoEn)) + ' · ' + esc(origenTexto(n.origen)),
            acciones: acc, etiquetaMenu: 'Acciones de la noticia ' + n.titulo
          });
        }), 'Noticias publicadas') : '<div class="no-data">Todavía no hay noticias. Pulsa “Buscar noticias ahora” o publica la primera.</div>');
      ['anTitulo', 'anResumen', 'anCat', 'anFuente', 'anLink', 'anImg'].forEach(function (id) { $(id).addEventListener('input', previaNoticia); });
      $('anPlantillas').addEventListener('click', function (e) {
        var b = e.target.closest('.an-plantilla'); if (!b) return; plantilla = b.dataset.p;
        c.querySelectorAll('.an-plantilla').forEach(function (x) { x.classList.toggle('is-active', x === b); }); previaNoticia();
      });
      previaNoticia();
      $('anPublicar').addEventListener('click', function () {
        var v = validarNoticia({ titulo: $('anTitulo').value, resumen: $('anResumen').value, categoria: $('anCat').value, fuente: $('anFuente').value, imagen: $('anImg').value, link: $('anLink').value, plantilla: plantilla, avisar: $('anAvisar').checked });
        if (!v.ok) return aviso(v.error, true);
        $('anPublicar').disabled = true;
        api('/api/admin/noticias', { method: 'POST', body: v.datos }).then(function () { aviso('Noticia publicada'); cargar(); }, falla).then(function () { var b = $('anPublicar'); if (b) b.disabled = false; });
      });
      $('anSync').addEventListener('click', function () {
        var b = $('anSync'); b.disabled = true; b.textContent = 'Buscando…';
        api('/api/admin/noticias/sync', { method: 'POST', body: {} }).then(function (r) {
          var ok = (r.fuentes || []).filter(function (f) { return f.ok; }).length, tot = (r.fuentes || []).length;
          $('anSyncRes').textContent = 'Listo: ' + (r.guardadas || 0) + ' noticia(s) nueva(s). Fuentes que respondieron: ' + ok + ' de ' + tot + '.';
          if (r.guardadas) cargar();
        }, falla).then(function () { var x = $('anSync'); if (x) { x.disabled = false; x.textContent = 'Buscar noticias ahora'; } });
      });
      c.addEventListener('click', function (e) {
        var b = e.target.closest('[data-borrar-noticia]'); if (!b) return;
        if (o.confirmar && !o.confirmar('¿Eliminar esta noticia?')) return;
        api('/api/admin/noticias/' + encodeURIComponent(b.dataset.borrarNoticia) + '/eliminar', { method: 'POST', body: {} }).then(function () { aviso('Noticia eliminada'); cargar(); }, falla);
      });
    }

    /* ───── Datos curiosos ───── */
    function pintarDatos(lista) {
      var c = cuerpoNuevo();
      var activos = lista.filter(function (d) { return d.activo !== false; }).length;
      c.innerHTML =
        '<div class="an-grid"><div class="an-card"><h3>Agregar un dato curioso</h3>' +
          '<div class="field"><label>Dato * <small id="anCont">0 / 300</small></label><textarea id="anDato" rows="4" maxlength="300" placeholder="Un dato breve, claro y verificable"></textarea></div>' +
          '<div class="an-dos"><div class="field"><label>Tema</label><select id="anTema">' + TEMAS.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label>Fuente <small>(recomendado)</small></label><input id="anDFuente" maxlength="80" placeholder="Ej. CONABIO"></div></div>' +
          '<label class="an-check"><input type="checkbox" id="anYa"> Enviarlo ahora a todos en la campana</label>' +
          '<div class="modal-actions" style="justify-content:flex-start;"><button class="btn-save" id="anAgregarDato">Agregar</button></div></div>' +
        '<div class="an-card"><h3>Cómo funciona</h3><p class="an-nota">Se envía un dato por notificación cada <strong>martes y viernes</strong>. Se elige el que menos veces se ha enviado. Hoy hay <strong>' + activos + '</strong> activos de ' + lista.length + '. Pausa un dato si dejó de ser exacto. <strong>Solo agrega datos que hayas verificado.</strong></p></div></div>' +
        '<h3 class="an-subtitulo">Banco de datos (' + lista.length + ')</h3>' +
        (lista.length ? listaFilas(lista.map(function (d) {
          var pausado = d.activo === false;
          return window.ZOO_ADMIN_FILAS.fila({
            clase: 'ap-fc--meta2', avatar: tileFila('sparkles', pausado ? 'neutro' : 'ok'), titulo: d.texto,
            meta: esc(d.tema || 'General') + (d.fuente ? ' · ' + esc(d.fuente) : '') + ' · enviado ' + (d.veces || 0) + ' vez/veces' + (d.ultimoEnvio ? ' · último: ' + esc(d.ultimoEnvio) : ''),
            estado: pausado ? '<span class="ap-badge ap-badge--apagado"><span>En pausa</span></span>' : '<span class="ap-badge ap-badge--ok"><span>Activo</span></span>',
            acciones: [
              { t: 'Enviar ahora a todos', i: 'send', d: { datoEnviar: d.id } },
              { t: pausado ? 'Activar dato' : 'Pausar dato', i: pausado ? 'play' : 'pause', d: { datoPausa: d.id, activo: pausado ? '1' : '0' } },
              { t: 'Eliminar dato', i: 'trash-2', d: { datoBorrar: d.id }, p: true, sep: true }
            ],
            etiquetaMenu: 'Acciones del dato curioso'
          });
        }), 'Banco de datos curiosos') : '<div class="no-data">El banco está vacío.</div>');
      var area = $('anDato'); area.addEventListener('input', function () { $('anCont').textContent = area.value.length + ' / 300'; });
      $('anAgregarDato').addEventListener('click', function () {
        var v = validarDato({ texto: area.value, tema: $('anTema').value, fuente: $('anDFuente').value, enviarYa: $('anYa').checked });
        if (!v.ok) return aviso(v.error, true);
        api('/api/admin/datos-curiosos', { method: 'POST', body: v.datos }).then(function () { aviso('Dato agregado'); cargar(); }, falla);
      });
      c.addEventListener('click', function (e) {
        var t = e.target;
        var env = t.closest('[data-dato-enviar]'), pau = t.closest('[data-dato-pausa]'), bor = t.closest('[data-dato-borrar]');
        if (env) { if (o.confirmar && !o.confirmar('¿Enviar este dato ahora a todos los miembros?')) return; api('/api/admin/datos-curiosos/' + encodeURIComponent(env.dataset.datoEnviar) + '/enviar', { method: 'POST', body: {} }).then(function () { aviso('Dato enviado'); cargar(); }, falla); }
        else if (pau) api('/api/admin/datos-curiosos/' + encodeURIComponent(pau.dataset.datoPausa) + '/actualizar', { method: 'POST', body: { activo: pau.dataset.activo === '1' } }).then(function () { cargar(); }, falla);
        else if (bor) { if (o.confirmar && !o.confirmar('¿Eliminar este dato?')) return; api('/api/admin/datos-curiosos/' + encodeURIComponent(bor.dataset.datoBorrar) + '/eliminar', { method: 'POST', body: {} }).then(function () { aviso('Dato eliminado'); cargar(); }, falla); }
      });
    }

    /* ───── Avisos globales ───── */
    function pintarAvisos(lista) {
      var c = cuerpoNuevo();
      c.innerHTML =
        '<div class="an-grid"><div class="an-card"><h3>Enviar un aviso a todos</h3>' +
          '<div class="an-dos"><div class="field"><label>Tipo</label><select id="avTipo">' + opciones(TIPOS_AVISO, 'general') + '</select></div>' +
          '<div class="field"><label>Al tocarlo lleva a</label><select id="avEnlace">' + opciones(ENLACES, '') + '</select></div></div>' +
          '<div class="field"><label>Título *</label><input id="avTitulo" maxlength="120" placeholder="Ej. Nuevo curso disponible"></div>' +
          '<div class="field"><label>Descripción *</label><textarea id="avDesc" rows="3" maxlength="320" placeholder="Qué quieres que sepan"></textarea></div>' +
          '<div class="modal-actions" style="justify-content:flex-start;"><button class="btn-save" id="avEnviar">Enviar a todos</button></div></div>' +
        '<div class="an-card"><h3>Vista previa</h3><div class="an-aviso" id="avPrevia"></div><p class="an-nota">Aparece en la campana de todos los miembros. Cada persona puede borrarlo de su lista.</p></div></div>' +
        '<h3 class="an-subtitulo">Avisos recientes (' + lista.length + ')</h3>' +
        (lista.length ? listaFilas(lista.map(function (a) {
          return window.ZOO_ADMIN_FILAS.fila({
            clase: 'ap-fc--meta2', avatar: tileFila('bell', 'aviso'), titulo: a.titulo,
            meta: esc(a.descripcion || a.texto || '') + ' · ' + esc(a.tipo || '') + ' · ' + esc(fecha(a.fecha || a.creadoEn)),
            acciones: [{ t: 'Eliminar aviso', i: 'trash-2', d: { avisoBorrar: a.id }, p: true }], etiquetaMenu: 'Acciones del aviso ' + a.titulo
          });
        }), 'Avisos recientes') : '<div class="no-data">Todavía no hay avisos.</div>');
      function previa() { $('avPrevia').innerHTML = '<strong>' + esc($('avTitulo').value || 'Título del aviso') + '</strong><span>' + esc($('avDesc').value || 'Aquí va la descripción.') + '</span>'; }
      ['avTitulo', 'avDesc'].forEach(function (id) { $(id).addEventListener('input', previa); }); previa();
      $('avEnviar').addEventListener('click', function () {
        var v = validarAviso({ tipo: $('avTipo').value, titulo: $('avTitulo').value, descripcion: $('avDesc').value, enlace: $('avEnlace').value });
        if (!v.ok) return aviso(v.error, true);
        if (o.confirmar && !o.confirmar('Se enviará a TODOS los miembros. ¿Continuar?')) return;
        api('/api/admin/avisos', { method: 'POST', body: v.datos }).then(function () { aviso('Aviso enviado'); cargar(); }, falla);
      });
      c.addEventListener('click', function (e) {
        var b = e.target.closest('[data-aviso-borrar]'); if (!b) return;
        if (o.confirmar && !o.confirmar('¿Eliminar este aviso para todos?')) return;
        api('/api/admin/avisos/' + encodeURIComponent(b.dataset.avisoBorrar) + '/eliminar', { method: 'POST', body: {} }).then(function () { aviso('Aviso eliminado'); cargar(); }, falla);
      });
    }

    function cargar() {
      var ruta = tab === 'noticias' ? '/api/admin/noticias' : (tab === 'datos' ? '/api/admin/datos-curiosos' : '/api/admin/avisos');
      return api(ruta).then(function (r) {
        var lista = (r && (r.noticias || r.datos || r.avisos)) || [];
        if (tab === 'noticias') pintarNoticias(lista); else if (tab === 'datos') pintarDatos(lista); else pintarAvisos(lista);
      }, function (e) {
        var c = $('anCuerpo'); if (c) c.innerHTML = '<div class="error-msg show">' + esc(e.message) + '</div>';
      });
    }

    pintarBase();
    return cargar();
  }

  API.montar = montar;
  return API;
});
