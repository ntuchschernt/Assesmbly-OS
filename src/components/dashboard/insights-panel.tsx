import Link from "next/link";
import { AlertOctagon, AlertTriangle, Info, Sparkles } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Insight } from "@/lib/ai/insights";

const ICON = { critical: <AlertOctagon className="text-danger" />, warning: <AlertTriangle className="text-warning" />, info: <Info className="text-info" /> };

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <CardHeader
        icon={<Sparkles />}
        title="KI-Hinweise"
        description="Erzeugt vom Demo-Provider aus regelbasierter Analyse des Datenbestands"
        action={<Badge tone="warning">Simuliert</Badge>}
      />
      <ul className="divide-y divide-border">
        {insights.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Keine Auffälligkeiten erkannt.</li>}
        {insights.map((i) => (
          <li key={i.id} className="flex gap-3 px-4 py-3">
            <span className="mt-0.5 [&_svg]:size-4">{ICON[i.level]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{i.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{i.detail}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="text-2xs text-subtle">Quellen:</span>
                {i.sources.map((s) => (
                  <Link key={s.href} href={s.href} className="font-mono text-2xs text-primary hover:text-primary-hover">
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
