import { useState } from 'react';
import { errorText, useApiMutation, useApiQuery } from '../../api/hooks';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Textarea } from '../../components/Textarea';
import { useToast } from '../../hooks/useToast';
import { fecha } from '../shared/format';
import type { Asignacion, Bitacora, BitacorasRespuesta } from '../shared/types';
import { Alerta, EstadoBadge, QueryView, Seccion } from '../shared/ui';
import { ResumenBitacoras } from './BitacorasPage';

/** RF-17 y RF-18: bitácoras del estudiante vistas por sus tutores y la coordinación. */
export function BitacorasRevision({ asignacion }: { asignacion: Asignacion }) {
  const datos = useApiQuery<BitacorasRespuesta>(`/asignaciones/${asignacion.id}/bitacoras`, { enabled: asignacion.planTrabajo?.estado === 'APROBADO' });
  if (asignacion.planTrabajo?.estado !== 'APROBADO') {
    return <Seccion title="Bitácoras"><p>Las bitácoras se habilitan cuando ambos tutores aprueban el plan de trabajo.</p></Seccion>;
  }
  const tutor = asignacion.miRol === 'TUTOR_ACADEMICO' || asignacion.miRol === 'TUTOR_EMPRESARIAL';
  return <QueryView query={datos} loading="Cargando bitácoras…">{({ bitacoras, resumen }) => {
    // Los borradores son privados del estudiante hasta que los envía.
    const visibles = bitacoras.filter((b) => b.estado !== 'BORRADOR');
    return <Seccion title="Bitácoras">
      <ResumenBitacoras resumen={resumen} />
      {visibles.length === 0
        ? <p>El estudiante aún no ha enviado bitácoras.</p>
        : <ol className="grid gap-3">{visibles.map((b) => <li key={b.id}><BitacoraItem bitacora={b} puedeRevisar={tutor} /></li>)}</ol>}
    </Seccion>;
  }}</QueryView>;
}

function BitacoraItem({ bitacora, puedeRevisar }: { bitacora: Bitacora; puedeRevisar: boolean }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [observacion, setObservacion] = useState('');
  const aprobar = useApiMutation<unknown, void>(() => ({ path: `/bitacoras/${bitacora.id}/aprobar`, method: 'PATCH' }));
  const observar = useApiMutation<unknown, string>((texto) => ({ path: `/bitacoras/${bitacora.id}/observar`, method: 'PATCH', json: { observacion: texto } }));

  return <article className="grid gap-2 rounded-control border border-border p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Quincena {bitacora.quincena} · {fecha(bitacora.fechaInicio)} – {fecha(bitacora.fechaFin)}</h3>
      <div className="flex flex-wrap gap-2"><EstadoBadge estado={bitacora.estado} />{bitacora.extemporanea && <EstadoBadge estado="EXTEMPORANEA" />}</div>
    </div>
    <p className="whitespace-pre-line">{bitacora.actividades}</p>
    <p><strong>{bitacora.horas}</strong> horas · enviada el {fecha(bitacora.enviadaEn)}</p>
    {bitacora.observacionTutor && bitacora.estado === 'OBSERVADA' && <p><strong>Observación:</strong> {bitacora.observacionTutor}</p>}
    {puedeRevisar && bitacora.estado === 'ENVIADA' && <>
      <Alerta messages={errorText(aprobar.error)} />
      <div className="flex flex-wrap gap-3">
        <Button loading={aprobar.isPending} onClick={() => aprobar.mutate(undefined, { onSuccess: () => toast.notify({ tone: 'exito', title: 'Bitácora aprobada', description: `${bitacora.horas} horas acreditadas.` }) })}>Aprobar</Button>
        <Modal open={abierto} onOpenChange={setAbierto} title={`Observar quincena ${bitacora.quincena}`} description="El estudiante deberá corregir la bitácora y reenviarla."
          trigger={<Button variant="secundario">Observar…</Button>}>
          <Textarea label="Observación" rows={4} value={observacion} onChange={(e) => setObservacion(e.target.value)} help="Mínimo 10 caracteres" />
          <Alerta messages={errorText(observar.error)} />
          <Button disabled={observacion.trim().length < 10} loading={observar.isPending}
            onClick={() => observar.mutate(observacion.trim(), { onSuccess: () => { setAbierto(false); setObservacion(''); toast.notify({ tone: 'informacion', title: 'Bitácora devuelta con observaciones' }); } })}>Enviar observación</Button>
        </Modal>
      </div>
    </>}
  </article>;
}
