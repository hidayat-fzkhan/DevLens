import {
  analyzeWithAI,
  hasEnoughDataForUserStoryAnalysis,
  type AIAnalysisResult,
} from "../ai.js";
import type { loadConfig } from "../config.js";
import { fetchGitHubRepoContext, fetchRecentCommits } from "../github.js";
import type { Repo } from "../repos.js";
import { stripHtmlToText } from "../text.js";
import type { AdoWorkItem, WorkItemAnalysisType } from "../types.js";
import { TtlCache } from "./cache.js";
import { buildWorkItemFingerprint, getAnalysisType } from "./workItemMapper.js";

export type RepoCommit = Awaited<ReturnType<typeof fetchRecentCommits>>[number] & {
  repoLabel: string;
};

export type EnrichedAnalysisResult = Omit<AIAnalysisResult, "suspectCommits"> & {
  suspectCommits: Array<{ sha: string; url?: string; repo?: string }>;
};

const analysisCache = new TtlCache<EnrichedAnalysisResult>();

function elapsedMs(startTime: number): number {
  return Math.round(performance.now() - startTime);
}

export function buildCacheKey(params: {
  workItem: AdoWorkItem;
  branchHeadSha: string;
  model: string;
}): string {
  return [
    params.workItem.category,
    params.workItem.id,
    params.branchHeadSha,
    params.model,
    buildWorkItemFingerprint(params.workItem),
  ].join("::");
}

export function getCachedAnalysis(cacheKey: string): EnrichedAnalysisResult | undefined {
  return analysisCache.get(cacheKey);
}

export function setCachedAnalysis(cacheKey: string, value: EnrichedAnalysisResult): void {
  analysisCache.set(cacheKey, value);
}

export function buildRepoLabelSummary(repos: Repo[]): string {
  return repos.map((r) => `${r.owner}/${r.name}@${r.branch}`).join(", ");
}

