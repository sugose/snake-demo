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
  (4)), which of the two records it set and whether the level had records
  before the clear (2.18 (9)), and the texts of the line and of the table's cells (2.18 (6),
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
  itself. It also holds the text of the record message of 2.18 (9) and of "First clear!"
  of 2.18 (10), a
  pure function of which records a clear set and whether the level had
  records before it, not of the game state; covered by Jest as 2.18 (9)
  and (10) say.
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
  (the ended game's from `src/status.ts`, the `ready` line composed in
  the file itself, with the record message or "First clear!" put in front of it and kept
  until the state leaves `ready`, 2.18 (9), (10)), keeps the event log and
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

