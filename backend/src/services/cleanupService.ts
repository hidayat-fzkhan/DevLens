import { cleanupWorkItem, type CleanupResult } from "../ai.js";
import type { loadConfig } from "../config.js";
import { stripHtmlToText } from "../text.js";
import type { AdoWorkItem } from "../types.js";
import { TtlCache } from "./cache.js";
import { buildWorkItemFingerprint, getAnalysisType } from "./workItemMapper.js";

const cleanupCache = new TtlCache<CleanupResult>();

function elapsedMs(startTime: number): number {
  return Math.round(performance.now() - startTime);
}

function buildCleanupCacheKey(params: {
  workItem: AdoWorkItem;
  model: string;
}): string {
  return [
    "cleanup",
    params.workItem.category,
    params.workItem.id,
    params.model,
    buildWorkItemFingerprint(params.workItem),
  ].join("::");
}

export async function buildCleanupForWorkItem(params: {
  workItem: AdoWorkItem;
  cfg: ReturnType<typeof loadConfig>;
}): Promise<CleanupResult> {
  const cacheKey = buildCleanupCacheKey({
    workItem: params.workItem,
    model: params.cfg.anthropicModel,
  });
  const cached = cleanupCache.get(cacheKey);
  if (cached) {
    console.log(
      `[AI][cleanup][cache] category=${params.workItem.category} ticketId=${params.workItem.id} hit=true`,
    );
    return cached;
  }

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

  const start = performance.now();
  const result = await cleanupWorkItem({
    analysisType: getAnalysisType(params.workItem.category),
    ticketTitle: params.workItem.title,
    ticketDescription: description,
    reproSteps,
    acceptanceCriteria,
    nonFunctionalRequirements,
    anthropicKey: params.cfg.anthropicKey,
    anthropicModel: params.cfg.anthropicModel,
  });
  console.log(
    `[AI][cleanup] category=${params.workItem.category} ticketId=${params.workItem.id} status=${result.status} elapsedMs=${elapsedMs(start)}`,
  );

  cleanupCache.set(cacheKey, result);
  return result;
}
