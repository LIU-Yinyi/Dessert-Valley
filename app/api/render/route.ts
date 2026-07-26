type ReferenceKind = "text" | "audio" | "image" | "canvas";
type ViewStyle = "exterior" | "cutaway";

type RenderReference = {
  kind: ReferenceKind;
  title: string;
  content: string;
  asset?: string;
};

type RenderRequest = {
  idea: {
    title: string;
    prompt: string;
    tags: string[];
  };
  references: RenderReference[];
  view: ViewStyle;
};

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

const MAX_REFERENCES = 20;
const MAX_VISUAL_REFERENCES = 6;
const MAX_REQUEST_BYTES = 28 * 1024 * 1024;
const DATA_IMAGE_PATTERN =
  /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\r\n]+)$/i;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
}

function parseRenderRequest(value: unknown): RenderRequest | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<RenderRequest>;
  const idea = candidate.idea;
  if (!idea || typeof idea !== "object") return null;

  const title = cleanText(idea.title, 160);
  const prompt = cleanText(idea.prompt, 2400);
  const view = candidate.view === "cutaway" ? "cutaway" : "exterior";
  const tags = Array.isArray(idea.tags)
    ? idea.tags.map((tag) => cleanText(tag, 80)).filter(Boolean).slice(0, 16)
    : [];
  const references = Array.isArray(candidate.references)
    ? candidate.references
        .slice(0, MAX_REFERENCES)
        .flatMap((reference): RenderReference[] => {
          if (!reference || typeof reference !== "object") return [];
          const kind = reference.kind;
          if (
            kind !== "text" &&
            kind !== "audio" &&
            kind !== "image" &&
            kind !== "canvas"
          ) {
            return [];
          }
          return [
            {
              kind,
              title: cleanText(reference.title, 160) || `${kind} reference`,
              content: cleanText(reference.content, 1800),
              asset:
                typeof reference.asset === "string" &&
                DATA_IMAGE_PATTERN.test(reference.asset)
                  ? reference.asset
                  : undefined,
            },
          ];
        })
    : [];

  if (!title || !references.length) return null;
  return { idea: { title, prompt, tags }, references, view };
}

function referenceGuidance(reference: RenderReference, index: number) {
  const label = `${index + 1}. ${reference.kind.toUpperCase()} — "${reference.title}"`;
  const description = reference.content || "No additional written note.";
  if (reference.kind === "canvas") {
    return `${label}: ${description} Treat its strokes as deliberate silhouette, proportion, placement, and composition instructions.`;
  }
  if (reference.kind === "image") {
    return `${label}: ${description} Use its visible form, palette, material, texture, and decoration only where consistent with the written intent.`;
  }
  if (reference.kind === "audio") {
    return `${label}: ${description} This is the written note or transcript associated with the voice reference.`;
  }
  return `${label}: ${description}`;
}

export function buildRenderingPrompt(request: RenderRequest) {
  const viewInstruction =
    request.view === "cutaway"
      ? "Show one clean, intentional cutaway or cross-section that clearly reveals the dessert's edible layers and internal structure while retaining enough exterior to understand the final form."
      : "Show the complete finished exterior from a three-quarter hero angle so the silhouette, surface finish, decoration, and scale are easy to judge.";
  const visualReferences = request.references.filter(
    (reference) =>
      Boolean(reference.asset) &&
      (reference.kind === "image" || reference.kind === "canvas")
  );
  const visualMap = visualReferences.length
    ? visualReferences
        .map(
          (reference, index) =>
            `Input image ${index + 1} corresponds to the ${reference.kind} reference titled "${reference.title}".`
        )
        .join("\n")
    : "There are no visual input images; use the written intent precisely.";

  return [
    "Create a new, photorealistic patisserie product concept from the complete Design Dock intent package below.",
    "The result must be a plausible edible dessert—not a copy-paste collage of the references. Reconcile every compatible instruction into one coherent design.",
    "Later references have priority when references conflict. Preserve unusual user-requested shapes, colors, textures, and decorations rather than replacing them with a generic cake.",
    "Unless the intent explicitly asks for a celebration cake or a large shared format, design it as a refined single-serving dessert.",
    "",
    `IDEA NAME: ${request.idea.title}`,
    `IDEA BRIEF: ${request.idea.prompt || "No separate idea brief."}`,
    `TAGS: ${request.idea.tags.join(", ") || "none"}`,
    "",
    "DESIGN DOCK REFERENCES (in order):",
    ...request.references.map(referenceGuidance),
    "",
    "VISUAL INPUT MAP:",
    visualMap,
    "",
    `REQUESTED VIEW: ${request.view.toUpperCase()}`,
    viewInstruction,
    "",
    "Presentation: one dessert only, centered on a quiet warm neutral studio surface, soft directional food-photography light, high-end pastry editorial realism, crisp edible textures, natural scale.",
    "Do not add people, hands, utensils, packaging, written labels, typography, logos, watermarks, UI elements, diagrams, callouts, or multiple alternative designs.",
  ].join("\n");
}

