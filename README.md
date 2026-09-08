# Dessert Valley

Dessert Valley is a responsive dessert-planning workspace for moving from a loose
idea to a visual design, flexible recipe, production plan, and diner handbook.
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

## Visual system

The implementation follows [`DESIGN_STYLE.md`](./DESIGN_STYLE.md) without
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

## Development

Requirements: Node.js `>=22.13.0`.

```bash
npm install
npm run dev
npm run lint
npm run build
node --test tests/rendered-html.test.mjs
```

The deployed build uses vinext and the existing Sites configuration in
`.openai/hosting.json`.
