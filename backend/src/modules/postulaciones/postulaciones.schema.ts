import { paginacionQuery } from '../../lib/paginacion.js';
import { z } from '../../lib/zod.js';

export const estadoPostulacionSchema = z.enum([
  'POSTULADA',
  'PRESELECCIONADA',
  'RECHAZADA',
  'RETIRADA',
  'ASIGNADA',
]);

export const idParams = z.object({
  id: z.string().min(1).openapi({ example: 'cmv1yawex0010pged3vl5vpq6' }),
});

/** RF-11 (CU-04): postulación del estudiante a una plaza aprobada. */
export const crearPostulacionSchema = z
  .object({
    plazaId: z.string().min(1).openapi({ example: 'cmv1yawej000vpgedxtheqe25' }),
    cartaMotivacion: z
      .string()
      .trim()
      .min(50, 'La carta de motivación debe tener al menos 50 caracteres')
      .max(2000)
      .openapi({
        example:
          'Me interesa aplicar lo aprendido en la carrera y aportar al equipo de desarrollo de la organización.',
      }),
  })
  .openapi('CrearPostulacion');

export const listarMisPostulacionesQuery = z.object({
  estado: estadoPostulacionSchema.optional(),
  ...paginacionQuery,
});

/** RF-12: candidatos de las plazas de la organización del tutor empresarial. */
export const listarCandidatosQuery = z.object({
  estado: estadoPostulacionSchema.optional(),
  plazaId: z.string().optional(),
  ...paginacionQuery,
});

export const rechazarPostulacionSchema = z
  .object({
    comentario: z
      .string()
      .trim()
      .max(500)
      .optional()
      .openapi({ description: 'Se incluye en la notificación al estudiante' }),
  })
  .openapi('RechazarPostulacion');

export type CrearPostulacionInput = z.infer<typeof crearPostulacionSchema>;
export type ListarMisPostulacionesQuery = z.infer<typeof listarMisPostulacionesQuery>;
export type ListarCandidatosQuery = z.infer<typeof listarCandidatosQuery>;
