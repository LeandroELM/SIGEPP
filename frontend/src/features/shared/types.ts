// Response shapes of /api/v1, as serialized by the backend services.

export type Persona = { id?: string; nombres: string; apellidos: string; correo?: string; telefono?: string | null };

export type Modalidad = 'PRESENCIAL' | 'REMOTA' | 'HIBRIDA';
export type EstadoPlaza = 'EN_REVISION' | 'APROBADA' | 'RECHAZADA' | 'CERRADA';
export type EstadoVerificacion = 'PENDIENTE' | 'VERIFICADA' | 'RECHAZADA';
export type EstadoAsignacion = 'ASIGNADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
export type EstadoPlan = 'BORRADOR' | 'EN_REVISION' | 'OBSERVADO' | 'APROBADO';

export type Plaza = {
  id: string; titulo: string; descripcion: string; area: string; modalidad: Modalidad;
  ubicacion: string; cupos: number; cuposOcupados: number; cuposDisponibles: number;
  horario: string; competencias: string[]; estado: EstadoPlaza; motivoRechazo: string | null;
  publicadaEn: string | null; creadaEn: string; actualizadaEn: string; totalPostulaciones: number;
  organizacion: { id: string; razonSocial: string; sector: string; sitioWeb: string | null; direccion: string };
  periodo: { id: string; nombre: string };
  aprobadaPor: Persona | null;
};

export type PlazaInput = {
  titulo: string; descripcion: string; area: string; modalidad: Modalidad;
  ubicacion: string; cupos: number; horario: string; competencias: string[];
};

export type FiltrosPlazas = {
  areas: string[]; ubicaciones: string[]; organizaciones: { id: string; razonSocial: string }[];
};

export type TutorEmpresarial = {
  id: string; cargo: string; activo: boolean;
  usuario: Persona & { estado: 'ACTIVO' | 'INACTIVO' };
};

export type Organizacion = {
  id: string; razonSocial: string; ruc: string; sector: string; direccion: string; sitioWeb: string | null;
  estadoVerificacion: EstadoVerificacion; convenioVigenteHasta: string | null; creadaEn: string;
  representante: Persona;
  _count: { plazas: number; tutoresEmpresariales: number };
  tutoresEmpresariales?: TutorEmpresarial[];
};

export type Hito = { clave: string; titulo: string; estado: 'COMPLETADO' | 'EN_CURSO' | 'PENDIENTE' };
export type ParteAsignacion = 'ESTUDIANTE' | 'TUTOR_ACADEMICO' | 'TUTOR_EMPRESARIAL' | 'SUPERVISOR';

export type Asignacion = {
  id: string; estado: EstadoAsignacion; fechaInicio: string; fechaFin: string;
  horasAcumuladas: number; notaFinal: string | null; creadaEn: string;
  estudiante: { id: string; carnet: string; carrera: string; usuario: Persona };
  plaza: { id: string; titulo: string; area: string; modalidad: Modalidad; ubicacion: string; horario: string; organizacion: { id: string; razonSocial: string } };
  docente: { id: string; departamento: string; usuario: Persona };
  tutorEmpresarial: { id: string; cargo: string; usuario: Persona };
  periodo: { id: string; nombre: string; horasMinimas: number };
  planTrabajo: { id: string; version: number; estado: EstadoPlan; horasPrevistas: number; aprobadoDocenteEn: string | null; aprobadoEmpresaEn: string | null } | null;
  totalBitacoras: number; bitacorasPorRevisar: number;
  progreso: { horasAcumuladas: number; horasMinimas: number; porcentaje: number };
  hitos: Hito[];
  miRol?: ParteAsignacion;
};

export type Candidato = {
  id: string; creadaEn: string;
  estudiante: { id: string; carnet: string; porcentajeAvance: string; usuario: Persona };
  plaza: { id: string; titulo: string; cuposDisponibles: number; organizacion: { id: string; razonSocial: string } };
  tutoresEmpresariales: { id: string; cargo: string; usuario: Persona }[];
};

export type DocenteCarga = {
  id: string; departamento: string; especialidad: string | null;
  cupoMaximo: number; cupoOcupado: number; cupoDisponible: number; usuario: Persona;
};

export type Actividad = { descripcion: string; semanaInicio: number; semanaFin: number; horas: number };

export type PlanVersion = {
  version: number; objetivos: string; actividades: Actividad[]; horasPrevistas: number;
  observacionDocente: string | null; observacionEmpresa: string | null; creadaEn: string;
};

export type PlanTrabajo = {
  id: string; asignacionId: string; version: number; objetivos: string; actividades: Actividad[];
  horasPrevistas: number; estado: EstadoPlan; aprobadoDocenteEn: string | null; aprobadoEmpresaEn: string | null;
  actualizadoEn: string; versiones: PlanVersion[];
};

export type RegistroAuditoria = {
  id: string; entidad: string; entidadId: string; accion: string; ip: string | null; creadaEn: string;
  valoresAnteriores: unknown; valoresNuevos: unknown;
  usuario: (Persona & { rol: string }) | null;
};

export type EstadoPostulacion = 'POSTULADA' | 'PRESELECCIONADA' | 'RECHAZADA' | 'RETIRADA' | 'ASIGNADA';

export type Postulacion = {
  id: string; estado: EstadoPostulacion; cartaMotivacion: string; creadaEn: string; resueltaEn: string | null;
  plaza: { id: string; titulo: string; area: string; modalidad: Modalidad; ubicacion: string; estado: EstadoPlaza; organizacion: { id: string; razonSocial: string } };
  asignacion: { id: string } | null;
};

export type CandidatoPostulacion = Postulacion & {
  estudiante: { id: string; carnet: string; carrera: string; anio: number; porcentajeAvance: string; usuario: Persona };
};

export type EstadoBitacora = 'BORRADOR' | 'ENVIADA' | 'OBSERVADA' | 'APROBADA';

export type Bitacora = {
  id: string; asignacionId: string; quincena: number; fechaInicio: string; fechaFin: string;
  actividades: string; horas: number; estado: EstadoBitacora; observacionTutor: string | null;
  extemporanea: boolean; enviadaEn: string | null; creadaEn: string;
};

export type Quincena = {
  numero: number; fechaInicio: string; fechaFin: string;
  estado: EstadoBitacora | 'PENDIENTE' | 'ATRASADA' | 'FUTURA';
};

export type BitacorasRespuesta = {
  bitacoras: Bitacora[]; quincenas: Quincena[];
  resumen: { horasAprobadas: number; horasMinimas: number; quincenasAtrasadas: number; porRevisar: number };
};

export type Notificacion = {
  id: string; tipo: string; titulo: string; mensaje: string; enlace: string | null; leida: boolean; creadaEn: string;
};
