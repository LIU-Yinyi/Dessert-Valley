import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("builds a self-contained static application shell", async () => {
  const html = await readFile(
    new URL("../dist/index.html", import.meta.url),
    "utf8",
  );
  const assets = await readdir(new URL("../dist/assets", import.meta.url));

  assert.match(html, /<title>Dessert Valley — Cozy Dessert Atelier<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /\.\/assets\/[^"]+\.js/);
  assert.match(html, /\.\/assets\/[^"]+\.css/);
  assert.ok(assets.some((asset) => asset.endsWith(".js")));
  assert.ok(assets.some((asset) => asset.endsWith(".css")));
  assert.doesNotMatch(html, /_vinext|_next|cloudflare|codex-preview/i);
});

test("keeps the browser-only workflow, responsive UI, and storage contracts", async () => {
  const [
    page,
    browserAi,
    css,
    main,
    html,
    packageJson,
    viteConfig,
    readme,
    workspaceStorage,
    handbookStorage,
    museAdviser,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/browser-ai.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/main.tsx", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../app/workspace-storage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/handbook-storage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/muse-adviser.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(main, /createRoot\(root\)\.render/);
  assert.match(main, /<StrictMode>/);
  assert.match(html, /<script type="module" src="\/app\/main\.tsx"><\/script>/);

  assert.match(
    page,
    /type ReferenceKind = "text" \| "audio" \| "image" \| "canvas"/,
  );
  assert.match(
    page,
    /const addableReferenceKinds = \[\s*"text",\s*"image",\s*"canvas",\s*\]/,
  );
  assert.match(page, /addableReferenceKinds\.map\(\(kind\) =>/);
  assert.doesNotMatch(
    page,
    /Object\.keys\(referenceMeta\) as ReferenceKind\[\]/,
  );
  assert.match(page, /inheritedReferences\(idea\)/);
  assert.match(page, /generateProductRendering\(/);
  assert.match(page, /requestPlanAdvice\(/);
  assert.match(page, /importMaterials\(/);
  assert.match(page, /generateHandbookPages\(/);
  assert.doesNotMatch(
    page,
    /fetch\(["']\/api\/|next\/image|NEXT_PUBLIC_OPENAI|OPENAI_API_KEY/,
  );
  assert.match(page, /function ApiSettingsDialog/);
  assert.match(page, /Model API settings/);
  assert.match(page, /模型 API 设置/);
  assert.match(page, /API base URL/);
  assert.match(page, /Secret key/);
  assert.match(page, /session storage/);
  assert.match(page, /CORS/);
  assert.match(page, /api-settings-button/);
  assert.match(page, /apiConfigured && "configured"/);
  const workspaceType = page.match(
    /type WorkspaceData = \{[\s\S]*?\n\};/,
  )?.[0] ?? "";
  assert.doesNotMatch(workspaceType, /secretKey|baseUrl|apiConfig/);

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
  assert.match(page, /"Save & build recipe"/);
  assert.match(page, /material-aware steps/);
  assert.match(page, /function MaterialImportDialog/);
  assert.match(page, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(page, /new MediaRecorder/);
  assert.match(page, /transcribeAudioToText\(/);
  assert.match(page, /Audio to Text/);
  assert.match(page, /语音转文字/);
  assert.match(page, /Stop & transcribe/);
  assert.match(page, /Only rows you confirm are saved/);
  assert.match(page, /Generate AI handbook/);
  assert.match(page, /className="handbook-sheet"/);
  assert.match(page, /className="handbook-page-image"/);
  assert.match(page, /turnHandbookPage\("next"\)/);
  assert.match(page, /turnHandbookPage\("previous"\)/);
  assert.match(page, /exportHandbookImages/);
  assert.match(page, /className="handbook-print-pages"/);
  assert.match(page, /className="language-button"/);
  assert.match(page, /切换到英文/);
  assert.match(page, /<MuseAdviser/);
  assert.match(museAdviser, /className="agent-window"/);
  assert.match(page, /data-global-assistant="true"/);
  assert.match(page, /function useDialogFocus/);
  assert.match(page, /aria-current=\{item\.id === stage \? "step" : undefined\}/);

  assert.match(
    browserAi,
    /window\.sessionStorage\.setItem\(\s*API_SECRET_SESSION_KEY/,
  );
  assert.match(
    browserAi,
    /window\.localStorage\.setItem\(API_BASE_STORAGE_KEY/,
  );
  assert.match(browserAi, /Authorization: `Bearer \$\{config\.secretKey\.trim\(\)\}`/);
  assert.match(browserAi, /response = await fetch\(endpoint/);
  assert.match(browserAi, /"images\/generations"/);
  assert.match(browserAi, /"images\/edits"/);
  assert.match(browserAi, /"responses"/);
  assert.match(browserAi, /"audio\/transcriptions"/);
  assert.match(browserAi, /gpt-image-2/);
  assert.match(browserAi, /gpt-5\.6-luna/);
  assert.match(browserAi, /gpt-4o-mini-transcribe/);
  assert.match(browserAi, /type: "json_schema"/);
  assert.match(browserAi, /strict: true/);
  assert.match(browserAi, /store: false/);
  assert.match(browserAi, /buildRenderingPrompt/);
  assert.match(browserAi, /DESIGN DOCK REFERENCES/);
  assert.match(browserAi, /buildAdviceInstructions/);
  assert.match(browserAi, /Existing user-authored steps are present/);
  assert.match(browserAi, /buildHandbookPrompt/);
  assert.match(browserAi, /final, presentation-ready handbook page image/);
  assert.match(browserAi, /COMPLETE SELECTED DESSERT CARD SOURCE/);
  assert.match(browserAi, /1024x1536/);
  assert.doesNotMatch(
    browserAi,
    /process\.env|cloudflare:workers|OPENAI_API_KEY|fetch\(["']\/api\//,
  );

  assert.match(css, /@media \(max-width: 1120px\)/);
  assert.match(css, /@media \(max-width: 940px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(
    css,
    /grid-template-columns: minmax\(200px, 1fr\) minmax\(460px, 600px\) minmax\(220px, 1fr\)/,
  );
  assert.match(css, /--soil-deep: #4a2f24/i);
  assert.match(css, /\.api-settings-modal/);
  assert.match(css, /\.api-settings-button\.configured \.api-status-dot/);
  assert.match(css, /\.api-secret-field/);
  assert.match(css, /\.api-compatibility-note/);
  assert.match(css, /\.api-settings-footer/);
  assert.match(css, /\.cards-import-button/);
  assert.match(css, /\.atelier-footer/);
  assert.match(css, /\.pixel-tool-cursor/);
  assert.match(css, /\.cost-table-scroll/);
  assert.match(css, /\.render-error/);
  assert.match(css, /\.plan-advice-status/);
  assert.match(css, /\.material-import-modal/);
  assert.match(css, /\.audio-to-text-button/);
  assert.match(css, /\.handbook-generator/);
  assert.match(css, /\.handbook-pagination/);
  assert.match(css, /@keyframes handbook-page-turn-next/);
  assert.match(css, /@keyframes handbook-page-turn-previous/);
  assert.match(css, /\.handbook-print-pages/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  assert.match(packageJson, /"dev": "vite"/);
  assert.match(packageJson, /"build": "tsc --noEmit && vite build"/);
  assert.match(packageJson, /"start": "vite preview --host 0\.0\.0\.0"/);
  assert.doesNotMatch(
    packageJson,
    /"next"|"vinext"|"wrangler"|"@cloudflare\/vite-plugin"|"drizzle-orm"/,
  );
  assert.match(viteConfig, /import react from "@vitejs\/plugin-react"/);
  assert.match(viteConfig, /base: "\.\/"/);
  assert.match(viteConfig, /plugins: \[react\(\)\]/);
  assert.doesNotMatch(viteConfig, /cloudflare|hostingConfig|sites\(\)|vinext/);
  assert.match(readme, /self-host/i);
  assert.match(readme, /CORS/);
  assert.match(readme, /sessionStorage/);

  assert.match(workspaceStorage, /window\.indexedDB/);
  assert.match(workspaceStorage, /dessert-valley-workspace/);
  assert.match(workspaceStorage, /WORKSPACE_STORAGE_VERSION = 3/);
  assert.match(workspaceStorage, /localStorage\.setItem\(FALLBACK_STORAGE_KEY/);
  assert.doesNotMatch(
    workspaceStorage,
    /secretKey|API_SECRET|document\.cookie|WORKSPACE_COOKIE/,
  );
  assert.match(handbookStorage, /pages: string\[\]/);
  assert.match(handbookStorage, /MAX_HANDBOOK_PAGE_COUNT = 4/);

  await assert.rejects(
    access(new URL("../app/api/render/route.ts", import.meta.url)),
    /ENOENT/,
  );
  await assert.rejects(
    access(new URL("../.openai/hosting.json", import.meta.url)),
    /ENOENT/,
  );
  await assert.rejects(
    access(new URL("../worker/index.ts", import.meta.url)),
    /ENOENT/,
  );
});
