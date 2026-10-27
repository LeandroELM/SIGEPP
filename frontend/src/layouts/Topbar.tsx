import { ROL_ETIQUETAS, type Usuario } from '../features/auth/contracts';
import { useLogout } from '../features/auth/auth-hooks';
import { Button } from '../components/Button';
import { NotificacionesCampana } from '../features/notificaciones/NotificacionesCampana';
import { Marca } from './Marca';

export function Topbar({ usuario }: { usuario: Usuario }) {
  const logout = useLogout();
  const iniciales = `${usuario.nombres.charAt(0)}${usuario.apellidos.charAt(0)}`.toUpperCase();
  return <header className="z-40 border-b border-border bg-surface lg:sticky lg:top-0">
    <div className="ui-grid-bg--dark p-4 lg:hidden"><Marca /></div>
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="grid h-[2.5rem] w-[2.5rem] shrink-0 place-items-center bg-[image:var(--gradient-brand)] text-sm font-semibold text-surface">{iniciales}</span>
        <div className="min-w-0"><p className="font-medium">{usuario.nombres} {usuario.apellidos}</p><p className="ui-mono text-xs text-muted">{ROL_ETIQUETAS[usuario.rol]}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <NotificacionesCampana />
        <Button variant="secundario" loading={logout.isPending} onClick={() => logout.mutate()}>Cerrar sesión</Button>
      </div>
    </div>
  </header>;
}
