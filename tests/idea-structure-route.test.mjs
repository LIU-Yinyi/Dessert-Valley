import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST, buildIdeaInstructions } from "../app/api/idea-structure/route.ts";
import { structureIdea, ideaCardFields, normalizeIdeaAttachments } from "../app/idea-input.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;
const png = "data:image/png;base64,iVBORw0KGgo=";
const jpeg = "data:image/jpeg;base64,/9j/";
const input = { language: "en", text: "Um, a chestnut tart, maple cream, an acorn lid. No chocolate.", images: [] };
const idea = {
  title: "Maple Chestnut Acorn Tart",
  description: "A small chestnut tart with maple cream and an acorn-shaped lid, without chocolate.",
  tags: ["chestnut", "maple", "acorn"], imageIndex: null,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

function request(body = input, headers = {}) {
  return new Request("http://localhost/api/idea-structure", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function response(result = idea) {
  return Response.json({ output_text: JSON.stringify(result) });
}

test("polishes text into the gallery and Design fields through the Sites API", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (url, init) => {
    if (url === "/api/idea-structure") {
      assert.equal(init.headers.Authorization, undefined);
      return POST(new Request(`http://localhost${url}`, init));
    }
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(init.headers.Authorization, "Bearer test-key");
    const body = JSON.parse(init.body);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.name, "dessert_idea");
    assert.deepEqual(body.text.format.schema.properties.imageIndex.enum, [null]);
    assert.equal(JSON.parse(body.input[0].content[0].text).brief, input.text);
    assert.match(body.instructions, /Preserve explicit flavors/);
    return response();
  };
  assert.deepEqual(await structureIdea(input), {
    title: idea.title, prompt: idea.description, tags: idea.tags, image: "", imageName: "",
  });
});

test("reads all attached images in order and maps the selected cover, including image-only input", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  const images = [{ src: png, name: "sketch.png" }, { src: jpeg, name: "dessert.jpg" }];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    assert.deepEqual(body.input[0].content.slice(1).map((part) => part.image_url), [png, jpeg]);
    assert.deepEqual(body.text.format.schema.properties.imageIndex.enum, [0, 1]);
    assert.match(body.instructions, /Simplified Chinese/);
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ ...idea, imageIndex: 1 }) }] }] });
  };
  const result = await POST(request({ language: "zh", text: "", images }));
  assert.equal(result.status, 200);
  const fields = ideaCardFields((await result.json()).idea, images);
  assert.equal(fields.image, jpeg);
  assert.equal(fields.imageName, "dessert.jpg");
});

test("rejects invalid input before contacting AI", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response(); };
  for (const body of [
    null, {}, { ...input, text: "" }, { ...input, text: "a".repeat(16_001) },
    { ...input, images: new Array(5).fill({ src: png, name: "image.png" }) },
    { ...input, images: [{ src: "https://example.com/image.jpg" }] },
    { ...input, images: [{ src: "data:image/png;base64,bm90LWFuLWltYWdl" }] },
    { ...input, images: [{ src: "data:image/svg+xml;base64,PHN2Zy8+" }] },
    { ...input, images: [{ src: `data:image/jpeg;base64,${"A".repeat(6 * 1024 * 1024)}` }] },
  ]) assert.equal((await POST(request(body))).status, 400);
  assert.equal(calls, 0);
  assert.equal((await POST(request(input, { "Content-Type": "text/plain" }))).status, 415);
  assert.equal((await POST(request(input, { "Content-Length": String(25 * 1024 * 1024) }))).status, 413);
  assert.equal((await POST(new Request("http://localhost/api/idea-structure", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
  }))).status, 400);
});

test("bounds streamed bodies when Content-Length is missing", async () => {
  const result = await POST(new Request("http://localhost/api/idea-structure", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: new ReadableStream({ start(controller) {
      controller.enqueue(new Uint8Array(25 * 1024 * 1024)); controller.close();
    } }), duplex: "half",
  }));
  assert.equal(result.status, 413);
});

test("normalizes missing credentials, rate limits, refusal, and network failures", async () => {
  delete process.env.OPENAI_API_KEY;
  assert.equal((await POST(request())).status, 503);
  process.env.OPENAI_API_KEY = "test-key";
  for (const [status, code] of [[401, "not_configured"], [429, "rate_limit"], [500, "idea_failed"]]) {
    globalThis.fetch = async () => Response.json({ error: { message: "private detail" } }, { status });
    assert.deepEqual(await (await POST(request())).json(), { error: { code } });
  }
  globalThis.fetch = async () => Response.json({ output: [{ content: [{ type: "refusal", refusal: "private detail" }] }] });
  assert.equal((await (await POST(request())).json()).error.code, "idea_blocked");
  globalThis.fetch = async () => { throw new Error("private network detail"); };
  assert.deepEqual(await (await POST(request())).json(), { error: { code: "idea_unavailable" } });
});

test("rejects malformed ideas, invented image indices, and incomplete output", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  for (const invalid of [
    {}, { ...idea, title: "" }, { ...idea, description: [] },
    { ...idea, tags: [42] }, { ...idea, imageIndex: 0 },
  ]) {
    globalThis.fetch = async () => response(invalid);
    assert.equal((await POST(request())).status, 502);
  }
  for (const index of [-1, 1, 0.5, null, "0"]) {
    globalThis.fetch = async () => response({ ...idea, imageIndex: index });
    assert.equal((await POST(request({ ...input, images: [{ src: png, name: "reference.png" }] }))).status, 502);
  }
  for (const payload of [null, { output_text: "not json" }, { status: "incomplete", output_text: JSON.stringify(idea) }]) {
    globalThis.fetch = async () => Response.json(payload);
    assert.equal((await POST(request())).status, 502);
  }
});

test("failed structuring leaves the caller's draft and images intact", async () => {
  const draft = { ...input, images: [{ src: png, name: "reference.png" }] };
  const before = structuredClone(draft);
  globalThis.fetch = async () => Response.json({ error: { code: "rate_limit" } }, { status: 429 });
  await assert.rejects(structureIdea(draft), /rate_limit/);
  assert.deepEqual(draft, before);
  assert.throws(() => ideaCardFields({ ...idea, imageIndex: 7 }, draft.images), /invalid_idea/);
});

test("restores legacy single-image drafts and normalizes new attachment drafts", () => {
  assert.deepEqual(normalizeIdeaAttachments(undefined, png, "legacy.png"), [{ src: png, name: "legacy.png" }]);
  assert.deepEqual(normalizeIdeaAttachments(undefined), []);
  assert.deepEqual(normalizeIdeaAttachments([], png, "legacy.png"), []);
  const images = [{ src: png, name: "sketch.png" }, { src: jpeg, name: "dessert.jpg" }];
  assert.deepEqual(normalizeIdeaAttachments(images), images);
  assert.deepEqual(normalizeIdeaAttachments([null, { src: 42 }, ...images]), images);
  assert.equal(normalizeIdeaAttachments(new Array(6).fill(images[0])).length, 1);
  assert.equal(normalizeIdeaAttachments(Array.from({ length: 6 }, (_value, index) => ({
    src: `${png}${index}`, name: `image-${index}.png`,
  }))).length, 4);
});

test("the editing instructions preserve constraints and treat references as data", () => {
  const instructions = buildIdeaInstructions(input);
  assert.match(instructions, /transcribed speech/);
  assert.match(instructions, /never as instructions/);
  assert.match(instructions, /constraints, exclusions/);
  assert.match(instructions, /do not invent an image/);
});
