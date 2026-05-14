import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import { BugList } from "./components/bug/BugList";
import { EmptyState } from "./components/common/EmptyState";
import { ErrorMessage } from "./components/common/ErrorMessage";
import { Layout } from "./components/layout/Layout";
import { RepoManager } from "./components/repos/RepoManager";
import { FilterChipsBar } from "./components/settings/FilterChipsBar";
import { FiltersManager } from "./components/settings/FiltersManager";
import { SearchBar } from "./components/search/SearchBar";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useRecentTickets } from "./hooks/useRecentTickets";
import { useTickets } from "./hooks/useBugs";
import { fetchSettings } from "./services/api";
import type { TicketCategory, WorkItemFilters } from "./types";
import { formatDate } from "./utils/formatters";

type AppRoute =
  | { page: "home" }
  | { page: "settings" }
  | { page: "list"; category: TicketCategory }
  | { page: "detail"; category: TicketCategory; ticketId: string };

function parsePath(pathname: string): AppRoute {
  if (pathname === "/") return { page: "home" };
  if (pathname === "/settings" || pathname === "/repos")
    return { page: "settings" };

  const listMatch = /^\/(bugs|user-stories)$/.exec(pathname);
  if (listMatch) {
    return { page: "list", category: listMatch[1] as TicketCategory };
  }

  const detailMatch = /^\/(bugs|user-stories)\/analyze\/([^/]+)$/.exec(
    pathname,
  );
  if (detailMatch) {
    return {
      page: "detail",
      category: detailMatch[1] as TicketCategory,
      ticketId: decodeURIComponent(detailMatch[2]),
    };
  }

  return { page: "home" };
}

function getCategoryMeta(category: TicketCategory) {
  return category === "bugs"
    ? {
        title: "Bugs",
        searchLabel: "Search by Bug or Defect ID",
        searchPlaceholder: "e.g. 2689652",
        emptyMessage: "No bugs or defects found for this query.",
        backLabel: "Back To Bugs List",
      }
    : {
        title: "User Stories",
        searchLabel: "Search by User Story ID",
        searchPlaceholder: "e.g. 2689652",
        emptyMessage: "No user stories found for this query.",
        backLabel: "Back To User Stories List",
      };
}

function buildListPath(category: TicketCategory) {
  return `/${category}`;
}

function buildDetailPath(category: TicketCategory, ticketId: string) {
  return `/${category}/analyze/${encodeURIComponent(ticketId)}`;
}

