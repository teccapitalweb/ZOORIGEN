import './styles/club.css';
import { Data } from './core/data';
import { Auth } from './core/auth';
import { currentRoute } from './core/router';
import type { Catalog } from './core/types';
import { loadProtectedVideo, startCheckout } from './core/video';
import { courseCard, demoStrip, pageHead } from './ui/partials';
import { shell } from './ui/shell';

const app = document.querySelector<HTMLDivElement>('#app')!;
if (!app) throw new Error('No se encontró #app');

let catalog: Catalog = { courses: [], resources: [], areas: [], plans: { monthly: null, annual: null }, verifiedAt: null };
let activeArea = 'Todas';

const totalClasses = () => catalog.courses.reduce((sum, course) => sum + course.lessons, 0);

function dashboard(): string {
  return shell(`<main class="page" id="app-main">${demoStrip()}
    <div class="dash-grid" style="margin-top:20px">
      <section class="welcome-card"><span class="welcome-card__code">CATÁLOGO ZOORIGEN / ACTIVO</span><div class="welcome-card__copy"><span class="pill">Aprendizaje especializado en fauna</span><h1>Tu estación<br><em>de campo.</em></h1><p>Explora el contenido real de ZOORIGEN. Cada clase está vinculada a su video protegido y se habilita únicamente con acceso verificado.</p><div class="welcome-card__actions"><a class="btn btn--primary" href="#/cursos">Explorar los cursos</a><a class="btn btn--ghost" href="#/suscripcion">Mi membresía</a></div></div><span class="welcome-card__coords">BUNNY STREAM<br>ACCESO TEMPORAL</span></section>
      <aside class="week-card catalog-summary"><span class="eyebrow">Dentro del club</span><h2>Todo en un solo lugar</h2><p>Cursos, recursos, sesiones, comunidad y certificados reunidos en una experiencia completa con identidad propia de ZOORIGEN.</p><div class="catalog-metric"><strong>${catalog.courses.length}</strong><span>cursos reales</span></div><div class="catalog-metric"><strong>${totalClasses()}</strong><span>clases en Bunny</span></div><div class="catalog-metric"><strong>${catalog.areas.length}</strong><span>áreas de estudio</span></div></aside>
    </div>
    <div class="stats"><article class="stat"><span>Catálogo</span><strong>${catalog.courses.length}</strong><small>Cursos ZOORIGEN</small></article><article class="stat"><span>Videoteca</span><strong>${totalClasses()}</strong><small>Clases protegidas</small></article><article class="stat"><span>Acceso</span><strong>VIP</strong><small>Validación en servidor</small></article><article class="stat"><span>Certificados</span><strong>QR</strong><small>Verificación pública</small></article></div>
    <div class="section-row"><div><span class="eyebrow">Equipo de expedición</span><h2>Accesos rápidos</h2></div></div>
    <div class="quick-grid"><a class="quick-card" href="#/cursos"><span>▦</span><small>01</small><h3>Catálogo completo</h3><p>${catalog.courses.length} rutas de aprendizaje.</p></a><a class="quick-card" href="#/materiales"><span>▤</span><small>02</small><h3>Archivo de campo</h3><p>Guías y recursos científicos.</p></a><a class="quick-card" href="#/en-vivo"><span>◉</span><small>03</small><h3>Sesiones en vivo</h3><p>Agenda oficial del club.</p></a><a class="quick-card" href="#/certificados"><span>⌑</span><small>04</small><h3>Certificados</h3><p>Folios verificables con QR.</p></a></div>
    <div class="section-row"><div><span class="eyebrow">Rutas destacadas</span><h2>Empieza por aquí</h2></div><a href="#/cursos">Ver todas ↗</a></div><div class="club-course-grid">${catalog.courses.slice(0, 3).map(courseCard).join('')}</div>
  </main>`, 'Estación de aprendizaje');
}

function courses(): string {
  const areas = ['Todas', ...catalog.areas];
  const filtered = activeArea === 'Todas' ? catalog.courses : catalog.courses.filter((course) => course.area === activeArea);
  return shell(`<main class="page" id="app-main">${pageHead('Catálogo ZOORIGEN', `${catalog.courses.length} cursos · ${totalClasses()} clases`, 'Formación en fauna, conservación, monitoreo, etología, salud pública y diagnóstico.')}
    <div class="catalog-proof"><span><strong>Bunny</strong> video protegido</span><span><strong>Firebase</strong> identidad</span><span><strong>Stripe</strong> membresía</span><span><strong>API</strong> autoridad</span></div>
    <div class="filterbar">${areas.map((area) => `<button class="${area === activeArea ? 'is-active' : ''}" type="button" data-area="${area}">${area}</button>`).join('')}</div>
    <div class="club-course-grid">${filtered.length ? filtered.map(courseCard).join('') : '<div class="empty-state">No hay cursos en esta categoría.</div>'}</div>
  </main>`, 'Catálogo');
}

