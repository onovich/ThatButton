# Phase 9 - Playtest Evidence And Decision Gate Goal Guide

Date: 2026-06-24
Status: goal-mode execution guide for the executor

## 0. Direct Goal Prompt For Executor

You are the executor for `D:\WebProjects\ThatButton`.

Execute **Phase 9 - Playtest Evidence And Decision Gate** using this guide. The goal is to make real playtest feedback collectable, comparable, and decision-ready before adding another gameplay system or starting engine embedding.

This phase should create a local evidence kit: lightweight in-game run reports, repeatable manual playtest scripts, validation coverage, and a final decision report. Do not add remote analytics, tracking, networking, or any major new mechanic.

Use `$donextgoal` discipline: work in rounds, run Debug and architecture self-checks every round, validate before each commit, push after each successful commit, and stop if validation or push fails.

Round budget: **8 rounds total**.

- Rounds 1-5: main implementation.
- Rounds 6-7: buffer fixes and evidence cleanup.
- Round 8: final validation, final report, and READY_FOR_CHECK routing.

## 1. Required Reading

Read these first:

- `TODO.md`
- `Role.md`
- `docs/README.md`
- `docs/phase-8-final-report.md`
- `docs/phase-8-playtest-calibration-content-record.md`
- `docs/phase-8-playtest-calibration-content-goal-guide.md`
- `docs/phase-7a-final-report.md`
- `docs/phase-7a-browser-smoke-results.json`
- `src/core/debug.js`
- `src/core/session-preview.js`
- `src/core/combat.js`
- `src/core/enemy.js`
- `src/core/hazards.js`
- `src/core/upgrades.js`
- `src/app/create-app.js`
- `src/ui/render.js`
- `scripts/validate-structure.mjs`
- `scripts/smoke-hazards-browser.mjs`

If a file has moved, find the current equivalent with `rg` and record that in the phase record.

## 2. Phase Goal

Phase 9 should turn the current pending playtest questions into a repeatable evidence loop.

Complete the following:

- Define a local playtest report schema for a single run.
- Capture useful run facts without collecting personal data: seed, build/version facts, viewport class, input mode when safely inferable, levels cleared, enemies reached/defeated, upgrades chosen/offered, max combo, wrong presses, failure/victory reason, hazard exposure, and key timing/pressure facts.
- Expose the report through a minimal player-facing or debug-facing path, such as a recap "copy/export report" action or a debug API. Prefer an unobtrusive UI path only after a run ends; do not clutter the active battle screen.
- Provide a clipboard fallback if browser clipboard access fails, such as a selectable text area or local download string. Do not require network access.
- Add a manual playtest script and evidence template for desktop, iOS Safari, Android Chrome, and human player observations.
- Add deterministic validation and browser smoke coverage for report generation, export behavior, JSON safety, no external telemetry, and mobile layout preservation.
- Produce a final decision-gate report that recommends the next product direction based on evidence gathered or explicitly records which evidence remains pending.

## 3. Non-Scope

Do not do these in Phase 9:

- Do not add remote analytics, telemetry upload, third-party tracking, network submission, cookies for tracking, or any external reporting service.
- Do not collect names, emails, IPs, device identifiers, exact user agent strings, geolocation, or other personal data.
- Do not add Unity, WebView SDK, native bridge, C# bridge, custom URL scheme, engine build pipeline, real 3D, WebGL, Three.js, camera, or spatial-world work.
- Do not add roguelite meta-progression, shops, maps, currencies, inventories, loadouts, relics, or unlock trees.
- Do not add new hazard categories, new enemies as a gameplay system, new combat formulas, new upgrade categories, or new rule semantics.
- Do not tune gameplay values unless a tiny adjustment is required to fix a report/export regression; if that happens, document why and keep it minimal.
- Do not add a framework, runtime dependency, CDN resource, service worker, or PWA.
- Do not redesign the battle UI. Any export/report UI must be compact and secondary.

## 4. Planner Assumptions

- The repeated pending gap is not another simulated balance pass; it is the lack of comparable real-device and human playtest evidence.
- The next major product direction is a high-priority decision. Phase 9 should not decide it blindly; it should make the decision easier and safer.
- The game must remain independently playable as a static HTML/GitHub Pages app.
- Local-only evidence is acceptable. Privacy and no-network behavior are part of the acceptance criteria.
- If real iOS/Android/human evidence cannot be gathered by the executor, Phase 9 should still ship the collection kit and mark the missing evidence honestly as pending.

