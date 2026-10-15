const data = window.ZOORIGEN_DATA;
// Esta portada está preparando el reemplazo completo de sus imágenes.
const imagesPending = document.body.dataset.imagesPending === 'true';
const natureLanding = document.body.dataset.landingDesign === 'nature';
const premiumLanding = natureLanding || document.body.dataset.landingDesign === 'premium';
const landingAreaImages = {
  'fauna-ponzonosa-toxicologia': 'toxicologia',
  'fauna-silvestre-conservacion': 'conservacion',
  'etologia-manejo-animal': 'etologia',
  'apicultura-polinizacion': 'polinizacion',
  'investigacion-cientifica-monitoreo': 'monitoreo',
  'manejo-fauna-cautiverio-exhibicion': 'manejo'
};
function landingImage(areaName) {
  const area = data.areas.find(item => item.name === areaName);
  return `assets/img/landing/area-${landingAreaImages[area?.slug] || 'conservacion'}.webp`;
}
// Portadas editoriales por curso; los volantes originales permanecen en data.js.
const courseCoverFiles = {
  biologia_tiburones_rayas: 'curso-tiburones-rayas',
  entrenamiento_basico_canino: 'curso-entrenamiento-canino',
  etologia_fauna_silvestre: 'curso-etologia-cautiverio',
  fauna_ponzonosa_mexico: 'curso-fauna-ponzonosa',
  fototrampeo_monitoreo_mamiferos: 'curso-fototrampeo',
  introduccion_entomologia_forense: 'curso-entomologia-forense',
  manejo_integral_umas_fauna_silvestre: 'curso-legislacion-uma',
  mariposarios_manejo_conservacion: 'curso-mariposarios',
  rescate_fauna_silvestre: 'curso-rescate-reubicacion',
  ultrasonografia_mamiferos_silvestres: 'curso-ultrasonografia',
  control_vectores_zoonosis: 'curso-vectores-zoonosis'
};
function courseCover(course) {
  return courseCoverFiles[course.id]
    ? `assets/img/cursos/portadas/${courseCoverFiles[course.id]}.webp`
    : premiumLanding ? landingImage(course.area) : course.image;
}
const areasGrid = document.getElementById('areasGrid');
const coursesGrid = document.getElementById('coursesGrid');
const toolbar = document.querySelector('.zs-chips');
const galleryGrid = document.getElementById('galleryGrid');
const reviewsGrid = document.getElementById('reviewsGrid');
const companiesGrid = document.getElementById('companiesGrid');
const modal = document.getElementById('courseModal');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModal');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const courseSearch = document.getElementById('courseSearch');
const coursesCount = document.getElementById('coursesCount');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

let activeFilter = 'all';
let searchTerm = '';
let lightboxItems = [];
let lightboxIndex = 0;
const carouselStates = new WeakMap();

function formatCounter(value) { return `${value}+`; }

function getFilteredCourses() {
  return data.courses.filter(course => {
    const matchesArea = activeFilter === 'all' || course.area === activeFilter;
    const haystack = `${course.name} ${course.summary} ${course.area}`.toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase().trim());
    return matchesArea && matchesSearch;
  });
}

