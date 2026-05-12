# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevLens is a two-tier web app that pulls work items from Azure DevOps (TFS), enriches them with recent GitHub commits from one or more user-selected repositories, and runs AI triage via the Anthropic Claude API. It supports two work item categories: **bugs** and **user stories**.

## Commands

### Backend

```bash
cd backend
npm install
npm run dev       # Nodemon + tsx, watches src/ for changes
npm run build     # Compile to dist/
npm start         # Run compiled output
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # Vite dev server (proxies /api → localhost:4000)
npm run build     # TypeScript check + Vite production build
npm run preview   # Serve production build locally
```

### Running the full stack

Start backend first (`npm run dev` in `backend/`), then frontend (`npm run dev` in `frontend/`). The Vite dev server proxies `/api` requests to port 4000.

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `ADO_ORG` | Yes | Azure org name or full base URL (for on-prem TFS use full URL) |
| `ADO_PROJECT` | Yes | Azure DevOps project name |
| `ADO_PAT` | Yes | Azure DevOps Personal Access Token |
| `ANTHROPIC_KEY` | Yes | Anthropic API key |
| `GITHUB_TOKEN` | No | Recommended for private repos and higher GitHub rate limits. Always read from env. Repositories are managed entirely via the UI (`/api/repos`), not via env. |
| `ADO_DAYS` | No | Days back to query (default: 7) |
| `ADO_TOP` | No | Max tickets returned (default: 10) |
| `ADO_STATES` | No | Comma-separated states (default: `New,Active`) |
| `ADO_AREA_PATH` | No | Azure area path filter |
| `GITHUB_COMMITS` | No | Upper bound on commits inspected per analysis (default: 50) |
| `API_PORT` | No | Backend port (default: 4000) |
| `ANTHROPIC_MODEL` | No | Claude model (default: `claude-sonnet-4-6`) |

## Architecture

### Data Flow

```
Frontend (React/Vite) → Express API (port 4000) → Azure DevOps REST API
                                                  → GitHub REST API (Octokit, fanned out per selected repo)
                                                  → Anthropic Claude API
```

### Backend layout (`backend/src/`)

The Express app is composed in `app.ts`; `server.ts` is just the `app.listen` entry point. Business logic lives in `services/`, route handlers in `routes/`, cross-cutting concerns in `middleware/`.

