import './styles/club.css';
import { Data } from './core/data';
import { currentRoute } from './core/router';
import type { Catalog } from './core/types';
import { courseCard, demoStrip, pageHead } from './ui/partials';
import { shell } from './ui/shell';

const app = document.querySelector<HTMLDivElement>('#app')!;
if (!app) throw new Error('No se encontró #app');

let catalog: Catalog = { courses: [], resources: [], areas: [], plans: { monthly: null, annual: null }, verifiedAt: null };
let activeArea = 'Todas';

function dashboard(): string {
  return shell(`<main class="page" id="app-main">${demoStrip()}<div class="dash-grid" style="margin-top:20px"><section class="welcome-card"><span class="welcome-card__code">EXPEDICIÓN ACTIVA / 04</span><div class="welcome-card__copy"><span class="pill">Bitácora al día · continúa tu ruta</span><h1>Hola,<br><em>explorador.</em></h1><p>Retoma Arácnidos de importancia médica y conserva el ritmo de esta semana.</p><div class="welcome-card__actions"><a class="btn btn--primary" href="#/curso/aracnidos-importancia-medica">Continuar expedición</a><a class="btn btn--ghost" href="#/cursos">Ver catálogo</a></div></div><span class="welcome-card__coords">18.8516° N<br>97.1037° W</span></section><aside class="week-card"><span class="eyebrow">Registro de actividad</span><h2>Tu semana</h2><p>La constancia también es una herramienta científica.</p><div class="week-row">${['L','M','M','J','V','S','D'].map((day,index)=>`<span class="day ${index < 4 ? 'is-done' : ''} ${index === 4 ? 'is-today' : ''}"><span>${index < 4 ? '✓' : index + 1}</span>${day}</span>`).join('')}</div><div class="streak"><span style="font-size:29px">♨</span><div><strong>4 días</strong><br><small>Tu mejor racha: 9 días</small></div></div><a class="week-card__link" href="#/logros">Abrir bitácora completa ↗</a></aside></div><div class="stats"><article class="stat"><span>Clases vistas</span><strong>18</strong><small>+3 esta semana</small></article><article class="stat"><span>Cursos activos</span><strong>02</strong><small>Continúa así</small></article><article class="stat"><span>Horas de estudio</span><strong>12.4</strong><small>+1.8 h</small></article><article class="stat"><span>Certificados</span><strong>01</strong><small>1 en camino</small></article></div><div class="section-row"><div><span class="eyebrow">Equipo de expedición</span><h2>Accesos rápidos</h2></div></div><div class="quick-grid"><a class="quick-card" href="#/cursos"><span>▦</span><small>01</small><h3>Mis cursos</h3><p>Continúa tus lecciones.</p></a><a class="quick-card" href="#/materiales"><span>▤</span><small>02</small><h3>Archivo de campo</h3><p>Guías y recursos científicos.</p></a><a class="quick-card" href="#/en-vivo"><span>◉</span><small>03</small><h3>Próxima sesión</h3><p>Agenda por confirmar.</p></a><a class="quick-card" href="#/retos"><span>✦</span><small>04</small><h3>Misión diaria</h3><p>5 minutos para practicar.</p></a></div><div class="section-row"><div><span class="eyebrow">Rutas en curso</span><h2>Continúa tu aprendizaje</h2></div><a href="#/cursos">Ver todas ↗</a></div><div class="club-course-grid">${catalog.courses.slice(0,3).map(courseCard).join('')}</div></main>`, 'Bitácora principal');
}

function courses(): string {
  const areas = ['Todas', ...catalog.areas];
  const filtered = activeArea === 'Todas' ? catalog.courses : catalog.courses.filter((course) => course.area === activeArea);
  return shell(`<main class="page" id="app-main">${pageHead('Catálogo', 'Explora los cursos', 'Rutas de aprendizaje construidas alrededor de fauna, conservación y ciencia aplicada.')}<div class="filterbar">${areas.map((area)=>`<button class="${area === activeArea ? 'is-active' : ''}" type="button" data-area="${area}">${area}</button>`).join('')}</div><div class="club-course-grid">${filtered.length ? filtered.map(courseCard).join('') : '<div class="empty-state">No hay cursos confirmados para este filtro.</div>'}</div></main>`, 'Cursos');
}