function coursePage(id: string): string {
  const item = catalog.courses.find((course) => course.id === id);
  if (!item) return shell('<main class="page"><div class="empty-state">Curso no disponible.</div></main>', 'Curso');
  return shell(`<main class="page" id="app-main"><a class="back-link" href="#/cursos">← Volver al catálogo</a>
    <section class="challenge-hero course-hero"><div><span class="pill">${item.area} · ${item.level}</span><h2>${item.title}</h2><p>${item.description}</p><div class="welcome-card__actions"><a class="btn btn--primary" href="#/curso/${item.id}/clase/1">Comenzar curso</a><button class="btn btn--ghost" data-toast="Se guardará al conectar tu perfil">Guardar para después</button></div></div><img src="${item.image}" alt="Portada de ${item.title}" loading="lazy"></section>
    <div class="section-row"><h2>Contenido real del curso</h2><span>${item.lessons} clases · Bunny protegido</span></div>
    <div class="thread-list">${item.lessonItems.map((lesson, index) => `<a class="thread thread--link" href="#/curso/${item.id}/clase/${lesson.num}"><span class="avatar">${String(lesson.num).padStart(2, '0')}</span><div><h3>${lesson.title}</h3><p>${index === 0 && item.id === 'biologia-tiburones-rayas' ? 'Vista previa registrada · inicia sesión para reproducir' : 'Disponible para membresía activa'}</p></div><span class="thread__meta">▶<br>Bunny</span></a>`).join('')}</div>
  </main>`, item.title);
}

function lessonPage(courseId: string, lessonNumber: string): string {
  const item = catalog.courses.find((course) => course.id === courseId);
  const lesson = item?.lessonItems.find((entry) => entry.num === Number(lessonNumber));
  if (!item || !lesson) return shell('<main class="page"><div class="empty-state">Clase no disponible.</div></main>', 'Clase');
  return shell(`<main class="page" id="app-main"><div class="lesson-layout"><section class="lesson-stage"><span class="eyebrow">Clase ${lesson.num} · ${item.area}</span><h1>${lesson.title}</h1>
    <div class="video-placeholder" data-video-stage><button class="video-play" type="button" data-play-video data-course-id="${courseId}" data-lesson="${lesson.num}" aria-label="Reproducir clase">▶</button><p>La API solicitará una URL firmada y temporal. La clave privada de Bunny nunca llega al navegador.</p><small>${lesson.videoId === 'befd1641-850a-4099-88a8-047a1badc703' ? 'Clase marcada como vista previa en el catálogo de ZOORIGEN.' : 'Requiere sesión y membresía activa.'}</small></div>
    <div class="lesson-copy"><span class="eyebrow">Ruta de aprendizaje</span><h2>${item.title}</h2><p>${item.description}</p></div></section>
    <aside class="lesson-index"><span class="eyebrow">Contenido del curso</span><h3>${item.lessons} clases</h3>${item.lessonItems.map((entry) => `<a class="${entry.num === lesson.num ? 'is-active' : ''}" href="#/curso/${courseId}/clase/${entry.num}"><span>${String(entry.num).padStart(2, '0')}</span>${entry.title}</a>`).join('')}<a class="btn btn--primary" href="#/curso/${courseId}">Volver al curso</a></aside></div></main>`, `${lesson.title} · ${item.title}`);
}

function resources(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Archivo de campo', 'Recursos complementarios', 'La biblioteca conserva la estructura de Élite y queda lista para recibir los PDF propios de ZOORIGEN desde una URL protegida.')}<div class="resource-grid">${catalog.resources.map((item) => `<article class="resource"><div class="resource__cover">Z/<small>${item.type}</small></div><h3>${item.title}</h3><p>${item.area}</p><div class="resource__meta"><span>${item.type}</span><span>${item.pages ? `${item.pages} páginas` : 'Metadatos pendientes'}</span></div><a class="btn btn--ghost" href="#/materiales/${item.id}">Ver ficha</a></article>`).join('')}</div></main>`, 'Biblioteca');
}

