"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-danger/30 bg-danger/5 p-6 text-center">
      <AlertOctagon className="mx-auto size-8 text-danger" />
      <h2 className="mt-3 text-base font-semibold">Diese Seite konnte nicht geladen werden</h2>
      <p className="mt-1 text-sm text-muted">Bitte erneut versuchen. Besteht das Problem weiter, prüfe die Datenbankverbindung.</p>
      {error.digest && <p className="mt-2 font-mono text-2xs text-subtle">Fehler-ID: {error.digest}</p>}
      <Button className="mt-5" variant="secondary" onClick={reset}>
        <RotateCcw /> Erneut versuchen
      </Button>
    </div>
  );
}
