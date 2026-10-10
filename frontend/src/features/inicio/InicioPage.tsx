import { Link } from 'react-router-dom';
import { useApiQuery, type Paginado } from '../../api/hooks';
import type { Rol } from '../auth/contracts';
import { useSession } from '../../hooks/useSession';
import { fechaHora } from '../shared/format';
import type { Asignacion, Notificacion, Plaza, Postulacion } from '../shared/types';
import { EnlaceBoton, EstadoBadge, Progreso, Seccion } from '../shared/ui';

/** WF-01 (S3-H4): panel de inicio con el siguiente paso de cada rol y los avisos recientes. */
export default function InicioPage() {
  const { snapshot } = useSession();
  if (snapshot.status !== 'autenticada') return null;
  const { usuario } = snapshot;
  return <div className="grid gap-6">
    <section className="rounded-card border border-border bg-surface p-4 sm:p-6">
      <h2 className="break-words text-xl font-semibold">Bienvenido, {usuario.nombres} {usuario.apellidos}</h2>
      <p className="mt-2 break-words text-muted">{usuario.correo}</p>
    </section>
    <ResumenRol rol={usuario.rol} />
    <AvisosRecientes />
  </div>;
}

function ResumenRol({ rol }: { rol: Rol }) {
  if (rol === 'ESTUDIANTE') return <ResumenEstudiante />;
  if (rol === 'TUTOR_ACADEMICO' || rol === 'TUTOR_EMPRESARIAL') return <ResumenTutor rol={rol} />;
  if (rol === 'ORGANIZACION') return <ResumenOrganizacion />;
  if (rol === 'ADMIN') return <Seccion title="Administración">
    <p>Consulta la bitácora de auditoría y supervisa plazas, organizaciones y asignaciones.</p>
    <div className="flex flex-wrap gap-3"><EnlaceBoton to="/admin/auditoria" variant="primario">Ver auditoría</EnlaceBoton><EnlaceBoton to="/asignaciones">Ver asignaciones</EnlaceBoton></div>
  </Seccion>;
  return null;
}

function ResumenEstudiante() {
  // The list (not /asignaciones/actual) avoids a 404 for students still without a practice.
  const lista = useApiQuery<Paginado<Asignacion>>('/asignaciones?limit=10');
  const asignacion = lista.data?.data.find((a) => a.estado === 'ASIGNADA' || a.estado === 'EN_CURSO');
  const postulaciones = useApiQuery<Paginado<Postulacion>>('/postulaciones/mias?limit=50', { enabled: lista.isSuccess && !asignacion });
  if (lista.isPending) return null;

  if (asignacion) {
    const plan = asignacion.planTrabajo;
    const siguiente = !plan || plan.estado === 'BORRADOR' || plan.estado === 'OBSERVADO'
      ? { texto: plan?.estado === 'OBSERVADO' ? 'Corrige tu plan de trabajo según las observaciones de tus tutores.' : 'Elabora y envía tu plan de trabajo.', to: '/expediente/plan', accion: 'Ir al plan de trabajo' }
      : plan.estado === 'EN_REVISION'
        ? { texto: 'Tu plan está en revisión de tus tutores.', to: '/expediente/plan', accion: 'Ver plan de trabajo' }
        : { texto: 'Registra tus bitácoras quincenales a tiempo.', to: '/expediente/bitacoras', accion: 'Ir a bitácoras' };
    return <Seccion title="Mi práctica" actions={<EstadoBadge estado={asignacion.estado} />}>
      <p><strong>{asignacion.plaza.titulo}</strong> en {asignacion.plaza.organizacion.razonSocial}</p>
      <Progreso porcentaje={asignacion.progreso.porcentaje} label={`Horas acumuladas: ${asignacion.progreso.horasAcumuladas} de ${asignacion.progreso.horasMinimas}`} />
      <p>Siguiente paso: {siguiente.texto}</p>
      <div className="flex flex-wrap gap-3"><EnlaceBoton to={siguiente.to} variant="primario">{siguiente.accion}</EnlaceBoton><EnlaceBoton to="/expediente">Ver expediente</EnlaceBoton></div>
    </Seccion>;
  }

  const pendientes = (postulaciones.data?.data ?? []).filter((p) => p.estado === 'POSTULADA' || p.estado === 'PRESELECCIONADA');
  return <Seccion title="Mi búsqueda de práctica">
    <p>{postulaciones.data ? `Tienes ${pendientes.length} postulación(es) pendiente(s) de un máximo de 3.` : 'Aún no tienes una práctica asignada.'}</p>
    <div className="flex flex-wrap gap-3"><EnlaceBoton to="/plazas" variant="primario">Buscar plazas</EnlaceBoton><EnlaceBoton to="/postulaciones">Mis postulaciones</EnlaceBoton></div>
  </Seccion>;
}

