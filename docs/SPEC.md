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
**[Clead]**. Adam accepted those of 2.9 (3), 2.12 (3), (5) (the queued
turns cleared), (6) (the 21st turn), (8) (whole seconds, rounded up),
(9) and (10), and the slower levels 16 to 18 of 2.10 (2), in chat on
2026-11-09 at 23:02 and 23:04; at 23:02 he left whether the turn that
restarts the snake after a crash is free to Clead, with "restart free
(unless that gives unfair advantage to someone who didn't crash. if you
think it is unfair, then you make it not free)", and Clead made it count;
on 2026-11-10 at 03:25 Adam made it free (see below)
(2.12 (5)). The marks of 2.12 (7) and (8) on a level cleared in the tick
that reaches 30 seconds and on a level cleared with all layers used were
Clead's; Adam accepted both on 2026-11-10 at 00:47 ("2a yes", "2b yes.
the reward is that you get to continue").

Approved: Adam, 2026-11-09 23:55, in chat ("apyr"), Clead's option 1 of
23:54 after Adam found he could not start a level laid out against the
wall: in `ready`, a turn whose next cell is outside the board or on an
obstacle is ignored (2.1 (3)); recorded in the product office
(`DECISIONS.md`, PO-171).

Approved: Adam, 2026-11-09 23:59, in chat: after a shielded crash on a
special level, the page says that a shield was lost, how many remain and
what to do to go on (2.12 (10)). The wording is Clead's, sent to him at
2026-11-10 00:00; he accepted it at 00:03 ("apyr") (`DECISIONS.md`,
PO-171).
Approved: Adam, 2026-11-10 00:03, in chat: on entering a special level,
a blinking "Special Level" text over the board for 3 seconds; at 00:04
("apyr") he accepted Clead's option 1 of 00:03, that the text blinks
twice a second from when the level is laid out, goes when the level
starts if that is sooner, and takes no input (2.12 (11))
(`DECISIONS.md`, PO-171).

