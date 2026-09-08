# Development & architecture

For the visual tour and edition setup, see the [main README](../README.md).

Dessert Valley is a responsive, browser-only dessert-planning workspace for
moving from a loose idea to a visual design, flexible recipe, production plan,
and diner handbook.
It uses an original **riverside orchard atelier** identity: timber signboards,
parchment work surfaces, crisp countryside scenery, and practical modern forms.

## Product flow

1. **Idea** — type a dessert direction or transcribe a voice recording into
   editable text, and attach up to four reference images. Add to gallery uses AI
   to polish the dessert name, description and tags and select an attached cover
   image. Other attached images remain available in the Design Dock.
2. **Design** — combine text, image, and empty-canvas references into one intent
   package, then generate exterior or cutaway product renderings. Use Audio to
   Text in a text reference to append a spoken design direction; existing audio
   reference cards remain editable.
3. **Product** — switch between active designs, configure optional size
   variants with automatically scaled materials, and add illustrated making
   steps. Material units offer mg, g, kg, lb, oz, piece, and bar suggestions,
   with custom units entered directly. AI imports combine matching ingredients
   with weight conversion; piece, bar, and custom units combine only with the
   same unit. Bake totals follow the same rules.
4. **Bake** — calculate production quantities and costs, then prepare a
   configurable diner handbook in image, HTML, or print/PDF form.

Cards can be exported and imported as JSON for sharing.
The top navigation can switch the full interface between English and Chinese.
The gallery button beside Import showcases @Oli's supplied design and menu in
timber frames, with side-by-side viewing on wide screens and swipe navigation
on narrow screens. Click the backdrop or press Escape to close the gallery.
Within either frame, scroll to zoom around the cursor, left-drag to pan, and
double-click to reset. Keyboard controls support plus/minus, arrows, and 0/Home.

**Ask Muse** is a bilingual AI adviser available throughout the workflow. It uses
the current dessert brief, text references, materials, variants, making steps and
(in Bake) batch quantities and calculated totals to answer follow-up questions.
It offers stage-specific starter questions, source links and optional navigation
to a suggested stage. It does not change workspace data. Audio attachments are
transcribed to editable text before sending. Failed questions remain editable for
retry; closing the panel preserves the conversation, refreshing clears it.

`app/muse-generation.ts` uses the saved browser connection and the Responses
API (`gpt-5.6-luna`, `store: false`). A bounded text snapshot and
the five most recent exchanges accompany each question; images, audio assets,
and the complete stored workspace are excluded. The versioned knowledge base in
`app/muse-knowledge.ts` contains the actual app workflow plus reviewed,
paraphrased references from King Arthur Baking, Callebaut and the FDA. The small
collection is supplied in full on each request, including Chinese conversations;
this avoids missing relevant guidance through keyword matching. It is a curated
library, not live web search. Update its date/version and verify source links when
changing app behavior or refreshing baking guidance. The application validates source IDs
against this library and returns only its known links. It distinguishes sourced
facts from proposed recipe experiments and does not promise unverified shelf life.

## Visual system

The implementation follows [`DESIGN_STYLE.md`](../DESIGN_STYLE.md) without
copying any existing game. The original motif is a riverside pastry workshop
beside a small orchard.

### Tokens

- **Soil / outlines:** `#4A2F24`
- **Wood:** `#70452E`, `#A86F3D`, `#C98749`
- **Parchment:** `#F4DFA8`, `#FFF0BD`, `#FFF7D8`
- **Nature:** `#3F713D`, `#78A84B`
- **Sky / water:** `#88C9D9`, `#397C8D`
- **Accents:** wheat `#D9A441`, barn red `#A84E43`, plum `#704A68`
- **Display type:** Geist Mono with system monospace fallbacks
- **Body type:** Geist with humanist system fallbacks
- **Construction:** 2–4 px outlines, inset highlights, and hard-edged offset
  shadows; no glass effects or soft floating cards

### Reusable interface vocabulary

- `.button`, `.square-button` — tactile pixel buttons with hover, focus,
  pressed, loading, and disabled states
- `.pixel-panel` — reusable parchment panel with timber-weight framing
- `.stage-nav` — compact wooden-noticeboard workflow navigation
- `.stage-intro`, `.section-heading` — consistent section-heading system
- `.idea-tile`, `.reference-card`, `.step-card`, `.handbook-card` — tactile
  card family
- `.view-switch`, `.bake-switch` — segmented selection controls
- `.pixel-modal`, `.modal-backdrop` — keyboard-contained modal system
- `.alias-tip`, `[data-tip]` — mouse and keyboard accessible tooltips
- `.toast`, `.empty-state`, `.render-loader`, `.field-error` — feedback,
  empty, loading, and error states
