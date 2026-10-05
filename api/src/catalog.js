import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('../../data/zoorigen-bunny-catalog.json', import.meta.url), 'utf8'));
const metadata = [
  ['biologia-tiburones-rayas', 'Fauna silvestre', 'cursos/biologia_tiburones_rayas.jpg', 'Inicial', 'Biología, ecología y conservación de tiburones y rayas.'],
  ['entrenamiento-basico-canino', 'Etología', 'cursos/entrenamiento_basico_canino.jpg', 'Inicial', 'Obediencia, comportamiento y fundamentos del entrenamiento canino.'],
  ['etologia-fauna-silvestre', 'Etología', 'cursos/etologia_fauna_silvestre.jpg', 'Intermedio', 'Conducta y bienestar de fauna silvestre bajo cuidado humano.'],
  ['fauna-ponzonosa-mexico', 'Fauna ponzoñosa', 'cursos/fauna_ponzonosa_mexico.jpg', 'Intermedio', 'Identificación, prevención y primeros auxilios ante fauna ponzoñosa.'],
  ['fototrampeo-monitoreo-mamiferos', 'Monitoreo', 'cursos/fototrampeo_monitoreo_mamiferos.jpg', 'Especializado', 'Fototrampeo y análisis de datos para monitorear mamíferos silvestres.'],
  ['entomologia-forense', 'Investigación', 'cursos/introduccion_entomologia_forense.jpg', 'Inicial', 'Entomología forense y biodiversidad de artrópodos.'],
  ['legislacion-umas-zoologicos', 'Gestión ambiental', 'cursos/manejo_integral_umas_fauna_silvestre.jpg', 'Especializado', 'Legislación y manejo en UMAs y zoológicos.'],
  ['rehabilitacion-aves-rapaces', 'Manejo en cautiverio', 'cursos/zooingenieria_habitats_exhibiciones.jpg', 'Especializado', 'Manejo y rehabilitación de aves rapaces.'],
  ['impacto-ambiental', 'Gestión ambiental', 'areas/investigacion-cientifica-monitoreo.jpg', 'Especializado', 'Elaboración y gestión de impacto ambiental.'],
  ['mariposarios', 'Manejo en cautiverio', 'cursos/mariposarios_manejo_conservacion.jpg', 'Intermedio', 'Manejo, conservación y educación mediante mariposarios.'],
  ['aves-bioindicadoras', 'Monitoreo', 'cursos/manejo_tortugas_marinas.jpg', 'Intermedio', 'Monitoreo de aves como bioindicadoras.'],
  ['felinos-silvestres-mexico', 'Fauna silvestre', 'cursos/roedores_murcielagos_monitoreo.jpg', 'Especializado', 'Monitoreo y conservación de felinos silvestres.'],
  ['rescate-reubicacion-fauna', 'Fauna silvestre', 'cursos/rescate_fauna_silvestre.jpg', 'Intermedio', 'Rescate y reubicación de fauna silvestre.'],
  ['ultrasonografia-fauna', 'Diagnóstico veterinario', 'cursos/ultrasonografia_mamiferos_silvestres.jpg', 'Especializado', 'Diagnóstico por imagen en fauna silvestre y exótica.'],
  ['vectores-zoonosis', 'Salud pública', 'cursos/control_vectores_zoonosis.jpg', 'Intermedio', 'Vigilancia y control de vectores y zoonosis.'],
];

const courses = raw.map((entry, index) => {
  const [id, area, image, level, description] = metadata[index];
  const lessonItems = entry.lecciones.map((lesson) => ({ num: lesson.num, title: lesson.titulo, provider: lesson.provider, videoId: lesson.videoId }));
  return { id, title: entry.title, area, description, image: `https://www.zoorigen.com/assets/img/${image}`, lessons: lessonItems.length, lessonItems, duration: `${lessonItems.length} clases en video`, level };
});

export const publicCatalog = Object.freeze({
  source: 'zoorigen-owned-catalog',
  verifiedAt: '2026-10-05',
  courses,
  resources: [],
  areas: [...new Set(courses.map((course) => course.area))],
  plans: { monthly: 199, annual: 1899 },
});

export function sanitizeCatalog(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    courses: Array.isArray(source.courses) ? source.courses : [],
    resources: Array.isArray(source.resources) ? source.resources : [],
    areas: Array.isArray(source.areas) ? source.areas : [],
    plans: {
      monthly: Number.isFinite(source.plans?.monthly) ? source.plans.monthly : null,
      annual: Number.isFinite(source.plans?.annual) ? source.plans.annual : null,
    },
    verifiedAt: typeof source.verifiedAt === 'string' ? source.verifiedAt : null,
  };
}
