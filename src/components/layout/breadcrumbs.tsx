"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { SEGMENT_LABELS } from "./nav";

export type Crumb = { label: string; href?: string };

const BreadcrumbContext = createContext<{ crumbs: Crumb[] | null; setCrumbs: (c: Crumb[] | null) => void }>({
  crumbs: null,
  setCrumbs: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);
  return <BreadcrumbContext.Provider value={{ crumbs, setCrumbs }}>{children}</BreadcrumbContext.Provider>;
}

/** Rendered by detail pages to provide meaningful entity names in the top bar. */
export function SetBreadcrumbs({ items }: { items: Crumb[] }) {
  const { setCrumbs } = useContext(BreadcrumbContext);
  const key = JSON.stringify(items);
  useEffect(() => {
    setCrumbs(JSON.parse(key));
    return () => setCrumbs(null);
  }, [key, setCrumbs]);
  return null;
}

function fallbackCrumbs(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let href = "";
  for (const p of parts) {
    href += `/${p}`;
    crumbs.push({ label: SEGMENT_LABELS[p] ?? "Details", href });
  }
  return crumbs;
}

export function Breadcrumbs({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();
  const { crumbs } = useContext(BreadcrumbContext);
  const items = crumbs ?? fallbackCrumbs(pathname);
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link href="/" className="hidden shrink-0 text-muted hover:text-fg md:inline">
        {workspaceName.split(" ")[0]}
      </Link>
      {items.length === 0 && (
        <>
          <ChevronRight className="hidden size-3.5 shrink-0 text-subtle md:block" />
          <span className="font-medium text-fg">Overview</span>
        </>
      )}
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${c.label}-${i}`} className={`flex min-w-0 items-center gap-1.5 ${!last ? "hidden sm:flex" : ""}`}>
            <ChevronRight className={`size-3.5 shrink-0 text-subtle ${i === 0 ? "hidden md:block" : ""}`} />
            {last || !c.href ? (
              <span className={`truncate ${last ? "font-medium text-fg" : "text-muted"}`}>{c.label}</span>
            ) : (
              <Link href={c.href} className="truncate text-muted hover:text-fg">
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
