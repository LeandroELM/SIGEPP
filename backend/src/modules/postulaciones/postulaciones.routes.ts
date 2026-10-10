import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { paginar } from '../../lib/paginacion.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermiso } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  crearPostulacionSchema,
  idParams,
  type ListarCandidatosQuery,
  listarCandidatosQuery,
  type ListarMisPostulacionesQuery,
  listarMisPostulacionesQuery,
  rechazarPostulacionSchema,
} from './postulaciones.schema.js';
import * as service from './postulaciones.service.js';

export const postulacionesRouter = Router();

postulacionesRouter.use(requireAuth);

postulacionesRouter.post(
  '/',
  requirePermiso('postulaciones:crear'),
  validate({ body: crearPostulacionSchema }),
  asyncHandler(async (req, res) => {
    const postulacion = await service.crear(req.body, req.usuario!);
    res.status(201).location(`/api/v1/postulaciones/${postulacion.id}`).json({ postulacion });
  }),
);

postulacionesRouter.get(
  '/mias',
  requirePermiso('postulaciones:verPropias'),
  validate({ query: listarMisPostulacionesQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListarMisPostulacionesQuery;
    const { data, total } = await service.listarMias(query, req.usuario!);
    res.json(paginar(req, data, total, query.page, query.limit));
  }),
);

postulacionesRouter.get(
  '/candidatos',
  requirePermiso('postulaciones:preseleccionar'),
  validate({ query: listarCandidatosQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListarCandidatosQuery;
    const { data, total } = await service.listarCandidatos(query, req.usuario!);
    res.json(paginar(req, data, total, query.page, query.limit));
  }),
);

postulacionesRouter.patch(
  '/:id/retirar',
  requirePermiso('postulaciones:crear'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json({ postulacion: await service.retirar(req.params.id as string, req.usuario!) });
  }),
);

postulacionesRouter.patch(
  '/:id/preseleccionar',
  requirePermiso('postulaciones:preseleccionar'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json({ postulacion: await service.preseleccionar(req.params.id as string, req.usuario!) });
  }),
);

postulacionesRouter.patch(
  '/:id/rechazar',
  requirePermiso('postulaciones:preseleccionar'),
  validate({ params: idParams, body: rechazarPostulacionSchema }),
  asyncHandler(async (req, res) => {
    res.json({
      postulacion: await service.rechazar(
        req.params.id as string,
        req.body.comentario,
        req.usuario!,
      ),
    });
  }),
);
