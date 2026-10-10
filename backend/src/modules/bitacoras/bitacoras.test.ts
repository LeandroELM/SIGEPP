import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { crearApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import {
  actividadesPlan,
  bearer,
  crearAsignacion,
  crearEstudiante,
  crearOrganizacion,
  crearPeriodoActivo,
  crearPlaza,
} from '../../test/fabricas.js';
import { limpiarBaseDatos } from '../../test/helpers.js';

const app = crearApp();

beforeEach(limpiarBaseDatos);
afterAll(() => prisma.$disconnect());

const DIA = 24 * 60 * 60 * 1000;
const actividades =
  'Implementé el formulario de registro de productos y escribí sus pruebas unitarias.';

/**
 * Asignación que inició hace 20 días: la quincena 1 cerró hace 7 días (vencida, RN-08),
 * la quincena 2 está en curso y la 3 aún no comienza.
 */
const preparar = async ({ planAprobado = true } = {}) => {
  const periodo = await crearPeriodoActivo();
  const { organizacion } = await crearOrganizacion();
  const plaza = await crearPlaza(organizacion.id, periodo.id);
  const { asignacion, estudiante, docente, tutor } = await crearAsignacion(plaza);
  const inicio = new Date(Date.now() - 20 * DIA);
  await prisma.asignacion.update({
    where: { id: asignacion.id },
    data: {
      fechaInicio: inicio,
      fechaFin: new Date(inicio.getTime() + 83 * DIA),
      estado: planAprobado ? 'EN_CURSO' : 'ASIGNADA',
    },
  });
  await prisma.planTrabajo.create({
    data: {
      asignacionId: asignacion.id,
      objetivos: 'Desarrollar el módulo de inventario de la aplicación web.',
      actividades: actividadesPlan(),
      horasPrevistas: 240,
      estado: planAprobado ? 'APROBADO' : 'EN_REVISION',
    },
  });
  return {
    asignacion,
    estudiante: bearer({ id: estudiante.usuarioId, rol: 'ESTUDIANTE' }),
    docente: bearer({ id: docente.usuarioId, rol: 'TUTOR_ACADEMICO' }),
    empresa: bearer({ id: tutor.usuarioId, rol: 'TUTOR_EMPRESARIAL' }),
    usuarioEstudiante: estudiante.usuarioId,
  };
};

type Contexto = Awaited<ReturnType<typeof preparar>>;

const registrar = (c: Contexto, quincena: number, horas = 40) =>
  request(app)
    .post(`/api/v1/asignaciones/${c.asignacion.id}/bitacoras`)
    .set('Authorization', c.estudiante)
    .send({ quincena, actividades, horas });

const enviar = (c: Contexto, id: string) =>
  request(app).post(`/api/v1/bitacoras/${id}/enviar`).set('Authorization', c.estudiante);

describe('Registro de bitácoras (RF-16)', () => {
  it('RN-07: exige el plan de trabajo aprobado', async () => {
    const c = await preparar({ planAprobado: false });
    const res = await registrar(c, 2);
    expect(res.status).toBe(422);
    expect(res.body.error.detalles[0]).toContain('RN-07');
  });

  it('registra la quincena en curso como borrador con sus fechas calculadas', async () => {
    const c = await preparar();
    const res = await registrar(c, 2);
    expect(res.status).toBe(201);
    expect(res.body.bitacora).toMatchObject({ quincena: 2, estado: 'BORRADOR', horas: 40 });
    const inicio = new Date(res.body.bitacora.fechaInicio).getTime();
    const fin = new Date(res.body.bitacora.fechaFin).getTime();
    expect(Math.round((fin - inicio) / DIA)).toBe(13);
  });

  it('no permite quincenas futuras, repetidas ni horas fuera de rango', async () => {
    const c = await preparar();
    expect((await registrar(c, 3)).status).toBe(422);
    expect((await registrar(c, 99)).status).toBe(422);
    expect((await registrar(c, 2, 0)).status).toBe(400);
    expect((await registrar(c, 2, 91)).status).toBe(400);
    await registrar(c, 2);
    expect((await registrar(c, 2)).status).toBe(409);
  });

  it('solo el estudiante de la asignación registra bitácoras', async () => {
    const c = await preparar();
    const comoTutor = await request(app)
      .post(`/api/v1/asignaciones/${c.asignacion.id}/bitacoras`)
      .set('Authorization', c.docente)
      .send({ quincena: 2, actividades, horas: 10 });
    expect(comoTutor.status).toBe(403);

    const { usuario: otro } = await crearEstudiante();
    const comoOtro = await request(app)
      .post(`/api/v1/asignaciones/${c.asignacion.id}/bitacoras`)
      .set('Authorization', bearer(otro))
      .send({ quincena: 2, actividades, horas: 10 });
    expect(comoOtro.status).toBe(404);
  });
});

describe('Envío y revisión (CU-08, RF-17, RF-18)', () => {
  it('al enviar notifica a ambos tutores; la quincena vencida queda extemporánea', async () => {
    const c = await preparar();
    const { body } = await registrar(c, 1);
    const res = await enviar(c, body.bitacora.id);

    expect(res.status).toBe(200);
    expect(res.body.bitacora).toMatchObject({ estado: 'ENVIADA', extemporanea: true });
    expect(await prisma.notificacion.count({ where: { tipo: 'BITACORA_ENVIADA' } })).toBe(2);
    expect((await enviar(c, body.bitacora.id)).status).toBe(409);
  });

  it('la quincena en curso no es extemporánea', async () => {
    const c = await preparar();
    const { body } = await registrar(c, 2);
    const res = await enviar(c, body.bitacora.id);
    expect(res.body.bitacora.extemporanea).toBe(false);
  });

  it('al aprobar se acumulan las horas en el expediente', async () => {
    const c = await preparar();
    const { body } = await registrar(c, 2, 45);
    await enviar(c, body.bitacora.id);

    const res = await request(app)
      .patch(`/api/v1/bitacoras/${body.bitacora.id}/aprobar`)
      .set('Authorization', c.empresa);
    expect(res.status).toBe(200);
    expect(res.body.bitacora.estado).toBe('APROBADA');

    const asignacion = await prisma.asignacion.findUniqueOrThrow({
      where: { id: c.asignacion.id },
    });
    expect(asignacion.horasAcumuladas).toBe(45);

    const otraVez = await request(app)
      .patch(`/api/v1/bitacoras/${body.bitacora.id}/aprobar`)
      .set('Authorization', c.docente);
    expect(otraVez.status).toBe(409);
  });

  it('una bitácora observada vuelve al estudiante, que la corrige y reenvía', async () => {
    const c = await preparar();
    const { body } = await registrar(c, 2);
    await enviar(c, body.bitacora.id);

    const observada = await request(app)
      .patch(`/api/v1/bitacoras/${body.bitacora.id}/observar`)
      .set('Authorization', c.docente)
      .send({ observacion: 'Detalla las pruebas realizadas el jueves.' });
    expect(observada.status).toBe(200);
    expect(observada.body.bitacora).toMatchObject({
      estado: 'OBSERVADA',
      observacionTutor: 'Detalla las pruebas realizadas el jueves.',
    });

    const corregida = await request(app)
      .put(`/api/v1/bitacoras/${body.bitacora.id}`)
      .set('Authorization', c.estudiante)
      .send({
        actividades: `${actividades} El jueves ejecuté las pruebas de integración.`,
        horas: 42,
      });
    expect(corregida.status).toBe(200);
    expect((await enviar(c, body.bitacora.id)).body.bitacora.estado).toBe('ENVIADA');
  });

  it('el estudiante no puede aprobar su propia bitácora', async () => {
    const c = await preparar();
    const { body } = await registrar(c, 2);
    await enviar(c, body.bitacora.id);
    const res = await request(app)
      .patch(`/api/v1/bitacoras/${body.bitacora.id}/aprobar`)
      .set('Authorization', c.estudiante);
    expect(res.status).toBe(403);
  });
});

describe('Calendario de quincenas (RF-18, RN-08)', () => {
  it('marca como atrasada la quincena vencida sin bitácora y resume las horas', async () => {
    const c = await preparar();
    const { body } = await registrar(c, 2, 30);
    await enviar(c, body.bitacora.id);
    await request(app)
      .patch(`/api/v1/bitacoras/${body.bitacora.id}/aprobar`)
      .set('Authorization', c.docente);

    const res = await request(app)
      .get(`/api/v1/asignaciones/${c.asignacion.id}/bitacoras`)
      .set('Authorization', c.docente);
    expect(res.status).toBe(200);
    expect(res.body.quincenas).toHaveLength(6);
    expect(res.body.quincenas.slice(0, 3).map((q: { estado: string }) => q.estado)).toEqual([
      'ATRASADA',
      'APROBADA',
      'FUTURA',
    ]);
    expect(res.body.resumen).toMatchObject({
      horasAprobadas: 30,
      quincenasAtrasadas: 1,
      porRevisar: 0,
    });
  });
  it('recorta la última quincena a la fecha de fin de la práctica', async () => {
    const c = await preparar();
    const asignacion = await prisma.asignacion.findUniqueOrThrow({
      where: { id: c.asignacion.id },
    });
    const res = await request(app)
      .get(`/api/v1/asignaciones/${c.asignacion.id}/bitacoras`)
      .set('Authorization', c.estudiante);
    const ultima = res.body.quincenas.at(-1);
    expect(new Date(ultima.fechaFin).getTime()).toBeLessThanOrEqual(asignacion.fechaFin.getTime());
  });
});
