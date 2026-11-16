import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7 shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="6" fill="#272C30" />
      <path d="M8 23 16 7l8 16h-4.2L16 15.2 12.2 23z" fill="#FF7A1A" />
      <rect x="13" y="20" width="6" height="3" fill="#F4F5F6" />
    </svg>
  );
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && (
        <div className="leading-none">
          <div className="text-sm font-bold tracking-[0.14em] text-fg">
            ASSEMBLY <span className="text-primary">OS</span>
          </div>
          <div className="mt-1 text-[10px] tracking-wide text-subtle">Industrial Operations Platform</div>
        </div>
      )}
    </div>
  );
}
