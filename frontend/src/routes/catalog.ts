import { matchPath } from 'react-router-dom';
import { ROLES, type Rol } from '../features/auth/contracts';
import { isKnownRole } from './permissions';

export type RouteId =
  | 'login' | 'registro' | 'root' | 'inicio' | 'panel' | 'org-inicio'
  | 'perfil' | 'org-perfil' | 'plazas' | 'plaza-detalle' | 'postulaciones'
  | 'candidatos' | 'org-plazas' | 'org-plaza-nueva' | 'org-plaza-detalle'
  | 'org-tutores' | 'organizaciones' | 'expediente' | 'expediente-plan'
  | 'expediente-bitacoras' | 'tutorados' | 'practicantes' | 'revisiones'
  | 'asignaciones' | 'asignacion-detalle' | 'auditoria' | 'forbidden' | 'not-found';
export type PageKey =
  | 'login' | 'registro' | 'inicio' | 'perfil' | 'modulo' | 'panel' | 'plazas' | 'plaza-detalle'
  | 'org-plazas' | 'org-plaza-nueva' | 'org-tutores' | 'organizaciones' | 'expediente'
  | 'expediente-plan' | 'expediente-bitacoras' | 'postulaciones' | 'candidatos' | 'mis-asignaciones' | 'revisiones' | 'asignaciones' | 'asignacion-detalle' | 'auditoria';
export type RouteDefinition = {
  id: RouteId; path: string; roles: readonly Rol[] | 'public'; page: PageKey;
  label: string; availability: 'activa' | 'S2' | 'S3'; menuRoles: readonly Rol[];
  homeRoles?: readonly Rol[]; redirectTo?: RouteId;
};
const all = ROLES;
const student: readonly Rol[] = ['ESTUDIANTE'];
const academic: readonly Rol[] = ['TUTOR_ACADEMICO'];
const enterprise: readonly Rol[] = ['TUTOR_EMPRESARIAL'];
const organization: readonly Rol[] = ['ORGANIZACION'];
const management: readonly Rol[] = ['COORDINADOR', 'ADMIN'];

