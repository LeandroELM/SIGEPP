import { useState } from 'react';
import { errorText, useApiMutation, useApiQuery, type Paginado } from '../../api/hooks';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Textarea } from '../../components/Textarea';
import { useToast } from '../../hooks/useToast';
import { fecha } from '../shared/format';
import type { Plaza, Postulacion } from '../shared/types';
import { Alerta, EnlaceBoton, EstadoBadge, Seccion } from '../shared/ui';

const MINIMO_CARTA = 50;

/** WF-03 (RF-11): postulación desde el detalle de la plaza. El API valida RN-01 a RN-03. */
export function PostularSeccion({ plaza }: { plaza: Plaza }) {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [carta, setCarta] = useState('');
  const mias = useApiQuery<Paginado<Postulacion>>('/postulaciones/mias?limit=50');
  const postular = useApiMutation<{ postulacion: Postulacion }, string>((cartaMotivacion) => ({
    path: '/postulaciones', method: 'POST', json: { plazaId: plaza.id, cartaMotivacion },
  }));
  // The API keeps one application per student and plaza, even after withdrawing it.
  const existente = mias.data?.data.find((p) => p.plaza.id === plaza.id);
  const largo = carta.trim().length;

  return <Seccion title="Postulación">
    {existente
      ? <div className="grid gap-3">
        <p>Te postulaste a esta plaza el {fecha(existente.creadaEn)}. Estado: <EstadoBadge estado={existente.estado} /></p>
        {existente.estado === 'RETIRADA' && <p>Retiraste esta postulación; no es posible volver a postularse a la misma plaza.</p>}
        <div><EnlaceBoton to="/postulaciones">Ver mis postulaciones</EnlaceBoton></div>
      </div>
      : plaza.cuposDisponibles === 0
        ? <p>Esta plaza ya no tiene cupos disponibles.</p>
        : <>
          <p>Para postularte necesitas al menos 80 % del plan de estudios aprobado (RN-01), no tener una asignación activa (RN-02) y menos de tres postulaciones pendientes (RN-03).</p>
          <Alerta messages={abierto ? [] : errorText(postular.error)} />
          <div>
            <Modal open={abierto} onOpenChange={(open) => { setAbierto(open); if (!open) postular.reset(); }} title="Postularme a la plaza"
              description={`${plaza.titulo} — ${plaza.organizacion.razonSocial}`} trigger={<Button>Postularme</Button>}>
              <Textarea label="Carta de motivación" rows={6} value={carta} onChange={(e) => setCarta(e.target.value)}
                help={`Explica por qué te interesa la plaza y qué puedes aportar. ${largo}/${MINIMO_CARTA} caracteres mínimos.`} />
              <Alerta messages={errorText(postular.error)} />
              <Button disabled={largo < MINIMO_CARTA} loading={postular.isPending}
                onClick={() => postular.mutate(carta.trim(), { onSuccess: () => { setAbierto(false); setCarta(''); toast.notify({ tone: 'exito', title: 'Postulación enviada', description: 'La organización revisará tu perfil.' }); } })}>
                Enviar postulación
              </Button>
            </Modal>
          </div>
        </>}
  </Seccion>;
}
