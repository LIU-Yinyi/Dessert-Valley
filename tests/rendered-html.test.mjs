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

test("server renders the Dessert Valley product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Dessert Valley — Cozy Dessert Atelier<\/title>/i);
  assert.match(html, /Dream a dessert worth making\./);
  assert.match(html, /Idea gallery/);
  assert.match(html, /Moonlit Jasmine Cloud/);
  assert.match(html, /Skip to atelier workspace/);
  assert.match(html, /Dessert Valley Riverside Atelier/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps the simplified multimodal workflow and responsive contracts", async () => {
  const [
    page,
    css,
    layout,
    packageJson,
    renderRoute,
    planAdviceRoute,
    materialImportRoute,
    handbookRoute,
    workspaceStorage,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/render/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/plan-advice/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/material-import/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/handbook-render/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/workspace-storage.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type ReferenceKind = "text" \| "audio" \| "image" \| "canvas"/);
  assert.match(page, /inheritedReferences\(idea\)/);
  assert.match(page, /fetch\("\/api\/render"/);
  assert.match(page, /normalizeReferenceImage/);
  assert.doesNotMatch(page, /composeIntentRendering|simulated-cutaway/);
  assert.match(page, /intentSignature/);
  assert.match(page, /designIntentSignature/);
  assert.match(page, /referencePackages/);
  assert.match(page, /renderResults/);
  assert.match(page, /type WorkspaceData/);
  assert.match(page, /readWorkspace<unknown>/);
  assert.match(page, /createSeedWorkspaceData/);
  assert.match(page, /writeWorkspace\(snapshot\)/);
  assert.match(page, /setReferencePackages\(workspace\.referencePackages\)/);
  assert.match(page, /setRenderResults\(workspace\.renderResults\)/);
  assert.match(page, /setProductDrafts\(workspace\.productDrafts\)/);
  assert.match(page, /addEventListener\("pagehide", persistSnapshot\)/);
  assert.match(page, /const saveActiveRendering = \(continueToProduct: boolean\)/);
  assert.match(page, /image: renderResult\.src/);
  assert.match(
    page,
    /renderResult\?\.src\s*\|\|\s*selectedIdea\.image\s*\|\|\s*currentProduct\.image/s,
  );
  assert.match(page, /onClick=\{\(\) => saveActiveRendering\(false\)\}/);
  assert.match(page, /onClick=\{\(\) => saveActiveRendering\(true\)\}/);
  assert.match(page, /"Save & build recipe"/);
  assert.doesNotMatch(page, /"Continue to Product"/);
  assert.match(page, /productDrafts/);
  assert.match(page, /fetch\("\/api\/plan-advice"/);
  assert.match(page, /material-aware steps/);
  assert.match(page, /planAdviceErrors/);
  assert.match(page, /fetch\("\/api\/material-import"/);
  assert.match(page, /function MaterialImportDialog/);
  assert.match(page, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(page, /new MediaRecorder/);
  assert.match(page, /"Record audio", "录制音频"/);
  assert.match(page, /"Stop recording", "停止录音"/);
  assert.match(page, /className="material-upload-menu"/);
  assert.match(page, /"Text", "文字"/);
  assert.match(page, /"Audio", "音频"/);
  assert.match(page, /"Image", "图片"/);
  assert.match(page, /Only rows you confirm are saved/);
  assert.match(page, /setActiveMaterials\(\(current\) => \[\.\.\.current, \.\.\.rows\]\)/);
  assert.match(page, /fetch\("\/api\/handbook-render"/);
  assert.match(page, /handbookStylePrompt/);
  assert.match(page, /handbookReferenceImage/);
  assert.match(page, /selectedHandbookIdeas/);
  assert.match(page, /Generate AI handbook/);
  assert.match(page, /localizedIdeaName\(idea, language\)/);
  assert.match(page, /className="handbook-sheet"/);
  assert.doesNotMatch(page, /selectedHandbookRows|selectedMenuRows/);
  assert.doesNotMatch(page, /Every style batch is its own configurable card/);
  assert.doesNotMatch(page, /style cards selected/);
  assert.doesNotMatch(page, /Muse added a three-step starting plan/);
  assert.doesNotMatch(page, /title: tr\(language, "Prepare the base"/);
  assert.match(page, /Add variants/);
  assert.match(page, /sizeVariantScale/);
  assert.match(page, /className="language-button"/);
  assert.match(page, /切换到英文/);
  assert.doesNotMatch(page, /className="avatar"/);
  assert.match(page, /Empty dessert sketch canvas/);
  assert.match(page, /className="agent-window"/);
  assert.match(page, /data-global-assistant="true"/);
  assert.match(page, /aria-controls="pastry-agent-window"/);
  assert.doesNotMatch(
    page,
    /stage === "product" && \(\s*<>\s*<button\s+className=\{cn\("agent-fab"/s
  );
  assert.match(page, /className="alias-tip"/);
  assert.match(page, /className="active-design-switcher pixel-panel"/);
  assert.match(page, /className="selected-idea-wrap"/);
  assert.match(page, /aria-haspopup="listbox"/);
  assert.match(page, /selectDesignIdea\(idea\)/);
  assert.match(page, /function IdeaEditor/);
  assert.match(page, /function IdeaDeleteDialog/);
  assert.match(page, /function PixelSelect/);
  assert.match(page, /parseIdeaTags/);
  assert.match(page, /setIdeaEditor\(idea\)/);
  assert.match(page, /requestRemoveIdea\(idea\)/);
  assert.match(page, /className="production-column-headings"/);
  assert.match(page, /className="production-field spec-field"/);
  assert.match(page, /productionVariantsByIdea/);
  assert.match(page, /type ProductionRow = \{\s*id: number;\s*ideaId: number;/s);
  assert.match(page, /addProductionBatchForIdea\(selectedIdea\.id, true\)/);
  assert.match(page, /"Save & add production batch"/);
  assert.match(page, /const consolidated = new Map/);
  assert.match(page, /draft\.materials\.forEach/);
  assert.match(page, /materialAmount\(material\.amount\) \* batchScale/);
  assert.match(page, /materialPrices\[row\.key\]/);
  assert.match(page, /productionIdeas\.map/);
  assert.match(page, /migrateWorkspaceData/);
  assert.doesNotMatch(page, /const productionMaterials|seedPrices/);
  assert.match(page, /tr\(language,\s*"Default",\s*"默认"\)/s);
  assert.doesNotMatch(
    page,
    /className="production-field style-field"|className="production-field production-size"/,
  );
  assert.match(page, /className="world-scenery"/);
  assert.match(page, /aria-current=\{item\.id === stage \? "step" : undefined\}/);
  assert.match(page, /function useDialogFocus/);
  assert.ok(
    page.indexOf('"For chefs"') <
      page.indexOf('"For diners"'),
  );
  assert.doesNotMatch(
    page,
    /theme-select|Idea inbox|Estimated number|Include 6% handling loss|sizeEnabled|includeLoss/i,
  );

  assert.match(css, /@media \(max-width: 1120px\)/);
  assert.match(css, /@media \(max-width: 940px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(
    css,
    /grid-template-columns: minmax\(200px, 1fr\) minmax\(460px, 600px\) minmax\(200px, 1fr\)/,
  );
  assert.match(css, /--soil-deep: #4a2f24/i);
  assert.match(css, /\.atelier-footer/);
  assert.match(css, /\.pixel-tool-cursor/);
  assert.match(css, /\.cost-table-scroll/);
  assert.match(css, /\.production-column-headings/);
  assert.match(css, /\.active-design-list/);
  assert.match(css, /\.selected-idea-menu/);
  assert.match(css, /\.selected-idea-option/);
  assert.match(css, /\.render-error/);
  assert.match(css, /\.muse-save-actions/);
  assert.match(
    css,
    /\.muse-result\s*\{[^}]*width:\s*100%;[^}]*aspect-ratio:\s*4 \/ 3;/s,
  );
  assert.match(css, /\.plan-advice-status/);
  assert.match(css, /\.plan-advice-error/);
  assert.match(css, /\.material-upload-menu/);
  assert.doesNotMatch(
    css,
    /\.dock-menu,\s*\.material-upload-menu\s*\{\s*position:\s*fixed;/,
  );
  assert.match(
    css,
    /\.material-upload-menu\s*\{[^}]*left: 50%;[^}]*transform: translateX\(-50%\);/s,
  );
  assert.match(
    css,
    /@media \(max-width: 620px\)[\s\S]*?\.material-upload-menu\s*\{\s*position: absolute;\s*top: calc\(100% \+ 6px\);\s*right: auto;\s*bottom: auto;\s*left: 0;\s*width: min\(330px, calc\(100vw - 42px\)\);\s*transform: none;/,
  );
  assert.match(css, /\.material-import-modal/);
  assert.match(css, /\.material-file-actions/);
  assert.match(css, /\.material-recording-icon/);
  assert.match(css, /@keyframes material-recording-pulse/);
  assert.match(css, /\.material-import-review/);
  assert.match(css, /\.material-review-row/);
  assert.match(css, /\.handbook-generator/);
  assert.match(css, /\.handbook-sheet/);
  assert.match(css, /\.handbook-candidate-description/);
  assert.match(
    css,
    /\.export-panel,\s*\.handbook-gallery\s*\{\s*padding: 22px;/,
  );
  assert.match(
    css,
    /\.handbook-card-grid\s*\{[^}]*align-items: stretch;/s,
  );
  assert.match(
    css,
    /@media \(max-width: 1120px\)[\s\S]*?\.diner-layout\s*\{\s*grid-template-columns: 1fr;/,
  );
  assert.match(
    css,
    /@media \(max-width: 620px\)[\s\S]*?\.export-panel,\s*\.handbook-gallery\s*\{\s*padding: 15px;/,
  );
  assert.match(css, /\.handbook-reference-upload/);
  assert.match(css, /\.idea-card-actions/);
  assert.match(css, /\.idea-tag-preview/);
  assert.match(css, /\.button\.danger/);
  assert.match(css, /\.variant-grid/);
  assert.match(css, /\.pixel-select-menu/);
  assert.match(css, /\.production-default-spec/);
  assert.match(css, /\.production-empty/);
  assert.match(css, /\.production-source/);
  assert.match(css, /\.cost-empty/);
  assert.match(css, /\.language-button/);
  assert.doesNotMatch(css, /\.avatar/);
  assert.match(css, /\.alias-tip:hover::after/);

  assert.match(layout, /Dessert Valley — Cozy Dessert Atelier/);
  assert.doesNotMatch(layout, /Crumbloom/i);
  assert.match(packageJson, /"name": "dessert-valley"/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  assert.match(renderRoute, /gpt-image-2/);
  assert.match(renderRoute, /OPENAI_API_KEY/);
  assert.match(renderRoute, /\/v1\/images\/edits/);
  assert.match(renderRoute, /form\.append\(\s*"image\[\]"/);
  assert.match(renderRoute, /buildRenderingPrompt/);
  assert.match(renderRoute, /DESIGN DOCK REFERENCES/);
  assert.match(renderRoute, /Input image \$\{index \+ 1\}/);
  assert.doesNotMatch(renderRoute, /NEXT_PUBLIC_OPENAI|dangerouslyAllow/);

  assert.match(planAdviceRoute, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(materialImportRoute, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(
    materialImportRoute,
    /https:\/\/api\.openai\.com\/v1\/audio\/transcriptions/,
  );
  assert.match(materialImportRoute, /gpt-4o-mini-transcribe/);
  assert.match(materialImportRoute, /gpt-5\.6-luna/);
  assert.match(materialImportRoute, /type: "input_image"/);
  assert.match(materialImportRoute, /strict: true/);
  assert.match(materialImportRoute, /store: false/);
  assert.match(materialImportRoute, /OPENAI_API_KEY/);
  assert.doesNotMatch(
    materialImportRoute,
    /NEXT_PUBLIC_OPENAI|dangerouslyAllow/,
  );
  assert.match(planAdviceRoute, /gpt-5\.6-luna/);
  assert.match(planAdviceRoute, /OPENAI_API_KEY/);
  assert.match(planAdviceRoute, /type: "json_schema"/);
  assert.match(planAdviceRoute, /strict: true/);
  assert.match(planAdviceRoute, /buildAdviceInstructions/);
  assert.match(planAdviceRoute, /material-usage table/);
  assert.match(planAdviceRoute, /Existing user-authored steps are present/);
  assert.doesNotMatch(planAdviceRoute, /NEXT_PUBLIC_OPENAI|dangerouslyAllow/);

  assert.match(handbookRoute, /gpt-image-2/);
  assert.match(handbookRoute, /OPENAI_API_KEY/);
  assert.match(handbookRoute, /\/v1\/images\/edits/);
  assert.match(handbookRoute, /form\.append\(\s*"image\[\]"/);
  assert.match(handbookRoute, /buildHandbookPrompt/);
  assert.match(handbookRoute, /Do not render any words, letters, numbers/);
  assert.match(handbookRoute, /1024x1536/);
  assert.doesNotMatch(handbookRoute, /NEXT_PUBLIC_OPENAI|dangerouslyAllow/);

  assert.match(workspaceStorage, /window\.indexedDB/);
  assert.match(workspaceStorage, /document\.cookie/);
  assert.match(workspaceStorage, /dessert-valley-workspace/);
  assert.match(workspaceStorage, /WORKSPACE_STORAGE_VERSION = 2/);
  assert.match(workspaceStorage, /Max-Age=31536000/);
  assert.match(workspaceStorage, /SameSite=Lax/);
  assert.match(workspaceStorage, /localStorage\.setItem\(FALLBACK_STORAGE_KEY/);
});
