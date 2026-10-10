import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorText, useApiMutation, useApiQuery, withQuery, type Paginado } from '../../api/hooks';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Paginador } from '../../components/Paginador';
import { Select } from '../../components/Select';
import { Tabla } from '../../components/Tabla';
import { useToast } from '../../hooks/useToast';
import { fecha, filtro, TODOS } from '../shared/format';
import type { Postulacion } from '../shared/types';
import { Alerta, EnlaceBoton, EstadoBadge } from '../shared/ui';

const ESTADOS = [
  { value: TODOS, label: 'Todos los estados' }, { value: 'POSTULADA', label: 'Postulada' },
  { value: 'PRESELECCIONADA', label: 'Preseleccionada' }, { value: 'ASIGNADA', label: 'Asignada' },
  { value: 'RECHAZADA', label: 'Rechazada' }, { value: 'RETIRADA', label: 'Retirada' },
];

/** S2-H5 (RF-11): postulaciones del estudiante con su estado y la opción de retirarlas. */
export default function PostulacionesPage() {
  const [estado, setEstado] = useState(TODOS);
  const [pagina, setPagina] = useState(1);
  const lista = useApiQuery<Paginado<Postulacion>>(withQuery('/postulaciones/mias', { estado: filtro(estado), page: pagina, limit: 10 }));
  const pendientes = (lista.data?.data ?? []).filter((p) => p.estado === 'POSTULADA' || p.estado === 'PRESELECCIONADA').length;

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="w-full sm:w-[16rem]"><Select label="Estado" value={estado} options={ESTADOS} onValueChange={(value) => { setEstado(value); setPagina(1); }} /></div>
      <EnlaceBoton to="/plazas" variant="primario">Buscar plazas</EnlaceBoton>
    </div>
    {estado === TODOS && lista.data && <p className="text-muted" role="status">Tienes {pendientes} de 3 postulaciones pendientes permitidas (RN-03).</p>}
    <Tabla<Postulacion>
      caption="Mis postulaciones"
      rows={lista.data?.data ?? []}
      getRowId={(p) => p.id}
      loading={lista.isPending}
      error={lista.isError ? lista.error.message : undefined}
      onRetry={() => { void lista.refetch(); }}
      empty={<EmptyState title="Aún no te has postulado" description="Explora la bolsa de plazas y postúlate a las que se ajusten a tu perfil." />}
      columns={[
        { id: 'plaza', header: 'Plaza', render: (p) => <><Link className="font-semibold text-primary underline" to={`/plazas/${p.plaza.id}`}>{p.plaza.titulo}</Link><p className="text-sm text-muted">{p.plaza.organizacion.razonSocial}</p></> },
        { id: 'estado', header: 'Estado', render: (p) => <EstadoBadge estado={p.estado} /> },
        { id: 'fecha', header: 'Fecha', render: (p) => fecha(p.creadaEn) },
        { id: 'accion', header: 'Acción', render: (p) => <AccionPostulacion postulacion={p} /> },
      ]}
    />
    {lista.data && lista.data.meta.totalPaginas > 1 && <Paginador pagina={pagina} totalPaginas={lista.data.meta.totalPaginas} onPageChange={setPagina} />}
  </div>;
}

function AccionPostulacion({ postulacion }: { postulacion: Postulacion }) {
  const toast = useToast();
  const retirar = useApiMutation<unknown, void>(() => ({ path: `/postulaciones/${postulacion.id}/retirar`, method: 'PATCH' }));
  if (postulacion.estado === 'ASIGNADA') return <Link className="text-primary underline" to="/expediente">Ver expediente</Link>;
  if (postulacion.estado !== 'POSTULADA' && postulacion.estado !== 'PRESELECCIONADA') return <span className="text-muted">—</span>;
  return <div className="grid gap-2">
    <Button variant="secundario" loading={retirar.isPending}
      onClick={() => retirar.mutate(undefined, { onSuccess: () => toast.notify({ tone: 'informacion', title: 'Postulación retirada' }) })}>Retirar</Button>
    <Alerta messages={errorText(retirar.error)} />
  </div>;
}
