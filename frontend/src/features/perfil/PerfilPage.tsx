import { useState, type FormEvent, type ReactNode } from 'react';
import { errorText } from '../../api/hooks';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Input } from '../../components/Input';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../hooks/useToast';
import { ROL_ETIQUETAS, type Usuario } from '../auth/contracts';
import { fecha } from '../shared/format';
import { Alerta, Datos, EstadoBadge, Seccion } from '../shared/ui';
import { useActualizarPerfil, useCambiarContrasena, usePerfil, type ActualizarPerfilInput } from './usePerfil';

const valor = (value: ReactNode) => value === null || value === undefined || value === '' ? 'No disponible' : value;

export default function PerfilPage() {
  const { snapshot } = useSession(); const perfil = usePerfil();
  if (snapshot.status !== 'autenticada') return null;
  if (perfil.isPending) return <LoadingState label="Cargando perfil…" />;
  if (perfil.isError) return perfil.error.kind === 'stale-session' ? null : <ErrorState message={perfil.error.message} onRetry={() => { void perfil.refetch(); }} />;
  const usuario = perfil.data;
  return <div className="grid gap-6">
    <Seccion title="Datos personales" actions={<EditarPerfil usuario={usuario} />}>
      <Datos values={[
        ['Nombres', valor(usuario.nombres)], ['Apellidos', valor(usuario.apellidos)], ['Correo', valor(usuario.correo)],
        ['Rol', ROL_ETIQUETAS[usuario.rol]], ['Estado', <EstadoBadge key="estado" estado={usuario.estado} />],
        ['Teléfono', valor(usuario.telefono)], ['Fecha de registro', fecha(usuario.creadoEn)],
      ]} />
    </Seccion>
    <PerfilDelRol usuario={usuario} />
    <Seccion title="Seguridad" actions={<CambiarContrasena />}>
      <p className="text-muted">Al cambiar tu contraseña se cierran tus sesiones en otros dispositivos.</p>
    </Seccion>
  </div>;
}

/** Only the profile that matches the account's role; the others never apply to it. */
function PerfilDelRol({ usuario }: { usuario: Usuario }) {
  const { estudiante, docente, tutorEmpresarial, organizacion } = usuario;
  if (usuario.rol === 'ESTUDIANTE') return <Seccion title="Perfil de estudiante">
    <Datos values={[
      ['Carnet', valor(estudiante?.carnet)], ['Carrera', valor(estudiante?.carrera)], ['Año', valor(estudiante?.anio)],
      ['Porcentaje de avance', valor(estudiante && `${estudiante.porcentajeAvance}%`)],
      ['Avance verificado', valor(estudiante && (estudiante.avanceVerificado ? 'Sí' : 'No'))],
    ]} />
    <p className="text-sm text-muted">El carnet y el avance académico los verifica la coordinación y no se editan desde aquí.</p>
  </Seccion>;
  if (usuario.rol === 'TUTOR_ACADEMICO') return <Seccion title="Perfil de tutor académico">
    <Datos values={[['Departamento', valor(docente?.departamento)], ['Especialidad', valor(docente?.especialidad)]]} />
  </Seccion>;
  if (usuario.rol === 'TUTOR_EMPRESARIAL') return <Seccion title="Perfil de tutor empresarial">
    <Datos values={[['Cargo', valor(tutorEmpresarial?.cargo)], ['Organización vinculada', valor(tutorEmpresarial?.organizacionId)]]} />
  </Seccion>;
  if (usuario.rol === 'ORGANIZACION') return <Seccion title="Perfil de organización">
    <Datos values={[
      ['Razón social', valor(organizacion?.razonSocial)],
      ['Estado de verificación', organizacion ? <EstadoBadge key="verificacion" estado={organizacion.estadoVerificacion} /> : valor(null)],
    ]} />
  </Seccion>;
  return null;
}

type Formulario = { nombres: string; apellidos: string; telefono: string; carrera: string; anio: string; departamento: string; especialidad: string; cargo: string };

function formularioDe(usuario: Usuario): Formulario {
  return {
    nombres: usuario.nombres, apellidos: usuario.apellidos, telefono: usuario.telefono ?? '',
    carrera: usuario.estudiante?.carrera ?? '', anio: usuario.estudiante ? String(usuario.estudiante.anio) : '',
    departamento: usuario.docente?.departamento ?? '', especialidad: usuario.docente?.especialidad ?? '',
    cargo: usuario.tutorEmpresarial?.cargo ?? '',
  };
}

