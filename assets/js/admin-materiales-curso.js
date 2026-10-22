/* Editor de materiales del curso. Usa los mismos documentos pdfs que la biblioteca. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZOO_ADMIN_MATERIALES_CURSO = factory();
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function driveId(v) {
    const s = String(v || '').trim();
    if (/^[\w-]{15,200}$/.test(s)) return s;
    try { const u = new URL(s); if (u.protocol !== 'https:' || u.hostname !== 'drive.google.com') return '';
      const id = (u.pathname.match(/\/file\/d\/([\w-]+)/) || [])[1] || u.searchParams.get('id') || '';
      return /^[\w-]{15,200}$/.test(id) ? id : '';
    } catch (_) { return ''; }
  }
  function validar(items, clases) {
    if (items.length > 200) throw new Error('El curso admite hasta 200 materiales.');
    return items.map((m, i) => {
      const title = String(m.title || '').trim(), id = driveId(m.driveId);
      if (!title || title.length > 140) throw new Error('Material ' + (i + 1) + ': escribe un título de hasta 140 caracteres.');
      if (!id) throw new Error('Material ' + (i + 1) + ': revisa el enlace o ID de Google Drive.');
      const clase = m.claseRef ? clases.indexOf(m.claseRef) + 1 : Number(m.clase || 0);
      if ((m.claseRef && !clase) || !Number.isInteger(clase) || clase < 0 || clase > clases.length)
        throw new Error('Material ' + (i + 1) + ': elige de nuevo la clase que lo desbloquea.');
      const pages = m.pages === '' || m.pages == null ? null : Number(m.pages);
      if (pages !== null && (!Number.isInteger(pages) || pages < 1 || pages > 2000)) throw new Error('Material ' + (i + 1) + ': revisa el número de páginas.');
      return { title, driveId: id, clase, pages };
    });
  }
  function montar(o) {
    const box = o.contenedor;
    let items = [], originales = [], cargado = !o.cursoId, error = '', nativos = [];
    let secuencia = 0;
    const boton = document.getElementById('ceGuardar');
    const claseDe = m => m.claseRef ? o.clases().indexOf(m.claseRef) + 1 || -1 : Number(m.clase || 0);
    function pintar() {
      if (boton) boton.disabled = !cargado;
      box.innerHTML = '<div class="ce-materiales__head"><div><h4>Materiales descargables (PDFs, Excel, etc.)</h4><p class="ce-ayuda">Documentos del curso y de sus clases. Los cambios se guardan junto con el curso.</p></div>' +
        (cargado ? '<button type="button" class="ce-agregar" data-mat="agregar">+ Agregar material</button>' : '') + '</div>' +
        (!cargado ? '<p role="status">' + esc(error || 'Cargando los materiales del curso…') + '</p>' + (error ? '<button type="button" class="ce-agregar" data-mat="reintentar">Reintentar</button>' : '') : '') +
        items.map((m, i) => '<article class="ce-material" data-material="' + m.key + '"><div class="ce-material__titulo"><strong>Material ' + (i + 1) + '</strong><button type="button" class="ce-mover" data-mat="quitar" aria-label="Quitar material ' + (i + 1) + '">×</button></div>' +
          '<label class="ce-campo"><span>Título *</span><input class="ce-input" data-campo="title" maxlength="140" value="' + esc(m.title) + '"></label>' +
          '<label class="ce-campo"><span>Enlace o ID de Google Drive *</span><input class="ce-input" data-campo="driveId" value="' + esc(m.driveId) + '"></label>' +
          '<label class="ce-campo"><span>Disponibilidad</span><select class="ce-input" data-campo="clase">' + (claseDe(m) < 0 ? '<option value="-1" selected>La clase se eliminó: elige otra disponibilidad</option>' : '') +
            '<option value="0"' + (!claseDe(m) ? ' selected' : '') + '>Todo el curso · con membresía</option>' + o.clases().map((l, k) => '<option value="' + (k + 1) + '"' + (claseDe(m) === k + 1 ? ' selected' : '') + '>Al terminar la clase ' + (k + 1) + ' · ' + esc(l.titulo || 'Sin título') + '</option>').join('') + '</select></label>' +
          '<label class="ce-campo"><span>Páginas (opcional)</span><input class="ce-input" data-campo="pages" type="number" min="1" max="2000" value="' + esc(m.pages || '') + '"></label></article>').join('') +
        (cargado && !items.length ? '<p class="ce-ayuda">No hay documentos de Drive vinculados. Agrega un material para que aparezca en la biblioteca y en este curso.</p>' : '') +
        nativos.map(m => '<article class="ce-material"><strong>' + esc(m.titulo) + '</strong><p class="ce-ayuda">Archivo del sitio · ' + (m.clase ? 'Al terminar la clase ' + esc(m.clase) : 'Todo el curso') + '. Se mantiene en el catálogo de archivos.</p></article>').join('');
    }
    async function cargar() {
      cargado = !o.cursoId; error = ''; pintar();
      if (!o.cursoId) return;
      try {
        const snap = await o.db.collection('pdfs').where('cursoId', '==', o.cursoId).get();
        originales = snap.docs.map(d => ({ ...d.data(), id:d.id }));
        items = originales.map(m => ({...m, key:++secuencia, claseRef: Number(m.clase) > 0 ? o.clases()[Number(m.clase)-1] : null}));
        cargado = true; pintar();
      } catch (e) { error = 'No se pudieron cargar los materiales. Reintenta antes de guardar. ' + e.message; pintar(); }
      if (o.api) {
        try { const r = await o.api('/api/admin/materiales'); nativos = (r.materiales || []).filter(m => m.cursoId === o.cursoId); pintar(); }
        catch (_) { /* Los documentos de Drive siguen disponibles; los archivos del catálogo no se modifican aquí. */ }
      }
    }
    box.addEventListener('input', ev => {
      const row = ev.target.closest('[data-material]'); if (!row) return;
      const m = items.find(x => x.key === Number(row.dataset.material));
      const campo = ev.target.dataset.campo;
      if (campo === 'clase') { m.clase = Number(ev.target.value); m.claseRef = o.clases()[m.clase - 1] || null; }
      else if (campo) m[campo] = ev.target.value;
    });
    box.addEventListener('click', ev => {
      const b = ev.target.closest('[data-mat]'); if (!b) return;
      if (b.dataset.mat === 'agregar') { items.push({key:++secuencia, title:'', driveId:'', clase:0}); pintar(); }
      if (b.dataset.mat === 'quitar') { const key = Number(b.closest('[data-material]').dataset.material); items = items.filter(m => m.key !== key); pintar(); }
      if (b.dataset.mat === 'reintentar') cargar();
    });
    cargar();
    return {
      refrescar: pintar,
      preparar(batch, cursoId, area, clasesGuardadas) {
        if (!cargado) throw new Error('Espera a que carguen los materiales antes de guardar.');
        const datos = validar(items, clasesGuardadas || o.clases());
        originales.filter(m => !items.some(x => x.id === m.id)).forEach(m => batch.delete(o.db.collection('pdfs').doc(m.id)));
        datos.forEach((d, i) => {
          const ref = items[i].id ? o.db.collection('pdfs').doc(items[i].id) : o.db.collection('pdfs').doc();
          batch.set(ref, {...d, cursoId, area, ...(items[i].id ? {} : {createdAt:new Date().toISOString()})}, {merge:true});
        });
      }
    };
  }
  return { montar, driveId, validar };
});
