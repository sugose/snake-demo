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
  except swap RND for LVL", to Clead's choices of 00:34 (a top 10 in the browser only, the columns RANK,
  SCORE, LVL (the level reached) and NAME, a name of 3 letters A to Z,
  ties ranked older first, a name entry after a qualifying game, a link
  next to Log that opens the table, the best score kept as the top row's
  score with the name `---`, no game of a playtest page enters it); he
  sent a picture of an arcade table at 00:34 as the model;
- an arcade look for that list only, 00:35, 00:39 and 00:40 ("pixely
  graphics adn fonts", "for the highscore list only. all other aspects of
  the game is same as now"), Clead's choices accepted at 00:50 ("start the
  batch, apyr"): a 5 × 7 bitmap font drawn for the project, scanlines and a
  glow, a dark panel in both colour modes, slow motion that stops under
  `prefers-reduced-motion` and never flashes more than 3 times a second.
Sections 2.14 to 2.16, and the changes to 2.1, 2.5, 2.6, 2.8, 2.9, 2.10,
2.11, 2.12 (9), 2.13, 3 and 5 that follow from them, are Clead's exact
wording of that decision. Details Adam has not settled are marked
**[Clead]**. In 2.14 to 2.16 a mark at the start of a numbered item or of a
bullet covers all of it, and a mark in the middle covers the sentence it
opens; what has no mark is in Adam's words above. The encodings that
carry them are Clead's technical detail, as in the first Approved
paragraph, and Adam has not seen them: the text format and bounds of the
stored list (2.15 (1)), the storage key names, and the
sizes, colours and periods of 2.14 (5) and 2.16.

Approved: Adam, 2026-11-10 23:57, in chat ("apyr"), to Clead's
recommendation of 23:56, after his request of 23:56 for a checksum in the
event log "to prevent tampering" (`DECISIONS.md`, PO-171, the row "Snake
demo, the event log carries a checksum"): the log ends with a line
`sha256 <64 hex digits>`, the SHA-256 of the log text up to its last line,
in the panel and in what Copy copies; `npm run verify-log` checks a pasted
log; it makes accidental and casual changes visible and does not prevent
tampering, because the game runs in the browser. 2.13 (7), and the changes
to 2.13 (2), (5), (6) and section 3 that follow from it, are Clead's exact
wording of that decision. Details Adam has not settled are marked
**[Clead]**; a mark at the start of an item or a bullet covers all of it,
and a mark in the middle covers the sentence it opens.

Approved: Adam, 2026-11-10 23:41, in chat ("apyr"), to Clead's
recommendation (`DECISIONS.md`, PO-171, the row "Snake demo keys on a
focused button"), and 2026-11-11 00:41 and 00:50 (the batch, "start the
batch, apyr"): a key pressed on a focused button does that button's job
(Space or Enter on Log opens it, on Close closes it, on Copy copies), and
only Enter with the focus on the board or on nothing starts a new game.
The changes to 2.5, 2.6, 2.13 (4) and (6) and 2.14 (5) that follow from
it are Clead's exact wording of that decision. Details Adam has not
settled are marked **[Clead]**; a mark at the start of an item or a bullet
covers all of it, and a mark in the middle covers the sentence it opens.

Approved: Adam, 2026-11-10 23:04, in chat ("apyr"), to Clead's
recommendation of 23:00, and 2026-11-11 00:41 (the version line goes last
in the batch) and 00:50 ("start the batch, apyr") (`DECISIONS.md`, PO-171,
the rows "Snake demo gets a version line" and the batch order of 00:41):
the page shows a small "v0.2.0 · abc1234" under the board, the version
from `package.json` and the build's commit; the event log's first line
names the version too; the version is set to `0.2.0` once Adam has played
the levels, and Adam tags `v0.2.0`. 2.17, and the changes to 2.13 (3) and
section 3 that follow from it, are Clead's exact wording of that decision.
Details Adam has not settled are marked **[Clead]**; a mark at the start
of an item or a bullet covers all of it, and a mark in the middle covers
the sentence it opens.

Approved: Adam, 2026-11-11 12:08, in chat, his request: "i want to
maintain a per level highscore  Fewest turns: 12 turns (25s) and Fastest:
18s (14 turns). this is browser local only. also, during a level it
should be visible #turns made and for how long time it has been going
on"; and 12:12, "1. apyr 2. both the table is brought up when clicking a
link, it is not visible during game play", to Clead's recommendations of
12:09 (the time is the game's time, the sum of the level's delay over the
moves, as the special levels count it; the records show as a line on the
page for the current level and in a table of all levels) (`DECISIONS.md`,
PO-171, the row "Snake demo, per-level records and live turns and time"). 2.18, and the changes
to 2.4, 2.5, 2.6, 2.10, 2.12, 2.13, 2.14, 2.15, 3, 3.1 and 5 that follow from
it, are Clead's exact wording of that decision. Details Adam has not
settled are marked **[Clead]**; a mark at the start of an item or a
bullet covers all of it, and a mark in the middle covers the sentence it
opens. The encodings Adam has not seen are Clead's technical detail: the
text format and bounds of the stored records (2.18 (5)) and the storage
key name.

Approved: Adam, 2026-11-11 12:25 and 12:26, in chat, his request: "i want
a a link with version history. the version history page is brought
automaticaly when loading the app for the first time after a versio
upgrade to show what is new", with the correction "app" for "page"; and
12:28, "1a, 2 apyr, 3 apyr", to Clead's recommendations of 12:27: the
text is a player-facing list written for the app, one entry for each
version in plain words, bundled when the page is built, not
`CHANGELOG.md`; after an upgrade only the versions newer than the last one
this browser saw open, with a button to the full history; on a first visit
with no stored version nothing opens (`DECISIONS.md`, PO-171, the row
"Snake demo, a version history"). 2.19, and the changes to 2.5, 2.6, 2.13,
2.14, 2.15, 2.18 and 3 that follow from it, are Clead's exact wording of
that decision. Details Adam has not settled are marked **[Clead]**; a mark
at the start of an item or a bullet covers all of it, and a mark in the
middle covers the sentence it opens. The storage key name and the rules
for what counts as newer (SemVer 2.0.0 precedence) are Clead's technical
detail.

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
5. Turns are counted on every level (2.18 (1)), and a snake waiting after
   a shielded crash takes its turn as 2.12 (5) says.

### 2.5 States and commands

| Command | `ready` | `running` | `paused` | `over`, `blown` or `won` |
|---|---|---|---|---|
| Turn (key or swipe) | 2.1 (3) | 2.4 | ignored | ignored |
| Start button | starts in the heading it has | ignored | ignored | ignored |
| Pause (Space with the focus on no button, P, Pause button) | ignored | `paused` | `running` | ignored |
| New game (Enter with the focus on no button, New game button) | new game, at the start level (2.1 (2)) | new game | new game | new game, but not while the name entry of 2.15 (4) is open |
| Slow button (2.14 (5)) | steps the factor | steps the factor | steps the factor | ignored |

**[Clead]** Five panels change the New game row in every column. While
the name entry of 2.15 (4) is open the command does nothing. While the
scores panel of 2.15 (5), the records panel of 2.18 (7) or the history
panel of 2.19 is open, which each can be in `ready`, `paused` and the
ended states (each pauses a `running` game when opened from its link),
only the New game button gives a new game, and Enter on the focused Close
closes the panel (with the focus on the table of the records panel or the
text of the history panel, Enter does nothing, 2.18 (7), 2.19 (4)). While the log panel
(2.13 (6)) is open, the button, or Enter with the focus on nothing,
closes it and gives a new game; Enter with the focus on Close or Copy
presses that button. Enter and Space with a button focused do that
button's job (2.6) and are the New game and Pause commands only with the
focus on no button. When the New game command closes the log panel, the
scores panel, the records panel or the history panel, the focus goes to
the New game button.

The queued turns are cleared by a new game. When the page is hidden (the
browser tab is left), a `running` game is paused. The log panel of 2.13 (6),
the scores panel of 2.15 (5), the records panel of 2.18 (7) and the
history panel of 2.19 can also pause a `running` game and go on.

### 2.6 Keys

Arrow keys and W, A, S, D (either case) turn up, left, down and right.
Space and P (either case) pause and go on; Enter starts a new game (Enter
and Space are different when a button has the focus, below). Other keys do
nothing. The page stops the arrow keys and Space from scrolling
it while the game has the focus (not with the focus on the table of the
records panel or the text of the history panel, 2.18 (7), 2.19 (4)).

A key pressed together with Ctrl, Meta (Cmd) or Alt does nothing, so the
browser's shortcuts are not taken as turns; Shift does not matter. When a
key is held down, its repeats still turn the snake but do not pause, go
on or start a new game again. Keys act on the game even while a button
has the focus, and a key that does something in the game does not also
press that button, with the exception of Enter and Space below. While the
log panel (2.13 (6)), the scores panel or the name entry (2.15), the
records panel (2.18 (7)) or the history panel (2.19) is open, what the
keys do is as those sections say.

A key pressed on a focused button does that button's job (Space or Enter
on Log opens it, on Close closes it, on Copy copies), and only Enter with
the focus on the board or on nothing starts a new game.
- **[Clead]** "The focus on no button" is what the Pause and New game
  commands need: the focus is on no button when it is on the page itself,
  the board, or any element that is not a button. The buttons are Start,
  Pause (Resume), New game and Slow, the Log, Scores, Records and Version
  history links, Copy and Close of the log panel, Close of the scores
  panel, Close of the records panel, Close and Show full history of the
  history panel, and OK, Skip, Up and Down of the name entry. With the focus on one of them, Enter or Space
  presses it and is not the Pause or New game command. Space is the Pause
  command, and Enter the New game command, only with the focus on no
  button. A slot of the name entry is as 2.15 (4) says.
- **[Clead]** While the log panel, the scores panel, the records panel,
  the history panel or the name entry is open, a button outside it counts as no button, so what Enter and Space
  do is as 2.5, 2.13 (6) and 2.15 say; a button inside the panel is
  pressed as above.
- **[Clead]** A press is a keydown of Enter or Space with `repeat` false.
  The page does the button's job itself and stops the browser's own click,
  so a press acts once; the repeats of a held key, and the key's release,
  do nothing and make no line. A key already down when the focus arrives
  on a button (when a panel opens and puts it on Close) does not press it
  until it has been released and pressed again. With Ctrl, Meta or Alt the
  keys do nothing, on a button too.
- **[Clead]** The log line is the button's, as for a click (2.13 (4)):
  `button Start ignored state`, `button Pause used`, and so on; the
  buttons that make no line make none, and a key line is not also
  written.
- **[Clead]** Every other key (the arrows, W, A, S, D and P) acts on the
  game as before, with any focus, and does not press the button.

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
   one entry, shown and never stored, when it is above every other entry
   (2.15 (2)).

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
   included. The level's turns and time start at 0 (2.18 (1), (2)). The
   state is `ready` until a turn or the Start button
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
   special level. Its time is the level's time of 2.18 (2).
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
6. A turn counts as 2.18 (1) says. At most 20 turns are allowed; **[Clead]** the 21st turn ends
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
    left, the seconds left (8) and the shield layers left, labelled
    "Turns left", "Seconds left" and "Shield left" (2.18 (3)). They are
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
    level's time of 2.18 (2), which does not run in `ready`), or as soon as the level starts (a turn or the
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
   the first and the checksum line of (7) starts with `[t=T #K] `, where T is the time since the game
   was made in whole milliseconds of the page's clock, and K the number
   of ticks of the tick timer so far in this game while it was
   `running`, ticks of a waiting snake (2.12 (5)) included. K counts the
   tick being run when the line is written; a line written outside a
   tick (an input, pause, the page hidden) has the K of the last tick.
3. **[Clead]** The first line names the version of 2.17 and the build (the
   commit it was built from, or `dev` for a local build), as
   `snake-demo version=0.2.0 build=abc1234 size=…`, and the named values of section 3
   the game uses, so a log from any build can be read. **[Clead]** On a
   playtest page (2.14) it ends with the options, `playtest
   start-level=5 slow`, `playtest start-level=5` or `playtest slow`.
4. **[Clead]** The inputs that make a line: every key that maps to a
   command of 2.6, held repeats included; every swipe that maps to a
   turn (2.7); every press of the Start, Pause or Resume, New game and Slow
   (2.14 (5)) buttons, by pointer or by Enter or Space on the focused button
   (2.6), which then makes the button's line and no key line. Keys with no command, keys held with Ctrl, Meta or Alt, swipes
   that map to nothing, and any input while the panel of (6), the scores panel
   or the name entry of 2.15, the records panel of 2.18 (7) or the history
   panel of 2.19 is open make no line, except the New game command while
   the log panel is open (the button, or Enter with the focus on nothing)
   or the scores panel, the records panel or the history panel is open (the
   button only, 2.5), which closes the panel and makes a new game; opening
   and closing the panels make a line only as (6), 2.15 (5), 2.18 (7) and
   2.19 (4) say. The New game command's line is the first stamped line
   of the new game's log, at `[t=0 #0]`, before its level's line; the
   page load makes no input line. An input line says whether the input was used or
   ignored, and if ignored, why, with one of these reasons:
   `same direction` (the heading, or the last queued turn), `straight
   back` (the opposite of either), `queue full` (2.4), `into a wall` or
   `onto an obstacle` (in `ready`, 2.1 (3)), `not free` (a direction
   that is not free while the snake waits, 2.12 (5)), `repeat` (a held
   Space or Enter with the focus on no button, or a held P, 2.6), and `state` (a command the state ignores,
   2.5). When two apply, the first that applies wins: `state`, then
   `repeat`; in `ready`, `straight back` before `into a wall` and
   `onto an obstacle`; while the snake waits, only `not free`; otherwise
   `same direction`, then `straight back`, then `queue full`.
5. **[Clead]** The kinds of line, after the stamp of (2) (the checksum line
   has none), with cells
   written `(x,y)`, directions as `up`, `down`, `left`, `right`, and
   lists of cells joined by `,`:

| Event | Line |
|---|---|
| a level laid out (2.11) | `level 5 special delay=55 start=(3,4) up obstacles=(1,2),(7,9),(0,0),(4,4) dot=(5,5) turns=20 seconds=30 shield=3`; on a normal level `level 4 normal delay=110 start=… obstacles=… dot=…`, without the last three |
| an input | `key ArrowUp up used`, `key a left ignored straight back`, `swipe right used`, `button Start used`, `key p pause used` |
| a turn becoming the heading | `turn up counted 5/20` on a special level, `turn up counted 5` on a normal one, `turn left free` when it ends a wait, `turn up start` for the turn that starts a level from `ready` |
| a stretch of moves | `move right 7 head=(10,4)`: the heading, the number of cells, and the head's cell at the end; a line is written when the stretch ends (a turn, a dot, a crash, a level cleared, a pause or the end of the game) and has at least one move |
| a dot eaten | `dot +1 score=12`; on a special level `dot +0 score=20` |
| a new dot | `dot at (5,9)` |
| a shielded crash | `crash wall shield=2 free=up,left` |
| an obstacle jump | `jump obstacles=(1,2),(7,9),(0,0),(4,4)` |
| a level cleared | `cleared level 5 points=11 turns-left=5 seconds-left=12 shield-used=1 turns=15 time=18040 score=31`; on a normal level `cleared level 4 turns=12 time=25300 score=20`; `turns` and `time` (in milliseconds) are the level's turns and time (2.18 (1), (2)) |
| a record set (2.18 (4)) | `record fewest level=4 turns=12 time=25300`, `record fastest level=4 time=18150 turns=14`; one line for each record the cleared level set, the fewest first, right after the `cleared` line, also when the write to the storage fails; none on a playtest page |
| pause, resume | `pause`, `resume`; made by the log panel (6): `pause log`, `resume log`; made by the scores panel (2.15 (5)): `pause scores`, `resume scores`; made by the records panel (2.18 (7)): `pause records`, `resume records`; made by the history panel (2.19 (4)): `pause history`, `resume history` |
| a slow step (2.14 (5)) | `slow x2`, `slow x4`, `slow x1`, after the input line `button Slow used`; a press the state ignores is `button Slow ignored state` |
| a name entered (2.15 (4)) | `scores name=ABC rank=3`; when the entry is skipped `scores skipped`; when the list had no room left at the confirmation (2.15 (6)) `scores name=ABC full` |
| the page hidden or shown | `hidden`, `shown` |
| the checksum (7) | `sha256 ` and 64 lowercase hexadecimal digits; the last line of what the panel shows, never in the log kept in memory |
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
   included, followed by its checksum line (7); Copy puts that text on the
   clipboard. **[Clead]** The
   link's place and look, the Close button, and that, if the browser
   refuses Copy, the log's text is selected so it can be copied by hand.
   While the panel is open, game keys, swipes and the Start, Pause and
   Resume buttons do nothing, and so do the Log link, the Scores link
   of 2.15 (5), the Records link of 2.18 (7) and the Version history link
   of 2.19 (4), since only one panel is open at a time; Escape or Close
   closes it, and the New game command (the button, or Enter with the
   focus on nothing) closes it and makes a new game. **[Clead]** The focus
   goes to Close when the panel opens, and back to the Log link when Close
   or Escape closes it (the New game command puts it on the New game
   button, 2.5); Enter or Space on the focused Copy copies and on Close
   closes it (2.6). Tab and Shift+Tab move between Copy and Close and
   stay inside the panel while it is open: with the focus outside the
   panel, Tab goes to Copy and Shift+Tab to Close. The log's text is not
   a Tab stop.
   - **[Clead]** Opening the panel on a `running` game pauses it, as the
     Pause command does (2.5), so that a snake that cannot be steered
     does not crash under the panel. Closing the panel with Close or
     Escape goes on, as Pause does from `paused`, but only if opening it
     paused the game, so the game goes on as Resume does. In `ready`, `paused`
     and the ended states the panel changes nothing, on opening or on
     closing, and the New game command makes a new game without going
     on. The pause and the going on are written `pause log` and
     `resume log`; opening and closing make no other line. Lines the
     game makes while the panel is open (the page hidden or shown) are
     in the log, and in the panel the next time it is opened. A page
     shown again does not go on a game the panel paused (2.5).
   - When Copy has copied the log, the button turns green and its text
     reads "✓ Copied!". **[Clead]** The green is a fill of `#15803d` with text of
     `#ffffff` in light mode (a contrast ratio of 5.0:1) and a fill of `#4ade80`
     with text of `#052e16` in dark mode (8.6:1); each is at least 4.5:1. The button goes back to its plain look and the
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
7. The checksum. The text the panel shows and Copy copies (6) ends with
   the checksum line, the SHA-256 of the log text above it, and
   `npm run verify-log` checks a log (the decision recorded at the top of
   this file). The rest of this item is Clead's exact wording.
   - **[Clead]** The log text is the lines of the log in order, each
     followed by one line feed (U+000A), as UTF-8. The checksum line is the
     word `sha256`, one space (U+0020) and the 64 digits of the SHA-256
     (FIPS 180-4) of the log text, each from `0` to `9` or `a` to `f`, then
     a line feed. The panel's text is the log text and then the checksum
     line.
   - **[Clead]** The page makes the checksum line each time the panel
     opens, from the log as it is then, the pause of its opening included.
     The log kept in memory has none, so a later line is covered by the
     checksum of the next opening and not by an earlier one. The checksum
     line has no stamp (2).
   - **[Clead]** The page computes the SHA-256 with a function written for
     this project (section 3), not the browser's `crypto.subtle`, which is
     asynchronous and needs a secure context; no third-party code is used.
   - **[Clead]** `npm run verify-log` reads the log from the one file named
     on its command line or, with no argument, from the standard input. It
     decodes the bytes as UTF-8 (a leading byte order mark is removed and
     an invalid byte becomes U+FFFD, so that the text then does not match),
     reads CR LF as LF (a lone CR stays in its line), and ignores the lines
     at the end that are empty or hold only spaces and tabs. It takes the last remaining line as the
     checksum line and every line before it, each followed by a line feed,
     as the log text, and computes the SHA-256 with Node's own function, so
     that it does not depend on the page's. It writes one of the three lines
     below and a line feed to the standard output and exits: `match` and 0 when the digits
     are those of the log text; `mismatch` and 1 when they are not; `no
     checksum` and 2 when no line is left or the last one is not exactly of
     the form of the checksum line (capital letters, extra spaces and any
     other text make it not of that form). For a file or the standard
     input that cannot be read, or more than one argument, it writes a message to the standard error,
     nothing to the standard output, and exits 3.
   - It makes accidental and casual changes visible. It does not prevent
     tampering: the game runs in the browser, so anyone can change a log
     and compute its checksum again, and a secret key would be readable in
     the page.
   - **[Clead]** Tests. Jest: the SHA-256 against the published test
     vectors (the empty message, "abc", the 56-byte message of FIPS 180-4,
     and a message of one million "a"), inputs of 55, 56, 63, 64 and 65
     bytes and multi-byte UTF-8, each also against Node's result; the log
     text and the checksum line for a given log, with the expected line
     worked out outside the code; the judgement of a pasted log: match, a
     changed character, a removed line, an added line, no checksum line,
     capital letters in the digits, extra spaces on the checksum line, a
     last line of another shape, an empty input, an input of only line
     feeds, an input of only lines of spaces and tabs, trailing empty lines,
     trailing lines of spaces and tabs, a lone CR, a byte order mark, CR LF
     input, an invalid byte in a log line (`mismatch`) and in the checksum
     line (`no checksum`). The command, run as a process: the same
     outcomes with the exit codes, from a file and from the standard
     input, and exit 3 for a missing file and for two arguments. Browser:
     with a game running, open the panel, and again after more play; each
     time the panel's last line is the checksum line of the text above it
     (CR LF read as LF, the expected digits computed in the test), the
     panel's text holds exactly one line that starts with `sha256 `, the
     last one (so the second opening shows that the first opening's
     checksum line was not kept in the log), and Copy puts the same text on
     the clipboard.

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
   played again and again. **[Clead]** A missing or invalid value is ignored: the game
   starts at level 1 and the page is not a playtest page for this option.
3. `slow` is on when it is in the query string with any value or none
   (`?slow`, `?slow=1`). **[Clead]** Any value counts, because `?slow`
   with no value is the use.
4. A page with a valid `level` is a playtest page. **[Clead]** So is a page
   with `slow`, since a slowed game is not comparable with others. On a playtest page,
   no game changes the best score (2.9 (2)) and none enters the high
   score list (2.15 (3)); both keep showing what they hold.
   **[Clead]** No game of a playtest page sets a record (2.18 (4)); the
   records keep showing what is stored. The end line
   of the log says `best=no`. **[Clead]** The page shows no sign of a
   playtest page apart from the Slow button of (5); the first line of
   every log names the options (2.13 (3)).
5. The Slow button. When `slow` is on, a small button with no visible text
   sits under the board. Each press steps the factor 1× → 2× → 4× → 1× on
   a special level.
   - **[Clead]** Its place is the board's right edge and its size
     24 × 24 CSS pixels. Its fill differs from the page's background by a
     contrast ratio of 1.5:1 to 2:1, in light and in dark mode, so that it
     is hard to notice. When it has the focus it shows an outline 2 pixels
     wide with a contrast of at least 3:1 against the page's background.
   - **[Clead]** Its accessible name is "Slow down", so that screen
     readers and tests can find it.
   - **[Clead]** It is shown, and in the tab order, only while the current
     level is a special level; on a normal level it is hidden.
   - **[Clead]** A press, or Enter or Space on the focused button (2.6),
     steps the factor in `ready`, `running` and
     `paused`, and is ignored in `over`, `blown` and `won`. While the log
     panel, the scores panel, the records panel, the history panel or the
     name entry is open the button does nothing and makes no line.
   - **[Clead]** The factor is 1× when a level is laid out and when a new
     game is made, so a special level always starts at its normal speed
     and the factor does not carry from one level to the next.
6. The factor multiplies the delay of the tick timer on the level.
   **[Clead]** The timer schedules each tick when the one before it has
   run, and when the game starts or goes on from `paused`, with the delay
   (the level's delay × the factor) of that moment; a tick that is already
   waiting keeps its delay, so a press changes the delay of the ticks
   scheduled after it (from 1× to 2× on a level of 55 ms, the waiting tick
   comes after 55 ms and the next one after 110 ms). The rules of a tick,
   and the level's time of 2.18 (2), are not changed: each tick in which the
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
   from the best score (2) is never stored; it has the level 0 and the
   name `---`, which the page shows as `--` and `---`. A missing value, or
   a value that is not exactly of that form (an entry that is not valid,
   which includes the level 0 and the name `---`; more than 10 entries; or
   scores that rise along the list), reads as an empty list, the whole
   value and not an entry at a time.
2. **[Clead]** The list as shown at a moment is made so. Take the
   stored entries and, for a game that is ending or being entered, the
   entry that game would make (3). If the best score of 2.9, as it is at
   that moment, is above the score of every one of them (above 0 when
   there are none), add one more entry ahead of them, with that score, the
   level 0 and the name `---`. The list as shown is the first 10 of
   these. The best score is updated when a game ends (2.9 (2)), so it is
   at least the game's score, and a game's score is never shown twice,
   once as the best score and once as its entry.
3. A game qualifies when it ends (`over`, `blown` or `won`) on a page
   that is not a playtest page (2.14 (4)) with a score of at least 1, and
   its entry is among the 10 of the list as shown for it (2).
   **[Clead]** The least score that qualifies is 1. Making the entry (4)
   puts it after every stored entry with a score at least as high, and
   the stored list becomes the first 10 of the stored entries and the new
   one; the entry of (2) is not among them. The rank of the entry is its
   place in the list as shown with it (2), which is also the row the table
   marks. Examples. The best score before the game was 43, nothing is
   stored, and a game ends with 43, having reached level 7: the best score
   is not above 43, the list is `43:7:ABC`, the rank is 1, and that is
   stored. Nothing is stored, the best score before the game was 150 (the
   name of that game was skipped), and a game ends with 40 at level 6: the
   list as shown is `150:0:---`, then `40:6:ABC`, the rank is 2, and
   `40:6:ABC` is stored. Ten entries with the scores 100, 90, 80, 70, 60,
   50, 40, 30, 20 and 10 are stored and the best score is 150: a game
   ends with 15, whose entry would be 11th with the entry of (2) shown, so
   it does not qualify; a game ends with 25, the list as shown is the
   entry of (2), then 100 to 30, then 25, so the rank is 10, and the
   stored list is 100 to 30, 25 and 20, the entry 10 having dropped out.
4. When a game qualifies, a panel over the board offers a name entry,
   with 3 slots, each a letter from A to Z starting at A, and a way to
   confirm the name.
   - **[Clead]** The panel's texts: the title ENTER YOUR NAME, then SCORE
     with the game's score, LVL with the level it reached, RANK with the
     rank written as in (5), then the 3 slots, then an OK button and a
     Skip button.
   - **[Clead]** One slot is selected, the first at the start. ArrowUp changes the selected letter to
     the next in the alphabet (after Z comes A) and ArrowDown to the one
     before (before A comes Z); ArrowLeft and ArrowRight move the selection
     (not past the first or the last slot). Each slot is a button whose
     accessible name is its number and its letter, "Letter 1, A", and the
     selected slot has `aria-current="true"`; pressing a slot selects it.
     The focus follows the selection when an arrow key or a press on a
     slot changes it. Each slot also has an Up and a Down button, named
     "Letter 1 up", "Letter 1 down" and so on, which select their slot and
     then do what ArrowUp or ArrowDown does, so that a phone can do all of
     it; the focus stays on the button that was pressed, so that a second
     Enter or Space on it changes the letter again and does not confirm
     the name.
   - **[Clead]** Keys: with the focus on a slot, Enter confirms and Space
     does nothing; with the focus on OK, Skip, an Up or a Down button,
     Enter and Space press that button (the decision of 2026-11-10 on keys
     on a focused button, `DECISIONS.md`, PO-171); Escape skips from
     anywhere in the entry. A repeat of Enter, Space or Escape does
     nothing, a repeat of an arrow key acts as a new press, and a key that
     was already down when the entry or the table of (5) opens does
     nothing, its repeats included, until it is released.
   - Confirming stores the entry as (3) says and writes the line
     `scores name=ABC rank=3` (2.13 (5)). **[Clead]** The panel then turns
     into the table of (5), with the new entry marked. **[Clead]** Skipping stores
     nothing, writes `scores skipped` and closes the panel; the entry can
     be skipped so that nobody is held up by it.
   - **[Clead]** While the entry is open, game keys, swipes, the Start,
     Pause and Resume buttons, the New game button, the Log link, the
     Scores link, the Records link and the Version history link do
     nothing, Enter confirms instead of making a new game
     (2.6), and the status line says so (2.8). The panel is a dialog: the
     focus goes to the first slot when it opens, Tab and Shift+Tab stay
     inside it, and the focus goes back to the New game button when it
     closes.
5. A "Scores" link below the board, next to the Log link, opens the
   table in a panel over the board with a Close button. **[Clead]** It
   can be used in every state, as the Log link can (2.13 (6)), and the
   panel works as the log panel does: opening it on a `running` game
   pauses it, closing it with Close or Escape goes on if opening paused
   the game (the lines `pause scores` and `resume scores`); while it is
   open, game keys, swipes, the Start, Pause and Resume buttons and the Log, Records and
   Version history links do nothing, and the New game button closes it and makes a new
   game; Enter does not, since the focus is on Close and Enter presses it. The panel has the title TOP 10 SCORES, the headings RANK, SCORE,
   LVL and NAME, and a row for each entry of the list as shown, read when
   the panel opens: its rank written 1ST, 2ND, 3RD, 4TH and so on to
   10TH, its score, its level (`--` for the entry of (2)) and its name.
   **[Clead]** The title and the ordinals follow Adam's picture of 00:34.
   **[Clead]** With no entries the panel says NO SCORES YET instead of the
   rows. After a name is entered, the panel is this table with the new
   entry's row marked: the row has `aria-current="true"` and a triangle
   drawn before its rank (2.16 (1)), so that the mark is not only a
   colour; closing the panel leaves the ended game as it was. **[Clead]**
   The focus goes to Close when the table opens and back to the New game
   button when it closes, so that Enter after closing it starts a new game
   and does not open the table again, and stays inside the panel; Enter and Space on the focused Close press it
   (as in the entry), so the table closes and Enter makes no new game from
   it. **[Clead]** A key already down when the table opens, and the
   repeats of Enter, Space and Escape, do nothing, as in the entry (4).
   **[Clead]** The status line of an ended game keeps its words while the
   table is open (2.8), and Enter then closes the table, so that a second
   Enter makes the new game. The
   focus of the log panel is as it is.
6. **[Clead]** When the list is read: when a game ends (for the
   qualification), when the entry opens, when it is confirmed (before the
   write, so that the entries another tab stored in the meantime are
   kept) and when the Scores panel opens. Each read makes the list as
   shown (2) from the stored text and the best score as they are at that
   moment. The rank of the line and the table is the one found at the
   confirmation. If the entry is no longer among the 10 then (another tab
   filled the list), nothing is stored, the line is
   `scores name=ABC full` and the panel turns into the table without a
   marked row. A read that fails reads as an empty list (1). After a
   failed write the page keeps its list in memory and uses that list for
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
   RANK, the ranks, scores, levels and names, the letters of the slots, the
   labels of the buttons and the line NO SCORES YET) is drawn as squares, one per pixel, at a
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
   background mixed with 6 % white at its middle and fading to the background at its top and bottom edges, rolls down the panel once in 8000 ms
   and starts again at the top; and the whole picture shifts sideways by
   2 pixels for 120 ms at 900 ms, 3300 ms and 5600 ms of a cycle of
   7000 ms, as if the sync had slipped. They move `transform` and the
   background position only, and run only while the panel is shown. Nothing
   in the panel flashes: the one thing that blinks is the cursor of the
   selected slot, with a period of 500 ms, shown for 250 ms and hidden for
   250 ms (twice a second, under the 3 flashes a second of WCAG 2.3.1).
   The panel can be closed at any time (Close, Escape or Skip), which
   stops all of it, and (5) turns it off; this is the control that WCAG
   2.2.2 asks for movement of more than 5 seconds.
5. **[Clead]** With `prefers-reduced-motion: reduce` nothing moves: no
   band, no shift, and the cursor does not blink but stays on; the
   colours, the scanlines and the glow remain.
6. The values (the scales, the size of the band, the periods, the shift,
   the cursor's period, the scanlines, the glow and the 6 %) are named
   values (section 3), which `main.ts` hands to the CSS as custom
   properties. **[Clead]** The one exception is the times and length of the
   sideways shifts, which are percentages of a keyframe's cycle and so
   cannot be custom properties: `main.ts` writes them as a `@keyframes`
   rule from the named values.
   What the look looks like is Adam's to judge by playing; the
   tests of the panel check what can be measured: the texts, the colours
   and their contrast, the animation names and periods in the styles the
   browser computes, none of them under reduced motion, and, in Jest, the
   bitmap font (every glyph 5 × 7, every character of the panels present
   and different from the others) and the drawing of a text into pixels. Because "Letter 1, A", "Letter 1 up" and "Letter 1 down" all contain
   "Letter 1", a test finds a button by its accessible name with an exact
   match.

---

### 2.17 Version line

1. The page shows one line of small text under the board: `v0.2.0 ·
   abc1234`, the version of `package.json` and the build's commit.
   **[Clead]** The text is the letter `v`, the version, a space, the
   middle dot `·` (U+00B7), a space and the build. The version is the
   `version` of `package.json` when the page was built, whatever it is
   then (a prerelease such as `0.3.0-rc.1` included). The build is the one
   of 2.13 (3): the first 7 characters of the commit the page was built
   from, or `dev` for a local build, so a local build shows `v0.2.0 · dev`.
2. **[Clead]** The line is the last thing in the page's column, below the
   controls; it is not a button or a link, is not in the tab order, takes
   no key or pointer input, and is read by screen readers as the text it
   is. Its text is in the muted colour of the page (`--muted`), which is at
   least 4.5:1 against the page's background in light and in dark mode, in
   the page's font at 0.75 of the size of the status line, and centred
   under the board. It is on every page, a playtest page (2.14) included.
3. **[Clead]** The version and the build are fixed when the page is built,
   by the build tool, from `package.json` and from the commit; nothing is
   read from the network or at run time. They reach the page as two
   build-time constants. The text of (1) is made by one function of the
   version and the build, `versionText` in `src/version.ts` (section 3),
   and the log's first line takes the same two constants as parameters
   (`firstLine` gets the version in front of the build), so the page and
   the log cannot differ.
4. **[Clead]** Tests. Jest: `versionText` with a given version and build
   (`v0.2.0 · abc1234`, `v1.10.3 · dev`, `v0.3.0-rc.1 · abc1234`) and the
   first line of the log with the version in it, with and without the
   playtest options. Browser: the line is under the board and below the
   controls; its text is `v`, the version of `package.json`, ` · ` and 7
   lowercase hexadecimal digits or `dev`; the first line of the log opens
   `snake-demo version=<that version> build=<that build> `, with the build
   the same in both, also on a playtest page, where the line is shown too
   and the first line ends with the options; the line is not reached by
   Tab, and a click on it makes no log line and changes nothing in the
   game; its computed colour is the page's `--muted` in both colour
   modes and the contrast of it against the page's background is at least
   4.5:1; its font size is 0.75 of the status line's and its centre is the
   board's centre; its text is in the page's accessibility tree.

### 2.18 Level turns, level time and level records

1. **Turns.** **[Clead]** A level's turns are the turns counted on it. A
   turn counts when a tick takes it from the queue and it becomes the
   heading (2.2 step 1). The turn that starts the level from `ready`
   (2.1 (3)), the Start button, and the turn that ends a wait after a
   shielded crash (2.12 (5)) are not counted (for special levels this is
   the rule Adam accepted for 2.12 (6); on a normal level it is the same
   rule), and nor is a turn that is ignored or only queued. The turns
   start at 0 when a level is laid out (2.11). This holds on every level;
   the limit of 20 turns (2.12 (6)) is on special levels only.
2. **Time.** A level's time is the sum, over the ticks in which the snake
   moved (step 6 of 2.2), of the level's delay (2.10 (2), 2.12 (2)),
   whatever the tick really took (2.14 (6)). It is the game's time, as the
   special levels count it, and not the clock on the wall: on a machine
   whose ticks run later than their delay it is less than a stopwatch
   shows.
   - **[Clead]** It is kept in whole milliseconds and starts at 0 when a
     level is laid out.
   - **[Clead]** So the time runs only while the snake moves, and not in
     `ready`, in `paused`, while the snake waits after a shielded crash
     (2.12 (5)), or in the tick of the crash itself; the tick that eats
     the 5th dot counts.
   - **[Clead]** The page's clock and the log's stamps (2.13 (2)) are not
     the level's time.
3. **On the page.** On every level the page shows the level's turns and
   the level's time while the level is played.
   - **[Clead]** They are shown next to the level, the score and the best
     score, as "Turns 7" and "Time 12s": the turns as a whole number, the
     time as whole seconds, rounded down ("Time 12s" for 12000 to
     12999 ms).
   - **[Clead]** They are shown in every state; they are 0 and 0s when a
     level is laid out (a new game included), change when the turn is
     counted or the tick is run, and keep their last values when the game
     ends. The page does not announce their changes to screen readers.
   - **[Clead]** The values of a special level (2.12 (10)) are labelled
     "Turns left", "Seconds left" and "Shield left", so that a special
     level shows five values, "Turns", "Time", "Turns left", "Seconds
     left" and "Shield left"; tests find each by its whole label, since
     "Turns" is the start of "Turns left". On a special level the seconds
     left (rounded up, 2.12 (8)) and the time (rounded down) add up to 30.
4. **Records.** For each level the page keeps up to two records: the
   fewest turns, with the time that level took, and the fastest time,
   with the turns that level took.
   - **[Clead]** They come from different plays of the level when they
     differ. A level is cleared when its 5th dot is eaten (2.2 step 7),
     also when the next level then cannot be laid out and the game is
     `won` (2.11); such a clear counts.
   - **[Clead]** When a level is cleared on a page that is not a
     playtest page (2.14 (4)), its turns T and its time S, as they are
     after that tick, are compared with the records of that level. The
     fewest-turns record becomes (T, S) when the level has none, or when
     T is fewer than its turns, or when T is equal to its turns and S is
     shorter than its time. The fastest-time record becomes (S, T) when
     the level has none, or when S is shorter than its time, or when S is
     equal to its time and T is fewer than its turns.
   - **[Clead]** A clear can set both records, only one, or none: a clear
     that equals both records changes nothing. The first clear of a level
     sets both. A game that ends on a level without clearing it sets no
     record, and no game of a playtest page sets one.
5. **Stored.** The records are kept in this browser only, in its local
   storage.
   - **[Clead]** They are under the key `snake-demo.records`, as text:
     one entry for each level that has records, in ascending order of
     level, joined by `,`. An entry is written `LEVEL:A:B:C:D`: the level,
     the turns A and the time B in milliseconds of its fewest-turns
     record, then the time C in milliseconds and the turns D of its
     fastest-time record, for example
     `4:12:25300:18150:14,5:15:18040:15180:16`. Numbers are written with
     the digits 0 to 9 and no leading zero (zero is `0`).
   - **[Clead]** The bounds, named values of section 3: the level from 1
     to 80 (`main.ts` works it out as the number of cells divided by the
     dots per level, 20 × 20 / 5, as 2.9 (3) does), the turns from 0 to
     99999 and the times from 1 to 99999999 ms. A missing value, or any
     other value (an entry that is not of that form, a level twice or not
     rising along the list, a number outside its bound), reads as no
     records, the whole value and not an entry at a time. A level whose
     turns or time are above their bound sets no record, and the records
     it would have replaced stay. These bounds are no rule of the game, so
     the first line of the log (2.13 (3)) does not name them.
   - **[Clead]** The records are read from the storage each time they are
     shown or compared: when a level is laid out (for the line of (6)),
     when the panel of (7) opens, and when a level is cleared, before the
     comparison, so that the records another tab stored in the meantime
     are kept; the whole text is then written, at every clear that sets a
     record, also after a write that failed. A read that fails reads as no
     records, so the next clear that sets a record writes the text with
     only the entries it then holds; this is meant, as for the list
     (2.15 (6)).
   - **[Clead]** Every access to the storage, including getting hold of
     it, happens inside the module's error handling, and the game goes
     on; after a failed write the page keeps its records in memory and
     uses them for the rest of the page's life, with no further read (as
     2.15 (6) says of the list).
6. **The line.** The page shows the records of the current level in one
   line of text, with the texts `Fewest turns: 12 turns (25s)` and
   `Fastest: 18s (14 turns)`.
   - **[Clead]** The line is `Fewest turns: 12 turns (25s) · Fastest:
     18s (14 turns)`, the two texts joined by ` · ` (a space, the middle
     dot U+00B7 and a space, as 2.17 (1)), under the values of (3) and
     above the board.
   - **[Clead]** The fewest text is the record's turns, a space, `turn`
     when the turns are 1 and `turns` otherwise, a space and in
     parentheses its time in whole seconds, rounded down, and `s`:
     `12 turns (25s)`, `1 turn (9s)`, `0 turns (7s)`. The fastest text is
     the time in whole seconds, rounded down, and `s`, a space and in
     parentheses its turns with the same word: `18s (14 turns)`. A level
     with no records shows `–` (U+2013) in place of each text: `Fewest
     turns: – · Fastest: –`.
   - **[Clead]** The line is shown in every state, from when the level is
     laid out, and on a playtest page too, where it shows the records as
     they are stored. It changes when a level is laid out, so a record set
     on a level shows in its line the next time that level is laid out.
   - **[Clead]** It is not announced to screen readers when it changes,
     is in the muted colour of the page (`--muted`), and wraps between its
     two texts when it does not fit, so that the page does not scroll
     sideways at 375 px.
7. **The table.** A link opens a table of the records of all levels. The
   table is not on the page: it is brought up by clicking the link.
   - **[Clead]** The link is "Records", below the board next to the Log
     and Scores links, and the table is in a panel over the board with a
     Close button. The panel works as the scores panel of 2.15 (5) does,
     apart from its content, as the bullets below say.
   - **[Clead]** It can be used in every state; opening it on a `running`
     game pauses it, and closing it with Close or Escape goes on if
     opening paused the game (the lines `pause records` and
     `resume records`); in `ready`, `paused` and the ended states it
     changes nothing, on opening or on closing.
   - **[Clead]** While it is open, game keys, swipes, the Start, Pause
     and Resume buttons and the Log, Scores and Version history links do
     nothing; the New
     game button closes it and makes a new game; Enter does not make a new
     game (with the focus on Close, Enter presses it; on the table, Enter
     does nothing); while the name entry of 2.15 (4) is open the Records
     link does nothing.
   - **[Clead]** The focus goes to Close when it opens, back to the
     Records link when Close or Escape closes it, and to the New game
     button when the New game command closes it. Tab and Shift+Tab stay
     inside the panel, between the table and Close; with the focus outside
     the panel, Tab goes to the table and Shift+Tab to Close. The element
     that scrolls the table (the scroll area around it, which holds the
     table) is the Tab stop and takes the focus, so that a long table can
     be scrolled with the keys; "the table" in this item and
     in 2.5, 2.6 and 2.18 (8) means that element where a focus or a key is
     named.
   - **[Clead]** With the focus on the table, the arrow keys, Space,
     Page Up, Page Down, Home and End are left to the browser, which
     scrolls the table: the page does not stop them (2.6) and they turn
     nothing and make no line. Enter does nothing, and Escape closes the
     panel from anywhere in it. With the focus on Close, Enter and Space
     press it (2.6).
   - **[Clead]** A key already down when it opens, and the repeats of
     Enter, Space and Escape, do nothing; the status line of an ended game
     keeps its words while it is open (2.8).
   - **[Clead]** The panel's title is "Level records". It shows a table
     with the headings "Level", "Fewest turns" and "Fastest" and a row for
     each level that has records, in ascending order of level, read when
     the panel opens: the level number, the fewest text and the fastest
     text of (6). With no records it says "No records yet" instead of the
     rows, and the headings stay.
   - **[Clead]** The panel has the plain look of the log panel and not
     the arcade look, which is for the scores panel only (2.16); the table
     scrolls inside the panel when its rows do not fit.
8. **[Clead]** Tests. Jest, game: the turns of a level count a turn a tick
   takes from the queue, on a normal and on a special level, and not the
   turn that starts the level, the Start button, the turn that ends a
   wait, a turn ignored or one only queued; they and the time start at 0
   on each level; the time is the sum of the level's delay over the ticks
   in which the snake moved, and is not changed in `ready`, in `paused`,
   by a crash, or by the Slow factor; the tick that clears a level counts;
   the time of a special level is what it was before this change. Jest,
   records: each rule of (4), with the cases: the first clear sets both;
   fewer turns with a longer time sets only the fewest; equal turns and a
   shorter time sets the fewest; equal turns and a longer or equal time
   changes nothing in the fewest; a shorter time with more turns sets
   only the fastest; an equal time and fewer turns sets the fastest; an
   equal time and more or equal turns changes nothing in the fastest; a
   clear that equals both changes nothing; a clear that sets one record
   keeps the other; a level cleared that ends the game as `won` because
   the next level cannot be laid out sets its records. Jest, records,
   storage: the text of (5) made and read back; every malformed text (a
   leading zero, a sign, a space, a missing field, an extra field, an
   extra comma, an empty entry, a level twice or not rising); each bound
   accepted at the bound and rejected one past it (level 1 and 80, with 0
   and 81 rejected; turns 0 and 99999, with 100000 rejected; time 1 and
   99999999, with 0 and 100000000 rejected); a level whose turns or time
   are above the bound sets no record and the stored records stay; reads
   and writes through fake stores that return nothing, throw on getting
   hold of the store, on reading and on writing (the records then kept in
   memory, a later clear writing them again); records another tab stored
   between the page load and a clear are kept. Jest, texts: those of (6)
   and (7) (`1 turn`, `0 turns`, 24999 ms as `24s`, `–`, the longest line
   `Fewest turns: 99999 turns (99999s) · Fastest: 99999s (99999 turns)`).
   Jest, log: the changed and new lines of 2.13 (5). Browser: the values
   of (3) in every state, found by their whole labels, also on a special
   level; the line of (6) from records stored before the page loads, with
   and without records, on a playtest page too, and at 375 px with the
   longest line the page does not scroll sideways; a level cleared on a
   normal page sets its records, and the line shows them the next time
   that level is laid out, while one cleared on a playtest page sets
   none; the panel of (7): its content with and without records and what
   is stored when it opens, pause and resume, the focus in each case, Tab
   and Shift+Tab inside it and from outside it, the keys on the focused
   table (the table scrolls with the arrow keys and Space, nothing turns,
   Enter does nothing, Escape closes), Escape, the New game button, the
   Records link with the name entry open, the status line, and that its
   look is the plain one and not the arcade look; a failing storage; the
   log lines.

### 2.19 Version history

1. **Version history.** The app has a history of its versions. A "Version
   history" link opens it. The history opens by itself when the app is
   loaded for the first time after a version upgrade, and shows what is
   new. Its text is a player-facing list written for the app, one entry
   for each version in plain words, bundled into the page when it is
   built; it is not `CHANGELOG.md`. After an upgrade only the versions
   newer than the last one this browser saw open, with a button to the
   full history. On a first visit, with no stored version, nothing opens;
   the link is always there.
2. **The list.** **[Clead]** The list is in `src/history.ts` as data,
   newest first. An entry has a version (the text of `package.json`'s
   `version`, which is a SemVer 2.0.0 version), a date written
   `YYYY-MM-DD` that is a real calendar date (`2026-02-30` is not), and one
   or more lines, each a non-empty text (not only spaces) of plain words, shown as
   text and never as HTML. A text is a SemVer 2.0.0 version if it matches the
   regular expression that semver.org gives for it, so build metadata
   (`0.2.0+abc`) is valid and ignored by the precedence, and a leading
   `v` or a space is not valid; numeric identifiers are compared as digit
   strings, so any length works. No two entries have the same precedence
   and the list is in descending order of precedence, as SemVer 2.0.0
   section 11 defines it (compared by this project's own function, `src/history.ts`; no
   third-party code). The version of `package.json` has an entry and it is
   the first, so a version cannot be set without writing what it brings;
   a Jest test checks it. The text is read from nothing at run time, with one exception for the
   browser tests: a page in an automated browser (`navigator.webdriver`
   true) reads a list from the `window` property `__snakeDemoTestHistory`
   once, at load, and uses it in place of the bundled one only if it
   meets every rule of this item (the version of `package.json` first, as
   a Jest test checks for the bundled list, is not asked of it). In a
   player's browser nothing is read from there.
3. **What opens by itself.** **[Clead]** The version last seen is kept in
   the browser's local storage under the key `snake-demo.seen-version`,
   as the version text. When the page loads, with S the stored text and V
   the build's version (the one 2.17 shows):
   - S is missing, or is not a SemVer 2.0.0 version, or reading it throws,
     or the storage cannot be got hold of: nothing opens. In each of
     these cases V is written; the write is always tried, inside the error
     handling, and a failure of it is ignored.
   - S has the precedence of V or a higher one (a build older than the
     one this browser saw last): nothing opens, and V is written.
   - S is lower than V: the history opens by itself with the entries of
     versions higher than S and not higher than V, newest first, and V is
     written. If there is no such entry, nothing opens.
   So while the storage works a version opens by itself at most once in a
   browser, whatever the player does with the panel. A write that fails is
   ignored, and then the history may open again at the next load. The case
   "no such entry" cannot happen with the list as built (2.19 (2) puts the
   build's version in it), and is a case of the function only, with no
   browser test. Every access to the storage,
   including getting hold of it, happens inside the module's error
   handling (as 2.9 (4) says), and the game goes on. A playtest page
   (2.14) follows the same rules.
4. **The panel.** **[Clead]** The "Version history" link is below the
   board, next to the Log, Scores and Records links, and opens the history
   in a panel over the board with a Close button. The panel works as the
   records panel of 2.18 (7) does, apart from its content and the
   button below: it can be used in every state, and opening it from the
   link on a `running` game pauses it, and closing it with Close or
   Escape goes on if opening paused the game (the lines `pause history`
   and `resume history`); in `ready`, `paused` and the ended states
   opening and closing change nothing in the game; while it is open, game keys,
   swipes, the Start, Pause and Resume buttons and the Log, Scores and
   Records links do nothing, and the New game button closes it and makes
   a new game; while the name entry of 2.15 (4) is open the Version
   history link does nothing; the focus goes to Close when it opens, back
   to the Version history link when Close or Escape closes it and to the
   New game button when the New game command closes it; a key already
   down when it opens, and the repeats of Enter, Space and Escape, do
   nothing; the status line of an ended game keeps its words while it is
   open (2.8). The four links wrap onto another line when they do not fit the
   width (no sideways scrolling, section 3). The element that scrolls the text
   of the history (the scroll area around it) is the Tab stop and takes the
   focus, so that a long history can be scrolled with the keys ("the text
   of the history" in this item, 2.5, 2.6 and 2.19 (5) means that element), and the keys on it are as the
   records table's (2.18 (7)): the browser scrolls it, nothing turns,
   Enter does nothing, Escape closes the panel. Tab and Shift+Tab stay
   inside the panel, in the order the text, the button "Show full
   history" when there is one, and Close; with the focus outside it, Tab
   goes to the text and Shift+Tab to Close.
   - **[Clead]** Opened from the link, the panel has the title "Version
     history" and shows every entry, newest first.
   - **[Clead]** Opened by itself (3), the panel has the title "What's
     new" (with the apostrophe U+0027), shows the entries of (3) newest first, and has a button "Show
     full history" below them. Pressing it (a click, or Enter or Space on
     it, 2.6) shows every entry under the title "Version history",
     removes the button and puts the focus on Close. It is opened in
     `ready`, as the page loads, so it pauses nothing and writes no log
     line; the focus goes to Close when it opens, and the New game command
     closes it as it closes the other panels.
   - **[Clead]** An entry is shown as a heading "Version 0.2.0 ·
     2026-11-11" (the version, a space, the middle dot U+00B7, a space and
     the date, as 2.17 (1)) and its lines as a list of items under it,
     in the order of the list. The panel has the plain look of the log
     panel, not the arcade look (2.16), and the text scrolls inside the
     panel when it does not fit.
   - **[Clead]** The buttons of the panel, "Show full history" and Close,
     are buttons in the sense of 2.6.
5. **[Clead]** Tests. Jest: the shape of the list (not empty; each entry's
   version a SemVer 2.0.0 version, no two with the same precedence
   (`1.0.0+a` and `1.0.0+b` are the same) and in descending order; each
   date a real calendar date; at least one line, none empty); the version of `package.json` is the first entry's; the
   precedence function on the examples of SemVer 2.0.0 section 11
   (`1.0.0-alpha` < `1.0.0-alpha.1` < `1.0.0-alpha.beta` < `1.0.0-beta` <
   `1.0.0-beta.2` < `1.0.0-beta.11` < `1.0.0-rc.1` < `1.0.0`, and
   `1.9.0` < `1.10.0` < `1.11.0`); the decision of (3) in each case: a
   missing, an invalid and a prerelease-looking invalid S, an unusable
   store, S equal to V, S higher than V, S lower than V with one, several
   and no entry in between, and the entries given newest first; the
   stored text made and read back; a store that returns nothing (V
   written, nothing opens), throws on getting hold of it (nothing opens,
   the write tried and its failure ignored), throws on reading (nothing
   opens, V written) and throws on writing (the decision still given);
   S lower than a prerelease V (`0.3.0-rc.1`), a prerelease S below a
   release V, S with build metadata equal to the same version without it,
   and a leading `v` or a space invalid; a line of only spaces refused; a
   build version that is not SemVer opens nothing and is still written; a date that is not a real
   calendar date refused; the log lines
   `pause history` and `resume history` in the cases of 2.13 (5). Browser: a
   line with `<` in it, given through the test list of (2), is shown as
   text, not as HTML; the test list is read with `webdriver` true and
   ignored with it false; the link opens
   the panel with every entry and the title "Version history"; with
   `snake-demo.seen-version` set to `0.0.1` before the page loads, the
   panel opens by itself with the title "What's new", the entry of the
   build's version and the button, and after the page has loaded the key
   holds the build's version; the button changes the title to "Version
   history", shows every entry, is gone afterwards and the focus is on
   Close; the opening by itself pauses nothing, writes no log line (read after
   the panel is closed) and puts the focus on Close; with the key
   missing, equal to the build's version or higher, nothing opens and the
   key holds the build's version; Close and Escape close it and put the
   focus on the link; the New game button closes it and makes a new game;
   the keys on the text (the arrow keys and Space scroll it, nothing
   turns, Enter does nothing); Tab and Shift+Tab inside the panel and
   from outside it; a running game is paused by opening it from the link
   and goes on when it closes with Close or Escape, a game paused by the
   player stays paused, and `ready` and the ended states are unchanged;
   the log lines `pause history` and `resume history` and no line for the
   opening by itself, the "Show full history" press or any input while the
   panel is open; with the history panel open the Log, Scores and Records
   links do nothing, and with the log, scores or records panel open the
   Version history link does nothing; the Version history link does nothing
   with the name entry open; no sideways scrolling at a width of 375 px and
   the links wrapping at 320 px; the
   plain look; a failing storage.

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
  key `snake-demo.scores` (2.15); the records' storage key
  `snake-demo.records`, highest turns 99999 and longest time 99999999 ms
  (2.18 (5)); the seen version's storage key `snake-demo.seen-version`
  (2.19 (3)); and the arcade look's pixel scales 1, 2
  and 3, band of 40 pixels, roll of 8000 ms, shift of 2 pixels for 120 ms
  in a cycle of 7000 ms at 900, 3300 and 5600 ms, and cursor period of
  500 ms, the scanlines, the glow and the 6 % of the band, and the
  Slow button's 24 pixels (2.16, 2.14 (5)); `main.ts` hands the look's
  values to the CSS as custom properties. The best score's
  bound of 2.9 (3) is not a value of its own: `main.ts` works it out
  from these, as (20 × 20 / 5) × the larger of 5 and 20 + 30, and the
  highest level of a record (2.18 (5)) as 20 × 20 / 5. No other
  module writes these numbers
  (product-office Process P-11 § 5 (2)): `game.ts`, `input.ts`,
  `storage.ts`, `query.ts`, `scores.ts`, `records.ts`, `history.ts` and `pixel.ts` take the values
  they need as parameters, and `main.ts`
  passes them from here.
- `src/game.ts`: the game rules as pure functions over a game state (no
  DOM, no timers): a new game, a turn, a tick, pause, the commands of
  2.5, levels and laying out a level (2.10, 2.11), special levels
  (2.12), the turns and the time of a level (2.18 (1), (2)), the free directions of a waiting snake (2.12 (5)), exported,
  which `turn`, the boxed-in check and `src/status.ts` use, and the
  delay of a level. It reports what each step did for the event log
  (2.13): why a turn is ignored (`ignoredBecause`), what the last
  shielded crash hit, and what the last cleared level gave (its points,
  turns and time). The choosers of 2.3 and 2.11 are passed in, so tests are
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
  and may throw, the list as shown with the entry made from the best score,
  whether a game qualifies, its rank and the list after an entry. Covered
  by Jest with fake stores, also ones that throw, every malformed text of
  (1) (a stored level 0 among them), the three examples of (3), a best
  score equal to the game's score, and the `full` outcome of (6).
- `src/records.ts`: the level records (2.18) as pure functions: reading
  and writing their text through a function passed in that returns the
  store and may throw, the records after a cleared level (the rules of
  (4)), which of the two records it set, and the texts of the line and of the table's cells (2.18 (6),
  (7)) from a record, so that the page shows no text of its own. Covered
  by Jest with fake stores, also ones that throw, every malformed text of
  2.18 (5), and each rule of 2.18 (4).
- `src/history.ts`: the version history of 2.19 as data (2.19 (2)), the
  function that orders versions by SemVer 2.0.0 precedence, the decision
  of 2.19 (3) from the stored version, the build's version and the list
  (which entries open by itself, or none), reading and writing the stored
  version through a function passed in that returns the store and may
  throw, and the headings of 2.19 (4). Covered by Jest as 2.19 (5) says.
- `src/pixel.ts`: the 5 × 7 bitmap font and the drawing of a text into
  pixels (2.16 (1)), the gap between the table's columns (12 pixels of the
  font, `COLUMN_GAP`) and the lead before a row's marker (6 pixels of the
  font, `MARKER_LEAD`), each times the pixel scale in CSS pixels,
  which `main.ts` hands to the CSS as `--arcade-gap` and `--arcade-lead`, and
  the text of the `@keyframes` rule of the shifts (2.16 (6)). Pure, covered by
  Jest.
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
  reported about the step, the records `src/records.ts` set for a
  cleared level (2.18 (4)), the time and the tick count; it keeps its
  own small state (the open stretch of moves) and works out no game
  rule itself. Pure, covered by Jest: every kind of line of 2.13 (5)
  whole, except the checksum line, which `src/logsum.ts` makes.
