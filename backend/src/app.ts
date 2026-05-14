import cors from "cors";
import express, { type Express } from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { createAttachmentsRouter } from "./routes/attachments.js";
import { createCleanupRouter } from "./routes/cleanup.js";
import { createImplementationPromptRouter } from "./routes/implementationPrompt.js";
import { createReposRouter } from "./routes/repos.js";
import { createSettingsRouter } from "./routes/settings.js";
import { createWorkItemRouter } from "./routes/workItems.js";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api", createWorkItemRouter());
  app.use("/api", createImplementationPromptRouter());
  app.use("/api", createCleanupRouter());
  app.use("/api", createAttachmentsRouter());
  app.use("/api", createReposRouter());
  app.use("/api", createSettingsRouter());

  app.use(errorHandler);

  return app;
}
