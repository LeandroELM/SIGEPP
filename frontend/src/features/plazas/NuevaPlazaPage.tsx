import { useNavigate } from 'react-router-dom';
import { errorText, useApiMutation } from '../../api/hooks';
import { useToast } from '../../hooks/useToast';
import type { Plaza, PlazaInput } from '../shared/types';
import { Seccion } from '../shared/ui';
import { PlazaForm } from './PlazaForm';

/** WF-07 (RF-08): la organización publica una plaza, que queda en revisión (RN-04). */
export default function NuevaPlazaPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const crear = useApiMutation<{ plaza: Plaza }, PlazaInput>((json) => ({ path: '/plazas', method: 'POST', json }));
  return <Seccion title="Datos de la plaza">
    <p className="text-muted">La plaza quedará <strong>en revisión</strong> hasta que la coordinación académica la apruebe.</p>
    <PlazaForm submitLabel="Publicar plaza" pending={crear.isPending} serverErrors={errorText(crear.error)}
      onSubmit={(values) => crear.mutate(values, {
        onSuccess: ({ plaza }) => {
          toast.notify({ tone: 'exito', title: 'Plaza enviada a revisión' });
          navigate(`/org/plazas/${plaza.id}`);
        },
      })} />
  </Seccion>;
}
