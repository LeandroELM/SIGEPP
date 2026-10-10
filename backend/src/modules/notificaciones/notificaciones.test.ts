import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { crearApp } from '../../app.js';
import { notificar } from '../../lib/notificaciones.js';
import { prisma } from '../../lib/prisma.js';
import { bearer, crearUsuario } from '../../test/fabricas.js';
import { limpiarBaseDatos } from '../../test/helpers.js';

const app = crearApp();

beforeEach(limpiarBaseDatos);
afterAll(() => prisma.$disconnect());

const aviso = (n: number) => ({
  tipo: 'PRUEBA',
  titulo: `Aviso ${n}`,
  mensaje: 'Mensaje de prueba',
});

describe('Notificaciones dentro de la aplicación (RF-23)', () => {
  it('lista solo mis notificaciones con el total sin leer', async () => {
    const yo = await crearUsuario('ESTUDIANTE');
    const otro = await crearUsuario('ESTUDIANTE');
    await notificar(yo.id, aviso(1));
    await notificar(yo.id, aviso(2));
    await notificar(otro.id, aviso(3));

    const res = await request(app).get('/api/v1/notificaciones').set('Authorization', bearer(yo));
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.noLeidas).toBe(2);
  });

  it('marca una como leída y filtra las no leídas', async () => {
    const yo = await crearUsuario('ESTUDIANTE');
    const primera = await notificar(yo.id, aviso(1));
    await notificar(yo.id, aviso(2));

    const leida = await request(app)
      .patch(`/api/v1/notificaciones/${primera.id}/leer`)
      .set('Authorization', bearer(yo));
    expect(leida.status).toBe(200);
    expect(leida.body.notificacion.leida).toBe(true);

    const pendientes = await request(app)
      .get('/api/v1/notificaciones?soloNoLeidas=true')
      .set('Authorization', bearer(yo));
    expect(pendientes.body.meta.total).toBe(1);
    expect(pendientes.body.noLeidas).toBe(1);
  });

  it('no permite marcar notificaciones ajenas (anti-IDOR)', async () => {
    const yo = await crearUsuario('ESTUDIANTE');
    const otro = await crearUsuario('ESTUDIANTE');
    const ajena = await notificar(otro.id, aviso(1));
    const res = await request(app)
      .patch(`/api/v1/notificaciones/${ajena.id}/leer`)
      .set('Authorization', bearer(yo));
    expect(res.status).toBe(404);
  });

  it('marca todas como leídas', async () => {
    const yo = await crearUsuario('ESTUDIANTE');
    await notificar(yo.id, aviso(1));
    await notificar(yo.id, aviso(2));
    const res = await request(app)
      .patch('/api/v1/notificaciones/leer-todas')
      .set('Authorization', bearer(yo));
    expect(res.body.actualizadas).toBe(2);
    expect(await prisma.notificacion.count({ where: { leida: false } })).toBe(0);
  });

  it('exige autenticación', async () => {
    expect((await request(app).get('/api/v1/notificaciones')).status).toBe(401);
  });
});
