import { stripHtmlToText, truncate } from "../text.js";
import type {
  AdoWorkItem,
  WorkItemAnalysisType,
  WorkItemCategory,
} from "../types.js";

export function getAnalysisType(category: WorkItemCategory): WorkItemAnalysisType {
  return category === "bugs" ? "bug" : "user-story";
}

export function buildWorkItemFingerprint(workItem: AdoWorkItem): string {
  return [
    workItem.title,
    workItem.state,
    workItem.description,
    workItem.reproSteps,
    workItem.acceptanceCriteria,
    workItem.nonFunctionalRequirements,
  ]
    .filter(Boolean)
    .join("|")
    .slice(0, 2000);
}

export function buildWorkItemText(workItem: {
  category: WorkItemCategory;
  description?: string;
  reproSteps?: string;
  acceptanceCriteria?: string;
  nonFunctionalRequirements?: string;
}): {
  summary?: string;
  description?: string;
  reproSteps?: string;
  acceptanceCriteria?: string;
  nonFunctionalRequirements?: string;
} {
  const description = workItem.description
    ? stripHtmlToText(workItem.description)
    : undefined;
  const repro = workItem.reproSteps
    ? stripHtmlToText(workItem.reproSteps)
    : undefined;
  const acceptanceCriteria = workItem.acceptanceCriteria
    ? stripHtmlToText(workItem.acceptanceCriteria)
    : undefined;
  const nonFunctionalRequirements = workItem.nonFunctionalRequirements
    ? stripHtmlToText(workItem.nonFunctionalRequirements)
    : undefined;
  const summarySource =
    workItem.category === "bugs"
      ? repro || description
      : acceptanceCriteria || description;

  return {
    description,
    reproSteps: repro,
    acceptanceCriteria,
    nonFunctionalRequirements,
    summary: summarySource ? truncate(summarySource, 600) : undefined,
  };
}

export function buildWorkItemResponse(workItem: AdoWorkItem) {
  const { summary, description, reproSteps, acceptanceCriteria, nonFunctionalRequirements } =
    buildWorkItemText(workItem);

  return {
    id: workItem.id,
    category: workItem.category,
    workItemType: workItem.workItemType,
    title: workItem.title,
    state: workItem.state,
    createdDate: workItem.createdDate,
    createdBy: workItem.createdBy,
    changedDate: workItem.changedDate,
    changedBy: workItem.changedBy,
    assignedTo: workItem.assignedTo,
    areaPath: workItem.areaPath,
    iterationPath: workItem.iterationPath,
    tags: workItem.tags,
    priority: workItem.priority,
    severity: workItem.severity,
    storyPoints: workItem.storyPoints,
    resolvedDate: workItem.resolvedDate,
    resolvedBy: workItem.resolvedBy,
    resolvedReason: workItem.resolvedReason,
    attachments: workItem.attachments,
    webUrl: workItem.webUrl,
    summary,
    description,
    reproSteps,
    acceptanceCriteria,
    nonFunctionalRequirements,
    aiAnalysis: undefined as unknown,
  };
}
