type HandbookLanguage = "en" | "zh";

type HandbookDessert = {
  title: string;
  description: string;
  tags: string[];
  asset?: string;
};

type HandbookRequest = {
  language: HandbookLanguage;
  stylePrompt: string;
  pageCount: number;
  styleReference?: {
    name: string;
    asset?: string;
  };
  desserts: HandbookDessert[];
};

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

type VisualReference = {
  role: "style" | "dessert";
  title: string;
  asset: string;
};

const MAX_DESSERTS = 12;
const MAX_VISUAL_REFERENCES = 6;
const MAX_PAGES = 4;
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;
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

function parseHandbookRequest(value: unknown): HandbookRequest | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<HandbookRequest>;
  const pageCount =
    candidate.pageCount === undefined
      ? 1
      : typeof candidate.pageCount === "number" &&
          Number.isInteger(candidate.pageCount) &&
          candidate.pageCount >= 1 &&
          candidate.pageCount <= MAX_PAGES
        ? candidate.pageCount
        : null;
  if (pageCount === null) return null;
  const desserts = Array.isArray(candidate.desserts)
    ? candidate.desserts
        .slice(0, MAX_DESSERTS)
        .flatMap((dessert): HandbookDessert[] => {
          if (!dessert || typeof dessert !== "object") return [];
          const title = cleanText(dessert.title, 180);
          if (!title) return [];
          return [
            {
              title,
              description: cleanText(dessert.description, 1600),
              tags: Array.isArray(dessert.tags)
                ? dessert.tags
                    .map((tag) => cleanText(tag, 80))
                    .filter(Boolean)
                    .slice(0, 12)
                : [],
              asset:
                typeof dessert.asset === "string" &&
                DATA_IMAGE_PATTERN.test(dessert.asset)
                  ? dessert.asset
                  : undefined,
            },
          ];
        })
    : [];

  if (!desserts.length) return null;

  const reference = candidate.styleReference;
  const styleReference =
    reference &&
    typeof reference === "object" &&
    typeof reference.asset === "string" &&
    DATA_IMAGE_PATTERN.test(reference.asset)
      ? {
          name: cleanText(reference.name, 180) || "Style reference",
          asset: reference.asset,
        }
      : undefined;

  return {
    language: candidate.language === "zh" ? "zh" : "en",
    stylePrompt: cleanText(candidate.stylePrompt, 3000),
    pageCount,
    styleReference,
    desserts,
  };
}

function collectVisualReferences(request: HandbookRequest) {
  const references: VisualReference[] = [];
  if (request.styleReference?.asset) {
    references.push({
      role: "style",
      title: request.styleReference.name,
      asset: request.styleReference.asset,
    });
  }
  request.desserts.forEach((dessert) => {
    if (dessert.asset) {
      references.push({
        role: "dessert",
        title: dessert.title,
        asset: dessert.asset,
      });
    }
  });
  return references.slice(0, MAX_VISUAL_REFERENCES);
}

function pageFocus(request: HandbookRequest, pageIndex: number) {
  if (request.pageCount === 1) {
    return {
      role:
        "A complete single-page collection overview that works as both cover and menu.",
      desserts: request.desserts,
    };
  }
  if (pageIndex === 0) {
    return {
      role:
        "The opening cover and visual contents page for the complete selected collection.",
      desserts: request.desserts,
    };
  }

  const interiorPageCount = request.pageCount - 1;
  const assignedDesserts = request.desserts.filter(
    (_dessert, dessertIndex) =>
      dessertIndex % interiorPageCount === pageIndex - 1
  );
  const fallbackRoles = [
    "An editorial dessert profile focused on form, finish, and flavor.",
    "A craft-detail chapter focused on texture, layers, and ingredients.",
    "A quiet serving-story or closing chapter for the collection.",
  ];
  return {
    role:
      assignedDesserts.length > 0
        ? "An editorial dessert profile page for the assigned selected cards."
        : fallbackRoles[(pageIndex - 1) % fallbackRoles.length],
    desserts:
      assignedDesserts.length > 0
        ? assignedDesserts
        : [request.desserts[(pageIndex - 1) % request.desserts.length]],
  };
}

