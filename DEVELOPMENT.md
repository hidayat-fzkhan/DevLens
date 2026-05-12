# Development Guide

## Getting Started

This is a personal side project for bug triage automation. This guide covers development setup and common tasks.

## Development Workflow

### 1. Initial Setup

```bash
# Clone the repo
git clone <repo-url>
cd devlens

# Install all dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Create environment file
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

### 2. Running Development Servers

Keep these running in separate terminals:

**Terminal 1 - Backend API** (auto-reloads on changes):
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend UI** (auto-reloads on changes):
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

### 3. Making Code Changes

Both backend and frontend have hot-reload enabled:
- Backend: `nodemon` watches `src/` and runs `tsx src/server.ts` (config in `backend/nodemon.json`)
- Frontend: Vite's dev server handles hot module replacement

Just save your changes and the servers will automatically reload. Nodemon also picks up **newly created files** (which `tsx watch` alone sometimes misses).

## Architecture Overview

### Backend (`/backend`)

The backend follows a layered structure: routes are thin, business logic lives in services, and a central error handler removes per-route try/catch.

**Layout:**
- `src/server.ts` — entry point (`app.listen`)
- `src/app.ts` — Express composition (cors, json, routers, error handler)
- `src/routes/` — HTTP handlers per resource (`workItems`, `implementationPrompt`, `repos`) + shared query parsers
- `src/services/` — business logic (`analysisService`, `implementationPromptService`, `workItemMapper`, `cache`)
- `src/middleware/errorHandler.ts` — `HttpError`, `asyncHandler`, central error middleware
- `src/ado.ts` — Azure DevOps integration
- `src/github.ts` — GitHub API client (single repo; the orchestrator fans out)
- `src/ai.ts` — Anthropic Claude prompt building
- `src/repos.ts` — persisted repo store (`backend/data/repos.json`)
- `src/config.ts` — env loader

**Key Dependencies:**
- `express` — web framework
- `@octokit/rest` — GitHub API client
- `@anthropic-ai/sdk` — Claude API client
- `tsx` — TypeScript runner
- `nodemon` — file-watch + auto-restart in dev

**Adding a new endpoint:**
1. Add a handler in the appropriate file under `src/routes/` (or create a new router and mount it in `src/app.ts`).
2. Push business logic into `src/services/`. Throw `badRequest(...)` / `notFound(...)` from `middleware/errorHandler.ts` instead of writing your own try/catch.
3. If you need configuration, add a field to `Config` in `src/config.ts`.

### Frontend (`/frontend`)

**Component Structure:**
```
src/
├── theme/                # Design system (palettes, typography, MUI overrides, ThemeModeProvider)
├── ui/                   # Thin MUI wrappers (Mono, Pill, Surface, Section, KeyValue)
├── components/
│   ├── bug/              # Bug display components (BugList, BugCard, AIAnalysis, ImplementationPrompt)
│   ├── repos/            # RepoManager (home page) + RepoSelector (ticket detail)
│   ├── common/           # Reusable components (EmptyState, ErrorMessage)
│   ├── layout/           # Layout, Header (includes theme toggle)
│   └── search/           # SearchBar
├── hooks/
│   └── useBugs.ts        # useTickets — list, runAnalysis(ticketId, repoIds), loadImplementationPrompt
├── services/
│   └── api.ts            # API client (tickets, analysis, prompt, repos CRUD)
├── types/
│   └── index.ts          # TypeScript types
├── utils/
│   └── formatters.ts     # Utility functions
├── main.tsx              # Entry (wraps App in ThemeModeProvider)
└── App.tsx               # Root component (manual SPA routing)
```

**Theming:**
- Dark by default. Toggle via the sun/moon button in the Header; persisted in `localStorage` under `devlens.themeMode`.
- Two palettes live in `src/theme/palette.ts` (GitHub-flavored dark + light) with custom tokens — `palette.border`, `palette.category.{bugs,stories,repos}`, `palette.state.{new,active,resolved,closed}`.
- **Do not hardcode hex values** in components. Use `theme.palette.*` (with `alpha(color, opacity)` from `@mui/material/styles` for tints). This is enforced by convention only — a quick `grep -rE '#[0-9a-fA-F]{3,6}\b' frontend/src/components` should return zero hits.
- Prefer the `ui/` primitives (`Mono`, `Pill`, `Surface`, …) over raw MUI when one exists; new visual variants land there so future redesigns happen in one place.

For detailed component architecture, see [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md).

**Key Dependencies:**
- `react` - UI framework
- `vite` - Build tool
- `@mui/material` - Component library
- `typescript` - Type safety

## Common Development Tasks

### Adding a New Feature

1. **Backend Feature:**
   ```bash
   cd backend
   # Edit src/ files
   npm run build  # Check TypeScript compilation
   ```

2. **Frontend Feature:**
   ```bash
   cd frontend
   # Edit src/ files
   # Changes auto-reload in browser
   npm run build  # Check TypeScript compilation
   ```

### Debugging

**Backend:**
```bash
cd backend
npm run dev
# Logs appear in terminal
# Check backend/.env for configuration
```

**Frontend:**
- Open browser DevTools (F12)
- Check Console tab for errors
- Use React DevTools extension for component debugging

### Building for Production

```bash
# Build backend
cd backend
npm run build
# Output: dist/

