import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import type { RouteDefinition } from '../routes/catalog';
import { navIcon } from './nav-icons';

export function MobileNav({ navigation }: { navigation: readonly RouteDefinition[] }) {
  const [open, setOpen] = useState(false);
  return <nav aria-label="Navegación móvil" className="sticky bottom-0 z-40 grid grid-cols-4 border-t border-ink bg-surface lg:hidden">
    {navigation.slice(0, 3).map((route) => {
      const Icon = navIcon(route.id);
      return <NavLink key={route.id} to={route.path} className={({ isActive }) => `flex min-h-[3.5rem] min-w-0 flex-col items-center justify-center gap-1 border-t-[3px] p-2 text-center text-xs ${isActive ? 'border-primary bg-tint font-medium text-primary' : 'border-transparent text-text'}`}>
        <Icon className="ui-icon" aria-hidden="true" />{route.label}
      </NavLink>;
    })}
    <Modal open={open} onOpenChange={setOpen} title="Más opciones" description="Accede a las demás secciones de tu cuenta." trigger={<Button variant="fantasma" className="h-full">Más</Button>}>
      <div className="flex flex-col border-t border-border">
        {navigation.slice(3).map((route) => {
          const Icon = navIcon(route.id);
          return <NavLink key={route.id} to={route.path} onClick={() => setOpen(false)} className="flex min-h-[2.75rem] items-center gap-3 border-b border-border p-3 text-primary hover:bg-tint"><Icon className="ui-icon" aria-hidden="true" />{route.label}</NavLink>;
        })}
      </div>
    </Modal>
  </nav>;
}
