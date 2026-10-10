import { useEffect, useState } from 'react';
import { errorText, useApiMutation, useApiQuery, withQuery, type Paginado } from '../../api/hooks';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Paginador } from '../../components/Paginador';
import { Select } from '../../components/Select';
import { Tabla } from '../../components/Tabla';
import { useToast } from '../../hooks/useToast';
import { fecha, filtro, nombre, TODOS } from '../shared/format';
import type { Organizacion } from '../shared/types';
import { Alerta, Datos, EstadoBadge } from '../shared/ui';

const ESTADOS = [
  { value: TODOS, label: 'Todos los estados' }, { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'VERIFICADA', label: 'Verificada' }, { value: 'RECHAZADA', label: 'Rechazada' },
];

/** WF-06 (RF-06): bandeja de organizaciones y verificación del convenio (RN-12). */
export default function OrganizacionesPage() {
  const [estado, setEstado] = useState('PENDIENTE');
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => { setQ(texto.trim()); setPagina(1); }, 400);
    return () => clearTimeout(timer);
  }, [texto]);
  const lista = useApiQuery<Paginado<Organizacion>>(withQuery('/organizaciones', { estado: filtro(estado), q, page: pagina, limit: 10 }));

  return <div className="grid gap-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <Select label="Estado de verificación" value={estado} options={ESTADOS} onValueChange={(value) => { setEstado(value); setPagina(1); }} />
      <Input label="Buscar" type="search" placeholder="Razón social o RUC" value={texto} onChange={(e) => setTexto(e.target.value)} />
    </div>
    <Tabla<Organizacion>
      caption="Organizaciones"
      rows={lista.data?.data ?? []}
      getRowId={(org) => org.id}
      loading={lista.isPending}
      error={lista.isError ? lista.error.message : undefined}
      onRetry={() => { void lista.refetch(); }}
      empty={<EmptyState title="No hay organizaciones" description="No hay organizaciones con los filtros seleccionados." />}
      columns={[
        { id: 'razon', header: 'Organización', render: (org) => <><p className="font-semibold">{org.razonSocial}</p><p className="text-sm text-muted">RUC {org.ruc} · {org.sector}</p></> },
        { id: 'estado', header: 'Estado', render: (org) => <EstadoBadge estado={org.estadoVerificacion} /> },
        { id: 'convenio', header: 'Convenio vigente hasta', render: (org) => fecha(org.convenioVigenteHasta) },
        { id: 'acciones', header: 'Acciones', render: (org) => <VerificarOrganizacion org={org} /> },
      ]}
    />
    {lista.data && lista.data.meta.totalPaginas > 1 && <Paginador pagina={pagina} totalPaginas={lista.data.meta.totalPaginas} onPageChange={setPagina} />}
  </div>;
}

function manana(): string {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function VerificarOrganizacion({ org }: { org: Organizacion }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [vigencia, setVigencia] = useState(org.convenioVigenteHasta?.slice(0, 10) ?? manana());
  const verificar = useApiMutation<unknown, { estado: 'VERIFICADA' | 'RECHAZADA'; convenioVigenteHasta?: string }>(
    (json) => ({ path: `/organizaciones/${org.id}/verificar`, method: 'PATCH', json }),
  );
  const decidir = (estado: 'VERIFICADA' | 'RECHAZADA') => verificar.mutate(
    estado === 'VERIFICADA' ? { estado, convenioVigenteHasta: vigencia } : { estado },
    { onSuccess: () => { setAbierto(false); toast.notify({ tone: estado === 'VERIFICADA' ? 'exito' : 'informacion', title: estado === 'VERIFICADA' ? 'Organización verificada' : 'Organización rechazada' }); } },
  );
  return <Modal open={abierto} onOpenChange={setAbierto} title={org.razonSocial} description="Revisa los datos y registra la vigencia del convenio."
    trigger={<Button variant="secundario">{org.estadoVerificacion === 'PENDIENTE' ? 'Revisar' : 'Ver / actualizar'}</Button>}>
    <Datos values={[
      ['RUC', org.ruc], ['Sector', org.sector], ['Dirección', org.direccion], ['Sitio web', org.sitioWeb],
      ['Representante', nombre(org.representante)], ['Correo', org.representante.correo],
      ['Plazas', org._count.plazas], ['Tutores', org._count.tutoresEmpresariales], ['Registrada', fecha(org.creadaEn)],
    ]} />
    <Input label="Convenio vigente hasta" type="date" value={vigencia} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setVigencia(e.target.value)} help="Obligatorio para verificar; debe ser posterior a hoy." />
    <Alerta messages={errorText(verificar.error)} />
    <div className="flex flex-wrap gap-3">
      <Button loading={verificar.isPending} disabled={!vigencia} onClick={() => decidir('VERIFICADA')}>Verificar</Button>
      {org.estadoVerificacion !== 'RECHAZADA' && <Button variant="peligro" disabled={verificar.isPending} onClick={() => decidir('RECHAZADA')}>Rechazar</Button>}
    </div>
  </Modal>;
}
