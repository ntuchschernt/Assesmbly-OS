import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Cog,
  ClipboardList,
  FileText,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; group: "operate" | "knowledge" | "system" };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, group: "operate" },
  { href: "/projects", label: "Projects", icon: FolderKanban, group: "operate" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, group: "operate" },
  { href: "/assembly", label: "Assembly", icon: Cog, group: "operate" },
  { href: "/work-instructions", label: "Work Instructions", icon: ClipboardList, group: "knowledge" },
  { href: "/documents", label: "Documents", icon: FileText, group: "knowledge" },
  { href: "/quality", label: "Quality Management", icon: ShieldCheck, group: "knowledge" },
  { href: "/copilot", label: "AI Copilot", icon: Sparkles, group: "knowledge" },
  { href: "/reports", label: "Reports", icon: BarChart3, group: "system" },
  { href: "/settings", label: "Settings", icon: Settings, group: "system" },
];

/** Labels for static path segments, used for fallback breadcrumbs. */
export const SEGMENT_LABELS: Record<string, string> = {
  projects: "Projects",
  tasks: "Tasks",
  assembly: "Assembly",
  "work-orders": "Montageaufträge",
  assemblies: "Baugruppen",
  machines: "Maschinen",
  execute: "Ausführung",
  "work-instructions": "Work Instructions",
  released: "Freigegebene Version",
  new: "Neu",
  documents: "Documents",
  quality: "Quality Management",
  copilot: "AI Copilot",
  reports: "Reports",
  settings: "Settings",
  search: "Suche",
  notifications: "Benachrichtigungen",
};

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
