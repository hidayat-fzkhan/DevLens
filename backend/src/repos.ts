import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRepo } from "./github.js";

export type Repo = {
  id: string;
  url: string;
  branch: string;
  owner: string;
  name: string;
  addedAt: string;
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(moduleDir, "..", "data");
const dataFile = path.join(dataDir, "repos.json");

let cache: Repo[] | undefined;
let writeQueue: Promise<void> = Promise.resolve();

function normalizeUrl(url: string): string {
  return url.trim().replace(/\.git$/, "").replace(/\/+$/, "");
}

async function readFromDisk(): Promise<Repo[] | undefined> {
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is Repo =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.url === "string" &&
        typeof entry.branch === "string",
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw err;
  }
}

async function writeToDisk(repos: Repo[]): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await mkdir(dataDir, { recursive: true });
    await writeFile(dataFile, JSON.stringify(repos, null, 2), "utf8");
  });
  return writeQueue;
}

export async function listRepos(): Promise<Repo[]> {
  if (cache) return cache;
  const fromDisk = await readFromDisk();
  if (fromDisk !== undefined) {
    cache = fromDisk;
    return cache;
  }
  cache = [];
  await writeToDisk(cache);
  return cache;
}

export async function addRepo(input: {
  url: string;
  branch: string;
}): Promise<Repo> {
  const url = normalizeUrl(input.url);
  const branch = input.branch.trim();
  if (!url) throw new Error("Repository URL is required");
  if (!branch) throw new Error("Branch is required");

  const { owner, repo } = parseRepo(url);
  const repos = await listRepos();

  const duplicate = repos.find(
    (r) => r.owner.toLowerCase() === owner.toLowerCase() &&
      r.name.toLowerCase() === repo.toLowerCase() &&
      r.branch.toLowerCase() === branch.toLowerCase(),
  );
  if (duplicate) {
    throw new Error(`Repository ${owner}/${repo} (${branch}) already added`);
  }

  const next: Repo = {
    id: randomUUID(),
    url,
    branch,
    owner,
    name: repo,
    addedAt: new Date().toISOString(),
  };
  cache = [...repos, next];
  await writeToDisk(cache);
  return next;
}

export async function findReposByIds(ids: string[]): Promise<Repo[]> {
  if (ids.length === 0) return [];
  const all = await listRepos();
  const seen = new Set<string>();
  const result: Repo[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const match = all.find((r) => r.id === id);
    if (match) {
      result.push(match);
      seen.add(id);
    }
  }
  return result;
}

export async function removeRepo(id: string): Promise<boolean> {
  const repos = await listRepos();
  const next = repos.filter((r) => r.id !== id);
  if (next.length === repos.length) return false;
  cache = next;
  await writeToDisk(cache);
  return true;
}
