# Snake demo — Technical Specification

**Date:** 2026-11-09
**Status:** Intent approved
**Owner:** Clead (technical correctness) / Adam (intent)

Approved: Adam, 2026-11-09 15:05, in chat ("apyr snake spec"), the intent
of sections 1 to 6 as Clead summarised them at 15:03; recorded in the
product office (`DECISIONS.md`, PO-164). The detail added after Crog's
review of #4 (2.1 to 2.9 made exact, 3.1) is Clead's technical detail
within that intent.

Approved: Adam, 2026-11-09 21:16 to 21:20, in chat ("apyr for what was
specced now"), levels, obstacles and the rising speed: his own rules and
Clead's recommendations of 21:18 and 21:19 he accepted; recorded in the
product office (`DECISIONS.md`, PO-170). Sections 2.10 and 2.11, and the
changes to 2.1, 2.2, 2.3, 2.5, 2.8, 2.9, 3, 3.1 and 5 that follow from them,
are Clead's exact wording of that decision. At 21:24 Adam lowered the
clear cells ahead of a start from 10 to 8, and at 21:29 he chose a random
start for every level, level 1 included (`DECISIONS.md`, PO-170).

Approved: Adam, 2026-11-09 22:20 to 22:39, in chat, the special levels:
his own rules of 22:20, 22:21, 22:33, 22:35 and 22:38, and Clead's
recommendations of 22:35 to 22:40 he accepted with "apyr" at 22:39;
recorded in the product office (`DECISIONS.md`, the row "Snake demo,
special levels", PO-171). Section 2.12, and the changes to 2.2, 2.4, 2.5,
2.8, 2.9, 2.10, 3 and 3.1 that follow from it, are Clead's exact wording
of that decision. Details the decision does not settle are marked
**[Clead]**: they are Clead's choices, not Adam's, and are put to him in
the product office's "Waiting for Adam" list.

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
2. A new game starts at level 1 with the score 0 and a snake of 3
   segments, laid out as 2.11 says, in the state `ready`, with the status
   line naming level 1 (2.10 (3)). Nothing moves.
3. In `ready`, a turn starts the game: the snake's heading becomes that
   direction and the state becomes `running`. A turn opposite to the
   heading is ignored and the game stays `ready`. The on-screen Start
   button starts the game in the heading it has.

### 2.2 One tick

The snake moves one cell per tick while the state is `running`, with the
delay between ticks of its level (2.10). A tick does these steps in this order;
on a special level, 2.12 (4) adds to them and changes steps 1, 3, 5 and 7:

1. If a turn is queued (2.4), the first one is taken from the queue and
   becomes the heading.
2. The new head is the cell next to the head in the heading's direction.
3. If the new head is outside the board, the game is `over`.
4. The snake eats if the new head is the food's cell.
5. If the new head is on an obstacle, or on the snake's body, the game is
   `over`. The body is the snake's segments; when the snake does not eat,
   its last segment does not count, since it leaves in the same tick, but
   other segments on the same cell do (2.11 (3)); when it eats, every
   segment counts.
6. The snake moves: the new head is added; when it does not eat, the
   last segment is removed.
7. When it eats, the score and the dots eaten on this level go up by one.
   If that makes 5 dots on this level, the level is cleared (2.10 (3)).
   Otherwise, if no free cell is left, the game is `won` and no food is
   placed; otherwise new food is placed (2.3).

A game that is `over` or `won` keeps its last board and score on show.

### 2.3 Food

Food (the dot) is placed on a free cell, a cell with no snake segment and
no obstacle on it. The free cells
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
4. In `paused`, `over`, `blown` and `won`, a turn is ignored. In `ready`,
   2.1 (3) applies.
5. On a special level, turns are counted, and a snake waiting after a
   shielded crash takes its turn as 2.12 (5) says.

### 2.5 States and commands

| Command | `ready` | `running` | `paused` | `over`, `blown` or `won` |
|---|---|---|---|---|
| Turn (key or swipe) | 2.1 (3) | 2.4 | ignored | ignored |
| Start button | starts in the heading it has | ignored | ignored | ignored |
| Pause (Space, P, Pause button) | ignored | `paused` | `running` | ignored |
| New game (Enter, New game button) | new game, level 1 (2.1 (2)) | new game | new game | new game |

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

Hitting a wall, an obstacle or the snake's own body ends the game
(`over`), except that on a special level a shield layer can take a hit
on a wall or an obstacle (2.12 (5)); running out of turns or time on a
special level ends it as `blown` (2.12 (6), (7)); leaving no free cell
for the next dot wins it (`won`). All three show the final score and a
way to start a new game. A game that is `blown` keeps its last board and
score on show, as `over` and `won` do.

### 2.9 Score and best score

1. The page shows the level, the score and the best score. The score
   counts on across levels; the best score is the best such total. On a
   normal level each dot gives one point; on a special level the dots
   give none and the level gives its points when it is cleared
   (2.12 (8)).
2. When a game ends (`over`, `blown` or `won`) with a score above the
   best score, that score becomes the best score and is saved.
3. The best score is kept in the browser's local storage under the key
   `snake-demo.best`, as a whole number from 0 to 4000 written in digits.
   A missing value, or any other value, reads as 0. **[Clead]** 4000 is
   a bound no game can pass: every level takes 5 dots, so at most
   400 / 5 = 80 levels can be cleared, and no level gives more than
   20 + 30 = 50 points. A best score saved before the special levels
   (at most 400) still reads as it was.
4. If the browser does not allow local storage, or any read or write
   fails, the game goes on: the best score then lasts only until the page
   is closed. Every access to the storage, including getting hold of it,
   happens inside the best-score module's error handling.

### 2.10 Levels

1. A game starts at level 1. A level is cleared by eating 5 dots on it.
2. The delay between ticks on a normal level (one that is not special,
   2.12 (1)) is 125 − 5 × M milliseconds, where M is the number of normal
   levels before it, and never less than 50: 125 ms on level 1, 120 ms on
   level 2, 110 ms on level 4, 105 ms on level 6 (the special level 5 is
   not counted), and 50 ms from level 19 on. The delay on a special level
   is in 2.12 (2).
3. When a level is cleared, the game goes to the next level: the level
   goes up by one, the dots eaten on it start at 0, the queued turns are
   cleared, and the board is laid out anew (2.11) with the snake as long
   as it was when the level was cleared, the growth from the 5th dot
   included. The state is `ready` until a turn or the Start button
   starts the level (2.1 (3)); while `ready`, the page's status line says
   which level is about to start.
4. Level N has N − 1 obstacles: none on level 1, one on level 2, and so
   on. An obstacle is a cell the snake must not enter.

### 2.11 Laying out a level

For a new game and for each new level, in this order:

1. The board is emptied: no snake, no obstacles, no dot.
2. The start: the possible starts are every cell and heading from which
   the 8 cells straight ahead lie on the board. They are listed row by
   row (as in 2.3), and for each cell in the order up, right, down, left;
   the chooser picks one. One chooser, the one of 2.3, picks the start,
   each obstacle and the dot; the game picks at random, and tests pass
   fixed answers.
3. The snake: all its segments are put on the start cell, with the start
   heading. The head moves on from there and the rest follow, so the
   snake unrolls behind the head and has its full length on the board
   after one tick less than it has segments (L − 1 ticks for L segments).
   While the snake is on one cell, the
   page marks its heading on the head.
4. The obstacles: one at a time, each picked at random by the chooser
   from the free cells that are not the start cell and not one of the 8
   cells ahead of it, listed row by row.
5. The dot: placed as 2.3 says. It may land on one of the 8 cells ahead
   of the start; those are kept free of obstacles only.

The board must be at least 9 × 9 so that a start exists; `newGame`
rejects a smaller one, and a start length of `size × size` or more
(the same count as below, with no obstacles on level 1). When a level is cleared, the next one cannot be laid out if the
obstacles, the dot and the snake's segments together are more than the
board's cells, or if there are more obstacles than cells outside the
start and the cells kept free ahead of it; then the game is `won`, with
the level, the score and the snake as they were when the last level was
cleared, no queued turns, and no obstacles or dot.

### 2.12 Special levels

1. Every level whose number is divisible by 5 (5, 10, 15 …) is special;
   every other level is normal. A special level is laid out as 2.11
   says, with N − 1 obstacles like any level, is cleared by 5 dots like
   any level (2.10 (1)), and goes to the next level as 2.10 (3) says.
   The level after a special level is normal.
2. The delay between ticks on a special level is half the delay of the
   level before it, with no 50 ms floor: 55 ms on level 5, 45 ms on
   level 10, 35 ms on level 15, and 25 ms from level 20 on (half of
   110, 90, 70 and 50).
3. At its start (when it is laid out), a special level has a shield of
   3 layers, 20 turns and 30 seconds. **[Clead]** Each special level
   starts with a full shield, all 20 turns and all 30 seconds; nothing
   carries over from an earlier special level. Its time is the sum of
   the delays of the ticks in which the snake moved (step 6 of 2.2);
   so the time runs only while the snake moves, and not in `ready`, in
   `paused`, while the snake waits after a shielded crash (5), or in the
   tick of the crash itself.
4. A tick on a special level is 2.2 with these changes:
   - If the snake is waiting (5), the tick does nothing.
   - Step 1: a turn taken from the queue is counted (6). If that makes
     21 turns on this level, the game is `blown` (6) and the tick ends,
     with everything else as it was.
   - Steps 3 and 5: a new head outside the board or on an obstacle is a
     crash, which (5) handles. A new head on the snake's own body ends
     the game (`over`), shield or not.
   - Step 7: eating a dot adds one to the dots eaten on this level but
     nothing to the score. When it clears the level, the level's points
     (8) are added to the score before the next level is laid out.
   - After step 7, if the level was not cleared and the game was not
     won: if the level's time is now 30 seconds or more, the game is
     `blown` (7); otherwise, if the time has passed a whole multiple of
     3 seconds in this tick, the obstacles jump (9).
5. A crash with at least one shield layer left uses one layer. The
   snake does not move: its segments stay where they were, the heading
   stays the one of this tick (a turn taken in step 1 included), and the
   queued turns are cleared **[Clead]**. The game stays `running`, but
   the snake waits until a turn: while it waits, a turn in the heading
   or opposite to it is ignored; any other turn becomes the heading at
   once (not queued), is counted (6), and ends the wait, so the snake
   moves that way on the next tick. **[Clead]** That turn counts as a
   turn, since it changes the snake's direction. A crash with no layer
   left ends the game (`over`).
6. A turn counts when it becomes the heading: when a tick takes it from
   the queue (step 1), or when it ends a wait (5). The turn that starts
   the level from `ready` (2.1 (3)), and the Start button, are not
   turns. At most 20 turns are allowed; the 21st turn ends the game
   as `blown` at the moment it would become the heading, before the
   snake moves, with the board as it was.
7. The level must be cleared within 30 seconds of its time (3). A tick
   after which the time is 30 seconds or more and the level is not
   cleared ends the game as `blown`, with the board as that tick left it.
8. When the 5th dot clears a special level, the level gives
   (T + S) × (3 − U) / 3 points, rounded to the nearest whole number,
   where T is the turns left (20 minus the turns counted), S the seconds
   left and U the shield layers used. The multiplier is 1, 2/3 or 1/3;
   the product never ends in exactly .5, so the rounding has no tie.
   **[Clead]** The seconds left are counted in whole seconds, rounded
   up: 30 minus the time in seconds, rounded up to a whole number (a
   second that has begun counts as left). The page's countdown shows the
   same number.
9. The obstacles jump: all of them at once, each picked anew at random,
   one at a time, by the chooser of 2.3 from the free cells listed row
   by row, leaving out the snake's cells, the dot's cell, the cells of
   the obstacles already picked in this jump, and the 2 cells straight
   ahead of the head in its heading that lie on the board. If there are
   fewer such cells than obstacles, the obstacles stay where they are
   (this cannot happen on the 20 × 20 board). **[Clead]** The obstacles
   follow the level's time (3): they first jump 3 seconds into it, and
   do not jump while the snake waits after a crash.
10. **[Clead]** What the page shows on a special level: next to the
    level, the score and the best score, three more values: the turns
    left, the seconds left (8) and the shield layers left. They are
    hidden on a normal level. The status line in `ready` says it is a
    special level and names its limits ("Level 5, special: 20 turns,
    30 seconds, shield of 3. …"); while the snake waits after a crash it
    says to turn to go on; when the game is `blown` it says "Blown up".
    The obstacles look the same as on a normal level.

---

## 3. Architecture

- `src/config.ts`: the named values: grid size 20, start length 3,
  shortest swipe 30, the storage key, dots per level 5, the first delay
  125 ms, the delay step 5 ms, the shortest delay 50 ms, the 8 clear
  cells ahead of a start, and the special levels' values of 2.12: every
  5th level, 3 shield layers, 20 turns, 30 seconds, a jump every
  3 seconds and 2 cells kept free ahead of the head. No other module
  writes these numbers
  (product-office Process P-11 § 5 (2)): `game.ts`, `input.ts` and
  `storage.ts` take the values they need as parameters, and `main.ts`
  passes them from here.
- `src/game.ts`: the game rules as pure functions over a game state (no
  DOM, no timers): a new game, a turn, a tick, pause, the commands of
  2.5, levels and laying out a level (2.10, 2.11), special levels
  (2.12), and the delay of a level. The choosers of 2.3 and 2.11 are passed in, so tests are
  deterministic. Covered by Jest.
- `src/input.ts`: maps a key name (`KeyboardEvent.key`) to a command, and
  a swipe's start and end points to a turn or nothing (2.6, 2.7). Pure,
  covered by Jest.
- `src/storage.ts`: reads and writes the best score (2.9) through a
  function passed in that returns the store and may throw. Covered by
  Jest with fake stores, also ones that throw.
- `src/main.ts`: draws the board, the obstacles and the level on a
  canvas, shows a special level's turns, seconds and shield (2.12 (10)), runs the tick timer with the delay of the current level, and
  wires keys, swipes, buttons, page visibility and storage. Covered by the
  Playwright tests (web pack rule).
- Look: an original, plain look, readable in light and dark mode, sized
  for a 375 px wide phone first, with no sideways scrolling.
- The build is one self-contained `dist/index.html` (web pack rule).

### 3.1 Game state

The game state holds at least: the snake's segments (head first; several
may share a cell), the heading, the queued turns (at most two), the
food's cell (none when `won`), the obstacles' cells, the level, the dots
eaten on it, the score and the state (`ready`, `running`, `paused`,
`over`, `blown`, `won`), and on a special level its turns counted, its
time, the shield layers used and whether the snake waits after a crash.
Directions are the strings `"up"`, `"down"`, `"left"` and
`"right"`.

---

## 4. Publishing

The game gets its link through GitHub Pages: a workflow builds
`dist/index.html` on every merge to `main` and publishes it to
`https://sugose.github.io/snake-demo/`. Adam switches the repository's
Pages source to "GitHub Actions" once (a repository setting).

---

## 5. Out of scope

Sound, several players, online scores. Power-ups: Adam, 2026-11-09,
"will be added later"; not specified yet.

---

## 6. Known unknowns

1. Whether swipe control feels right on Adam's phone. Settled: Adam
   played it on his phone, "tested, swipe was good" (2026-11-09, in chat;
   PBI-1.7).
