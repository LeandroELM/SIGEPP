import { NavLink } from 'react-router-dom';
import type { RouteDefinition } from '../routes/catalog';
import { Marca } from './Marca';
import { navIcon } from './nav-icons';

export function Sidebar({ navigation }: { navigation: readonly RouteDefinition[] }) {
  return <aside className="ui-grid-bg--dark sticky top-0 hidden h-screen flex-col text-surface lg:flex">
    <div className="border-b border-white/10 p-6"><Marca /></div>
    <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
      {navigation.map((route) => {
        const Icon = navIcon(route.id);
        return <NavLink key={route.id} to={route.path} className="ui-nav-link"><Icon className="ui-icon" aria-hidden="true" />{route.label}</NavLink>;
      })}
    </nav>
    <p className="ui-mono border-t border-white/10 p-6 text-xs text-white/60">Ingeniería en Sistemas · UNI</p>
  </aside>;
}
