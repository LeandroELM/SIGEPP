import { EmptyState } from '../../components/EmptyState';

// Fallback for catalogue entries without a dedicated screen.
export default function PendientePage() {
  return <EmptyState title="Esta sección aún no está disponible" description="" />;
}
