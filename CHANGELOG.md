# Changelog

All notable changes to Snake demo are documented here.

## [Unreleased]

### Added

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
- The special levels recorded as published (#28), and the follow-ups from Adam's play (#35); the specification records
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
