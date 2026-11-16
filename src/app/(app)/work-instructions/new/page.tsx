import { requireContext } from "@/lib/auth/context";
import { userOptions } from "@/lib/services/users";
import { assemblySelectOptions, imageOptions } from "@/lib/services/instruction-options";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { InstructionEditor, emptyStep } from "@/components/instructions/instruction-editor";

export const metadata = { title: "Neue Montageanweisung" };

export default async function NewInstructionPage({ searchParams }: { searchParams: Promise<{ assembly?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const [assemblies, users, images] = await Promise.all([assemblySelectOptions(ctx.workspaceId), userOptions(), imageOptions(ctx.workspaceId)]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Neue Montageanweisung" meta={<Badge tone="neutral" dot>Draft</Badge>} description="Entwürfe sind nicht gültig für die Produktion. Nach dem Anlegen folgen Prüfung, Freigabe und Veröffentlichung." />
      <InstructionEditor
        initial={{ title: "", description: "", assemblyId: sp.assembly ?? "", tools: "", materials: "", safetyNotes: "", imageUrls: "", steps: [emptyStep()] }}
        assemblies={assemblies}
        users={users}
        images={images}
      />
    </div>
  );
}