function material(id: string, viewer = false): string {
  const item = catalog.resources.find((entry) => entry.id === id);
  return shell(`<main class="page" id="app-main">${pageHead('Recurso', item?.title ?? 'Material', item?.area ?? 'Archivo de campo')}<section class="material-sheet"><div class="material-sheet__cover">Z/<small>${item?.type ?? 'Documento'}</small></div><div><span class="eyebrow">Acceso protegido</span><h2>${item?.title ?? 'Material no disponible'}</h2><p>${viewer ? 'El visor está preparado para recibir una URL temporal desde la API. Ningún archivo privado se publica directamente.' : 'Consulta esta ficha antes de abrir el documento.'}</p>${viewer ? '<div class="viewer-placeholder">Archivo protegido pendiente de carga por ZOORIGEN</div>' : `<a class="btn btn--primary" href="#/materiales/${id}/visor">Abrir visor</a>`}</div></section></main>`, item?.title ?? 'Material');
}

function community(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Comunidad', 'Aprender también es conversar', 'Debates moderados, dudas de clase y experiencias de campo dentro del club.')}<div class="community-layout"><section class="thread-list"><article class="thread"><span class="avatar">Z/</span><div><h3>Comunidad preparada</h3><p>Las publicaciones reales aparecerán cuando Firebase y la moderación estén conectados.</p></div><span class="thread__meta">API<br>protegida</span></article><article class="thread"><span class="avatar">?</span><div><h3>Haz una pregunta sobre una clase</h3><p>La relación curso-clase quedará guardada por el servidor, no en el navegador.</p></div><span class="thread__meta">Próxima<br>fase</span></article></section><aside class="event-card"><span class="event-date">EN VIVO</span><h2>Encuentros mensuales</h2><p>Fechas, especialistas y enlaces aparecerán únicamente cuando ZOORIGEN los publique.</p><a class="btn btn--primary" href="#/en-vivo">Abrir agenda</a></aside></div></main>`, 'Comunidad');
}

function live(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Sesiones en vivo', 'Agenda científica', 'La membresía contempla encuentros mensuales; evitamos inventar fechas o ponentes.')}<section class="challenge-hero"><div><span class="pill">Agenda conectable</span><h2>La siguiente sesión aparecerá aquí.</h2><p>El módulo admite fecha, ponente, cupo, recordatorios y un enlace privado entregado por la API.</p><button class="btn btn--primary" data-toast="Todavía no hay una sesión confirmada">Solicitar aviso</button></div><div class="level-ring"><span>◉</span></div></section></main>`, 'En vivo');
}

function certificates(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Certificados', 'Evidencia verificable', 'Cada certificado real tendrá folio y consulta pública respaldada por el servidor.')}<div class="resource-grid"><article class="resource certificate-preview"><div class="resource__cover"><div><span class="brand__mark">Z</span><h2>Certificado de finalización</h2><p>Vista previa · no válido</p></div></div><h3>Curso ZOORIGEN</h3><p>El nombre, fecha y folio se generan después de validar el avance.</p></article><article class="feature-card"><span class="eyebrow">Consulta pública</span><h3>Verificación por folio</h3><p>Permite confirmar autenticidad sin exponer información adicional.</p><button class="btn btn--dark" data-toast="La consulta real se activará con la API">Verificar folio</button></article></div></main>`, 'Certificados');
}

function subscription(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Membresía', 'Elige cómo continuar', 'Stripe se abrirá únicamente con sesión Firebase y configuración verificada en el servidor.')}<div class="feature-grid"><article class="feature-card plan-card"><span class="eyebrow">Mensual</span><h3>$${catalog.plans.monthly ?? '—'} <small>MXN</small></h3><p>Acceso al catálogo y beneficios del club.</p><button class="btn btn--primary" data-checkout="monthly">Elegir mensual</button></article><article class="feature-card plan-card is-featured"><span class="eyebrow">Anual</span><h3>$${catalog.plans.annual ?? '—'} <small>MXN</small></h3><p>Un año de acceso. Precio sujeto a confirmación final en Stripe.</p><button class="btn btn--dark" data-checkout="annual">Elegir anual</button></article><article class="feature-card"><span class="eyebrow">Seguridad</span><h3>Sin cobros desde el navegador</h3><p>La API crea la sesión de pago y el webhook confirma la membresía después del evento firmado.</p><button class="btn btn--ghost" data-portal>Administrar plan</button></article></div></main>`, 'Membresía');
}

