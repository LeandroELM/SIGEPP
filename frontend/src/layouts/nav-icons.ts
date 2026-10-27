import {
  Building2, ClipboardCheck, FileSearch, FolderOpen, GraduationCap, House, LayoutDashboard,
  Link2, ScrollText, Search, Send, UserRound, Users, type LucideIcon,
} from 'lucide-react';
import type { RouteId } from '../routes/catalog';

const icons: Partial<Record<RouteId, LucideIcon>> = {
  inicio: House, 'org-inicio': House, panel: LayoutDashboard, plazas: Search, 'org-plazas': FileSearch,
  postulaciones: Send, candidatos: Users, 'org-tutores': Users, organizaciones: Building2,
  expediente: FolderOpen, tutorados: GraduationCap, practicantes: GraduationCap, revisiones: ClipboardCheck,
  asignaciones: Link2, auditoria: ScrollText, perfil: UserRound,
};

export function navIcon(id: RouteId): LucideIcon {
  return icons[id] ?? House;
}
