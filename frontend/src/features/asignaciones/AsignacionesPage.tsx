import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorText, useApiMutation, useApiQuery, withQuery, type Paginado } from '../../api/hooks';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Paginador } from '../../components/Paginador';
import { Select } from '../../components/Select';
import { Tabla } from '../../components/Tabla';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../hooks/useToast';
import { hasPermission } from '../../routes/permissions';
import { fecha, filtro, nombre, TODOS } from '../shared/format';
import type { Asignacion, Candidato, DocenteCarga } from '../shared/types';
import { Alerta, EstadoBadge, Seccion } from '../shared/ui';

const ESTADOS = [
  { value: TODOS, label: 'Todos los estados' }, { value: 'ASIGNADA', label: 'Asignada' },
  { value: 'EN_CURSO', label: 'En curso' }, { value: 'FINALIZADA', label: 'Finalizada' }, { value: 'CANCELADA', label: 'Cancelada' },
];

/** Tabla de asignaciones reutilizada por coordinación, tutores y revisiones. */
export function AsignacionesTabla({ caption, rows, loading, error, onRetry, empty }: {
  caption: string; rows: Asignacion[]; loading: boolean; error?: string; onRetry(): void; empty: { title: string; description: string };
}) {
  return <Tabla<Asignacion>
    caption={caption} rows={rows} getRowId={(a) => a.id} loading={loading} error={error} onRetry={onRetry}
    empty={<EmptyState title={empty.title} description={empty.description} />}
    columns={[
      { id: 'estudiante', header: 'Estudiante', render: (a) => <><Link className="font-semibold text-primary underline" to={`/asignaciones/${a.id}`}>{nombre(a.estudiante.usuario)}</Link><p className="text-sm text-muted">{a.estudiante.carnet}</p></> },
      { id: 'plaza', header: 'Plaza', render: (a) => <><p>{a.plaza.titulo}</p><p className="text-sm text-muted">{a.plaza.organizacion.razonSocial}</p></> },
      { id: 'estado', header: 'Estado', render: (a) => <EstadoBadge estado={a.estado} /> },
      { id: 'plan', header: 'Plan de trabajo', render: (a) => a.planTrabajo ? <EstadoBadge estado={a.planTrabajo.estado} /> : 'Sin plan' },
      { id: 'horas', header: 'Horas', render: (a) => <>{`${a.progreso.horasAcumuladas} / ${a.progreso.horasMinimas}`}{a.bitacorasPorRevisar > 0 && <p className="text-sm text-muted">{a.bitacorasPorRevisar} bitácora(s) por revisar</p>}</> },
    ]}
  />;
}

/** S3-L3 (RF-13): candidatos preseleccionados y asignaciones del período. */
export default function AsignacionesPage() {
  const { snapshot } = useSession();
  const puedeAsignar = snapshot.status === 'autenticada' && hasPermission(snapshot.usuario.rol, 'asignaciones:crear');
  const [estado, setEstado] = useState(TODOS);
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => { setQ(texto.trim()); setPagina(1); }, 400);
    return () => clearTimeout(timer);
  }, [texto]);
  const lista = useApiQuery<Paginado<Asignacion>>(withQuery('/asignaciones', { estado: filtro(estado), q, page: pagina, limit: 10 }));

  return <div className="grid gap-6">
    {puedeAsignar && <Candidatos />}
    <Seccion title="Asignaciones">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Estado" value={estado} options={ESTADOS} onValueChange={(value) => { setEstado(value); setPagina(1); }} />
        <Input label="Buscar estudiante" type="search" placeholder="Nombre, apellido o carnet" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      <AsignacionesTabla caption="Asignaciones del período" rows={lista.data?.data ?? []} loading={lista.isPending}
        error={lista.isError ? lista.error.message : undefined} onRetry={() => { void lista.refetch(); }}
        empty={{ title: 'Sin asignaciones', description: 'Aún no hay asignaciones con estos filtros.' }} />
      {lista.data && lista.data.meta.totalPaginas > 1 && <Paginador pagina={pagina} totalPaginas={lista.data.meta.totalPaginas} onPageChange={setPagina} />}
    </Seccion>
  </div>;
}

