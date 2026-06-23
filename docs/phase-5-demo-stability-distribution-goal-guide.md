# Phase 5 - Demo Stability And Distribution Goal Guide

Date: 2026-06-23T16:43:51.5003882+08:00
Status: execution guide for the executor
Owner role: executor
Planner thread: 019eefc3-8126-7271-b4b4-7dd9742c8545
Executor thread: 019ef06d-eb89-75c2-beb2-c695f9bcbedd
Round budget: 6 conversation rounds

## 0. Direct Goal Prompt For The Executor

Execute Phase 5 for `D:\WebProjects\ThatButton`: stabilize the current browser demo for offline/local presentation and reliable GitHub Pages distribution.

The phase goal is not new gameplay. The phase goal is to remove runtime external resource dependencies, keep the Phase 4 playable experience intact, improve static distribution confidence, and make validation fail if CDN or external font dependencies return.

The current `index.html` still loads Tailwind from `https://cdn.tailwindcss.com` and Google Fonts from `https://fonts.googleapis.com/...`. Phase 5 should replace those with project-owned CSS and system/local font fallbacks while preserving the current CRT layout, mobile fit, boss/combo status strip, Host Bridge API, and GitHub Pages behavior.

## 1. Required Reading

- `TODO.md`
- `README.md`
- `docs/README.md`
- `docs/phase-4-final-report.md`
- `docs/phase-4-boss-combo-prototype-record.md`
- `docs/phase-4-boss-combo-prototype-goal-guide.md`
- `index.html`
- `src/app/create-app.js`
- `src/ui/render.js`
- `src/core/host-events.js`
- `scripts/validate-static-site.mjs`
- `scripts/validate-structure.mjs`
- `scripts/build-static-site.mjs`
- `StartLocalTest.ps1`
- `OpenOnlineTest.ps1`

## 2. Required Work

- Create `docs/phase-5-demo-stability-distribution-record.md` before implementation.
- Inventory all runtime external dependencies in playable files:
  - `index.html`,
  - `src/`,
  - scripts that copy or serve the deployable site,
  - any future manifest/icon files if added.
- Remove the Tailwind CDN script from `index.html`.
- Remove the Google Fonts stylesheet from `index.html`.
- Replace Tailwind utility dependence with project-owned CSS:
  - either convert used utility classes to semantic CSS,
  - or add a small local stylesheet of only project-used utility classes,
  - but do not add Tailwind, PostCSS, build tooling, or any dependency.
- Replace web font dependence with a resilient local/system font stack. Preserve the CRT terminal feel with system monospace where needed.
- Keep the current visual hierarchy: clue, timer, grid, best-run strip, boss/combo strip, recap overlay, start screen, and game-over/victory screen must remain readable.
- Update static validation so playable runtime files fail if external runtime URLs return, especially CDN scripts, Google Fonts, remote CSS, remote JS, and remote image/icon assets.
- Ensure `npm run build` still copies everything needed into `dist/`.
- Add local HTTP smoke markers for offline/distribution readiness.
- Make an explicit PWA decision in the record:
  - If adding a minimal `manifest.webmanifest` and local icon is low-risk, do it with validation.
  - If it creates distracting scope or visual asset work, defer it and document why.
  - Do not add a service worker or offline cache in this phase unless the planner explicitly updates this guide.
- Add `docs/phase-5-final-report.md` at completion.

## 3. Strict Code Standards And Architecture Constraints

These are hard constraints:

- No gameplay changes. Do not alter rules, difficulty, boss HP, damage, combo, score, timers, rewards, host input, host events, storage schema, or recap semantics.
- No framework or build-tool migration.
- No new npm dependency.
- No Tailwind package install.
- No service worker cache, cache invalidation layer, or app shell architecture.
- No broad visual redesign. CSS changes should preserve the existing look and mobile layout.
- UI CSS may move to a local file only if `build-static-site.mjs` and validation copy/check it correctly.
- Core/config modules must remain browser-free and must not be touched for distribution-only work unless validation imports need path updates.
- Host Bridge API must remain compatible: `window.__THAT_BUTTON_HOST__`, `start`, `reset`, `press`, `getSnapshot`, and JSON-safe host events.
- Existing debug helper names and semantics must remain compatible.
- Do not edit `origin/` or GitHub Pages workflow files unless Pages validation proves the workflow itself is broken.
- Do not hide distribution logic in vague helper names. Files should have clear ownership such as `validate-static-site`, `build-static-site`, or `styles`.

## 4. Per-Round Fixed Workflow

Every round reply must include:

- round goal,
- completed work,
- Debug self-check,
- architecture self-check,
- validation commands and results,
- commit hash and push result,
- next round goal,
- whether a buffer round was consumed.

Progression rules:

- If validation fails, do not commit, do not push, and do not move to the next round.
- If validation passes but commit fails, do not move to the next round.
- If commit succeeds but push fails, do not move to the next round.
- Only after successful push may the executor continue to the next round.
- Do not stage unrelated files or unrelated user changes.

## 5. Debug Self-Check Required Each Round

Every round must answer:

