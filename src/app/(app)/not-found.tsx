import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-grid mx-auto mt-16 max-w-md rounded-lg border border-border p-8 text-center">
      <SearchX className="mx-auto size-8 text-muted" />
      <h2 className="mt-3 text-base font-semibold">Datensatz nicht gefunden</h2>
      <p className="mt-1 text-sm text-muted">Der Eintrag existiert nicht (mehr) oder gehört zu einem anderen Workspace.</p>
      <Link href="/" className={buttonVariants({ variant: "secondary", className: "mt-5" })}>
        Zur Übersicht
      </Link>
    </div>
  );
}