export function buildHandbookPrompt(
  request: HandbookRequest,
  pageIndex = 0
) {
  const visualReferences = collectVisualReferences(request);
  const focus = pageFocus(request, pageIndex);
  const styleDirection =
    request.stylePrompt ||
    "A warm, refined countryside patisserie menu with quiet botanical details, tactile cream paper, and elegant editorial food styling.";
  const visualMap = visualReferences.length
    ? visualReferences.map((reference, index) => {
        if (reference.role === "style") {
          return `Input image ${index + 1} is the user's style reference "${reference.title}". Use its palette, material feeling, spacing rhythm, and visual mood without copying text, logos, characters, or identifiable branded elements.`;
        }
        return `Input image ${index + 1} shows the selected dessert "${reference.title}". Preserve its recognizable silhouette, finish, color, and decoration when creating a small editorial vignette.`;
      })
    : ["No visual reference images are available. Follow the written direction."];

  const handbookTitle =
    request.language === "zh" ? "甜点手册" : "DESSERT HANDBOOK";
  const visibleCopy = [
    "DESSERT VALLEY",
    handbookTitle,
    ...focus.desserts.flatMap((dessert, index) => [
      `${String(index + 1).padStart(2, "0")} ${dessert.title}`,
      dessert.description,
    ]),
  ].filter(Boolean);

  return [
    `Create finished page ${pageIndex + 1} of ${request.pageCount} for an original premium tabletop dessert handbook.`,
    "The entire portrait 2:3 canvas must be the final, presentation-ready handbook page image. Do not make a background template for later browser text overlays.",
    `PAGE ROLE: ${focus.role}`,
    "Compose the food photography, illustration, borders, paper, spacing, and every visible typographic element together as one finished image.",
    "Use the selected dessert cards below as authoritative supplemental source material. Preserve recognizable dessert silhouettes, finishes, colors, decorations, names, and flavor descriptions.",
    "Keep this page visually coherent with the rest of the handbook: consistent palette, margins, typographic hierarchy, botanical motifs, and editorial rhythm.",
    "Visible text must use only the exact copy supplied below. It may be shortened by omitting a description when space is tight, but do not invent desserts, rewrite names, add fake paragraphs, or add illegible pseudo-text.",
    "Avoid empty placeholder boxes, UI controls, mockup hands, separate loose pages, watermarks, and branded logos.",
    "Do not copy recognizable game assets, characters, interfaces, or branded designs from the reference image.",
    "",
    `USER STYLE DIRECTION: ${styleDirection}`,
    "",
    "EXACT VISIBLE COPY FOR THIS PAGE:",
    ...visibleCopy,
    "",
    "COMPLETE SELECTED DESSERT CARD SOURCE:",
    ...request.desserts.map(
      (dessert, index) =>
        `${index + 1}. ${dessert.title} — ${
          dessert.description || "No additional description."
        }${
          dessert.tags.length
            ? ` Tags: ${dessert.tags.join(", ")}.`
            : ""
        }`
    ),
    "",
    "VISUAL INPUT MAP:",
    ...visualMap,
    "",
    "Finish: refined printed-handbook realism with tactile paper, balanced margins, soft directional light, appetizing dessert imagery, and polished patisserie editorial typography.",
    `Output only the complete final image for page ${pageIndex + 1}; do not show alternative versions or a page mockup.`,
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

function upstreamErrorStatus(
  status: number,
  error?: OpenAIImageResponse["error"]
) {
  const code = error?.code ?? "";
  if (status === 401 || status === 403) {
    return {
      status: 503,
      code: "not_configured",
      message: "Handbook generation is not configured.",
    };
  }
  if (status === 429) {
    return {
      status: 429,
      code: "rate_limit",
      message: "The handbook studio is busy. Please try again shortly.",
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
      message: "The style prompt or reference image needs to be revised.",
    };
  }
  return {
    status: 502,
    code: "generation_failed",
    message: "The dessert handbook artwork could not be generated.",
  };
}

class HandbookGenerationError extends Error {
  status: number;
  code: string;
  requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string
  ) {
    super(message);
    this.name = "HandbookGenerationError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function requestHandbookPage(
  handbookRequest: HandbookRequest,
  visualReferences: VisualReference[],
  apiKey: string,
  pageIndex: number
) {
  const prompt = buildHandbookPrompt(handbookRequest, pageIndex);
  let upstream: Response;
  try {
    if (visualReferences.length) {
      const form = new FormData();
      form.set("model", "gpt-image-2");
      form.set("prompt", prompt);
      form.set("size", "1024x1536");
      form.set("quality", "medium");
      form.set("output_format", "jpeg");
      form.set("output_compression", "88");
      form.set("moderation", "auto");
      visualReferences.forEach((reference, index) => {
        form.append(
          "image[]",
          dataUrlToBlob(reference.asset),
          `handbook-${reference.role}-${index + 1}.jpg`
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
          model: "gpt-image-2",
          prompt,
          size: "1024x1536",
          quality: "medium",
          output_format: "jpeg",
          output_compression: 88,
          moderation: "auto",
        }),
      });
    }
  } catch {
    throw new HandbookGenerationError(
      503,
      "generation_unavailable",
      "The handbook studio is temporarily unavailable."
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
    console.error("Dessert handbook page request failed", {
      status: upstream.status,
      requestId,
      pageNumber: pageIndex + 1,
      code: result.error?.code,
    });
    throw new HandbookGenerationError(
      mapped.status,
      mapped.code,
      mapped.message,
      requestId
    );
  }

  const base64Image = result.data?.[0]?.b64_json;
  if (!base64Image) {
    throw new HandbookGenerationError(
      502,
      "empty_generation",
      "The handbook studio returned no artwork.",
      requestId
    );
  }

  return {
    image: `data:image/jpeg;base64,${base64Image}`,
    requestId,
  };
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json(
      {
        error: {
          code: "request_too_large",
          message: "The handbook reference package is too large.",
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

  const handbookRequest = parseHandbookRequest(body);
  if (!handbookRequest) {
    return json(
      {
        error: {
          code: "invalid_request",
          message: "Select at least one valid dessert card.",
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
    // Production exposes bindings through cloudflare:workers.
    // Node-based validation can use process.env instead.
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
          message: "Handbook generation is not configured.",
        },
      },
      503
    );
  }

  const visualReferences = collectVisualReferences(handbookRequest);
  try {
    const pages: Array<{ image: string; requestId?: string }> = [];
    for (
      let batchStart = 0;
      batchStart < handbookRequest.pageCount;
      batchStart += 2
    ) {
      const pageIndices = Array.from(
        {
          length: Math.min(2, handbookRequest.pageCount - batchStart),
        },
        (_value, offset) => batchStart + offset
      );
      const batch = await Promise.all(
        pageIndices.map((pageIndex) =>
          requestHandbookPage(
            handbookRequest,
            visualReferences,
            apiKey,
            pageIndex
          )
        )
      );
      pages.push(...batch);
    }
    return json({
      images: pages.map((page) => page.image),
      model: "gpt-image-2",
      pageCount: pages.length,
      dessertCount: handbookRequest.desserts.length,
      visualInputCount: visualReferences.length,
      requestIds: pages.flatMap((page) =>
        page.requestId ? [page.requestId] : []
      ),
    });
  } catch (error) {
    const failure =
      error instanceof HandbookGenerationError
        ? error
        : new HandbookGenerationError(
            503,
            "generation_unavailable",
            "The handbook studio is temporarily unavailable."
          );
    return json(
      {
        error: {
          code: failure.code,
          message: failure.message,
        },
        requestId: failure.requestId,
      },
      failure.status
    );
  }
}