# Build frontend
cd frontend
npm run build
# Output: dist/
```

### Testing Configuration Changes

Edit `backend/.env` and the API will auto-reload:
```env
# Examples:
ADO_DAYS=7        # Look back 7 days instead of 30
ADO_TOP=10        # Get 10 bugs instead of 5
GITHUB_COMMITS=30 # Analyze fewer commits for faster ranking
GITHUB_REPO_BRANCH=main  # Read live code from a different branch
```

## Troubleshooting

### Port Already in Use
If port 4000 or 5173 is already in use:

```bash
# Find and kill process
# macOS/Linux:
lsof -i :4000
kill -9 <PID>

# Or use different ports:
API_PORT=4001 npm run dev
VITE_PORT=5174 npm run dev
```

### TypeScript Compilation Errors
```bash
cd backend
npm run build

cd frontend
npm run build
```

### "Cannot find module" errors
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Azure DevOps Authentication Failed
- Verify `ADO_ORG`, `ADO_PROJECT`, `ADO_PAT` in `.env`
- Check PAT has "Work Items (Read)" permission
- PAT may have expired

### GitHub API Rate Limited
- You're making too many requests
- GitHub allows 60 requests/hour unauthenticated
- With token: 5000 requests/hour

## Project Standards

### Code Style
- TypeScript for type safety
- Use `const` by default
- Arrow functions preferred
- Component names PascalCase
- File names match component names

### Component Guidelines
- One component per file (unless very small)
- Props should be typed
- Keep components focused (single responsibility)
- Extract reusable logic to hooks

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes on separate branches
git commit -m "Add feature description"

# Push and create PR
git push origin feature/my-feature
```

## Performance Optimization

### Frontend
- Components already lazy-load via React
- Material-UI components tree-shake well
- Vite handles code splitting

### Backend
- Ranking algorithm: O(n*m) - optimize commit count if slow
- AI analysis: Only runs for single-bug queries
- API caching: Not implemented yet

## Next Steps for Feature Addition

1. **New Ranking Factor:** Edit `src/rank.ts`
2. **New API Endpoint:** Add a route file under `backend/src/routes/`, mount it in `backend/src/app.ts`, and put business logic in `backend/src/services/`
3. **New UI Component:** Create in `frontend/src/components/<feature>/`
4. **New Configuration:** Add the field to `Config` in `backend/src/config.ts` and document it in `backend/.env.example`

## Resources

- [Azure DevOps API Docs](https://learn.microsoft.com/en-us/rest/api/azure/devops)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Express.js Guide](https://expressjs.com/)
- [React Best Practices](https://react.dev/)
- [Material-UI Components](https://mui.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- Check existing code for similar patterns
- Read error messages carefully - they often point to the issue
- Use `git log` to see how things were implemented before
- Test components in isolation first

Happy coding! 🚀