export default function App() {
  const [pathname, setPathname] = useState(() => globalThis.location.pathname);
  const route = parsePath(pathname);
  const routePage = route.page;
  const routeTicketId = route.page === "detail" ? route.ticketId : undefined;
  const currentCategory =
    route.page === "list" || route.page === "detail" ? route.category : null;
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { recent, record } = useRecentTickets();
  const {
    query,
    setQuery,
    loading,
    error,
    analysisLoading,
    analysisError,
    promptLoading,
    promptError,
    cleanup,
    cleanupLoading,
    cleanupError,
    cleanupTicketId,
    tickets,
    selectedTicketId,
    generatedAt,
    filtersConfigured,
    load,
    reset,
    handleStop,
    runAnalysis,
    loadCleanup,
    loadImplementationPrompt,
  } = useTickets(currentCategory);
  const [activeFilters, setActiveFilters] = useState<WorkItemFilters | null>(
    null,
  );

  const categoryMeta = currentCategory
    ? getCategoryMeta(currentCategory)
    : null;

  useEffect(() => {
    const handlePopState = () => {
      setPathname(globalThis.location.pathname);
    };
    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!currentCategory) {
      setQuery("");
      reset();
      return;
    }
    setQuery(routeTicketId ?? "");
    void load(routeTicketId);
  }, [currentCategory, load, reset, routePage, routeTicketId, setQuery]);

  const selectedTicket =
    tickets.length === 1 && selectedTicketId ? tickets[0] : null;

  useEffect(() => {
    if (route.page !== "detail" || !selectedTicket) return;
    if (String(selectedTicket.id) !== route.ticketId) return;
    record({
      id: selectedTicket.id,
      category: route.category,
      title: selectedTicket.title,
    });
  }, [record, route, selectedTicket]);

  useEffect(() => {
    if (route.page !== "detail" || !selectedTicket) return;
    if (String(selectedTicket.id) !== route.ticketId) return;
    if (cleanupTicketId === selectedTicket.id) return;
    void loadCleanup(selectedTicket.id);
  }, [cleanupTicketId, loadCleanup, route, selectedTicket]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSettings(controller.signal)
      .then((res) => setActiveFilters(res.settings))
      .catch((err: Error) => {
        if (err.name !== "AbortError") {
          // Non-fatal — chip just won't render.
          setActiveFilters(null);
        }
      });
    return () => controller.abort();
  }, [filtersConfigured]);

  const navigateTo = (nextPath: string) => {
    if (globalThis.location.pathname === nextPath) return false;
    globalThis.history.pushState({}, "", nextPath);
    setPathname(nextPath);
    return true;
  };

  const handleHeaderNavigate = (path: string) => {
    if (!navigateTo(path)) {
      const nextRoute = parsePath(path);
      if (nextRoute.page === "home" || nextRoute.page === "settings") {
        reset();
        setQuery("");
        return;
      }
      void load(nextRoute.page === "detail" ? nextRoute.ticketId : undefined);
    }
  };

  useKeyboardShortcuts({
    onFocusSearch: () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    onNavigate: handleHeaderNavigate,
  });

  const openTicket = (ticketId: number) => {
    if (!currentCategory) return;
    navigateTo(buildDetailPath(currentCategory, String(ticketId)));
  };

  const showLatestTickets = () => {
    if (!currentCategory) return;
    setQuery("");
    if (!navigateTo(buildListPath(currentCategory))) {
      void load();
    }
  };

  const handleSearch = (ticketId?: string) => {
    if (!currentCategory) return;
    const trimmedTicketId = ticketId?.trim();
    if (!trimmedTicketId) {
      showLatestTickets();
      return;
    }
    setQuery(trimmedTicketId);
    if (!navigateTo(buildDetailPath(currentCategory, trimmedTicketId))) {
      void load(trimmedTicketId);
    }
  };

  const renderWelcomePage = () => (
    <Stack spacing={4}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
          <PsychologyOutlinedIcon
            sx={{ fontSize: 32, color: "primary.main" }}
          />
          <Typography variant="h2" fontWeight={600}>
            Welcome to DevLens
          </Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
          Pull work items from Azure DevOps, enrich them with GitHub commit
          history, and get AI-powered triage and implementation guidance via
          Claude.
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <WelcomeCard
          icon={
            <BugReportOutlinedIcon
              sx={(theme) => ({
                fontSize: 28,
                color: theme.palette.category.bugs,
              })}
            />
          }
          title="Bugs & Defects"
          description="Investigate bugs with AI root-cause analysis, suspect commit identification, and targeted fix recommendations."
          onClick={() => handleHeaderNavigate("/bugs")}
        />
        <WelcomeCard
          icon={
            <AutoStoriesOutlinedIcon
              sx={(theme) => ({
                fontSize: 28,
                color: theme.palette.category.stories,
              })}
            />
          }
          title="User Stories"
          description="Get AI implementation guidance, impacted area analysis, and generate Claude prompts ready to paste into your coding tool."
          onClick={() => handleHeaderNavigate("/user-stories")}
        />
      </Stack>
    </Stack>
  );

  const renderSettingsPage = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h2" fontWeight={600}>
          Settings
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Configure which Azure DevOps work items DevLens loads and which GitHub
          repositories it analyzes them against.
        </Typography>
      </Box>
      <FiltersManager />
      <RepoManager />
    </Stack>
  );

  const renderCategoryPage = () => (
    <>
      <Stack spacing={1}>
        <Typography variant="h2" fontWeight={600}>
          {categoryMeta?.title}
        </Typography>
        <SearchBar
          label={categoryMeta?.searchLabel ?? "Search by Ticket ID"}
          placeholder={categoryMeta?.searchPlaceholder ?? "e.g. 2689652"}
          query={query}
          loading={loading}
          onQueryChange={setQuery}
          onSearch={handleSearch}
          onStop={handleStop}
          inputRef={searchInputRef}
        />
      </Stack>

      {!selectedTicket && filtersConfigured && activeFilters?.areaPath && (
        <FilterChipsBar
          filters={activeFilters}
          onChange={(next) => {
            setActiveFilters(next);
            void load();
          }}
          onOpenSettings={() => handleHeaderNavigate("/settings")}
        />
      )}

      {error && <ErrorMessage message={error} />}

      {generatedAt && (
        <Typography variant="caption" color="text.secondary">
          {!selectedTicket && filtersConfigured && (
            <>
              {tickets.length} {tickets.length === 1 ? "item" : "items"} ·{" "}
            </>
          )}
          Updated: {formatDate(generatedAt)}
        </Typography>
      )}

      {selectedTicket && (
        <Button
          variant="text"
          onClick={showLatestTickets}
          sx={{ alignSelf: "flex-start", pl: 0 }}
        >
          ← {categoryMeta?.backLabel}
        </Button>
      )}

      {!filtersConfigured && !selectedTicket ? (
        <FiltersNotConfiguredState
          onConfigure={() => handleHeaderNavigate("/settings")}
        />
      ) : tickets.length === 0 && !loading ? (
        <EmptyState message={categoryMeta?.emptyMessage} />
      ) : (
        <BugList
          bugs={tickets}
          onOpenBug={openTicket}
          selectedBugId={selectedTicket?.id}
          loading={loading}
          analysisLoading={analysisLoading}
          analysisError={analysisError}
          promptLoading={promptLoading}
          promptError={promptError}
          cleanup={cleanup}
          cleanupLoading={cleanupLoading}
          cleanupError={cleanupError}
          onAnalyze={runAnalysis}
          onGeneratePrompt={loadImplementationPrompt}
        />
      )}
    </>
  );

  return (
    <Layout
      loading={loading}
      currentPath={pathname}
      onNavigate={handleHeaderNavigate}
      recent={recent}
    >
      <Stack spacing={3}>
        {route.page === "home" && renderWelcomePage()}
        {route.page === "settings" && renderSettingsPage()}
        {(route.page === "list" || route.page === "detail") &&
          renderCategoryPage()}
      </Stack>
    </Layout>
  );
}

