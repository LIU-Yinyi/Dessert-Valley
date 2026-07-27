export type HandbookResult = {
  pages: string[];
  signature: string;
  dessertCount: number;
  visualInputCount: number;
};

export const DEFAULT_HANDBOOK_PAGE_COUNT = 3;
export const MAX_HANDBOOK_PAGE_COUNT = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeHandbookResult(
  value: unknown
): HandbookResult | null {
  if (!isRecord(value)) return null;
  const pages = (
    Array.isArray(value.pages)
      ? value.pages
      : typeof value.src === "string"
        ? [value.src]
        : []
  )
    .filter(
      (page): page is string =>
        typeof page === "string" && page.trim().length > 0
    )
    .slice(0, MAX_HANDBOOK_PAGE_COUNT);
  if (!pages.length || typeof value.signature !== "string") return null;

  const dessertCount = Number(value.dessertCount);
  const visualInputCount = Number(value.visualInputCount);
  return {
    pages,
    signature: value.signature,
    dessertCount: Number.isFinite(dessertCount)
      ? Math.max(0, dessertCount)
      : 0,
    visualInputCount: Number.isFinite(visualInputCount)
      ? Math.max(0, visualInputCount)
      : 0,
  };
}
