# First-run reliability and onboarding

## Changes

- Defeat and abandon use one idempotent end-run handler. It invalidates the session before clearing its save, rewards, story/modal state and deck, and unmounts combat. Restart/menu buttons ignore duplicate activation.
- Each mounted combat view owns a cancellable action scope. Cancelled waits settle without continuing enemy actions; discarded/drawn flight waiters are released on unmount. Live callbacks additionally verify their original run and battle generation.
- Tutorial and live combat share card/player hit presentation. Tutorial now includes damage numbers, enemy feedback, shield feedback and draw audio. Cold-cache attack sounds warm the cache without replaying old hits; delayed sounds and AudioContext resume callbacks are invalidated when leaving a scene.
- One-time, dismissible hints explain routes, reward selection and restarting. They do not change combat rules, rewards, deck balance or gacha.

## Local journal

`xiuxian_journey_events_v1` stores up to 200 events **on the current device only**. There is no analytics upload or aggregate retention dashboard. Read it in DevTools:

```js
JSON.parse(localStorage.getItem('xiuxian_journey_events_v1') || '[]')
```

Events include tutorial opening/start/steps/completion/skip/exit, run start (with tutorial cohort), battle start/win, reward selection/skip and run end/restart. Join combat events to the run-start event by `data.runId`; count distinct battle node IDs to identify reaching battle two. Replay tutorial events have `data.replay: true` and should be excluded from first-time tutorial conversion. Missing subsequent events are not proof of why a player left. Data is bounded and may be unavailable when storage is blocked.

Hints use the separate `xiuxian_journey_hints_v1` key. Clear only that key to inspect hints again. Neither key changes run, character, story or gacha saves.

## Automated validation

```sh
npm test
npx tsc --noEmit
npm run build
```

Tests cover guided tutorial rules, storage isolation, duplicate input, cancelled windups, deduplicated cold audio loading, bounded journal storage, and real GamePage hooks under React StrictMode. The page integration test uses a DOM with stubbed presentation: it restores an earned-card checkpoint, abandons/restarts, invokes stale callbacks, defeats, reloads, switches character and checks the next deck, HP, run currency and permanent progress. It does not simulate purchase/reward clicks or render CSS/real audio.

## Manual checks before merging

This execution environment could compile/export the app and run DOM integration tests, but could not launch Chromium (socket operation not permitted). Real browser layout, audio output latency and iPhone audio unlocking remain unverified.

- At 360×640 and 390×844, dismiss route/reward hints and ensure all cards and defeat actions remain reachable; check scrolling at 200% text size.
- Play the tutorial through the 7-block/6-hit defense and 33-damage combo. Check hit sound, floating number and HP update occur together. Finish, skip and replay without changing an active-run checkpoint.
- In live combat, abandon during card windup, enemy windup, shield-break-to-HP transition and multi-hit attacks; immediately restart. Check no old hit, reward, draw or sound arrives in the new run.
- Earn and buy cards, refresh at a stable route checkpoint, then defeat/abandon. Restart with the character's base deck, full HP and 100 run spirit; permanent stones, collection and achievements stay intact.
- Test cold and warm audio cache, muted/background/resumed browser, wolf attacks, sword burst, shield break and multiple hits. A sample unavailable at the hit cue is deliberately silent rather than played late.
