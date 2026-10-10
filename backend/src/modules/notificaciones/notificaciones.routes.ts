import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { errores } from '../../lib/errores.js';
import { paginacionQuery, paginar, saltar } from '../../lib/paginacion.js';
import { prisma } from '../../lib/prisma.js';
import { z } from '../../lib/zod.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

export const listarNotificacionesQuery = z.object({
  soloNoLeidas: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true')
    .openapi({ type: 'boolean', description: 'Devuelve solo las notificaciones sin leer' }),
  ...paginacionQuery,
});

export const notificacionParams = z.object({ id: z.string().min(1) });

type ListarQuery = z.infer<typeof listarNotificacionesQuery>;

const notificacionSelect = {
  id: true,
  tipo: true,
  titulo: true,
  mensaje: true,
  enlace: true,
  leida: true,
  creadaEn: true,
} satisfies Prisma.NotificacionSelect;

/** RF-23: notificaciones dentro de la aplicación. Cada usuario solo accede a las suyas. */
export const notificacionesRouter = Router();

notificacionesRouter.use(requireAuth);

notificacionesRouter.get(
  '/',
  validate({ query: listarNotificacionesQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListarQuery;
    const usuarioId = req.usuario!.id;
    const where: Prisma.NotificacionWhereInput = {
      usuarioId,
      ...(query.soloNoLeidas && { leida: false }),
    };
    const [data, total, noLeidas] = await prisma.$transaction([
      prisma.notificacion.findMany({
        where,
        select: notificacionSelect,
        orderBy: { creadaEn: 'desc' },
        skip: saltar(query.page, query.limit),
        take: query.limit,
      }),
      prisma.notificacion.count({ where }),
      prisma.notificacion.count({ where: { usuarioId, leida: false } }),
    ]);
    res.json({ ...paginar(req, data, total, query.page, query.limit), noLeidas });
  }),
);

notificacionesRouter.patch(
  '/leer-todas',
  asyncHandler(async (req, res) => {
    const { count } = await prisma.notificacion.updateMany({
      where: { usuarioId: req.usuario!.id, leida: false },
      data: { leida: true },
    });
    res.json({ actualizadas: count });
  }),
);

notificacionesRouter.patch(
  '/:id/leer',
  validate({ params: notificacionParams }),
  asyncHandler(async (req, res) => {
    // Filtrar por usuario evita marcar notificaciones ajenas (anti-IDOR): responde 404.
    const { count } = await prisma.notificacion.updateMany({
      where: { id: req.params.id as string, usuarioId: req.usuario!.id },
      data: { leida: true },
    });
    if (count === 0) throw errores.noEncontrado('Notificación');
    const notificacion = await prisma.notificacion.findUniqueOrThrow({
      where: { id: req.params.id as string },
      select: notificacionSelect,
    });
    res.json({ notificacion });
  }),
);
