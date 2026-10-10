import { useApiQuery } from '../../api/hooks';
import type { Asignacion } from '../shared/types';

/** The student's active assignment; a 404 simply means there is none yet. */
export function useAsignacionActual() {
  return useApiQuery<{ asignacion: Asignacion }>('/asignaciones/actual');
}
