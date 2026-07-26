import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server renders the Crumbloom product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Crumbloom — Cozy Dessert Atelier<\/title>/i);
  assert.match(html, /Plant a dessert idea\./);
  assert.match(html, /Idea gallery/);
  assert.match(html, /Moonlit Jasmine Cloud/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps the simplified multimodal workflow and responsive contracts", async () => {
  const [page, css, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type ReferenceKind = "text" \| "audio" \| "image" \| "canvas"/);
  assert.match(page, /inheritedReferences\(idea\)/);
  assert.match(page, /aria-label="Empty dessert sketch canvas"/);
  assert.match(page, /useState<MaterialRow\[\]>\(\[\]\)/);
  assert.match(page, /Include 6% handling loss/);
  assert.match(page, /className="agent-window"/);
  assert.match(page, /className="alias-tip"/);
  assert.ok(
    page.indexOf("<strong>For chefs</strong>") <
      page.indexOf("<strong>For diners</strong>"),
  );
  assert.doesNotMatch(page, /theme-select|Idea inbox|Estimated number/i);

  assert.match(css, /@media \(max-width: 1120px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.pixel-tool-cursor/);
  assert.match(css, /\.cost-table-scroll/);
  assert.match(css, /\.alias-tip:hover::after/);

  assert.match(layout, /Crumbloom — Cozy Dessert Atelier/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