/** Builds the PATCH body: personal data for everyone, role fields only where they apply. */
function cambiosDe(usuario: Usuario, datos: Formulario): ActualizarPerfilInput {
  const base = { nombres: datos.nombres.trim(), apellidos: datos.apellidos.trim(), telefono: datos.telefono.trim() || null };
  if (usuario.estudiante) return { ...base, carrera: datos.carrera.trim(), anio: Number(datos.anio) };
  if (usuario.docente) return { ...base, departamento: datos.departamento.trim(), especialidad: datos.especialidad.trim() || null };
  if (usuario.tutorEmpresarial) return { ...base, cargo: datos.cargo.trim() };
  return base;
}

function EditarPerfil({ usuario }: { usuario: Usuario }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<Formulario>(() => formularioDe(usuario));
  const guardar = useActualizarPerfil();
  const set = (campo: keyof Formulario) => (e: { target: { value: string } }) => setDatos((d) => ({ ...d, [campo]: e.target.value }));
  function cambiarApertura(open: boolean) {
    // Each opening starts from the saved profile, discarding an abandoned draft.
    if (open) { setDatos(formularioDe(usuario)); guardar.reset(); }
    setAbierto(open);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    guardar.mutate(cambiosDe(usuario, datos), { onSuccess: () => { setAbierto(false); toast.notify({ tone: 'exito', title: 'Perfil actualizado' }); } });
  }
  return <Modal open={abierto} onOpenChange={cambiarApertura} title="Editar perfil" description="El correo y el rol identifican tu cuenta y no se pueden cambiar."
    trigger={<Button variant="secundario">Editar perfil</Button>}>
    <form noValidate onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombres" required autoComplete="given-name" value={datos.nombres} onChange={set('nombres')} />
        <Input label="Apellidos" required autoComplete="family-name" value={datos.apellidos} onChange={set('apellidos')} />
      </div>
      <Input label="Teléfono (opcional)" type="tel" autoComplete="tel" value={datos.telefono} onChange={set('telefono')} help="Ejemplo: +505 8888 0000. Déjalo vacío para quitarlo." />
      {usuario.estudiante && <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Input label="Carrera" required value={datos.carrera} onChange={set('carrera')} />
        <Input label="Año" type="number" inputMode="numeric" min={1} max={5} required value={datos.anio} onChange={set('anio')} />
      </div>}
      {usuario.docente && <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Departamento" required value={datos.departamento} onChange={set('departamento')} />
        <Input label="Especialidad (opcional)" value={datos.especialidad} onChange={set('especialidad')} />
      </div>}
      {usuario.tutorEmpresarial && <Input label="Cargo" required value={datos.cargo} onChange={set('cargo')} />}
      <Alerta messages={errorText(guardar.error)} />
      <div><Button type="submit" loading={guardar.isPending}>Guardar cambios</Button></div>
    </form>
  </Modal>;
}

const sinContrasenas = { contrasenaActual: '', contrasenaNueva: '', confirmacion: '' };

function CambiarContrasena() {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(sinContrasenas);
  const [noCoincide, setNoCoincide] = useState(false);
  const cambiar = useCambiarContrasena();
  const set = (campo: keyof typeof sinContrasenas) => (e: { target: { value: string } }) => setDatos((d) => ({ ...d, [campo]: e.target.value }));
  function cambiarApertura(open: boolean) {
    // Passwords never outlive the dialog that collected them.
    setDatos(sinContrasenas); setNoCoincide(false); cambiar.reset();
    setAbierto(open);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const distintas = datos.contrasenaNueva !== datos.confirmacion;
    setNoCoincide(distintas);
    if (distintas) return;
    cambiar.mutate({ contrasenaActual: datos.contrasenaActual, contrasenaNueva: datos.contrasenaNueva }, {
      onSuccess: () => { cambiarApertura(false); toast.notify({ tone: 'exito', title: 'Contraseña cambiada', description: 'Cerramos tus sesiones en otros dispositivos.' }); },
    });
  }
  return <Modal open={abierto} onOpenChange={cambiarApertura} title="Cambiar contraseña" description="Confirma tu contraseña actual y elige una nueva."
    trigger={<Button variant="secundario">Cambiar contraseña</Button>}>
    <form noValidate onSubmit={submit} className="grid gap-4">
      <Input label="Contraseña actual" type="password" autoComplete="current-password" required value={datos.contrasenaActual} onChange={set('contrasenaActual')} />
      <Input label="Nueva contraseña" type="password" autoComplete="new-password" required value={datos.contrasenaNueva} onChange={set('contrasenaNueva')} help="Mínimo 8 caracteres, con al menos una letra y un número." />
      <Input label="Confirma la nueva contraseña" type="password" autoComplete="new-password" required value={datos.confirmacion} onChange={set('confirmacion')}
        error={noCoincide ? 'Las contraseñas no coinciden.' : undefined} />
      <Alerta messages={errorText(cambiar.error)} />
      <div><Button type="submit" loading={cambiar.isPending}>Cambiar contraseña</Button></div>
    </form>
  </Modal>;
}
