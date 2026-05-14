export type AdoWorkItemFields = Record<string, unknown>;

export type WorkItemCategory = "bugs" | "user-stories";

export type WorkItemAnalysisType = "bug" | "user-story";

export type AdoAttachment = {
  id: string;
  name: string;
  url: string;
  size?: number;
  addedAt?: string;
  addedBy?: string;
  contentType?: string;
  isImage: boolean;
};

export type AdoWorkItem = {
  id: number;
  category: WorkItemCategory;
  workItemType: string;
  title: string;
  state?: string;
  createdDate?: string;
  createdBy?: string;
  changedDate?: string;
  changedBy?: string;
  assignedTo?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  priority?: number;
  severity?: string;
  storyPoints?: number;
  resolvedDate?: string;
  resolvedBy?: string;
  resolvedReason?: string;
  description?: string;
  reproSteps?: string;
  acceptanceCriteria?: string;
  nonFunctionalRequirements?: string;
  attachments?: AdoAttachment[];
  url?: string;
  webUrl?: string;
};

export type GitCommitFile = {
  filename: string;
  status?: string;
};

export type GitCommit = {
  sha: string;
  htmlUrl?: string;
  message: string;
  authorName?: string;
  date?: string;
  files: GitCommitFile[];
};

export type RankedCommit = GitCommit & { score: number; matchedTokens: string[] };
