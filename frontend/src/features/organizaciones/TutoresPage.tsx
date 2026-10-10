import { useState, type FormEvent } from 'react';
import { errorText, useApiMutation, useApiQuery } from '../../api/hooks';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Tabla } from '../../components/Tabla';
import { useToast } from '../../hooks/useToast';
import { fecha, nombre } from '../shared/format';
import type { Organizacion, TutorEmpresarial } from '../shared/types';
import { Alerta, Datos, EstadoBadge, QueryView, Seccion } from '../shared/ui';

type NuevoTutor = { nombres: string; apellidos: string; correo: string; contrasena: string; telefono: string; cargo: string };
const vacio: NuevoTutor = { nombres: '', apellidos: '', correo: '', contrasena: '', telefono: '', cargo: '' };

/** RF-07: la organización da de alta y de baja a sus tutores empresariales. */
export default function TutoresPage() {
  const org = useApiQuery<{ organizacion: Organizacion }>('/organizaciones/mia');
  return <QueryView query={org} loading="Cargando organización…">{({ organizacion }) => <div className="grid gap-6">
    <Seccion title="Mi organización" actions={<EstadoBadge estado={organizacion.estadoVerificacion} />}>
      <Datos values={[
        ['Razón social', organizacion.razonSocial], ['RUC', organizacion.ruc], ['Sector', organizacion.sector],
        ['Convenio vigente hasta', fecha(organizacion.convenioVigenteHasta)], ['Representante', nombre(organizacion.representante)],
      ]} />
    </Seccion>
    <Seccion title="Tutores empresariales" actions={<AltaTutor orgId={organizacion.id} />}>
      <Tabla<TutorEmpresarial>
        caption="Tutores empresariales"
        rows={organizacion.tutoresEmpresariales ?? []}
        getRowId={(tutor) => tutor.id}
        empty={<EmptyState title="Sin tutores" description="Da de alta a los tutores que supervisarán a los practicantes." />}
        columns={[
          { id: 'nombre', header: 'Nombre', render: (t) => <><p className="font-semibold">{nombre(t.usuario)}</p><p className="text-sm text-muted">{t.usuario.correo}</p></> },
          { id: 'cargo', header: 'Cargo', render: (t) => t.cargo },
          { id: 'estado', header: 'Estado', render: (t) => <EstadoBadge estado={t.activo ? 'ACTIVO_TUTOR' : 'INACTIVO_TUTOR'} /> },
          { id: 'acciones', header: 'Acciones', render: (t) => <CambiarEstado orgId={organizacion.id} tutor={t} /> },
        ]}
      />
    </Seccion>
  </div>}</QueryView>;
}

function CambiarEstado({ orgId, tutor }: { orgId: string; tutor: TutorEmpresarial }) {
  const toast = useToast();
  const cambiar = useApiMutation<unknown, boolean>((activo) => ({ path: `/organizaciones/${orgId}/tutores/${tutor.id}`, method: 'PATCH', json: { activo } }));
  return <div className="grid gap-2">
    <Button variant={tutor.activo ? 'peligro' : 'secundario'} loading={cambiar.isPending}
      onClick={() => cambiar.mutate(!tutor.activo, { onSuccess: () => toast.notify({ tone: 'informacion', title: tutor.activo ? 'Tutor dado de baja' : 'Tutor reactivado' }) })}>
      {tutor.activo ? 'Dar de baja' : 'Reactivar'}
    </Button>
    <Alerta messages={errorText(cambiar.error)} />
  </div>;
}

function AltaTutor({ orgId }: { orgId: string }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<NuevoTutor>(vacio);
  const crear = useApiMutation<unknown, NuevoTutor>((input) => ({
    path: `/organizaciones/${orgId}/tutores`, method: 'POST',
    json: { ...input, telefono: input.telefono.trim() || undefined },
  }));
  const set = (campo: keyof NuevoTutor) => (e: { target: { value: string } }) => setDatos((d) => ({ ...d, [campo]: e.target.value }));
  function submit(event: FormEvent) {
    event.preventDefault();
    crear.mutate(datos, { onSuccess: () => { setAbierto(false); setDatos(vacio); crear.reset(); toast.notify({ tone: 'exito', title: 'Tutor registrado' }); } });
  }
  return <Modal open={abierto} onOpenChange={setAbierto} title="Alta de tutor empresarial" description="El tutor podrá iniciar sesión con este correo y contraseña."
    trigger={<Button>Agregar tutor</Button>}>
    <form noValidate onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombres" required value={datos.nombres} onChange={set('nombres')} />
        <Input label="Apellidos" required value={datos.apellidos} onChange={set('apellidos')} />
      </div>
      <Input label="Correo" type="email" required value={datos.correo} onChange={set('correo')} />
      <Input label="Contraseña inicial" type="password" autoComplete="new-password" required value={datos.contrasena} onChange={set('contrasena')} help="Mínimo 8 caracteres, con al menos una letra y un número." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Cargo" required value={datos.cargo} onChange={set('cargo')} />
        <Input label="Teléfono (opcional)" type="tel" value={datos.telefono} onChange={set('telefono')} />
      </div>
      <Alerta messages={errorText(crear.error)} />
      <div><Button type="submit" loading={crear.isPending}>Registrar tutor</Button></div>
    </form>
  </Modal>;
}
