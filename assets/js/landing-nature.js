/* Portada pública: profundidad por capas. No simula una animación anatómica del animal. */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  var grid = document.getElementById('areasGrid');
  var toggle = document.getElementById('natureMotionToggle');
  if (!hero || !grid || !toggle) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var paused = false;
  var frame = 0;
  var activeCard = null;
  var heroVisible = true;
  var slides = Array.from(hero.querySelectorAll('.hero-slide'));
  var dots = Array.from(hero.querySelectorAll('.hero-slide-dot'));
  var slideIndex = 0;
  var slideTimer = null;
  function showSlide(index) {
    slideIndex = index;
    slides.forEach(function (slide, i) { slide.classList.toggle('is-active', i === index); slide.setAttribute('aria-hidden', String(i !== index)); });
    dots.forEach(function (dot, i) { dot.classList.toggle('is-current', i === index); dot.setAttribute('aria-pressed', String(i === index)); });
  }
  function scheduleSlides() {
    clearInterval(slideTimer); slideTimer = null;
    if (enabled() && heroVisible && slides.length > 1) slideTimer = setInterval(function () { showSlide((slideIndex + 1) % slides.length); }, 6500);
  }
  dots.forEach(function (dot, i) { dot.addEventListener('click', function () { showSlide(i); scheduleSlides(); }); });
  function enabled() { return !paused && !reduced.matches && !document.hidden; }
  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    hero.style.removeProperty('--hero-x');
    hero.style.removeProperty('--hero-y');
    grid.querySelectorAll('.nature-card').forEach(function (card) {
      ['--card-x', '--card-y', '--animal-x', '--animal-y', '--glare-x', '--glare-y'].forEach(function (key) { card.style.removeProperty(key); });
    });
    activeCard = null;
  }
  function refresh() {
    document.body.classList.toggle('nature-motion-paused', !enabled());
    toggle.disabled = reduced.matches;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = reduced.matches ? 'Movimiento reducido' : paused ? 'Activar imágenes' : 'Pausar imágenes';
    if (!enabled()) reset();
    scheduleSlides();
  }
  toggle.addEventListener('click', function () { paused = !paused; refresh(); });
  if (reduced.addEventListener) reduced.addEventListener('change', refresh);
  else reduced.addListener(refresh);
  document.addEventListener('visibilitychange', refresh);
  hero.addEventListener('pointermove', function (event) {
    if (!enabled() || !heroVisible || event.pointerType !== 'mouse') return;
    var bounds = hero.getBoundingClientRect();
    var x = (event.clientX - bounds.left) / bounds.width - .5;
    var y = (event.clientY - bounds.top) / bounds.height - .5;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      hero.style.setProperty('--hero-x', (x * 12).toFixed(2) + 'px');
      hero.style.setProperty('--hero-y', (y * 7).toFixed(2) + 'px');
    });
  });
  hero.addEventListener('pointerleave', function () {
    hero.style.removeProperty('--hero-x');
    hero.style.removeProperty('--hero-y');
  });
  grid.addEventListener('pointermove', function (event) {
    if (!enabled() || event.pointerType !== 'mouse') return;
    var card = event.target.closest('.nature-card');
    if (!card || !grid.contains(card)) return;
    if (activeCard && activeCard !== card) ['--card-x','--card-y','--animal-x','--animal-y','--glare-x','--glare-y'].forEach(function (key) { activeCard.style.removeProperty(key); });
    activeCard = card;
    var bounds = card.getBoundingClientRect();
    var x = (event.clientX - bounds.left) / bounds.width - .5;
    var y = (event.clientY - bounds.top) / bounds.height - .5;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      card.style.setProperty('--card-x', (-y * 5).toFixed(2) + 'deg');
      card.style.setProperty('--card-y', (x * 7).toFixed(2) + 'deg');
      card.style.setProperty('--animal-x', (x * 9).toFixed(2) + 'px');
      card.style.setProperty('--animal-y', (y * 5).toFixed(2) + 'px');
      card.style.setProperty('--glare-x', ((x + .5) * 100).toFixed(1) + '%');
      card.style.setProperty('--glare-y', ((y + .5) * 100).toFixed(1) + '%');
    });
  });
  grid.addEventListener('pointerleave', reset);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      hero.classList.toggle('nature-out-of-view', !heroVisible);
      scheduleSlides();
    }).observe(hero);
  }
  refresh();
})();
