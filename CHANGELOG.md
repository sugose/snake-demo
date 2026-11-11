# Changelog

All notable changes to Snake demo are documented here.

## [Unreleased]

### Added

- The high score list's name entry and table have an arcade look: letters drawn as pixels from a 5 × 7 font of our own at the
  largest whole-number scale (1, 2 or 3) that fits the board, a dark panel in light and dark mode alike with four
  high-contrast text colours, scanlines and a glow, a rolling band, small sideways slips of the picture and a blinking
  cursor block in the selected slot, all in CSS and all stopped by `prefers-reduced-motion: reduce` (the cursor then stays
  on). The row of a name just entered is marked by a drawn triangle. The rest of the page keeps its plain look (#66).
  Specified in #62.
- A browser-local high score list: a game that ends with a score of at least 1 and makes the top 10 asks for a name of
  3 letters (arrow keys, or the Up and Down buttons under each letter), and a Scores link next to Log opens the table
  of rank, score, level reached and name, with the best score as a `--` / `---` row ahead of the entries. The list is
  kept in this browser only; a playtest page never enters it (#65). Specified in #62.
- Playtest options for the special levels: `?level=N` (1 to 99) starts every new game of the page at level N, and `?slow`
  adds a small, hard-to-notice button under the board on special levels that steps the speed 1×, 2×, 4× and back
  without changing the level's time, turns or points. A page with either option never changes the best score, and the
  first line of its log names the options (#64). Specified in #62.
- The Log link works in every state of the game, not only once it has ended. Opening the log on a running game pauses
  it (`pause log` in the log); Close or Escape goes on only if opening it paused the game (`resume log`). While the log
  is open, keys, swipes and the Start, Pause, Resume and Log buttons do nothing (#51). Specified in #50.
- The Copy button turns green and reads "✓ Copied!" for 2 seconds after it copies the log, and goes back at once when
  the log closes or opens again; a refused copy leaves it plain and selects the text; screen readers hear "Copied"
  (#51). Specified in #50.
- An event log of each game: every input, turn, move, dot, crash, obstacle jump, cleared level and the end, with each
  level's layout and speed. Once the game ends, a Log link below the board opens it over the board, with Copy and
  Close (#46). Specified in #43.
- After a shielded crash, any turn into a free cell gets the snake moving again, the opposite of the heading included; turns
  into a wall, an obstacle or the snake itself are ignored, the status line names only the free directions, and a snake
  with none ends the game as boxed in (#45). Specified in #44.
- An ended game says why it ended: the wall, an obstacle, the snake itself, no turns left, time ran out, the board full or
  no room for the next level, and on a special level, no shield left (#41). Specified in #38.
- The turn that gets the snake moving again after a shielded crash is free: it does not count against the 20 turns
  (#40). Specified in #39.
- A blinking "Special Level" text over the board for 3 seconds when a special level is laid out (#34). Specified in #33.
- After a shielded crash, the status line says how many shield layers are left and which turns go on (#32).
  Specified in #31.
- A first turn into a wall or an obstacle no longer starts a level; the game waits for a turn it can take (#30).
  Specified in #29.
- Special levels: every 5th level runs at half the delay of the level before it, with a 3-layer shield against walls and
  obstacles, at most 20 turns and 30 seconds (or the snake is blown up), obstacles that jump every 3 seconds, and points
  only for the turns and seconds left when it is cleared; normal levels now speed up by normal levels only (#27).
  Specified in #26.
- Levels: 5 dots clear a level; each level is laid out anew with a random start, the snake unrolling from
  one cell, and one more obstacle; 5 ms less between moves per level, down to 50 ms (#17). Specified in #16.
- A test that a game won because the next level does not fit keeps no queued turns, and clearer test names and
  error message for the start length (#20).

- The game page: canvas, timer, keys, swipes, buttons, score and best
  score, with browser tests (#10).
- Publishing on GitHub Pages at https://sugose.github.io/snake-demo/ on
  every merge to `main` (#11).
- The game rules (#8), input mapping for keys and swipes (#7) and the
  best score kept in the browser (#6).
- The specification and the Phase 1 plan (#4), and the project's purpose
  and goal (#3).

### Changed

- The project signs off to factoincognito's product office and cites its
  Rules; the shipped copy of the Rules and its check are removed (#2).
- Phase 1 progress recorded in the backlog and status (#9), the
  published game and its changelog (#12), and Adam's phone test (#13).
- The specification states the key and swipe details the code follows:
  modifier keys, held keys, keys while a button has the focus, and mouse
  drags (#14).
- The published levels recorded (#18); the specification states the layout shortfalls and the unrolling
  exactly (#19); the special levels idea in the backlog (#21, #22, #24); PBI-2.6 recorded done (#23).
- The changelog's own record of #28, #35 and #36 (#37); the end status line moved to the pure `src/status.ts` (#42); PBI-2.11 to 2.17 recorded as published (#47). The special levels recorded as published (#28), and the follow-ups from Adam's play (#35); the specification records
  Adam's acceptance of the level cleared at 30 seconds and of 0 points with all shield layers used (#36).

### Removed

- The review-ready workflow, `review.yml` (#5).

## Project created

- Bootstrapped from the Clead + Crog project template
  v2.9.2, built from
  factoincognito/ai-project-template-v2@8d5ee3bd90cc6632a3510c497f175a748bd2790a.
- Language pack: web.
- Licence: polyform-noncommercial-1.0.0.
- Set up by bootstrap-project.sh.
