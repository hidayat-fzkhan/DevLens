# Frontend Architecture

This document describes the frontend folder structure and component organization.

## Folder Structure

```
src/
├── components/
│   ├── bug/                          # Ticket-display components (used for both bugs and user stories)
│   │   ├── AIAnalysis.tsx            # Renders the AI analysis result; tags suspect commits with [owner/name]
│   │   ├── BugCard.tsx               # Wrapper card; mounts RepoSelector → AIAnalysis → ImplementationPrompt
│   │   ├── BugDetails.tsx            # Ticket metadata and summary
│   │   ├── BugList.tsx               # List of bug/story cards
│   │   └── ImplementationPrompt.tsx  # Generate / copy UI for user-story prompts
│   ├── repos/
│   │   ├── RepoManager.tsx           # Home-page CRUD for the persisted repo list
│   │   └── RepoSelector.tsx          # Ticket-detail checkbox list + "Analyze" button
│   ├── common/                       # Reusable UI components
│   │   ├── EmptyState.tsx
│   │   └── ErrorMessage.tsx
│   ├── layout/                       # Layout components
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   └── search/
│       └── SearchBar.tsx
├── hooks/
│   └── useBugs.ts                    # useTickets — list, analysis (gated on repo selection), prompt
├── services/
│   └── api.ts                        # Backend API client (tickets, analysis, prompt, repos CRUD)
├── types/
│   └── index.ts                      # API types (incl. Repo + suspect-commit repo field)
├── utils/
│   └── formatters.ts                 # Date / text formatters
├── App.tsx                           # Root + manual SPA routing
├── main.tsx                          # Entry point
└── styles.css                        # Global styles
```

## Component Hierarchy

```
App
└── Layout
    ├── Header
    └── Container
        ├── Home page
        │   ├── Category cards (Bugs / User Stories)
        │   └── RepoManager           # add/remove configured GitHub repos
        ├── List page
        │   ├── SearchBar
        │   ├── ErrorMessage          (conditional)
        │   ├── EmptyState            (conditional)
        │   └── BugList → BugCard (collapsed)
        └── Detail page
            └── BugList → BugCard (expanded)
                ├── BugDetails
                ├── RepoSelector      # shown until analysis exists
                ├── AIAnalysis        # shown once analysis is ready
                └── ImplementationPrompt  # user stories only, after analysis
```

## Key Flows

### Analysis is user-initiated, not automatic

Earlier the hook auto-triggered analysis when a single ticket was loaded by ID. With multi-repo support, the user must explicitly pick which repos to analyze against:

1. Ticket detail page renders `BugDetails` + `RepoSelector`.
2. `RepoSelector` fetches `GET /api/repos` and renders checkboxes (none preselected).
3. The "Analyze" button stays disabled until the user checks at least one repo.
4. On click, `BugCard` calls `onAnalyze(ticketId, repoIds)`, which runs `useTickets.runAnalysis(ticketId, repoIds)` → `GET /api/{category}/:id/analysis?repoIds=…`.
5. `BugCard` remembers the selection so the same `repoIds` are reused when the user clicks "Generate Implementation Prompt".

### State management

All network state lives in the `useTickets` hook:
- Ticket list, selected ticket, analysis result, implementation prompt.
- Three independent `AbortController`s — for list fetch, analysis, and prompt — so each request can be cancelled separately.
- Public API: `query`, `setQuery`, `load`, `runAnalysis(ticketId, repoIds)`, `loadImplementationPrompt(ticketId, repoIds, guidance?)`, `handleStop`, `reset`, plus the various `*Loading` / `*Error` flags.

## Key Design Patterns

### 1. Component Composition
- Small, focused components with single responsibilities.
- Composition over inheritance.
- Props-based component communication.

### 2. Custom Hooks
- `useTickets` encapsulates all ticket-related state and side effects (list, analysis, prompt, aborting).
- Separates business logic from UI components and makes them easy to test in isolation.

### 3. Separation of Concerns
- **Components:** UI rendering only.
- **Hooks:** State management and side effects.
- **Services (`services/api.ts`):** External API communication. Surfaces `{ error }` JSON from the backend as a thrown message.
- **Utils:** Pure utility functions.
- **Types:** Type definitions and interfaces.

### 4. Feature-Based Organization
- Components grouped by feature (`bug/`, `repos/`, `search/`, etc.).
- Easy to find related files; scales as the app grows.

## Best Practices

1. **Keep components small.** Each component does one thing well.
2. **Use TypeScript everywhere.** Props and API responses are fully typed.
3. **Props over state.** Pass data down when possible; lift state only when shared.
4. **Extract logic to hooks.** Keep components focused on rendering.
5. **Consistent naming.** Use names that reflect component purpose.
