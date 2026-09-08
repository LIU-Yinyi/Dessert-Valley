import { isRecord, MUSE_STAGES, type MuseAnswer, type MuseContext, type MuseMessage, type MuseStage } from "./muse-context.ts";

export async function askMuse(input: { language: "en" | "zh"; context: MuseContext; messages: MuseMessage[] }, signal?: AbortSignal): Promise<MuseAnswer> {
  const response = await fetch("/api/muse", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(isRecord(payload) && isRecord(payload.error) && typeof payload.error.code === "string" ? payload.error.code : "muse_unavailable");
  if (!isRecord(payload) || typeof payload.answer !== "string" || !payload.answer.trim() ||
    payload.answer.length > 6000 || typeof payload.knowledgeVersion !== "string" || !Array.isArray(payload.sources) ||
    payload.sources.length > 4 || !payload.sources.every((source) => isRecord(source) && typeof source.id === "string" && typeof source.title === "string" &&
      (source.url === null || (typeof source.url === "string" && /^https:\/\/(www\.)?(kingarthurbaking\.com|callebaut\.com|fda\.gov)\//.test(source.url)))) ||
    (payload.suggestedStage !== null && !MUSE_STAGES.includes(payload.suggestedStage as MuseStage))) throw new Error("invalid_advice");
  return payload as MuseAnswer;
}
