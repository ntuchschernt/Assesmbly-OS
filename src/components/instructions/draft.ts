/** Shared (server + client) editor draft types and factories. */
export type StepDraft = {
  key: string;
  id?: string;
  title: string;
  description: string;
  tools: string;
  parts: string;
  expectedResult: string;
  isCheckpoint: boolean;
  safetyCritical: boolean;
  imageUrl: string;
  responsibleId: string;
};

export type InstructionDraft = {
  title: string;
  description: string;
  assemblyId: string;
  tools: string;
  materials: string;
  safetyNotes: string;
  imageUrls: string;
  steps: StepDraft[];
};

let keySeq = 0;
export const newStepKey = () => `new-${Date.now()}-${keySeq++}`;
export const emptyStep = (): StepDraft => ({ key: newStepKey(), title: "", description: "", tools: "", parts: "", expectedResult: "", isCheckpoint: false, safetyCritical: false, imageUrl: "", responsibleId: "" });
