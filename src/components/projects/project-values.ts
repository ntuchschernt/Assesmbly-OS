import type { Project } from "@prisma/client";
import { toDateInput } from "@/lib/utils";
import type { ProjectFormValues } from "./project-form-dialog";

export function toProjectValues(p: Project): ProjectFormValues {
  return {
    name: p.name,
    key: p.key,
    customer: p.customer ?? "",
    description: p.description ?? "",
    status: p.status,
    priority: p.priority,
    ownerId: p.ownerId ?? "",
    startDate: toDateInput(p.startDate),
    endDate: toDateInput(p.endDate),
  };
}
