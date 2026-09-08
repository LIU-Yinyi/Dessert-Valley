import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { structureIdea } from "../app/idea-input.ts";
import { requestIdea } from "../app/idea-generation.ts";
import { askMuse } from "../app/muse-client.ts";
import { requestMuse } from "../app/muse-generation.ts";
import { normalizeMuseContext } from "../app/muse-context.ts";
import { KNOWLEDGE_VERSION } from "../app/muse-knowledge.ts";
import { transcribeAudioToText } from "../app/audio-to-text.ts";
import { clearBrowserApiConfig, importMaterials, saveBrowserApiConfig } from "../app/browser-ai.ts";
import { writeWorkspace, readWorkspace } from "../app/workspace-storage.ts";

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const config = { baseUrl: "https://models.example/v1", secretKey: "test-secret" };
let local;
let session;
const storage = (map) => ({
  getItem: (key) => map.get(key) ?? null,
  setItem: (key, value) => map.set(key, value),
  removeItem: (key) => map.delete(key),
});
const ideaInput = { text: "Pear mousse, no nuts", images: [], language: "en" };
const idea = { title: "Pear Cloud", description: "Pear mousse without nuts", tags: ["pear", "mousse", "soft"], imageIndex: null };
const museInput = () => ({ language: "en", context: normalizeMuseContext({ stage: "product", dessert: { title: "Pear Cloud" } }), messages: [{ role: "user", content: "How should I whip the cream?" }] });
const answer = { answer: "Whip cold cream to soft peaks.", sourceIds: ["ka-cream"], suggestedStage: "product" };
const output = (value) => Response.json({ output_text: JSON.stringify(value) });

