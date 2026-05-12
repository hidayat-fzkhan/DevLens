export function getQueryRepoIds(query: Record<string, unknown>): string[] {
  const raw = query.repoIds;
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function getQueryTicketId(query: Record<string, unknown>): number | undefined {
  const candidates = [query.ticketId, query.bugId, query.storyId];
  const raw = candidates.find((value) => typeof value === "string");

  if (typeof raw !== "string") return undefined;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getQueryStringTrimmed(
  query: Record<string, unknown>,
  key: string,
): string | undefined {
  const raw = query[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
