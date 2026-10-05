import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const rawCatalog = JSON.parse(readFileSync(new URL('../../data/zoorigen-bunny-catalog.json', import.meta.url), 'utf8'));
const courseIds = [
  'biologia-tiburones-rayas', 'entrenamiento-basico-canino', 'etologia-fauna-silvestre',
  'fauna-ponzonosa-mexico', 'fototrampeo-monitoreo-mamiferos', 'entomologia-forense',
  'legislacion-umas-zoologicos', 'rehabilitacion-aves-rapaces', 'impacto-ambiental',
  'mariposarios', 'aves-bioindicadoras', 'felinos-silvestres-mexico',
  'rescate-reubicacion-fauna', 'ultrasonografia-fauna', 'vectores-zoonosis',
];

export const bunnyCatalog = rawCatalog.map((course, index) => ({ id: courseIds[index], ...course }));
export const freePreviewVideoId = 'befd1641-850a-4099-88a8-047a1badc703';

export function findBunnyLesson(courseId, lessonNumber) {
  const course = bunnyCatalog.find((item) => item.id === courseId);
  if (!course) return null;
  const lesson = course.lecciones.find((item) => item.num === Number(lessonNumber));
  return lesson ? { course, lesson } : null;
}

export function signBunnyEmbed({ libraryId, tokenAuthKey, videoId, ttlSeconds = 300, now = Date.now() }) {
  const expires = Math.floor(now / 1000) + Math.min(900, Math.max(60, Number(ttlSeconds) || 300));
  const token = createHash('sha256').update(`${tokenAuthKey}${videoId}${expires}`).digest('hex');
  return {
    embedUrl: `https://iframe.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}?token=${token}&expires=${expires}`,
    expires,
  };
}
