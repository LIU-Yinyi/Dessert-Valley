import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  BrowserApiError,
  buildHandbookPrompt,
  generateHandbook,
  generateProductRendering,
  importMaterials,
  normalizeApiBaseUrl,
  requestPlanAdvice,
  transcribeAudioToText,
} from "../app/browser-ai.ts";

const originalFetch = globalThis.fetch;
const config = {
  baseUrl: "https://models.example/v1/",
  secretKey: "test-secret",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function imageResponse(label) {
  return Response.json({
    data: [{ b64_json: Buffer.from(label).toString("base64") }],
  });
}

function renderingRequest(overrides = {}) {
  return {
    idea: {
      title: "Pear Tea Cloud",
      prompt: "A single-serve pear and jasmine mousse.",
      tags: ["pear", "jasmine"],
    },
    references: [
      {
        kind: "text",
        title: "Shape",
        content: "A low moon-shaped silhouette.",
      },
    ],
    view: "exterior",
    ...overrides,
  };
}

function materialRequest(source) {
  return {
    language: "en",
    product: {
      title: "Pear Tea Cloud",
      description: "A single-serve pear and jasmine mousse.",
      tags: ["pear", "jasmine"],
    },
    source,
  };
}

function handbookRequest(overrides = {}) {
  return {
    language: "en",
    stylePrompt: "A quiet riverside tea salon with botanical borders.",
    pageCount: 3,
    desserts: [
      {
        title: "Moonlit Jasmine Cloud",
        description: "A pear and jasmine mousse with a translucent tea veil.",
        tags: ["pear", "jasmine"],
      },
      {
        title: "Strawberry Picnic Box",
        description: "A single-serve strawberry shortcake picnic box.",
        tags: ["berry", "picnic"],
      },
    ],
    ...overrides,
  };
}

test("normalizes a safe API base URL and rejects ambiguous URLs", () => {
  assert.equal(
    normalizeApiBaseUrl(" https://models.example/v1/// "),
    "https://models.example/v1",
  );
  assert.throws(
    () => normalizeApiBaseUrl("https://models.example/v1?token=secret"),
    (error) =>
      error instanceof BrowserApiError && error.code === "invalid_api_url",
  );
  assert.throws(
    () => normalizeApiBaseUrl("ftp://models.example/v1"),
    (error) =>
      error instanceof BrowserApiError && error.code === "invalid_api_url",
  );
});

test("does not contact a provider when the browser credential is missing", async () => {
  let contactedProvider = false;
  globalThis.fetch = async () => {
    contactedProvider = true;
    return imageResponse("unused");
  };

  await assert.rejects(
    generateProductRendering(
      { baseUrl: "https://models.example/v1", secretKey: "" },
      renderingRequest(),
    ),
    (error) =>
      error instanceof BrowserApiError && error.code === "not_configured",
  );
  assert.equal(contactedProvider, false);
});

test("sends image generation directly to the configured browser endpoint", async () => {
  let providerBody;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://models.example/v1/images/generations");
    assert.equal(init?.headers.Authorization, "Bearer test-secret");
    providerBody = JSON.parse(String(init?.body));
    return imageResponse("rendering");
  };

  const result = await generateProductRendering(config, renderingRequest());

  assert.match(result.image, /^data:image\/jpeg;base64,/);
  assert.equal(result.inputCount, 1);
  assert.equal(providerBody.model, "gpt-image-2");
  assert.equal(providerBody.size, "1024x768");
  assert.match(providerBody.prompt, /DESIGN DOCK REFERENCES/);
});

test("sends visual references through the configured image edit endpoint", async () => {
  const image = "data:image/png;base64,iVBORw0KGgo=";
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://models.example/v1/images/edits");
    assert.ok(init?.body instanceof FormData);
    assert.equal(init.body.get("model"), "gpt-image-2");
    assert.equal(init.body.getAll("image[]").length, 1);
    return imageResponse("edited");
  };

  const result = await generateProductRendering(
    config,
    renderingRequest({
      references: [
        {
          kind: "image",
          title: "Pear finish",
          content: "Use the soft green glaze.",
          asset: image,
        },
      ],
    }),
  );

  assert.equal(result.visualInputCount, 1);
});

test("parses structured making-plan advice without replacing existing content", async () => {
  let providerBody;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://models.example/v1/responses");
    providerBody = JSON.parse(String(init?.body));
    return Response.json({
      output_text: JSON.stringify({
        rationale: "The pear purée anchors the mousse.",
        steps: [
          {
            title: "Fold the mousse",
            instruction: "Fold 120 g pear purée into the prepared base.",
          },
        ],
      }),
    });
  };

  const advice = await requestPlanAdvice(config, {
    language: "en",
    product: {
      title: "Pear Tea Cloud",
      description: "Pear mousse",
      tags: ["pear"],
      designReferences: [],
      renderingView: null,
    },
    variants: [],
    materials: [
      {
        name: "Pear purée",
        amount: "120",
        unit: "g",
        note: "",
        variantAmounts: [],
      },
    ],
    existingSteps: [
      {
        title: "Prepare the mould",
        instruction: "Chill the clean mould.",
      },
    ],
  });

  assert.equal(advice.steps.length, 1);
  assert.equal(providerBody.model, "gpt-5.6-luna");
  assert.equal(providerBody.store, false);
  assert.equal(providerBody.text.format.strict, true);
  assert.match(providerBody.instructions, /Existing user-authored steps are present/);
});

