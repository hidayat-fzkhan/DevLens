<img src="devlens-icon.svg" alt="DevLens" width="80" height="80" />

# DevLens

DevLens is an Azure DevOps and GitHub analysis tool that helps teams inspect newly logged Bugs, Defects, and User Stories with AI-assisted reasoning.

The current product supports two main workflows:

- **Bugs page**: fetches Azure DevOps work items of type `Bug` and `Defect`, then analyzes likely causes and related recent commits.
- **User Stories page**: fetches Azure DevOps work items of type `User Story`, then analyzes likely implementation approach, impacted areas, and dependencies, and can generate a ready-to-use implementation prompt for AI coding assistants.

## Current Highlights

- Separate UI flows for Bugs and User Stories
- Welcome page with direct navigation to each category and a **repo manager** for adding/removing GitHub repositories without restarting the server
- Route-based deep links:
  - `/`
  - `/bugs`
  - `/bugs/analyze/:id`
  - `/user-stories`
  - `/user-stories/analyze/:id`
- Azure DevOps filtering driven by config values in `backend/.env`
- **Multi-repo analysis**: pick which configured GitHub repos to analyze each ticket against; commits and code context fan out across all selected repos in parallel
- Anthropic-powered AI analysis using live GitHub repository context
- Fast-first analysis flow with deep repository context only when needed
- Implementation prompt generation for User Stories (produces a prompt ready to paste into an AI coding assistant)
- In-memory analysis caching keyed by ticket content, every selected repo's branch head, and the model
- Timing logs for commit fetch, repo-context fetch, model calls, and total analysis time
- Modular Express backend (`routes/`, `services/`, `middleware/`) with a central error handler

## Features

### Azure DevOps Work Item Support

- Fetches `Bug` and `Defect` items for the Bugs page
- Fetches `User Story` items for the User Stories page
- Uses WIQL filters based on the configured area path, states, days, and top count

### AI-Powered Analysis

- Bug analysis focuses on likely cause, suspect commits, and next investigation steps
- User Story analysis focuses on implementation approach, impacted areas, and dependencies
- If a user story does not have enough description or acceptance-criteria data, the API returns `not-enough-data` instead of forcing an AI call

### Performance-Oriented Backend

- Separate list endpoints and analysis endpoints
- Two-stage analysis pipeline:
  - fast pass without repo snippets
  - deep pass with GitHub repo context only when the fast result is weak
- Reduced GitHub repo-context scanning scope
- Concurrency-limited GitHub blob fetching
- In-memory cache for repeated ticket analysis

### User Story Implementation Prompt

- One-click prompt generation on the User Story detail page
- The generated prompt includes analysis context, repo snippets, acceptance criteria, and optional additional guidance
- Copy-to-clipboard button for immediate use in an AI coding assistant
- Cached separately from analysis (same 15-minute TTL)

### Frontend UX

- Welcome page with category navigation
- Search by ticket ID within each category page
- Independent loading and error states for list fetches, AI analysis, and prompt generation
- Deep-link support for ticket analysis pages

## Project Structure

