import { useApiQuery, type Paginado } from '../../api/hooks';
import { useSession } from '../../hooks/useSession';
import type { Asignacion } from '../shared/types';
import { AsignacionesTabla } from './AsignacionesPage';

function useMisAsignaciones() {
  // The API already restricts the list to assignments where the user is a tutor.
  return useApiQuery<Paginado<Asignacion>>('/asignaciones?limit=50');
}

/** Tutorados (tutor académico) y practicantes (tutor empresarial). */
export default function MisAsignacionesPage() {
  const { snapshot } = useSession();
  const lista = useMisAsignaciones();
  const academico = snapshot.status === 'autenticada' && snapshot.usuario.rol === 'TUTOR_ACADEMICO';
  return <AsignacionesTabla caption={academico ? 'Mis tutorados' : 'Mis practicantes'} rows={lista.data?.data ?? []}
    loading={lista.isPending} error={lista.isError ? lista.error.message : undefined} onRetry={() => { void lista.refetch(); }}
    empty={{ title: 'Sin estudiantes a cargo', description: 'Cuando la coordinación te designe como tutor verás aquí a tus estudiantes.' }} />;
}

/** RF-15 y RF-17: planes y bitácoras que esperan la revisión de este tutor. */
export function RevisionesPage() {
  const { snapshot } = useSession();
  const lista = useMisAsignaciones();
  const academico = snapshot.status === 'autenticada' && snapshot.usuario.rol === 'TUTOR_ACADEMICO';
  const planPendiente = (a: Asignacion) => a.planTrabajo?.estado === 'EN_REVISION'
    && !(academico ? a.planTrabajo.aprobadoDocenteEn : a.planTrabajo.aprobadoEmpresaEn);
  const pendientes = (lista.data?.data ?? []).filter((a) => planPendiente(a) || a.bitacorasPorRevisar > 0);
  return <div className="grid gap-4">
    <p className="text-muted">Planes de trabajo y bitácoras enviados que esperan tu revisión. Abre el expediente del estudiante para revisarlos.</p>
    <AsignacionesTabla caption="Pendientes de revisión" rows={pendientes}
      loading={lista.isPending} error={lista.isError ? lista.error.message : undefined} onRetry={() => { void lista.refetch(); }}
      empty={{ title: 'No tienes revisiones pendientes', description: 'Cuando un estudiante envíe su plan de trabajo o una bitácora aparecerá aquí.' }} />
  </div>;
}
