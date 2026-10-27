import { useId } from 'react';

/** Isotipo de SIGEPP: un bloque cuadrado partido en diagonal, como una regla de plano. */
export function Marca({ tone = 'claro' }: { tone?: 'claro' | 'oscuro' }) {
  const gradient = `marca${useId().replace(/:/g, '')}`;
  const text = tone === 'claro' ? 'text-surface' : 'text-ink';
  return <span className={`inline-flex items-center gap-3 ${text}`}>
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={gradient} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1E4FD6" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" fill={`url(#${gradient})`} />
      <path d="M0 28 L28 0 L28 28 Z" fill="#0A1F44" opacity="0.35" />
      <rect x="7" y="7" width="7" height="7" fill="#FFFFFF" />
    </svg>
    <span className="text-xl font-semibold tracking-tight">SIGEPP</span>
  </span>;
}
