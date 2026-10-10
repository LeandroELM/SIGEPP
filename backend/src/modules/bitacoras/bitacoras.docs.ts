import { json, registro, respuestasError, seguridad } from '../../docs/registro.js';
import { z } from '../../lib/zod.js';
import { idParams as asignacionParams } from '../asignaciones/asignaciones.schema.js';
import {
  actualizarBitacoraSchema,
  crearBitacoraSchema,
  estadoBitacoraSchema,
  idParams,
  observarBitacoraSchema,
} from './bitacoras.schema.js';

const tag = 'Bitácoras';

const bitacoraSchema = registro.register(
  'Bitacora',
  z.object({
    id: z.string(),
    asignacionId: z.string(),
    quincena: z.number().int(),
    fechaInicio: z.string().datetime(),
    fechaFin: z.string().datetime(),
    actividades: z.string(),
    horas: z.number().int(),
    estado: estadoBitacoraSchema,
    observacionTutor: z.string().nullable(),
    extemporanea: z
      .boolean()
      .openapi({ description: 'Enviada después de los tres días de gracia (RN-08)' }),
    enviadaEn: z.string().datetime().nullable(),
    creadaEn: z.string().datetime(),
  }),
);

const unaBitacora = z.object({ bitacora: bitacoraSchema });

registro.registerPath({
  method: 'get',
  path: '/asignaciones/{id}/bitacoras',
  tags: [tag],
  summary: 'Bitácoras y calendario de quincenas (RF-18)',
  description:
    'Incluye el estado de cada quincena de la práctica: una quincena sin bitácora enviada tres días después de su cierre queda ATRASADA (RN-08).',
  security: seguridad,
  request: { params: asignacionParams },
  responses: {
    200: json(
      z.object({
        bitacoras: z.array(bitacoraSchema),
        quincenas: z.array(
          z.object({
            numero: z.number().int(),
            fechaInicio: z.string().datetime(),
            fechaFin: z.string().datetime(),
            estado: z.enum([
              'APROBADA',
              'ENVIADA',
              'OBSERVADA',
              'BORRADOR',
              'PENDIENTE',
              'ATRASADA',
              'FUTURA',
            ]),
          }),
        ),
        resumen: z.object({
          horasAprobadas: z.number().int(),
          horasMinimas: z.number().int(),
          quincenasAtrasadas: z.number().int(),
          porRevisar: z.number().int(),
        }),
      }),
      'Bitácoras de la asignación',
    ),
    ...respuestasError(401, 403, 404),
  },
});

registro.registerPath({
  method: 'post',
  path: '/asignaciones/{id}/bitacoras',
  tags: [tag],
  summary: 'Registrar la bitácora de una quincena (RF-16)',
  description:
    'Queda en BORRADOR. Exige el plan de trabajo aprobado por ambos tutores (RN-07) y una quincena ya iniciada (422); una quincena repetida responde 409.',
  security: seguridad,
  request: {
    params: asignacionParams,
    body: { content: { 'application/json': { schema: crearBitacoraSchema } } },
  },
  responses: {
    201: json(unaBitacora, 'Bitácora registrada'),
    ...respuestasError(400, 401, 403, 404, 409, 422),
  },
});

registro.registerPath({
  method: 'put',
  path: '/bitacoras/{id}',
  tags: [tag],
  summary: 'Corregir una bitácora en borrador u observada',
  security: seguridad,
  request: {
    params: idParams,
    body: { content: { 'application/json': { schema: actualizarBitacoraSchema } } },
  },
  responses: {
    200: json(unaBitacora, 'Bitácora actualizada'),
    ...respuestasError(400, 401, 403, 404, 409),
  },
});

registro.registerPath({
  method: 'post',
  path: '/bitacoras/{id}/enviar',
  tags: [tag],
  summary: 'Enviar la bitácora a revisión (CU-08)',
  description:
    'Notifica a ambos tutores. Si se envía después de los tres días de gracia se marca como extemporánea (RN-08).',
  security: seguridad,
  request: { params: idParams },
  responses: {
    200: json(unaBitacora, 'Bitácora enviada'),
    ...respuestasError(401, 403, 404, 409),
  },
});

registro.registerPath({
  method: 'patch',
  path: '/bitacoras/{id}/aprobar',
  tags: [tag],
  summary: 'Aprobar una bitácora (RF-17)',
  description: 'Las horas de la bitácora se suman a las horas acumuladas del expediente (RF-18).',
  security: seguridad,
  request: { params: idParams },
  responses: {
    200: json(unaBitacora, 'Bitácora aprobada'),
    ...respuestasError(401, 403, 404, 409),
  },
});

registro.registerPath({
  method: 'patch',
  path: '/bitacoras/{id}/observar',
  tags: [tag],
  summary: 'Devolver una bitácora con observaciones (RF-17)',
  security: seguridad,
  request: {
    params: idParams,
    body: { content: { 'application/json': { schema: observarBitacoraSchema } } },
  },
  responses: {
    200: json(unaBitacora, 'Bitácora observada'),
    ...respuestasError(400, 401, 403, 404, 409),
  },
});
