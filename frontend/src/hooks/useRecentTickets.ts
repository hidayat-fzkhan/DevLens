import { useCallback, useEffect, useState } from "react";
import type { TicketCategory } from "../types";

const STORAGE_KEY = "devlens.recentTickets";
const MAX_RECENT = 5;

export type RecentTicket = {
  id: number;
  category: TicketCategory;
  title: string;
  visitedAt: string;
};

function readFromStorage(): RecentTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RecentTicket =>
        entry &&
        typeof entry.id === "number" &&
        (entry.category === "bugs" || entry.category === "user-stories") &&
        typeof entry.title === "string" &&
        typeof entry.visitedAt === "string",
    );
  } catch {
    return [];
  }
}

function writeToStorage(items: RecentTicket[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota/private-mode errors
  }
}

export function useRecentTickets() {
  const [recent, setRecent] = useState<RecentTicket[]>(readFromStorage);

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        setRecent(readFromStorage());
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const record = useCallback(
    (entry: Omit<RecentTicket, "visitedAt">) => {
      setRecent((prev) => {
        const next: RecentTicket[] = [
          { ...entry, visitedAt: new Date().toISOString() },
          ...prev.filter(
            (item) => !(item.id === entry.id && item.category === entry.category),
          ),
        ].slice(0, MAX_RECENT);
        writeToStorage(next);
        return next;
      });
    },
    [],
  );

  const clear = useCallback(() => {
    writeToStorage([]);
    setRecent([]);
  }, []);

  return { recent, record, clear };
}