- Can the current distribution change be reproduced with local files and the static server?
- Can failures be localized to HTML entry, CSS replacement, build copy, static validation, local server, GitHub Pages artifact, or UI rendering?
- Are normal browser play, seeded debug URL, host API, boss/combo UI, failure recap, victory recap, and no-network runtime checks covered where relevant?
- If CSS changed, what proves the text and controls still fit on mobile and desktop?
- If manifest/icon work was considered, was the decision implemented or explicitly deferred?

## 6. Architecture Self-Check Required Each Round

Every round must answer:

- Did the phase avoid gameplay, combat, combo, difficulty, rules, storage, recap, and host-event semantic changes?
- Did CSS/distribution work stay in presentation/build/validation layers?
- Did validation guard the new offline/no-external-runtime constraint?
- Did the build output include all required local assets?
- Did normal browser and GitHub Pages paths stay equivalent?
- Were unrelated files, generated outputs, and user changes left alone?

## 7. Round Plan

Round budget: 6 total rounds.

1. Distribution baseline: document current external dependencies, CSS utility usage approach, no-network target, PWA/manifest decision, and validation plan in `docs/phase-5-demo-stability-distribution-record.md`.
2. Local CSS/font replacement: remove CDN script and Google Fonts link, add project-owned CSS or semantic class replacements, and keep visual behavior equivalent.
3. Build and validation guardrails: update build/static validation to copy/check local assets and fail on playable runtime external URLs.
4. Smoke and layout hardening: run local HTTP smoke, seeded debug smoke, host API smoke, and static/mobile marker checks for the new CSS path.
5. Buffer: fix visual/layout regressions, missing assets, Pages path issues, or validation drift.
6. Final validation and report: create `docs/phase-5-final-report.md`, run the full matrix, commit, push, and report READY_FOR_CHECK.

Adjacent rounds may be combined if validation stays strong, but the executor must not skip baseline inventory, external-runtime URL guard, local HTTP smoke, final report, commit, or push.

## 8. Non-Scope

- No gameplay expansion.
- No boss/combo tuning.
- No difficulty curve retuning.
- No copywriting tone pass beyond tiny labels needed by distribution docs.
- No Unity, WebView plugin, native bridge, 3D rendering, or engine work.
- No moving buttons, occlusion, spatial interaction, roguelite, shops, perks, loadouts, or multi-boss work.
- No framework migration.
- No new dependency.
- No service worker.
- No broad art direction change.
- No edits to `origin/` unless documenting original external dependencies in the record.

## 9. PASS Criteria

Phase 5 can be READY_FOR_CHECK only when all are true:

- Playable runtime files no longer require Tailwind CDN, Google Fonts, remote CSS, remote JS, remote images, or remote icons.
- Static validation fails if runtime external URLs are reintroduced.
- The browser game remains playable from the local static server.
- GitHub Pages build still succeeds.
- Phase 4 boss/combo UI remains present and readable.
- Host Bridge API and host event validation remain compatible.
- Existing seeded preview, failure recap, best-record, host bridge, combat/combo, and victory-path smokes still pass.
- `docs/phase-5-demo-stability-distribution-record.md` and `docs/phase-5-final-report.md` exist.
- `TODO.md`, `README.md` if needed, and `docs/README.md` reflect the Phase 5 distribution state.
- The final implementation has been committed and pushed.

## 10. Required Validation Matrix

- `npm run validate`
- `npm run build`
- `.\StartLocalTest.ps1 -DryRun`
- `.\OpenOnlineTest.ps1 -DryRun`
- `git diff --check`
- Local HTTP smoke for a seeded debug URL
- Runtime external URL scan for `index.html`, `src/`, manifest/icon references, and built `dist/`
- Static marker check that the Tailwind CDN script and Google Fonts stylesheet are absent
- CSS/layout marker smoke for start screen, clue, grid, timer, best-run strip, boss/combo strip, and result recap
- Host API smoke for `window.__THAT_BUTTON_HOST__`
- Existing seeded preview smoke for levels 1, 4, 8, 12, and 18
- Existing failure recap smoke for wrong-click and timeout
- Existing best-record helper smoke
- Existing combat/combo victory-path smoke
- GitHub Pages workflow check after final push

If no browser automation tool is available for visual screenshots, document that limitation and keep real-device/manual visual review pending.

## 11. Final Report Template

Create `docs/phase-5-final-report.md` with:

- Summary
- External dependency removal
- CSS/font replacement approach
- Build/distribution changes
- Validation guardrails added
- PWA/manifest decision
- Architecture self-check summary
- Validation results
- Non-scope preserved
- Remaining pending evidence
- Commits and push result

## Return Message

When complete, send the planner thread a routing message with:

- `from: executor`
- `to: planner`
- `workspace: D:\WebProjects\ThatButton`
- `phase: Phase 5 - Demo Stability And Distribution`
- `action: recheck`
- `guide: docs/phase-5-demo-stability-distribution-goal-guide.md`
- `status: READY_FOR_CHECK`
- final commit, push result, final report path, distribution record path, validation evidence, architecture self-check summary, and explicit pending evidence.
