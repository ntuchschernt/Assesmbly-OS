"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button variant="secondary" size="sm" className="mb-4" onClick={() => window.print()}>
      <Printer /> Drucken
    </Button>
  );
}