function dataUrlToBlob(source: string) {
  const match = source.match(DATA_IMAGE_PATTERN);
  if (!match) throw new Error("Unsupported image reference");
  const mimeType = match[1].toLowerCase();
  const binary = atob(match[2].replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function upstreamErrorStatus(status: number, error?: OpenAIImageResponse["error"]) {
  const code = error?.code ?? "";
  if (status === 401 || status === 403) {
    return {
      status: 503,
      code: "not_configured",
      message: "Image generation is not configured.",
    };
  }
  if (status === 429) {
    return {
      status: 429,
      code: "rate_limit",
      message: "The image studio is busy. Please try again shortly.",
    };
  }
  if (
    code.includes("moderation") ||
    error?.type?.includes("moderation") ||
    error?.message?.toLowerCase().includes("safety")
  ) {
    return {
      status: 422,
      code: "moderation_blocked",
      message: "The intent package or a reference image needs to be revised.",
    };
  }
  return {
    status: 502,
    code: "generation_failed",
    message: "The product rendering could not be generated.",
  };
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json(
      {
        error: {
          code: "request_too_large",
          message: "The reference package is too large.",
        },
      },
      413
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: { code: "invalid_request", message: "Invalid JSON request." } },
      400
    );
  }

  const renderRequest = parseRenderRequest(body);
  if (!renderRequest) {
    return json(
      {
        error: {
          code: "invalid_request",
          message: "An idea and at least one valid reference are required.",
        },
      },
      400
    );
  }

  let cloudflareEnv: { OPENAI_API_KEY?: string } = {};
  try {
    const runtime = await import("cloudflare:workers");
    cloudflareEnv = runtime.env as unknown as { OPENAI_API_KEY?: string };
  } catch {
    // The production Worker exposes bindings through cloudflare:workers.
    // Node-based local tests can use process.env instead.
  }
  const apiKey = (
    cloudflareEnv.OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY ??
    ""
  ).trim();
  if (!apiKey) {
    return json(
      {
        error: {
          code: "not_configured",
          message: "Image generation is not configured.",
        },
      },
      503
    );
  }

  const prompt = buildRenderingPrompt(renderRequest);
  const visualReferences = renderRequest.references
    .filter(
      (reference) =>
        Boolean(reference.asset) &&
        (reference.kind === "image" || reference.kind === "canvas")
    )
    .slice(0, MAX_VISUAL_REFERENCES);

  let upstream: Response;
  try {
    if (visualReferences.length) {
      const form = new FormData();
      form.set("model", "gpt-image-1-mini");
      form.set("prompt", prompt);
      form.set("size", "1024x768");
      form.set("quality", "medium");
      form.set("output_format", "jpeg");
      form.set("output_compression", "88");
      form.set("moderation", "auto");
      visualReferences.forEach((reference, index) => {
        form.append(
          "image[]",
          dataUrlToBlob(reference.asset ?? ""),
          `design-reference-${index + 1}.jpg`
        );
      });
      upstream = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } else {
      upstream = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1-mini",
          prompt,
          size: "1024x768",
          quality: "medium",
          output_format: "jpeg",
          output_compression: 88,
          moderation: "auto",
        }),
      });
    }
  } catch {
    return json(
      {
        error: {
          code: "generation_unavailable",
          message: "The image service is temporarily unavailable.",
        },
      },
      503
    );
  }

  const requestId = upstream.headers.get("x-request-id") ?? undefined;
  let result: OpenAIImageResponse;
  try {
    result = (await upstream.json()) as OpenAIImageResponse;
  } catch {
    result = {};
  }

  if (!upstream.ok) {
    const mapped = upstreamErrorStatus(upstream.status, result.error);
    console.error("Dessert rendering request failed", {
      status: upstream.status,
      requestId,
      code: result.error?.code,
    });
    return json(
      {
        error: { code: mapped.code, message: mapped.message },
        requestId,
      },
      mapped.status
    );
  }

  const base64Image = result.data?.[0]?.b64_json;
  if (!base64Image) {
    return json(
      {
        error: {
          code: "empty_generation",
          message: "The image service returned no rendering.",
        },
        requestId,
      },
      502
    );
  }

  return json({
    image: `data:image/jpeg;base64,${base64Image}`,
    model: "gpt-image-1-mini",
    inputCount: renderRequest.references.length,
    visualInputCount: visualReferences.length,
    requestId,
  });
}