function renderAreas() {
  if (natureLanding) {
    const titles = {
      'fauna-ponzonosa-toxicologia': 'Fauna ponzoñosa',
      'fauna-silvestre-conservacion': 'Fauna y conservación',
      'etologia-manejo-animal': 'Etología y comportamiento',
      'apicultura-polinizacion': 'Apicultura y polinizadores',
      'investigacion-cientifica-monitoreo': 'Investigación y monitoreo',
      'manejo-fauna-cautiverio-exhibicion': 'Manejo bajo cuidado humano'
    };
    areasGrid.innerHTML = data.areas.map((area, index) => `
      <article class="area-tw ${activeFilter === area.name ? 'is-active' : ''}" data-area="${area.name}" tabindex="0" role="button" aria-label="Filtrar cursos de ${area.name}">
        <div class="area-tw__media"><img src="${landingImage(area.name)}" alt="Imagen ilustrativa de ${area.name}" loading="lazy" width="320" height="200"><span class="area-tw__num">0${index + 1}</span></div>
        <div class="area-tw__body"><span class="area-tw__count">${data.courses.filter(course => course.area === area.name).length} cursos</span><h3 class="area-tw__title">${titles[area.slug]}</h3><p class="area-tw__text">${area.desc}</p></div>
        <div class="area-tw__foot"><span class="area-tw__btn">Explorar área <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg></span></div>
      </article>
    `).join('');
  } else {
  areasGrid.innerHTML = data.areas.map(area => `
    <article class="area-card ${activeFilter === area.name ? 'is-active' : ''}" data-area="${area.name}" tabindex="0" role="button" aria-label="Filtrar cursos de ${area.name}">
      ${imagesPending ? '<div class="visual-slot area-visual"><span>ÁREA DE FORMACIÓN</span></div>' : `<img src="${premiumLanding ? landingImage(area.name) : area.cover}" alt="${premiumLanding ? 'Imagen ilustrativa de ' : ''}${area.name}" loading="lazy">`}
      <div class="area-card__body">
        <h3>${area.name}</h3>
        <p>${area.desc}</p>
      </div>
    </article>
  `).join('');
  }

  areasGrid.querySelectorAll('.area-card, .area-tw').forEach(card => {
    const activate = () => {
      activeFilter = card.dataset.area;
      updateFilterButtons();
      renderAreas();
      renderCourses();
      document.getElementById('cursos').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  });
}

function renderToolbar() {
  const buttons = ['all', ...data.areas.map(area => area.name)];
  toolbar.innerHTML = buttons.map(item => `
    <button type="button" class="zs-chip ${activeFilter === item ? 'is-active' : ''}" data-filter="${item}" aria-pressed="${activeFilter === item}">${item === 'all' ? 'Todos' : item}</button>
  `).join('');

  toolbar.querySelectorAll('.zs-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      updateFilterButtons();
      renderAreas();
      renderCourses();
    });
  });
}

function updateFilterButtons() {
  toolbar.querySelectorAll('.zs-chip').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.filter === activeFilter);
    btn.setAttribute('aria-pressed', String(btn.dataset.filter === activeFilter));
  });
}

function renderCourses() {
  const filtered = getFilteredCourses();
  coursesCount.textContent = `${filtered.length} curso${filtered.length === 1 ? '' : 's'} disponible${filtered.length === 1 ? '' : 's'}`;

  if (!filtered.length) {
    coursesGrid.innerHTML = `
      <article class="zs-vacio">
        <h3>No encontramos cursos con ese filtro</h3>
        <p>Prueba con otra área o escribe una búsqueda diferente para ver más opciones.</p>
        <button type="button" class="zs-boton zs-boton--verde" id="resetFilters">Ver todos los cursos</button>
      </article>
    `;
    document.getElementById('resetFilters')?.addEventListener('click', () => {
      activeFilter = 'all';
      searchTerm = '';
      courseSearch.value = '';
      updateFilterButtons();
      renderAreas();
      renderCourses();
    });
    return;
  }

  coursesGrid.innerHTML = filtered.map(course => `
    <article class="zs-curso">
      <div class="zs-curso__img">
        ${imagesPending ? '<div class="visual-slot course-visual"><span>NUEVA PORTADA DE CURSO</span></div>' : `<img src="${courseCover(course)}" alt="Imagen ilustrativa del curso ${course.name}" loading="lazy" width="640" height="360">`}
      </div>
      <div class="zs-curso__cuerpo">
        <div class="zs-curso__etiquetas">
          <span class="zs-etiqueta">${course.area}</span>
          <span class="zs-etiqueta zs-etiqueta--dorada">${course.badge || 'Modalidad online'}</span>
        </div>
        <h3>${course.name}</h3>
        <p>${course.summary}</p>
        <div class="zs-curso__acciones">
          <button type="button" class="zs-curso__detalle" data-course="${course.id}">Ver detalles</button>
          <a class="zs-boton zs-boton--verde zs-boton--chico" href="https://wa.me/5212361113237?text=${encodeURIComponent('Hola, me interesa el curso: ' + course.name)}" target="_blank" rel="noopener noreferrer">Informes</a>
        </div>
      </div>
    </article>
  `).join('');

  coursesGrid.querySelectorAll('[data-course]').forEach(button => {
    button.addEventListener('click', () => openCourseModal(button.dataset.course));
  });
}

