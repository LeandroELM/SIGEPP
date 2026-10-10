import { useState } from 'react';
import { useApiQuery, withQuery, type Paginado } from '../../api/hooks';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { Paginador } from '../../components/Paginador';
import { Select } from '../../components/Select';
import { Tabla } from '../../components/Tabla';
import { fechaHora, filtro, nombre, TODOS } from '../shared/format';
import type { RegistroAuditoria } from '../shared/types';
import { Filtros } from '../shared/ui';

const ENTIDADES = ['Plaza', 'Organizacion', 'TutorEmpresarial', 'Asignacion', 'PlanTrabajo', 'Usuario'];

function Valores({ valor }: { valor: unknown }) {
  if (valor === null || valor === undefined) return <span className="text-muted">—</span>;
  return <pre className="max-h-[12rem] overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(valor, null, 2)}</pre>;
}

/** RNF-13: bitácora de auditoría de escrituras críticas (solo administración). */
export default function AuditoriaPage() {
  const [entidad, setEntidad] = useState(TODOS);
  const [accion, setAccion] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const registros = useApiQuery<Paginado<RegistroAuditoria>>(withQuery('/auditoria', {
    entidad: filtro(entidad), accion: accion.trim().toUpperCase(), desde, hasta, page: pagina, limit: 20,
  }));
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPagina(1); };

  return <div className="grid gap-6">
    <Filtros>
      <Select label="Entidad" value={entidad} options={[{ value: TODOS, label: 'Todas' }, ...ENTIDADES.map((e) => ({ value: e, label: e }))]} onValueChange={reset(setEntidad)} />
      <Input label="Acción" placeholder="Ej.: APROBAR" value={accion} onChange={(e) => reset(setAccion)(e.target.value)} />
      <Input label="Desde" type="date" value={desde} onChange={(e) => reset(setDesde)(e.target.value)} />
      <Input label="Hasta" type="date" value={hasta} onChange={(e) => reset(setHasta)(e.target.value)} />
    </Filtros>
    <Tabla<RegistroAuditoria>
      caption="Registros de auditoría"
      rows={registros.data?.data ?? []}
      getRowId={(r) => r.id}
      loading={registros.isPending}
      error={registros.isError ? registros.error.message : undefined}
      onRetry={() => { void registros.refetch(); }}
      empty={<EmptyState title="Sin registros" description="No hay operaciones auditadas con estos filtros." />}
      columns={[
        { id: 'fecha', header: 'Fecha', render: (r) => fechaHora(r.creadaEn) },
        { id: 'usuario', header: 'Usuario', render: (r) => r.usuario ? <><p>{nombre(r.usuario)}</p><p className="text-sm text-muted">{r.usuario.rol}</p></> : 'Sistema' },
        { id: 'operacion', header: 'Operación', render: (r) => <><p className="font-semibold">{r.accion}</p><p className="text-sm text-muted break-all">{r.entidad} · {r.entidadId}</p></> },
        { id: 'antes', header: 'Valores anteriores', render: (r) => <Valores valor={r.valoresAnteriores} /> },
        { id: 'despues', header: 'Valores nuevos', render: (r) => <Valores valor={r.valoresNuevos} /> },
      ]}
    />
    {registros.data && registros.data.meta.totalPaginas > 1 && <Paginador pagina={pagina} totalPaginas={registros.data.meta.totalPaginas} onPageChange={setPagina} />}
  </div>;
}
