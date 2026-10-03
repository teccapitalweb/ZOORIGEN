import { Data } from '../core/data';
import type { Course } from '../core/types';

export const pageHead = (eyebrow: string, title: string, text: string, action = '') => `<div class="page-head"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${text}</p></div>${action}</div>`;

export const demoStrip = () => Data.mode === 'demo' ? '<div class="demo-strip">◌ <strong>Modo demostración:</strong> el progreso es local y no activa una membresía real.</div>' : '';

export function courseCard(course: Course): string {
  const progress = course.progress ?? 0;
  return `<a class="club-course" href="#/curso/${course.id}"><div class="club-course__media"><img src="${course.image}" alt="" loading="lazy"><span class="club-course__level">${course.level}</span></div><div class="club-course__body"><span>${course.area}</span><h3>${course.title}</h3><p>${course.description}</p><div class="progress" aria-label="${progress}% completado"><span style="width:${progress}%"></span></div><div class="course-foot"><span>${progress ? `${progress}% completado` : 'Comenzar'}</span><span>${course.lessons} lecciones</span></div></div></a>`;
}
