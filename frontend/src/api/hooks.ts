import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { ApiError } from './errors';
import type { RequestOptions } from './transport';
import { useRuntime } from '../hooks/useRuntime';
import { useSession } from '../hooks/useSession';

export type Paginado<T> = {
  data: T[];
  meta: { total: number; pagina: number; limite: number; totalPaginas: number };
};

type QueryValue = string | number | undefined | null;

/** Builds `path?query` skipping empty values, so filters stay out of the URL until set. */
export function withQuery(path: string, query: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

// Private data is keyed by session generation and user, like the profile query,
// so a session change never shows another account's cached responses.
function usePrivateKey() {
  const { snapshot } = useSession();
  return {
    enabled: snapshot.status === 'autenticada',
    prefix: ['privada', snapshot.generation, snapshot.usuario?.id ?? null] as const,
  };
}

export function useApiQuery<T>(path: string, options: { enabled?: boolean; refetchInterval?: number } = {}): UseQueryResult<T, ApiError> {
  const { http } = useRuntime();
  const { enabled, prefix } = usePrivateKey();
  return useQuery<T, ApiError>({
    queryKey: [...prefix, 'api', path],
    enabled: enabled && (options.enabled ?? true),
    queryFn: ({ signal }) => http.request<T>(path, { signal }),
    refetchInterval: options.refetchInterval,
  });
}

export type MutationRequest = { path: string; method: NonNullable<RequestOptions['method']>; json?: unknown };

/** Runs a write and refreshes every private API query afterwards. */
export function useApiMutation<TResult, TInput>(
  toRequest: (input: TInput) => MutationRequest,
): UseMutationResult<TResult, ApiError, TInput> {
  const { http } = useRuntime();
  const queryClient = useQueryClient();
  const { prefix } = usePrivateKey();
  return useMutation<TResult, ApiError, TInput>({
    mutationFn: (input) => {
      const { path, ...request } = toRequest(input);
      return http.request<TResult>(path, request);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...prefix, 'api'] }),
  });
}

/** Message plus server details, ready to show in an alert. */
export function errorText(error: ApiError | null | undefined): string[] {
  if (!error) return [];
  return [error.message, ...error.detalles];
}