```text
devlens/
├── backend/
│   ├── package.json
│   ├── nodemon.json
│   └── src/
│       ├── server.ts                              # entry: app.listen
│       ├── app.ts                                 # Express composition
│       ├── routes/
│       │   ├── query.ts                           # shared query-param parsers
│       │   ├── workItems.ts                       # /api/{bugs|user-stories}[/analysis]
│       │   ├── implementationPrompt.ts            # user-story impl-prompt route
│       │   └── repos.ts                           # /api/repos CRUD
│       ├── services/
│       │   ├── cache.ts                           # generic TtlCache<T>
│       │   ├── workItemMapper.ts                  # response shaping + fingerprint
│       │   ├── analysisService.ts                 # two-stage multi-repo orchestrator
│       │   └── implementationPromptService.ts     # impl-prompt orchestrator
│       ├── middleware/
│       │   └── errorHandler.ts                    # HttpError + asyncHandler + central errors
│       ├── ado.ts                                 # Azure DevOps WIQL + mapping
│       ├── ai.ts                                  # Anthropic prompt building
│       ├── github.ts                              # GitHub commits + repo-context (single repo)
│       ├── repos.ts                               # persisted repo store
│       ├── config.ts                              # env loader
│       ├── http.ts                                # fetch wrapper
│       ├── rank.ts                                # commit-scoring helper
│       ├── text.ts                                # text utilities
│       └── types.ts                               # shared types
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── styles.css
│       ├── components/
│       │   ├── bug/
│       │   │   ├── AIAnalysis.tsx
│       │   │   ├── BugCard.tsx
│       │   │   ├── BugDetails.tsx
│       │   │   ├── BugList.tsx
│       │   │   └── ImplementationPrompt.tsx
│       │   ├── repos/
│       │   │   ├── RepoManager.tsx                # home-page CRUD
│       │   │   └── RepoSelector.tsx               # ticket-detail multi-select
│       │   ├── common/
│       │   │   ├── EmptyState.tsx
│       │   │   └── ErrorMessage.tsx
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   └── Layout.tsx
│       │   └── search/
│       │       └── SearchBar.tsx
│       ├── hooks/
│       │   └── useBugs.ts                         # ticket + analysis + prompt state
│       ├── services/
│       │   └── api.ts                             # typed fetch client (incl. /api/repos)
│       ├── types/
│       │   └── index.ts
│       └── utils/
│           └── formatters.ts
├── .github/
│   └── copilot-instructions.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── DEVELOPMENT.md
└── README.md
```

Runtime data (`backend/data/repos.json`) is created on first run and gitignored.

## Architecture Chart

```mermaid
flowchart LR
    UI[Browser UI] --> FE[React + Vite Frontend]
    FE -->|List, repos CRUD, analysis with selected repoIds| API[Express Backend API]

    API -->|WIQL + work item fetch| ADO[Azure DevOps / TFS]
    API -->|Recent commits per selected repo| GHCommits[GitHub Commits API]
    API --> RepoStore[(backend/data/repos.json)]
    API --> Cache[(In-memory Analysis Cache)]
    API -->|Deep pass only when needed, per repo| GHContext[GitHub Tree and Blob APIs]
    API --> AI[Anthropic Claude]

    ADO --> API
    GHCommits --> API
    GHContext --> API
    Cache --> API
    RepoStore --> API
    AI --> API

    FE -->|Routes| Routes[/, /bugs, /bugs/analyze/:id, /user-stories, /user-stories/analyze/:id]
```

## How It Works

### 1. Ticket List Fetch

The frontend loads one of two list endpoints:

- `GET /api/bugs`
- `GET /api/user-stories`

Both endpoints use the same configured Azure DevOps filters from `backend/.env`:

- `ADO_DAYS`
- `ADO_TOP`
- `ADO_STATES`
- `ADO_AREA_PATH`

Only the Azure DevOps work item type changes by category:

- Bugs page: `Bug`, `Defect`
- User Stories page: `User Story`

### 2. Configuring Repositories

Before analyzing a ticket, the user adds the GitHub repositories that should be considered. The home page contains a **Repo Manager** card that calls:

- `GET /api/repos` — list configured repos
- `POST /api/repos` `{ url, branch }` — add one
- `DELETE /api/repos/:id` — remove one

Repos are persisted to `backend/data/repos.json` and survive restarts. The store starts empty on first run; add your first repo through the UI before running analysis. `GITHUB_TOKEN` is always read from env and never written to disk.

### 3. Ticket Analysis Fetch

When the user opens a ticket detail page, the frontend loads the work item, then renders a **Repo Selector** with checkboxes of all configured repos. The user picks one or more and clicks "Analyze". The frontend then calls one of:

- `GET /api/bugs/:ticketId/analysis?repoIds=<id1>,<id2>`
- `GET /api/user-stories/:ticketId/analysis?repoIds=<id1>,<id2>`

The backend then:

