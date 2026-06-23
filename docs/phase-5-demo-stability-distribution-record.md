# Phase 5 Demo Stability And Distribution Record

Phase: Phase 5 - Demo Stability And Distribution  
Guide: `docs/phase-5-demo-stability-distribution-goal-guide.md`  
Baseline head: `d2d3456a0e7abcecf4e75cbef7be6d7cb0ae71fd`  
Executor thread: `019ef06d-eb89-75c2-beb2-c695f9bcbedd`  
Planner thread: `019eefc3-8126-7271-b4b4-7dd9742c8545`

## Scope Lock

- Preserve the Phase 4 playable loop, boss/combo UI, result recap, Phase 3B Host Bridge API, local static server behavior, and GitHub Pages delivery.
- Remove runtime third-party resources from the distributed demo.
- Add validation that fails if runtime external URLs return.
- Make an explicit PWA/manifest decision without adding a service worker.
- Do not add gameplay, difficulty tuning, Unity/WebView/native bridge work, 3D, roguelite systems, new dependencies, framework migration, or broad visual redesign.

## Runtime Resource Inventory

- `index.html` is the only current runtime document with external resource dependencies:
  - `https://cdn.tailwindcss.com`
  - `https://fonts.googleapis.com/...`
- `src/` contains gameplay, UI rendering, host event, and orchestration modules. No runtime external URL dependency was found there during the baseline scan.
- `scripts/` contains local build/serve/validation helpers. Localhost URLs in launch output are not runtime third-party resources.
- `docs/`, `README.md`, launchers, and GitHub Pages references can keep documentation or deployment URLs as long as runtime files stay self-contained.
- `dist/` is generated output and must be refreshed after runtime resource removal, then scanned for the same external URL guardrails.

## Local CSS Decision

Phase 5 will replace the Tailwind CDN with a small project-owned utility subset in `index.html`.

- Keep the existing semantic CSS and DOM structure.
- Add only utilities already used by the page or result renderer.
- Do not introduce Tailwind, PostCSS, build tooling, or a CSS dependency.
- Replace Google Fonts with local system stacks:
  - UI text: system UI plus common Chinese system fonts.
  - Terminal text: platform monospace stack.

This keeps the visual surface close to Phase 4 while making the demo runnable offline from the repo or `dist/`.

## PWA And Manifest Decision

PWA/manifest work is deferred for this phase.

- No service worker will be added because the guide explicitly keeps that out of scope.
- No manifest will be added in this round because there is no committed icon/distribution asset set yet, and a placeholder manifest would imply installability without offline caching.
- The distribution target for Phase 5 remains a static browser demo and GitHub Pages build with no runtime third-party fetches.

## Validation Plan

Phase 5 validation must cover:

- `npm run validate`
- `npm run build`
- Runtime external URL scan for source runtime files.
- Runtime external URL scan for built `dist/` files after build.
- `StartLocalTest.ps1 -DryRun`
- `OpenOnlineTest.ps1 -DryRun`
- `git diff --check`
- Local HTTP smoke that proves the static demo serves and contains no Tailwind CDN or Google Fonts references.

## Round 1 Self-Check

- No gameplay behavior changed.
- No UI rendering semantics changed.
- No host bridge contract changed.
- No external dependency, PWA, service worker, or framework work introduced.
