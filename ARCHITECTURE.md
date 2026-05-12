# DevLens Architecture

## Overview

DevLens is a two-tier web application that pulls work items from Azure DevOps (ADO/TFS), enriches them with recent GitHub commit history from **one or more user-selected repositories**, and runs AI triage via the Anthropic Claude API. It supports two work item categories: **bugs** and **user stories**.

---

## System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                  │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │ SearchBar│  │ RepoManager │  │ AIAnalysis /         │ │
│  │          │  │ RepoSelector│  │ ImplementationPrompt │ │
│  └──────────┘  └─────────────┘  └──────────────────────┘ │
│                     ↕ /api/* (proxied by Vite dev server) │
└──────────────────────────────────────────────────────────┘
                          ↕ HTTP :4000
┌──────────────────────────────────────────────────────────┐
│              Express API Server (Node/TS)                 │
│   app.ts → routes/* → services/* → integrations/*         │
│                                                           │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │  ado.ts  │  │ github.ts  │  │       ai.ts          │  │
│  │  (WIQL)  │  │ (Octokit)  │  │  (Anthropic SDK)     │  │
│  └──────────┘  └────────────┘  └──────────────────────┘  │
│         ↕              ↕                   ↕              │
└─────────┼──────────────┼───────────────────┼─────────────┘
          ↓              ↓                   ↓
   Azure DevOps      GitHub REST         Anthropic
   REST API          API (per repo)      Claude API
```

---

## Repository Layout

```
DevLens/
├── backend/
│   └── src/
│       ├── server.ts                              # entry: app.listen
│       ├── app.ts                                 # Express composition
│       ├── routes/
│       │   ├── query.ts                           # shared query-param parsers
│       │   ├── workItems.ts                       # /api/{bugs|user-stories}[/analysis]
│       │   ├── implementationPrompt.ts            # /api/user-stories/:id/implementation-prompt
│       │   └── repos.ts                           # /api/repos CRUD
│       ├── services/
│       │   ├── cache.ts                           # generic TtlCache<T>
│       │   ├── workItemMapper.ts                  # response shaping + fingerprint
│       │   ├── analysisService.ts                 # two-stage multi-repo orchestrator
│       │   └── implementationPromptService.ts     # impl-prompt orchestrator
│       ├── middleware/
│       │   └── errorHandler.ts                    # HttpError + asyncHandler + central errors
│       ├── ado.ts                                 # Azure DevOps integration
│       ├── ai.ts                                  # Claude API
│       ├── github.ts                              # GitHub integration (single repo)
│       ├── repos.ts                               # persisted repo store
│       ├── config.ts                              # env loader
│       ├── http.ts                                # fetch wrapper
│       ├── text.ts                                # text utilities
│       ├── rank.ts                                # commit scoring helper
│       └── types.ts                               # shared types
└── frontend/
    └── src/
        ├── App.tsx                                # root + manual SPA routing
        ├── main.tsx                               # entry; wraps App in ThemeModeProvider
        ├── theme/                                 # design system
        │   ├── palette.ts                         # dark + light tokens (incl. border, category, state)
        │   ├── typography.ts                      # sans + mono stacks
        │   ├── theme.ts                           # buildTheme(mode); flat surfaces, hairline borders
        │   └── ThemeModeProvider.tsx              # provider + useThemeMode()
        ├── ui/                                    # thin MUI wrappers (Mono, Pill, Surface, Section, KeyValue)
        ├── hooks/useBugs.ts                       # central state hook
        ├── services/api.ts                        # typed fetch client
        ├── types/index.ts                         # API types
        ├── utils/formatters.ts                    # date/text helpers
        └── components/
            ├── layout/                            # Layout, Header (includes theme toggle)
            ├── bug/                               # BugList, BugCard, BugDetails,
            │                                       AIAnalysis, ImplementationPrompt
            ├── repos/                             # RepoManager, RepoSelector
            ├── search/                            # SearchBar
            └── common/                            # EmptyState, ErrorMessage
```

---

## Backend Modules

### `server.ts` & `app.ts` — Entry and composition

- `server.ts` only loads config, calls `createApp()`, and listens.
- `app.ts` wires cors + json middleware, mounts the three routers under `/api`, and registers the central error handler last.

### `routes/` — HTTP handlers

Route handlers are thin: they parse the request, throw typed `HttpError`s for validation failures, and delegate work to services. The `asyncHandler` wrapper forwards rejected promises to the central error middleware, so handlers contain no try/catch.

- **`routes/workItems.ts`** — Lists and analysis for both `bugs` and `user-stories`. `registerCategoryRoutes()` generates parallel routes for both categories.
- **`routes/implementationPrompt.ts`** — User-story implementation-prompt endpoint.
- **`routes/repos.ts`** — CRUD for the persisted repo list.
- **`routes/query.ts`** — `getQueryRepoIds`, `getQueryTicketId`, `getQueryStringTrimmed`.

### `middleware/errorHandler.ts`

- `HttpError(status, message)` — base class.
- `badRequest(message)` / `notFound(message)` — factories.
- `asyncHandler(fn)` — wraps async handlers and forwards errors to `next`.
- `errorHandler` — central Express error handler. Logs 5xx; serializes all errors to `{ error }` JSON with the appropriate status.

### `services/cache.ts`

- `TtlCache<T>` — generic in-process Map with TTL eviction on read. Default 15 minutes. Used by both analysis and impl-prompt caches.

### `services/workItemMapper.ts`

- `buildWorkItemResponse` — shapes an `AdoWorkItem` into the API response payload.
- `buildWorkItemFingerprint` — used inside cache keys to invalidate on ticket content changes.
- `getAnalysisType` — `bugs → "bug"`, `user-stories → "user-story"`.

### `services/analysisService.ts` — the orchestrator

Owns the two-stage AI analysis pipeline:

- `fetchAggregatedCommits({ repos, token, countPerRepo })` — fans out `fetchRecentCommits` across all selected repos in parallel, tagging each commit with `repoLabel = "owner/name"`.
- `fetchAggregatedRepoContext({ repos, token, bugText, … })` — same fan-out for `fetchGitHubRepoContext`, joining per-repo sections with `### Repo: owner/name (branch: …)` headers.
- `buildAggregateHeadSha` — sorts each selected repo's head SHA and joins them; this drives the cache key, so changing the selection invalidates the cache.
- `buildCacheKey` — `[category, ticketId, aggregateHeadSha, model, ticketFingerprint]`.
- `buildAiAnalysisForWorkItem({ workItem, cfg, repos })` — runs the fast pass, conditionally the deep pass, enriches suspect commits with per-repo URLs, caches, returns.

### `services/implementationPromptService.ts`

- `buildImplementationPrompt({ workItem, cfg, repos, additionalGuidance? })` — uses the same multi-repo fan-out and cache key as the analysis path. Reuses a cached analysis when available; otherwise fetches fresh per-repo context.

### `ado.ts` — Azure DevOps

- WIQL queries against the ADO REST API with Basic auth (PAT).
- Supports both cloud (`dev.azure.com`) and on-premise TFS via full base URL.
- Maps ADO fields to `AdoWorkItem`, including `TCM.ReproSteps` and `Microsoft.VSTS.Common.AcceptanceCriteria`.
- Work item type mapping: `Bug`/`Defect` → `"bugs"`, `User Story` → `"user-stories"`.

### `github.ts` — GitHub (single repo)

- `fetchRecentCommits` — commit message, author, changed files via Octokit.
- `fetchGitHubRepoContext` — scores and fetches relevant repo files by matching ticket keywords against the git tree. Up to 8 concurrent blob fetches, capped at the configured `maxFiles` / `maxChars` per call.
- Fan-out across multiple repos is the orchestrator's responsibility, not this module's.

### `ai.ts` — Claude

- Builds category-specific prompts (bugs vs. user stories).
- Each `recentCommits` entry can carry a `repo` label; the prompt formats them as `[owner/name] <sha8> | <message> | <files>` so the model can attribute suspect commits.
- JSON parsing with a regex fallback for partial parses.
- Sparse-data guard for user stories: < 80 chars or < 12 words across description + acceptance criteria returns `status: "not-enough-data"` without calling the API.
- Max output tokens: 900 (bugs), 1 400 (user stories), 1 800 (implementation prompt).

### `repos.ts` — Persisted repo store

- File-backed JSON store at `backend/data/repos.json` (gitignored).
- Starts empty on first read; repos are added entirely through the UI / `POST /api/repos`.
- Each entry: `{ id, url, branch, owner, name, addedAt }`.
- API: `listRepos`, `addRepo`, `removeRepo`, `findReposByIds`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bugs` | List recent bugs. Optional `?ticketId=`. |
| GET | `/api/bugs/:id/analysis?repoIds=…` | AI analysis. **`repoIds` required.** |
| GET | `/api/user-stories` | List recent user stories. Optional `?ticketId=`. |
| GET | `/api/user-stories/:id/analysis?repoIds=…` | AI analysis. **`repoIds` required.** |
| GET | `/api/user-stories/:id/implementation-prompt?repoIds=…` | Generate implementation prompt. **`repoIds` required.** Optional `?additionalGuidance=`. |
| GET | `/api/repos` | List persisted repos. |
| POST | `/api/repos` | Add a repo. Body: `{ url, branch }`. |
| DELETE | `/api/repos/:id` | Remove a repo. |

Missing/empty `repoIds` returns `400 { "error": "Select at least one repository before running analysis." }`. Unknown IDs return `400 { "error": "Selected repositories were not found. Refresh the list and try again." }`.

---

## Two-Stage Multi-Repo AI Analysis

```
0. Resolve repoIds → Repo[] from the persisted store

1. Fast pass
   └─ Fan out commit fetch across all selected repos (count-per-repo scaled
      down by selection size; ~4–12 commits per repo)
   └─ Each commit carries a [owner/name] label in the prompt
   └─ Claude call with no repo file context
   └─ If confident (likelyCause / recommendations / impactedAreas present)
      → cache + respond

2. Deep pass (only when fast pass is weak)
   └─ Fan out repo-context fetch across all selected repos
      (max files/chars budget divided across repos so total stays ~6 KB)
   └─ Sections prefixed with "### Repo: owner/name (branch: …)"
   └─ Second Claude call with the merged context
   └─ Cache + respond
```

Suspect commits in the response include `{ sha, url, repo }`, where `repo` is `"owner/name"`. The cache key includes a sorted aggregate of every selected repo's head SHA, so changing the selection or any repo's branch tip invalidates the entry naturally.

---

## AI Analysis Result Schema

```typescript
type AIAnalysisResult = {
  analysisType: "bug" | "user-story";
  status: "ready" | "not-enough-data";
  summary: string;
  likelyCause?: string;            // bugs only
  implementationApproach?: string; // user stories only
  suspectCommits: Array<{          // up to 3
    sha: string;
    url?: string;                  // per-repo GitHub URL
    repo?: string;                 // "owner/name" when the SHA was matched
  }>;
  recommendations: string[];       // 3–4 items
  importantPoints?: string[];      // up to 3
  impactedAreas?: string[];        // up to 4 (user stories)
  dependencies?: string[];         // up to 4 (user stories)
};
```

---

## Frontend Architecture

### Routing

No router library. `App.tsx` parses `window.location.pathname` on each navigation event and renders one of three views:

| URL Pattern | View |
|-------------|------|
| `/` | Home — category cards + `RepoManager` |
| `/{bugs\|user-stories}` | List view — search + ticket cards |
| `/{bugs\|user-stories}/analyze/:id` | Detail view — repo selector → AI analysis (→ implementation prompt) |

### State Management

All network state lives in the `useTickets` hook (`hooks/useBugs.ts`):

- Ticket list, selected ticket, analysis result, implementation prompt.
- An `AbortController` per in-flight request; cancellation is exposed via a stop button in `SearchBar`.
- **No auto-trigger** — fetching a ticket no longer auto-runs analysis. The user selects repos in the detail view and clicks "Analyze".
- Exposes `runAnalysis(ticketId, repoIds)` and `loadImplementationPrompt(ticketId, repoIds, guidance?)`.

### Component Tree

```
<App>
  └─ <Layout>
       ├─ <Header>
       └─ [Page Content]
            ├─ Home: category cards + <RepoManager>
            ├─ List: <SearchBar> + <BugList> → <BugCard>
            └─ Detail: <BugCard> (expanded)
                         ├─ <BugDetails>
                         ├─ <RepoSelector>          (until analysis exists)
                         ├─ <AIAnalysis>            (after analysis)
                         └─ <ImplementationPrompt>  (user stories, after analysis)
```

`BugCard` keeps the selected repo IDs in local state and forwards them to the implementation-prompt generator so the same selection is reused.

### Theming

DevLens ships a GitHub-flavored design system in `frontend/src/theme/`:

- **Two palettes** — `dark` (default) and `light`. Dark uses GitHub-dark anchors: canvas `#0d1117`, paper `#161b22`, border `#30363d`, accent `#2f81f7`. Light uses the corresponding GitHub-light values.
- **Custom palette tokens** (TypeScript module augmentation): `palette.canvas`, `palette.border.{default, muted}`, `palette.category.{bugs, stories, repos}`, `palette.state.{new, active, resolved, closed}`. Components consume these instead of hardcoded hex.
- **`buildTheme(mode)`** in `theme/theme.ts` flattens MUI: zero shadows, 6 px radius, hairline borders on `Paper`/`Card`/`AppBar`, denser typography (14 px base, system sans + monospace stacks), themed scrollbars, themed tooltips.
- **`ThemeModeProvider`** wraps `<App />` and exposes `useThemeMode()` (`mode`, `setMode`, `toggle`). The current mode is persisted to `localStorage` under `devlens.themeMode`; the Header renders a sun/moon `IconButton` that calls `toggle()`.
- **`ui/` primitives** — `Mono`, `Pill`, `Surface`, `Section`, `KeyValue`. New visual variants land here so future redesigns happen in one place.

### Key Libraries

| Library | Role |
|---------|------|
| React 18 | UI rendering |
| Vite | Dev server, build bundler (proxies `/api` → `:4000`) |
| Material UI v5 | Component library (themed to a GitHub-flavored flat aesthetic) |
| Emotion | CSS-in-JS for MUI styling |

---

## Caching

| What | Key | TTL | Implementation |
|------|-----|-----|-----------------|
| Analysis result | `category + ticketId + aggregateHeadSha + model + ticketFingerprint` | 15 min | `TtlCache<EnrichedAnalysisResult>` in `analysisService.ts` |
| Implementation prompt | `impl_prompt::<analysisCacheKey>` | 15 min | `TtlCache<string>` in `implementationPromptService.ts` |

`aggregateHeadSha` is a sorted, `|`-joined string of `repoId:head8` for every selected repo, so changing the selection or any branch tip invalidates the cache. There is no distributed cache; restarting the server clears everything.

---

## Configuration

All env vars are read in `config.ts`. Nothing else in the codebase reads `process.env` directly (except `server.ts` for the port).

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `ADO_ORG` | Yes | — | Org name or full TFS base URL |
| `ADO_PROJECT` | Yes | — | Project name |
| `ADO_PAT` | Yes | — | Personal Access Token |
| `ANTHROPIC_KEY` | Yes | — | Anthropic API key |
| `GITHUB_TOKEN` | No | — | Recommended for private repos. Always read from env, never persisted to disk. Repositories themselves are managed via the UI (`/api/repos`), not env. |
| `ADO_DAYS` | No | `7` | Look-back window |
| `ADO_TOP` | No | `10` | Max tickets returned |
| `ADO_STATES` | No | `New,Active` | Comma-separated ADO states |
| `ADO_AREA_PATH` | No | — | ADO area path filter |
| `GITHUB_COMMITS` | No | `50` | Upper bound on commits inspected per analysis |
| `API_PORT` | No | `4000` | Backend listen port |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Claude model ID |

---

## Persisted State

- **`backend/data/repos.json`** — the persisted repo list, created empty on first request to `/api/repos`. Gitignored. Each entry: `{ id, url, branch, owner, name, addedAt }`.
- No database. Analysis and impl-prompt caches are in-process and clear on restart.

---

## Data Flow: Bug Analysis

```
User opens a ticket detail page
       ↓
useTickets.load(ticketId)  →  GET /api/bugs?ticketId=X
       ↓
RepoSelector renders. User checks one or more repos and clicks Analyze.
       ↓
useTickets.runAnalysis(ticketId, [repoId1, repoId2])
       ↓
GET /api/bugs/:id/analysis?repoIds=…
       ↓
routes/workItems.ts → analysisService.buildAiAnalysisForWorkItem
       ↓
findReposByIds → fetchAggregatedCommits (per repo, parallel)
       ↓
buildAggregateHeadSha → cache lookup
       ↓ (miss)
Fast pass: Claude with merged + repo-tagged commits
       ↓
Confidence high?
  Yes → cache + return
  No  → fetchAggregatedRepoContext (per repo, parallel)
         Deep pass: Claude with per-repo sections
         Cache + return
       ↓
Frontend: AIAnalysis renders. Suspect commits show [owner/name] + per-repo URL.
```

## Data Flow: User Story Implementation Prompt

```
After analysis, user clicks "Generate Implementation Prompt"
       ↓
GET /api/user-stories/:id/implementation-prompt?repoIds=…
       ↓
implementationPromptService.buildImplementationPrompt
       ↓
Same aggregate cache key. If analysis is cached, reuse its context.
Otherwise fetchAggregatedRepoContext per repo.
       ↓
Claude (max 1 800 output tokens) → cache → return
       ↓
ImplementationPrompt: display + copy button
```

---

## Security Notes

- ADO auth uses HTTP Basic with a PAT (Base64-encoded in `Authorization` header). The PAT is never forwarded to the frontend.
- GitHub requests are optionally authenticated via `GITHUB_TOKEN`; the token is read from env and not persisted in `repos.json`.
- The Anthropic API key is backend-only and never exposed to the client.
- The persisted `repos.json` contains only repo URLs/branches/owners — no secrets.
- CORS is enabled on the Express server for local development; tighten for production.
