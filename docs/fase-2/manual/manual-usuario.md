# SIGEPP — Manual de usuario (borrador)

**Sistema de Gestión del Ejercicio Profesional y Prácticas Profesionales**
Programa Académico de Ingeniería en Sistemas — UNI, Recinto Universitario Simón Bolívar.
Versión de la Fase 2 · octubre de 2026.

Este manual explica cómo usa SIGEPP cada rol. Las capturas se tomaron del sistema en funcionamiento con los datos de prueba del seed.

## Contenido

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Estudiante](#2-estudiante)
3. [Organización receptora](#3-organización-receptora)
4. [Coordinación académica](#4-coordinación-académica)
5. [Tutor académico](#5-tutor-académico)
6. [Tutor empresarial](#6-tutor-empresarial)
7. [Administración](#7-administración)
8. [Notificaciones](#8-notificaciones)
9. [Uso en el teléfono](#9-uso-en-el-teléfono)
10. [Mensajes frecuentes](#10-mensajes-frecuentes)

---

## 1. Acceso al sistema

Abra SIGEPP en el navegador e inicie sesión con su correo y contraseña. Los estudiantes y los docentes crean su cuenta en **Crear cuenta** usando su correo institucional (`@std.uni.edu.ni` o `@uni.edu.ni`). Las cuentas de las organizaciones y de sus tutores empresariales las registra la organización.

![Pantalla de inicio de sesión](capturas/01-login.png)

- Tras cinco intentos fallidos la cuenta se bloquea temporalmente.
- La sesión se mantiene al recargar la página y se cierra con **Cerrar sesión**, en la esquina superior derecha.
- El menú de la izquierda solo muestra las secciones que corresponden a su rol.

---

## 2. Estudiante

### 2.1 Inicio

La página de inicio muestra el estado de su práctica, las horas acumuladas y el **siguiente paso** que debe dar, además de los avisos recientes.

![Inicio del estudiante](capturas/02-estudiante-inicio.png)

### 2.2 Buscar plazas

En **Plazas** se listan las plazas aprobadas por la coordinación. Puede buscar por texto y filtrar por área, modalidad, ubicación y organización, y ordenar por fecha, título o cupos.

![Bolsa de plazas](capturas/03-estudiante-bolsa-plazas.png)

### 2.3 Postularse

Abra una plaza y pulse **Postularme**. Escriba una carta de motivación (mínimo 50 caracteres) y pulse **Enviar postulación**.

![Formulario de postulación](capturas/09-estudiante-postulacion.png)

El sistema verifica automáticamente que usted:

- tenga al menos **80 %** del plan de estudios aprobado y verificado (RN-01);
- no tenga ya una práctica asignada en el período (RN-02);
- no tenga más de **tres** postulaciones pendientes (RN-03).

Si alguna regla no se cumple, el formulario muestra el motivo.

### 2.4 Mis postulaciones

En **Postulaciones** se ve el estado de cada postulación: *Postulada*, *Preseleccionada*, *Asignada*, *Rechazada* o *Retirada*. Mientras esté pendiente puede **Retirarla**; una postulación retirada no puede volver a enviarse a la misma plaza.

![Mis postulaciones](capturas/08-estudiante-mis-postulaciones.png)

### 2.5 Expediente

Cuando la coordinación confirma su asignación, **Expediente** muestra la línea de tiempo del trámite en seis pasos, el avance de horas, los datos de la práctica y sus dos tutores.

![Expediente del estudiante](capturas/04-estudiante-expediente.png)

### 2.6 Plan de trabajo

Desde el expediente pulse **Elaborar plan de trabajo**. Escriba los objetivos y agregue las actividades con sus semanas y horas; el total debe alcanzar las horas mínimas del período (240). Guarde el borrador y pulse **Enviar a revisión**.

- Ambos tutores deben aprobarlo (RN-07). Si alguno lo devuelve con observaciones, corríjalo con **Editar** y vuelva a enviarlo; cada envío queda como una versión en el historial.

![Plan de trabajo con historial de versiones](capturas/05-estudiante-plan-trabajo.png)

### 2.7 Bitácoras quincenales

Con el plan aprobado se habilita **Bitácoras**. La práctica se divide en quincenas; para cada una pulse **Registrar bitácora**, describa las actividades y las horas (de 1 a 90), guarde el borrador y pulse **Enviar a revisión**.

![Registro de una bitácora](capturas/07-estudiante-registro-bitacora.png)

- Debe enviarla a más tardar **tres días** después del cierre de la quincena. Si no lo hace, la quincena aparece como *Atrasada* y, al enviarla, queda marcada como *Extemporánea* (RN-08).
- Si un tutor la observa, corríjala y reenvíela. Al aprobarse, sus horas se suman al avance del expediente.

![Calendario de bitácoras](capturas/06-estudiante-bitacoras.png)

---

## 3. Organización receptora

### 3.1 Mis plazas y publicación

En **Mis plazas** se listan las plazas de la organización en todos sus estados, con los cupos ocupados y las postulaciones recibidas. Para publicar se requiere que la organización esté **verificada** y con **convenio vigente** (RN-12).

![Mis plazas](capturas/10-organizacion-mis-plazas.png)

Pulse **Publicar plaza** y complete el formulario. La plaza queda **En revisión** hasta que la coordinación la apruebe (RN-04). Si la rechaza, verá el motivo en el detalle y podrá **Corregir plaza**, que la devuelve a revisión.

![Publicar plaza](capturas/11-organizacion-publicar-plaza.png)

### 3.2 Tutores empresariales

En **Tutores** se dan de alta los tutores que supervisarán a los practicantes (**Agregar tutor**) y se dan de baja o se reactivan.

![Tutores de la organización](capturas/12-organizacion-tutores.png)

---

## 4. Coordinación académica

### 4.1 Panel

El panel resume lo que requiere atención: plazas por revisar, organizaciones por verificar, candidatos por asignar y prácticas en curso.

![Panel de coordinación](capturas/13-coordinacion-panel.png)

### 4.2 Revisión de plazas

Desde **Revisar plazas** abra una plaza en revisión. Pulse **Aprobar plaza** para publicarla o **Rechazar…** indicando el motivo (mínimo 10 caracteres).

![Revisión académica de una plaza](capturas/14-coordinacion-revision-plaza.png)

### 4.3 Verificación de organizaciones

En **Organizaciones** filtre por estado y abra una organización con **Revisar**. Para verificarla registre la fecha de vigencia del convenio, que debe ser posterior a hoy.

![Listado de organizaciones](capturas/15-coordinacion-organizaciones.png)

![Verificación del convenio](capturas/16-coordinacion-verificar-organizacion.png)

### 4.4 Asignaciones

En **Asignaciones** aparecen las postulaciones preseleccionadas por las empresas. Pulse **Asignar…**, elija el tutor académico (se muestra su carga; máximo ocho tutorados, RN-06), el tutor empresarial y las fechas, y confirme. El estudiante y ambos tutores reciben una notificación.

![Asignaciones y candidatos](capturas/17-coordinacion-asignaciones.png)

![Confirmar asignación](capturas/18-coordinacion-confirmar-asignacion.png)

---

## 5. Tutor académico

El inicio indica cuántos planes y bitácoras esperan su revisión. **Tutorados** lista a sus estudiantes y **Revisiones**, a los que tienen algo pendiente.

![Inicio del tutor académico](capturas/19-tutor-academico-inicio.png)

![Revisiones pendientes](capturas/20-tutor-academico-revisiones.png)

Abra el expediente del estudiante para:

- **Aprobar plan** o **Devolver con observaciones…**; el plan queda aprobado cuando ambos tutores lo aprueban.
- **Aprobar** u **Observar…** cada bitácora enviada.

![Expediente visto por el tutor](capturas/21-tutor-academico-expediente.png)

---

## 6. Tutor empresarial

En **Candidatos** se listan las postulaciones a las plazas de su organización. Pulse **Revisar** para ver la ficha del estudiante y su carta, y luego **Preseleccionar** o **Rechazar** (con un comentario opcional). No se pueden preseleccionar más candidatos que cupos tiene la plaza.

![Candidatos](capturas/22-tutor-empresarial-candidatos.png)

![Ficha del candidato](capturas/23-tutor-empresarial-ficha-candidato.png)

En **Practicantes** encontrará a sus estudiantes asignados; la revisión del plan y de las bitácoras funciona igual que para el tutor académico.

---

## 7. Administración

**Auditoría** muestra las operaciones críticas (aprobaciones, verificaciones, asignaciones, revisiones) con el usuario, la fecha y los valores anteriores y nuevos. Puede filtrar por entidad, acción y rango de fechas.

![Auditoría](capturas/25-administracion-auditoria.png)

---

## 8. Notificaciones

La campana de la barra superior indica cuántas notificaciones tiene sin leer. Al abrirla puede pulsar una notificación para ir a la pantalla correspondiente o **Marcar todas como leídas**.

![Notificaciones](capturas/24-notificaciones.png)

---

## 9. Uso en el teléfono

SIGEPP se adapta a pantallas desde 360 px. En el teléfono el menú pasa a la barra inferior; las demás secciones están en **Más**.

| Expediente en el teléfono | Menú «Más» |
|---|---|
| ![Expediente en móvil](capturas/26-movil-expediente.png) | ![Menú Más](capturas/27-movil-menu.png) |

---

## 10. Mensajes frecuentes

| Mensaje | Qué significa |
|---|---|
| *No cumples los requisitos académicos para postularte* | Su avance acreditado es menor al 80 % (RN-01). |
| *Alcanzaste el límite de postulaciones pendientes* | Ya tiene tres postulaciones pendientes; retire una (RN-03). |
| *Ya tienes una asignación activa en este período* | No puede postularse mientras tenga una práctica activa (RN-02). |
| *El plan no alcanza las horas mínimas del período* | La suma de horas de las actividades es menor a 240. |
| *Aún no puedes registrar bitácoras* | Su plan todavía no tiene la aprobación de ambos tutores (RN-07). |
| *La organización no puede publicar plazas* | Falta la verificación o el convenio está vencido (RN-12). |
| *No tienes permiso para realizar esta acción* | La operación no corresponde a su rol. |
