import type { Prisma, Rol } from '@prisma/client';
import { registrarAuditoria } from '../../lib/auditoria.js';
import { errores } from '../../lib/errores.js';
import { notificar } from '../../lib/notificaciones.js';
import { saltar } from '../../lib/paginacion.js';
import { prisma } from '../../lib/prisma.js';
import { ESTADOS_ACTIVOS } from '../asignaciones/asignaciones.service.js';
import type {
  CrearPostulacionInput,
  ListarCandidatosQuery,
  ListarMisPostulacionesQuery,
} from './postulaciones.schema.js';

interface Actor {
  id: string;
  rol: Rol;
}

/** RN-01: porcentaje mínimo del plan de estudios aprobado para postularse. */
export const AVANCE_MINIMO = 80;
/** RN-03: máximo de postulaciones pendientes simultáneas. */
export const MAXIMO_PENDIENTES = 3;
const ESTADOS_PENDIENTES = ['POSTULADA', 'PRESELECCIONADA'] as const;

const postulacionSelect = {
  id: true,
  estado: true,
  cartaMotivacion: true,
  creadaEn: true,
  resueltaEn: true,
  plaza: {
    select: {
      id: true,
      titulo: true,
      area: true,
      modalidad: true,
      ubicacion: true,
      estado: true,
      organizacion: { select: { id: true, razonSocial: true } },
    },
  },
  asignacion: { select: { id: true } },
} satisfies Prisma.PostulacionSelect;

const candidatoSelect = {
  ...postulacionSelect,
  estudiante: {
    select: {
      id: true,
      carnet: true,
      carrera: true,
      anio: true,
      porcentajeAvance: true,
      usuario: { select: { nombres: true, apellidos: true, correo: true, telefono: true } },
    },
  },
} satisfies Prisma.PostulacionSelect;

const estudianteDe = async (actor: Actor) => {
  const estudiante = await prisma.estudiante.findUnique({
    where: { usuarioId: actor.id },
    include: { usuario: { select: { nombres: true, apellidos: true } } },
  });
  if (!estudiante) throw errores.prohibido('Tu usuario no tiene perfil de estudiante');
  return estudiante;
};

const tutorDe = async (actor: Actor) => {
  const tutor = await prisma.tutorEmpresarial.findUnique({ where: { usuarioId: actor.id } });
  if (!tutor || !tutor.activo)
    throw errores.prohibido('Tu usuario no es un tutor empresarial activo');
  return tutor;
};

/** RF-11: valida RN-01, RN-02 y RN-03 y registra la postulación en estado POSTULADA. */
export const crear = async (datos: CrearPostulacionInput, actor: Actor) => {
  const estudiante = await estudianteDe(actor);

  const plaza = await prisma.plaza.findUnique({
    where: { id: datos.plazaId },
    include: { periodo: true, organizacion: { select: { razonSocial: true } } },
  });
  // Una plaza no aprobada no es visible para el estudiante (RN-04): se responde 404.
  if (!plaza || plaza.estado !== 'APROBADA' || !plaza.periodo.activo) {
    throw errores.noEncontrado('Plaza');
  }
  if (!plaza.periodo.convocatoriaAbierta) {
    throw errores.reglaNegocio('La convocatoria del período no está abierta', [
      `${plaza.periodo.nombre}: la coordinación aún no habilita las postulaciones`,
    ]);
  }

  const avance = Number(estudiante.porcentajeAvance);
  if (avance < AVANCE_MINIMO || !estudiante.avanceVerificado) {
    throw errores.reglaNegocio('No cumples los requisitos académicos para postularte', [
      `RN-01: se requiere al menos ${AVANCE_MINIMO} % del plan de estudios aprobado y verificado; tu avance acreditado es ${avance} %${estudiante.avanceVerificado ? '' : ' (pendiente de verificación)'}`,
    ]);
  }

  const activa = await prisma.asignacion.findFirst({
    where: {
      estudianteId: estudiante.id,
      periodoId: plaza.periodoId,
      estado: { in: [...ESTADOS_ACTIVOS] },
      eliminadaEn: null,
    },
    select: { id: true },
  });
  if (activa) {
    throw errores.reglaNegocio('Ya tienes una asignación activa en este período', [
      'RN-02: un estudiante no puede mantener más de una asignación activa en el mismo período',
    ]);
  }

  const pendientes = await prisma.postulacion.count({
    where: {
      estudianteId: estudiante.id,
      estado: { in: [...ESTADOS_PENDIENTES] },
      plaza: { periodoId: plaza.periodoId },
    },
  });
  if (pendientes >= MAXIMO_PENDIENTES) {
    throw errores.reglaNegocio('Alcanzaste el límite de postulaciones pendientes', [
      `RN-03: puedes tener como máximo ${MAXIMO_PENDIENTES} postulaciones pendientes; retira una para postularte a otra plaza`,
    ]);
  }

  if (plaza.cuposOcupados >= plaza.cupos) {
    throw errores.conflicto('La plaza ya no tiene cupos disponibles');
  }
  const existente = await prisma.postulacion.findUnique({
    where: { estudianteId_plazaId: { estudianteId: estudiante.id, plazaId: plaza.id } },
    select: { estado: true },
  });
  if (existente) {
    throw errores.conflicto('Ya te postulaste a esta plaza', [
      `Estado de tu postulación: ${existente.estado}`,
    ]);
  }

  const tutores = await prisma.tutorEmpresarial.findMany({
    where: { organizacionId: plaza.organizacionId, activo: true },
    select: { usuarioId: true },
  });

  return prisma.$transaction(async (tx) => {
    const postulacion = await tx.postulacion.create({
      data: {
        estudianteId: estudiante.id,
        plazaId: plaza.id,
        cartaMotivacion: datos.cartaMotivacion,
      },
      select: postulacionSelect,
    });
    await registrarAuditoria(
      {
        usuarioId: actor.id,
        entidad: 'Postulacion',
        entidadId: postulacion.id,
        accion: 'CREAR',
        valoresNuevos: { plazaId: plaza.id, estado: 'POSTULADA' },
      },
      tx,
    );
    const nombre = `${estudiante.usuario.nombres} ${estudiante.usuario.apellidos}`;
    for (const { usuarioId } of tutores) {
      await notificar(
        usuarioId,
        {
          tipo: 'NUEVA_POSTULACION',
          titulo: 'Nueva postulación',
          mensaje: `${nombre} se postuló a la plaza "${plaza.titulo}".`,
          enlace: '/candidatos',
        },
        tx,
      );
    }
    return postulacion;
  });
};

