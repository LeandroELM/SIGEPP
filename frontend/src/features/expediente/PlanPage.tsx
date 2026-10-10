import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { errorText, useApiMutation, useApiQuery } from '../../api/hooks';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Textarea } from '../../components/Textarea';
import { useToast } from '../../hooks/useToast';
import type { Actividad, Asignacion, PlanTrabajo } from '../shared/types';
import { Alerta, EnlaceBoton, QueryView, Seccion } from '../shared/ui';
import { SinAsignacion } from './ExpedientePage';
import { useAsignacionActual } from './useAsignacionActual';
import { ActividadesTabla, EstadoAprobaciones, HistorialVersiones } from './PlanSeccion';

/** WF-04 (RF-14): el estudiante elabora, corrige y envía su plan de trabajo. */
export default function PlanPage() {
  const actual = useAsignacionActual();
  if (actual.isError && actual.error.status === 404) return <SinAsignacion />;
  return <QueryView query={actual} loading="Cargando expediente…">{({ asignacion }) => <PlanDeAsignacion asignacion={asignacion} />}</QueryView>;
}

function PlanDeAsignacion({ asignacion }: { asignacion: Asignacion }) {
  const plan = useApiQuery<{ plan: PlanTrabajo }>(`/asignaciones/${asignacion.id}/plan`, { enabled: !!asignacion.planTrabajo });
  const minimas = asignacion.periodo.horasMinimas;
  if (!asignacion.planTrabajo) return <Seccion title="Nuevo plan de trabajo"><PlanEditor asignacionId={asignacion.id} horasMinimas={minimas} /></Seccion>;
  return <QueryView query={plan} loading="Cargando plan de trabajo…">{({ plan }) => <PlanExistente plan={plan} horasMinimas={minimas} />}</QueryView>;
}

function PlanExistente({ plan, horasMinimas }: { plan: PlanTrabajo; horasMinimas: number }) {
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const editable = plan.estado === 'BORRADOR' || plan.estado === 'OBSERVADO';
  const enviar = useApiMutation<{ plan: PlanTrabajo }, void>(() => ({ path: `/planes-trabajo/${plan.id}/enviar`, method: 'POST' }));
  const ultima = plan.versiones[0];
  const observaciones = plan.estado === 'OBSERVADO' && ultima ? [ultima.observacionDocente, ultima.observacionEmpresa].filter(Boolean) : [];

  return <div className="grid gap-6">
    <Seccion title="Plan de trabajo" actions={editable && !editando ? <Button variant="secundario" onClick={() => setEditando(true)}>Editar</Button> : undefined}>
      <EstadoAprobaciones plan={plan} />
      {observaciones.length > 0 && <div className="rounded-control border border-error p-3">
        <p className="font-semibold">Tus tutores devolvieron el plan con observaciones</p>
        {observaciones.map((o, i) => <p key={i} className="mt-1">{o}</p>)}
      </div>}
      {plan.estado === 'EN_REVISION' && <p role="status">El plan está en revisión. Necesita la aprobación de ambos tutores (RN-07).</p>}
      {plan.estado === 'APROBADO' && <p role="status">¡Plan aprobado! Ya puedes registrar tus bitácoras quincenales.</p>}
      {editando
        ? <PlanEditor plan={plan} horasMinimas={horasMinimas} onDone={() => setEditando(false)} />
        : <>
          <div><p className="text-sm text-muted">Objetivos</p><p className="mt-1 whitespace-pre-line">{plan.objetivos}</p></div>
          <ActividadesTabla actividades={plan.actividades} />
          {editable && <div className="grid gap-3 border-t border-border pt-4">
            {plan.horasPrevistas < horasMinimas && <p>Para enviar el plan, las actividades deben sumar al menos {horasMinimas} horas (actualmente {plan.horasPrevistas}).</p>}
            <Alerta messages={errorText(enviar.error)} />
            <div><Button loading={enviar.isPending} disabled={plan.horasPrevistas < horasMinimas}
              onClick={() => enviar.mutate(undefined, { onSuccess: () => toast.notify({ tone: 'exito', title: 'Plan enviado a revisión' }) })}>Enviar a revisión</Button></div>
          </div>}
        </>}
    </Seccion>
    <HistorialVersiones plan={plan} />
    <div><EnlaceBoton to="/expediente">Volver al expediente</EnlaceBoton></div>
  </div>;
}

