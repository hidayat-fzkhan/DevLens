export type TicketCategory = "bugs" | "user-stories";

export type ApiTicketAnalysis = {
  analysisType: "bug" | "user-story";
  status: "ready" | "not-enough-data";
  summary: unknown;
  likelyCause?: string;
  implementationApproach?: string;
  suspectCommits: Array<{
    sha: string;
    url?: string;
    repo?: string;
  }>;
  recommendations: string[];
  importantPoints?: string[];
  impactedAreas?: string[];
  dependencies?: string[];
};

export type ApiTicket = {
  id: number;
  category: TicketCategory;
  workItemType: string;
  title: string;
  state?: string;
  createdDate?: string;
  assignedTo?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  webUrl?: string;
  summary?: string;
  description?: string;
  reproSteps?: string;
  acceptanceCriteria?: string;
  aiAnalysis?: ApiTicketAnalysis;
  implementationPrompt?: string;
};

export type ApiImplementationPromptResponse = {
  generatedAt: string;
  ticketId: number;
  implementationPrompt: string;
};

export type ApiTicketListResponse = {
  generatedAt: string;
  tickets: ApiTicket[];
  filtersConfigured?: boolean;
};

export type WorkItemFilters = {
  areaPath?: string;
  iterationPath?: string;
  states: string[];
};

export type AreaPath = {
  path: string;
  name: string;
};

export type IterationPath = {
  path: string;
  name: string;
  startDate?: string;
  finishDate?: string;
};

export type ApiSettingsResponse = {
  settings: WorkItemFilters;
};

export type ApiAreasResponse = {
  areas: AreaPath[];
};

export type ApiIterationsResponse = {
  iterations: IterationPath[];
};

export type ApiTicketAnalysisResponse = {
  generatedAt: string;
  ticketId: number;
  aiAnalysis: ApiTicketAnalysis;
};

export type Repo = {
  id: string;
  url: string;
  branch: string;
  owner: string;
  name: string;
  addedAt: string;
};

export type ApiReposResponse = {
  repos: Repo[];
};

export type ApiRepoResponse = {
  repo: Repo;
};
