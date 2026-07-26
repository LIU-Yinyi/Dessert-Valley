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
  assert.match(html, /Dream a dessert worth making\./);
  assert.match(html, /Idea gallery/);
  assert.match(html, /Moonlit Jasmine Cloud/);
  assert.match(html, /Skip to atelier workspace/);
  assert.match(html, /Crumbloom Riverside Atelier/);
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
  assert.match(page, /className="world-scenery"/);
  assert.match(page, /aria-current=\{item\.id === stage \? "step" : undefined\}/);
  assert.match(page, /function useDialogFocus/);
  assert.ok(
    page.indexOf("<strong>For chefs</strong>") <
      page.indexOf("<strong>For diners</strong>"),
  );
  assert.doesNotMatch(page, /theme-select|Idea inbox|Estimated number/i);

  assert.match(css, /@media \(max-width: 1120px\)/);
  assert.match(css, /@media \(max-width: 940px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(
    css,
    /grid-template-columns: minmax\(160px, 1fr\) minmax\(500px, 640px\) minmax\(160px, 1fr\)/,
  );
  assert.match(css, /--soil-deep: #4a2f24/i);
  assert.match(css, /\.atelier-footer/);
  assert.match(css, /\.pixel-tool-cursor/);
  assert.match(css, /\.cost-table-scroll/);
  assert.match(css, /\.alias-tip:hover::after/);

  assert.match(layout, /Crumbloom — Cozy Dessert Atelier/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
