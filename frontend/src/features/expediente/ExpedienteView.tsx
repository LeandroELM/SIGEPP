import { Circle, CircleCheck, CircleDot } from 'lucide-react';
import { fecha, modalidadLabel, nombre } from '../shared/format';
import type { Asignacion, Hito } from '../shared/types';
import { Datos, EnlaceBoton, EstadoBadge, Progreso, Seccion } from '../shared/ui';
import { BitacorasRevision } from '../bitacoras/BitacorasRevision';
import { PlanSeccion } from './PlanSeccion';

const iconos = { COMPLETADO: CircleCheck, EN_CURSO: CircleDot, PENDIENTE: Circle };
const estadoHito = { COMPLETADO: 'Completado', EN_CURSO: 'En curso', PENDIENTE: 'Pendiente' };

/** RF-24: línea de tiempo con los seis hitos del trámite. */
function LineaTiempo({ hitos }: { hitos: Hito[] }) {
  return <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
    {hitos.map((hito, index) => {
      const Icono = iconos[hito.estado];
      const color = hito.estado === 'COMPLETADO' ? 'text-success border-success' : hito.estado === 'EN_CURSO' ? 'text-primary border-primary' : 'text-muted border-border';
      return <li key={hito.clave} className={`flex items-start gap-2 rounded-control border-2 p-3 ${color}`} aria-current={hito.estado === 'EN_CURSO' ? 'step' : undefined}>
        <Icono className="ui-icon mt-1 shrink-0" aria-hidden="true" />
        <div className="min-w-0 text-text">
          <p className="text-sm text-muted">Paso {index + 1}</p>
          <p className="font-semibold">{hito.titulo}</p>
          <p className="text-sm">{estadoHito[hito.estado]}</p>
        </div>
      </li>;
    })}
  </ol>;
}

/** WF-04: expediente de la práctica, compartido por el estudiante, sus tutores y la coordinación. */
export function ExpedienteView({ asignacion }: { asignacion: Asignacion }) {
  const estudiante = asignacion.miRol === 'ESTUDIANTE';
  return <div className="grid gap-6">
    <Seccion title="Avance del trámite" actions={<EstadoBadge estado={asignacion.estado} />}>
      <LineaTiempo hitos={asignacion.hitos} />
      <Progreso porcentaje={asignacion.progreso.porcentaje} label={`Horas acumuladas: ${asignacion.progreso.horasAcumuladas} de ${asignacion.progreso.horasMinimas}`} />
    </Seccion>

    <Seccion title="Práctica">
      <Datos values={[
        ['Estudiante', `${nombre(asignacion.estudiante.usuario)} (${asignacion.estudiante.carnet})`],
        ['Carrera', asignacion.estudiante.carrera],
        ['Plaza', asignacion.plaza.titulo], ['Organización', asignacion.plaza.organizacion.razonSocial],
        ['Área', asignacion.plaza.area], ['Modalidad', `${modalidadLabel(asignacion.plaza.modalidad)} · ${asignacion.plaza.ubicacion}`],
        ['Horario', asignacion.plaza.horario], ['Período', asignacion.periodo.nombre],
        ['Fechas', `${fecha(asignacion.fechaInicio)} – ${fecha(asignacion.fechaFin)}`],
        ['Bitácoras registradas', asignacion.totalBitacoras],
      ]} />
    </Seccion>

    <Seccion title="Tutores">
      <Datos values={[
        ['Tutor académico', <><span>{nombre(asignacion.docente.usuario)}</span><br /><span className="text-sm text-muted">{asignacion.docente.usuario.correo} · {asignacion.docente.departamento}</span></>],
        ['Tutor empresarial', <><span>{nombre(asignacion.tutorEmpresarial.usuario)}</span><br /><span className="text-sm text-muted">{asignacion.tutorEmpresarial.usuario.correo} · {asignacion.tutorEmpresarial.cargo}</span></>],
      ]} />
    </Seccion>

    {estudiante
      ? <Seccion title="Plan de trabajo" actions={<EnlaceBoton to="/expediente/plan" variant="primario">{asignacion.planTrabajo ? 'Ver plan de trabajo' : 'Elaborar plan de trabajo'}</EnlaceBoton>}>
        {asignacion.planTrabajo
          ? <Datos values={[['Estado', <EstadoBadge key="e" estado={asignacion.planTrabajo.estado} />], ['Versión', asignacion.planTrabajo.version], ['Horas previstas', asignacion.planTrabajo.horasPrevistas]]} />
          : <p>Aún no has elaborado tu plan de trabajo. Es el siguiente paso de tu práctica.</p>}
      </Seccion>
      : <><PlanSeccion asignacion={asignacion} /><BitacorasRevision asignacion={asignacion} /></>}

    {estudiante && <Seccion title="Bitácoras" actions={<EnlaceBoton to="/expediente/bitacoras">Ver bitácoras</EnlaceBoton>}>
      <p>{asignacion.planTrabajo?.estado === 'APROBADO' ? 'Tu plan está aprobado: ya puedes llevar el registro quincenal de actividades.' : 'Las bitácoras se habilitan cuando ambos tutores aprueban tu plan de trabajo.'}</p>
    </Seccion>}
  </div>;
}
