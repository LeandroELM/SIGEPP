import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { crearApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import {
  bearer,
  crearAsignacion,
  crearEstudiante,
  crearOrganizacion,
  crearPeriodoActivo,
  crearPlaza,
  crearPostulacion,
  crearTutorEmpresarial,
  crearUsuario,
} from '../../test/fabricas.js';
import { limpiarBaseDatos } from '../../test/helpers.js';

const app = crearApp();

beforeEach(limpiarBaseDatos);
afterAll(() => prisma.$disconnect());

const carta =
  'Me interesa aplicar lo aprendido en la carrera y aportar al equipo de desarrollo de la empresa.';

const preparar = async (avance = 90) => {
  const periodo = await crearPeriodoActivo();
  const { organizacion } = await crearOrganizacion();
  const plaza = await crearPlaza(organizacion.id, periodo.id);
  const { usuario, estudiante } = await crearEstudiante(avance);
  const { usuario: usuarioTutor } = await crearTutorEmpresarial(organizacion.id);
  return {
    periodo,
    organizacion,
    plaza,
    estudiante,
    token: bearer(usuario),
    tutor: bearer(usuarioTutor),
    usuarioTutor,
  };
};

const postular = (token: string, plazaId: string) =>
  request(app)
    .post('/api/v1/postulaciones')
    .set('Authorization', token)
    .send({ plazaId, cartaMotivacion: carta });

describe('Postulación del estudiante (RF-11)', () => {
  it('crea la postulación en estado POSTULADA y notifica al tutor empresarial', async () => {
    const c = await preparar();
    const res = await postular(c.token, c.plaza.id);

    expect(res.status).toBe(201);
    expect(res.body.postulacion).toMatchObject({ estado: 'POSTULADA', plaza: { id: c.plaza.id } });
    const avisos = await prisma.notificacion.findMany({ where: { tipo: 'NUEVA_POSTULACION' } });
    expect(avisos.map((a) => a.usuarioId)).toEqual([c.usuarioTutor.id]);
  });

  it('RN-01: rechaza a un estudiante con menos del 80 % de avance', async () => {
    const c = await preparar(74);
    const res = await postular(c.token, c.plaza.id);
    expect(res.status).toBe(422);
    expect(res.body.error.detalles[0]).toContain('RN-01');
    expect(res.body.error.detalles[0]).toContain('74 %');
  });

  it('RN-02: rechaza si el estudiante ya tiene una asignación activa', async () => {
    const c = await preparar();
    const { estudiante } = await crearAsignacion(c.plaza);
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: estudiante.usuarioId } });
    const otra = await crearPlaza(c.organizacion.id, c.periodo.id, { titulo: 'Analista QA' });

    const res = await postular(bearer(usuario), otra.id);
    expect(res.status).toBe(422);
    expect(res.body.error.detalles[0]).toContain('RN-02');
  });

  it('RN-03: no permite más de tres postulaciones pendientes', async () => {
    const c = await preparar();
    for (let i = 0; i < 3; i++) {
      const plaza = await crearPlaza(c.organizacion.id, c.periodo.id, { titulo: `Plaza ${i}` });
      await crearPostulacion(c.estudiante.id, plaza.id, i === 0 ? 'PRESELECCIONADA' : 'POSTULADA');
    }
    const res = await postular(c.token, c.plaza.id);
    expect(res.status).toBe(422);
    expect(res.body.error.detalles[0]).toContain('RN-03');
  });

  it('responde 409 si se postula dos veces o la plaza no tiene cupos', async () => {
    const c = await preparar();
    await postular(c.token, c.plaza.id);
    expect((await postular(c.token, c.plaza.id)).status).toBe(409);

    const llena = await crearPlaza(c.organizacion.id, c.periodo.id, { cupos: 1, cuposOcupados: 1 });
    expect((await postular(c.token, llena.id)).status).toBe(409);
  });

  it('RN-04: una plaza en revisión no existe para el estudiante', async () => {
    const c = await preparar();
    const enRevision = await crearPlaza(c.organizacion.id, c.periodo.id, { estado: 'EN_REVISION' });
    expect((await postular(c.token, enRevision.id)).status).toBe(404);
  });

  it('valida la carta de motivación', async () => {
    const c = await preparar();
    const res = await request(app)
      .post('/api/v1/postulaciones')
      .set('Authorization', c.token)
      .send({ plazaId: c.plaza.id, cartaMotivacion: 'Corta' });
    expect(res.status).toBe(400);
  });

  it('lista mis postulaciones y permite retirar una pendiente', async () => {
    const c = await preparar();
    const { body } = await postular(c.token, c.plaza.id);

    const lista = await request(app)
      .get('/api/v1/postulaciones/mias')
      .set('Authorization', c.token);
    expect(lista.body.meta.total).toBe(1);

    const retiro = await request(app)
      .patch(`/api/v1/postulaciones/${body.postulacion.id}/retirar`)
      .set('Authorization', c.token);
    expect(retiro.status).toBe(200);
    expect(retiro.body.postulacion.estado).toBe('RETIRADA');

    const otraVez = await request(app)
      .patch(`/api/v1/postulaciones/${body.postulacion.id}/retirar`)
      .set('Authorization', c.token);
    expect(otraVez.status).toBe(409);
  });

  it('otro estudiante no puede retirar una postulación ajena', async () => {
    const c = await preparar();
    const { body } = await postular(c.token, c.plaza.id);
    const { usuario: otro } = await crearEstudiante();
    const res = await request(app)
      .patch(`/api/v1/postulaciones/${body.postulacion.id}/retirar`)
      .set('Authorization', bearer(otro));
    expect(res.status).toBe(404);
  });
});

