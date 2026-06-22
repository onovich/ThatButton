# TODO

## Priority 1

- Run a real-device pass on iOS Safari and Android Chrome, focusing on first tap audio unlock, button hit accuracy, safe-area spacing, and whether the no-scroll game layout still fits short screens.
- Playtest the updated rule text for the first 10 levels and record any clue that still makes players ask whether they should press or avoid the described buttons.
- Tune early-level timing after mobile testing; touch input is slower than mouse, so the current timer curve may need a small mobile-specific buffer.

## Priority 2

- Add a lightweight high-score record with `localStorage`, including best level and best score.
- Add a short post-death recap that lists the actual fatal button attributes for learning without making the next run easier.
- Replace CDN-loaded Tailwind and Google Fonts with local CSS or system-font fallbacks if offline GameJam/demo use matters.

## Priority 3

- Add deterministic debug seeds for rule generation so designers can reproduce confusing rounds.
- Expand rule templates only after the current templates pass ambiguity playtests.
- Consider a PWA manifest and install icon once the gameplay loop is stable.
