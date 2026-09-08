import { requestMuse } from "./muse-generation.ts";
import { isRecord, MUSE_STAGES, type MuseAnswer, type MuseContext, type MuseMessage, type MuseStage } from "./muse-context.ts";

export async function askMuse(input: { language: "en" | "zh"; context: MuseContext; messages: MuseMessage[] }, signal?: AbortSignal): Promise<MuseAnswer> {
  const payload: unknown = await requestMuse(input, signal);
  if (!isRecord(payload) || typeof payload.answer !== "string" || !payload.answer.trim() ||
    payload.answer.length > 6000 || typeof payload.knowledgeVersion !== "string" || !Array.isArray(payload.sources) ||
    payload.sources.length > 4 || !payload.sources.every((source) => isRecord(source) && typeof source.id === "string" && typeof source.title === "string" &&
      (source.url === null || (typeof source.url === "string" && /^https:\/\/(www\.)?(kingarthurbaking\.com|callebaut\.com|fda\.gov)\//.test(source.url)))) ||
    (payload.suggestedStage !== null && !MUSE_STAGES.includes(payload.suggestedStage as MuseStage))) throw new Error("invalid_advice");
  return payload as MuseAnswer;
}
