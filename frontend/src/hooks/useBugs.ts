import { useCallback, useRef, useState } from "react";
import {
  fetchImplementationPrompt,
  fetchTicketAnalysis,
  fetchTickets,
} from "../services/api";
import type { ApiTicket, TicketCategory } from "../types";

export function useTickets(category: TicketCategory | null) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const analysisAbortControllerRef = useRef<AbortController | null>(null);
  const promptAbortControllerRef = useRef<AbortController | null>(null);

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

    setLoading(false);
    setError(null);
    setAnalysisLoading(false);
    setAnalysisError(null);
    setPromptLoading(false);
    setPromptError(null);
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
    tickets,
    selectedTicketId,
    generatedAt,
    load,
    reset,
    handleStop,
    runAnalysis,
    loadImplementationPrompt,
  };
}
