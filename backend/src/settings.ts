import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type WorkItemFilters = {
  areaPath?: string;
  iterationPath?: string;
  states: string[];
};

const DEFAULT_STATES = ["New", "Active"];

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(moduleDir, "..", "data");
const dataFile = path.join(dataDir, "settings.json");

let cache: WorkItemFilters | undefined;
let writeQueue: Promise<void> = Promise.resolve();

function normalize(value: Partial<WorkItemFilters> | undefined): WorkItemFilters {
  const areaPath = typeof value?.areaPath === "string" && value.areaPath.trim().length > 0
    ? value.areaPath.trim()
    : undefined;
  const iterationPath = typeof value?.iterationPath === "string" && value.iterationPath.trim().length > 0
    ? value.iterationPath.trim()
    : undefined;
  const rawStates = Array.isArray(value?.states) ? value!.states : DEFAULT_STATES;
  const states = rawStates
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
  return {
    areaPath,
    iterationPath,
    states: states.length > 0 ? states : [...DEFAULT_STATES],
  };
}

async function readFromDisk(): Promise<WorkItemFilters | undefined> {
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkItemFilters>;
    return normalize(parsed);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

async function writeToDisk(value: WorkItemFilters): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await mkdir(dataDir, { recursive: true });
    await writeFile(dataFile, JSON.stringify(value, null, 2), "utf8");
  });
  return writeQueue;
}

export async function getSettings(): Promise<WorkItemFilters> {
  if (cache) return cache;
  const fromDisk = await readFromDisk();
  if (fromDisk) {
    cache = fromDisk;
    return cache;
  }
  cache = { states: [...DEFAULT_STATES] };
  return cache;
}

export async function saveSettings(value: Partial<WorkItemFilters>): Promise<WorkItemFilters> {
  const next = normalize(value);
  cache = next;
  await writeToDisk(next);
  return next;
}

export function areFiltersConfigured(filters: WorkItemFilters): boolean {
  return Boolean(filters.areaPath);
}
