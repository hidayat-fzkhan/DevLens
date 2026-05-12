import { Router } from "express";
import { asyncHandler, badRequest, notFound } from "../middleware/errorHandler.js";
import { addRepo, listRepos, removeRepo } from "../repos.js";

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
      const body = (req.body ?? {}) as { url?: unknown; branch?: unknown };
      if (typeof body.url !== "string" || typeof body.branch !== "string") {
        throw badRequest("url and branch are required strings");
      }
      const repo = await addRepo({ url: body.url, branch: body.branch });
      res.status(201).json({ repo });
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