Approved: Adam, 2026-11-10 03:24, in chat ("when the game is over, give
the reason"): the status line of an ended game gives the reason it ended
(2.8). The wording is Clead's, sent to him at 03:24; he accepted it at
03:25 ("apyr") (`DECISIONS.md`, PO-171).

Approved: Adam, 2026-11-10 03:25, in chat ("apyr", replying to Clead's
three options of 03:23 and its wording of 03:24; Clead read it as
option 1, the turn free, said so at 03:25 and invited correction), after
he reported that he could not restart with a shield layer left: the turn
that ends a wait after a shielded crash is free, and the used layer is
the crash's cost (2.12 (5), (6)) (`DECISIONS.md`, PO-171).

Approved: Adam, 2026-11-10 08:34, in chat: an event log of the game,
with every move and event (keystrokes, obstacle jumps, points) and each
level's entry data (level, speed), detailed enough to replay the game,
behind a link that opens it over the board with a copy button (2.13);
at 08:35 he added that the link is not usable until the game is over,
which he replaced at 10:10 (below).
Everything in 2.13 beyond Adam's words of 08:34, 08:35 and 10:10 is Clead's,
marked **[Clead]**: the design sent to him at 08:34, as changed at
08:35, and the detail added in Crog's review rounds of #43
(`DECISIONS.md`, PO-171).

Approved: Adam, 2026-11-10 08:36 and 08:37, in chat ("option 1 apyr",
then "1. option 1 apyr", to Clead's option 1 of 08:26 and 08:29, after
a wait in his game of 08:26 ignored a free Left and offered "up or
down" with Down into the snake's neck): a wait after a shielded crash
is ended by a turn into a free direction and by no other, the status
line names only the free directions, and a snake with no free
direction ends the game as boxed in (2.12 (5), (10), 2.8). The details
marked **[Clead]** are Clead's (`DECISIONS.md`, PO-171).

Approved: Adam, 2026-11-10 10:10, in chat: the Log link can always be
used, in every state of the game, because a bug may stop play while the
game still counts as running ("The log link must always be clickable,
even when the game is ongoign"); and when Copy has copied the log, the
button turns green and its text changes to "✓ Copied!" (2.13 (6))
(`DECISIONS.md`, PO-171). Everything else in 2.13 (6) that this changes
is Clead's, marked **[Clead]**. Adam accepted it on 2026-11-10 at 22:39
("apyr", in chat, to Clead's recommendation of 22:38): the pause when the panel opens on a running game and the going on when
it closes, the lines `pause log` and `resume log`, the panel's text, the
buttons and the link doing nothing while it is open, the 2000 ms, the
refused copy, a copy that finishes late, and the announcement to screen
readers.

Approved: Adam, 2026-11-11, in chat; recorded in the product office
(`DECISIONS.md`, PO-171, the rows "Snake demo, a start level for
playtesting", "Snake demo, a secret slow button for playtesting", "Snake
demo, a high score list", "Snake demo, the high score list is settled",
"Snake demo, an arcade look for the high score list" and "Snake demo, the
arcade look of the high score list"):
- a start level for playtesting, `?level=N`: 00:09, "apyr", to Clead's
  recommendation of 00:09 (every new game of the page starts at level N,
  the log's first line names the start level, a game started that way
  writes no best score, the parameter is read at the page load only);
- a secret slow button, `?slow`: his request of 00:10 and "apyr" at 00:32
  to Clead's recommendation of 00:12 (the factor steps 1×, 2×, 4×, 1×; the
  time and points rules are unchanged; a small button under the board);
- a high score list in the style of an old arcade machine: 00:34, 00:35
  ("intended for browser local high scores only") and 00:38, "apyr on all
  except swap RND for LVL", to Clead's recommendation of 00:34 (a top 10 in
  the browser only, the columns RANK, SCORE, LVL (the level reached) and
  NAME, a name of 3 letters A to Z, ties ranked older first, a name entry
  after a qualifying game, a link next to Log, the best score kept as the
  top row's score with the name `---`, a log line for the name and the
  rank, no game of a playtest page enters it); the picture of an arcade
  table he sent at 00:34 is the model of the table's title and columns;
- an arcade look for that list only, 00:35, 00:39 and 00:40 ("pixely
  graphics adn fonts", "for the highscore list only. all other aspects of
  the game is same as now"), Clead's choices accepted at 00:50 ("start the
  batch, apyr"): a 5 × 7 bitmap font drawn for the project, scanlines and a
  glow, a dark panel in both colour modes, slow motion that stops under
  `prefers-reduced-motion` and never flashes more than 3 times a second.
Sections 2.14 to 2.16, and the changes to 2.1, 2.5, 2.6, 2.8, 2.9, 2.10,
2.11, 2.12 (9), 2.13, 3 and 5 that follow from them, are Clead's exact
wording of that decision. Details Adam has not settled are marked
**[Clead]**; a mark covers the sentence it opens.

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
2. A new game starts at level 1 (at the start level of 2.14 (2) on a
   page opened with `?level=N`) with the score 0 and a snake of 3
   segments, laid out as 2.11 says, in the state `ready`, with the status
   line naming that level (2.10 (3)). Nothing moves.
3. In `ready`, a turn starts the game: the snake's heading becomes that
   direction and the state becomes `running`. A turn opposite to the
   heading is ignored and the game stays `ready`, and so is a turn whose
   next cell from the head is outside the board or on an obstacle. The
   on-screen Start button starts the game in the heading it has.

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
| New game (Enter, New game button) | new game, at the start level (2.1 (2)) | new game | new game | new game, but not while the name entry of 2.15 (4) is open |
| Slow button (2.14 (5)) | steps the factor | steps the factor | steps the factor | ignored |

The queued turns are cleared by a new game. When the page is hidden (the
browser tab is left), a `running` game is paused. The log panel of 2.13 (6)
and the scores panel of 2.15 (5) can also pause a `running` game and go on.

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
not also press that button. While the log panel (2.13 (6)), the scores
panel or the name entry (2.15) is open, what the keys do is as those
sections say.

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

The status line of an ended game gives the reason it ended, then
"Enter or New game to play again". **[Clead]** The wording, by reason:

| State | Reason | Status line starts |
|---|---|---|
| `over` | the new head is outside the board | "Game over: you hit the wall." |
| `over` | the new head is on an obstacle | "Game over: you hit an obstacle." |
| `over` | the new head is on the snake's body | "Game over: you ran into yourself." |
| `over` | a shielded crash leaves no free direction (2.12 (5)) | "Game over: you are boxed in." |
| `blown` | the 21st turn (2.12 (6)) | "Blown up: no turns left." |
| `blown` | the level's time (2.12 (7)) | "Blown up: time ran out." |
| `won` | no free cell for the next dot (2.3) | "You won! The board is full." |
| `won` | the next level cannot be laid out (2.11) | "You won! There is no room for the next level." |

On a special level, a game `over` with the reason wall or obstacle adds
"No shield left." after its reason, since the shield had no layer left
(2.12 (5)). A game ended as boxed in never adds it. The whole status line is the reason, then "No shield left."
where it applies, then "Enter or New game to play again", separated by
single spaces and with no full stop at the end, for example "Game over:
you hit the wall. No shield left. Enter or New game to play again".
**[Clead]** While the name entry of 2.15 (4) is open, the last part is
"Enter your name" in place of "Enter or New game to play again", since
Enter confirms the name then and the New game button does nothing.

### 2.9 Score and best score

1. The page shows the level, the score and the best score. The score
   counts on across levels; the best score is the best such total. On a
   normal level each dot gives one point; on a special level the dots
   give none and the level gives its points when it is cleared
   (2.12 (8)).
2. When a game ends (`over`, `blown` or `won`) with a score above the
   best score, that score becomes the best score and is saved. On a playtest page
   (2.14 (4)) the best score stays as it was, shown and stored, which
   also keeps the bound of (3) true.
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
5. The best score stays as it is. The high score list of 2.15 is a
   separate list under its own key (2.15 (1)); the best score gives it
   one entry when it is above every stored one (2.15 (2)).

### 2.10 Levels

1. A game starts at level 1, or at the start level of 2.14 (2). A level
   is cleared by eating 5 dots on it.
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
(the same count as below, with no obstacles on level 1), and a start
level (2.14 (2)) whose obstacles, dot and snake of the start length do
not fit (the same count). When a level is cleared, the next one cannot be laid out if the
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
   starts with a full shield; no layer carries over from an earlier
   special level. Its time is the sum, over the ticks in which the snake
   moved (step 6 of 2.2), of the level's delay (2), whatever the tick
   really took (2.14 (6)), kept in whole milliseconds;
   so the time runs only while the snake moves, and not in `ready`, in
   `paused`, while the snake waits after a shielded crash (5), or in the
   tick of the crash itself.
4. A tick on a special level is 2.2 with these changes:
   - If the snake is waiting (5), the tick does nothing.
   - Step 1: a turn taken from the queue is counted (6). If that would
     make 21 turns on this level, the game is `blown` (6) and the tick
     ends.
   - Steps 3 and 5: a new head outside the board or on an obstacle is a
     crash, which (5) handles. A new head on the snake's own body ends
     the game (`over`), shield or not.
   - Step 7: eating a dot adds one to the dots eaten on this level but
     nothing to the score. When it clears the level, the level's points
     (8) are added to the score before the next level is laid out.
   - After step 7, if the level was not cleared and the game was not
     won: if the level's time is now 30 seconds or more, the game is
     `blown` (7); otherwise, if this tick took the time from below
     k × 3000 ms to k × 3000 ms or more, for a whole number k, the
     obstacles jump (9).
5. A crash with at least one shield layer left uses one layer. The
   snake does not move: its segments stay where they were, the heading
   stays the one of this tick (a turn taken in step 1 included), and the
   queued turns are cleared **[Clead]**. A direction is free when a
   move of the snake's head one cell that way would not crash and not
   end the game by 2.2 steps 3 to 5 (the dot's cell is free; the last
   segment's cell is free only when no other segment is on it, as 2.2
   step 5 says). The layer is used first; if then no direction is free,
   the game ends `over` with the reason boxed in (2.8), and the page
   shows the layers left after that use.
   Otherwise the game stays `running`, but the snake waits until a turn:
   while it waits, a turn in a direction that is not free is ignored;
   a turn in a free direction, the opposite of the heading included,
   becomes the heading at once (not queued), ends the wait, and is not
   counted (6), so the snake moves that way on the next tick, even with
   all 20 turns used.
   The used layer is the crash's cost: it lowers the multiplier of the
   level's points (8).
   A crash with no layer left ends the game (`over`).
6. A turn counts when a tick takes it from the queue and it becomes
   the heading (step 1). The turn that starts the level from `ready`
   (2.1 (3)), the Start button, and the turn that ends a wait after a
   shielded crash (5) are not turns. At most 20 turns are allowed; **[Clead]** the 21st turn ends
   the game as `blown` at the moment it would become the heading,
   before the snake moves. Only the state changes: the turns counted stay 20 (so
   the page shows 0 turns left), the heading stays as it was, and the
   snake, the queued turns, the obstacles, the dot, the time and the
   shield stay as they were.
7. The level must be cleared within 30 seconds of its time (3). A tick
   after which the time is 30 seconds or more and the level is not
   cleared ends the game as `blown`, with the board as that tick left it.
   **[Clead]** A level cleared by the tick that brings its time to
   30 seconds or more counts as cleared, with 0 seconds left (8).
8. When the 5th dot clears a special level, the level gives
   (T + S) × (3 − U) / 3 points, rounded to the nearest whole number,
   where T is the turns left (20 minus the turns counted), S the seconds
   left and U the shield layers used. The multiplier is 1, 2/3, 1/3 or,
   with all 3 layers used, 0; the product never ends in exactly .5, so
   the rounding has no tie.
   **[Clead]** A level cleared with all 3 layers used (the snake
   survives its third crash, (5)) gives 0 points, as the formula says.
   **[Clead]** The seconds left are counted in whole seconds, rounded
   up: 30 minus the time in seconds, rounded up to a whole number (a
   second that has begun counts as left). The page's countdown shows the
   same number.
9. The obstacles jump: all of them at once. They are lifted off the
   board, so their old cells may be picked again, and each is picked
   anew at random, one at a time, by the chooser of 2.3 from the board's
   cells listed row by row (as in 2.3), leaving out the snake's cells,
   the dot's cell, the cells of the obstacles already picked in this
   jump, and the 2 cells straight ahead of the head in its heading that
   lie on the board. If there are fewer such cells than obstacles, the
   obstacles stay where they are and the chooser is asked nothing (in a game
   from level 1 this cannot happen on the 20 × 20 board: on level 65,
   the last special level that can be laid out, the snake of at most 327
   segments, the dot, 2 cells and 64 obstacles take at most 394 cells;
   from a start level (2.14 (2)) it can happen, and the case is tested). **[Clead]** The obstacles
   follow the level's time (3): they first jump 3 seconds into it, and
   do not jump while the snake waits after a crash.
10. **[Clead]** What the page shows on a special level: next to the
    level, the score and the best score, three more values: the turns
    left, the seconds left (8) and the shield layers left. They are
    hidden on a normal level. The status line in `ready` says it is a
    special level and names its limits ("Level 5, special: 20 turns,
    30 seconds, shield of 3. …"); when the game is `blown` it gives the
    reason (2.8). In `running`, while the snake waits after a crash (5),
    the status line says
    that a shield layer was lost, how many are left, and which turns go
    on: the free directions of (5), and no others.
    **[Clead]** The wording: "Shield lost, N left. Turn D to go on.",
    where N is the number of layers left as a numeral (2 or 1 with a
    shield of 3), and with no layer left "Shield lost, none left. Turn D
    to go on. The next crash ends the game."; D names the free
    directions in the order up, down, left, right: one alone ("up"), two
    joined by "or" ("up or left"), three as "up, down or left".
    The obstacles look the same as on a normal level.
11. When a special level is laid out and waits in `ready`, the text
    "Special Level" blinks over the board, twice a second: **[Clead]**
    shown first for 250 ms, then hidden for 250 ms, and so on. It goes
    when 3 seconds of real time have passed since the level was laid out
    (the page's clock, which runs on while the page is hidden; not the
    level's time of 2.12 (3), which does not run in `ready`), or as soon as the level starts (a turn or the
    Start button, 2.1 (3)), or with a new game, whichever comes first.
    It takes no input: keys, swipes and buttons work as they do without
    it. **[Clead]** The look: large bold text centred on the board, in
    the head's colour.


### 2.13 Event log

1. **[Clead]** The page keeps an event log of the current game: from the
   moment the game is made (page load, or the New game command of 2.5,
   Enter or the New game button, in any state) until the next one is
   made. It stays readable after the game ends. It is kept in the
   page's memory only and is not saved; a reload clears it.
2. The log is plain text, one event per line. **[Clead]** Every line but
   the first starts with `[t=T #K] `, where T is the time since the game
   was made in whole milliseconds of the page's clock, and K the number
   of ticks of the tick timer so far in this game while it was
   `running`, ticks of a waiting snake (2.12 (5)) included. K counts the
   tick being run when the line is written; a line written outside a
   tick (an input, pause, the page hidden) has the K of the last tick.
3. **[Clead]** The first line names the build (the commit it was built
   from, or `dev` for a local build) and the named values of section 3
   the game uses, so a log from any build can be read. **[Clead]** On a
   playtest page (2.14) it ends with the options, `playtest
   start-level=5 slow`, `playtest start-level=5` or `playtest slow`.
4. **[Clead]** The inputs that make a line: every key that maps to a
   command of 2.6, held repeats included; every swipe that maps to a
   turn (2.7); every press of the Start, Pause or Resume, New game and Slow
   (2.14 (5)) buttons. Keys with no command, keys held with Ctrl, Meta or Alt, swipes
   that map to nothing, and any input while the panel of (6), the scores panel
   or the name entry of 2.15 is open make no line; opening and closing
   the panels make a line only as (6) and 2.15 (5) say. The New game command's line is the first stamped line
   of the new game's log, at `[t=0 #0]`, before its level's line; the
   page load makes no input line. An input line says whether the input was used or
   ignored, and if ignored, why, with one of these reasons:
   `same direction` (the heading, or the last queued turn), `straight
   back` (the opposite of either), `queue full` (2.4), `into a wall` or
   `onto an obstacle` (in `ready`, 2.1 (3)), `not free` (a direction
   that is not free while the snake waits, 2.12 (5)), `repeat` (a held
   Space, P or Enter, 2.6), and `state` (a command the state ignores,
   2.5). When two apply, the first that applies wins: `state`, then
   `repeat`; in `ready`, `straight back` before `into a wall` and
   `onto an obstacle`; while the snake waits, only `not free`; otherwise
   `same direction`, then `straight back`, then `queue full`.
5. **[Clead]** The kinds of line, after the stamp of (2), with cells
   written `(x,y)`, directions as `up`, `down`, `left`, `right`, and
   lists of cells joined by `,`:

| Event | Line |
|---|---|
| a level laid out (2.11) | `level 5 special delay=55 start=(3,4) up obstacles=(1,2),(7,9),(0,0),(4,4) dot=(5,5) turns=20 seconds=30 shield=3`; on a normal level `level 4 normal delay=110 start=… obstacles=… dot=…`, without the last three |
| an input | `key ArrowUp up used`, `key a left ignored straight back`, `swipe right used`, `button Start used`, `key p pause used` |
| a turn becoming the heading | `turn up counted 5/20` on a special level, `turn up` on a normal one, `turn left free` when it ends a wait, `turn up start` for the turn that starts a level from `ready` |
| a stretch of moves | `move right 7 head=(10,4)`: the heading, the number of cells, and the head's cell at the end; a line is written when the stretch ends (a turn, a dot, a crash, a level cleared, a pause or the end of the game) and has at least one move |
| a dot eaten | `dot +1 score=12`; on a special level `dot +0 score=20` |
| a new dot | `dot at (5,9)` |
| a shielded crash | `crash wall shield=2 free=up,left` |
| an obstacle jump | `jump obstacles=(1,2),(7,9),(0,0),(4,4)` |
| a level cleared | `cleared level 5 points=11 turns-left=5 seconds-left=12 shield-used=1 score=31`; on a normal level `cleared level 4 score=20` |
| pause, resume | `pause`, `resume`; made by the log panel (6): `pause log`, `resume log`; made by the scores panel (2.15 (5)): `pause scores`, `resume scores` |
| a slow step (2.14 (5)) | `slow x2`, `slow x4`, `slow x1`, after the input line `button Slow used`; a press the state ignores is `button Slow ignored state` |
| a name entered (2.15 (4)) | `scores name=ABC rank=3`; when the entry is skipped `scores skipped` |
| the page hidden or shown | `hidden`, `shown` |
| the end of the game | `end over boxed score=43 best=yes`; `best=no` when the score did not become the best score |

   The words used: commands `up`, `down`, `left`, `right`, `pause`,
   `new`; buttons `Start`, `Pause`, `Resume`, `New game`, as labelled
   when pressed, and `Slow`; end states `over`, `blown`, `won`; end reasons `wall`,
   `obstacle`, `self`, `boxed`, `turns`, `time`, `full`, `noroom`, one
   for each row of 2.8; an empty list of cells is written `-`.

   Every random outcome (the start, the obstacles, each dot and each
   jump) has a line, and every cell the head visited follows from the
   start and the move lines.
6. A "Log" link below the board opens the log in a panel over the board,
   with a Copy button and a Close button. The link can be used in every
   state of the game (`ready`, `running`, `paused`, `over`, `blown` and
   `won`), so a log can be had when a bug stops play while the game
   still counts as running. **[Clead]** The one exception is the name
   entry of 2.15 (4): it is shown only after the game has ended and can
   always be skipped, so while it is open the Log link does nothing.
   **[Clead]** The panel's text is the log as
   it is when the panel has opened, the pause of its opening (below)
   included; Copy puts that text on the clipboard. **[Clead]** The
   link's place and look, the Close button, and that, if the browser
   refuses Copy, the log's text is selected so it can be copied by hand.
   While the panel is open, game keys, swipes and the Start, Pause and
   Resume buttons do nothing, and so do the Log link and the Scores link
   of 2.15 (5), since only one panel is open at a time; Escape or Close
   closes it, and the New game command (Enter or the button) closes it
   and makes a new game.
   - **[Clead]** Opening the panel on a `running` game pauses it, as the
     Pause command does (2.5), so that a snake that cannot be steered
     does not crash under the panel. Closing the panel with Close or
     Escape goes on, as Pause does from `paused`, but only if opening it
     paused the game, so the snake moves at once. In `ready`, `paused`
     and the ended states the panel changes nothing, on opening or on
     closing, and the New game command makes a new game without going
     on. The pause and the going on are written `pause log` and
     `resume log`; opening and closing make no other line. Lines the
     game makes while the panel is open (the page hidden or shown) are
     in the log, and in the panel the next time it is opened. A page
     shown again does not go on a game the panel paused (2.5).
   - When Copy has copied the log, the button turns green and its text
     reads "✓ Copied!". **[Clead]** The green keeps the text readable in
     light and dark mode. The button goes back to its plain look and the
     text "Copy" after 2000 ms (a named value, section 3), and at once
     when the panel closes or opens again. Pressing Copy again while it
     shows copies again and starts the 2000 ms over. The browser refuses
     the copy when it has no clipboard API, or the call throws or is
     rejected; then the button does not change, a "✓ Copied!" still
     showing goes at once, and the text is selected as above. A copy that
     finishes after the panel has closed or opened again has no effect:
     no green, no announcement. The change is also announced to screen
     readers: the panel holds a polite live region that reads "Copied"
     when a copy has succeeded; it is emptied when the button goes back
     and when a copy starts, so that a repeated copy is announced again.

### 2.14 Playtest options

The page reads its address once, when it loads; a later change of the
address does nothing. Two options of the query string are for playtesting.
Without them the page is as every other section says.

1. **[Clead]** The query string is read as `URLSearchParams` reads it. A
   name given twice takes its first value, and names other than `level`
   and `slow` are ignored.
2. `level=N` is the start level. **[Clead]** N is valid when it is
   written with the characters 0 to 9 only, with no leading zero, and is
   from 1 to 99 (a named value, section 3); `level=1` is valid. A valid N
   makes every new game on this page, the one made at the page load and
   each made by the New game command, start at level N instead of level 1:
   the level is laid out as 2.11 says, with the delay of level N (2.10 (2),
   2.12 (2)), N − 1 obstacles, and on a special level its shield, turns
   and seconds (2.12 (3)); the snake has the start length of 3 (2.1 (2)),
   the score is 0, and the status line names level N (2.10 (3)). Clearing
   a level goes on to the next as usual. **[Clead]** The start level
   holds for every new game of the page, so that a special level can be
   played again and again. A missing or invalid value is ignored: the game
   starts at level 1 and the page is not a playtest page for this option.
3. `slow` is on when it is in the query string with any value or none
   (`?slow`, `?slow=1`). **[Clead]** Any value counts, because `?slow`
   with no value is the use.
4. A page with a valid `level` or with `slow` is a playtest page. On it,
   no game changes the best score (2.9 (2)) and none enters the high
   score list (2.15 (3)); both keep showing what they hold. The end line
   of the log says `best=no`. **[Clead]** The page shows no sign of a
   playtest page apart from the Slow button of (5); the first line of
   every log names the options (2.13 (3)).
5. The Slow button. When `slow` is on, a button sits under the board, at
   its right edge. **[Clead]** It has no visible text and is 24 × 24 CSS
   pixels. Its fill differs from the page's background by a contrast ratio
   of 1.5:1 to 2:1, in light and in dark mode, so that it is hard to
   notice, and when it has the focus it shows an outline 2 pixels wide
   with a contrast of at least 3:1 against the page's background. Its
   accessible name is "Slow down", so that screen readers and tests can
   find it. It is shown, and in the tab order, only while the current
   level is a special level; on a normal level it is hidden. Each press
   steps the factor 1× → 2× → 4× → 1×, in `ready`, `running` and `paused`;
   in `over`, `blown` and `won` a press is ignored. While the log panel,
   the scores panel or the name entry is open the button does nothing and
   makes no line. The factor is 1× when a level is laid out and when a new
   game is made, so a special level always starts at its normal speed and
   the factor does not carry from one level to the next.
6. The factor multiplies the delay of the tick timer on the level. The
   timer schedules each tick when the one before it has run, and when the
   game starts or goes on from `paused`, with the delay (the level's
   delay × the factor) of that moment. A tick that is already waiting
   keeps its delay: a press changes the delay of the ticks scheduled
   after it (from 1× to 2× on a level of 55 ms, the waiting tick comes
   after 55 ms and the next one after 110 ms). The rules of a tick, and
   the game's time of 2.12 (3), are not changed: each tick in which the
   snake moves adds the level's delay of 2.12 (2) to the time, whatever
   the factor. So a game played slowed has the same budget of moves,
   seconds and turns, the obstacles jump after the same number of moves
   (2.12 (9)), the points are given by the same formula (2.12 (8)), and
   the seconds left run down slower than the clock on the wall. Things in
   real time, the "Special Level" text (2.12 (11)) and the `t=` stamps of
   the log (2.13 (2)), do not change.

### 2.15 High score list

1. The page keeps a list of up to 10 entries in the browser's local
   storage, for this browser only. An entry has a score (a whole number
   from 1 to the bound of 2.9 (3)), the level reached (a whole number from
   1 to the number of cells divided by the dots per level, plus 1: 81,
   which `main.ts` works out from the named values as it does the score
   bound) and a name of 3 letters, each from A to Z. The list is in
   order of score, highest first; entries with the same score are in
   the order they were made, the older first. It is kept under the key
   `snake-demo.scores` as text: the entries in that order, each written
   `SCORE:LEVEL:NAME` with the digits 0 to 9 and no leading zero, joined
   by `,`, for example `43:7:ABC,40:6:XYZ`. **[Clead]** The entry made
   from the best score (2) has the level 0 and the name `---`, and no
   other entry has either; the page shows them as `--` and `---`. A
   missing value, or a value that is not exactly of that form (an entry
   that is not valid, more than 10 entries, or scores that rise along the
   list), reads as an empty list, the whole value and not an entry at a
   time.
2. **[Clead]** When the best score of 2.9 is above the score of every
   stored entry (above 0 when none is stored), the list as read has one
   more entry, ahead of the stored ones, with that score, the level 0
   and the name `---`. It is not stored when the list is read. The list as
   shown, and as (3) uses it, is the top 10 of the stored entries and that
   one: with 10 stored the lowest of them is not shown.
3. A game qualifies when it ends (`over`, `blown` or `won`) on a page
   that is not a playtest page (2.14 (4)) with a score of at least 1,
   and the list as shown, read before the game's score is applied to the
   best score (2.9 (2)), has fewer than 10 entries or the score is above
   that of the 10th. **[Clead]** The least score that qualifies is 1.
   Making an entry (4) puts the new entry after every entry of that list
   with a score at least as high, so it is older-first against the entry
   of (2) as against a stored one; the list is then cut to 10 entries, the
   entry of (2) is stored if it was in the list, and the result is stored.
   The rank of the entry is its place in that list. Example: the best
   score is 43, nothing is stored, and a game ends with 43: the list is
   the entry of (2), the new entry is ranked 2, and the stored list is
   `43:0:---,43:7:ABC` (the game having reached level 7).
   Example: nothing is stored, the best score is 0, a game ends with 43:
   the rank is 1, and the best score becomes 43; the stored list is
   `43:7:ABC`, and the next time the list is read the best score is not
   above it, so no entry of (2) is made.
4. When a game qualifies, a panel over the board offers a name entry. It
   has the title ENTER YOUR NAME, then SCORE with the game's score, LVL
   with the level it reached, RANK with the rank written as in (5), then 3
   slots, each showing a letter from A to Z and starting at A, one of them
   selected, the first at the start, then an OK button and a Skip button.
   ArrowUp changes the selected letter to the next in the alphabet (after
   Z comes A) and ArrowDown to the one before (before A comes Z);
   ArrowLeft and ArrowRight move the selection (not past the first or the
   last slot). Each slot is a button with the accessible name "Letter 1",
   "Letter 2" and "Letter 3"; pressing it selects it. **[Clead]** Each
   slot also has an Up and a Down button, named "Letter 1 up", "Letter 1
   down" and so on, which select their slot and then do what ArrowUp or
   ArrowDown does, so that a phone can do all of it. OK confirms, Skip
   skips. Confirming stores the entry as (3) says, writes the line
   `scores name=ABC rank=3` (2.13 (5)) and turns the panel into the
   table of (5), with the new entry marked. Skipping stores nothing, writes
   `scores skipped` and closes the panel. **[Clead]** Keys in the entry:
   Enter confirms and Escape skips, but with the focus on a button of the
   panel Enter and Space press that button instead (as the decision of
   2026-11-10 on keys on a focused button says, `DECISIONS.md`, PO-171);
   a repeat of Enter or Escape does nothing, a repeat of an arrow key acts
   as a new press, and a key that was already down when the entry opened
   does nothing, its repeats included, until it is released. While the
   entry is open, game keys, swipes, the Start, Pause and Resume buttons,
   the New game button, the Log link and the Scores link do nothing, and
   Enter confirms instead of making a new game (2.6); the status line says
   so (2.8). **[Clead]** The entry can be skipped, so that nobody is held
   up by it. **[Clead]** The panel is a dialog: the focus goes to the
   first slot when it opens, Tab and Shift+Tab stay inside it, and the
   focus goes back to the New game button when it closes.
5. A "Scores" link below the board, next to the Log link, opens the
   table in a panel over the board with a Close button. **[Clead]** It
   can be used in every state, as the Log link can (2.13 (6)), and the
   panel works as the log panel does: opening it on a `running` game
   pauses it, closing it with Close or Escape goes on if opening paused
   the game (the lines `pause scores` and `resume scores`); while it is
   open, game keys, swipes, the Start, Pause and Resume buttons and both
   links do nothing, and the New game command closes it and makes a new
   game. The panel has the title TOP 10 SCORES, the headings RANK, SCORE,
   LVL and NAME, and a row for each entry of the list as shown, read when
   the panel opens: its rank written 1ST, 2ND, 3RD, 4TH and so on to
   10TH, its score, its level (`--` for the entry of (2)) and its name.
   **[Clead]** The title and the ordinals follow Adam's picture of 00:34.
   **[Clead]** With no entries the panel says NO SCORES YET instead of the
   rows. After a name is entered, the panel is this table with the new
   entry's row marked: the row has `aria-current="true"` and a triangle
   drawn before its rank (2.16 (1)), so that the mark is not only a
   colour; closing the panel leaves the ended game as it was. **[Clead]**
   The focus goes to Close when the table opens and back to the Scores
   link, or after an entry to the New game button, when it closes. The
   focus of the log panel is as it is.
6. When the list is read: when a game ends (for the qualification), when
   the entry opens, when it is confirmed (before the write, so that the
   entries another tab stored in the meantime are kept; the rank of the
   line and the table is the one found then) and when the Scores panel
   opens. A read that fails reads as an empty list (1). **[Clead]** After
   a failed write the page keeps its list in memory and uses that list for
   the rest of the page's life, with no further read (as 2.9 (4) says the
   best score lasts only until the page is closed).

### 2.16 Arcade look of the scores panel

This look is for the panel of 2.15 (4) and (5), the name entry and the
table, and for nothing else; the rest of the page keeps the plain look of
section 3.

1. The letters are pixels. **[Clead]** The panel's letters are drawn from
   a bitmap font of 5 × 7 pixels for A to Z, 0 to 9, the hyphen and the
   space, with four shapes: an arrow up, an arrow down, a triangle that
   marks a row and a block that is the cursor of the selected slot. The
   patterns are written in the project's own code, drawn for this
   project; no font, image or other third-party material is used. Every
   text of the panels (the titles, the headings, the words SCORE, LVL and
   RANK, the ranks, scores, levels and names, the labels of the buttons
   and the line NO SCORES YET) is drawn as squares, one per pixel, at a
   whole-number scale of 1, 2 or 3 (a named value, section 3), the largest
   at which the widest of the entry and the table is no wider than the
   board; no pixel is blurred. The drawn pixels are hidden from screen
   readers. Each drawn text sits in an element that holds the same text
   in plain capital letters, visually hidden so that the text does not
   show twice, for screen readers and tests: the table is a real table
   whose cells hold the texts of 2.15 (5), and the buttons are real
   buttons whose accessible names are the words of 2.15 (4) and (5) in
   the case written there ("Skip", "OK", "Close", "Letter 1 up"); the
   drawn label is the same word in capitals.
2. **[Clead]** The colours. The panel is dark in light and in dark mode
   alike: the background is `#0a0a18`, the title `#5fe3ff`, the headings
   `#ffb000`, the rows `#f2f2f2`, the marked row `#ff85dc`, and the
   selected slot and the focused button have a frame of `#5fe3ff`. Each
   of the four text colours has a contrast ratio of at least 7:1 against
   the background (13.0, 10.7, 17.5 and 9.0) and against the band of (4) at
   its lightest, which is the background mixed with 6 % white, `#191926`
   (11.5, 9.5, 15.5 and 8.0).
3. **[Clead]** Scanlines and glow. A layer over the panel that takes no
   input draws a dark line of 1 pixel every 3 pixels, at 25 % opacity,
   and each drawn text has a glow of its own colour with a blur of 4
   pixels.
4. **[Clead]** The picture is a little out of sync. Two movements, in CSS
   only (no script timer): a band of the background 40 pixels high, the
   background mixed with 6 % white, rolls down the panel once in 8000 ms
   and starts again at the top; and the whole picture shifts sideways by
   2 pixels for 120 ms at 900 ms, 3300 ms and 5600 ms of a cycle of
   7000 ms, as if the sync had slipped. They move `transform` and the
   background position only, and run only while the panel is shown. Nothing
   in the panel flashes: the one thing that blinks is the cursor of the
   selected slot, with a period of 500 ms, shown for 250 ms and hidden for
   250 ms (twice a second, under the 3 flashes a second of WCAG 2.3.1).
   The panel can be closed at any time (Close, Escape, or Skip), which
   stops all of it, and (5) turns it off; Adam has accepted no more
   control than that.
5. **[Clead]** With `prefers-reduced-motion: reduce` nothing moves: no
   band, no shift, and the cursor does not blink but stays on; the
   colours, the scanlines and the glow remain.
6. The values (the scales, the size of the band, the periods, the shift,
   the cursor's period, the scanlines, the glow and the 6 %) are named
   values (section 3), which `main.ts` hands to the CSS as custom
   properties. What the look looks like is Adam's to judge by playing; the
   tests of the panel check what can be measured: the texts, the colours
   and their contrast, the animation names and periods in the styles the
   browser computes, none of them under reduced motion, and, in Jest, the
   bitmap font (every glyph 5 × 7, every character of the panels present
   and different from the others) and the drawing of a text into pixels.

---

## 3. Architecture

- `src/config.ts`: the named values: grid size 20, start length 3,
  shortest swipe 30, the storage key, dots per level 5, the first delay
  125 ms, the delay step 5 ms, the shortest delay 50 ms, the 8 clear
  cells ahead of a start, and the special levels' values of 2.12: every
  5th level, 3 shield layers, 20 turns, 30 seconds, a jump every
  3 seconds and 2 cells kept free ahead of the head; and the "Special
  Level" text's blink of 250 ms and its 3000 ms (2.12 (11)); and the
  2000 ms the Copy button of the log panel shows "✓ Copied!" (2.13 (6));
  the playtest options' highest start level 99 and their slow factors
  1, 2 and 4 (2.14); the list's 10 entries, name of 3 letters and storage
  key `snake-demo.scores` (2.15); and the arcade look's pixel scales 1, 2
  and 3, band of 40 pixels, roll of 8000 ms, shift of 2 pixels for 120 ms
  in a cycle of 7000 ms at 900, 3300 and 5600 ms, and cursor period of
  500 ms, the scanlines, the glow and the 6 % of the band, and the
  Slow button's 24 pixels (2.16, 2.14 (5)); `main.ts` hands the look's
  values to the CSS as custom properties. The best score's
  bound of 2.9 (3) is not a value of its own: `main.ts` works it out
  from these, as (20 × 20 / 5) × the larger of 5 and 20 + 30. No other
  module writes these numbers
  (product-office Process P-11 § 5 (2)): `game.ts`, `input.ts`,
  `storage.ts`, `query.ts`, `scores.ts` and `pixel.ts` take the values
  they need as parameters, and `main.ts`
  passes them from here.
- `src/game.ts`: the game rules as pure functions over a game state (no
  DOM, no timers): a new game, a turn, a tick, pause, the commands of
  2.5, levels and laying out a level (2.10, 2.11), special levels
  (2.12), the free directions of a waiting snake (2.12 (5)), exported,
  which `turn`, the boxed-in check and `src/status.ts` use, and the
  delay of a level. It reports what each step did for the event log
  (2.13): why a turn is ignored (`ignoredBecause`), what the last
  shielded crash hit, and what the last cleared level gave. The choosers of 2.3 and 2.11 are passed in, so tests are
  deterministic. Covered by Jest.
- `src/input.ts`: maps a key name (`KeyboardEvent.key`) to a command, and
  a swipe's start and end points to a turn or nothing (2.6, 2.7). Pure,
  covered by Jest.
- `src/storage.ts`: reads and writes the best score (2.9) through a
  function passed in that returns the store and may throw. Covered by
  Jest with fake stores, also ones that throw.
- `src/query.ts`: reads the query string (2.14): the start level, whether
  `slow` is on, and whether the page is a playtest page. Pure, covered by
  Jest: every valid and invalid form of `level`, `slow` in every form, a
  name given twice and other names.
- `src/scores.ts`: the high score list (2.15) as pure functions: reading
  and writing its text through a function passed in that returns the store
  and may throw, the entry made from the best score, whether a game
  qualifies, its rank and the list after an entry. Covered by Jest with
  fake stores, also ones that throw, and every malformed text of (1).
- `src/pixel.ts`: the 5 × 7 bitmap font and the drawing of a text into
  pixels (2.16 (1)). Pure, covered by Jest.
- `src/status.ts`: the status line of an ended game (2.8) and of a
  snake waiting after a shielded crash (2.12 (10)), as pure functions of
  the game state (no DOM). Pure, covered by Jest: every line of 2.8
  whole, on a normal and on a special level, and the waiting line for
  one, two and three free directions and for no layer left. It takes
  the free directions from `src/game.ts` and does not work them out
  itself.
- `src/log.ts`: the event log of 2.13 as pure functions: the first
  line, and the lines of one step of the game, given the state before
  it, the input or tick, the state after it, what `src/game.ts`
  reported about the step, the time and the tick count; it keeps its
  own small state (the open stretch of moves) and works out no game
  rule itself. Pure, covered by Jest: every kind of line of 2.13 (5)
  whole.
- `src/main.ts`: draws the board, the obstacles and the level on a
  canvas, shows a special level's turns, seconds and shield (2.12 (10)),
  shows the "Special Level" text (2.12 (11)), shows the status line
  (the ended game's from `src/status.ts`), keeps the event log and
  shows its panel and the Copy feedback (2.13), runs the tick timer with the delay of the current level
  times the factor of the Slow button (2.14), shows the name entry, the Scores link and the table
  (2.15, 2.16), and
  wires keys, swipes, buttons, page visibility and storage. Covered by the
  Playwright tests (web pack rule).
- Look: an original, plain look, readable in light and dark mode, sized
  for a 375 px wide phone first, with no sideways scrolling. The scores
  panel and the name entry have the arcade look of 2.16, and nothing
  else does.
- The build is one self-contained `dist/index.html` (web pack rule).

### 3.1 Game state

The game state holds at least: the snake's segments (head first; several
may share a cell), the heading, the queued turns (at most two), the
food's cell (none when `won`), the obstacles' cells, the level, the dots
eaten on it, the score and the state (`ready`, `running`, `paused`,
`over`, `blown`, `won`) with the reason an ended game ended (2.8), and on a special level its turns counted, its
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

Sound, several players, online scores (the high score list of 2.15 is
kept in the browser only; a server for a global list is PBI-2.30, later).
Power-ups: Adam, 2026-11-09,
"will be added later"; not specified yet.

---

## 6. Known unknowns

1. Whether swipe control feels right on Adam's phone. Settled: Adam
   played it on his phone, "tested, swipe was good" (2026-11-09, in chat;
   PBI-1.7).