- **`server.ts`** — Entry point. Loads config, creates the app, starts listening.
- **`app.ts`** — Express composition: cors, json, mounts the three routers, registers the central error handler.
- **`routes/workItems.ts`** — `GET /api/{bugs|user-stories}` (list) and `GET /api/{bugs|user-stories}/:id/analysis`. Builds work-item responses and delegates AI analysis to `analysisService`.
- **`routes/implementationPrompt.ts`** — `GET /api/user-stories/:id/implementation-prompt`. Delegates to `implementationPromptService`.
- **`routes/repos.ts`** — `GET/POST/DELETE /api/repos` for the persisted repo list.
- **`routes/query.ts`** — Shared query-param parsers (`getQueryTicketId`, `getQueryRepoIds`, `getQueryStringTrimmed`).
- **`middleware/errorHandler.ts`** — `HttpError`, `badRequest`/`notFound` factories, `asyncHandler` wrapper, and a central error handler that serializes errors to `{ error }` JSON. Route handlers `throw` typed errors instead of repeating try/catch.
- **`services/analysisService.ts`** — Two-stage multi-repo orchestrator (`buildAiAnalysisForWorkItem`). Fans out commit + repo-context fetches across all selected repos (`fetchAggregatedCommits`, `fetchAggregatedRepoContext`), tags each commit with its `[owner/name]` repo label, computes a composite cache key (`buildAggregateHeadSha` joins each repo's head SHA), and enriches suspect commits with per-repo URLs.
- **`services/implementationPromptService.ts`** — Reuses cached analysis when available; otherwise fetches per-repo context and calls Claude.
- **`services/workItemMapper.ts`** — Shapes ADO work items for API responses; `buildWorkItemFingerprint` feeds the cache key.
- **`services/cache.ts`** — Generic `TtlCache<T>` class (15-minute default TTL). Used for analysis and implementation-prompt caches.
- **`ado.ts`** — Azure DevOps integration. Uses WIQL queries with Basic auth (PAT). Supports both cloud (`dev.azure.com`) and on-premise TFS via full base URL. Maps ADO fields → internal `AdoWorkItem` type.
- **`github.ts`** — GitHub integration via Octokit. `fetchRecentCommits` and `fetchGitHubRepoContext` operate on a single repo; the analysis service fans them out.
- **`ai.ts`** — Anthropic SDK integration. `analyzeWithAI` and `generateImplementationPrompt`. Commit entries now carry an optional `repo` label which gets rendered as `[owner/name]` in the prompt so the model can attribute suspect commits to a repo.
- **`repos.ts`** — Persisted repo store at `backend/data/repos.json` (gitignored). Starts empty on first run; users add repos via the UI / `POST /api/repos`. Exports `listRepos`, `addRepo`, `removeRepo`, `findReposByIds`.
- **`config.ts`** — Single source of truth for env var reads. Always import config from here; never read `process.env` directly elsewhere.
- **`types.ts`** — Shared TypeScript types (`AdoWorkItem`, `WorkItemCategory`, `WorkItemAnalysisType`, `GitCommit`).
- **`rank.ts`**, **`text.ts`**, **`http.ts`** — Utilities (commit scoring, HTML stripping, fetch wrapper).

### Two-Stage AI Analysis (multi-repo)

Every `/api/{category}/:id/analysis` request requires `?repoIds=id1,id2,…`. The orchestrator:
1. Resolves repo IDs → `Repo[]` via `findReposByIds`.
2. **Fast pass** — fetches commits **per repo in parallel** (count-per-repo scaled down by selection size), labels each commit with `[owner/name]`, runs Claude with no repo file context.
3. **Deep pass** (only when the fast pass is weak) — fetches scored repo context **per repo in parallel** (max files/chars budget divided across repos), prefixes each section with `### Repo: owner/name (branch: …)`, runs Claude again.
4. Caches the enriched result under `[category, ticketId, aggregateHeadSha, model, ticketFingerprint]`, where `aggregateHeadSha` is the sorted join of each selected repo's head SHA. Changing the selection changes the cache key.
5. Suspect commits in the response include `{ sha, url, repo }`.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/bugs` | List recent bugs. Optional `?ticketId=123`. |
| GET | `/api/bugs/:id/analysis?repoIds=…` | AI analysis for a specific bug. **`repoIds` is required.** |
| GET | `/api/user-stories` | List recent user stories. Optional `?ticketId=123`. |
| GET | `/api/user-stories/:id/analysis?repoIds=…` | AI analysis for a user story. **`repoIds` is required.** |
| GET | `/api/user-stories/:id/implementation-prompt?repoIds=…` | Generate implementation prompt. **`repoIds` is required.** Optional `?additionalGuidance=`. |
| GET | `/api/repos` | List persisted repos. |
| POST | `/api/repos` | Add a repo. Body: `{ url, branch }`. |
| DELETE | `/api/repos/:id` | Remove a repo. |

Missing or unknown `repoIds` produce a 400 with `{ "error": "Select at least one repository before running analysis." }`.

### Frontend layout (`frontend/src/`)

- **`App.tsx`** — Root component with manual client-side routing (no router library). Routes: `/` (home), `/bugs`, `/bugs/analyze/:id`, `/user-stories`, `/user-stories/analyze/:id`.
- **`hooks/useBugs.ts`** — Central state hook (`useTickets`). Exposes `runAnalysis(ticketId, repoIds)` and `loadImplementationPrompt(ticketId, repoIds, guidance?)`. **Analysis is no longer auto-triggered** — the user must select repos and click Analyze.
- **`services/api.ts`** — Typed fetch wrapper. `fetchTicketAnalysis` and `fetchImplementationPrompt` accept `repoIds: string[]` and append `?repoIds=`; errors from the backend's `{ error }` JSON are surfaced as the thrown message.
- **`components/repos/RepoManager.tsx`** — Home-page card. Lists persisted repos and lets the user add/remove them.
- **`components/repos/RepoSelector.tsx`** — Ticket-detail card. Checkbox list of repos (none preselected). The "Analyze" button is disabled until at least one repo is checked.
- **`components/bug/`** — `BugList → BugCard → (BugDetails + RepoSelector + AIAnalysis + ImplementationPrompt)`. `BugCard` remembers the selected repo IDs and forwards them to the impl-prompt generator. `AIAnalysis` renders `[owner/name]` next to each suspect commit when present.
- **`components/search/SearchBar.tsx`** — Accepts a ticket ID or leaves blank to list recent tickets; has a stop/cancel button for in-flight requests.
- **`components/layout/`** — `Layout` wrapper and `Header` navigation component.
- **`components/common/`** — `EmptyState` and `ErrorMessage` shared display components.
- **`types/index.ts`** — Frontend API types mirroring backend response shapes. `Repo`, `ApiReposResponse`, and suspect-commit `repo?: string` were added for the multi-repo feature.
- **`utils/formatters.ts`** — Date and text formatting helpers.

### Work Item Type Mapping

The backend category `"bugs"` queries ADO for types `Bug` and `Defect`. The category `"user-stories"` queries for type `User Story`. This mapping is in `ado.ts` / `routes/workItems.ts`.

### Implementation Prompt Generation

`GET /api/user-stories/:id/implementation-prompt?repoIds=…` (optional `?additionalGuidance=`) reuses a cached analysis if available (same `repoIds` selection) — otherwise fetches per-repo context — then calls Claude to produce a structured prompt (max 1 800 tokens) ready to paste into an AI coding assistant. The result is cached under `impl_prompt::<analysisCacheKey>`.

### Sparse Ticket Guard

In `ai.ts`, user stories with fewer than 80 combined characters or fewer than 12 words in their description + acceptance criteria return `status: "not-enough-data"` without calling the Claude API.

### Persisted State

- `backend/data/repos.json` — array of `{ id, url, branch, owner, name, addedAt }`. Created empty on first request to `/api/repos`; repos are added via the UI. Gitignored.
- No DB. All other state (analysis cache, impl-prompt cache) is in-process and clears on restart.
