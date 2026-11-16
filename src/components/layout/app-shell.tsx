"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar, type ShellNotification } from "./topbar";
import { BreadcrumbProvider } from "./breadcrumbs";

const STORAGE_KEY = "aos.sidebar.collapsed";

export type ShellProps = {
  user: { name: string; email: string; title: string | null; roleLabel: string };
  workspace: { id: string; name: string };
  workspaces: { id: string; name: string }[];
  notifications: ShellNotification[];
  unreadCount: number;
  openTaskCount: number;
  openQualityCount: number;
  children: React.ReactNode;
};

export function AppShell({ children, ...props }: ShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* storage unavailable – keep default */
    }
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  return (
    <BreadcrumbProvider>
      <div className="flex min-h-dvh">
        {/* Desktop sidebar */}
        <aside
          className={`sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 lg:block ${collapsed ? "w-[60px]" : "w-60"}`}
        >
          <Sidebar collapsed={collapsed} onToggle={toggle} openTaskCount={props.openTaskCount} openQualityCount={props.openQualityCount} />
        </aside>

        {/* Mobile / tablet drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-sidebar shadow-2xl">
              <Sidebar collapsed={false} onClose={() => setMobileOpen(false)} openTaskCount={props.openTaskCount} openQualityCount={props.openQualityCount} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar {...props} onMenu={() => setMobileOpen(true)} />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
