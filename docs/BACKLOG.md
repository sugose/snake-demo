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
- **[NEXT] PBI-2.4** (from the review of #17, notes 1 and 2) — `docs/SPEC.md` 2.11 says what the code does: (a) the last paragraph names both shortfalls (the cells for the obstacles, the dot and the snake; and more obstacles than cells outside the start and the cells ahead of it) and that `newGame` rejects a level 1 the snake leaves no cell of for the dot; (b) 2.11 (3) says a snake of L segments is fully unrolled after L − 1 ticks. A spec wording change: Crog reviews it.
- **[NEXT] PBI-2.5** — Adam plays the levels from the game's link.
- **[LATER] PBI-2.3** — Power-ups: Adam, 2026-11-09, "power ups will be added later". Not specified; Adam describes them first.

---

## Explicitly out of scope

- Sound, several players, online scores (`docs/SPEC.md` 5).
