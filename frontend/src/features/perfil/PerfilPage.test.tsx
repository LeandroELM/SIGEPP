import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { Providers } from '../../app/Providers';
import { createRuntime } from '../../app/runtime';
import { makeSesionResponse, makeUsuario } from '../../test/fixtures';
import { deferred } from '../../test/deferred';
import PerfilPage from './PerfilPage';
const env = { apiUrl: 'http://localhost:4000/api/v1', institutionalDomains: ['uni.edu.ni'] };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
async function mount(fetchImpl: typeof fetch) {
  const runtime = createRuntime({ env, fetchImpl, storage: sessionStorage }); await runtime.session.login({ correo: 'ana@std.uni.edu.ni', contrasena: 'clave' }); await runtime.session.initialize();
  render(<Providers runtime={runtime}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PerfilPage /></MemoryRouter></Providers>); return runtime;
}
afterEach(() => sessionStorage.clear());
it('perfil null y nombres largos muestra datos reales sin inventar cifras ni h1 privado', async () => {
  const name = 'Nombre '.repeat(30); let calls = 0;
  await mount(async (url) => { if (String(url).endsWith('/auth/yo')) { calls++; return json({ usuario: makeUsuario('ESTUDIANTE', { nombres: name }) }); } return json(makeSesionResponse()); });
  expect(await screen.findByText(name.trim())).toBeInTheDocument();
  expect(screen.getAllByText('No disponible').length).toBeGreaterThan(3);
  expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument(); expect(screen.queryByText('0%')).not.toBeInTheDocument(); expect(calls).toBe(1);
});
it('muestra solo el perfil del rol de la cuenta, con números sin conversión inventada', async () => {
  const usuario = makeUsuario('ESTUDIANTE', { estudiante: { id: 'e', carnet: '2026-1234A', carrera: 'Computación', anio: 4, porcentajeAvance: '73.50', avanceVerificado: false }, docente: { id: 'd', departamento: 'Sistemas', especialidad: null } });
  await mount(async (url) => String(url).endsWith('/auth/yo') ? json({ usuario }) : json(makeSesionResponse()));
  for (const text of ['2026-1234A', 'Computación', '73.50%', 'Estudiante']) expect(await screen.findByText(text)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Perfil de tutor académico' })).not.toBeInTheDocument();
  expect(screen.queryByText('Sistemas')).not.toBeInTheDocument();
});
it('el administrador no ve perfiles de otros roles y puede editar sus datos personales', async () => {
  const requests: { method: string; body: unknown }[] = [];
  let usuario = makeUsuario('ADMIN', { nombres: 'Leandro', apellidos: 'Lacayo', telefono: '+505 8888 0000' });
  const runtime = await mount(async (url, init) => {
    if (!String(url).endsWith('/auth/yo')) return json(makeSesionResponse('ADMIN'));
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)); requests.push({ method: 'PATCH', body });
      usuario = { ...usuario, ...body }; return json({ usuario });
    }
    return json({ usuario });
  });
  await screen.findByText('Leandro');
  expect(screen.queryByRole('heading', { name: /Perfil de/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }));
  const dialog = await screen.findByRole('dialog', { name: 'Editar perfil' });
  const nombres = within(dialog).getByLabelText('Nombres'); await userEvent.clear(nombres); await userEvent.type(nombres, 'Leandro Enrique');
  await userEvent.clear(within(dialog).getByLabelText('Teléfono (opcional)'));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(requests).toEqual([{ method: 'PATCH', body: { nombres: 'Leandro Enrique', apellidos: 'Lacayo', telefono: null } }]);
  expect(await screen.findByText('Leandro Enrique')).toBeInTheDocument();
  // The session copy feeds the top bar, so it must reflect the saved name without a reload.
  const snapshot = runtime.session.getSnapshot();
  expect(snapshot.status === 'autenticada' && snapshot.usuario.nombres).toBe('Leandro Enrique');
});
it('el estudiante envía carrera y año; un error del servidor queda en el diálogo', async () => {
  const usuario = makeUsuario('ESTUDIANTE', { estudiante: { id: 'e', carnet: '2026-1234A', carrera: 'Computación', anio: 4, porcentajeAvance: '80', avanceVerificado: true } });
  let body: unknown;
  await mount(async (url, init) => {
    if (!String(url).endsWith('/auth/yo')) return json(makeSesionResponse());
    if (init?.method === 'PATCH') { body = JSON.parse(String(init.body)); return json({ error: { codigo: 'VALIDACION', mensaje: 'Los datos enviados no son válidos', detalles: ['anio: Number must be less than or equal to 5'] } }, 400); }
    return json({ usuario });
  });
  await userEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }));
  const dialog = await screen.findByRole('dialog');
  const anio = within(dialog).getByLabelText('Año'); await userEvent.clear(anio); await userEvent.type(anio, '6');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('anio: Number must be less than or equal to 5');
  expect(body).toEqual({ nombres: usuario.nombres, apellidos: usuario.apellidos, telefono: null, carrera: 'Computación', anio: 6 });
});
it('cambiar contraseña exige confirmación igual antes de llamar al API', async () => {
  const calls: unknown[] = [];
  await mount(async (url, init) => {
    if (String(url).endsWith('/auth/yo/contrasena')) { calls.push(JSON.parse(String(init?.body))); return new Response(null, { status: 204 }); }
    return String(url).endsWith('/auth/yo') ? json({ usuario: makeUsuario('ADMIN') }) : json(makeSesionResponse('ADMIN'));
  });
  await userEvent.click(await screen.findByRole('button', { name: 'Cambiar contraseña' }));
  const dialog = await screen.findByRole('dialog', { name: 'Cambiar contraseña' });
  await userEvent.type(within(dialog).getByLabelText('Contraseña actual'), 'Actual2026');
  await userEvent.type(within(dialog).getByLabelText('Nueva contraseña'), 'Nueva2026');
  await userEvent.type(within(dialog).getByLabelText('Confirma la nueva contraseña'), 'Otra2026');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Cambiar contraseña' }));
  expect(await within(dialog).findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
  expect(calls).toHaveLength(0);
  const confirmacion = within(dialog).getByLabelText('Confirma la nueva contraseña'); await userEvent.clear(confirmacion); await userEvent.type(confirmacion, 'Nueva2026');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Cambiar contraseña' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(calls).toEqual([{ contrasenaActual: 'Actual2026', contrasenaNueva: 'Nueva2026' }]);
});
it.each([false, true])('consulta fallida/malformada=%s requiere reintento manual', async (malformed) => {
  let calls = 0;
  await mount(async (url) => { if (!String(url).endsWith('/auth/yo')) return json(makeSesionResponse()); calls++; return calls > 1 ? json({ usuario: makeUsuario() }) : malformed ? json({ usuario: {} }) : json({ error: { codigo: 'ERROR', mensaje: 'Error de consulta.', detalles: [] } }, 500); });
  expect(await screen.findByRole('alert')).toHaveTextContent(malformed ? /respuesta.*válida/i : 'Error de consulta.'); expect(calls).toBe(1);
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(await screen.findByText('ana@std.uni.edu.ni')).toBeInTheDocument(); expect(calls).toBe(2);
});
it('logout cancela consulta y respuesta antigua no presenta identidad anterior', async () => {
  const pending = deferred<Response>(); let signal: AbortSignal | null | undefined;
  const runtime = await mount(async (url, init) => { if (String(url).endsWith('/auth/yo')) { signal = init?.signal; return pending.promise; } if (String(url).endsWith('/auth/logout')) return new Response(null, { status: 204 }); return json(makeSesionResponse()); });
  await waitFor(() => expect(signal).toBeDefined()); await act(async () => { await runtime.session.logout(); pending.resolve(json({ usuario: makeUsuario('ESTUDIANTE', { nombres: 'Antigua' }) })); });
  expect(signal?.aborted).toBe(true); expect(screen.queryByText('Antigua')).not.toBeInTheDocument(); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