function course(id: string): string {
  const item = catalog.courses.find((entry)=>entry.id === id) ?? catalog.courses[0];
  if (!item) return shell('<main class="page"><div class="empty-state">Curso no disponible.</div></main>', 'Curso');
  return shell(`<main class="page" id="app-main"><a href="#/cursos" style="text-decoration:none;color:#607068">← Volver al catálogo</a><section class="challenge-hero" style="margin-top:18px"><div><span class="pill">${item.area} · ${item.level}</span><h2>${item.title}</h2><p>${item.description}</p><div class="welcome-card__actions"><a class="btn btn--primary" href="#/curso/${item.id}/clase/1">Continuar curso</a><button class="btn btn--ghost" data-toast="Esta función se conectará al perfil real después">Guardar para después</button></div></div><img src="${item.image}" alt="" style="width:250px;aspect-ratio:1;object-fit:cover"></section><div class="section-row"><h2>Contenido del curso</h2><span>${item.lessons} lecciones · ${item.duration}</span></div><div class="thread-list">${Array.from({length: Math.min(item.lessons,8)},(_,index)=>`<a class="thread thread--link" href="#/curso/${item.id}/clase/${index+1}"><span class="avatar">${String(index+1).padStart(2,'0')}</span><div><h3>${['Introducción y contexto','Fundamentos científicos','Identificación en campo','Métodos de observación','Toma de decisiones','Caso aplicado','Buenas prácticas','Evaluación final'][index]}</h3><p>${index < 2 ? 'Disponible en este prototipo' : 'Requiere membresía confirmada'}</p></div><span class="thread__meta">${index < 2 ? '▶' : '◇'}<br>${18+index*3} min</span></a>`).join('')}</div></main>`, item.title);
}

function resources(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Archivo de campo','Recursos para volver a consultar','Guías, fichas y documentos complementarios organizados por área.')}<div class="resource-grid">${catalog.resources.map((item)=>`<article class="resource"><div class="resource__cover">${item.type === 'Ficha' ? '⌁' : 'Z/'}</div><h3>${item.title}</h3><p>${item.area}</p><div class="resource__meta"><span>${item.type}</span><span>${item.pages ? `${item.pages} páginas` : '[por confirmar]'}</span></div><a class="btn btn--ghost" style="width:100%;margin-top:15px" href="#/materiales/${item.id}">Abrir ficha</a></article>`).join('')}</div></main>`, 'Archivo de campo');
}

function modulePage(eyebrow: string, title: string, text: string, links: Array<[string,string]> = []): string {
  return shell(`<main class="page" id="app-main">${pageHead(eyebrow,title,text)}<section class="module-board"><span class="module-board__code">MÓDULO / ESTRUCTURA ÉLITE</span><div><h2>${title}</h2><p>La ruta, el control de acceso y la integración remota ya tienen un lugar propio. El contenido definitivo se conectará cuando ZOORIGEN lo valide.</p></div><div class="module-board__links">${links.map(([href,label])=>`<a class="btn btn--ghost" href="#${href}">${label}</a>`).join('')}</div></section></main>`, title);
}

