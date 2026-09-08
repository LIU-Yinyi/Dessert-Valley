import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST as render } from "../app/api/render/route.ts";
import { POST as handbook } from "../app/api/handbook-render/route.ts";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
});

const cases = [
  ["render", render, {
    idea: { title: "Pear cloud", prompt: "Pear mousse", tags: [] },
    references: [{ kind: "text", title: "Shape", content: "A pear" }],
    view: "exterior",
  }, (body) => body.image],
  ["handbook", handbook, {
    pageCount: 1, desserts: [{ title: "Pear cloud", tags: [] }],
  }, (body) => body.images[0]],
];

for (const [name, handler, body, image] of cases) {
  test(`${name} accepts embedded and URL image results and rejects invalid results`, async () => {
    process.env.OPENAI_API_KEY = "test-key";
    for (const [item, expected] of [
      [{ b64_json: "aW1hZ2U=" }, "data:image/jpeg;base64,aW1hZ2U="],
      [{ url: "https://example.com/result.jpg" }, "https://example.com/result.jpg"],
      [{ url: "data:image/png;base64,aW1hZ2U=" }, "data:image/png;base64,aW1hZ2U="],
      [{ url: "javascript:alert(1)" }, null],
      [{ b64_json: 42, url: 42 }, null],
      [{}, null],
    ]) {
      globalThis.fetch = async () => Response.json({ data: [item] });
      const response = await handler(new Request(`http://localhost/api/${name}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
      assert.equal(response.status, expected ? 200 : 502);
      if (expected) assert.equal(image(await response.json()), expected);
      else assert.equal((await response.json()).error.code, "empty_generation");
    }
  });
}