- `.world-scenery`, `.atelier-footer` — original layered environment framing

## Responsive composition

- **Desktop / laptop:** the header uses equal outer columns around a centered
  workflow board. Design and chef workspaces use balanced columns.
- **Tablet:** navigation moves to a centered second row; dense workspaces stack
  while retaining the same panel rhythm.
- **Mobile:** content becomes single-column, decorative scenery is reduced,
  modals fit the viewport, and primary controls retain 44 px touch targets.
- Horizontal scrolling is limited to data tables that require it.

## Accessibility checklist

- [x] Semantic workflow navigation and logical page headings
- [x] Skip-to-workspace link
- [x] Visible high-contrast focus indicators
- [x] Keyboard-operable controls and tooltip content
- [x] Escape-to-close and trapped keyboard focus in modals
- [x] Accessible names for icon-only controls
- [x] Descriptive text alternatives for meaningful product imagery
- [x] Visible form labels, success, empty, loading, and error states
- [x] Reduced-motion mode
- [x] No automatic audio or rapidly flashing content
- [x] Palette designed for WCAG 2.2 AA contrast where practical

## Performance notes

- Ambient artwork is CSS-based and uses no animation library.
- Product imagery has fixed layout boxes to prevent cumulative layout shift.
- Motion is limited to stepped cloud drift and short interaction feedback.
- Nonessential motion is disabled with `prefers-reduced-motion`.
- The app remains usable before decorative scenery finishes painting.

## Browser model API

Dessert Valley has no application server or bundled model credential. Open the
key button on the left of the top navigation, beside the logo and enter:

- an OpenAI-compatible API base URL, including its version path (for example,
  `https://api.openai.com/v1`);
- the Secret Key accepted by that API.

The browser app appends the appropriate endpoint path for Responses, Images
(generation and edit), and Audio Transcriptions. The configured service must
support the models and request shapes used in `app/browser-ai.ts`. Idea polishing
and Ask Muse use the same saved connection as rendering, recipe advice, material
import, and transcription. Muse uses the curated references in
`app/muse-knowledge.ts`; it does not browse live websites.

Every AI request travels directly from the user's browser to the configured
URL. The base URL is retained in `localStorage`; the Secret Key is retained only
in that tab's `sessionStorage`. The key is not written to IndexedDB, workspace
JSON exports, source files, static build output, or container images.

The model provider must permit browser CORS requests from the site's origin,
including preflight requests and the `Authorization` and `Content-Type`
headers. Serve Dessert Valley over HTTPS when the model endpoint uses HTTPS;
browsers will block mixed-content requests in the opposite configuration.

Any credential available to browser JavaScript can also be exposed by a
compromised browser, malicious extension, or cross-site scripting flaw. Use a
restricted personal credential, keep the deployment trusted, and clear the API
settings when using a shared machine.

## Development

Requirements: Node.js `>=22.13.0`.

```bash
npm ci
npm run dev
npm run lint
npm test
```

`npm run build` creates a static site in `dist/`. `npm run preview` serves that
directory locally for a production-style check.

## Self-hosting

The `dist/` directory can be served by Nginx, Caddy, Apache, an object-storage
static host, or any other ordinary web server. No Node.js process is required
after the build.

For a simple VPS deployment:

```bash
npm ci
npm run build
sudo mkdir -p /var/www/dessert-valley
sudo rsync -a --delete dist/ /var/www/dessert-valley/
```

Point the web server's document root at `/var/www/dessert-valley`. If the server
uses SPA fallback rules, route unknown paths to `index.html`.

The included container builds the static assets and serves them with Nginx:

```bash
docker build -t dessert-valley .
docker run --rm -p 8080:80 dessert-valley
```

Then open `http://localhost:8080`. The example configuration is in
`deploy/nginx.conf`; add TLS at the VPS reverse proxy or load balancer.

## Git and local data

Keep credentials, browser profiles, workspace exports, uploads, local databases,
and runtime logs outside source control. `.gitignore` and `.dockerignore`
exclude common local secret and generated-file paths; sanitized `.env*.example`
and `.dev.vars*.example` templates remain eligible for Git. Ignore rules do not
remove a file already tracked by Git.

Before committing, inspect `git diff --cached` and `git ls-files -ci
--exclude-standard`. With Gitleaks installed, scan history using
`gitleaks git --log-opts="--all --full-history -m" --redact=100`, and scan the
staged source snapshot as well. If a real secret is found in history, stop the
push, revoke or rotate it, and agree on a history-cleanup plan first.