function lesson(courseId: string, lessonNumber: string): string {
  const item = catalog.courses.find((entry)=>entry.id === courseId);
  return shell(`<main class="page" id="app-main"><div class="lesson-layout"><section class="lesson-stage"><span class="eyebrow">Estación ${lessonNumber} · ${item?.area ?? 'Curso'}</span><h1>${item?.title ?? 'Lección'}</h1><div class="video-placeholder"><span>▶</span><p>El reproductor firmado por Bunny se habilitará con sesión y acceso verificados.</p></div><h2>Objetivo de observación</h2><p>${item?.description ?? 'Contenido pendiente de validación.'}</p></section><aside class="lesson-index"><span class="eyebrow">Ruta de campo</span><h3>${item?.lessons ?? 0} estaciones</h3>${Array.from({length: Math.min(item?.lessons ?? 1,8)},(_,index)=>`<a class="${String(index+1) === lessonNumber ? 'is-active' : ''}" href="#/curso/${courseId}/clase/${index+1}"><span>${String(index+1).padStart(2,'0')}</span> Lección ${index+1}</a>`).join('')}<a class="btn btn--primary" href="#/curso/${courseId}">Volver al curso</a></aside></div></main>`, `Estación ${lessonNumber}`);
}

function materialDetail(id: string, viewer = false): string {
  const item = catalog.resources.find((entry)=>entry.id === id);
  return shell(`<main class="page" id="app-main">${pageHead('Archivo científico', item?.title ?? 'Material', item?.area ?? 'Recurso de consulta')}<section class="material-sheet"><div class="material-sheet__cover">Z/<small>${item?.type ?? 'Documento'}</small></div><div><span class="eyebrow">Ficha de archivo</span><h2>${item?.title ?? 'Material no disponible'}</h2><p>${viewer ? 'El visor seguro está preparado para recibir una URL firmada y temporal desde la API.' : 'Consulta los metadatos antes de abrir el archivo protegido.'}</p>${viewer ? '<div class="viewer-placeholder">Vista previa protegida · archivo pendiente</div>' : `<a class="btn btn--primary" href="#/materiales/${id}/visor">Abrir visor</a>`}</div></section></main>`, item?.title ?? 'Material');
}

function community(): string {
  const threads = [['Identificación durante monitoreo nocturno','¿Qué rasgos usan para distinguir especies similares en campo?','12 respuestas'],['Buenas prácticas para cámaras trampa','Busco recomendaciones para reducir falsos positivos.','8 respuestas'],['Ruta de estudio para manejo de fauna','Comparto los cursos que me ayudaron a ordenar el tema.','5 respuestas']];
  return shell(`<main class="page" id="app-main">${pageHead('Comunidad','Aprender también es conversar','Espacio de intercambio moderado para dudas, experiencias y recursos.','<button class="btn btn--dark" data-toast="Publicar estará disponible con una cuenta real verificada">+ Crear conversación</button>')}<div class="community-layout"><section class="thread-list">${threads.map((thread,index)=>`<article class="thread"><span class="avatar">${['LM','AR','SV'][index]}</span><div><h3>${thread[0]}</h3><p>${thread[1]}</p></div><span class="thread__meta">${thread[2]}<br>hace ${index+1} h</span></article>`).join('')}</section><aside class="event-card"><span class="event-date">[fecha por confirmar]</span><h2 style="margin-top:22px">Sesión con especialista</h2><p>El calendario y la persona ponente deben confirmarse con ZOORIGEN antes de publicarse.</p><a class="btn btn--primary" href="#/en-vivo">Ver sesiones</a></aside></div></main>`, 'Comunidad');
}

function live(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Sesiones en vivo','Encuentros que conectan teoría y práctica','La membresía pública anuncia sesiones mensuales; fechas y especialistas están pendientes de validación.')}<section class="challenge-hero"><div><span class="pill">Próximamente</span><h2>Agenda científica ZOORIGEN</h2><p>Cuando el sistema entregue una sesión confirmada, aquí aparecerán fecha, ponente, cupo y enlace protegido. No mostraremos eventos ficticios.</p><button class="btn btn--primary" data-toast="Te avisaremos cuando haya una sesión confirmada">Solicitar aviso</button></div><div class="level-ring"><span>◉</span></div></section></main>`, 'En vivo');
}

