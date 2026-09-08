# AGENTS.md

This file is the working agreement for automated coding agents contributing to
Dessert Valley. It applies to the entire repository. If a nested directory
later contains its own `AGENTS.md`, the nearest file takes precedence for files
in that directory.

## Project mission

Dessert Valley is a responsive dessert-planning workspace. Its core workflow is
Idea → Design → Product → Bake: users collect dessert ideas and multimodal
references, create product renderings, develop scaled recipes and production
plans, and prepare diner handbooks.

The product has an original riverside-orchard atelier identity. Preserve the
visual vocabulary in `DESIGN_STYLE.md`: parchment work surfaces, timber
framing, crisp pixel-like edges, countryside scenery, strong focus states, and
practical form controls. Do not introduce glassmorphism, generic dashboard
styling, or copied game assets.

## Runtime and toolchain

- Node.js `>=22.13.0`
- npm with the committed `package-lock.json`
- React 19 and TypeScript in strict mode
- Vite builds a static React application for Nginx or another static host
- Model requests run in the browser through the user-configured compatible API
- ESLint 9 with TypeScript and React Hooks rules
- Node's built-in test runner

Use npm commands unless the task explicitly requires another tool. Do not
silently replace npm or regenerate the lockfile with a different package
manager.

## Important paths

- `app/page.tsx` — primary client UI, workflow state, domain types, and seeded
  workspace content.
- `app/globals.css` — design tokens, component styling, responsive behavior,
  motion, and accessibility states.
- `app/main.tsx` and `index.html` — static application entry points.
- `app/workspace-storage.ts` — versioned IndexedDB persistence with localStorage fallback.
- `app/browser-ai.ts` — provider configuration, credential storage and model requests.
- `app/idea-generation.ts` — validated structured idea generation.
- `app/muse-generation.ts` and `app/muse-knowledge.ts` — contextual adviser and curated references.
- `public/` — source-controlled static assets.
- `tests/` — Node tests for workflows, AI boundaries, storage and the static build.
- `Dockerfile` and `deploy/nginx.conf` — optional static container hosting.
- `dist/` and `node_modules/` — generated local state; never hand-edit or commit them.

## Setup and common commands

Install the exact dependency graph:

```bash
npm ci
```

Run the local development server:

```bash
npm run dev
```

Run repository checks:

```bash
npm run lint
npm test
```

`npm test` builds the application before running the Node tests. When debugging
a source-contract failure after a successful build, the narrower command is:

```bash
node --test tests/rendered-html.test.mjs
```

## Architecture and data boundaries

The interface is intentionally concentrated in `app/page.tsx`. Before making a
large refactor, understand the full Idea → Design → Product → Bake state flow
and the source-contract assertions. Extract components only when doing so
improves ownership or testability without breaking persisted data.

Workspace data is local-first. It is written as a versioned envelope through
`app/workspace-storage.ts`. When changing the shape of persisted state:

1. Update the relevant types and seed/default construction.
2. Keep older stored data safe by normalizing or migrating it on read.
3. Increment the storage version when compatibility requires it.
4. Exercise both IndexedDB and localStorage fallback paths.
5. Preserve import/export compatibility or clearly document a deliberate
   format change.

AI requests go directly to the browser-configured API through `app/browser-ai.ts`.
Keep the Secret Key in tab sessionStorage only, separate from workspace state,
IndexedDB, exports, logs, source files and build output. This branch has no
application server, Cloudflare binding, or bundled provider credential.
Validate input, provider output and source links, and return safe errors.

## Coding conventions

- Keep TypeScript strict. Avoid `any`; prefer explicit domain types, unions, and
  narrow validation at I/O boundaries.
- Use the `@/*` import alias for stable cross-directory imports. Use relative
  imports for files that are clearly local siblings.
- Follow the existing formatting: two-space indentation, semicolons, double
  quotes in TypeScript/TSX, and trailing commas in multiline structures.
- Prefer small pure helpers for calculations, parsing, scaling, and
  normalization.
- Treat state as immutable. Do not mutate React state objects or persisted
  snapshots in place.
- Keep React keys stable and derived from durable IDs, not array indexes when
  records can be reordered.
- Preserve user-authored content when applying generated advice. AI output is a
  suggestion, never silent destructive replacement.
- Validate request sizes, content types, required fields, and provider response
  shapes at API boundaries. Return useful errors without exposing secrets or
  raw upstream payloads.
- Do not edit generated output to fix source behavior. Change source files,
  rebuild, and verify the regenerated result.
- Avoid adding dependencies for functionality available in the platform or
  current dependency set. If a dependency is necessary, explain its purpose
  and commit both manifest and lockfile changes.

