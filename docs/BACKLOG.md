# Snake demo Product Backlog

**Status:** Living document
**Owner:** Adam Smolowicz with Clead

---

## How to read this backlog

Entry format: product-office Process P-9 § 2. The markers:

| Marker | Meaning |
|---|---|
| [NOW] | Active — being worked on |
| [NEXT] | Queued — ready to start after current work |
| [LATER] | Confirmed future work, not yet scheduled |
| [BLOCKED] | Waiting on dependency or decision |
| [DONE] | Completed and merged |

Items are numbered `PBI-<phase>.<n>`, for example the first item of
phase one is phase 1, item 1. Numbers are never reused.

---

## Waiting for Adam

What needs Adam is in the product office's "Waiting for Adam" list, the
one list he reads (product-office Process P-9 § 3 (1)), not here.

---

## Phase 1 — The game, playable from its link

**Goal:** the game as `docs/SPEC.md` describes it, published at
`https://sugose.github.io/snake-demo/` and playable there.

- **[DONE] PBI-1.6** (done 2026-11-09 in #5, `41837cf`) — `.github/workflows/review.yml` posts a review-ready marker on PRs that change `src/`, but no local rule provides for automation in the review flow (product-office Process P-3 § 1 (3)); Crog's observation 1 on #2. Remove the workflow: reviews are started by Clead (P-3 § 1 (3)).
- **[DONE] PBI-1.1** (done 2026-11-09 in #8, `f38a9ef`) — Game rules, `src/game.ts`: the game state and the commands as pure functions, with the grid size, start length and food chooser passed in (`docs/SPEC.md` 2.1 to 2.5, 2.8, 3, 3.1). Every rule of those sections has a test.
- **[DONE] PBI-1.2** (done 2026-11-09 in #7, `21a3800`) — Input, `src/input.ts`: key names and swipes mapped to turns and commands, with the shortest swipe passed in (`docs/SPEC.md` 2.6, 2.7, 3). Pure; other keys, short swipes and exact diagonals do nothing.
- **[DONE] PBI-1.3** (done 2026-11-09 in #6, `7381d7b`) — Best score, `src/storage.ts`: read and write the best score through a function passed in that returns the store and may throw, with the key passed in; every error caught, and the game going on without it (`docs/SPEC.md` 2.9 (3), (4), 3).
- **[DONE] PBI-1.4** (done 2026-11-09 in #10, `e3648c2`) — The page: `src/config.ts`, canvas, tick timer, keys, swipes and buttons, page visibility, score and best score, in `src/main.ts`, `src/style.css` and `index.html`; the starter example removed; browser tests for a game played to its end, pause, restart, light and dark, 375 px and 1280 px with no sideways scrolling, and a clean console (`docs/SPEC.md` 2, 3, web pack rules).
- **[DONE] PBI-1.5** (done 2026-11-09 in #11, `656fc6b`; first deploy run 42645192262 succeeded) — Publishing: a workflow that builds `dist/index.html` on every merge to `main` and publishes it to GitHub Pages (`docs/SPEC.md` 4). Adam switches the Pages source to "GitHub Actions" (product office "Waiting for Adam").
- **[DONE] PBI-1.7** (done 2026-11-09: Adam, in chat, 18:17, "tested, swipe was good") — Adam plays the game on his phone from its link; his finding on how the swipes feel settles `docs/SPEC.md` 6.1.
- **[DONE] PBI-1.8** (done 2026-11-09 in #14; from the reviewer's optional notes 1 and 2 on #7) — `docs/SPEC.md` 2.6 says what `src/input.ts` and the page already do: a key pressed with Ctrl, Meta or Alt is not a command, and a held key's repeats do not pause or start a new game again. The same PR marks `docs/SPEC.md` 6.1 settled by PBI-1.7. A spec wording change: Crog reviews it.

---

## Phase 2 — Levels

**Goal:** levels, obstacles and the rising speed as `docs/SPEC.md` 2.10 and
2.11 describe them, published and playable at the game's link (Adam,
2026-11-09 21:20, product office PO-170).

- **[DONE] PBI-2.1** (done 2026-11-09 in #17, `66c940a`; published, Pages run 42699552822) — Levels, in one PR so that no half-built level is published (Pages deploys every merge): the rules in `src/game.ts` and `src/config.ts` (laying out a level with its chooser, obstacles and stacked snake, clearing a level after 5 dots, obstacle hits, the delay of a level, the win when no free cell is left; `docs/SPEC.md` 2.1 to 2.3, 2.5, 2.8, 2.10, 2.11, 3, 3.1), and the page in `src/main.ts`, `src/style.css` and `index.html` (obstacles drawn, the level shown, the status line between levels, the heading marked while the snake is on one cell, the tick timer with the level's delay; 2.9 (1), 2.10, 2.11 (3), 3). The existing unit and browser tests change where the start of 2.1 changed (no fixed `10,10` start, no "Start heading right"); new browser tests cover clearing a level, a new level's board, the faster delay and an obstacle hit, with the page's random answers fixed by the tests. Every rule of 2.10 and 2.11 has a test.
- **[DONE] PBI-2.4** (done 2026-11-09 in #19; from the review of #17, notes 1 and 2) — `docs/SPEC.md` 2.11 says what the code does: (a) the last paragraph names both shortfalls (the cells for the obstacles, the dot and the snake; and more obstacles than cells outside the start and the cells ahead of it) and that `newGame` rejects a level 1 the snake leaves no cell of for the dot; (b) 2.11 (3) says a snake of L segments is fully unrolled after L − 1 ticks. A spec wording change: Crog reviews it.
- **[DONE] PBI-2.6** (done 2026-11-09 in #20, `f8346f0`, with a second test rename; from Crog's review of #19) — Loose ends in `src/game.ts` and its tests: a test that the shortfall `won` of 2.11 clears the queued turns (none fails without it today); the test name "as many ticks as it is long" says L − 1 ticks; the doc comment and `RangeError` message of `newGame` say "a start length of size × size or more", as 2.11 now does.
- **[LATER] PBI-2.8** (from the review of #20, note 2) — The doc comment of `nextLevel` in `src/game.ts` says that the `won` it returns when the next level does not fit has no queued turns, as the code and `docs/SPEC.md` 2.11 do.
- **[DONE] PBI-2.9** (done 2026-11-09 in #27, `c9a393e`; published, Pages run 42712097930; product-office PO-171 step 2) — Special levels, in one PR so that no half-built level is published (Pages deploys every merge): the rules in `src/game.ts` and `src/config.ts` (special every 5th level, the delays of 2.10 (2) and 2.12 (2), the shield and the wait after a crash, counted turns, the level's time, `blown`, the level's points, the obstacles' jumps; `newGame` takes the special values, and a game made without them has no special levels), the best score's bound of 4000 worked out in `src/main.ts` from the named values (2.9 (3), 3), and the page: the turns, seconds and shield shown on a special level, the status lines of 2.12 (10), and `blown` saving the best score (`src/main.ts`, `index.html`, `src/style.css`); unit tests for every rule of 2.12 and browser tests for a special level's display, a shielded crash and its wait, and Blown up (`docs/SPEC.md` 2.2, 2.4, 2.5, 2.8 to 2.10, 2.12, 3, 3.1).
- **[DONE] PBI-2.11** (done 2026-11-10 in #30, `8374438`; published; Adam, 2026-11-09 23:55) — In `ready`, a turn whose next cell from the head is outside the board or on an obstacle is ignored (`docs/SPEC.md` 2.1 (3)): `turn` in `src/game.ts`, with unit tests and a browser test of a level laid out against the wall.
- **[DONE] PBI-2.12** (done 2026-11-10 in #32, `ae4c305`; published; Adam, 2026-11-09 23:59) — The status line while the snake waits after a shielded crash names the shield lost, the layers left and the two turns that go on (`docs/SPEC.md` 2.12 (10)): `src/main.ts`, with a browser test.
- **[DONE] PBI-2.13** (done 2026-11-10 in #34, `647eacb`; published, Pages run 42722405710; Adam, 2026-11-10 00:03 and 00:04) — The blinking "Special Level" text over the board when a special level is laid out (`docs/SPEC.md` 2.12 (11), 3): `index.html`, `src/style.css`, `src/config.ts`, `src/main.ts`, with browser tests of its blinking, its 3 seconds, and its going when the level starts.
- **[DONE] PBI-2.15** (done 2026-11-10 in #40, `be27fef`; published; Adam, 2026-11-10 03:25) — The turn that ends a wait after a shielded crash is free (`docs/SPEC.md` 2.12 (5), (6)): `turn` in `src/game.ts`, with the unit and browser tests of the restart turn changed to match.
- **[DONE] PBI-2.14** (done 2026-11-10 in #41 and #42, `98a5634`; published; Adam, 2026-11-10 03:24) — The status line of an ended game gives the reason it ended (`docs/SPEC.md` 2.8, 2.12 (10), 3.1): the reason kept in the game state by `src/game.ts`, the wording in `src/main.ts`, with unit tests for every reason and browser tests updated for the new lines.
- **[DONE] PBI-2.17** (done 2026-11-10 in #45, `8128dba`; published; Adam, 2026-11-10 08:36 and 08:37) — A wait after a shielded crash is ended by a turn into a free direction only; the status line names the free directions; boxed in ends the game (`docs/SPEC.md` 2.8, 2.12 (5), (10)): `src/game.ts`, `src/status.ts`, `src/main.ts`, with unit tests for each direction (neck, wall, obstacle, opposite free, tail, dot, a stacked last segment with the neck on it), boxed in, and the wording, and a browser test of Adam's case of 08:26.
- **[DONE] PBI-2.16** (done 2026-11-10 in #46, `b82da0a`; published; Adam, 2026-11-10 08:34) — The event log (`docs/SPEC.md` 2.13, 3): `src/game.ts` reporting why a turn is ignored and what a crash hit, with unit tests; `src/log.ts` (pure, Jest, every kind of line whole); the build's commit in `vite.config.mts`; the log kept and its panel in `src/main.ts`, `index.html` and `src/style.css`, with browser tests of the link, the panel, Copy, the pause and resume lines, and a played level's lines.
- **[DONE] PBI-2.18** (done 2026-11-10 in #51, `2e81a8c`; published, Pages run 42916395809; Adam, 2026-11-10 10:10, `DECISIONS.md` row "Snake demo, the event log: its Log link can always be used"; specified in #50) — The Log link can be used in every state of the game, so that a log can be had when a bug stops play while the game still counts as running (`docs/SPEC.md` 2.13 (6), 2.5): opening the panel on a running game pauses it (`pause log`) and Close or Escape goes on, only if opening paused it (`resume log`); while it is open, game keys, swipes, Start, Pause, Resume and the Log link do nothing; the panel shows the log after the pause. `src/main.ts`, `src/log.ts`, `index.html`, `src/style.css`, with unit tests of the two lines and browser tests of every state.
- **[DONE] PBI-2.19** (done 2026-11-10 in #51, `2e81a8c`; published, Pages run 42916395809; Adam, 2026-11-10 10:10, `DECISIONS.md` row "Snake demo, the event log: when the Copy button has copied the log"; specified in #50) — When Copy has copied the log, the button turns green and reads "✓ Copied!" for 2000 ms (`copiedMs` in `src/config.ts`, `docs/SPEC.md` 2.13 (6), 3), and at once when the panel closes or opens again; a second Copy starts the 2000 ms over; a refused copy leaves the button plain, clears a showing "✓ Copied!" and selects the text; a copy that finishes after the panel closed or opened again has no effect; a polite live region reads "Copied". `src/main.ts`, `src/config.ts`, `index.html`, `src/style.css`, with browser tests of each case.
- **[NEXT] PBI-2.20** (loose end of #50 and #51) — `docs/SPEC.md` 2.13 (6) says the snake "moves at once" when the panel closes; the code goes on as the Pause command does, the first move one tick later. Change the wording to "goes on as Resume does" (a spec PR; no code change).
- **[NEXT] PBI-2.21** (loose end of #50 and #51) — `docs/SPEC.md` 2.13 (4) says inputs while the panel is open make no line, yet New game starts a new log whose first line is the New game line. Make the two agree (a spec PR, then code and tests if the code differs).
- **[NEXT] PBI-2.22** (loose end of #50 and #51) — "Readable green" in `docs/SPEC.md` 2.13 (6) cannot be tested as written. Replace it with the two colour pairs that are built (light `#15803d` on white, dark `#4ade80` on `#052e16`) or a contrast ratio, and test it (a spec PR, then a browser test).
- **[NEXT] PBI-2.23** (Adam, 2026-11-10 23:04, `DECISIONS.md` row "Snake demo gets a version line") — The page shows a small "v0.2.0 · abc1234" under the board, the version from `package.json` and the build's commit; the event log's first line names the version too. A spec PR first, then the code, test first. The version is set to `0.2.0` once Adam has played the levels, and Adam tags `v0.2.0`.
- **[NEXT] PBI-2.24** (Crog's review of #51; Adam, 2026-11-10, "apyr", `DECISIONS.md` row "Snake demo keys on a focused button") — Keys on a focused button: Space or Enter on Log opens it, on Close closes it, on Copy copies; only Enter with the focus on the board or nothing starts a new game. Today Space on the Log link pauses and Enter makes a new game, and Enter on Close or Copy makes a new game and discards the log. Includes the held Enter with the panel open that writes `key Enter new ignored repeat` (PBI-2.10 (g)). A spec PR, then code.
- **[LATER] PBI-2.10** (from Crog's optional notes on #27, #33, #34, #45 and #46) — (a) A level's time is whole milliseconds only because the configured delays before a special level are even; a guard or a rounding with a spec line would make `docs/SPEC.md` 2.12 (3) hold for any values. (b) `checkSpecial` accepts non-whole or infinite seconds and jump seconds, and does not check the delays. (c) The special row pushes the board down by about 38 px on a special level; keeping its height on every level would stop the shift. That is a look choice, to be put to Adam if he notices it while playing. (d) `docs/SPEC.md` has no blank line between the approval lines of 23:59 and 00:03, so they render as one paragraph. (e) In `e2e/special.e2e.ts`, the comment "2750 ms: shown" in the banner test is wrong: the banner is hidden there. (f) No browser test of the boxed-in status line, and the boxed-in branch of `tick` builds the used layer twice (#45). (g) 2.13 (4) says no input makes a line while the log panel is open; the New game command now does, so add "except the New game command" (#46). (h) No test of a special level cleared with no room for the next; it cannot happen on the 20 × 20 board (#46). (i) `log.ts` places the head on the eaten dot for a clearing tick, a copy of 2.2 step 4; `Cleared` could carry the cell instead (#46).
- **[NEXT] PBI-2.5** — Adam plays the levels from the game's link.
- **[LATER] PBI-2.3** — Power-ups: Adam, 2026-11-09, "power ups will be added later". Not specified; Adam describes them first.
- **[NEXT] PBI-2.7** (product-office PO-171) — Special levels. Decided 2026-11-09 22:39: the rules are the product office's `DECISIONS.md` row "Snake demo, special levels" of that day, which settles the open questions below. Specified in `docs/SPEC.md` 2.12 (#26), with the details the row does not settle marked **[Clead]**; Adam accepted them on 2026-11-09 at 23:02 and 23:04, and left the restart turn to Clead. Built in #27 (PBI-2.9) and published. Next: Adam plays it. History: Adam, 2026-11-09 22:20, "more features to add to backlog... special levels * no more than X turns on the special level before you blow up". Adam, 22:21, another requirement: "duration cannot exceed X seconds before comlpeting level". Adam, 22:33, more: obstacles pop up at random places for some seconds and then jump to a new spot; the speed is doubled (half the delay of the previous level); a 3-layer shield lets the snake bump into a wall or an obstacle, and with all layers used a bump is game over; at the end of a special level (all 5 dots collected), 1 point per remaining second and 1 point per remaining turn, and points on a special level are only (remaining turns + remaining seconds) × a multiplier, "3-number of used shield/3, rounded to the nearest integer"; a special level is every level divisible by 5 (5, 10, 15 …), with the normal number of obstacles; the level after a special level behaves normally, obstacles +1 and "speed 0.25 off the dealy on the previous _normal_ level". Clead's questions of 2026-11-09 22:35 were answered by Adam at 22:35, 22:38 and 22:39.

---

## Explicitly out of scope

- Sound, several players, online scores (`docs/SPEC.md` 5).
