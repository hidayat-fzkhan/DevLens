import { Router } from "express";
import { fetchAreaPaths, fetchIterationPaths } from "../ado.js";
import { loadConfig } from "../config.js";
import { asyncHandler, badRequest } from "../middleware/errorHandler.js";
import { getSettings, saveSettings } from "../settings.js";

export function createSettingsRouter(): Router {
  const router = Router();

  router.get(
    "/settings",
    asyncHandler(async (_req, res) => {
      const settings = await getSettings();
      res.json({ settings });
    }),
  );

  router.put(
    "/settings",
    asyncHandler(async (req, res) => {
      const body = (req.body ?? {}) as {
        areaPath?: unknown;
        iterationPath?: unknown;
        states?: unknown;
      };

      const areaPath =
        body.areaPath === null || body.areaPath === undefined
          ? undefined
          : typeof body.areaPath === "string"
            ? body.areaPath
            : null;
      if (areaPath === null) throw badRequest("areaPath must be a string or null");

      const iterationPath =
        body.iterationPath === null || body.iterationPath === undefined
          ? undefined
          : typeof body.iterationPath === "string"
            ? body.iterationPath
            : null;
      if (iterationPath === null) throw badRequest("iterationPath must be a string or null");

      let states: string[] | undefined;
      if (body.states !== undefined) {
        if (!Array.isArray(body.states) || !body.states.every((s) => typeof s === "string")) {
          throw badRequest("states must be an array of strings");
        }
        states = body.states as string[];
      }

      const next = await saveSettings({
        areaPath,
        iterationPath,
        states: states ?? [],
      });
      res.json({ settings: next });
    }),
  );

  router.get(
    "/ado/areas",
    asyncHandler(async (_req, res) => {
      const cfg = loadConfig();
      const areas = await fetchAreaPaths({
        adoOrg: cfg.adoOrg,
        project: cfg.adoProject,
        pat: cfg.adoPat,
      });
      res.json({ areas });
    }),
  );

  router.get(
    "/ado/iterations",
    asyncHandler(async (_req, res) => {
      const cfg = loadConfig();
      const iterations = await fetchIterationPaths({
        adoOrg: cfg.adoOrg,
        project: cfg.adoProject,
        pat: cfg.adoPat,
      });
      res.json({ iterations });
    }),
  );

  return router;
}
