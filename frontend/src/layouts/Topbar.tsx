import type { Usuario, Rol } from '../features/auth/contracts';
import { useLogout } from '../features/auth/auth-hooks';
import { Button } from '../components/Button';
import { NotificacionesCampana } from '../features/notificaciones/NotificacionesCampana';

const roleLabels: Record<Rol, string> = {
  ESTUDIANTE: 'Estudiante', TUTOR_ACADEMICO: 'Tutor académico', TUTOR_EMPRESARIAL: 'Tutor empresarial',
  ORGANIZACION: 'Organización', COORDINADOR: 'Coordinador', ADMIN: 'Administrador',
};

export function Topbar({ usuario }: { usuario: Usuario }) {
  const logout = useLogout();
  return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface p-4">
    <div className="min-w-0"><p className="font-semibold">{usuario.nombres} {usuario.apellidos}</p><p className="text-sm text-muted">{roleLabels[usuario.rol]}</p></div>
    <div className="flex flex-wrap items-center gap-2">
      <NotificacionesCampana />
      <Button variant="secundario" loading={logout.isPending} onClick={() => logout.mutate()}>Cerrar sesión</Button>
    </div>
  </header>;
}
