export const MEMBER_ROUTES = [
  '/', '/bienvenida', '/encuestas', '/login', '/cursos', '/curso/:id', '/curso/:id/clase/:n',
  '/materiales', '/materiales/:id', '/materiales/:id/visor', '/comunidad', '/en-vivo', '/retos',
  '/retos/historia', '/retos/historia/:id', '/herramientas', '/logros', '/certificados',
  '/recompensas', '/perfil', '/suscripcion', '/configuracion',
] as const;

export const ADMIN_ROUTES = [
  '/admin', '/admin/cursos', '/admin/materiales', '/admin/en-vivo', '/admin/quizzes',
  '/admin/miembros', '/admin/cupones', '/admin/comunidad', '/admin/avisos',
  '/admin/ajustes', '/admin/experiencia',
] as const;

export const ROUTES = [...ADMIN_ROUTES, ...MEMBER_ROUTES] as const;