1. Resolves `repoIds` against the persisted store (`findReposByIds`)
2. Reads the current Azure DevOps work item
3. Normalizes description, repro steps, and acceptance criteria
4. **Fans out commit fetches across every selected repo in parallel**, tagging each commit with its `[owner/name]` label so the model can attribute them
5. Runs a fast AI pass without deep repo snippets
6. **Fans out repo-context fetches per repo** only if the fast result needs more signal; merges sections with `### Repo: owner/name` headers
7. Runs a deep AI pass only when necessary
8. Caches the final result in memory under a key that includes every selected repo's branch head

Missing or unknown `repoIds` returns `400 { "error": "Select at least one repository before running analysis." }`.

### 4. Implementation Prompt Generation

When the user clicks "Generate Implementation Prompt" on a User Story detail page, the frontend reuses the same repo selection and calls:

```
GET /api/user-stories/:ticketId/implementation-prompt?repoIds=<id1>,<id2>
```

The backend:

1. Reuses a cached analysis result if one exists (same `repoIds`); otherwise fetches fresh per-repo context
2. Builds a structured prompt that includes work item details, analysis findings, repo snippets, and any `additionalGuidance` query param
3. Calls Claude (max 1 800 output tokens) to produce the final prompt text
4. Caches the result under the same composite key as analysis
5. Returns the prompt as plain text for copy-paste into any AI coding assistant

### 5. Cache Behavior

Analysis cache keys include:

- work item category
- ticket id
- **aggregate head SHA** — sorted, joined `repoId:head8` for every selected repo
- selected Anthropic model
- a fingerprint of the current work item content

That means the cache invalidates naturally when:

- the ticket description, acceptance criteria, repro steps, title, or state changes
- any selected repo's branch head changes
- **the user changes the repo selection** (different repos → different aggregate SHA → cache miss)
- the selected model changes

## API Endpoints

### Repos

```bash
# List configured repos
curl http://localhost:4000/api/repos

# Add a repo
curl -X POST http://localhost:4000/api/repos \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/owner/repo","branch":"main"}'

# Remove a repo
curl -X DELETE http://localhost:4000/api/repos/<id>
```

### Bugs

```bash
# List recent bugs and defects
curl http://localhost:4000/api/bugs

# Load a specific bug/defect by ID
curl "http://localhost:4000/api/bugs?ticketId=12345"

# Run AI analysis for a specific bug/defect (repoIds is required)
curl "http://localhost:4000/api/bugs/12345/analysis?repoIds=<id1>,<id2>"
```

### User Stories

```bash
# List recent user stories
curl http://localhost:4000/api/user-stories

# Load a specific user story by ID
curl "http://localhost:4000/api/user-stories?ticketId=12345"

# Run AI analysis for a specific user story (repoIds is required)
curl "http://localhost:4000/api/user-stories/12345/analysis?repoIds=<id1>,<id2>"

# Generate an implementation prompt (repoIds is required, additional guidance optional)
curl "http://localhost:4000/api/user-stories/12345/implementation-prompt?repoIds=<id1>,<id2>"
curl "http://localhost:4000/api/user-stories/12345/implementation-prompt?repoIds=<id1>&additionalGuidance=Use+the+existing+service+layer"
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Azure DevOps / TFS PAT with Work Item read access
- GitHub repository access
- Anthropic API key

### 1. Clone the Repository

```bash
git clone <repo-url>
cd devlens
```

### 2. Configure the Backend

```bash
cp backend/.env.example backend/.env
```

Example configuration:

```env
# Azure DevOps (TFS)
ADO_ORG=my-org
ADO_PROJECT=my-project
ADO_PAT=***

# GitHub
# Repositories are managed in the UI (Home page → Repo Manager) and persisted
# to backend/data/repos.json. Only the token is read from env.
GITHUB_TOKEN=ghp_***

# Optional Azure filters
ADO_DAYS=7
ADO_TOP=10
ADO_STATES=New,Active
ADO_AREA_PATH=My Project\\Area\\Path
GITHUB_COMMITS=50

