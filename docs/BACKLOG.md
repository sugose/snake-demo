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

- **[NEXT] PBI-1.1** — Game rules, `src/game.ts`: the state and one step of the game as pure functions, with the food cell chosen through a function passed in (`docs/SPEC.md` 2.1 to 2.7, 3). Every rule of 2.1 to 2.7 has a test.
- **[NEXT] PBI-1.2** — Input, `src/input.ts`: keys and swipes mapped to turns and commands (`docs/SPEC.md` 2.8, 3). Pure; unknown keys and short swipes do nothing.
- **[NEXT] PBI-1.3** — Best score, `src/storage.ts`: read and write the best score through a store passed in, every error caught, and the game going on without it (`docs/SPEC.md` 2.9, 3).
- **[NEXT] PBI-1.4** (after PBI-1.1 to PBI-1.3) — The page: canvas, tick timer, keys, swipes and buttons, score and best score, in `src/main.ts`, `src/style.css` and `index.html`; the starter example removed; browser tests for a game played to its end, pause, restart, light and dark, 375 px and 1280 px with no sideways scrolling, and a clean console (`docs/SPEC.md` 2, 3, web pack rules).
- **[NEXT] PBI-1.5** (after PBI-1.4) — Publishing: a workflow that builds `dist/index.html` on every merge to `main` and publishes it to GitHub Pages (`docs/SPEC.md` 4). Adam switches the Pages source to "GitHub Actions" (product office "Waiting for Adam").
- **[NEXT] PBI-1.6** — `.github/workflows/review.yml` posts a review-ready marker on PRs that change `src/`, but no local rule provides for automation in the review flow (product-office Process P-3 § 1 (3)); Crog's observation 1 on #2. Settle it: remove the workflow or provide for it in `RULES.md`.

---

## Explicitly out of scope

- Levels, rising speed, sound, obstacles, several players, online scores (`docs/SPEC.md` 5).
