import { Router } from "express";
import { fetchWorkItemById } from "../ado.js";
import { loadConfig } from "../config.js";
import { asyncHandler, badRequest, notFound } from "../middleware/errorHandler.js";
import { findReposByIds } from "../repos.js";
import { buildImplementationPrompt } from "../services/implementationPromptService.js";
import {
  getQueryRepoIds,
  getQueryStringTrimmed,
} from "./query.js";

function elapsedMs(startTime: number): number {
  return Math.round(performance.now() - startTime);
}

export function createImplementationPromptRouter(): Router {
  const router = Router();

  router.get(
    "/user-stories/:ticketId/implementation-prompt",
    asyncHandler(async (req, res) => {
      const requestStart = performance.now();
      const cfg = loadConfig();
      const ticketId = Number(req.params.ticketId);
      const additionalGuidance = getQueryStringTrimmed(
        req.query,
        "additionalGuidance",
      );

      if (!Number.isFinite(ticketId)) {
        throw badRequest("Invalid user story id");
      }

      const repoIds = getQueryRepoIds(req.query);
      if (repoIds.length === 0) {
        throw badRequest(
          "Select at least one repository before generating the prompt.",
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
        category: "user-stories",
      });

      if (!workItem) {
        throw notFound(`User story ${ticketId} not found`);
      }

      const implementationPrompt = await buildImplementationPrompt({
        workItem,
        cfg,
        repos,
        additionalGuidance,
      });
      console.log(
        `[AI][impl-prompt] ticketId=${ticketId} model=${cfg.anthropicModel} elapsedMs=${elapsedMs(requestStart)}`,
      );

      res.json({
        generatedAt: new Date().toISOString(),
        ticketId,
        implementationPrompt,
      });
    }),
  );

  return router;
}
