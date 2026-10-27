/**
 * Prepara una base vacía (por ejemplo, la de producción) sin cargar el seed:
 * crea la cuenta de administración y, si no existe, el período académico activo,
 * que es necesario para que los estudiantes puedan postularse.
 *
 * Uso (las credenciales nunca se guardan en el código):
 *   DATABASE_URL=... ADMIN_CORREO=... ADMIN_CONTRASENA=... npm run db:crear-admin
 *
 * Variables opcionales: ADMIN_NOMBRES, ADMIN_APELLIDOS, BCRYPT_COST,
 * PERIODO_NOMBRE, PERIODO_ANIO, PERIODO_SEMESTRE, PERIODO_INICIO, PERIODO_FIN (YYYY-MM-DD)
 * y PERIODO_HORAS_MINIMAS.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { z } from 'zod';
import { contrasena, correo } from '../src/modules/auth/auth.schema.js';

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato YYYY-MM-DD');
const esquema = z.object({
  ADMIN_CORREO: correo,
  ADMIN_CONTRASENA: contrasena,
  ADMIN_NOMBRES: z.string().trim().min(1).default('Administrador'),
  ADMIN_APELLIDOS: z.string().trim().min(1).default('SIGEPP'),
  BCRYPT_COST: z.coerce.number().int().min(12).default(12),
  PERIODO_NOMBRE: z.string().trim().min(1).default('II Semestre 2026'),
  PERIODO_ANIO: z.coerce.number().int().default(2026),
  PERIODO_SEMESTRE: z.coerce.number().int().min(1).max(2).default(2),
  PERIODO_INICIO: fecha.default('2026-08-15'),
  PERIODO_FIN: fecha.default('2026-12-15'),
  PERIODO_HORAS_MINIMAS: z.coerce.number().int().positive().default(240),
});

const resultado = esquema.safeParse(process.env);
if (!resultado.success) {
  console.error('Variables inválidas:', resultado.error.flatten().fieldErrors);
  process.exit(1);
}
const config = resultado.data;
const prisma = new PrismaClient();

async function main() {
  const existente = await prisma.usuario.findUnique({ where: { correo: config.ADMIN_CORREO } });
  if (existente) {
    console.info(`Ya existe una cuenta con el correo ${config.ADMIN_CORREO}; no se modificó.`);
  } else {
    await prisma.usuario.create({
      data: {
        rol: 'ADMIN',
        correo: config.ADMIN_CORREO,
        nombres: config.ADMIN_NOMBRES,
        apellidos: config.ADMIN_APELLIDOS,
        hashContrasena: await bcrypt.hash(config.ADMIN_CONTRASENA, config.BCRYPT_COST),
      },
    });
    console.info(`Cuenta de administración creada: ${config.ADMIN_CORREO}`);
  }

  const periodo = await prisma.periodo.findFirst({ where: { activo: true } });
  if (periodo) {
    console.info(`Período activo existente: ${periodo.nombre}`);
    return;
  }
  // Hora de Nicaragua (UTC-6), igual que el seed.
  await prisma.periodo.create({
    data: {
      nombre: config.PERIODO_NOMBRE,
      anio: config.PERIODO_ANIO,
      semestre: config.PERIODO_SEMESTRE,
      fechaInicio: new Date(`${config.PERIODO_INICIO}T00:00:00-06:00`),
      fechaFin: new Date(`${config.PERIODO_FIN}T23:59:59-06:00`),
      horasMinimas: config.PERIODO_HORAS_MINIMAS,
      convocatoriaAbierta: true,
      activo: true,
    },
  });
  console.info(`Período activo creado: ${config.PERIODO_NOMBRE}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