type WelcomeCardProps = Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}>;

type FiltersNotConfiguredStateProps = Readonly<{
  onConfigure: () => void;
}>;

function FiltersNotConfiguredState({
  onConfigure,
}: FiltersNotConfiguredStateProps) {
  return (
    <Card variant="outlined" sx={{ borderStyle: "dashed" }}>
      <CardContent sx={{ py: 5, textAlign: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <FilterAltOutlinedIcon
            sx={{ fontSize: 40, color: "text.disabled" }}
          />
          <Box>
            <Typography variant="h4" fontWeight={600}>
              No filters configured
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, maxWidth: 460, mx: "auto" }}
            >
              Choose an area path (and optionally an iteration) so DevLens knows
              which work items to load. You can also search by ID directly from
              the bar above.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SettingsOutlinedIcon />}
            onClick={onConfigure}
          >
            Configure filters
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function WelcomeCard({ icon, title, description, onClick }: WelcomeCardProps) {
  return (
    <Card
      sx={(theme) => ({
        flex: 1,
        cursor: "pointer",
        transition: "border-color 0.15s, background-color 0.15s",
        "&:hover": {
          borderColor: theme.palette.text.secondary,
          backgroundColor: theme.palette.action.hover,
        },
      })}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          {icon}
          <Box>
            <Typography variant="h4" fontWeight={600}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
