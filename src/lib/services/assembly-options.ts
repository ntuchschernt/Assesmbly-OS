import "server-only";
import { db } from "@/lib/db";
import { instructionOptions, machineOptions } from "./assembly";
import { projectOptions } from "./projects";
import { userOptions } from "./users";

/** All select options needed by the assembly forms (machine / assembly / work order). */
export async function assemblyFormOptions(workspaceId: string) {
  const [projects, machines, assemblies, instructions, users] = await Promise.all([
    projectOptions(workspaceId),
    machineOptions(workspaceId),
    db.assembly.findMany({ where: { machine: { project: { workspaceId } } }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, machineId: true, parentId: true } }),
    instructionOptions(workspaceId),
    userOptions(),
  ]);
  return {
    projects,
    machines,
    assemblies: assemblies.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` })),
    parents: assemblies.filter((a) => !a.parentId).map((a) => ({ value: a.id, label: `${a.code} · ${a.name}`, machineId: a.machineId })),
    instructions,
    users,
  };
}
export type AssemblyFormOptions = Awaited<ReturnType<typeof assemblyFormOptions>>;
