export type Achievement = { id: string; title: string; unlocked: boolean };

export const DEMO_ACHIEVEMENTS: Achievement[] = [
  { id: 'primer-registro', title: 'Primer registro', unlocked: true },
  { id: 'observador-constante', title: 'Observador constante', unlocked: true },
  { id: 'ruta-completa', title: 'Ruta completa', unlocked: false },
];
