import { useCallback, useRef, useState } from "react";
import {
  fetchImplementationPrompt,
  fetchTicketAnalysis,
  fetchTicketCleanup,
  fetchTickets,
} from "../services/api";
import type { ApiCleanupResult, ApiTicket, TicketCategory } from "../types";

export function useTickets(category: TicketCategory | null) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [cleanup, setCleanup] = useState<ApiCleanupResult | null>(null);
  const [cleanupTicketId, setCleanupTicketId] = useState<number | null>(null);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filtersConfigured, setFiltersConfigured] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const analysisAbortControllerRef = useRef<AbortController | null>(null);
  const promptAbortControllerRef = useRef<AbortController | null>(null);
  const cleanupAbortControllerRef = useRef<AbortController | null>(null);

  const loadCleanup = useCallback(
    async (ticketId: number) => {
      if (!category) return;

      if (cleanupAbortControllerRef.current) {
        cleanupAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      cleanupAbortControllerRef.current = controller;
      setCleanupLoading(true);
      setCleanupError(null);
      setCleanupTicketId(ticketId);

      try {
        const data = await fetchTicketCleanup(category, ticketId, controller.signal);
        setCleanup(data.cleanup);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setCleanupError("Cleanup cancelled");
        } else {
          setCleanupError(err instanceof Error ? err.message : "Unknown cleanup error");
        }
      } finally {
        setCleanupLoading(false);
        if (cleanupAbortControllerRef.current === controller) {
          cleanupAbortControllerRef.current = null;
        }
      }
    },
    [category],
  );

  const runAnalysis = useCallback(
    async (ticketId: number, repoIds: string[]) => {
      if (!category) {
        return;
      }
      if (repoIds.length === 0) {
        setAnalysisError("Select at least one repository before running analysis.");
        return;
      }

      if (analysisAbortControllerRef.current) {
        analysisAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      analysisAbortControllerRef.current = controller;
      setAnalysisLoading(true);
      setAnalysisError(null);

      try {
        const data = await fetchTicketAnalysis(
          category,
          ticketId,
          repoIds,
          controller.signal,
        );
        setTickets((currentTickets) =>
          currentTickets.map((ticket) =>
            ticket.id === data.ticketId
              ? {
                  ...ticket,
                  aiAnalysis: data.aiAnalysis,
                }
              : ticket,
          ),
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setAnalysisError("AI analysis cancelled");
        } else {
          setAnalysisError(
            err instanceof Error ? err.message : "Unknown AI analysis error",
          );
        }
      } finally {
        setAnalysisLoading(false);
        if (analysisAbortControllerRef.current === controller) {
          analysisAbortControllerRef.current = null;
        }
      }
    },
    [category],
  );

  const loadImplementationPrompt = useCallback(
    async (ticketId: number, repoIds: string[], guidance?: string) => {
      if (repoIds.length === 0) {
        setPromptError("Select at least one repository before generating the prompt.");
        return;
      }

      if (promptAbortControllerRef.current) {
        promptAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      promptAbortControllerRef.current = controller;
      setPromptLoading(true);
      setPromptError(null);

      try {
        const data = await fetchImplementationPrompt(
          ticketId,
          repoIds,
          controller.signal,
          guidance,
        );
        setTickets((currentTickets) =>
          currentTickets.map((ticket) =>
            ticket.id === data.ticketId
              ? { ...ticket, implementationPrompt: data.implementationPrompt }
              : ticket,
          ),
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setPromptError("Prompt generation cancelled");
        } else {
          setPromptError(
            err instanceof Error
              ? err.message
              : "Unknown error generating prompt",
          );
        }
      } finally {
        setPromptLoading(false);
        if (promptAbortControllerRef.current === controller) {
          promptAbortControllerRef.current = null;
        }
      }
    },
    [],
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
    }
    if (promptAbortControllerRef.current) {
      promptAbortControllerRef.current.abort();
    }
    if (cleanupAbortControllerRef.current) {
      cleanupAbortControllerRef.current.abort();
    }

    setLoading(false);
    setError(null);
    setAnalysisLoading(false);
    setAnalysisError(null);
    setPromptLoading(false);
    setPromptError(null);
    setCleanupLoading(false);
    setCleanupError(null);
    setCleanup(null);
    setCleanupTicketId(null);
    setTickets([]);
    setGeneratedAt(null);
    setSelectedTicketId(null);
  }, []);

  const load = useCallback(
    async (ticketId?: string) => {
      if (!category) {
        reset();
        return;
      }

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (analysisAbortControllerRef.current) {
        analysisAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoading(true);
      setError(null);
      setAnalysisError(null);
      setAnalysisLoading(false);
      setSelectedTicketId(ticketId ?? null);
      try {
        const data = await fetchTickets(category, ticketId, controller.signal);
        setTickets(data.tickets);
        setGeneratedAt(data.generatedAt);
        setFiltersConfigured(data.filtersConfigured ?? true);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setError("Request cancelled");
        } else {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        setLoading(false);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [category, reset],
  );

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
    }
    if (promptAbortControllerRef.current) {
      promptAbortControllerRef.current.abort();
    }
    if (cleanupAbortControllerRef.current) {
      cleanupAbortControllerRef.current.abort();
    }
  };

  return {
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
  };
}
