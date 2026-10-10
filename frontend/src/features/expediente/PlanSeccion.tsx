import { useState } from 'react';
import { errorText, useApiMutation, useApiQuery } from '../../api/hooks';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Tabla } from '../../components/Tabla';
import { Textarea } from '../../components/Textarea';
import { useToast } from '../../hooks/useToast';
import { fechaHora } from '../shared/format';
import type { Actividad, Asignacion, PlanTrabajo } from '../shared/types';
import { Alerta, Datos, EstadoBadge, QueryView, Seccion } from '../shared/ui';

export function ActividadesTabla({ actividades, caption = 'Actividades' }: { actividades: Actividad[]; caption?: string }) {
  return <Tabla<Actividad & { n: number }>
    caption={caption}
    rows={actividades.map((a, n) => ({ ...a, n }))}
    getRowId={(a) => String(a.n)}
    empty={<p className="text-muted">Sin actividades.</p>}
    columns={[
      { id: 'descripcion', header: 'Actividad', render: (a) => a.descripcion },
      { id: 'semanas', header: 'Semanas', render: (a) => a.semanaInicio === a.semanaFin ? `${a.semanaInicio}` : `${a.semanaInicio} a ${a.semanaFin}` },
      { id: 'horas', header: 'Horas', render: (a) => a.horas },
    ]}
  />;
}

/** RF-15: historial de versiones enviadas con las observaciones de cada tutor. */
export function HistorialVersiones({ plan }: { plan: PlanTrabajo }) {
  if (plan.versiones.length === 0) return null;
  return <Seccion title="Historial de versiones enviadas">
    <ol className="grid gap-3">
      {plan.versiones.map((v) => <li key={v.version} className="rounded-control border border-border p-3">
        <details>
          <summary className="cursor-pointer font-semibold">Versión {v.version} · {v.horasPrevistas} h · enviada {fechaHora(v.creadaEn)}</summary>
          <div className="mt-3 grid gap-3">
            <p className="whitespace-pre-line">{v.objetivos}</p>
            <ActividadesTabla actividades={v.actividades} caption={`Actividades de la versión ${v.version}`} />
          </div>
        </details>
        {(v.observacionDocente || v.observacionEmpresa) && <div className="mt-3 grid gap-2">
          {v.observacionDocente && <p><strong>Observación del tutor académico:</strong> {v.observacionDocente}</p>}
          {v.observacionEmpresa && <p><strong>Observación del tutor empresarial:</strong> {v.observacionEmpresa}</p>}
        </div>}
      </li>)}
    </ol>
  </Seccion>;
}

export function EstadoAprobaciones({ plan }: { plan: PlanTrabajo }) {
  const aprobacion = (fecha: string | null) => fecha ? `Aprobó el ${fechaHora(fecha)}` : 'Pendiente';
  return <Datos values={[
    ['Estado', <EstadoBadge key="e" estado={plan.estado} />], ['Versión', plan.version], ['Horas previstas', plan.horasPrevistas],
    ['Tutor académico', aprobacion(plan.aprobadoDocenteEn)], ['Tutor empresarial', aprobacion(plan.aprobadoEmpresaEn)],
  ]} />;
}

/** Vista del plan para tutores y coordinación, con las acciones de revisión de cada tutor (RN-07). */
export function PlanSeccion({ asignacion }: { asignacion: Asignacion }) {
  const plan = useApiQuery<{ plan: PlanTrabajo }>(`/asignaciones/${asignacion.id}/plan`, { enabled: !!asignacion.planTrabajo });
  if (!asignacion.planTrabajo) {
    return <Seccion title="Plan de trabajo"><p>El estudiante aún no ha elaborado su plan de trabajo.</p></Seccion>;
  }
  return <QueryView query={plan} loading="Cargando plan de trabajo…">{({ plan }) => <>
    <Seccion title="Plan de trabajo">
      <EstadoAprobaciones plan={plan} />
      <div><p className="text-sm text-muted">Objetivos</p><p className="mt-1 whitespace-pre-line">{plan.objetivos}</p></div>
      <ActividadesTabla actividades={plan.actividades} />
      <RevisionPlan plan={plan} asignacion={asignacion} />
    </Seccion>
    <HistorialVersiones plan={plan} />
  </>}</QueryView>;
}

function RevisionPlan({ plan, asignacion }: { plan: PlanTrabajo; asignacion: Asignacion }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [observacion, setObservacion] = useState('');
  const aprobar = useApiMutation<{ plan: PlanTrabajo }, void>(() => ({ path: `/planes-trabajo/${plan.id}/aprobar`, method: 'PATCH' }));
  const observar = useApiMutation<{ plan: PlanTrabajo }, string>((texto) => ({ path: `/planes-trabajo/${plan.id}/observar`, method: 'PATCH', json: { observacion: texto } }));

  const tutor = asignacion.miRol === 'TUTOR_ACADEMICO' || asignacion.miRol === 'TUTOR_EMPRESARIAL';
  if (!tutor || plan.estado !== 'EN_REVISION') return null;
  const yaAprobe = asignacion.miRol === 'TUTOR_ACADEMICO' ? plan.aprobadoDocenteEn : plan.aprobadoEmpresaEn;
  if (yaAprobe) return <p role="status">Ya aprobaste esta versión. Falta la aprobación del otro tutor.</p>;

  return <div className="grid gap-3 border-t border-border pt-4">
    <p className="font-semibold">Tu revisión de la versión {plan.version}</p>
    <Alerta messages={errorText(aprobar.error)} />
    <div className="flex flex-wrap gap-3">
      <Button loading={aprobar.isPending} onClick={() => aprobar.mutate(undefined, { onSuccess: () => toast.notify({ tone: 'exito', title: 'Plan aprobado' }) })}>Aprobar plan</Button>
      <Modal open={abierto} onOpenChange={setAbierto} title="Observar plan de trabajo" description="El estudiante recibirá tu observación y deberá reenviar el plan corregido."
        trigger={<Button variant="secundario">Devolver con observaciones…</Button>}>
        <Textarea label="Observación" rows={5} value={observacion} onChange={(e) => setObservacion(e.target.value)} help="Mínimo 10 caracteres" />
        <Alerta messages={errorText(observar.error)} />
        <Button disabled={observacion.trim().length < 10} loading={observar.isPending}
          onClick={() => observar.mutate(observacion.trim(), { onSuccess: () => { setAbierto(false); setObservacion(''); toast.notify({ tone: 'informacion', title: 'Plan devuelto con observaciones' }); } })}>Enviar observación</Button>
      </Modal>
    </div>
  </div>;
}
