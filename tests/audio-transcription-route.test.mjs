import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST } from "../app/api/audio-transcription/route.ts";
import { transcribeAudioToText } from "../app/audio-to-text.ts";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;
const source = {
  content: "data:audio/webm;base64,dm9pY2U=",
  filename: "direction.webm",
  mimeType: "audio/webm",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
});

function request(body = source, headers = {}) {
  return new Request("http://localhost/api/audio-transcription", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("transcribes a design direction through the server without a browser credential", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (url, init) => {
    if (url === "/api/audio-transcription") {
      assert.equal(init.headers.Authorization, undefined);
      return POST(new Request(`http://localhost${url}`, init));
    }
    assert.equal(url, "https://api.openai.com/v1/audio/transcriptions");
    assert.equal(init.headers.Authorization, "Bearer test-key");
    assert.ok(init.body instanceof FormData);
    assert.equal(init.body.get("model"), "gpt-4o-mini-transcribe");
    assert.equal(init.body.get("file").name, "direction.webm");
    assert.equal(init.body.get("file").type, "audio/webm");
    assert.equal(await init.body.get("file").text(), "voice");
    return Response.json({ text: "  A pear-shaped\n mousse.  " });
  };
  assert.equal(await transcribeAudioToText(source), "A pear-shaped mousse.");
});

test("rejects malformed, empty, unsupported, and mismatched recordings before calling AI", async () => {
  globalThis.fetch = async () => { throw new Error("Provider must not be contacted"); };
  for (const body of [
    null,
    {},
    { ...source, content: "data:audio/webm;base64," },
    { ...source, content: "data:audio/webm;base64,A" },
    { ...source, content: "data:image/png;base64,dm9pY2U=" },
    { ...source, mimeType: "audio/mp4" },
    { ...source, content: `data:audio/webm;base64,${"A".repeat(24 * 1024 * 1024 + 4)}` },
  ]) {
    const response = await POST(request(body));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "invalid_request");
  }
  assert.equal((await POST(request(source, { "Content-Type": "text/plain" }))).status, 415);
  assert.equal((await POST(new Request("http://localhost/api/audio-transcription", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
  }))).status, 400);
});

test("bounds declared and streamed request sizes", async () => {
  assert.equal((await POST(request(source, { "Content-Length": String(27 * 1024 * 1024) }))).status, 413);
  const response = await POST(new Request("http://localhost/api/audio-transcription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(27 * 1024 * 1024));
        controller.close();
      },
    }),
    duplex: "half",
  }));
  assert.equal(response.status, 413);
});

test("returns a safe error when the Sites credential is missing", async () => {
  delete process.env.OPENAI_API_KEY;
  const response = await POST(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "not_configured");
});

test("normalizes provider failures and does not expose upstream details", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  for (const [status, code, expectedStatus, expectedCode] of [
    [401, "invalid_api_key", 503, "not_configured"],
    [429, "rate_limit_exceeded", 429, "rate_limit"],
    [400, "moderation_blocked", 422, "transcription_blocked"],
    [500, "upstream_error", 502, "transcription_failed"],
  ]) {
    globalThis.fetch = async () => Response.json({
      error: { code, message: "private upstream detail" },
    }, { status });
    const response = await POST(request());
    assert.equal(response.status, expectedStatus);
    assert.deepEqual(await response.json(), { error: { code: expectedCode } });
  }
  globalThis.fetch = async () => { throw new Error("private network detail"); };
  const response = await POST(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: { code: "transcription_failed" } });
});

test("rejects malformed provider output and empty speech", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  for (const payload of [null, {}, { text: 42 }]) {
    globalThis.fetch = async () => Response.json(payload);
    assert.equal((await POST(request())).status, 502);
  }
  globalThis.fetch = async () => new Response("not json");
  assert.equal((await POST(request())).status, 502);
  globalThis.fetch = async () => Response.json({ text: "  " });
  const response = await POST(request());
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error.code, "empty_transcription");
});
