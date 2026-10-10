import {
  json,
  MetaPaginacionSchema,
  registro,
  respuestasError,
  seguridad,
} from '../../docs/registro.js';
import { z } from '../../lib/zod.js';
import { modalidadSchema } from '../plazas/plazas.schema.js';
import {
  crearPostulacionSchema,
  estadoPostulacionSchema,
  idParams,
  listarCandidatosQuery,
  listarMisPostulacionesQuery,
  rechazarPostulacionSchema,
} from './postulaciones.schema.js';

const tag = 'Postulaciones';

const postulacionSchema = registro.register(
  'Postulacion',
  z.object({
    id: z.string(),
    estado: estadoPostulacionSchema,
    cartaMotivacion: z.string(),
    creadaEn: z.string().datetime(),
    resueltaEn: z.string().datetime().nullable(),
    plaza: z.object({
      id: z.string(),
      titulo: z.string(),
      area: z.string(),
      modalidad: modalidadSchema,
      ubicacion: z.string(),
      estado: z.string(),
      organizacion: z.object({ id: z.string(), razonSocial: z.string() }),
    }),
    asignacion: z.object({ id: z.string() }).nullable(),
  }),
);

const candidatoSchema = registro.register(
  'Candidato',
  postulacionSchema.extend({
    estudiante: z.object({
      id: z.string(),
      carnet: z.string(),
      carrera: z.string(),
      anio: z.number().int(),
      porcentajeAvance: z.string().openapi({ example: '92' }),
      usuario: z.object({
        nombres: z.string(),
        apellidos: z.string(),
        correo: z.string(),
        telefono: z.string().nullable(),
      }),
    }),
  }),
);

const paginado = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ data: z.array(item), meta: MetaPaginacionSchema });

registro.registerPath({
  method: 'post',
  path: '/postulaciones',
  tags: [tag],
  summary: 'Postularse a una plaza (RF-11)',
  description:
    'Valida RN-01 (80 % de avance verificado), RN-02 (sin asignación activa en el período) y RN-03 (máximo tres postulaciones pendientes) con 422; plaza sin cupos o postulación repetida con 409. Notifica a los tutores empresariales de la organización.',
  security: seguridad,
  request: { body: { content: { 'application/json': { schema: crearPostulacionSchema } } } },
  responses: {
    201: json(z.object({ postulacion: postulacionSchema }), 'Postulación registrada'),
    ...respuestasError(400, 401, 403, 404, 409, 422),
  },
});

registro.registerPath({
  method: 'get',
  path: '/postulaciones/mias',
  tags: [tag],
  summary: 'Mis postulaciones',
  security: seguridad,
  request: { query: listarMisPostulacionesQuery },
  responses: {
    200: json(paginado(postulacionSchema), 'Postulaciones del estudiante'),
    ...respuestasError(400, 401, 403),
  },
});

registro.registerPath({
  method: 'patch',
  path: '/postulaciones/{id}/retirar',
  tags: [tag],
  summary: 'Retirar una postulación pendiente',
  security: seguridad,
  request: { params: idParams },
  responses: {
    200: json(z.object({ postulacion: postulacionSchema }), 'Postulación retirada'),
    ...respuestasError(401, 403, 404, 409),
  },
});

registro.registerPath({
  method: 'get',
  path: '/postulaciones/candidatos',
  tags: [tag],
  summary: 'Candidatos de las plazas de mi organización (RF-12)',
  description: 'Solo para el tutor empresarial; por defecto excluye las postulaciones retiradas.',
  security: seguridad,
  request: { query: listarCandidatosQuery },
  responses: {
    200: json(paginado(candidatoSchema), 'Candidatos'),
    ...respuestasError(400, 401, 403),
  },
});

registro.registerPath({
  method: 'patch',
  path: '/postulaciones/{id}/preseleccionar',
  tags: [tag],
  summary: 'Preseleccionar un candidato (RF-12)',
  description:
    'El candidato pasa a la bandeja de asignaciones de la coordinación. No se pueden preseleccionar más candidatos que cupos disponibles (409).',
  security: seguridad,
  request: { params: idParams },
  responses: {
    200: json(z.object({ postulacion: candidatoSchema }), 'Candidato preseleccionado'),
    ...respuestasError(401, 403, 404, 409),
  },
});

registro.registerPath({
  method: 'patch',
  path: '/postulaciones/{id}/rechazar',
  tags: [tag],
  summary: 'Rechazar un candidato (RF-12)',
  security: seguridad,
  request: {
    params: idParams,
    body: { content: { 'application/json': { schema: rechazarPostulacionSchema } } },
  },
  responses: {
    200: json(z.object({ postulacion: candidatoSchema }), 'Candidato rechazado'),
    ...respuestasError(400, 401, 403, 404, 409),
  },
});
