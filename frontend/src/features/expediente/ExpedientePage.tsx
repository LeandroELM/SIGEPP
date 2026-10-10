import { useParams } from 'react-router-dom';
import { useApiQuery } from '../../api/hooks';
import { EmptyState } from '../../components/EmptyState';
import type { Asignacion } from '../shared/types';
import { QueryView } from '../shared/ui';
import { ExpedienteView } from './ExpedienteView';
import { useAsignacionActual } from './useAsignacionActual';

export function SinAsignacion() {
  return <EmptyState title="Aún no tienes una práctica asignada"
    description="Cuando la coordinación confirme tu asignación verás aquí tu expediente, tus tutores y el plan de trabajo."
    action={{ label: 'Explorar plazas', href: '/plazas' }} />;
}

/** WF-04: expediente del estudiante autenticado. */
export default function ExpedientePage() {
  const actual = useAsignacionActual();
  if (actual.isError && actual.error.status === 404) return <SinAsignacion />;
  return <QueryView query={actual} loading="Cargando expediente…">{({ asignacion }) => <ExpedienteView asignacion={asignacion} />}</QueryView>;
}

/** Expediente de una asignación concreta, para tutores y coordinación (protegido contra IDOR en el API). */
export function AsignacionDetallePage() {
  const { id = '' } = useParams();
  const asignacion = useApiQuery<{ asignacion: Asignacion }>(`/asignaciones/${encodeURIComponent(id)}`);
  return <QueryView query={asignacion} loading="Cargando expediente…">{({ asignacion }) => <ExpedienteView asignacion={asignacion} />}</QueryView>;
}
