import { Router } from "express";
import { asyncHandler, badRequest, notFound } from "../middleware/errorHandler.js";
import { addRepo, listRepos, removeRepo, updateRepoMetadata } from "../repos.js";

function optionalStringOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

export function createReposRouter(): Router {
  const router = Router();

  router.get(
    "/repos",
    asyncHandler(async (_req, res) => {
      const repos = await listRepos();
      res.json({ repos });
    }),
  );

  router.post(
    "/repos",
    asyncHandler(async (req, res) => {
      const body = (req.body ?? {}) as {
        url?: unknown;
        branch?: unknown;
        language?: unknown;
        framework?: unknown;
      };
      if (typeof body.url !== "string" || typeof body.branch !== "string") {
        throw badRequest("url and branch are required strings");
      }
      const repo = await addRepo({
        url: body.url,
        branch: body.branch,
        language: typeof body.language === "string" ? body.language : undefined,
        framework: typeof body.framework === "string" ? body.framework : undefined,
      });
      res.status(201).json({ repo });
    }),
  );

  router.patch(
    "/repos/:id",
    asyncHandler(async (req, res) => {
      const body = (req.body ?? {}) as {
        language?: unknown;
        framework?: unknown;
      };
      const language = optionalStringOrNull(body.language);
      const framework = optionalStringOrNull(body.framework);
      if (language === undefined && framework === undefined) {
        throw badRequest("Provide language and/or framework to update");
      }
      const updated = await updateRepoMetadata(req.params.id, { language, framework });
      if (!updated) {
        throw notFound("Repository not found");
      }
      res.json({ repo: updated });
    }),
  );

  router.delete(
    "/repos/:id",
    asyncHandler(async (req, res) => {
      const removed = await removeRepo(req.params.id);
      if (!removed) {
        throw notFound("Repository not found");
      }
      res.json({ ok: true });
    }),
  );

  return router;
}
