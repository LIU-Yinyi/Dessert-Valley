import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  buildHandbookPrompt,
  POST,
} from "../app/api/handbook-render/route.ts";

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
  return new Request("http://localhost/api/handbook-render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function handbookBody(overrides = {}) {
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

function imageResponse(label, requestId = "req_handbook_test") {
  return new Response(
    JSON.stringify({
      data: [{ b64_json: Buffer.from(label).toString("base64") }],
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "x-request-id": requestId,
      },
    },
  );
}

test("rejects an invalid handbook page count before contacting a provider", async () => {
  let contactedProvider = false;
  globalThis.fetch = async () => {
    contactedProvider = true;
    return imageResponse("unused");
  };
  process.env.OPENAI_API_KEY = "test-key";

  const response = await POST(request(handbookBody({ pageCount: 5 })));

  assert.equal(response.status, 400);
  assert.equal(contactedProvider, false);
  assert.equal((await response.json()).error.code, "invalid_request");
});

test("returns a safe missing-credential error", async () => {
  delete process.env.OPENAI_API_KEY;

  const response = await POST(request(handbookBody({ pageCount: 1 })));

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "not_configured");
});

test("generates distinct final-page prompts and returns every page image", async () => {
  const providerBodies = [];
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      "https://api.openai.com/v1/images/generations",
    );
    const body = JSON.parse(String(init?.body));
    providerBodies.push(body);
    return imageResponse(`page-${providerBodies.length}`, `req_page_${providerBodies.length}`);
  };

  const response = await POST(request(handbookBody()));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.pageCount, 3);
  assert.equal(payload.images.length, 3);
  assert.equal(payload.requestIds.length, 3);
  assert.match(payload.images[0], /^data:image\/jpeg;base64,/);
  assert.equal(providerBodies.length, 3);
  providerBodies.forEach((body) => {
    assert.equal(body.model, "gpt-image-2");
    assert.equal(body.size, "1024x1536");
    assert.equal(body.output_format, "jpeg");
    assert.match(body.prompt, /COMPLETE SELECTED DESSERT CARD SOURCE:/);
    assert.match(body.prompt, /Moonlit Jasmine Cloud/);
    assert.match(body.prompt, /final, presentation-ready handbook page image/);
    assert.doesNotMatch(body.prompt, /background artwork|browser text overlays afterward/i);
  });
  assert.match(providerBodies[0].prompt, /page 1 of 3/);
  assert.match(providerBodies[1].prompt, /page 2 of 3/);
  assert.match(providerBodies[2].prompt, /page 3 of 3/);
  assert.notEqual(providerBodies[0].prompt, providerBodies[1].prompt);
});

test("passes selected dessert and style images to every page edit request", async () => {
  const providerForms = [];
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.openai.com/v1/images/edits");
    assert.ok(init?.body instanceof FormData);
    providerForms.push(init.body);
    return imageResponse(`edited-${providerForms.length}`);
  };
  const image = "data:image/png;base64,iVBORw0KGgo=";

  const response = await POST(
    request(
      handbookBody({
        pageCount: 2,
        styleReference: { name: "Linen menu", asset: image },
        desserts: [
          {
            title: "Moonlit Jasmine Cloud",
            description: "A pear and jasmine mousse.",
            tags: ["pear"],
            asset: image,
          },
        ],
      }),
    ),
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.images.length, 2);
  assert.equal(payload.visualInputCount, 2);
  assert.equal(providerForms.length, 2);
  providerForms.forEach((form, index) => {
    assert.equal(form.get("model"), "gpt-image-2");
    assert.equal(form.getAll("image[]").length, 2);
    assert.match(String(form.get("prompt")), new RegExp(`page ${index + 1} of 2`));
    assert.match(String(form.get("prompt")), /Input image 1/);
    assert.match(String(form.get("prompt")), /Input image 2/);
  });
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

  const response = await POST(request(handbookBody({ pageCount: 1 })));
  const payload = await response.json();

  assert.equal(response.status, 429);
  assert.equal(payload.error.code, "rate_limit");
  assert.doesNotMatch(JSON.stringify(payload), /private upstream detail/);
});

test("normalizes a provider network failure", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async () => {
    throw new Error("private network detail");
  };

  const response = await POST(request(handbookBody({ pageCount: 1 })));
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.equal(payload.error.code, "generation_unavailable");
  assert.doesNotMatch(JSON.stringify(payload), /private network detail/);
});

test("rejects a malformed empty image response", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async () => Response.json({ data: [] });

  const response = await POST(request(handbookBody({ pageCount: 1 })));

  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, "empty_generation");
});

test("builds a finished single-page image prompt from selected card data", () => {
  const prompt = buildHandbookPrompt(handbookBody({ pageCount: 1 }), 0);

  assert.match(prompt, /page 1 of 1/);
  assert.match(prompt, /EXACT VISIBLE COPY FOR THIS PAGE:/);
  assert.match(prompt, /Strawberry Picnic Box/);
  assert.match(prompt, /The entire portrait 2:3 canvas must be the final/);
  assert.doesNotMatch(prompt, /Do not render any words/);
});