const actividadSchema = z.object({
  descripcion: z.string().trim().min(5, 'Describe la actividad (mínimo 5 caracteres)').max(300),
  semanaInicio: z.coerce.number().int().min(1, 'Semana entre 1 y 26').max(26, 'Semana entre 1 y 26'),
  semanaFin: z.coerce.number().int().min(1, 'Semana entre 1 y 26').max(26, 'Semana entre 1 y 26'),
  horas: z.coerce.number().int('Horas enteras').min(1, 'Mínimo 1 hora').max(200, 'Máximo 200 horas'),
}).refine((a) => a.semanaFin >= a.semanaInicio, { message: 'No puede ser anterior a la semana de inicio', path: ['semanaFin'] });
const planSchema = z.object({
  objetivos: z.string().trim().min(20, 'Describe los objetivos en al menos 20 caracteres').max(2000),
  actividades: z.array(actividadSchema).min(1, 'Agrega al menos una actividad').max(30, 'Máximo 30 actividades'),
});

type Fila = Record<keyof Actividad, string>;
const filaVacia = (): Fila => ({ descripcion: '', semanaInicio: '1', semanaFin: '1', horas: '' });

function PlanEditor({ plan, asignacionId, horasMinimas, onDone }: { plan?: PlanTrabajo; asignacionId?: string; horasMinimas: number; onDone?(): void }) {
  const toast = useToast();
  const [objetivos, setObjetivos] = useState(plan?.objetivos ?? '');
  const [filas, setFilas] = useState<Fila[]>(plan
    ? plan.actividades.map((a) => ({ descripcion: a.descripcion, semanaInicio: String(a.semanaInicio), semanaFin: String(a.semanaFin), horas: String(a.horas) }))
    : [filaVacia()]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const guardar = useApiMutation<{ plan: PlanTrabajo }, z.infer<typeof planSchema>>((json) => plan
    ? { path: `/planes-trabajo/${plan.id}`, method: 'PUT', json }
    : { path: `/asignaciones/${asignacionId}/plan`, method: 'POST', json });
  const total = filas.reduce((suma, f) => suma + (Number(f.horas) || 0), 0);
  const cambiar = (index: number, campo: keyof Fila, value: string) => setFilas((actual) => actual.map((f, i) => i === index ? { ...f, [campo]: value } : f));

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = planSchema.safeParse({ objetivos, actividades: filas });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[issue.path.join('.')] ??= issue.message;
      setErrores(next);
      return;
    }
    setErrores({});
    guardar.mutate(result.data, { onSuccess: () => { toast.notify({ tone: 'exito', title: 'Plan guardado como borrador' }); onDone?.(); } });
  }

  return <form noValidate onSubmit={submit} className="grid gap-4">
    <Alerta messages={errorText(guardar.error)} />
    <Textarea label="Objetivos de la práctica" rows={4} required value={objetivos} onChange={(e) => setObjetivos(e.target.value)} error={errores.objetivos} />
    <fieldset className="grid gap-3">
      <legend className="mb-2 font-semibold">Actividades</legend>
      {errores.actividades && <p className="ui-field-error">{errores.actividades}</p>}
      {filas.map((fila, i) => <div key={i} className="grid gap-3 rounded-control border border-border p-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_6rem_auto] sm:items-start">
        <Textarea label={`Actividad ${i + 1}`} rows={2} value={fila.descripcion} onChange={(e) => cambiar(i, 'descripcion', e.target.value)} error={errores[`actividades.${i}.descripcion`]} />
        <Input label="Semana inicio" type="number" min={1} max={26} value={fila.semanaInicio} onChange={(e) => cambiar(i, 'semanaInicio', e.target.value)} error={errores[`actividades.${i}.semanaInicio`]} />
        <Input label="Semana fin" type="number" min={1} max={26} value={fila.semanaFin} onChange={(e) => cambiar(i, 'semanaFin', e.target.value)} error={errores[`actividades.${i}.semanaFin`]} />
        <Input label="Horas" type="number" min={1} max={200} value={fila.horas} onChange={(e) => cambiar(i, 'horas', e.target.value)} error={errores[`actividades.${i}.horas`]} />
        <Button variant="fantasma" className="sm:mt-6" disabled={filas.length === 1} aria-label={`Quitar actividad ${i + 1}`} onClick={() => setFilas((actual) => actual.filter((_, j) => j !== i))}>
          <Trash2 className="ui-icon" aria-hidden="true" />
        </Button>
      </div>)}
      <div><Button variant="secundario" disabled={filas.length >= 30} onClick={() => setFilas((actual) => [...actual, filaVacia()])}><Plus className="ui-icon" aria-hidden="true" />Agregar actividad</Button></div>
    </fieldset>
    <p role="status">Total de horas previstas: <strong>{total}</strong> (mínimo del período: {horasMinimas})</p>
    <div className="flex flex-wrap gap-3">
      <Button type="submit" loading={guardar.isPending}>Guardar borrador</Button>
      {onDone && <Button variant="fantasma" onClick={onDone}>Cancelar</Button>}
    </div>
  </form>;
}
