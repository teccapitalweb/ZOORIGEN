import bunnyCatalog from '../../data/zoorigen-bunny-catalog.json';
import type { Catalog, Course, Lesson } from '../core/types';

const asset = (name: string) => `https://www.zoorigen.com/assets/img/${name}`;

const metadata = [
  { id: 'biologia-tiburones-rayas', area: 'Fauna silvestre', image: 'cursos/biologia_tiburones_rayas.jpg', level: 'Inicial', description: 'Biología, ecología y conservación de tiburones y rayas.' },
  { id: 'entrenamiento-basico-canino', area: 'Etología', image: 'cursos/entrenamiento_basico_canino.jpg', level: 'Inicial', description: 'Obediencia, comportamiento y fundamentos del entrenamiento canino.' },
  { id: 'etologia-fauna-silvestre', area: 'Etología', image: 'cursos/etologia_fauna_silvestre.jpg', level: 'Intermedio', description: 'Conducta y bienestar de fauna silvestre bajo cuidado humano.' },
  { id: 'fauna-ponzonosa-mexico', area: 'Fauna ponzoñosa', image: 'cursos/fauna_ponzonosa_mexico.jpg', level: 'Intermedio', description: 'Identificación, prevención y primeros auxilios ante fauna ponzoñosa.' },
  { id: 'fototrampeo-monitoreo-mamiferos', area: 'Monitoreo', image: 'cursos/fototrampeo_monitoreo_mamiferos.jpg', level: 'Especializado', description: 'Fototrampeo y análisis de datos para monitorear mamíferos silvestres.' },
  { id: 'entomologia-forense', area: 'Investigación', image: 'cursos/introduccion_entomologia_forense.jpg', level: 'Inicial', description: 'Entomología forense y biodiversidad de artrópodos desde sus bases.' },
  { id: 'legislacion-umas-zoologicos', area: 'Gestión ambiental', image: 'cursos/manejo_integral_umas_fauna_silvestre.jpg', level: 'Especializado', description: 'Legislación y manejo de fauna silvestre en UMAs y zoológicos.' },
  { id: 'rehabilitacion-aves-rapaces', area: 'Manejo en cautiverio', image: 'cursos/zooingenieria_habitats_exhibiciones.jpg', level: 'Especializado', description: 'Manejo y rehabilitación de aves rapaces bajo cuidado humano.' },
  { id: 'impacto-ambiental', area: 'Gestión ambiental', image: 'areas/investigacion-cientifica-monitoreo.jpg', level: 'Especializado', description: 'Elaboración, evaluación y gestión de manifestaciones de impacto ambiental.' },
  { id: 'mariposarios', area: 'Manejo en cautiverio', image: 'cursos/mariposarios_manejo_conservacion.jpg', level: 'Intermedio', description: 'Manejo, conservación y educación ambiental mediante mariposarios.' },
  { id: 'aves-bioindicadoras', area: 'Monitoreo', image: 'cursos/manejo_tortugas_marinas.jpg', level: 'Intermedio', description: 'Monitoreo y conservación de aves como bioindicadoras.' },
  { id: 'felinos-silvestres-mexico', area: 'Fauna silvestre', image: 'cursos/roedores_murcielagos_monitoreo.jpg', level: 'Especializado', description: 'Métodos para monitorear y conservar felinos silvestres en México.' },
  { id: 'rescate-reubicacion-fauna', area: 'Fauna silvestre', image: 'cursos/rescate_fauna_silvestre.jpg', level: 'Intermedio', description: 'Rescate y reubicación de fauna en proyectos de impacto ambiental.' },
  { id: 'ultrasonografia-fauna', area: 'Diagnóstico veterinario', image: 'cursos/ultrasonografia_mamiferos_silvestres.jpg', level: 'Especializado', description: 'Ultrasonografía y diagnóstico por imagen en fauna silvestre y exótica.' },
  { id: 'vectores-zoonosis', area: 'Salud pública', image: 'cursos/control_vectores_zoonosis.jpg', level: 'Intermedio', description: 'Vigilancia y control de vectores con enfoque en zoonosis y salud pública.' },
] as const;

const courses: Course[] = bunnyCatalog.map((entry, index) => {
  const meta = metadata[index];
  const lessonItems: Lesson[] = entry.lecciones.map((lesson) => ({
    num: lesson.num,
    title: lesson.titulo,
    provider: 'bunny',
    videoId: lesson.videoId,
  }));
  return {
    id: meta.id,
    title: entry.title,
    area: meta.area,
    description: meta.description,
    image: asset(meta.image),
    lessons: lessonItems.length,
    lessonItems,
    duration: `${lessonItems.length} clases en video`,
    level: meta.level,
  };
});

export const DEMO_CATALOG: Catalog = {
  verifiedAt: '2026-10-05',
  plans: { monthly: 199, annual: 1899 },
  areas: [...new Set(courses.map((course) => course.area))],
  courses,
  resources: [
    { id: 'guia-campo', title: 'Bitácora de observación en campo', type: 'Guía', area: 'Investigación', pages: 18 },
    { id: 'ficha-fauna', title: 'Ficha de identificación y registro', type: 'Ficha', area: 'Fauna silvestre', pages: 6 },
    { id: 'bienestar', title: 'Principios de bienestar bajo cuidado humano', type: 'PDF', area: 'Etología', pages: 24 },
  ],
};

export const TOTAL_CLASSES = courses.reduce((total, course) => total + course.lessons, 0);
