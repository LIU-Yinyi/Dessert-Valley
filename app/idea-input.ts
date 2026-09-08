import { requestIdea } from "./idea-generation.ts";

export const MAX_IDEA_IMAGES = 4;
export const MAX_IDEA_TEXT_LENGTH = 16_000;

export type IdeaAttachment = { src: string; name: string };

export function normalizeIdeaAttachments(
  value: unknown,
  legacyImage = "",
  legacyName = ""
): IdeaAttachment[] {
  if (!Array.isArray(value)) {
    return legacyImage ? [{ src: legacyImage, name: legacyName }] : [];
  }
  const seen = new Set<string>();
  return value.flatMap((item): IdeaAttachment[] => {
    if (!item || typeof item !== "object") return [];
    const image = item as Partial<IdeaAttachment>;
    if (typeof image.src !== "string" || !image.src.startsWith("data:image/") ||
      typeof image.name !== "string" || seen.has(image.src)) return [];
    seen.add(image.src);
    return [{ src: image.src, name: image.name.slice(0, 180) }];
  }).slice(0, MAX_IDEA_IMAGES);
}

export function ideaCardFields(value: unknown, images: IdeaAttachment[]) {
  if (!value || typeof value !== "object") throw new Error("invalid_idea");
  const idea = value as {
    title?: unknown; description?: unknown; tags?: unknown; imageIndex?: unknown;
  };
  if (
    typeof idea.title !== "string" || !idea.title.trim() ||
    typeof idea.description !== "string" || !idea.description.trim() ||
    !Array.isArray(idea.tags) || !idea.tags.length ||
    !idea.tags.every((tag) => typeof tag === "string" && tag.trim()) ||
    (images.length
      ? typeof idea.imageIndex !== "number" || !Number.isInteger(idea.imageIndex) ||
        idea.imageIndex < 0 || idea.imageIndex >= images.length
      : idea.imageIndex !== null)
  ) throw new Error("invalid_idea");
  const image = images[idea.imageIndex as number];
  return {
    title: idea.title.trim(),
    prompt: idea.description.trim(),
    tags: Array.from(new Set(idea.tags.map((tag: string) => tag.trim()))),
    image: image?.src ?? "",
    imageName: image?.name ?? "",
  };
}

export async function structureIdea(input: {
  text: string;
  language: "en" | "zh";
  images: IdeaAttachment[];
}) {
  return ideaCardFields(await requestIdea(input), input.images);
}
