import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery, withQuery, type Paginado } from '../../api/hooks';
import { EmptyState } from '../../components/EmptyState';
import { Paginador } from '../../components/Paginador';
import { Select } from '../../components/Select';
import { Tabla } from '../../components/Tabla';
import { fecha, filtro, TODOS } from '../shared/format';
import type { Organizacion, Plaza } from '../shared/types';
import { EnlaceBoton, EstadoBadge } from '../shared/ui';

const ESTADOS = [
  { value: TODOS, label: 'Todos los estados' }, { value: 'EN_REVISION', label: 'En revisión' },
  { value: 'APROBADA', label: 'Aprobada' }, { value: 'RECHAZADA', label: 'Rechazada' }, { value: 'CERRADA', label: 'Cerrada' },
];

/** WF-07 (RF-08): plazas de la organización en todos sus estados. */
export default function MisPlazasPage() {
  const [estado, setEstado] = useState(TODOS);
  const [pagina, setPagina] = useState(1);
  const org = useApiQuery<{ organizacion: Organizacion }>('/organizaciones/mia');
  const plazas = useApiQuery<Paginado<Plaza>>(withQuery('/plazas/mias', { estado: filtro(estado), page: pagina, limit: 10 }));
  const organizacion = org.data?.organizacion;
  const puedePublicar = organizacion?.estadoVerificacion === 'VERIFICADA'
    && !!organizacion.convenioVigenteHasta && new Date(organizacion.convenioVigenteHasta) > new Date();

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="w-full sm:w-[16rem]"><Select label="Estado" value={estado} options={ESTADOS} onValueChange={(value) => { setEstado(value); setPagina(1); }} /></div>
      {puedePublicar && <EnlaceBoton to="/org/plazas/nueva" variant="primario">Publicar plaza</EnlaceBoton>}
    </div>
    {organizacion && !puedePublicar && <p role="status" className="rounded-control border border-warning p-3">
      Tu organización no puede publicar plazas: requiere estar verificada y con convenio vigente (RN-12). Estado actual: <EstadoBadge estado={organizacion.estadoVerificacion} />
    </p>}
    <Tabla<Plaza>
      caption="Mis plazas"
      rows={plazas.data?.data ?? []}
      getRowId={(plaza) => plaza.id}
      loading={plazas.isPending}
      error={plazas.isError ? plazas.error.message : undefined}
      onRetry={() => { void plazas.refetch(); }}
      empty={<EmptyState title="Aún no hay plazas" description="Publica una plaza para que la coordinación la revise." />}
      columns={[
        { id: 'titulo', header: 'Plaza', render: (plaza) => <Link className="font-semibold text-primary underline" to={`/org/plazas/${plaza.id}`}>{plaza.titulo}</Link> },
        { id: 'estado', header: 'Estado', render: (plaza) => <EstadoBadge estado={plaza.estado} /> },
        { id: 'cupos', header: 'Cupos ocupados', render: (plaza) => `${plaza.cuposOcupados} de ${plaza.cupos}` },
        { id: 'postulaciones', header: 'Postulaciones', render: (plaza) => plaza.totalPostulaciones },
        { id: 'creada', header: 'Creada', render: (plaza) => fecha(plaza.creadaEn) },
      ]}
    />
    {plazas.data && plazas.data.meta.totalPaginas > 1 && <Paginador pagina={pagina} totalPaginas={plazas.data.meta.totalPaginas} onPageChange={setPagina} />}
  </div>;
}
