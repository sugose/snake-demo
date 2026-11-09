# Snake demo — Technical Specification

**Date:** 2026-11-09
**Status:** Intent approved
**Owner:** Clead (technical correctness) / Adam (intent)

Approved: Adam, 2026-11-09 15:05, in chat ("apyr snake spec"), the intent
of sections 1 to 6 as Clead summarised them at 15:03; recorded in the
product office (`DECISIONS.md`, PO-164).

---

## 1. System overview

A Snake game that runs in the browser, on a computer or a phone. Its
purpose is to show a friend what the bootstrapper sets up: the game is
the example, built through the full workflow (spec, test first, review,
CI, merge). The game mechanic is the generic one; no maker's name,
branding or look is used.

---

## 2. Gameplay

1. The board is a square grid of 20 × 20 cells.
2. The snake starts 3 cells long in the middle of the board, heading
   right. The game waits for the first direction key or swipe before it
   moves.
3. The snake moves one cell per tick, 8 ticks a second, at a constant
   speed.
4. One piece of food is on the board at a time, on a random free cell.
   When the head reaches it, the snake grows by one cell, the score goes
   up by one, and new food appears.
5. The game ends when the head hits a wall or the snake's own body.
   Moving into the cell the tail is leaving in the same tick is allowed.
6. A turn straight back into the snake's own neck is ignored. At most one
   turn counts per tick; a second key press in the same tick is kept for
   the next tick (one buffered turn).
7. If the snake fills the board, the game is won.
8. Controls: arrow keys and W A S D to turn, Space or P to pause and go
   on, Enter or the on-screen button to start a new game. On a touch
   screen, a swipe on the board turns the snake, and on-screen buttons
   start, pause and restart it.
9. The page shows the score and the best score. The best score is kept
   in the browser; if the browser does not allow that, the game works
   without it.

---

## 3. Architecture

- `src/game.ts`: the game rules as pure functions over a game state (no
  DOM, no timers). The random choice of a food cell is passed in, so
  tests are deterministic. Covered by Jest.
- `src/input.ts`: maps keys and swipes to turns and commands. Pure,
  covered by Jest.
- `src/storage.ts`: reads and writes the best score, with every error
  caught. Covered by Jest with a fake store.
- `src/main.ts`: draws the board on a canvas, runs the tick timer and
  wires input and storage. Covered by the Playwright tests (web pack
  rule).
- Look: an original, plain look, readable in light and dark mode, sized
  for a 375 px wide phone first, with no sideways scrolling.
- The build is one self-contained `dist/index.html` (web pack rule).

---

## 4. Publishing

The game gets its link through GitHub Pages: a workflow builds
`dist/index.html` on every merge to `main` and publishes it to
`https://sugose.github.io/snake-demo/`. Adam switches the repository's
Pages source to "GitHub Actions" once (a repository setting).

---

## 5. Out of scope

Levels, rising speed, sound, obstacles, several players, online scores.

---

## 6. Known unknowns

1. Whether swipe control feels right on Adam's phone; checked when Adam
   plays it.