function challenges(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Zona de práctica','Convierte el conocimiento en criterio','Retos breves para observar, recordar y tomar mejores decisiones.')}<section class="challenge-hero"><div><span class="pill">Nivel 4 · Naturalista</span><h2>Tu expedición continúa.</h2><p>Resuelve el reto diario, practica identificación y conserva tu racha semanal.</p><button class="btn btn--primary" data-toast="Reto completado en modo demo · +20 XP local">Comenzar reto diario</button></div><div class="level-ring"><span>4</span></div></section><div class="section-row"><h2>Entrenamiento</h2></div><div class="feature-grid"><article class="feature-card"><span style="font-size:30px">⌁</span><h3>Identificación relámpago</h3><p>Distingue rasgos clave con preguntas visuales.</p><button class="btn btn--ghost" data-toast="Módulo interactivo preparado para la siguiente iteración">Practicar</button></article><article class="feature-card"><span style="font-size:30px">▤</span><h3>Tarjetas científicas</h3><p>Repetición espaciada según tus respuestas.</p><button class="btn btn--ghost" data-toast="Próximamente: repetición espaciada">Repasar</button></article><article class="feature-card"><span style="font-size:30px">⌖</span><h3>Bitácora de campo</h3><p>Analiza situaciones y elige el siguiente paso.</p><button class="btn btn--ghost" data-toast="Próximamente: casos de campo ZOORIGEN">Explorar</button></article></div></main>`, 'Retos');
}

function rewards(): string {
  const items = [['Primer registro','Completa tu primera lección','7 días VIP',true],['Observador constante','Estudia tres días diferentes','Insignia',true],['Ruta completa','Completa un curso verificado','15 días VIP',false],['Voz de la comunidad','Participa con aportes útiles','[por confirmar]',false]] as const;
  return shell(`<main class="page" id="app-main">${pageHead('Recompensas','Tu avance deja huella','Las metas y premios son una propuesta; requieren aprobación comercial y validación del servidor.')}<div class="reward-grid">${items.map(([title,text,reward,ready])=>`<article class="reward ${ready ? '' : 'is-locked'}"><span class="reward__icon">${ready ? '✦' : '◇'}</span><h3>${title}</h3><p>${text}</p><strong>${reward}</strong><div class="progress" style="margin-top:12px"><span style="width:${ready ? 72 : 28}%"></span></div></article>`).join('')}</div><div class="prototype-note" style="margin-top:20px">Ningún botón del navegador concederá acceso real. Las recompensas se verificarán y otorgarán exclusivamente desde la API.</div></main>`, 'Recompensas');
}

function certificates(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Certificados','Evidencia de lo que aprendiste','Cada certificado real deberá tener folio y verificación pública respaldada por el servidor.')}<div class="resource-grid"><article class="resource" style="grid-column:span 2"><div class="resource__cover" style="min-height:270px;background:linear-gradient(135deg,#f7f0df,#e8d3a0);color:#173f35;border:1px solid #d9bd73"><div style="text-align:center"><span class="brand__mark" style="margin:auto">Z</span><h2 style="margin:18px 0 5px">Certificado de finalización</h2><p style="font-size:14px">Demostración visual · no válido</p></div></div><h3>Fundamentos de observación de fauna</h3><p>Folio de muestra: ZOO-DEMO-0001</p></article><article class="feature-card"><h3>Verificación pública</h3><p>Permite comprobar folio, nombre del curso y fecha sin revelar información adicional.</p><button class="btn btn--dark" data-toast="La verificación real se conectará a la API">Verificar folio</button></article></div></main>`, 'Certificados');
}

function profile(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Cuenta','Tu perfil de aprendizaje','Preferencias, intereses, progreso y estado de acceso en un solo lugar.')}<div class="feature-grid"><article class="feature-card"><div class="profile-row"><span class="avatar" style="width:58px">MG</span><div><h3 style="margin:0">Miembro demo</h3><p style="margin:0">Cuenta local de demostración</p></div></div><button class="btn btn--ghost" style="margin-top:20px" data-toast="La edición de perfil se habilitará con Firebase Auth">Editar perfil</button></article><article class="feature-card"><span class="eyebrow">Intereses</span><h3>Fauna silvestre · Investigación</h3><p>Usaremos estos datos solo con consentimiento y una política de privacidad aprobada.</p></article><article class="feature-card"><span class="eyebrow">Membresía</span><h3>Acceso de demostración</h3><p>No existe una suscripción ni un cobro asociado a esta cuenta local.</p><a class="btn btn--dark" href="#/suscripcion">Ver opciones</a></article></div></main>`, 'Mi perfil');
}

