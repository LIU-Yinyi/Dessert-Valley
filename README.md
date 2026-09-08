<p align="center">
  <img src="docs/readme/dessert-valley-cover.png" alt="Dessert Valley: an original pixel-art pastry atelier beside an orchard and river" width="100%">
</p>

<h1 align="center">🌷 Dessert Valley · 甜点手册</h1>
<p align="center"><strong>Dream it. Shape it. Bake a little joy.</strong><br>A cozy dessert atelier for turning a spark of inspiration into a design, a recipe, and a beautiful menu.</p>
<p align="center">🌱 Idea → 🎨 Design → 🍰 Product → 🧑‍🍳 Bake<br>✨ AI-assisted creativity · 🌏 English / 中文 · 💾 Local-first workspace</p>
<p align="center">
  <a href="https://github.com/LIU-Yinyi/Dessert-Valley/tree/openai">☁️ OpenAI Sites edition</a> ·
  <a href="https://github.com/LIU-Yinyi/Dessert-Valley/tree/vps">🏡 VPS edition</a> ·
  <a href="#quick-start">🚀 Get started</a>
</p>

> 🏡 **You’re on `vps` — the self-hosted edition.** Bring your own compatible API connection using the key button on the left. Looking for the Sites version? [Switch to `openai` →](https://github.com/LIU-Yinyi/Dessert-Valley/tree/openai)

## 🍎 From a little idea to Oli’s dessert table

A glossy **Yogurt Tanghulu · 酸奶苹果糖葫芦** becomes the star of a warm, illustrated dessert menu. These two examples were supplied by **Oli** — the design on the left, the finished menu on the right. Thank you, Oli! 💛

<table>
  <tr>
    <td align="center" width="50%"><strong>🎨 The dessert design</strong></td>
    <td align="center" width="50%"><strong>📜 The dessert menu</strong></td>
  </tr>
  <tr>
    <td align="center"><a href="docs/readme/oli-yogurt-tanghulu.jpg"><img src="docs/readme/oli-yogurt-tanghulu.jpg" alt="Oli’s Yogurt Tanghulu design in the Dessert Valley workspace: a glossy apple-shaped yogurt dessert with a tiny face" height="540"></a></td>
    <td align="center"><a href="docs/readme/oli-menu.jpg"><img src="docs/readme/oli-menu.jpg" alt="Oli’s illustrated Dessert Valley menu with coconut mousse, yogurt tanghulu, little tiger espresso, cannelé and butter cookies" height="540"></a></td>
  </tr>
  <tr><td align="center" colspan="2"><sub>Design &amp; menu examples: <strong>Oli</strong>. Click either image for the full view.</sub></td></tr>
</table>

You can also explore these examples in the app’s **🖼️ Masterpiece gallery**: zoom, pan, and compare them side by side on a wide screen, or swipe between them on mobile.

## 🪄 A small atelier, from inspiration to serving

- **🌱 Catch the spark.** Write a brief, turn voice notes into editable text, and attach up to four reference images. AI helps shape a title, description, tags, and cover selection.
- **🎨 Give it a shape.** Gather text, images, and canvas sketches in the Design Dock. Explore exterior and cutaway renderings from the same intent package.
- **⚖️ Build the recipe.** Create size variants, scale materials, import ingredients, and organize illustrated making steps. Work in weight, pieces, bars, or your own units.
- **🧑‍🍳 Plan the bake.** Set batch quantities, consolidate ingredients, enter unit prices, and estimate ingredient costs.
- **📖 Set the table.** Compose a diner handbook with a chosen style and page count, then export images, HTML, or print/PDF.
- **💬 Ask Muse.** Get stage-aware advice with curated references while keeping control of your workspace. Switch the whole interface between English and Chinese.
- **💾 Keep your notebook.** Save locally in your browser and import/export workspace JSON to carry your ideas elsewhere.

## 🧭 Four stops along the river

<table>
  <tr>
    <td width="50%"><strong>🌱 01 · Idea — gather</strong><p>Collect a direction and browse your dessert garden.</p><a href="docs/readme/stage-idea.png"><img src="docs/readme/stage-idea.png" alt="Idea gallery with jasmine, strawberry and pistachio dessert concept cards"></a></td>
    <td width="50%"><strong>🎨 02 · Design — shape</strong><p>Bring references together and explore a product rendering.</p><a href="docs/readme/stage-design.png"><img src="docs/readme/stage-design.png" alt="Design Dock with a text brief, reference image and moonlit jasmine dessert rendering"></a></td>
  </tr>
  <tr>
    <td><strong>🍰 03 · Product — build</strong><p>Turn the design into materials and scaled size variants.</p><a href="docs/readme/stage-product.png"><img src="docs/readme/stage-product.png" alt="Product material table with automatically scaled classic and petite quantities"></a></td>
    <td><strong>🧑‍🍳 04 · Bake — make</strong><p>Plan batches and consolidate ingredients for bake day.</p><a href="docs/readme/stage-bake.png"><img src="docs/readme/stage-bake.png" alt="Bake workspace with two production batches, consolidated materials and an ingredient cost estimate"></a></td>
  </tr>
</table>

<sub>Selected-area browser captures of an illustrative workspace using the bundled sample artwork. Quantities are demonstration data, not a tested recipe. Click a panel to inspect it at full size.</sub>

## 🏡 Two homes for the same atelier

The dessert workflow, Muse, bilingual interface, and workspace tools are shared. Hosting and API-key handling differ:

| | ☁️ `openai` · OpenAI Sites | 🏡 `vps` · Self-hosted |
| :-- | :-- | :-- |
| **Host** | OpenAI Sites, with server routes in a Worker | Any static host or your VPS; optional Nginx container |
| **API key** | The owner binds `OPENAI_API_KEY` as a server-side Sites secret | Each user enters an API base URL and key with the **🔑 button at the top-left**, beside the logo |
| **AI requests** | Browser → app server → OpenAI | Browser → configured OpenAI-compatible API |
| **Visitor setup** | No visitor API-key entry | Configure a connection before using AI features |
| **Key storage** | Server runtime secret; never sent to the browser | This tab’s `sessionStorage`; separate from workspace data |
| **Provider requirement** | The configured OpenAI account supports the app’s models | Compatible Responses, Images and Audio Transcriptions endpoints, with browser **CORS** support |

<a id="quick-start"></a>

## 🚀 Start the VPS edition

Requires **Node.js ≥ 22.13.0** and npm.

```bash
git clone --branch vps https://github.com/LIU-Yinyi/Dessert-Valley.git
cd Dessert-Valley
npm ci
npm run dev
```

Open the local URL printed by Vite. Click the **🔑 key button at the top-left, next to Dessert Valley**, enter your compatible API base URL (including `/v1` where required) and secret key, then save the connection.

<p><img src="docs/readme/vps-api-button.png" alt="The VPS navigation: the API-key button sits immediately beside the Dessert Valley logo on the left" width="400"></p>

The provider must support the endpoints and models in [`app/browser-ai.ts`](app/browser-ai.ts), and allow **CORS** from your website’s origin, including `Authorization` and `Content-Type` headers. Merely offering a chat-completions endpoint is not enough for every feature.

### 📦 Build & self-host

```bash
npm run build
npm run preview
```

Publish the generated **`dist/`** directory through Nginx, Caddy, or another static web server. No Node.js application process is needed after the build. Use HTTPS for a public deployment.

Or use the included container:

```bash
docker build -t dessert-valley .
docker run --rm -p 8080:80 dessert-valley
```

Visit `http://localhost:8080`. The container serves static files using [`deploy/nginx.conf`](deploy/nginx.conf); configure HTTPS at your reverse proxy.

### 🧪 Development checks

```bash
npm run lint
npm test
```

`npm test` builds the app and runs the Node test suite. No real API key is required for these checks.

## 🔐 Your workspace & your keys

Workspace content is stored in **IndexedDB**, with a `localStorage` fallback. Export important projects as JSON for a portable backup. AI actions send the relevant input to the configured provider; local storage does not mean every feature works offline.

On `openai`, **`.openai/hosting.json` is a non-secret hosting manifest**. It currently contains a Sites project identifier and empty `d1` / `r2` bindings — no API key, password, or access token. The Sites build reads this file, so it stays tracked. It is absent from the `vps` branch. Keep credentials in runtime secrets or ignored local configuration, never in this manifest.

On `vps`, the API base URL stays in `localStorage`, while the key stays in tab `sessionStorage` and is excluded from workspace exports. Browser storage does not hide a key from scripts running in that browser. OpenAI recommends keeping API keys on the server; this edition deliberately uses a personal bring-your-own-key connection. For a shared public service using an owner-funded key, choose the Sites edition with a server-side secret. See [OpenAI’s authentication guidance](https://developers.openai.com/api/reference/overview#authentication).

The repository’s ignore rules exclude common secret files, local databases, uploads, exports, logs, and build output. Only sanitized `*.example` configuration templates belong in Git. Review staged changes before pushing; adding an ignore rule does not remove files already in history.

## 🌾 Behind the scenery

Built with **React 19 · TypeScript · Vite**, with parchment panels, timber frames, orchard greens, and keyboard-friendly controls. The original riverside atelier visual system is documented in [DESIGN_STYLE.md](DESIGN_STYLE.md).

- 🛠️ [Development, architecture & operational notes](docs/DEVELOPMENT.md)
- 🎨 [Artwork credits & cover-generation prompt](docs/readme/ARTWORK.md)
- 🖼️ Dessert design and menu examples: **Oli**
- ✨ Cover: original artwork generated with **GPT Image** for Dessert Valley

<p align="center">🌷 Made for small ideas, beautiful desserts, and the joy of making things.</p>
