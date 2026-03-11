const data = window.ZOORIGEN_DATA;
const areasGrid = document.getElementById('areasGrid');
const coursesGrid = document.getElementById('coursesGrid');
const toolbar = document.querySelector('.course-toolbar');
const galleryGrid = document.getElementById('galleryGrid');
const reviewsGrid = document.getElementById('reviewsGrid');
const companiesGrid = document.getElementById('companiesGrid');
const modal = document.getElementById('courseModal');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModal');
const backToTop = document.getElementById('backToTop');
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
  areasGrid.innerHTML = data.areas.map(area => `
    <article class="area-card ${activeFilter === area.name ? 'is-active' : ''}" data-area="${area.name}" tabindex="0" role="button" aria-label="Filtrar cursos de ${area.name}">
      <img src="${area.cover}" alt="${area.name}" loading="lazy">
      <div class="area-card__body">
        <h3>${area.name}</h3>
        <p>${area.desc}</p>
      </div>
    </article>
  `).join('');

  areasGrid.querySelectorAll('.area-card').forEach(card => {
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
    <button class="filter-chip ${activeFilter === item ? 'is-active' : ''}" data-filter="${item}">${item === 'all' ? 'Todos' : item}</button>
  `).join('');

  toolbar.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      updateFilterButtons();
      renderAreas();
      renderCourses();
    });
  });
}

function updateFilterButtons() {
  toolbar.querySelectorAll('.filter-chip').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.filter === activeFilter);
  });
}

function renderCourses() {
  const filtered = getFilteredCourses();
  coursesCount.textContent = `${filtered.length} curso${filtered.length === 1 ? '' : 's'} disponible${filtered.length === 1 ? '' : 's'}`;

  if (!filtered.length) {
    coursesGrid.innerHTML = `
      <article class="empty-state">
        <h3>No encontramos cursos con ese filtro</h3>
        <p>Prueba con otra área o escribe una búsqueda diferente para ver más opciones.</p>
        <button class="btn btn--primary" id="resetFilters">Ver todos los cursos</button>
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
    <article class="course-card course-card--carousel">
      <div class="course-card__image">
        <img src="${course.image}" alt="${course.name}" loading="lazy">
      </div>
      <div class="course-card__body">
        <div class="course-card__meta">
          <span class="badge">${course.area}</span>
          <span class="badge badge--soft">${course.badge || 'Modalidad online'}</span>
        </div>
        <h3>${course.name}</h3>
        <p>${course.summary}</p>
        <div class="course-card__actions">
          <button class="link-button" data-course="${course.id}">Ver detalles</button>
          <a class="btn btn--primary" href="https://wa.me/5212361113237?text=${encodeURIComponent('Hola, me interesa el curso: ' + course.name)}" target="_blank" rel="noopener">Informes</a>
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
      <img src="${course.image}" alt="${course.name}">
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
  track.innerHTML = items.map((item, index) => `
    <button class="media-card ${type === 'company' ? 'media-card--logo' : ''}" ${type === 'company' ? '' : `data-lightbox-group="${type}" data-index="${index}"`} aria-label="${item.caption || item.name}">
      <img src="${item.src || item.image}" alt="${item.alt || item.name}" loading="lazy">
    </button>
  `).join('');
}

function renderGallery() {
  const galleryItems = data.students.map((src, index) => ({ src, alt: `Alumno Zoorigen ${index + 1}`, caption: `Alumno graduado ${index + 1}` }));
  const reviewItems = data.reviews.map((src, index) => ({ src, alt: `Reseña Zoorigen ${index + 1}`, caption: `Reseña de la comunidad ${index + 1}` }));
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
  initAutoCarousel(reviewsGrid, 0.38);
  initAutoCarousel(companiesGrid, 0.3);
}

function initAutoCarousel(track, speed = 0.45) {
  if (!track) return;
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

window.addEventListener('scroll', () => backToTop.classList.toggle('is-visible', window.scrollY > 500));
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
navToggle.addEventListener('click', () => navLinks.classList.toggle('is-open'));
document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => navLinks.classList.remove('is-open')));
courseSearch?.addEventListener('input', (event) => { searchTerm = event.target.value; renderCourses(); });
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target.dataset.close) closeModal(); });
lightboxClose?.addEventListener('click', closeLightbox);
lightboxPrev?.addEventListener('click', () => moveLightbox(-1));
lightboxNext?.addEventListener('click', () => moveLightbox(1));
lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closeModal(); closeLightbox(); }
  if (!lightbox.classList.contains('is-open')) return;
  if (event.key === 'ArrowRight') moveLightbox(1);
  if (event.key === 'ArrowLeft') moveLightbox(-1);
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) navLinks.classList.remove('is-open');
  initAutoCarousel(galleryGrid, 0.55);
  initAutoCarousel(reviewsGrid, 0.38);
  initAutoCarousel(companiesGrid, 0.3);
});

renderToolbar();
renderAreas();
renderCourses();
renderGallery();
bindCarouselButtons();
initCounters();
