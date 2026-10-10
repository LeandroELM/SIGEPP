import { z } from '../../lib/zod.js';

export const estadoBitacoraSchema = z.enum(['BORRADOR', 'ENVIADA', 'OBSERVADA', 'APROBADA']);

export const idParams = z.object({ id: z.string().min(1) });

/** CU-08 paso 4: las horas de una quincena no pueden ser negativas ni exceder el máximo. */
export const HORAS_MAXIMAS_QUINCENA = 90;

const contenido = {
  actividades: z
    .string()
    .trim()
    .min(20, 'Describe las actividades en al menos 20 caracteres')
    .max(3000)
    .openapi({
      example:
        'Implementé el formulario de registro de productos y sus validaciones; participé en la reunión de seguimiento del equipo.',
    }),
  horas: z.coerce
    .number({ invalid_type_error: 'Indica las horas trabajadas' })
    .int('Las horas deben ser un número entero')
    .min(1, 'Registra al menos 1 hora')
    .max(HORAS_MAXIMAS_QUINCENA, `Una quincena no puede superar ${HORAS_MAXIMAS_QUINCENA} horas`)
    .openapi({ example: 40 }),
};

/** RF-16: registro de la bitácora de una quincena (queda en BORRADOR). */
export const crearBitacoraSchema = z
  .object({
    quincena: z.coerce
      .number()
      .int()
      .min(1)
      .openapi({ example: 1, description: 'Número de quincena desde el inicio de la práctica' }),
    ...contenido,
  })
  .openapi('CrearBitacora');

export const actualizarBitacoraSchema = z.object(contenido).openapi('ActualizarBitacora');

export const observarBitacoraSchema = z
  .object({
    observacion: z
      .string()
      .trim()
      .min(10, 'Explica la observación en al menos 10 caracteres')
      .max(1000)
      .openapi({ example: 'Detalla las tareas del martes y adjunta la evidencia de las pruebas.' }),
  })
  .openapi('ObservarBitacora');

export type CrearBitacoraInput = z.infer<typeof crearBitacoraSchema>;
export type ActualizarBitacoraInput = z.infer<typeof actualizarBitacoraSchema>;
