import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { errorText, useApiMutation, useApiQuery } from '../../api/hooks';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Textarea } from '../../components/Textarea';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../hooks/useToast';
import { hasPermission } from '../../routes/permissions';
import { fecha, modalidadLabel, nombre } from '../shared/format';
import type { Plaza, PlazaInput } from '../shared/types';
import { Alerta, Datos, EnlaceBoton, EstadoBadge, QueryView, Seccion } from '../shared/ui';
import { PostularSeccion } from '../postulaciones/PostularSeccion';
import { PlazaForm } from './PlazaForm';

/** WF-03 (RF-09/RF-11): detalle de plaza, ficha de la organización y acciones por rol. */
export default function PlazaDetallePage() {
  const { id = '' } = useParams();
  const plaza = useApiQuery<{ plaza: Plaza }>(`/plazas/${encodeURIComponent(id)}`);
  return <QueryView query={plaza} loading="Cargando plaza…">{({ plaza }) => <PlazaDetalle plaza={plaza} />}</QueryView>;
}

function PlazaDetalle({ plaza }: { plaza: Plaza }) {
  const { snapshot } = useSession();
  const rol = snapshot.status === 'autenticada' ? snapshot.usuario.rol : null;
  const propia = rol === 'ORGANIZACION';
  const supervisor = !!rol && hasPermission(rol, 'plazas:aprobar');
  const editable = propia && (plaza.estado === 'EN_REVISION' || plaza.estado === 'RECHAZADA');
  const [editando, setEditando] = useState(false);

  return <div className="grid gap-6">
    <Seccion title={plaza.titulo} actions={<EstadoBadge estado={plaza.estado} />}>
      {plaza.estado === 'RECHAZADA' && plaza.motivoRechazo && <div className="rounded-control border border-error p-3">
        <p className="font-semibold">Motivo del rechazo</p><p>{plaza.motivoRechazo}</p>
      </div>}
      <p className="whitespace-pre-line">{plaza.descripcion}</p>
      <Datos values={[
        ['Área', plaza.area], ['Modalidad', modalidadLabel(plaza.modalidad)], ['Ubicación', plaza.ubicacion],
        ['Horario', plaza.horario], ['Cupos disponibles', `${plaza.cuposDisponibles} de ${plaza.cupos}`],
        ['Período', plaza.periodo.nombre], ['Publicada', fecha(plaza.publicadaEn)],
        ...(propia || supervisor ? [['Postulaciones recibidas', plaza.totalPostulaciones] as const, ['Aprobada por', plaza.aprobadaPor ? nombre(plaza.aprobadaPor) : null] as const] : []),
      ]} />
      <div>
        <p className="text-sm text-muted">Competencias requeridas</p>
        <ul className="mt-2 flex flex-wrap gap-2">{plaza.competencias.map((c) => <li key={c} className="rounded-control border border-border px-2 py-1 text-sm">{c}</li>)}</ul>
      </div>
      {editable && !editando && <div><Button variant="secundario" onClick={() => setEditando(true)}>Corregir plaza</Button></div>}
    </Seccion>

    {editable && editando && <EditarPlaza plaza={plaza} onDone={() => setEditando(false)} />}
    {supervisor && plaza.estado === 'EN_REVISION' && <RevisionPlaza plaza={plaza} />}

    <Seccion title="Organización">
      <Datos values={[
        ['Razón social', plaza.organizacion.razonSocial], ['Sector', plaza.organizacion.sector],
        ['Dirección', plaza.organizacion.direccion],
        ['Sitio web', plaza.organizacion.sitioWeb && <a className="text-primary underline" href={plaza.organizacion.sitioWeb} target="_blank" rel="noreferrer">{plaza.organizacion.sitioWeb}</a>],
      ]} />
    </Seccion>

    {rol === 'ESTUDIANTE' && <PostularSeccion plaza={plaza} />}

    <div><EnlaceBoton to={propia ? '/org/plazas' : '/plazas'}>Volver al listado</EnlaceBoton></div>
  </div>;
}

function EditarPlaza({ plaza, onDone }: { plaza: Plaza; onDone(): void }) {
  const toast = useToast();
  const actualizar = useApiMutation<{ plaza: Plaza }, PlazaInput>((json) => ({ path: `/plazas/${plaza.id}`, method: 'PUT', json }));
  const inicial: PlazaInput = {
    titulo: plaza.titulo, descripcion: plaza.descripcion, area: plaza.area, modalidad: plaza.modalidad,
    ubicacion: plaza.ubicacion, cupos: plaza.cupos, horario: plaza.horario, competencias: plaza.competencias,
  };
  return <Seccion title="Corregir plaza" actions={<Button variant="fantasma" onClick={onDone}>Cancelar</Button>}>
    <p className="text-muted">Al guardar, la plaza vuelve a quedar en revisión.</p>
    <PlazaForm inicial={inicial} submitLabel="Guardar y reenviar a revisión" pending={actualizar.isPending} serverErrors={errorText(actualizar.error)}
      onSubmit={(values) => actualizar.mutate(values, { onSuccess: () => { toast.notify({ tone: 'exito', title: 'Plaza actualizada y enviada a revisión' }); onDone(); } })} />
  </Seccion>;
}

/** WF-06 (RF-09): revisión académica de la plaza por la coordinación. */
function RevisionPlaza({ plaza }: { plaza: Plaza }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const aprobar = useApiMutation<{ plaza: Plaza }, void>(() => ({ path: `/plazas/${plaza.id}/aprobar`, method: 'PATCH' }));
  const rechazar = useApiMutation<{ plaza: Plaza }, string>((m) => ({ path: `/plazas/${plaza.id}/rechazar`, method: 'PATCH', json: { motivo: m } }));
  const motivoCorto = motivo.trim().length < 10;
  return <Seccion title="Revisión académica">
    <p>Verifica que las actividades correspondan al perfil de Ingeniería en Sistemas antes de publicarla.</p>
    <Alerta messages={errorText(aprobar.error)} />
    <div className="flex flex-wrap gap-3">
      <Button loading={aprobar.isPending} onClick={() => aprobar.mutate(undefined, { onSuccess: () => toast.notify({ tone: 'exito', title: 'Plaza aprobada y publicada' }) })}>Aprobar plaza</Button>
      <Modal open={abierto} onOpenChange={setAbierto} title="Rechazar plaza" description="La organización verá el motivo y podrá corregir la plaza."
        trigger={<Button variant="peligro">Rechazar…</Button>}>
        <Textarea label="Motivo del rechazo" value={motivo} onChange={(e) => setMotivo(e.target.value)} help="Mínimo 10 caracteres" />
        <Alerta messages={errorText(rechazar.error)} />
        <Button variant="peligro" disabled={motivoCorto} loading={rechazar.isPending}
          onClick={() => rechazar.mutate(motivo.trim(), { onSuccess: () => { setAbierto(false); toast.notify({ tone: 'informacion', title: 'Plaza rechazada' }); } })}>Confirmar rechazo</Button>
      </Modal>
    </div>
  </Seccion>;
}