function profile(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Cuenta', 'Tu perfil de aprendizaje', 'Identidad, intereses, progreso y estado de membresía en un solo lugar.')}<div class="feature-grid"><article class="feature-card"><span class="eyebrow">Sesión</span><h3>Modo local de revisión</h3><p>Con Firebase configurado, aquí aparecerá la cuenta verificada.</p><a class="btn btn--dark" href="#/login">Iniciar sesión</a></article><article class="feature-card"><span class="eyebrow">Progreso</span><h3>Autoridad del servidor</h3><p>Las clases completadas no se conceden mediante localStorage.</p></article><article class="feature-card"><span class="eyebrow">Membresía</span><h3>Acceso por confirmar</h3><p>Stripe y Firestore determinan el estado real.</p><a class="btn btn--ghost" href="#/suscripcion">Ver membresía</a></article></div></main>`, 'Mi perfil');
}

function modulePage(eyebrow: string, title: string, text: string): string {
  return shell(`<main class="page" id="app-main">${pageHead(eyebrow, title, text)}<section class="module-board"><span class="module-board__code">MÓDULO / ZOORIGEN</span><div><h2>${title}</h2><p>La navegación y el control de acceso ya forman parte del sistema. Los datos de valor se conectarán únicamente mediante la API.</p></div><div class="module-board__links"><a class="btn btn--primary" href="#/">Volver al inicio</a></div></section></main>`, title);
}

function admin(): string {
  const items = ['Cursos y clases', 'Biblioteca', 'Sesiones', 'Miembros', 'Certificados', 'Comunidad', 'Cupones', 'Experiencia'];
  return shell(`<main class="page" id="app-main">${pageHead('Operaciones', 'Administración ZOORIGEN', 'En producción exige token Firebase y custom claim administrativo.')}<div class="demo-strip">⚿ Este entorno no escribe en Firebase ni modifica servicios reales.</div><div class="admin-grid">${items.map((item) => `<article class="admin-card"><span>◇</span><h3>${item}</h3><p>Gestión exclusiva a través de la API.</p><button class="btn btn--ghost" data-toast="Requiere permiso administrativo verificado">Abrir módulo</button></article>`).join('')}</div></main>`, 'Administración');
}

function login(): string {
  const register = new URLSearchParams(location.hash.split('?')[1] || '').get('modo') === 'registro';
  return `<main class="login-page"><section class="login-scene"><div class="login-scene__copy"><span class="pill">Club VIP ZOORIGEN</span><h1>Tu próxima expedición empieza aquí.</h1><p>Accede a cursos, videos, recursos y comunidad desde cualquier dispositivo.</p></div></section><section class="login-panel"><div class="login-box"><a class="brand" href="/"><span class="brand__mark">Z</span><span>ZOORIGEN</span></a><h2>${register ? 'Crea tu cuenta' : 'Inicia sesión'}</h2><p>Firebase Auth se limita al proyecto dedicado <strong>club-zoorigen</strong>.</p><div class="field"><label for="email">Correo electrónico</label><input id="email" type="email" autocomplete="email" placeholder="tu@correo.com"></div><div class="field"><label for="password">Contraseña</label><input id="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" placeholder="Mínimo 6 caracteres"></div><div class="login-actions"><button class="btn btn--dark" data-auth-action="${register ? 'register' : 'login'}">${register ? 'Crear cuenta' : 'Entrar'}</button>${register ? '<a class="btn btn--ghost" href="#/login">Ya tengo cuenta</a>' : '<a class="btn btn--ghost" href="#/login?modo=registro">Crear una cuenta</a><button class="btn btn--ghost" data-reset-password>Recuperar contraseña</button>'}<a class="btn btn--ghost" href="#/">Revisar el prototipo</a></div>${!Auth.configured() ? '<div class="prototype-note">Vista local: Firebase está desconectado. No escribas una contraseña real.</div>' : ''}</div></section></main>`;
}