# API server
API_PORT=4000

# Anthropic AI
ANTHROPIC_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

### 3. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 4. Start Development Servers

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Frontend Routes

- `/` - welcome page
- `/bugs` - list of Bugs and Defects
- `/bugs/analyze/:id` - bug analysis page
- `/user-stories` - list of User Stories
- `/user-stories/analyze/:id` - user story analysis page

## Configuration

### Required Environment Variables

| Variable             | Description                                   |
| -------------------- | --------------------------------------------- |
| `ADO_ORG`            | Azure DevOps organization or full base URL    |
| `ADO_PROJECT`        | Azure DevOps project name                     |
| `ADO_PAT`            | Azure DevOps PAT token                        |
| `ANTHROPIC_KEY`      | Anthropic API key                             |

### Optional Environment Variables

| Variable             | Default             | Description                                                                                                          |
| -------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`       | unset               | Always read from env (never persisted). Recommended for private repos and higher GitHub API limits.                  |
| `ADO_DAYS`           | `7`                 | Number of days of Azure DevOps tickets to query                                                                      |
| `ADO_TOP`            | `10`                | Maximum number of list results                                                                                       |
| `ADO_STATES`         | `New,Active`        | Azure DevOps states to include                                                                                       |
| `ADO_AREA_PATH`      | unset               | Optional Azure area-path filter                                                                                      |
| `GITHUB_COMMITS`     | `50`                | Upper bound on commits inspected per analysis (scaled per repo when multiple are selected)                           |
| `API_PORT`           | `4000`              | Backend port                                                                                                         |
| `ANTHROPIC_MODEL`    | `claude-sonnet-4-6` | Default model for interactive analysis                                                                               |

## AI Analysis Design

### Bug Analysis Output

Bug analysis emphasizes:

- why the bug is happening
- likely issue or root cause
- related recent commits
- next investigation or fix steps

### User Story Analysis Output

User story analysis emphasizes:

- what the story is asking for
- suggested implementation approach
- likely impacted areas
- dependencies or preconditions
- implementation recommendations

### Sparse User Story Handling

If a user story does not contain enough useful description or acceptance criteria, the backend returns:

```json
{
  "analysisType": "user-story",
  "status": "not-enough-data",
  "summary": "Not enough data for AI analysis."
}
```

## Performance Notes

The current backend includes several latency optimizations:

- `claude-sonnet-4-6` as the default interactive model
- reduced repo-context candidate file count
- concurrency-limited GitHub blob fetches
- fast-pass analysis before deep repo-context collection
- in-memory result caching
- stage timing logs for easier profiling

Useful backend log lines:

- `[AI][cache]`
- `[AI][commits]`
- `[AI][model-fast]`
- `[AI][github-context]`
- `[AI][model-deep]`
- `[AI][analysis]`

## Development Commands

Backend:

```bash
cd backend
npm run dev
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

## Troubleshooting

### AI analysis is slow

Check the backend logs for:

- cache hit or miss
- commit fetch time
- repo-context fetch time
- fast-pass model time
- deep-pass model time

If deep repo context is running for most tickets, refine ticket descriptions and acceptance criteria so the fast pass has better signal.

### GitHub API issues

If the repo is private or protected by SSO/SAML, make sure `GITHUB_TOKEN` has valid access to the target repo.

### Azure DevOps list is empty

Check:

- PAT validity
- `ADO_AREA_PATH`
- `ADO_STATES`
- `ADO_DAYS`

### User story returns `not-enough-data`

That means the work item did not contain enough description or acceptance-criteria content for useful analysis. Update the Azure DevOps ticket and rerun analysis.

## Additional Docs

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DEVELOPMENT.md](DEVELOPMENT.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)

## Tech Stack

Backend:

- Node.js
- TypeScript
- Express
- Octokit
- Anthropic SDK

Frontend:

- React 18
- Vite
- Material UI

## Resources

- [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Anthropic API Docs](https://docs.anthropic.com/)
