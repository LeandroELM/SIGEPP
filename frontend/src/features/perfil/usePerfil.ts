import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../../api/errors';
import { useRuntime } from '../../hooks/useRuntime';
import { useSession } from '../../hooks/useSession';
import { usuarioResponseSchema, type Usuario } from '../auth/contracts';

const invalidResponse = () => new ApiError({ kind: 'invalid-response', codigo: 'RESPUESTA_INVALIDA', mensaje: 'El servidor devolvió una respuesta de perfil no válida.' });

function usePerfilKey() {
  const { snapshot } = useSession();
  return ['privada', snapshot.generation, snapshot.usuario?.id ?? null, 'perfil'] as const;
}

export function usePerfil(): UseQueryResult<Usuario, ApiError> {
  const { http } = useRuntime(); const { snapshot } = useSession(); const queryKey = usePerfilKey();
  return useQuery({
    queryKey,
    enabled: snapshot.status === 'autenticada',
    async queryFn({ signal }) {
      const data = await http.request<unknown>('/auth/yo', { signal });
      const result = usuarioResponseSchema.safeParse(data);
      if (!result.success) throw invalidResponse();
      return result.data.usuario;
    },
    retry: false,
  });
}

/** Fields the API lets each person correct; role-specific ones are sent only for that role. */
export type ActualizarPerfilInput = {
  nombres: string; apellidos: string; telefono: string | null;
  carrera?: string; anio?: number; departamento?: string; especialidad?: string | null; cargo?: string;
};

export function useActualizarPerfil(): UseMutationResult<Usuario, ApiError, ActualizarPerfilInput> {
  const { http } = useRuntime(); const { service } = useSession();
  const queryClient = useQueryClient(); const queryKey = usePerfilKey();
  return useMutation<Usuario, ApiError, ActualizarPerfilInput>({
    async mutationFn(input) {
      const result = usuarioResponseSchema.safeParse(await http.request<unknown>('/auth/yo', { method: 'PATCH', json: input }));
      if (!result.success) throw invalidResponse();
      return result.data.usuario;
    },
    onSuccess(usuario) {
      queryClient.setQueryData(queryKey, usuario);
      // The shell shows the name from the session, so it must see the edit too.
      service.updateUsuario(usuario);
    },
  });
}

export function useCambiarContrasena(): UseMutationResult<void, ApiError, { contrasenaActual: string; contrasenaNueva: string }> {
  const { http } = useRuntime();
  return useMutation({
    mutationFn: (input) => http.request<void>('/auth/yo/contrasena', { method: 'PUT', json: input }),
  });
}
