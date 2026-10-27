import { Outlet } from 'react-router-dom';
import { Marca } from './Marca';

// The real order of a practice in SIGEPP, so the numbering encodes a sequence.
const etapas = [
  ['Postulación', 'Eliges hasta 3 plazas aprobadas por coordinación.'],
  ['Asignación', 'Coordinación confirma la plaza y tu tutor académico.'],
  ['Plan de trabajo', 'Tus dos tutores revisan y aprueban el plan.'],
  ['Bitácoras', 'Cada quincena registras tus horas hasta completar la práctica.'],
] as const;

export function AuthLayout() {
  return <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
    <header className="ui-grid-bg--dark relative flex flex-col justify-between gap-8 overflow-hidden p-6 text-surface sm:p-12">
      <Marca />
      <div className="grid max-w-[34rem] gap-6">
        <p className="text-[length:var(--font-size-display)] font-light leading-[1.1] tracking-tight">
          Tu práctica profesional, de la plaza al expediente.
        </p>
        <p className="text-lg text-white/80">Sistema de Gestión del Ejercicio y Prácticas Profesionales de Ingeniería en Sistemas, UNI.</p>
      </div>
      <ol aria-label="Etapas de la práctica" className="hidden max-w-[34rem] list-none border border-white/20 p-0 sm:grid">
        {etapas.map(([titulo, detalle], index) => <li key={titulo} className="grid grid-cols-[3rem_minmax(0,1fr)] border-b border-white/20 last:border-b-0">
          <span aria-hidden="true" className="ui-mono grid place-items-center border-r border-white/20 text-sky">{String(index + 1).padStart(2, '0')}</span>
          <span className="p-3"><span className="block font-medium">{titulo}</span><span className="block text-sm text-white/70">{detalle}</span></span>
        </li>)}
      </ol>
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-[6rem] -right-[6rem] h-[18rem] w-[18rem] bg-[image:var(--gradient-text)] opacity-40 blur-3xl" />
    </header>
    <main className="ui-grid-bg flex items-center justify-center p-4 sm:p-12">
      <div className="w-full max-w-[30rem] border border-border bg-surface p-6 shadow-[8px_8px_0_rgb(30_79_214_/_12%)] sm:p-8">
        <Outlet />
      </div>
    </main>
  </div>;
}
