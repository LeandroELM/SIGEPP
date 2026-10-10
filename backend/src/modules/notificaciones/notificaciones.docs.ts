import {
  json,
  MetaPaginacionSchema,
  registro,
  respuestasError,
  seguridad,
} from '../../docs/registro.js';
import { z } from '../../lib/zod.js';
import { listarNotificacionesQuery, notificacionParams } from './notificaciones.routes.js';

const tag = 'Notificaciones';

const notificacionSchema = registro.register(
  'Notificacion',
  z.object({
    id: z.string(),
    tipo: z.string().openapi({ example: 'PLAN_APROBADO' }),
    titulo: z.string(),
    mensaje: z.string(),
    enlace: z.string().nullable().openapi({ example: '/expediente/bitacoras' }),
    leida: z.boolean(),
    creadaEn: z.string().datetime(),
  }),
);

registro.registerPath({
  method: 'get',
  path: '/notificaciones',
  tags: [tag],
  summary: 'Mis notificaciones (RF-23)',
  description: 'De la más reciente a la más antigua, con el total de notificaciones sin leer.',
  security: seguridad,
  request: { query: listarNotificacionesQuery },
  responses: {
    200: json(
      z.object({
        data: z.array(notificacionSchema),
        meta: MetaPaginacionSchema,
        noLeidas: z.number().int(),
      }),
      'Notificaciones del usuario',
    ),
    ...respuestasError(400, 401),
  },
});

registro.registerPath({
  method: 'patch',
  path: '/notificaciones/{id}/leer',
  tags: [tag],
  summary: 'Marcar una notificación como leída',
  security: seguridad,
  request: { params: notificacionParams },
  responses: {
    200: json(z.object({ notificacion: notificacionSchema }), 'Notificación leída'),
    ...respuestasError(401, 404),
  },
});

registro.registerPath({
  method: 'patch',
  path: '/notificaciones/leer-todas',
  tags: [tag],
  summary: 'Marcar todas mis notificaciones como leídas',
  security: seguridad,
  responses: {
    200: json(z.object({ actualizadas: z.number().int() }), 'Cantidad de notificaciones marcadas'),
    ...respuestasError(401),
  },
});