describe('Preselección de candidatos (RF-12)', () => {
  it('el tutor ve los candidatos de su organización y preselecciona uno', async () => {
    const c = await preparar();
    const { body } = await postular(c.token, c.plaza.id);
    const coordinador = await crearUsuario('COORDINADOR');

    const lista = await request(app)
      .get('/api/v1/postulaciones/candidatos')
      .set('Authorization', c.tutor);
    expect(lista.status).toBe(200);
    expect(lista.body.data[0].estudiante.carnet).toBe(c.estudiante.carnet);

    const res = await request(app)
      .patch(`/api/v1/postulaciones/${body.postulacion.id}/preseleccionar`)
      .set('Authorization', c.tutor);
    expect(res.status).toBe(200);
    expect(res.body.postulacion.estado).toBe('PRESELECCIONADA');

    const avisos = await prisma.notificacion.findMany({ select: { tipo: true, usuarioId: true } });
    expect(avisos).toEqual(
      expect.arrayContaining([
        { tipo: 'POSTULACION_PRESELECCIONADA', usuarioId: c.estudiante.usuarioId },
        { tipo: 'CANDIDATO_POR_ASIGNAR', usuarioId: coordinador.id },
      ]),
    );
  });

  it('no preselecciona más candidatos que cupos disponibles', async () => {
    const c = await preparar();
    const plaza = await crearPlaza(c.organizacion.id, c.periodo.id, { cupos: 1 });
    const { estudiante: otro } = await crearEstudiante();
    await crearPostulacion(otro.id, plaza.id, 'PRESELECCIONADA');
    const { body } = await postular(c.token, plaza.id);

    const res = await request(app)
      .patch(`/api/v1/postulaciones/${body.postulacion.id}/preseleccionar`)
      .set('Authorization', c.tutor);
    expect(res.status).toBe(409);
  });

  it('rechaza al candidato y notifica al estudiante con el comentario', async () => {
    const c = await preparar();
    const { body } = await postular(c.token, c.plaza.id);
    const res = await request(app)
      .patch(`/api/v1/postulaciones/${body.postulacion.id}/rechazar`)
      .set('Authorization', c.tutor)
      .send({ comentario: 'Buscamos experiencia previa en React.' });
    expect(res.status).toBe(200);
    expect(res.body.postulacion.estado).toBe('RECHAZADA');
    const aviso = await prisma.notificacion.findFirstOrThrow({
      where: { tipo: 'POSTULACION_RECHAZADA' },
    });
    expect(aviso.mensaje).toContain('experiencia previa');
  });

  it('un tutor de otra organización no puede resolver la postulación (anti-IDOR)', async () => {
    const c = await preparar();
    const { body } = await postular(c.token, c.plaza.id);
    const { organizacion: otra } = await crearOrganizacion();
    const { usuario: ajeno } = await crearTutorEmpresarial(otra.id);

    const res = await request(app)
      .patch(`/api/v1/postulaciones/${body.postulacion.id}/preseleccionar`)
      .set('Authorization', bearer(ajeno));
    expect(res.status).toBe(404);

    const lista = await request(app)
      .get('/api/v1/postulaciones/candidatos')
      .set('Authorization', bearer(ajeno));
    expect(lista.body.meta.total).toBe(0);
  });

  it('solo el tutor empresarial accede a los candidatos', async () => {
    const c = await preparar();
    const res = await request(app)
      .get('/api/v1/postulaciones/candidatos')
      .set('Authorization', c.token);
    expect(res.status).toBe(403);
  });
});