export function buildRepoStackSummary(repos: Repo[]): string | undefined {
  const lines: string[] = [];
  for (const r of repos) {
    const stackParts: string[] = [];
    if (r.language) stackParts.push(r.language);
    if (r.framework) stackParts.push(r.framework);
    if (stackParts.length === 0) continue;
    lines.push(`- ${r.owner}/${r.name} (branch ${r.branch}): ${stackParts.join(" / ")}`);
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
}

export function buildAggregateHeadSha(commits: RepoCommit[], repos: Repo[]): string {
  const byRepo = new Map<string, string>();
  for (const commit of commits) {
    if (!byRepo.has(commit.repoLabel)) {
      byRepo.set(commit.repoLabel, commit.sha);
    }
  }
  return repos
    .map((r) => {
      const label = `${r.owner}/${r.name}`;
      const head = byRepo.get(label)?.slice(0, 12) ?? r.branch;
      return `${r.id}:${head}`;
    })
    .sort((a, b) => a.localeCompare(b))
    .join("|");
}

export async function fetchAggregatedCommits(params: {
  repos: Repo[];
  token: string | undefined;
  countPerRepo: number;
}): Promise<RepoCommit[]> {
  const perRepo = await Promise.all(
    params.repos.map(async (repo) => {
      const repoLabel = `${repo.owner}/${repo.name}`;
      try {
        const commits = await fetchRecentCommits({
          repo: repo.url,
          token: params.token,
          branch: repo.branch,
          count: params.countPerRepo,
        });
        return commits.map<RepoCommit>((c) => ({ ...c, repoLabel }));
      } catch (err) {
        console.error(
          `[AI][commits] repo=${repoLabel} branch=${repo.branch} error=${(err as Error).message}`,
        );
        return [] as RepoCommit[];
      }
    }),
  );
  return perRepo.flat();
}

export async function fetchAggregatedRepoContext(params: {
  repos: Repo[];
  token: string | undefined;
  bugText: string;
  maxFilesPerRepo: number;
  maxCharsPerRepo: number;
}): Promise<string | undefined> {
  const sections = await Promise.all(
    params.repos.map(async (repo) => {
      const repoLabel = `${repo.owner}/${repo.name}`;
      try {
        const context = await fetchGitHubRepoContext({
          repo: repo.url,
          token: params.token,
          branch: repo.branch,
          bugText: params.bugText,
          maxFiles: params.maxFilesPerRepo,
          maxChars: params.maxCharsPerRepo,
        });
        if (!context) return undefined;
        return `### Repo: ${repoLabel} (branch: ${repo.branch})\n\n${context}`;
      } catch (err) {
        console.error(
          `[AI][github-context] repo=${repoLabel} branch=${repo.branch} error=${(err as Error).message}`,
        );
        return undefined;
      }
    }),
  );
  const filtered = sections.filter((s): s is string => Boolean(s));
  return filtered.length > 0 ? filtered.join("\n\n---\n\n") : undefined;
}

function shouldFetchRepoContext(params: {
  analysisType: WorkItemAnalysisType;
  aiResult: AIAnalysisResult;
}): boolean {
  if (params.aiResult.status !== "ready") return false;

  if (params.analysisType === "bug") {
    return (
      !params.aiResult.likelyCause ||
      params.aiResult.recommendations.length === 0
    );
  }

  return (
    !params.aiResult.implementationApproach ||
    params.aiResult.recommendations.length === 0 ||
    (params.aiResult.impactedAreas?.length ?? 0) === 0
  );
}

function buildNotEnoughDataAnalysis(): EnrichedAnalysisResult {
  return {
    analysisType: "user-story",
    status: "not-enough-data",
    summary: "Not enough data for AI analysis.",
    suspectCommits: [],
    recommendations: [],
    importantPoints: [],
    impactedAreas: [],
    dependencies: [],
  };
}

function enrichSuspectCommits(params: {
  aiResult: AIAnalysisResult;
  commits: RepoCommit[];
}): EnrichedAnalysisResult {
  const enrichedSuspects = params.aiResult.suspectCommits
    .filter((shaPrefix) => shaPrefix && shaPrefix.trim().length > 0)
    .map((shaPrefix) => {
      const trimmed = shaPrefix.trim();
      const commit = params.commits.find((c) =>
        c.sha.toLowerCase().startsWith(trimmed.toLowerCase()),
      );
      return {
        sha: trimmed,
        url: commit?.htmlUrl,
        repo: commit?.repoLabel,
      };
    })
    .filter((c) => c.sha.length >= 7);

  return {
    ...params.aiResult,
    suspectCommits: enrichedSuspects,
  };
}

export async function buildAiAnalysisForWorkItem(params: {
  workItem: AdoWorkItem;
  cfg: ReturnType<typeof loadConfig>;
  repos: Repo[];
}): Promise<EnrichedAnalysisResult> {
  const description = params.workItem.description
    ? stripHtmlToText(params.workItem.description)
    : undefined;
  const reproSteps = params.workItem.reproSteps
    ? stripHtmlToText(params.workItem.reproSteps)
    : undefined;
  const acceptanceCriteria = params.workItem.acceptanceCriteria
    ? stripHtmlToText(params.workItem.acceptanceCriteria)
    : undefined;
  const nonFunctionalRequirements = params.workItem.nonFunctionalRequirements
    ? stripHtmlToText(params.workItem.nonFunctionalRequirements)
    : undefined;

  if (
    params.workItem.category === "user-stories" &&
    !hasEnoughDataForUserStoryAnalysis({
      ticketDescription: description,
      acceptanceCriteria,
    })
  ) {
    return buildNotEnoughDataAnalysis();
  }

  const workItemContextText = [
    params.workItem.title,
    description,
    reproSteps,
    acceptanceCriteria,
    nonFunctionalRequirements,
  ]
    .filter(Boolean)
    .join("\n\n");

  const repoLabelSummary = buildRepoLabelSummary(params.repos);
  const repoStackSummary = buildRepoStackSummary(params.repos);
  const countPerRepo = Math.max(
    4,
    Math.floor(
      Math.min(params.cfg.githubCommits, 12) / Math.max(1, params.repos.length),
    ),
  );

  const commitsStart = performance.now();
  const commits = await fetchAggregatedCommits({
    repos: params.repos,
    token: params.cfg.githubToken,
    countPerRepo,
  });
  console.log(
    `[AI][commits] repos=[${repoLabelSummary}] count=${commits.length} elapsedMs=${elapsedMs(commitsStart)}`,
  );

  const branchHeadSha = buildAggregateHeadSha(commits, params.repos);
  const cacheKey = buildCacheKey({
    workItem: params.workItem,
    branchHeadSha,
    model: params.cfg.anthropicModel,
  });
  const cached = getCachedAnalysis(cacheKey);
  if (cached) {
    console.log(
      `[AI][cache] category=${params.workItem.category} ticketId=${params.workItem.id} hit=true`,
    );
    return cached;
  }
  console.log(
    `[AI][cache] category=${params.workItem.category} ticketId=${params.workItem.id} hit=false`,
  );

  const fastCommits = commits.slice(0, 8).map((c) => ({
    sha: c.sha,
    message: c.message,
    files: c.files.map((f) => f.filename),
    repo: c.repoLabel,
  }));

  const analysisType = getAnalysisType(params.workItem.category);
  const aiStart = performance.now();
  const baseAiResult = await analyzeWithAI({
    analysisType,
    ticketTitle: params.workItem.title,
    ticketDescription: description,
    reproSteps,
    acceptanceCriteria,
    nonFunctionalRequirements,
    repoContext: undefined,
    repoBranch: repoLabelSummary,
    repoStack: repoStackSummary,
    recentCommits: fastCommits,
    anthropicKey: params.cfg.anthropicKey,
    anthropicModel: params.cfg.anthropicModel,
  });
  console.log(
    `[AI][model-fast] category=${params.workItem.category} ticketId=${params.workItem.id} model=${params.cfg.anthropicModel} elapsedMs=${elapsedMs(aiStart)}`,
  );

  let finalAiResult = baseAiResult;

  if (shouldFetchRepoContext({ analysisType, aiResult: baseAiResult })) {
    const githubContextStart = performance.now();
    const maxFilesPerRepo = Math.max(
      2,
      Math.floor(4 / Math.max(1, params.repos.length)) + 1,
    );
    const maxCharsPerRepo = Math.max(
      2000,
      Math.floor(6000 / Math.max(1, params.repos.length)),
    );
    const repoContext = await fetchAggregatedRepoContext({
      repos: params.repos,
      token: params.cfg.githubToken,
      bugText: workItemContextText,
      maxFilesPerRepo,
      maxCharsPerRepo,
    });
    const githubElapsed = elapsedMs(githubContextStart);
    const fileSections = repoContext
      ? (repoContext.match(/(^|\n)File:\s/g) ?? []).length
      : 0;
    const chars = repoContext?.length ?? 0;
    console.log(
      `[AI][github-context] repos=[${repoLabelSummary}] files=${fileSections} chars=${chars} elapsedMs=${githubElapsed}`,
    );

    if (repoContext) {
      const deepAiStart = performance.now();
      finalAiResult = await analyzeWithAI({
        analysisType,
        ticketTitle: params.workItem.title,
        ticketDescription: description,
        reproSteps,
        acceptanceCriteria,
        nonFunctionalRequirements,
        repoContext,
        repoBranch: repoLabelSummary,
        repoStack: repoStackSummary,
        recentCommits: commits.slice(0, 12).map((c) => ({
          sha: c.sha,
          message: c.message,
          files: c.files.map((f) => f.filename),
          repo: c.repoLabel,
        })),
        anthropicKey: params.cfg.anthropicKey,
        anthropicModel: params.cfg.anthropicModel,
      });
      console.log(
        `[AI][model-deep] category=${params.workItem.category} ticketId=${params.workItem.id} model=${params.cfg.anthropicModel} elapsedMs=${elapsedMs(deepAiStart)}`,
      );
    }
  } else {
    console.log(
      `[AI][github-context] repos=[${repoLabelSummary}] skipped=true`,
    );
  }

  const enriched = enrichSuspectCommits({
    aiResult: finalAiResult,
    commits,
  });
  setCachedAnalysis(cacheKey, enriched);
  return enriched;
}
