import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Textarea } from '../../components/Textarea';
import { MODALIDADES } from '../shared/format';
import type { Modalidad, PlazaInput } from '../shared/types';
import { Alerta } from '../shared/ui';

// Mirrors backend plazas.schema.ts so most mistakes are caught before sending.
const plazaSchema = z.object({
  titulo: z.string().trim().min(5, 'Mínimo 5 caracteres').max(120),
  descripcion: z.string().trim().min(20, 'La descripción debe tener al menos 20 caracteres').max(3000),
  area: z.string().trim().min(3, 'Mínimo 3 caracteres').max(80),
  modalidad: z.enum(['PRESENCIAL', 'REMOTA', 'HIBRIDA'], { errorMap: () => ({ message: 'Selecciona una modalidad' }) }),
  ubicacion: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80),
  cupos: z.coerce.number({ invalid_type_error: 'Indica un número' }).int('Debe ser un número entero').min(1, 'Mínimo 1').max(20, 'Máximo 20'),
  horario: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120),
  competencias: z.array(z.string().trim().min(1).max(50)).min(1, 'Indica al menos una competencia').max(15, 'Máximo 15 competencias'),
});

type Campos = Record<keyof PlazaInput, string>;
type Errores = Partial<Record<keyof PlazaInput, string>>;

const vacio: Campos = { titulo: '', descripcion: '', area: '', modalidad: '', ubicacion: '', cupos: '1', horario: '', competencias: '' };

export function PlazaForm({ inicial, submitLabel, pending, serverErrors, onSubmit }: {
  inicial?: PlazaInput; submitLabel: string; pending: boolean; serverErrors: string[];
  onSubmit(values: PlazaInput): void;
}) {
  const [campos, setCampos] = useState<Campos>(inicial
    ? { ...inicial, cupos: String(inicial.cupos), competencias: inicial.competencias.join(', ') }
    : vacio);
  const [errores, setErrores] = useState<Errores>({});
  const set = (campo: keyof Campos) => (value: string) => setCampos((actual) => ({ ...actual, [campo]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = plazaSchema.safeParse({
      ...campos,
      competencias: campos.competencias.split(',').map((c) => c.trim()).filter(Boolean),
    });
    if (!result.success) {
      const next: Errores = {};
      for (const issue of result.error.issues) next[issue.path[0] as keyof PlazaInput] ??= issue.message;
      setErrores(next);
      document.getElementById(`plaza-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setErrores({});
    onSubmit({ ...result.data, modalidad: result.data.modalidad as Modalidad });
  }

  return <form noValidate onSubmit={submit} className="grid gap-4">
    <Alerta messages={serverErrors} />
    <Input id="plaza-titulo" label="Título" required value={campos.titulo} onChange={(e) => set('titulo')(e.target.value)} error={errores.titulo} />
    <Textarea id="plaza-descripcion" label="Descripción de actividades" required rows={5} value={campos.descripcion} onChange={(e) => set('descripcion')(e.target.value)} error={errores.descripcion} />
    <div className="grid gap-4 sm:grid-cols-2">
      <Input id="plaza-area" label="Área" required value={campos.area} onChange={(e) => set('area')(e.target.value)} error={errores.area} help="Ej.: Desarrollo de software" />
      <Select id="plaza-modalidad" label="Modalidad" required value={campos.modalidad} options={MODALIDADES} onValueChange={set('modalidad')} error={errores.modalidad} />
      <Input id="plaza-ubicacion" label="Ubicación" required value={campos.ubicacion} onChange={(e) => set('ubicacion')(e.target.value)} error={errores.ubicacion} />
      <Input id="plaza-cupos" label="Cupos" type="number" min={1} max={20} required value={campos.cupos} onChange={(e) => set('cupos')(e.target.value)} error={errores.cupos} />
    </div>
    <Input id="plaza-horario" label="Horario" required value={campos.horario} onChange={(e) => set('horario')(e.target.value)} error={errores.horario} help="Ej.: Lunes a viernes, 8:00 a 12:00" />
    <Input id="plaza-competencias" label="Competencias requeridas" required value={campos.competencias} onChange={(e) => set('competencias')(e.target.value)} error={errores.competencias} help="Sepáralas con comas. Ej.: JavaScript, React, Git" />
    <div><Button type="submit" loading={pending}>{submitLabel}</Button></div>
  </form>;
}
