/* Transiciones de la portada pública, pausadas fuera de pantalla. */
(function () {
  'use strict';
  document.querySelectorAll('.edge-monkey').forEach(function (element) { element.remove(); });
  if (!('IntersectionObserver' in window)) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.target.classList.contains('design-reveal') && entry.isIntersecting) entry.target.classList.add('is-revealed');
      if (entry.target.matches('.registration-layout,.about-story,.certificate-stage,.companies-marquee-wrap,.territory-card')) entry.target.classList.toggle('is-in-view', entry.isIntersecting);
    });
  }, {threshold:.06});
  var selector = '#empresas .section-head,#areas .section-head,#cursos .section-head,.territory-card,.course-card,#como-empezar .section-head,.start-grid article,.benefit-card,#panel .structure-split > div,#experiencia .section-head,.experience-grid article,.certification-grid > div,#galeria .section-head,.wildlife-gallery figure,.community-reviews article,#preguntas .section-head,.faq-list details,.contact-box__content,.contact-card';
  function attach(root) {
    root.querySelectorAll(selector).forEach(function (element, i) {
      if (element.dataset.revealWatched) return;
      element.dataset.revealWatched = 'true';
      element.classList.add('design-reveal');
      element.style.transitionDelay = Math.min(i % 3, 2) * 70 + 'ms';
      observer.observe(element);
    });
  }
  document.querySelectorAll('.design-reveal').forEach(function (element) { observer.observe(element); });
  document.querySelectorAll('.registration-layout,.about-story,.certificate-stage,.companies-marquee-wrap').forEach(function (element) { observer.observe(element); });
  attach(document);
  document.querySelectorAll('.social-review').forEach(function (element) {
    element.classList.add('design-reveal');
    observer.observe(element);
  });
  ['areasGrid','coursesGrid'].forEach(function (id) {
    var element = document.getElementById(id);
    if (element) new MutationObserver(function () { attach(document); }).observe(element, {childList:true});
  });
  document.body.classList.add('design-motion-ready');
})();