export const listarMias = async (filtros: ListarMisPostulacionesQuery, actor: Actor) => {
  const estudiante = await estudianteDe(actor);
  const where: Prisma.PostulacionWhereInput = {
    estudianteId: estudiante.id,
    ...(filtros.estado && { estado: filtros.estado }),
  };
  const [data, total] = await prisma.$transaction([
    prisma.postulacion.findMany({
      where,
      select: postulacionSelect,
      orderBy: { creadaEn: 'desc' },
      skip: saltar(filtros.page, filtros.limit),
      take: filtros.limit,
    }),
    prisma.postulacion.count({ where }),
  ]);
  return { data, total };
};

/** El estudiante retira una postulación que aún no fue resuelta. */
export const retirar = async (id: string, actor: Actor) => {
  const estudiante = await estudianteDe(actor);
  const postulacion = await prisma.postulacion.findUnique({ where: { id } });
  if (!postulacion || postulacion.estudianteId !== estudiante.id) {
    throw errores.noEncontrado('Postulación');
  }
  if (!(ESTADOS_PENDIENTES as readonly string[]).includes(postulacion.estado)) {
    throw errores.conflicto('Solo se pueden retirar postulaciones pendientes', [
      `Estado actual: ${postulacion.estado}`,
    ]);
  }
  return prisma.$transaction(async (tx) => {
    const actualizada = await tx.postulacion.update({
      where: { id },
      data: { estado: 'RETIRADA', resueltaEn: new Date() },
      select: postulacionSelect,
    });
    await registrarAuditoria(
      {
        usuarioId: actor.id,
        entidad: 'Postulacion',
        entidadId: id,
        accion: 'RETIRAR',
        valoresAnteriores: { estado: postulacion.estado },
        valoresNuevos: { estado: 'RETIRADA' },
      },
      tx,
    );
    return actualizada;
  });
};

/** RF-12: candidatos de las plazas de la organización del tutor empresarial. */
export const listarCandidatos = async (filtros: ListarCandidatosQuery, actor: Actor) => {
  const tutor = await tutorDe(actor);
  const where: Prisma.PostulacionWhereInput = {
    plaza: {
      organizacionId: tutor.organizacionId,
      ...(filtros.plazaId && { id: filtros.plazaId }),
    },
    ...(filtros.estado ? { estado: filtros.estado } : { estado: { not: 'RETIRADA' } }),
  };
  const [data, total] = await prisma.$transaction([
    prisma.postulacion.findMany({
      where,
      select: candidatoSelect,
      orderBy: [{ estado: 'asc' }, { creadaEn: 'asc' }],
      skip: saltar(filtros.page, filtros.limit),
      take: filtros.limit,
    }),
    prisma.postulacion.count({ where }),
  ]);
  return { data, total };
};

