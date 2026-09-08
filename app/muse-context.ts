export const MUSE_STAGES = ["idea", "design", "product", "bake"] as const;
export type MuseStage = typeof MUSE_STAGES[number];
export type MuseMessage = { role: "user" | "assistant"; content: string };
export type MuseSource = { id: string; title: string; url: string | null };
export type MuseAnswer = {
  answer: string;
  sources: MuseSource[];
  suggestedStage: MuseStage | null;
  knowledgeVersion: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// A text-only, bounded snapshot: never forward images, recordings, or the full
// persisted workspace. Run in both the browser and the server trust boundary.
export function normalizeMuseContext(value: unknown) {
  const raw = isRecord(value) ? value : {};
  let truncated = raw.truncated === true;
  const text = (value: unknown, max = 240) => {
    if (typeof value !== "string") return "";
    const clean = value.replace(/data:[^\s]+/gi, "[media omitted]").trim();
    if (clean.length > max) truncated = true;
    return clean.slice(0, max);
  };
  const rows = (value: unknown, limit: number) => {
    if (!Array.isArray(value)) return [];
    if (value.length > limit) truncated = true;
    return value.slice(0, limit).filter(isRecord);
  };
  const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e9 ? value : null;
  const dessert = isRecord(raw.dessert) ? raw.dessert : {};
  const rendering = isRecord(raw.rendering) ? raw.rendering : {};
  const handbook = isRecord(raw.handbook) ? raw.handbook : {};
  const context = {
    stage: MUSE_STAGES.includes(raw.stage as MuseStage) ? raw.stage as MuseStage : "idea" as MuseStage,
    ideaDraft: text(raw.ideaDraft, 1600),
    dessert: {
      title: text(dessert.title, 160), description: text(dessert.description, 1800),
      tags: Array.isArray(dessert.tags) ? dessert.tags.slice(0, 12).map((tag) => text(tag, 60)) : [],
      hasImage: dessert.hasImage === true,
    },
    references: rows(raw.references, 10).map((row) => ({
      kind: text(row.kind, 20), title: text(row.title, 120), content: text(row.content, 700),
    })),
    rendering: { available: rendering.available === true, stale: rendering.stale === true, view: text(rendering.view, 20) },
    materials: rows(raw.materials, 30).map((row) => ({
      name: text(row.name, 120), amount: text(row.amount, 40), unit: text(row.unit, 40), note: text(row.note, 200),
    })),
    variants: rows(raw.variants, 10).map((row) => ({
      name: text(row.name, 100), width: text(row.width, 30), height: text(row.height, 30),
      depth: text(row.depth, 30), unit: text(row.unit, 30), scale: number(row.scale),
    })),
    steps: rows(raw.steps, 12).map((row) => ({ title: text(row.title, 120), instruction: text(row.instruction, 700) })),
    batches: rows(raw.batches, 20).map((row) => ({ dessert: text(row.dessert, 160), variant: text(row.variant, 100), count: number(row.count) })),
    materialTotals: rows(raw.materialTotals, 30).map((row) => ({ name: text(row.name, 120), amount: number(row.amount), unit: text(row.unit, 40) })),
    bakeMode: raw.bakeMode === "chef" || raw.bakeMode === "diner" ? raw.bakeMode : null,
    handbook: {
      desserts: Array.isArray(handbook.desserts) ? handbook.desserts.slice(0, 20).map((name) => text(name, 160)) : [],
      style: text(handbook.style, 800), pageCount: number(handbook.pageCount),
      generated: handbook.generated === true, stale: handbook.stale === true,
    },
  };
  return { ...context, truncated };
}

export type MuseContext = ReturnType<typeof normalizeMuseContext>;
