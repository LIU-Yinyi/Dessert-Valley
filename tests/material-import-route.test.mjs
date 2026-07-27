import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST } from "../app/api/material-import/route.ts";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalApiKey;
  }
});

function request(body) {
  return new Request("http://localhost/api/material-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function sourceBody(source) {
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

function extractionResponse(materials = [
  { name: "Pear purée", amount: "120", unit: "g", note: "" },
]) {
  return new Response(
    JSON.stringify({
      output_text: JSON.stringify({
        summary: "One clear material was found.",
        materials,
      }),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "x-request-id": "req_material_test",
      },
    },
  );
}

test("rejects an empty material source before contacting a provider", async () => {
  let contactedProvider = false;
  globalThis.fetch = async () => {
    contactedProvider = true;
    return extractionResponse();
  };
  process.env.OPENAI_API_KEY = "test-key";

  const response = await POST(
    request(
      sourceBody({
        kind: "text",
        content: "   ",
        filename: "",
        mimeType: "text/plain",
      }),
    ),
  );

  assert.equal(response.status, 400);
  assert.equal(contactedProvider, false);
  assert.equal((await response.json()).error.code, "invalid_request");
});

test("returns a safe missing-credential error", async () => {
  delete process.env.OPENAI_API_KEY;
  const response = await POST(
    request(
      sourceBody({
        kind: "text",
        content: "Pear purée 120 g",
        filename: "",
        mimeType: "text/plain",
      }),
    ),
  );

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "not_configured");
});

test("extracts and normalizes material rows from text", async () => {
  let providerBody;
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.openai.com/v1/responses");
    providerBody = JSON.parse(String(init?.body));
    return extractionResponse([
      { name: "Pear purée", amount: "120.0", unit: "g", note: "strained" },
      { name: "Jasmine tea", amount: "unclear", unit: "g", note: "verify" },
    ]);
  };

  const response = await POST(
    request(
      sourceBody({
        kind: "text",
        content: "Pear purée 120 g, strained; Jasmine tea, amount unclear.",
        filename: "",
        mimeType: "text/plain",
      }),
    ),
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.sourceKind, "text");
  assert.deepEqual(payload.materials, [
    { name: "Pear purée", amount: "120", unit: "g", note: "strained" },
    { name: "Jasmine tea", amount: "", unit: "g", note: "verify" },
  ]);
  assert.equal(providerBody.model, "gpt-5.6-luna");
  assert.equal(providerBody.store, false);
  assert.equal(providerBody.text.format.strict, true);
  assert.equal(providerBody.text.format.name, "dessert_material_import");
});

test("passes an image data URL as a multimodal Responses input", async () => {
  let providerBody;
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (_input, init) => {
    providerBody = JSON.parse(String(init?.body));
    return extractionResponse();
  };

  const response = await POST(
    request(
      sourceBody({
        kind: "image",
        content: "data:image/png;base64,iVBORw0KGgo=",
        filename: "recipe.png",
        mimeType: "image/png",
      }),
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(providerBody.input[0].content[0].type, "input_text");
  assert.equal(providerBody.input[0].content[1].type, "input_image");
  assert.match(providerBody.input[0].content[1].image_url, /^data:image\/png/);
  assert.equal(providerBody.input[0].content[1].detail, "high");
});

test("transcribes audio before extracting material rows", async () => {
  const calls = [];
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: init?.body });
    if (url.endsWith("/audio/transcriptions")) {
      return Response.json({ text: "Pear purée 120 grams" });
    }
    return extractionResponse();
  };

  const response = await POST(
    request(
      sourceBody({
        kind: "audio",
        content: "data:audio/webm;base64,AAAA",
        filename: "recipe.webm",
        mimeType: "audio/webm",
      }),
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://api.openai.com/v1/audio/transcriptions");
  assert.ok(calls[0].body instanceof FormData);
  assert.equal(calls[0].body.get("model"), "gpt-4o-mini-transcribe");
  assert.equal(calls[1].url, "https://api.openai.com/v1/responses");
  const extractionBody = JSON.parse(String(calls[1].body));
  assert.match(extractionBody.input, /Pear purée 120 grams/);
});

test("normalizes a provider rate limit without exposing its message", async () => {
  process.env.OPENAI_API_KEY = "test-key";
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

  const response = await POST(
    request(
      sourceBody({
        kind: "text",
        content: "Pear purée 120 g",
        filename: "",
        mimeType: "text/plain",
      }),
    ),
  );
  const payload = await response.json();

  assert.equal(response.status, 429);
  assert.equal(payload.error.code, "rate_limit");
  assert.doesNotMatch(JSON.stringify(payload), /private upstream detail/);
});

test("rejects malformed structured output", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async () =>
    Response.json({ output_text: "{\"summary\":\"nothing\",\"materials\":[]}" });

  const response = await POST(
    request(
      sourceBody({
        kind: "text",
        content: "A recipe with no readable list",
        filename: "",
        mimeType: "text/plain",
      }),
    ),
  );

  assert.equal(response.status, 422);
  assert.equal((await response.json()).error.code, "empty_import");
});
