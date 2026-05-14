import { Router } from "express";
import { fetchWorkItemById } from "../ado.js";
import { loadConfig } from "../config.js";
import { asyncHandler, badRequest, notFound } from "../middleware/errorHandler.js";
import { buildCleanupForWorkItem } from "../services/cleanupService.js";
import type { WorkItemCategory } from "../types.js";

const CATEGORY_LABELS: Record<WorkItemCategory, string> = {
  bugs: "Bug",
  "user-stories": "User story",
};

function elapsedMs(startTime: number): number {
  return Math.round(performance.now() - startTime);
}

function registerCleanupRoute(router: Router, route: string, category: WorkItemCategory) {
  router.get(
    `/${route}/:ticketId/cleanup`,
    asyncHandler(async (req, res) => {
      const requestStart = performance.now();
      const cfg = loadConfig();
      const ticketId = Number(req.params.ticketId);

      if (!Number.isFinite(ticketId)) {
        throw badRequest(`Invalid ${CATEGORY_LABELS[category].toLowerCase()} id`);
      }

      const workItem = await fetchWorkItemById({
        adoOrg: cfg.adoOrg,
        project: cfg.adoProject,
        pat: cfg.adoPat,
        id: ticketId,
        category,
      });

      if (!workItem) {
        throw notFound(`${CATEGORY_LABELS[category]} ${ticketId} not found`);
      }

      const cleanup = await buildCleanupForWorkItem({ workItem, cfg });
      console.log(
        `[AI][cleanup-route] category=${category} ticketId=${ticketId} elapsedMs=${elapsedMs(requestStart)}`,
      );

      res.json({
        generatedAt: new Date().toISOString(),
        ticketId,
        cleanup,
      });
    }),
  );
}

export function createCleanupRouter(): Router {
  const router = Router();
  registerCleanupRoute(router, "bugs", "bugs");
  registerCleanupRoute(router, "user-stories", "user-stories");
  return router;
}
