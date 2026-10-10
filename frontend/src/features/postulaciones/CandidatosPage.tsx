import { useState } from 'react';
import { errorText, useApiMutation, useApiQuery, withQuery, type Paginado } from '../../api/hooks';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { Paginador } from '../../components/Paginador';
import { Select } from '../../components/Select';
import { Tabla } from '../../components/Tabla';
import { Textarea } from '../../components/Textarea';
import { useToast } from '../../hooks/useToast';
import { fecha, filtro, nombre, TODOS } from '../shared/format';
import type { CandidatoPostulacion } from '../shared/types';
import { Alerta, Datos, EstadoBadge } from '../shared/ui';

const ESTADOS = [
  { value: TODOS, label: 'Todos (excepto retiradas)' }, { value: 'POSTULADA', label: 'Nuevas' },
  { value: 'PRESELECCIONADA', label: 'Preseleccionadas' }, { value: 'ASIGNADA', label: 'Asignadas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
];

/** S2-H5 (RF-12): candidatos de las plazas de la organización del tutor empresarial. */
export default function CandidatosPage() {
  const [estado, setEstado] = useState('POSTULADA');
  const [pagina, setPagina] = useState(1);
  const lista = useApiQuery<Paginado<CandidatoPostulacion>>(withQuery('/postulaciones/candidatos', { estado: filtro(estado), page: pagina, limit: 10 }));

  return <div className="grid gap-6">
    <div className="w-full sm:w-[18rem]"><Select label="Mostrar" value={estado} options={ESTADOS} onValueChange={(value) => { setEstado(value); setPagina(1); }} /></div>
    <Tabla<CandidatoPostulacion>
      caption="Candidatos"
      rows={lista.data?.data ?? []}
      getRowId={(c) => c.id}
      loading={lista.isPending}
      error={lista.isError ? lista.error.message : undefined}
      onRetry={() => { void lista.refetch(); }}
      empty={<EmptyState title="No hay candidatos" description="Cuando un estudiante se postule a las plazas de tu organización aparecerá aquí." />}
      columns={[
        { id: 'estudiante', header: 'Estudiante', render: (c) => <><p className="font-semibold">{nombre(c.estudiante.usuario)}</p><p className="text-sm text-muted">{c.estudiante.carnet} · {Number(c.estudiante.porcentajeAvance)}% de avance</p></> },
        { id: 'plaza', header: 'Plaza', render: (c) => c.plaza.titulo },
        { id: 'estado', header: 'Estado', render: (c) => <EstadoBadge estado={c.estado} /> },
        { id: 'fecha', header: 'Postulación', render: (c) => fecha(c.creadaEn) },
        { id: 'accion', header: 'Acción', render: (c) => <RevisarCandidato candidato={c} /> },
      ]}
    />
    {lista.data && lista.data.meta.totalPaginas > 1 && <Paginador pagina={pagina} totalPaginas={lista.data.meta.totalPaginas} onPageChange={setPagina} />}
  </div>;
}

function RevisarCandidato({ candidato }: { candidato: CandidatoPostulacion }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [comentario, setComentario] = useState('');
  const preseleccionar = useApiMutation<unknown, void>(() => ({ path: `/postulaciones/${candidato.id}/preseleccionar`, method: 'PATCH' }));
  const rechazar = useApiMutation<unknown, string>((texto) => ({ path: `/postulaciones/${candidato.id}/rechazar`, method: 'PATCH', json: texto ? { comentario: texto } : {} }));
  const pendiente = candidato.estado === 'POSTULADA' || candidato.estado === 'PRESELECCIONADA';
  const cerrar = (title: string, tone: 'exito' | 'informacion') => { setAbierto(false); toast.notify({ tone, title }); };

  return <Modal open={abierto} onOpenChange={setAbierto} title={nombre(candidato.estudiante.usuario)} description={`Postulación a "${candidato.plaza.titulo}"`}
    trigger={<Button variant={candidato.estado === 'POSTULADA' ? 'primario' : 'secundario'}>{candidato.estado === 'POSTULADA' ? 'Revisar' : 'Ver'}</Button>}>
    <Datos values={[
      ['Carnet', candidato.estudiante.carnet], ['Carrera', `${candidato.estudiante.carrera} (${candidato.estudiante.anio}.º año)`],
      ['Avance del plan de estudios', `${Number(candidato.estudiante.porcentajeAvance)}%`], ['Correo', candidato.estudiante.usuario.correo],
      ['Teléfono', candidato.estudiante.usuario.telefono], ['Estado', <EstadoBadge key="e" estado={candidato.estado} />],
    ]} />
    <div><p className="text-sm text-muted">Carta de motivación</p><p className="mt-1 whitespace-pre-line">{candidato.cartaMotivacion}</p></div>
    {pendiente && <>
      <Alerta messages={[...errorText(preseleccionar.error), ...errorText(rechazar.error)]} />
      {candidato.estado === 'POSTULADA' && <div><Button loading={preseleccionar.isPending}
        onClick={() => preseleccionar.mutate(undefined, { onSuccess: () => cerrar('Candidato preseleccionado', 'exito') })}>Preseleccionar</Button></div>}
      <Textarea label="Comentario para el estudiante (opcional)" rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} />
      <div><Button variant="peligro" loading={rechazar.isPending}
        onClick={() => rechazar.mutate(comentario.trim(), { onSuccess: () => cerrar('Candidato rechazado', 'informacion') })}>Rechazar</Button></div>
    </>}
  </Modal>;
}
