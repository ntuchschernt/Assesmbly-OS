import "server-only";
import { db } from "@/lib/db";

/** Image files available for steps (documents of type IMAGE with a stored binary). */
export async function imageOptions(workspaceId: string) {
  const docs = await db.document.findMany({
    where: { workspaceId, type: "IMAGE" },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    orderBy: { number: "asc" },
  });
  return docs
    .filter((d) => d.versions[0]?.storageKey)
    .map((d) => ({ value: `/api/files/${d.versions[0]!.storageKey!.split("/").map(encodeURIComponent).join("/")}?inline=1`, label: `${d.number} · ${d.title}` }));
}

export async function assemblySelectOptions(workspaceId: string) {
  const a = await db.assembly.findMany({ where: { machine: { project: { workspaceId } } }, orderBy: { code: "asc" }, include: { machine: { select: { code: true } } } });
  return a.map((x) => ({ value: x.id, label: `${x.machine.code} · ${x.code} ${x.name}` }));
}