function render(): void {
  const route = currentRoute();
  const pages: Record<string, () => string> = {
    '/': dashboard, '/login': login, '/cursos': courses, '/materiales': resources, '/comunidad': community, '/en-vivo': live,
    '/certificados': certificates, '/perfil': profile, '/suscripcion': subscription, '/admin': admin,
    '/bienvenida': () => modulePage('Primera entrada', 'Bienvenido a ZOORIGEN', 'Onboarding de intereses y nivel de experiencia.'),
    '/encuestas': () => modulePage('Perfil de aprendizaje', 'Tu punto de partida', 'Encuesta inicial para personalizar las rutas.'),
    '/retos': () => modulePage('Práctica', 'Retos de campo', 'Casos breves para aplicar lo aprendido.'),
    '/retos/historia': () => modulePage('Casos', 'Historias interactivas', 'Decisiones basadas en escenarios de campo.'),
    '/herramientas': () => modulePage('Kit digital', 'Herramientas de campo', 'Calculadoras, fichas y utilidades científicas.'),
    '/logros': () => modulePage('Bitácora', 'Logros y progreso', 'Hitos verificados por la API.'),
    '/recompensas': () => modulePage('Beneficios', 'Recompensas', 'Reglas y premios pendientes de aprobación comercial.'),
    '/configuracion': () => modulePage('Cuenta', 'Configuración', 'Preferencias, privacidad y administración de sesión.'),
  };
  if (route.path === '/curso/:id') app.innerHTML = coursePage(route.params.id);
  else if (route.path === '/curso/:id/clase/:n') app.innerHTML = lessonPage(route.params.id, route.params.n);
  else if (route.path === '/materiales/:id') app.innerHTML = material(route.params.id);
  else if (route.path === '/materiales/:id/visor') app.innerHTML = material(route.params.id, true);
  else if (route.path.startsWith('/admin/')) app.innerHTML = admin();
  else app.innerHTML = (pages[route.path] ?? dashboard)();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showToast(message: string): void {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

document.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement;
  const area = target.closest<HTMLButtonElement>('[data-area]');
  if (area?.dataset.area) { activeArea = area.dataset.area; render(); return; }

  const toast = target.closest<HTMLElement>('[data-toast]');
  if (toast?.dataset.toast) showToast(toast.dataset.toast);

  const authAction = target.closest<HTMLButtonElement>('[data-auth-action]');
  if (authAction) {
    const email = document.querySelector<HTMLInputElement>('#email')?.value.trim() || '';
    const password = document.querySelector<HTMLInputElement>('#password')?.value || '';
    if (!email || password.length < 6) { showToast('Escribe un correo válido y una contraseña de al menos 6 caracteres.'); return; }
    authAction.disabled = true;
    try {
      if (authAction.dataset.authAction === 'register') await Auth.register(email, password);
      else await Auth.signIn(email, password);
      location.hash = '#/';
    } catch (error) { authAction.disabled = false; showToast(error instanceof Error ? error.message : 'No fue posible autenticar la cuenta.'); }
    return;
  }

  const reset = target.closest<HTMLButtonElement>('[data-reset-password]');
  if (reset) {
    const email = document.querySelector<HTMLInputElement>('#email')?.value.trim() || '';
    if (!email) { showToast('Escribe primero tu correo electrónico.'); return; }
    reset.disabled = true;
    try { await Auth.resetPassword(email); showToast('Revisa tu correo para continuar.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'No fue posible enviar la recuperación.'); }
    finally { reset.disabled = false; }
  }

  const player = target.closest<HTMLButtonElement>('[data-play-video]');
  if (player?.dataset.courseId && player.dataset.lesson) {
    const stage = player.closest<HTMLElement>('[data-video-stage]');
    player.disabled = true;
    if (stage) stage.classList.add('is-loading');
    try {
      const token = await loadProtectedVideo(player.dataset.courseId, Number(player.dataset.lesson));
      if (stage) stage.innerHTML = `<iframe src="${token.embedUrl}" title="Reproductor de la clase" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    } catch (error) {
      player.disabled = false;
      stage?.classList.remove('is-loading');
      showToast(error instanceof Error ? error.message : 'No fue posible preparar el video.');
    }
  }

  const checkout = target.closest<HTMLButtonElement>('[data-checkout]');
  if (checkout?.dataset.checkout === 'monthly' || checkout?.dataset.checkout === 'annual') {
    checkout.disabled = true;
    try { window.location.assign(await startCheckout(checkout.dataset.checkout)); }
    catch (error) { checkout.disabled = false; showToast(error instanceof Error ? error.message : 'Stripe no está disponible.'); }
  }
});

window.addEventListener('hashchange', render);
catalog = await Data.catalog();
render();

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
