import cors from "cors";
import express, { type Express } from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { createImplementationPromptRouter } from "./routes/implementationPrompt.js";
import { createReposRouter } from "./routes/repos.js";
import { createWorkItemRouter } from "./routes/workItems.js";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api", createWorkItemRouter());
  app.use("/api", createImplementationPromptRouter());
  app.use("/api", createReposRouter());

  app.use(errorHandler);

  return app;
}