function openCourseModal(courseId) {
  const course = data.courses.find(item => item.id === courseId);
  if (!course) return;
  modalContent.innerHTML = `
    <div class="modal__hero">
      ${imagesPending ? '<div class="visual-slot modal-visual"><span>PORTADA DE CURSO</span><p>Imagen por definir</p></div>' : `<img src="${courseCover(course)}" alt="Imagen ilustrativa del curso ${course.name}">`}
      <div>
        <div class="modal__badges">
          <span class="badge">${course.area}</span>
          <span class="badge badge--soft">${course.badge || 'Modalidad online'}</span>
        </div>
        <h2 style="margin-top:12px;">${course.name}</h2>
        <p>${course.summary}</p>
        <p><strong>Dirigido a:</strong> ${course.audience}</p>
        <h3>Este curso incluye</h3>
        <ul class="modal__list">${course.benefits.map(item => `<li>${item}</li>`).join('')}</ul>
        <div class="modal__cta">
          <a class="btn btn--primary" href="https://wa.me/5212361113237?text=${encodeURIComponent('Hola, me interesa el curso: ' + course.name)}" target="_blank" rel="noopener">Solicitar informes</a>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-locked');
}

function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-locked');
}

function renderMediaTrack(track, items, type) {
  if (!track) return;
  if (type === 'company' && !imagesPending) {
    // Tarjeta que gira: frente con el logo, reverso con el nombre. Solo la primera copia entra al teclado.
    const logos = (enfocable) => items.map(item => `<div class="zs-logo"${enfocable ? ' tabindex="0" role="group" aria-label="' + item.name + '"' : ''}><div class="zs-logo__giro"><div class="zs-logo__cara zs-logo__cara--frente"><img src="${item.image}" alt="${enfocable ? item.name : ''}" loading="lazy"></div><div class="zs-logo__cara zs-logo__cara--dorso"><svg class="zs-i" aria-hidden="true" focusable="false"><use href="#zs-building"/></svg><strong>${item.name}</strong></div></div></div>`).join('');
    track.innerHTML = `<div class="zs-logos"><div class="zs-logos__grupo">${logos(true)}</div><div class="zs-logos__grupo" aria-hidden="true">${logos(false)}</div></div>`;
    return;
  }
  if (premiumLanding) {
    if (type === 'company') {
      track.innerHTML = `<div class="companies-text">${items.map(item => `<span>${item.name}</span>`).join('')}</div>`;
    } else if (type === 'gallery') {
      track.innerHTML = `<div class="wildlife-gallery">${['conservacion', 'polinizacion', 'manejo'].map((name, index) => `<figure><img src="assets/img/landing/area-${name}.webp" alt="Imagen ilustrativa de ${['una tortuga marina', 'una abeja polinizadora', 'una guacamaya'][index]}" loading="lazy"><figcaption><span>0${index + 1}</span>${['Conservar los ecosistemas', 'Entender a los polinizadores', 'Estudiar la diversidad'][index]}</figcaption></figure>`).join('')}</div>`;
    }
    // Las reseñas ya no se pintan aquí: el muro de tarjetas está escrito en index.html (sin capturas de pantalla).
    return;
  }
  if (imagesPending) {
    if (type === 'company') {
      track.innerHTML = `<div class="companies-text">${items.map(item => `<span>${item.name}</span>`).join('')}</div>`;
    } else {
      const label = type === 'gallery' ? 'Nueva galería de la comunidad' : 'Testimonios reales de la comunidad';
      track.innerHTML = `<div class="visual-slot media-placeholder"><span>${label}</span><p>Contenido visual pendiente de reemplazo</p></div>`;
    }
    return;
  }

  if (type === 'company') {
    // Marquee CSS puro — sin scroll, sin JS, compatible con GitHub Pages
    const logos = items.map(item => `
      <div class="company-logo">
        <img src="${item.image}" alt="${item.name}" loading="lazy">
      </div>`).join('');
    track.innerHTML = `<div class="companies-band">${logos}${logos}</div>`;
    return;
  }

  track.innerHTML = items.map((item, index) => `
    <button class="media-card" data-lightbox-group="${type}" data-index="${index}" aria-label="${item.caption || item.name}">
      <img src="${item.src || item.image}" alt="${item.alt || item.name}" loading="lazy">
    </button>
  `).join('');
}

function renderGallery() {
  const galleryItems = data.students.map((src, index) => ({ src, alt: `Alumno Zoorigen ${index + 1}`, caption: `Alumno graduado ${index + 1}` }));
  const reviewItems = [];   // las capturas de reseñas ya no se muestran (muro de tarjetas en index.html)
  const companyItems = data.companies.map(item => ({ image: item.image, name: item.name }));

  renderMediaTrack(galleryGrid, galleryItems, 'gallery');
  renderMediaTrack(reviewsGrid, reviewItems, 'reviews');
  renderMediaTrack(companiesGrid, companyItems, 'company');

  document.querySelectorAll('[data-lightbox-group]').forEach(button => {
    button.addEventListener('click', () => {
      lightboxItems = button.dataset.lightboxGroup === 'gallery' ? galleryItems : reviewItems;
      lightboxIndex = Number(button.dataset.index);
      openLightbox();
    });
  });

  initAutoCarousel(galleryGrid, 0.55);
  // Las recomendaciones se leen sin desplazamiento automático ni duplicados.
  if (!premiumLanding) initAutoCarousel(reviewsGrid, 0.38);
  
}

function initAutoCarousel(track, speed = 0.45) {
  if (!track) return;
  if (premiumLanding && track === reviewsGrid) return;
  const existingState = carouselStates.get(track);
  if (existingState?.frame) cancelAnimationFrame(existingState.frame);
  track.querySelectorAll('.is-clone').forEach(item => item.remove());
  const cards = Array.from(track.children);
  if (cards.length < 2) return;
  cards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('is-clone');
    clone.setAttribute('aria-hidden', 'true');
    clone.tabIndex = -1;
    track.appendChild(clone);
  });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const state = { paused: false, frame: null };
  const pause = () => { state.paused = true; };
  const resume = () => { state.paused = false; };
  const step = () => {
    if (!state.paused) {
      track.scrollLeft += speed;
      const resetPoint = track.scrollWidth / 2;
      if (track.scrollLeft >= resetPoint) track.scrollLeft = 0;
    }
    state.frame = requestAnimationFrame(step);
  };
  ['mouseenter', 'focusin', 'touchstart', 'pointerdown'].forEach(evt => track.addEventListener(evt, pause, { passive: true }));
  ['mouseleave', 'focusout'].forEach(evt => track.addEventListener(evt, resume));
  track.addEventListener('touchend', () => window.setTimeout(resume, 1200), { passive: true });
  track.scrollLeft = 0;
  state.frame = requestAnimationFrame(step);
  carouselStates.set(track, state);
}

function bindCarouselButtons() {
  document.querySelectorAll('.carousel-arrow').forEach(button => {
    button.addEventListener('click', () => {
      const track = document.getElementById(button.dataset.target);
      if (!track) return;
      const amount = Math.max(track.clientWidth * 0.85, 320);
      track.scrollBy({ left: button.classList.contains('carousel-arrow--next') ? amount : -amount, behavior: 'smooth' });
    });
  });
}

function updateLightbox() {
  const current = lightboxItems[lightboxIndex];
  if (!current) return;
  lightboxImage.src = current.src;
  lightboxImage.alt = current.alt;
  lightboxCaption.textContent = current.caption;
}

function openLightbox() {
  updateLightbox();
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-locked');
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  if (!modal.classList.contains('is-open')) document.body.classList.remove('is-locked');
}

function moveLightbox(step) {
  if (!lightboxItems.length) return;
  lightboxIndex = (lightboxIndex + step + lightboxItems.length) % lightboxItems.length;
  updateLightbox();
}

function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.counter);
      const duration = 1100;
      const start = performance.now();
      const animate = (time) => {
        const progress = Math.min((time - start) / duration, 1);
        const current = Math.floor(progress * target);
        el.textContent = progress === 1 ? formatCounter(target) : `${current}`;
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      observer.unobserve(el);
    });
  }, { threshold: 0.45 });
  counters.forEach(counter => observer.observe(counter));
}

function setNavigationOpen(open) {
  navLinks.classList.toggle('is-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
}
navToggle.addEventListener('click', () => setNavigationOpen(!navLinks.classList.contains('is-open')));
document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => setNavigationOpen(false)));
courseSearch?.addEventListener('input', (event) => { searchTerm = event.target.value; renderCourses(); });
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target.dataset.close) closeModal(); });
lightboxClose?.addEventListener('click', closeLightbox);
lightboxPrev?.addEventListener('click', () => moveLightbox(-1));
lightboxNext?.addEventListener('click', () => moveLightbox(1));
lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closeModal(); closeLightbox(); setNavigationOpen(false); }
  if (!lightbox.classList.contains('is-open')) return;
  if (event.key === 'ArrowRight') moveLightbox(1);
  if (event.key === 'ArrowLeft') moveLightbox(-1);
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) setNavigationOpen(false);
  initAutoCarousel(galleryGrid, 0.55);
  initAutoCarousel(reviewsGrid, 0.38);
  
});

renderToolbar();
renderAreas();
renderCourses();
renderGallery();
bindCarouselButtons();
initCounters();