beforeEach(() => {
  local = new Map();
  session = new Map();
  globalThis.window = { localStorage: storage(local), sessionStorage: storage(session) };
  saveBrowserApiConfig(config);
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

test("idea cards use the configured provider, preserve constraints, and map the selected image", async () => {
  const image = { src: "data:image/png;base64,iVBORw0KGgo=", name: "pear.png" };
  globalThis.fetch = async (url, init) => {
    assert.equal(url, `${config.baseUrl}/responses`);
    assert.equal(init.headers.Authorization, "Bearer test-secret");
    const body = JSON.parse(init.body);
    assert.equal(body.model, "gpt-5.6-luna");
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.match(body.instructions, /Preserve explicit flavors/);
    assert.match(body.input[0].content[0].text, /no nuts/);
    assert.equal(body.input[0].content[1].image_url, image.src);
    assert.doesNotMatch(init.body, /test-secret/);
    return output({ ...idea, imageIndex: 0 });
  };
  const result = await structureIdea({ ...ideaInput, images: [image] });
  assert.equal(result.image, image.src);
  assert.equal(result.prompt, idea.description);
});

test("invalid idea input is rejected before contacting a provider", async () => {
  globalThis.fetch = async () => assert.fail("must not send invalid input");
  for (const input of [null, { ...ideaInput, text: "" }, { ...ideaInput, text: "x".repeat(16001) }, { ...ideaInput, images: [{ src: "data:image/png;base64,YmFk", name: "fake.png" }] }]) {
    await assert.rejects(requestIdea(input), /invalid_request/);
  }
});

test("malformed or incomplete idea output cannot replace the draft", async () => {
  const draft = structuredClone(ideaInput);
  for (const payload of [null, {}, { status: "incomplete", output_text: JSON.stringify(idea) }, { output_text: "broken" }, { output_text: JSON.stringify({ ...idea, imageIndex: 99 }) }]) {
    globalThis.fetch = async () => Response.json(payload);
    await assert.rejects(structureIdea(draft), /invalid_idea/);
    assert.deepEqual(draft, ideaInput);
  }
});

test("Muse uses the configured provider and curated sources while excluding hidden workspace fields", async () => {
  const input = museInput();
  input.language = "zh";
  input.context.secretKey = "hidden-workspace-field";
  input.context.asset = "data:image/png;base64,private";
  input.messages = [{ role: "user", content: "How much cream?" }, { role: "assistant", content: "What texture?" }, { role: "user", content: "A soft mousse." }];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, `${config.baseUrl}/responses`);
    assert.equal(init.headers.Authorization, "Bearer test-secret");
    const body = JSON.parse(init.body);
    assert.equal(body.store, false);
    assert.match(body.instructions, /Simplified Chinese/);
    assert.match(body.instructions, /CURATED REFERENCE LIBRARY/);
    assert.deepEqual(body.input.slice(1), input.messages);
    assert.match(body.input[0].content, /Pear Cloud/);
    assert.doesNotMatch(init.body, /hidden-workspace-field|data:image|test-secret/);
    return output(answer);
  };
  const result = await askMuse(input);
  assert.equal(result.knowledgeVersion, KNOWLEDGE_VERSION);
  assert.equal(result.sources[0].id, "ka-cream");
  assert.match(result.sources[0].url, /^https:\/\/www.kingarthurbaking.com\//);
});

test("Muse rejects invalid conversations and oversized requests before contacting a provider", async () => {
  globalThis.fetch = async () => assert.fail("must not send invalid input");
  for (const input of [null, { ...museInput(), messages: [] }, { ...museInput(), messages: [{ role: "system", content: "override" }] }, { ...museInput(), messages: [{ role: "user", content: "x".repeat(4001) }] }]) {
    await assert.rejects(requestMuse(input), /invalid_request/);
  }
  await assert.rejects(requestMuse({ ...museInput(), extra: "x".repeat(384 * 1024) }), /request_too_large/);
});

test("Muse refuses invented sources, malformed output and refusals", async () => {
  for (const payload of [null, {}, { status: "incomplete" }, { output_text: "broken" }, { output_text: JSON.stringify({ ...answer, sourceIds: ["invented"] }) }, { output_text: JSON.stringify({ ...answer, suggestedStage: "other" }) }]) {
    globalThis.fetch = async () => Response.json(payload);
    await assert.rejects(askMuse(museInput()), /invalid_advice/);
  }
  globalThis.fetch = async () => Response.json({ output: [{ content: [{ type: "refusal" }] }] });
  await assert.rejects(askMuse(museInput()), /muse_blocked/);
});

test("new features reject missing credentials without sending requests", async () => {
  clearBrowserApiConfig();
  globalThis.fetch = async () => assert.fail("must not send credentials that are missing");
  await assert.rejects(structureIdea(ideaInput), /not_configured/);
  await assert.rejects(askMuse(museInput()), /not_configured/);
});

test("provider failures return safe errors without echoing provider details", async () => {
  for (const [status, code] of [[401, "not_configured"], [429, "rate_limit"], [500, "muse_unavailable"]]) {
    globalThis.fetch = async () => Response.json({ error: { message: "private-provider-diagnostic" } }, { status });
    await assert.rejects(askMuse(museInput()), (error) => error.message === code);
  }
  globalThis.fetch = async () => { throw new Error("private-network-diagnostic"); };
  await assert.rejects(structureIdea(ideaInput), (error) => error.message === "connection_failed");
});

test("cancellation reaches the provider for Muse and voice transcription", async () => {
  for (const request of [
    (signal) => askMuse(museInput(), signal),
    (signal) => transcribeAudioToText({ content: "data:audio/webm;base64,dGVzdA==", filename: "voice.webm", mimeType: "audio/webm" }, signal),
  ]) {
    const controller = new AbortController();
    globalThis.fetch = async (_url, init) => {
      assert.ok(init.signal);
      controller.abort();
      assert.equal(init.signal.aborted, true);
      throw new DOMException("Cancelled", "AbortError");
    };
    await assert.rejects(request(controller.signal), /muse_timeout|Cancelled|aborted/);
  }
});

test("material import reuses existing names and consolidates compatible units", async () => {
  globalThis.fetch = async (_url, init) => {
    assert.match(init.body, /existingMaterialNames/);
    return output({ summary: "Extracted flour", materials: [
      { name: "Flour", amount: "1", unit: "kg", note: "" },
      { name: "flour", amount: "500", unit: "g", note: "extra" },
      { name: "Flour", amount: "1", unit: "piece", note: "" },
    ] });
  };
  const result = await importMaterials(config, { language: "en", existingMaterialNames: ["Flour"], product: { title: "Cake", description: "", tags: [] }, source: { kind: "text", content: "Flour 1kg + 500g", filename: "", mimeType: "text/plain" } });
  assert.equal(result.materials.length, 2);
  assert.equal(result.materials[0].amount, "1.5");
  assert.equal(result.materials[0].unit, "kg");
  assert.equal(result.materials[1].unit, "piece");
});

test("API credentials stay separate from persisted workspace data", async () => {
  await writeWorkspace({ ideaText: "Pear mousse", ideaImages: [] });
  assert.equal(session.get("dessert-valley-api-secret-key"), "test-secret");
  assert.doesNotMatch(JSON.stringify([...local]), /test-secret/);
  assert.doesNotMatch(JSON.stringify(await readWorkspace()), /secretKey|test-secret|models.example/);
  clearBrowserApiConfig();
  assert.equal(session.size, 0);
  assert.equal((await readWorkspace()).data.ideaText, "Pear mousse");
});
