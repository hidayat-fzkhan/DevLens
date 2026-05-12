# Copilot Instructions

Project summary:
- This repo is "DevLens" (code name: devlens, version: 1.0.0) — an AI-powered work item analysis tool for Azure DevOps bugs and user stories.
- It has two main apps:
  - `backend/` — Node.js + TypeScript Express API. Layered: `routes/` (thin HTTP handlers), `services/` (business logic), `middleware/` (error handler), plus integration modules (`ado.ts`, `github.ts`, `ai.ts`, `repos.ts`).
  - `frontend/` — Vite + React UI that calls the backend API and shows tickets, suspect commits, repo selection, and implementation guidance.

Key workflows:
- Backend API: `cd backend && npm run dev` (nodemon + tsx, watches `src/`).
- Frontend UI: `cd frontend && npm run dev`.

Important config (`backend/.env`):
- Required: `ADO_ORG`, `ADO_PROJECT`, `ADO_PAT`, `ANTHROPIC_KEY`.
- Optional: `GITHUB_TOKEN` (recommended for private repos; read from env, never persisted), `ADO_AREA_PATH`, `ADO_DAYS`, `ADO_TOP`, `ADO_STATES`, `GITHUB_COMMITS`, `API_PORT`, `ANTHROPIC_MODEL`.
- Repositories are managed in the UI (Home page → Repo Manager) and persisted to `backend/data/repos.json`. There is no env var for repos.

Core behavior:
- Fetch Azure DevOps bugs / user stories using WIQL.
- Persist a list of GitHub repositories in `backend/data/repos.json`; manage via `GET/POST/DELETE /api/repos`.
- On ticket detail, the user selects one or more configured repos; analysis fans out across them in parallel and feeds Claude a merged, repo-tagged context.
- `GET /api/{bugs|user-stories}/:id/analysis?repoIds=…` and `GET /api/user-stories/:id/implementation-prompt?repoIds=…` both require `repoIds`.

When editing:
- Keep backend code in `backend/src` and frontend code in `frontend/src`.
- Backend: thin routes, business logic in `services/`, throw `badRequest(...)` / `notFound(...)` from `middleware/errorHandler.ts` instead of writing your own try/catch.
- Frontend: feature-based component folders (`bug/`, `repos/`, etc.); all network state lives in `useTickets` (`hooks/useBugs.ts`).
- Prefer small, focused changes and update `README.md`, `ARCHITECTURE.md`, and `CLAUDE.md` if commands or structure change.
