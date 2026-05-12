import { basicPatAuthHeader, httpJson } from "./http.js";
import type { AdoWorkItem, AdoWorkItemFields, WorkItemCategory } from "./types.js";

type WiqlResponse = {
  workItems: Array<{ id: number; url: string }>;
};

type WorkItemsResponse = {
  value: Array<{
    id: number;
    url: string;
    fields?: AdoWorkItemFields;
  }>;
};

const WORK_ITEM_TYPES_BY_CATEGORY: Record<WorkItemCategory, string[]> = {
  bugs: ["Bug", "Defect"],
  "user-stories": ["User Story"],
};

function escapeWiqlString(value: string): string {
  return value.replaceAll("'", "''");
}

function buildWiqlList(values: string[]): string {
  return values.map((value) => `'${escapeWiqlString(value)}'`).join(", ");
}

function orgToBaseUrl(adoOrg: string): string {
  const trimmed = adoOrg.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/+$/, "");
  }
  return `https://dev.azure.com/${trimmed}`;
}

function pickString(fields: AdoWorkItemFields | undefined, key: string): string | undefined {
  const v = fields?.[key];
  return typeof v === "string" ? v : undefined;
}

function pickIdentity(fields: AdoWorkItemFields | undefined, key: string): string | undefined {
  const v = fields?.[key];
  if (!v || typeof v !== "object") return undefined;
  const displayName = (v as Record<string, unknown>)["displayName"];
  return typeof displayName === "string" ? displayName : undefined;
}

function getCategoryForWorkItemType(workItemType: string | undefined): WorkItemCategory | null {
  if (!workItemType) {
    return null;
  }

  if (WORK_ITEM_TYPES_BY_CATEGORY.bugs.includes(workItemType)) {
    return "bugs";
  }

  if (WORK_ITEM_TYPES_BY_CATEGORY["user-stories"].includes(workItemType)) {
    return "user-stories";
  }

  return null;
}

function mapWorkItem(item: { id: number; url: string; fields?: AdoWorkItemFields }, baseUrl: string, projectPath: string): AdoWorkItem {
  const fields = item.fields;
  const workItemType = pickString(fields, "System.WorkItemType") ?? "Unknown";
  const category = getCategoryForWorkItemType(workItemType) ?? "bugs";

  return {
    id: item.id,
    category,
    workItemType,
    title: pickString(fields, "System.Title") ?? `(${workItemType} ${item.id})`,
    state: pickString(fields, "System.State"),
    createdDate: pickString(fields, "System.CreatedDate"),
    assignedTo: pickIdentity(fields, "System.AssignedTo"),
    areaPath: pickString(fields, "System.AreaPath"),
    iterationPath: pickString(fields, "System.IterationPath"),
    tags: pickString(fields, "System.Tags"),
    description: pickString(fields, "System.Description"),
    reproSteps:
      pickString(fields, "Microsoft.VSTS.TCM.ReproSteps") ??
      pickString(fields, "Microsoft.VSTS.TCM.SystemInfo"),
    acceptanceCriteria: pickString(fields, "Microsoft.VSTS.Common.AcceptanceCriteria"),
    url: item.url,
    webUrl: `${baseUrl}/${projectPath}/_workitems/edit/${item.id}`,
  } satisfies AdoWorkItem;
}

export async function fetchNewWorkItems(params: {
  adoOrg: string;
  project: string;
  pat: string;
  category: WorkItemCategory;
  top: number;
  areaPath: string;
  states: string[];
  iterationPath?: string;
}): Promise<AdoWorkItem[]> {
  const baseUrl = orgToBaseUrl(params.adoOrg);
  const projectPath = encodeURIComponent(params.project);
  const workItemTypes = WORK_ITEM_TYPES_BY_CATEGORY[params.category];

  const statesClause = params.states.length
    ? `AND [System.State] IN (${buildWiqlList(params.states)})`
    : "";

  const workItemTypeClause = workItemTypes.length
    ? `AND [System.WorkItemType] IN (${buildWiqlList(workItemTypes)})`
    : "";

  const areaClause = `AND [System.AreaPath] UNDER '${escapeWiqlString(params.areaPath)}'`;

  const iterationClause = params.iterationPath
    ? `AND [System.IterationPath] UNDER '${escapeWiqlString(params.iterationPath)}'`
    : "";

  // Keep WIQL simple and broadly compatible.
  const wiql = {
    query: `
SELECT [System.Id]
FROM WorkItems
WHERE
  [System.TeamProject] = @project
  ${workItemTypeClause}
  ${iterationClause}
  ${statesClause}
  ${areaClause}
ORDER BY [System.ChangedDate] DESC`
  };

  const wiqlUrl = `${baseUrl}/${encodeURIComponent(
    params.project
  )}/_apis/wit/wiql?api-version=7.0`;

  const auth = basicPatAuthHeader(params.pat);
  const wiqlResp = await httpJson<WiqlResponse>(wiqlUrl, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(wiql)
  });

  const ids = wiqlResp.workItems.slice(0, Math.max(0, params.top)).map((w) => w.id);
  if (ids.length === 0) return [];

  const workItemsUrl = `${baseUrl}/_apis/wit/workitems?ids=${ids.join(",")}&$expand=fields&api-version=7.0`;
  const itemsResp = await httpJson<WorkItemsResponse>(workItemsUrl, {
    headers: {
      Authorization: auth
    }
  });

  return itemsResp.value
    .map((item) => mapWorkItem(item, baseUrl, projectPath))
    .filter((item) => item.category === params.category);
}

