import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { errorText, useApiMutation, useApiQuery } from '../../api/hooks';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Textarea } from '../../components/Textarea';
import { useToast } from '../../hooks/useToast';
import { SinAsignacion } from '../expediente/ExpedientePage';
import { useAsignacionActual } from '../expediente/useAsignacionActual';
import { fecha } from '../shared/format';
import type { Asignacion, Bitacora, BitacorasRespuesta, Quincena } from '../shared/types';
import { Alerta, EnlaceBoton, EstadoBadge, Progreso, QueryView, Seccion } from '../shared/ui';

/** WF-04 (RF-16, CU-08): registro quincenal de actividades y horas del estudiante. */
export default function BitacorasPage() {
  const actual = useAsignacionActual();
  if (actual.isError && actual.error.status === 404) return <SinAsignacion />;
  return <QueryView query={actual} loading="Cargando expediente…">{({ asignacion }) =>
    asignacion.planTrabajo?.estado === 'APROBADO'
      ? <BitacorasEstudiante asignacion={asignacion} />
      : <Seccion title="Bitácoras aún no habilitadas">
        <p>Podrás registrar tus bitácoras cuando ambos tutores aprueben tu plan de trabajo (RN-07).</p>
        <div><EnlaceBoton to="/expediente/plan" variant="primario">Ir al plan de trabajo</EnlaceBoton></div>
      </Seccion>}
  </QueryView>;
}

export function ResumenBitacoras({ resumen }: { resumen: BitacorasRespuesta['resumen'] }) {
  const porcentaje = Math.min(100, Math.round((resumen.horasAprobadas / resumen.horasMinimas) * 100));
  return <div className="grid gap-3">
    <Progreso porcentaje={porcentaje} label={`Horas aprobadas: ${resumen.horasAprobadas} de ${resumen.horasMinimas}`} />
    {resumen.quincenasAtrasadas > 0 && <p role="alert" className="rounded-control border border-error p-3">
      {resumen.quincenasAtrasadas === 1 ? 'Hay 1 quincena atrasada' : `Hay ${resumen.quincenasAtrasadas} quincenas atrasadas`}: la bitácora debe enviarse a más tardar tres días después del cierre de la quincena (RN-08).
    </p>}
  </div>;
}

function BitacorasEstudiante({ asignacion }: { asignacion: Asignacion }) {
  const datos = useApiQuery<BitacorasRespuesta>(`/asignaciones/${asignacion.id}/bitacoras`);
  return <QueryView query={datos} loading="Cargando bitácoras…">{({ bitacoras, quincenas, resumen }) => <div className="grid gap-6">
    <Seccion title="Avance de horas"><ResumenBitacoras resumen={resumen} /></Seccion>
    <ol className="grid gap-4">
      {quincenas.map((q) => <li key={q.numero}>
        <QuincenaTarjeta asignacionId={asignacion.id} quincena={q} bitacora={bitacoras.find((b) => b.quincena === q.numero)} />
      </li>)}
    </ol>
  </div>}</QueryView>;
}

function QuincenaTarjeta({ asignacionId, quincena, bitacora }: { asignacionId: string; quincena: Quincena; bitacora?: Bitacora }) {
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const enviar = useApiMutation<unknown, void>(() => ({ path: `/bitacoras/${bitacora?.id}/enviar`, method: 'POST' }));
  const editable = !bitacora || bitacora.estado === 'BORRADOR' || bitacora.estado === 'OBSERVADA';
  const disponible = quincena.estado !== 'FUTURA';

  return <section className="grid gap-3 rounded-card border border-border bg-surface p-4 sm:p-6" aria-labelledby={`quincena-${quincena.numero}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id={`quincena-${quincena.numero}`} className="text-lg font-semibold">Quincena {quincena.numero}</h2>
        <p className="text-sm text-muted">{fecha(quincena.fechaInicio)} – {fecha(quincena.fechaFin)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <EstadoBadge estado={bitacora?.estado ?? quincena.estado} />
        {bitacora?.extemporanea && <EstadoBadge estado="EXTEMPORANEA" />}
      </div>
    </div>

    {bitacora?.estado === 'OBSERVADA' && bitacora.observacionTutor && <div className="rounded-control border border-error p-3">
      <p className="font-semibold">Observación de tu tutor</p><p>{bitacora.observacionTutor}</p>
    </div>}

    {editando
      ? <BitacoraForm asignacionId={asignacionId} quincena={quincena.numero} bitacora={bitacora} onDone={() => setEditando(false)} />
      : bitacora
        ? <>
          <p className="whitespace-pre-line">{bitacora.actividades}</p>
          <p><strong>{bitacora.horas}</strong> horas registradas{bitacora.enviadaEn ? ` · enviada el ${fecha(bitacora.enviadaEn)}` : ''}</p>
          {editable && <div className="flex flex-wrap gap-3">
            <Button variant="secundario" onClick={() => setEditando(true)}>Editar</Button>
            <Button loading={enviar.isPending} onClick={() => enviar.mutate(undefined, { onSuccess: () => toast.notify({ tone: 'exito', title: 'Bitácora enviada a tus tutores' }) })}>Enviar a revisión</Button>
          </div>}
          <Alerta messages={errorText(enviar.error)} />
        </>
        : disponible
          ? <div><Button variant={quincena.estado === 'ATRASADA' ? 'primario' : 'secundario'} onClick={() => setEditando(true)}>Registrar bitácora</Button></div>
          : <p className="text-muted">Podrás registrarla cuando comience la quincena.</p>}
  </section>;
}

const bitacoraSchema = z.object({
  actividades: z.string().trim().min(20, 'Describe las actividades en al menos 20 caracteres').max(3000),
  horas: z.coerce.number({ invalid_type_error: 'Indica las horas' }).int('Horas enteras').min(1, 'Mínimo 1 hora').max(90, 'Una quincena no puede superar 90 horas'),
});

function BitacoraForm({ asignacionId, quincena, bitacora, onDone }: { asignacionId: string; quincena: number; bitacora?: Bitacora; onDone(): void }) {
  const toast = useToast();
  const [actividades, setActividades] = useState(bitacora?.actividades ?? '');
  const [horas, setHoras] = useState(bitacora ? String(bitacora.horas) : '');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const guardar = useApiMutation<{ bitacora: Bitacora }, z.infer<typeof bitacoraSchema>>((json) => bitacora
    ? { path: `/bitacoras/${bitacora.id}`, method: 'PUT', json }
    : { path: `/asignaciones/${asignacionId}/bitacoras`, method: 'POST', json: { ...json, quincena } });

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = bitacoraSchema.safeParse({ actividades, horas });
    if (!result.success) {
      setErrores(Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrores({});
    guardar.mutate(result.data, { onSuccess: () => { toast.notify({ tone: 'exito', title: 'Bitácora guardada como borrador' }); onDone(); } });
  }

  return <form noValidate onSubmit={submit} className="grid gap-4">
    <Alerta messages={errorText(guardar.error)} />
    <Textarea label="Actividades realizadas" rows={5} required value={actividades} onChange={(e) => setActividades(e.target.value)} error={errores.actividades}
      help="Describe las tareas de la quincena y su relación con el plan de trabajo." />
    <div className="w-full sm:w-[12rem]"><Input label="Horas trabajadas" type="number" min={1} max={90} required value={horas} onChange={(e) => setHoras(e.target.value)} error={errores.horas} /></div>
    <div className="flex flex-wrap gap-3">
      <Button type="submit" loading={guardar.isPending}>Guardar borrador</Button>
      <Button variant="fantasma" onClick={onDone}>Cancelar</Button>
    </div>
  </form>;
}
