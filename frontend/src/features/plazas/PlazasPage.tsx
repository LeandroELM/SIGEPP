import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApiQuery, withQuery, type Paginado } from '../../api/hooks';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { Paginador } from '../../components/Paginador';
import { Select } from '../../components/Select';
import { Tabla } from '../../components/Tabla';
import { useSession } from '../../hooks/useSession';
import { hasPermission } from '../../routes/permissions';
import { filtro, MODALIDADES, modalidadLabel, TODOS } from '../shared/format';
import type { FiltrosPlazas, Plaza } from '../shared/types';
import { EstadoBadge, Filtros } from '../shared/ui';

const ORDENES = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'titulo', label: 'Título (A-Z)' },
  { value: 'cupos', label: 'Más cupos' },
];
const ESTADOS_PLAZA = [
  { value: TODOS, label: 'Todos los estados' },
  { value: 'EN_REVISION', label: 'En revisión' },
  { value: 'APROBADA', label: 'Aprobada' },
  { value: 'RECHAZADA', label: 'Rechazada' },
  { value: 'CERRADA', label: 'Cerrada' },
];

/** WF-02 (RF-10): bolsa de plazas. Coordinación también la usa como bandeja de revisión. */
export default function PlazasPage() {
  const { snapshot } = useSession();
  const supervisor = snapshot.status === 'autenticada' && hasPermission(snapshot.usuario.rol, 'plazas:aprobar');
  const [params, setParams] = useSearchParams();
  const get = (key: string, fallback = TODOS) => params.get(key) ?? fallback;
  const pagina = Number(params.get('page') ?? '1') || 1;
  const [texto, setTexto] = useState(params.get('q') ?? '');

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '' || value === TODOS) next.delete(key); else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  }

  // Search text is applied after a short pause instead of on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { if (texto !== (params.get('q') ?? '')) update({ q: texto.trim() }); }, 400);
    return () => clearTimeout(timer);
  });

  const opciones = useApiQuery<FiltrosPlazas>('/plazas/filtros');
  const plazas = useApiQuery<Paginado<Plaza>>(withQuery('/plazas', {
    q: params.get('q'), area: filtro(get('area')), modalidad: filtro(get('modalidad')),
    ubicacion: filtro(get('ubicacion')), organizacionId: filtro(get('organizacionId')),
    estado: supervisor ? filtro(get('estado')) : undefined, orden: get('orden', 'recientes'), page: pagina, limit: 10,
  }));

  const opcionesDe = (values: string[] | undefined, todos: string) =>
    [{ value: TODOS, label: todos }, ...(values ?? []).map((value) => ({ value, label: value }))];

  return <div className="grid gap-6">
    <Filtros>
      <Input label="Buscar" type="search" placeholder="Título, descripción o área" value={texto} onChange={(event) => setTexto(event.target.value)} />
      <Select label="Área" value={get('area')} options={opcionesDe(opciones.data?.areas, 'Todas las áreas')} onValueChange={(area) => update({ area })} />
      <Select label="Modalidad" value={get('modalidad')} options={[{ value: TODOS, label: 'Todas las modalidades' }, ...MODALIDADES]} onValueChange={(modalidad) => update({ modalidad })} />
      <Select label="Ubicación" value={get('ubicacion')} options={opcionesDe(opciones.data?.ubicaciones, 'Todas las ubicaciones')} onValueChange={(ubicacion) => update({ ubicacion })} />
      <Select label="Organización" value={get('organizacionId')} options={[{ value: TODOS, label: 'Todas las organizaciones' }, ...(opciones.data?.organizaciones ?? []).map((o) => ({ value: o.id, label: o.razonSocial }))]} onValueChange={(organizacionId) => update({ organizacionId })} />
      {supervisor && <Select label="Estado" value={get('estado')} options={ESTADOS_PLAZA} onValueChange={(estado) => update({ estado })} />}
      <Select label="Ordenar por" value={get('orden', 'recientes')} options={ORDENES} onValueChange={(orden) => update({ orden: orden === 'recientes' ? undefined : orden })} />
    </Filtros>
    {plazas.data && <p className="text-muted" role="status">{plazas.data.meta.total} plaza(s) encontradas</p>}
    <Tabla<Plaza>
      caption="Plazas"
      rows={plazas.data?.data ?? []}
      getRowId={(plaza) => plaza.id}
      loading={plazas.isPending}
      error={plazas.isError ? plazas.error.message : undefined}
      onRetry={() => { void plazas.refetch(); }}
      empty={<EmptyState title="No hay plazas que coincidan" description="Prueba con otros filtros o un texto de búsqueda distinto." />}
      columns={[
        { id: 'titulo', header: 'Plaza', render: (plaza) => <Link className="font-semibold text-primary underline" to={`/plazas/${plaza.id}`}>{plaza.titulo}</Link> },
        { id: 'organizacion', header: 'Organización', render: (plaza) => plaza.organizacion.razonSocial },
        { id: 'area', header: 'Área y modalidad', render: (plaza) => `${plaza.area} · ${modalidadLabel(plaza.modalidad)} · ${plaza.ubicacion}` },
        { id: 'cupos', header: 'Cupos disponibles', render: (plaza) => `${plaza.cuposDisponibles} de ${plaza.cupos}` },
        ...(supervisor ? [{ id: 'estado', header: 'Estado', render: (plaza: Plaza) => <EstadoBadge estado={plaza.estado} /> }] : []),
      ]}
    />
    {plazas.data && plazas.data.meta.totalPaginas > 1 && <Paginador pagina={pagina} totalPaginas={plazas.data.meta.totalPaginas} onPageChange={(page) => update({ page: String(page) })} />}
  </div>;
}
