"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV_ITEMS, isActive } from "./nav";

const GROUPS = [
  { key: "operate", label: "Operations" },
  { key: "knowledge", label: "Knowledge & Quality" },
  { key: "system", label: "System" },
] as const;

export function Sidebar({
  collapsed,
  onToggle,
  onClose,
  openTaskCount,
  openQualityCount,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  openTaskCount: number;
  openQualityCount: number;
}) {
  const pathname = usePathname();
  const counters: Record<string, number> = { "/tasks": openTaskCount, "/quality": openQualityCount };

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        <Link href="/" aria-label="ASSEMBLY OS Overview">
          <Logo collapsed={collapsed} />
        </Link>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-elevated hover:text-fg cursor-pointer" aria-label="Menü schließen">
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {GROUPS.map((g) => (
          <div key={g.key} className="mb-4">
            {!collapsed && <div className="label-caps px-2.5 pb-1.5 !text-subtle">{g.label}</div>}
            <ul className="space-y-0.5">
              {NAV_ITEMS.filter((i) => i.group === g.key).map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                const count = counters[item.href];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-9 items-center gap-3 rounded-md text-sm transition-colors",
                        collapsed ? "justify-center" : "px-2.5",
                        active ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg",
                      )}
                    >
                      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary" />}
                      <Icon className={cn("size-[18px] shrink-0", active && "text-primary")} />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && !!count && (
                        <span className="rounded bg-hover px-1.5 font-mono text-2xs text-muted">{count}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {onToggle && (
        <div className="border-t border-border p-2">
          <button
            onClick={onToggle}
            className={cn("flex h-9 w-full items-center gap-3 rounded-md text-sm text-muted hover:bg-elevated hover:text-fg cursor-pointer", collapsed ? "justify-center" : "px-2.5")}
            aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            {!collapsed && "Einklappen"}
          </button>
        </div>
      )}
    </div>
  );
}