## 5. Architecture Boundaries And Code Standards

Treat architecture self-check as part of the work, not paperwork.

- Pure report assembly belongs in `src/core` or another pure module.
  - It may consume already-computed run, combat, combo, upgrade, hazard, and recap facts.
  - It must not touch DOM, `window`, `document`, clipboard APIs, downloads, CSS class names, audio, vibration, URL query parsing, or localStorage directly.
- App orchestration may collect event facts and pass them into the report builder.
  - Do not let orchestration become the source of formulas.
  - If report state grows, extract a small dedicated module.
- UI may render and export an already-built report.
  - UI must not decide gameplay outcomes, damage, combo reward, hazard exposure, upgrade math, or score.
  - Report export UI must not obscure active gameplay or mobile controls.
- Storage, if used, must be local, versioned, and small.
  - Handle empty, stale, corrupt, and disabled-storage cases.
  - Do not block gameplay if report storage/export fails.
- Host/debug contracts must stay JSON-safe.
  - Report payloads should be cloneable and serializable.
  - Do not add a high-frequency event stream or VFX event spam.
- Validation must guard privacy and architecture boundaries.
  - Scan source and `dist` for runtime external URLs.
  - Guard against analytics/tracking vocabulary if needed.
  - Validate deterministic report output for fixed seeds or synthetic runs.

## 6. Per-Round Workflow

Each round must include:

- Round goal
- Completed work
- Debug self-check
- Architecture self-check
- Validation commands and results
- Commit hash and push result
- Next round goal
- Whether a buffer round was consumed

Progression rules:

- If validation fails: do not commit, do not push, do not proceed to the next round.
- If validation passes but commit fails: do not proceed to the next round.
- If commit succeeds but push fails: do not proceed to the next round.
- Only after push succeeds may the executor start the next round.
- Do not stage unrelated untracked files or unrelated user changes.

## 7. Debug Self-Check

Every round must answer:

- Can the current change be explained by the smallest relevant run/report fixture?
- Can failures be localized to report core, app event collection, UI export, storage, browser permissions, smoke tooling, host/debug payloads, or docs?
- Are success, failure, timeout, wrong press, upgrade pending, victory, empty report, stale/corrupt report, clipboard denied, and storage-disabled cases covered where relevant?
- If UI changed, was a repeatable desktop/mobile/short-mobile smoke or marker validation added?
- If state changed, are export/import/validate/version boundaries covered?
- Does the change preserve Phase 8 progression evidence, Phase 7A VFX style, bottom player HUD, and hazard layout invariants?
- Does the report avoid personal data and network submission?

## 8. Architecture Self-Check

Every round must answer:

- Did the existing source-of-truth layer remain the source of truth?
- Did UI avoid duplicating report, combat, combo, upgrade, hazard, rule, or difficulty semantics?
- Did app orchestration avoid becoming a formula or content table owner?
- Are report schema, report assembly, export UI, storage, and debug/host exposure separated?
- Did the phase avoid deferred scope: Unity/WebView/native/3D, roguelite meta, new hazards, new dependencies, CDN, PWA, analytics, and broad visual redesign?
- Are unrelated files, generated outputs, and user changes left alone?
- Did validation guard any new invariant introduced this round?

## 9. Round Plan

1. Baseline and report schema.
   - Create `docs/phase-9-playtest-evidence-decision-gate-record.md`.
   - Inventory the current run/session facts available from Phase 8.
   - Define the local report schema and privacy boundaries before coding.
   - Commit and push the baseline/schema record.

2. Pure report builder.
   - Add a pure report builder for synthetic or real run facts.
   - Include versioning, JSON-safe payloads, compact summary text, and missing-field handling.
   - Add validation for deterministic fixtures and privacy-safe shape.

3. Runtime report collection.
   - Collect real run facts through the existing app flow without changing gameplay decisions.
   - Capture final run report on death, timeout, victory, reset-after-run, or comparable run-end states.
   - Preserve localStorage best-run behavior and recap behavior.

4. Export UI and debug API.
   - Add a compact report export path after the run ends or in debug-only UI/API.
   - Add clipboard support with fallback for denied clipboard access.
   - Keep active battle UI uncluttered and mobile-safe.

