import { Link } from 'react-router-dom';
import { useApiQuery, type Paginado } from '../../api/hooks';
import { useSession } from '../../hooks/useSession';
import type { Asignacion, Candidato, Organizacion, Plaza } from '../shared/types';

function Indicador({ titulo, valor, to, accion }: { titulo: string; valor: number | undefined; to: string; accion: string }) {
  return <li className="ui-panel grid gap-2 p-4 sm:p-6">
    <p className="text-muted">{titulo}</p>
    <p className="text-[3rem] font-light leading-none tabular-nums text-ink">{valor ?? '…'}</p>
    <Link className="text-primary underline" to={to}>{accion}</Link>
  </li>;
}

/** WF-01: panel de la coordinación con lo que requiere atención. */
export default function PanelPage() {
  const { snapshot } = useSession();
  const coordinador = snapshot.status === 'autenticada' && snapshot.usuario.rol === 'COORDINADOR';
  const plazas = useApiQuery<Paginado<Plaza>>('/plazas?estado=EN_REVISION&limit=1');
  const orgs = useApiQuery<Paginado<Organizacion>>('/organizaciones?estado=PENDIENTE&limit=1');
  const candidatos = useApiQuery<{ candidatos: Candidato[] }>('/asignaciones/candidatos', { enabled: coordinador });
  const activas = useApiQuery<Paginado<Asignacion>>('/asignaciones?estado=EN_CURSO&limit=1');
  const error = [plazas, orgs, candidatos, activas].find((q) => q.isError)?.error;

  return <div className="grid gap-6">
    {snapshot.status === 'autenticada' && <p>Hola, {snapshot.usuario.nombres}. Esto es lo que requiere tu atención:</p>}
    {error && <p role="alert" className="text-error">{error.message}</p>}
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Indicador titulo="Plazas por revisar" valor={plazas.data?.meta.total} to="/plazas?estado=EN_REVISION" accion="Revisar plazas" />
      <Indicador titulo="Organizaciones por verificar" valor={orgs.data?.meta.total} to="/organizaciones" accion="Verificar organizaciones" />
      {coordinador && <Indicador titulo="Candidatos por asignar" valor={candidatos.data?.candidatos.length} to="/asignaciones" accion="Confirmar asignaciones" />}
      <Indicador titulo="Prácticas en curso" valor={activas.data?.meta.total} to="/asignaciones" accion="Ver asignaciones" />
    </ul>
  </div>;
}