/** Carga una postulación verificando que pertenezca a una plaza de la organización del tutor. */
const postulacionDelTutor = async (id: string, actor: Actor) => {
  const tutor = await tutorDe(actor);
  const postulacion = await prisma.postulacion.findUnique({
    where: { id },
    include: {
      plaza: true,
      estudiante: { select: { usuarioId: true } },
    },
  });
  if (!postulacion || postulacion.plaza.organizacionId !== tutor.organizacionId) {
    throw errores.noEncontrado('Postulación');
  }
  return postulacion;
};

/** RF-12: el tutor empresarial preselecciona al candidato; pasa a la bandeja de la coordinación. */
export const preseleccionar = async (id: string, actor: Actor) => {
  const postulacion = await postulacionDelTutor(id, actor);
  if (postulacion.estado !== 'POSTULADA') {
    throw errores.conflicto('Solo se pueden preseleccionar postulaciones nuevas', [
      `Estado actual: ${postulacion.estado}`,
    ]);
  }
  const preseleccionadas = await prisma.postulacion.count({
    where: { plazaId: postulacion.plazaId, estado: 'PRESELECCIONADA' },
  });
  const cuposLibres = postulacion.plaza.cupos - postulacion.plaza.cuposOcupados;
  if (preseleccionadas >= cuposLibres) {
    throw errores.conflicto(
      'Ya preseleccionaste tantos candidatos como cupos disponibles tiene la plaza',
      [`Cupos disponibles: ${cuposLibres}; preseleccionados: ${preseleccionadas}`],
    );
  }
  const coordinadores = await prisma.usuario.findMany({
    where: { rol: 'COORDINADOR', estado: 'ACTIVO' },
    select: { id: true },
  });

  return prisma.$transaction(async (tx) => {
    const actualizada = await tx.postulacion.update({
      where: { id },
      data: { estado: 'PRESELECCIONADA' },
      select: candidatoSelect,
    });
    await registrarAuditoria(
      {
        usuarioId: actor.id,
        entidad: 'Postulacion',
        entidadId: id,
        accion: 'PRESELECCIONAR',
        valoresAnteriores: { estado: 'POSTULADA' },
        valoresNuevos: { estado: 'PRESELECCIONADA' },
      },
      tx,
    );
    await notificar(
      postulacion.estudiante.usuarioId,
      {
        tipo: 'POSTULACION_PRESELECCIONADA',
        titulo: 'Fuiste preseleccionado',
        mensaje: `La organización te preseleccionó para "${postulacion.plaza.titulo}". La coordinación confirmará tu asignación.`,
        enlace: '/postulaciones',
      },
      tx,
    );
    for (const { id: usuarioId } of coordinadores) {
      await notificar(
        usuarioId,
        {
          tipo: 'CANDIDATO_POR_ASIGNAR',
          titulo: 'Candidato por asignar',
          mensaje: `Hay un estudiante preseleccionado para "${postulacion.plaza.titulo}".`,
          enlace: '/asignaciones',
        },
        tx,
      );
    }
    return actualizada;
  });
};

/** RF-12: el tutor empresarial descarta al candidato. */
export const rechazar = async (id: string, comentario: string | undefined, actor: Actor) => {
  const postulacion = await postulacionDelTutor(id, actor);
  if (!(ESTADOS_PENDIENTES as readonly string[]).includes(postulacion.estado)) {
    throw errores.conflicto('La postulación ya fue resuelta', [
      `Estado actual: ${postulacion.estado}`,
    ]);
  }
  return prisma.$transaction(async (tx) => {
    const actualizada = await tx.postulacion.update({
      where: { id },
      data: { estado: 'RECHAZADA', resueltaEn: new Date() },
      select: candidatoSelect,
    });
    await registrarAuditoria(
      {
        usuarioId: actor.id,
        entidad: 'Postulacion',
        entidadId: id,
        accion: 'RECHAZAR',
        valoresAnteriores: { estado: postulacion.estado },
        valoresNuevos: { estado: 'RECHAZADA', ...(comentario && { comentario }) },
      },
      tx,
    );
    await notificar(
      postulacion.estudiante.usuarioId,
      {
        tipo: 'POSTULACION_RECHAZADA',
        titulo: 'Postulación no seleccionada',
        mensaje: `Tu postulación a "${postulacion.plaza.titulo}" no fue seleccionada.${comentario ? ` Comentario: ${comentario}` : ''}`,
        enlace: '/postulaciones',
      },
      tx,
    );
    return actualizada;
  });
};