type ClassificationNode = {
  id: number;
  identifier?: string;
  name: string;
  structureType: "area" | "iteration";
  hasChildren?: boolean;
  path?: string;
  children?: ClassificationNode[];
  attributes?: {
    startDate?: string;
    finishDate?: string;
  };
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

function normalizeNodePath(rawPath: string | undefined, project: string): string {
  if (!rawPath) return project;
  // ADO returns paths like "\Project\Iteration\Sprint 1" — strip the
  // "\Iteration" or "\Area" virtual segment so it matches what WIQL expects
  // ("Project\Sprint 1" or "Project\Sub\Sprint 1").
  const trimmed = rawPath.replace(/^\\+/, "").replace(/\\+$/, "");
  return trimmed
    .replace(new RegExp(String.raw`^${project}\\(Iteration|Area)\\?`, "i"), `${project}\\`)
    .replace(new RegExp(String.raw`^${project}\\(Iteration|Area)$`, "i"), project);
}

function collectAreas(node: ClassificationNode, project: string, acc: AreaPath[]): void {
  const path = normalizeNodePath(node.path, project);
  acc.push({ path, name: node.name });
  if (node.children) {
    for (const child of node.children) {
      collectAreas(child, project, acc);
    }
  }
}

function collectIterationLeaves(
  node: ClassificationNode,
  project: string,
  acc: IterationPath[],
): void {
  if (!node.children || node.children.length === 0) {
    const path = normalizeNodePath(node.path, project);
    acc.push({
      path,
      name: node.name,
      startDate: node.attributes?.startDate,
      finishDate: node.attributes?.finishDate,
    });
    return;
  }
  for (const child of node.children) {
    collectIterationLeaves(child, project, acc);
  }
}

async function fetchClassificationTree(params: {
  adoOrg: string;
  project: string;
  pat: string;
  kind: "Areas" | "Iterations";
}): Promise<ClassificationNode> {
  const baseUrl = orgToBaseUrl(params.adoOrg);
  const projectPath = encodeURIComponent(params.project);
  const url = `${baseUrl}/${projectPath}/_apis/wit/classificationnodes/${params.kind}?$depth=10&api-version=7.0`;
  return httpJson<ClassificationNode>(url, {
    headers: { Authorization: basicPatAuthHeader(params.pat) },
  });
}

export async function fetchAreaPaths(params: {
  adoOrg: string;
  project: string;
  pat: string;
}): Promise<AreaPath[]> {
  const root = await fetchClassificationTree({ ...params, kind: "Areas" });
  const out: AreaPath[] = [];
  collectAreas(root, params.project, out);
  return out;
}

export async function fetchIterationPaths(params: {
  adoOrg: string;
  project: string;
  pat: string;
}): Promise<IterationPath[]> {
  const root = await fetchClassificationTree({ ...params, kind: "Iterations" });
  const out: IterationPath[] = [];
  collectIterationLeaves(root, params.project, out);
  // Sort by start date desc so most recent sprints appear first; undated last.
  out.sort((a, b) => {
    if (a.startDate && b.startDate) return b.startDate.localeCompare(a.startDate);
    if (a.startDate) return -1;
    if (b.startDate) return 1;
    return a.path.localeCompare(b.path);
  });
  return out;
}

export async function fetchWorkItemById(params: {
  adoOrg: string;
  project: string;
  pat: string;
  id: number;
  category?: WorkItemCategory;
}): Promise<AdoWorkItem | null> {
  const baseUrl = orgToBaseUrl(params.adoOrg);
  const projectPath = encodeURIComponent(params.project);
  const auth = basicPatAuthHeader(params.pat);

  const workItemUrl = `${baseUrl}/_apis/wit/workitems?ids=${params.id}&$expand=fields&api-version=7.0`;
  const itemsResp = await httpJson<WorkItemsResponse>(workItemUrl, {
    headers: {
      Authorization: auth
    }
  });

  const item = itemsResp.value[0];
  if (!item) return null;
  const workItem = mapWorkItem(item, baseUrl, projectPath);

  if (params.category && workItem.category !== params.category) {
    return null;
  }

  return workItem;
}
