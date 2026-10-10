import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApiMutation, useApiQuery, type Paginado } from '../../api/hooks';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { findRoute } from '../../routes/catalog';
import { fechaHora } from '../shared/format';
import type { Notificacion } from '../shared/types';

type Respuesta = Paginado<Notificacion> & { noLeidas: number };

/** S3-H4 (RF-23): campana con las notificaciones recientes dentro de la aplicación. */
export function NotificacionesCampana() {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const lista = useApiQuery<Respuesta>('/notificaciones?limit=15', { refetchInterval: 60_000 });
  const leer = useApiMutation<unknown, string>((id) => ({ path: `/notificaciones/${id}/leer`, method: 'PATCH' }));
  const leerTodas = useApiMutation<unknown, void>(() => ({ path: '/notificaciones/leer-todas', method: 'PATCH' }));
  // A malformed response must never break the shell that hosts the bell.
  const items = Array.isArray(lista.data?.data) ? lista.data.data : [];
  const noLeidas = typeof lista.data?.noLeidas === 'number' ? lista.data.noLeidas : 0;

  function abrir(notificacion: Notificacion) {
    if (!notificacion.leida) leer.mutate(notificacion.id);
    setAbierto(false);
    // Only known in-app paths are followed; anything else stays on the current page.
    if (notificacion.enlace && findRoute(notificacion.enlace)) navigate(notificacion.enlace);
  }

  return <Modal open={abierto} onOpenChange={setAbierto} title="Notificaciones"
    description={noLeidas ? `Tienes ${noLeidas} sin leer.` : 'Estás al día.'}
    trigger={<Button variant="fantasma" aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ''}`}>
      <span className="inline-flex items-center gap-1">
        <Bell className="ui-icon" aria-hidden="true" />
        {noLeidas > 0 && <span aria-hidden="true" className="rounded-full bg-error px-2 text-sm text-surface">{noLeidas > 99 ? '99+' : noLeidas}</span>}
      </span>
    </Button>}>
    {lista.isError && <p role="alert">{lista.error.message}</p>}
    {lista.isSuccess && items.length === 0 && <p>No tienes notificaciones.</p>}
    {items.length > 0 && <ul className="grid gap-2">
      {items.map((n) => <li key={n.id}>
        <button type="button" onClick={() => abrir(n)}
          className={`grid w-full gap-1 rounded-control border p-3 text-left hover:bg-background ${n.leida ? 'border-border' : 'border-primary'}`}>
          <span className="font-semibold">{!n.leida && <span className="sr-only">Sin leer: </span>}{n.titulo}</span>
          <span>{n.mensaje}</span>
          <span className="text-sm text-muted">{fechaHora(n.creadaEn)}</span>
        </button>
      </li>)}
    </ul>}
    {noLeidas > 0 && <Button variant="secundario" loading={leerTodas.isPending} onClick={() => leerTodas.mutate()}>Marcar todas como leídas</Button>}
  </Modal>;
}
