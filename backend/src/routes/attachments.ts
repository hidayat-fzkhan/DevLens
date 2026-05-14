import { Router } from "express";
import { orgToBaseUrl } from "../ado.js";
import { loadConfig } from "../config.js";
import { basicPatAuthHeader } from "../http.js";
import { asyncHandler, badRequest, HttpError } from "../middleware/errorHandler.js";

// Allow only canonical ADO attachment GUIDs to prevent open-proxy / SSRF.
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createAttachmentsRouter(): Router {
  const router = Router();

  router.get(
    "/attachments/:guid",
    asyncHandler(async (req, res) => {
      const guid = req.params.guid;
      if (!GUID_RE.test(guid)) {
        throw badRequest("Invalid attachment id");
      }

      const cfg = loadConfig();
      const baseUrl = orgToBaseUrl(cfg.adoOrg);
      const project = encodeURIComponent(cfg.adoProject);
      const fileNameParam =
        typeof req.query.name === "string" && req.query.name.trim()
          ? `&fileName=${encodeURIComponent(req.query.name.trim())}`
          : "";

      const url = `${baseUrl}/${project}/_apis/wit/attachments/${guid}?download=false${fileNameParam}&api-version=7.0`;
      const upstream = await fetch(url, {
        headers: { Authorization: basicPatAuthHeader(cfg.adoPat) },
      });

      if (!upstream.ok) {
        const body = await upstream.text().catch(() => "");
        throw new HttpError(
          upstream.status === 404 ? 404 : 502,
          upstream.status === 404
            ? "Attachment not found"
            : `Upstream error fetching attachment: ${upstream.status} ${body.slice(0, 200)}`,
        );
      }

      const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
      const contentLength = upstream.headers.get("content-length");
      res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      // Cache aggressively — attachment bodies are immutable per GUID.
      res.setHeader("Cache-Control", "private, max-age=3600");

      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.send(buffer);
    }),
  );

  return router;
}