## UI, responsive, and accessibility requirements

Use existing design tokens and reusable class families before adding variants.
Keep English and Chinese copy in sync wherever the interface localizes a
string.

All changes must preserve:

- Semantic landmarks and a logical heading structure.
- Complete keyboard operation, including menus, dialogs, and tooltips.
- Visible high-contrast focus states.
- Accessible names for icon-only controls.
- Labels and understandable validation for every form input.
- Escape-to-close and focus containment/restoration for modal interfaces.
- At least 44 px touch targets for primary mobile controls.
- Responsive layouts at the existing 1120 px, 940 px, and 620 px breakpoints.
- `prefers-reduced-motion` behavior for nonessential movement.
- Fixed image layout boxes where possible to avoid cumulative layout shift.
- No autoplaying media, rapid flashes, or color-only status communication.

Check narrow and wide layouts after any structural UI or CSS change. Horizontal
scrolling should remain limited to dense tables that require it.

## AI and image-generation rules

The user supplies their own compatible API URL and Secret Key in Model API
settings. Never add a default credential, read build-time secrets into Vite,
or include credentials in source, prompts, exported data or static assets.
Keep provider models centralized in `app/browser-ai.ts`.

For AI-backed endpoints:

- Keep the model name and endpoint choice explicit.
- Bound prompt and upload sizes before forwarding data.
- Use structured output with strict schemas where the route expects JSON.
- Treat all model output as untrusted input and validate before use.
- Maintain actionable, user-safe failure states and allow retry.
- Preserve reference attribution/order when prompts describe multiple images.
- Do not persist uploaded or generated sensitive content unless the task
  explicitly introduces an approved storage policy.

Tests intentionally assert provider contracts, including isolated credential
storage, safe failures and selected model/API behavior. Update those assertions only
when requirements intentionally change, never simply to make a regression pass.

## Security and privacy

- Put local secrets in ignored `.env*` or `.dev.vars*` files. Commit only
  sanitized `*.example` templates.
- Never commit API keys, cookies, access tokens, private keys, customer content,
  local database files, runtime logs, or provider credentials.
- Do not log authorization headers, full upstream responses, data URLs, or user
  uploads.
- Keep Sites-specific hosting configuration out of this static VPS branch.
- Sanitize imported JSON and user-provided filenames. Do not trust MIME type
  strings without checking content and size constraints.
- Maintain the existing safe SVG/image behavior unless a reviewed requirement
  calls for a change.

If secret material is discovered in Git history, stop and report it. Adding an
ignore rule does not remove already-committed data.

## Testing expectations

Use the smallest useful checks while iterating, then run all checks relevant to
the changed surface before handing off:

- Documentation-only or ignore-rule changes: inspect the diff and ignore
  behavior; a full test is optional unless the requested task requires it.
- TypeScript, React, CSS, worker, config, or dependency changes: run
  `npm run lint` and `npm test`.
- Provider-request changes: add or update boundary tests for valid input, invalid
  input, provider failure, malformed provider output, and missing credentials.
- Persistence changes: test fresh state, existing state, malformed data,
  migration/normalization, and fallback storage.
- Responsive UI changes: verify desktop, tablet, and mobile compositions plus
  keyboard/focus behavior.

Do not claim a check passed unless it was run in the current worktree. If a
check cannot run, record the exact command and the reason.

The rendered-HTML test includes deliberate source-level contracts. Read the
failure closely: an assertion may be protecting product wording, responsive
CSS, persistence, security, or an API integration rather than only markup.

## Git and change hygiene

This is the self-hosted `vps` branch. `openai` contains the Sites version; sync
product behavior without reintroducing its server or hosting dependencies.

- Inspect `git status` before and after edits.
- Preserve unrelated user changes and never discard them to make a patch
  cleaner.
- Keep commits focused and review the staged diff before committing.
- Use commit subjects in the form `<version>: <description-of-changes>`, for
  example `0.2.0: add handbook layout controls`.
- Use the version in `package.json` unless the task deliberately changes the
  release version.
- Do not commit ignored build output, local runtime state, logs, secrets, or
  editor metadata.
- Do not force-push, rewrite history, deploy, or modify remote resources unless
  the user explicitly requests it.

## Completion checklist

Before finishing a change:

1. Confirm the implementation matches the requested product behavior.
2. Review `git diff` for accidental generated files, secrets, debug code, and
   unrelated changes.
3. Run the checks required by the changed surface.
4. Confirm user-visible text is localized where needed.
5. Confirm keyboard, focus, reduced-motion, and responsive behavior for UI
   changes.
6. Summarize files changed and commands run, including any failures or skipped
   checks.