function subscription(): string {
  return shell(`<main class="page" id="app-main">${pageHead('Membresía','Elige cómo continuar','Precios públicos observados; la compra permanece desconectada hasta validar Stripe y las condiciones.')}<div class="feature-grid"><article class="feature-card"><span class="eyebrow">Mensual</span><h3 style="font-size:38px">$${catalog.plans.monthly ?? '[por confirmar]'}</h3><p>MXN al mes · renovación y términos por confirmar.</p><button class="btn btn--primary" data-toast="Pagos desactivados en el prototipo">Elegir mensual</button></article><article class="feature-card"><span class="eyebrow">Anual</span><h3 style="font-size:38px">$${catalog.plans.annual ?? '[por confirmar]'}</h3><p>MXN al año · precio y ahorro pendientes de validación.</p><button class="btn btn--dark" data-toast="Pagos desactivados en el prototipo">Elegir anual</button></article><article class="feature-card"><span class="eyebrow">¿Necesitas ayuda?</span><h3>Habla con ZOORIGEN</h3><p>Para dudas de acceso, pagos o beneficios, usa un canal de atención confirmado.</p><a class="btn btn--ghost" href="https://wa.me/5212361113237" rel="noreferrer">Abrir WhatsApp</a></article></div></main>`, 'Membresía');
}

function admin(): string {
  const items = [['Cursos','Catálogo, clases y publicación'],['Biblioteca','Recursos, portadas y archivos'],['Sesiones','Agenda, ponentes y cupos'],['Miembros','Accesos, progreso y soporte'],['Certificados','Folios y verificación'],['Comunidad','Moderación y avisos'],['Recompensas','Metas, límites y campañas'],['Configuración','Marca, contacto y condiciones']];
  return shell(`<main class="page" id="app-main">${pageHead('Panel administrativo','Gestión de ZOORIGEN','Prototipo estructural. En producción exigirá un custom claim administrativo validado por la API.')}<div class="demo-strip" style="margin-bottom:20px">⚿ Este panel no escribe en Firebase ni modifica información real.</div><div class="admin-grid">${items.map(([title,text])=>`<article class="admin-card"><span style="font-size:27px">◇</span><h3>${title}</h3><p>${text}</p><button class="btn btn--ghost" data-toast="Módulo administrativo preparado para integración segura">Abrir módulo</button></article>`).join('')}</div></main>`, 'Administración');
}

function adminModule(path: string): string {
  const names: Record<string,string> = { cursos:'Cursos', materiales:'Materiales', 'en-vivo':'Sesiones en vivo', quizzes:'Quizzes', miembros:'Miembros', cupones:'Cupones', comunidad:'Comunidad', avisos:'Avisos', ajustes:'Ajustes', experiencia:'Experiencia' };
  const key = path.split('/').pop() ?? '';
  return modulePage('Centro de operaciones', names[key] ?? 'Administración', 'Módulo administrativo con autorización por claim y escritura exclusiva a través de la API.', [['/admin','Volver al centro']]);
}

