import { basicPatAuthHeader, httpJson } from "./http.js";
import type {
  AdoAttachment,
  AdoWorkItem,
  AdoWorkItemFields,
  WorkItemCategory,
} from "./types.js";

type WiqlResponse = {
  workItems: Array<{ id: number; url: string }>;
};

type WorkItemsResponse = {
  value: Array<{
    id: number;
    url: string;
    fields?: AdoWorkItemFields;
    relations?: unknown;
  }>;
};

const BUG_WORK_ITEM_TYPES = ["Bug", "Defect"];
const BUG_TYPE_SET = new Set(BUG_WORK_ITEM_TYPES);
// Excluded from the User Stories bucket entirely — tasks are sub-work that
// shouldn't crowd the story list.
const USER_STORY_EXCLUDED_TYPES = [...BUG_WORK_ITEM_TYPES, "Task", "Feature", "Epic", "Test Plan"];

function buildWorkItemTypeClause(category: WorkItemCategory): string {
  if (category === "bugs") {
    return `AND [System.WorkItemType] IN (${buildWiqlList(BUG_WORK_ITEM_TYPES)})`;
  }
  return `AND [System.WorkItemType] NOT IN (${buildWiqlList(USER_STORY_EXCLUDED_TYPES)})`;
}

function escapeWiqlString(value: string): string {
  return value.replaceAll("'", "''");
}

function buildWiqlList(values: string[]): string {
  return values.map((value) => `'${escapeWiqlString(value)}'`).join(", ");
}

export function orgToBaseUrl(adoOrg: string): string {
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

function pickNumber(fields: AdoWorkItemFields | undefined, key: string): number | undefined {
  const v = fields?.[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

const NFR_KEY_CANDIDATES = [
  "Custom.NonFunctionalRequirements",
  "Custom.NonFunctionalRequirement",
  "Custom.NFR",
  "Custom.NonFunctional",
  "Microsoft.VSTS.Common.NonFunctionalRequirements",
];

function pickNonFunctionalRequirements(fields: AdoWorkItemFields | undefined): string | undefined {
  if (!fields) return undefined;
  for (const key of NFR_KEY_CANDIDATES) {
    const v = pickString(fields, key);
    if (v) return v;
  }
  // Fuzzy fallback — covers custom field reference names we haven't seen yet.
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== "string") continue;
    const lower = key.toLowerCase();
    if (lower.includes("nonfunctional") || lower.endsWith(".nfr") || lower.endsWith("/nfr")) {
      return value;
    }
  }
  return undefined;
}

type AdoRelation = {
  rel?: string;
  url?: string;
  attributes?: Record<string, unknown>;
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"]);

function inferImageFromName(name: string): boolean {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return false;
  return IMAGE_EXTENSIONS.has(lower.slice(dot));
}

function inferContentTypeFromName(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return undefined;
}

function extractAttachmentGuid(url: string): string | undefined {
  // ADO attachment URLs end in /_apis/wit/attachments/{guid}?...
  const match = /\/attachments\/([0-9a-f-]{8,})/i.exec(url);
  return match?.[1];
}

function pickAttachments(item: { relations?: unknown }): AdoAttachment[] {
  const raw = Array.isArray(item.relations) ? (item.relations as AdoRelation[]) : [];
  const attachments: AdoAttachment[] = [];

  for (const rel of raw) {
    if (rel.rel !== "AttachedFile" || typeof rel.url !== "string") continue;
    const guid = extractAttachmentGuid(rel.url);
    if (!guid) continue;
    const attrs = rel.attributes ?? {};
    const name =
      (typeof attrs["name"] === "string" && (attrs["name"] as string)) ||
      (typeof attrs["originalName"] === "string" && (attrs["originalName"] as string)) ||
      guid;
    const sizeRaw = attrs["resourceSize"];
    const size = typeof sizeRaw === "number" ? sizeRaw : undefined;
    const addedAt =
      typeof attrs["resourceCreatedDate"] === "string"
        ? (attrs["resourceCreatedDate"] as string)
        : typeof attrs["authorizedDate"] === "string"
          ? (attrs["authorizedDate"] as string)
          : undefined;
    const addedBy =
      typeof attrs["authorizedBy"] === "object" && attrs["authorizedBy"] !== null
        ? ((attrs["authorizedBy"] as Record<string, unknown>)["displayName"] as string | undefined)
        : undefined;
    const contentType = inferContentTypeFromName(name);

    attachments.push({
      id: guid,
      name,
      url: rel.url,
      size,
      addedAt,
      addedBy,
      contentType,
      isImage: inferImageFromName(name),
    });
  }

  return attachments;
}

function getCategoryForWorkItemType(workItemType: string | undefined): WorkItemCategory {
  if (workItemType && BUG_TYPE_SET.has(workItemType)) {
    return "bugs";
  }
  return "user-stories";
}

function mapWorkItem(
  item: { id: number; url: string; fields?: AdoWorkItemFields; relations?: unknown },
  baseUrl: string,
  projectPath: string,
): AdoWorkItem {
  const fields = item.fields;
  const workItemType = pickString(fields, "System.WorkItemType") ?? "Unknown";
  const category = getCategoryForWorkItemType(workItemType);

  return {
    id: item.id,
    category,
    workItemType,
    title: pickString(fields, "System.Title") ?? `(${workItemType} ${item.id})`,
    state: pickString(fields, "System.State"),
    createdDate: pickString(fields, "System.CreatedDate"),
    createdBy: pickIdentity(fields, "System.CreatedBy"),
    changedDate: pickString(fields, "System.ChangedDate"),
    changedBy: pickIdentity(fields, "System.ChangedBy"),
    assignedTo: pickIdentity(fields, "System.AssignedTo"),
    areaPath: pickString(fields, "System.AreaPath"),
    iterationPath: pickString(fields, "System.IterationPath"),
    tags: pickString(fields, "System.Tags"),
    priority: pickNumber(fields, "Microsoft.VSTS.Common.Priority"),
    severity: pickString(fields, "Microsoft.VSTS.Common.Severity"),
    storyPoints: pickNumber(fields, "Microsoft.VSTS.Scheduling.StoryPoints"),
    resolvedDate: pickString(fields, "Microsoft.VSTS.Common.ResolvedDate"),
    resolvedBy: pickIdentity(fields, "Microsoft.VSTS.Common.ResolvedBy"),
    resolvedReason: pickString(fields, "Microsoft.VSTS.Common.ResolvedReason"),
    description: pickString(fields, "System.Description"),
    reproSteps:
      pickString(fields, "Microsoft.VSTS.TCM.ReproSteps") ??
      pickString(fields, "Microsoft.VSTS.TCM.SystemInfo"),
    acceptanceCriteria: pickString(fields, "Microsoft.VSTS.Common.AcceptanceCriteria"),
    nonFunctionalRequirements: pickNonFunctionalRequirements(fields),
    attachments: pickAttachments(item),
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

  const statesClause = params.states.length
    ? `AND [System.State] IN (${buildWiqlList(params.states)})`
    : "";

  const workItemTypeClause = buildWorkItemTypeClause(params.category);

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

  // $expand=all returns fields + relations (which include attachment metadata).
  const workItemUrl = `${baseUrl}/_apis/wit/workitems?ids=${params.id}&$expand=all&api-version=7.0`;
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
