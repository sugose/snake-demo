# Snake demo — Technical Specification

**Date:** 2026-11-09
**Status:** Intent approved
**Owner:** Clead (technical correctness) / Adam (intent)

Approved: Adam, 2026-11-09 15:05, in chat ("apyr snake spec"), the intent
of sections 1 to 6 as Clead summarised them at 15:03; recorded in the
product office (`DECISIONS.md`, PO-164). The detail added after Crog's
review of #4 (2.1 to 2.9 made exact, 3.1) is Clead's technical detail
within that intent.

---

## 1. System overview

A Snake game that runs in the browser, on a computer or a phone. Its
purpose is to show a friend what the bootstrapper sets up: the game is
the example, built through the full workflow (spec, test first, review,
CI, merge). The game mechanic is the generic one; no maker's name,
branding or look is used.

---

## 2. Gameplay

### 2.1 Board and start

1. The board is a square grid of 20 × 20 cells. A cell is `(x, y)`, with
   `x` from 0 (left) to 19 (right) and `y` from 0 (top) to 19 (bottom).
2. A new game starts in the state `ready`: the snake is 3 cells long,
   head at `(10, 10)`, body `(9, 10)` and `(8, 10)`, heading right; one
   piece of food is placed (2.3); the score is 0. Nothing moves.
3. In `ready`, a turn up, down or right starts the game: the snake's
   heading becomes that direction and the state becomes `running`. A turn
   left, straight back into the neck, is ignored and the game stays
   `ready`. The on-screen Start button starts the game heading right.

### 2.2 One tick

The snake moves one cell per tick, 8 ticks a second, at a constant speed,
while the state is `running`. A tick does these steps in this order:

1. If a turn is queued (2.4), the first one is taken from the queue and
   becomes the heading.
2. The new head is the cell next to the head in the heading's direction.
3. If the new head is outside the board, the game is `over`.
4. The snake eats if the new head is the food's cell.
5. If the new head is on the snake's body, the game is `over`. When the
   snake does not eat, its tail cell does not count, since the tail
   leaves it in the same tick; when it eats, every cell counts.
6. The snake moves: the new head is added; when it does not eat, the
   tail cell is removed.
7. When it eats, the score goes up by one. If the snake now fills all
   400 cells, the game is `won` and no food is placed. Otherwise new food
   is placed (2.3).

A game that is `over` or `won` keeps its last board and score on show.

### 2.3 Food

Food is placed on a free cell, a cell the snake is not on. The free cells
are listed row by row (`y` from 0, and within a row `x` from 0), and the
food goes on the cell at the index a chooser returns. The chooser is
given the number of free cells and returns an index from 0 to that
number minus one; the game uses a random one, and tests pass a fixed one.

### 2.4 Turns

1. A turn comes from a key or a swipe (2.6, 2.7); both are handled the
   same way.
2. In `running`, a turn is checked against the last queued turn, or, when
   the queue is empty, against the heading. A turn in the same direction,
   or in the opposite one, is ignored. Otherwise it is queued, unless two
   turns are already queued, in which case it is ignored.
3. Each tick takes at most one turn from the queue (2.2 step 1), so a
   second turn pressed within one tick is kept for the next tick.
4. In `paused`, `over` and `won`, a turn is ignored. In `ready`, 2.1 (3)
   applies.

### 2.5 States and commands

| Command | `ready` | `running` | `paused` | `over` or `won` |
|---|---|---|---|---|
| Turn (key or swipe) | 2.1 (3) | 2.4 | ignored | ignored |
| Start button | starts heading right | ignored | ignored | ignored |
| Pause (Space, P, Pause button) | ignored | `paused` | `running` | ignored |
| New game (Enter, New game button) | new game (2.1 (2)) | new game | new game | new game |

The queued turns are cleared by a new game. When the page is hidden (the
browser tab is left), a `running` game is paused.

### 2.6 Keys

Arrow keys and W, A, S, D (either case) turn up, left, down and right.
Space and P (either case) pause and go on; Enter starts a new game. Other
keys do nothing. The page stops the arrow keys and Space from scrolling
it while the game has the focus.

A key pressed together with Ctrl, Meta (Cmd) or Alt does nothing, so the
browser's shortcuts are not taken as turns; Shift does not matter. When a
key is held down, its repeats still turn the snake but do not pause, go
on or start a new game again. Keys act on the game even while one of the
buttons has the focus, and a key that does something in the game does
not also press that button.

### 2.7 Swipes

On a touch screen, a swipe on the board turns the snake (a touch or a
pen; a mouse drag is not a swipe). The swipe is the
line from where the touch starts to where it ends. If it is shorter than
30 CSS pixels along both axes, it does nothing. Otherwise its direction is
the axis along which it moved further; a swipe exactly as far along both
axes does nothing. The board does not scroll or zoom on touch. On-screen
buttons Start, Pause and New game do what 2.5 says.

### 2.8 Win and loss

Hitting a wall or the snake's own body ends the game (`over`); filling
the board wins it (`won`). Both show the final score and a way to start a
new game.

### 2.9 Score and best score

1. The page shows the score and the best score.
2. When a game ends (`over` or `won`) with a score above the best score,
   that score becomes the best score and is saved.
3. The best score is kept in the browser's local storage under the key
   `snake-demo.best`, as a whole number from 0 to 400 written in digits.
   A missing value, or any other value, reads as 0.
4. If the browser does not allow local storage, or any read or write
   fails, the game goes on: the best score then lasts only until the page
   is closed. Every access to the storage, including getting hold of it,
   happens inside the best-score module's error handling.

---

## 3. Architecture

- `src/config.ts`: the named values: grid size 20, start length 3, ticks
  per second 8, shortest swipe 30, the storage key. No other module
  writes these numbers (product-office Process P-11 § 5 (2)): `game.ts`,
  `input.ts` and `storage.ts` take the values they need as parameters,
  and `main.ts` passes them from here. The start cells of 2.1 (2) follow
  from the grid size and the start length: the head at the cell
  `(size / 2, size / 2)` (rounded down), the body to its left.
- `src/game.ts`: the game rules as pure functions over a game state (no
  DOM, no timers): a new game, a turn, a tick, pause, and the commands of
  2.5. The food chooser of 2.3 is passed in, so tests are deterministic.
  Covered by Jest.
- `src/input.ts`: maps a key name (`KeyboardEvent.key`) to a command, and
  a swipe's start and end points to a turn or nothing (2.6, 2.7). Pure,
  covered by Jest.
- `src/storage.ts`: reads and writes the best score (2.9) through a
  function passed in that returns the store and may throw. Covered by
  Jest with fake stores, also ones that throw.
- `src/main.ts`: draws the board on a canvas, runs the tick timer, and
  wires keys, swipes, buttons, page visibility and storage. Covered by the
  Playwright tests (web pack rule). The rate of 8 ticks a second is set
  here from `src/config.ts`; the browser tests check that the snake moves.
- Look: an original, plain look, readable in light and dark mode, sized
  for a 375 px wide phone first, with no sideways scrolling.
- The build is one self-contained `dist/index.html` (web pack rule).

### 3.1 Game state

The game state holds at least: the snake's cells (head first), the
heading, the queued turns (at most two), the food's cell (none when
`won`), the score and the state (`ready`, `running`, `paused`, `over`,
`won`). Directions are the strings `"up"`, `"down"`, `"left"` and
`"right"`.

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

1. Whether swipe control feels right on Adam's phone. Settled: Adam
   played it on his phone, "tested, swipe was good" (2026-11-09, in chat;
   PBI-1.7).