- `src/version.ts`: `versionText`, the text of 2.17 (1) from a version and
  a build, a pure function covered by Jest. `vite.config.mts` hands the
  version of `package.json` and the build to the page as two build-time
  constants, as it does for the build today, and `src/log.ts`'s
  `firstLine` takes the version and the build as parameters (2.13 (3)).
- `src/sha256.ts`: SHA-256 of a string as UTF-8, written for this project
  (2.13 (7)). Pure, covered by Jest against published test vectors and
  Node's own result.
- `src/logsum.ts`: the log text and the checksum line of 2.13 (7), and the
  judgement of a pasted log (`match`, `mismatch`, `no checksum`), with the
  hash function passed in; `scripts/verify-log` reads the input and calls it
  with Node's SHA-256, `main.ts` calls it with `src/sha256.ts`. Pure,
  covered by Jest.
- `src/main.ts`: draws the board, the obstacles and the level on a
  canvas, shows a special level's turns left, seconds left and shield
  (2.12 (10)), every level's turns and time (2.18 (3)), the line of its
  records and the Records link with its table (2.18 (6), (7)), the
  Version history link with its panel and its opening by itself (2.19),
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
`over`, `blown`, `won`) with the reason an ended game ended (2.8), its
turns counted and its time (2.18 (1), (2)), and on a special level the
shield layers used and whether the snake waits after a crash.
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

Sound, several players, online scores (the high score list of 2.15 and
the level records of 2.18 are kept in the browser only; a server for a
global list is PBI-2.30, later).
Power-ups: Adam, 2026-11-09,
"will be added later"; not specified yet.

---

## 6. Known unknowns

1. Whether swipe control feels right on Adam's phone. Settled: Adam
   played it on his phone, "tested, swipe was good" (2026-11-09, in chat;
   PBI-1.7).
