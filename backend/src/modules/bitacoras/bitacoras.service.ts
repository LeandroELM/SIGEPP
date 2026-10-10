import type { Bitacora, Prisma, Rol } from '@prisma/client';
import { registrarAuditoria } from '../../lib/auditoria.js';
import { errores } from '../../lib/errores.js';
import { notificar } from '../../lib/notificaciones.js';
import { prisma } from '../../lib/prisma.js';
import { obtenerConAcceso } from '../asignaciones/asignaciones.service.js';
import type { ActualizarBitacoraInput, CrearBitacoraInput } from './bitacoras.schema.js';

interface Actor {
  id: string;
  rol: Rol;
}

const DIA = 24 * 60 * 60 * 1000;
const DIAS_QUINCENA = 14;
/** RN-08: la alerta de atraso se genera al tercer día después del cierre de la quincena. */
export const DIAS_GRACIA = 3;

const bitacoraSelect = {
  id: true,
  asignacionId: true,
  quincena: true,
  fechaInicio: true,
  fechaFin: true,
  actividades: true,
  horas: true,
  estado: true,
  observacionTutor: true,
  extemporanea: true,
  enviadaEn: true,
  creadaEn: true,
} satisfies Prisma.BitacoraSelect;

/**
 * Rango de fechas de la quincena n, contado desde el inicio de la práctica.
 * La última quincena se recorta a la fecha de fin de la práctica.
 */
export const rangoQuincena = (practica: { fechaInicio: Date; fechaFin: Date }, numero: number) => {
  const fechaInicio = new Date(practica.fechaInicio.getTime() + (numero - 1) * DIAS_QUINCENA * DIA);
  const fin = fechaInicio.getTime() + (DIAS_QUINCENA - 1) * DIA;
  const fechaFin = new Date(Math.min(fin, practica.fechaFin.getTime()));
  return { fechaInicio, fechaFin };
};

export const totalQuincenas = (inicio: Date, fin: Date) =>
  Math.max(1, Math.ceil((fin.getTime() - inicio.getTime() + DIA) / (DIAS_QUINCENA * DIA)));

const vencida = (fechaFin: Date, ahora = new Date()) =>
  ahora.getTime() > fechaFin.getTime() + (DIAS_GRACIA + 1) * DIA;

type EstadoQuincena =
  'APROBADA' | 'ENVIADA' | 'OBSERVADA' | 'BORRADOR' | 'PENDIENTE' | 'ATRASADA' | 'FUTURA';

/**
 * RF-18 y RN-08: calendario de quincenas de la práctica con el estado de cada una.
 * Una quincena sin bitácora enviada tres días después de su cierre queda ATRASADA.
 */
const calendario = (
  asignacion: { fechaInicio: Date; fechaFin: Date },
  bitacoras: Pick<Bitacora, 'quincena' | 'estado'>[],
  ahora = new Date(),
) => {
  const porQuincena = new Map(bitacoras.map((b) => [b.quincena, b.estado]));
  return Array.from(
    { length: totalQuincenas(asignacion.fechaInicio, asignacion.fechaFin) },
    (_, i) => {
      const numero = i + 1;
      const rango = rangoQuincena(asignacion, numero);
      const registrada = porQuincena.get(numero);
      let estado: EstadoQuincena;
      if (registrada && registrada !== 'BORRADOR') estado = registrada;
      else if (vencida(rango.fechaFin, ahora)) estado = 'ATRASADA';
      else if (rango.fechaInicio.getTime() > ahora.getTime()) estado = registrada ?? 'FUTURA';
      else estado = registrada ?? 'PENDIENTE';
      return { numero, ...rango, estado };
    },
  );
};

/** Bitácoras y calendario de quincenas de una asignación (estudiante, tutores o coordinación). */
export const listar = async (asignacionId: string, actor: Actor) => {
  const { asignacion } = await obtenerConAcceso(asignacionId, actor);
  const bitacoras = await prisma.bitacora.findMany({
    where: { asignacionId, eliminadaEn: null },
    select: bitacoraSelect,
    orderBy: { quincena: 'asc' },
  });
  const quincenas = calendario(asignacion, bitacoras);
  const horasAprobadas = bitacoras
    .filter((b) => b.estado === 'APROBADA')
    .reduce((total, b) => total + b.horas, 0);
  return {
    bitacoras,
    quincenas,
    resumen: {
      horasAprobadas,
      horasMinimas: asignacion.periodo.horasMinimas,
      quincenasAtrasadas: quincenas.filter((q) => q.estado === 'ATRASADA').length,
      porRevisar: bitacoras.filter((b) => b.estado === 'ENVIADA').length,
    },
  };
};

