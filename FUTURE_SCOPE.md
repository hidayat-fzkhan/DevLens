# Future Scope

Planned improvements and feature ideas for DevLens.

---

## 1. Repo and Azure Team Configuration from the UI

**Status:** Partially shipped. GitHub repositories are now managed entirely from the UI (Home page → Repo Manager) and persisted to `backend/data/repos.json`. Each ticket analysis lets the user pick which configured repos to fan out across. Azure DevOps area/team settings are still env-only.

**Remaining work:**
- Manage Azure DevOps teams/area paths from the UI the same way repos are managed today.
- Per-category repo presets — e.g., default Bugs to one set of repos and User Stories to another.
- Validate connections on save (test the ADO PAT and GitHub token before persisting).
- Edit-in-place for existing repo entries (today it's add/remove only).

---

## 2. Developer-Friendly Context Section on Ticket Analysis

When a developer picks up a ticket, they currently have to figure out on their own what tools, repos, and access they need. The AI analysis result should surface this directly.

**Proposed work:**
- Extend the AI analysis output with a **Developer Onboarding** section that includes:
  - **Repos involved** — GitHub repositories relevant to the ticket, with direct links.
  - **Services and tools** — downstream services, SDKs, or internal tools referenced in the ticket or suspect commits.
  - **Access required** — inferred list of permissions, secrets, or environment setup a developer would need (e.g., specific Azure DevOps project access, GitHub repo permissions, feature flags, environment variables).
  - **Suggested local setup steps** — based on impacted files and services, a short checklist to get a working dev environment for this ticket.
- Surface this section prominently on the ticket detail page, collapsed by default to avoid visual noise for users who do not need it.