5. Playtest script and browser smoke.
   - Add manual playtest checklist/template for desktop, iOS Safari, Android Chrome, and human observations.
   - Extend browser smoke or structure validation to cover report creation/export markers, mobile layout, no external URLs, and no analytics/tracking markers.

6. Buffer round 1.
   - Use for export permission issues, report schema cleanup, mobile layout fixes, or validation gaps.

7. Buffer round 2.
   - Use for small copy/readability polish, docs evidence cleanup, or privacy guardrails.

8. Final validation and report.
   - Create `docs/phase-9-final-report.md`.
   - Update `TODO.md`, `docs/README.md`, and `Role.md`.
   - Run the full validation matrix.
   - Push final report and route READY_FOR_CHECK back to planner.

If a buffer round is not needed, use it for one extra report/privacy validation pass. Do not exceed the eight-round budget without planner approval.

## 10. Validation Matrix

Minimum validation before final READY_FOR_CHECK:

- `node --check` on every changed `.js` / `.mjs` file.
- `cmd /c npm.cmd run validate`
- `cmd /c npm.cmd run build`
- `node scripts\validate-static-site.mjs --include-dist`
- `cmd /c npm.cmd run smoke:hazards`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\StartLocalTest.ps1 -DryRun`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\OpenOnlineTest.ps1 -DryRun`
- Runtime external URL scan across `index.html`, `src`, and `dist`.
- Privacy/no-analytics scan for source and `dist`.
- `git diff --check`
- Deterministic report builder fixture smoke.
- Runtime run-end report smoke.
- Clipboard-denied or fallback export smoke when feasible.
- Desktop, mobile, and short-mobile browser smoke if UI changes.

If a command is unavailable, record the exact reason and add the closest repeatable substitute. Do not claim unavailable checks as passed.

## 11. PASS Criteria

Phase 9 is ready for planner check only when all are true:

- A local playtest report schema exists and is documented.
- The game can produce a report for a completed/failed run without network access.
- The report is JSON-safe, versioned, privacy-safe, and contains enough facts to compare runs.
- Export/copy has a fallback when clipboard access is unavailable.
- Report collection does not change gameplay formulas, difficulty, combo, hazards, upgrades, or rule semantics.
- Active gameplay UI remains uncluttered; any report UI appears only after a run or in debug/export surfaces.
- Desktop, mobile, and short-mobile layout remain readable.
- Phase 8 progression labels, Phase 7A VFX style, bottom player HUD, button-origin tracers, and hazard smoke invariants are preserved.
- Manual playtest templates exist for desktop, iOS Safari, Android Chrome, and human observations.
- Real-device/human evidence is either attached or explicitly marked pending.
- No analytics, tracking, network submission, new dependency, framework rewrite, CDN resource, PWA, engine integration, roguelite meta, or new hazard scope was added.
- `docs/phase-9-playtest-evidence-decision-gate-record.md`, `docs/phase-9-final-report.md`, `TODO.md`, `docs/README.md`, and `Role.md` are updated.
- Final validation passes and the final commit is pushed to `origin/main`.

## 12. Final Report Template

Create `docs/phase-9-final-report.md` with:

```markdown
# Phase 9 Final Report - Playtest Evidence And Decision Gate

Phase: Phase 9 - Playtest Evidence And Decision Gate
Guide: `docs/phase-9-playtest-evidence-decision-gate-goal-guide.md`
Phase record: `docs/phase-9-playtest-evidence-decision-gate-record.md`
Final commit: <hash>
Push: <origin/main result>
GitHub Pages workflow: <run id/status after final push>

## Summary

## Report Schema

## Runtime Export Flow

## Playtest Evidence Kit

## Privacy And No-Network Guardrails

## VFX, Hazard, Layout, And Progression Preservation

## Host Bridge And Debug API

## Architecture Self-Check

## Validation

## Pending Real-Device And Human Evidence

## Decision Gate Recommendation

## Non-Scope Preserved

## READY_FOR_CHECK Payload
```

The READY_FOR_CHECK payload must include:

- final head commit
- push result
- final report path
- phase record path
- report/export evidence
- key validation results
- pending evidence list
- explicit privacy/no-network result
- explicit non-scope confirmation
