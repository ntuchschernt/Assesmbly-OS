import "server-only";
import { db } from "@/lib/db";
import { projectOptions } from "./projects";

export async function documentFormOptions(workspaceId: string) {
  const [projects, assemblies] = await Promise.all([
    projectOptions(workspaceId),
    db.assembly.findMany({ where: { machine: { project: { workspaceId } } }, orderBy: { code: "asc" }, include: { machine: { select: { projectId: true } } } }),
  ]);
  return { projects, assemblies: assemblies.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}`, projectId: a.machine.projectId })) };
}
