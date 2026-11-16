import { FileImage, FileSpreadsheet, FileText, PencilRuler, ClipboardCheck, ClipboardList } from "lucide-react";
import type { DocumentType } from "@prisma/client";

const ICONS: Record<DocumentType, React.ComponentType<{ className?: string }>> = {
  PDF: FileText,
  DRAWING: PencilRuler,
  IMAGE: FileImage,
  WORK_INSTRUCTION: ClipboardList,
  INSPECTION_REPORT: ClipboardCheck,
  BOM: FileSpreadsheet,
};

export function DocIcon({ type, className = "size-4" }: { type: DocumentType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={className} />;
}