test("extracts and normalizes material rows from text", async () => {
  let providerBody;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://models.example/v1/responses");
    providerBody = JSON.parse(String(init?.body));
    return Response.json({
      output_text: JSON.stringify({
        summary: "Two materials found.",
        materials: [
          {
            name: "Pear purée",
            amount: "120.0",
            unit: "g",
            note: "strained",
          },
          {
            name: "Jasmine tea",
            amount: "unclear",
            unit: "g",
            note: "verify",
          },
        ],
      }),
    });
  };

  const result = await importMaterials(
    config,
    materialRequest({
      kind: "text",
      content: "Pear purée 120 g; jasmine tea, amount unclear.",
      filename: "",
      mimeType: "text/plain",
    }),
  );

  assert.deepEqual(result.materials, [
    { name: "Pear purée", amount: "120", unit: "g", note: "strained" },
    { name: "Jasmine tea", amount: "", unit: "g", note: "verify" },
  ]);
  assert.equal(providerBody.text.format.name, "dessert_material_import");
  assert.equal(providerBody.text.format.strict, true);
});

test("transcribes browser audio before extracting material rows", async () => {
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: init?.body });
    if (url.endsWith("/audio/transcriptions")) {
      return Response.json({ text: "Pear purée 120 grams" });
    }
    return Response.json({
      output_text: JSON.stringify({
        summary: "One material found.",
        materials: [
          { name: "Pear purée", amount: "120", unit: "g", note: "" },
        ],
      }),
    });
  };

  const result = await importMaterials(
    config,
    materialRequest({
      kind: "audio",
      content: "data:audio/webm;base64,AAAA",
      filename: "recipe.webm",
      mimeType: "audio/webm",
    }),
  );

  assert.equal(result.materials.length, 1);
  assert.equal(calls[0].url, "https://models.example/v1/audio/transcriptions");
  assert.equal(calls[0].body.get("model"), "gpt-4o-mini-transcribe");
  assert.equal(calls[1].url, "https://models.example/v1/responses");
  assert.match(JSON.parse(String(calls[1].body)).input, /Pear purée 120 grams/);
});

test("transcribes a recorded design direction through the configured browser API", async () => {
  let providerBody;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://models.example/v1/audio/transcriptions");
    assert.equal(init?.headers.Authorization, "Bearer test-secret");
    providerBody = init?.body;
    return Response.json({
      text: "Make the silhouette lower and the tea veil more translucent.",
    });
  };

  const transcript = await transcribeAudioToText(config, {
    content: "data:audio/webm;base64,AAAA",
    filename: "design-direction.webm",
    mimeType: "audio/webm",
  });

  assert.equal(
    transcript,
    "Make the silhouette lower and the tea veil more translucent.",
  );
  assert.ok(providerBody instanceof FormData);
  assert.equal(providerBody.get("model"), "gpt-4o-mini-transcribe");
  assert.equal(providerBody.get("response_format"), "json");
  assert.equal(providerBody.get("file").name, "design-direction.webm");
});

test("rejects an invalid voice direction before contacting the provider", async () => {
  let contactedProvider = false;
  globalThis.fetch = async () => {
    contactedProvider = true;
    return Response.json({ text: "unused" });
  };

  await assert.rejects(
    transcribeAudioToText(config, {
      content: "data:text/plain;base64,AAAA",
      filename: "not-a-recording.txt",
      mimeType: "text/plain",
    }),
    (error) =>
      error instanceof BrowserApiError && error.code === "invalid_request",
  );
  assert.equal(contactedProvider, false);
});

test("generates distinct handbook pages from the browser", async () => {
  const providerBodies = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://models.example/v1/images/generations");
    const body = JSON.parse(String(init?.body));
    providerBodies.push(body);
    return imageResponse(`page-${providerBodies.length}`);
  };

  const result = await generateHandbook(config, handbookRequest());

  assert.equal(result.images.length, 3);
  assert.equal(result.dessertCount, 2);
  assert.equal(providerBodies.length, 3);
  assert.match(providerBodies[0].prompt, /page 1 of 3/);
  assert.match(providerBodies[1].prompt, /page 2 of 3/);
  assert.match(providerBodies[2].prompt, /page 3 of 3/);
  assert.equal(providerBodies[0].size, "1024x1536");
});

test("maps browser network and provider errors to safe local codes", async () => {
  globalThis.fetch = async () => {
    throw new Error("private network detail");
  };
  await assert.rejects(
    generateHandbook(config, handbookRequest({ pageCount: 1 })),
    (error) =>
      error instanceof BrowserApiError && error.code === "connection_failed",
  );

  globalThis.fetch = async () =>
    Response.json(
      {
        error: {
          code: "rate_limit_exceeded",
          message: "private upstream detail",
        },
      },
      { status: 429 },
    );
  await assert.rejects(
    generateHandbook(config, handbookRequest({ pageCount: 1 })),
    (error) =>
      error instanceof BrowserApiError &&
      error.code === "rate_limit" &&
      !error.message.includes("private upstream detail"),
  );
});

test("builds a finished handbook prompt from selected card data", () => {
  const prompt = buildHandbookPrompt(handbookRequest({ pageCount: 1 }), 0);

  assert.match(prompt, /page 1 of 1/);
  assert.match(prompt, /EXACT VISIBLE COPY FOR THIS PAGE:/);
  assert.match(prompt, /Strawberry Picnic Box/);
  assert.match(prompt, /final, presentation-ready handbook page image/);
  assert.doesNotMatch(prompt, /Do not render any words/);
});