function login(): string {
  return `<main class="login-page"><section class="login-scene"><div class="login-scene__copy"><span class="pill">Club VIP ZOORIGEN</span><h1>Tu próxima expedición empieza aquí.</h1><p>Accede a cursos, recursos y comunidad desde cualquier dispositivo.</p></div></section><section class="login-panel"><div class="login-box"><a class="brand" href="/"><span class="brand__mark">Z</span><span>ZOORIGEN</span></a><h2>Bienvenido</h2><p>El acceso real se conectará a Firebase después de validar el proyecto y el entorno correctos.</p><div class="field"><label for="email">Correo electrónico</label><input id="email" type="email" autocomplete="email" placeholder="tu@correo.com"></div><div class="field"><label for="password">Contraseña</label><input id="password" type="password" autocomplete="current-password" placeholder="••••••••"></div><div class="login-actions"><button class="btn btn--dark" data-demo-login>Entrar al prototipo</button></div><div class="login-separator">o continúa localmente</div><button class="btn btn--ghost" style="width:100%" data-demo-login>Explorar como miembro demo</button><div class="prototype-note" style="margin-top:22px">No escribas una contraseña real. Este formulario no envía información.</div></div></section></main>`;
}

function render(): void {
  const route = currentRoute();
  const pages: Record<string, () => string> = {
    '/': dashboard, '/login': login, '/cursos': courses, '/materiales': resources, '/comunidad': community, '/en-vivo': live,
    '/retos': challenges, '/recompensas': rewards, '/certificados': certificates, '/perfil': profile, '/suscripcion': subscription, '/admin': admin,
    '/bienvenida': () => modulePage('Primera entrada','Bienvenido a tu expedición','Onboarding equivalente al de Élite Pecuario, adaptado a intereses de fauna y conservación.', [['/encuestas','Configurar mis intereses'],['/','Saltar por ahora']]),
    '/encuestas': () => modulePage('Perfil de aprendizaje','Tu punto de partida','Encuesta inicial para personalizar rutas, nivel e intereses sin mezclar datos con otro proyecto.', [['/','Guardar en modo demo']]),
    '/retos/historia': () => modulePage('Historia interactiva','Casos de campo','Mundos, niveles y decisiones conservan la estructura narrativa de Élite Pecuario.', [['/retos/historia/caso-01','Abrir primer caso']]),
    '/herramientas': () => modulePage('Kit digital','Herramientas de campo','Calculadoras, listas, fichas y utilidades científicas dentro del mismo sistema modular.', [['/materiales','Abrir archivo']]),
    '/logros': () => modulePage('Bitácora','Logros y liga','Hitos, rachas, XP y liga semanal con validación remota en modo conectado.', [['/recompensas','Ver recompensas']]),
    '/configuracion': () => modulePage('Cuenta','Configuración','Preferencias, avisos, privacidad y administración de sesión.', [['/perfil','Ir a mi perfil']]),
  };
  if (route.path === '/curso/:id') app.innerHTML = course(route.params.id);
  else if (route.path === '/curso/:id/clase/:n') app.innerHTML = lesson(route.params.id, route.params.n);
  else if (route.path === '/materiales/:id') app.innerHTML = materialDetail(route.params.id);
  else if (route.path === '/materiales/:id/visor') app.innerHTML = materialDetail(route.params.id, true);
  else if (route.path === '/retos/historia/:id') app.innerHTML = modulePage('Caso de campo', 'Decisión bajo observación', `Caso ${route.params.id}: escenario interactivo preparado para integrar los niveles de historia.`, [['/retos/historia','Volver a los casos']]);
  else if (route.path.startsWith('/admin/')) app.innerHTML = adminModule(route.path);
  else app.innerHTML = (pages[route.path] ?? dashboard)();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const area = target.closest<HTMLButtonElement>('[data-area]');
  if (area?.dataset.area) { activeArea = area.dataset.area; render(); return; }
  const toastButton = target.closest<HTMLElement>('[data-toast]');
  if (toastButton?.dataset.toast) showToast(toastButton.dataset.toast);
  if (target.closest('[data-demo-login]')) location.hash = '#/';
  const progress = target.closest<HTMLElement>('[data-progress]');
  if (progress) showToast('Lección abierta en modo demo. El avance real se validará desde la API.');
});

function showToast(message: string): void {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

window.addEventListener('hashchange', render);
catalog = await Data.catalog();
render();

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
