/* ============================================================ */
/* CLUB VIP ZOORIGEN - PANEL ADMIN                              */
/* CRUD completo para: cursos, videos, pdfs, sesiones, noticias */
/* Gestión de miembros                                           */
/* ============================================================ */

(async () => {
  const session = await ZOORIGEN_CLUB.requireAuth();
  if (!session) return;
  document.getElementById('sidebar').innerHTML = ZOORIGEN_CLUB.renderSidebar('admin', session);

  const root = document.getElementById('adminRoot');

  if (session.role !== 'admin') {
    root.innerHTML = `
      <div class="no-access">
        <h2>🔒 Acceso restringido</h2>
        <p>Esta sección es exclusiva para administradores del Club VIP Zoorigen.</p>
        <p style="margin-top:12px;font-size:.88rem;color:var(--zoo-text-dim);">
          Para darte rol admin: ve a Firebase Console → Firestore → miembros → tu documento → cambia <code>role: "admin"</code>
        </p>
        <a href="club-dashboard.html" class="btn-club-outline" style="display:inline-block;width:auto;padding:12px 24px;margin-top:20px;">← Volver al dashboard</a>
      </div>`;
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // ESTRUCTURA DE TABS
  // ═══════════════════════════════════════════════════════════
  root.innerHTML = `
    <div class="admin-tabs">
      <button class="admin-tab is-active" data-panel="miembros">👥 Miembros</button>
      <button class="admin-tab" data-panel="cursos">📚 Cursos</button>
      <button class="admin-tab" data-panel="videos">🎥 Videos</button>
      <button class="admin-tab" data-panel="pdfs">📄 PDFs</button>
      <button class="admin-tab" data-panel="sesiones">🔴 Sesiones</button>
      <button class="admin-tab" data-panel="noticias">📰 Noticias</button>
    </div>

    <div class="admin-panel is-active" data-panel="miembros"><div id="p-miembros">Cargando miembros...</div></div>
    <div class="admin-panel" data-panel="cursos"><div id="p-cursos">Cargando...</div></div>
    <div class="admin-panel" data-panel="videos"><div id="p-videos">Cargando...</div></div>
    <div class="admin-panel" data-panel="pdfs"><div id="p-pdfs">Cargando...</div></div>
    <div class="admin-panel" data-panel="sesiones"><div id="p-sesiones">Cargando...</div></div>
    <div class="admin-panel" data-panel="noticias"><div id="p-noticias">Cargando...</div></div>
  `;

  // Tab switching
  root.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      root.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('is-active'));
      root.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      root.querySelector(`.admin-panel[data-panel="${tab.dataset.panel}"]`).classList.add('is-active');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // HELPERS COMUNES
  // ═══════════════════════════════════════════════════════════
  const toast = (msg, isError = false) => {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => t.classList.remove('show'), 2800);
  };

  const openModal = (html) => {
    document.getElementById('modalForm').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('is-open');
  };
  const closeModal = () => document.getElementById('modalOverlay').classList.remove('is-open');

  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeModal();
  });

  // Extrae el ID de un link de Google Drive
  const extractDriveId = (url) => {
    if (!url) return '';
    // Si ya es solo el ID
    if (/^[a-zA-Z0-9_-]{15,}$/.test(url.trim())) return url.trim();
    // Formato: /file/d/ID/view
    const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    // Formato: ?id=ID
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    return url.trim();
  };

  // ═══════════════════════════════════════════════════════════
  // 1. PANEL MIEMBROS
  // ═══════════════════════════════════════════════════════════
  async function loadMiembros() {
    const panel = document.getElementById('p-miembros');
    try {
      const snap = await db.collection('miembros').orderBy('createdAt', 'desc').get();
      const members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderMiembros(panel, members);
    } catch (err) {
      panel.innerHTML = `<div class="error-msg show">Error: ${err.message}</div>`;
    }
  }

  function renderMiembros(panel, members, filter = '') {
    const filtered = filter
      ? members.filter(m => (m.name || '').toLowerCase().includes(filter.toLowerCase()) ||
                             (m.email || '').toLowerCase().includes(filter.toLowerCase()) ||
                             (m.phone || '').includes(filter))
      : members;

    const active = members.filter(m => m.planActivo && !m.planCancelado);
    const pending = members.filter(m => !m.planActivo);
    const cancelled = members.filter(m => m.planCancelado);
    const mrr = active.reduce((sum, m) => sum + (m.planTipo === 'anual' ? 1899/12 : 199), 0);

    panel.innerHTML = `
      <div class="admin-stats">
        <div class="stat-box"><div class="stat-box__label">Total</div><div class="stat-box__value">${members.length}</div></div>
        <div class="stat-box green"><div class="stat-box__label">Activos VIP</div><div class="stat-box__value">${active.length}</div></div>
        <div class="stat-box amber"><div class="stat-box__label">Pendientes</div><div class="stat-box__value">${pending.length}</div></div>
        <div class="stat-box orange"><div class="stat-box__label">Cancelados</div><div class="stat-box__value">${cancelled.length}</div></div>
        <div class="stat-box green"><div class="stat-box__label">MRR</div><div class="stat-box__value">$${Math.round(mrr).toLocaleString('es-MX')}</div></div>
      </div>

      <input type="search" class="admin-search" id="searchMembers" placeholder="🔎 Buscar nombre, correo o WhatsApp..." value="${filter}">

      <div class="mtable">
        <table>
          <thead><tr><th>Miembro</th><th>Correo</th><th>Estado</th><th>Plan</th><th>Vence</th><th>Acciones</th></tr></thead>
          <tbody>
            ${filtered.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--zoo-text-dim);">Sin resultados</td></tr>` : filtered.map(m => {
              const status = m.planActivo && !m.planCancelado ? 'active' : m.planCancelado ? 'cancelled' : 'pending';
              const label = { active: '● Activo', pending: '⏳ Pendiente', cancelled: '✕ Cancelado' }[status];
              const name = (m.name || '—').replace(/'/g, "\\'");
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div style="width:32px;height:32px;border-radius:50%;background:var(--zoo-green-900);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.78rem;color:var(--zoo-green-500);">${ZOORIGEN_CLUB.getInitials(m.name)}</div>
                      <div><div style="font-weight:600;">${m.name || '—'}</div>
                      <div style="font-size:.74rem;color:var(--zoo-text-dim);">${m.role === 'admin' ? '⚙️ Admin' : 'Miembro'}</div></div>
                    </div>
                  </td>
                  <td style="font-size:.82rem;">${m.email || '—'}</td>
                  <td><span class="status-pill ${status}">${label}</span></td>
                  <td style="font-size:.82rem;">${m.planTipo ? (m.planTipo === 'anual' ? 'Anual' : 'Mensual') : '—'}</td>
                  <td style="font-size:.82rem;">${m.planVence ? ZOORIGEN_CLUB.formatShort(m.planVence) : '—'}</td>
                  <td>
                    ${status !== 'active' ? `<button class="btn-small activate" onclick="adminActivar('${m.id}','${name}')">Activar</button>` : ''}
                    ${status === 'active' ? `<button class="btn-small cancel" onclick="adminCancelar('${m.id}','${name}')">Cancelar</button>` : ''}
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    panel._members = members;
    document.getElementById('searchMembers').addEventListener('input', (e) => renderMiembros(panel, members, e.target.value));
  }

  window.adminActivar = async (uid, name) => {
    const tipo = prompt(`Activar plan para ${name}:\n\nEscribe "mensual" (30 días) o "anual" (365 días):`, 'mensual');
    if (!tipo) return;
    const dias = tipo.toLowerCase() === 'anual' ? 365 : 30;
    try {
      const now = new Date();
      const vence = new Date(now.getTime() + dias * 86400000);
      await db.collection('miembros').doc(uid).update({
        planActivo: true, planCancelado: false,
        planTipo: tipo.toLowerCase() === 'anual' ? 'anual' : 'mensual',
        planInicio: now.toISOString(), planVence: vence.toISOString(), ultimoPago: now.toISOString()
      });
      toast('✅ Plan activado');
      loadMiembros();
    } catch (err) { toast('Error: ' + err.message, true); }
  };

  window.adminCancelar = async (uid, name) => {
    if (!confirm(`¿Cancelar membresía de ${name}?`)) return;
    try {
      await db.collection('miembros').doc(uid).update({
        planCancelado: true, canceladoEn: new Date().toISOString()
      });
      toast('✅ Cancelado');
      loadMiembros();
    } catch (err) { toast('Error: ' + err.message, true); }
  };

  // ═══════════════════════════════════════════════════════════
  // 2. PANEL CURSOS (CRUD)
  // ═══════════════════════════════════════════════════════════
  const AREAS = ['Fauna silvestre', 'Fauna ponzoñosa', 'Apicultura', 'Etología', 'Investigación', 'Manejo en cautiverio', 'Conservación'];

  async function loadCursos() {
    const panel = document.getElementById('p-cursos');
    try {
      const snap = await db.collection('cursos').orderBy('createdAt', 'desc').get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      panel.innerHTML = `
        <div class="content-toolbar">
          <div>
            <strong style="color:#fff;font-size:1rem;">${items.length} curso${items.length !== 1 ? 's' : ''}</strong>
            <p style="color:var(--zoo-text-dim);font-size:.84rem;margin-top:2px;">Contenido completo de la biblioteca VIP</p>
          </div>
          <button class="btn-add" onclick="formCurso()">+ Nuevo curso</button>
        </div>
        <div class="admin-content-list">
          ${items.length === 0 ? '<div class="no-data">Aún no hay cursos. Clic en "+ Nuevo curso" para empezar.</div>' :
            items.map(c => `
              <div class="admin-content-item">
                <div class="admin-content-item__thumb" ${c.image ? `style="background-image:url('${c.image}');"` : ''}>${c.image ? '' : '🎓'}</div>
                <div class="admin-content-item__info">
                  <div class="admin-content-item__title">${c.title}</div>
                  <div class="admin-content-item__meta">${c.area} · ${c.duration || '—'} · ${c.level || '—'}${c.tag ? ' · 🏷️ ' + c.tag : ''}</div>
                </div>
                <div class="admin-content-item__actions">
                  <button class="btn-small edit" onclick='formCurso(${JSON.stringify(c).replace(/'/g,"&#39;")})'>Editar</button>
                  <button class="btn-small delete" onclick="delDoc('cursos','${c.id}','${(c.title || '').replace(/'/g,"\\'")}')">Eliminar</button>
                </div>
              </div>`).join('')}
        </div>`;
    } catch (err) { panel.innerHTML = `<div class="error-msg show">Error: ${err.message}</div>`; }
  }

  window.formCurso = (data = {}) => {
    openModal(`
      <h3>${data.id ? '✏️ Editar' : '➕ Nuevo'} curso</h3>
      <div class="field">
        <label>Título *</label>
        <input type="text" id="f_title" value="${data.title || ''}" placeholder="Ej. Fototrampeo de jaguares">
      </div>
      <div class="field">
        <label>Área *</label>
        <select id="f_area">${AREAS.map(a => `<option ${data.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label>Duración</label>
        <input type="text" id="f_duration" value="${data.duration || ''}" placeholder="Ej. 6 h">
      </div>
      <div class="field">
        <label>Nivel</label>
        <select id="f_level">
          <option value="Básico" ${data.level === 'Básico' ? 'selected' : ''}>Básico</option>
          <option value="Intermedio" ${data.level === 'Intermedio' ? 'selected' : ''}>Intermedio</option>
          <option value="Avanzado" ${data.level === 'Avanzado' ? 'selected' : ''}>Avanzado</option>
        </select>
      </div>
      <div class="field">
        <label>Link o ID de Google Drive (video del curso)</label>
        <input type="text" id="f_drive" value="${data.driveId || ''}" placeholder="Pega el link completo de Drive o solo el ID">
        <p class="hint">En Drive: clic derecho al video → Compartir → "Cualquiera con el link" → Copiar link</p>
      </div>
      <div class="field">
        <label>URL de imagen de portada (opcional)</label>
        <input type="text" id="f_image" value="${data.image || ''}" placeholder="https://...jpg o ruta relativa">
        <p class="hint">Puedes usar las imágenes existentes: <code>../assets/img/cursos/nombre.jpg</code></p>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea id="f_desc" placeholder="Breve descripción del curso">${data.description || ''}</textarea>
      </div>
      <div class="field">
        <label>Tag destacado (opcional)</label>
        <input type="text" id="f_tag" value="${data.tag || ''}" placeholder="Ej. Más visto, Nuevo, Popular">
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeM()">Cancelar</button>
        <button class="btn-save" onclick="saveCurso('${data.id || ''}')">${data.id ? 'Guardar cambios' : 'Crear curso'}</button>
      </div>
    `);
  };

  window.saveCurso = async (id) => {
    const data = {
      title: document.getElementById('f_title').value.trim(),
      area: document.getElementById('f_area').value,
      duration: document.getElementById('f_duration').value.trim(),
      level: document.getElementById('f_level').value,
      driveId: extractDriveId(document.getElementById('f_drive').value),
      image: document.getElementById('f_image').value.trim(),
      description: document.getElementById('f_desc').value.trim(),
      tag: document.getElementById('f_tag').value.trim()
    };
    if (!data.title) { toast('Título es requerido', true); return; }
    try {
      if (id) {
        await db.collection('cursos').doc(id).update(data);
        toast('✅ Curso actualizado');
      } else {
        data.createdAt = new Date().toISOString();
        await db.collection('cursos').add(data);
        toast('✅ Curso creado');
      }
      closeModal();
      loadCursos();
    } catch (err) { toast('Error: ' + err.message, true); }
  };

  // ═══════════════════════════════════════════════════════════
  // 3. PANEL VIDEOS (CRUD)
  // ═══════════════════════════════════════════════════════════
  async function loadVideos() {
    const panel = document.getElementById('p-videos');
    try {
      const snap = await db.collection('videos').orderBy('createdAt', 'desc').get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      panel.innerHTML = `
        <div class="content-toolbar">
          <div>
            <strong style="color:#fff;font-size:1rem;">${items.length} video${items.length !== 1 ? 's' : ''}</strong>
            <p style="color:var(--zoo-text-dim);font-size:.84rem;margin-top:2px;">Videos prácticos cortos de técnicas de campo</p>
          </div>
          <button class="btn-add" onclick="formVideo()">+ Nuevo video</button>
        </div>
        <div class="admin-content-list">
          ${items.length === 0 ? '<div class="no-data">Aún no hay videos.</div>' :
            items.map(v => `
              <div class="admin-content-item">
                <div class="admin-content-item__thumb" style="background:var(--zoo-orange);">🎥</div>
                <div class="admin-content-item__info">
                  <div class="admin-content-item__title">${v.title}</div>
                  <div class="admin-content-item__meta">${v.area} · ${v.duration || '—'}</div>
                </div>
                <div class="admin-content-item__actions">
                  <button class="btn-small edit" onclick='formVideo(${JSON.stringify(v).replace(/'/g,"&#39;")})'>Editar</button>
                  <button class="btn-small delete" onclick="delDoc('videos','${v.id}','${(v.title || '').replace(/'/g,"\\'")}')">Eliminar</button>
                </div>
              </div>`).join('')}
        </div>`;
    } catch (err) { panel.innerHTML = `<div class="error-msg show">Error: ${err.message}</div>`; }
  }

  window.formVideo = (data = {}) => {
    openModal(`
      <h3>${data.id ? '✏️ Editar' : '➕ Nuevo'} video</h3>
      <div class="field"><label>Título *</label><input type="text" id="f_title" value="${data.title || ''}" placeholder="Ej. Cómo colocar una cámara trampa"></div>
      <div class="field"><label>Área *</label><select id="f_area">${AREAS.map(a => `<option ${data.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
      <div class="field"><label>Duración</label><input type="text" id="f_duration" value="${data.duration || ''}" placeholder="Ej. 12 min"></div>
      <div class="field">
        <label>Link o ID de Google Drive *</label>
        <input type="text" id="f_drive" value="${data.driveId || ''}" placeholder="Link completo de Drive o solo el ID">
        <p class="hint">Drive → clic derecho → Compartir → "Cualquiera con el link"</p>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeM()">Cancelar</button>
        <button class="btn-save" onclick="saveVideo('${data.id || ''}')">${data.id ? 'Guardar' : 'Crear'}</button>
      </div>
    `);
  };

  window.saveVideo = async (id) => {
    const data = {
      title: document.getElementById('f_title').value.trim(),
      area: document.getElementById('f_area').value,
      duration: document.getElementById('f_duration').value.trim(),
      driveId: extractDriveId(document.getElementById('f_drive').value)
    };
    if (!data.title) { toast('Título requerido', true); return; }
    if (!data.driveId) { toast('Link de Drive requerido', true); return; }
    try {
      if (id) { await db.collection('videos').doc(id).update(data); toast('✅ Video actualizado'); }
      else { data.createdAt = new Date().toISOString(); await db.collection('videos').add(data); toast('✅ Video creado'); }
      closeModal(); loadVideos();
    } catch (err) { toast('Error: ' + err.message, true); }
  };

  // ═══════════════════════════════════════════════════════════
  // 4. PANEL PDFs (CRUD)
  // ═══════════════════════════════════════════════════════════
  async function loadPdfs() {
    const panel = document.getElementById('p-pdfs');
    try {
      const snap = await db.collection('pdfs').orderBy('createdAt', 'desc').get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      panel.innerHTML = `
        <div class="content-toolbar">
          <div>
            <strong style="color:#fff;font-size:1rem;">${items.length} PDF${items.length !== 1 ? 's' : ''}</strong>
            <p style="color:var(--zoo-text-dim);font-size:.84rem;margin-top:2px;">Material descargable y guías científicas</p>
          </div>
          <button class="btn-add" onclick="formPdf()">+ Nuevo PDF</button>
        </div>
        <div class="admin-content-list">
          ${items.length === 0 ? '<div class="no-data">Aún no hay PDFs.</div>' :
            items.map(p => `
              <div class="admin-content-item">
                <div class="admin-content-item__thumb" style="background:var(--zoo-blue);">📄</div>
                <div class="admin-content-item__info">
                  <div class="admin-content-item__title">${p.title}</div>
                  <div class="admin-content-item__meta">${p.area} · ${p.pages || '—'} páginas</div>
                </div>
                <div class="admin-content-item__actions">
                  <button class="btn-small edit" onclick='formPdf(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Editar</button>
                  <button class="btn-small delete" onclick="delDoc('pdfs','${p.id}','${(p.title || '').replace(/'/g,"\\'")}')">Eliminar</button>
                </div>
              </div>`).join('')}
        </div>`;
    } catch (err) { panel.innerHTML = `<div class="error-msg show">Error: ${err.message}</div>`; }
  }

  window.formPdf = (data = {}) => {
    openModal(`
      <h3>${data.id ? '✏️ Editar' : '➕ Nuevo'} PDF</h3>
      <div class="field"><label>Título *</label><input type="text" id="f_title" value="${data.title || ''}" placeholder="Ej. Guía de serpientes mexicanas"></div>
      <div class="field"><label>Área *</label><select id="f_area">${AREAS.map(a => `<option ${data.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
      <div class="field"><label>Páginas</label><input type="number" id="f_pages" value="${data.pages || ''}" placeholder="Ej. 48"></div>
      <div class="field">
        <label>Link o ID de Google Drive (PDF) *</label>
        <input type="text" id="f_drive" value="${data.driveId || ''}" placeholder="Link completo o solo el ID">
        <p class="hint">Drive → clic derecho al PDF → Compartir → "Cualquiera con el link"</p>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeM()">Cancelar</button>
        <button class="btn-save" onclick="savePdf('${data.id || ''}')">${data.id ? 'Guardar' : 'Crear'}</button>
      </div>
    `);
  };

  window.savePdf = async (id) => {
    const data = {
      title: document.getElementById('f_title').value.trim(),
      area: document.getElementById('f_area').value,
      pages: parseInt(document.getElementById('f_pages').value) || null,
      driveId: extractDriveId(document.getElementById('f_drive').value)
    };
    if (!data.title) { toast('Título requerido', true); return; }
    if (!data.driveId) { toast('Link de Drive requerido', true); return; }
    try {
      if (id) { await db.collection('pdfs').doc(id).update(data); toast('✅ PDF actualizado'); }
      else { data.createdAt = new Date().toISOString(); await db.collection('pdfs').add(data); toast('✅ PDF creado'); }
      closeModal(); loadPdfs();
    } catch (err) { toast('Error: ' + err.message, true); }
  };

  // ═══════════════════════════════════════════════════════════
  // 5. PANEL SESIONES EN VIVO (CRUD)
  // ═══════════════════════════════════════════════════════════
  async function loadSesiones() {
    const panel = document.getElementById('p-sesiones');
    try {
      const snap = await db.collection('sesiones').orderBy('date', 'asc').get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      panel.innerHTML = `
        <div class="content-toolbar">
          <div>
            <strong style="color:#fff;font-size:1rem;">${items.length} sesi${items.length !== 1 ? 'ones' : 'ón'}</strong>
            <p style="color:var(--zoo-text-dim);font-size:.84rem;margin-top:2px;">Masterclasses en vivo por Zoom</p>
          </div>
          <button class="btn-add" onclick="formSesion()">+ Nueva sesión</button>
        </div>
        <div class="admin-content-list">
          ${items.length === 0 ? '<div class="no-data">Aún no hay sesiones programadas.</div>' :
            items.map(s => `
              <div class="admin-content-item">
                <div class="admin-content-item__thumb" style="background:var(--zoo-orange);">🔴</div>
                <div class="admin-content-item__info">
                  <div class="admin-content-item__title">${s.title}</div>
                  <div class="admin-content-item__meta">${s.speaker || '—'} · ${ZOORIGEN_CLUB.formatShort(s.date)} · ${s.time || '19:00'}</div>
                </div>
                <div class="admin-content-item__actions">
                  <button class="btn-small edit" onclick='formSesion(${JSON.stringify(s).replace(/'/g,"&#39;")})'>Editar</button>
                  <button class="btn-small delete" onclick="delDoc('sesiones','${s.id}','${(s.title || '').replace(/'/g,"\\'")}')">Eliminar</button>
                </div>
              </div>`).join('')}
        </div>`;
    } catch (err) { panel.innerHTML = `<div class="error-msg show">Error: ${err.message}</div>`; }
  }

  window.formSesion = (data = {}) => {
    openModal(`
      <h3>${data.id ? '✏️ Editar' : '➕ Nueva'} sesión en vivo</h3>
      <div class="field"><label>Título *</label><input type="text" id="f_title" value="${data.title || ''}" placeholder="Ej. Fototrampeo de jaguares"></div>
      <div class="field"><label>Ponente</label><input type="text" id="f_speaker" value="${data.speaker || ''}" placeholder="Ej. Dr. Iván Coronel"></div>
      <div class="field"><label>Fecha *</label><input type="date" id="f_date" value="${data.date || ''}"></div>
      <div class="field"><label>Hora</label><input type="time" id="f_time" value="${data.time || '19:00'}"></div>
      <div class="field">
        <label>Link de Zoom *</label>
        <input type="text" id="f_zoom" value="${data.zoomUrl || ''}" placeholder="https://zoom.us/j/...">
        <p class="hint">Solo miembros VIP activos verán este link</p>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeM()">Cancelar</button>
        <button class="btn-save" onclick="saveSesion('${data.id || ''}')">${data.id ? 'Guardar' : 'Crear'}</button>
      </div>
    `);
  };

  window.saveSesion = async (id) => {
    const data = {
      title: document.getElementById('f_title').value.trim(),
      speaker: document.getElementById('f_speaker').value.trim(),
      date: document.getElementById('f_date').value,
      time: document.getElementById('f_time').value,
      zoomUrl: document.getElementById('f_zoom').value.trim()
    };
    if (!data.title) { toast('Título requerido', true); return; }
    if (!data.date) { toast('Fecha requerida', true); return; }
    try {
      if (id) { await db.collection('sesiones').doc(id).update(data); toast('✅ Sesión actualizada'); }
      else { data.createdAt = new Date().toISOString(); await db.collection('sesiones').add(data); toast('✅ Sesión creada'); }
      closeModal(); loadSesiones();
    } catch (err) { toast('Error: ' + err.message, true); }
  };

  // ═══════════════════════════════════════════════════════════
  // 6. PANEL NOTICIAS (ver auto + crear manuales)
  // ═══════════════════════════════════════════════════════════
  async function loadNoticias() {
    const panel = document.getElementById('p-noticias');
    try {
      const snap = await db.collection('noticias').orderBy('createdAt', 'desc').limit(30).get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      panel.innerHTML = `
        <div class="content-toolbar">
          <div>
            <strong style="color:#fff;font-size:1rem;">${items.length} noticia${items.length !== 1 ? 's' : ''}</strong>
            <p style="color:var(--zoo-text-dim);font-size:.84rem;margin-top:2px;">Las auto-sincronizadas aparecen cada 6 horas desde RSS de Mongabay, SciDev, DW y BBC Mundo</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn-small edit" onclick="syncNow()">🔄 Sync ahora</button>
            <button class="btn-add" onclick="formNoticia()">+ Noticia manual</button>
          </div>
        </div>
        <div class="admin-content-list">
          ${items.length === 0 ? '<div class="no-data">Aún no hay noticias. Clic en "Sync ahora" para traer las primeras.</div>' :
            items.map(n => `
              <div class="admin-content-item">
                <div class="admin-content-item__thumb" style="background:${n.auto ? 'var(--zoo-green-700)' : 'var(--zoo-amber)'};color:#fff;">${n.icon || '📰'}</div>
                <div class="admin-content-item__info">
                  <div class="admin-content-item__title">${n.title}</div>
                  <div class="admin-content-item__meta">${n.source || '—'} · ${n.auto ? '🤖 Auto' : '✍️ Manual'}${n.link ? ` · <a href="${n.link}" target="_blank" style="color:var(--zoo-green-500);">Ver original ↗</a>` : ''}</div>
                </div>
                <div class="admin-content-item__actions">
                  <button class="btn-small delete" onclick="delDoc('noticias','${n.id}','${(n.title || '').substring(0,30).replace(/'/g,"\\'")}')">Eliminar</button>
                </div>
              </div>`).join('')}
        </div>`;
    } catch (err) { panel.innerHTML = `<div class="error-msg show">Error: ${err.message}</div>`; }
  }

  window.syncNow = () => {
    toast('⏳ Las noticias se sincronizan automáticamente cada 6h desde Railway. Para forzar sync, ve a Railway → Logs.');
  };

  window.formNoticia = (data = {}) => {
    openModal(`
      <h3>${data.id ? '✏️ Editar' : '➕ Nueva'} noticia manual</h3>
      <div class="field"><label>Título *</label><input type="text" id="f_title" value="${data.title || ''}" placeholder="Ej. Nueva cría de cóndor en Baja California"></div>
      <div class="field"><label>Resumen</label><textarea id="f_summary" placeholder="Breve descripción (1-2 líneas)">${data.summary || ''}</textarea></div>
      <div class="field"><label>Fuente</label><input type="text" id="f_source" value="${data.source || ''}" placeholder="Ej. SEMARNAT / Zoorigen / CONANP"></div>
      <div class="field"><label>Link externo (opcional)</label><input type="text" id="f_link" value="${data.link || ''}" placeholder="https://..."></div>
      <div class="field"><label>Icono emoji</label><input type="text" id="f_icon" value="${data.icon || '📰'}" maxlength="2"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeM()">Cancelar</button>
        <button class="btn-save" onclick="saveNoticia('${data.id || ''}')">${data.id ? 'Guardar' : 'Publicar'}</button>
      </div>
    `);
  };

  window.saveNoticia = async (id) => {
    const data = {
      title: document.getElementById('f_title').value.trim(),
      summary: document.getElementById('f_summary').value.trim(),
      source: document.getElementById('f_source').value.trim() || 'Zoorigen',
      link: document.getElementById('f_link').value.trim(),
      icon: document.getElementById('f_icon').value.trim() || '📰',
      auto: false
    };
    if (!data.title) { toast('Título requerido', true); return; }
    try {
      if (id) { await db.collection('noticias').doc(id).update(data); toast('✅ Noticia actualizada'); }
      else { data.createdAt = new Date().toISOString(); await db.collection('noticias').add(data); toast('✅ Noticia publicada'); }
      closeModal(); loadNoticias();
    } catch (err) { toast('Error: ' + err.message, true); }
  };

  // ═══════════════════════════════════════════════════════════
  // HELPERS GLOBALES
  // ═══════════════════════════════════════════════════════════
  window.delDoc = async (col, id, name) => {
    if (!confirm(`¿Eliminar "${name}"?\n\nEsta acción no se puede deshacer.`)) return;
    try {
      await db.collection(col).doc(id).delete();
      toast('✅ Eliminado');
      const loaders = { cursos: loadCursos, videos: loadVideos, pdfs: loadPdfs, sesiones: loadSesiones, noticias: loadNoticias };
      if (loaders[col]) loaders[col]();
    } catch (err) { toast('Error: ' + err.message, true); }
  };

  window.closeM = closeModal;

  // Cargar todos los paneles al inicio
  loadMiembros();
  loadCursos();
  loadVideos();
  loadPdfs();
  loadSesiones();
  loadNoticias();
})();