const exigirEstudiante = (parte: string) => {
  if (parte !== 'ESTUDIANTE') throw errores.prohibido('Solo el estudiante registra sus bitácoras');
};

const exigirTutor = (parte: string) => {
  if (parte !== 'TUTOR_ACADEMICO' && parte !== 'TUTOR_EMPRESARIAL') {
    throw errores.prohibido('Solo los tutores de la asignación revisan las bitácoras');
  }
  return parte;
};

/** Carga una bitácora verificando que el actor sea parte de su asignación (anti-IDOR). */
const cargar = async (id: string, actor: Actor) => {
  const bitacora = await prisma.bitacora.findFirst({ where: { id, eliminadaEn: null } });
  if (!bitacora) throw errores.noEncontrado('Bitácora');
  const { asignacion, parte } = await obtenerConAcceso(bitacora.asignacionId, actor);
  return { bitacora, asignacion, parte };
};

/** RF-16: el estudiante registra la bitácora de una quincena como borrador. Exige RN-07. */
export const crear = async (asignacionId: string, datos: CrearBitacoraInput, actor: Actor) => {
  const { asignacion, parte } = await obtenerConAcceso(asignacionId, actor);
  exigirEstudiante(parte);
  if (asignacion.planTrabajo?.estado !== 'APROBADO' || asignacion.estado !== 'EN_CURSO') {
    throw errores.reglaNegocio('Aún no puedes registrar bitácoras', [
      'RN-07: el plan de trabajo debe estar aprobado por ambos tutores',
    ]);
  }
  const total = totalQuincenas(asignacion.fechaInicio, asignacion.fechaFin);
  if (datos.quincena > total) {
    throw errores.reglaNegocio('La quincena no corresponde al período de la práctica', [
      `La práctica tiene ${total} quincenas`,
    ]);
  }
  const { fechaInicio, fechaFin } = rangoQuincena(asignacion, datos.quincena);
  if (fechaInicio.getTime() > Date.now()) {
    throw errores.reglaNegocio('La quincena aún no ha comenzado', [
      `La quincena ${datos.quincena} inicia el ${fechaInicio.toISOString().slice(0, 10)}`,
    ]);
  }
  const existente = await prisma.bitacora.findUnique({
    where: { asignacionId_quincena: { asignacionId, quincena: datos.quincena } },
  });
  if (existente) throw errores.conflicto('Ya registraste la bitácora de esa quincena');

  return prisma.bitacora.create({
    data: {
      asignacionId,
      quincena: datos.quincena,
      fechaInicio,
      fechaFin,
      actividades: datos.actividades,
      horas: datos.horas,
    },
    select: bitacoraSelect,
  });
};

/** El estudiante corrige la bitácora mientras está en borrador u observada. */
export const actualizar = async (id: string, datos: ActualizarBitacoraInput, actor: Actor) => {
  const { bitacora, parte } = await cargar(id, actor);
  exigirEstudiante(parte);
  if (bitacora.estado !== 'BORRADOR' && bitacora.estado !== 'OBSERVADA') {
    throw errores.conflicto('La bitácora no se puede editar en su estado actual', [
      `Estado actual: ${bitacora.estado}`,
    ]);
  }
  return prisma.bitacora.update({ where: { id }, data: datos, select: bitacoraSelect });
};