function ResumenTutor({ rol }: { rol: 'TUTOR_ACADEMICO' | 'TUTOR_EMPRESARIAL' }) {
  const lista = useApiQuery<Paginado<Asignacion>>('/asignaciones?limit=50');
  const candidatos = useApiQuery<Paginado<Postulacion>>('/postulaciones/candidatos?estado=POSTULADA&limit=1', { enabled: rol === 'TUTOR_EMPRESARIAL' });
  const asignaciones = lista.data?.data ?? [];
  const academico = rol === 'TUTOR_ACADEMICO';
  const planes = asignaciones.filter((a) => a.planTrabajo?.estado === 'EN_REVISION' && !(academico ? a.planTrabajo.aprobadoDocenteEn : a.planTrabajo.aprobadoEmpresaEn)).length;
  const bitacoras = asignaciones.reduce((total, a) => total + a.bitacorasPorRevisar, 0);
  return <Seccion title="Pendientes">
    <ul className="grid gap-2">
      <li>{asignaciones.length} estudiante(s) a tu cargo</li>
      <li>{planes} plan(es) de trabajo por revisar</li>
      <li>{bitacoras} bitácora(s) por revisar</li>
      {!academico && candidatos.data && <li>{candidatos.data.meta.total} candidato(s) nuevo(s)</li>}
    </ul>
    <div className="flex flex-wrap gap-3">
      {academico
        ? <><EnlaceBoton to="/revisiones" variant="primario">Ir a revisiones</EnlaceBoton><EnlaceBoton to="/tutorados">Mis tutorados</EnlaceBoton></>
        : <><EnlaceBoton to="/candidatos" variant="primario">Revisar candidatos</EnlaceBoton><EnlaceBoton to="/practicantes">Mis practicantes</EnlaceBoton></>}
    </div>
  </Seccion>;
}

function ResumenOrganizacion() {
  const plazas = useApiQuery<Paginado<Plaza>>('/plazas/mias?limit=50');
  const lista = plazas.data?.data ?? [];
  const cuenta = (estado: string) => lista.filter((p) => p.estado === estado).length;
  return <Seccion title="Mis plazas">
    <ul className="grid gap-2">
      <li>{cuenta('APROBADA')} publicada(s)</li>
      <li>{cuenta('EN_REVISION')} en revisión</li>
      <li>{cuenta('RECHAZADA')} rechazada(s) por corregir</li>
      <li>{lista.reduce((total, p) => total + p.totalPostulaciones, 0)} postulación(es) recibidas</li>
    </ul>
    <div className="flex flex-wrap gap-3"><EnlaceBoton to="/org/plazas/nueva" variant="primario">Publicar plaza</EnlaceBoton><EnlaceBoton to="/org/plazas">Ver mis plazas</EnlaceBoton></div>
  </Seccion>;
}

function AvisosRecientes() {
  const avisos = useApiQuery<Paginado<Notificacion>>('/notificaciones?limit=5');
  const items = Array.isArray(avisos.data?.data) ? avisos.data.data : [];
  if (items.length === 0) return null;
  return <Seccion title="Avisos recientes">
    <ul className="grid gap-3">
      {items.map((n) => <li key={n.id} className="grid gap-1 border-b border-border pb-3">
        <span className="font-semibold">{n.titulo}{!n.leida && <span className="sr-only"> (sin leer)</span>}</span>
        <span>{n.mensaje}</span>
        <span className="text-sm text-muted">{fechaHora(n.creadaEn)}{n.enlace && <> · <Link className="text-primary underline" to={n.enlace}>Ver</Link></>}</span>
      </li>)}
    </ul>
  </Seccion>;
}
