
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

Approved: Adam, 2026-11-16 01:14 ("4. yes", to Clead's offer of a message
when a record is set) and 01:23 ("A", choosing a short line in the status
line while the next level starts): the page says so when a cleared level
sets a record, in the status line of the next level (`DECISIONS.md`,
PO-171, the row "Snake demo, a message when a cleared level sets a record"). 2.18 (9),
and the changes to 2.10 (3) and 3 that follow from it, are Clead's exact
wording of that decision. Details Adam has not settled
are marked **[Clead]**; a mark at the start of an item or a bullet covers
all of it, and a mark in the middle covers the sentence it opens.

Approved: Adam, 2026-11-16 14:50 ("On first clear i want the text "First
clear!" to be shown instaead", of the record message of 2.18 (9)): the
first clear of a level shows "First clear!" in place of a record message
(`DECISIONS.md`, PO-171, the row "Snake demo, "First clear!" on the first
clear of a level"). The text is his; 2.18 (10), and the changes to 2.10 (3)
and 3 that follow from it, are Clead's exact wording, with the details
marked **[Clead]**.

---

