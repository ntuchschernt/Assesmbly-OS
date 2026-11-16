import "server-only";
import { db } from "@/lib/db";

/** Project → Machine → Assembly → Subassembly tree for the active workspace. */
export async function getAssemblyTree(workspaceId: string, projectId?: string) {
  const projects = await db.project.findMany({
    where: { workspaceId, status: { not: "ARCHIVED" }, ...(projectId ? { id: projectId } : {}) },
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
      machines: {
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          serialNumber: true,
          description: true,
          projectId: true,
          assemblies: {
            where: { parentId: null },
            orderBy: { code: "asc" },
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
              _count: { select: { workOrders: true, qualityIssues: { where: { status: { in: ["NEW", "INVESTIGATING", "ACTION_REQUIRED", "IN_REVIEW"] } } } } },
              children: { orderBy: { code: "asc" }, select: { id: true, code: true, name: true, status: true, _count: { select: { workOrders: true } } } },
            },
          },
        },
      },
    },
  });
  // Projects that already have machines first
  return projects.sort((a, b) => Number(b.machines.length > 0) - Number(a.machines.length > 0));
}
export type AssemblyTree = Awaited<ReturnType<typeof getAssemblyTree>>;

export function getAssembly(workspaceId: string, id: string) {
  return db.assembly.findFirst({
    where: { id, machine: { project: { workspaceId } } },
    include: {
      machine: { include: { project: { select: { id: true, key: true, name: true } } } },
      parent: { select: { id: true, code: true, name: true } },
      children: { orderBy: { code: "asc" }, include: { responsible: { select: { name: true } } } },
      responsible: { select: { id: true, name: true } },
      tasks: { orderBy: { number: "asc" }, include: { assignee: { select: { name: true } } } },
      documents: { orderBy: { number: "asc" } },
      qualityIssues: { orderBy: { createdAt: "desc" } },
      workInstructions: { orderBy: { number: "asc" } },
    },
  });
}

export async function machineOptions(workspaceId: string) {
  const machines = await db.machine.findMany({ where: { project: { workspaceId } }, orderBy: { code: "asc" }, include: { project: { select: { key: true } } } });
  return machines.map((m) => ({ value: m.id, label: `${m.project.key} · ${m.code} ${m.name}` }));
}

export async function instructionOptions(workspaceId: string) {
  const wis = await db.workInstruction.findMany({ where: { workspaceId }, orderBy: { number: "asc" }, select: { id: true, number: true, title: true, status: true } });
  return wis.map((w) => ({ value: w.id, label: `${w.number} · ${w.title} (${w.status})` }));
}
