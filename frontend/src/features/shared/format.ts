import type { BadgeProps } from '../../components/Badge';

type Tone = BadgeProps['tone'];
type EstadoInfo = { label: string; tone: Tone };

export const ESTADOS: Record<string, EstadoInfo> = {
  // Plazas
  EN_REVISION: { label: 'En revisión', tone: 'advertencia' },
  APROBADA: { label: 'Aprobada', tone: 'exito' },
  RECHAZADA: { label: 'Rechazada', tone: 'error' },
  CERRADA: { label: 'Cerrada', tone: 'informacion' },
  // Organizaciones
  PENDIENTE: { label: 'Pendiente', tone: 'advertencia' },
  VERIFICADA: { label: 'Verificada', tone: 'exito' },
  // Asignaciones
  ASIGNADA: { label: 'Asignada', tone: 'informacion' },
  EN_CURSO: { label: 'En curso', tone: 'exito' },
  FINALIZADA: { label: 'Finalizada', tone: 'exito' },
  CANCELADA: { label: 'Cancelada', tone: 'error' },
  // Plan de trabajo
  BORRADOR: { label: 'Borrador', tone: 'informacion' },
  OBSERVADO: { label: 'Observado', tone: 'error' },
  APROBADO: { label: 'Aprobado', tone: 'exito' },
  // Hitos del expediente
  COMPLETADO: { label: 'Completado', tone: 'exito' },
  // Postulaciones
  POSTULADA: { label: 'Postulada', tone: 'informacion' },
  PRESELECCIONADA: { label: 'Preseleccionada', tone: 'exito' },
  RETIRADA: { label: 'Retirada', tone: 'advertencia' },
  // Bitácoras y quincenas
  ENVIADA: { label: 'Enviada', tone: 'advertencia' },
  OBSERVADA: { label: 'Observada', tone: 'error' },
  ATRASADA: { label: 'Atrasada', tone: 'error' },
  FUTURA: { label: 'Próxima', tone: 'informacion' },
  EXTEMPORANEA: { label: 'Extemporánea', tone: 'advertencia' },
  // Tutores empresariales
  ACTIVO_TUTOR: { label: 'Activo', tone: 'exito' },
  INACTIVO_TUTOR: { label: 'De baja', tone: 'advertencia' },
};

export function estadoInfo(estado: string): EstadoInfo {
  return ESTADOS[estado] ?? { label: estado, tone: 'informacion' };
}

export const MODALIDADES = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'REMOTA', label: 'Remota' },
  { value: 'HIBRIDA', label: 'Híbrida' },
] as const;

export function modalidadLabel(value: string): string {
  return MODALIDADES.find((m) => m.value === value)?.label ?? value;
}

const fechaFormat = new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fechaHoraFormat = new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short' });

/** Calendar dates from the API are stored as UTC midnight; show them without timezone drift. */
export function fecha(value: string | null | undefined): string {
  return value ? fechaFormat.format(new Date(value)) : '—';
}

export function fechaHora(value: string | null | undefined): string {
  return value ? fechaHoraFormat.format(new Date(value)) : '—';
}

export function nombre(persona: { nombres: string; apellidos: string } | null | undefined): string {
  return persona ? `${persona.nombres} ${persona.apellidos}` : '—';
}

/** Radix Select cannot hold an empty value; this sentinel means "no filter". */
export const TODOS = 'TODOS';
export function filtro(value: string): string | undefined {
  return value === TODOS ? undefined : value;
}