function Candidatos() {
  const candidatos = useApiQuery<{ candidatos: Candidato[] }>('/asignaciones/candidatos');
  const docentes = useApiQuery<{ docentes: DocenteCarga[] }>('/asignaciones/docentes');
  return <Seccion title="Postulaciones preseleccionadas por asignar">
    <p className="text-muted">Las empresas preseleccionaron a estos estudiantes. Confirma la asignación y designa al tutor académico.</p>
    <Tabla<Candidato>
      caption="Candidatos"
      rows={candidatos.data?.candidatos ?? []}
      getRowId={(c) => c.id}
      loading={candidatos.isPending}
      error={candidatos.isError ? candidatos.error.message : undefined}
      onRetry={() => { void candidatos.refetch(); }}
      empty={<EmptyState title="No hay candidatos pendientes" description="Cuando una empresa preseleccione a un estudiante aparecerá aquí." />}
      columns={[
        { id: 'estudiante', header: 'Estudiante', render: (c) => <><p className="font-semibold">{nombre(c.estudiante.usuario)}</p><p className="text-sm text-muted">{c.estudiante.carnet} · {Number(c.estudiante.porcentajeAvance)}% de avance</p></> },
        { id: 'plaza', header: 'Plaza', render: (c) => <><p>{c.plaza.titulo}</p><p className="text-sm text-muted">{c.plaza.organizacion.razonSocial} · {c.plaza.cuposDisponibles} cupo(s)</p></> },
        { id: 'fecha', header: 'Preseleccionado', render: (c) => fecha(c.creadaEn) },
        { id: 'accion', header: 'Acción', render: (c) => <AsignarCandidato candidato={c} docentes={docentes.data?.docentes ?? []} /> },
      ]}
    />
  </Seccion>;
}

function enDias(dias: number): string {
  const d = new Date(); d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

type NuevaAsignacion = { postulacionId: string; docenteId: string; tutorEmpresarialId: string; fechaInicio: string; fechaFin: string };

function AsignarCandidato({ candidato, docentes }: { candidato: Candidato; docentes: DocenteCarga[] }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [docenteId, setDocenteId] = useState('');
  const [tutorId, setTutorId] = useState(candidato.tutoresEmpresariales.length === 1 ? candidato.tutoresEmpresariales[0].id : '');
  const [inicio, setInicio] = useState(enDias(7));
  const [fin, setFin] = useState(enDias(63));
  const crear = useApiMutation<{ asignacion: Asignacion }, NuevaAsignacion>((json) => ({ path: '/asignaciones', method: 'POST', json }));
  const fechasInvalidas = !inicio || !fin || fin <= inicio;

  function submit(event: FormEvent) {
    event.preventDefault();
    crear.mutate({ postulacionId: candidato.id, docenteId, tutorEmpresarialId: tutorId, fechaInicio: inicio, fechaFin: fin }, {
      onSuccess: () => { setAbierto(false); toast.notify({ tone: 'exito', title: 'Asignación confirmada', description: `${nombre(candidato.estudiante.usuario)} ya puede elaborar su plan de trabajo.` }); },
    });
  }

  return <Modal open={abierto} onOpenChange={setAbierto} title="Confirmar asignación"
    description={`${nombre(candidato.estudiante.usuario)} en "${candidato.plaza.titulo}" (${candidato.plaza.organizacion.razonSocial}).`}
    trigger={<Button>Asignar…</Button>}>
    <form noValidate onSubmit={submit} className="grid gap-4">
      <Select label="Tutor académico" required value={docenteId} onValueChange={setDocenteId}
        options={docentes.map((d) => ({ value: d.id, label: `${nombre(d.usuario)} — ${d.especialidad ?? d.departamento} (${d.cupoDisponible} cupo(s) libres)` }))}
        help="RN-06: cada docente tiene un máximo de tutorados por período." />
      <Select label="Tutor empresarial" required value={tutorId} onValueChange={setTutorId}
        options={candidato.tutoresEmpresariales.map((t) => ({ value: t.id, label: `${nombre(t.usuario)} — ${t.cargo}` }))}
        help={candidato.tutoresEmpresariales.length === 0 ? 'La organización no tiene tutores activos; debe registrar uno antes de asignar.' : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Fecha de inicio" type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <Input label="Fecha de fin" type="date" required value={fin} min={inicio} onChange={(e) => setFin(e.target.value)} error={fin && inicio && fin <= inicio ? 'Debe ser posterior a la fecha de inicio' : undefined} />
      </div>
      <Alerta messages={errorText(crear.error)} />
      <div><Button type="submit" loading={crear.isPending} disabled={!docenteId || !tutorId || fechasInvalidas}>Confirmar asignación</Button></div>
    </form>
  </Modal>;
}
