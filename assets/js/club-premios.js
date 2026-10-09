/* ============================================================ */
/* PREMIOS DEL CLUB VIP ZOORIGEN                                  */
/*                                                                */
/* Un premio ganado abre UN curso antes de su fecha. Aquí vive:   */
/*  - la lectura segura de GET /api/premios (normalizar)          */
/*  - qué cursos se pueden adelantar (cursosCanjeables)           */
/*  - la ventana "Elige tu curso" y el canje (canjear)            */
/*                                                                */
/* Uso desde cualquier pantalla del club:                         */
/*   const canjeo = await ZOO_PREMIOS.canjear();  // true si abrió */
/*                                                                */
/* La pantalla necesita cargados (en este orden): firebase +      */
/* firebase-config.js, club.js, admin-iconos.js, club-acceso.js,  */
/* club-cursos-ui.js, este archivo, y el CSS club-cursos.css.     */
/*                                                                */
/* Lo del servidor manda: el navegador solo muestra y pide. Se    */
/* prueba en Node: tests/club-premios.test.js                     */
/* ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./club-acceso.js'));
  else root.ZOO_PREMIOS = factory(root.ZOO_ACCESO);
})(typeof self !== 'undefined' ? self : this, function (ACCESO) {
  'use strict';

  const root = typeof window !== 'undefined' ? window : {};   // solo se usa en el navegador
  const URL_PREDETERMINADA = 'https://zoorigen-webhook-production.up.railway.app';

  /* ───────────── Niveles y premios (los cálculos reales los hace el servidor) ───────────── */

  const NIVELES = [
    { id: 1, nombre: 'Aprendiz', desde: 0, hasta: 300 },
    { id: 2, nombre: 'Técnico', desde: 300, hasta: 1200 },
    { id: 3, nombre: 'Profesional', desde: 1200, hasta: 2500 },
    { id: 4, nombre: 'Líder', desde: 2500, hasta: 4500 },
    { id: 5, nombre: 'Maestro', desde: 4500, hasta: 99999 }
  ];

  // Los cuatro premios que se muestran, siempre en este orden.
  //   tipo 'xp': se gana al llegar a esa cantidad de XP · tipo 'invitados': al tener esos invitados válidos
  const PREMIOS_INFO = [
    { clave: 'profesional', titulo: 'Profesional', tipo: 'xp', umbral: 1200, descripcion: '1 curso antes de tiempo al llegar al nivel Profesional.', requisito: '1,200 XP' },
    { clave: 'maestro', titulo: 'Maestro', tipo: 'xp', umbral: 4500, descripcion: '1 curso más antes de tiempo al llegar al nivel Maestro.', requisito: '4,500 XP' },
    { clave: 'referidos-1', titulo: 'Invita a 3 amigos', tipo: 'invitados', umbral: 3, descripcion: '1 curso antes de tiempo cuando 3 invitados válidos se unan.', requisito: '3 invitados válidos' },
    { clave: 'referidos-2', titulo: 'Invita a 6 amigos', tipo: 'invitados', umbral: 6, descripcion: '1 curso más antes de tiempo cuando 6 invitados válidos se unan.', requisito: '6 invitados válidos' }
  ];

  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : (d === undefined ? 0 : d); };
  const txt = v => (typeof v === 'string' ? v : '');
  const objeto = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const entero = (v, min, max, d) => Math.min(max, Math.max(min, Math.round(num(v, d))));

  function nivelPorXp(xp) {
    const x = Math.max(0, num(xp));
    let n = NIVELES[0];
    NIVELES.forEach(c => { if (x >= c.desde) n = c; });
    return n;
  }

  // Convierte la respuesta de GET /api/premios en datos seguros para la pantalla.
  // Devuelve null si no es una respuesta válida (la pantalla muestra "reintentar", sin inventar nada).
  function normalizar(resp) {
    if (!resp || typeof resp !== 'object' || Array.isArray(resp) || resp.ok === false) return null;
    const membresia = resp.membresia === true;
    const x = typeof resp.xp === 'object' && resp.xp ? resp.xp : { total: resp.xp };
    const n = objeto(resp.nivel);
    const xpTotal = Math.max(0, num(x.total, num(n.xp)));
    const base = n.id == null ? nivelPorXp(xpTotal) : NIVELES[entero(n.id, 1, 5, 1) - 1];
    const nivel = {
      id: base.id,
      nombre: txt(n.nombre).trim() || base.nombre,
      xp: Math.max(0, num(n.xp, xpTotal)),
      desde: num(n.desde, base.desde),
      hasta: num(n.hasta, base.hasta),
      faltan: 0
    };
    nivel.faltan = Number.isFinite(Number(n.faltan)) ? Math.max(0, Number(n.faltan)) : (base.id >= 5 ? 0 : Math.max(0, nivel.hasta - nivel.xp));

    const logros = (Array.isArray(resp.logros) ? resp.logros : []).filter(l => l && typeof l === 'object' && (txt(l.id) || typeof l.id === 'number')).map(l => ({
      id: String(l.id), nombre: txt(l.nombre) || String(l.id), descripcion: txt(l.descripcion),
      categoria: txt(l.categoria).trim() || 'Otros', xp: Math.max(0, num(l.xp)), ganado: membresia && l.ganado === true
    }));
    const premios = (Array.isArray(resp.premios) ? resp.premios : []).filter(p => p && typeof p === 'object' && txt(p.clave)).map(p => {
      const u = p.usado && typeof p.usado === 'object' && txt(p.usado.cursoId) ? { cursoId: String(p.usado.cursoId), fecha: p.usado.fecha == null ? null : p.usado.fecha } : null;
      return {
        clave: String(p.clave), titulo: txt(p.titulo), descripcion: txt(p.descripcion), requisito: txt(p.requisito),
        ganado: p.ganado === true, usado: u, disponible: p.disponible === true && !u,
        faltan: Number.isFinite(Number(p.faltan)) ? Math.max(0, Number(p.faltan)) : null
      };
    });
    const disponibles = Number.isFinite(Number(resp.disponibles)) ? Math.max(0, Math.round(Number(resp.disponibles))) : premios.filter(p => p.disponible).length;
    return {
      membresia, nivel,
      xp: { total: xpTotal, logros: Math.max(0, num(x.logros)), retos: Math.max(0, num(x.retos)), referidos: Math.max(0, num(x.referidos)) },
      racha: Math.max(0, Math.round(num(resp.racha))), diasActivos: Math.max(0, Math.round(num(resp.diasActivos))),
      logros, premios, disponibles
    };
  }

  /* ───────────── Cursos que se pueden adelantar ───────────── */

  const tieneClases = c => !!c && ((Array.isArray(c.lecciones) && c.lecciones.length > 0) || !!c.driveId);

  // Cursos que HOY siguen bloqueados para el miembro (los únicos que tiene sentido adelantar), en el orden de la fila.
  //   opc: { cursos (de Firestore, sin ordenar), session, prueba (estadoPrueba), progreso, adelantados, ahora }
  // Cada elemento: { id, titulo, diasFalta (número o null), motivo ('tiempo' | 'termina-prueba' | null) }
  function cursosCanjeables(opc) {
    const o = opc || {};
    const lista = ACCESO.ordenParaDesbloqueo(Array.isArray(o.cursos) ? o.cursos.filter(c => c && c.id) : []);
    const dias = ACCESO.diasComoMiembro(o.session, o.ahora);
    const adelantados = ACCESO.normalizarAdelantados(o.adelantados);
    const salida = [];
    lista.forEach((c, i) => {
      if (!tieneClases(c)) return;
      const r = ACCESO.desbloqueoCurso({ lista, i, dias, prueba: o.prueba, progreso: o.progreso, adelantados, ahora: o.ahora });
      if (r.desbloqueado) return;
      salida.push({ id: String(c.id), titulo: txt(c.title) || 'Curso sin nombre', diasFalta: Number.isFinite(r.diasFalta) ? r.diasFalta : null, motivo: r.motivo || null });
    });
    return salida;
  }

  /* ───────────── Textos y HTML de la ventana ───────────── */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  function textoEspera(c) {
    if (c && c.motivo === 'termina-prueba') return 'Se abriría solo cuando termines tu curso de prueba';
    const n = c && c.diasFalta != null ? Number(c.diasFalta) : NaN;
    if (!Number.isFinite(n)) return 'Se abriría solo más adelante';
    return 'Se abriría solo en ' + plural(Math.max(0, n), 'día', 'días');
  }
  function textoDisponibles(n) {
    return n === 1 ? 'Tienes 1 premio disponible.' : `Tienes ${n} premios disponibles.`;
  }
  function textoConfirmar(titulo) {
    return `¿Usar tu premio para abrir «${titulo}» ahora? Cada premio abre un solo curso y no se puede cambiar después.`;
  }
  const TEXTO_SIN_CURSOS = 'Ahora mismo no hay cursos bloqueados que puedas adelantar. Cuando se acerque la fecha de otro curso, podrás usar aquí tu premio.';

  // Cuerpo de la ventana "Elige tu curso" (todo texto de la base de datos va escapado)
  function elegirHTML(canjeables, disponibles, iconos) {
    const lista = Array.isArray(canjeables) ? canjeables : [];
    if (!lista.length) return `<p>${esc(TEXTO_SIN_CURSOS)}</p>`;
    const candado = iconos && iconos.svg ? iconos.svg('lock', { size: 13 }) : '';
    return `<p>Elige el curso que quieres abrir <strong>ahora</strong>. ${esc(textoDisponibles(disponibles))}</p>` +
      '<div class="zp-lista">' + lista.map(c =>
        `<div class="zp-fila"><div class="zp-fila__txt"><strong>${esc(c.titulo)}</strong><span>${candado}${esc(textoEspera(c))}</span></div>` +
        `<button type="button" class="zc-btn zc-btn--main zp-abrir" data-premio-curso="${esc(c.id)}" data-premio-titulo="${esc(c.titulo)}">Abrir ahora</button></div>`
      ).join('') + '</div>';
  }

  // Mensaje claro según lo que contestó el servidor
  function mensajeError(status, datos) {
    const d = objeto(datos);
    if (txt(d.error)) return d.error;
    if (status === 403) return 'No tienes un premio disponible o tu membresía no está vigente.';
    if (status === 404) return 'Ese curso ya no existe.';
    if (status === 409) return 'Ese curso ya fue abierto con un premio.';
    if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    return 'No se pudo usar el premio. Intenta de nuevo.';
  }

  /* ───────────── Flujo de canje (con dependencias inyectables para probar) ───────────── */

  // deps: {
  //   pedir(ruta, metodo, cuerpo, ms) → Promise<{ok,status,datos}>   (no rechaza si el servidor contesta; rechaza si no hay red)
  //   leerCursos() → Promise<[curso]>   obtenerSesion() → Promise<session>   leerProgreso(uid) → Promise<{}>
  //   ventana({titulo,subtitulo,cuerpoHTML,botones,alCerrar}) → {cerrar, el}
  //   toast(texto, esError)   irA(url)   iconos
  // }
  function crear(deps) {
    const d = deps;

    async function consultar(ms) {
      try {
        const r = await d.pedir('/api/premios', 'GET', null, ms || 9000);
        const datos = r.ok ? normalizar(r.datos) : null;
        if (datos) return { ok: true, status: r.status, datos, crudo: r.datos };
        return { ok: false, status: r.status || 0, error: r.ok ? 'La respuesta del servidor no es válida.' : mensajeError(r.status, r.datos) };
      } catch (e) {
        return { ok: false, status: 0, error: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.' };
      }
    }

    async function estadoPrueba() {
      try { const r = await d.pedir('/api/prueba-gratuita', 'GET', null, 9000); return ACCESO.estadoPrueba(r.ok ? r.datos : null); }
      catch (e) { return ACCESO.estadoPrueba(null); }
    }

    async function canjear() {
      const c = await consultar(9000);
      if (!c.ok) { d.toast(c.error, true); return false; }
      const datos = c.datos;
      if (!datos.membresia) {
        d.ventana({
          titulo: 'Premios para miembros', subtitulo: 'Premio por tu nivel',
          cuerpoHTML: '<p>Para ganar y usar premios necesitas una suscripción activa.</p>',
          botones: [{ texto: 'Cerrar' }, { texto: 'Ver suscripción', clase: 'zc-btn--main', alPulsar: () => { d.irA('club-suscripcion.html'); } }]
        });
        return false;
      }
      if (datos.disponibles < 1) {
        d.ventana({ titulo: 'Sin premios por ahora', subtitulo: 'Premio por tu nivel', cuerpoHTML: '<p>Todavía no tienes un premio disponible. Sube de nivel o invita a tus amigos para ganar uno.</p>', botones: [{ texto: 'Entendido', clase: 'zc-btn--main' }] });
        return false;
      }
      let cursos, session, prueba, progreso;
      try {
        [cursos, session] = await Promise.all([d.leerCursos(), d.obtenerSesion()]);
        [prueba, progreso] = await Promise.all([estadoPrueba(), Promise.resolve().then(() => d.leerProgreso(session.uid)).catch(() => ({}))]);
      } catch (e) {
        d.toast('No pudimos cargar los cursos. Revisa tu conexión e intenta de nuevo.', true);
        return false;
      }
      const adelantados = ACCESO.adelantadosDeRespuesta(c.crudo);
      const canjeables = cursosCanjeables({ cursos, session, prueba, progreso, adelantados });

      return new Promise(resolve => {
        let canjeado = false;
        const lista = d.ventana({
          titulo: 'Elige tu curso', subtitulo: 'Premio por tu nivel',
          cuerpoHTML: elegirHTML(canjeables, datos.disponibles, d.iconos),
          botones: [{ texto: 'Cerrar' }],
          alCerrar: () => resolve(canjeado)
        });
        if (lista.el) lista.el.classList.add('zp');
        if (!lista.el || !lista.el.addEventListener) return;
        lista.el.addEventListener('click', ev => {
          const b = ev.target && ev.target.closest ? ev.target.closest('[data-premio-curso]') : null;
          if (!b) return;
          const cursoId = b.getAttribute('data-premio-curso');
          const titulo = b.getAttribute('data-premio-titulo') || 'este curso';
          const conf = d.ventana({
            titulo: 'Confirma tu premio', subtitulo: 'Premio por tu nivel',
            cuerpoHTML: `<p>${esc(textoConfirmar(titulo))}</p>`,
            botones: [
              { texto: 'No, volver' },
              { texto: 'Sí, abrir ahora', clase: 'zc-btn--main', alPulsar: async ({ boton }) => {
                  boton.disabled = true; boton.textContent = 'Abriendo…';
                  let r;
                  try { r = await d.pedir('/api/premios/usar', 'POST', { cursoId }, 12000); }
                  catch (e) {
                    d.toast('No se pudo usar el premio. Revisa tu conexión e intenta de nuevo.', true);
                    boton.disabled = false; boton.textContent = 'Sí, abrir ahora';
                    return false;
                  }
                  if (!r.ok) {
                    d.toast(mensajeError(r.status, r.datos), true);
                    if (r.status === 403 || r.status === 409 || r.status === 404) { lista.cerrar(); return; }
                    boton.disabled = false; boton.textContent = 'Sí, abrir ahora';
                    return false;
                  }
                  canjeado = true;
                  d.toast(`Curso desbloqueado — ${titulo} ya está abierto para ti`);
                  lista.cerrar();
                } }
            ]
          });
          if (conf.el) conf.el.classList.add('zp');
        });
      });
    }

    return { canjear, consultar };
  }

  /* ───────────── Navegador ───────────── */

  const estilos = `
.zp .zc-modal { max-width: 520px; }
.zp .zc-btn--main { color: #fff; background: linear-gradient(135deg, #3d8b42, #2f7a4f); border: 0; box-shadow: 0 8px 20px rgba(31, 95, 58, .3); }
.zp .zc-btn--main:hover { background: linear-gradient(135deg, #46a04c, #35885a); }
.zp-lista { display: flex; flex-direction: column; gap: 10px; margin: 6px 0 4px; }
.zp-fila { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 14px; border: 1px solid var(--zoo-border, rgba(255,255,255,.18)); border-radius: 14px; background: var(--zoo-bg-card-2, rgba(255,255,255,.05)); }
.zp-fila__txt { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.zp-fila__txt strong { color: var(--zoo-text, #fff); font-size: .95rem; line-height: 1.3; overflow-wrap: anywhere; }
.zp-fila__txt span { display: inline-flex; align-items: center; gap: 5px; color: var(--zoo-text-dim, rgba(255,255,255,.6)); font-size: .76rem; line-height: 1.35; }
.zp-abrir { flex: none; padding: 9px 16px; }
[data-theme="light"] .zp .zc-btn:not(.zc-btn--main) { border-color: #c4cabf; }
[data-theme="light"] .zp .zc-modal { border-color: #d0d4cb; box-shadow: 0 30px 80px rgba(20, 30, 20, .28); }
@media (max-width: 480px) { .zp-fila { flex-direction: column; align-items: stretch; } .zp-abrir { width: 100%; } }
`;
  function inyectarEstilos() {
    if (typeof document === 'undefined' || document.getElementById('zp-estilos')) return;
    const s = document.createElement('style');
    s.id = 'zp-estilos'; s.textContent = estilos;
    document.head.appendChild(s);
  }

  function urlServidor() {
    try { if (typeof WEBHOOK_SERVER_URL !== 'undefined' && WEBHOOK_SERVER_URL) return String(WEBHOOK_SERVER_URL).replace(/\/+$/, ''); } catch (e) { /* sin constante global */ }
    return URL_PREDETERMINADA;
  }

  async function pedirNavegador(ruta, metodo, cuerpo, ms) {
    const user = root.firebase && root.firebase.auth ? root.firebase.auth().currentUser : null;
    if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    const token = await user.getIdToken();
    const ctl = new AbortController();
    const corte = setTimeout(() => ctl.abort(), ms || 9000);
    try {
      const r = await root.fetch(urlServidor() + ruta, {
        method: metodo, signal: ctl.signal, cache: 'no-store',
        headers: Object.assign({ Authorization: 'Bearer ' + token }, cuerpo ? { 'Content-Type': 'application/json' } : {}),
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
      });
      const datos = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, datos };
    } finally { clearTimeout(corte); }
  }

  function toastNavegador(texto, esError) {
    const t = document.createElement('div');
    t.className = 'zc-toast' + (esError ? ' zc-toast--error' : '');
    t.setAttribute('role', 'status');
    t.style.width = 'max-content';
    t.textContent = texto;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('is-in'), 20);
    setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 300); }, 4600);
  }

  let sesionCache = null;
  const depsNavegador = {
    pedir: pedirNavegador,
    leerCursos: async () => {
      // Mismo orden que la biblioteca (más nuevo primero): de él depende el turno de cada curso en la fila.
      const snap = await root.db.collection('cursos').orderBy('createdAt', 'desc').get();
      return snap.docs.map(x => Object.assign({ id: x.id }, x.data()));
    },
    obtenerSesion: async () => {
      if (root.__zooSession) return root.__zooSession;
      if (!sesionCache) sesionCache = await root.ZOORIGEN_CLUB.requireAuth();
      return sesionCache;
    },
    leerProgreso: uid => (root.ZOORIGEN_CLUB && root.ZOORIGEN_CLUB.getCourseProgress ? root.ZOORIGEN_CLUB.getCourseProgress(uid) : Promise.resolve({})),
    ventana: o => {
      if (!root.ZOO_CURSOS_UI || !root.ZOO_CURSOS_UI.ventana) throw new Error('Falta cargar club-cursos-ui.js');
      inyectarEstilos();
      return root.ZOO_CURSOS_UI.ventana(o);
    },
    toast: toastNavegador,
    irA: url => { root.location.href = url; },
    get iconos() { return root.ZOO_ICONOS; }
  };

  const api = {
    NIVELES, PREMIOS_INFO, nivelPorXp, normalizar, cursosCanjeables,
    textoEspera, textoDisponibles, textoConfirmar, elegirHTML, mensajeError, TEXTO_SIN_CURSOS, esc,
    crear
  };

  if (typeof document !== 'undefined') {
    let instancia = null;
    const uno = () => instancia || (instancia = crear(depsNavegador));
    // Sin parámetros. Devuelve una promesa: true si el miembro abrió un curso con su premio.
    api.canjear = function canjear() {
      return uno().canjear().catch(e => { console.error('[premios]', e); toastNavegador('No se pudo abrir la ventana de premios. Intenta de nuevo.', true); return false; });
    };
    // Consulta GET /api/premios. Nunca rechaza: { ok, datos } o { ok:false, error }
    api.consultar = ms => uno().consultar(ms);
    // Llamada genérica al servidor con la sesión del miembro: { ok, status, datos }. Rechaza si no hay red.
    api.pedir = pedirNavegador;
  }
  return api;
});
