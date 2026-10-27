import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { crearApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import {
  bearer,
  CONTRASENA_PRUEBA,
  crearDocente,
  crearEstudiante,
  crearOrganizacion,
  crearTutorEmpresarial,
  crearUsuario,
} from '../../test/fabricas.js';
import { limpiarBaseDatos } from '../../test/helpers.js';

const app = crearApp();

const actualizar = (
  usuario: { id: string; rol: Parameters<typeof bearer>[0]['rol'] },
  datos: object,
) => request(app).patch('/api/v1/auth/yo').set('Authorization', bearer(usuario)).send(datos);

const cookieRefresh = (res: request.Response) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('sigepp_rt='));

beforeEach(limpiarBaseDatos);
afterAll(() => prisma.$disconnect());

describe('PATCH /api/v1/auth/yo', () => {
  it('el administrador corrige sus datos personales y borra el teléfono con null', async () => {
    const admin = await crearUsuario('ADMIN', { telefono: '+505 8888 0000' });

    const res = await actualizar(admin, {
      nombres: 'Leandro',
      apellidos: 'Lacayo',
      telefono: null,
    });

    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({
      nombres: 'Leandro',
      apellidos: 'Lacayo',
      telefono: null,
    });
  });

  it('el estudiante edita carrera y año, pero no su carnet ni su avance', async () => {
    const { usuario, estudiante } = await crearEstudiante(80);

    const res = await actualizar(usuario, { carrera: 'Ingeniería en Computación', anio: 4 });
    expect(res.status).toBe(200);
    expect(res.body.usuario.estudiante).toMatchObject({
      carrera: 'Ingeniería en Computación',
      anio: 4,
      carnet: estudiante.carnet,
    });

    const avance = await actualizar(usuario, { porcentajeAvance: 100 });
    expect(avance.status).toBe(400);
    const carnet = await actualizar(usuario, { carnet: '2020-0001U' });
    expect(carnet.status).toBe(400);
    const guardado = await prisma.estudiante.findUniqueOrThrow({ where: { id: estudiante.id } });
    expect(Number(guardado.porcentajeAvance)).toBe(80);
  });

  it('el tutor académico edita departamento y especialidad', async () => {
    const { usuario } = await crearDocente();

    const res = await actualizar(usuario, { departamento: 'Computación', especialidad: 'Redes' });

    expect(res.status).toBe(200);
    expect(res.body.usuario.docente).toMatchObject({
      departamento: 'Computación',
      especialidad: 'Redes',
    });
  });

  it('el tutor empresarial edita su cargo', async () => {
    const { organizacion } = await crearOrganizacion();
    const { usuario } = await crearTutorEmpresarial(organizacion.id);

    const res = await actualizar(usuario, { cargo: 'Gerente de proyectos' });

    expect(res.status).toBe(200);
    expect(res.body.usuario.tutorEmpresarial.cargo).toBe('Gerente de proyectos');
  });

  it('rechaza campos que no corresponden al rol', async () => {
    const admin = await crearUsuario('ADMIN');

    const res = await actualizar(admin, { carrera: 'Ingeniería en Sistemas' });

    expect(res.status).toBe(400);
    expect(res.body.error.detalles).toContain('carrera: no aplica a tu rol');
  });

  it('no permite cambiar el correo ni el rol', async () => {
    const admin = await crearUsuario('ESTUDIANTE');

    expect((await actualizar(admin, { correo: 'otro@uni.edu.ni' })).status).toBe(400);
    expect((await actualizar(admin, { rol: 'ADMIN' })).status).toBe(400);
    const guardado = await prisma.usuario.findUniqueOrThrow({ where: { id: admin.id } });
    expect(guardado.rol).toBe('ESTUDIANTE');
  });

  it('rechaza un cuerpo vacío y un teléfono inválido', async () => {
    const admin = await crearUsuario('ADMIN');

    expect((await actualizar(admin, {})).status).toBe(400);
    expect((await actualizar(admin, { telefono: 'abc' })).status).toBe(400);
  });

  it('registra el cambio en la auditoría con los valores anterior y nuevo', async () => {
    const admin = await crearUsuario('ADMIN');

    await actualizar(admin, { nombres: 'Leandro' });

    const evento = await prisma.auditoria.findFirstOrThrow({
      where: { accion: 'ACTUALIZAR_PERFIL' },
    });
    expect(evento).toMatchObject({
      usuarioId: admin.id,
      entidadId: admin.id,
      valoresAnteriores: { nombres: admin.nombres },
      valoresNuevos: { nombres: 'Leandro' },
    });
  });

  it('exige autenticación', async () => {
    const res = await request(app).patch('/api/v1/auth/yo').send({ nombres: 'Nadie' });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/v1/auth/yo/contrasena', () => {
  const login = (correo: string, contrasena: string) =>
    request(app).post('/api/v1/auth/login').send({ correo, contrasena });

  it('cambia la contraseña, conserva la sesión actual y cierra las demás', async () => {
    const admin = await crearUsuario('ADMIN');
    const otraSesion = cookieRefresh(await login(admin.correo, CONTRASENA_PRUEBA))!;
    const sesionActual = await login(admin.correo, CONTRASENA_PRUEBA);
    const cookieActual = cookieRefresh(sesionActual)!;

    const res = await request(app)
      .put('/api/v1/auth/yo/contrasena')
      .set('Authorization', `Bearer ${sesionActual.body.accessToken}`)
      .set('Cookie', cookieActual)
      .send({ contrasenaActual: CONTRASENA_PRUEBA, contrasenaNueva: 'NuevaClave2026' });
    expect(res.status).toBe(204);

    expect((await login(admin.correo, 'NuevaClave2026')).status).toBe(200);
    expect((await login(admin.correo, CONTRASENA_PRUEBA)).status).toBe(401);
    const actual = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookieActual);
    expect(actual.status).toBe(200);
    const otra = await request(app).post('/api/v1/auth/refresh').set('Cookie', otraSesion);
    expect(otra.status).toBe(401);
    expect(await prisma.auditoria.count({ where: { accion: 'CAMBIAR_CONTRASENA' } })).toBe(1);
  });

  it('rechaza una contraseña actual incorrecta sin cambiar nada', async () => {
    const admin = await crearUsuario('ADMIN');

    const res = await request(app)
      .put('/api/v1/auth/yo/contrasena')
      .set('Authorization', bearer(admin))
      .send({ contrasenaActual: 'Incorrecta2026', contrasenaNueva: 'NuevaClave2026' });

    expect(res.status).toBe(400);
    expect(res.body.error.detalles).toContain(
      'contrasenaActual: La contraseña actual no es correcta',
    );
    expect((await login(admin.correo, CONTRASENA_PRUEBA)).status).toBe(200);
  });

  it('valida la política de contraseñas y que la nueva sea distinta', async () => {
    const admin = await crearUsuario('ADMIN');
    const cambiar = (contrasenaNueva: string) =>
      request(app)
        .put('/api/v1/auth/yo/contrasena')
        .set('Authorization', bearer(admin))
        .send({ contrasenaActual: CONTRASENA_PRUEBA, contrasenaNueva });

    expect((await cambiar('corta')).status).toBe(400);
    expect((await cambiar('sinnumeros')).status).toBe(400);
    expect((await cambiar(CONTRASENA_PRUEBA)).status).toBe(400);
  });
});
