import { generateImplementationPrompt } from "../ai.js";
import type { loadConfig } from "../config.js";
import type { Repo } from "../repos.js";
import { stripHtmlToText } from "../text.js";
import type { AdoWorkItem } from "../types.js";
import { TtlCache } from "./cache.js";
import {
  buildAggregateHeadSha,
  buildCacheKey,
  buildRepoLabelSummary,
  fetchAggregatedCommits,
  fetchAggregatedRepoContext,
  getCachedAnalysis,
} from "./analysisService.js";

const implementationPromptCache = new TtlCache<string>();

export async function buildImplementationPrompt(params: {
  workItem: AdoWorkItem;
  cfg: ReturnType<typeof loadConfig>;
  repos: Repo[];
  additionalGuidance?: string;
}): Promise<string> {
  const description = params.workItem.description
    ? stripHtmlToText(params.workItem.description)
    : undefined;
  const acceptanceCriteria = params.workItem.acceptanceCriteria
    ? stripHtmlToText(params.workItem.acceptanceCriteria)
    : undefined;
  const nonFunctionalRequirements = params.workItem.nonFunctionalRequirements
    ? stripHtmlToText(params.workItem.nonFunctionalRequirements)
    : undefined;

  const repoLabelSummary = buildRepoLabelSummary(params.repos);
  const commits = await fetchAggregatedCommits({
    repos: params.repos,
    token: params.cfg.githubToken,
    countPerRepo: Math.max(
      4,
      Math.floor(
        Math.min(params.cfg.githubCommits, 8) / Math.max(1, params.repos.length),
      ),
    ),
  });

  const branchHeadSha = buildAggregateHeadSha(commits, params.repos);
  const analysisCacheKey = buildCacheKey({
    workItem: params.workItem,
    branchHeadSha,
    model: params.cfg.anthropicModel,
  });
  const promptCacheKey = `impl_prompt::${analysisCacheKey}`;
  const cached = params.additionalGuidance
    ? undefined
    : implementationPromptCache.get(promptCacheKey);

  if (cached) {
    console.log(
      `[AI][impl-prompt][cache] ticketId=${params.workItem.id} hit=true`,
    );
    return cached;
  }

  const cachedAnalysis = getCachedAnalysis(analysisCacheKey);
  let repoContext: string | undefined;

  if (cachedAnalysis) {
    console.log(
      `[AI][impl-prompt] ticketId=${params.workItem.id} reusing cached analysis, skipping GitHub context fetch`,
    );
  } else {
    const workItemContextText = [
      params.workItem.title,
      description,
      acceptanceCriteria,
      nonFunctionalRequirements,
    ]
      .filter(Boolean)
      .join("\n\n");
    const maxFilesPerRepo = Math.max(
      2,
      Math.floor(4 / Math.max(1, params.repos.length)) + 1,
    );
    const maxCharsPerRepo = Math.max(
      2000,
      Math.floor(6000 / Math.max(1, params.repos.length)),
    );
    repoContext = await fetchAggregatedRepoContext({
      repos: params.repos,
      token: params.cfg.githubToken,
      bugText: workItemContextText,
      maxFilesPerRepo,
      maxCharsPerRepo,
    });
  }

  const implementationPrompt = await generateImplementationPrompt({
    ticketTitle: params.workItem.title,
    ticketDescription: description,
    acceptanceCriteria,
    nonFunctionalRequirements,
    repoContext,
    cachedAnalysis: cachedAnalysis ?? undefined,
    repoBranch: repoLabelSummary,
    anthropicKey: params.cfg.anthropicKey,
    anthropicModel: params.cfg.anthropicModel,
    additionalGuidance: params.additionalGuidance,
  });

  implementationPromptCache.set(promptCacheKey, implementationPrompt);
  return implementationPrompt;
}