// The order is also the menu priority. Details, aliases and errors are explicit
// entries with an empty menuRoles list; guards and links share this catalogue.
export const routeCatalog: readonly RouteDefinition[] = [
  { id: 'login', path: '/login', roles: 'public', page: 'login', label: 'Iniciar sesión', availability: 'activa', menuRoles: [] },
  { id: 'registro', path: '/registro', roles: 'public', page: 'registro', label: 'Registro', availability: 'activa', menuRoles: [] },
  { id: 'root', path: '/', roles: 'public', page: 'inicio', label: 'Inicio', availability: 'activa', menuRoles: [] },
  { id: 'inicio', path: '/inicio', roles: all, page: 'inicio', label: 'Inicio', availability: 'activa', menuRoles: ['ESTUDIANTE', 'TUTOR_ACADEMICO', 'TUTOR_EMPRESARIAL', 'ADMIN'], homeRoles: ['ESTUDIANTE', 'TUTOR_ACADEMICO', 'TUTOR_EMPRESARIAL', 'ADMIN'] },
  { id: 'panel', path: '/panel', roles: management, page: 'panel', label: 'Panel', availability: 'activa', menuRoles: ['COORDINADOR'], homeRoles: ['COORDINADOR'] },
  { id: 'org-inicio', path: '/org/inicio', roles: organization, page: 'inicio', label: 'Inicio', availability: 'activa', menuRoles: organization, homeRoles: organization },
  { id: 'org-perfil', path: '/org/perfil', roles: organization, page: 'perfil', label: 'Perfil', availability: 'activa', menuRoles: [], redirectTo: 'perfil' },
  { id: 'plazas', path: '/plazas', roles: all, page: 'plazas', label: 'Plazas', availability: 'activa', menuRoles: ['ESTUDIANTE', 'COORDINADOR', 'ADMIN'] },
  { id: 'plaza-detalle', path: '/plazas/:id', roles: all, page: 'plaza-detalle', label: 'Detalle de plaza', availability: 'activa', menuRoles: [] },
  { id: 'postulaciones', path: '/postulaciones', roles: student, page: 'postulaciones', label: 'Postulaciones', availability: 'activa', menuRoles: student },
  { id: 'candidatos', path: '/candidatos', roles: enterprise, page: 'candidatos', label: 'Candidatos', availability: 'activa', menuRoles: enterprise },
  { id: 'org-plazas', path: '/org/plazas', roles: organization, page: 'org-plazas', label: 'Mis plazas', availability: 'activa', menuRoles: organization },
  { id: 'org-plaza-nueva', path: '/org/plazas/nueva', roles: organization, page: 'org-plaza-nueva', label: 'Nueva plaza', availability: 'activa', menuRoles: [] },
  { id: 'org-plaza-detalle', path: '/org/plazas/:id', roles: organization, page: 'plaza-detalle', label: 'Detalle de mi plaza', availability: 'activa', menuRoles: [] },
  { id: 'org-tutores', path: '/org/tutores', roles: organization, page: 'org-tutores', label: 'Tutores', availability: 'activa', menuRoles: organization },
  { id: 'organizaciones', path: '/organizaciones', roles: management, page: 'organizaciones', label: 'Organizaciones', availability: 'activa', menuRoles: management },
  { id: 'expediente', path: '/expediente', roles: student, page: 'expediente', label: 'Expediente', availability: 'activa', menuRoles: student },
  { id: 'expediente-plan', path: '/expediente/plan', roles: student, page: 'expediente-plan', label: 'Plan de trabajo', availability: 'activa', menuRoles: [] },
  { id: 'expediente-bitacoras', path: '/expediente/bitacoras', roles: student, page: 'expediente-bitacoras', label: 'Bitácoras', availability: 'activa', menuRoles: [] },
  { id: 'tutorados', path: '/tutorados', roles: academic, page: 'mis-asignaciones', label: 'Tutorados', availability: 'activa', menuRoles: academic },
  { id: 'practicantes', path: '/practicantes', roles: enterprise, page: 'mis-asignaciones', label: 'Practicantes', availability: 'activa', menuRoles: enterprise },
  { id: 'revisiones', path: '/revisiones', roles: ['TUTOR_ACADEMICO', 'TUTOR_EMPRESARIAL'], page: 'revisiones', label: 'Revisiones', availability: 'activa', menuRoles: academic },
  { id: 'asignaciones', path: '/asignaciones', roles: management, page: 'asignaciones', label: 'Asignaciones', availability: 'activa', menuRoles: management },
  { id: 'asignacion-detalle', path: '/asignaciones/:id', roles: ['ESTUDIANTE', 'TUTOR_ACADEMICO', 'TUTOR_EMPRESARIAL', 'COORDINADOR', 'ADMIN'], page: 'asignacion-detalle', label: 'Detalle de asignación', availability: 'activa', menuRoles: [] },
  // S3 is a technical grouping, not a promise of an availability date.
  { id: 'auditoria', path: '/admin/auditoria', roles: ['ADMIN'], page: 'auditoria', label: 'Auditoría', availability: 'activa', menuRoles: ['ADMIN'] },
  { id: 'perfil', path: '/perfil', roles: all, page: 'perfil', label: 'Perfil', availability: 'activa', menuRoles: all },
  { id: 'forbidden', path: '/403', roles: 'public', page: 'modulo', label: 'Acceso denegado', availability: 'activa', menuRoles: [] },
  { id: 'not-found', path: '*', roles: 'public', page: 'modulo', label: 'Página no encontrada', availability: 'activa', menuRoles: [] },
];

export function canAccess(routeId: RouteId, rol: Rol): boolean {
  const route = routeCatalog.find((entry) => entry.id === routeId);
  return isKnownRole(rol) && !!route && (route.roles === 'public' || route.roles.includes(rol));
}
export function getHomePath(rol: Rol): string {
  return routeCatalog.find((route) => route.homeRoles?.includes(rol))?.path ?? '/403';
}
export function getNavigation(rol: Rol): readonly RouteDefinition[] {
  return routeCatalog.filter((route) => route.menuRoles.includes(rol) && canAccess(route.id, rol));
}
export function findRoute(pathname: string): RouteDefinition | undefined {
  return routeCatalog.find((route) => route.path !== '*' && matchPath({ path: route.path, end: true, caseSensitive: true }, pathname));
}
