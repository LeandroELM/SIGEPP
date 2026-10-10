import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermiso } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  actualizarBitacoraSchema,
  crearBitacoraSchema,
  idParams,
  observarBitacoraSchema,
} from './bitacoras.schema.js';
import * as service from './bitacoras.service.js';

const id = (params: Record<string, string>) => params.id as string;

/** Montado en /asignaciones/:id/bitacoras. */
export const bitacorasAsignacionRouter = Router({ mergeParams: true });

bitacorasAsignacionRouter.use(requireAuth);

bitacorasAsignacionRouter.get(
  '/',
  requirePermiso('asignaciones:ver'),
  asyncHandler(async (req, res) => {
    res.json(await service.listar(id(req.params), req.usuario!));
  }),
);

bitacorasAsignacionRouter.post(
  '/',
  requirePermiso('bitacoras:registrar'),
  validate({ body: crearBitacoraSchema }),
  asyncHandler(async (req, res) => {
    const bitacora = await service.crear(id(req.params), req.body, req.usuario!);
    res.status(201).json({ bitacora });
  }),
);

/** Operaciones sobre una bitácora existente: /bitacoras/:id */
export const bitacorasRouter = Router();

bitacorasRouter.use(requireAuth);

bitacorasRouter.put(
  '/:id',
  requirePermiso('bitacoras:registrar'),
  validate({ params: idParams, body: actualizarBitacoraSchema }),
  asyncHandler(async (req, res) => {
    res.json({ bitacora: await service.actualizar(id(req.params), req.body, req.usuario!) });
  }),
);

bitacorasRouter.post(
  '/:id/enviar',
  requirePermiso('bitacoras:registrar'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json({ bitacora: await service.enviar(id(req.params), req.usuario!) });
  }),
);

bitacorasRouter.patch(
  '/:id/aprobar',
  requirePermiso('bitacoras:revisar'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json({ bitacora: await service.aprobar(id(req.params), req.usuario!) });
  }),
);

bitacorasRouter.patch(
  '/:id/observar',
  requirePermiso('bitacoras:revisar'),
  validate({ params: idParams, body: observarBitacoraSchema }),
  asyncHandler(async (req, res) => {
    res.json({
      bitacora: await service.observar(id(req.params), req.body.observacion, req.usuario!),
    });
  }),
);
