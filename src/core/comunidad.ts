export type CommunityThread = { id: string; title: string; summary: string; replies: number };

export const DEMO_THREADS: CommunityThread[] = [
  { id: 'monitoreo-nocturno', title: 'Identificación durante monitoreo nocturno', summary: 'Rasgos para distinguir especies similares en campo.', replies: 12 },
  { id: 'camaras-trampa', title: 'Buenas prácticas para cámaras trampa', summary: 'Cómo reducir falsos positivos sin perder registros.', replies: 8 },
];
