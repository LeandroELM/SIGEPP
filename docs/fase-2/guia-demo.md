# Guía de la demo — Fase 2

Recorrido de unos 12 minutos que muestra el proceso completo con el API real: *publicar → aprobar → postularse → preseleccionar → asignar → plan → bitácora*. Reemplaza a la [guía de S1](s1-frontend-demo.md), que solo cubre autenticación y navegación.

## Preparación (antes de presentar)

```bash
docker compose up -d                 # PostgreSQL
cd backend && npm run db:reset       # datos limpios del seed
npm run dev                          # API en http://localhost:4000
cd ../frontend && npm run dev        # SPA en http://localhost:5173
```

- Contraseña de todas las cuentas: `Sigepp2026`.
- Use una ventana de incógnito por cuenta (o cierre sesión entre roles).
- Tenga abierta una pestaña con Swagger UI: `http://localhost:4000/api/docs`.

> El seed ya trae a María preseleccionada para «Desarrollador Web Jr.». Así la parte de asignación no depende de los pasos anteriores.

## Guion

| # | Cuenta | Acción | Qué señalar |
|---|---|---|---|
| 1 | `rrhh@solucionesdigitales.example` | **Mis plazas → Publicar plaza** y completar el formulario. | La plaza queda *En revisión* (RN-04). |
| 2 | `coordinacion.sistemas@uni.edu.ni` | **Panel → Revisar plazas**, abrir la plaza y **Aprobar plaza**. | Ya es visible para los estudiantes. Mostrar también **Organizaciones** y el convenio (RN-12). |
| 3 | `diego.morales@std.uni.edu.ni` | Abrir la plaza nueva y **Postularme**. | Rechazo con el mensaje de RN-01 (74 % de avance). |
| 4 | `kevin.castro@std.uni.edu.ni` | Postularse a la misma plaza; abrir **Postulaciones**. | Estado *Postulada*; el límite de tres pendientes (RN-03). |
| 5 | `pedro.lopez@solucionesdigitales.example` | **Candidatos → Revisar → Preseleccionar** a Kevin. Abrir la **campana**. | Ficha y carta del estudiante; la notificación de la postulación. |
| 6 | `coordinacion.sistemas@uni.edu.ni` | **Asignaciones → Asignar…** a María (seed): tutor académico José Martínez, tutor empresarial Pedro López. Poner como fecha de inicio unos 20 días antes de hoy. | Carga del docente (RN-06). La fecha pasada permite mostrar bitácoras. |
| 7 | `maria.gonzalez@std.uni.edu.ni` | **Inicio** (siguiente paso) → **Expediente** → **Elaborar plan de trabajo** con actividades que sumen 240 h → **Enviar a revisión**. | Línea de tiempo de seis hitos; validación de horas mínimas. |
| 8 | `jose.martinez@uni.edu.ni` | **Revisiones** → abrir a María → **Devolver con observaciones…** | El plan vuelve a la estudiante. |
| 9 | `maria.gonzalez@std.uni.edu.ni` | **Editar** el plan y reenviarlo. | Historial de versiones con la observación. |
| 10 | `jose.martinez@uni.edu.ni` y `pedro.lopez@…` | **Aprobar plan** con cada tutor. | Con ambas aprobaciones la práctica pasa a *En curso* (RN-07). |
| 11 | `maria.gonzalez@std.uni.edu.ni` | **Bitácoras → Registrar bitácora** de la quincena 1 → **Enviar a revisión**. | Quincena *Atrasada* y bitácora *Extemporánea* (RN-08). |
| 12 | `pedro.lopez@…` | Abrir el expediente desde la campana → **Aprobar** la bitácora. | Las horas suben en el expediente (RF-18). |
| 13 | `admin@uni.edu.ni` | **Auditoría**, filtrar por entidad *Bitacora*. | Cada operación con usuario, fecha y valores. |

## Cierre técnico (2 minutos)

1. **Swagger UI**: mostrar los grupos *Postulaciones*, *Bitácoras* y *Notificaciones* y ejecutar un `GET` con el botón *Authorize*.
2. **Pestaña Red** (F12): repetir una acción y mostrar la petición y su respuesta.
3. **Prisma Studio** (`cd backend && npm run db:studio`): mostrar el registro que acaba de cambiar.
4. Mencionar las pruebas: 120 de backend, 397 unitarias de frontend, E2E 40/40 y 26/26, y Postman con 213 aserciones sin fallos.

## Si algo falla durante la demo

| Síntoma | Solución |
|---|---|
| «Demasiadas peticiones» | Esperar un minuto (límite de 100 peticiones por minuto por IP). |
| La asignación de María ya existe | Se ejecutó la demo antes: `npm run db:reset` en `backend`. |
| «Aún no puedes registrar bitácoras» | Falta la aprobación de uno de los tutores, o la fecha de inicio de la práctica es futura. |
| La página no carga datos tras reiniciar el API | Recargar la página; la sesión se restaura sola. |
