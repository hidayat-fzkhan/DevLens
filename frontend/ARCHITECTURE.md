# Frontend Architecture

This document describes the frontend folder structure and component organization.

## Folder Structure

```
src/
├── theme/                            # Design system tokens + MUI theme
│   ├── palette.ts                    # GitHub-flavored dark + light palettes, custom tokens (border, category, state)
│   ├── typography.ts                 # Sans + mono font stacks, GitHub-like type scale
│   ├── theme.ts                      # buildTheme(mode) — flat surfaces, hairline borders, component overrides
│   └── ThemeModeProvider.tsx         # Provider + useThemeMode() hook, localStorage persistence
├── ui/                               # Thin primitives wrapping MUI (one place for visual swaps)
│   ├── Mono.tsx                      # Monospace inline span (SHAs / IDs / paths)
│   ├── Pill.tsx                      # Chip with semantic tones (bugs, stories, repos, success, danger, …)
│   ├── Surface.tsx                   # Bordered card-like container (no shadow)
│   ├── Section.tsx                   # Titled section with optional actions slot
│   ├── KeyValue.tsx                  # Label/value pair (stacked or inline)
│   └── index.ts                      # Barrel export
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
│   │   ├── Header.tsx                # Title + nav + theme toggle (sun/moon)
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
├── main.tsx                          # Entry point (wraps App in ThemeModeProvider)
└── styles.css                        # Minimal resets — theme handles colors and typography
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

## Theming

### Tokens and palettes

`theme/palette.ts` defines two palettes (`dark`, `light`) inspired by GitHub:
- **Dark** is the default: canvas `#0d1117`, surface `#161b22`, border `#30363d`, text `#e6edf3 / #7d8590`, accent `#2f81f7`.
- **Light** mirrors GitHub's light mode for contrast and familiarity.

The palette is extended via TypeScript module augmentation with app-specific tokens:
- `palette.canvas` — bare-page background.
- `palette.border.{default, muted}` — hairline borders used throughout.
- `palette.category.{bugs, stories, repos}` — feature accents.
- `palette.state.{new, active, resolved, closed}` — ticket-state colors (used for the `BugCard` left border).

### MUI overrides

`theme/theme.ts` flattens MUI's default look: zero shadows, `border-radius: 6`, hairline borders on `Paper`/`Card`/`AppBar`, denser typography (14 px base, 1.5 line-height), and an explicit `colorScheme` set on `<html>` so native form controls and scrollbars match. Component defaults are overridden centrally — `Button` is square-ish and elevation-free, `Chip` is pill-shaped, `Tooltip` is theme-paper colored, etc.

### Mode toggle

`ThemeModeProvider` exposes `mode`, `setMode`, and `toggle` via a `useThemeMode()` hook. The current mode is persisted to `localStorage` under `devlens.themeMode`; defaults to dark. The Header renders a sun/moon `IconButton` that calls `toggle()`.

### UI primitives (`ui/`)

The `ui/` folder holds thin wrappers over MUI primitives so future visual changes happen in one place rather than across every component:

| Primitive | Wraps | Purpose |
|-----------|-------|---------|
| `<Mono>` | `Box` | Monospace span for SHAs / IDs / file paths |
| `<Pill>` | `Chip` | Semantic-tone chip (`bugs`, `stories`, `repos`, `primary`, `danger`, …) |
| `<Surface>` | `Box` | Bordered, paper-colored container — alternative to `Card` for simple panels |
| `<Section>` | `Stack` + heading | Titled section with optional `actions` slot |
| `<KeyValue>` | `Stack` | Label / value pair, stacked or inline |

These are not yet consumed in every screen — they are scaffolding for the upcoming layout and screen-redesign phases.

## Key Design Patterns

### 1. Component Composition
- Small, focused components with single responsibilities.
- Composition over inheritance.
- Props-based component communication.

### 2. Custom Hooks
- `useTickets` encapsulates all ticket-related state and side effects (list, analysis, prompt, aborting).
- Separates business logic from UI components and makes them easy to test in isolation.

### 3. Separation of Concerns
- **Theme (`theme/`):** Design tokens and MUI overrides. Components consume `theme.palette.*` instead of hardcoded hex.
- **UI primitives (`ui/`):** Visual building blocks. Future redesigns happen here.
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
6. **No hardcoded colors in components.** Reach for `theme.palette.*` (and the custom tokens like `palette.state.*`, `palette.category.*`, `palette.border.default`). If you need a tint, use MUI's `alpha(color, opacity)` helper — never a hex literal. This keeps both themes coherent.
7. **Prefer `ui/` primitives over raw MUI** when a primitive exists. New visual variants land in `ui/` first, then ripple to consumers.
