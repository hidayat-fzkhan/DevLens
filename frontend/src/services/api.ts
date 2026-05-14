import type {
  ApiAreasResponse,
  ApiCleanupResponse,
  ApiImplementationPromptResponse,
  ApiIterationsResponse,
  ApiRepoResponse,
  ApiReposResponse,
  ApiSettingsResponse,
  ApiTicketAnalysisResponse,
  ApiTicketListResponse,
  TicketCategory,
  WorkItemFilters,
} from "../types";

function getApiBase(): string {
  return import.meta.env.VITE_API_BASE || "";
}

export async function fetchTickets(
  category: TicketCategory,
  ticketId?: string,
  signal?: AbortSignal,
): Promise<ApiTicketListResponse> {
  const base = getApiBase();
  const path = ticketId
    ? `/api/${category}?ticketId=${encodeURIComponent(ticketId)}`
    : `/api/${category}`;
  const url = `${base}${path}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as ApiTicketListResponse;
}

function parseErrorBody(text: string, status: number): string {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error && typeof parsed.error === "string") return parsed.error;
  } catch {
    // fall through
  }
  return text || `Request failed: ${status}`;
}

export async function fetchTicketCleanup(
  category: TicketCategory,
  ticketId: number,
  signal?: AbortSignal,
): Promise<ApiCleanupResponse> {
  const base = getApiBase();
  const url = `${base}/api/${category}/${ticketId}/cleanup`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseErrorBody(text, res.status));
  }
  return (await res.json()) as ApiCleanupResponse;
}

export async function fetchTicketAnalysis(
  category: TicketCategory,
  ticketId: number,
  repoIds: string[],
  signal?: AbortSignal,
): Promise<ApiTicketAnalysisResponse> {
  const base = getApiBase();
  const repoQuery = repoIds.length
    ? `?repoIds=${encodeURIComponent(repoIds.join(","))}`
    : "";
  const url = `${base}/api/${category}/${ticketId}/analysis${repoQuery}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseErrorBody(text, res.status));
  }
  return (await res.json()) as ApiTicketAnalysisResponse;
}

export async function fetchRepos(signal?: AbortSignal): Promise<ApiReposResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/repos`, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as ApiReposResponse;
}

export async function addRepo(input: {
  url: string;
  branch: string;
  language?: string;
  framework?: string;
}): Promise<ApiRepoResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/repos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text || `Request failed: ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) message = parsed.error;
    } catch {
      // keep original message
    }
    throw new Error(message);
  }
  return (await res.json()) as ApiRepoResponse;
}

export async function updateRepoMetadata(
  id: string,
  input: { language?: string | null; framework?: string | null },
): Promise<ApiRepoResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/repos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseErrorBody(text, res.status));
  }
  return (await res.json()) as ApiRepoResponse;
}

export async function deleteRepo(id: string): Promise<void> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/repos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
}

export async function fetchSettings(signal?: AbortSignal): Promise<ApiSettingsResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/settings`, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseErrorBody(text, res.status));
  }
  return (await res.json()) as ApiSettingsResponse;
}

export async function saveSettings(
  input: Partial<WorkItemFilters>,
): Promise<ApiSettingsResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseErrorBody(text, res.status));
  }
  return (await res.json()) as ApiSettingsResponse;
}

export async function fetchAreas(signal?: AbortSignal): Promise<ApiAreasResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/ado/areas`, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseErrorBody(text, res.status));
  }
  return (await res.json()) as ApiAreasResponse;
}

export async function fetchIterations(signal?: AbortSignal): Promise<ApiIterationsResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/ado/iterations`, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseErrorBody(text, res.status));
  }
  return (await res.json()) as ApiIterationsResponse;
}

export async function fetchImplementationPrompt(
  ticketId: number,
  repoIds: string[],
  signal?: AbortSignal,
  guidance?: string,
): Promise<ApiImplementationPromptResponse> {
  const base = getApiBase();
  const search = new URLSearchParams();
  if (repoIds.length) search.set("repoIds", repoIds.join(","));
  if (guidance) search.set("additionalGuidance", guidance);
  const qs = search.toString();
  const url = `${base}/api/user-stories/${ticketId}/implementation-prompt${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseErrorBody(text, res.status));
  }
  return (await res.json()) as ApiImplementationPromptResponse;
}