/** CU-08: envía la bitácora a revisión; si la quincena ya venció se marca como extemporánea. */
export const enviar = async (id: string, actor: Actor) => {
  const { bitacora, asignacion, parte } = await cargar(id, actor);
  exigirEstudiante(parte);
  if (bitacora.estado !== 'BORRADOR' && bitacora.estado !== 'OBSERVADA') {
    throw errores.conflicto('La bitácora ya fue enviada', [`Estado actual: ${bitacora.estado}`]);
  }
  const ahora = new Date();
  const extemporanea = bitacora.extemporanea || vencida(bitacora.fechaFin, ahora);

  return prisma.$transaction(async (tx) => {
    const actualizada = await tx.bitacora.update({
      where: { id },
      data: { estado: 'ENVIADA', enviadaEn: ahora, extemporanea },
      select: bitacoraSelect,
    });
    await registrarAuditoria(
      {
        entidad: 'Bitacora',
        entidadId: id,
        accion: 'ENVIAR_REVISION',
        valoresAnteriores: { estado: bitacora.estado },
        valoresNuevos: { estado: 'ENVIADA', extemporanea },
      },
      tx,
    );
    const estudiante = `${asignacion.estudiante.usuario.nombres} ${asignacion.estudiante.usuario.apellidos}`;
    for (const usuarioId of [asignacion.docente.usuarioId, asignacion.tutorEmpresarial.usuarioId]) {
      await notificar(
        usuarioId,
        {
          tipo: 'BITACORA_ENVIADA',
          titulo: 'Bitácora por revisar',
          mensaje: `${estudiante} envió la bitácora de la quincena ${bitacora.quincena}${extemporanea ? ' (extemporánea)' : ''}.`,
          enlace: `/asignaciones/${asignacion.id}`,
        },
        tx,
      );
    }
    return actualizada;
  });
};

/** RF-17: un tutor aprueba la bitácora y sus horas se acumulan en el expediente (RF-18). */
export const aprobar = async (id: string, actor: Actor) => {
  const { bitacora, asignacion, parte } = await cargar(id, actor);
  exigirTutor(parte);
  if (bitacora.estado !== 'ENVIADA') {
    throw errores.conflicto('La bitácora no está pendiente de revisión', [
      `Estado actual: ${bitacora.estado}`,
    ]);
  }
  return prisma.$transaction(async (tx) => {
    // La condición sobre el estado evita acumular dos veces las horas si dos tutores aprueban a la vez.
    const { count } = await tx.bitacora.updateMany({
      where: { id, estado: 'ENVIADA' },
      data: { estado: 'APROBADA', observacionTutor: null },
    });
    if (count === 0) throw errores.conflicto('La bitácora ya fue revisada');
    await tx.asignacion.update({
      where: { id: asignacion.id },
      data: { horasAcumuladas: { increment: bitacora.horas } },
    });
    await registrarAuditoria(
      {
        usuarioId: actor.id,
        entidad: 'Bitacora',
        entidadId: id,
        accion: 'APROBAR',
        valoresAnteriores: { estado: 'ENVIADA' },
        valoresNuevos: { estado: 'APROBADA', horas: bitacora.horas, revisor: parte },
      },
      tx,
    );
    await notificar(
      asignacion.estudiante.usuarioId,
      {
        tipo: 'BITACORA_APROBADA',
        titulo: 'Bitácora aprobada',
        mensaje: `Se aprobó tu bitácora de la quincena ${bitacora.quincena}: ${bitacora.horas} horas acreditadas.`,
        enlace: '/expediente/bitacoras',
      },
      tx,
    );
    return tx.bitacora.findUniqueOrThrow({ where: { id }, select: bitacoraSelect });
  });
};

/** RF-17: un tutor devuelve la bitácora con un comentario para que el estudiante la corrija. */
export const observar = async (id: string, observacion: string, actor: Actor) => {
  const { bitacora, asignacion, parte } = await cargar(id, actor);
  exigirTutor(parte);
  if (bitacora.estado !== 'ENVIADA') {
    throw errores.conflicto('La bitácora no está pendiente de revisión', [
      `Estado actual: ${bitacora.estado}`,
    ]);
  }
  return prisma.$transaction(async (tx) => {
    const actualizada = await tx.bitacora.update({
      where: { id },
      data: { estado: 'OBSERVADA', observacionTutor: observacion },
      select: bitacoraSelect,
    });
    await registrarAuditoria(
      {
        usuarioId: actor.id,
        entidad: 'Bitacora',
        entidadId: id,
        accion: 'OBSERVAR',
        valoresAnteriores: { estado: 'ENVIADA' },
        valoresNuevos: { estado: 'OBSERVADA', observacion, revisor: parte },
      },
      tx,
    );
    await notificar(
      asignacion.estudiante.usuarioId,
      {
        tipo: 'BITACORA_OBSERVADA',
        titulo: 'Bitácora con observaciones',
        mensaje: `Tu tutor ${parte === 'TUTOR_ACADEMICO' ? 'académico' : 'empresarial'} observó la bitácora de la quincena ${bitacora.quincena}.`,
        enlace: '/expediente/bitacoras',
      },
      tx,
    );
    return actualizada;
  });
};
