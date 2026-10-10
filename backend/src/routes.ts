import { Router } from 'express';
import { asignacionesRouter } from './modules/asignaciones/asignaciones.routes.js';
import { auditoriaRouter } from './modules/auditoria/auditoria.routes.js';
import {
  bitacorasAsignacionRouter,
  bitacorasRouter,
} from './modules/bitacoras/bitacoras.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { notificacionesRouter } from './modules/notificaciones/notificaciones.routes.js';
import { organizacionesRouter } from './modules/organizaciones/organizaciones.routes.js';
import {
  planAsignacionRouter,
  planesTrabajoRouter,
} from './modules/planes-trabajo/planes-trabajo.routes.js';
import { plazasRouter } from './modules/plazas/plazas.routes.js';
import { postulacionesRouter } from './modules/postulaciones/postulaciones.routes.js';

/** Enrutador de la versión 1 de la API, montado en /api/v1. */
export const apiV1 = Router();

apiV1.use('/auth', authRouter);
apiV1.use('/organizaciones', organizacionesRouter);
apiV1.use('/plazas', plazasRouter);
apiV1.use('/postulaciones', postulacionesRouter);
apiV1.use('/asignaciones/:id/plan', planAsignacionRouter);
apiV1.use('/asignaciones/:id/bitacoras', bitacorasAsignacionRouter);
apiV1.use('/asignaciones', asignacionesRouter);
apiV1.use('/planes-trabajo', planesTrabajoRouter);
apiV1.use('/bitacoras', bitacorasRouter);
apiV1.use('/notificaciones', notificacionesRouter);
apiV1.use('/auditoria', auditoriaRouter);
