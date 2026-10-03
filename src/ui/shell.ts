import { Data } from '../core/data';
import { currentRoute } from '../core/router';

const navigation = [
  ['/', '⌂', 'Inicio'], ['/cursos', '▦', 'Cursos'], ['/materiales', '▤', 'Biblioteca'], ['/comunidad', '◎', 'Comunidad'],
  ['/en-vivo', '◉', 'En vivo'], ['/retos', '✦', 'Retos'], ['/herramientas', '⌖', 'Herramientas'], ['/logros', '◇', 'Logros'],
  ['/recompensas', '◈', 'Recompensas'], ['/certificados', '⌑', 'Certificados'],
];

export function shell(content: string, title = 'Tu espacio de aprendizaje'): string {
  const route = currentRoute().path;
  const navItems = navigation.map(([href, icon, label]) => `<a class="${route === href ? 'is-active' : ''}" href="#${href}"><span class="nav-icon">${icon}</span>${label}</a>`).join('');
  const mobile = navigation.filter(([, , label]) => ['Inicio', 'Cursos', 'Biblioteca', 'Retos'].includes(label)).map(([href, icon, label]) => `<a class="${route === href ? 'is-active' : ''}" href="#${href}"><span>${icon}</span>${label}</a>`).join('');
  return `<div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="/"><span class="brand__mark">Z/</span><span class="brand__text">ZOORIGEN<small>ESTACIÓN DE APRENDIZAJE</small></span></a>
      <span class="sidebar__label">Aprender</span><nav class="side-nav">${navItems}</nav>
      <span class="sidebar__label">Mi estación</span><nav class="side-nav"><a class="${route === '/perfil' ? 'is-active' : ''}" href="#/perfil"><span class="nav-icon">◯</span>Mi perfil</a><a class="${route === '/configuracion' ? 'is-active' : ''}" href="#/configuracion"><span class="nav-icon">⌘</span>Configuración</a><a class="${route.startsWith('/admin') ? 'is-active' : ''}" href="#/admin"><span class="nav-icon">⚙</span>Operaciones</a></nav>
      <div class="sidebar__profile"><div class="profile-row"><span class="avatar">MG</span><div><strong>Miembro demo</strong><small>Explorador · nivel 4</small></div></div></div>
    </aside>
    <div class="app-main"><header class="topbar"><div class="topbar__welcome"><small>Club VIP ZOORIGEN</small><strong>${title}</strong></div><div class="topbar__actions"><span class="mode-badge">${Data.mode}</span><button class="icon-btn" type="button" data-toast="Sin notificaciones nuevas" aria-label="Notificaciones">♢</button><a class="avatar" href="#/perfil" aria-label="Abrir perfil">MG</a></div></header>${content}</div>
    <nav class="mobile-nav">${mobile}<a class="${['/comunidad','/en-vivo','/recompensas','/certificados','/perfil','/admin'].includes(route) ? 'is-active' : ''}" href="#/comunidad"><span>•••</span>Más</a></nav>
  </div>`;
}
