import { Router } from "express";
import { fetchNewWorkItems, fetchWorkItemById } from "../ado.js";
import { loadConfig } from "../config.js";
import { asyncHandler, badRequest, notFound } from "../middleware/errorHandler.js";
import { findReposByIds } from "../repos.js";
import { buildAiAnalysisForWorkItem } from "../services/analysisService.js";
import { buildWorkItemResponse } from "../services/workItemMapper.js";
import type { WorkItemCategory } from "../types.js";
import { getQueryRepoIds, getQueryTicketId } from "./query.js";

const CATEGORY_LABELS: Record<WorkItemCategory, string> = {
  bugs: "Bug",
  "user-stories": "User story",
};

function elapsedMs(startTime: number): number {
  return Math.round(performance.now() - startTime);
}

function registerCategoryRoutes(params: {
  router: Router;
  route: string;
  category: WorkItemCategory;
  listKey: "bugs" | "userStories";
}) {
  params.router.get(
    `/${params.route}`,
    asyncHandler(async (req, res) => {
      const cfg = loadConfig();
      const ticketId = getQueryTicketId(req.query);

      const workItems = Number.isFinite(ticketId)
        ? await fetchWorkItemById({
            adoOrg: cfg.adoOrg,
            project: cfg.adoProject,
            pat: cfg.adoPat,
            id: ticketId as number,
            category: params.category,
          }).then((workItem) => (workItem ? [workItem] : []))
        : await fetchNewWorkItems({
            adoOrg: cfg.adoOrg,
            project: cfg.adoProject,
            pat: cfg.adoPat,
            category: params.category,
            top: cfg.adoTop,
            createdInLastDays: cfg.adoDays,
            states: cfg.adoStates,
            areaPath: cfg.adoAreaPath,
          });

      const response = workItems.map(buildWorkItemResponse);

      res.json({
        generatedAt: new Date().toISOString(),
        tickets: response,
        [params.listKey]: response,
      });
    }),
  );

  params.router.get(
    `/${params.route}/:ticketId/analysis`,
    asyncHandler(async (req, res) => {
      const requestStart = performance.now();
      const cfg = loadConfig();
      const ticketId = Number(req.params.ticketId);

      if (!Number.isFinite(ticketId)) {
        throw badRequest(
          `Invalid ${CATEGORY_LABELS[params.category].toLowerCase()} id`,
        );
      }

      const repoIds = getQueryRepoIds(req.query);
      if (repoIds.length === 0) {
        throw badRequest(
          "Select at least one repository before running analysis.",
        );
      }
      const repos = await findReposByIds(repoIds);
      if (repos.length === 0) {
        throw badRequest(
          "Selected repositories were not found. Refresh the list and try again.",
        );
      }

      const workItem = await fetchWorkItemById({
        adoOrg: cfg.adoOrg,
        project: cfg.adoProject,
        pat: cfg.adoPat,
        id: ticketId,
        category: params.category,
      });

      if (!workItem) {
        throw notFound(
          `${CATEGORY_LABELS[params.category]} ${ticketId} not found`,
        );
      }

      const aiAnalysis = await buildAiAnalysisForWorkItem({
        workItem,
        cfg,
        repos,
      });
      console.log(
        `[AI][analysis] category=${params.category} ticketId=${ticketId} model=${cfg.anthropicModel} elapsedMs=${elapsedMs(requestStart)}`,
      );

      res.json({
        generatedAt: new Date().toISOString(),
        ticketId,
        aiAnalysis,
      });
    }),
  );
}

export function createWorkItemRouter(): Router {
  const router = Router();
  registerCategoryRoutes({
    router,
    route: "bugs",
    category: "bugs",
    listKey: "bugs",
  });
  registerCategoryRoutes({
    router,
    route: "user-stories",
    category: "user-stories",
    listKey: "userStories",
  });
  return router;
}
