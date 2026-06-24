# Phase 9 Playtest Script And Evidence Template

Use this template for local-only playtest evidence. Do not add names, email addresses, account identifiers, IP addresses, exact user agent strings, device identifiers, geolocation, photos of people, or other personal data. Keep reports in local project docs or local files only.

## Common Setup

- Build/source under test:
- Commit:
- Test date:
- Tester role: developer / designer / player / observer
- Surface: local static server / GitHub Pages / packaged static folder
- Seed: use a fixed URL seed when comparing runs, or record `unseeded`
- Report export: paste the generated `THATBUTTON PLAYTEST REPORT` text below the run notes

## Desktop Browser Pass

- Browser:
- Viewport class: desktop
- Input mode: mouse / keyboard / mixed
- Did the first 5 levels teach the avoid-then-press rule clearly?
- Did 3x3 start at a readable point?
- Did combo feedback become noticeable without hiding the clue or grid?
- Did moving-button hazards stay visually aligned with click targets?
- Did interference stay out of rule text, player HUD, and critical feedback?
- Did the post-run report panel appear only after failure/timeout?
- Did COPY work? If not, did SELECT expose the fallback textarea?
- Local report export:

```text
PASTE LOCAL REPORT HERE
```

## iOS Safari Pass

- Device class: iPhone / iPad / simulator
- Viewport class: mobile / short-mobile
- Input mode: touch
- Audio unlock after first tap: pass / fail / unclear
- Vibration/haptic feedback, if supported: pass / fail / unsupported
- Safe-area spacing and no-scroll fit: pass / fail
- Button hit accuracy during normal rounds: pass / fail
- Button hit accuracy during moving-button hazards: pass / fail / not reached
- Interference readability: pass / fail / not reached
- Report export panel fit after run end: pass / fail
- COPY result: copied / denied / unavailable
- SELECT fallback result: selectable / not selectable
- Local report export:

```text
PASTE LOCAL REPORT HERE
```

## Android Chrome Pass

- Device class: phone / tablet / emulator
- Viewport class: mobile / short-mobile
- Input mode: touch
- Audio unlock after first tap: pass / fail / unclear
- Vibration feedback, if supported: pass / fail / unsupported
- Safe-area spacing and no-scroll fit: pass / fail
- Button hit accuracy during normal rounds: pass / fail
- Button hit accuracy during moving-button hazards: pass / fail / not reached
- Interference readability: pass / fail / not reached
- Report export panel fit after run end: pass / fail
- COPY result: copied / denied / unavailable
- SELECT fallback result: selectable / not selectable
- Local report export:

```text
PASTE LOCAL REPORT HERE
```

## Human Observation Notes

Record observations without personal identifiers.

- First confusion moment:
- First satisfying moment:
- First unfair-feeling moment:
- Did the player understand "fatal condition means avoid those buttons"?
- Did the player intentionally chase combo, ignore it, or misunderstand it?
- Did upgrades feel understandable and worth choosing?
- Did moving-button hazards feel fair, tense, or annoying?
- Did interference feel readable, exciting, or visually noisy?
- Did the player want another run after failure?
- Suggested next product direction: keep HTML tuning / prepare engine embedding / pause for more playtests
- Evidence confidence: high / medium / low

## Decision Gate Rollup

- Number of desktop runs:
- Number of iOS Safari runs:
- Number of Android Chrome runs:
- Number of human-observed runs:
- Highest level reached:
- Highest enemy reached:
- Highest combo observed:
- Wrong presses per run trend:
- Most common failure reason:
- Hazard readability verdict:
- Report/export reliability verdict:
- Recommended next phase:
